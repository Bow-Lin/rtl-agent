#!/usr/bin/env node

import { lstat, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
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
  EXPERIENCE_SUMMARIZER_PROMPT_DIGEST,
  FIXED_ICARUS_PROFILE_ID,
  FilesystemMemoryStore,
  IcarusCompileAdapter,
  MemoryBuildScopeSchema,
  MemoryModeSchema,
  OpenCodeRtlAgentAdapter,
  PiExperienceSummarizer,
  PiMemoryConsolidator,
  PiMemorySelector,
  PiRtlAgentAdapter,
  prepareMemoryExperiment,
  renderRelevantRtlMemory,
  VERILOG_EVAL_DATASET_LOCK,
  VerilogEvalFixtureProvider,
  chipBenchCacheRoot,
  chipBenchDatasetDirectory,
  createBaselineWorkspaceManifest,
  evaluateCoreLoopBatch,
  evaluateFunctionalSimulationCase,
  publishFunctionalSimulationCase,
  publishFunctionalSimulationBatch,
  writeFunctionalSimulationFeedback,
  createRunId,
  icarusExecutableFromEnvironment,
  listFixtureCases,
  openCodeExperimentConfigFromEnvironment,
  piExperimentConfigFromEnvironment,
  prepareChipBenchDataset,
  prepareVerilogEvalDataset,
  requireFixtureProvider,
  scanRegularFiles,
  sha256Jcs,
  selectMemoryBestEffort,
  summarizeCaseExperienceBestEffort,
  verilogEvalCacheRoot,
  verilogEvalDatasetDirectory,
} from "@rtl-agent/core-loop";
import type * as CoreLoop from "@rtl-agent/core-loop";
import type {
  CoreLoopCompilerAdapter,
  EvaluationProfile,
  FunctionalCaseResult,
  FunctionalVerificationProvider,
  FixtureProvider,
  MismatchAnalyzer,
  RtlAgentAdapter,
} from "@rtl-agent/core-loop";
import { parseNamedOptions } from "./cli-arguments.js";
import {
  CHIPBENCH_KIMI_PI_PROFILE_ID,
  CHIPBENCH_KIMI_PROFILE_ID,
  createChipBenchKimiBaseProfile,
  createChipBenchKimiPiBaseProfile,
  parseChipBenchSplit,
} from "./chipbench-profile.js";
import { executeCliCommand } from "./cli-error.js";
import { runCoverageCommand, type RtlCoreLoopCoverageDependencies } from "./coverage-command.js";
import {
  runI2cCoverageCommand,
  type RtlCoreLoopI2cCoverageDependencies,
} from "./i2c-coverage-command.js";
import { loadRepositoryEnvironment } from "./environment.js";
import { runMemoryBuildCommand } from "./memory-build-command.js";
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
export { parseI2cCoverageCommandOptions } from "./i2c-coverage-command.js";
export type { RtlCoreLoopCoverageDependencies } from "./coverage-command.js";
export type {
  I2cCoverageCommandOptions,
  RtlCoreLoopI2cCoverageDependencies,
} from "./i2c-coverage-command.js";

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
  readonly memoryStore?: FilesystemMemoryStore;
  readonly experienceSummarizer?: CoreLoop.ExperienceSummarizer;
  readonly memorySelector?: CoreLoop.MemorySelector;
  readonly memoryConsolidator?: CoreLoop.MemoryConsolidator;
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
  readonly dataset?: DatasetName;
  readonly split?: string;
  readonly selection?: EvaluationCaseSelectionRequest;
  readonly functionalRepairIterations: number;
  readonly memoryMode: CoreLoop.MemoryMode;
  readonly memorySnapshotId?: string;
  readonly memoryBuildSplits: readonly CoreLoop.MemoryBuildScope[];
}

const DEFAULT_FUNCTIONAL_REPAIR_ITERATIONS = 3;

async function persistMemoryBuildExperience(options: {
  readonly memoryRoot: string;
  readonly batchId: string;
  readonly caseNumber: number;
  readonly experience: CoreLoop.ExperienceRecord;
}): Promise<void> {
  const directory = path.join(options.memoryRoot, "experiences", options.batchId);
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, `${String(options.caseNumber).padStart(6, "0")}.json`),
    `${JSON.stringify(options.experience, undefined, 2)}\n`,
    { encoding: "utf8", flag: "wx" },
  );
}

function parseFunctionalRepairIterations(value: string | undefined): number {
  if (value === undefined) return DEFAULT_FUNCTIONAL_REPAIR_ITERATIONS;
  if (!/^(?:0|[1-9]|10)$/u.test(value)) {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      "--functional-repair-iterations must be an integer from 0 to 10",
    );
  }
  return Number(value);
}

function parseMemoryCommandOptions(
  options: ReadonlyMap<string, string>,
): Pick<ParsedEvaluationCommand, "memoryMode" | "memorySnapshotId" | "memoryBuildSplits"> {
  const rawMode = options.get("--memory-mode") ?? "off";
  const mode = MemoryModeSchema.safeParse(rawMode);
  if (!mode.success) {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      "--memory-mode must be off, read_write, or frozen",
    );
  }
  const rawBuildSplits = options.get("--memory-build-splits");
  const memoryBuildSplits =
    rawBuildSplits === undefined
      ? []
      : rawBuildSplits.split(",").map((entry) => {
          const separator = entry.indexOf(":");
          if (
            separator <= 0 ||
            separator === entry.length - 1 ||
            entry.indexOf(":", separator + 1) >= 0
          ) {
            throw new CoreLoopException(
              "EVALUATION_PROFILE_INVALID",
              "--memory-build-splits must contain dataset:split pairs",
            );
          }
          const scope = MemoryBuildScopeSchema.safeParse({
            dataset: entry.slice(0, separator),
            split: entry.slice(separator + 1),
          });
          if (!scope.success) {
            throw new CoreLoopException(
              "EVALUATION_PROFILE_INVALID",
              "--memory-build-splits contains an invalid dataset or split",
            );
          }
          return scope.data;
        });
  const memorySnapshotId = options.get("--memory-snapshot");
  return {
    memoryMode: mode.data,
    ...(memorySnapshotId === undefined ? {} : { memorySnapshotId }),
    memoryBuildSplits,
  };
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

function standaloneDataset(arguments_: readonly string[]): DatasetName {
  const prepared = selectedDataset(arguments_);
  if (prepared !== undefined) return prepared;
  if (arguments_[0] !== "evaluate") return "verilog-eval";
  for (let index = 1; index + 1 < arguments_.length; index += 2) {
    if (arguments_[index] !== "--dataset") continue;
    const value = arguments_[index + 1];
    if (value === "verilog-eval" || value === "chipbench") return value;
  }
  return "verilog-eval";
}

function parseEvaluationCommand(arguments_: readonly string[]): ParsedEvaluationCommand {
  const command = arguments_[0];
  const options = parseNamedOptions(arguments_.slice(1));
  const profileId = options.get("--profile");
  const mismatchAnalyzerBackend = parseMismatchAnalyzerBackend(options.get("--analyzer"));
  const functionalRepairIterations = parseFunctionalRepairIterations(
    options.get("--functional-repair-iterations"),
  );
  const memory = parseMemoryCommandOptions(options);
  if (profileId === undefined) {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      "Core Loop evaluation command arguments are invalid",
    );
  }

  if (command === "run") {
    const caseId = options.get("--case");
    const allowedOptions = new Set([
      "--profile",
      "--case",
      "--analyzer",
      "--functional-repair-iterations",
      "--memory-mode",
      "--memory-snapshot",
      "--memory-build-splits",
    ]);
    if (
      caseId === undefined ||
      [...options.keys()].some((name) => !allowedOptions.has(name)) ||
      options.size !==
        (mismatchAnalyzerBackend === undefined ? 2 : 3) +
          (options.has("--functional-repair-iterations") ? 1 : 0) +
          ["--memory-mode", "--memory-snapshot", "--memory-build-splits"].filter((name) =>
            options.has(name),
          ).length
    ) {
      throw new CoreLoopException(
        "EVALUATION_PROFILE_INVALID",
        "Core Loop run command requires --profile, --case, and optional --analyzer",
      );
    }
    return {
      profileId,
      ...(mismatchAnalyzerBackend === undefined ? {} : { mismatchAnalyzerBackend }),
      functionalRepairIterations,
      ...memory,
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
  const datasetOption = options.get("--dataset");
  if (
    datasetOption !== undefined &&
    datasetOption !== "verilog-eval" &&
    datasetOption !== "chipbench"
  ) {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      "--dataset must be either verilog-eval or chipbench",
    );
  }
  const dataset = datasetOption as DatasetName | undefined;
  const split = options.get("--split");
  if ((dataset === "chipbench") !== (split !== undefined)) {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      "ChipBench evaluation requires --dataset chipbench with --split",
    );
  }
  const allowedOptions = new Set([
    "--profile",
    "--agent",
    "--analyzer",
    "--dataset",
    "--split",
    "--begin",
    "--end",
    "--cases",
    "--functional-repair-iterations",
    "--memory-mode",
    "--memory-snapshot",
    "--memory-build-splits",
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
    (mismatchAnalyzerBackend === undefined ? 0 : 1) -
    (dataset === undefined ? 0 : 1) -
    (split === undefined ? 0 : 1);
  const functionalRepairOptionCount = options.has("--functional-repair-iterations") ? 1 : 0;
  const memoryOptionCount = ["--memory-mode", "--memory-snapshot", "--memory-build-splits"].filter(
    (name) => options.has(name),
  ).length;
  const adjustedSelectionOptionCount =
    selectionOptionCount - functionalRepairOptionCount - memoryOptionCount;
  const parsedBackend = agentBackend as AgentBackend | undefined;
  if (adjustedSelectionOptionCount === 0) {
    return {
      profileId,
      ...(parsedBackend === undefined ? {} : { agentBackend: parsedBackend }),
      ...(mismatchAnalyzerBackend === undefined ? {} : { mismatchAnalyzerBackend }),
      ...(dataset === undefined ? {} : { dataset }),
      ...(split === undefined ? {} : { split }),
      functionalRepairIterations,
      ...memory,
    };
  }

  const begin = options.get("--begin");
  const end = options.get("--end");
  const cases = options.get("--cases");
  if (
    adjustedSelectionOptionCount === 2 &&
    begin !== undefined &&
    end !== undefined &&
    cases === undefined
  ) {
    return {
      profileId,
      ...(parsedBackend === undefined ? {} : { agentBackend: parsedBackend }),
      ...(mismatchAnalyzerBackend === undefined ? {} : { mismatchAnalyzerBackend }),
      ...(dataset === undefined ? {} : { dataset }),
      ...(split === undefined ? {} : { split }),
      functionalRepairIterations,
      ...memory,
      selection: { kind: "RANGE", begin, end },
    };
  }
  if (
    adjustedSelectionOptionCount === 1 &&
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
      ...(dataset === undefined ? {} : { dataset }),
      ...(split === undefined ? {} : { split }),
      functionalRepairIterations,
      ...memory,
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
  if (command.profileId === CHIPBENCH_KIMI_PROFILE_ID) {
    return command.agentBackend === "pi" ? CHIPBENCH_KIMI_PI_PROFILE_ID : CHIPBENCH_KIMI_PROFILE_ID;
  }
  if (command.profileId === CHIPBENCH_KIMI_PI_PROFILE_ID && command.agentBackend !== "pi") {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      `${CHIPBENCH_KIMI_PI_PROFILE_ID} requires --agent pi`,
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
  i2cCoverageDependencies?: RtlCoreLoopI2cCoverageDependencies,
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
  if (command === "memory-build") {
    return executeCliCommand(() => {
      const memoryRoot = path.join(
        path.dirname(
          evaluationDependencies?.batchesRoot ?? path.join(repositoryRoot, ".rtl-agent", "batches"),
        ),
        "memory",
      );
      return runMemoryBuildCommand({
        arguments_,
        repositoryRoot,
        writeOutput,
        dependencies: {
          memoryRoot,
          ...(evaluationDependencies?.memoryStore === undefined
            ? {}
            : { store: evaluationDependencies.memoryStore }),
          consolidator:
            evaluationDependencies?.memoryConsolidator ??
            new PiMemoryConsolidator(
              piExperimentConfigFromEnvironment(environment, repositoryRoot),
            ),
        },
      });
    }, writeError);
  }
  if (command === "i2c-coverage") {
    return executeCliCommand(
      () =>
        runI2cCoverageCommand({
          arguments_,
          writeOutput,
          environment,
          repositoryRoot,
          ...(i2cCoverageDependencies === undefined
            ? {}
            : { dependencies: i2cCoverageDependencies }),
        }),
      writeError,
    );
  }
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
      if (
        registered === undefined &&
        evaluationDependencies === undefined &&
        (requestedProfileId === CHIPBENCH_KIMI_PROFILE_ID ||
          requestedProfileId === CHIPBENCH_KIMI_PI_PROFILE_ID)
      ) {
        if (parsedCommand.dataset !== "chipbench") {
          throw new CoreLoopException(
            "EVALUATION_PROFILE_INVALID",
            "ChipBench profile requires --dataset chipbench",
          );
        }
        const split = parseChipBenchSplit(parsedCommand.split);
        if (requestedProfileId === CHIPBENCH_KIMI_PI_PROFILE_ID) {
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
          requestedProfileId === CHIPBENCH_KIMI_PI_PROFILE_ID
            ? await createChipBenchKimiPiBaseProfile(
                configuredProvider,
                agentAdapter,
                compilerAdapter,
                split,
              )
            : await createChipBenchKimiBaseProfile(
                configuredProvider,
                agentAdapter,
                compilerAdapter,
                split,
              );
        providerImplementationDigest = CHIPBENCH_DATASET_LOCK.providerImplementationDigest;
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
      const requestedDatasetId =
        parsedCommand.dataset === "chipbench"
          ? CHIPBENCH_DATASET_LOCK.datasetId
          : parsedCommand.dataset === "verilog-eval"
            ? VERILOG_EVAL_DATASET_LOCK.datasetId
            : undefined;
      if (
        (requestedDatasetId !== undefined && registered.dataset.datasetId !== requestedDatasetId) ||
        (parsedCommand.split !== undefined && registered.selection.split !== parsedCommand.split)
      ) {
        throw new CoreLoopException(
          "EVALUATION_PROFILE_INVALID",
          "Requested dataset or split does not match the evaluation profile",
        );
      }
      const selectedProfile =
        parsedCommand.selection === undefined
          ? EvaluationProfileSchema.parse(registered)
          : await resolveEvaluationProfileSelection(
              configuredProvider,
              registered,
              parsedCommand.selection,
            );
      const batchesRoot =
        evaluationDependencies?.batchesRoot ?? path.join(repositoryRoot, ".rtl-agent", "batches");
      const memoryRoot = path.join(path.dirname(batchesRoot), "memory");
      const memoryStore =
        evaluationDependencies?.memoryStore ?? new FilesystemMemoryStore(memoryRoot);
      const preparedMemory = await prepareMemoryExperiment({
        mode: parsedCommand.memoryMode,
        ...(parsedCommand.memorySnapshotId === undefined
          ? {}
          : { requestedSnapshotId: parsedCommand.memorySnapshotId }),
        store: memoryStore,
        ...(profileAgentBackend(selectedProfile) === "pi"
          ? { piIdentityDigest: sha256Jcs(selectedProfile.agentCapability) }
          : {}),
        experiencePromptDigest: EXPERIENCE_SUMMARIZER_PROMPT_DIGEST,
        allowedBuildSplits: parsedCommand.memoryBuildSplits,
        currentScope: {
          dataset: selectedProfile.dataset.datasetId,
          split: selectedProfile.selection.split,
        },
      });
      const profile = EvaluationProfileSchema.parse({
        ...selectedProfile,
        functionalRepair: { maxIterations: parsedCommand.functionalRepairIterations },
        memory: preparedMemory.identity,
      });
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
      const experienceSummarizer =
        preparedMemory.identity.mode === "off"
          ? undefined
          : (evaluationDependencies?.experienceSummarizer ??
            new PiExperienceSummarizer(
              piExperimentConfigFromEnvironment(environment, repositoryRoot),
            ));
      const memorySelector =
        preparedMemory.identity.mode === "off"
          ? undefined
          : (evaluationDependencies?.memorySelector ??
            new PiMemorySelector(piExperimentConfigFromEnvironment(environment, repositoryRoot)));
      compilerAdapter ??= new IcarusCompileAdapter({
        executable: icarusExecutableFromEnvironment(environment),
        probeWorkingDirectory: repositoryRoot,
      });
      const functionalProvider: FunctionalVerificationProvider | undefined =
        (configuredProvider instanceof VerilogEvalFixtureProvider &&
          profile.dataset.datasetId === VERILOG_EVAL_DATASET_LOCK.datasetId) ||
        (configuredProvider instanceof ChipBenchFixtureProvider &&
          profile.dataset.datasetId === CHIPBENCH_DATASET_LOCK.datasetId)
          ? configuredProvider
          : undefined;
      const functionalCaseResults: FunctionalCaseResult[] = [];
      const latestFunctionalResultByRunId = new Map<string, FunctionalCaseResult>();
      const functionalResultsByRunId = new Map<string, FunctionalCaseResult[]>();
      const memoryWarnings: {
        readonly code: "EXPERIENCE_SUMMARIZATION_FAILED";
        readonly message: string;
      }[] = [];
      const appendFunctionalResult = (result: FunctionalCaseResult): void => {
        const existing = functionalResultsByRunId.get(result.runId) ?? [];
        existing.push(result);
        functionalResultsByRunId.set(result.runId, existing);
      };
      const functionalRepairStartAttemptByRunId = new Map<string, number>();
      const functionalIverilogExecutable =
        functionalProvider === undefined ? undefined : icarusExecutableFromEnvironment(environment);
      const execution = await evaluateCoreLoopBatch({
        provider: configuredProvider,
        providerImplementationDigest,
        profile,
        agentAdapter,
        compilerAdapter,
        batchesRoot,
        ...(preparedMemory.snapshot === null || memorySelector === undefined
          ? {}
          : {
              prepareAgentTurn: async (
                turn: CoreLoop.CoreLoopBatchAgentTurnPreparation,
              ): Promise<"context/relevant-rtl-memory.md" | null> => {
                const feedback =
                  turn.functionalSimulationFeedbackPath === undefined
                    ? null
                    : await readFile(
                        path.join(
                          turn.run.workspaceDirectory,
                          ...turn.functionalSimulationFeedbackPath.split("/"),
                        ),
                        "utf8",
                      );
                const selected = await selectMemoryBestEffort({
                  snapshot: preparedMemory.snapshot!,
                  query: {
                    stage:
                      turn.functionalSimulationFeedbackPath === undefined
                        ? "initial_generation"
                        : "functional_simulation",
                    circuit_type: null,
                    failure_type:
                      turn.functionalSimulationFeedbackPath === undefined
                        ? null
                        : "output_mismatch",
                    language: "SYSTEMVERILOG",
                    tool: "iverilog",
                  },
                  specification: await readFile(
                    path.join(turn.run.workspaceDirectory, "spec.md"),
                    "utf8",
                  ),
                  feedback,
                  stage:
                    turn.functionalSimulationFeedbackPath === undefined
                      ? "initial_generation"
                      : "functional_repair",
                  evidenceDirectory: path.join(
                    turn.batchDirectory,
                    "_internal",
                    "memory-selections",
                    turn.run.runId,
                    `attempt-${String(turn.attempt)}`,
                  ),
                  selector: memorySelector,
                });
                const contextPath = path.join(
                  turn.run.workspaceDirectory,
                  "context",
                  "relevant-rtl-memory.md",
                );
                const rendered = renderRelevantRtlMemory(selected);
                if (rendered === null) {
                  await rm(contextPath, { force: true });
                  return null;
                }
                const temporary = `${contextPath}.tmp-${String(process.pid)}`;
                await writeFile(temporary, rendered, { encoding: "utf8", flag: "wx" });
                await rename(temporary, contextPath);
                return "context/relevant-rtl-memory.md";
              },
            }),
        ...(command === "evaluate"
          ? {
              onCaseStart: (progress: CoreLoop.CoreLoopBatchCaseProgress) => {
                writeError(
                  `正在处理 ${progress.caseRef.identity.caseId}... (${String(progress.caseNumber)}/${String(progress.caseCount)})`,
                );
              },
            }
          : {}),
        ...(functionalProvider === undefined || functionalIverilogExecutable === undefined
          ? {}
          : {
              functionalRepair: {
                maxIterations: parsedCommand.functionalRepairIterations,
                validateCandidate: async (candidate: CoreLoop.CoreLoopBatchCandidateValidation) => {
                  const result = await evaluateFunctionalSimulationCase({
                    batchDirectory: candidate.batchDirectory,
                    caseIndex: candidate.caseIndex,
                    caseRef: candidate.caseRef,
                    runId: candidate.run.runId,
                    run: undefined,
                    candidateCompilePassed: true,
                    agentAttempt: candidate.attempt,
                    repairIteration: candidate.repairIteration,
                    publishResult: false,
                    publishCandidate: false,
                    provider: functionalProvider,
                    iverilogExecutable: functionalIverilogExecutable,
                    ...(environment.RTL_AGENT_VVP_EXECUTABLE === undefined
                      ? {}
                      : { vvpExecutable: environment.RTL_AGENT_VVP_EXECUTABLE }),
                  });
                  latestFunctionalResultByRunId.set(candidate.run.runId, result);
                  appendFunctionalResult(result);
                  if (result.status !== "MISMATCH") return { status: "ACCEPT" } as const;
                  if (candidate.repairIteration === 0) {
                    functionalRepairStartAttemptByRunId.set(candidate.run.runId, candidate.attempt);
                  }
                  if (candidate.repairIteration >= parsedCommand.functionalRepairIterations) {
                    return { status: "ACCEPT" } as const;
                  }
                  return {
                    status: "MISMATCH",
                    feedbackPath: await writeFunctionalSimulationFeedback({
                      runDirectory: candidate.run.runDirectory,
                      workspaceDirectory: candidate.run.workspaceDirectory,
                      result,
                    }),
                  } as const;
                },
              },
              onCaseComplete: async (completion: CoreLoop.CoreLoopBatchCaseCompletion) => {
                const latest = latestFunctionalResultByRunId.get(completion.run.runId);
                const compilePassed =
                  completion.run.status === "COMPLETE" &&
                  completion.run.evaluationValidity === "EVALUATION_VALID" &&
                  completion.run.finalResult.outcome === "COMPILE_PASSED";
                const finalFunctionalResult =
                  latest !== undefined && compilePassed
                    ? await publishFunctionalSimulationCase({
                        batchDirectory: completion.batchDirectory,
                        caseIndex: completion.caseIndex,
                        caseRef: completion.caseRef,
                        runId: completion.run.runId,
                        result: latest,
                      })
                    : await evaluateFunctionalSimulationCase({
                        batchDirectory: completion.batchDirectory,
                        caseIndex: completion.caseIndex,
                        caseRef: completion.caseRef,
                        runId: completion.run.runId,
                        run: completion.run,
                        agentAttempt: completion.run.attemptCount,
                        repairIteration: Math.max(
                          0,
                          completion.run.attemptCount -
                            (functionalRepairStartAttemptByRunId.get(completion.run.runId) ??
                              completion.run.attemptCount),
                        ),
                        provider: functionalProvider,
                        iverilogExecutable: functionalIverilogExecutable,
                        ...(environment.RTL_AGENT_VVP_EXECUTABLE === undefined
                          ? {}
                          : { vvpExecutable: environment.RTL_AGENT_VVP_EXECUTABLE }),
                      });
                functionalCaseResults.push(finalFunctionalResult);
                if (!(latest !== undefined && compilePassed)) {
                  appendFunctionalResult(finalFunctionalResult);
                }
                if (experienceSummarizer !== undefined) {
                  try {
                    const experienceResult = await summarizeCaseExperienceBestEffort({
                      request: {
                        batchDirectory: completion.batchDirectory,
                        caseRef: completion.caseRef,
                        functionalResults: functionalResultsByRunId.get(completion.run.runId) ?? [],
                        language: "SYSTEMVERILOG",
                        tool: "iverilog",
                      },
                      run: completion.run,
                      summarizer: experienceSummarizer,
                    });
                    if (
                      preparedMemory.identity.mode === "read_write" &&
                      experienceResult.status === "CREATED"
                    ) {
                      await persistMemoryBuildExperience({
                        memoryRoot,
                        batchId: path.basename(completion.batchDirectory),
                        caseNumber: completion.caseNumber,
                        experience: experienceResult.experience,
                      });
                    }
                  } catch {
                    memoryWarnings.push({
                      code: "EXPERIENCE_SUMMARIZATION_FAILED",
                      message: `Memory Experience failed for ${completion.caseRef.identity.caseId}`,
                    });
                  }
                }
              },
            }),
      });
      const functionalResult =
        functionalProvider === undefined
          ? undefined
          : await publishFunctionalSimulationBatch({
              execution,
              caseResults: functionalCaseResults,
              maxRepairIterations: parsedCommand.functionalRepairIterations,
            });
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
                  maxRepairIterations: functionalResult.maxRepairIterations,
                }),
            batchDirectory: `.rtl-agent/batches/${execution.result.batchId}`,
            rtlDirectory: `.rtl-agent/batches/${execution.result.batchId}/rtl`,
            postProcessingStatus: postProcessingWarning === undefined ? "COMPLETED" : "WARNING",
            memory: {
              ...preparedMemory.identity,
              experienceStatus: memoryWarnings.length === 0 ? "COMPLETED" : "WARNING",
              publication:
                preparedMemory.identity.mode === "read_write"
                  ? "DEFERRED_TO_MEMORY_BUILD"
                  : "DISABLED",
            },
          },
          ...(postProcessingWarning === undefined && memoryWarnings.length === 0
            ? {}
            : {
                warnings: [
                  ...(postProcessingWarning === undefined ? [] : [postProcessingWarning]),
                  ...memoryWarnings,
                ],
              }),
        }),
      );
      return finalStatus === "COMPLETED" ? 0 : 3;
    }, writeError);
  }
  writeError(
    "Usage: rtl-core-loop <dataset-prepare [--dataset <verilog-eval|chipbench>]|fixtures-check [--dataset <verilog-eval|chipbench>]|agent-probe|pi-agent-probe|compile-smoke|memory-build --experience-batches <batch-id,...>|coverage --case <id> [--agent <opencode|pi>]|i2c-coverage [--agent <opencode|pi>] [--iterations <1-10>] [--coverage-threshold <0-100>]|run --profile <id> --case <id> [--analyzer <opencode|pi>] [--functional-repair-iterations <0-10>] [--memory-mode <off|read_write|frozen>] [--memory-snapshot <mem-vNNNN>] [--memory-build-splits <dataset:split,...>]|evaluate --profile <id> [--agent <opencode|pi>] [--dataset chipbench --split <split>] [--analyzer <opencode|pi>] [--functional-repair-iterations <0-10>] [--memory-mode <off|read_write|frozen>] [--memory-snapshot <mem-vNNNN>] [--memory-build-splits <dataset:split,...>] [--begin <case> --end <case>|--cases <case,...>]|reanalyze --batch <batch-id> [--analyzer <opencode|pi>]>",
  );
  return 2;
}

export const packageVersion = "0.0.0" as const;

const invokedPath = process.argv[1];
if (invokedPath !== undefined && fileURLToPath(import.meta.url) === invokedPath) {
  const repositoryEnvironment = await loadRepositoryEnvironment(DEFAULT_REPOSITORY_ROOT);
  const requestedDataset = standaloneDataset(process.argv.slice(2));
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
