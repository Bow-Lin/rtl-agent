import { z } from "zod";

import { ActorSchema } from "./actor.js";
import {
  CommandIdSchema,
  CorrelationIdSchema,
  EventIdSchema,
  IsoTimestampSchema,
  ReviewIdSchema,
  StateVersionSchema,
  TaskIdSchema,
  WorkspaceIdSchema,
} from "./identifiers.js";
import { LogicalPathSchema } from "./paths.js";
import { ReviewDecisionSchema, ReviewRequestSchema } from "./review.js";
import { SchemaVersionSchema } from "./version.js";

export const WorkflowStartedEventSchema = z.strictObject({
  type: z.literal("WORKFLOW_STARTED"),
  workspaceId: WorkspaceIdSchema,
  specPath: LogicalPathSchema,
});

export const ReviewRequestedEventSchema = z.strictObject({
  type: z.literal("REVIEW_REQUESTED"),
  reviewId: ReviewIdSchema,
  review: ReviewRequestSchema,
  requestedBy: ActorSchema,
});

export const ReviewDecisionRecordedEventSchema = z.strictObject({
  type: z.literal("REVIEW_DECISION_RECORDED"),
  reviewId: ReviewIdSchema,
  decision: ReviewDecisionSchema,
  decidedBy: ActorSchema,
});

export const DomainEventSchema = z.discriminatedUnion("type", [
  WorkflowStartedEventSchema,
  ReviewRequestedEventSchema,
  ReviewDecisionRecordedEventSchema,
]);

export const EventEnvelopeSchema = z
  .strictObject({
    schemaVersion: SchemaVersionSchema,
    eventId: EventIdSchema,
    taskId: TaskIdSchema,
    commandId: CommandIdSchema,
    correlationId: CorrelationIdSchema,
    eventIndex: z.int().nonnegative().max(99),
    occurredAt: IsoTimestampSchema,
    stateVersionBefore: StateVersionSchema,
    stateVersionAfter: StateVersionSchema,
    event: DomainEventSchema,
  })
  .superRefine((value, context) => {
    if (value.stateVersionAfter !== value.stateVersionBefore + 1) {
      context.addIssue({
        code: "custom",
        path: ["stateVersionAfter"],
        message: "Event stateVersionAfter must equal stateVersionBefore + 1",
      });
    }
    if (value.event.type === "REVIEW_REQUESTED") {
      if (value.event.reviewId !== value.event.review.binding.reviewId) {
        context.addIssue({
          code: "custom",
          path: ["event", "review", "binding", "reviewId"],
          message: "Review event IDs must match",
        });
      }
      if (value.taskId !== value.event.review.binding.taskId) {
        context.addIssue({
          code: "custom",
          path: ["event", "review", "binding", "taskId"],
          message: "Review binding taskId must match event taskId",
        });
      }
      if (value.stateVersionBefore !== value.event.review.binding.stateVersion) {
        context.addIssue({
          code: "custom",
          path: ["event", "review", "binding", "stateVersion"],
          message: "Review binding version must match event stateVersionBefore",
        });
      }
    }
  });

export type WorkflowStartedEvent = z.infer<typeof WorkflowStartedEventSchema>;
export type ReviewRequestedEvent = z.infer<typeof ReviewRequestedEventSchema>;
export type ReviewDecisionRecordedEvent = z.infer<typeof ReviewDecisionRecordedEventSchema>;
export type DomainEvent = z.infer<typeof DomainEventSchema>;
export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;
