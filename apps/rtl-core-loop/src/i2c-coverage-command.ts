import path from "node:path";

import {
  CoreLoopException,
  DEFAULT_I2C_AGENT_ITERATIONS,
  I2cCoverageFixtureProvider,
  MAX_I2C_AGENT_ITERATIONS,
  OpenCodeRtlAgentAdapter,
  PiRtlAgentAdapter,
  VerilatorCoverageRunner,
  i2cCoverageCaseRef,
  openCodeExperimentConfigFromEnvironment,
  piExperimentConfigFromEnvironment,
  runI2cCoverageExperiment,
} from "@rtl-agent/core-loop";
import type { CoverageRoundRunner, FixtureProvider, RtlAgentAdapter } from "@rtl-agent/core-loop";

import { parseNamedOptions } from "./cli-arguments.js";
import { withDefaultWindowsVerilatorEnvironment } from "./environment.js";

const I2C_DUT_SOURCE_PATHS = [
  "rtl/dut/i2c_master_bit_ctrl.v",
  "rtl/dut/i2c_master_byte_ctrl.v",
  "rtl/dut/i2c_master_defines.v",
  "rtl/dut/i2c_master_top.v",
] as const;

export interface RtlCoreLoopI2cCoverageDependencies {
  readonly agentAdapter?: RtlAgentAdapter;
  readonly coverageRunner?: CoverageRoundRunner;
  readonly runsRoot?: string;
  readonly baselineRoot?: string;
  readonly provider?: FixtureProvider;
}

export interface I2cCoverageCommandOptions {
  readonly backend: "opencode" | "pi";
  readonly maxAgentIterations: number;
  readonly coverageThreshold?: number;
}

export function parseI2cCoverageCommandOptions(
  arguments_: readonly string[],
): I2cCoverageCommandOptions {
  const namedOptions = parseNamedOptions(arguments_);
  const allowedOptions = new Set(["--agent", "--iterations", "--coverage-threshold"]);
  const backend = namedOptions.get("--agent") ?? "opencode";
  const iterationsText = namedOptions.get("--iterations");
  const maxAgentIterations =
    iterationsText === undefined ? DEFAULT_I2C_AGENT_ITERATIONS : Number(iterationsText);
  const thresholdText = namedOptions.get("--coverage-threshold");
  const coverageThreshold = thresholdText === undefined ? undefined : Number(thresholdText);
  if (
    [...namedOptions.keys()].some((name) => !allowedOptions.has(name)) ||
    (backend !== "opencode" && backend !== "pi") ||
    !Number.isSafeInteger(maxAgentIterations) ||
    maxAgentIterations < 1 ||
    maxAgentIterations > MAX_I2C_AGENT_ITERATIONS ||
    (coverageThreshold !== undefined &&
      (!Number.isFinite(coverageThreshold) || coverageThreshold < 0 || coverageThreshold > 100))
  ) {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      `I2C coverage accepts --agent <opencode|pi>, --iterations <1-${String(MAX_I2C_AGENT_ITERATIONS)}>, and optional --coverage-threshold <0-100>`,
    );
  }
  return {
    backend,
    maxAgentIterations,
    ...(coverageThreshold === undefined ? {} : { coverageThreshold }),
  };
}

function configuredBaselineRoot(
  environment: NodeJS.ProcessEnv,
  repositoryRoot: string,
  override: string | undefined,
): string {
  const configured = override ?? environment.RTL_AGENT_I2C_BASELINE_ROOT;
  if (configured === undefined) {
    return path.join(repositoryRoot, ".rtl-agent", "datasets", "freecores-i2c");
  }
  if (configured.length === 0) {
    throw new CoreLoopException(
      "DATASET_NOT_CONFIGURED",
      "RTL_AGENT_I2C_BASELINE_ROOT must not be empty",
    );
  }
  return path.resolve(repositoryRoot, configured);
}

export async function runI2cCoverageCommand(options: {
  readonly arguments_: readonly string[];
  readonly writeOutput: (line: string) => void;
  readonly environment: NodeJS.ProcessEnv;
  readonly repositoryRoot: string;
  readonly dependencies?: RtlCoreLoopI2cCoverageDependencies;
}): Promise<number> {
  const { backend, maxAgentIterations, coverageThreshold } = parseI2cCoverageCommandOptions(
    options.arguments_.slice(1),
  );
  const provider =
    options.dependencies?.provider ??
    new I2cCoverageFixtureProvider(
      configuredBaselineRoot(
        options.environment,
        options.repositoryRoot,
        options.dependencies?.baselineRoot,
      ),
    );
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
      dutSourcePaths: I2C_DUT_SOURCE_PATHS,
      includeDirectories: ["rtl/dut"],
    });
  const execution = await runI2cCoverageExperiment({
    provider,
    caseRef: i2cCoverageCaseRef(),
    agentAdapter,
    coverageRunner,
    maxAgentIterations,
    ...(coverageThreshold === undefined ? {} : { coverageThreshold }),
    runsRoot:
      options.dependencies?.runsRoot ??
      path.join(options.repositoryRoot, ".rtl-agent", "i2c-coverage-runs"),
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
