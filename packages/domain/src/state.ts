import type {
  Actor,
  EventEnvelope,
  EventId,
  IsoTimestamp,
  ReviewId,
  ReviewRequest,
  TaskState,
} from "@rtl-agent/contracts";

export type PendingReviewState = {
  readonly reviewId: ReviewId;
  readonly review: ReviewRequest;
  readonly requestedAt: IsoTimestamp;
  readonly requestedBy: Actor;
};

/** The pure aggregate input. A04 may assemble it from the task and pending-review rows. */
export type DomainState = {
  readonly task: TaskState;
  readonly pendingReview?: PendingReviewState;
};

/** A domain-local non-empty view over the A02 EventEnvelope array contract. */
export type EventBatch = readonly [EventEnvelope, ...EventEnvelope[]];

export type DecisionContext = {
  readonly occurredAt: IsoTimestamp;
  readonly eventIds: readonly EventId[];
};

export type Decision = {
  readonly nextState: DomainState;
  readonly eventBatch: EventBatch;
};
