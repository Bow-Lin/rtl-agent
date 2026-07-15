import { z } from "zod";

import { ErrorEnvelopeSchema } from "./error.js";
import { EventEnvelopeSchema } from "./event.js";
import { StateVersionSchema, TaskIdSchema } from "./identifiers.js";
import { SchemaVersionSchema } from "./version.js";

export const MAX_EVENTS_PER_COMMAND = 100;

export const CommandSuccessSchema = z
  .strictObject({
    schemaVersion: SchemaVersionSchema,
    ok: z.literal(true),
    taskId: TaskIdSchema,
    stateVersion: StateVersionSchema,
    events: z.array(EventEnvelopeSchema).min(1).max(MAX_EVENTS_PER_COMMAND),
  })
  .superRefine((value, context) => {
    const first = value.events[0];
    if (first === undefined) return;

    const eventIds = new Set<string>();
    value.events.forEach((event, index) => {
      if (event.eventIndex !== index) {
        context.addIssue({
          code: "custom",
          path: ["events", index, "eventIndex"],
          message: "Event indexes must be contiguous and start at zero",
        });
      }
      if (event.taskId !== value.taskId) {
        context.addIssue({
          code: "custom",
          path: ["events", index, "taskId"],
          message: "All events must match the result taskId",
        });
      }
      if (
        event.commandId !== first.commandId ||
        event.correlationId !== first.correlationId ||
        event.stateVersionBefore !== first.stateVersionBefore ||
        event.stateVersionAfter !== first.stateVersionAfter ||
        event.occurredAt !== first.occurredAt
      ) {
        context.addIssue({
          code: "custom",
          path: ["events", index],
          message: "A command result must contain one internally consistent event batch",
        });
      }
      if (eventIds.has(event.eventId)) {
        context.addIssue({
          code: "custom",
          path: ["events", index, "eventId"],
          message: "Event IDs must be unique within a command batch",
        });
      }
      eventIds.add(event.eventId);
    });

    if (first.stateVersionAfter !== value.stateVersion) {
      context.addIssue({
        code: "custom",
        path: ["stateVersion"],
        message: "Result stateVersion must match the event batch target version",
      });
    }
  });

export const CommandResultSchema = z.union([CommandSuccessSchema, ErrorEnvelopeSchema]);

export type CommandSuccess = z.infer<typeof CommandSuccessSchema>;
export type CommandResult = z.infer<typeof CommandResultSchema>;
