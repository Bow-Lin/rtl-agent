import { IsoTimestampSchema, SchemaVersionSchema, Sha256DigestSchema } from "@rtl-agent/contracts";
import { z } from "zod";

import { AgentCapabilitySchema } from "./agent-contracts.js";
import { IcarusCapabilitySchema } from "./compiler-contracts.js";
import {
  CompileIssueSchema,
  CoreLoopRunProfileSchema,
  DatasetDescriptorSchema,
  DatasetSelectionSchema,
  FinalResultSchema,
  FixtureCaseRefSchema,
  FixtureIdSchema,
  FixtureIdentitySchema,
  RunIdSchema,
} from "./contracts.js";
import { sha256Jcs } from "./filesystem.js";
import { containsHostAbsolutePath } from "./sanitization.js";

const stableName = (label: string, maximum = 128) =>
  z
    .string()
    .min(1)
    .max(maximum)
    .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/, `Invalid ${label}`);

const boundedSafeMessage = z
  .string()
  .min(1)
  .max(1024)
  .refine(
    (value) => !containsHostAbsolutePath(value),
    "Evaluation messages must not contain host absolute paths",
  );

export const EvaluationProfileIdSchema =
  stableName("EvaluationProfileId").brand<"EvaluationProfileId">();
export const BatchIdSchema = z
  .string()
  .regex(
    /^(?:b-[0-9]{8}-[0-9]{3,4}|batch_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/,
  )
  .brand<"BatchId">();

export const CompilerCapabilityLockSchema = IcarusCapabilitySchema.pick({
  schemaVersion: true,
  compilerProfileId: true,
  executableProduct: true,
  executableDigest: true,
  toolVersion: true,
  profileDigest: true,
  platform: true,
});

export const EvaluationThresholdsSchema = z.strictObject({
  minimumValidCases: z.int().positive().max(10_000),
  minimumBlankGenerationCases: z.int().nonnegative().max(10_000),
  minimumSeededCompileRepairCases: z.int().nonnegative().max(10_000),
  minimumFirstAttemptDenominator: z.int().nonnegative().max(10_000),
  minimumWithinMaxAttemptsDenominator: z.int().nonnegative().max(10_000),
  minimumRecoveryDenominator: z.int().nonnegative().max(10_000),
  minimumFirstAttemptRate: z.number().min(0).max(1),
  minimumWithinMaxAttemptsRate: z.number().min(0).max(1),
  minimumRecoveryRate: z.number().min(0).max(1),
  maximumPolicyViolations: z.literal(0),
});

export const HumanReviewPlanSchema = z.discriminatedUnion("strategy", [
  z.strictObject({
    strategy: z.literal("ALL_CONFIRMED_PASSES"),
  }),
  z.strictObject({
    strategy: z.literal("DETERMINISTIC_FIRST_N"),
    maximumCases: z.int().positive().max(10_000),
  }),
]);

export const EvaluationProfileSchema = z
  .strictObject({
    schemaVersion: SchemaVersionSchema,
    evaluationProfileId: EvaluationProfileIdSchema,
    dataset: DatasetDescriptorSchema,
    providerImplementationDigest: Sha256DigestSchema,
    selection: DatasetSelectionSchema,
    expectedCaseCount: z.int().positive().max(10_000),
    expectedOrderedCaseIdsDigest: Sha256DigestSchema,
    runProfile: CoreLoopRunProfileSchema,
    agentCapability: AgentCapabilitySchema,
    compilerCapability: CompilerCapabilityLockSchema,
    thresholds: EvaluationThresholdsSchema,
    humanReview: HumanReviewPlanSchema,
  })
  .superRefine((value, context) => {
    if (!value.dataset.splits.includes(value.selection.split)) {
      context.addIssue({
        code: "custom",
        path: ["selection", "split"],
        message: "Evaluation selection split is not declared by the locked dataset",
      });
    }
    if (value.runProfile.compilerProfileId !== value.compilerCapability.compilerProfileId) {
      context.addIssue({
        code: "custom",
        path: ["runProfile", "compilerProfileId"],
        message: "Run profile and compiler capability lock must select the same profile",
      });
    }
    if (
      value.selection.caseIds !== undefined &&
      (value.selection.caseIds.length !== value.expectedCaseCount ||
        sha256Jcs(value.selection.caseIds) !== value.expectedOrderedCaseIdsDigest)
    ) {
      context.addIssue({
        code: "custom",
        path: ["expectedOrderedCaseIdsDigest"],
        message: "Explicit selection must match its expected count and ordered case digest",
      });
    }
  });

export const CoreLoopRunStateSchema = z.strictObject({
  schemaVersion: SchemaVersionSchema,
  runId: RunIdSchema,
  sequence: z.int().positive().max(10_000),
  state: z.enum([
    "MATERIALIZING",
    "BASELINE_PREPARING",
    "BASELINE_COMPILING",
    "AGENT_RUNNING",
    "AGENT_VALIDATING",
    "COMPILE_PREPARING",
    "COMPILING",
    "FINAL_RECOMPILING",
    "COMPLETED",
  ]),
  at: IsoTimestampSchema,
});

export const CaseValidationStatusSchema = z.enum([
  "VALID",
  "INVALID_BLANK_BASELINE",
  "INVALID_PROMPT_ONLY_BASELINE",
  "INVALID_SEEDED_BASELINE_PASSED",
  "INVALID_FIXTURE_PREPARATION",
  "INFRASTRUCTURE_INVALID",
  "NOT_EXECUTED",
]);

export const CaseValidationResultSchema = z
  .strictObject({
    schemaVersion: SchemaVersionSchema,
    caseIndex: z.int().nonnegative().max(9_999),
    caseRef: FixtureCaseRefSchema,
    status: CaseValidationStatusSchema,
    runId: RunIdSchema.nullable(),
    category: z
      .enum(["BLANK_GENERATION", "PROMPTED_FUNCTIONAL_REPAIR", "SEEDED_COMPILE_REPAIR"])
      .nullable(),
    normalizedFixtureDigest: Sha256DigestSchema.nullable(),
    baselinePreparationStatus: z
      .enum(["READY", "NO_RTL_SOURCE", "UNSUPPORTED_INCLUDE_DIRECTIVE", "SOURCE_POLICY_VIOLATION"])
      .nullable(),
    baselineCompileStatus: z
      .enum(["COMPILE_PASSED", "COMPILE_ERROR", "TIMEOUT", "TOOL_ERROR"])
      .nullable(),
    message: boundedSafeMessage,
  })
  .superRefine((value, context) => {
    const materializedFields = [value.runId, value.category, value.normalizedFixtureDigest];
    const materialized = materializedFields.every((field) => field !== null);
    if (!materialized && materializedFields.some((field) => field !== null)) {
      context.addIssue({
        code: "custom",
        path: ["runId"],
        message: "Materialized case identity fields must be either all present or all absent",
      });
    }

    if (value.status === "VALID") {
      if (!materialized) {
        context.addIssue({
          code: "custom",
          path: ["status"],
          message: "A valid case must have a materialized run identity",
        });
      } else if (
        (value.category === "BLANK_GENERATION" ||
          value.category === "PROMPTED_FUNCTIONAL_REPAIR") &&
        (value.baselinePreparationStatus !== "NO_RTL_SOURCE" ||
          value.baselineCompileStatus !== null)
      ) {
        context.addIssue({
          code: "custom",
          path: ["baselinePreparationStatus"],
          message: "A valid blank case must have a compiler-not-invoked baseline",
        });
      } else if (
        value.category === "SEEDED_COMPILE_REPAIR" &&
        (value.baselinePreparationStatus !== "READY" ||
          value.baselineCompileStatus !== "COMPILE_ERROR")
      ) {
        context.addIssue({
          code: "custom",
          path: ["baselineCompileStatus"],
          message: "A valid seeded repair case must have a compile-error baseline",
        });
      }
    }

    if (
      value.status === "INVALID_BLANK_BASELINE" &&
      (!materialized ||
        value.category !== "BLANK_GENERATION" ||
        value.baselinePreparationStatus === "NO_RTL_SOURCE" ||
        value.baselineCompileStatus !== null)
    ) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: "Invalid blank baseline fields are inconsistent",
      });
    }
    if (
      value.status === "INVALID_PROMPT_ONLY_BASELINE" &&
      (!materialized ||
        value.category !== "PROMPTED_FUNCTIONAL_REPAIR" ||
        value.baselinePreparationStatus === "NO_RTL_SOURCE" ||
        value.baselineCompileStatus !== null)
    ) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: "Invalid prompted functional-repair baseline fields are inconsistent",
      });
    }
    if (
      value.status === "INVALID_SEEDED_BASELINE_PASSED" &&
      (!materialized ||
        value.category !== "SEEDED_COMPILE_REPAIR" ||
        value.baselinePreparationStatus !== "READY" ||
        value.baselineCompileStatus !== "COMPILE_PASSED")
    ) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: "Invalid seeded baseline fields are inconsistent",
      });
    }
    if (value.status === "INVALID_FIXTURE_PREPARATION" && value.baselineCompileStatus !== null) {
      context.addIssue({
        code: "custom",
        path: ["baselineCompileStatus"],
        message: "Fixture-preparation failures cannot contain a compiler result",
      });
    }
    if (
      value.status === "INFRASTRUCTURE_INVALID" &&
      (value.baselineCompileStatus === "COMPILE_PASSED" ||
        value.baselineCompileStatus === "COMPILE_ERROR")
    ) {
      context.addIssue({
        code: "custom",
        path: ["baselineCompileStatus"],
        message: "Infrastructure-invalid baselines cannot contain a semantic compile result",
      });
    }
  });

export const FailureStageSchema = z.enum([
  "BATCH_PREFLIGHT",
  "FIXTURE_MATERIALIZATION",
  "BASELINE_PREPARATION",
  "BASELINE_COMPILE",
  "AGENT_ATTEMPT",
  "ATTEMPT_PREPARATION",
  "ATTEMPT_COMPILE",
  "FINAL_RECOMPILE",
  "FINAL_VALIDATION",
  "EVIDENCE_WRITE",
  "ORCHESTRATOR",
]);

export const FailureOriginSchema = z.enum(["EVALUATION", "INFRASTRUCTURE"]);

export const CompileObservationSchema = z.strictObject({
  phase: z.enum(["ATTEMPT", "FINAL_RECOMPILE"]),
  attempt: z.int().positive().max(3),
  status: z.enum(["COMPILE_PASSED", "COMPILE_ERROR", "TIMEOUT", "TOOL_ERROR"]),
  durationMs: z.int().nonnegative(),
  issues: z.array(CompileIssueSchema).max(500),
});

const runExecutionCommon = {
  schemaVersion: SchemaVersionSchema,
  runId: RunIdSchema,
  fixtureId: FixtureIdSchema,
  fixtureIdentity: FixtureIdentitySchema,
  category: z.enum(["BLANK_GENERATION", "PROMPTED_FUNCTIONAL_REPAIR", "SEEDED_COMPILE_REPAIR"]),
  attemptCount: z.int().nonnegative().max(3),
  startedAt: IsoTimestampSchema,
  completedAt: IsoTimestampSchema,
  durationMs: z.int().nonnegative(),
  compileObservations: z.array(CompileObservationSchema).max(6),
  firstAttemptCompileError: z.boolean(),
} as const;

export const CompleteRunExecutionResultSchema = z
  .strictObject({
    ...runExecutionCommon,
    status: z.literal("COMPLETE"),
    evaluationValidity: z.enum(["EVALUATION_VALID", "INFRASTRUCTURE_INVALID"]),
    failureStage: FailureStageSchema.nullable(),
    passAttempt: z.int().positive().max(3).nullable(),
    finalResult: FinalResultSchema,
  })
  .superRefine((value, context) => {
    if (
      value.finalResult.runId !== value.runId ||
      value.finalResult.fixtureId !== value.fixtureId ||
      value.finalResult.attemptCount !== value.attemptCount ||
      sha256Jcs(value.finalResult.fixtureIdentity) !== sha256Jcs(value.fixtureIdentity) ||
      value.finalResult.startedAt !== value.startedAt ||
      value.finalResult.completedAt !== value.completedAt
    ) {
      context.addIssue({
        code: "custom",
        path: ["finalResult"],
        message: "Final result does not match its run execution summary",
      });
    }
    if ((value.finalResult.outcome === "COMPILE_PASSED") !== (value.passAttempt !== null)) {
      context.addIssue({
        code: "custom",
        path: ["passAttempt"],
        message: "Only compile-passed runs may record a pass attempt",
      });
    }
    if (value.attemptCount === 0) {
      context.addIssue({
        code: "custom",
        path: ["attemptCount"],
        message: "A complete run must contain at least one Agent attempt",
      });
    }
    if (
      (value.evaluationValidity === "INFRASTRUCTURE_INVALID") !==
      (value.finalResult.outcome === "TOOL_ERROR")
    ) {
      context.addIssue({
        code: "custom",
        path: ["evaluationValidity"],
        message: "Only tool-error results may complete as infrastructure-invalid",
      });
    }
    if ((value.failureStage === null) !== (value.finalResult.outcome === "COMPILE_PASSED")) {
      context.addIssue({
        code: "custom",
        path: ["failureStage"],
        message: "Only compile-passed results may omit a failure stage",
      });
    }
    const observationKeys = new Set<string>();
    value.compileObservations.forEach((observation, index) => {
      const key = `${observation.attempt}:${observation.phase}`;
      if (observationKeys.has(key)) {
        context.addIssue({
          code: "custom",
          path: ["compileObservations", index],
          message: "Compile observations must be unique by attempt and phase",
        });
      }
      observationKeys.add(key);
      if (observation.attempt > value.attemptCount) {
        context.addIssue({
          code: "custom",
          path: ["compileObservations", index, "attempt"],
          message: "Compile observation attempt exceeds the run attempt count",
        });
      }
    });
    const firstAttemptCompileError = value.compileObservations.some(
      (observation) =>
        observation.phase === "ATTEMPT" &&
        observation.attempt === 1 &&
        observation.status === "COMPILE_ERROR",
    );
    if (value.firstAttemptCompileError !== firstAttemptCompileError) {
      context.addIssue({
        code: "custom",
        path: ["firstAttemptCompileError"],
        message: "First-attempt compile-error flag does not match compile observations",
      });
    }
    if (
      value.passAttempt !== null &&
      !value.compileObservations.some(
        (observation) =>
          observation.phase === "FINAL_RECOMPILE" &&
          observation.attempt === value.passAttempt &&
          observation.status === "COMPILE_PASSED",
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["passAttempt"],
        message: "A compile pass requires a matching successful final recompile observation",
      });
    }
    if (value.completedAt < value.startedAt) {
      context.addIssue({
        code: "custom",
        path: ["completedAt"],
        message: "Run completion time cannot precede its start time",
      });
    }
  });

export const IncompleteRunExecutionResultSchema = z.strictObject({
  ...runExecutionCommon,
  status: z.literal("INCOMPLETE"),
  failureOrigin: z.literal("INFRASTRUCTURE"),
  failureStage: FailureStageSchema,
  message: boundedSafeMessage,
});

export const RunExecutionResultSchema = z.discriminatedUnion("status", [
  CompleteRunExecutionResultSchema,
  IncompleteRunExecutionResultSchema,
]);

export const ReviewDispositionSchema = z.strictObject({
  runId: RunIdSchema,
  disposition: z.enum(["ACCEPTED", "COMPILE_PASS_BUT_REVIEW_REJECTED"]),
  note: boundedSafeMessage.optional(),
});

export const RatioMetricSchema = z
  .strictObject({
    numerator: z.int().nonnegative(),
    denominator: z.int().nonnegative(),
    value: z.number().min(0).max(1).nullable(),
  })
  .superRefine((metric, context) => {
    if (metric.numerator > metric.denominator) {
      context.addIssue({
        code: "custom",
        path: ["numerator"],
        message: "Metric numerator cannot exceed its denominator",
      });
    }
    const expected = metric.denominator === 0 ? null : metric.numerator / metric.denominator;
    if (
      (expected === null && metric.value !== null) ||
      (expected !== null &&
        (metric.value === null || Math.abs(metric.value - expected) > Number.EPSILON))
    ) {
      context.addIssue({
        code: "custom",
        path: ["value"],
        message: "Metric value does not match its numerator and denominator",
      });
    }
  });

export const DiagnosticCoverageSchema = z.strictObject({
  totalIssues: z.int().nonnegative(),
  path: RatioMetricSchema,
  line: RatioMetricSchema,
  pathAndLine: RatioMetricSchema,
  fallbackIssueCount: z.int().nonnegative(),
});

export const MetricSliceSchema = z.strictObject({
  evaluationDenominator: z.int().nonnegative(),
  rawFirstAttempt: RatioMetricSchema,
  rawWithinMaxAttempts: RatioMetricSchema,
  repairRecovery: RatioMetricSchema,
  reviewAcceptedRepairRecovery: RatioMetricSchema,
  reviewAcceptedFirstAttempt: RatioMetricSchema,
  reviewAcceptedWithinMaxAttempts: RatioMetricSchema,
  reviewPendingPassCount: z.int().nonnegative(),
  medianAttemptsToPass: z.number().nonnegative().nullable(),
  medianWallTimeMs: z.number().nonnegative().nullable(),
  policyViolationCount: z.int().nonnegative(),
  noChangeCount: z.int().nonnegative(),
  agentFailureCount: z.int().nonnegative(),
  agentTimeoutCount: z.int().nonnegative(),
  postAgentCompileTimeoutCount: z.int().nonnegative(),
  infrastructureInvalidCount: z.int().nonnegative(),
  preflightInvalidCount: z.int().nonnegative(),
  notExecutedCount: z.int().nonnegative(),
  diagnosticCoverage: DiagnosticCoverageSchema,
});

export const BatchMetricsSchema = z.strictObject({
  schemaVersion: SchemaVersionSchema,
  maxAttempts: z.int().min(1).max(3),
  overall: MetricSliceSchema,
  blankGeneration: MetricSliceSchema,
  promptedFunctionalRepair: MetricSliceSchema,
  seededCompileRepair: MetricSliceSchema,
});

export const CheckpointAssessmentSchema = z.strictObject({
  status: z.enum([
    "INCONCLUSIVE",
    "PENDING_HUMAN_REVIEW",
    "PROCEED_TO_FUNCTIONAL_VALIDATION",
    "REFINE_CORE_LOOP_ONCE",
    "STOP_OR_RETHINK",
  ]),
  reasons: z.array(boundedSafeMessage).min(1).max(32),
});

export const BatchInputManifestSchema = z
  .strictObject({
    schemaVersion: SchemaVersionSchema,
    evaluationProfileDigest: Sha256DigestSchema,
    datasetDescriptorDigest: Sha256DigestSchema,
    selectionDigest: Sha256DigestSchema,
    orderedCaseIdsDigest: Sha256DigestSchema,
    selectedCases: z.array(FixtureCaseRefSchema).min(1).max(10_000),
    materializedCases: z
      .array(
        z.strictObject({
          caseRef: FixtureCaseRefSchema,
          runId: RunIdSchema,
          normalizedFixtureDigest: Sha256DigestSchema,
        }),
      )
      .max(10_000),
    agentCapabilityDigest: Sha256DigestSchema,
    compilerCapabilityDigest: Sha256DigestSchema,
    providerImplementationDigest: Sha256DigestSchema,
    manifestDigest: Sha256DigestSchema,
  })
  .superRefine((value, context) => {
    const withoutDigest = Object.fromEntries(
      Object.entries(value).filter(([key]) => key !== "manifestDigest"),
    );
    if (sha256Jcs(withoutDigest) !== value.manifestDigest) {
      context.addIssue({
        code: "custom",
        path: ["manifestDigest"],
        message: "Batch input manifest digest does not match its contents",
      });
    }
    if (
      sha256Jcs(value.selectedCases.map((caseRef) => caseRef.identity.caseId)) !==
      value.orderedCaseIdsDigest
    ) {
      context.addIssue({
        code: "custom",
        path: ["orderedCaseIdsDigest"],
        message: "Selected cases do not match their ordered case digest",
      });
    }
    const selectedCaseDigests = new Set(value.selectedCases.map((caseRef) => sha256Jcs(caseRef)));
    if (selectedCaseDigests.size !== value.selectedCases.length) {
      context.addIssue({
        code: "custom",
        path: ["selectedCases"],
        message: "Selected cases must be unique",
      });
    }
    const materializedRunIds = new Set<string>();
    value.materializedCases.forEach((candidate, index) => {
      if (!selectedCaseDigests.has(sha256Jcs(candidate.caseRef))) {
        context.addIssue({
          code: "custom",
          path: ["materializedCases", index, "caseRef"],
          message: "Materialized case is not in the selected case list",
        });
      }
      if (materializedRunIds.has(candidate.runId)) {
        context.addIssue({
          code: "custom",
          path: ["materializedCases", index, "runId"],
          message: "Materialized run IDs must be unique",
        });
      }
      materializedRunIds.add(candidate.runId);
    });
  });

export const BatchEvaluationResultSchema = z
  .strictObject({
    schemaVersion: SchemaVersionSchema,
    authoritative: z.literal(false),
    claim: z.literal("COMPILE_ONLY"),
    batchId: BatchIdSchema,
    evaluationProfileId: EvaluationProfileIdSchema,
    evaluationProfileDigest: Sha256DigestSchema,
    batchInputManifestDigest: Sha256DigestSchema,
    status: z.enum(["COMPLETED", "INVALID"]),
    startedAt: IsoTimestampSchema,
    completedAt: IsoTimestampSchema,
    durationMs: z.int().nonnegative(),
    caseValidations: z.array(CaseValidationResultSchema).max(10_000),
    runs: z.array(RunExecutionResultSchema).max(10_000),
    metrics: BatchMetricsSchema,
    checkpoint: CheckpointAssessmentSchema,
  })
  .superRefine((value, context) => {
    if (value.completedAt < value.startedAt) {
      context.addIssue({
        code: "custom",
        path: ["completedAt"],
        message: "Batch completion time cannot precede its start time",
      });
    }
    const validRunIds = new Set<string>();
    value.caseValidations.forEach((validation, index) => {
      if (validation.caseIndex !== index) {
        context.addIssue({
          code: "custom",
          path: ["caseValidations", index, "caseIndex"],
          message: "Case validations must be complete and ordered by zero-based case index",
        });
      }
      if (validation.status === "VALID" && validation.runId !== null) {
        validRunIds.add(validation.runId);
      }
    });
    const observedRunIds = new Set<string>();
    value.runs.forEach((run, index) => {
      if (!validRunIds.has(run.runId)) {
        context.addIssue({
          code: "custom",
          path: ["runs", index, "runId"],
          message: "Run result does not reference a valid preflight case",
        });
      }
      if (observedRunIds.has(run.runId)) {
        context.addIssue({
          code: "custom",
          path: ["runs", index, "runId"],
          message: "Batch run IDs must be unique",
        });
      }
      observedRunIds.add(run.runId);
    });
    const invalid =
      value.metrics.overall.infrastructureInvalidCount > 0 ||
      value.metrics.overall.preflightInvalidCount > 0 ||
      value.metrics.overall.notExecutedCount > 0;
    if ((value.status === "INVALID") !== invalid) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: "Batch status does not match its invalid-case metrics",
      });
    }
  });

export const BatchReviewResultSchema = z
  .strictObject({
    schemaVersion: SchemaVersionSchema,
    authoritative: z.literal(false),
    claim: z.literal("COMPILE_ONLY"),
    batchId: BatchIdSchema,
    evaluationProfileId: EvaluationProfileIdSchema,
    evaluationProfileDigest: Sha256DigestSchema,
    reviewedAt: IsoTimestampSchema,
    reviews: z.array(ReviewDispositionSchema).max(10_000),
    metrics: BatchMetricsSchema,
    checkpoint: CheckpointAssessmentSchema,
  })
  .superRefine((value, context) => {
    const runIds = new Set<string>();
    value.reviews.forEach((review, index) => {
      if (runIds.has(review.runId)) {
        context.addIssue({
          code: "custom",
          path: ["reviews", index, "runId"],
          message: "Batch review dispositions must be unique by run ID",
        });
      }
      runIds.add(review.runId);
    });
  });

export type EvaluationProfileId = z.infer<typeof EvaluationProfileIdSchema>;
export type BatchId = z.infer<typeof BatchIdSchema>;
export type CompilerCapabilityLock = z.infer<typeof CompilerCapabilityLockSchema>;
export type EvaluationThresholds = z.infer<typeof EvaluationThresholdsSchema>;
export type HumanReviewPlan = z.infer<typeof HumanReviewPlanSchema>;
export type EvaluationProfile = z.infer<typeof EvaluationProfileSchema>;
export type CoreLoopRunState = z.infer<typeof CoreLoopRunStateSchema>;
export type CaseValidationStatus = z.infer<typeof CaseValidationStatusSchema>;
export type CaseValidationResult = z.infer<typeof CaseValidationResultSchema>;
export type FailureStage = z.infer<typeof FailureStageSchema>;
export type FailureOrigin = z.infer<typeof FailureOriginSchema>;
export type CompileObservation = z.infer<typeof CompileObservationSchema>;
export type CompleteRunExecutionResult = z.infer<typeof CompleteRunExecutionResultSchema>;
export type IncompleteRunExecutionResult = z.infer<typeof IncompleteRunExecutionResultSchema>;
export type RunExecutionResult = z.infer<typeof RunExecutionResultSchema>;
export type ReviewDisposition = z.infer<typeof ReviewDispositionSchema>;
export type RatioMetric = z.infer<typeof RatioMetricSchema>;
export type DiagnosticCoverage = z.infer<typeof DiagnosticCoverageSchema>;
export type MetricSlice = z.infer<typeof MetricSliceSchema>;
export type BatchMetrics = z.infer<typeof BatchMetricsSchema>;
export type CheckpointAssessment = z.infer<typeof CheckpointAssessmentSchema>;
export type BatchInputManifest = z.infer<typeof BatchInputManifestSchema>;
export type BatchEvaluationResult = z.infer<typeof BatchEvaluationResultSchema>;
export type BatchReviewResult = z.infer<typeof BatchReviewResultSchema>;
