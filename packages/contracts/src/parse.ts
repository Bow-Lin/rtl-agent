import type { z } from "zod";

import { CommandEnvelopeSchema } from "./command.js";
import type { ErrorCode, ValidationIssue, ValidationIssueKind } from "./error.js";
import { EventEnvelopeSchema } from "./event.js";
import { isPlainObject } from "./json.js";
import { CURRENT_SCHEMA_VERSION } from "./version.js";

type BoundaryParseErrorCode = Extract<
  ErrorCode,
  | "VALIDATION_ERROR"
  | "UNSUPPORTED_SCHEMA_VERSION"
  | "INVALID_IDENTIFIER"
  | "INVALID_LOGICAL_PATH"
  | "UNKNOWN_COMMAND"
  | "UNKNOWN_EVENT"
>;

export type ContractParseSuccess<T> = { readonly success: true; readonly data: T };
export type ContractParseFailure = {
  readonly success: false;
  readonly error: {
    readonly code: BoundaryParseErrorCode;
    readonly issues: readonly ValidationIssue[];
  };
};
export type ContractParseResult<T> = ContractParseSuccess<T> | ContractParseFailure;

const IDENTIFIER_FIELDS = new Set([
  "taskId",
  "commandId",
  "eventId",
  "reviewId",
  "workspaceId",
  "correlationId",
  "idempotencyKey",
]);

function stablePath(path: readonly PropertyKey[]): (string | number)[] {
  return path
    .slice(0, 32)
    .map((segment) => (typeof segment === "number" ? segment : String(segment).slice(0, 256)));
}

function hasValueAtPath(input: unknown, path: readonly PropertyKey[]): boolean {
  let current = input;
  for (const segment of path) {
    if (
      typeof current !== "object" ||
      current === null ||
      !Object.prototype.hasOwnProperty.call(current, segment)
    ) {
      return false;
    }
    current = (current as Record<PropertyKey, unknown>)[segment];
  }
  return current !== undefined;
}

function issueKind(issue: z.core.$ZodIssue, input: unknown): ValidationIssueKind {
  if (issue.path.length > 0 && !hasValueAtPath(input, issue.path)) return "REQUIRED";
  if (issue.code === "unrecognized_keys") return "UNKNOWN_FIELD";
  if (issue.code === "invalid_type") {
    return "INVALID_TYPE";
  }
  if (issue.code === "invalid_format") return "INVALID_FORMAT";
  return "INVALID_VALUE";
}

function mapIssues(error: z.ZodError, input: unknown): ValidationIssue[] {
  return error.issues.slice(0, 50).map((issue) => ({
    path: stablePath(issue.path),
    kind: issueKind(issue, input),
  }));
}

function classifyIssues(issues: readonly ValidationIssue[]): BoundaryParseErrorCode {
  if (issues.some((issue) => issue.path.some((segment) => segment === "specPath"))) {
    return "INVALID_LOGICAL_PATH";
  }
  if (
    issues.some((issue) =>
      issue.path.some((segment) => typeof segment === "string" && IDENTIFIER_FIELDS.has(segment)),
    )
  ) {
    return "INVALID_IDENTIFIER";
  }
  return "VALIDATION_ERROR";
}

function oneIssue(
  code: BoundaryParseErrorCode,
  path: readonly (string | number)[],
  kind: ValidationIssueKind,
): ContractParseFailure {
  return { success: false, error: { code, issues: [{ path: [...path], kind }] } };
}

function hasUnsupportedVersion(input: Record<string, unknown>): boolean {
  return "schemaVersion" in input && input.schemaVersion !== CURRENT_SCHEMA_VERSION;
}

const COMMAND_TYPES = new Set(["START_WORKFLOW", "REQUEST_REVIEW", "RECORD_REVIEW_DECISION"]);
const EVENT_TYPES = new Set(["WORKFLOW_STARTED", "REVIEW_REQUESTED", "REVIEW_DECISION_RECORDED"]);

export function parseCommandEnvelope(
  input: unknown,
): ContractParseResult<z.infer<typeof CommandEnvelopeSchema>> {
  if (!isPlainObject(input)) {
    return oneIssue("VALIDATION_ERROR", [], "INVALID_TYPE");
  }
  if (hasUnsupportedVersion(input)) {
    return oneIssue("UNSUPPORTED_SCHEMA_VERSION", ["schemaVersion"], "INVALID_VALUE");
  }
  if (isPlainObject(input.command) && typeof input.command.type === "string") {
    if (!COMMAND_TYPES.has(input.command.type)) {
      return oneIssue("UNKNOWN_COMMAND", ["command", "type"], "INVALID_VALUE");
    }
  }

  const parsed = CommandEnvelopeSchema.safeParse(input);
  if (parsed.success) return { success: true, data: parsed.data };
  const issues = mapIssues(parsed.error, input);
  return { success: false, error: { code: classifyIssues(issues), issues } };
}

export function parseEventEnvelope(
  input: unknown,
): ContractParseResult<z.infer<typeof EventEnvelopeSchema>> {
  if (!isPlainObject(input)) {
    return oneIssue("VALIDATION_ERROR", [], "INVALID_TYPE");
  }
  if (hasUnsupportedVersion(input)) {
    return oneIssue("UNSUPPORTED_SCHEMA_VERSION", ["schemaVersion"], "INVALID_VALUE");
  }
  if (isPlainObject(input.event) && typeof input.event.type === "string") {
    if (!EVENT_TYPES.has(input.event.type)) {
      return oneIssue("UNKNOWN_EVENT", ["event", "type"], "INVALID_VALUE");
    }
  }

  const parsed = EventEnvelopeSchema.safeParse(input);
  if (parsed.success) return { success: true, data: parsed.data };
  const issues = mapIssues(parsed.error, input);
  return { success: false, error: { code: classifyIssues(issues), issues } };
}
