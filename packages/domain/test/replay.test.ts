import type { EventEnvelope } from "@rtl-agent/contracts";
import { describe, expect, it } from "vitest";

import { replay } from "../src/index.js";
import {
  EVENT_IDS,
  TIMES,
  decisionContext,
  recordDecisionCommand,
  requestReviewCommand,
  startCommand,
  unwrapDecision,
} from "./fixtures.js";

function completeHistory() {
  const start = unwrapDecision(null, startCommand(), decisionContext(EVENT_IDS[0], TIMES[0]));
  const request = unwrapDecision(
    start.nextState,
    requestReviewCommand(),
    decisionContext(EVENT_IDS[1], TIMES[1]),
  );
  const decision = unwrapDecision(
    request.nextState,
    recordDecisionCommand("APPROVE"),
    decisionContext(EVENT_IDS[2], TIMES[2]),
  );
  return {
    start,
    request,
    decision,
    batches: [start.eventBatch, request.eventBatch, decision.eventBatch],
  };
}

describe("replay", () => {
  it("reconstructs the final state from complete ordered batches", () => {
    const history = completeHistory();
    expect(replay(history.batches)).toEqual({ ok: true, value: history.decision.nextState });
    expect(replay(history.batches)).toEqual(replay(history.batches));
  });

  it("rejects an empty stream and reordered or gapped batches", () => {
    expect(replay([])).toMatchObject({
      ok: false,
      error: { code: "INVALID_EVENT_SEQUENCE", reason: "EMPTY_EVENT_STREAM" },
    });
    const history = completeHistory();
    expect(replay([history.request.eventBatch, history.start.eventBatch])).toMatchObject({
      ok: false,
      error: { code: "INVALID_EVENT_SEQUENCE" },
    });

    const gapped = [
      { ...history.request.eventBatch[0], stateVersionBefore: 3, stateVersionAfter: 4 },
    ] as EventEnvelope[];
    expect(replay([history.start.eventBatch, gapped])).toMatchObject({
      ok: false,
      error: { code: "INVALID_EVENT_SEQUENCE", reason: "STATE_VERSION_GAP" },
    });
  });

  it("rejects duplicate command IDs and event IDs across batches", () => {
    const history = completeHistory();
    const duplicateCommand = [
      { ...history.request.eventBatch[0], commandId: history.start.eventBatch[0].commandId },
    ] as EventEnvelope[];
    expect(replay([history.start.eventBatch, duplicateCommand])).toMatchObject({
      ok: false,
      error: { code: "INVALID_EVENT_SEQUENCE", reason: "DUPLICATE_COMMAND_ID" },
    });

    const duplicateEvent = [
      { ...history.request.eventBatch[0], eventId: history.start.eventBatch[0].eventId },
    ] as EventEnvelope[];
    expect(replay([history.start.eventBatch, duplicateEvent])).toMatchObject({
      ok: false,
      error: { code: "INVALID_EVENT_SEQUENCE", reason: "DUPLICATE_EVENT_ID" },
    });
  });
});
