#!/usr/bin/env node

import { lstat, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CHIPBENCH_DATASET_LOCK,
  BatchEvaluationResultSchema,
  BatchIdSchema,
  BatchInputManifestSchema,
  CompileRequestSchema,
  ChipBenchFixtureProvider,
  CoreLoopException,
  CoreLoopErrorSchema,
  DatasetDescriptorSchema,
  EvaluationProfileSchema,
  FIXED_ICARUS_PROFILE_ID,
  IcarusCompileAdapter,
  OpenCodeMismatchAnalyzer,
  OpenCodeRtlAgentAdapter,
  PiRtlAgentAdapter,
  VERILOG_EVAL_DATASET_LOCK,
  VerilogEvalFunctionalResultSchema,
  VerilogEvalFixtureProvider,
  chipBenchCacheRoot,
  chipBenchDatasetDirectory,
  createBaselineWorkspaceManifest,
  evaluateCoreLoopBatch,
  evaluateVerilogEvalFunctionalBatch,
  createRunId,
  icarusExecutableFromEnvironment,
  listFixtureCases,
  openCodeExperimentConfigFromEnvironment,
  piExperimentConfigFromEnvironment,
  prepareChipBenchDataset,
  prepareVerilogEvalDataset,
  requireFixtureProvider,
  scanRegularFiles,
  updateObservedIssues,
  verilogEvalCacheRoot,
  verilogEvalDatasetDirectory,
} from "@rtl-agent/core-loop";
import type * as CoreLoop from "@rtl-agent/core-loop";
import type {
  CoreLoopCompilerAdapter,
  EvaluationProfile,
  FixtureProvider,
  MismatchAnalyzer,
  OpenCodeExperimentConfig,
  RtlAgentAdapter,
} from "@rtl-agent/core-loop";
import { loadRepositoryEnvironment } from "./environment.js";
import {
  resolveEvaluationProfileSelection,
  type EvaluationCaseSelectionRequest,
} from "./profile-selection.js";
import {
  createVerilogEvalKimiBaseProfile,
  createVerilogEvalKimiPiBaseProfile,
  VERILOG_EVAL_KIMI_PROFILE_ID,
  VERILOG_EVAL_KIMI_PI_PROFILE_ID,
} from "./verilog-eval-profile.js";

export type RtlCoreLoopWorkspaceDependency = typeof CoreLoop.packageVersion;
const DEFAULT_REPOSITORY_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

export interface RtlCoreLoopEvaluationDependencies {
  readonly profiles: readonly EvaluationProfile[];
  readonly providerImplementationDigest: EvaluationProfile["providerImplementationDigest"];
  readonly agentAdapter?: RtlAgentAdapter;
  readonly compilerAdapter?: CoreLoopCompilerAdapter;
  readonly mismatchAnalyzer?: MismatchAnalyzer;
  readonly batchesRoot?: string;
}

export interface RtlCoreLoopDatasetDependencies {
  readonly cacheRoot?: string;
  readonly prepareDataset?: typeof prepareVerilogEvalDataset;
  readonly chipBenchCacheRoot?: string;
  readonly prepareChipBenchDataset?: typeof prepareChipBenchDataset;
}

type DatasetName = "verilog-eval" | "chipbench";

interface ParsedEvaluationCommand {
  readonly profileId: string;
  readonly selection?: EvaluationCaseSelectionRequest;
}

interface PostProcessingWarning {
  readonly code: "MISMATCH_ANALYSIS_FAILED";
  readonly message: string;
  readonly retryCommand: string;
}

function parsedCoreLoopError(error: unknown): CoreLoop.CoreLoopError | undefined {
  if (error instanceof CoreLoopException) return error.error;
  if (typeof error !== "object" || error === null || !("error" in error)) return undefined;
  const parsed = CoreLoopErrorSchema.safeParse((error as { readonly error: unknown }).error);
  return parsed.success ? parsed.data : undefined;
}

async function readJsonFile(hostPath: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(hostPath, "utf8")) as unknown;
  } catch {
    throw new CoreLoopException(
      "MISMATCH_ANALYSIS_FAILED",
      "Existing batch evidence could not be read for mismatch reanalysis",
    );
  }
}

async function loadExistingBatchExecution(
  batchesRoot: string,
  rawBatchId: string,
): Promise<{
  execution: CoreLoop.CoreLoopBatchExecution;
  functionalResult: CoreLoop.VerilogEvalFunctionalResult;
}> {
  const parsedBatchId = BatchIdSchema.safeParse(rawBatchId);
  if (!parsedBatchId.success) {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      "Core Loop reanalyze command requires a valid batch ID",
    );
  }
  const batchId = parsedBatchId.data;
  const batchDirectory = path.join(path.resolve(batchesRoot), batchId);
  try {
    const [inputManifest, result, functionalResult] = await Promise.all([
      readJsonFile(path.join(batchDirectory, "_internal", "evidence", "batch-input-manifest.json")),
      readJsonFile(path.join(batchDirectory, "_internal", "evidence", "batch-result.json")),
      readJsonFile(
        path.join(batchDirectory, "_internal", "evidence", "functional-simulation-result.json"),
      ),
    ]);
    const parsedInputManifest = BatchInputManifestSchema.parse(inputManifest);
    const parsedResult = BatchEvaluationResultSchema.parse(result);
    const parsedFunctional = VerilogEvalFunctionalResultSchema.parse(functionalResult);
    const materializedByRunId = new Map<
      string,
      (typeof parsedInputManifest.materializedCases)[number]
    >(parsedInputManifest.materializedCases.map((item) => [item.runId, item]));
    const mismatchIdentityInvalid = parsedFunctional.cases
      .filter((item) => item.status === "MISMATCH")
      .some((item) => {
        const materialized = materializedByRunId.get(item.runId);
        return (
          materialized === undefined ||
          materialized.caseRef.identity.caseId !== item.caseRef.identity.caseId ||
          materialized.caseRef.caseSourceDigest !== item.caseRef.caseSourceDigest
        );
      });
    if (
      parsedResult.batchId !== batchId ||
      parsedFunctional.batchId !== batchId ||
      parsedResult.batchInputManifestDigest !== parsedInputManifest.manifestDigest ||
      mismatchIdentityInvalid
    ) {
      throw new Error("batch identity mismatch");
    }
    return {
      execution: {
        batchDirectory,
        inputManifest: parsedInputManifest,
        result: parsedResult,
      },
      functionalResult: parsedFunctional,
    };
  } catch (error) {
    if (error instanceof CoreLoopException) throw error;
    throw new CoreLoopException(
      "MISMATCH_ANALYSIS_FAILED",
      "Existing batch evidence is missing, invalid, or identity-inconsistent",
    );
  }
}

export async function updateObservedIssuesBestEffort(options: {
  readonly knowledgeRoot: string;
  readonly execution: CoreLoop.CoreLoopBatchExecution;
  readonly functionalResult?: CoreLoop.VerilogEvalFunctionalResult;
  readonly mismatchAnalyzer?: MismatchAnalyzer;
}): Promise<PostProcessingWarning | undefined> {
  try {
    await updateObservedIssues(options);
    return undefined;
  } catch (error) {
    const parsedError = parsedCoreLoopError(error);
    if (parsedError?.code === "MISMATCH_ANALYSIS_FAILED") {
      return {
        code: "MISMATCH_ANALYSIS_FAILED",
        message: parsedError.message,
        retryCommand: `rtl-core-loop reanalyze --batch ${options.execution.result.batchId}`,
      };
    }
    throw error;
  }
}

function configuredVerilogEvalCacheRoot(
  environment: NodeJS.ProcessEnv,
  repositoryRoot: string,
  override?: string,
): string {
  const configured = override ?? environment.RTL_AGENT_VERILOG_EVAL_CACHE_ROOT;
  return configured === undefined || configured.trim().length === 0
    ? verilogEvalCacheRoot(repositoryRoot)
    : path.resolve(configured);
}

function configuredChipBenchCacheRoot(
  environment: NodeJS.ProcessEnv,
  repositoryRoot: string,
  override?: string,
): string {
  const configured = override ?? environment.RTL_AGENT_CHIPBENCH_CACHE_ROOT;
  return configured === undefined || configured.trim().length === 0
    ? chipBenchCacheRoot(repositoryRoot)
    : path.resolve(configured);
}

function selectedDataset(arguments_: readonly string[]): DatasetName | undefined {
  if (arguments_.length === 1) return "verilog-eval";
  if (
    arguments_.length === 3 &&
    arguments_[1] === "--dataset" &&
    (arguments_[2] === "verilog-eval" || arguments_[2] === "chipbench")
  ) {
    return arguments_[2];
  }
  return undefined;
}

function parseNamedOptions(arguments_: readonly string[]): ReadonlyMap<string, string> {
  if (arguments_.length % 2 !== 0) {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      "Core Loop evaluation command arguments are invalid",
    );
  }
  const options = new Map<string, string>();
  for (let index = 0; index < arguments_.length; index += 2) {
    const name = arguments_[index]!;
    const value = arguments_[index + 1]!;
    if (!name.startsWith("--") || value.length === 0 || options.has(name)) {
      throw new CoreLoopException(
        "EVALUATION_PROFILE_INVALID",
        "Core Loop evaluation command arguments are invalid",
      );
    }
    options.set(name, value);
  }
  return options;
}

function parseEvaluationCommand(arguments_: readonly string[]): ParsedEvaluationCommand {
  const command = arguments_[0];
  const options = parseNamedOptions(arguments_.slice(1));
  const profileId = options.get("--profile");
  if (profileId === undefined) {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      "Core Loop evaluation command arguments are invalid",
    );
  }

  if (command === "run") {
    const caseId = options.get("--case");
    if (options.size !== 2 || caseId === undefined) {
      throw new CoreLoopException(
        "EVALUATION_PROFILE_INVALID",
        "Core Loop run command requires --profile and --case",
      );
    }
    return { profileId, selection: { kind: "CASES", cases: [caseId] } };
  }

  if (command !== "evaluate") {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      "Core Loop evaluation command arguments are invalid",
    );
  }
  if (options.size === 1) return { profileId };

  const begin = options.get("--begin");
  const end = options.get("--end");
  const cases = options.get("--cases");
  if (options.size === 3 && begin !== undefined && end !== undefined && cases === undefined) {
    return { profileId, selection: { kind: "RANGE", begin, end } };
  }
  if (options.size === 2 && cases !== undefined && begin === undefined && end === undefined) {
    const selectors = cases.split(",").map((value) => value.trim());
    if (selectors.some((value) => value.length === 0)) {
      throw new CoreLoopException(
        "EVALUATION_PROFILE_INVALID",
        "--cases must contain a comma-separated list of case selectors",
      );
    }
    return { profileId, selection: { kind: "CASES", cases: selectors } };
  }
  throw new CoreLoopException(
    "EVALUATION_PROFILE_INVALID",
    "Use either --begin with --end or --cases, but not both",
  );
}

async function runCompileSmoke(
  environment: NodeJS.ProcessEnv,
  repositoryRoot: string,
): Promise<unknown> {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "rtl-core-loop-compile-smoke-"));
  try {
    const runId = createRunId();
    const runDirectory = path.join(temporaryRoot, runId);
    const workspaceDirectory = path.join(runDirectory, "workspace");
    const rtlDirectory = path.join(workspaceDirectory, "rtl");
    await mkdir(rtlDirectory, { recursive: true });
    await writeFile(path.join(workspaceDirectory, "spec.md"), "Synthetic compile smoke only\n");
    const sourcePath = path.join(rtlDirectory, "dut.sv");
    await writeFile(
      sourcePath,
      "module dut(input logic a, output logic y); assign y = a; endmodule\n",
    );
    const adapter = new IcarusCompileAdapter({
      executable: icarusExecutableFromEnvironment(environment),
      probeWorkingDirectory: repositoryRoot,
    });
    const workspace = { runId, runDirectory, workspaceDirectory };
    const buildRequest = async (attempt: number) => {
      const manifest = await createBaselineWorkspaceManifest(runDirectory);
      return CompileRequestSchema.parse({
        schemaVersion: 1,
        runId,
        attempt,
        compilerProfileId: FIXED_ICARUS_PROFILE_ID,
        topModule: "dut",
        workspaceRtlRoot: "rtl",
        sourceFiles: ["rtl/dut.sv"],
        workspaceManifestDigest: manifest.manifestDigest,
      });
    };
    const passed = await adapter.compile(await buildRequest(1), workspace);
    await writeFile(sourcePath, "module dut( endmodule\n");
    const failed = await adapter.compile(await buildRequest(2), workspace);
    const files = await scanRegularFiles(runDirectory);
    if (
      passed.status !== "COMPILE_PASSED" ||
      failed.status !== "COMPILE_ERROR" ||
      files.map((file) => file.logicalPath).join(",") !== "workspace/rtl/dut.sv,workspace/spec.md"
    ) {
      throw new Error("Fixed Icarus compile smoke did not meet its acceptance contract");
    }
    return {
      compilerProfileId: FIXED_ICARUS_PROFILE_ID,
      toolVersion: passed.toolVersion,
      passStatus: passed.status,
      errorStatus: failed.status,
      authoritative: false,
      claim: "COMPILE_ONLY",
    };
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

export async function runRtlCoreLoopCli(
  arguments_: readonly string[],
  provider: FixtureProvider | undefined,
  writeOutput: (line: string) => void = console.log,
  writeError: (line: string) => void = console.error,
  environment: NodeJS.ProcessEnv = process.env,
  repositoryRoot: string = DEFAULT_REPOSITORY_ROOT,
  evaluationDependencies?: RtlCoreLoopEvaluationDependencies,
  datasetDependencies?: RtlCoreLoopDatasetDependencies,
): Promise<number> {
  const dataset =
    arguments_[0] === "fixtures-check" || arguments_[0] === "dataset-prepare"
      ? selectedDataset(arguments_)
      : undefined;
  if (
    (dataset !== undefined &&
      (arguments_[0] === "fixtures-check" || arguments_[0] === "dataset-prepare")) ||
    (arguments_.length === 1 &&
      (arguments_[0] === "agent-probe" ||
        arguments_[0] === "pi-agent-probe" ||
        arguments_[0] === "compile-smoke"))
  ) {
    try {
      if (arguments_[0] === "dataset-prepare") {
        if (dataset === "chipbench") {
          const cacheRoot = configuredChipBenchCacheRoot(
            environment,
            repositoryRoot,
            datasetDependencies?.chipBenchCacheRoot,
          );
          const result = await (
            datasetDependencies?.prepareChipBenchDataset ?? prepareChipBenchDataset
          )({
            destinationDirectory: chipBenchDatasetDirectory(cacheRoot),
          });
          writeOutput(JSON.stringify({ ok: true, result }));
          return 0;
        }
        const cacheRoot = configuredVerilogEvalCacheRoot(
          environment,
          repositoryRoot,
          datasetDependencies?.cacheRoot,
        );
        const result = await (datasetDependencies?.prepareDataset ?? prepareVerilogEvalDataset)({
          destinationDirectory: verilogEvalDatasetDirectory(cacheRoot),
        });
        writeOutput(JSON.stringify({ ok: true, result }));
        return 0;
      }
      if (arguments_[0] === "compile-smoke") {
        const result = await runCompileSmoke(environment, repositoryRoot);
        writeOutput(JSON.stringify({ ok: true, result }));
        return 0;
      }
      if (arguments_[0] === "agent-probe" || arguments_[0] === "pi-agent-probe") {
        const adapter =
          arguments_[0] === "pi-agent-probe"
            ? new PiRtlAgentAdapter(piExperimentConfigFromEnvironment(environment, repositoryRoot))
            : new OpenCodeRtlAgentAdapter(
                openCodeExperimentConfigFromEnvironment(environment, repositoryRoot),
              );
        const capability = await adapter.probe();
        writeOutput(JSON.stringify({ ok: true, capability }));
        return 0;
      }
      const configured = requireFixtureProvider(provider);
      const descriptor = DatasetDescriptorSchema.parse(await configured.describe());
      const caseCounts = Object.fromEntries(
        await Promise.all(
          descriptor.splits.map(async (split) => [
            split,
            (
              await listFixtureCases(configured, {
                schemaVersion: 1,
                split,
              })
            ).length,
          ]),
        ),
      );
      writeOutput(JSON.stringify({ ok: true, descriptor, caseCounts }));
      return 0;
    } catch (error) {
      const safeError =
        error instanceof CoreLoopException
          ? error.error
          : new CoreLoopException("INTERNAL_ERROR", "An internal error occurred").error;
      writeError(JSON.stringify({ ok: false, error: safeError }));
      return 2;
    }
  }

  const command = arguments_[0];
  if (command === "reanalyze") {
    try {
      const options = parseNamedOptions(arguments_.slice(1));
      const rawBatchId = options.get("--batch");
      if (options.size !== 1 || rawBatchId === undefined) {
        throw new CoreLoopException(
          "EVALUATION_PROFILE_INVALID",
          "Core Loop reanalyze command requires --batch",
        );
      }
      const batchesRoot =
        evaluationDependencies?.batchesRoot ?? path.join(repositoryRoot, ".rtl-agent", "batches");
      const { execution, functionalResult } = await loadExistingBatchExecution(
        batchesRoot,
        rawBatchId,
      );
      const hasMismatch = functionalResult.cases.some((item) => item.status === "MISMATCH");
      const mismatchAnalyzer =
        evaluationDependencies?.mismatchAnalyzer ??
        (hasMismatch
          ? new OpenCodeMismatchAnalyzer(
              openCodeExperimentConfigFromEnvironment(environment, repositoryRoot),
            )
          : undefined);
      await updateObservedIssues({
        knowledgeRoot: path.join(path.dirname(batchesRoot), "knowledge"),
        execution,
        functionalResult,
        ...(mismatchAnalyzer === undefined ? {} : { mismatchAnalyzer }),
      });
      writeOutput(
        JSON.stringify({
          ok: true,
          result: {
            batchId: execution.result.batchId,
            status: "ANALYSIS_COMPLETED",
            mismatchCount: functionalResult.functionalFailed,
          },
        }),
      );
      return 0;
    } catch (error) {
      const safeError =
        error instanceof CoreLoopException
          ? error.error
          : new CoreLoopException("INTERNAL_ERROR", "An internal error occurred").error;
      writeError(JSON.stringify({ ok: false, error: safeError }));
      return 2;
    }
  }
  if (command === "run" || command === "evaluate") {
    try {
      const configuredProvider = requireFixtureProvider(provider);
      const parsedCommand = parseEvaluationCommand(arguments_);
      let agentAdapter = evaluationDependencies?.agentAdapter;
      let compilerAdapter = evaluationDependencies?.compilerAdapter;
      let openCodeConfig: OpenCodeExperimentConfig | undefined;
      let providerImplementationDigest = evaluationDependencies?.providerImplementationDigest;
      let registered = evaluationDependencies?.profiles.find(
        (profile) => profile.evaluationProfileId === parsedCommand.profileId,
      );
      if (
        registered === undefined &&
        evaluationDependencies === undefined &&
        (parsedCommand.profileId === VERILOG_EVAL_KIMI_PROFILE_ID ||
          parsedCommand.profileId === VERILOG_EVAL_KIMI_PI_PROFILE_ID)
      ) {
        if (parsedCommand.selection === undefined) {
          throw new CoreLoopException(
            "EVALUATION_PROFILE_INVALID",
            `${parsedCommand.profileId} requires --begin/--end or --cases`,
          );
        }
        if (parsedCommand.profileId === VERILOG_EVAL_KIMI_PI_PROFILE_ID) {
          agentAdapter = new PiRtlAgentAdapter(
            piExperimentConfigFromEnvironment(environment, repositoryRoot),
          );
        } else {
          openCodeConfig = openCodeExperimentConfigFromEnvironment(environment, repositoryRoot);
          agentAdapter = new OpenCodeRtlAgentAdapter(openCodeConfig);
        }
        compilerAdapter = new IcarusCompileAdapter({
          executable: icarusExecutableFromEnvironment(environment),
          probeWorkingDirectory: repositoryRoot,
        });
        registered =
          parsedCommand.profileId === VERILOG_EVAL_KIMI_PI_PROFILE_ID
            ? await createVerilogEvalKimiPiBaseProfile(
                configuredProvider,
                agentAdapter,
                compilerAdapter,
              )
            : await createVerilogEvalKimiBaseProfile(
                configuredProvider,
                agentAdapter,
                compilerAdapter,
              );
        providerImplementationDigest = VERILOG_EVAL_DATASET_LOCK.providerImplementationDigest;
      }
      if (registered === undefined) {
        throw new CoreLoopException(
          "EVALUATION_PROFILE_NOT_CONFIGURED",
          "Requested Core Loop evaluation profile is not configured",
        );
      }
      if (providerImplementationDigest === undefined) {
        throw new CoreLoopException(
          "EVALUATION_PROFILE_NOT_CONFIGURED",
          "Requested Core Loop evaluation profile has no Provider implementation lock",
        );
      }
      const profile =
        parsedCommand.selection === undefined
          ? EvaluationProfileSchema.parse(registered)
          : await resolveEvaluationProfileSelection(
              configuredProvider,
              registered,
              parsedCommand.selection,
            );
      if (agentAdapter === undefined) {
        if ("piVersion" in profile.agentCapability) {
          agentAdapter = new PiRtlAgentAdapter(
            piExperimentConfigFromEnvironment(environment, repositoryRoot),
          );
        } else {
          openCodeConfig = openCodeExperimentConfigFromEnvironment(environment, repositoryRoot);
          agentAdapter = new OpenCodeRtlAgentAdapter(openCodeConfig);
        }
      }
      compilerAdapter ??= new IcarusCompileAdapter({
        executable: icarusExecutableFromEnvironment(environment),
        probeWorkingDirectory: repositoryRoot,
      });
      const batchesRoot =
        evaluationDependencies?.batchesRoot ?? path.join(repositoryRoot, ".rtl-agent", "batches");
      const execution = await evaluateCoreLoopBatch({
        provider: configuredProvider,
        providerImplementationDigest,
        profile,
        agentAdapter,
        compilerAdapter,
        batchesRoot,
      });
      const functionalResult =
        configuredProvider instanceof VerilogEvalFixtureProvider &&
        profile.dataset.datasetId === VERILOG_EVAL_DATASET_LOCK.datasetId
          ? await evaluateVerilogEvalFunctionalBatch({
              execution,
              provider: configuredProvider,
              iverilogExecutable: icarusExecutableFromEnvironment(environment),
              ...(environment.RTL_AGENT_VVP_EXECUTABLE === undefined
                ? {}
                : { vvpExecutable: environment.RTL_AGENT_VVP_EXECUTABLE }),
            })
          : undefined;
      const hasMismatch =
        functionalResult?.cases.some((item) => item.status === "MISMATCH") ?? false;
      const mismatchAnalyzer =
        evaluationDependencies?.mismatchAnalyzer ??
        (hasMismatch && openCodeConfig !== undefined
          ? new OpenCodeMismatchAnalyzer(openCodeConfig)
          : undefined);
      const postProcessingWarning = await updateObservedIssuesBestEffort({
        knowledgeRoot: path.join(path.dirname(batchesRoot), "knowledge"),
        execution,
        ...(functionalResult === undefined ? {} : { functionalResult }),
        ...(mismatchAnalyzer === undefined ? {} : { mismatchAnalyzer }),
      });
      const finalStatus = functionalResult?.status ?? execution.result.status;
      writeOutput(
        JSON.stringify({
          ok: finalStatus === "COMPLETED",
          result: {
            batchId: execution.result.batchId,
            status: finalStatus,
            authoritative: false,
            claim: functionalResult?.claim ?? execution.result.claim,
            caseCount:
              functionalResult?.caseCount ?? execution.result.metrics.overall.evaluationDenominator,
            compilePassed:
              functionalResult?.compilePassed ??
              execution.result.runs.filter(
                (run) => run.status === "COMPLETE" && run.finalResult.outcome === "COMPILE_PASSED",
              ).length,
            ...(functionalResult === undefined
              ? {}
              : {
                  functionalPassed: functionalResult.functionalPassed,
                  functionalFailed: functionalResult.functionalFailed,
                  functionalNotRun: functionalResult.functionalNotRun,
                  verificationInvalid: functionalResult.verificationInvalid,
                }),
            batchDirectory: `.rtl-agent/batches/${execution.result.batchId}`,
            rtlDirectory: `.rtl-agent/batches/${execution.result.batchId}/rtl`,
            postProcessingStatus: postProcessingWarning === undefined ? "COMPLETED" : "WARNING",
          },
          ...(postProcessingWarning === undefined ? {} : { warnings: [postProcessingWarning] }),
        }),
      );
      return finalStatus === "COMPLETED" ? 0 : 3;
    } catch (error) {
      const safeError =
        error instanceof CoreLoopException
          ? error.error
          : new CoreLoopException("INTERNAL_ERROR", "An internal error occurred").error;
      writeError(JSON.stringify({ ok: false, error: safeError }));
      return 2;
    }
  }
  writeError(
    "Usage: rtl-core-loop <dataset-prepare [--dataset <verilog-eval|chipbench>]|fixtures-check [--dataset <verilog-eval|chipbench>]|agent-probe|pi-agent-probe|compile-smoke|run --profile <id> --case <id>|evaluate --profile <id> (--begin <case> --end <case>|--cases <case,...>)|reanalyze --batch <batch-id>>",
  );
  return 2;
}

export const packageVersion = "0.0.0" as const;

const invokedPath = process.argv[1];
if (invokedPath !== undefined && fileURLToPath(import.meta.url) === invokedPath) {
  const repositoryEnvironment = await loadRepositoryEnvironment(DEFAULT_REPOSITORY_ROOT);
  const requestedDataset = selectedDataset(process.argv.slice(2)) ?? "verilog-eval";
  const datasetDirectory =
    requestedDataset === "chipbench"
      ? chipBenchDatasetDirectory(
          configuredChipBenchCacheRoot(repositoryEnvironment, DEFAULT_REPOSITORY_ROOT),
          CHIPBENCH_DATASET_LOCK,
        )
      : verilogEvalDatasetDirectory(
          configuredVerilogEvalCacheRoot(repositoryEnvironment, DEFAULT_REPOSITORY_ROOT),
          VERILOG_EVAL_DATASET_LOCK,
        );
  const datasetStat = await lstat(datasetDirectory).catch(() => undefined);
  const provider =
    datasetStat === undefined
      ? undefined
      : requestedDataset === "chipbench"
        ? new ChipBenchFixtureProvider(datasetDirectory, CHIPBENCH_DATASET_LOCK)
        : new VerilogEvalFixtureProvider(datasetDirectory, VERILOG_EVAL_DATASET_LOCK);
  process.exitCode = await runRtlCoreLoopCli(
    process.argv.slice(2),
    provider,
    console.log,
    console.error,
    repositoryEnvironment,
  );
}
