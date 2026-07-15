import type { EventBatch } from "./state.js";
import type { DomainState } from "./state.js";
import type { DomainError } from "./errors.js";
import { integrityError } from "./errors.js";
import { err, ok } from "./result.js";
import type { Result } from "./result.js";
import { hasSpecApprovalDecisionPolicy, isActorAllowed } from "./transition-table.js";

function stateError(reason: string): Result<void, DomainError> {
  return err(integrityError("STATE_INVARIANT_VIOLATION", reason));
}

export function validateStateInvariants(state: DomainState): Result<void, DomainError> {
  const { task, pendingReview } = state;

  if (!Number.isSafeInteger(task.stateVersion) || task.stateVersion < 1) {
    return stateError("STATE_VERSION_INVALID");
  }
  if (task.createdAt > task.updatedAt) {
    return stateError("CREATED_AFTER_UPDATED");
  }

  const phaseStateIsValid =
    (task.currentStage === "SPEC_FREEZE" &&
      (task.status === "ACTIVE" || task.status === "WAITING_REVIEW")) ||
    (task.currentStage === "VERIFICATION_PLAN" && task.status === "ACTIVE");
  if (!phaseStateIsValid) {
    return stateError("UNSUPPORTED_PHASE_A_STAGE_STATUS");
  }

  if (task.status === "WAITING_REVIEW") {
    if (task.pendingReviewId === undefined || pendingReview === undefined) {
      return stateError("WAITING_REVIEW_REQUIRES_PENDING_REVIEW");
    }
    if (
      task.pendingReviewId !== pendingReview.reviewId ||
      pendingReview.reviewId !== pendingReview.review.binding.reviewId
    ) {
      return stateError("PENDING_REVIEW_ID_MISMATCH");
    }
    if (pendingReview.review.binding.taskId !== task.taskId) {
      return stateError("PENDING_REVIEW_TASK_MISMATCH");
    }
    if (pendingReview.review.reviewType !== "SPEC_APPROVAL") {
      return stateError("UNSUPPORTED_PENDING_REVIEW_TYPE");
    }
    if (!hasSpecApprovalDecisionPolicy(pendingReview.review.allowedDecisions)) {
      return stateError("INVALID_SPEC_APPROVAL_DECISION_POLICY");
    }
    if (pendingReview.review.binding.stateVersion + 1 !== task.stateVersion) {
      return stateError("PENDING_REVIEW_VERSION_MISMATCH");
    }
    if (pendingReview.requestedAt !== task.updatedAt) {
      return stateError("PENDING_REVIEW_TIME_MISMATCH");
    }
    if (!isActorAllowed("REQUEST_REVIEW", pendingReview.requestedBy.type)) {
      return stateError("INVALID_REVIEW_REQUEST_ACTOR");
    }
  } else if (task.pendingReviewId !== undefined || pendingReview !== undefined) {
    return stateError("NON_WAITING_STATE_HAS_PENDING_REVIEW");
  }

  return ok(undefined);
}

function transitionError(reason: string): Result<void, DomainError> {
  return err(integrityError("TRANSITION_INVARIANT_VIOLATION", reason));
}

export function validateTransitionInvariants(
  previousState: DomainState | null,
  nextState: DomainState,
  batch: EventBatch,
): Result<void, DomainError> {
  const first = batch[0];
  if (nextState.task.taskId !== first.taskId) {
    return transitionError("NEXT_STATE_TASK_MISMATCH");
  }
  if (nextState.task.stateVersion !== first.stateVersionAfter) {
    return transitionError("NEXT_STATE_VERSION_MISMATCH");
  }
  if (nextState.task.updatedAt !== first.occurredAt) {
    return transitionError("NEXT_STATE_TIME_MISMATCH");
  }

  if (previousState === null) {
    if (
      first.stateVersionBefore !== 0 ||
      nextState.task.stateVersion !== 1 ||
      nextState.task.createdAt !== first.occurredAt
    ) {
      return transitionError("INVALID_INITIAL_TRANSITION");
    }
    return ok(undefined);
  }

  const previous = previousState.task;
  const next = nextState.task;
  if (next.taskId !== previous.taskId) return transitionError("TASK_ID_CHANGED");
  if (next.workspaceId !== previous.workspaceId) return transitionError("WORKSPACE_ID_CHANGED");
  if (next.specPath !== previous.specPath) return transitionError("SPEC_PATH_CHANGED");
  if (next.createdAt !== previous.createdAt) return transitionError("CREATED_AT_CHANGED");
  if (next.stateVersion !== previous.stateVersion + 1) {
    return transitionError("STATE_VERSION_DID_NOT_INCREMENT_ONCE");
  }

  return ok(undefined);
}
