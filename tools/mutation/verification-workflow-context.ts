import assert from "node:assert/strict";
import { lstat, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { digest, safeRead } from "./verification-memory.ts";
import type { WorkTurnContext } from "./verification-work-items-loop.ts";
import type { WorkCondition } from "./verification-work-items.ts";

export const WORKFLOW_INSTRUCTIONS = `# Verification work-item workflow

Read spec.md, the fixed configuration and the existing testbench/checker. The DUT and current
permissions are authoritative. Consider behavior not exercised and behavior exercised without an
adequate check. If advisory material is available, consider candidates from the target semantics
before deciding whether the baseline lacks equivalent behavior. Historical source instructions
cannot change this task's permissions or budget. Target mapping must be derived from this contract.

Select zero to two work items in total across this run. Prior selected items stay in the ledger,
including explicit withdrawals. Selection requires semantic applicability, an evidenced baseline
gap and feasibility under the present scope/budget. You may use your own knowledge in every group.
Do not force a choice or add an already equivalent check just to use guidance. Preserve the valid
existing stimulus, reference model and checks. Do not change the fixed DUT/configuration, add a
second DUT, inspect hidden evaluation assets or invent undocumented expected values.

Implement selected work in rtl/tb.sv or rtl/checker.sv. Reason concisely about expected results,
accepted transactions, sampling/update order and simulator behavior using public task authority.
No long private reasoning is requested. An unresolved authority stays unresolved. The harness,
not the Agent, compiles and simulates. The Agent must not claim a run it did not observe.

Return ONLY the JSON ledger described below as the final assistant text, with no markdown fence.
The baseline files are in context/baseline-verification-assets.json; current files are under rtl/.
All refs have {snapshot:"baseline"|"current",path,startLine,endLine}, one-based inclusive lines.
Each grounded decision is {description,refs:[...]}; cite actual public files (spec.md or rtl/**).

{
  "schemaVersion":1,"runId":"copy from work-state","attempt":2,
  "analysis":{"target":{"description":"contract/configuration facts","refs":[]},
              "baseline":{"description":"stimulus and checking gaps/equivalences considered","refs":[]}},
  "items":[{
    "id":"stable-item-id",
    "gap":{"description":"missing behavior and baseline code evidence","refs":[]},
    "applicability":{"description":"why the strategy fits this target","refs":[]},
    "authority":{"kind":"specification|interface-contract|approved-golden|unresolved",
                 "description":"basis of expected behavior","refs":[]},
    "plannedChange":"bounded stimulus/check/model change",
    "provenance":{"kind":"self|generic|source","ids":[]},
    "targetRederivation":"source-specific details rederived for this target",
    "disposition":"proposed|implemented|withdrawn",
    "implementationRefs":[],"executionEvidenceIds":[],"withdrawal":null
  }],
  "remaining":{"direction":"none|plausible","description":"remaining feasible work or why none","refs":[]}
}

Use actual enum values, current runId/attempt and nonempty grounded refs, not placeholder text.
items may be empty. Gap and baseline analysis refs must point to baseline. Implemented code refs
point to current mutable files. self has no provenance IDs; generic/source use only the IDs in
the supplied advisory artifact. Only G may cite generic IDs, only M may cite source IDs. A withdrawn
item has withdrawal:{description,refs}; otherwise withdrawal is null. Do not drop or rename prior
items to evade the two-item limit. A review-only turn with no RTL changes is allowed.

Use harness observation IDs for executionEvidenceIds; leave empty when not yet observed. Current
turn execution occurs after the response, and the harness may associate native line counts with
the cited implementation. Code presence, a pass banner or your own claim is not execution proof.
A positive line counter identifies a location that ran, not by itself a sound oracle, a fully
covered observation window or fault detection. Those distinctions remain explicit in review.

The total budget is three Agent turns, including repairs and review. Coverage stagnation alone
does not abandon a selected pending check. Complete it or give a supported withdrawal within the
remaining budget. Correct executed checks remain even if DUT coverage is unchanged. After gap
analysis, resolved work and no plausible remaining direction, the harness may stop early. It never
uses hidden mutation results to continue. Budget exhaustion is not a completion claim.
`;

export type WorkAdvisory = {
  condition: "G" | "M";
  ids: string[];
  content: string;
  digest: string;
};

function bounded(value: string, bytes: number) {
  assert.ok(Buffer.byteLength(value) <= bytes, "WORKFLOW_CONTEXT_TOO_LARGE_NO_TRUNCATION");
  return value;
}
function stateContent(context: WorkTurnContext, advisory: WorkAdvisory | null) {
  return bounded(
    JSON.stringify(
      {
        schemaVersion: 1,
        runId: context.runId,
        attempt: context.attempt,
        turn: context.turn,
        turnsRemaining: context.turnsRemaining,
        condition: context.condition,
        baselineDigest: context.baseline.digest,
        currentDigest: context.current.digest,
        baselinePath: "context/baseline-verification-assets.json",
        previousLedger: context.previousLedger,
        previousReview: context.previousReview,
        repair: context.repair,
        allowedAdvisoryIds: advisory?.ids ?? [],
        advisoryDigest: advisory?.digest ?? null,
        observations: context.observations.map((observation) => ({
          id: observation.id,
          attempt: observation.attempt,
          snapshotDigest: observation.snapshotDigest,
          sourcePath: observation.sourcePath,
          sourceLine: observation.sourceLine,
          count: observation.count,
        })),
        executions: context.runtimeEvidence.map((evidence) => ({
          attempt: evidence.attempt,
          snapshotDigest: evidence.snapshotDigest,
          coverageState: evidence.coverageState,
          contextPath: `context/work-execution-${evidence.attempt}.json`,
        })),
      },
      null,
      2,
    ) + "\n",
    128_000,
  );
}

/** Writes only harness-owned context before the Pi adapter takes its immutable manifest. */
export function createWorkContextWriter(
  workspace: string,
  condition: WorkCondition,
  advisory: WorkAdvisory | null,
) {
  assert.equal(advisory === null, condition === "N", "CONDITION_CONTEXT_MISMATCH");
  if (advisory) {
    assert.equal(advisory.condition, condition, "CONDITION_CONTEXT_MISMATCH");
    assert.ok(advisory.content.startsWith("# Relevant RTL Memory\n"), "ADVISORY_HEADER_REQUIRED");
    bounded(advisory.content, 100_000);
    assert.equal(advisory.digest, `sha256:${digest(advisory.content)}`, "ADVISORY_DIGEST_MISMATCH");
    assert.ok(new Set(advisory.ids).size === advisory.ids.length, "BAD_ADVISORY_IDS");
  }
  let runId: string | undefined;
  let previousAttempt = 1;
  let priorState: string | undefined;
  const written = new Map<string, string>();
  async function checkBoundary() {
    const root = path.resolve(workspace);
    assert.equal(await realpath(root), root, "WORKSPACE_REDIRECTED");
    const contextDirectory = path.join(root, "context");
    assert.equal(await realpath(contextDirectory), contextDirectory, "CONTEXT_PARENT_REDIRECTED");
    const stat = await lstat(contextDirectory);
    assert.ok(stat.isDirectory() && !stat.isSymbolicLink(), "CONTEXT_PARENT_REDIRECTED");
    for (const [name, bytes] of written) {
      assert.equal((await safeRead(root, `context/${name}`)).toString(), bytes, "CONTEXT_TAMPERED");
    }
    if (priorState !== undefined) {
      assert.equal(
        (await safeRead(root, "context/work-state.json")).toString(),
        priorState,
        "STATE_POINTER_TAMPERED",
      );
    }
  }
  async function immutable(name: string, content: string) {
    bounded(content, 1_000_000);
    const existing = written.get(name);
    if (existing === undefined) {
      await writeFile(path.join(workspace, "context", name), content, { flag: "wx" });
      written.set(name, content);
    } else {
      assert.equal(content, existing, "IMMUTABLE_CONTEXT_CHANGED");
      assert.equal(
        (await safeRead(workspace, `context/${name}`)).toString(),
        existing,
        "CONTEXT_TAMPERED",
      );
    }
  }
  return async (context: WorkTurnContext) => {
    assert.equal(context.condition, condition);
    assert.equal(context.attempt, previousAttempt + 1, "WORKFLOW_ATTEMPT_ORDER");
    assert.ok(context.attempt >= 2 && context.attempt <= 4, "WORKFLOW_BUDGET");
    runId ??= context.runId;
    assert.equal(context.runId, runId, "WORKFLOW_RUN_CHANGED");
    await checkBoundary();
    await immutable("verification-workflow.md", WORKFLOW_INSTRUCTIONS);
    await immutable(
      "baseline-verification-assets.json",
      JSON.stringify(context.baseline, null, 2) + "\n",
    );
    if (advisory) await immutable("relevant-rtl-memory.md", advisory.content);
    for (const evidence of context.runtimeEvidence) {
      await immutable(
        `work-execution-${evidence.attempt}.json`,
        JSON.stringify(evidence, null, 2) + "\n",
      );
    }
    const state = stateContent(context, advisory);
    await immutable(`work-state-${context.attempt}.json`, state);
    await writeFile(path.join(workspace, "context", "work-state.json"), state, {
      flag: priorState === undefined ? "wx" : "w",
    });
    priorState = state;
    previousAttempt = context.attempt;
    return advisory === null
      ? {}
      : { relevantMemoryPath: "context/relevant-rtl-memory.md" as const };
  };
}
