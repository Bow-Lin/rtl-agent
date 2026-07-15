import type { ReviewId, Stage, TaskId, TaskStatus } from "@rtl-agent/contracts";

export type DomainIntegrityErrorCode =
  | "STATE_INVARIANT_VIOLATION"
  | "TRANSITION_INVARIANT_VIOLATION"
  | "INVALID_EVENT_BATCH"
  | "INVALID_EVENT_SEQUENCE"
  | "INVALID_DECISION_CONTEXT";

export type DomainError =
  | { readonly code: "TASK_NOT_FOUND"; readonly taskId: TaskId }
  | { readonly code: "TASK_ALREADY_EXISTS"; readonly taskId: TaskId }
  | {
      readonly code: "STATE_VERSION_CONFLICT";
      readonly expected: number;
      readonly actual: number;
    }
  | {
      readonly code: "INVALID_TRANSITION";
      readonly stage: Stage | "MISSING";
      readonly status: TaskStatus | "MISSING";
      readonly commandType: string;
      readonly reason: string;
    }
  | { readonly code: "UNKNOWN_COMMAND"; readonly commandType: string }
  | { readonly code: "UNKNOWN_EVENT"; readonly eventType: string }
  | { readonly code: "REVIEW_BINDING_MISMATCH"; readonly reviewId: ReviewId }
  | {
      readonly code: DomainIntegrityErrorCode;
      readonly reason: string;
      readonly index: number | null;
    };

export function integrityError(
  code: DomainIntegrityErrorCode,
  reason: string,
  index: number | null = null,
): DomainError {
  return { code, reason, index };
}
