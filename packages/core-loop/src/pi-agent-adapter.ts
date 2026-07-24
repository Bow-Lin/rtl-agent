import { lstat, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { LogicalPathSchema } from "@rtl-agent/contracts";
import { z } from "zod";

import { AgentTurnResultSchema, PiCapabilitySchema } from "./agent-contracts.js";
import type { AgentTurnResult, AgentWorkspaceViolation, PiCapability } from "./agent-contracts.js";
import {
  chooseAgentTurnOutcome,
  loadRtlAgentGuidance,
  validateTurnInput,
  workspacePolicyViolations,
  writeAgentInput,
} from "./agent-adapter.js";
import type { RtlAgentAdapter, RtlWorkspaceLimits } from "./agent-adapter.js";
import { AgentAttemptInputSchema, ToolVersionSchema } from "./contracts.js";
import { CoreLoopException } from "./errors.js";
import { writeJsonEvidenceExclusive } from "./evidence.js";
import { resolveLogicalPath, sha256Bytes, sha256Jcs } from "./filesystem.js";
import { createAttemptRunManifest, createFileManifest } from "./manifest.js";
import type { FileManifest } from "./manifest.js";
import type { CoreLoopRun } from "./materialize.js";
import { executeOpenCodeProcess, executeProbeCommand } from "./opencode-process.js";

const AGENT_NAME = "rtl-core-loop" as const;
const PiProjectCapabilitySchema = z.strictObject({
  schemaVersion: z.literal(1),
  enabledTools: z.tuple([z.literal("read"), z.literal("write"), z.literal("edit")]),
});
type PiProjectCapability = z.infer<typeof PiProjectCapabilitySchema>;
const REQUIRED_FLAGS = [
  "--mode",
  "--no-session",
  "--provider",
  "--model",
  "--tools",
  "--no-extensions",
  "--extension",
  "--no-skills",
  "--no-prompt-templates",
  "--no-themes",
  "--no-context-files",
  "--no-approve",
  "--offline",
] as const;
const TOOL_POLICY = {
  read: ["spec.md", "context/**", "rtl/**"],
  write: ["rtl/**/*.sv", "rtl/**/*.svh", "rtl/**/*.v", "rtl/**/*.vh"],
  edit: ["rtl/**/*.sv", "rtl/**/*.svh", "rtl/**/*.v", "rtl/**/*.vh"],
  deniedTools: ["bash", "grep", "find", "ls"],
} as const;
const MAXIMUM_PROVIDER_REQUESTS = 64;
const MAXIMUM_PROVIDER_CAPTURE_BYTES = 8 * 1024 * 1024;
const PROVIDER_CAPTURE_CLEANUP_WARNING =
  "Pi provider capture temporary directory could not be removed after bounded retries";
const PiProviderRequestCaptureEntrySchema = z.strictObject({
  sequence: z.int().positive().max(MAXIMUM_PROVIDER_REQUESTS),
  payload: z.unknown(),
});

export interface PiExperimentConfig {
  readonly executable: string;
  readonly executableArgumentsPrefix?: readonly string[];
  readonly expectedPiVersion: string;
  readonly repositoryRoot: string;
  readonly configDirectory: string;
  readonly provider: string;
  readonly model: string;
  readonly capabilityFile: string;
  readonly extensionFile: string;
  readonly timeoutMs: number;
  readonly terminationGraceMs: number;
  readonly stabilityWindowMs: number;
  readonly stderrLimitBytes: number;
  readonly maximumEvents: number;
  readonly maximumEventLineBytes: number;
  readonly workspaceLimits: RtlWorkspaceLimits;
  readonly environment?: Readonly<Record<string, string>>;
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

function validateConfig(config: PiExperimentConfig): void {
  if (
    !path.isAbsolute(config.executable) ||
    !path.isAbsolute(config.repositoryRoot) ||
    !path.isAbsolute(config.configDirectory) ||
    !path.isAbsolute(config.capabilityFile) ||
    !path.isAbsolute(config.extensionFile)
  ) {
    throw new TypeError(
      "Pi executable, repositoryRoot, capabilityFile, and extensionFile must be absolute paths",
    );
  }
  validateToken("expectedPiVersion", config.expectedPiVersion);
  validateToken("provider", config.provider);
  validateToken("model", config.model);
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
    throw new TypeError("Pi executable argument prefix contains a null byte");
  }
}

async function requireRegularFile(
  hostPath: string,
  code: "PI_AGENT_NOT_CONFIGURED" | "PI_AGENT_CAPABILITY_MISMATCH",
  description: string,
): Promise<void> {
  const stat = await lstat(hostPath).catch(() => undefined);
  if (stat === undefined || !stat.isFile() || stat.isSymbolicLink()) {
    throw new CoreLoopException(code, `${description} is not a regular file`);
  }
}

async function loadPiProjectCapability(capabilityFile: string): Promise<PiProjectCapability> {
  try {
    const stat = await lstat(capabilityFile);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size === 0 || stat.size > 4_096) {
      throw new Error("invalid capability file");
    }
    return PiProjectCapabilitySchema.parse(JSON.parse(await readFile(capabilityFile, "utf8")));
  } catch {
    throw new CoreLoopException(
      "PI_AGENT_CAPABILITY_MISMATCH",
      "Pi project capability configuration is unavailable or invalid",
    );
  }
}

function activeArguments(config: PiExperimentConfig, arguments_: readonly string[]): string[] {
  return [...(config.executableArgumentsPrefix ?? []), ...arguments_];
}

export function buildIsolatedPiEnvironment(
  config: PiExperimentConfig,
  workspaceRoot?: string,
  providerCapturePath?: string,
): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = { ...process.env, ...config.environment };
  delete environment.PI_CODING_AGENT_DIR;
  delete environment.PI_CODING_AGENT_SESSION_DIR;
  delete environment.PI_PACKAGE_DIR;
  environment.PI_CODING_AGENT_DIR = config.configDirectory;
  environment.PI_CODING_AGENT_SESSION_DIR = path.join(
    config.repositoryRoot,
    ".rtl-agent",
    "pi-sessions-disabled",
  );
  environment.PI_OFFLINE = "1";
  environment.PI_SKIP_VERSION_CHECK = "1";
  environment.PI_TELEMETRY = "0";
  if (environment.KIMI_API_KEY === undefined && environment.KIMI_CODE_API_KEY !== undefined) {
    environment.KIMI_API_KEY = environment.KIMI_CODE_API_KEY;
  }
  if (workspaceRoot !== undefined) {
    if (providerCapturePath === undefined || !path.isAbsolute(providerCapturePath)) {
      throw new TypeError("Pi provider capture path must be absolute for an Agent turn");
    }
    environment.RTL_AGENT_PI_POLICY_REQUIRED = "1";
    environment.RTL_AGENT_PI_WORKSPACE_ROOT = workspaceRoot;
    environment.RTL_AGENT_PI_PROVIDER_CAPTURE_PATH = providerCapturePath;
    environment.RTL_AGENT_PI_PROVIDER_CAPTURE_MAX_REQUESTS = String(MAXIMUM_PROVIDER_REQUESTS);
    environment.RTL_AGENT_PI_PROVIDER_CAPTURE_MAX_BYTES = String(MAXIMUM_PROVIDER_CAPTURE_BYTES);
  } else {
    delete environment.RTL_AGENT_PI_POLICY_REQUIRED;
    delete environment.RTL_AGENT_PI_WORKSPACE_ROOT;
    delete environment.RTL_AGENT_PI_PROVIDER_CAPTURE_PATH;
    delete environment.RTL_AGENT_PI_PROVIDER_CAPTURE_MAX_REQUESTS;
    delete environment.RTL_AGENT_PI_PROVIDER_CAPTURE_MAX_BYTES;
  }
  return environment;
}

function isolationConfig(
  config: PiExperimentConfig,
  projectCapability: PiProjectCapability,
): Record<string, unknown> {
  return {
    schemaVersion: 1,
    mode: "json",
    sessionMode: "EPHEMERAL",
    offlineStartup: true,
    projectTrust: false,
    policyActivation: "RTL_AGENT_PI_POLICY_REQUIRED=1",
    contextFiles: false,
    extensions: [
      path.relative(config.repositoryRoot, config.extensionFile).split(path.sep).join("/"),
    ],
    skills: [],
    promptTemplates: [],
    themes: [],
    enabledTools: [...projectCapability.enabledTools],
    providerCapture: {
      maximumRequests: MAXIMUM_PROVIDER_REQUESTS,
      maximumBytes: MAXIMUM_PROVIDER_CAPTURE_BYTES,
    },
  };
}

function projectToolPolicyDigest(
  projectCapability: PiProjectCapability,
): ReturnType<typeof sha256Jcs> {
  return sha256Jcs({
    schemaVersion: 1,
    projectCapability,
    workspacePolicy: TOOL_POLICY,
  });
}

function experimentConfigDigest(
  config: PiExperimentConfig,
  projectCapability: PiProjectCapability,
): ReturnType<typeof sha256Jcs> {
  return sha256Jcs({
    schemaVersion: 1,
    expectedPiVersion: config.expectedPiVersion,
    provider: config.provider,
    model: config.model,
    agentName: AGENT_NAME,
    ...(config.executableArgumentsPrefix === undefined
      ? {}
      : { executableArgumentsPrefix: [...config.executableArgumentsPrefix] }),
    timeoutMs: config.timeoutMs,
    terminationGraceMs: config.terminationGraceMs,
    stabilityWindowMs: config.stabilityWindowMs,
    stderrLimitBytes: config.stderrLimitBytes,
    maximumEvents: config.maximumEvents,
    maximumEventLineBytes: config.maximumEventLineBytes,
    workspaceLimits: config.workspaceLimits,
    isolation: isolationConfig(config, projectCapability),
    toolPolicyDigest: projectToolPolicyDigest(projectCapability),
  });
}

function fixedPrompt(guidance: string): string {
  return [
    "Read context/agent-input.json and execute exactly one RTL editing attempt.",
    "The case specification is authoritative.",
    "Only read spec.md, context/**, and rtl/**. Only write or edit RTL files under rtl/.",
    "Do not claim compilation or functional verification.",
    "",
    guidance,
  ].join("\n");
}

async function readProviderRequestCapture(capturePath: string): Promise<unknown[]> {
  try {
    const stat = await lstat(capturePath);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAXIMUM_PROVIDER_CAPTURE_BYTES) {
      throw new Error("invalid capture file");
    }
    const content = await readFile(capturePath, "utf8");
    if (Buffer.byteLength(content, "utf8") !== stat.size) {
      throw new Error("capture file changed while being read");
    }
    const lines = content.length === 0 ? [] : content.trimEnd().split("\n");
    if (lines.length > MAXIMUM_PROVIDER_REQUESTS) {
      throw new Error("too many provider requests");
    }
    return lines.map((line, index) => {
      const entry = PiProviderRequestCaptureEntrySchema.parse(JSON.parse(line));
      if (entry.sequence !== index + 1) {
        throw new Error("provider request sequence is invalid");
      }
      return entry.payload;
    });
  } catch {
    throw new CoreLoopException(
      "PI_AGENT_CAPABILITY_MISMATCH",
      "Pi provider request capture is unavailable or invalid",
    );
  }
}

type RemoveProviderCaptureDirectory = (
  directory: string,
  options: {
    readonly recursive: true;
    readonly force: true;
    readonly maxRetries: number;
    readonly retryDelay: number;
  },
) => Promise<void>;

export async function cleanupProviderCaptureDirectory(
  directory: string,
  removeDirectory: RemoveProviderCaptureDirectory = rm,
  reportWarning: (message: string) => void = (message) => {
    process.emitWarning(message, { code: "PROVIDER_CAPTURE_CLEANUP_FAILED" });
  },
): Promise<boolean> {
  try {
    await removeDirectory(directory, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 100,
    });
    return true;
  } catch {
    reportWarning(PROVIDER_CAPTURE_CLEANUP_WARNING);
    return false;
  }
}

export class PiRtlAgentAdapter implements RtlAgentAdapter {
  private readonly config: PiExperimentConfig;
  private runtimeConfigDigest: ReturnType<typeof sha256Jcs> | undefined;

  public constructor(config: PiExperimentConfig) {
    validateConfig(config);
    this.config = {
      ...config,
      ...(config.executableArgumentsPrefix === undefined
        ? {}
        : { executableArgumentsPrefix: [...config.executableArgumentsPrefix] }),
      workspaceLimits: { ...config.workspaceLimits },
      ...(config.environment === undefined ? {} : { environment: { ...config.environment } }),
    };
  }

  private async probeCommand(
    arguments_: readonly string[],
  ): Promise<{ readonly stdout: string; readonly stderr: string }> {
    const result = await executeProbeCommand({
      executable: this.config.executable,
      arguments: activeArguments(this.config, arguments_),
      cwd: this.config.repositoryRoot,
      environment: buildIsolatedPiEnvironment(this.config),
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
        "PI_AGENT_CAPABILITY_MISMATCH",
        "Pi capability command failed or exceeded its output limit",
      );
    }
    return { stdout: result.stdout.trim(), stderr: result.stderr.trim() };
  }

  private async lockSharedConfig(): Promise<ReturnType<typeof sha256Jcs>> {
    await mkdir(this.config.configDirectory, { recursive: true });
    const [semantic, runtime] = await Promise.all([
      createFileManifest(this.config.configDirectory, (logicalPath) => logicalPath !== "auth.json"),
      createFileManifest(this.config.configDirectory),
    ]);
    if (
      this.runtimeConfigDigest !== undefined &&
      this.runtimeConfigDigest !== runtime.manifestDigest
    ) {
      throw new CoreLoopException(
        "PI_AGENT_CAPABILITY_MISMATCH",
        "Shared Pi configuration changed during the bound Agent lifecycle",
      );
    }
    this.runtimeConfigDigest = runtime.manifestDigest;
    return semantic.manifestDigest;
  }

  public async probe(): Promise<PiCapability> {
    await Promise.all([
      requireRegularFile(
        this.config.executable,
        "PI_AGENT_NOT_CONFIGURED",
        "Configured Pi executable",
      ),
      requireRegularFile(
        this.config.extensionFile,
        "PI_AGENT_CAPABILITY_MISMATCH",
        "Pi RTL policy extension",
      ),
      requireRegularFile(
        this.config.capabilityFile,
        "PI_AGENT_CAPABILITY_MISMATCH",
        "Pi project capability configuration",
      ),
    ]);
    const version = (await this.probeCommand(["--version"])).stdout.replace(/^pi\s+/i, "");
    if (version !== this.config.expectedPiVersion) {
      throw new CoreLoopException(
        "PI_AGENT_CAPABILITY_MISMATCH",
        "Pi version does not match the locked experiment version",
      );
    }
    const helpResult = await this.probeCommand(["--help"]);
    const help = `${helpResult.stdout}\n${helpResult.stderr}`;
    if (REQUIRED_FLAGS.some((flag) => !help.includes(flag))) {
      throw new CoreLoopException(
        "PI_AGENT_CAPABILITY_MISMATCH",
        "Pi is missing a required isolation or execution flag",
      );
    }
    const resolvedConfigDigest = await this.lockSharedConfig();
    const [extensionBytes, guidance, projectCapability] = await Promise.all([
      readFile(this.config.extensionFile),
      loadRtlAgentGuidance(this.config.repositoryRoot),
      loadPiProjectCapability(this.config.capabilityFile),
    ]);
    return PiCapabilitySchema.parse({
      schemaVersion: 1,
      piVersion: ToolVersionSchema.parse(version),
      provider: this.config.provider,
      model: this.config.model,
      sessionMode: "EPHEMERAL",
      agentName: AGENT_NAME,
      requiredFlags: [...REQUIRED_FLAGS],
      enabledTools: [...projectCapability.enabledTools],
      resolvedConfigDigest,
      isolationConfigDigest: sha256Jcs(isolationConfig(this.config, projectCapability)),
      toolPolicyDigest: projectToolPolicyDigest(projectCapability),
      extensionFileDigest: sha256Bytes(extensionBytes),
      guidanceFileDigest: guidance.digest,
      experimentConfigDigest: experimentConfigDigest(this.config, projectCapability),
    });
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
    if ((await this.lockSharedConfig()) !== capability.resolvedConfigDigest) {
      throw new CoreLoopException(
        "PI_AGENT_CAPABILITY_MISMATCH",
        "Shared Pi semantic configuration changed before the Agent turn",
      );
    }
    const [extensionBytes, guidance, projectCapability] = await Promise.all([
      readFile(this.config.extensionFile),
      loadRtlAgentGuidance(this.config.repositoryRoot),
      loadPiProjectCapability(this.config.capabilityFile),
    ]);
    if (
      sha256Bytes(extensionBytes) !== capability.extensionFileDigest ||
      guidance.digest !== capability.guidanceFileDigest ||
      projectToolPolicyDigest(projectCapability) !== capability.toolPolicyDigest
    ) {
      throw new CoreLoopException(
        "PI_AGENT_CAPABILITY_MISMATCH",
        "Pi capability, policy, or RTL guidance changed during Agent preparation",
      );
    }

    await writeAgentInput(run.workspaceDirectory, input);
    const before = await createAttemptRunManifest(run.runDirectory);
    const providerCaptureDirectory = await mkdtemp(
      path.join(os.tmpdir(), "rtl-agent-pi-provider-"),
    );
    const providerCapturePath = path.join(providerCaptureDirectory, "requests.jsonl");
    let processResult;
    let providerRequestPayloads: unknown[];
    let providerCaptureCleanupSucceeded: boolean;
    try {
      processResult = await executeOpenCodeProcess({
        executable: this.config.executable,
        arguments: activeArguments(this.config, [
          "--mode",
          "json",
          "--no-session",
          "--provider",
          this.config.provider,
          "--model",
          this.config.model,
          "--tools",
          capability.enabledTools.join(","),
          "--no-extensions",
          "--extension",
          this.config.extensionFile,
          "--no-skills",
          "--no-prompt-templates",
          "--no-themes",
          "--no-context-files",
          "--no-approve",
          "--offline",
          "--system-prompt",
          fixedPrompt(guidance.content),
          "Execute the bounded RTL attempt now.",
        ]),
        cwd: run.workspaceDirectory,
        environment: buildIsolatedPiEnvironment(
          this.config,
          run.workspaceDirectory,
          providerCapturePath,
        ),
        timeoutMs: this.config.timeoutMs,
        terminationGraceMs: this.config.terminationGraceMs,
        stderrLimitBytes: this.config.stderrLimitBytes,
        maximumEvents: this.config.maximumEvents,
        maximumEventLineBytes: this.config.maximumEventLineBytes,
      });
      providerRequestPayloads =
        processResult.spawnError === undefined
          ? await readProviderRequestCapture(providerCapturePath)
          : [];
    } finally {
      providerCaptureCleanupSucceeded =
        await cleanupProviderCaptureDirectory(providerCaptureDirectory);
    }
    if ((await this.lockSharedConfig()) !== capability.resolvedConfigDigest) {
      throw new CoreLoopException(
        "PI_AGENT_CAPABILITY_MISMATCH",
        "Shared Pi semantic configuration changed during the Agent turn",
      );
    }
    if (
      projectToolPolicyDigest(await loadPiProjectCapability(this.config.capabilityFile)) !==
      capability.toolPolicyDigest
    ) {
      throw new CoreLoopException(
        "PI_AGENT_CAPABILITY_MISMATCH",
        "Pi project capability changed during the Agent turn",
      );
    }

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

    const outcome = chooseAgentTurnOutcome(
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
      piVersion: capability.piVersion,
      provider: capability.provider,
      model: capability.model,
      sessionMode: capability.sessionMode,
      enabledTools: capability.enabledTools,
      resolvedConfigDigest: capability.resolvedConfigDigest,
      isolationConfigDigest: capability.isolationConfigDigest,
      toolPolicyDigest: capability.toolPolicyDigest,
      extensionFileDigest: capability.extensionFileDigest,
      guidanceFileDigest: capability.guidanceFileDigest,
      experimentConfigDigest: capability.experimentConfigDigest,
      violations,
      eventStream: processResult.eventStream,
      stderr: processResult.stderr,
      evidencePath,
      ...(providerCaptureCleanupSucceeded
        ? {}
        : {
            localWarnings: [
              {
                code: "PROVIDER_CAPTURE_CLEANUP_FAILED",
                message: PROVIDER_CAPTURE_CLEANUP_WARNING,
              },
            ],
          }),
    });
    await writeJsonEvidenceExclusive(
      run.runDirectory,
      `evidence/attempts/${String(input.attempt)}/provider-request-payloads.json`,
      {
        schemaVersion: 1,
        provider: capability.provider,
        model: capability.model,
        attempt: input.attempt,
        requests: providerRequestPayloads.map((payload, index) => ({
          sequence: index + 1,
          payload,
        })),
      },
    );
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
    throw new CoreLoopException("PI_AGENT_NOT_CONFIGURED", `${name} must be an integer`);
  }
  return value;
}

export function piExperimentConfigFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
  repositoryRoot: string = process.cwd(),
): PiExperimentConfig {
  const executable = environment.RTL_AGENT_PI_EXECUTABLE;
  const expectedPiVersion = environment.RTL_AGENT_PI_VERSION;
  const provider = environment.RTL_AGENT_PI_PROVIDER;
  const model = environment.RTL_AGENT_PI_MODEL;
  if (
    executable === undefined ||
    expectedPiVersion === undefined ||
    provider === undefined ||
    model === undefined
  ) {
    throw new CoreLoopException(
      "PI_AGENT_NOT_CONFIGURED",
      "Set RTL_AGENT_PI_EXECUTABLE, RTL_AGENT_PI_VERSION, RTL_AGENT_PI_PROVIDER, and RTL_AGENT_PI_MODEL",
    );
  }
  const kimiKey = environment.KIMI_API_KEY ?? environment.KIMI_CODE_API_KEY;
  if (provider === "kimi-coding" && (kimiKey === undefined || kimiKey.trim().length === 0)) {
    throw new CoreLoopException(
      "PI_AGENT_NOT_CONFIGURED",
      "Set KIMI_API_KEY or KIMI_CODE_API_KEY for the Pi Kimi provider",
    );
  }
  const entrypoint = environment.RTL_AGENT_PI_ENTRYPOINT;
  return {
    executable: path.resolve(executable),
    ...(entrypoint === undefined ? {} : { executableArgumentsPrefix: [path.resolve(entrypoint)] }),
    expectedPiVersion,
    repositoryRoot: path.resolve(repositoryRoot),
    configDirectory: path.join(path.resolve(repositoryRoot), ".rtl-agent", "pi-state"),
    provider,
    model,
    capabilityFile: path.join(path.resolve(repositoryRoot), ".pi", "capability.json"),
    extensionFile: path.join(
      path.resolve(repositoryRoot),
      ".pi",
      "extensions",
      "rtl-core-loop-policy.mjs",
    ),
    ...(kimiKey === undefined
      ? {}
      : { environment: { KIMI_API_KEY: kimiKey, KIMI_CODE_API_KEY: kimiKey } }),
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
