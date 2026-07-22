import { lstat, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { LogicalPathSchema } from "@rtl-agent/contracts";

import { AgentAttemptInputSchema, CompileResultSchema, ToolVersionSchema } from "./contracts.js";
import type { AgentAttemptInput } from "./contracts.js";
import { CoreLoopException } from "./errors.js";
import { AgentTurnResultSchema, OpenCodeCapabilitySchema } from "./agent-contracts.js";
import type {
  AgentTurnOutcome,
  AgentTurnResult,
  AgentWorkspaceViolation,
  OpenCodeCapability,
} from "./agent-contracts.js";
import { writeJsonEvidenceExclusive } from "./evidence.js";
import { resolveLogicalPath, sha256Bytes, sha256Jcs } from "./filesystem.js";
import {
  checkAllowedRunChanges,
  createAttemptRunManifest,
  createFileManifest,
} from "./manifest.js";
import type { FileManifest } from "./manifest.js";
import type { CoreLoopRun } from "./materialize.js";
import { executeOpenCodeProcess, executeProbeCommand } from "./opencode-process.js";

const AGENT_NAME = "rtl-core-loop" as const;
const FIXED_PROMPT =
  "Load the rtl-core-loop skill, read context/agent-input.json, and execute exactly one RTL editing attempt.";
const GUIDANCE_FILE_NAME = "common-guidance.md" as const;
const MAXIMUM_GUIDANCE_BYTES = 16_384;
const REQUIRED_RUN_FLAGS = [
  "--agent",
  "--dir",
  "--format",
  "--model",
  "--title",
  "--variant",
] as const;
const ALLOWED_RTL_EXTENSION = /\.(?:sv|svh|v|vh)$/i;
const COMPILE_UNIT_EXTENSION = /\.(?:sv|v)$/i;

interface LoadedGuidance {
  readonly content: string;
  readonly digest: ReturnType<typeof sha256Bytes>;
}

export interface RtlWorkspaceLimits {
  readonly maximumFiles: number;
  readonly maximumFileBytes: number;
  readonly maximumTotalBytes: number;
}

export interface OpenCodeExperimentConfig {
  readonly executable: string;
  readonly executableArgumentsPrefix?: readonly string[];
  readonly expectedOpenCodeVersion: string;
  readonly repositoryRoot: string;
  readonly providerModel: string;
  readonly variant?: string;
  readonly timeoutMs: number;
  readonly terminationGraceMs: number;
  readonly stabilityWindowMs: number;
  readonly stderrLimitBytes: number;
  readonly maximumEvents: number;
  readonly maximumEventLineBytes: number;
  readonly workspaceLimits: RtlWorkspaceLimits;
  readonly environment?: Readonly<Record<string, string>>;
}

export interface RtlAgentAdapter {
  probe(): Promise<OpenCodeCapability>;
  runTurn(rawInput: unknown, run: CoreLoopRun): Promise<AgentTurnResult>;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function requireInteger(name: string, value: number, minimum: number, maximum: number): void {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new TypeError(`${name} must be an integer from ${String(minimum)} to ${String(maximum)}`);
  }
}

function validateToken(name: string, value: string): void {
  if (!/^[A-Za-z0-9._:/+-]{1,128}$/.test(value)) {
    throw new TypeError(`${name} is invalid`);
  }
}

function validateConfig(config: OpenCodeExperimentConfig): void {
  if (!path.isAbsolute(config.executable) || !path.isAbsolute(config.repositoryRoot)) {
    throw new TypeError("OpenCode executable and repositoryRoot must be absolute host paths");
  }
  validateToken("expectedOpenCodeVersion", config.expectedOpenCodeVersion);
  validateToken("providerModel", config.providerModel);
  if (config.variant !== undefined) validateToken("variant", config.variant);
  requireInteger("timeoutMs", config.timeoutMs, 100, 1_200_000);
  requireInteger("terminationGraceMs", config.terminationGraceMs, 10, 30_000);
  requireInteger("stabilityWindowMs", config.stabilityWindowMs, 10, 10_000);
  requireInteger("stderrLimitBytes", config.stderrLimitBytes, 1, 1_048_576);
  requireInteger("maximumEvents", config.maximumEvents, 1, 256);
  requireInteger("maximumEventLineBytes", config.maximumEventLineBytes, 256, 1_048_576);
  requireInteger("maximumFiles", config.workspaceLimits.maximumFiles, 1, 10_000);
  requireInteger("maximumFileBytes", config.workspaceLimits.maximumFileBytes, 1, 100_000_000);
  requireInteger("maximumTotalBytes", config.workspaceLimits.maximumTotalBytes, 1, 1_000_000_000);
  if (config.executableArgumentsPrefix?.some((argument) => argument.includes("\u0000"))) {
    throw new TypeError("OpenCode executable argument prefix contains a null byte");
  }
}

function guidanceFilePath(repositoryRoot: string): string {
  return path.join(repositoryRoot, ".opencode", "skills", AGENT_NAME, GUIDANCE_FILE_NAME);
}

async function loadGuidance(repositoryRoot: string): Promise<LoadedGuidance> {
  let bytes: Buffer;
  try {
    bytes = await readFile(guidanceFilePath(repositoryRoot));
  } catch {
    throw new CoreLoopException(
      "OPENCODE_CAPABILITY_MISMATCH",
      "RTL common guidance is unavailable",
    );
  }
  if (bytes.byteLength === 0 || bytes.byteLength > MAXIMUM_GUIDANCE_BYTES) {
    throw new CoreLoopException(
      "OPENCODE_CAPABILITY_MISMATCH",
      "RTL common guidance exceeds its bounded size",
    );
  }
  let content: string;
  try {
    content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new CoreLoopException(
      "OPENCODE_CAPABILITY_MISMATCH",
      "RTL common guidance is not valid UTF-8",
    );
  }
  const normalized = content.trim();
  // Intentional rejection of unsafe control bytes while retaining tabs and line endings.
  // eslint-disable-next-line no-control-regex
  const unsafeControl = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;
  if (normalized.length === 0 || unsafeControl.test(content)) {
    throw new CoreLoopException(
      "OPENCODE_CAPABILITY_MISMATCH",
      "RTL common guidance is empty or contains unsafe control bytes",
    );
  }
  return { content: normalized, digest: sha256Bytes(bytes) };
}

function turnPrompt(guidance: string): string {
  return `${FIXED_PROMPT}\n\nApply the following repository guidance to this attempt. The case specification remains authoritative.\n\n${guidance}`;
}

const INLINE_CONFIG = {
  autoupdate: false,
  share: "disabled",
  snapshot: false,
  formatter: false,
  lsp: false,
  plugin: [],
  mcp: {},
  instructions: [],
  permission: { "*": "deny" },
} as const;

const KIMI_CODE_PROVIDER_ID = "kimi-code";
const KIMI_CODE_API_KEY_ENVIRONMENT_NAME = "KIMI_CODE_API_KEY";

function inlineConfig(config: OpenCodeExperimentConfig): Record<string, unknown> {
  if (!config.providerModel.startsWith(`${KIMI_CODE_PROVIDER_ID}/`)) return INLINE_CONFIG;
  return {
    ...INLINE_CONFIG,
    provider: {
      [KIMI_CODE_PROVIDER_ID]: {
        npm: "@ai-sdk/openai-compatible",
        name: "Kimi Code",
        options: {
          baseURL: "https://api.kimi.com/coding/v1",
          apiKey: `{env:${KIMI_CODE_API_KEY_ENVIRONMENT_NAME}}`,
        },
        models: {
          "kimi-for-coding": { name: "Kimi for Coding" },
          "kimi-for-coding-highspeed": { name: "Kimi for Coding Highspeed" },
          k3: { name: "Kimi K3" },
        },
      },
    },
  };
}

export function buildIsolatedOpenCodeEnvironment(
  config: OpenCodeExperimentConfig,
): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = { ...process.env, ...config.environment };
  delete environment.OPENCODE_CONFIG;
  delete environment.OPENCODE_CONFIG_DIR;
  delete environment.OPENCODE_PERMISSION;
  environment.OPENCODE_CONFIG_DIR = path.join(config.repositoryRoot, ".opencode");
  environment.OPENCODE_CONFIG_CONTENT = JSON.stringify(inlineConfig(config));
  environment.OPENCODE_DISABLE_AUTOUPDATE = "1";
  environment.OPENCODE_AUTO_SHARE = "false";
  environment.OPENCODE_DISABLE_DEFAULT_PLUGINS = "1";
  environment.OPENCODE_DISABLE_CLAUDE_CODE = "1";
  environment.OPENCODE_DISABLE_CLAUDE_CODE_PROMPT = "1";
  environment.OPENCODE_DISABLE_CLAUDE_CODE_SKILLS = "1";
  environment.OPENCODE_DISABLE_LSP_DOWNLOAD = "1";
  return environment;
}

function experimentConfigDigest(config: OpenCodeExperimentConfig): ReturnType<typeof sha256Jcs> {
  const executableArgumentsPrefix = config.executableArgumentsPrefix ?? [];
  return sha256Jcs({
    schemaVersion: 1,
    ...(executableArgumentsPrefix.length === 0
      ? {}
      : { executableArgumentsPrefix: [...executableArgumentsPrefix] }),
    expectedOpenCodeVersion: config.expectedOpenCodeVersion,
    providerModel: config.providerModel,
    ...(config.variant === undefined ? {} : { variant: config.variant }),
    agentName: AGENT_NAME,
    repositoryConfigDirectory: ".opencode",
    pureMode: true,
    agentTemperature: 0,
    agentSteps: 20,
    timeoutMs: config.timeoutMs,
    terminationGraceMs: config.terminationGraceMs,
    stabilityWindowMs: config.stabilityWindowMs,
    stderrLimitBytes: config.stderrLimitBytes,
    maximumEvents: config.maximumEvents,
    maximumEventLineBytes: config.maximumEventLineBytes,
    workspaceLimits: config.workspaceLimits,
    isolation: inlineConfig(config),
  });
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

interface ResolvedPermissionRule {
  readonly permission: string;
  readonly action: "allow" | "ask" | "deny";
  readonly pattern: string;
}

function extractJsonArrayAfterMarker(output: string, marker: string): unknown {
  const markerIndex = output.indexOf(marker);
  if (markerIndex < 0) return undefined;
  const start = output.indexOf("[", markerIndex + marker.length);
  if (start < 0) return undefined;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < output.length; index += 1) {
    const character = output[index]!;
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === "[") depth += 1;
    else if (character === "]") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(output.slice(start, index + 1)) as unknown;
        } catch {
          return undefined;
        }
      }
    }
  }
  return undefined;
}

function parseResolvedAgentPermissions(output: string): readonly ResolvedPermissionRule[] {
  const value = extractJsonArrayAfterMarker(output, `${AGENT_NAME} (`);
  if (!Array.isArray(value) || value.length === 0 || value.length > 512) {
    throw new CoreLoopException(
      "OPENCODE_CAPABILITY_MISMATCH",
      "OpenCode did not report bounded rtl-core-loop permission rules",
    );
  }
  return value.map((entry) => {
    const rule = asRecord(entry);
    const permission = rule?.permission;
    const action = rule?.action;
    const pattern = rule?.pattern;
    if (
      typeof permission !== "string" ||
      !/^[a-z_*][a-z0-9_*]{0,63}$/.test(permission) ||
      (action !== "allow" && action !== "ask" && action !== "deny") ||
      typeof pattern !== "string" ||
      pattern.length === 0 ||
      pattern.length > 2_048 ||
      [...pattern].some((character) => character.charCodeAt(0) < 0x20)
    ) {
      throw new CoreLoopException(
        "OPENCODE_CAPABILITY_MISMATCH",
        "OpenCode reported an invalid rtl-core-loop permission rule",
      );
    }
    return { permission, action, pattern };
  });
}

const EXPECTED_AGENT_ALLOWS = new Set([
  "read:spec.md",
  "read:**/spec.md",
  "read:context/*",
  "read:**/context/*",
  "read:rtl/**",
  "read:**/rtl/**",
  "edit:rtl/*.sv",
  "edit:**/rtl/*.sv",
  "edit:rtl/**/*.sv",
  "edit:**/rtl/**/*.sv",
  "edit:rtl/*.v",
  "edit:**/rtl/*.v",
  "edit:rtl/**/*.v",
  "edit:**/rtl/**/*.v",
  "edit:rtl/*.svh",
  "edit:**/rtl/*.svh",
  "edit:rtl/**/*.svh",
  "edit:**/rtl/**/*.svh",
  "edit:rtl/*.vh",
  "edit:**/rtl/*.vh",
  "edit:rtl/**/*.vh",
  "edit:**/rtl/**/*.vh",
  "skill:rtl-core-loop",
]);

function isOpenCodeToolOutputException(rule: ResolvedPermissionRule): boolean {
  return (
    rule.permission === "external_directory" &&
    /[\\/]\.local[\\/]share[\\/]opencode[\\/]tool-output[\\/]\*$/.test(rule.pattern)
  );
}

function validateResolvedAgentPermissions(
  rules: readonly ResolvedPermissionRule[],
): ReturnType<typeof sha256Jcs> {
  let catchAllIndex = -1;
  rules.forEach((rule, index) => {
    if (rule.permission === "*" && rule.pattern === "*" && rule.action === "deny") {
      catchAllIndex = index;
    }
  });
  if (catchAllIndex < 0) {
    throw new CoreLoopException(
      "OPENCODE_CAPABILITY_MISMATCH",
      "Resolved rtl-core-loop Agent has no deny-all boundary",
    );
  }
  const effectiveRules = rules.slice(catchAllIndex + 1);
  const observedAllows = new Set<string>();
  for (const rule of effectiveRules) {
    if (rule.action === "deny") continue;
    const key = `${rule.permission}:${rule.pattern}`;
    if (rule.action === "allow" && EXPECTED_AGENT_ALLOWS.has(key)) {
      observedAllows.add(key);
      continue;
    }
    if (rule.action === "allow" && isOpenCodeToolOutputException(rule)) continue;
    throw new CoreLoopException(
      "OPENCODE_CAPABILITY_MISMATCH",
      "Resolved rtl-core-loop Agent retains an unexpected allow or ask rule",
    );
  }
  if ([...EXPECTED_AGENT_ALLOWS].some((allow) => !observedAllows.has(allow))) {
    throw new CoreLoopException(
      "OPENCODE_CAPABILITY_MISMATCH",
      "Resolved rtl-core-loop Agent is missing a required bounded allow rule",
    );
  }
  return sha256Jcs(rules);
}

function validateResolvedConfig(value: unknown): void {
  const config = asRecord(value);
  if (config === undefined) {
    throw new CoreLoopException(
      "OPENCODE_CAPABILITY_MISMATCH",
      "OpenCode debug config did not return an object",
    );
  }
  const requiredIsolation = {
    autoupdate: false,
    share: "disabled",
    snapshot: false,
    formatter: false,
    lsp: false,
  } as const;
  for (const [key, expected] of Object.entries(requiredIsolation)) {
    if (config[key] !== expected) {
      throw new CoreLoopException(
        "OPENCODE_CAPABILITY_MISMATCH",
        `Resolved OpenCode config does not preserve locked ${key} isolation`,
      );
    }
  }
  for (const key of ["plugin", "plugins"] as const) {
    const plugins = config[key];
    if (plugins !== undefined && (!Array.isArray(plugins) || plugins.length > 0)) {
      throw new CoreLoopException(
        "OPENCODE_CAPABILITY_MISMATCH",
        "Resolved OpenCode config contains external plugins",
      );
    }
  }
  const instructions = config.instructions;
  if (instructions !== undefined && (!Array.isArray(instructions) || instructions.length > 0)) {
    throw new CoreLoopException(
      "OPENCODE_CAPABILITY_MISMATCH",
      "Resolved OpenCode config contains additional instructions",
    );
  }
  const rawMcp = config.mcp;
  const mcp = asRecord(rawMcp);
  if (rawMcp !== undefined && mcp === undefined) {
    throw new CoreLoopException(
      "OPENCODE_CAPABILITY_MISMATCH",
      "Resolved OpenCode MCP configuration is invalid",
    );
  }
  if (mcp !== undefined && Object.values(mcp).some((entry) => asRecord(entry)?.enabled !== false)) {
    throw new CoreLoopException(
      "OPENCODE_CAPABILITY_MISMATCH",
      "Resolved OpenCode config contains an active MCP server",
    );
  }
  const permission = asRecord(config.permission);
  const permissionValuesAreDeny = (candidate: unknown): boolean => {
    if (typeof candidate === "string") return candidate === "deny";
    const record = asRecord(candidate);
    return record !== undefined && Object.values(record).every(permissionValuesAreDeny);
  };
  if (
    permission === undefined ||
    permission["*"] !== "deny" ||
    !Object.values(permission).every(permissionValuesAreDeny)
  ) {
    throw new CoreLoopException(
      "OPENCODE_CAPABILITY_MISMATCH",
      "Resolved OpenCode global permissions are not deny-only",
    );
  }
}

async function requireNativeExecutable(executable: string): Promise<void> {
  const stat = await lstat(executable).catch(() => undefined);
  if (stat === undefined || !stat.isFile() || stat.isSymbolicLink()) {
    throw new CoreLoopException(
      "OPENCODE_NOT_CONFIGURED",
      "Configured OpenCode executable is not a regular native file",
    );
  }
  if (process.platform === "win32" && path.extname(executable).toLowerCase() !== ".exe") {
    throw new CoreLoopException(
      "OPENCODE_NOT_CONFIGURED",
      "Windows Core Loop requires a native OpenCode .exe executable",
    );
  }
  if (process.platform !== "win32" && (stat.mode & 0o111) === 0) {
    throw new CoreLoopException(
      "OPENCODE_NOT_CONFIGURED",
      "Configured OpenCode file is not executable",
    );
  }
}

function activeArguments(
  config: OpenCodeExperimentConfig,
  arguments_: readonly string[],
): string[] {
  return [...(config.executableArgumentsPrefix ?? []), ...arguments_];
}

async function writeAgentInput(
  workspaceDirectory: string,
  input: AgentAttemptInput,
): Promise<void> {
  const target = path.join(workspaceDirectory, "context", "agent-input.json");
  const temporary = `${target}.tmp-${String(process.pid)}`;
  await writeFile(temporary, `${JSON.stringify(input, undefined, 2)}\n`, "utf8");
  await rename(temporary, target);
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

async function validateTurnInput(input: AgentAttemptInput, run: CoreLoopRun): Promise<void> {
  if (input.runId !== run.runId || input.category !== run.fixture.category) {
    throw new CoreLoopException(
      "AGENT_INPUT_INVALID",
      "Agent input does not match its bound Core Loop run",
    );
  }
  const rtlManifest = await createFileManifest(run.workspaceDirectory, (logicalPath) =>
    logicalPath.startsWith("rtl/"),
  );
  const actualSources = rtlManifest.entries.map((entry) => entry.path);
  if (!sameStrings(input.rtlSourceFiles, actualSources)) {
    throw new CoreLoopException(
      "AGENT_INPUT_INVALID",
      "Agent rtlSourceFiles do not match the current workspace",
    );
  }
  if (input.previousCompileResultPath !== undefined) {
    const hostPath = resolveLogicalPath(run.workspaceDirectory, input.previousCompileResultPath);
    let rawResult: unknown;
    try {
      rawResult = JSON.parse(await readFile(hostPath, "utf8")) as unknown;
    } catch {
      throw new CoreLoopException(
        "AGENT_INPUT_INVALID",
        "Previous compile result is missing or invalid JSON",
      );
    }
    const result = CompileResultSchema.safeParse(rawResult);
    if (
      !result.success ||
      result.data.runId !== input.runId ||
      result.data.attempt >= input.attempt
    ) {
      throw new CoreLoopException(
        "AGENT_INPUT_INVALID",
        "Previous compile result does not precede this attempt in the same run",
      );
    }
  }
}

function workspacePolicyViolations(
  before: FileManifest,
  after: FileManifest,
  limits: RtlWorkspaceLimits,
): { readonly violations: AgentWorkspaceViolation[]; readonly rtlChanged: boolean } {
  const policy = checkAllowedRunChanges(before, after);
  const violations: AgentWorkspaceViolation[] = policy.violations.map((change) => ({
    reason: "PROTECTED_PATH_CHANGED",
    path: change.path,
    changeKind: change.kind,
    message: "Agent changed a protected run path",
  }));
  const rtlEntries = after.entries.filter((entry) => entry.path.startsWith("workspace/rtl/"));
  for (const entry of rtlEntries) {
    if (!ALLOWED_RTL_EXTENSION.test(entry.path)) {
      violations.push({
        reason: "DISALLOWED_RTL_EXTENSION",
        path: entry.path,
        message: "RTL workspace contains a disallowed file extension",
      });
    }
    if (entry.byteLength > limits.maximumFileBytes) {
      violations.push({
        reason: "RTL_FILE_TOO_LARGE",
        path: entry.path,
        message: "RTL file exceeds the locked per-file byte limit",
      });
    }
  }
  if (rtlEntries.length > limits.maximumFiles) {
    violations.push({
      reason: "RTL_FILE_LIMIT_EXCEEDED",
      message: "RTL workspace exceeds the locked file-count limit",
    });
  }
  const totalBytes = rtlEntries.reduce((total, entry) => total + entry.byteLength, 0);
  if (totalBytes > limits.maximumTotalBytes) {
    violations.push({
      reason: "RTL_TOTAL_BYTES_EXCEEDED",
      message: "RTL workspace exceeds the locked total-byte limit",
    });
  }
  if (!rtlEntries.some((entry) => COMPILE_UNIT_EXTENSION.test(entry.path))) {
    violations.push({
      reason: "NO_COMPILE_UNIT",
      message: "RTL workspace does not contain a .sv or .v compile unit",
    });
  }
  return {
    violations,
    rtlChanged: policy.changes.some((change) => change.path.startsWith("workspace/rtl/")),
  };
}

function chooseOutcome(
  violations: readonly AgentWorkspaceViolation[],
  timedOut: boolean,
  processFailed: boolean,
  exitCode: number | null,
  rtlChanged: boolean,
): AgentTurnOutcome {
  if (violations.some((violation) => violation.reason !== "WORKSPACE_UNSTABLE")) {
    return "POLICY_VIOLATION";
  }
  if (processFailed) return "AGENT_PROCESS_ERROR";
  if (timedOut) return "AGENT_TIMEOUT";
  if (exitCode !== 0 || violations.length > 0) return "AGENT_PROCESS_ERROR";
  return rtlChanged ? "RTL_CHANGED" : "NO_RTL_CHANGE";
}

export class OpenCodeRtlAgentAdapter implements RtlAgentAdapter {
  private readonly config: OpenCodeExperimentConfig;
  private readonly environment: NodeJS.ProcessEnv;
  private readonly configDigest: ReturnType<typeof sha256Jcs>;

  public constructor(config: OpenCodeExperimentConfig) {
    validateConfig(config);
    this.config = {
      ...config,
      ...(config.executableArgumentsPrefix === undefined
        ? {}
        : { executableArgumentsPrefix: [...config.executableArgumentsPrefix] }),
      workspaceLimits: { ...config.workspaceLimits },
      ...(config.environment === undefined ? {} : { environment: { ...config.environment } }),
    };
    this.environment = buildIsolatedOpenCodeEnvironment(this.config);
    this.configDigest = experimentConfigDigest(this.config);
  }

  private async probeCommand(
    arguments_: readonly string[],
  ): Promise<{ readonly stdout: string; readonly stderr: string }> {
    const result = await executeProbeCommand({
      executable: this.config.executable,
      arguments: activeArguments(this.config, arguments_),
      cwd: this.config.repositoryRoot,
      environment: this.environment,
      timeoutMs: Math.min(this.config.timeoutMs, 30_000),
      terminationGraceMs: this.config.terminationGraceMs,
    });
    if (
      result.timedOut ||
      result.terminationFailed ||
      result.exitCode !== 0 ||
      result.stdoutTruncated ||
      result.stderrTruncated
    ) {
      throw new CoreLoopException(
        "OPENCODE_CAPABILITY_MISMATCH",
        "OpenCode capability command failed or exceeded its output limit",
      );
    }
    return { stdout: result.stdout.trim(), stderr: result.stderr.trim() };
  }

  private async probeUncached(): Promise<OpenCodeCapability> {
    await requireNativeExecutable(this.config.executable);
    const version = (await this.probeCommand(["--version"])).stdout;
    if (version !== this.config.expectedOpenCodeVersion) {
      throw new CoreLoopException(
        "OPENCODE_CAPABILITY_MISMATCH",
        "OpenCode version does not match the locked experiment version",
      );
    }
    const helpResult = await this.probeCommand(["run", "--help"]);
    const help = `${helpResult.stdout}\n${helpResult.stderr}`;
    if (REQUIRED_RUN_FLAGS.some((flag) => !help.includes(flag))) {
      throw new CoreLoopException(
        "OPENCODE_CAPABILITY_MISMATCH",
        "OpenCode run command is missing a required flag",
      );
    }
    const agents = (await this.probeCommand(["agent", "list"])).stdout;
    const resolvedAgentPermissions = parseResolvedAgentPermissions(agents);
    const resolvedAgentPermissionDigest =
      validateResolvedAgentPermissions(resolvedAgentPermissions);
    const rawConfig = (await this.probeCommand(["debug", "config"])).stdout;
    let resolvedConfig: unknown;
    try {
      resolvedConfig = JSON.parse(rawConfig) as unknown;
    } catch {
      throw new CoreLoopException(
        "OPENCODE_CAPABILITY_MISMATCH",
        "OpenCode debug config did not return JSON",
      );
    }
    validateResolvedConfig(resolvedConfig);
    const databasePath = (await this.probeCommand(["db", "path"])).stdout;
    if (databasePath.length === 0) {
      throw new CoreLoopException(
        "OPENCODE_CAPABILITY_MISMATCH",
        "OpenCode did not report its session database path",
      );
    }
    const agentFile = path.join(
      this.config.repositoryRoot,
      ".opencode",
      "agents",
      `${AGENT_NAME}.md`,
    );
    const skillFile = path.join(
      this.config.repositoryRoot,
      ".opencode",
      "skills",
      AGENT_NAME,
      "SKILL.md",
    );
    const [agentBytes, skillBytes, guidance] = await Promise.all([
      readFile(agentFile),
      readFile(skillFile),
      loadGuidance(this.config.repositoryRoot),
    ]);
    return OpenCodeCapabilitySchema.parse({
      schemaVersion: 1,
      openCodeVersion: ToolVersionSchema.parse(version),
      model: this.config.providerModel,
      ...(this.config.variant === undefined ? {} : { variant: this.config.variant }),
      pureMode: true,
      agentName: AGENT_NAME,
      requiredFlags: [...REQUIRED_RUN_FLAGS],
      resolvedConfigDigest: sha256Jcs(resolvedConfig),
      resolvedAgentPermissionDigest,
      agentFileDigest: sha256Bytes(agentBytes),
      skillFileDigest: sha256Bytes(skillBytes),
      guidanceFileDigest: guidance.digest,
      experimentConfigDigest: this.configDigest,
    });
  }

  public probe(): Promise<OpenCodeCapability> {
    return this.probeUncached();
  }

  public async runTurn(rawInput: unknown, run: CoreLoopRun): Promise<AgentTurnResult> {
    const parsedInput = AgentAttemptInputSchema.safeParse(rawInput);
    if (!parsedInput.success) {
      throw new CoreLoopException("AGENT_INPUT_INVALID", "Agent turn input is invalid");
    }
    const input = parsedInput.data;
    await validateTurnInput(input, run);
    const evidencePath = LogicalPathSchema.parse(
      `evidence/attempts/${String(input.attempt)}/agent-turn-result.json`,
    );
    if (await lstat(resolveLogicalPath(run.runDirectory, evidencePath)).catch(() => undefined)) {
      throw new CoreLoopException(
        "AGENT_INPUT_INVALID",
        "Agent turn evidence already exists for this attempt",
      );
    }
    const capability = await this.probe();
    const guidance = await loadGuidance(this.config.repositoryRoot);
    if (guidance.digest !== capability.guidanceFileDigest) {
      throw new CoreLoopException(
        "OPENCODE_CAPABILITY_MISMATCH",
        "RTL common guidance changed during Agent preparation",
      );
    }
    await writeAgentInput(run.workspaceDirectory, input);
    const before = await createAttemptRunManifest(run.runDirectory);
    const arguments_ = [
      ...(this.config.executableArgumentsPrefix ?? []),
      "--pure",
      "run",
      "--agent",
      AGENT_NAME,
      "--model",
      this.config.providerModel,
      ...(this.config.variant === undefined ? [] : ["--variant", this.config.variant]),
      "--format",
      "json",
      "--dir",
      run.workspaceDirectory,
      "--title",
      `core-loop-${run.runId}-attempt-${String(input.attempt)}`,
      turnPrompt(guidance.content),
    ];
    const processResult = await executeOpenCodeProcess({
      executable: this.config.executable,
      arguments: arguments_,
      cwd: this.config.repositoryRoot,
      environment: this.environment,
      timeoutMs: this.config.timeoutMs,
      terminationGraceMs: this.config.terminationGraceMs,
      stderrLimitBytes: this.config.stderrLimitBytes,
      maximumEvents: this.config.maximumEvents,
      maximumEventLineBytes: this.config.maximumEventLineBytes,
    });

    const violations: AgentWorkspaceViolation[] = [];
    let after: FileManifest | undefined;
    let rtlChanged = false;
    try {
      const firstAfter = await createAttemptRunManifest(run.runDirectory);
      await delay(this.config.stabilityWindowMs);
      const stableAfter = await createAttemptRunManifest(run.runDirectory);
      after = stableAfter;
      if (firstAfter.manifestDigest !== stableAfter.manifestDigest) {
        violations.push({
          reason: "WORKSPACE_UNSTABLE",
          message: "Workspace continued changing after the Agent process closed",
        });
      }
      const policy = workspacePolicyViolations(before, stableAfter, this.config.workspaceLimits);
      violations.push(...policy.violations);
      rtlChanged = policy.rtlChanged;
    } catch {
      violations.push({
        reason: "WORKSPACE_UNSCANNABLE",
        message: "Workspace could not be safely scanned after the Agent turn",
      });
    }

    const outcome = chooseOutcome(
      violations,
      processResult.timedOut,
      processResult.terminationFailed || processResult.spawnError !== undefined,
      processResult.exitCode,
      rtlChanged,
    );
    const result = AgentTurnResultSchema.parse({
      schemaVersion: 1,
      runId: input.runId,
      attempt: input.attempt,
      outcome,
      workspaceUsableForCompile: outcome === "RTL_CHANGED",
      rtlChanged,
      beforeManifestDigest: before.manifestDigest,
      afterManifestDigest: after?.manifestDigest ?? null,
      exitCode: processResult.exitCode,
      timedOut: processResult.timedOut,
      durationMs: processResult.durationMs,
      openCodeVersion: capability.openCodeVersion,
      model: capability.model,
      ...(capability.variant === undefined ? {} : { variant: capability.variant }),
      resolvedConfigDigest: capability.resolvedConfigDigest,
      resolvedAgentPermissionDigest: capability.resolvedAgentPermissionDigest,
      agentFileDigest: capability.agentFileDigest,
      skillFileDigest: capability.skillFileDigest,
      guidanceFileDigest: capability.guidanceFileDigest,
      experimentConfigDigest: capability.experimentConfigDigest,
      violations,
      eventStream: processResult.eventStream,
      stderr: processResult.stderr,
      evidencePath,
    });
    await writeJsonEvidenceExclusive(run.runDirectory, evidencePath, result);
    return result;
  }
}

function environmentInteger(
  environment: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
): number {
  const raw = environment[name];
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value)) {
    throw new CoreLoopException("OPENCODE_NOT_CONFIGURED", `${name} must be an integer`);
  }
  return value;
}

export function openCodeExperimentConfigFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
  repositoryRoot: string = process.cwd(),
): OpenCodeExperimentConfig {
  const executable = environment.RTL_AGENT_OPENCODE_EXECUTABLE;
  const expectedOpenCodeVersion = environment.RTL_AGENT_OPENCODE_VERSION;
  const providerModel = environment.RTL_AGENT_OPENCODE_MODEL;
  if (
    executable === undefined ||
    expectedOpenCodeVersion === undefined ||
    providerModel === undefined
  ) {
    throw new CoreLoopException(
      "OPENCODE_NOT_CONFIGURED",
      "Set RTL_AGENT_OPENCODE_EXECUTABLE, RTL_AGENT_OPENCODE_VERSION, and RTL_AGENT_OPENCODE_MODEL",
    );
  }
  const kimiCodeApiKey = providerModel.startsWith(`${KIMI_CODE_PROVIDER_ID}/`)
    ? environment[KIMI_CODE_API_KEY_ENVIRONMENT_NAME]
    : undefined;
  if (
    providerModel.startsWith(`${KIMI_CODE_PROVIDER_ID}/`) &&
    (kimiCodeApiKey === undefined || kimiCodeApiKey.trim().length === 0)
  ) {
    throw new CoreLoopException(
      "OPENCODE_NOT_CONFIGURED",
      `Set ${KIMI_CODE_API_KEY_ENVIRONMENT_NAME} for the Kimi Code provider`,
    );
  }
  return {
    executable: path.resolve(executable),
    expectedOpenCodeVersion,
    repositoryRoot: path.resolve(repositoryRoot),
    providerModel,
    ...(kimiCodeApiKey === undefined
      ? {}
      : { environment: { [KIMI_CODE_API_KEY_ENVIRONMENT_NAME]: kimiCodeApiKey } }),
    ...(environment.RTL_AGENT_OPENCODE_VARIANT === undefined
      ? {}
      : { variant: environment.RTL_AGENT_OPENCODE_VARIANT }),
    timeoutMs: environmentInteger(environment, "RTL_AGENT_TURN_TIMEOUT_MS", 600_000),
    terminationGraceMs: environmentInteger(environment, "RTL_AGENT_TERMINATION_GRACE_MS", 2_000),
    stabilityWindowMs: environmentInteger(environment, "RTL_AGENT_STABILITY_WINDOW_MS", 250),
    stderrLimitBytes: environmentInteger(environment, "RTL_AGENT_STDERR_LIMIT_BYTES", 65_536),
    maximumEvents: environmentInteger(environment, "RTL_AGENT_MAXIMUM_EVENTS", 256),
    maximumEventLineBytes: environmentInteger(
      environment,
      "RTL_AGENT_MAXIMUM_EVENT_LINE_BYTES",
      65_536,
    ),
    workspaceLimits: {
      maximumFiles: environmentInteger(environment, "RTL_AGENT_MAXIMUM_FILES", 256),
      maximumFileBytes: environmentInteger(environment, "RTL_AGENT_MAXIMUM_FILE_BYTES", 1_048_576),
      maximumTotalBytes: environmentInteger(
        environment,
        "RTL_AGENT_MAXIMUM_TOTAL_BYTES",
        10_485_760,
      ),
    },
  };
}
