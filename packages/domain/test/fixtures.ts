import {
  CommandEnvelopeSchema,
  CommandIdSchema,
  CorrelationIdSchema,
  EventIdSchema,
  IsoTimestampSchema,
  ReviewIdSchema,
  Sha256DigestSchema,
  TaskIdSchema,
  WorkspaceIdSchema,
} from "@rtl-agent/contracts";
import type {
  Actor,
  CommandEnvelope,
  EventId,
  IsoTimestamp,
  ReviewDecision,
} from "@rtl-agent/contracts";

import { decide } from "../src/index.js";
import type { Decision, DecisionContext, DomainState } from "../src/index.js";

export const TASK_ID = TaskIdSchema.parse("task_123e4567-e89b-42d3-a456-426614174000");
export const OTHER_TASK_ID = TaskIdSchema.parse("task_123e4567-e89b-42d3-a456-426614174001");
export const WORKSPACE_ID = WorkspaceIdSchema.parse("ws_123e4567-e89b-42d3-a456-426614174000");
export const REVIEW_ID = ReviewIdSchema.parse("review_123e4567-e89b-42d3-a456-426614174000");
export const OTHER_REVIEW_ID = ReviewIdSchema.parse("review_123e4567-e89b-42d3-a456-426614174001");
export const COMMAND_IDS = [
  CommandIdSchema.parse("cmd_123e4567-e89b-42d3-a456-426614174000"),
  CommandIdSchema.parse("cmd_123e4567-e89b-42d3-a456-426614174001"),
  CommandIdSchema.parse("cmd_123e4567-e89b-42d3-a456-426614174002"),
] as const;
export const EVENT_IDS = [
  EventIdSchema.parse("evt_123e4567-e89b-42d3-a456-426614174000"),
  EventIdSchema.parse("evt_123e4567-e89b-42d3-a456-426614174001"),
  EventIdSchema.parse("evt_123e4567-e89b-42d3-a456-426614174002"),
  EventIdSchema.parse("evt_123e4567-e89b-42d3-a456-426614174003"),
  EventIdSchema.parse("evt_123e4567-e89b-42d3-a456-426614174004"),
] as const;
export const TIMES = [
  IsoTimestampSchema.parse("2026-07-15T04:00:00.000Z"),
  IsoTimestampSchema.parse("2026-07-15T04:01:00.000Z"),
  IsoTimestampSchema.parse("2026-07-15T04:02:00.000Z"),
  IsoTimestampSchema.parse("2026-07-15T04:03:00.000Z"),
] as const;
export const CORRELATION_ID = CorrelationIdSchema.parse(
  "corr_123e4567-e89b-42d3-a456-426614174000",
);
export const SPEC_DIGEST = Sha256DigestSchema.parse(`sha256:${"a".repeat(64)}`);

const AGENT: Actor = { type: "AGENT", id: "rtl-engineer" };
const USER: Actor = { type: "USER", id: "local:user" };

export function decisionContext(
  eventId: EventId = EVENT_IDS[0],
  occurredAt: IsoTimestamp = TIMES[0],
): DecisionContext {
  return { occurredAt, eventIds: [eventId] };
}

export function startCommand(actor: Actor = AGENT): CommandEnvelope {
  return CommandEnvelopeSchema.parse({
    schemaVersion: 1,
    commandId: COMMAND_IDS[0],
    idempotencyKey: "start:fixture",
    correlationId: CORRELATION_ID,
    expectedStateVersion: 0,
    requestedAt: TIMES[0],
    actor,
    command: {
      type: "START_WORKFLOW",
      taskId: TASK_ID,
      workspaceId: WORKSPACE_ID,
      specPath: "spec/design.md",
    },
  });
}

export function requestReviewCommand(actor: Actor = AGENT): CommandEnvelope {
  return CommandEnvelopeSchema.parse({
    schemaVersion: 1,
    commandId: COMMAND_IDS[1],
    idempotencyKey: "review:fixture",
    correlationId: CORRELATION_ID,
    expectedStateVersion: 1,
    requestedAt: TIMES[1],
    actor,
    command: {
      type: "REQUEST_REVIEW",
      taskId: TASK_ID,
      reviewId: REVIEW_ID,
      reviewType: "SPEC_APPROVAL",
      allowedDecisions: ["APPROVE", "REJECT", "REQUEST_CHANGES"],
      binding: {
        taskId: TASK_ID,
        reviewId: REVIEW_ID,
        stateVersion: 1,
        specDigest: SPEC_DIGEST,
      },
    },
  });
}

export function recordDecisionCommand(
  decision: ReviewDecision,
  actor: Actor = USER,
): CommandEnvelope {
  return CommandEnvelopeSchema.parse({
    schemaVersion: 1,
    commandId: COMMAND_IDS[2],
    idempotencyKey: `decision:${decision.toLowerCase()}`,
    correlationId: CORRELATION_ID,
    expectedStateVersion: 2,
    requestedAt: TIMES[2],
    actor,
    command: {
      type: "RECORD_REVIEW_DECISION",
      taskId: TASK_ID,
      reviewId: REVIEW_ID,
      decision,
    },
  });
}

export function unwrapDecision(
  state: DomainState | null,
  command: CommandEnvelope,
  context: DecisionContext,
): Decision {
  const result = decide(state, command, context);
  if (!result.ok) throw new Error(`Fixture decision failed: ${result.error.code}`);
  return result.value;
}

export function startedState(): DomainState {
  return unwrapDecision(null, startCommand(), decisionContext(EVENT_IDS[0], TIMES[0])).nextState;
}

export function waitingState(): DomainState {
  return unwrapDecision(
    startedState(),
    requestReviewCommand(),
    decisionContext(EVENT_IDS[1], TIMES[1]),
  ).nextState;
}

export function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}
