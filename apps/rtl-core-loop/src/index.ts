#!/usr/bin/env node

import { lstat, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CHIPBENCH_DATASET_LOCK,
  CompileRequestSchema,
  ChipBenchFixtureProvider,
  CoreLoopException,
  DatasetDescriptorSchema,
  EvaluationProfileSchema,
  FIXED_ICARUS_PROFILE_ID,
  IcarusCompileAdapter,
  OpenCodeRtlAgentAdapter,
  PiRtlAgentAdapter,
  VERILOG_EVAL_DATASET_LOCK,
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
  verilogEvalCacheRoot,
  verilogEvalDatasetDirectory,
} from "@rtl-agent/core-loop";
import type * as CoreLoop from "@rtl-agent/core-loop";
import type {
  CoreLoopCompilerAdapter,
  EvaluationProfile,
  FixtureProvider,
  MismatchAnalyzer,
  RtlAgentAdapter,
} from "@rtl-agent/core-loop";
import { parseNamedOptions } from "./cli-arguments.js";
import { executeCliCommand } from "./cli-error.js";
import { runCoverageCommand, type RtlCoreLoopCoverageDependencies } from "./coverage-command.js";
import { loadRepositoryEnvironment } from "./environment.js";
import {
  createMismatchAnalyzer,
  parseMismatchAnalyzerBackend,
  type MismatchAnalyzerBackend,
  type MismatchAnalyzerFactory,
} from "./mismatch-analyzer-selection.js";
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
import { runReanalysisCommand, updateObservedIssuesBestEffort } from "./reanalysis-command.js";

export { updateObservedIssuesBestEffort } from "./reanalysis-command.js";
export type { RtlCoreLoopCoverageDependencies } from "./coverage-command.js";

export type RtlCoreLoopWorkspaceDependency = typeof CoreLoop.packageVersion;
const DEFAULT_REPOSITORY_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

export interface RtlCoreLoopEvaluationDependencies {
  readonly profiles: readonly EvaluationProfile[];
  readonly providerImplementationDigest: EvaluationProfile["providerImplementationDigest"];
  readonly agentAdapter?: RtlAgentAdapter;
  readonly compilerAdapter?: CoreLoopCompilerAdapter;
  readonly mismatchAnalyzer?: MismatchAnalyzer;
  readonly mismatchAnalyzerFactory?: MismatchAnalyzerFactory;
  readonly batchesRoot?: string;
}

export interface RtlCoreLoopDatasetDependencies {
  readonly cacheRoot?: string;
  readonly prepareDataset?: typeof prepareVerilogEvalDataset;
  readonly chipBenchCacheRoot?: string;
  readonly prepareChipBenchDataset?: typeof prepareChipBenchDataset;
}

type DatasetName = "verilog-eval" | "chipbench";
type AgentBackend = "opencode" | "pi";

interface ParsedEvaluationCommand {
  readonly profileId: string;
  readonly agentBackend?: AgentBackend;
  readonly mismatchAnalyzerBackend?: MismatchAnalyzerBackend;
  readonly selection?: EvaluationCaseSelectionRequest;
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

function parseEvaluationCommand(arguments_: readonly string[]): ParsedEvaluationCommand {
  const command = arguments_[0];
  const options = parseNamedOptions(arguments_.slice(1));
  const profileId = options.get("--profile");
  const mismatchAnalyzerBackend = parseMismatchAnalyzerBackend(options.get("--analyzer"));
  if (profileId === undefined) {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      "Core Loop evaluation command arguments are invalid",
    );
  }

  if (command === "run") {
    const caseId = options.get("--case");
    const allowedOptions = new Set(["--profile", "--case", "--analyzer"]);
    if (
      caseId === undefined ||
      [...options.keys()].some((name) => !allowedOptions.has(name)) ||
      options.size !== (mismatchAnalyzerBackend === undefined ? 2 : 3)
    ) {
      throw new CoreLoopException(
        "EVALUATION_PROFILE_INVALID",
        "Core Loop run command requires --profile, --case, and optional --analyzer",
      );
    }
    return {
      profileId,
      ...(mismatchAnalyzerBackend === undefined ? {} : { mismatchAnalyzerBackend }),
      selection: { kind: "CASES", cases: [caseId] },
    };
  }

  if (command !== "evaluate") {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      "Core Loop evaluation command arguments are invalid",
    );
  }
  const agentBackend = options.get("--agent");
  if (agentBackend !== undefined && agentBackend !== "opencode" && agentBackend !== "pi") {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      "--agent must be either opencode or pi",
    );
  }
  const allowedOptions = new Set([
    "--profile",
    "--agent",
    "--analyzer",
    "--begin",
    "--end",
    "--cases",
  ]);
  if ([...options.keys()].some((name) => !allowedOptions.has(name))) {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      "Core Loop evaluation command arguments are invalid",
    );
  }
  const selectionOptionCount =
    options.size -
    1 -
    (agentBackend === undefined ? 0 : 1) -
    (mismatchAnalyzerBackend === undefined ? 0 : 1);
  const parsedBackend = agentBackend as AgentBackend | undefined;
  if (selectionOptionCount === 0) {
    return {
      profileId,
      ...(parsedBackend === undefined ? {} : { agentBackend: parsedBackend }),
      ...(mismatchAnalyzerBackend === undefined ? {} : { mismatchAnalyzerBackend }),
    };
  }

  const begin = options.get("--begin");
  const end = options.get("--end");
  const cases = options.get("--cases");
  if (
    selectionOptionCount === 2 &&
    begin !== undefined &&
    end !== undefined &&
    cases === undefined
  ) {
    return {
      profileId,
      ...(parsedBackend === undefined ? {} : { agentBackend: parsedBackend }),
      ...(mismatchAnalyzerBackend === undefined ? {} : { mismatchAnalyzerBackend }),
      selection: { kind: "RANGE", begin, end },
    };
  }
  if (
    selectionOptionCount === 1 &&
    cases !== undefined &&
    begin === undefined &&
    end === undefined
  ) {
    const selectors = cases.split(",").map((value) => value.trim());
    if (selectors.some((value) => value.length === 0)) {
      throw new CoreLoopException(
        "EVALUATION_PROFILE_INVALID",
        "--cases must contain a comma-separated list of case selectors",
      );
    }
    return {
      profileId,
      ...(parsedBackend === undefined ? {} : { agentBackend: parsedBackend }),
      ...(mismatchAnalyzerBackend === undefined ? {} : { mismatchAnalyzerBackend }),
      selection: { kind: "CASES", cases: selectors },
    };
  }
  throw new CoreLoopException(
    "EVALUATION_PROFILE_INVALID",
    "Use either --begin with --end or --cases, but not both",
  );
}

function profileIdForAgentBackend(command: ParsedEvaluationCommand): string {
  if (command.agentBackend === undefined) return command.profileId;
  if (command.profileId === VERILOG_EVAL_KIMI_PROFILE_ID) {
    return command.agentBackend === "pi"
      ? VERILOG_EVAL_KIMI_PI_PROFILE_ID
      : VERILOG_EVAL_KIMI_PROFILE_ID;
  }
  if (command.profileId === VERILOG_EVAL_KIMI_PI_PROFILE_ID && command.agentBackend !== "pi") {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      `${VERILOG_EVAL_KIMI_PI_PROFILE_ID} requires --agent pi`,
    );
  }
  return command.profileId;
}

function profileAgentBackend(profile: EvaluationProfile): AgentBackend {
  return "piVersion" in profile.agentCapability ? "pi" : "opencode";
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
  coverageDependencies?: RtlCoreLoopCoverageDependencies,
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
    return executeCliCommand(async () => {
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
    }, writeError);
  }

  const command = arguments_[0];
  if (command === "coverage") {
    return executeCliCommand(
      () =>
        runCoverageCommand({
          arguments_,
          provider,
          writeOutput,
          environment,
          repositoryRoot,
          ...(coverageDependencies === undefined ? {} : { dependencies: coverageDependencies }),
        }),
      writeError,
    );
  }
  if (command === "reanalyze") {
    return executeCliCommand(
      () =>
        runReanalysisCommand({
          arguments_,
          writeOutput,
          environment,
          repositoryRoot,
          ...(evaluationDependencies?.batchesRoot === undefined
            ? {}
            : { batchesRoot: evaluationDependencies.batchesRoot }),
          ...(evaluationDependencies?.mismatchAnalyzer === undefined
            ? {}
            : { mismatchAnalyzer: evaluationDependencies.mismatchAnalyzer }),
          ...(evaluationDependencies?.mismatchAnalyzerFactory === undefined
            ? {}
            : { mismatchAnalyzerFactory: evaluationDependencies.mismatchAnalyzerFactory }),
        }),
      writeError,
    );
  }
  if (command === "run" || command === "evaluate") {
    return executeCliCommand(async () => {
      const configuredProvider = requireFixtureProvider(provider);
      const parsedCommand = parseEvaluationCommand(arguments_);
      const requestedProfileId = profileIdForAgentBackend(parsedCommand);
      let agentAdapter = evaluationDependencies?.agentAdapter;
      let compilerAdapter = evaluationDependencies?.compilerAdapter;
      let providerImplementationDigest = evaluationDependencies?.providerImplementationDigest;
      let registered = evaluationDependencies?.profiles.find(
        (profile) => profile.evaluationProfileId === requestedProfileId,
      );
      if (
        registered === undefined &&
        evaluationDependencies === undefined &&
        (requestedProfileId === VERILOG_EVAL_KIMI_PROFILE_ID ||
          requestedProfileId === VERILOG_EVAL_KIMI_PI_PROFILE_ID)
      ) {
        if (parsedCommand.selection === undefined) {
          throw new CoreLoopException(
            "EVALUATION_PROFILE_INVALID",
            `${requestedProfileId} requires --begin/--end or --cases`,
          );
        }
        if (requestedProfileId === VERILOG_EVAL_KIMI_PI_PROFILE_ID) {
          agentAdapter = new PiRtlAgentAdapter(
            piExperimentConfigFromEnvironment(environment, repositoryRoot),
          );
        } else {
          agentAdapter = new OpenCodeRtlAgentAdapter(
            openCodeExperimentConfigFromEnvironment(environment, repositoryRoot),
          );
        }
        compilerAdapter = new IcarusCompileAdapter({
          executable: icarusExecutableFromEnvironment(environment),
          probeWorkingDirectory: repositoryRoot,
        });
        registered =
          requestedProfileId === VERILOG_EVAL_KIMI_PI_PROFILE_ID
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
      if (
        parsedCommand.agentBackend !== undefined &&
        profileAgentBackend(registered) !== parsedCommand.agentBackend
      ) {
        throw new CoreLoopException(
          "EVALUATION_PROFILE_INVALID",
          `Requested profile does not use the ${parsedCommand.agentBackend} Agent backend`,
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
          agentAdapter = new OpenCodeRtlAgentAdapter(
            openCodeExperimentConfigFromEnvironment(environment, repositoryRoot),
          );
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
        ...(command === "evaluate"
          ? {
              onCaseStart: (progress: CoreLoop.CoreLoopBatchCaseProgress) => {
                writeError(
                  `正在处理 ${progress.caseRef.identity.caseId}... (${String(progress.caseNumber)}/${String(progress.caseCount)})`,
                );
              },
            }
          : {}),
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
        (hasMismatch
          ? (
              evaluationDependencies?.mismatchAnalyzerFactory ??
              ((backend) => createMismatchAnalyzer({ backend, environment, repositoryRoot }))
            )(parsedCommand.mismatchAnalyzerBackend ?? profileAgentBackend(profile))
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
            agentBackend: profileAgentBackend(profile),
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
    }, writeError);
  }
  writeError(
    "Usage: rtl-core-loop <dataset-prepare [--dataset <verilog-eval|chipbench>]|fixtures-check [--dataset <verilog-eval|chipbench>]|agent-probe|pi-agent-probe|compile-smoke|coverage --case <id> [--agent <opencode|pi>]|run --profile <id> --case <id> [--analyzer <opencode|pi>]|evaluate --profile <id> [--agent <opencode|pi>] [--analyzer <opencode|pi>] (--begin <case> --end <case>|--cases <case,...>)|reanalyze --batch <batch-id> [--analyzer <opencode|pi>]>",
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
