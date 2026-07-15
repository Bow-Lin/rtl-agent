import { describe, expect, it } from "vitest";

import {
  ReviewDecisionSchema,
  ReviewStatusSchema,
  ReviewTypeSchema,
  StageSchema,
  TaskStateSchema,
  TaskStatusSchema,
} from "../src/index.js";
import { REVIEW_ID, TASK_ID, TIMESTAMP, WORKSPACE_ID } from "./fixtures.js";

describe("task and review contracts", () => {
  it("strict-parses task state without applying A03 transition semantics", () => {
    const state = {
      schemaVersion: 1,
      taskId: TASK_ID,
      workspaceId: WORKSPACE_ID,
      specPath: "spec/design.md",
      currentStage: "SPEC_FREEZE",
      status: "WAITING_REVIEW",
      stateVersion: 2,
      pendingReviewId: REVIEW_ID,
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    };
    expect(TaskStateSchema.parse(state)).toEqual(state);
    expect(TaskStateSchema.safeParse({ ...state, hostPath: "D:\\secret" }).success).toBe(false);
  });

  it.each([
    [StageSchema, "COMPLETE"],
    [TaskStatusSchema, "UNKNOWN"],
    [ReviewTypeSchema, "FREE_FORM_REVIEW"],
    [ReviewStatusSchema, "OPEN"],
    [ReviewDecisionSchema, "YES"],
  ] as const)("rejects unknown enum value %s", (schema, value) => {
    expect(schema.safeParse(value).success).toBe(false);
  });
});
