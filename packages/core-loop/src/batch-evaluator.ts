import { mkdir } from "node:fs/promises";
import path from "node:path";

import { CreateRunRequestSchema, DatasetDescriptorSchema } from "./contracts.js";
import type { DatasetDescriptor, FixtureCaseRef } from "./contracts.js";
import { CoreLoopException, requireFixtureProvider } from "./errors.js";
import {
  BatchEvaluationResultSchema,
  BatchIdSchema,
  BatchInputManifestSchema,
  CaseValidationResultSchema,
  EvaluationProfileSchema,
} from "./evaluation-contracts.js";
import type {
  BatchEvaluationResult,
  BatchId,
  BatchInputManifest,
  BatchReviewResult,
  CaseValidationResult,
  EvaluationProfile,
  ReviewDisposition,
  RunExecutionResult,
} from "./evaluation-contracts.js";
import {
  applyBatchReviewDispositions,
  assessCheckpoint,
  calculateBatchMetrics,
} from "./evaluation-metrics.js";
import { writeJsonEvidenceExclusive } from "./evidence.js";
import type { FixtureProvider } from "./fixture-provider.js";
import { listFixtureCases } from "./catalog.js";
import { sha256Jcs } from "./filesystem.js";
import { createCoreLoopRun } from "./materialize.js";
import type { CoreLoopRun } from "./materialize.js";
import type { RtlAgentAdapter } from "./agent-adapter.js";
import {
  agentCapabilityMatches,
  compilerCapabilityLockFromCapability,
  compilerCapabilityMatches,
  executeValidatedCoreLoopRun,
  validateCoreLoopRunBaseline,
} from "./run-orchestrator.js";
import type {
  CoreLoopCompilerAdapter,
  RunClock,
  ValidatedCoreLoopRun,
} from "./run-orchestrator.js";

const BATCH_CLOCK: RunClock = {
  now: () => new Date(),
  monotonicNow: () => performance.now(),
};

export const BATCH_INTERNAL_DIRECTORY = "_internal" as const;

function internalPath(logicalPath: string): string {
  return `${BATCH_INTERNAL_DIRECTORY}/${logicalPath}`;
}

export interface EvaluateCoreLoopBatchOptions {
  readonly provider: FixtureProvider | undefined;
  readonly providerImplementationDigest: EvaluationProfile["providerImplementationDigest"];
  readonly profile: unknown;
  readonly agentAdapter: RtlAgentAdapter;
  readonly compilerAdapter: CoreLoopCompilerAdapter;
  readonly batchesRoot: string;
  readonly batchIdFactory?: () => BatchId;
  readonly clock?: RunClock;
  readonly onCaseStart?: (progress: CoreLoopBatchCaseProgress) => void;
}

export interface CoreLoopBatchCaseProgress {
  readonly caseIndex: number;
  readonly caseNumber: number;
  readonly caseCount: number;
  readonly caseRef: FixtureCaseRef;
}

export interface CoreLoopBatchExecution {
  readonly batchDirectory: string;
  readonly inputManifest: BatchInputManifest;
  readonly result: BatchEvaluationResult;
}

export async function writeCoreLoopBatchReview(
  batchDirectory: string,
  profile: EvaluationProfile,
  batch: BatchEvaluationResult,
  reviews: readonly ReviewDisposition[],
  reviewedAt: Date = new Date(),
): Promise<BatchReviewResult> {
  const result = applyBatchReviewDispositions(profile, batch, reviews, reviewedAt);
  if (result.checkpoint.status === "PENDING_HUMAN_REVIEW") {
    throw new TypeError("Cannot publish an incomplete Core Loop human review sample");
  }
  await writeJsonEvidenceExclusive(
    batchDirectory,
    internalPath("evidence/batch-review-result.json"),
    result,
  );
  return result;
}

interface MaterializedCase {
  readonly caseIndex: number;
  readonly caseRef: FixtureCaseRef;
  readonly run: CoreLoopRun;
}

export function createBatchId(now: Date = new Date(), sequence = 1): BatchId {
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  return BatchIdSchema.parse(`b-${date}-${String(sequence).padStart(3, "0")}`);
}

function descriptorMatches(actual: DatasetDescriptor, profile: EvaluationProfile): boolean {
  return sha256Jcs(actual) === sha256Jcs(profile.dataset);
}

function caseEvidencePath(caseIndex: number): string {
  return internalPath(
    `evidence/cases/${String(caseIndex + 1).padStart(4, "0")}/case-validation-result.json`,
  );
}

function materializationFailure(
  caseIndex: number,
  caseRef: FixtureCaseRef,
  status: "INVALID_FIXTURE_PREPARATION" | "INFRASTRUCTURE_INVALID",
  message: string,
): CaseValidationResult {
  return CaseValidationResultSchema.parse({
    schemaVersion: 1,
    caseIndex,
    caseRef,
    status,
    runId: null,
    category: null,
    normalizedFixtureDigest: null,
    baselinePreparationStatus: null,
    baselineCompileStatus: null,
    message,
  });
}

function expectedProvenance(descriptor: DatasetDescriptor, caseRef: FixtureCaseRef): unknown {
  return {
    identity: caseRef.identity,
    ...(descriptor.datasetSourceDigest === undefined
      ? {}
      : { datasetSourceDigest: descriptor.datasetSourceDigest }),
    caseSourceDigest: caseRef.caseSourceDigest,
    license: descriptor.license,
    adapter: descriptor.adapter,
  };
}

function buildInputManifest(
  profile: EvaluationProfile,
  cases: readonly FixtureCaseRef[],
  materialized: readonly MaterializedCase[],
  actualAgentCapability: Awaited<ReturnType<RtlAgentAdapter["probe"]>>,
  actualCompilerCapability: Awaited<ReturnType<CoreLoopCompilerAdapter["probe"]>>,
): BatchInputManifest {
  const withoutDigest = {
    schemaVersion: 1,
    evaluationProfileDigest: sha256Jcs(profile),
    datasetDescriptorDigest: sha256Jcs(profile.dataset),
    selectionDigest: sha256Jcs(profile.selection),
    orderedCaseIdsDigest: sha256Jcs(cases.map((caseRef) => caseRef.identity.caseId)),
    selectedCases: cases,
    materializedCases: materialized.map(({ caseRef, run }) => ({
      caseRef,
      runId: run.runId,
      normalizedFixtureDigest: run.fixture.normalizedFixtureDigest,
    })),
    agentCapabilityDigest: sha256Jcs(actualAgentCapability),
    compilerCapabilityDigest: sha256Jcs(
      compilerCapabilityLockFromCapability(actualCompilerCapability),
    ),
    providerImplementationDigest: profile.providerImplementationDigest,
  };
  return BatchInputManifestSchema.parse({
    ...withoutDigest,
    manifestDigest: sha256Jcs(withoutDigest),
  });
}

async function createBatchDirectory(batchesRoot: string, batchId: BatchId): Promise<string> {
  await mkdir(path.resolve(batchesRoot), { recursive: true });
  const batchDirectory = path.join(path.resolve(batchesRoot), batchId);
  try {
    await mkdir(batchDirectory);
    return batchDirectory;
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? (error as { readonly code?: unknown }).code
        : undefined;
    if (code === "EEXIST") {
      throw new CoreLoopException("BATCH_ALREADY_EXISTS", "Core Loop batch ID already exists");
    }
    throw error;
  }
}

async function allocateBatchDirectory(
  batchesRoot: string,
  now: Date,
): Promise<{ readonly batchId: BatchId; readonly batchDirectory: string }> {
  await mkdir(path.resolve(batchesRoot), { recursive: true });
  for (let sequence = 1; sequence <= 9_999; sequence += 1) {
    const batchId = createBatchId(now, sequence);
    const batchDirectory = path.join(path.resolve(batchesRoot), batchId);
    try {
      await mkdir(batchDirectory);
      return { batchId, batchDirectory };
    } catch (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? (error as { readonly code?: unknown }).code
          : undefined;
      if (code !== "EEXIST") throw error;
    }
  }
  throw new CoreLoopException(
    "BATCH_ALREADY_EXISTS",
    "Core Loop daily batch sequence is exhausted",
  );
}

export async function evaluateCoreLoopBatch(
  options: EvaluateCoreLoopBatchOptions,
): Promise<CoreLoopBatchExecution> {
  const profileResult = EvaluationProfileSchema.safeParse(options.profile);
  if (!profileResult.success) {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      "Core Loop evaluation profile is invalid",
    );
  }
  const profile = profileResult.data;
  const provider = requireFixtureProvider(options.provider);
  if (options.providerImplementationDigest !== profile.providerImplementationDigest) {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      "Configured Provider implementation does not match the evaluation profile",
    );
  }
  const clock = options.clock ?? BATCH_CLOCK;
  const startedAt = clock.now().toISOString();
  const startedMonotonic = clock.monotonicNow();
  const allocated =
    options.batchIdFactory === undefined
      ? await allocateBatchDirectory(options.batchesRoot, clock.now())
      : await (async () => {
          const batchId = options.batchIdFactory!();
          return {
            batchId,
            batchDirectory: await createBatchDirectory(options.batchesRoot, batchId),
          };
        })();
  const { batchId, batchDirectory } = allocated;
  await writeJsonEvidenceExclusive(
    batchDirectory,
    internalPath("evidence/evaluation-profile.json"),
    profile,
  );

  let actualAgentCapability;
  let actualCompilerCapability;
  try {
    [actualAgentCapability, actualCompilerCapability] = await Promise.all([
      options.agentAdapter.probe(),
      options.compilerAdapter.probe(),
    ]);
  } catch {
    throw new CoreLoopException(
      "EVALUATION_CAPABILITY_MISMATCH",
      "Core Loop capability preflight failed",
    );
  }
  if (
    !agentCapabilityMatches(actualAgentCapability, profile.agentCapability) ||
    !compilerCapabilityMatches(actualCompilerCapability, profile.compilerCapability)
  ) {
    throw new CoreLoopException(
      "EVALUATION_CAPABILITY_MISMATCH",
      "Core Loop capabilities do not match the locked evaluation profile",
    );
  }
  await Promise.all([
    writeJsonEvidenceExclusive(
      batchDirectory,
      internalPath("evidence/agent-capability.json"),
      actualAgentCapability,
    ),
    writeJsonEvidenceExclusive(
      batchDirectory,
      internalPath("evidence/compiler-capability.json"),
      actualCompilerCapability,
    ),
  ]);

  const descriptor = DatasetDescriptorSchema.parse(await provider.describe());
  if (!descriptorMatches(descriptor, profile)) {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      "Configured Provider descriptor does not match the evaluation profile",
    );
  }
  const cases = await listFixtureCases(provider, profile.selection);
  if (
    cases.length !== profile.expectedCaseCount ||
    sha256Jcs(cases.map((caseRef) => caseRef.identity.caseId)) !==
      profile.expectedOrderedCaseIdsDigest
  ) {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      "Provider case selection does not match the locked count and ordered case digest",
    );
  }
  await Promise.all([
    writeJsonEvidenceExclusive(
      batchDirectory,
      internalPath("evidence/dataset-descriptor.json"),
      descriptor,
    ),
    writeJsonEvidenceExclusive(
      batchDirectory,
      internalPath("evidence/dataset-selection.json"),
      profile.selection,
    ),
  ]);

  const materialized: MaterializedCase[] = [];
  const validations: CaseValidationResult[] = [];
  for (const [caseIndex, caseRef] of cases.entries()) {
    try {
      const request = CreateRunRequestSchema.parse({
        schemaVersion: 1,
        caseRef,
        profile: profile.runProfile,
      });
      const run = await createCoreLoopRun(provider, request, {
        runsRoot: path.join(batchDirectory, BATCH_INTERNAL_DIRECTORY, "runs"),
        stagingRoot: path.join(batchDirectory, BATCH_INTERNAL_DIRECTORY, "staging"),
      });
      if (
        sha256Jcs(run.fixture.provenance) !== sha256Jcs(expectedProvenance(descriptor, caseRef))
      ) {
        throw new CoreLoopException(
          "DATASET_PROVENANCE_INVALID",
          "Materialized fixture provenance drifted during batch preflight",
        );
      }
      materialized.push({ caseIndex, caseRef, run });
    } catch (error) {
      const infrastructureInvalid =
        !(error instanceof CoreLoopException) ||
        error.error.code === "RUN_ALREADY_EXISTS" ||
        error.error.code === "INTERNAL_ERROR";
      validations.push(
        materializationFailure(
          caseIndex,
          caseRef,
          infrastructureInvalid ? "INFRASTRUCTURE_INVALID" : "INVALID_FIXTURE_PREPARATION",
          infrastructureInvalid
            ? "Fixture materialization infrastructure failed during batch preflight"
            : "Fixture could not be safely materialized during batch preflight",
        ),
      );
    }
  }

  const descriptorAfterMaterialization = DatasetDescriptorSchema.parse(await provider.describe());
  if (!descriptorMatches(descriptorAfterMaterialization, profile)) {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      "Provider descriptor drifted during batch preflight",
    );
  }

  const inputManifest = buildInputManifest(
    profile,
    cases,
    materialized,
    actualAgentCapability,
    actualCompilerCapability,
  );
  await writeJsonEvidenceExclusive(
    batchDirectory,
    internalPath("evidence/batch-input-manifest.json"),
    inputManifest,
  );

  const validatedRuns: ValidatedCoreLoopRun[] = [];
  for (const candidate of materialized) {
    try {
      const validated = await validateCoreLoopRunBaseline(candidate.run, {
        caseIndex: candidate.caseIndex,
        compilerAdapter: options.compilerAdapter,
        lockedCompilerCapability: profile.compilerCapability,
        clock,
      });
      validations.push(validated.validation);
      validatedRuns.push(validated);
    } catch {
      validations.push(
        CaseValidationResultSchema.parse({
          schemaVersion: 1,
          caseIndex: candidate.caseIndex,
          caseRef: candidate.caseRef,
          status: "INFRASTRUCTURE_INVALID",
          runId: candidate.run.runId,
          category: candidate.run.fixture.category,
          normalizedFixtureDigest: candidate.run.fixture.normalizedFixtureDigest,
          baselinePreparationStatus: null,
          baselineCompileStatus: null,
          message: "Baseline evidence could not be committed during batch preflight",
        }),
      );
    }
  }
  validations.sort((left, right) => left.caseIndex - right.caseIndex);
  await Promise.all(
    validations.map((validation) =>
      writeJsonEvidenceExclusive(
        batchDirectory,
        caseEvidencePath(validation.caseIndex),
        validation,
      ),
    ),
  );

  const runs: RunExecutionResult[] = [];
  const baselineInfrastructureInvalid = validations.some(
    (validation) => validation.status === "INFRASTRUCTURE_INVALID",
  );
  if (!baselineInfrastructureInvalid) {
    for (const validated of validatedRuns) {
      if (validated.validation.status !== "VALID") continue;
      try {
        options.onCaseStart?.({
          caseIndex: validated.validation.caseIndex,
          caseNumber: validated.validation.caseIndex + 1,
          caseCount: cases.length,
          caseRef: validated.validation.caseRef,
        });
      } catch {
        // Progress output must not change the evaluation outcome.
      }
      const result = await executeValidatedCoreLoopRun(validated, {
        agentAdapter: options.agentAdapter,
        compilerAdapter: options.compilerAdapter,
        lockedAgentCapability: actualAgentCapability,
        lockedCompilerCapability: profile.compilerCapability,
        clock,
      });
      runs.push(result);
      if (
        result.status === "INCOMPLETE" ||
        (result.status === "COMPLETE" && result.evaluationValidity === "INFRASTRUCTURE_INVALID")
      ) {
        break;
      }
    }
  }

  const metrics = calculateBatchMetrics(profile, validations, runs);
  const checkpoint = assessCheckpoint(profile, metrics);
  const status =
    metrics.overall.infrastructureInvalidCount > 0 ||
    metrics.overall.preflightInvalidCount > 0 ||
    metrics.overall.notExecutedCount > 0
      ? "INVALID"
      : "COMPLETED";
  const result = BatchEvaluationResultSchema.parse({
    schemaVersion: 1,
    authoritative: false,
    claim: "COMPILE_ONLY",
    batchId,
    evaluationProfileId: profile.evaluationProfileId,
    evaluationProfileDigest: sha256Jcs(profile),
    batchInputManifestDigest: inputManifest.manifestDigest,
    status,
    startedAt,
    completedAt: clock.now().toISOString(),
    durationMs: Math.max(0, Math.round(clock.monotonicNow() - startedMonotonic)),
    caseValidations: validations,
    runs,
    metrics,
    checkpoint,
  });
  await writeJsonEvidenceExclusive(
    batchDirectory,
    internalPath("evidence/batch-result.json"),
    result,
  );
  return { batchDirectory, inputManifest, result };
}
