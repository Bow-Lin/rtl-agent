import { describe, expect, it } from "vitest";

import {
  CommandIdSchema,
  IdempotencyKeySchema,
  IsoTimestampSchema,
  Sha256DigestSchema,
  StateVersionSchema,
  TaskIdSchema,
} from "../src/index.js";
import { COMMAND_ID, DIGEST, TASK_ID, TIMESTAMP } from "./fixtures.js";

describe("identifier contracts", () => {
  it("accepts canonical identifiers and values", () => {
    expect(TaskIdSchema.parse(TASK_ID)).toBe(TASK_ID);
    expect(CommandIdSchema.parse(COMMAND_ID)).toBe(COMMAND_ID);
    expect(IdempotencyKeySchema.parse("request:agent-1.retry_2")).toBe("request:agent-1.retry_2");
    expect(StateVersionSchema.parse(0)).toBe(0);
    expect(Sha256DigestSchema.parse(DIGEST)).toBe(DIGEST);
  });

  it.each([
    "cmd_123e4567-e89b-42d3-a456-426614174000",
    "task_123E4567-E89B-42D3-A456-426614174000",
    "task_123e4567-e89b-12d3-a456-426614174000",
    " task_123e4567-e89b-42d3-a456-426614174000",
  ])("rejects a non-canonical task ID: %s", (value) => {
    expect(TaskIdSchema.safeParse(value).success).toBe(false);
  });

  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    "rejects an invalid state version: %s",
    (value) => {
      expect(StateVersionSchema.safeParse(value).success).toBe(false);
    },
  );

  it("uses one canonical UTC millisecond timestamp format", () => {
    expect(IsoTimestampSchema.parse(TIMESTAMP)).toBe(TIMESTAMP);
    for (const value of [
      "2026-07-15T03:21:45Z",
      "2026-07-15T03:21:45.12Z",
      "2026-07-15T11:21:45.123+08:00",
      "2026-07-15t03:21:45.123z",
      "2026-02-30T03:21:45.123Z",
      "2016-12-31T23:59:60.000Z",
    ]) {
      expect(IsoTimestampSchema.safeParse(value).success, value).toBe(false);
    }
  });
});
