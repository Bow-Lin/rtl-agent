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
  DatasetCaseIdSchema,
  DatasetDescriptorSchema,
  DatasetSelectionSchema,
  EvaluationProfileSchema,
  FIXED_ICARUS_PROFILE_ID,
  IcarusCompileAdapter,
  OpenCodeRtlAgentAdapter,
  VERILOG_EVAL_DATASET_LOCK,
  VerilogEvalFixtureProvider,
  chipBenchCacheRoot,
  chipBenchDatasetDirectory,
  createBaselineWorkspaceManifest,
  evaluateCoreLoopBatch,
  createRunId,
  icarusExecutableFromEnvironment,
  listFixtureCases,
  openCodeExperimentConfigFromEnvironment,
  prepareChipBenchDataset,
  prepareVerilogEvalDataset,
  requireFixtureProvider,
  scanRegularFiles,
  sha256Jcs,
  verilogEvalCacheRoot,
  verilogEvalDatasetDirectory,
} from "@rtl-agent/core-loop";
import type * as CoreLoop from "@rtl-agent/core-loop";
import type {
  CoreLoopCompilerAdapter,
  EvaluationProfile,
  FixtureProvider,
  RtlAgentAdapter,
} from "@rtl-agent/core-loop";

export type RtlCoreLoopWorkspaceDependency = typeof CoreLoop.packageVersion;
const DEFAULT_REPOSITORY_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

export interface RtlCoreLoopEvaluationDependencies {
  readonly profiles: readonly EvaluationProfile[];
  readonly providerImplementationDigest: EvaluationProfile["providerImplementationDigest"];
  readonly agentAdapter?: RtlAgentAdapter;
  readonly compilerAdapter?: CoreLoopCompilerAdapter;
  readonly batchesRoot?: string;
}

export interface RtlCoreLoopDatasetDependencies {
  readonly cacheRoot?: string;
  readonly prepareDataset?: typeof prepareVerilogEvalDataset;
  readonly chipBenchCacheRoot?: string;
  readonly prepareChipBenchDataset?: typeof prepareChipBenchDataset;
}

type DatasetName = "verilog-eval" | "chipbench";

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
      (arguments_[0] === "agent-probe" || arguments_[0] === "compile-smoke"))
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
      if (arguments_[0] === "agent-probe") {
        const adapter = new OpenCodeRtlAgentAdapter(
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
  if (command === "run" || command === "evaluate") {
    try {
      const configuredProvider = requireFixtureProvider(provider);
      const profileFlag = arguments_.indexOf("--profile");
      const profileId = profileFlag < 0 ? undefined : arguments_[profileFlag + 1];
      const caseFlag = arguments_.indexOf("--case");
      const caseId = caseFlag < 0 ? undefined : arguments_[caseFlag + 1];
      const expectedLength = command === "run" ? 5 : 3;
      if (
        arguments_.length !== expectedLength ||
        profileId === undefined ||
        (command === "run" && caseId === undefined) ||
        (command === "evaluate" && caseId !== undefined)
      ) {
        throw new CoreLoopException(
          "EVALUATION_PROFILE_INVALID",
          "Core Loop evaluation command arguments are invalid",
        );
      }
      const registered = evaluationDependencies?.profiles.find(
        (profile) => profile.evaluationProfileId === profileId,
      );
      if (registered === undefined) {
        throw new CoreLoopException(
          "EVALUATION_PROFILE_NOT_CONFIGURED",
          "Requested Core Loop evaluation profile is not configured",
        );
      }
      const profile =
        command === "evaluate"
          ? EvaluationProfileSchema.parse(registered)
          : EvaluationProfileSchema.parse({
              ...registered,
              selection: DatasetSelectionSchema.parse({
                schemaVersion: 1,
                split: registered.selection.split,
                caseIds: [DatasetCaseIdSchema.parse(caseId)],
              }),
              expectedCaseCount: 1,
              expectedOrderedCaseIdsDigest: sha256Jcs([DatasetCaseIdSchema.parse(caseId)]),
            });
      if (
        command === "run" &&
        registered.selection.caseIds !== undefined &&
        !registered.selection.caseIds.includes(profile.selection.caseIds![0]!)
      ) {
        throw new CoreLoopException(
          "DATASET_CASE_NOT_FOUND",
          "Requested case is outside the registered evaluation selection",
        );
      }
      const agentAdapter =
        evaluationDependencies?.agentAdapter ??
        new OpenCodeRtlAgentAdapter(
          openCodeExperimentConfigFromEnvironment(environment, repositoryRoot),
        );
      const compilerAdapter =
        evaluationDependencies?.compilerAdapter ??
        new IcarusCompileAdapter({
          executable: icarusExecutableFromEnvironment(environment),
          probeWorkingDirectory: repositoryRoot,
        });
      const execution = await evaluateCoreLoopBatch({
        provider: configuredProvider,
        providerImplementationDigest: evaluationDependencies!.providerImplementationDigest,
        profile,
        agentAdapter,
        compilerAdapter,
        batchesRoot:
          evaluationDependencies?.batchesRoot ?? path.join(repositoryRoot, ".rtl-agent", "batches"),
      });
      writeOutput(
        JSON.stringify({
          ok: execution.result.status === "COMPLETED",
          result: execution.result,
        }),
      );
      return execution.result.status === "COMPLETED" ? 0 : 3;
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
    "Usage: rtl-core-loop <dataset-prepare [--dataset <verilog-eval|chipbench>]|fixtures-check [--dataset <verilog-eval|chipbench>]|agent-probe|compile-smoke|run --profile <id> --case <id>|evaluate --profile <id>>",
  );
  return 2;
}

export const packageVersion = "0.0.0" as const;

const invokedPath = process.argv[1];
if (invokedPath !== undefined && fileURLToPath(import.meta.url) === invokedPath) {
  const requestedDataset = selectedDataset(process.argv.slice(2)) ?? "verilog-eval";
  const datasetDirectory =
    requestedDataset === "chipbench"
      ? chipBenchDatasetDirectory(
          configuredChipBenchCacheRoot(process.env, DEFAULT_REPOSITORY_ROOT),
          CHIPBENCH_DATASET_LOCK,
        )
      : verilogEvalDatasetDirectory(
          configuredVerilogEvalCacheRoot(process.env, DEFAULT_REPOSITORY_ROOT),
          VERILOG_EVAL_DATASET_LOCK,
        );
  const datasetStat = await lstat(datasetDirectory).catch(() => undefined);
  const provider =
    datasetStat === undefined
      ? undefined
      : requestedDataset === "chipbench"
        ? new ChipBenchFixtureProvider(datasetDirectory, CHIPBENCH_DATASET_LOCK)
        : new VerilogEvalFixtureProvider(datasetDirectory, VERILOG_EVAL_DATASET_LOCK);
  process.exitCode = await runRtlCoreLoopCli(process.argv.slice(2), provider);
}
