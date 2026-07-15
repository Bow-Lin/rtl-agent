import { describe, expect, it } from "vitest";

import { ErrorEnvelopeSchema } from "../src/index.js";
import type { ErrorBody } from "../src/index.js";
import { CORRELATION_ID, TASK_ID } from "./fixtures.js";

describe("stable error envelope", () => {
  it("keeps code-specific details required in the inferred TypeScript type", () => {
    type StateVersionConflict = Extract<ErrorBody, { code: "STATE_VERSION_CONFLICT" }>;
    const readExpectedVersion = (error: StateVersionConflict) => error.details.expected;
    expect(readExpectedVersion).toBeTypeOf("function");
  });

  it("accepts allowlisted details for a code", () => {
    expect(
      ErrorEnvelopeSchema.safeParse({
        schemaVersion: 1,
        ok: false,
        error: {
          code: "STATE_VERSION_CONFLICT",
          message: "Refresh task state before retrying",
          retryable: true,
          correlationId: CORRELATION_ID,
          details: { expected: 4, actual: 5 },
        },
      }).success,
    ).toBe(true);
  });

  it("rejects mismatched retryability and non-allowlisted details", () => {
    const base = {
      schemaVersion: 1,
      ok: false,
      error: {
        code: "STATE_VERSION_CONFLICT",
        message: "Conflict",
        retryable: false,
        correlationId: CORRELATION_ID,
        details: { expected: 4, actual: 5 },
      },
    };
    expect(ErrorEnvelopeSchema.safeParse(base).success).toBe(false);
    expect(
      ErrorEnvelopeSchema.safeParse({
        ...base,
        error: {
          ...base.error,
          retryable: true,
          details: { expected: 4, actual: 5, stack: "secret" },
        },
      }).success,
    ).toBe(false);
  });

  it("does not permit details on INTERNAL_ERROR", () => {
    expect(
      ErrorEnvelopeSchema.safeParse({
        schemaVersion: 1,
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An internal error occurred",
          retryable: false,
          correlationId: CORRELATION_ID,
          details: { stack: "must not escape" },
        },
      }).success,
    ).toBe(false);
    expect(
      ErrorEnvelopeSchema.safeParse({
        schemaVersion: 1,
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Database D:\\secret failed",
          retryable: false,
          correlationId: CORRELATION_ID,
        },
      }).success,
    ).toBe(false);
  });

  it("rejects unknown error codes", () => {
    expect(
      ErrorEnvelopeSchema.safeParse({
        schemaVersion: 1,
        ok: false,
        error: {
          code: "ZOD_ERROR",
          message: "Library-specific errors are not protocol errors",
          retryable: false,
          correlationId: CORRELATION_ID,
        },
      }).success,
    ).toBe(false);
  });

  it("rejects invalid Unicode and oversized free strings", () => {
    const base = {
      schemaVersion: 1,
      ok: false,
      error: {
        code: "TASK_NOT_FOUND",
        retryable: false,
        correlationId: CORRELATION_ID,
        details: { taskId: TASK_ID },
      },
    };
    expect(
      ErrorEnvelopeSchema.safeParse({ ...base, error: { ...base.error, message: "\ud800" } })
        .success,
    ).toBe(false);
    expect(
      ErrorEnvelopeSchema.safeParse({
        ...base,
        error: { ...base.error, message: "x".repeat(1025) },
      }).success,
    ).toBe(false);
  });
});
