import {
  BatchReviewResultSchema,
  BatchMetricsSchema,
  CheckpointAssessmentSchema,
  ReviewDispositionSchema,
} from "./evaluation-contracts.js";
import type {
  BatchMetrics,
  BatchEvaluationResult,
  BatchReviewResult,
  CaseValidationResult,
  CheckpointAssessment,
  EvaluationProfile,
  MetricSlice,
  RatioMetric,
  ReviewDisposition,
  RunExecutionResult,
} from "./evaluation-contracts.js";
import { sha256Jcs } from "./filesystem.js";

type FixtureCategory = "BLANK_GENERATION" | "SEEDED_COMPILE_REPAIR";

function ratio(numerator: number, denominator: number): RatioMetric {
  return {
    numerator,
    denominator,
    value: denominator === 0 ? null : numerator / denominator,
  };
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function reviewMap(
  reviews: readonly ReviewDisposition[],
): ReadonlyMap<string, ReviewDisposition["disposition"]> {
  const map = new Map<string, ReviewDisposition["disposition"]>();
  for (const raw of reviews) {
    const review = ReviewDispositionSchema.parse(raw);
    if (map.has(review.runId)) throw new TypeError("Duplicate review disposition");
    map.set(review.runId, review.disposition);
  }
  return map;
}

function requiredReviewRunIds(
  profile: EvaluationProfile,
  passedRuns: readonly Extract<RunExecutionResult, { status: "COMPLETE" }>[],
): ReadonlySet<string> {
  const ordered = [...passedRuns].sort((left, right) => {
    const leftKey = `${left.fixtureIdentity.caseId}\u0000${left.runId}`;
    const rightKey = `${right.fixtureIdentity.caseId}\u0000${right.runId}`;
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });
  const selected =
    profile.humanReview.strategy === "ALL_CONFIRMED_PASSES"
      ? ordered
      : ordered.slice(0, profile.humanReview.maximumCases);
  return new Set(selected.map((run) => run.runId));
}

function sliceMetrics(
  profile: EvaluationProfile,
  validations: readonly CaseValidationResult[],
  runs: readonly RunExecutionResult[],
  reviews: ReadonlyMap<string, ReviewDisposition["disposition"]>,
  category?: FixtureCategory,
): MetricSlice {
  const selectedValidations = validations.filter(
    (validation) => category === undefined || validation.category === category,
  );
  const selectedRuns = runs.filter((run) => category === undefined || run.category === category);
  const evaluationRuns = selectedRuns.filter(
    (run): run is Extract<RunExecutionResult, { status: "COMPLETE" }> =>
      run.status === "COMPLETE" && run.evaluationValidity === "EVALUATION_VALID",
  );
  const passedRuns = evaluationRuns.filter((run) => run.finalResult.outcome === "COMPILE_PASSED");
  const firstAttemptPasses = passedRuns.filter((run) => run.passAttempt === 1);
  const recoveryCandidates = evaluationRuns.filter((run) => run.firstAttemptCompileError);
  const recoveredRuns = recoveryCandidates.filter(
    (run) => run.passAttempt !== null && run.passAttempt > 1,
  );
  const reviewAdjustedRecoveredRuns = recoveredRuns.filter(
    (run) => reviews.get(run.runId) !== "COMPILE_PASS_BUT_REVIEW_REJECTED",
  );
  const requiredReviews = requiredReviewRunIds(profile, passedRuns);
  const reviewAdjustedPasses = passedRuns.filter(
    (run) => reviews.get(run.runId) !== "COMPILE_PASS_BUT_REVIEW_REJECTED",
  );
  const reviewAdjustedFirstPasses = firstAttemptPasses.filter(
    (run) => reviews.get(run.runId) !== "COMPILE_PASS_BUT_REVIEW_REJECTED",
  );
  const reviewPendingPassCount = passedRuns.filter(
    (run) => requiredReviews.has(run.runId) && !reviews.has(run.runId),
  ).length;

  const attemptIssues = selectedRuns.flatMap((run) =>
    run.compileObservations
      .filter((observation) => observation.phase === "ATTEMPT")
      .flatMap((observation) => observation.issues),
  );
  const pathCount = attemptIssues.filter((issue) => issue.path !== undefined).length;
  const lineCount = attemptIssues.filter((issue) => issue.line !== undefined).length;
  const pathAndLineCount = attemptIssues.filter(
    (issue) => issue.path !== undefined && issue.line !== undefined,
  ).length;

  const infrastructureRunCount = selectedRuns.filter(
    (run) =>
      run.status === "INCOMPLETE" ||
      (run.status === "COMPLETE" && run.evaluationValidity === "INFRASTRUCTURE_INVALID"),
  ).length;
  const infrastructureValidationCount = selectedValidations.filter(
    (validation) => validation.status === "INFRASTRUCTURE_INVALID",
  ).length;
  const preflightInvalidCount = selectedValidations.filter((validation) =>
    [
      "INVALID_BLANK_BASELINE",
      "INVALID_SEEDED_BASELINE_PASSED",
      "INVALID_FIXTURE_PREPARATION",
    ].includes(validation.status),
  ).length;
  const observedRunIds = new Set(selectedRuns.map((run) => run.runId));
  const implicitNotExecutedCount = selectedValidations.filter(
    (validation) =>
      validation.status === "VALID" &&
      validation.runId !== null &&
      !observedRunIds.has(validation.runId),
  ).length;

  return {
    evaluationDenominator: evaluationRuns.length,
    rawFirstAttempt: ratio(firstAttemptPasses.length, evaluationRuns.length),
    rawWithinMaxAttempts: ratio(passedRuns.length, evaluationRuns.length),
    repairRecovery: ratio(recoveredRuns.length, recoveryCandidates.length),
    reviewAcceptedRepairRecovery: ratio(
      reviewAdjustedRecoveredRuns.length,
      recoveryCandidates.length,
    ),
    reviewAcceptedFirstAttempt: ratio(reviewAdjustedFirstPasses.length, evaluationRuns.length),
    reviewAcceptedWithinMaxAttempts: ratio(reviewAdjustedPasses.length, evaluationRuns.length),
    reviewPendingPassCount,
    medianAttemptsToPass: median(passedRuns.map((run) => run.passAttempt ?? run.attemptCount)),
    medianWallTimeMs: median(evaluationRuns.map((run) => run.durationMs)),
    policyViolationCount: evaluationRuns.filter(
      (run) => run.finalResult.outcome === "POLICY_VIOLATION",
    ).length,
    noChangeCount: evaluationRuns.filter((run) => run.finalResult.outcome === "NO_RTL_CHANGE")
      .length,
    agentFailureCount: evaluationRuns.filter((run) => run.finalResult.outcome === "AGENT_FAILED")
      .length,
    agentTimeoutCount: evaluationRuns.filter(
      (run) => run.finalResult.outcome === "TIMEOUT" && run.failureStage === "AGENT_ATTEMPT",
    ).length,
    postAgentCompileTimeoutCount: evaluationRuns.filter(
      (run) =>
        run.finalResult.outcome === "TIMEOUT" &&
        (run.failureStage === "ATTEMPT_COMPILE" || run.failureStage === "FINAL_RECOMPILE"),
    ).length,
    infrastructureInvalidCount: infrastructureRunCount + infrastructureValidationCount,
    preflightInvalidCount,
    notExecutedCount:
      implicitNotExecutedCount +
      selectedValidations.filter((validation) => validation.status === "NOT_EXECUTED").length,
    diagnosticCoverage: {
      totalIssues: attemptIssues.length,
      path: ratio(pathCount, attemptIssues.length),
      line: ratio(lineCount, attemptIssues.length),
      pathAndLine: ratio(pathAndLineCount, attemptIssues.length),
      fallbackIssueCount: attemptIssues.length - pathAndLineCount,
    },
  };
}

export function calculateBatchMetrics(
  profile: EvaluationProfile,
  validations: readonly CaseValidationResult[],
  runs: readonly RunExecutionResult[],
  rawReviews: readonly ReviewDisposition[] = [],
): BatchMetrics {
  const reviews = reviewMap(rawReviews);
  const passedRunIds = new Set<string>(
    runs
      .filter((run) => run.status === "COMPLETE" && run.finalResult.outcome === "COMPILE_PASSED")
      .map((run) => run.runId),
  );
  if ([...reviews.keys()].some((runId) => !passedRunIds.has(runId))) {
    throw new TypeError("Review disposition must reference a confirmed compile pass");
  }
  return BatchMetricsSchema.parse({
    schemaVersion: 1,
    maxAttempts: profile.runProfile.maxAttempts,
    overall: sliceMetrics(profile, validations, runs, reviews),
    blankGeneration: sliceMetrics(profile, validations, runs, reviews, "BLANK_GENERATION"),
    seededCompileRepair: sliceMetrics(profile, validations, runs, reviews, "SEEDED_COMPILE_REPAIR"),
  });
}

function belowThreshold(
  metric: RatioMetric,
  minimumDenominator: number,
  minimumRate: number,
): "INSUFFICIENT" | "FAILED" | "PASSED" {
  if (metric.denominator < minimumDenominator) return "INSUFFICIENT";
  if (metric.value === null) return minimumDenominator === 0 ? "PASSED" : "INSUFFICIENT";
  return metric.value >= minimumRate ? "PASSED" : "FAILED";
}

export function assessCheckpoint(
  profile: EvaluationProfile,
  metrics: BatchMetrics,
): CheckpointAssessment {
  const overall = metrics.overall;
  const reasons: string[] = [];
  if (
    overall.infrastructureInvalidCount > 0 ||
    overall.notExecutedCount > 0 ||
    overall.preflightInvalidCount > 0
  ) {
    reasons.push("Batch contains invalid, infrastructure-invalid, or not-executed cases");
  }
  if (overall.evaluationDenominator < profile.thresholds.minimumValidCases) {
    reasons.push("Evaluation-valid case count is below the predeclared minimum");
  }
  if (
    metrics.blankGeneration.evaluationDenominator <
      profile.thresholds.minimumBlankGenerationCases ||
    metrics.seededCompileRepair.evaluationDenominator <
      profile.thresholds.minimumSeededCompileRepairCases
  ) {
    reasons.push("Evaluation-valid category coverage is below the predeclared minimum");
  }
  const first = belowThreshold(
    overall.reviewAcceptedFirstAttempt,
    profile.thresholds.minimumFirstAttemptDenominator,
    profile.thresholds.minimumFirstAttemptRate,
  );
  const within = belowThreshold(
    overall.reviewAcceptedWithinMaxAttempts,
    profile.thresholds.minimumWithinMaxAttemptsDenominator,
    profile.thresholds.minimumWithinMaxAttemptsRate,
  );
  const recovery = belowThreshold(
    overall.reviewAcceptedRepairRecovery,
    profile.thresholds.minimumRecoveryDenominator,
    profile.thresholds.minimumRecoveryRate,
  );
  if ([first, within, recovery].includes("INSUFFICIENT")) {
    reasons.push("One or more checkpoint metrics have an insufficient denominator");
  }
  if (reasons.length > 0) {
    return CheckpointAssessmentSchema.parse({ status: "INCONCLUSIVE", reasons });
  }
  if (overall.reviewPendingPassCount > 0) {
    return CheckpointAssessmentSchema.parse({
      status: "PENDING_HUMAN_REVIEW",
      reasons: ["The predeclared human review sample is not complete"],
    });
  }
  if (
    first === "PASSED" &&
    within === "PASSED" &&
    recovery === "PASSED" &&
    overall.policyViolationCount <= profile.thresholds.maximumPolicyViolations
  ) {
    return CheckpointAssessmentSchema.parse({
      status: "PROCEED_TO_FUNCTIONAL_VALIDATION",
      reasons: ["All predeclared compile-only checkpoint thresholds were met"],
    });
  }
  return CheckpointAssessmentSchema.parse({
    status: "STOP_OR_RETHINK",
    reasons: ["One or more predeclared compile-only checkpoint thresholds were not met"],
  });
}

export function applyBatchReviewDispositions(
  profile: EvaluationProfile,
  batch: BatchEvaluationResult,
  reviews: readonly ReviewDisposition[],
  reviewedAt: Date = new Date(),
): BatchReviewResult {
  if (
    batch.evaluationProfileId !== profile.evaluationProfileId ||
    batch.evaluationProfileDigest !== sha256Jcs(profile)
  ) {
    throw new TypeError("Batch review does not match its evaluation profile");
  }
  const metrics = calculateBatchMetrics(profile, batch.caseValidations, batch.runs, reviews);
  return BatchReviewResultSchema.parse({
    schemaVersion: 1,
    authoritative: false,
    claim: "COMPILE_ONLY",
    batchId: batch.batchId,
    evaluationProfileId: profile.evaluationProfileId,
    evaluationProfileDigest: batch.evaluationProfileDigest,
    reviewedAt: reviewedAt.toISOString(),
    reviews,
    metrics,
    checkpoint: assessCheckpoint(profile, metrics),
  });
}
