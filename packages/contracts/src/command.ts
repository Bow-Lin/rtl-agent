import { z } from "zod";

import { ActorSchema } from "./actor.js";
import {
  CommandIdSchema,
  CorrelationIdSchema,
  IdempotencyKeySchema,
  IsoTimestampSchema,
  ReviewIdSchema,
  StateVersionSchema,
  TaskIdSchema,
  WorkspaceIdSchema,
} from "./identifiers.js";
import { LogicalPathSchema } from "./paths.js";
import {
  RegressionApprovalReviewSchema,
  ReviewDecisionSchema,
  SpecApprovalReviewSchema,
  VerificationApprovalReviewSchema,
  VerificationChallengeReviewSchema,
} from "./review.js";
import { SchemaVersionSchema } from "./version.js";

export const StartWorkflowCommandSchema = z.strictObject({
  type: z.literal("START_WORKFLOW"),
  taskId: TaskIdSchema,
  workspaceId: WorkspaceIdSchema,
  specPath: LogicalPathSchema,
});

function addReviewIdentityChecks<T extends z.ZodType>(schema: T): T {
  return schema.superRefine((value, context) => {
    const candidate = value as {
      taskId: unknown;
      reviewId: unknown;
      binding: { taskId: unknown; reviewId: unknown };
    };
    if (candidate.taskId !== candidate.binding.taskId) {
      context.addIssue({
        code: "custom",
        path: ["binding", "taskId"],
        message: "Review binding taskId must match command taskId",
      });
    }
    if (candidate.reviewId !== candidate.binding.reviewId) {
      context.addIssue({
        code: "custom",
        path: ["binding", "reviewId"],
        message: "Review binding reviewId must match command reviewId",
      });
    }
  }) as T;
}

const RequestSpecApprovalCommandSchema = addReviewIdentityChecks(
  SpecApprovalReviewSchema.extend({
    type: z.literal("REQUEST_REVIEW"),
    taskId: TaskIdSchema,
    reviewId: ReviewIdSchema,
  }),
);
const RequestVerificationApprovalCommandSchema = addReviewIdentityChecks(
  VerificationApprovalReviewSchema.extend({
    type: z.literal("REQUEST_REVIEW"),
    taskId: TaskIdSchema,
    reviewId: ReviewIdSchema,
  }),
);
const RequestVerificationChallengeCommandSchema = addReviewIdentityChecks(
  VerificationChallengeReviewSchema.extend({
    type: z.literal("REQUEST_REVIEW"),
    taskId: TaskIdSchema,
    reviewId: ReviewIdSchema,
  }),
);
const RequestRegressionApprovalCommandSchema = addReviewIdentityChecks(
  RegressionApprovalReviewSchema.extend({
    type: z.literal("REQUEST_REVIEW"),
    taskId: TaskIdSchema,
    reviewId: ReviewIdSchema,
  }),
);

export const RequestReviewCommandSchema = z.union([
  RequestSpecApprovalCommandSchema,
  RequestVerificationApprovalCommandSchema,
  RequestVerificationChallengeCommandSchema,
  RequestRegressionApprovalCommandSchema,
]);

export const RecordReviewDecisionCommandSchema = z.strictObject({
  type: z.literal("RECORD_REVIEW_DECISION"),
  taskId: TaskIdSchema,
  reviewId: ReviewIdSchema,
  decision: ReviewDecisionSchema,
});

export const CommandSchema = z.union([
  StartWorkflowCommandSchema,
  RequestReviewCommandSchema,
  RecordReviewDecisionCommandSchema,
]);

export const CommandEnvelopeSchema = z.strictObject({
  schemaVersion: SchemaVersionSchema,
  commandId: CommandIdSchema,
  idempotencyKey: IdempotencyKeySchema,
  correlationId: CorrelationIdSchema,
  expectedStateVersion: StateVersionSchema,
  requestedAt: IsoTimestampSchema,
  actor: ActorSchema,
  command: CommandSchema,
});

export type StartWorkflowCommand = z.infer<typeof StartWorkflowCommandSchema>;
export type RequestReviewCommand = z.infer<typeof RequestReviewCommandSchema>;
export type RecordReviewDecisionCommand = z.infer<typeof RecordReviewDecisionCommandSchema>;
export type Command = z.infer<typeof CommandSchema>;
export type CommandEnvelope = z.infer<typeof CommandEnvelopeSchema>;
