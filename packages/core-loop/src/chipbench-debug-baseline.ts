import { lstat, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { Sha256DigestSchema } from "@rtl-agent/contracts";
import { z } from "zod";

import { listFixtureCases } from "./catalog.js";
import { CHIPBENCH_DATASET_LOCK, type ChipBenchSplit } from "./chipbench-lock.js";
import {
  CoreLoopRunProfileSchema,
  CreateRunRequestSchema,
  FixtureCaseRefSchema,
} from "./contracts.js";
import { CoreLoopException } from "./errors.js";
import { CompilerCapabilityLockSchema } from "./evaluation-contracts.js";
import type { CompilerCapabilityLock } from "./evaluation-contracts.js";
import { sha256Bytes, sha256Jcs } from "./filesystem.js";
import type { FixtureProvider } from "./fixture-provider.js";
import { createCoreLoopRun } from "./materialize.js";
import {
  compilerCapabilityLockFromCapability,
  type CoreLoopCompilerAdapter,
} from "./run-orchestrator.js";
import {
  evaluateFunctionalSimulationCase,
  type EvaluateFunctionalSimulationCaseOptions,
  type FunctionalVerificationProvider,
} from "./verilog-eval-simulation.js";

const DEBUG_BASELINE_RUNNER_VERSION = "chipbench-zero-shot-seeded-debug-v1" as const;

export function chipBenchDebugBaselineCacheRoot(repositoryRoot: string): string {
  return path.join(repositoryRoot, ".rtl-agent", "debug-baselines", "chipbench");
}

const DebugBaselineCaseSchema = z.strictObject({
  caseRef: FixtureCaseRefSchema,
  normalizedFixtureDigest: Sha256DigestSchema,
  starterRtlDigest: Sha256DigestSchema,
  status: z.literal("MISMATCH"),
  mismatches: z.int().positive(),
  samples: z.int().positive(),
  resultDigest: Sha256DigestSchema,
});

export const ChipBenchDebugBaselineManifestSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    runnerVersion: z.literal(DEBUG_BASELINE_RUNNER_VERSION),
    datasetId: z.literal("zhongkaiyu-chipbench"),
    datasetVersion: z.string().min(1),
    datasetSourceDigest: Sha256DigestSchema,
    split: z.string().regex(/^debug-zero-shot-(?:arithmetic|assignment|state-machine|timing)$/u),
    orderedCaseIdsDigest: Sha256DigestSchema,
    providerImplementationDigest: Sha256DigestSchema,
    compilerCapability: CompilerCapabilityLockSchema,
    vvpExecutableDigest: Sha256DigestSchema,
    identityDigest: Sha256DigestSchema,
    cases: z.array(DebugBaselineCaseSchema).min(1).max(10_000),
    manifestDigest: Sha256DigestSchema,
  })
  .superRefine((value, context) => {
    const withoutManifestDigest = Object.fromEntries(
      Object.entries(value).filter(([key]) => key !== "manifestDigest"),
    );
    if (sha256Jcs(withoutManifestDigest) !== value.manifestDigest) {
      context.addIssue({
        code: "custom",
        path: ["manifestDigest"],
        message: "Debug baseline manifest digest does not match its contents",
      });
    }
    if (
      sha256Jcs(value.cases.map((entry) => entry.caseRef.identity.caseId)) !==
      value.orderedCaseIdsDigest
    ) {
      context.addIssue({
        code: "custom",
        path: ["orderedCaseIdsDigest"],
        message: "Debug baseline cases do not match their ordered digest",
      });
    }
  });

export type ChipBenchDebugBaselineManifest = z.infer<typeof ChipBenchDebugBaselineManifestSchema>;
export type ChipBenchDebugBaselineCase = z.infer<typeof DebugBaselineCaseSchema>;

function requireZeroShotDebugSplit(split: ChipBenchSplit): void {
  if (!split.startsWith("debug-zero-shot-")) {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      "ChipBench seeded Debug accepts only zero-shot Debug splits",
    );
  }
}

function vvpExecutableForIcarus(iverilogExecutable: string): string {
  return path.join(
    path.dirname(iverilogExecutable),
    process.platform === "win32" ? "vvp.exe" : "vvp",
  );
}

async function regularExecutableDigest(
  executable: string,
): Promise<ReturnType<typeof sha256Bytes>> {
  const stat = await lstat(executable).catch(() => undefined);
  if (stat === undefined || !stat.isFile() || stat.isSymbolicLink()) {
    throw new CoreLoopException(
      "DEBUG_BASELINE_INVALID",
      "ChipBench Debug VVP executable is unavailable",
    );
  }
  return sha256Bytes(await readFile(executable));
}

async function identityContext(options: {
  readonly provider: FixtureProvider;
  readonly split: ChipBenchSplit;
  readonly compilerCapability: CompilerCapabilityLock;
  readonly providerImplementationDigest: ReturnType<typeof sha256Bytes>;
  readonly iverilogExecutable: string;
  readonly vvpExecutable?: string;
}) {
  requireZeroShotDebugSplit(options.split);
  const descriptor = await options.provider.describe();
  if (
    descriptor.datasetId !== CHIPBENCH_DATASET_LOCK.datasetId ||
    descriptor.datasetVersion !== CHIPBENCH_DATASET_LOCK.datasetVersion ||
    descriptor.datasetSourceDigest !== CHIPBENCH_DATASET_LOCK.contentManifestDigest
  ) {
    throw new CoreLoopException(
      "DEBUG_BASELINE_INVALID",
      "ChipBench Debug baseline requires the locked dataset",
    );
  }
  const cases = await listFixtureCases(options.provider, {
    schemaVersion: 1,
    split: options.split,
  });
  const splitLock = CHIPBENCH_DATASET_LOCK.splits.find((entry) => entry.split === options.split);
  if (splitLock === undefined || cases.length !== splitLock.expectedCaseCount) {
    throw new CoreLoopException(
      "DEBUG_BASELINE_INVALID",
      "ChipBench Debug baseline selection does not match the locked split",
    );
  }
  const vvpExecutable = options.vvpExecutable ?? vvpExecutableForIcarus(options.iverilogExecutable);
  const vvpExecutableDigest = await regularExecutableDigest(vvpExecutable);
  const orderedCaseIdsDigest = sha256Jcs(cases.map((entry) => entry.identity.caseId));
  const identityInput = {
    schemaVersion: 1,
    runnerVersion: DEBUG_BASELINE_RUNNER_VERSION,
    datasetId: descriptor.datasetId,
    datasetVersion: descriptor.datasetVersion,
    datasetSourceDigest: descriptor.datasetSourceDigest!,
    split: options.split,
    orderedCaseIdsDigest,
    providerImplementationDigest: options.providerImplementationDigest,
    compilerCapability: options.compilerCapability,
    vvpExecutableDigest,
  };
  return {
    ...identityInput,
    identityDigest: sha256Jcs(identityInput),
    cases,
    vvpExecutable,
  };
}

function cacheDirectory(cacheRoot: string, identityDigest: string): string {
  return path.join(path.resolve(cacheRoot), identityDigest.slice("sha256:".length));
}

async function readManifest(directory: string): Promise<ChipBenchDebugBaselineManifest> {
  try {
    const directoryStat = await lstat(directory);
    const manifestPath = path.join(directory, "baseline-manifest.json");
    const manifestStat = await lstat(manifestPath);
    if (
      !directoryStat.isDirectory() ||
      directoryStat.isSymbolicLink() ||
      !manifestStat.isFile() ||
      manifestStat.isSymbolicLink()
    ) {
      throw new TypeError("Debug baseline cache paths are not regular");
    }
    return ChipBenchDebugBaselineManifestSchema.parse(
      JSON.parse(await readFile(manifestPath, "utf8")) as unknown,
    );
  } catch {
    throw new CoreLoopException(
      "DEBUG_BASELINE_INVALID",
      "ChipBench Debug baseline cache is missing or invalid",
    );
  }
}

export async function loadChipBenchDebugBaseline(options: {
  readonly provider: FixtureProvider;
  readonly split: ChipBenchSplit;
  readonly compilerCapability: CompilerCapabilityLock;
  readonly providerImplementationDigest: ReturnType<typeof sha256Bytes>;
  readonly cacheRoot: string;
  readonly iverilogExecutable: string;
  readonly vvpExecutable?: string;
}): Promise<ChipBenchDebugBaselineManifest> {
  const identity = await identityContext(options);
  const manifest = await readManifest(cacheDirectory(options.cacheRoot, identity.identityDigest));
  if (manifest.identityDigest !== identity.identityDigest) {
    throw new CoreLoopException(
      "DEBUG_BASELINE_INVALID",
      "ChipBench Debug baseline cache identity does not match the current environment",
    );
  }
  return manifest;
}

export async function prepareChipBenchDebugBaseline(options: {
  readonly provider: FixtureProvider & FunctionalVerificationProvider;
  readonly split: ChipBenchSplit;
  readonly compilerAdapter: CoreLoopCompilerAdapter;
  readonly providerImplementationDigest: ReturnType<typeof sha256Bytes>;
  readonly cacheRoot: string;
  readonly iverilogExecutable: string;
  readonly vvpExecutable?: string;
  readonly functionalProcessRunner?: EvaluateFunctionalSimulationCaseOptions["processRunner"];
}): Promise<{ readonly manifest: ChipBenchDebugBaselineManifest; readonly reused: boolean }> {
  const compilerCapability = compilerCapabilityLockFromCapability(
    await options.compilerAdapter.probe(),
  );
  const identity = await identityContext({ ...options, compilerCapability });
  const destination = cacheDirectory(options.cacheRoot, identity.identityDigest);
  if ((await lstat(destination).catch(() => undefined)) !== undefined) {
    const manifest = await readManifest(destination);
    if (manifest.identityDigest !== identity.identityDigest) {
      throw new CoreLoopException(
        "DEBUG_BASELINE_INVALID",
        "ChipBench Debug baseline cache identity does not match the current environment",
      );
    }
    return { manifest, reused: true };
  }
  const resolvedCacheRoot = path.resolve(options.cacheRoot);
  await mkdir(resolvedCacheRoot, { recursive: true });
  const cacheRootStat = await lstat(resolvedCacheRoot);
  if (!cacheRootStat.isDirectory() || cacheRootStat.isSymbolicLink()) {
    throw new CoreLoopException(
      "DEBUG_BASELINE_INVALID",
      "ChipBench Debug baseline cache root is not a regular directory",
    );
  }
  const staging = await mkdtemp(path.join(resolvedCacheRoot, ".baseline-staging-"));
  let published = false;
  try {
    const runProfile = CoreLoopRunProfileSchema.parse({
      schemaVersion: 1,
      profileId: "chipbench-debug-baseline-v1",
      compilerProfileId: compilerCapability.compilerProfileId,
      maxAttempts: 1,
      stdoutLimitBytes: 65_536,
      stderrLimitBytes: 65_536,
      maximumIssues: 100,
      issueMessageLimitBytes: 2_048,
    });
    const results: ChipBenchDebugBaselineCase[] = [];
    for (const [caseIndex, caseRef] of identity.cases.entries()) {
      const run = await createCoreLoopRun(
        options.provider,
        CreateRunRequestSchema.parse({ schemaVersion: 1, caseRef, profile: runProfile }),
        {
          runsRoot: path.join(staging, "_internal", "runs"),
          stagingRoot: path.join(staging, "_internal", "staging"),
        },
      );
      if (
        run.fixture.category !== "SEEDED_FUNCTIONAL_REPAIR" ||
        run.fixture.starterRtlDigest === undefined
      ) {
        throw new CoreLoopException(
          "DEBUG_BASELINE_INVALID",
          "ChipBench Debug Provider did not materialize seeded functional repair RTL",
        );
      }
      const result = await evaluateFunctionalSimulationCase({
        batchDirectory: staging,
        caseIndex,
        caseRef,
        runId: run.runId,
        run: undefined,
        candidateCompilePassed: true,
        agentAttempt: 1,
        repairIteration: 0,
        publishResult: false,
        publishCandidate: false,
        provider: options.provider,
        iverilogExecutable: options.iverilogExecutable,
        vvpExecutable: identity.vvpExecutable,
        ...(options.functionalProcessRunner === undefined
          ? {}
          : { processRunner: options.functionalProcessRunner }),
      });
      if (
        result.status !== "MISMATCH" ||
        result.mismatches === null ||
        result.mismatches <= 0 ||
        result.samples === null ||
        result.compileExitCode !== 0 ||
        result.simulationExitCode !== 0
      ) {
        throw new CoreLoopException(
          "DEBUG_BASELINE_INVALID",
          "ChipBench Debug starter RTL did not reproduce one valid functional mismatch",
        );
      }
      results.push({
        caseRef,
        normalizedFixtureDigest: run.fixture.normalizedFixtureDigest,
        starterRtlDigest: run.fixture.starterRtlDigest,
        status: "MISMATCH",
        mismatches: result.mismatches,
        samples: result.samples,
        resultDigest: sha256Jcs(result),
      });
    }
    const withoutManifestDigest = {
      schemaVersion: 1 as const,
      runnerVersion: DEBUG_BASELINE_RUNNER_VERSION,
      datasetId: identity.datasetId,
      datasetVersion: identity.datasetVersion,
      datasetSourceDigest: identity.datasetSourceDigest,
      split: identity.split,
      orderedCaseIdsDigest: identity.orderedCaseIdsDigest,
      providerImplementationDigest: identity.providerImplementationDigest,
      compilerCapability: identity.compilerCapability,
      vvpExecutableDigest: identity.vvpExecutableDigest,
      identityDigest: identity.identityDigest,
      cases: results,
    };
    const manifest = ChipBenchDebugBaselineManifestSchema.parse({
      ...withoutManifestDigest,
      manifestDigest: sha256Jcs(withoutManifestDigest),
    });
    await writeFile(
      path.join(staging, "baseline-manifest.json"),
      `${JSON.stringify(manifest, undefined, 2)}\n`,
      { encoding: "utf8", flag: "wx" },
    );
    await rename(staging, destination);
    published = true;
    return { manifest, reused: false };
  } finally {
    if (!published) await rm(staging, { recursive: true, force: true });
  }
}

export function debugBaselineCaseMap(
  manifest: ChipBenchDebugBaselineManifest,
): ReadonlyMap<string, ChipBenchDebugBaselineCase> {
  return new Map(manifest.cases.map((entry) => [entry.caseRef.identity.caseId, entry]));
}
