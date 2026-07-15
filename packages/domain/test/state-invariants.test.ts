import { describe, expect, it } from "vitest";

import { validateStateInvariants, validateTransitionInvariants } from "../src/index.js";
import {
  EVENT_IDS,
  OTHER_TASK_ID,
  TIMES,
  decisionContext,
  requestReviewCommand,
  startCommand,
  startedState,
  unwrapDecision,
  waitingState,
} from "./fixtures.js";

describe("domain invariants", () => {
  it("separates intrinsic state validation from transition validation", () => {
    expect(validateStateInvariants(startedState())).toEqual({ ok: true, value: undefined });
    expect(validateStateInvariants(waitingState())).toEqual({ ok: true, value: undefined });

    const changedIdentity = {
      ...startedState(),
      task: { ...startedState().task, taskId: OTHER_TASK_ID },
    };
    expect(validateStateInvariants(changedIdentity)).toEqual({ ok: true, value: undefined });

    const request = unwrapDecision(
      startedState(),
      requestReviewCommand(),
      decisionContext(EVENT_IDS[1], TIMES[1]),
    );
    expect(
      validateTransitionInvariants(startedState(), changedIdentity, request.eventBatch),
    ).toMatchObject({
      ok: false,
      error: { code: "TRANSITION_INVARIANT_VIOLATION", reason: "NEXT_STATE_TASK_MISMATCH" },
    });
  });

  it("rejects inconsistent pending-review projections", () => {
    const missingReview = { task: waitingState().task };
    expect(validateStateInvariants(missingReview)).toMatchObject({
      ok: false,
      error: { reason: "WAITING_REVIEW_REQUIRES_PENDING_REVIEW" },
    });

    const activeWithReview = {
      ...waitingState(),
      task: { ...waitingState().task, status: "ACTIVE" as const },
    };
    expect(validateStateInvariants(activeWithReview)).toMatchObject({
      ok: false,
      error: { reason: "NON_WAITING_STATE_HAS_PENDING_REVIEW" },
    });
  });

  it("rejects invalid timestamps and unsupported Phase A states", () => {
    expect(
      validateStateInvariants({
        ...startedState(),
        task: { ...startedState().task, createdAt: TIMES[1], updatedAt: TIMES[0] },
      }),
    ).toMatchObject({ ok: false, error: { reason: "CREATED_AFTER_UPDATED" } });
    expect(
      validateStateInvariants({
        ...startedState(),
        task: { ...startedState().task, currentStage: "RTL_IMPLEMENTATION" },
      }),
    ).toMatchObject({ ok: false, error: { reason: "UNSUPPORTED_PHASE_A_STAGE_STATUS" } });
  });

  it("keeps immutable initialization fields unchanged across a valid batch", () => {
    const start = unwrapDecision(null, startCommand(), decisionContext(EVENT_IDS[0], TIMES[0]));
    const request = unwrapDecision(
      start.nextState,
      requestReviewCommand(),
      decisionContext(EVENT_IDS[1], TIMES[1]),
    );
    expect(
      validateTransitionInvariants(start.nextState, request.nextState, request.eventBatch),
    ).toEqual({ ok: true, value: undefined });
  });
});
