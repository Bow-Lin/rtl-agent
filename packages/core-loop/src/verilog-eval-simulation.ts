import { mkdir } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import { CapturedOutputSchema, FixtureCaseRefSchema } from "./contracts.js";
import type { CapturedOutput, FixtureCaseRef } from "./contracts.js";
import { BATCH_INTERNAL_DIRECTORY, type CoreLoopBatchExecution } from "./batch-evaluator.js";
import { FIXED_ICARUS_PROFILE, controlledIcarusEnvironment } from "./compiler-profile.js";
import { executeCompilerProcess } from "./compiler-process.js";
import type { CompilerProcessOptions, CompilerProcessResult } from "./compiler-process.js";
import { copyRegularTreeToEvidence, writeJsonEvidenceExclusive } from "./evidence.js";
import { asHostDirectoryForProvider } from "./fixture-provider.js";
import { scanRegularFiles } from "./filesystem.js";
import type {
  VerilogEvalFixtureProvider,
  VerilogEvalVerificationMaterialization,
} from "./verilog-eval-provider.js";

const FunctionalCaseStatusSchema = z.enum([
  "PASSED",
  "MISMATCH",
  "CANDIDATE_NOT_COMPILE_PASSED",
  "SIMULATION_COMPILE_ERROR",
  "SIMULATION_COMPILE_TIMEOUT",
  "SIMULATION_ERROR",
  "SIMULATION_TIMEOUT",
  "OUTPUT_INVALID",
]);

const FunctionalCaseResultSchema = z.strictObject({
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
});

export const VerilogEvalFunctionalResultSchema = z.strictObject({
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
  cases: z.array(FunctionalCaseResultSchema),
});

export type VerilogEvalFunctionalResult = z.infer<typeof VerilogEvalFunctionalResultSchema>;
type ProcessRunner = (options: CompilerProcessOptions) => Promise<CompilerProcessResult>;

export interface EvaluateVerilogEvalFunctionalOptions {
  readonly execution: CoreLoopBatchExecution;
  readonly provider: VerilogEvalFixtureProvider;
  readonly iverilogExecutable: string;
  readonly vvpExecutable?: string;
  readonly processRunner?: ProcessRunner;
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
  execution: CoreLoopBatchExecution,
  caseRef: FixtureCaseRef,
  runId: string,
): Promise<void> {
  const source = path.join(
    execution.batchDirectory,
    BATCH_INTERNAL_DIRECTORY,
    "runs",
    runId,
    "workspace",
    "rtl",
  );
  const files = await scanRegularFiles(source).catch(() => []);
  if (files.length === 0) return;
  await copyRegularTreeToEvidence(
    source,
    execution.batchDirectory,
    `rtl/${outputDirectoryName(caseRef)}`,
  );
}

async function materializeVerification(
  provider: VerilogEvalFixtureProvider,
  caseRef: FixtureCaseRef,
  destination: string,
): Promise<VerilogEvalVerificationMaterialization> {
  await mkdir(destination, { recursive: true });
  return provider.materializeVerification(caseRef, asHostDirectoryForProvider(destination));
}

export async function evaluateVerilogEvalFunctionalBatch(
  options: EvaluateVerilogEvalFunctionalOptions,
): Promise<VerilogEvalFunctionalResult> {
  const runner = options.processRunner ?? executeCompilerProcess;
  const byRunId = new Map(options.execution.result.runs.map((run) => [run.runId, run]));
  const caseResults: z.infer<typeof FunctionalCaseResultSchema>[] = [];

  for (const materialized of options.execution.inputManifest.materializedCases) {
    const caseRef = FixtureCaseRefSchema.parse(materialized.caseRef);
    const run = byRunId.get(materialized.runId);
    await publishCandidate(options.execution, caseRef, materialized.runId);
    if (
      run?.status !== "COMPLETE" ||
      run.evaluationValidity !== "EVALUATION_VALID" ||
      run.finalResult.outcome !== "COMPILE_PASSED"
    ) {
      caseResults.push(
        FunctionalCaseResultSchema.parse({
          schemaVersion: 1,
          caseRef,
          runId: materialized.runId,
          status: "CANDIDATE_NOT_COMPILE_PASSED",
          ...emptyProcessFields(),
        }),
      );
      continue;
    }

    const verificationDirectory = path.join(
      options.execution.batchDirectory,
      BATCH_INTERNAL_DIRECTORY,
      "verification",
      String(caseResults.length + 1).padStart(4, "0"),
    );
    const candidateDirectory = path.join(verificationDirectory, "candidate");
    const assetDirectory = path.join(verificationDirectory, "assets");
    await mkdir(candidateDirectory, { recursive: true });
    await copyRegularTreeToEvidence(
      path.join(
        options.execution.batchDirectory,
        BATCH_INTERNAL_DIRECTORY,
        "runs",
        materialized.runId,
        "workspace",
        "rtl",
      ),
      verificationDirectory,
      "candidate",
    );
    const assets = await materializeVerification(options.provider, caseRef, assetDirectory);
    const candidateSources = (await scanRegularFiles(candidateDirectory)).map(
      (file) => file.hostPath,
    );
    const simulationImage = path.join(verificationDirectory, "simulation.vvp");
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
        verificationDirectory,
      ),
    );
    if (compile.timedOut) {
      caseResults.push(
        FunctionalCaseResultSchema.parse({
          schemaVersion: 1,
          caseRef,
          runId: materialized.runId,
          status: "SIMULATION_COMPILE_TIMEOUT",
          ...emptyProcessFields(),
          compileExitCode: compile.exitCode,
          compileDurationMs: compile.durationMs,
          stdout: compile.stdout,
          stderr: compile.stderr,
        }),
      );
      continue;
    }
    if (
      compile.spawnError !== undefined ||
      compile.terminationFailed ||
      !compile.closeConfirmed ||
      compile.exitCode !== 0
    ) {
      caseResults.push(
        FunctionalCaseResultSchema.parse({
          schemaVersion: 1,
          caseRef,
          runId: materialized.runId,
          status: "SIMULATION_COMPILE_ERROR",
          ...emptyProcessFields(),
          compileExitCode: compile.exitCode,
          compileDurationMs: compile.durationMs,
          stdout: compile.stdout,
          stderr: compile.stderr,
        }),
      );
      continue;
    }

    const simulation = await runner(
      processOptions(
        options.vvpExecutable ?? vvpExecutableForIcarus(options.iverilogExecutable),
        [simulationImage],
        verificationDirectory,
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
    caseResults.push(
      FunctionalCaseResultSchema.parse({
        schemaVersion: 1,
        caseRef,
        runId: materialized.runId,
        status,
        mismatches: mismatch?.mismatches ?? null,
        samples: mismatch?.samples ?? null,
        outputMismatches,
        compileExitCode: compile.exitCode,
        simulationExitCode: simulation.exitCode,
        compileDurationMs: compile.durationMs,
        simulationDurationMs: simulation.durationMs,
        stdout: simulation.stdout,
        stderr: simulation.stderr,
      }),
    );
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
  const result = VerilogEvalFunctionalResultSchema.parse({
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
    rtlDirectory: "rtl",
    internalEvidenceDirectory: `${BATCH_INTERNAL_DIRECTORY}/evidence`,
  });
  return result;
}
