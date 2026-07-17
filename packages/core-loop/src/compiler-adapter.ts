import { lstat, readFile } from "node:fs/promises";
import path from "node:path";

import {
  CapturedOutputSchema,
  CompileRequestSchema,
  CompileResultSchema,
  ToolVersionSchema,
} from "./contracts.js";
import type {
  CapturedOutput,
  CompileIssue,
  CompileRequest,
  CompileResult,
  RunId,
  ToolVersion,
} from "./contracts.js";
import { discoverCompilerSources, SourcePreparationError } from "./compile-preparation.js";
import { FIXED_ICARUS_PROFILE_ID, IcarusCapabilitySchema } from "./compiler-contracts.js";
import type { IcarusCapability } from "./compiler-contracts.js";
import { parseCompilerDiagnostics } from "./compiler-diagnostics.js";
import {
  buildFixedIcarusArguments,
  controlledIcarusEnvironment,
  FIXED_ICARUS_PROFILE,
  FIXED_ICARUS_PROFILE_DIGEST,
} from "./compiler-profile.js";
import { executeCompilerProcess } from "./compiler-process.js";
import type { CompilerProcessOptions, CompilerProcessResult } from "./compiler-process.js";
import { sha256Bytes } from "./filesystem.js";
import { createBaselineWorkspaceManifest } from "./manifest.js";
import type { FileManifest } from "./manifest.js";

type ProcessRunner = (options: CompilerProcessOptions) => Promise<CompilerProcessResult>;
type ManifestFactory = (runDirectory: string) => Promise<FileManifest>;
type SourceDiscoverer = typeof discoverCompilerSources;

export interface IcarusCompileAdapterConfig {
  readonly executable: string;
  readonly probeWorkingDirectory: string;
}

export interface CompileWorkspace {
  readonly runId: RunId;
  readonly runDirectory: string;
  readonly workspaceDirectory: string;
}

export interface IcarusCompileAdapterDependencies {
  readonly processRunner?: ProcessRunner;
  readonly manifestFactory?: ManifestFactory;
  readonly sourceDiscoverer?: SourceDiscoverer;
}

export class IcarusProbeError extends Error {
  public constructor(
    message: string,
    public readonly toolVersion: ToolVersion | null,
    public readonly stdout: CapturedOutput,
    public readonly stderr: CapturedOutput,
  ) {
    super(message);
    this.name = "IcarusProbeError";
  }
}

function emptyOutput(): CapturedOutput {
  return CapturedOutputSchema.parse({
    preview: "",
    truncated: false,
    originalByteLength: 0,
  });
}

function stableIssue(message: string): CompileIssue {
  return { kind: "ERROR", message };
}

function parseToolVersion(stdout: string, stderr: string): ToolVersion | null {
  const match = /Icarus Verilog version [^\r\n]+/.exec(`${stdout}\n${stderr}`);
  if (match === null) return null;
  const parsed = ToolVersionSchema.safeParse(match[0].trim());
  return parsed.success ? parsed.data : null;
}

function processPlatform(): "win32" | "linux" | "darwin" {
  if (
    process.platform === "win32" ||
    process.platform === "linux" ||
    process.platform === "darwin"
  ) {
    return process.platform;
  }
  throw new Error("Unsupported compiler host platform");
}

export class IcarusCompileAdapter {
  private readonly executable: string;
  private readonly probeWorkingDirectory: string;
  private readonly processRunner: ProcessRunner;
  private readonly manifestFactory: ManifestFactory;
  private readonly sourceDiscoverer: SourceDiscoverer;
  private readonly environment: NodeJS.ProcessEnv;

  public constructor(
    config: IcarusCompileAdapterConfig,
    dependencies: IcarusCompileAdapterDependencies = {},
  ) {
    if (!path.isAbsolute(config.executable) || !path.isAbsolute(config.probeWorkingDirectory)) {
      throw new TypeError("Icarus adapter paths must be absolute");
    }
    this.executable = path.normalize(config.executable);
    this.probeWorkingDirectory = path.normalize(config.probeWorkingDirectory);
    this.processRunner = dependencies.processRunner ?? executeCompilerProcess;
    this.manifestFactory = dependencies.manifestFactory ?? createBaselineWorkspaceManifest;
    this.sourceDiscoverer = dependencies.sourceDiscoverer ?? discoverCompilerSources;
    this.environment = Object.freeze(controlledIcarusEnvironment(this.executable));
  }

  private async validateExecutable(): Promise<Uint8Array> {
    if (process.platform === "win32" && path.extname(this.executable).toLowerCase() !== ".exe") {
      throw new Error("Icarus executable must be a native executable");
    }
    const stat = await lstat(this.executable).catch(() => undefined);
    if (stat === undefined || !stat.isFile() || stat.isSymbolicLink()) {
      throw new Error("Icarus executable is unavailable");
    }
    const bytes = await readFile(this.executable);
    if (
      process.platform !== "win32" &&
      ((stat.mode & 0o111) === 0 || (bytes[0] === 0x23 && bytes[1] === 0x21))
    ) {
      throw new Error("Icarus executable must be a native executable");
    }
    return bytes;
  }

  private async probeAt(workingDirectory: string): Promise<IcarusCapability> {
    let executableBytes: Uint8Array;
    try {
      executableBytes = await this.validateExecutable();
    } catch {
      throw new IcarusProbeError(
        "IVERILOG_EXECUTABLE_UNAVAILABLE",
        null,
        emptyOutput(),
        emptyOutput(),
      );
    }
    const result = await this.processRunner({
      executable: this.executable,
      arguments: FIXED_ICARUS_PROFILE.versionArguments,
      cwd: workingDirectory,
      environment: this.environment,
      timeoutMs: FIXED_ICARUS_PROFILE.probeTimeoutMs,
      terminationGraceMs: FIXED_ICARUS_PROFILE.terminationGraceMs,
      retainedOutputBytes: FIXED_ICARUS_PROFILE.captureRetainedBytes,
      stdoutLimitBytes: FIXED_ICARUS_PROFILE.stdoutLimitBytes,
      stderrLimitBytes: FIXED_ICARUS_PROFILE.stderrLimitBytes,
    });
    const toolVersion = parseToolVersion(result.stdout.preview, result.stderr.preview);
    if (result.terminationFailed || !result.closeConfirmed) {
      throw new IcarusProbeError(
        "IVERILOG_PROBE_TERMINATION_UNCONFIRMED",
        toolVersion,
        result.stdout,
        result.stderr,
      );
    }
    if (result.spawnError !== undefined) {
      throw new IcarusProbeError(
        "IVERILOG_PROBE_SPAWN_FAILED",
        toolVersion,
        result.stdout,
        result.stderr,
      );
    }
    if (result.timedOut) {
      throw new IcarusProbeError(
        "IVERILOG_PROBE_TIMEOUT",
        toolVersion,
        result.stdout,
        result.stderr,
      );
    }
    if (
      result.exitCode !== 0 ||
      result.signal !== null ||
      result.stdout.truncated ||
      result.stderr.truncated ||
      toolVersion === null
    ) {
      throw new IcarusProbeError(
        "IVERILOG_PROBE_FAILED",
        toolVersion,
        result.stdout,
        result.stderr,
      );
    }
    if (toolVersion !== FIXED_ICARUS_PROFILE.expectedVersion) {
      throw new IcarusProbeError(
        "IVERILOG_VERSION_MISMATCH",
        toolVersion,
        result.stdout,
        result.stderr,
      );
    }
    return IcarusCapabilitySchema.parse({
      schemaVersion: 1,
      compilerProfileId: FIXED_ICARUS_PROFILE_ID,
      executableProduct: "Icarus Verilog",
      executableDigest: sha256Bytes(executableBytes),
      toolVersion,
      profileDigest: FIXED_ICARUS_PROFILE_DIGEST,
      platform: processPlatform(),
      probeStdout: result.stdout,
      probeStderr: result.stderr,
    });
  }

  public probe(): Promise<IcarusCapability> {
    return this.probeAt(this.probeWorkingDirectory);
  }

  private result(
    request: CompileRequest,
    startedAt: number,
    status: CompileResult["status"],
    toolVersion: ToolVersion | null,
    exitCode: number | null,
    issues: readonly CompileIssue[],
    stdout: CapturedOutput,
    stderr: CapturedOutput,
  ): CompileResult {
    return CompileResultSchema.parse({
      schemaVersion: 1,
      authoritative: false,
      claim: "COMPILE_ONLY",
      status,
      runId: request.runId,
      attempt: request.attempt,
      compilerProfileId: FIXED_ICARUS_PROFILE_ID,
      toolVersion,
      topModule: request.topModule,
      workspaceManifestDigest: request.workspaceManifestDigest,
      exitCode,
      durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
      issues,
      stdout,
      stderr,
    });
  }

  private toolError(
    request: CompileRequest,
    startedAt: number,
    toolVersion: ToolVersion | null,
    message: string,
    stdout: CapturedOutput = emptyOutput(),
    stderr: CapturedOutput = emptyOutput(),
    exitCode: number | null = null,
  ): CompileResult {
    return this.result(
      request,
      startedAt,
      "TOOL_ERROR",
      toolVersion,
      exitCode,
      [stableIssue(message)],
      stdout,
      stderr,
    );
  }

  public async compile(
    rawRequest: CompileRequest,
    workspace: CompileWorkspace,
  ): Promise<CompileResult> {
    const request = CompileRequestSchema.parse(rawRequest);
    const startedAt = performance.now();
    if (
      request.compilerProfileId !== FIXED_ICARUS_PROFILE_ID ||
      request.runId !== workspace.runId ||
      !path.isAbsolute(workspace.runDirectory) ||
      !path.isAbsolute(workspace.workspaceDirectory) ||
      path.normalize(workspace.workspaceDirectory) !==
        path.join(path.normalize(workspace.runDirectory), "workspace") ||
      path.basename(path.normalize(workspace.runDirectory)) !== request.runId
    ) {
      return this.toolError(request, startedAt, null, "COMPILE_REQUEST_BINDING_INVALID");
    }

    let capability: IcarusCapability;
    try {
      capability = await this.probeAt(workspace.runDirectory);
    } catch (error) {
      if (error instanceof IcarusProbeError) {
        return this.toolError(
          request,
          startedAt,
          error.toolVersion,
          error.message,
          error.stdout,
          error.stderr,
        );
      }
      return this.toolError(request, startedAt, null, "IVERILOG_PROBE_FAILED");
    }

    let firstBefore: FileManifest;
    let secondBefore: FileManifest;
    try {
      firstBefore = await this.manifestFactory(workspace.runDirectory);
      secondBefore = await this.manifestFactory(workspace.runDirectory);
    } catch {
      return this.toolError(
        request,
        startedAt,
        capability.toolVersion,
        "WORKSPACE_MANIFEST_SCAN_FAILED",
      );
    }
    if (
      firstBefore.manifestDigest !== secondBefore.manifestDigest ||
      secondBefore.manifestDigest !== request.workspaceManifestDigest
    ) {
      return this.toolError(
        request,
        startedAt,
        capability.toolVersion,
        "WORKSPACE_MANIFEST_MISMATCH",
      );
    }

    let sources;
    try {
      sources = await this.sourceDiscoverer(workspace.workspaceDirectory);
    } catch (error) {
      const message =
        error instanceof SourcePreparationError
          ? error.status
          : "SOURCE_FILESYSTEM_REVALIDATION_FAILED";
      return this.toolError(request, startedAt, capability.toolVersion, message);
    }
    if (
      sources.length !== request.sourceFiles.length ||
      sources.some((source, index) => source.logicalPath !== request.sourceFiles[index])
    ) {
      return this.toolError(request, startedAt, capability.toolVersion, "SOURCE_LIST_MISMATCH");
    }

    const replacements: Record<string, string> = {};
    for (const source of sources) {
      replacements[source.hostPath] = source.logicalPath;
      replacements[source.hostPath.replaceAll("\\", "/")] = source.logicalPath;
    }
    let processResult: CompilerProcessResult;
    try {
      processResult = await this.processRunner({
        executable: this.executable,
        arguments: buildFixedIcarusArguments(
          request.topModule,
          sources.map((source) => source.hostPath),
        ),
        cwd: workspace.runDirectory,
        environment: this.environment,
        timeoutMs: FIXED_ICARUS_PROFILE.timeoutMs,
        terminationGraceMs: FIXED_ICARUS_PROFILE.terminationGraceMs,
        retainedOutputBytes: FIXED_ICARUS_PROFILE.captureRetainedBytes,
        stdoutLimitBytes: FIXED_ICARUS_PROFILE.stdoutLimitBytes,
        stderrLimitBytes: FIXED_ICARUS_PROFILE.stderrLimitBytes,
        logicalPathReplacements: replacements,
      });
    } catch {
      return this.toolError(
        request,
        startedAt,
        capability.toolVersion,
        "IVERILOG_ADAPTER_INTERNAL_FAILURE",
      );
    }
    if (processResult.spawnError !== undefined) {
      return this.toolError(
        request,
        startedAt,
        capability.toolVersion,
        "IVERILOG_COMPILE_SPAWN_FAILED",
        processResult.stdout,
        processResult.stderr,
      );
    }
    if (processResult.terminationFailed || !processResult.closeConfirmed) {
      return this.toolError(
        request,
        startedAt,
        capability.toolVersion,
        "IVERILOG_TERMINATION_UNCONFIRMED",
        processResult.stdout,
        processResult.stderr,
      );
    }

    let firstAfter: FileManifest;
    let secondAfter: FileManifest;
    try {
      firstAfter = await this.manifestFactory(workspace.runDirectory);
      secondAfter = await this.manifestFactory(workspace.runDirectory);
    } catch {
      return this.toolError(
        request,
        startedAt,
        capability.toolVersion,
        "WORKSPACE_MANIFEST_SCAN_FAILED",
        processResult.stdout,
        processResult.stderr,
      );
    }
    if (
      firstAfter.manifestDigest !== secondAfter.manifestDigest ||
      firstAfter.manifestDigest !== secondBefore.manifestDigest
    ) {
      return this.toolError(
        request,
        startedAt,
        capability.toolVersion,
        "WORKSPACE_CHANGED_DURING_COMPILE",
        processResult.stdout,
        processResult.stderr,
      );
    }

    const diagnostics = parseCompilerDiagnostics(
      processResult.stderr.preview,
      processResult.stdout.preview,
      workspace.workspaceDirectory,
      sources,
      FIXED_ICARUS_PROFILE.maximumIssues,
      FIXED_ICARUS_PROFILE.issueMessageLimitBytes,
    );
    if (processResult.timedOut) {
      return this.result(
        request,
        startedAt,
        "TIMEOUT",
        capability.toolVersion,
        null,
        diagnostics.issues,
        processResult.stdout,
        processResult.stderr,
      );
    }
    if (processResult.signal !== null) {
      return this.toolError(
        request,
        startedAt,
        capability.toolVersion,
        "IVERILOG_SIGNAL_TERMINATION",
        processResult.stdout,
        processResult.stderr,
      );
    }
    if (processResult.exitCode === 0) {
      if (diagnostics.issues.some((issue) => issue.kind === "ERROR")) {
        return this.toolError(
          request,
          startedAt,
          capability.toolVersion,
          "IVERILOG_ZERO_EXIT_WITH_ERROR",
          processResult.stdout,
          processResult.stderr,
          0,
        );
      }
      return this.result(
        request,
        startedAt,
        "COMPILE_PASSED",
        capability.toolVersion,
        0,
        diagnostics.issues,
        processResult.stdout,
        processResult.stderr,
      );
    }
    if (
      processResult.exitCode !== null &&
      diagnostics.hasDesignError &&
      !diagnostics.hasInternalError &&
      diagnostics.issues.some((issue) => issue.kind === "ERROR")
    ) {
      return this.result(
        request,
        startedAt,
        "COMPILE_ERROR",
        capability.toolVersion,
        processResult.exitCode,
        diagnostics.issues,
        processResult.stdout,
        processResult.stderr,
      );
    }
    return this.toolError(
      request,
      startedAt,
      capability.toolVersion,
      "IVERILOG_UNCLASSIFIED_FAILURE",
      processResult.stdout,
      processResult.stderr,
      processResult.exitCode,
    );
  }
}
