import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";

import { CapturedOutputSchema } from "./contracts.js";
import type { CapturedOutput } from "./contracts.js";
import { OpenCodeEventStreamSummarySchema, OpenCodeEventSummarySchema } from "./agent-contracts.js";
import type {
  OpenCodeEventCategory,
  OpenCodeEventStreamSummary,
  OpenCodeEventSummary,
} from "./agent-contracts.js";
import { captureOutput } from "./output.js";

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

const MINIMUM_TERMINATION_COMMAND_TIMEOUT_MS = 250;
const MAXIMUM_TERMINATION_COMMAND_TIMEOUT_MS = 5_000;
const TERMINATION_FAILURE_MESSAGE = "Process tree termination was not confirmed";

function terminationCommandTimeout(graceMilliseconds: number): number {
  return Math.min(
    Math.max(graceMilliseconds, MINIMUM_TERMINATION_COMMAND_TIMEOUT_MS),
    MAXIMUM_TERMINATION_COMMAND_TIMEOUT_MS,
  );
}

async function withDeadline<T>(
  operation: Promise<T>,
  timeoutMilliseconds: number,
  message: string,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMilliseconds);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

class ByteCollector {
  private readonly chunks: Buffer[] = [];
  private retainedBytes = 0;
  public totalBytes = 0;

  public constructor(private readonly maximumRetainedBytes: number) {}

  public append(chunk: Buffer): void {
    this.totalBytes += chunk.byteLength;
    const remaining = this.maximumRetainedBytes - this.retainedBytes;
    if (remaining <= 0) return;
    const retained = chunk.subarray(0, remaining);
    this.chunks.push(retained);
    this.retainedBytes += retained.byteLength;
  }

  public text(): string {
    return Buffer.concat(this.chunks).toString("utf8");
  }

  public capturedOutput(limitBytes: number): CapturedOutput {
    const captured = captureOutput(this.text(), { limitBytes });
    if (this.totalBytes <= this.retainedBytes) return captured;
    const previewBytes = Buffer.byteLength(captured.preview, "utf8");
    return CapturedOutputSchema.parse({
      ...captured,
      truncated: true,
      originalByteLength: Math.max(this.totalBytes, previewBytes + 1),
    });
  }
}

function safeToken(value: unknown): string | undefined {
  return typeof value === "string" && /^[A-Za-z0-9._+-]{1,64}$/.test(value) ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function projectEvent(
  rawLine: string,
  sequence: number,
  byteLength: number,
  truncated: boolean,
): OpenCodeEventSummary {
  let record: Record<string, unknown> | undefined;
  try {
    record = asRecord(JSON.parse(rawLine) as unknown);
  } catch {
    record = undefined;
  }
  const nested = asRecord(record?.event) ?? asRecord(record?.part);
  const outerType = safeToken(record?.type) ?? "";
  const nestedType = safeToken(nested?.type) ?? "";
  const normalizedType = `${outerType} ${nestedType}`.toLowerCase();
  const nestedState = asRecord(nested?.state);
  const status =
    safeToken(record?.status) ?? safeToken(nested?.status) ?? safeToken(nestedState?.status);
  let category: OpenCodeEventCategory = "UNKNOWN";
  if (normalizedType.includes("session")) category = "SESSION";
  else if (
    normalizedType.includes("tool") &&
    (normalizedType.includes("result") || status === "completed" || status === "error")
  ) {
    category = "TOOL_RESULT";
  } else if (normalizedType.includes("tool")) category = "TOOL_CALL";
  else if (normalizedType.includes("error")) category = "ERROR";
  else if (normalizedType.includes("message") || normalizedType.includes("text")) {
    category = "MESSAGE";
  }
  const toolName =
    safeToken(record?.tool) ?? safeToken(record?.toolName) ?? safeToken(nested?.tool);
  return OpenCodeEventSummarySchema.parse({
    sequence,
    category,
    ...(toolName === undefined ? {} : { toolName }),
    ...(status === undefined ? {} : { status }),
    byteLength,
    truncated,
  });
}

class JsonEventCollector {
  private readonly events: OpenCodeEventSummary[] = [];
  private readonly lineParts: Buffer[] = [];
  private lineBytes = 0;
  private retainedLineBytes = 0;
  private streamTruncated = false;
  private totalBytes = 0;

  public constructor(
    private readonly maximumEvents: number,
    private readonly maximumEventLineBytes: number,
  ) {}

  private appendLinePart(part: Buffer): void {
    this.lineBytes += part.byteLength;
    const remaining = this.maximumEventLineBytes - this.retainedLineBytes;
    if (remaining > 0) {
      const retained = part.subarray(0, remaining);
      this.lineParts.push(retained);
      this.retainedLineBytes += retained.byteLength;
    }
    if (this.retainedLineBytes < this.lineBytes) this.streamTruncated = true;
  }

  private finishLine(): void {
    if (this.lineBytes === 0) return;
    if (this.events.length >= this.maximumEvents) {
      this.streamTruncated = true;
    } else {
      this.events.push(
        projectEvent(
          Buffer.concat(this.lineParts).toString("utf8"),
          this.events.length,
          this.lineBytes,
          this.retainedLineBytes < this.lineBytes,
        ),
      );
    }
    this.lineParts.length = 0;
    this.lineBytes = 0;
    this.retainedLineBytes = 0;
  }

  public append(chunk: Buffer): void {
    this.totalBytes += chunk.byteLength;
    let start = 0;
    for (let index = 0; index < chunk.byteLength; index += 1) {
      if (chunk[index] !== 0x0a) continue;
      this.appendLinePart(chunk.subarray(start, index));
      this.finishLine();
      start = index + 1;
    }
    this.appendLinePart(chunk.subarray(start));
  }

  public finish(): OpenCodeEventStreamSummary {
    this.finishLine();
    return OpenCodeEventStreamSummarySchema.parse({
      originalByteLength: this.totalBytes,
      truncated: this.streamTruncated,
      events: this.events,
    });
  }
}

async function runTaskkill(
  processId: number,
  force: boolean,
  timeoutMilliseconds: number,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const arguments_ = ["/PID", String(processId), "/T", ...(force ? ["/F"] : [])];
    const killer = spawn("taskkill.exe", arguments_, {
      shell: false,
      windowsHide: true,
      stdio: "ignore",
    });
    let settled = false;
    const finish = (error?: Error): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error === undefined) resolve();
      else reject(error);
    };
    const timer = setTimeout(() => {
      killer.kill();
      finish(new Error("taskkill did not finish before its deadline"));
    }, timeoutMilliseconds);
    killer.once("error", () => finish(new Error("taskkill could not be started")));
    killer.once("close", (code) => {
      if (code === 0) finish();
      else finish(new Error("taskkill did not confirm process-tree termination"));
    });
  });
}

async function signalProcessTree(
  processId: number,
  signal: NodeJS.Signals,
  commandTimeoutMilliseconds: number,
): Promise<void> {
  if (process.platform === "win32") {
    await runTaskkill(processId, signal === "SIGKILL", commandTimeoutMilliseconds);
    return;
  }
  try {
    process.kill(-processId, signal);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
  }
}

async function terminateProcessTree(
  processId: number,
  graceMilliseconds: number,
  childHasClosed: () => boolean,
): Promise<void> {
  const commandTimeoutMilliseconds = terminationCommandTimeout(graceMilliseconds);
  let gracefulSignalSucceeded = true;
  try {
    await signalProcessTree(processId, "SIGTERM", commandTimeoutMilliseconds);
  } catch {
    gracefulSignalSucceeded = false;
  }
  await delay(graceMilliseconds);
  if (process.platform === "win32" && gracefulSignalSucceeded && childHasClosed()) return;
  try {
    await signalProcessTree(processId, "SIGKILL", commandTimeoutMilliseconds);
  } catch (error) {
    if (process.platform === "win32" && gracefulSignalSucceeded && childHasClosed()) return;
    throw error;
  }
}

export interface SpawnResult {
  readonly exitCode: number | null;
  readonly timedOut: boolean;
  readonly terminationFailed: boolean;
  readonly durationMs: number;
  readonly spawnError?: string;
}

type ProcessTreeTerminator = (
  processId: number,
  graceMilliseconds: number,
  childHasClosed: () => boolean,
) => Promise<void>;

function releaseUnconfirmedChild(child: ChildProcess): void {
  child.stdout?.destroy();
  child.stderr?.destroy();
  child.unref();
}

export async function waitForProcess(
  child: ChildProcess,
  timeoutMs: number,
  terminationGraceMs: number,
  terminateTree: ProcessTreeTerminator = terminateProcessTree,
): Promise<SpawnResult> {
  const startedAt = performance.now();
  let spawnError: string | undefined;
  let childHasClosed = false;
  const closed = new Promise<number | null>((resolve) => {
    child.once("error", (error) => {
      spawnError = error.message;
    });
    child.once("close", (code) => {
      childHasClosed = true;
      resolve(code);
    });
  });
  try {
    const exitCode = await withDeadline(closed, timeoutMs, "OpenCode process timed out");
    return {
      exitCode,
      timedOut: false,
      terminationFailed: false,
      durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
      ...(spawnError === undefined ? {} : { spawnError }),
    };
  } catch {
    // The timeout path below owns bounded tree termination and close confirmation.
  }

  const commandTimeoutMilliseconds = terminationCommandTimeout(terminationGraceMs);
  const terminationDeadlineMilliseconds =
    terminationGraceMs + commandTimeoutMilliseconds * 2 + MINIMUM_TERMINATION_COMMAND_TIMEOUT_MS;
  let terminationFailed = child.pid === undefined;
  if (child.pid !== undefined) {
    try {
      await withDeadline(
        terminateTree(child.pid, terminationGraceMs, () => childHasClosed),
        terminationDeadlineMilliseconds,
        TERMINATION_FAILURE_MESSAGE,
      );
    } catch {
      terminationFailed = true;
    }
  }

  let exitCode: number | null = null;
  try {
    exitCode = await withDeadline(closed, commandTimeoutMilliseconds, TERMINATION_FAILURE_MESSAGE);
  } catch {
    terminationFailed = true;
    releaseUnconfirmedChild(child);
  }
  return {
    exitCode,
    timedOut: true,
    terminationFailed,
    durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
    ...(spawnError === undefined ? {} : { spawnError }),
  };
}

export interface OpenCodeProcessOptions {
  readonly executable: string;
  readonly arguments: readonly string[];
  readonly cwd: string;
  readonly environment: NodeJS.ProcessEnv;
  readonly timeoutMs: number;
  readonly terminationGraceMs: number;
  readonly stderrLimitBytes: number;
  readonly maximumEvents: number;
  readonly maximumEventLineBytes: number;
}

export interface OpenCodeProcessResult extends SpawnResult {
  readonly eventStream: OpenCodeEventStreamSummary;
  readonly stderr: CapturedOutput;
}

export async function executeOpenCodeProcess(
  options: OpenCodeProcessOptions,
): Promise<OpenCodeProcessResult> {
  const eventCollector = new JsonEventCollector(
    options.maximumEvents,
    options.maximumEventLineBytes,
  );
  const stderrCollector = new ByteCollector(Math.max(options.stderrLimitBytes + 4096, 65_536));
  const child = spawn(options.executable, options.arguments, {
    cwd: options.cwd,
    env: options.environment,
    shell: false,
    windowsHide: true,
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk: Buffer) => eventCollector.append(chunk));
  child.stderr.on("data", (chunk: Buffer) => stderrCollector.append(chunk));
  const result = await waitForProcess(child, options.timeoutMs, options.terminationGraceMs);
  if (result.spawnError !== undefined) {
    stderrCollector.append(Buffer.from(`\n${result.spawnError}`, "utf8"));
  }
  if (result.terminationFailed) {
    stderrCollector.append(Buffer.from(`\n${TERMINATION_FAILURE_MESSAGE}`, "utf8"));
  }
  return {
    ...result,
    eventStream: eventCollector.finish(),
    stderr: stderrCollector.capturedOutput(options.stderrLimitBytes),
  };
}

export interface ProbeCommandResult extends SpawnResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly stdoutTruncated: boolean;
  readonly stderrTruncated: boolean;
}

export async function executeProbeCommand(
  options: Omit<
    OpenCodeProcessOptions,
    "stderrLimitBytes" | "maximumEvents" | "maximumEventLineBytes"
  > & {
    readonly maximumOutputBytes?: number;
  },
): Promise<ProbeCommandResult> {
  const maximum = options.maximumOutputBytes ?? 1_048_576;
  const stdout = new ByteCollector(maximum);
  const stderr = new ByteCollector(maximum);
  const child = spawn(options.executable, options.arguments, {
    cwd: options.cwd,
    env: options.environment,
    shell: false,
    windowsHide: true,
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk: Buffer) => stdout.append(chunk));
  child.stderr.on("data", (chunk: Buffer) => stderr.append(chunk));
  const result = await waitForProcess(child, options.timeoutMs, options.terminationGraceMs);
  return {
    ...result,
    stdout: stdout.text(),
    stderr: stderr.text(),
    stdoutTruncated: stdout.totalBytes > Buffer.byteLength(stdout.text(), "utf8"),
    stderrTruncated: stderr.totalBytes > Buffer.byteLength(stderr.text(), "utf8"),
  };
}
