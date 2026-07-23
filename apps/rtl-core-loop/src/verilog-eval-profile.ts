import {
  CoreLoopException,
  CoreLoopRunProfileSchema,
  DatasetSelectionSchema,
  EvaluationProfileSchema,
  FIXED_ICARUS_PROFILE_ID,
  VERILOG_EVAL_DATASET_LOCK,
  compilerCapabilityLockFromCapability,
  listFixtureCases,
  sha256Jcs,
} from "@rtl-agent/core-loop";
import type {
  CoreLoopCompilerAdapter,
  EvaluationProfile,
  FixtureProvider,
  RtlAgentAdapter,
} from "@rtl-agent/core-loop";

export const VERILOG_EVAL_KIMI_PROFILE_ID = "verilog-eval-kimi-v1" as const;
export const VERILOG_EVAL_KIMI_PI_PROFILE_ID = "verilog-eval-kimi-pi-v1" as const;

async function createVerilogEvalKimiBaseProfileForAgent(
  evaluationProfileId: typeof VERILOG_EVAL_KIMI_PROFILE_ID | typeof VERILOG_EVAL_KIMI_PI_PROFILE_ID,
  provider: FixtureProvider,
  agentAdapter: RtlAgentAdapter,
  compilerAdapter: CoreLoopCompilerAdapter,
): Promise<EvaluationProfile> {
  const [descriptor, agentCapability, compilerCapability] = await Promise.all([
    provider.describe(),
    agentAdapter.probe(),
    compilerAdapter.probe(),
  ]);
  const expectedAgent =
    evaluationProfileId === VERILOG_EVAL_KIMI_PROFILE_ID
      ? "openCodeVersion" in agentCapability &&
        agentCapability.model === "kimi-code/kimi-for-coding"
      : "piVersion" in agentCapability &&
        agentCapability.provider === "kimi-coding" &&
        agentCapability.model === "kimi-for-coding";
  if (
    descriptor.datasetId !== VERILOG_EVAL_DATASET_LOCK.datasetId ||
    descriptor.datasetVersion !== VERILOG_EVAL_DATASET_LOCK.datasetVersion ||
    descriptor.datasetSourceDigest !== VERILOG_EVAL_DATASET_LOCK.contentManifestDigest ||
    !expectedAgent
  ) {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      `${evaluationProfileId} requires the pinned VerilogEval dataset and matching Kimi Agent backend`,
    );
  }
  const allCases = await listFixtureCases(provider, {
    schemaVersion: 1,
    split: VERILOG_EVAL_DATASET_LOCK.split,
  });
  if (allCases.length !== VERILOG_EVAL_DATASET_LOCK.expectedCaseCount) {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      "Pinned VerilogEval case count does not match the profile template",
    );
  }
  const caseIds = allCases.map((caseRef) => caseRef.identity.caseId);
  return EvaluationProfileSchema.parse({
    schemaVersion: 1,
    evaluationProfileId,
    dataset: descriptor,
    providerImplementationDigest: VERILOG_EVAL_DATASET_LOCK.providerImplementationDigest,
    selection: DatasetSelectionSchema.parse({
      schemaVersion: 1,
      split: VERILOG_EVAL_DATASET_LOCK.split,
      caseIds,
    }),
    expectedCaseCount: caseIds.length,
    expectedOrderedCaseIdsDigest: sha256Jcs(caseIds),
    runProfile: CoreLoopRunProfileSchema.parse({
      schemaVersion: 1,
      profileId: "verilog-eval-kimi-run-v1",
      compilerProfileId: FIXED_ICARUS_PROFILE_ID,
      maxAttempts: 1,
      stdoutLimitBytes: 65_536,
      stderrLimitBytes: 65_536,
      maximumIssues: 100,
      issueMessageLimitBytes: 2_048,
    }),
    agentCapability,
    compilerCapability: compilerCapabilityLockFromCapability(compilerCapability),
    thresholds: {
      minimumValidCases: 1,
      minimumBlankGenerationCases: 1,
      minimumSeededCompileRepairCases: 0,
      minimumFirstAttemptDenominator: 1,
      minimumWithinMaxAttemptsDenominator: 1,
      minimumRecoveryDenominator: 0,
      minimumFirstAttemptRate: 0,
      minimumWithinMaxAttemptsRate: 0,
      minimumRecoveryRate: 0,
      maximumPolicyViolations: 0,
    },
    humanReview: { strategy: "ALL_CONFIRMED_PASSES" },
  });
}

export function createVerilogEvalKimiBaseProfile(
  provider: FixtureProvider,
  agentAdapter: RtlAgentAdapter,
  compilerAdapter: CoreLoopCompilerAdapter,
): Promise<EvaluationProfile> {
  return createVerilogEvalKimiBaseProfileForAgent(
    VERILOG_EVAL_KIMI_PROFILE_ID,
    provider,
    agentAdapter,
    compilerAdapter,
  );
}

export function createVerilogEvalKimiPiBaseProfile(
  provider: FixtureProvider,
  agentAdapter: RtlAgentAdapter,
  compilerAdapter: CoreLoopCompilerAdapter,
): Promise<EvaluationProfile> {
  return createVerilogEvalKimiBaseProfileForAgent(
    VERILOG_EVAL_KIMI_PI_PROFILE_ID,
    provider,
    agentAdapter,
    compilerAdapter,
  );
}
