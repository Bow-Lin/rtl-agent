import { describe, expect, it } from "vitest";

import {
  CommandSuccessSchema,
  EventEnvelopeSchema,
  canonicalizeJsonJcs,
  parseEventEnvelope,
} from "../src/index.js";
import {
  DIGEST,
  EVENT_ID_2,
  OTHER_TASK_ID,
  REVIEW_ID,
  TASK_ID,
  workflowStartedEvent,
} from "./fixtures.js";

describe("event contracts", () => {
  it("strict-parses and round-trips an event", () => {
    const parsed = EventEnvelopeSchema.parse(workflowStartedEvent());
    expect(EventEnvelopeSchema.parse(JSON.parse(canonicalizeJsonJcs(parsed)) as unknown)).toEqual(
      parsed,
    );
  });

  it("rejects version jumps and unknown events", () => {
    expect(
      EventEnvelopeSchema.safeParse({ ...workflowStartedEvent(), stateVersionAfter: 2 }).success,
    ).toBe(false);
    expect(
      parseEventEnvelope({
        ...workflowStartedEvent(),
        event: { type: "UNTRUSTED_EVENT" },
      }),
    ).toMatchObject({ success: false, error: { code: "UNKNOWN_EVENT" } });
  });

  it("round-trips every Phase A event discriminator", () => {
    const review = {
      reviewType: "SPEC_APPROVAL",
      allowedDecisions: ["APPROVE", "REQUEST_CHANGES"],
      binding: { taskId: TASK_ID, reviewId: REVIEW_ID, stateVersion: 1, specDigest: DIGEST },
    };
    const events = [
      workflowStartedEvent(),
      {
        ...workflowStartedEvent(),
        eventId: EVENT_ID_2,
        stateVersionBefore: 1,
        stateVersionAfter: 2,
        event: {
          type: "REVIEW_REQUESTED",
          reviewId: REVIEW_ID,
          review,
          requestedBy: { type: "AGENT", id: "rtl-engineer" },
        },
      },
      {
        ...workflowStartedEvent(),
        eventId: "evt_123e4567-e89b-42d3-a456-426614174002",
        stateVersionBefore: 2,
        stateVersionAfter: 3,
        event: {
          type: "REVIEW_DECISION_RECORDED",
          reviewId: REVIEW_ID,
          decision: "APPROVE",
          decidedBy: { type: "USER", id: "local:user" },
        },
      },
    ];
    for (const event of events) {
      expect(EventEnvelopeSchema.parse(JSON.parse(JSON.stringify(event)) as unknown)).toEqual(
        event,
      );
    }
  });

  it("validates an event array as one atomic command batch", () => {
    const first = workflowStartedEvent();
    const second = { ...first, eventId: EVENT_ID_2, eventIndex: 1 };
    const valid = {
      schemaVersion: 1,
      ok: true,
      taskId: TASK_ID,
      stateVersion: 1,
      events: [first, second],
    };
    expect(CommandSuccessSchema.safeParse(valid).success).toBe(true);
    expect(
      CommandSuccessSchema.safeParse({
        ...valid,
        events: [first, { ...second, taskId: OTHER_TASK_ID }],
      }).success,
    ).toBe(false);
    expect(
      CommandSuccessSchema.safeParse({
        ...valid,
        events: [first, { ...second, eventIndex: 2 }],
      }).success,
    ).toBe(false);
    expect(
      CommandSuccessSchema.safeParse({
        ...valid,
        events: [first, { ...second, occurredAt: "2026-07-15T03:21:46.123Z" }],
      }).success,
    ).toBe(false);
  });
});
