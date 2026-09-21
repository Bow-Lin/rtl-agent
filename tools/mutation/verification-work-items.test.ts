import assert from "node:assert/strict";
import test from "node:test";
import {
  goldenEvidenceStatus,
  makeWorkSnapshot,
  parseWorkItemLedger,
  parseWorkItemLedgerFromTranscript,
  reviewWorkItems,
  runtimeObservations,
  validateWorkSnapshot,
} from "./verification-work-items.ts";
import type { CodeReference, RuntimeEvidence, WorkItemLedger } from "./verification-work-items.ts";

const runId = "unit-work-items";
const baseline = makeWorkSnapshot(runId, 0, {
  "spec.md": "Transfers require acceptance.\n",
  "rtl/tb.sv": "module tb;\nendmodule\n",
  "rtl/checker.sv": "module tb_checker;\nassert (accepted);\nendmodule\n",
});
const current = makeWorkSnapshot(runId, 2, {
  ...baseline.files,
  "rtl/checker.sv": "module tb_checker;\nassert (accepted && correct);\nendmodule\n",
});
const reference = (
  snapshot: "baseline" | "current",
  file = "spec.md",
  line = 1,
): CodeReference => ({ snapshot, path: file, startLine: line, endLine: line });
const decision = (snapshot: "baseline" | "current") => ({
  description: "Bounded code and contract observation.",
  refs: [reference(snapshot, snapshot === "baseline" ? "rtl/tb.sv" : "spec.md")],
});
function ledger(attempt = 2): WorkItemLedger {
  return {
    schemaVersion: 1,
    runId,
    attempt,
    analysis: { target: decision("current"), baseline: decision("baseline") },
    remaining: { ...decision("current"), direction: "none" },
    items: [
      {
        id: "acceptance",
        gap: decision("baseline"),
        applicability: decision("current"),
        authority: { ...decision("current"), kind: "specification" },
        plannedChange: "Add a bounded acceptance check.",
        provenance: { kind: "self", ids: [] },
        targetRederivation: "Use this target's accepted-transfer contract.",
        disposition: "implemented",
        implementationRefs: [reference("current", "rtl/checker.sv", 2)],
        executionEvidenceIds: [],
        withdrawal: null,
      },
    ],
  };
}
function runtime(snapshot = current): RuntimeEvidence {
  const process = JSON.stringify({
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
    compile: { path: "evidence/compile-process.json", content: process },
    simulation: { path: "evidence/simulation-process.json", content: process },
    coverage: {
      path: "evidence/coverage.dat",
      content: "C '\x01f\x02rtl\\checker.sv\x01l\x022\x01t\x02line\x01o\x02block' 2\n",
    },
    coverageState: { score: 100, increment: 0, uncoveredTargets: 0 },
  };
}
function context(snapshot = current, evidence = runtime(snapshot)) {
  return {
    condition: "N" as const,
    allowedSourceIds: [],
    allowedGenericIds: [],
    baseline,
    current: snapshot,
    runtimeEvidence: [evidence],
    previousLedger: null,
  };
}
const transcript = (content: unknown) => ({
  schemaVersion: 1,
  attempt: 2,
  exchanges: [{ response: { role: "assistant", stopReason: "stop", content } }],
});

test("strict final-response parser rejects completion flags and never rescues an earlier answer", () => {
  const value = ledger();
  const valid = { type: "text", text: JSON.stringify(value) };
  assert.deepEqual(
    parseWorkItemLedgerFromTranscript(transcript([valid]), { runId, attempt: 2 }),
    value,
  );
  const misleading = {
    schemaVersion: 1,
    attempt: 2,
    exchanges: [
      { response: { role: "assistant", stopReason: "stop", content: [valid] } },
      {
        response: {
          role: "assistant",
          stopReason: "stop",
          content: [
            { type: "thinking", text: JSON.stringify(value) },
            { type: "text", text: "not JSON" },
          ],
        },
      },
    ],
  };
  assert.throws(() => parseWorkItemLedgerFromTranscript(misleading, { runId, attempt: 2 }));
  assert.throws(
    () => parseWorkItemLedger(JSON.stringify({ ...value, completed: true }), { runId, attempt: 2 }),
    /UNEXPECTED_FIELDS/u,
  );
  assert.throws(
    () =>
      parseWorkItemLedger(
        JSON.stringify({ ...value, items: [{ ...value.items[0], completed: true }] }),
        { runId, attempt: 2 },
      ),
    /UNEXPECTED_FIELDS/u,
  );
  assert.throws(
    () =>
      parseWorkItemLedgerFromTranscript(transcript([{ type: "toolCall" }, valid]), {
        runId,
        attempt: 2,
      }),
    /FINAL_RESPONSE_HAS_TOOL_CALL/u,
  );
});

test("zero selection is valid; duplicate/third work items and invalid references are not", () => {
  const value = ledger();
  value.items = [];
  assert.equal(
    reviewWorkItems(parseWorkItemLedger(JSON.stringify(value), { runId, attempt: 2 }), context())
      .pendingIds.length,
    0,
  );
  const noBaselineCode = ledger();
  noBaselineCode.items = [];
  noBaselineCode.analysis.baseline.refs = [reference("baseline")];
  assert.throws(
    () => reviewWorkItems(noBaselineCode, context()),
    /BASELINE_VERIFICATION_REFERENCE_REQUIRED/u,
  );
  const item = ledger().items[0]!;
  assert.throws(
    () =>
      parseWorkItemLedger(JSON.stringify({ ...value, items: [item, item] }), { runId, attempt: 2 }),
    /DUPLICATE_WORK_ID/u,
  );
  assert.throws(
    () =>
      parseWorkItemLedger(JSON.stringify({ ...value, items: [item, item, item] }), {
        runId,
        attempt: 2,
      }),
    /TOO_MANY/u,
  );
  value.analysis.target.refs[0]!.path = "../outside.sv";
  assert.throws(
    () => parseWorkItemLedger(JSON.stringify(value), { runId, attempt: 2 }),
    /INVALID_LOGICAL_PATH/u,
  );
  const missing = ledger();
  missing.items[0]!.implementationRefs[0]!.endLine = 99;
  assert.throws(() => reviewWorkItems(missing, context()), /REFERENCE_LINE_MISSING/u);
});

test("native positive coverage binds exact snapshot and code locations without semantic acceptance", () => {
  const evidence = runtime();
  const observation = runtimeObservations(evidence)[0]!;
  const value = ledger();
  value.items[0]!.executionEvidenceIds = [observation.id];
  const review = reviewWorkItems(value, context());
  assert.equal(review.items[0]!.status, "runtime-observed");
  assert.equal(review.items[0]!.observations[0]!.count, 2);
  assert.equal(review.items[0]!.implementation[0]!.snapshotDigest, current.digest);
  assert.equal(review.items[0]!.semanticApproved, null);
  assert.equal(review.semanticApproved, null);
  assert.match(review.executionMeaning, /does not establish oracle correctness/u);
  const zero = runtime();
  zero.coverage!.content = zero.coverage!.content.replace("' 2", "' 0");
  assert.equal(runtimeObservations(zero).length, 0);
  const marker = runtime();
  marker.coverage!.content = "WORK_ITEM_DONE acceptance 2\n";
  assert.equal(runtimeObservations(marker).length, 0);
});

test("false completion, stale/cross-run evidence and missing authority remain unresolved or rejected", () => {
  const evidence = runtime();
  const value = ledger();
  const noHit = runtime();
  noHit.coverage!.content = "";
  assert.equal(reviewWorkItems(value, context(current, noHit)).items[0]!.status, "unconfirmed");
  value.items[0]!.executionEvidenceIds = [runtimeObservations(evidence)[0]!.id];
  const changed = makeWorkSnapshot(runId, 3, {
    ...current.files,
    "rtl/checker.sv": current.files["rtl/checker.sv"] + "// changed\n",
  });
  value.attempt = 3;
  const stale = reviewWorkItems(value, context(changed, evidence));
  assert.equal(stale.items[0]!.status, "unconfirmed");
  assert(stale.items[0]!.reasons.includes("STALE_RUNTIME_EVIDENCE"));
  assert.throws(
    () => reviewWorkItems(value, context(changed, { ...evidence, runId: "other" })),
    /CROSS_RUN_EVIDENCE/u,
  );
  const unresolved = ledger();
  unresolved.items[0]!.executionEvidenceIds = value.items[0]!.executionEvidenceIds;
  unresolved.items[0]!.authority.kind = "unresolved";
  assert(reviewWorkItems(unresolved, context()).items[0]!.reasons.includes("AUTHORITY_UNRESOLVED"));
  const forged = ledger();
  forged.items[0]!.executionEvidenceIds = ["invented"];
  assert.throws(() => reviewWorkItems(forged, context()), /UNKNOWN_EXECUTION_EVIDENCE/u);
});

test("post-run association avoids another model turn but cannot prove an already-present gap or authority", () => {
  const automatic = reviewWorkItems(ledger(), context());
  assert.equal(automatic.items[0]!.status, "runtime-observed");
  assert.equal(automatic.items[0]!.evidenceSelection, "harness-associated");
  assert.deepEqual(automatic.items[0]!.agentExecutionEvidenceIds, []);
  assert.equal(automatic.items[0]!.baselineGapApproved, null);
  const unchanged = makeWorkSnapshot(runId, 2, baseline.files);
  assert(
    reviewWorkItems(ledger(), context(unchanged)).items[0]!.reasons.includes(
      "BASELINE_IMPLEMENTATION_NOT_NEW",
    ),
  );
  const wrongAuthority = ledger();
  wrongAuthority.items[0]!.authority.refs = [reference("current", "rtl/checker.sv", 2)];
  assert(
    reviewWorkItems(wrongAuthority, context()).items[0]!.reasons.includes(
      "PUBLIC_CONTRACT_REFERENCE_REQUIRED",
    ),
  );
  wrongAuthority.items[0]!.authority.kind = "approved-golden";
  assert(
    reviewWorkItems(wrongAuthority, context()).items[0]!.reasons.includes(
      "GOLDEN_AUTHORITY_NOT_PREREGISTERED",
    ),
  );
});

test("provenance is condition-scoped, frozen-ID checked and retained across turns", () => {
  const value = ledger();
  value.items[0]!.provenance = { kind: "source", ids: ["source-1"] };
  assert.throws(() => reviewWorkItems(value, context()), /CROSS_CONDITION_PROVENANCE/u);
  assert.throws(
    () => reviewWorkItems(value, { ...context(), condition: "M" }),
    /UNKNOWN_PROVENANCE_ID/u,
  );
  assert.doesNotThrow(() =>
    reviewWorkItems(value, { ...context(), condition: "M", allowedSourceIds: ["source-1"] }),
  );
  const previous = ledger();
  previous.items[0]!.disposition = "withdrawn";
  previous.items[0]!.withdrawal = decision("baseline");
  const next = ledger(3),
    selected = makeWorkSnapshot(runId, 3, current.files);
  assert.throws(
    () => reviewWorkItems(next, { ...context(selected), previousLedger: previous }),
    /WITHDRAWN_ITEM_REOPENED/u,
  );
  next.items = [];
  assert.throws(
    () => reviewWorkItems(next, { ...context(selected), previousLedger: previous }),
    /WORK_ITEM_HISTORY_DROPPED/u,
  );
});

test("runner evidence requires confirmed process completion and snapshot bytes cannot be forged", () => {
  const evidence = runtime();
  assert.equal(goldenEvidenceStatus(evidence), "passed");
  for (const change of [
    { timedOut: true },
    { terminationFailed: true },
    { closeConfirmed: false },
    { spawnError: "error" },
  ]) {
    const altered = structuredClone(evidence);
    altered.compile.content = JSON.stringify({ ...JSON.parse(altered.compile.content), ...change });
    assert.equal(goldenEvidenceStatus(altered), "infrastructure-failed");
    assert.deepEqual(runtimeObservations(altered), []);
  }
  const failed = runtime();
  failed.simulation!.content = failed.simulation!.content.replace('"exitCode":0', '"exitCode":1');
  assert.equal(goldenEvidenceStatus(failed), "simulation-failed");
  assert.deepEqual(runtimeObservations(failed), []);
  const bad = structuredClone(current);
  bad.files["rtl/checker.sv"] += "changed";
  assert.throws(() => validateWorkSnapshot(bad), /SNAPSHOT_DIGEST_MISMATCH/u);
  assert.throws(
    () => makeWorkSnapshot(runId, 2, { "rtl/a.sv": "", "rtl/A.sv": "" }),
    /CASE_COLLISION/u,
  );
  assert.throws(() => makeWorkSnapshot(runId, 2, { "C:/rtl/a.sv": "" }), /INVALID_LOGICAL_PATH/u);
});
