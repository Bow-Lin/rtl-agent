import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseEnv } from "node:util";

const ALLOWED_ENVIRONMENT_NAMES = [
  "KIMI_CODE_API_KEY",
  "KIMI_API_KEY",
  "RTL_AGENT_PI_EXECUTABLE",
  "RTL_AGENT_PI_ENTRYPOINT",
  "RTL_AGENT_PI_VERSION",
  "RTL_AGENT_PI_PROVIDER",
  "RTL_AGENT_PI_MODEL",
  "RTL_AGENT_OPENCODE_EXECUTABLE",
  "RTL_AGENT_OPENCODE_VERSION",
  "RTL_AGENT_OPENCODE_MODEL",
  "RTL_AGENT_OPENCODE_VARIANT",
  "RTL_AGENT_TURN_TIMEOUT_MS",
  "RTL_AGENT_TERMINATION_GRACE_MS",
  "RTL_AGENT_STABILITY_WINDOW_MS",
  "RTL_AGENT_STDERR_LIMIT_BYTES",
  "RTL_AGENT_MAXIMUM_EVENTS",
  "RTL_AGENT_MAXIMUM_EVENT_LINE_BYTES",
  "RTL_AGENT_MAXIMUM_FILES",
  "RTL_AGENT_MAXIMUM_FILE_BYTES",
  "RTL_AGENT_MAXIMUM_TOTAL_BYTES",
  "RTL_AGENT_VERILATOR_EXECUTABLE",
  "RTL_AGENT_VERILATOR_COVERAGE_EXECUTABLE",
  "VERILATOR_ROOT",
] as const;

async function readEnvironmentFile(filePath: string): Promise<Record<string, string>> {
  const contents = await readFile(filePath, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return undefined;
    throw error;
  });
  if (contents === undefined) return {};
  const parsed = parseEnv(contents);
  return Object.fromEntries(
    Object.entries(parsed).filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
}

export async function loadRepositoryEnvironment(
  repositoryRoot: string,
  inherited: NodeJS.ProcessEnv = process.env,
): Promise<NodeJS.ProcessEnv> {
  const rootEnvironment = await readEnvironmentFile(path.join(repositoryRoot, ".env"));
  const localEnvironment = await readEnvironmentFile(path.join(repositoryRoot, ".env.local"));
  const combined = { ...rootEnvironment, ...localEnvironment, ...inherited };
  const environment: NodeJS.ProcessEnv = { ...inherited };

  for (const name of ALLOWED_ENVIRONMENT_NAMES) {
    const value = combined[name];
    if (value !== undefined) environment[name] = value;
  }

  return environment;
}

export function withDefaultWindowsVerilatorEnvironment(
  environment: NodeJS.ProcessEnv,
  platform: NodeJS.Platform = process.platform,
): NodeJS.ProcessEnv {
  if (platform !== "win32") return { ...environment };
  const result: NodeJS.ProcessEnv = { ...environment };
  result.VERILATOR_ROOT ??= path.win32.join("C:\\msys64", "ucrt64", "share", "verilator");
  const pathKey = Object.keys(result).find((name) => name.toLowerCase() === "path") ?? "Path";
  const existingPath = result[pathKey];
  const required = [
    path.win32.join("C:\\msys64", "ucrt64", "bin"),
    path.win32.join("C:\\msys64", "usr", "bin"),
  ];
  const existing = (existingPath ?? "")
    .split(path.win32.delimiter)
    .filter((entry) => entry.length > 0);
  const existingKeys = new Set(existing.map((entry) => path.win32.normalize(entry).toLowerCase()));
  result[pathKey] = [
    ...required.filter((entry) => !existingKeys.has(path.win32.normalize(entry).toLowerCase())),
    ...existing,
  ].join(path.win32.delimiter);
  return result;
}
