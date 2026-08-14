import {
  CHIPBENCH_DATASET_LOCK,
  CoreLoopException,
  CoreLoopRunProfileSchema,
  DatasetSelectionSchema,
  EvaluationProfileSchema,
  FIXED_ICARUS_PROFILE_ID,
  compilerCapabilityLockFromCapability,
  listFixtureCases,
  sha256Jcs,
} from "@rtl-agent/core-loop";
import type {
  ChipBenchSplit,
  CoreLoopCompilerAdapter,
  EvaluationProfile,
  FixtureProvider,
  RtlAgentAdapter,
} from "@rtl-agent/core-loop";

export const CHIPBENCH_KIMI_PROFILE_ID = "chipbench-kimi-v1" as const;
export const CHIPBENCH_KIMI_PI_PROFILE_ID = "chipbench-kimi-pi-v1" as const;
export const CHIPBENCH_DEBUG_KIMI_PROFILE_ID = "chipbench-debug-kimi-v1" as const;
export const CHIPBENCH_DEBUG_KIMI_PI_PROFILE_ID = "chipbench-debug-kimi-pi-v1" as const;
const OPENCODE_KIMI_MODEL_PREFIX = "kimi-code/";
const PI_KIMI_PROVIDER = "kimi-coding";

function isKimiOpenCodeCapability(agentCapability: Awaited<ReturnType<RtlAgentAdapter["probe"]>>) {
  return (
    "openCodeVersion" in agentCapability &&
    agentCapability.model.startsWith(OPENCODE_KIMI_MODEL_PREFIX) &&
    agentCapability.model.length > OPENCODE_KIMI_MODEL_PREFIX.length
  );
}

function isKimiPiCapability(agentCapability: Awaited<ReturnType<RtlAgentAdapter["probe"]>>) {
  return "piVersion" in agentCapability && agentCapability.provider === PI_KIMI_PROVIDER;
}

export function parseChipBenchSplit(value: string | undefined): ChipBenchSplit {
  const split = CHIPBENCH_DATASET_LOCK.splits.find((entry) => entry.split === value)?.split;
  if (split === undefined) {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      "ChipBench evaluation requires a locked --split value",
    );
  }
  return split;
}

function evaluationProfileId(backend: "opencode" | "pi", split: ChipBenchSplit): string {
  return `${backend === "pi" ? CHIPBENCH_KIMI_PI_PROFILE_ID : CHIPBENCH_KIMI_PROFILE_ID}-${split}`;
}

async function createChipBenchKimiBaseProfileForAgent(
  backend: "opencode" | "pi",
  provider: FixtureProvider,
  agentAdapter: RtlAgentAdapter,
  compilerAdapter: CoreLoopCompilerAdapter,
  split: ChipBenchSplit,
): Promise<EvaluationProfile> {
  const [descriptor, agentCapability, compilerCapability] = await Promise.all([
    provider.describe(),
    agentAdapter.probe(),
    compilerAdapter.probe(),
  ]);
  const expectedAgent =
    backend === "pi"
      ? isKimiPiCapability(agentCapability)
      : isKimiOpenCodeCapability(agentCapability);
  if (
    descriptor.datasetId !== CHIPBENCH_DATASET_LOCK.datasetId ||
    descriptor.datasetVersion !== CHIPBENCH_DATASET_LOCK.datasetVersion ||
    descriptor.datasetSourceDigest !== CHIPBENCH_DATASET_LOCK.contentManifestDigest ||
    sha256Jcs(descriptor.splits) !==
      sha256Jcs(CHIPBENCH_DATASET_LOCK.splits.map((entry) => entry.split)) ||
    !expectedAgent
  ) {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      "ChipBench Kimi profile requires the pinned dataset and matching Agent backend",
    );
  }
  const splitLock = CHIPBENCH_DATASET_LOCK.splits.find((entry) => entry.split === split)!;
  const allCases = await listFixtureCases(provider, {
    schemaVersion: 1,
    split,
  });
  if (allCases.length !== splitLock.expectedCaseCount) {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      "Pinned ChipBench case count does not match the selected split",
    );
  }
  const caseIds = allCases.map((caseRef) => caseRef.identity.caseId);
  return EvaluationProfileSchema.parse({
    schemaVersion: 1,
    evaluationProfileId: evaluationProfileId(backend, split),
    dataset: descriptor,
    providerImplementationDigest: CHIPBENCH_DATASET_LOCK.providerImplementationDigest,
    selection: DatasetSelectionSchema.parse({
      schemaVersion: 1,
      split,
      caseIds,
    }),
    expectedCaseCount: caseIds.length,
    expectedOrderedCaseIdsDigest: sha256Jcs(caseIds),
    runProfile: CoreLoopRunProfileSchema.parse({
      schemaVersion: 1,
      profileId: "chipbench-kimi-run-v1",
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
      minimumBlankGenerationCases: splitLock.category === "BLANK_GENERATION" ? 1 : 0,
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

export function createChipBenchKimiBaseProfile(
  provider: FixtureProvider,
  agentAdapter: RtlAgentAdapter,
  compilerAdapter: CoreLoopCompilerAdapter,
  split: ChipBenchSplit,
): Promise<EvaluationProfile> {
  return createChipBenchKimiBaseProfileForAgent(
    "opencode",
    provider,
    agentAdapter,
    compilerAdapter,
    split,
  );
}

export function createChipBenchKimiPiBaseProfile(
  provider: FixtureProvider,
  agentAdapter: RtlAgentAdapter,
  compilerAdapter: CoreLoopCompilerAdapter,
  split: ChipBenchSplit,
): Promise<EvaluationProfile> {
  return createChipBenchKimiBaseProfileForAgent(
    "pi",
    provider,
    agentAdapter,
    compilerAdapter,
    split,
  );
}

export async function createChipBenchDebugKimiBaseProfile(
  provider: FixtureProvider,
  agentAdapter: RtlAgentAdapter,
  compilerAdapter: CoreLoopCompilerAdapter,
  split: ChipBenchSplit,
  debugBaselineManifestDigest: string,
): Promise<EvaluationProfile> {
  if (!split.startsWith("debug-zero-shot-")) {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      "ChipBench Debug profile accepts only zero-shot Debug splits",
    );
  }
  const base = await createChipBenchKimiBaseProfileForAgent(
    "opencode",
    provider,
    agentAdapter,
    compilerAdapter,
    split,
  );
  return EvaluationProfileSchema.parse({
    ...base,
    evaluationProfileId: `${CHIPBENCH_DEBUG_KIMI_PROFILE_ID}-${split}`,
    taskMode: "SEEDED_FUNCTIONAL_DEBUG",
    debugBaselineManifestDigest,
  });
}

export async function createChipBenchDebugKimiPiBaseProfile(
  provider: FixtureProvider,
  agentAdapter: RtlAgentAdapter,
  compilerAdapter: CoreLoopCompilerAdapter,
  split: ChipBenchSplit,
  debugBaselineManifestDigest: string,
): Promise<EvaluationProfile> {
  if (!split.startsWith("debug-zero-shot-")) {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      "ChipBench Debug profile accepts only zero-shot Debug splits",
    );
  }
  const base = await createChipBenchKimiBaseProfileForAgent(
    "pi",
    provider,
    agentAdapter,
    compilerAdapter,
    split,
  );
  return EvaluationProfileSchema.parse({
    ...base,
    evaluationProfileId: `${CHIPBENCH_DEBUG_KIMI_PI_PROFILE_ID}-${split}`,
    taskMode: "SEEDED_FUNCTIONAL_DEBUG",
    debugBaselineManifestDigest,
  });
}
