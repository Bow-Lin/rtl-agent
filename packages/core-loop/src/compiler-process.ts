import { spawn } from "node:child_process";
import type { ChildProcessByStdio } from "node:child_process";
import type { Readable } from "node:stream";
import { StringDecoder } from "node:string_decoder";

import { captureOutput } from "./output.js";
import type { CapturedOutput } from "./contracts.js";

const TERMINATION_COMMAND_TIMEOUT_MS = 2_000;
const CLOSE_CONFIRMATION_TIMEOUT_MS = 2_000;
type CompilerChild = ChildProcessByStdio<null, Readable, Readable>;

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function withDeadline<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

class CompilerOutputCollector {
  private readonly decoder = new StringDecoder("utf8");
  private readonly parts: string[] = [];
  private retainedBytes = 0;
  private decoderEnded = false;
  public originalByteLength = 0;

  public constructor(private readonly retainedLimitBytes: number) {}

  public append(chunk: Buffer): void {
    this.originalByteLength += chunk.byteLength;
    const remaining = this.retainedLimitBytes - this.retainedBytes;
    if (remaining <= 0) return;
    const retained = chunk.subarray(0, remaining);
    this.retainedBytes += retained.byteLength;
    this.parts.push(this.decoder.write(retained));
  }

  public capture(
    limitBytes: number,
    logicalPathReplacements: Readonly<Record<string, string>>,
  ): CapturedOutput {
    if (!this.decoderEnded) {
      this.parts.push(this.decoder.end());
      this.decoderEnded = true;
    }
    const normalized = this.parts.join("").replace(/\r\n?/g, "\n");
    return captureOutput(normalized, {
      limitBytes,
      logicalPathReplacements,
      originalByteLength: this.originalByteLength,
      inputTruncated: this.originalByteLength > this.retainedBytes,
    });
  }
}

async function runTaskkill(processId: number, force: boolean): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      "taskkill.exe",
      ["/PID", String(processId), "/T", ...(force ? ["/F"] : [])],
      {
        shell: false,
        windowsHide: true,
        stdio: "ignore",
      },
    );
    let settled = false;
    const finish = (error?: Error): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error === undefined) resolve();
      else reject(error);
    };
    const timer = setTimeout(() => {
      child.kill();
      finish(new Error("Process-tree termination command exceeded its deadline"));
    }, TERMINATION_COMMAND_TIMEOUT_MS);
    child.once("error", () => finish(new Error("Process-tree termination command failed")));
    child.once("close", (code) => {
      if (code === 0) finish();
      else finish(new Error("Process-tree termination was not confirmed"));
    });
  });
}

async function terminateCompiler(child: CompilerChild, graceMs: number): Promise<void> {
  if (child.pid === undefined) throw new Error("Compiler process ID is unavailable");
  if (process.platform === "win32") {
    let gracefulSucceeded = false;
    try {
      await runTaskkill(child.pid, false);
      gracefulSucceeded = true;
    } catch {
      // Windows console processes commonly require forced tree termination.
    }
    await delay(graceMs);
    if (gracefulSucceeded && (child.exitCode !== null || child.signalCode !== null)) {
      return;
    }
    await runTaskkill(child.pid, true);
    return;
  }
  child.kill("SIGTERM");
  await delay(graceMs);
  if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
}

function releaseUnconfirmedProcess(child: CompilerChild): void {
  child.stdout.destroy();
  child.stderr.destroy();
  child.unref();
}

export interface CompilerProcessOptions {
  readonly executable: string;
  readonly arguments: readonly string[];
  readonly cwd: string;
  readonly environment: NodeJS.ProcessEnv;
  readonly timeoutMs: number;
  readonly terminationGraceMs: number;
  readonly retainedOutputBytes: number;
  readonly stdoutLimitBytes: number;
  readonly stderrLimitBytes: number;
  readonly logicalPathReplacements?: Readonly<Record<string, string>>;
}

export interface CompilerProcessResult {
  readonly exitCode: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly timedOut: boolean;
  readonly terminationFailed: boolean;
  readonly closeConfirmed: boolean;
  readonly durationMs: number;
  readonly stdout: CapturedOutput;
  readonly stderr: CapturedOutput;
  readonly spawnError?: string;
}

export async function executeCompilerProcess(
  options: CompilerProcessOptions,
): Promise<CompilerProcessResult> {
  const startedAt = performance.now();
  const stdout = new CompilerOutputCollector(options.retainedOutputBytes);
  const stderr = new CompilerOutputCollector(options.retainedOutputBytes);
  let child: CompilerChild;
  try {
    child = spawn(options.executable, options.arguments, {
      cwd: options.cwd,
      env: options.environment,
      shell: false,
      windowsHide: true,
      detached: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    return {
      exitCode: null,
      signal: null,
      timedOut: false,
      terminationFailed: false,
      closeConfirmed: true,
      durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
      stdout: stdout.capture(options.stdoutLimitBytes, {}),
      stderr: stderr.capture(options.stderrLimitBytes, {}),
      spawnError: "Compiler process could not be started",
    };
  }
  child.stdout.on("data", (chunk: Buffer) => stdout.append(chunk));
  child.stderr.on("data", (chunk: Buffer) => stderr.append(chunk));
  let spawnError: string | undefined;
  const closed = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => {
    child.once("error", () => {
      spawnError = "Compiler process could not be started";
    });
    child.once("close", (code, signal) => resolve({ code, signal }));
  });

  let outcome: { code: number | null; signal: NodeJS.Signals | null } | undefined;
  let timedOut = false;
  let terminationFailed = false;
  let closeConfirmed = true;
  try {
    outcome = await withDeadline(closed, options.timeoutMs, "Compiler process timed out");
  } catch {
    timedOut = true;
    try {
      await withDeadline(
        terminateCompiler(child, options.terminationGraceMs),
        options.terminationGraceMs + TERMINATION_COMMAND_TIMEOUT_MS * 2,
        "Compiler process-tree termination exceeded its deadline",
      );
    } catch {
      terminationFailed = true;
    }
    try {
      outcome = await withDeadline(
        closed,
        CLOSE_CONFIRMATION_TIMEOUT_MS,
        "Compiler close was not confirmed",
      );
    } catch {
      terminationFailed = true;
      closeConfirmed = false;
      releaseUnconfirmedProcess(child);
    }
  }

  const replacements = options.logicalPathReplacements ?? {};
  return {
    exitCode: outcome?.code ?? null,
    signal: outcome?.signal ?? null,
    timedOut,
    terminationFailed,
    closeConfirmed,
    durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
    stdout: stdout.capture(options.stdoutLimitBytes, replacements),
    stderr: stderr.capture(options.stderrLimitBytes, replacements),
    ...(spawnError === undefined ? {} : { spawnError }),
  };
}
