import assert from "node:assert/strict";

export type MutationOutcome =
  "killed" | "survived" | "compile-failed" | "timeout" | "infrastructure-failed";
export type MutationObservation = {
  mutantId: string;
  outcome: MutationOutcome;
  // Independent review; null means not reviewed, not accepted or rejected.
  semanticAccepted: boolean | null;
};
export type ArtifactEvaluation = {
  artifactDigest: string;
  validFinal: boolean;
  goldenPassed: boolean;
  observations: MutationObservation[];
};

function difference(left: Set<string>, right: Set<string>) {
  return [...left].filter((id) => !right.has(id)).sort();
}
function sets(evaluation: ArtifactEvaluation, expected: Set<string>) {
  assert.match(evaluation.artifactDigest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(typeof evaluation.validFinal, "boolean");
  assert.equal(typeof evaluation.goldenPassed, "boolean");
  const seen = new Set<string>();
  const raw = new Set<string>();
  const accepted = new Set<string>();
  const unreviewed = new Set<string>();
  const unresolved = new Set<string>();
  for (const observation of evaluation.observations) {
    assert.ok(expected.has(observation.mutantId), "MUTANT_OUTSIDE_FROZEN_SET");
    assert.ok(!seen.has(observation.mutantId), "DUPLICATE_MUTANT");
    seen.add(observation.mutantId);
    assert.ok(
      ["killed", "survived", "compile-failed", "timeout", "infrastructure-failed"].includes(
        observation.outcome,
      ),
      "UNKNOWN_OUTCOME",
    );
    assert.ok([true, false, null].includes(observation.semanticAccepted), "BAD_SEMANTIC_REVIEW");
    if (observation.outcome === "killed") {
      raw.add(observation.mutantId);
      if (observation.semanticAccepted === true) accepted.add(observation.mutantId);
      if (observation.semanticAccepted === null) unreviewed.add(observation.mutantId);
    } else {
      assert.equal(observation.semanticAccepted, null, "SEMANTIC_KILL_REVIEW_WITHOUT_KILL");
      if (observation.outcome !== "survived") unresolved.add(observation.mutantId);
    }
  }
  return {
    raw,
    accepted,
    unreviewed,
    unresolved,
    missing: difference(expected, seen),
    eligible: evaluation.validFinal && evaluation.goldenPassed,
  };
}

/** Post-seal evaluator helper. Not imported by the generation/continuation loop. */
export function compareVerificationKills(
  frozenMutantIds: string[],
  baseline: ArtifactEvaluation,
  final: ArtifactEvaluation | null,
) {
  assert.ok(frozenMutantIds.length > 0, "EMPTY_FROZEN_SET");
  assert.ok(
    frozenMutantIds.every((id) => /^[A-Za-z0-9_.-]+$/.test(id)),
    "BAD_MUTANT_ID",
  );
  const expected = new Set(frozenMutantIds);
  assert.equal(expected.size, frozenMutantIds.length, "DUPLICATE_FROZEN_ID");
  const b = sets(baseline, expected);
  const f = final === null ? null : sets(final, expected);
  const pairValid = b.eligible && f?.eligible === true;
  const rawComparable =
    pairValid &&
    b.missing.length === 0 &&
    f.missing.length === 0 &&
    b.unresolved.size === 0 &&
    f.unresolved.size === 0;
  const semanticComparable = rawComparable && b.unreviewed.size === 0 && f.unreviewed.size === 0;
  function deltas(left: Set<string>, right: Set<string>) {
    return {
      baseline: [...left].sort(),
      final: [...right].sort(),
      newlyDetected: difference(right, left),
      lostDetections: difference(left, right),
      retained: [...left].filter((id) => right.has(id)).sort(),
    };
  }
  return {
    schemaVersion: 1,
    frozenMutants: [...expected].sort(),
    denominatorDraws: 1,
    validFinal: final?.validFinal ?? false,
    goldenPassed: final?.goldenPassed ?? false,
    baselineDigest: baseline.artifactDigest,
    finalDigest: final?.artifactDigest ?? null,
    rawComparable,
    semanticComparable,
    // Unresolved/invalid pairs are not silently scored as complete losses or gains.
    raw: rawComparable ? deltas(b.raw, f.raw) : null,
    accepted: semanticComparable ? deltas(b.accepted, f.accepted) : null,
    observedRawKills: { baseline: [...b.raw].sort(), final: f ? [...f.raw].sort() : null },
    observedAcceptedKills: {
      baseline: [...b.accepted].sort(),
      final: f ? [...f.accepted].sort() : null,
    },
    incomplete: {
      baselineMissing: b.missing,
      finalMissing: f?.missing ?? [...expected].sort(),
      baselineUnresolved: [...b.unresolved].sort(),
      finalUnresolved: f ? [...f.unresolved].sort() : [],
      baselineUnreviewedKills: [...b.unreviewed].sort(),
      finalUnreviewedKills: f ? [...f.unreviewed].sort() : [],
    },
  };
}
