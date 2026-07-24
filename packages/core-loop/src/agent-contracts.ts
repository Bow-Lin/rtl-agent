import { LogicalPathSchema, SchemaVersionSchema, Sha256DigestSchema } from "@rtl-agent/contracts";
import { z } from "zod";

import { CapturedOutputSchema, RunIdSchema, ToolVersionSchema } from "./contracts.js";

const boundedToken = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9._:/+-]+$/);
const eventToken = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9._+-]+$/);

export const OpenCodeEventCategorySchema = z.enum([
  "SESSION",
  "MESSAGE",
  "TOOL_CALL",
  "TOOL_RESULT",
  "ERROR",
  "UNKNOWN",
]);

export const OpenCodeEventSummarySchema = z.strictObject({
  sequence: z.int().nonnegative(),
  category: OpenCodeEventCategorySchema,
  toolName: eventToken.optional(),
  status: eventToken.optional(),
  byteLength: z.int().nonnegative(),
  truncated: z.boolean(),
});

export const OpenCodeEventStreamSummarySchema = z.strictObject({
  originalByteLength: z.int().nonnegative(),
  truncated: z.boolean(),
  events: z.array(OpenCodeEventSummarySchema).max(256),
});

export const AgentWorkspaceViolationSchema = z.strictObject({
  reason: z.enum([
    "PROTECTED_PATH_CHANGED",
    "DISALLOWED_RTL_EXTENSION",
    "RTL_FILE_LIMIT_EXCEEDED",
    "RTL_FILE_TOO_LARGE",
    "RTL_TOTAL_BYTES_EXCEEDED",
    "NO_COMPILE_UNIT",
    "WORKSPACE_UNSCANNABLE",
    "WORKSPACE_UNSTABLE",
  ]),
  path: LogicalPathSchema.optional(),
  changeKind: z.enum(["ADDED", "MODIFIED", "DELETED"]).optional(),
  message: z.string().min(1).max(512),
});

export const AgentTurnOutcomeSchema = z.enum([
  "RTL_CHANGED",
  "NO_RTL_CHANGE",
  "AGENT_PROCESS_ERROR",
  "AGENT_TIMEOUT",
  "POLICY_VIOLATION",
]);

const agentTurnCommonShape = {
  schemaVersion: SchemaVersionSchema,
  runId: RunIdSchema,
  attempt: z.int().positive().max(3),
  outcome: AgentTurnOutcomeSchema,
  workspaceUsableForCompile: z.boolean(),
  rtlChanged: z.boolean(),
  beforeManifestDigest: Sha256DigestSchema,
  afterManifestDigest: Sha256DigestSchema.nullable(),
  exitCode: z.int().nullable(),
  timedOut: z.boolean(),
  durationMs: z.int().nonnegative(),
  model: boundedToken,
  experimentConfigDigest: Sha256DigestSchema,
  violations: z.array(AgentWorkspaceViolationSchema).max(512),
  eventStream: OpenCodeEventStreamSummarySchema,
  stderr: CapturedOutputSchema,
  evidencePath: LogicalPathSchema,
} as const;

function refineAgentTurnOutcome(
  value: {
    readonly outcome: z.infer<typeof AgentTurnOutcomeSchema>;
    readonly workspaceUsableForCompile: boolean;
    readonly rtlChanged: boolean;
    readonly afterManifestDigest: string | null;
    readonly exitCode: number | null;
    readonly timedOut: boolean;
    readonly violations: readonly z.infer<typeof AgentWorkspaceViolationSchema>[];
  },
  context: z.RefinementCtx,
): void {
  const require = (condition: boolean, path: string, message: string): void => {
    if (!condition) context.addIssue({ code: "custom", path: [path], message });
  };
  if (value.outcome === "RTL_CHANGED") {
    require(value.workspaceUsableForCompile, "workspaceUsableForCompile", "RTL_CHANGED must be usable");
    require(value.rtlChanged, "rtlChanged", "RTL_CHANGED requires an RTL change");
    require(value.exitCode === 0, "exitCode", "RTL_CHANGED requires exit code 0");
    require(!value.timedOut, "timedOut", "RTL_CHANGED cannot be timed out");
    require(value.afterManifestDigest !==
      null, "afterManifestDigest", "RTL_CHANGED requires an after manifest");
    require(value.violations.length === 0, "violations", "RTL_CHANGED cannot contain violations");
  } else {
    require(!value.workspaceUsableForCompile, "workspaceUsableForCompile", "Only RTL_CHANGED may be usable for compile");
  }
  if (value.outcome === "NO_RTL_CHANGE") {
    require(!value.rtlChanged, "rtlChanged", "NO_RTL_CHANGE cannot report an RTL change");
    require(value.exitCode === 0, "exitCode", "NO_RTL_CHANGE requires exit code 0");
    require(!value.timedOut, "timedOut", "NO_RTL_CHANGE cannot be timed out");
  }
  if (value.outcome === "AGENT_TIMEOUT") {
    require(value.timedOut, "timedOut", "AGENT_TIMEOUT requires timedOut=true");
  }
  if (value.outcome === "POLICY_VIOLATION") {
    require(value.violations.length > 0, "violations", "POLICY_VIOLATION requires evidence");
  }
}

export const OpenCodeAgentTurnResultSchema = z
  .strictObject({
    ...agentTurnCommonShape,
    openCodeVersion: ToolVersionSchema,
    variant: boundedToken.optional(),
    resolvedConfigDigest: Sha256DigestSchema,
    resolvedAgentPermissionDigest: Sha256DigestSchema,
    agentFileDigest: Sha256DigestSchema,
    skillFileDigest: Sha256DigestSchema,
    guidanceFileDigest: Sha256DigestSchema.optional(),
  })
  .superRefine(refineAgentTurnOutcome);

export const PiAgentTurnResultSchema = z
  .strictObject({
    ...agentTurnCommonShape,
    piVersion: ToolVersionSchema,
    provider: boundedToken,
    sessionMode: z.literal("EPHEMERAL"),
    enabledTools: z.tuple([z.literal("read"), z.literal("write"), z.literal("edit")]),
    resolvedConfigDigest: Sha256DigestSchema,
    isolationConfigDigest: Sha256DigestSchema,
    toolPolicyDigest: Sha256DigestSchema,
    extensionFileDigest: Sha256DigestSchema,
    guidanceFileDigest: Sha256DigestSchema,
    localWarnings: z
      .array(
        z.strictObject({
          code: z.literal("PROVIDER_CAPTURE_CLEANUP_FAILED"),
          message: z.literal(
            "Pi provider capture temporary directory could not be removed after bounded retries",
          ),
        }),
      )
      .max(1)
      .optional(),
  })
  .superRefine(refineAgentTurnOutcome);

export const AgentTurnResultSchema = z.union([
  OpenCodeAgentTurnResultSchema,
  PiAgentTurnResultSchema,
]);

export const OpenCodeCapabilitySchema = z.strictObject({
  schemaVersion: SchemaVersionSchema,
  openCodeVersion: ToolVersionSchema,
  model: boundedToken,
  variant: boundedToken.optional(),
  pureMode: z.literal(true),
  agentName: z.literal("rtl-core-loop"),
  requiredFlags: z.array(boundedToken).min(1).max(32),
  resolvedConfigDigest: Sha256DigestSchema,
  resolvedAgentPermissionDigest: Sha256DigestSchema,
  agentFileDigest: Sha256DigestSchema,
  skillFileDigest: Sha256DigestSchema,
  guidanceFileDigest: Sha256DigestSchema.optional(),
  experimentConfigDigest: Sha256DigestSchema,
});

export const PiCapabilitySchema = z.strictObject({
  schemaVersion: SchemaVersionSchema,
  piVersion: ToolVersionSchema,
  provider: boundedToken,
  model: boundedToken,
  sessionMode: z.literal("EPHEMERAL"),
  agentName: z.literal("rtl-core-loop"),
  requiredFlags: z.array(boundedToken).min(1).max(32),
  enabledTools: z.tuple([z.literal("read"), z.literal("write"), z.literal("edit")]),
  resolvedConfigDigest: Sha256DigestSchema,
  isolationConfigDigest: Sha256DigestSchema,
  toolPolicyDigest: Sha256DigestSchema,
  extensionFileDigest: Sha256DigestSchema,
  guidanceFileDigest: Sha256DigestSchema,
  experimentConfigDigest: Sha256DigestSchema,
});

export const AgentCapabilitySchema = z.union([OpenCodeCapabilitySchema, PiCapabilitySchema]);

export type OpenCodeEventCategory = z.infer<typeof OpenCodeEventCategorySchema>;
export type OpenCodeEventSummary = z.infer<typeof OpenCodeEventSummarySchema>;
export type OpenCodeEventStreamSummary = z.infer<typeof OpenCodeEventStreamSummarySchema>;
export type AgentWorkspaceViolation = z.infer<typeof AgentWorkspaceViolationSchema>;
export type AgentTurnOutcome = z.infer<typeof AgentTurnOutcomeSchema>;
export type AgentTurnResult = z.infer<typeof AgentTurnResultSchema>;
export type OpenCodeCapability = z.infer<typeof OpenCodeCapabilitySchema>;
export type PiCapability = z.infer<typeof PiCapabilitySchema>;
export type AgentCapability = z.infer<typeof AgentCapabilitySchema>;
