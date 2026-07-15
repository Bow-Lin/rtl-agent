import type {
  EventEnvelope,
  ReviewDecisionRecordedEvent,
  ReviewRequestedEvent,
  TaskState,
  WorkflowStartedEvent,
} from "@rtl-agent/contracts";
import { MAX_EVENTS_PER_COMMAND } from "@rtl-agent/contracts";

import type { DomainError } from "./errors.js";
import { integrityError } from "./errors.js";
import { err, ok } from "./result.js";
import type { Result } from "./result.js";
import type { DomainState, EventBatch } from "./state.js";
import { validateStateInvariants, validateTransitionInvariants } from "./state-invariants.js";
import { hasSpecApprovalDecisionPolicy, isActorAllowed } from "./transition-table.js";

function batchError(reason: string, index: number | null = null): Result<never, DomainError> {
  return err(integrityError("INVALID_EVENT_BATCH", reason, index));
}

function sequenceError(reason: string, index: number | null = null): Result<never, DomainError> {
  return err(integrityError("INVALID_EVENT_SEQUENCE", reason, index));
}

export function validateEventBatch(
  events: readonly EventEnvelope[],
): Result<EventBatch, DomainError> {
  if (events.length === 0) return batchError("EMPTY_BATCH");
  if (events.length > MAX_EVENTS_PER_COMMAND) return batchError("BATCH_TOO_LARGE");

  const first = events[0];
  if (first === undefined) return batchError("EMPTY_BATCH");
  if (first.stateVersionAfter !== first.stateVersionBefore + 1) {
    return batchError("INVALID_VERSION_INCREMENT", 0);
  }

  const eventIds = new Set<string>();
  for (const [index, event] of events.entries()) {
    if (event.eventIndex !== index) return batchError("NON_CONTIGUOUS_EVENT_INDEX", index);
    if (event.eventId === undefined || eventIds.has(event.eventId)) {
      return batchError("DUPLICATE_EVENT_ID", index);
    }
    eventIds.add(event.eventId);
    if (event.taskId !== first.taskId) return batchError("MIXED_TASK_IDS", index);
    if (event.commandId !== first.commandId) return batchError("MIXED_COMMAND_IDS", index);
    if (event.correlationId !== first.correlationId) {
      return batchError("MIXED_CORRELATION_IDS", index);
    }
    if (
      event.stateVersionBefore !== first.stateVersionBefore ||
      event.stateVersionAfter !== first.stateVersionAfter
    ) {
      return batchError("MIXED_STATE_VERSIONS", index);
    }
    if (event.occurredAt !== first.occurredAt) return batchError("MIXED_EVENT_TIMES", index);
  }

  return ok(events as EventBatch);
}

function invalidEventTransition(
  state: DomainState | null,
  eventType: string,
  reason: string,
): Result<never, DomainError> {
  return err({
    code: "INVALID_TRANSITION",
    stage: state?.task.currentStage ?? "MISSING",
    status: state?.task.status ?? "MISSING",
    commandType: eventType,
    reason,
  });
}

function withoutPendingReviewId(task: TaskState): Omit<TaskState, "pendingReviewId"> {
  const copy = { ...task };
  delete copy.pendingReviewId;
  return copy;
}

function applyWorkflowStarted(
  state: DomainState | null,
  envelope: EventEnvelope,
  event: WorkflowStartedEvent,
): Result<DomainState, DomainError> {
  if (state !== null) return invalidEventTransition(state, event.type, "TASK_ALREADY_EXISTS");

  return ok({
    task: {
      schemaVersion: 1,
      taskId: envelope.taskId,
      workspaceId: event.workspaceId,
      specPath: event.specPath,
      currentStage: "SPEC_FREEZE",
      status: "ACTIVE",
      stateVersion: envelope.stateVersionAfter,
      createdAt: envelope.occurredAt,
      updatedAt: envelope.occurredAt,
    },
  });
}

function applyReviewRequested(
  state: DomainState | null,
  envelope: EventEnvelope,
  event: ReviewRequestedEvent,
): Result<DomainState, DomainError> {
  if (state === null) return invalidEventTransition(state, event.type, "TASK_NOT_STARTED");
  if (state.task.currentStage !== "SPEC_FREEZE" || state.task.status !== "ACTIVE") {
    return invalidEventTransition(state, event.type, "REVIEW_NOT_ALLOWED_IN_STATE");
  }
  if (
    event.reviewId !== event.review.binding.reviewId ||
    event.review.binding.taskId !== state.task.taskId ||
    event.review.binding.stateVersion !== envelope.stateVersionBefore
  ) {
    return err({ code: "REVIEW_BINDING_MISMATCH", reviewId: event.reviewId });
  }
  if (event.review.reviewType !== "SPEC_APPROVAL") {
    return invalidEventTransition(state, event.type, "UNSUPPORTED_REVIEW_TYPE");
  }
  if (!hasSpecApprovalDecisionPolicy(event.review.allowedDecisions)) {
    return invalidEventTransition(state, event.type, "INVALID_ALLOWED_DECISIONS");
  }
  if (!isActorAllowed("REQUEST_REVIEW", event.requestedBy.type)) {
    return invalidEventTransition(state, event.type, "ACTOR_NOT_ALLOWED");
  }

  return ok({
    task: {
      ...state.task,
      status: "WAITING_REVIEW",
      pendingReviewId: event.reviewId,
    },
    pendingReview: {
      reviewId: event.reviewId,
      review: event.review,
      requestedAt: envelope.occurredAt,
      requestedBy: event.requestedBy,
    },
  });
}

function applyReviewDecision(
  state: DomainState | null,
  event: ReviewDecisionRecordedEvent,
): Result<DomainState, DomainError> {
  if (state === null) return invalidEventTransition(state, event.type, "TASK_NOT_STARTED");
  if (
    state.task.currentStage !== "SPEC_FREEZE" ||
    state.task.status !== "WAITING_REVIEW" ||
    state.pendingReview === undefined
  ) {
    return invalidEventTransition(state, event.type, "NO_PENDING_SPEC_REVIEW");
  }
  if (
    event.reviewId !== state.task.pendingReviewId ||
    event.reviewId !== state.pendingReview.reviewId
  ) {
    return err({ code: "REVIEW_BINDING_MISMATCH", reviewId: event.reviewId });
  }
  if (!state.pendingReview.review.allowedDecisions.includes(event.decision)) {
    return invalidEventTransition(state, event.type, "DECISION_NOT_ALLOWED");
  }
  if (!isActorAllowed("RECORD_REVIEW_DECISION", event.decidedBy.type)) {
    return invalidEventTransition(state, event.type, "ACTOR_NOT_ALLOWED");
  }

  const task = withoutPendingReviewId(state.task);
  return ok({
    task: {
      ...task,
      currentStage: event.decision === "APPROVE" ? "VERIFICATION_PLAN" : "SPEC_FREEZE",
      status: "ACTIVE",
    },
  });
}

function applyEvent(
  state: DomainState | null,
  envelope: EventEnvelope,
): Result<DomainState, DomainError> {
  const eventType = (envelope.event as { readonly type?: unknown }).type;
  switch (eventType) {
    case "WORKFLOW_STARTED":
      return applyWorkflowStarted(state, envelope, envelope.event as WorkflowStartedEvent);
    case "REVIEW_REQUESTED":
      return applyReviewRequested(state, envelope, envelope.event as ReviewRequestedEvent);
    case "REVIEW_DECISION_RECORDED":
      return applyReviewDecision(state, envelope.event as ReviewDecisionRecordedEvent);
    default:
      return err({ code: "UNKNOWN_EVENT", eventType: String(eventType) });
  }
}

export function evolveBatch(
  currentState: DomainState | null,
  events: readonly EventEnvelope[],
): Result<DomainState, DomainError> {
  if (currentState !== null) {
    const currentValidation = validateStateInvariants(currentState);
    if (!currentValidation.ok) return currentValidation;
  }

  const validatedBatch = validateEventBatch(events);
  if (!validatedBatch.ok) return validatedBatch;
  const batch = validatedBatch.value;
  if (batch.length !== 1) return batchError("UNSUPPORTED_PHASE_A_EVENT_SEQUENCE");
  const first = batch[0];

  if (currentState === null) {
    if (first.stateVersionBefore !== 0) return sequenceError("FIRST_BATCH_MUST_START_AT_ZERO");
  } else {
    if (first.taskId !== currentState.task.taskId) return sequenceError("TASK_STREAM_MISMATCH");
    if (first.stateVersionBefore !== currentState.task.stateVersion) {
      return sequenceError("STATE_VERSION_GAP");
    }
    if (first.occurredAt < currentState.task.updatedAt)
      return sequenceError("EVENT_TIME_REGRESSION");
  }

  let nextState = currentState;
  for (const event of batch) {
    const applied = applyEvent(nextState, event);
    if (!applied.ok) return applied;
    nextState = applied.value;
  }
  if (nextState === null) return sequenceError("BATCH_DID_NOT_CREATE_STATE");

  const finalized: DomainState = {
    ...nextState,
    task: {
      ...nextState.task,
      stateVersion: first.stateVersionAfter,
      updatedAt: first.occurredAt,
    },
  };
  const nextValidation = validateStateInvariants(finalized);
  if (!nextValidation.ok) return nextValidation;
  const transitionValidation = validateTransitionInvariants(currentState, finalized, batch);
  if (!transitionValidation.ok) return transitionValidation;
  return ok(finalized);
}
