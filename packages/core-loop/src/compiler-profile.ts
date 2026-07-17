import path from "node:path";

import { ToolVersionSchema } from "./contracts.js";
import { FIXED_ICARUS_PROFILE_ID, FixedIcarusProfileSchema } from "./compiler-contracts.js";
import type { FixedIcarusProfile } from "./compiler-contracts.js";
import { sha256Jcs } from "./filesystem.js";

export const FIXED_ICARUS_TOOL_VERSION = ToolVersionSchema.parse(
  "Icarus Verilog version 12.0 (devel) (s20150603-1539-g2693dd32b)",
);

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

export const FIXED_ICARUS_PROFILE: FixedIcarusProfile = deepFreeze(
  FixedIcarusProfileSchema.parse({
    schemaVersion: 1,
    compilerProfileId: FIXED_ICARUS_PROFILE_ID,
    executableProduct: "Icarus Verilog",
    expectedVersion: FIXED_ICARUS_TOOL_VERSION,
    versionArguments: ["-V"],
    argvPrefix: ["-g2012", "-tnull"],
    topSelectionFlag: "-s",
    sourceOrdering: "ecmascript-utf16-ordinal",
    includePolicy: "forbidden",
    compilationUnitPolicy: "ordered-sources-single-unit",
    environmentKeys: {
      win32: ["ComSpec", "Path", "SystemRoot", "TEMP", "TMP"],
      posix: ["PATH", "TMPDIR"],
    },
    timeoutMs: 30_000,
    probeTimeoutMs: 5_000,
    terminationGraceMs: 500,
    stdoutLimitBytes: 65_536,
    stderrLimitBytes: 65_536,
    captureRetainedBytes: 131_072,
    maximumIssues: 100,
    issueMessageLimitBytes: 2048,
  }),
);

export const FIXED_ICARUS_PROFILE_DIGEST = sha256Jcs(FIXED_ICARUS_PROFILE);

export function defaultIcarusExecutable(): string {
  if (process.platform === "win32") return "C:\\iverilog\\bin\\iverilog.exe";
  return "/usr/bin/iverilog";
}

export function icarusExecutableFromEnvironment(environment: NodeJS.ProcessEnv): string {
  const configured = environment.RTL_AGENT_IVERILOG_EXECUTABLE;
  return configured === undefined || configured.length === 0
    ? defaultIcarusExecutable()
    : configured;
}

export function controlledIcarusEnvironment(executable: string): NodeJS.ProcessEnv {
  const executableDirectory = path.dirname(executable);
  if (process.platform === "win32") {
    return {
      ComSpec: process.env.ComSpec ?? "C:\\Windows\\System32\\cmd.exe",
      Path: executableDirectory,
      SystemRoot: process.env.SystemRoot ?? "C:\\Windows",
      TEMP: process.env.TEMP ?? process.env.TMP ?? "C:\\Windows\\Temp",
      TMP: process.env.TMP ?? process.env.TEMP ?? "C:\\Windows\\Temp",
    };
  }
  return {
    PATH: executableDirectory,
    TMPDIR: process.env.TMPDIR ?? "/tmp",
  };
}

export function buildFixedIcarusArguments(
  topModule: string,
  sortedSourceHostPaths: readonly string[],
): readonly string[] {
  return [
    ...FIXED_ICARUS_PROFILE.argvPrefix,
    FIXED_ICARUS_PROFILE.topSelectionFlag,
    topModule,
    ...sortedSourceHostPaths,
  ];
}
