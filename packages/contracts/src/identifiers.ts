import { z } from "zod";

const LOWERCASE_UUID_V4 = "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";

function prefixedUuid<const Prefix extends string, const Brand extends string>(
  prefix: Prefix,
  brand: Brand,
) {
  return z
    .string()
    .regex(new RegExp(`^${prefix}${LOWERCASE_UUID_V4}$`), `Invalid ${brand}`)
    .brand<Brand>();
}

export const TaskIdSchema = prefixedUuid("task_", "TaskId");
export const CommandIdSchema = prefixedUuid("cmd_", "CommandId");
export const EventIdSchema = prefixedUuid("evt_", "EventId");
export const ReviewIdSchema = prefixedUuid("review_", "ReviewId");
export const WorkspaceIdSchema = prefixedUuid("ws_", "WorkspaceId");
export const CorrelationIdSchema = prefixedUuid("corr_", "CorrelationId");

export const IdempotencyKeySchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9._:-]+$/)
  .brand<"IdempotencyKey">();

export const StateVersionSchema = z.int().nonnegative().brand<"StateVersion">();

export const IsoTimestampSchema = z.iso
  .datetime({ precision: 3 })
  .refine((value) => {
    const time = Date.parse(value);
    return Number.isFinite(time) && new Date(time).toISOString() === value;
  }, "Timestamp must be canonical UTC with exactly three millisecond digits")
  .brand<"IsoTimestamp">();

export const Sha256DigestSchema = z
  .string()
  .regex(/^sha256:[0-9a-f]{64}$/)
  .brand<"Sha256Digest">();

export type TaskId = z.infer<typeof TaskIdSchema>;
export type CommandId = z.infer<typeof CommandIdSchema>;
export type EventId = z.infer<typeof EventIdSchema>;
export type ReviewId = z.infer<typeof ReviewIdSchema>;
export type WorkspaceId = z.infer<typeof WorkspaceIdSchema>;
export type CorrelationId = z.infer<typeof CorrelationIdSchema>;
export type IdempotencyKey = z.infer<typeof IdempotencyKeySchema>;
export type StateVersion = z.infer<typeof StateVersionSchema>;
export type IsoTimestamp = z.infer<typeof IsoTimestampSchema>;
export type Sha256Digest = z.infer<typeof Sha256DigestSchema>;
