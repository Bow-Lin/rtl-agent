import { SchemaVersionSchema } from "@rtl-agent/contracts";
import { z } from "zod";

export const CoreLoopErrorCodeSchema = z.enum([
  "DATASET_NOT_CONFIGURED",
  "DATASET_CASE_NOT_FOUND",
  "DATASET_PROVENANCE_INVALID",
  "FIXTURE_INVALID",
  "FIXTURE_MATERIALIZATION_FAILED",
  "RUN_ALREADY_EXISTS",
  "PATH_POLICY_VIOLATION",
  "CASE_COLLISION",
  "INTERNAL_ERROR",
]);

const RETRYABLE_BY_CODE = {
  DATASET_NOT_CONFIGURED: false,
  DATASET_CASE_NOT_FOUND: false,
  DATASET_PROVENANCE_INVALID: false,
  FIXTURE_INVALID: false,
  FIXTURE_MATERIALIZATION_FAILED: false,
  RUN_ALREADY_EXISTS: false,
  PATH_POLICY_VIOLATION: false,
  CASE_COLLISION: false,
  INTERNAL_ERROR: false,
} as const;

export const CoreLoopErrorSchema = z
  .strictObject({
    schemaVersion: SchemaVersionSchema,
    code: CoreLoopErrorCodeSchema,
    message: z.string().min(1).max(1024),
    retryable: z.boolean(),
  })
  .superRefine((value, context) => {
    if (value.retryable !== RETRYABLE_BY_CODE[value.code]) {
      context.addIssue({
        code: "custom",
        path: ["retryable"],
        message: `retryable must be ${String(RETRYABLE_BY_CODE[value.code])} for ${value.code}`,
      });
    }
    if (value.code === "INTERNAL_ERROR" && value.message !== "An internal error occurred") {
      context.addIssue({
        code: "custom",
        path: ["message"],
        message: "INTERNAL_ERROR uses a fixed public message",
      });
    }
  });

export type CoreLoopErrorCode = z.infer<typeof CoreLoopErrorCodeSchema>;
export type CoreLoopError = z.infer<typeof CoreLoopErrorSchema>;

export class CoreLoopException extends Error {
  public readonly error: CoreLoopError;

  public constructor(code: CoreLoopErrorCode, message: string) {
    const publicMessage = code === "INTERNAL_ERROR" ? "An internal error occurred" : message;
    super(publicMessage);
    this.name = "CoreLoopException";
    this.error = CoreLoopErrorSchema.parse({
      schemaVersion: 1,
      code,
      message: publicMessage,
      retryable: RETRYABLE_BY_CODE[code],
    });
  }
}

export function requireFixtureProvider<T>(provider: T | undefined): T {
  if (provider === undefined) {
    throw new CoreLoopException(
      "DATASET_NOT_CONFIGURED",
      "No Core Loop fixture provider is configured",
    );
  }
  return provider;
}
