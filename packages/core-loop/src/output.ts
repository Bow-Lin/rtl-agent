import { LogicalPathSchema } from "@rtl-agent/contracts";

import { CapturedOutputSchema } from "./contracts.js";
import type { CapturedOutput } from "./contracts.js";
import { redactHostAbsolutePaths } from "./sanitization.js";

// Intentional sanitizers for terminal control sequences and unsafe control bytes.
// eslint-disable-next-line no-control-regex
const ANSI_ESCAPE = /\u001b(?:\[[0-?]*[ -/]*[@-~]|\][^\u0007]*(?:\u0007|\u001b\\))/g;
// eslint-disable-next-line no-control-regex
const UNSAFE_CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001a\u001c-\u001f\u007f]/g;

function truncateUtf8(value: string, limitBytes: number): string {
  const encoded = Buffer.from(value, "utf8");
  if (encoded.byteLength <= limitBytes) return value;
  const decoder = new TextDecoder("utf-8", { fatal: true });
  for (let length = limitBytes; length >= Math.max(0, limitBytes - 3); length -= 1) {
    try {
      return decoder.decode(encoded.subarray(0, length));
    } catch {
      // A UTF-8 scalar spans at most four bytes, so at most three retries are required.
    }
  }
  return "";
}

export interface CaptureOutputOptions {
  readonly limitBytes: number;
  readonly artifactPath?: string;
  readonly redactHostPaths?: readonly string[];
  readonly logicalPathReplacements?: Readonly<Record<string, string>>;
  readonly originalByteLength?: number;
  readonly inputTruncated?: boolean;
}

export function captureOutput(text: string, options: CaptureOutputOptions): CapturedOutput {
  if (!Number.isSafeInteger(options.limitBytes) || options.limitBytes < 1) {
    throw new TypeError("limitBytes must be a positive safe integer");
  }
  const rawByteLength = options.originalByteLength ?? Buffer.byteLength(text, "utf8");
  if (!Number.isSafeInteger(rawByteLength) || rawByteLength < 0) {
    throw new TypeError("originalByteLength must be a non-negative safe integer");
  }
  let sanitized = text.replace(ANSI_ESCAPE, "").replace(UNSAFE_CONTROL, "�");
  const replacements = Object.entries(options.logicalPathReplacements ?? {}).sort(
    ([left], [right]) => right.length - left.length,
  );
  for (const [hostPath, logicalPath] of replacements) {
    if (hostPath.length > 0) sanitized = sanitized.split(hostPath).join(logicalPath);
  }
  const redactions = [...(options.redactHostPaths ?? [])]
    .filter((candidate) => candidate.length > 0)
    .sort((left, right) => right.length - left.length);
  for (const hostPath of redactions) {
    sanitized = sanitized.split(hostPath).join("<host-path>");
  }
  sanitized = redactHostAbsolutePaths(sanitized);

  const sanitizedByteLength = Buffer.byteLength(sanitized, "utf8");
  const preview = truncateUtf8(sanitized, options.limitBytes);
  return CapturedOutputSchema.parse({
    preview,
    truncated: (options.inputTruncated ?? false) || sanitizedByteLength > options.limitBytes,
    originalByteLength: rawByteLength,
    ...(options.artifactPath === undefined
      ? {}
      : { artifactPath: LogicalPathSchema.parse(options.artifactPath) }),
  });
}
