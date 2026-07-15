import type {
  Command,
  CommandEnvelope,
  DomainEvent,
  EventEnvelope,
  ReviewRequest,
  StateVersion,
  TaskId,
} from "@rtl-agent/contracts";

import type { DomainError } from "./errors.js";
import { integrityError } from "./errors.js";
import { evolveBatch } from "./evolve.js";
import { err, ok } from "./result.js";
import type { Result } from "./result.js";
import type { Decision, DecisionContext, DomainState, EventBatch } from "./state.js";
import { validateStateInvariants } from "./state-invariants.js";
import {
  hasSpecApprovalDecisionPolicy,
  isActorAllowed,
  isCommandAllowed,
  transitionStateKey,
} from "./transition-table.js";

const COMMAND_TYPES = new Set<Command["type"]>([
  "START_WORKFLOW",
  "REQUEST_REVIEW",
  "RECORD_REVIEW_DECISION",
]);

function commandTaskId(command: Command): TaskId {
  return command.taskId;
}

function invalidTransition(
  state: DomainState | null,
  commandType: string,
  reason: string,
): Result<never, DomainError> {
  return err({
    code: "INVALID_TRANSITION",
    stage: state?.task.currentStage ?? "MISSING",
    status: state?.task.status ?? "MISSING",
    commandType,
    reason,
  });
}

function reviewFromCommand(command: Extract<Command, { type: "REQUEST_REVIEW" }>): ReviewRequest {
  return {
    reviewType: command.reviewType,
    allowedDecisions: command.allowedDecisions,
    binding: command.binding,
  } as ReviewRequest;
}

function decidePayload(
  state: DomainState | null,
  envelope: CommandEnvelope,
): Result<readonly DomainEvent[], DomainError> {
  const command = envelope.command;
  switch (command.type) {
    case "START_WORKFLOW":
      return ok([
        { type: "WORKFLOW_STARTED", workspaceId: command.workspaceId, specPath: command.specPath },
      ]);
    case "REQUEST_REVIEW": {
      if (command.reviewType !== "SPEC_APPROVAL") {
        return invalidTransition(state, command.type, "UNSUPPORTED_REVIEW_TYPE");
      }
      if (
        command.taskId !== command.binding.taskId ||
        command.reviewId !== command.binding.reviewId ||
        command.binding.stateVersion !== state?.task.stateVersion
      ) {
        return err({ code: "REVIEW_BINDING_MISMATCH", reviewId: command.reviewId });
      }
      if (!hasSpecApprovalDecisionPolicy(command.allowedDecisions)) {
        return invalidTransition(state, command.type, "INVALID_ALLOWED_DECISIONS");
      }
      return ok([
        {
          type: "REVIEW_REQUESTED",
          reviewId: command.reviewId,
          review: reviewFromCommand(command),
          requestedBy: envelope.actor,
        },
      ]);
    }
    case "RECORD_REVIEW_DECISION": {
      if (
        state?.pendingReview === undefined ||
        state.task.pendingReviewId !== command.reviewId ||
        state.pendingReview.reviewId !== command.reviewId
      ) {
        return err({ code: "REVIEW_BINDING_MISMATCH", reviewId: command.reviewId });
      }
      if (!state.pendingReview.review.allowedDecisions.includes(command.decision)) {
        return invalidTransition(state, command.type, "DECISION_NOT_ALLOWED");
      }
      return ok([
        {
          type: "REVIEW_DECISION_RECORDED",
          reviewId: command.reviewId,
          decision: command.decision,
          decidedBy: envelope.actor,
        },
      ]);
    }
  }
}

function buildEventBatch(
  command: CommandEnvelope,
  context: DecisionContext,
  stateVersionBefore: StateVersion,
  payloads: readonly DomainEvent[],
): Result<EventBatch, DomainError> {
  const contextValidation = validateDecisionContext(context, payloads.length);
  if (!contextValidation.ok) return contextValidation;

  const taskId = commandTaskId(command.command);
  const events = payloads.map((event, eventIndex): EventEnvelope => ({
    schemaVersion: 1,
    eventId: context.eventIds[eventIndex]!,
    taskId,
    commandId: command.commandId,
    correlationId: command.correlationId,
    eventIndex,
    occurredAt: context.occurredAt,
    stateVersionBefore,
    stateVersionAfter: (stateVersionBefore + 1) as StateVersion,
    event,
  }));
  const first = events[0];
  if (first === undefined) {
    return err(integrityError("INVALID_DECISION_CONTEXT", "EVENT_ID_COUNT_MISMATCH"));
  }
  return ok([first, ...events.slice(1)]);
}

export function validateDecisionContext(
  context: DecisionContext,
  expectedEventCount: number,
): Result<void, DomainError> {
  if (context.eventIds.length === 0 || context.eventIds.length !== expectedEventCount) {
    return err(integrityError("INVALID_DECISION_CONTEXT", "EVENT_ID_COUNT_MISMATCH"));
  }
  if (new Set(context.eventIds).size !== context.eventIds.length) {
    return err(integrityError("INVALID_DECISION_CONTEXT", "DUPLICATE_EVENT_IDS"));
  }
  return ok(undefined);
}

export function decide(
  currentState: DomainState | null,
  command: CommandEnvelope,
  context: DecisionContext,
): Result<Decision, DomainError> {
  if (currentState !== null) {
    const stateValidation = validateStateInvariants(currentState);
    if (!stateValidation.ok) return stateValidation;
  }

  const runtimeType = (command.command as { readonly type?: unknown }).type;
  if (typeof runtimeType !== "string" || !COMMAND_TYPES.has(runtimeType as Command["type"])) {
    return err({ code: "UNKNOWN_COMMAND", commandType: String(runtimeType) });
  }
  const commandType = runtimeType as Command["type"];
  const taskId = commandTaskId(command.command);

  if (commandType === "START_WORKFLOW" && currentState !== null) {
    return err({ code: "TASK_ALREADY_EXISTS", taskId });
  }
  if (commandType !== "START_WORKFLOW" && currentState === null) {
    return err({ code: "TASK_NOT_FOUND", taskId });
  }
  if (currentState !== null && taskId !== currentState.task.taskId) {
    return err({ code: "TASK_NOT_FOUND", taskId });
  }

  const actualVersion = (currentState?.task.stateVersion ?? 0) as StateVersion;
  if (command.expectedStateVersion !== actualVersion) {
    return err({
      code: "STATE_VERSION_CONFLICT",
      expected: command.expectedStateVersion,
      actual: actualVersion,
    });
  }

  const stateKey = transitionStateKey(
    currentState?.task.currentStage ?? null,
    currentState?.task.status ?? null,
  );
  if (!isCommandAllowed(commandType, stateKey)) {
    return invalidTransition(currentState, commandType, "COMMAND_NOT_ALLOWED_IN_STATE");
  }
  if (!isActorAllowed(commandType, command.actor.type)) {
    return invalidTransition(currentState, commandType, "ACTOR_NOT_ALLOWED");
  }
  if (currentState !== null && context.occurredAt < currentState.task.updatedAt) {
    return err(integrityError("INVALID_DECISION_CONTEXT", "TIME_REGRESSION"));
  }

  const payloads = decidePayload(currentState, command);
  if (!payloads.ok) return payloads;
  const eventBatch = buildEventBatch(command, context, actualVersion, payloads.value);
  if (!eventBatch.ok) return eventBatch;
  const evolved = evolveBatch(currentState, eventBatch.value);
  if (!evolved.ok) return evolved;
  return ok({ nextState: evolved.value, eventBatch: eventBatch.value });
}
