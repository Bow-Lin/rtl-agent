import assert from "node:assert/strict";
import {
  goldenEvidenceStatus,
  parseWorkItemLedgerFromTranscript,
  reviewWorkItems,
  runtimeObservations,
  validateWorkSnapshot,
} from "./verification-work-items.ts";
import type {
  GoldenStatus,
  RuntimeEvidence,
  WorkCondition,
  WorkItemLedger,
  WorkItemReview,
  WorkSnapshot,
} from "./verification-work-items.ts";

export type WorkTurnContext = {
  runId: string;
  attempt: number;
  turn: number;
  turnsRemaining: number;
  condition: WorkCondition;
  baseline: WorkSnapshot;
  current: WorkSnapshot;
  previousLedger: WorkItemLedger | null;
  previousReview: WorkItemReview | null;
  runtimeEvidence: readonly RuntimeEvidence[];
  observations: ReturnType<typeof runtimeObservations>;
  repair: "compile-failed" | "simulation-failed" | null;
};
export type WorkTurnResult = {
  outcome:
    "RTL_CHANGED" | "NO_RTL_CHANGE" | "AGENT_PROCESS_ERROR" | "AGENT_TIMEOUT" | "POLICY_VIOLATION";
  transcript: unknown;
};
export type WorkLoopEvent = {
  turn: number;
  attempt: number;
  kind: "turn-started" | "turn-finished";
  transcript?: unknown;
  ledger?: WorkItemLedger;
  review?: WorkItemReview;
  snapshot?: WorkSnapshot | null;
  goldenStatus?: GoldenStatus | "not-run";
  inheritedGoldenAttempt?: number | null;
  failure?: string;
};
export type WorkLoopDependencies = {
  runTurn(context: WorkTurnContext): Promise<WorkTurnResult>;
  /** Must perform protected-file/topology validation before returning this snapshot. */
  captureSnapshot(attempt: number): Promise<WorkSnapshot>;
  /** Only golden/coverage; never hidden mutation feedback. Return the raw process records. */
  runGolden(snapshot: WorkSnapshot): Promise<RuntimeEvidence>;
  persistEvent(event: WorkLoopEvent): Promise<void>;
};
export type WorkLoopOptions = {
  runId: string;
  condition: WorkCondition;
  maxAgentTurns: 3;
  baseline: WorkSnapshot;
  baselineEvidence: RuntimeEvidence;
  allowedSourceIds: readonly string[];
  allowedGenericIds: readonly string[];
  approvedGoldenPaths?: readonly string[];
  dependencies: WorkLoopDependencies;
};
export type WorkLoopResult = {
  stopReason:
    | "WORK_RESOLVED"
    | "MAX_TURNS"
    | "INVALID_AGENT_LEDGER"
    | "AGENT_FAILURE"
    | "BOUNDARY_FAILURE"
    | "INFRASTRUCTURE_FAILURE"
    | "BASELINE_FAILED";
  turnsUsed: number;
  finalSnapshot: WorkSnapshot | null;
  finalGoldenStatus: GoldenStatus | "not-run";
  finalLedger: WorkItemLedger | null;
  finalReview: WorkItemReview | null;
  workResolved: boolean;
  semanticApproved: null;
};

/** Pure orchestration: no filesystem, model, tool process, selector or mutant access. */
export async function runWorkItemLoop(options: WorkLoopOptions): Promise<WorkLoopResult> {
  assert.equal(options.maxAgentTurns, 3, "FIXED_THREE_TURN_BUDGET");
  assert(["N", "G", "M"].includes(options.condition));
  validateWorkSnapshot(options.baseline);
  assert.equal(options.baseline.runId, options.runId);
  assert.equal(options.baseline.attempt, 0);
  assert.equal(options.baselineEvidence.runId, options.runId);
  assert.equal(options.baselineEvidence.attempt, 0);
  assert.equal(options.baselineEvidence.snapshotDigest, options.baseline.digest);
  const history = [structuredClone(options.baselineEvidence)];
  let current = structuredClone(options.baseline);
  let previousLedger: WorkItemLedger | null = null,
    previousReview: WorkItemReview | null = null;
  let repair: WorkTurnContext["repair"] = null;
  const result: WorkLoopResult = {
    stopReason: "BASELINE_FAILED",
    turnsUsed: 0,
    finalSnapshot: current,
    finalGoldenStatus: goldenEvidenceStatus(options.baselineEvidence),
    finalLedger: null,
    finalReview: null,
    workResolved: false,
    semanticApproved: null,
  };
  if (result.finalGoldenStatus !== "passed") return result;
  for (let turn = 1; turn <= options.maxAgentTurns; turn++) {
    const attempt = turn + 1;
    result.turnsUsed = turn;
    result.finalSnapshot = null;
    result.finalGoldenStatus = "not-run";
    result.finalLedger = null;
    result.finalReview = null;
    const event: WorkLoopEvent = {
      turn,
      attempt,
      kind: "turn-finished",
      snapshot: null,
      goldenStatus: "not-run",
    };
    await options.dependencies.persistEvent({ turn, attempt, kind: "turn-started" });
    let generated: WorkTurnResult;
    try {
      generated = await options.dependencies.runTurn(
        structuredClone({
          runId: options.runId,
          attempt,
          turn,
          turnsRemaining: options.maxAgentTurns - turn,
          condition: options.condition,
          baseline: options.baseline,
          current,
          previousLedger,
          previousReview,
          runtimeEvidence: history,
          observations: history.flatMap(runtimeObservations),
          repair,
        }),
      );
    } catch {
      event.failure = "AGENT_DEPENDENCY_FAILED";
      result.stopReason = "INFRASTRUCTURE_FAILURE";
      await options.dependencies.persistEvent(event);
      return result;
    }
    event.transcript = generated.transcript;
    if (!["RTL_CHANGED", "NO_RTL_CHANGE"].includes(generated.outcome)) {
      event.failure = generated.outcome;
      result.stopReason =
        generated.outcome === "POLICY_VIOLATION" ? "BOUNDARY_FAILURE" : "INFRASTRUCTURE_FAILURE";
      await options.dependencies.persistEvent(event);
      return result;
    }
    try {
      const selected = await options.dependencies.captureSnapshot(attempt);
      validateWorkSnapshot(selected);
      assert.equal(selected.runId, options.runId);
      assert.equal(selected.attempt, attempt);
      assert.equal(
        selected.digest === current.digest,
        generated.outcome === "NO_RTL_CHANGE",
        "TURN_CHANGE_MISMATCH",
      );
      current = structuredClone(selected);
      result.finalSnapshot = current;
      event.snapshot = current;
    } catch {
      event.failure = "SNAPSHOT_OR_PROTECTED_BOUNDARY_FAILED";
      result.stopReason = "BOUNDARY_FAILURE";
      await options.dependencies.persistEvent(event);
      return result;
    }
    let ledger: WorkItemLedger;
    try {
      ledger = parseWorkItemLedgerFromTranscript(generated.transcript, {
        runId: options.runId,
        attempt,
      });
      // Validate generated references before starting any further runner operation.
      reviewWorkItems(ledger, {
        condition: options.condition,
        allowedSourceIds: options.allowedSourceIds,
        allowedGenericIds: options.allowedGenericIds,
        baseline: options.baseline,
        current,
        runtimeEvidence: history,
        previousLedger,
        approvedGoldenPaths: options.approvedGoldenPaths,
      });
    } catch {
      event.failure = "INVALID_AGENT_LEDGER";
      result.stopReason = "INVALID_AGENT_LEDGER";
      await options.dependencies.persistEvent(event);
      return result;
    }
    event.ledger = ledger;
    result.finalLedger = ledger;
    let golden: RuntimeEvidence;
    try {
      const prior = history.at(-1)!;
      if (generated.outcome === "NO_RTL_CHANGE" && prior.snapshotDigest === current.digest) {
        golden = prior;
        event.inheritedGoldenAttempt = prior.attempt;
      } else {
        golden = await options.dependencies.runGolden(structuredClone(current));
        assert.equal(golden.runId, options.runId);
        assert.equal(golden.attempt, attempt);
        assert.equal(golden.snapshotDigest, current.digest);
        history.push(structuredClone(golden));
        event.inheritedGoldenAttempt = null;
      }
      result.finalGoldenStatus = goldenEvidenceStatus(golden);
      event.goldenStatus = result.finalGoldenStatus;
      result.finalReview = reviewWorkItems(ledger, {
        condition: options.condition,
        allowedSourceIds: options.allowedSourceIds,
        allowedGenericIds: options.allowedGenericIds,
        baseline: options.baseline,
        current,
        runtimeEvidence: history,
        previousLedger,
        approvedGoldenPaths: options.approvedGoldenPaths,
      });
      event.review = result.finalReview;
    } catch {
      event.failure = "RUNNER_EVIDENCE_INVALID";
      result.stopReason = "INFRASTRUCTURE_FAILURE";
      await options.dependencies.persistEvent(event);
      return result;
    }
    await options.dependencies.persistEvent(event);
    if (result.finalGoldenStatus === "infrastructure-failed") {
      result.stopReason = "INFRASTRUCTURE_FAILURE";
      return result;
    }
    previousLedger = ledger;
    previousReview = result.finalReview;
    // Repair takes precedence over all coverage/no-direction/withdrawal claims.
    repair = result.finalGoldenStatus === "passed" ? null : result.finalGoldenStatus;
    if (
      repair === null &&
      previousReview.pendingIds.length === 0 &&
      ledger.remaining.direction === "none"
    ) {
      result.stopReason = "WORK_RESOLVED";
      result.workResolved = true;
      return result;
    }
    result.stopReason = "MAX_TURNS";
  }
  return result;
}
