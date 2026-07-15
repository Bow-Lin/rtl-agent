import type { EventEnvelope } from "@rtl-agent/contracts";
import { describe, expect, it } from "vitest";

import { decide, evolveBatch, validateEventBatch } from "../src/index.js";
import {
  EVENT_IDS,
  OTHER_TASK_ID,
  TIMES,
  decisionContext,
  recordDecisionCommand,
  requestReviewCommand,
  startCommand,
  startedState,
  unwrapDecision,
  waitingState,
} from "./fixtures.js";

describe("evolveBatch", () => {
  it("reconstructs exactly the state returned by decide", () => {
    const start = unwrapDecision(null, startCommand(), decisionContext(EVENT_IDS[0], TIMES[0]));
    expect(evolveBatch(null, start.eventBatch)).toEqual({ ok: true, value: start.nextState });

    const request = unwrapDecision(
      start.nextState,
      requestReviewCommand(),
      decisionContext(EVENT_IDS[1], TIMES[1]),
    );
    expect(evolveBatch(start.nextState, request.eventBatch)).toEqual({
      ok: true,
      value: request.nextState,
    });
  });

  it("rejects empty, oversized, non-contiguous, and mixed batches", () => {
    expect(validateEventBatch([])).toMatchObject({
      ok: false,
      error: { code: "INVALID_EVENT_BATCH", reason: "EMPTY_BATCH" },
    });

    const first = unwrapDecision(null, startCommand(), decisionContext()).eventBatch[0];
    expect(validateEventBatch(Array.from({ length: 101 }, () => first))).toMatchObject({
      ok: false,
      error: { reason: "BATCH_TOO_LARGE" },
    });
    const indexGap = [{ ...first, eventIndex: 1 }];
    expect(validateEventBatch(indexGap)).toMatchObject({
      ok: false,
      error: { reason: "NON_CONTIGUOUS_EVENT_INDEX" },
    });

    const mixedTask = [
      first,
      { ...first, eventId: EVENT_IDS[1], eventIndex: 1, taskId: OTHER_TASK_ID },
    ];
    expect(validateEventBatch(mixedTask)).toMatchObject({
      ok: false,
      error: { reason: "MIXED_TASK_IDS" },
    });

    const duplicateId = [first, { ...first, eventIndex: 1 }];
    expect(validateEventBatch(duplicateId)).toMatchObject({
      ok: false,
      error: { reason: "DUPLICATE_EVENT_ID" },
    });

    const secondBase = { ...first, eventId: EVENT_IDS[1], eventIndex: 1 };
    const mixedCases = [
      [
        { ...secondBase, commandId: "cmd_123e4567-e89b-42d3-a456-426614174099" },
        "MIXED_COMMAND_IDS",
      ],
      [
        { ...secondBase, correlationId: "corr_123e4567-e89b-42d3-a456-426614174099" },
        "MIXED_CORRELATION_IDS",
      ],
      [{ ...secondBase, stateVersionAfter: 2 }, "MIXED_STATE_VERSIONS"],
      [{ ...secondBase, occurredAt: TIMES[1] }, "MIXED_EVENT_TIMES"],
    ] as const;
    for (const [second, reason] of mixedCases) {
      expect(validateEventBatch([first, second] as EventEnvelope[])).toMatchObject({
        ok: false,
        error: { reason },
      });
    }
  });

  it("fails closed for unsupported multi-event Phase A semantics", () => {
    const first = unwrapDecision(null, startCommand(), decisionContext()).eventBatch[0];
    const second = { ...first, eventId: EVENT_IDS[1], eventIndex: 1 };
    expect(evolveBatch(null, [first, second])).toMatchObject({
      ok: false,
      error: { code: "INVALID_EVENT_BATCH", reason: "UNSUPPORTED_PHASE_A_EVENT_SEQUENCE" },
    });
  });

  it("rejects version gaps, task mixing, and time regression between batches", () => {
    const request = unwrapDecision(
      startedState(),
      requestReviewCommand(),
      decisionContext(EVENT_IDS[1], TIMES[1]),
    ).eventBatch;
    expect(
      evolveBatch(
        { ...startedState(), task: { ...startedState().task, taskId: OTHER_TASK_ID } },
        request,
      ),
    ).toMatchObject({
      ok: false,
      error: { code: "INVALID_EVENT_SEQUENCE", reason: "TASK_STREAM_MISMATCH" },
    });
    const versionTwoState = startedState();
    expect(
      evolveBatch(
        {
          ...versionTwoState,
          task: {
            ...versionTwoState.task,
            stateVersion: 2 as typeof versionTwoState.task.stateVersion,
          },
        },
        request,
      ),
    ).toMatchObject({
      ok: false,
      error: { code: "INVALID_EVENT_SEQUENCE", reason: "STATE_VERSION_GAP" },
    });

    const regressed = [
      { ...request[0], occurredAt: "2026-07-15T03:59:59.999Z" },
    ] as EventEnvelope[];
    expect(evolveBatch(startedState(), regressed)).toMatchObject({
      ok: false,
      error: { code: "INVALID_EVENT_SEQUENCE", reason: "EVENT_TIME_REGRESSION" },
    });
  });

  it("enforces pending-review identity and USER decisions while replaying", () => {
    const decision = unwrapDecision(
      waitingState(),
      recordDecisionCommand("APPROVE"),
      decisionContext(EVENT_IDS[2], TIMES[2]),
    ).eventBatch;
    const wrongReview = [
      {
        ...decision[0],
        event: { ...decision[0].event, reviewId: "review_123e4567-e89b-42d3-a456-426614174001" },
      },
    ] as EventEnvelope[];
    expect(evolveBatch(waitingState(), wrongReview)).toMatchObject({
      ok: false,
      error: { code: "REVIEW_BINDING_MISMATCH" },
    });

    const wrongActor = [
      {
        ...decision[0],
        event: { ...decision[0].event, decidedBy: { type: "AGENT", id: "rtl-engineer" } },
      },
    ] as EventEnvelope[];
    expect(evolveBatch(waitingState(), wrongActor)).toMatchObject({
      ok: false,
      error: { code: "INVALID_TRANSITION", reason: "ACTOR_NOT_ALLOWED" },
    });
  });

  it("fails closed for a runtime-only unknown event", () => {
    const event = structuredClone(
      unwrapDecision(null, startCommand(), decisionContext()).eventBatch[0],
    ) as EventEnvelope;
    (event.event as { type: string }).type = "WORKFLOW_CORRUPTED";
    expect(evolveBatch(null, [event])).toMatchObject({
      ok: false,
      error: { code: "UNKNOWN_EVENT", eventType: "WORKFLOW_CORRUPTED" },
    });
  });

  it("does not apply an invalid event sequence through decide", () => {
    const result = decide(
      waitingState(),
      recordDecisionCommand("APPROVE"),
      decisionContext(EVENT_IDS[2], TIMES[2]),
    );
    expect(result).toMatchObject({ ok: true });
  });
});
