import path from "node:path";

import { CompileIssueSchema } from "./contracts.js";
import type { CompileIssue } from "./contracts.js";
import { captureOutput } from "./output.js";

const DESIGN_ERROR =
  /(?:\bsyntax error\b|\bunable to (?:bind|find the root module)\b|\bunknown module type\b|\binvalid module instantiation\b|\bpart select .* out of order\b)/i;
const EXPLICIT_ERROR = /\berror\s*:/i;
const INTERNAL_ERROR =
  /\b(?:internal error|assertion failed|segmentation fault|access violation|ivlpp:.*failed|ivl:.*failed|unable to load|core dumped)\b/i;

export interface DiagnosticSource {
  readonly logicalPath: string;
  readonly hostPath: string;
}

export interface ParsedCompilerDiagnostics {
  readonly issues: readonly CompileIssue[];
  readonly hasDesignError: boolean;
  readonly hasInternalError: boolean;
}

function truncateMessage(value: string, limitBytes: number): string {
  return captureOutput(value, { limitBytes }).preview || "Compiler diagnostic";
}

function diagnosticKind(line: string): CompileIssue["kind"] | undefined {
  if (/\bwarning\s*:/i.test(line)) return "WARNING";
  if (/\bnote\s*:/i.test(line)) return "NOTE";
  if (DESIGN_ERROR.test(line) || EXPLICIT_ERROR.test(line)) return "ERROR";
  return undefined;
}

function sourcePathFromPrefix(
  prefix: string | undefined,
  workspaceDirectory: string,
  sources: readonly DiagnosticSource[],
): string | undefined {
  if (prefix === undefined || prefix.length === 0) return undefined;
  const normalizedPrefix = prefix.replaceAll("/", path.sep);
  const absolute = path.isAbsolute(normalizedPrefix)
    ? path.normalize(normalizedPrefix)
    : path.resolve(workspaceDirectory, normalizedPrefix);
  const source = sources.find((candidate) =>
    process.platform === "win32"
      ? path.normalize(candidate.hostPath).toLowerCase() === absolute.toLowerCase()
      : path.normalize(candidate.hostPath) === absolute,
  );
  return source?.logicalPath;
}

function positiveLocation(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function parseCompilerDiagnostics(
  stderr: string,
  stdout: string,
  workspaceDirectory: string,
  sources: readonly DiagnosticSource[],
  maximumIssues: number,
  messageLimitBytes: number,
): ParsedCompilerDiagnostics {
  const replacements: Record<string, string> = {};
  for (const source of sources) {
    replacements[source.hostPath] = source.logicalPath;
    replacements[source.hostPath.replaceAll("\\", "/")] = source.logicalPath;
  }
  const issues: CompileIssue[] = [];
  let hasDesignError = false;
  let hasInternalError = false;
  for (const stream of [stderr, stdout]) {
    for (const rawLine of stream.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (line.length === 0) continue;
      if (INTERNAL_ERROR.test(line)) hasInternalError = true;
      const kind = diagnosticKind(line);
      if (kind === undefined) continue;
      if (kind === "ERROR" && DESIGN_ERROR.test(line)) hasDesignError = true;
      if (issues.length >= maximumIssues) continue;
      const location = /^(.*?\.(?:sv|v)):(\d+)(?::(\d+))?:\s*(.*)$/i.exec(line);
      const pathValue = sourcePathFromPrefix(location?.[1], workspaceDirectory, sources);
      const body = location?.[4] ?? location?.[3] ?? line;
      const sanitized = captureOutput(body, {
        limitBytes: messageLimitBytes,
        logicalPathReplacements: replacements,
      }).preview;
      const lineNumber = positiveLocation(location?.[2]);
      const columnNumber = positiveLocation(location?.[3]);
      issues.push(
        CompileIssueSchema.parse({
          kind,
          message: truncateMessage(sanitized, messageLimitBytes),
          ...(pathValue === undefined ? {} : { path: pathValue }),
          ...(lineNumber === undefined ? {} : { line: lineNumber }),
          ...(columnNumber === undefined ? {} : { column: columnNumber }),
        }),
      );
    }
  }
  return { issues, hasDesignError, hasInternalError };
}
