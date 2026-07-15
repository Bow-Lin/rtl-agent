import type { CommandId, EventEnvelope, EventId } from "@rtl-agent/contracts";

import type { DomainError } from "./errors.js";
import { integrityError } from "./errors.js";
import { evolveBatch, validateEventBatch } from "./evolve.js";
import { err, ok } from "./result.js";
import type { Result } from "./result.js";
import type { DomainState } from "./state.js";

export function replay(
  batches: readonly (readonly EventEnvelope[])[],
): Result<DomainState, DomainError> {
  if (batches.length === 0) {
    return err(integrityError("INVALID_EVENT_SEQUENCE", "EMPTY_EVENT_STREAM"));
  }

  const commandIds = new Set<CommandId>();
  const eventIds = new Set<EventId>();
  let state: DomainState | null = null;

  for (const [batchIndex, events] of batches.entries()) {
    const batchResult = validateEventBatch(events);
    if (!batchResult.ok) return batchResult;
    const batch = batchResult.value;
    const commandId = batch[0].commandId;
    if (commandIds.has(commandId)) {
      return err(integrityError("INVALID_EVENT_SEQUENCE", "DUPLICATE_COMMAND_ID", batchIndex));
    }
    commandIds.add(commandId);
    for (const event of batch) {
      if (eventIds.has(event.eventId)) {
        return err(integrityError("INVALID_EVENT_SEQUENCE", "DUPLICATE_EVENT_ID", batchIndex));
      }
      eventIds.add(event.eventId);
    }

    const evolved = evolveBatch(state, batch);
    if (!evolved.ok) return evolved;
    state = evolved.value;
  }

  if (state === null) {
    return err(integrityError("INVALID_EVENT_SEQUENCE", "EMPTY_EVENT_STREAM"));
  }
  return ok(state);
}
