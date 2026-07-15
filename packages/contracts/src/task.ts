import { z } from "zod";

import {
  IsoTimestampSchema,
  ReviewIdSchema,
  StateVersionSchema,
  TaskIdSchema,
  WorkspaceIdSchema,
} from "./identifiers.js";
import { LogicalPathSchema } from "./paths.js";
import { SchemaVersionSchema } from "./version.js";

export const StageSchema = z.enum([
  "SPEC_FREEZE",
  "VERIFICATION_PLAN",
  "VERIFICATION_ENV",
  "VERIFICATION_REVIEW",
  "RTL_IMPLEMENTATION",
  "VERIFY_AND_REPAIR",
  "VERIFICATION_CHALLENGE",
  "REGRESSION_REVIEW",
]);

export const TaskStatusSchema = z.enum([
  "ACTIVE",
  "WAITING_REVIEW",
  "GATE_RUNNING",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
]);

export const TaskStateSchema = z.strictObject({
  schemaVersion: SchemaVersionSchema,
  taskId: TaskIdSchema,
  workspaceId: WorkspaceIdSchema,
  specPath: LogicalPathSchema,
  currentStage: StageSchema,
  status: TaskStatusSchema,
  stateVersion: StateVersionSchema,
  pendingReviewId: ReviewIdSchema.optional(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});

export type Stage = z.infer<typeof StageSchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type TaskState = z.infer<typeof TaskStateSchema>;
