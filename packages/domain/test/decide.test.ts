import type { CommandEnvelope } from "@rtl-agent/contracts";
import { describe, expect, it } from "vitest";

import { decide, validateDecisionContext } from "../src/index.js";
import {
  EVENT_IDS,
  OTHER_REVIEW_ID,
  OTHER_TASK_ID,
  REVIEW_ID,
  TIMES,
  decisionContext,
  recordDecisionCommand,
  requestReviewCommand,
  startCommand,
  startedState,
  waitingState,
} from "./fixtures.js";

describe("decide", () => {
  it("starts a workflow through the event projection path", () => {
    const result = decide(null, startCommand(), decisionContext());
    expect(result).toMatchObject({
      ok: true,
      value: {
        nextState: {
          task: {
            currentStage: "SPEC_FREEZE",
            status: "ACTIVE",
            stateVersion: 1,
          },
        },
        eventBatch: [{ eventIndex: 0, event: { type: "WORKFLOW_STARTED" } }],
      },
    });
  });

  it("stores a self-contained pending review in the domain aggregate", () => {
    const result = decide(
      startedState(),
      requestReviewCommand(),
      decisionContext(EVENT_IDS[1], TIMES[1]),
    );
    expect(result).toMatchObject({
      ok: true,
      value: {
        nextState: {
          task: { status: "WAITING_REVIEW", pendingReviewId: REVIEW_ID, stateVersion: 2 },
          pendingReview: {
            reviewId: REVIEW_ID,
            review: {
              reviewType: "SPEC_APPROVAL",
              allowedDecisions: ["APPROVE", "REJECT", "REQUEST_CHANGES"],
            },
            requestedBy: { type: "AGENT" },
          },
        },
      },
    });
  });

  it.each([
    ["APPROVE", "VERIFICATION_PLAN"],
    ["REJECT", "SPEC_FREEZE"],
    ["REQUEST_CHANGES", "SPEC_FREEZE"],
  ] as const)("applies %s with the documented result", (decision, expectedStage) => {
    const result = decide(
      waitingState(),
      recordDecisionCommand(decision),
      decisionContext(EVENT_IDS[2], TIMES[2]),
    );
    expect(result).toMatchObject({
      ok: true,
      value: {
        nextState: { task: { currentStage: expectedStage, status: "ACTIVE", stateVersion: 3 } },
      },
    });
    if (result.ok) {
      expect(result.value.nextState.task).not.toHaveProperty("pendingReviewId");
      expect(result.value.nextState).not.toHaveProperty("pendingReview");
    }
  });

  it("rejects identity and version failures before transition details", () => {
    const duplicate = decide(startedState(), startCommand(), decisionContext());
    expect(duplicate).toMatchObject({ ok: false, error: { code: "TASK_ALREADY_EXISTS" } });

    const missing = decide(null, requestReviewCommand(), decisionContext());
    expect(missing).toMatchObject({ ok: false, error: { code: "TASK_NOT_FOUND" } });

    const wrongTask = structuredClone(requestReviewCommand()) as CommandEnvelope;
    (wrongTask.command as { taskId: typeof OTHER_TASK_ID }).taskId = OTHER_TASK_ID;
    expect(decide(startedState(), wrongTask, decisionContext())).toMatchObject({
      ok: false,
      error: { code: "TASK_NOT_FOUND" },
    });

    for (const expectedStateVersion of [0, 2]) {
      const wrongVersion = { ...requestReviewCommand(), expectedStateVersion } as CommandEnvelope;
      expect(decide(startedState(), wrongVersion, decisionContext())).toMatchObject({
        ok: false,
        error: { code: "STATE_VERSION_CONFLICT", actual: 1 },
      });
    }
  });

  it("rejects actor-policy violations", () => {
    expect(
      decide(null, startCommand({ type: "SYSTEM", id: "workflow-daemon" }), decisionContext()),
    ).toMatchObject({
      ok: false,
      error: { code: "INVALID_TRANSITION", reason: "ACTOR_NOT_ALLOWED" },
    });
    expect(
      decide(
        startedState(),
        requestReviewCommand({ type: "USER", id: "local:user" }),
        decisionContext(EVENT_IDS[1], TIMES[1]),
      ),
    ).toMatchObject({ ok: false, error: { reason: "ACTOR_NOT_ALLOWED" } });
    expect(
      decide(
        waitingState(),
        recordDecisionCommand("APPROVE", { type: "AGENT", id: "rtl-engineer" }),
        decisionContext(EVENT_IDS[2], TIMES[2]),
      ),
    ).toMatchObject({ ok: false, error: { reason: "ACTOR_NOT_ALLOWED" } });
  });

  it("does not let a requester narrow the Spec Approval decision policy", () => {
    const command = structuredClone(requestReviewCommand()) as CommandEnvelope;
    if (command.command.type !== "REQUEST_REVIEW") throw new Error("fixture type mismatch");
    command.command.allowedDecisions.splice(0, command.command.allowedDecisions.length, "APPROVE");
    expect(decide(startedState(), command, decisionContext(EVENT_IDS[1], TIMES[1]))).toMatchObject({
      ok: false,
      error: { code: "INVALID_TRANSITION", reason: "INVALID_ALLOWED_DECISIONS" },
    });
  });

  it.each(["VERIFICATION_APPROVAL", "VERIFICATION_CHALLENGE", "REGRESSION_APPROVAL"])(
    "rejects unsupported review variant %s",
    (reviewType) => {
      const unsupported = structuredClone(requestReviewCommand()) as CommandEnvelope;
      if (unsupported.command.type !== "REQUEST_REVIEW") throw new Error("fixture type mismatch");
      (unsupported.command as { reviewType: string }).reviewType = reviewType;
      expect(
        decide(startedState(), unsupported, decisionContext(EVENT_IDS[1], TIMES[1])),
      ).toMatchObject({ ok: false, error: { reason: "UNSUPPORTED_REVIEW_TYPE" } });
    },
  );

  it("rejects task, review, and state-version binding mismatches", () => {
    const mutations = [
      (command: CommandEnvelope) => {
        if (command.command.type !== "REQUEST_REVIEW") throw new Error("fixture type mismatch");
        (command.command.binding as { taskId: typeof OTHER_TASK_ID }).taskId = OTHER_TASK_ID;
      },
      (command: CommandEnvelope) => {
        if (command.command.type !== "REQUEST_REVIEW") throw new Error("fixture type mismatch");
        (command.command.binding as { reviewId: typeof OTHER_REVIEW_ID }).reviewId =
          OTHER_REVIEW_ID;
      },
      (command: CommandEnvelope) => {
        if (command.command.type !== "REQUEST_REVIEW") throw new Error("fixture type mismatch");
        (command.command.binding as { stateVersion: number }).stateVersion = 0;
      },
      (command: CommandEnvelope) => {
        if (command.command.type !== "REQUEST_REVIEW") throw new Error("fixture type mismatch");
        (command.command as { reviewId: typeof OTHER_REVIEW_ID }).reviewId = OTHER_REVIEW_ID;
      },
    ];
    for (const mutate of mutations) {
      const mismatch = structuredClone(requestReviewCommand()) as CommandEnvelope;
      mutate(mismatch);
      expect(
        decide(startedState(), mismatch, decisionContext(EVENT_IDS[1], TIMES[1])),
      ).toMatchObject({ ok: false, error: { code: "REVIEW_BINDING_MISMATCH" } });
    }
  });

  it("validates all decision-context IDs and monotonic time", () => {
    expect(validateDecisionContext({ occurredAt: TIMES[0], eventIds: [] }, 1)).toMatchObject({
      ok: false,
      error: { reason: "EVENT_ID_COUNT_MISMATCH" },
    });
    expect(
      validateDecisionContext({ occurredAt: TIMES[0], eventIds: [EVENT_IDS[0], EVENT_IDS[0]] }, 2),
    ).toMatchObject({ ok: false, error: { reason: "DUPLICATE_EVENT_IDS" } });
    expect(
      decide(startedState(), requestReviewCommand(), decisionContext(EVENT_IDS[1], TIMES[0])),
    ).toMatchObject({ ok: true });

    const regressed = decisionContext(
      EVENT_IDS[1],
      "2026-07-15T03:59:59.999Z" as (typeof TIMES)[number],
    );
    expect(decide(startedState(), requestReviewCommand(), regressed)).toMatchObject({
      ok: false,
      error: { code: "INVALID_DECISION_CONTEXT", reason: "TIME_REGRESSION" },
    });
  });

  it("fails closed for a runtime-only unknown command", () => {
    const command = structuredClone(startCommand()) as CommandEnvelope;
    (command.command as { type: string }).type = "ERASE_WORKSPACE";
    expect(decide(null, command, decisionContext())).toMatchObject({
      ok: false,
      error: { code: "UNKNOWN_COMMAND", commandType: "ERASE_WORKSPACE" },
    });
  });
});
