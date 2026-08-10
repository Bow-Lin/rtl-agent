import { lstat, mkdir } from "node:fs/promises";
import path from "node:path";

import { LogicalPathSchema } from "@rtl-agent/contracts";
import { z } from "zod";

import { CapturedOutputSchema, FixtureCaseRefSchema } from "./contracts.js";
import type { CapturedOutput, FixtureCaseRef } from "./contracts.js";
import { BATCH_INTERNAL_DIRECTORY, type CoreLoopBatchExecution } from "./batch-evaluator.js";
import { FIXED_ICARUS_PROFILE, controlledIcarusEnvironment } from "./compiler-profile.js";
import { executeCompilerProcess } from "./compiler-process.js";
import type { CompilerProcessOptions, CompilerProcessResult } from "./compiler-process.js";
import {
  copyRegularTreeToEvidence,
  ensureJsonEvidence,
  writeJsonEvidenceExclusive,
  writeJsonReplacingAtomic,
} from "./evidence.js";
import type { RunExecutionResult } from "./evaluation-contracts.js";
import { asHostDirectoryForProvider } from "./fixture-provider.js";
import type { HostDirectory } from "./fixture-provider.js";
import { scanRegularFiles, sha256Jcs } from "./filesystem.js";
import { FunctionalSimulationFeedbackSchema } from "./functional-repair-contracts.js";

export const FunctionalCaseStatusSchema = z.enum([
  "PASSED",
  "MISMATCH",
  "CANDIDATE_NOT_COMPILE_PASSED",
  "SIMULATION_COMPILE_ERROR",
  "SIMULATION_COMPILE_TIMEOUT",
  "SIMULATION_ERROR",
  "SIMULATION_TIMEOUT",
  "OUTPUT_INVALID",
]);

export const FunctionalCaseResultSchema = z.strictObject({
  schemaVersion: z.literal(1),
  caseRef: FixtureCaseRefSchema,
  runId: z.string().min(1),
  status: FunctionalCaseStatusSchema,
  mismatches: z.int().nonnegative().nullable(),
  samples: z.int().positive().nullable(),
  outputMismatches: z
    .array(
      z.strictObject({
        outputPort: z.string().regex(/^[A-Za-z_][A-Za-z0-9_$]*$/u),
        mismatches: z.int().positive(),
        firstMismatchTime: z.int().nonnegative(),
      }),
    )
    .max(512)
    .optional(),
  compileExitCode: z.int().nullable(),
  simulationExitCode: z.int().nullable(),
  compileDurationMs: z.int().nonnegative(),
  simulationDurationMs: z.int().nonnegative(),
  stdout: CapturedOutputSchema.nullable(),
  stderr: CapturedOutputSchema.nullable(),
  agentAttempt: z.int().positive().default(1),
  repairIterations: z.int().nonnegative().default(0),
});

export const FunctionalSimulationResultSchema = z.strictObject({
  schemaVersion: z.literal(1),
  authoritative: z.literal(false),
  claim: z.literal("FUNCTIONAL_SIMULATION"),
  batchId: z.string().min(1),
  status: z.enum(["COMPLETED", "INVALID"]),
  caseCount: z.int().nonnegative(),
  compilePassed: z.int().nonnegative(),
  functionalPassed: z.int().nonnegative(),
  functionalFailed: z.int().nonnegative(),
  functionalNotRun: z.int().nonnegative(),
  verificationInvalid: z.int().nonnegative().default(0),
  maxRepairIterations: z.int().nonnegative().default(0),
  cases: z.array(FunctionalCaseResultSchema),
});

export const VerilogEvalFunctionalResultSchema = FunctionalSimulationResultSchema;
export type FunctionalCaseResult = z.infer<typeof FunctionalCaseResultSchema>;
export type FunctionalSimulationResult = z.infer<typeof FunctionalSimulationResultSchema>;
export type VerilogEvalFunctionalResult = FunctionalSimulationResult;
type ProcessRunner = (options: CompilerProcessOptions) => Promise<CompilerProcessResult>;

export interface FunctionalVerificationMaterialization {
  readonly referenceLogicalPath: "reference.sv";
  readonly testbenchLogicalPath: "testbench.sv";
  readonly testbenchTopModule: "tb";
}

const FunctionalVerificationMaterializationSchema = z
  .object({
    referenceLogicalPath: z.literal("reference.sv"),
    testbenchLogicalPath: z.literal("testbench.sv"),
    testbenchTopModule: z.literal("tb"),
  })
  .passthrough();

export interface FunctionalVerificationProvider {
  materializeVerification(
    caseRef: FixtureCaseRef,
    destination: HostDirectory,
  ): Promise<FunctionalVerificationMaterialization>;
}

export interface EvaluateFunctionalSimulationCaseOptions {
  readonly batchDirectory: string;
  readonly caseIndex: number;
  readonly caseRef: FixtureCaseRef;
  readonly runId: string;
  readonly run: RunExecutionResult | undefined;
  readonly candidateCompilePassed?: boolean;
  readonly agentAttempt?: number;
  readonly repairIteration?: number;
  readonly publishResult?: boolean;
  readonly publishCandidate?: boolean;
  readonly provider: FunctionalVerificationProvider;
  readonly iverilogExecutable: string;
  readonly vvpExecutable?: string;
  readonly processRunner?: ProcessRunner;
}

export interface PublishFunctionalSimulationBatchOptions {
  readonly execution: CoreLoopBatchExecution;
  readonly caseResults: readonly FunctionalCaseResult[];
  readonly maxRepairIterations?: number;
}

function emptyProcessFields() {
  return {
    mismatches: null,
    samples: null,
    outputMismatches: [],
    compileExitCode: null,
    simulationExitCode: null,
    compileDurationMs: 0,
    simulationDurationMs: 0,
    stdout: null,
    stderr: null,
  } as const;
}

function vvpExecutableForIcarus(iverilogExecutable: string): string {
  if (!path.isAbsolute(iverilogExecutable)) return process.platform === "win32" ? "vvp.exe" : "vvp";
  return path.join(
    path.dirname(iverilogExecutable),
    process.platform === "win32" ? "vvp.exe" : "vvp",
  );
}

function processOptions(
  executable: string,
  arguments_: readonly string[],
  cwd: string,
): CompilerProcessOptions {
  return {
    executable,
    arguments: arguments_,
    cwd,
    environment: controlledIcarusEnvironment(executable),
    timeoutMs: FIXED_ICARUS_PROFILE.timeoutMs,
    terminationGraceMs: FIXED_ICARUS_PROFILE.terminationGraceMs,
    retainedOutputBytes: FIXED_ICARUS_PROFILE.captureRetainedBytes,
    stdoutLimitBytes: FIXED_ICARUS_PROFILE.stdoutLimitBytes,
    stderrLimitBytes: FIXED_ICARUS_PROFILE.stderrLimitBytes,
    logicalPathReplacements: { [cwd]: "<verification>" },
  };
}

function parseMismatch(
  stdout: CapturedOutput,
): { mismatches: number; samples: number } | undefined {
  const matches = [
    ...stdout.preview.matchAll(/Mismatches:\s*([0-9]+)\s+in\s+([0-9]+)\s+samples\b/giu),
  ];
  if (matches.length !== 1) return undefined;
  const mismatches = Number(matches[0]![1]);
  const samples = Number(matches[0]![2]);
  if (!Number.isSafeInteger(mismatches) || !Number.isSafeInteger(samples) || samples <= 0) {
    return undefined;
  }
  return { mismatches, samples };
}

function parseOutputMismatches(stdout: CapturedOutput) {
  const parsed = [
    ...stdout.preview.matchAll(
      /Hint:\s*Output\s+'([A-Za-z_][A-Za-z0-9_$]*)'\s+has\s+([0-9]+)\s+mismatches\.\s+First mismatch occurred at time\s+([0-9]+)\./giu,
    ),
  ].map((match) => ({
    outputPort: match[1]!,
    mismatches: Number(match[2]),
    firstMismatchTime: Number(match[3]),
  }));
  if (
    parsed.some(
      (item) =>
        !Number.isSafeInteger(item.mismatches) ||
        item.mismatches <= 0 ||
        !Number.isSafeInteger(item.firstMismatchTime),
    ) ||
    new Set(parsed.map((item) => item.outputPort)).size !== parsed.length
  ) {
    return [];
  }
  return parsed;
}

function outputDirectoryName(caseRef: FixtureCaseRef): string {
  const caseId = caseRef.identity.caseId;
  return /^[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*$/u.test(caseId) ? caseId : caseRef.fixtureId;
}

async function publishCandidate(
  batchDirectory: string,
  caseRef: FixtureCaseRef,
  runId: string,
): Promise<void> {
  const source = path.join(
    batchDirectory,
    BATCH_INTERNAL_DIRECTORY,
    "runs",
    runId,
    "workspace",
    "rtl",
  );
  const files = await scanRegularFiles(source).catch(() => []);
  if (files.length === 0) return;
  await copyRegularTreeToEvidence(source, batchDirectory, `rtl/${outputDirectoryName(caseRef)}`);
}

function functionalCaseEvidencePath(caseIndex: number): string {
  return `${BATCH_INTERNAL_DIRECTORY}/evidence/functional-cases/${String(caseIndex + 1).padStart(4, "0")}.json`;
}

async function publishFunctionalCaseResult(
  batchDirectory: string,
  caseIndex: number,
  rawResult: unknown,
): Promise<FunctionalCaseResult> {
  const result = FunctionalCaseResultSchema.parse(rawResult);
  await writeJsonEvidenceExclusive(batchDirectory, functionalCaseEvidencePath(caseIndex), result);
  return result;
}

export async function publishFunctionalSimulationCase(options: {
  readonly batchDirectory: string;
  readonly caseIndex: number;
  readonly caseRef: FixtureCaseRef;
  readonly runId: string;
  readonly result: FunctionalCaseResult;
}): Promise<FunctionalCaseResult> {
  await publishCandidate(options.batchDirectory, options.caseRef, options.runId);
  return publishFunctionalCaseResult(options.batchDirectory, options.caseIndex, options.result);
}

export async function writeFunctionalSimulationFeedback(options: {
  readonly runDirectory: string;
  readonly workspaceDirectory: string;
  readonly result: FunctionalCaseResult;
}): Promise<ReturnType<typeof LogicalPathSchema.parse>> {
  if (
    options.result.status !== "MISMATCH" ||
    options.result.mismatches === null ||
    options.result.mismatches === 0 ||
    options.result.samples === null
  ) {
    throw new TypeError("Functional simulation feedback requires a mismatch result");
  }
  const feedback = FunctionalSimulationFeedbackSchema.parse({
    schemaVersion: 1,
    runId: options.result.runId,
    attempt: options.result.agentAttempt,
    repairIteration: options.result.repairIterations,
    mismatches: options.result.mismatches,
    samples: options.result.samples,
    outputMismatches: options.result.outputMismatches ?? [],
    instruction:
      "Repair the candidate RTL against spec.md using only this public mismatch summary, then leave the updated RTL under rtl/.",
  });
  const feedbackPath = LogicalPathSchema.parse("context/functional-simulation-feedback.json");
  await writeJsonReplacingAtomic(
    path.join(options.workspaceDirectory, "context", "functional-simulation-feedback.json"),
    feedback,
  );
  await writeJsonEvidenceExclusive(
    options.runDirectory,
    `evidence/attempts/${String(options.result.agentAttempt)}/functional-simulation-feedback.json`,
    feedback,
  );
  return feedbackPath;
}

async function materializeVerification(
  provider: FunctionalVerificationProvider,
  caseRef: FixtureCaseRef,
  destination: string,
): Promise<FunctionalVerificationMaterialization> {
  await mkdir(destination, { recursive: true });
  const existing = await Promise.all(
    ["reference.sv", "testbench.sv"].map((name) =>
      lstat(path.join(destination, name)).catch(() => undefined),
    ),
  );
  if (existing.every((entry) => entry?.isFile() === true && !entry.isSymbolicLink())) {
    return {
      referenceLogicalPath: "reference.sv",
      testbenchLogicalPath: "testbench.sv",
      testbenchTopModule: "tb",
    };
  }
  return FunctionalVerificationMaterializationSchema.parse(
    await provider.materializeVerification(caseRef, asHostDirectoryForProvider(destination)),
  );
}

export async function evaluateFunctionalSimulationCase(
  options: EvaluateFunctionalSimulationCaseOptions,
): Promise<FunctionalCaseResult> {
  const runner = options.processRunner ?? executeCompilerProcess;
  const caseRef = FixtureCaseRefSchema.parse(options.caseRef);
  const agentAttempt = options.agentAttempt ?? 1;
  const repairIterations = options.repairIteration ?? 0;
  const shouldPublishResult = options.publishResult ?? true;
  const finish = async (rawResult: unknown): Promise<FunctionalCaseResult> => {
    const result = FunctionalCaseResultSchema.parse(rawResult);
    if (options.candidateCompilePassed === true) {
      await writeJsonEvidenceExclusive(
        options.batchDirectory,
        `${BATCH_INTERNAL_DIRECTORY}/runs/${options.runId}/evidence/attempts/${String(agentAttempt)}/functional-simulation-result.json`,
        result,
      );
    }
    if (options.publishCandidate ?? true) {
      await publishCandidate(options.batchDirectory, caseRef, options.runId);
    }
    return shouldPublishResult
      ? publishFunctionalCaseResult(options.batchDirectory, options.caseIndex, result)
      : result;
  };
  if (
    options.candidateCompilePassed !== true &&
    (options.run?.status !== "COMPLETE" ||
      options.run.evaluationValidity !== "EVALUATION_VALID" ||
      options.run.finalResult.outcome !== "COMPILE_PASSED")
  ) {
    return finish({
      schemaVersion: 1,
      caseRef,
      runId: options.runId,
      status: "CANDIDATE_NOT_COMPILE_PASSED",
      agentAttempt,
      repairIterations,
      ...emptyProcessFields(),
    });
  }

  const verificationDirectory = path.join(
    options.batchDirectory,
    BATCH_INTERNAL_DIRECTORY,
    "verification",
    String(options.caseIndex + 1).padStart(4, "0"),
  );
  const roundDirectory =
    options.agentAttempt === undefined
      ? verificationDirectory
      : path.join(verificationDirectory, "rounds", String(agentAttempt).padStart(4, "0"));
  const candidateDirectory = path.join(roundDirectory, "candidate");
  const assetDirectory = path.join(verificationDirectory, "assets");
  await mkdir(candidateDirectory, { recursive: true });
  await copyRegularTreeToEvidence(
    path.join(
      options.batchDirectory,
      BATCH_INTERNAL_DIRECTORY,
      "runs",
      options.runId,
      "workspace",
      "rtl",
    ),
    roundDirectory,
    "candidate",
  );
  const assets = await materializeVerification(options.provider, caseRef, assetDirectory);
  const candidateSources = (await scanRegularFiles(candidateDirectory)).map(
    (file) => file.hostPath,
  );
  const simulationImage = path.join(roundDirectory, "simulation.vvp");
  const compile = await runner(
    processOptions(
      options.iverilogExecutable,
      [
        "-g2012",
        "-s",
        assets.testbenchTopModule,
        "-o",
        simulationImage,
        ...candidateSources,
        path.join(assetDirectory, assets.referenceLogicalPath),
        path.join(assetDirectory, assets.testbenchLogicalPath),
      ],
      roundDirectory,
    ),
  );
  if (compile.timedOut) {
    return finish({
      schemaVersion: 1,
      caseRef,
      runId: options.runId,
      status: "SIMULATION_COMPILE_TIMEOUT",
      agentAttempt,
      repairIterations,
      ...emptyProcessFields(),
      compileExitCode: compile.exitCode,
      compileDurationMs: compile.durationMs,
      stdout: compile.stdout,
      stderr: compile.stderr,
    });
  }
  if (
    compile.spawnError !== undefined ||
    compile.terminationFailed ||
    !compile.closeConfirmed ||
    compile.exitCode !== 0
  ) {
    return finish({
      schemaVersion: 1,
      caseRef,
      runId: options.runId,
      status: "SIMULATION_COMPILE_ERROR",
      agentAttempt,
      repairIterations,
      ...emptyProcessFields(),
      compileExitCode: compile.exitCode,
      compileDurationMs: compile.durationMs,
      stdout: compile.stdout,
      stderr: compile.stderr,
    });
  }

  const simulation = await runner(
    processOptions(
      options.vvpExecutable ?? vvpExecutableForIcarus(options.iverilogExecutable),
      [simulationImage],
      roundDirectory,
    ),
  );
  const mismatch = parseMismatch(simulation.stdout);
  const outputMismatches = parseOutputMismatches(simulation.stdout);
  const status = simulation.timedOut
    ? "SIMULATION_TIMEOUT"
    : simulation.spawnError !== undefined ||
        simulation.terminationFailed ||
        !simulation.closeConfirmed ||
        simulation.exitCode !== 0
      ? "SIMULATION_ERROR"
      : mismatch === undefined
        ? "OUTPUT_INVALID"
        : mismatch.mismatches === 0
          ? "PASSED"
          : "MISMATCH";
  return finish({
    schemaVersion: 1,
    caseRef,
    runId: options.runId,
    status,
    agentAttempt,
    repairIterations,
    mismatches: mismatch?.mismatches ?? null,
    samples: mismatch?.samples ?? null,
    outputMismatches,
    compileExitCode: compile.exitCode,
    simulationExitCode: simulation.exitCode,
    compileDurationMs: compile.durationMs,
    simulationDurationMs: simulation.durationMs,
    stdout: simulation.stdout,
    stderr: simulation.stderr,
  });
}

export async function publishFunctionalSimulationBatch(
  options: PublishFunctionalSimulationBatchOptions,
): Promise<FunctionalSimulationResult> {
  const materializedByRunId = new Map<
    string,
    (typeof options.execution.inputManifest.materializedCases)[number]
  >(options.execution.inputManifest.materializedCases.map((item) => [item.runId, item]));
  const suppliedByRunId = new Map<string, FunctionalCaseResult>();
  for (const rawResult of options.caseResults) {
    const caseResult = FunctionalCaseResultSchema.parse(rawResult);
    const materialized = materializedByRunId.get(caseResult.runId);
    if (
      materialized === undefined ||
      suppliedByRunId.has(caseResult.runId) ||
      sha256Jcs(materialized.caseRef) !== sha256Jcs(caseResult.caseRef)
    ) {
      throw new TypeError("Functional case result does not match one unique materialized case");
    }
    suppliedByRunId.set(caseResult.runId, caseResult);
  }

  const selectedIndexByCaseDigest = new Map(
    options.execution.inputManifest.selectedCases.map((caseRef, caseIndex) => [
      sha256Jcs(caseRef),
      caseIndex,
    ]),
  );
  const caseResults: FunctionalCaseResult[] = [];
  for (const materialized of options.execution.inputManifest.materializedCases) {
    const caseIndex = selectedIndexByCaseDigest.get(sha256Jcs(materialized.caseRef));
    if (caseIndex === undefined) {
      throw new TypeError("Materialized functional case is absent from the selected case list");
    }
    let caseResult = suppliedByRunId.get(materialized.runId);
    if (caseResult === undefined) {
      caseResult = await publishFunctionalCaseResult(options.execution.batchDirectory, caseIndex, {
        schemaVersion: 1,
        caseRef: materialized.caseRef,
        runId: materialized.runId,
        status: "CANDIDATE_NOT_COMPILE_PASSED",
        ...emptyProcessFields(),
      });
    } else {
      await ensureJsonEvidence(
        options.execution.batchDirectory,
        functionalCaseEvidencePath(caseIndex),
        caseResult,
      );
    }
    caseResults.push(caseResult);
  }

  const functionalPassed = caseResults.filter((result) => result.status === "PASSED").length;
  const functionalFailed = caseResults.filter((result) => result.status === "MISMATCH").length;
  const verificationInvalid = caseResults.filter((result) =>
    [
      "SIMULATION_COMPILE_ERROR",
      "SIMULATION_COMPILE_TIMEOUT",
      "SIMULATION_ERROR",
      "SIMULATION_TIMEOUT",
      "OUTPUT_INVALID",
    ].includes(result.status),
  ).length;
  const functionalNotRun =
    caseResults.filter((result) => result.status === "CANDIDATE_NOT_COMPILE_PASSED").length +
    (options.execution.inputManifest.selectedCases.length - caseResults.length);
  const compilePassed = caseResults.filter(
    (caseResult) => caseResult.status !== "CANDIDATE_NOT_COMPILE_PASSED",
  ).length;
  const result = FunctionalSimulationResultSchema.parse({
    schemaVersion: 1,
    authoritative: false,
    claim: "FUNCTIONAL_SIMULATION",
    batchId: options.execution.result.batchId,
    status:
      options.execution.result.status === "INVALID" || verificationInvalid > 0
        ? "INVALID"
        : "COMPLETED",
    caseCount: options.execution.inputManifest.selectedCases.length,
    compilePassed,
    functionalPassed,
    functionalFailed,
    functionalNotRun,
    verificationInvalid,
    maxRepairIterations: options.maxRepairIterations ?? 0,
    cases: caseResults,
  });
  await writeJsonEvidenceExclusive(
    options.execution.batchDirectory,
    `${BATCH_INTERNAL_DIRECTORY}/evidence/functional-simulation-result.json`,
    result,
  );
  await writeJsonEvidenceExclusive(options.execution.batchDirectory, "summary.json", {
    schemaVersion: 1,
    authoritative: false,
    claim: "FUNCTIONAL_SIMULATION",
    batchId: result.batchId,
    status: result.status,
    caseCount: result.caseCount,
    compilePassed: result.compilePassed,
    functionalPassed: result.functionalPassed,
    functionalFailed: result.functionalFailed,
    functionalNotRun: result.functionalNotRun,
    verificationInvalid: result.verificationInvalid,
    maxRepairIterations: result.maxRepairIterations,
    rtlDirectory: "rtl",
    internalEvidenceDirectory: `${BATCH_INTERNAL_DIRECTORY}/evidence`,
  });
  return result;
}
