import { z } from "zod";

const AGENT_ACTOR_ID = /^[A-Za-z0-9._:-]+$/;
const USER_ACTOR_ID = /^[A-Za-z0-9._:@-]+$/;

export const ActorSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("AGENT"),
    id: z.string().min(1).max(128).regex(AGENT_ACTOR_ID),
  }),
  z.strictObject({
    type: z.literal("USER"),
    id: z.string().min(1).max(128).regex(USER_ACTOR_ID),
  }),
  z.strictObject({
    type: z.literal("SYSTEM"),
    id: z.literal("workflow-daemon"),
  }),
]);

export type Actor = z.infer<typeof ActorSchema>;
