import path from "node:path";

import {
  CoreLoopException,
  OpenCodeRtlAgentAdapter,
  PiRtlAgentAdapter,
  VERILOG_EVAL_DATASET_LOCK,
  VerilogEvalCoverageFixtureProvider,
  VerilogEvalFixtureProvider,
  VerilatorCoverageRunner,
  listFixtureCases,
  openCodeExperimentConfigFromEnvironment,
  piExperimentConfigFromEnvironment,
  runCoverageExperiment,
} from "@rtl-agent/core-loop";
import type { CoverageRoundRunner, FixtureProvider, RtlAgentAdapter } from "@rtl-agent/core-loop";

import { parseNamedOptions } from "./cli-arguments.js";
import { withDefaultWindowsVerilatorEnvironment } from "./environment.js";
import { resolveCaseSelector } from "./profile-selection.js";

export interface RtlCoreLoopCoverageDependencies {
  readonly agentAdapter?: RtlAgentAdapter;
  readonly coverageRunner?: CoverageRoundRunner;
  readonly runsRoot?: string;
}

export async function runCoverageCommand(options: {
  readonly arguments_: readonly string[];
  readonly provider: FixtureProvider | undefined;
  readonly writeOutput: (line: string) => void;
  readonly environment: NodeJS.ProcessEnv;
  readonly repositoryRoot: string;
  readonly dependencies?: RtlCoreLoopCoverageDependencies;
}): Promise<number> {
  if (!(options.provider instanceof VerilogEvalFixtureProvider)) {
    throw new CoreLoopException(
      "DATASET_NOT_CONFIGURED",
      "Coverage experiment requires the locked VerilogEval dataset",
    );
  }
  const namedOptions = parseNamedOptions(options.arguments_.slice(1));
  const caseId = namedOptions.get("--case");
  const backend = namedOptions.get("--agent") ?? "opencode";
  if (
    caseId === undefined ||
    (backend !== "opencode" && backend !== "pi") ||
    namedOptions.size !== (namedOptions.has("--agent") ? 2 : 1)
  ) {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      "Coverage command requires --case and optional --agent <opencode|pi>",
    );
  }
  const cases = await listFixtureCases(options.provider, {
    schemaVersion: 1,
    split: VERILOG_EVAL_DATASET_LOCK.split,
  });
  const resolvedCaseId = resolveCaseSelector(
    caseId,
    cases.map((caseRef) => caseRef.identity.caseId),
  );
  const caseRef = cases.find((candidate) => candidate.identity.caseId === resolvedCaseId)!;
  const agentAdapter =
    options.dependencies?.agentAdapter ??
    (backend === "pi"
      ? new PiRtlAgentAdapter({
          ...piExperimentConfigFromEnvironment(options.environment, options.repositoryRoot),
          guidanceProfile: "coverage-improvement",
        })
      : new OpenCodeRtlAgentAdapter({
          ...openCodeExperimentConfigFromEnvironment(options.environment, options.repositoryRoot),
          guidanceProfile: "coverage-improvement",
        }));
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
    });
  const execution = await runCoverageExperiment({
    provider: new VerilogEvalCoverageFixtureProvider(options.provider),
    caseRef,
    agentAdapter,
    coverageRunner,
    runsRoot:
      options.dependencies?.runsRoot ??
      path.join(options.repositoryRoot, ".rtl-agent", "coverage-runs"),
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
