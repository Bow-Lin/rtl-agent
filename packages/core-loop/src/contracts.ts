import {
  IsoTimestampSchema,
  LogicalPathSchema,
  SchemaVersionSchema,
  Sha256DigestSchema,
} from "@rtl-agent/contracts";
import { z } from "zod";

import { containsHostAbsolutePath } from "./sanitization.js";

const stableName = <const Brand extends string>(brand: Brand, maximum = 128) =>
  z
    .string()
    .min(1)
    .max(maximum)
    .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/, `Invalid ${brand}`)
    .brand<Brand>();

const sortedUnique = <T extends string>(values: readonly T[]): boolean =>
  values.every((value, index) => index === 0 || values[index - 1]! < value);

export const FixtureIdSchema = stableName("FixtureId", 64);
export const DatasetIdSchema = stableName("DatasetId");
export const DatasetVersionSchema = stableName("DatasetVersion");
export const DatasetSplitSchema = stableName("DatasetSplit", 64);
export const DatasetCaseIdSchema = z
  .string()
  .min(1)
  .max(256)
  .refine(
    (value) =>
      !/^[A-Za-z]:[\\/]/.test(value) &&
      !value.startsWith("/") &&
      !value.startsWith("\\") &&
      ![...value].some((character) => character.charCodeAt(0) < 0x20),
    "Dataset case ID must not be a host path or contain control characters",
  )
  .brand<"DatasetCaseId">();
export const AdapterIdSchema = stableName("AdapterId");
export const AdapterVersionSchema = stableName("AdapterVersion", 64);
export const NormalizationVersionSchema = stableName("NormalizationVersion", 64);
export const CoreLoopProfileIdSchema = stableName("CoreLoopProfileId");
export const CompilerProfileIdSchema = stableName("CompilerProfileId");
export const ToolVersionSchema = z.string().min(1).max(128).brand<"ToolVersion">();
export const RunIdSchema = z
  .string()
  .regex(/^run_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  .brand<"RunId">();

export const SystemVerilogIdentifierSchema = z
  .string()
  .max(128)
  .regex(/^[A-Za-z_][A-Za-z0-9_$]*$/)
  .brand<"SystemVerilogIdentifier">();

export const FixtureIdentitySchema = z.strictObject({
  datasetId: DatasetIdSchema,
  datasetVersion: DatasetVersionSchema,
  split: DatasetSplitSchema,
  caseId: DatasetCaseIdSchema,
});

export const DatasetLicenseSchema = z.strictObject({
  name: z.string().min(1).max(256),
  spdxId: z.string().min(1).max(64).optional(),
  reference: z.url().max(2048).optional(),
});

export const DatasetAdapterSchema = z.strictObject({
  adapterId: AdapterIdSchema,
  adapterVersion: AdapterVersionSchema,
  normalizationVersion: NormalizationVersionSchema,
});

export const DatasetDescriptorSchema = z
  .strictObject({
    schemaVersion: SchemaVersionSchema,
    datasetId: DatasetIdSchema,
    datasetVersion: DatasetVersionSchema,
    datasetSourceDigest: Sha256DigestSchema.optional(),
    license: DatasetLicenseSchema,
    adapter: DatasetAdapterSchema,
    splits: z.array(DatasetSplitSchema).min(1).max(64),
  })
  .superRefine((value, context) => {
    if (!sortedUnique(value.splits)) {
      context.addIssue({
        code: "custom",
        path: ["splits"],
        message: "Dataset splits must be sorted and unique",
      });
    }
  });

export const DatasetSelectionSchema = z
  .strictObject({
    schemaVersion: SchemaVersionSchema,
    split: DatasetSplitSchema,
    caseIds: z.array(DatasetCaseIdSchema).min(1).max(10_000).optional(),
    maximumCases: z.int().positive().max(10_000).optional(),
  })
  .superRefine((value, context) => {
    if (value.caseIds !== undefined && !sortedUnique(value.caseIds)) {
      context.addIssue({
        code: "custom",
        path: ["caseIds"],
        message: "Selected case IDs must be sorted and unique",
      });
    }
  });

export const FixtureCaseRefSchema = z.strictObject({
  schemaVersion: SchemaVersionSchema,
  fixtureId: FixtureIdSchema,
  identity: FixtureIdentitySchema,
  caseSourceDigest: Sha256DigestSchema,
});

const fixtureTag = stableName("FixtureTag", 64);
const fixtureTags = z
  .array(fixtureTag)
  .max(32)
  .refine(sortedUnique, "Fixture tags must be sorted and unique");

const materializationCommon = {
  schemaVersion: SchemaVersionSchema,
  fixtureId: FixtureIdSchema,
  identity: FixtureIdentitySchema,
  caseSourceDigest: Sha256DigestSchema,
  specPath: LogicalPathSchema,
  topModule: SystemVerilogIdentifierSchema,
  tags: fixtureTags,
} as const;

export const FixtureMaterializationSchema = z.discriminatedUnion("category", [
  z.strictObject({
    ...materializationCommon,
    category: z.literal("BLANK_GENERATION"),
  }),
  z.strictObject({
    ...materializationCommon,
    category: z.literal("SEEDED_COMPILE_REPAIR"),
    starterRtlRoot: LogicalPathSchema,
  }),
]);

export const DatasetProvenanceSchema = z.strictObject({
  identity: FixtureIdentitySchema,
  datasetSourceDigest: Sha256DigestSchema.optional(),
  caseSourceDigest: Sha256DigestSchema,
  license: DatasetLicenseSchema,
  adapter: DatasetAdapterSchema,
});

const normalizedFixtureCommon = {
  schemaVersion: SchemaVersionSchema,
  fixtureId: FixtureIdSchema,
  provenance: DatasetProvenanceSchema,
  specPath: z.literal("spec.md"),
  workspaceRtlRoot: z.literal("rtl"),
  topModule: SystemVerilogIdentifierSchema,
  tags: fixtureTags,
  normalizedFixtureDigest: Sha256DigestSchema,
} as const;

export const NormalizedFixtureSchema = z.discriminatedUnion("category", [
  z.strictObject({
    ...normalizedFixtureCommon,
    category: z.literal("BLANK_GENERATION"),
  }),
  z.strictObject({
    ...normalizedFixtureCommon,
    category: z.literal("SEEDED_COMPILE_REPAIR"),
    starterRtlRoot: z.literal("rtl"),
    starterRtlDigest: Sha256DigestSchema,
  }),
]);

export const CoreLoopRunProfileSchema = z.strictObject({
  schemaVersion: SchemaVersionSchema,
  profileId: CoreLoopProfileIdSchema,
  compilerProfileId: CompilerProfileIdSchema,
  maxAttempts: z.int().min(1).max(3),
  stdoutLimitBytes: z.int().positive().max(1_048_576),
  stderrLimitBytes: z.int().positive().max(1_048_576),
  maximumIssues: z.int().positive().max(500),
  issueMessageLimitBytes: z.int().positive().max(4096),
});

export const CreateRunRequestSchema = z.strictObject({
  schemaVersion: SchemaVersionSchema,
  caseRef: FixtureCaseRefSchema,
  profile: CoreLoopRunProfileSchema,
});

export const CapturedOutputSchema = z
  .strictObject({
    preview: z
      .string()
      .refine(
        (value) => Buffer.byteLength(value, "utf8") <= 1_048_576,
        "Captured output preview must not exceed 1048576 UTF-8 bytes",
      )
      .refine(
        (value) => !containsHostAbsolutePath(value),
        "Captured output preview must not contain host absolute paths",
      ),
    truncated: z.boolean(),
    originalByteLength: z.int().nonnegative(),
    artifactPath: LogicalPathSchema.optional(),
  })
  .superRefine((value, context) => {
    const previewBytes = Buffer.byteLength(value.preview, "utf8");
    if (value.truncated && value.originalByteLength <= previewBytes) {
      context.addIssue({
        code: "custom",
        path: ["originalByteLength"],
        message: "Captured output length and truncation metadata are inconsistent",
      });
    }
  });

export const CompileIssueSchema = z.strictObject({
  kind: z.enum(["ERROR", "WARNING", "NOTE"]),
  message: z.string().min(1).max(4096),
  path: LogicalPathSchema.optional(),
  line: z.int().positive().optional(),
  column: z.int().positive().optional(),
});

export const AgentAttemptInputSchema = z.strictObject({
  schemaVersion: SchemaVersionSchema,
  runId: RunIdSchema,
  attempt: z.int().positive().max(3),
  category: z.enum(["BLANK_GENERATION", "SEEDED_COMPILE_REPAIR"]),
  specPath: z.literal("spec.md"),
  workspaceRtlRoot: z.literal("rtl"),
  rtlSourceFiles: z
    .array(LogicalPathSchema)
    .max(256)
    .refine(sortedUnique, "RTL source files must be sorted and unique")
    .superRefine((sourceFiles, context) => {
      const collisionKeys = new Set<string>();
      sourceFiles.forEach((sourceFile, index) => {
        if (!sourceFile.startsWith("rtl/") || !/\.(?:sv|svh|v|vh)$/i.test(sourceFile)) {
          context.addIssue({
            code: "custom",
            path: [index],
            message: "RTL source files must use an allowed extension below rtl/",
          });
        }
        const key = sourceFile.normalize("NFC").toLowerCase();
        if (collisionKeys.has(key)) {
          context.addIssue({
            code: "custom",
            path: [index],
            message: "RTL source files must not collide after normalization and case folding",
          });
        }
        collisionKeys.add(key);
      });
    }),
  topModule: SystemVerilogIdentifierSchema,
  previousCompileResultPath: LogicalPathSchema.refine(
    (value) => value.startsWith("context/"),
    "Previous compile result must stay below context/",
  ).optional(),
});

export const CompileRequestSchema = z
  .strictObject({
    schemaVersion: SchemaVersionSchema,
    runId: RunIdSchema,
    attempt: z.int().nonnegative().max(3),
    compilerProfileId: CompilerProfileIdSchema,
    topModule: SystemVerilogIdentifierSchema,
    workspaceRtlRoot: z.literal("rtl"),
    sourceFiles: z.array(LogicalPathSchema).min(1).max(10_000),
    workspaceManifestDigest: Sha256DigestSchema,
  })
  .superRefine((value, context) => {
    if (!sortedUnique(value.sourceFiles)) {
      context.addIssue({
        code: "custom",
        path: ["sourceFiles"],
        message: "Source files must be sorted and unique",
      });
    }
    value.sourceFiles.forEach((sourceFile, index) => {
      if (!sourceFile.startsWith("rtl/") || !/\.(?:sv|v)$/.test(sourceFile)) {
        context.addIssue({
          code: "custom",
          path: ["sourceFiles", index],
          message: "Source files must be .sv or .v files below rtl/",
        });
      }
    });
    const collisionKeys = new Set<string>();
    value.sourceFiles.forEach((sourceFile, index) => {
      const key = sourceFile.normalize("NFC").toLowerCase();
      if (collisionKeys.has(key)) {
        context.addIssue({
          code: "custom",
          path: ["sourceFiles", index],
          message: "Source file paths must not collide after normalization and case folding",
        });
      }
      collisionKeys.add(key);
    });
  });

const compileResultCommon = {
  schemaVersion: SchemaVersionSchema,
  authoritative: z.literal(false),
  claim: z.literal("COMPILE_ONLY"),
  runId: RunIdSchema,
  attempt: z.int().nonnegative().max(3),
  compilerProfileId: CompilerProfileIdSchema,
  topModule: SystemVerilogIdentifierSchema,
  workspaceManifestDigest: Sha256DigestSchema,
  durationMs: z.int().nonnegative(),
  issues: z.array(CompileIssueSchema).max(500),
  stdout: CapturedOutputSchema,
  stderr: CapturedOutputSchema,
} as const;

export const CompileResultSchema = z.discriminatedUnion("status", [
  z.strictObject({
    ...compileResultCommon,
    status: z.literal("COMPILE_PASSED"),
    toolVersion: ToolVersionSchema,
    exitCode: z.literal(0),
  }),
  z.strictObject({
    ...compileResultCommon,
    status: z.literal("COMPILE_ERROR"),
    toolVersion: ToolVersionSchema,
    exitCode: z.int().refine((value) => value !== 0, "Compile errors require a non-zero exit code"),
  }),
  z.strictObject({
    ...compileResultCommon,
    status: z.literal("TIMEOUT"),
    toolVersion: ToolVersionSchema,
    exitCode: z.null(),
  }),
  z.strictObject({
    ...compileResultCommon,
    status: z.literal("TOOL_ERROR"),
    toolVersion: ToolVersionSchema.nullable(),
    exitCode: z.int().nullable(),
  }),
]);

const finalResultCommon = {
  schemaVersion: SchemaVersionSchema,
  authoritative: z.literal(false),
  claim: z.literal("COMPILE_ONLY"),
  runId: RunIdSchema,
  fixtureId: FixtureIdSchema,
  fixtureIdentity: FixtureIdentitySchema,
  normalizedFixtureDigest: Sha256DigestSchema,
  profileId: CoreLoopProfileIdSchema,
  compilerProfileId: CompilerProfileIdSchema,
  attemptCount: z.int().nonnegative().max(3),
  finalRtlManifestDigest: Sha256DigestSchema,
  startedAt: IsoTimestampSchema,
  completedAt: IsoTimestampSchema,
} as const;

const finalOutcomes = [
  "COMPILE_PASSED",
  "MAX_ATTEMPTS",
  "AGENT_FAILED",
  "TOOL_ERROR",
  "TIMEOUT",
  "POLICY_VIOLATION",
  "NO_RTL_CHANGE",
] as const;

export const FinalResultSchema = z
  .strictObject({
    ...finalResultCommon,
    outcome: z.enum(finalOutcomes),
    toolVersion: ToolVersionSchema.nullable(),
  })
  .superRefine((value, context) => {
    if (value.outcome !== "TOOL_ERROR" && value.toolVersion === null) {
      context.addIssue({
        code: "custom",
        path: ["toolVersion"],
        message: "Only tool-error final results may omit the tool version",
      });
    }
    if (value.completedAt < value.startedAt) {
      context.addIssue({
        code: "custom",
        path: ["completedAt"],
        message: "Final result completion time cannot precede its start time",
      });
    }
  });

export type FixtureId = z.infer<typeof FixtureIdSchema>;
export type DatasetId = z.infer<typeof DatasetIdSchema>;
export type DatasetVersion = z.infer<typeof DatasetVersionSchema>;
export type DatasetSplit = z.infer<typeof DatasetSplitSchema>;
export type DatasetCaseId = z.infer<typeof DatasetCaseIdSchema>;
export type DatasetLicense = z.infer<typeof DatasetLicenseSchema>;
export type DatasetAdapter = z.infer<typeof DatasetAdapterSchema>;
export type CoreLoopProfileId = z.infer<typeof CoreLoopProfileIdSchema>;
export type CompilerProfileId = z.infer<typeof CompilerProfileIdSchema>;
export type ToolVersion = z.infer<typeof ToolVersionSchema>;
export type FixtureIdentity = z.infer<typeof FixtureIdentitySchema>;
export type DatasetDescriptor = z.infer<typeof DatasetDescriptorSchema>;
export type DatasetSelection = z.infer<typeof DatasetSelectionSchema>;
export type FixtureCaseRef = z.infer<typeof FixtureCaseRefSchema>;
export type FixtureMaterialization = z.infer<typeof FixtureMaterializationSchema>;
export type DatasetProvenance = z.infer<typeof DatasetProvenanceSchema>;
export type NormalizedFixture = z.infer<typeof NormalizedFixtureSchema>;
export type CoreLoopRunProfile = z.infer<typeof CoreLoopRunProfileSchema>;
export type CreateRunRequest = z.infer<typeof CreateRunRequestSchema>;
export type AgentAttemptInput = z.infer<typeof AgentAttemptInputSchema>;
export type CompileRequest = z.infer<typeof CompileRequestSchema>;
export type CapturedOutput = z.infer<typeof CapturedOutputSchema>;
export type CompileIssue = z.infer<typeof CompileIssueSchema>;
export type CompileResult = z.infer<typeof CompileResultSchema>;
export type FinalResult = z.infer<typeof FinalResultSchema>;
export type RunId = z.infer<typeof RunIdSchema>;
export type RtlCompileStatus = CompileResult["status"];
export type RtlRunOutcome = FinalResult["outcome"];
