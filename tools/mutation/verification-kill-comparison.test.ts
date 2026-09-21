import assert from "node:assert/strict";
import test from "node:test";
import { compareVerificationKills } from "./verification-kill-comparison.ts";
import type { ArtifactEvaluation, MutationOutcome } from "./verification-kill-comparison.ts";

const mutants = ["case-a", "case-b", "case-c"];
function evaluation(kills: string[]): ArtifactEvaluation {
  return {
    artifactDigest: `sha256:${"a".repeat(64)}`,
    validFinal: true,
    goldenPassed: true,
    observations: mutants.map((mutantId) => ({
      mutantId,
      outcome: kills.includes(mutantId) ? "killed" : "survived",
      semanticAccepted: kills.includes(mutantId) ? true : null,
    })),
  };
}

test("equal totals still disclose a new detection and a lost detection", () => {
  const result = compareVerificationKills(mutants, evaluation(["case-a"]), evaluation(["case-b"]));
  assert.deepEqual(result.accepted?.newlyDetected, ["case-b"]);
  assert.deepEqual(result.accepted?.lostDetections, ["case-a"]);
  assert.deepEqual(result.raw?.retained, []);
});
test("raw kill is distinct from semantic acceptance and pending review", () => {
  const final = evaluation(["case-b", "case-c"]);
  final.observations[1]!.semanticAccepted = false;
  final.observations[2]!.semanticAccepted = null;
  const result = compareVerificationKills(mutants, evaluation([]), final);
  assert.deepEqual(result.raw?.newlyDetected, ["case-b", "case-c"]);
  assert.equal(result.accepted, null);
  assert.deepEqual(result.observedAcceptedKills.final, []);
  assert.deepEqual(result.incomplete.finalUnreviewedKills, ["case-c"]);
});
test("a missing or invalid final keeps the draw without assigning invented losses", () => {
  const missing = compareVerificationKills(mutants, evaluation(["case-a"]), null);
  assert.equal(missing.denominatorDraws, 1);
  assert.equal(missing.raw, null);
  assert.deepEqual(missing.incomplete.finalMissing, mutants);
  const final = evaluation(["case-b"]);
  final.goldenPassed = false;
  const failed = compareVerificationKills(mutants, evaluation(["case-a"]), final);
  assert.equal(failed.raw, null);
  assert.deepEqual(failed.observedRawKills.final, ["case-b"]);
});
test("timeouts, compilation failures and incomplete sets cannot masquerade as survivors", () => {
  for (const outcome of [
    "timeout",
    "compile-failed",
    "infrastructure-failed",
  ] as MutationOutcome[]) {
    const final = evaluation([]);
    final.observations[0]!.outcome = outcome;
    const result = compareVerificationKills(mutants, evaluation(["case-a"]), final);
    assert.equal(result.raw, null);
    assert.deepEqual(result.incomplete.finalUnresolved, ["case-a"]);
  }
  const partial = evaluation([]);
  partial.observations.pop();
  assert.equal(compareVerificationKills(mutants, evaluation([]), partial).rawComparable, false);
});
test("duplicate and out-of-set observations fail closed", () => {
  const duplicate = evaluation([]);
  duplicate.observations.push(duplicate.observations[0]!);
  assert.throws(
    () => compareVerificationKills(mutants, evaluation([]), duplicate),
    /DUPLICATE_MUTANT/,
  );
  const outside = evaluation([]);
  outside.observations[0]!.mutantId = "unknown";
  assert.throws(
    () => compareVerificationKills(mutants, evaluation([]), outside),
    /OUTSIDE_FROZEN_SET/,
  );
});
