import {
  CoreLoopException,
  OpenCodeMismatchAnalyzer,
  PiMismatchAnalyzer,
  openCodeExperimentConfigFromEnvironment,
  piExperimentConfigFromEnvironment,
} from "@rtl-agent/core-loop";
import type { AgentCapability, MismatchAnalyzer } from "@rtl-agent/core-loop";

export type MismatchAnalyzerBackend = "opencode" | "pi";
export type MismatchAnalyzerFactory = (backend: MismatchAnalyzerBackend) => MismatchAnalyzer;

export function parseMismatchAnalyzerBackend(
  value: string | undefined,
): MismatchAnalyzerBackend | undefined {
  if (value === undefined) return undefined;
  if (value === "opencode" || value === "pi") return value;
  throw new CoreLoopException(
    "EVALUATION_PROFILE_INVALID",
    "--analyzer must be either opencode or pi",
  );
}

export function mismatchAnalyzerBackendFromCapability(
  capability: AgentCapability,
): MismatchAnalyzerBackend {
  return "piVersion" in capability ? "pi" : "opencode";
}

export function createMismatchAnalyzer(options: {
  readonly backend: MismatchAnalyzerBackend;
  readonly environment: NodeJS.ProcessEnv;
  readonly repositoryRoot: string;
}): MismatchAnalyzer {
  return options.backend === "pi"
    ? new PiMismatchAnalyzer(
        piExperimentConfigFromEnvironment(options.environment, options.repositoryRoot),
      )
    : new OpenCodeMismatchAnalyzer(
        openCodeExperimentConfigFromEnvironment(options.environment, options.repositoryRoot),
      );
}
