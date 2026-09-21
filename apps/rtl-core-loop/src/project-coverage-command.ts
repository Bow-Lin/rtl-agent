import path from "node:path";

import {
  COVERAGE_PROJECT_IDS,
  CoreLoopException,
  MAX_AGENT_TURN_ATTEMPT,
  OpenCodeRtlAgentAdapter,
  PiRtlAgentAdapter,
  ProjectCoverageFixtureProvider,
  VerilatorCoverageRunner,
  openCodeExperimentConfigFromEnvironment,
  piExperimentConfigFromEnvironment,
  projectCoverageCaseRef,
  projectCoverageLock,
  runProjectCoverageExperiment,
} from "@rtl-agent/core-loop";
import type {
  CoverageProjectId,
  CoverageRoundRunner,
  FixtureProvider,
  RtlAgentAdapter,
} from "@rtl-agent/core-loop";

import { parseNamedOptions } from "./cli-arguments.js";
import { withDefaultWindowsVerilatorEnvironment } from "./environment.js";

export interface RtlCoreLoopProjectCoverageDependencies {
  readonly agentAdapter?: RtlAgentAdapter;
  readonly coverageRunner?: CoverageRoundRunner;
  readonly runsRoot?: string;
  readonly sourceRoot?: string;
  readonly provider?: FixtureProvider;
}

export interface ProjectCoverageCommandOptions {
  readonly projectId: CoverageProjectId;
  readonly backend: "opencode" | "pi";
  readonly maxAgentIterations: number;
  readonly coverageThreshold?: number;
}

export function parseProjectCoverageCommandOptions(
  arguments_: readonly string[],
): ProjectCoverageCommandOptions {
  const namedOptions = parseNamedOptions(arguments_);
  const allowedOptions = new Set(["--project", "--agent", "--iterations", "--coverage-threshold"]);
  const projectId = namedOptions.get("--project");
  const backend = namedOptions.get("--agent") ?? "pi";
  const maxAgentIterations = Number(namedOptions.get("--iterations") ?? "0");
  const thresholdText = namedOptions.get("--coverage-threshold");
  const coverageThreshold = thresholdText === undefined ? undefined : Number(thresholdText);
  if (
    [...namedOptions.keys()].some((name) => !allowedOptions.has(name)) ||
    projectId === undefined ||
    !(COVERAGE_PROJECT_IDS as readonly string[]).includes(projectId) ||
    (backend !== "opencode" && backend !== "pi") ||
    !Number.isSafeInteger(maxAgentIterations) ||
    maxAgentIterations < 0 ||
    maxAgentIterations >= MAX_AGENT_TURN_ATTEMPT ||
    (coverageThreshold !== undefined &&
      (!Number.isFinite(coverageThreshold) || coverageThreshold < 0 || coverageThreshold > 100))
  ) {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      `project-coverage requires --project <${COVERAGE_PROJECT_IDS.join("|")}> and accepts --agent <opencode|pi>, --iterations <0-${String(MAX_AGENT_TURN_ATTEMPT - 1)}>, and optional --coverage-threshold <0-100>`,
    );
  }
  return {
    projectId: projectId as CoverageProjectId,
    backend,
    maxAgentIterations,
    ...(coverageThreshold === undefined ? {} : { coverageThreshold }),
  };
}

function configuredSourceRoot(
  environment: NodeJS.ProcessEnv,
  repositoryRoot: string,
  projectId: CoverageProjectId,
  override: string | undefined,
): string {
  const lock = projectCoverageLock(projectId);
  const configured = override ?? environment.RTL_AGENT_PROJECT_COVERAGE_SOURCE_ROOT;
  if (configured === undefined) {
    return path.join(repositoryRoot, ".rtl-agent", "datasets", lock.sourceDirectoryName);
  }
  if (configured.length === 0) {
    throw new CoreLoopException(
      "DATASET_NOT_CONFIGURED",
      "RTL_AGENT_PROJECT_COVERAGE_SOURCE_ROOT must not be empty",
    );
  }
  return path.resolve(repositoryRoot, configured);
}

export async function runProjectCoverageCommand(options: {
  readonly arguments_: readonly string[];
  readonly writeOutput: (line: string) => void;
  readonly environment: NodeJS.ProcessEnv;
  readonly repositoryRoot: string;
  readonly dependencies?: RtlCoreLoopProjectCoverageDependencies;
}): Promise<number> {
  const parsed = parseProjectCoverageCommandOptions(options.arguments_.slice(1));
  const lock = projectCoverageLock(parsed.projectId);
  const provider =
    options.dependencies?.provider ??
    new ProjectCoverageFixtureProvider(
      configuredSourceRoot(
        options.environment,
        options.repositoryRoot,
        parsed.projectId,
        options.dependencies?.sourceRoot,
      ),
      lock,
    );
  const agentAdapter =
    parsed.maxAgentIterations === 0
      ? undefined
      : (options.dependencies?.agentAdapter ??
        (parsed.backend === "pi"
          ? new PiRtlAgentAdapter({
              ...piExperimentConfigFromEnvironment(options.environment, options.repositoryRoot),
              guidanceProfile: "coverage-improvement",
            })
          : new OpenCodeRtlAgentAdapter({
              ...openCodeExperimentConfigFromEnvironment(
                options.environment,
                options.repositoryRoot,
              ),
              guidanceProfile: "coverage-improvement",
            })));
  const windowsVerilator = "C:\\msys64\\ucrt64\\bin\\verilator_bin.exe";
  const windowsCoverage = "C:\\msys64\\ucrt64\\bin\\verilator_coverage_bin_dbg.exe";
  const coverageRunner =
    options.dependencies?.coverageRunner ??
    new VerilatorCoverageRunner({
      verilatorExecutable:
        options.environment.RTL_AGENT_VERILATOR_EXECUTABLE ??
        (process.platform === "win32" ? windowsVerilator : "verilator"),
      coverageExecutable:
        options.environment.RTL_AGENT_VERILATOR_COVERAGE_EXECUTABLE ??
        (process.platform === "win32" ? windowsCoverage : "verilator_coverage"),
      environment:
        process.platform === "win32" &&
        options.environment.RTL_AGENT_VERILATOR_EXECUTABLE === undefined
          ? withDefaultWindowsVerilatorEnvironment(options.environment)
          : options.environment,
      ...(process.platform === "win32" ? { cflags: ["-D_GLIBCXX_USE_CXX11_ABI=0"] } : {}),
      dutSourcePaths: lock.dutSourcePaths,
      includeDirectories: lock.includeDirectories,
      includeToggleInScore: true,
    });
  const execution = await runProjectCoverageExperiment({
    projectId: parsed.projectId,
    provider,
    caseRef: projectCoverageCaseRef(parsed.projectId, lock),
    coverageRunner,
    maxAgentIterations: parsed.maxAgentIterations,
    ...(agentAdapter === undefined ? {} : { agentAdapter }),
    ...(parsed.coverageThreshold === undefined
      ? {}
      : { coverageThreshold: parsed.coverageThreshold }),
    runsRoot:
      options.dependencies?.runsRoot ??
      path.join(options.repositoryRoot, ".rtl-agent", "project-coverage-runs"),
  });
  options.writeOutput(
    JSON.stringify({
      ok: execution.result.status !== "FAILED",
      result: {
        ...execution.result,
        runDirectory: path
          .relative(options.repositoryRoot, execution.run.runDirectory)
          .replaceAll("\\", "/"),
      },
    }),
  );
  return execution.result.status === "FAILED" ? 3 : 0;
}
