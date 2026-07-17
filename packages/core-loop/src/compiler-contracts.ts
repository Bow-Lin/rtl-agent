import { Sha256DigestSchema } from "@rtl-agent/contracts";
import { z } from "zod";

import {
  CapturedOutputSchema,
  CompileRequestSchema,
  RunIdSchema,
  ToolVersionSchema,
} from "./contracts.js";
import { containsHostAbsolutePath } from "./sanitization.js";

export const FIXED_ICARUS_PROFILE_ID = "iverilog-systemverilog-2012-null-v1" as const;

const preparationCommon = {
  schemaVersion: z.literal(1),
  runId: RunIdSchema,
  attempt: z.int().nonnegative().max(3),
  compilerProfileId: z.literal(FIXED_ICARUS_PROFILE_ID),
  compilerInvoked: z.literal(false),
} as const;

const stablePreparationMessage = z
  .string()
  .min(1)
  .max(512)
  .refine(
    (value) => !containsHostAbsolutePath(value),
    "Preparation messages must not contain host absolute paths",
  );

export const CompilePreparationResultSchema = z.discriminatedUnion("status", [
  z.strictObject({
    ...preparationCommon,
    status: z.literal("READY"),
    request: CompileRequestSchema,
  }),
  z.strictObject({
    ...preparationCommon,
    status: z.literal("NO_RTL_SOURCE"),
    message: stablePreparationMessage,
  }),
  z.strictObject({
    ...preparationCommon,
    status: z.literal("UNSUPPORTED_INCLUDE_DIRECTIVE"),
    message: stablePreparationMessage,
  }),
  z.strictObject({
    ...preparationCommon,
    status: z.literal("SOURCE_POLICY_VIOLATION"),
    message: stablePreparationMessage,
  }),
]);

export const IcarusCapabilitySchema = z.strictObject({
  schemaVersion: z.literal(1),
  compilerProfileId: z.literal(FIXED_ICARUS_PROFILE_ID),
  executableProduct: z.literal("Icarus Verilog"),
  executableDigest: Sha256DigestSchema,
  toolVersion: ToolVersionSchema,
  profileDigest: Sha256DigestSchema,
  platform: z.enum(["win32", "linux", "darwin"]),
  probeStdout: CapturedOutputSchema,
  probeStderr: CapturedOutputSchema,
});

export const FixedIcarusProfileSchema = z.strictObject({
  schemaVersion: z.literal(1),
  compilerProfileId: z.literal(FIXED_ICARUS_PROFILE_ID),
  executableProduct: z.literal("Icarus Verilog"),
  expectedVersion: ToolVersionSchema,
  versionArguments: z.tuple([z.literal("-V")]),
  argvPrefix: z.tuple([z.literal("-g2012"), z.literal("-tnull")]),
  topSelectionFlag: z.literal("-s"),
  sourceOrdering: z.literal("ecmascript-utf16-ordinal"),
  includePolicy: z.literal("forbidden"),
  compilationUnitPolicy: z.literal("ordered-sources-single-unit"),
  environmentKeys: z.strictObject({
    win32: z.tuple([
      z.literal("ComSpec"),
      z.literal("Path"),
      z.literal("SystemRoot"),
      z.literal("TEMP"),
      z.literal("TMP"),
    ]),
    posix: z.tuple([z.literal("PATH"), z.literal("TMPDIR")]),
  }),
  timeoutMs: z.int().min(5_000).max(120_000),
  probeTimeoutMs: z.int().positive().max(30_000),
  terminationGraceMs: z.int().positive().max(5_000),
  stdoutLimitBytes: z.int().positive().max(1_048_576),
  stderrLimitBytes: z.int().positive().max(1_048_576),
  captureRetainedBytes: z.int().positive().max(1_048_576),
  maximumIssues: z.int().positive().max(500),
  issueMessageLimitBytes: z.int().positive().max(4096),
});

export type CompilePreparationResult = z.infer<typeof CompilePreparationResultSchema>;
export type IcarusCapability = z.infer<typeof IcarusCapabilitySchema>;
export type FixedIcarusProfile = z.infer<typeof FixedIcarusProfileSchema>;
