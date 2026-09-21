import assert from "node:assert/strict";
import test from "node:test";
import { makeWorkSnapshot } from "./verification-work-items.ts";
import { runWorkItemLoop } from "./verification-work-items-loop.ts";
import type {
  CodeReference,
  RuntimeEvidence,
  WorkCondition,
  WorkItemLedger,
  WorkSnapshot,
} from "./verification-work-items.ts";
import type {
  WorkLoopEvent,
  WorkTurnContext,
  WorkTurnResult,
} from "./verification-work-items-loop.ts";

const runId = "unit-loop";
const baseline = makeWorkSnapshot(runId, 0, {
  "spec.md": "Public contract.\n",
  "rtl/tb.sv": "module tb; endmodule\n",
  "rtl/checker.sv": "module checker;\nassert (valid);\nendmodule\n",
});
const ref = (snapshot: "baseline" | "current", file = "spec.md", line = 1): CodeReference => ({
  snapshot,
  path: file,
  startLine: line,
  endLine: line,
});
const grounded = (snapshot: "baseline" | "current") => ({
  description: "Code-backed decision.",
  refs: [ref(snapshot, snapshot === "baseline" ? "rtl/tb.sv" : "spec.md")],
});
function ledger(attempt: number, selected = true): WorkItemLedger {
  return {
    schemaVersion: 1,
    runId,
    attempt,
    analysis: { target: grounded("current"), baseline: grounded("baseline") },
    remaining: { ...grounded("current"), direction: "none" },
    items: selected
      ? [
          {
            id: "item-1",
            gap: grounded("baseline"),
            applicability: grounded("current"),
            authority: { ...grounded("current"), kind: "specification" },
            plannedChange: "Add a check.",
            provenance: { kind: "self", ids: [] },
            targetRederivation: "Use the current public contract.",
            disposition: "implemented",
            implementationRefs: [ref("current", "rtl/checker.sv", 2)],
            executionEvidenceIds: [],
            withdrawal: null,
          },
        ]
      : [],
  };
}
function golden(snapshot: WorkSnapshot): RuntimeEvidence {
  const p = JSON.stringify({
    exitCode: 0,
    signal: null,
    timedOut: false,
    terminationFailed: false,
    closeConfirmed: true,
  });
  return {
    runId,
    attempt: snapshot.attempt,
    snapshotDigest: snapshot.digest,
    compile: { path: `evidence/a${snapshot.attempt}/compile.json`, content: p },
    simulation: { path: `evidence/a${snapshot.attempt}/simulation.json`, content: p },
    coverage: {
      path: `evidence/a${snapshot.attempt}/coverage.dat`,
      content: "C '\x01f\x02rtl/checker.sv\x01l\x022\x01t\x02line\x01o\x02block' 3\n",
    },
    coverageState: { score: 100, increment: 0, uncoveredTargets: 0 },
  };
}
function response(value: WorkItemLedger, changed: boolean): WorkTurnResult {
  return {
    outcome: changed ? "RTL_CHANGED" : "NO_RTL_CHANGE",
    transcript: {
      schemaVersion: 1,
      attempt: value.attempt,
      exchanges: [
        {
          response: {
            role: "assistant",
            stopReason: "stop",
            content: [{ type: "text", text: JSON.stringify(value) }],
          },
        },
      ],
    },
  };
}
function setup(options: {
  condition?: WorkCondition;
  action(context: WorkTurnContext): { ledger: WorkItemLedger; change?: boolean };
  runtime?: (snapshot: WorkSnapshot) => RuntimeEvidence;
  captureFailure?: number;
}) {
  let files = { ...baseline.files },
    calls = 0,
    goldenCalls = 0;
  const events: WorkLoopEvent[] = [],
    contexts: WorkTurnContext[] = [];
  return {
    events,
    contexts,
    calls: () => calls,
    goldenCalls: () => goldenCalls,
    run: () =>
      runWorkItemLoop({
        runId,
        condition: options.condition ?? "N",
        maxAgentTurns: 3,
        baseline,
        baselineEvidence: golden(baseline),
        allowedGenericIds: [],
        allowedSourceIds: [],
        dependencies: {
          async runTurn(context) {
            calls++;
            contexts.push(structuredClone(context));
            const action = options.action(context);
            if (action.change)
              files = {
                ...files,
                "rtl/checker.sv": `module checker;\nassert (valid_${context.turn});\nendmodule\n`,
              };
            return response(action.ledger, action.change ?? false);
          },
          async captureSnapshot(attempt) {
            if (attempt === options.captureFailure) throw new Error("boundary");
            return makeWorkSnapshot(runId, attempt, files);
          },
          async runGolden(snapshot) {
            goldenCalls++;
            return options.runtime?.(snapshot) ?? golden(snapshot);
          },
          async persistEvent(event) {
            events.push(structuredClone(event));
          },
        },
      }),
  };
}

test("saturated baseline still receives exactly one legitimate zero-edit zero-selection analysis", async () => {
  for (const condition of ["N", "G", "M"] as const) {
    const fixture = setup({ condition, action: (c) => ({ ledger: ledger(c.attempt, false) }) });
    const result = await fixture.run();
    assert.equal(fixture.calls(), 1);
    assert.equal(fixture.goldenCalls(), 0);
    assert.equal(result.stopReason, "WORK_RESOLVED");
    assert.equal(result.turnsUsed, 1);
    assert.equal(result.finalSnapshot!.attempt, 2);
    assert.equal(result.finalSnapshot!.digest, baseline.digest);
    assert.equal(result.finalGoldenStatus, "passed");
    assert.equal(result.semanticApproved, null);
    assert.equal(fixture.events.at(-1)!.inheritedGoldenAttempt, 0);
  }
});

test("review-only turn closes exact unchanged assets after a plausible remaining direction", async () => {
  const fixture = setup({
    action: (c) => {
      const value = ledger(c.attempt);
      if (c.turn === 1) value.remaining.direction = "plausible";
      if (c.turn > 1)
        value.items[0]!.executionEvidenceIds = c.observations
          .filter((o) => o.attempt === 2)
          .map((o) => o.id);
      return { ledger: value, change: c.turn === 1 };
    },
  });
  const result = await fixture.run();
  assert.equal(result.turnsUsed, 2);
  assert.equal(result.stopReason, "WORK_RESOLVED");
  assert.equal(fixture.goldenCalls(), 1);
  assert.equal(result.finalSnapshot!.attempt, 3);
  assert.equal(fixture.contexts[1]!.previousReview!.items[0]!.status, "runtime-observed");
  assert.equal(result.finalReview!.items[0]!.status, "runtime-observed");
  assert.equal(fixture.events.at(-1)!.inheritedGoldenAttempt, 2);
});

test("post-run positive native evidence can resolve new work in the same turn despite zero DUT gain", async () => {
  const fixture = setup({ action: (c) => ({ ledger: ledger(c.attempt), change: true }) });
  const result = await fixture.run();
  assert.equal(result.turnsUsed, 1);
  assert.equal(result.stopReason, "WORK_RESOLVED");
  assert.equal(result.finalReview!.items[0]!.evidenceSelection, "harness-associated");
  assert.equal(result.finalReview!.items[0]!.semanticApproved, null);
});

test("zero-gain zero-hit work remains pending and cannot stop on saturation", async () => {
  const fixture = setup({
    action: (c) => ({ ledger: ledger(c.attempt), change: c.turn === 1 }),
    runtime: (snapshot) => {
      const value = golden(snapshot);
      value.coverage!.content = value.coverage!.content.replace("' 3", "' 0");
      return value;
    },
  });
  const result = await fixture.run();
  assert.equal(result.stopReason, "MAX_TURNS");
  assert.equal(result.turnsUsed, 3);
  assert.equal(result.finalReview!.items[0]!.status, "unconfirmed");
});

test("unprocessed selected work exhausts the same three-turn budget without becoming complete", async () => {
  const fixture = setup({
    action: (c) => {
      const value = ledger(c.attempt);
      value.items[0]!.disposition = "proposed";
      value.items[0]!.implementationRefs = [];
      return { ledger: value };
    },
  });
  const result = await fixture.run();
  assert.equal(result.stopReason, "MAX_TURNS");
  assert.equal(result.turnsUsed, 3);
  assert.equal(fixture.calls(), 3);
  assert.equal(result.workResolved, false);
  assert.deepEqual(result.finalReview!.pendingIds, ["item-1"]);
  assert.equal(result.finalSnapshot!.attempt, 4);
});

test("compile repair takes precedence over withdrawal and no remaining coverage direction", async () => {
  const fixture = setup({
    action: (c) => {
      const value = ledger(c.attempt);
      value.items[0]!.disposition = "withdrawn";
      value.items[0]!.withdrawal = grounded("baseline");
      return { ledger: value, change: c.turn === 1 || c.turn === 3 };
    },
    runtime: (snapshot) => {
      const value = golden(snapshot);
      if (snapshot.attempt === 2)
        value.compile.content = value.compile.content.replace('"exitCode":0', '"exitCode":1');
      return value;
    },
  });
  const result = await fixture.run();
  assert.equal(result.turnsUsed, 3);
  assert.equal(result.stopReason, "WORK_RESOLVED");
  assert.equal(fixture.contexts[1]!.repair, "compile-failed");
  assert.equal(fixture.contexts[2]!.repair, "compile-failed");
  assert.equal(fixture.goldenCalls(), 2);
});

test("invalid final ledger consumes the draw and persists the bad response without resampling", async () => {
  const fixture = setup({
    action: (c) => ({
      ledger: { ...ledger(c.attempt), completed: true } as WorkItemLedger,
      change: true,
    }),
  });
  const result = await fixture.run();
  assert.equal(result.stopReason, "INVALID_AGENT_LEDGER");
  assert.equal(fixture.calls(), 1);
  assert.equal(fixture.goldenCalls(), 0);
  assert.equal(result.finalSnapshot!.attempt, 2);
  assert.equal(result.finalGoldenStatus, "not-run");
  assert(fixture.events.at(-1)!.transcript);
});

test("last-attempt boundary failure cannot fall back to a previous valid snapshot", async () => {
  const fixture = setup({
    captureFailure: 3,
    action: (c) => {
      const value = ledger(c.attempt);
      value.remaining.direction = "plausible";
      return { ledger: value, change: c.turn === 1 };
    },
  });
  const result = await fixture.run();
  assert.equal(result.stopReason, "BOUNDARY_FAILURE");
  assert.equal(result.turnsUsed, 2);
  assert.equal(result.finalSnapshot, null);
  assert.equal(result.finalGoldenStatus, "not-run");
});

test("new edits cannot close using runtime observations from an older asset digest", async () => {
  const fixture = setup({
    action: (c) => {
      const value = ledger(c.attempt);
      if (c.turn === 1) value.remaining.direction = "plausible";
      if (c.turn > 1)
        value.items[0]!.executionEvidenceIds = c.observations
          .filter((o) => o.attempt === 2)
          .map((o) => o.id);
      return { ledger: value, change: true };
    },
  });
  const result = await fixture.run();
  assert.equal(result.stopReason, "MAX_TURNS");
  assert.equal(result.workResolved, false);
  assert.equal(result.finalGoldenStatus, "passed");
  assert(result.finalReview!.items[0]!.reasons.includes("STALE_RUNTIME_EVIDENCE"));
});

test("unconfirmed process cleanup stops immediately rather than spending repair turns", async () => {
  const fixture = setup({
    action: (c) => ({ ledger: ledger(c.attempt), change: true }),
    runtime: (snapshot) => {
      const value = golden(snapshot);
      value.compile.content = value.compile.content.replace(
        '"closeConfirmed":true',
        '"closeConfirmed":false',
      );
      return value;
    },
  });
  const result = await fixture.run();
  assert.equal(result.stopReason, "INFRASTRUCTURE_FAILURE");
  assert.equal(fixture.calls(), 1);
  assert.equal(result.workResolved, false);
});
