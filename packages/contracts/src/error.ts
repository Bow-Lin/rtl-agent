import { z } from "zod";

import {
  CorrelationIdSchema,
  IdempotencyKeySchema,
  ReviewIdSchema,
  StateVersionSchema,
  TaskIdSchema,
} from "./identifiers.js";
import { hasUnpairedSurrogate } from "./json.js";
import { StageSchema, TaskStatusSchema } from "./task.js";
import { SchemaVersionSchema } from "./version.js";

export const ErrorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "UNSUPPORTED_SCHEMA_VERSION",
  "INVALID_IDENTIFIER",
  "INVALID_LOGICAL_PATH",
  "TASK_NOT_FOUND",
  "TASK_ALREADY_EXISTS",
  "STATE_VERSION_CONFLICT",
  "INVALID_TRANSITION",
  "UNKNOWN_COMMAND",
  "UNKNOWN_EVENT",
  "IDEMPOTENCY_CONFLICT",
  "REVIEW_NOT_FOUND",
  "REVIEW_ALREADY_DECIDED",
  "REVIEW_BINDING_MISMATCH",
  "INTERNAL_ERROR",
]);

export const ValidationIssueKindSchema = z.enum([
  "REQUIRED",
  "INVALID_TYPE",
  "INVALID_FORMAT",
  "UNKNOWN_FIELD",
  "INVALID_VALUE",
]);

export const ValidationIssueSchema = z.strictObject({
  path: z
    .array(
      z.union([
        z
          .string()
          .max(256)
          .refine((value) => !hasUnpairedSurrogate(value), "Path must contain valid Unicode"),
        z.int().nonnegative(),
      ]),
    )
    .max(32),
  kind: ValidationIssueKindSchema,
});

function boundedUnicodeString(minimum: number, maximum: number) {
  return z
    .string()
    .min(minimum)
    .max(maximum)
    .refine((value) => !hasUnpairedSurrogate(value), "String must contain valid Unicode");
}

const message = boundedUnicodeString(1, 1024);
const commandOrEventType = boundedUnicodeString(1, 128);
const fieldName = boundedUnicodeString(1, 256);

function errorBody<
  const Code extends z.infer<typeof ErrorCodeSchema>,
  const Retryable extends boolean,
  const Details extends z.ZodType,
>(code: Code, retryable: Retryable, details: Details) {
  return z.strictObject({
    code: z.literal(code),
    message,
    retryable: z.literal(retryable),
    correlationId: CorrelationIdSchema,
    details,
  });
}

const ValidationErrorBodySchema = errorBody(
  "VALIDATION_ERROR",
  false,
  z.strictObject({ issues: z.array(ValidationIssueSchema).min(1).max(50) }),
);
const UnsupportedVersionBodySchema = errorBody(
  "UNSUPPORTED_SCHEMA_VERSION",
  false,
  z.strictObject({ supportedVersion: SchemaVersionSchema }),
);
const InvalidIdentifierBodySchema = errorBody(
  "INVALID_IDENTIFIER",
  false,
  z.strictObject({ field: fieldName }),
);
const InvalidLogicalPathBodySchema = errorBody(
  "INVALID_LOGICAL_PATH",
  false,
  z.strictObject({ field: fieldName }),
);
const TaskNotFoundBodySchema = errorBody(
  "TASK_NOT_FOUND",
  false,
  z.strictObject({ taskId: TaskIdSchema }),
);
const TaskAlreadyExistsBodySchema = errorBody(
  "TASK_ALREADY_EXISTS",
  false,
  z.strictObject({ taskId: TaskIdSchema }),
);
const StateVersionConflictBodySchema = errorBody(
  "STATE_VERSION_CONFLICT",
  true,
  z.strictObject({ expected: StateVersionSchema, actual: StateVersionSchema }),
);
const InvalidTransitionBodySchema = errorBody(
  "INVALID_TRANSITION",
  false,
  z.strictObject({
    stage: StageSchema,
    status: TaskStatusSchema,
    commandType: commandOrEventType,
  }),
);
const UnknownCommandBodySchema = errorBody(
  "UNKNOWN_COMMAND",
  false,
  z.strictObject({ commandType: commandOrEventType }),
);
const UnknownEventBodySchema = errorBody(
  "UNKNOWN_EVENT",
  false,
  z.strictObject({ eventType: commandOrEventType }),
);
const IdempotencyConflictBodySchema = errorBody(
  "IDEMPOTENCY_CONFLICT",
  false,
  z.strictObject({ idempotencyKey: IdempotencyKeySchema }),
);
const ReviewNotFoundBodySchema = errorBody(
  "REVIEW_NOT_FOUND",
  false,
  z.strictObject({ reviewId: ReviewIdSchema }),
);
const ReviewAlreadyDecidedBodySchema = errorBody(
  "REVIEW_ALREADY_DECIDED",
  false,
  z.strictObject({ reviewId: ReviewIdSchema }),
);
const ReviewBindingMismatchBodySchema = errorBody(
  "REVIEW_BINDING_MISMATCH",
  false,
  z.strictObject({ reviewId: ReviewIdSchema }),
);
const InternalErrorBodySchema = z.strictObject({
  code: z.literal("INTERNAL_ERROR"),
  message: z.literal("An internal error occurred"),
  retryable: z.literal(false),
  correlationId: CorrelationIdSchema,
});

export const ErrorBodySchema = z.discriminatedUnion("code", [
  ValidationErrorBodySchema,
  UnsupportedVersionBodySchema,
  InvalidIdentifierBodySchema,
  InvalidLogicalPathBodySchema,
  TaskNotFoundBodySchema,
  TaskAlreadyExistsBodySchema,
  StateVersionConflictBodySchema,
  InvalidTransitionBodySchema,
  UnknownCommandBodySchema,
  UnknownEventBodySchema,
  IdempotencyConflictBodySchema,
  ReviewNotFoundBodySchema,
  ReviewAlreadyDecidedBodySchema,
  ReviewBindingMismatchBodySchema,
  InternalErrorBodySchema,
]);

export const ErrorEnvelopeSchema = z.strictObject({
  schemaVersion: SchemaVersionSchema,
  ok: z.literal(false),
  error: ErrorBodySchema,
});

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;
export type ValidationIssueKind = z.infer<typeof ValidationIssueKindSchema>;
export type ValidationIssue = z.infer<typeof ValidationIssueSchema>;
export type ErrorBody = z.infer<typeof ErrorBodySchema>;
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;
