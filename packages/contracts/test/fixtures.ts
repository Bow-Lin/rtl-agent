export const TASK_ID = "task_123e4567-e89b-42d3-a456-426614174000";
export const OTHER_TASK_ID = "task_123e4567-e89b-42d3-a456-426614174001";
export const COMMAND_ID = "cmd_123e4567-e89b-42d3-a456-426614174000";
export const EVENT_ID = "evt_123e4567-e89b-42d3-a456-426614174000";
export const EVENT_ID_2 = "evt_123e4567-e89b-42d3-a456-426614174001";
export const REVIEW_ID = "review_123e4567-e89b-42d3-a456-426614174000";
export const WORKSPACE_ID = "ws_123e4567-e89b-42d3-a456-426614174000";
export const CORRELATION_ID = "corr_123e4567-e89b-42d3-a456-426614174000";
export const TIMESTAMP = "2026-07-15T03:21:45.123Z";
export const DIGEST = `sha256:${"a".repeat(64)}`;

export function startWorkflowEnvelope() {
  return {
    schemaVersion: 1,
    commandId: COMMAND_ID,
    idempotencyKey: "start:fixture-1",
    correlationId: CORRELATION_ID,
    expectedStateVersion: 0,
    requestedAt: TIMESTAMP,
    actor: { type: "AGENT", id: "rtl-engineer" },
    command: {
      type: "START_WORKFLOW",
      taskId: TASK_ID,
      workspaceId: WORKSPACE_ID,
      specPath: "spec/design.md",
    },
  };
}

export function workflowStartedEvent() {
  return {
    schemaVersion: 1,
    eventId: EVENT_ID,
    taskId: TASK_ID,
    commandId: COMMAND_ID,
    correlationId: CORRELATION_ID,
    eventIndex: 0,
    occurredAt: TIMESTAMP,
    stateVersionBefore: 0,
    stateVersionAfter: 1,
    event: {
      type: "WORKFLOW_STARTED",
      workspaceId: WORKSPACE_ID,
      specPath: "spec/design.md",
    },
  };
}
