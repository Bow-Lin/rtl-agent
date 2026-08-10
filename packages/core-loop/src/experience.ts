import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import type { PiExperimentConfig } from "./pi-agent-adapter.js";
import { buildIsolatedPiEnvironment } from "./pi-agent-adapter.js";
import { FixtureCaseRefSchema, RunIdSchema } from "./contracts.js";
import type { FixtureCaseRef, RunId } from "./contracts.js";
import { CoreLoopException } from "./errors.js";
import { copyRegularTreeToEvidence, writeJsonReplacingAtomic } from "./evidence.js";
import { RunExecutionResultSchema } from "./evaluation-contracts.js";
import type { RunExecutionResult } from "./evaluation-contracts.js";
import { sha256Bytes, sha256Jcs } from "./filesystem.js";
import { createFileManifest } from "./manifest.js";
import { executeOpenCodeProcess, executeProbeCommand } from "./opencode-process.js";
import { FunctionalCaseResultSchema } from "./verilog-eval-simulation.js";
import type { FunctionalCaseResult } from "./verilog-eval-simulation.js";

export const ExperienceKindSchema = z.enum(["design_observation", "simulation_debug"]);

const ExperienceSourceSchema = z.strictObject({
  dataset: z.string().min(1).max(128),
  split: z.string().min(1).max(64),
  case_id: z.string().min(1).max(256),
});

const ExperienceFailureSchema = z.strictObject({
  stage: z.literal("functional_simulation"),
  failure_type: z.literal("output_mismatch"),
  symptom: z.string().min(10).max(1_000),
});

export const ExperienceRecordSchema = z
  .strictObject({
    schema_version: z.literal(1),
    kind: ExperienceKindSchema,
    source: ExperienceSourceSchema,
    outcome: z.enum(["first_functional_pass", "repaired_functional_pass"]),
    circuit_type: z.string().min(1).max(128).nullable(),
    language: z.enum(["SYSTEMVERILOG", "VERILOG", "UNKNOWN"]),
    tool: z.string().min(1).max(128).nullable(),
    failure: ExperienceFailureSchema.nullable(),
    diagnosis: z.string().min(30).max(1_500).nullable(),
    repair: z.string().min(30).max(1_500).nullable(),
    verification: z.string().min(20).max(1_000),
  })
  .superRefine((value, context) => {
    const isDebug = value.kind === "simulation_debug";
    if (
      isDebug !==
      (value.outcome === "repaired_functional_pass" &&
        value.failure !== null &&
        value.diagnosis !== null &&
        value.repair !== null)
    ) {
      context.addIssue({
        code: "custom",
        path: ["kind"],
        message: "simulation_debug requires a repaired pass with failure, diagnosis, and repair",
      });
    }
    if (
      !isDebug &&
      (value.outcome !== "first_functional_pass" ||
        value.failure !== null ||
        value.diagnosis !== null ||
        value.repair !== null)
    ) {
      context.addIssue({
        code: "custom",
        path: ["kind"],
        message: "design_observation must describe a first functional pass without a debug claim",
      });
    }
    const generatedText = [
      value.circuit_type,
      value.failure?.symptom,
      value.diagnosis,
      value.repair,
      value.verification,
    ]
      .filter((item): item is string => item !== null && item !== undefined)
      .join("\n");
    if (
      /REPLACE_ME|testbench|reference\.sv|golden\s+rtl|hidden\s+(?:reference|test)/iu.test(
        generatedText,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: [],
        message: "Experience contains forbidden hidden or case-solution content",
      });
    }
  });

export type ExperienceRecord = z.infer<typeof ExperienceRecordSchema>;

export const ExperienceIneligibilityReasonSchema = z.enum([
  "TRAJECTORY_INVALID",
  "RUN_INCOMPLETE",
  "RUN_INFRASTRUCTURE_INVALID",
  "NO_FUNCTIONAL_RESULT",
  "SIMULATION_INFRASTRUCTURE_INVALID",
  "REPAIR_NOT_ATTEMPTED",
  "REPAIR_COMPILE_FAILED",
  "REPAIR_EXHAUSTED",
  "FINAL_SIMULATION_FAILED",
]);

export const ExperienceEligibilityDecisionSchema = z.discriminatedUnion("status", [
  z.strictObject({
    schema_version: z.literal(1),
    status: z.literal("ELIGIBLE"),
    kind: ExperienceKindSchema,
    initial_attempt: z.int().positive(),
    final_attempt: z.int().positive(),
  }),
  z.strictObject({
    schema_version: z.literal(1),
    status: z.literal("INELIGIBLE"),
    reason: ExperienceIneligibilityReasonSchema,
  }),
]);

export type ExperienceEligibilityDecision = z.infer<typeof ExperienceEligibilityDecisionSchema>;

const INFRASTRUCTURE_FUNCTIONAL_STATUSES = new Set([
  "SIMULATION_COMPILE_ERROR",
  "SIMULATION_COMPILE_TIMEOUT",
  "SIMULATION_ERROR",
  "SIMULATION_TIMEOUT",
  "OUTPUT_INVALID",
]);

function ineligible(
  reason: z.infer<typeof ExperienceIneligibilityReasonSchema>,
): ExperienceEligibilityDecision {
  return { schema_version: 1, status: "INELIGIBLE", reason };
}

function hasConsistentFunctionalFacts(result: FunctionalCaseResult): boolean {
  if (result.status === "PASSED") {
    return (
      result.mismatches === 0 &&
      result.samples !== null &&
      result.compileExitCode === 0 &&
      result.simulationExitCode === 0
    );
  }
  if (result.status === "MISMATCH") {
    return (
      result.mismatches !== null &&
      result.mismatches > 0 &&
      result.samples !== null &&
      result.compileExitCode === 0 &&
      result.simulationExitCode === 0
    );
  }
  return true;
}

/**
 * Classifies only landed compile/simulation facts. It never asks a model to decide whether a
 * trajectory is successful enough to learn from.
 */
export function classifyExperienceEligibility(input: {
  readonly caseRef: FixtureCaseRef;
  readonly run: RunExecutionResult;
  readonly functionalResults: readonly FunctionalCaseResult[];
}): ExperienceEligibilityDecision {
  const caseRef = FixtureCaseRefSchema.safeParse(input.caseRef);
  const run = RunExecutionResultSchema.safeParse(input.run);
  const results = input.functionalResults.map((result) =>
    FunctionalCaseResultSchema.safeParse(result),
  );
  if (
    caseRef.success !== true ||
    run.success !== true ||
    results.some((result) => !result.success)
  ) {
    return ineligible("TRAJECTORY_INVALID");
  }
  const parsedResults = results.map((result) => result.data!);
  if (run.data.status !== "COMPLETE") return ineligible("RUN_INCOMPLETE");
  if (run.data.evaluationValidity !== "EVALUATION_VALID") {
    return ineligible("RUN_INFRASTRUCTURE_INVALID");
  }
  if (parsedResults.length === 0) return ineligible("NO_FUNCTIONAL_RESULT");
  if (
    run.data.runId !== parsedResults[0]?.runId ||
    parsedResults.some(
      (result, index) =>
        result.runId !== run.data.runId ||
        result.caseRef.identity.datasetId !== caseRef.data.identity.datasetId ||
        result.caseRef.identity.split !== caseRef.data.identity.split ||
        result.caseRef.identity.caseId !== caseRef.data.identity.caseId ||
        (index > 0 && result.agentAttempt <= parsedResults[index - 1]!.agentAttempt),
    )
  ) {
    return ineligible("TRAJECTORY_INVALID");
  }
  if (parsedResults.some((result) => !hasConsistentFunctionalFacts(result))) {
    return ineligible("TRAJECTORY_INVALID");
  }
  if (parsedResults.some((result) => INFRASTRUCTURE_FUNCTIONAL_STATUSES.has(result.status))) {
    return ineligible("SIMULATION_INFRASTRUCTURE_INVALID");
  }

  const finalResult = parsedResults.at(-1)!;
  const terminalPassIsBound =
    run.data.finalResult.outcome === "COMPILE_PASSED" &&
    finalResult.agentAttempt === run.data.attemptCount;
  const firstMismatch = parsedResults.find((result) => result.status === "MISMATCH");
  if (firstMismatch === undefined) {
    if (finalResult.status !== "PASSED") return ineligible("FINAL_SIMULATION_FAILED");
    if (!terminalPassIsBound) return ineligible("TRAJECTORY_INVALID");
    return {
      schema_version: 1,
      status: "ELIGIBLE",
      kind: "design_observation",
      initial_attempt: finalResult.agentAttempt,
      final_attempt: finalResult.agentAttempt,
    };
  }

  const laterCompileFailure = run.data.compileObservations.some(
    (observation) =>
      observation.attempt > firstMismatch.agentAttempt && observation.status === "COMPILE_ERROR",
  );
  const laterFunctionalAttempt = parsedResults.some(
    (result) => result.agentAttempt > firstMismatch.agentAttempt,
  );
  if (laterCompileFailure && !laterFunctionalAttempt) return ineligible("REPAIR_COMPILE_FAILED");
  if (finalResult.status === "MISMATCH") return ineligible("REPAIR_EXHAUSTED");
  if (finalResult.status !== "PASSED") return ineligible("FINAL_SIMULATION_FAILED");
  if (
    finalResult.agentAttempt <= firstMismatch.agentAttempt ||
    finalResult.repairIterations <= firstMismatch.repairIterations
  ) {
    return ineligible("REPAIR_NOT_ATTEMPTED");
  }
  const finalCompilePhases = run.data.compileObservations.filter(
    (observation) => observation.attempt === finalResult.agentAttempt,
  );
  if (
    !["ATTEMPT", "FINAL_RECOMPILE"].every((phase) =>
      finalCompilePhases.some(
        (observation) => observation.phase === phase && observation.status === "COMPILE_PASSED",
      ),
    )
  ) {
    return ineligible("REPAIR_COMPILE_FAILED");
  }
  if (!terminalPassIsBound) return ineligible("TRAJECTORY_INVALID");
  return {
    schema_version: 1,
    status: "ELIGIBLE",
    kind: "simulation_debug",
    initial_attempt: firstMismatch.agentAttempt,
    final_attempt: finalResult.agentAttempt,
  };
}

export const ExperienceSummarizerOutputSchema = z.discriminatedUnion("status", [
  z.strictObject({
    schema_version: z.literal(1),
    status: z.literal("CREATED"),
    experience: ExperienceRecordSchema,
  }),
  z.strictObject({
    schema_version: z.literal(1),
    status: z.literal("REJECTED"),
    reason: z.literal("ROOT_CAUSE_UNCONFIRMED"),
    missing_fact: z.enum([
      "INITIAL_DEFECT_NOT_CONTRADICTED_BY_SPEC",
      "FINAL_REPAIR_NOT_LINKED_TO_DEFECT",
      "FINAL_VERIFICATION_NOT_PASSED",
    ]),
    detail: z.string().min(30).max(500),
  }),
]);

export type ExperienceSummarizerOutput = z.infer<typeof ExperienceSummarizerOutputSchema>;

export interface ExperienceSummaryRequest {
  readonly batchDirectory: string;
  readonly runId: RunId;
  readonly caseRef: FixtureCaseRef;
  readonly eligibility: Extract<ExperienceEligibilityDecision, { readonly status: "ELIGIBLE" }>;
  readonly functionalResults: readonly FunctionalCaseResult[];
  readonly language: "SYSTEMVERILOG" | "VERILOG" | "UNKNOWN";
  readonly tool: string | null;
  readonly circuitType?: string | null;
}

export interface ExperienceSummarizer {
  summarize(request: ExperienceSummaryRequest): Promise<ExperienceSummarizerOutput>;
}

const SUMMARY_SCHEMA_GUIDE = {
  schema_version: 1,
  output: {
    created: {
      schema_version: 1,
      status: "CREATED",
      experience: {
        schema_version: 1,
        kind: "design_observation or simulation_debug",
        source: { dataset: "string", split: "string", case_id: "string" },
        outcome: "first_functional_pass or repaired_functional_pass",
        circuit_type: "string of at most 128 characters, or null",
        language: "SYSTEMVERILOG, VERILOG, or UNKNOWN",
        tool: "short string or null",
        failure: {
          stage: "functional_simulation",
          failure_type: "output_mismatch",
          symptom: "string of 10 to 1000 characters without case-specific signal names",
        },
        diagnosis: "null, or a concrete diagnosis without case-specific names",
        repair: "null, or a concrete repair principle without case-specific code",
        verification: "factual compile and functional simulation verification",
      },
    },
    rejected: {
      schema_version: 1,
      status: "REJECTED",
      reason: "ROOT_CAUSE_UNCONFIRMED",
      missing_fact:
        "INITIAL_DEFECT_NOT_CONTRADICTED_BY_SPEC, FINAL_REPAIR_NOT_LINKED_TO_DEFECT, or FINAL_VERIFICATION_NOT_PASSED",
      detail: "30 to 500 characters identifying the absent public confirmation fact",
    },
  },
  prohibitions: [
    "Do not copy the full specification",
    "Do not mention hidden references, testbenches, golden RTL, or test cases",
    "Do not reproduce case-specific RTL or unnecessary signal/state names",
    "Do not invent a diagnosis; reject when the before/after evidence does not confirm it",
    "Do not add confidence or reusable Memory rules",
  ],
} as const;

function immutableSummaryManifest(workspace: string) {
  return createFileManifest(workspace, (logicalPath) => logicalPath !== "summary.json");
}

async function ensureExactFile(hostPath: string, content: string): Promise<void> {
  try {
    await writeFile(hostPath, content, { encoding: "utf8", flag: "wx" });
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? (error as { readonly code?: unknown }).code
        : undefined;
    if (code !== "EEXIST" || (await readFile(hostPath, "utf8")) !== content) {
      throw new CoreLoopException(
        "EXPERIENCE_SUMMARIZATION_FAILED",
        "Existing Experience inputs do not match the requested run",
      );
    }
  }
}

async function copyAttemptRtl(
  request: ExperienceSummaryRequest,
  workspace: string,
  attempt: number,
  label: "initial" | "final",
): Promise<readonly string[]> {
  const source = path.join(
    request.batchDirectory,
    "_internal",
    "runs",
    request.runId,
    "evidence",
    "attempts",
    String(attempt),
    "rtl-after",
  );
  const sourceManifest = await createFileManifest(source).catch(() => undefined);
  if (sourceManifest === undefined || sourceManifest.entries.length === 0) {
    throw new CoreLoopException(
      "EXPERIENCE_SUMMARIZATION_FAILED",
      `Experience ${label} RTL evidence is unavailable`,
    );
  }
  const destinationRoot = `rtl/${label}`;
  const destination = path.join(workspace, "rtl", label);
  const existing = await createFileManifest(destination).catch(() => undefined);
  if (existing === undefined || existing.entries.length === 0) {
    await copyRegularTreeToEvidence(source, workspace, destinationRoot);
  }
  if ((await createFileManifest(destination)).manifestDigest !== sourceManifest.manifestDigest) {
    throw new CoreLoopException(
      "EXPERIENCE_SUMMARIZATION_FAILED",
      `Existing Experience ${label} RTL does not match the evaluated attempt`,
    );
  }
  return sourceManifest.entries.map((entry) => `${destinationRoot}/${entry.path}`);
}

async function prepareSummaryWorkspace(
  request: ExperienceSummaryRequest,
  workspace: string,
): Promise<string> {
  await Promise.all([
    mkdir(path.join(workspace, "context"), { recursive: true }),
    mkdir(path.join(workspace, "rtl"), { recursive: true }),
  ]);
  const sourceWorkspace = path.join(
    request.batchDirectory,
    "_internal",
    "runs",
    request.runId,
    "workspace",
  );
  const spec = await readFile(path.join(sourceWorkspace, "spec.md"), "utf8").catch(() => {
    throw new CoreLoopException(
      "EXPERIENCE_SUMMARIZATION_FAILED",
      "Experience public specification is unavailable",
    );
  });
  const initialFiles = await copyAttemptRtl(
    request,
    workspace,
    request.eligibility.initial_attempt,
    "initial",
  );
  const finalFiles =
    request.eligibility.final_attempt === request.eligibility.initial_attempt
      ? initialFiles
      : await copyAttemptRtl(request, workspace, request.eligibility.final_attempt, "final");
  if (request.eligibility.final_attempt === request.eligibility.initial_attempt) {
    const source = path.join(workspace, "rtl", "initial");
    await copyRegularTreeToEvidence(source, workspace, "rtl/final");
  }
  const relevantResults = request.functionalResults
    .filter(
      (result) =>
        result.agentAttempt >= request.eligibility.initial_attempt &&
        result.agentAttempt <= request.eligibility.final_attempt,
    )
    .map((result) => ({
      attempt: result.agentAttempt,
      repair_iterations: result.repairIterations,
      status: result.status,
      mismatches: result.mismatches,
      samples: result.samples,
    }));
  const context = {
    schema_version: 1,
    kind: request.eligibility.kind,
    source: {
      dataset: request.caseRef.identity.datasetId,
      split: request.caseRef.identity.split,
      case_id: request.caseRef.identity.caseId,
    },
    language: request.language,
    tool: request.tool,
    circuit_type: request.circuitType ?? null,
    initial_rtl_files: initialFiles,
    final_rtl_files: finalFiles.map((item) => item.replace("rtl/initial/", "rtl/final/")),
    functional_results: relevantResults,
    landed_verification: {
      final_attempt: request.eligibility.final_attempt,
      attempt_compile: "COMPILE_PASSED",
      final_recompile: "COMPILE_PASSED",
      functional_simulation: "PASSED",
    },
  };
  await Promise.all([
    ensureExactFile(path.join(workspace, "spec.md"), spec),
    ensureExactFile(
      path.join(workspace, "context", "experience-input.json"),
      `${JSON.stringify(context, undefined, 2)}\n`,
    ),
    ensureExactFile(
      path.join(workspace, "context", "summary-schema.json"),
      `${JSON.stringify(SUMMARY_SCHEMA_GUIDE, undefined, 2)}\n`,
    ),
  ]);
  try {
    await writeFile(
      path.join(workspace, "summary.json"),
      `${JSON.stringify({ schema_version: 1, status: "REPLACE_ME" }, undefined, 2)}\n`,
      { encoding: "utf8", flag: "wx" },
    );
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? (error as { readonly code?: unknown }).code
        : undefined;
    if (code !== "EEXIST") throw error;
  }
  return spec;
}

function validationIssues(error: z.ZodError): readonly { path: string; message: string }[] {
  return error.issues.slice(0, 20).map((issue) => ({
    path: issue.path.map(String).join(".") || "<root>",
    message: issue.message.slice(0, 500),
  }));
}

const PI_SUMMARIZER_TOOLS = ["read", "edit"] as const;
const PI_SUMMARIZER_REQUIRED_FLAGS = [
  "--mode",
  "--no-session",
  "--provider",
  "--model",
  "--tools",
  "--no-extensions",
  "--extension",
  "--no-skills",
  "--no-prompt-templates",
  "--no-themes",
  "--no-context-files",
  "--no-approve",
  "--offline",
] as const;
const PI_SUMMARIZER_POLICY = {
  read: ["spec.md", "context/**", "rtl/**", "summary.json"],
  edit: ["summary.json"],
  deniedTools: ["write", "bash", "grep", "find", "ls"],
} as const;
const PI_SUMMARIZER_SYSTEM_PROMPT =
  "Summarize only landed public evidence. Read spec.md, context/**, rtl/**, and summary.json. Edit only summary.json. The JSON keys and enum values in context/summary-schema.json are exact and no alternate keys are allowed. Never expose case-specific solutions or hidden verification assets. For simulation_debug, a root cause is confirmed when a concrete semantic defect visible in the initial RTL is directly contradicted by the public specification, the final RTL removes that defect, and the final compile plus functional simulation pass. This confirmation does not require hidden evidence. When all three facts hold, return CREATED and abstract the diagnosis and repair so they omit unnecessary case-specific numbers and signal/state names; do not reject merely because abstraction is required. Reject only when one of those facts is absent, and identify that exact missing fact and its public-evidence basis in the required rejection fields.";
const PI_SUMMARIZER_TURN_INSTRUCTIONS = [
  "Read the schema and all listed evidence, then replace summary.json with one factual CREATED or REJECTED result that exactly follows context/summary-schema.json.",
  "The prior output failed validation. Read context/summary-validation-errors.json and replace only summary.json with a corrected result.",
] as const;
const EXPERIENCE_SUMMARIZER_INPUT_CONTRACT = {
  schemaVersion: 1,
  requiredFacts: [
    "source",
    "language",
    "tool",
    "circuit_type",
    "initial_rtl_files",
    "final_rtl_files",
    "functional_results",
    "landed_verification",
  ],
  landedVerification: [
    "final_attempt",
    "attempt_compile",
    "final_recompile",
    "functional_simulation",
  ],
} as const;
export const EXPERIENCE_SUMMARIZER_PROMPT_DIGEST = sha256Jcs({
  systemPrompt: PI_SUMMARIZER_SYSTEM_PROMPT,
  turnInstructions: PI_SUMMARIZER_TURN_INSTRUCTIONS,
  schemaGuide: SUMMARY_SCHEMA_GUIDE,
  inputContract: EXPERIENCE_SUMMARIZER_INPUT_CONTRACT,
});

function summaryRequestDigest(request: ExperienceSummaryRequest): ReturnType<typeof sha256Jcs> {
  return sha256Jcs({
    runId: request.runId,
    caseRef: request.caseRef,
    eligibility: request.eligibility,
    language: request.language,
    tool: request.tool,
    circuitType: request.circuitType ?? null,
    functionalResults: request.functionalResults.map((result) => ({
      runId: result.runId,
      caseRef: result.caseRef,
      status: result.status,
      mismatches: result.mismatches,
      samples: result.samples,
      agentAttempt: result.agentAttempt,
      repairIterations: result.repairIterations,
    })),
  });
}

function summaryIdentityDigest(request: ExperienceSummaryRequest): ReturnType<typeof sha256Jcs> {
  return sha256Jcs({
    promptDigest: EXPERIENCE_SUMMARIZER_PROMPT_DIGEST,
    requestDigest: summaryRequestDigest(request),
  });
}

function summaryWorkspace(request: ExperienceSummaryRequest): string {
  return path.join(
    request.batchDirectory,
    "_internal",
    "experience-summaries",
    request.runId,
    "summaries",
    summaryIdentityDigest(request).slice("sha256:".length),
  );
}

function clonePiConfig(config: PiExperimentConfig): PiExperimentConfig {
  return {
    ...config,
    ...(config.executableArgumentsPrefix === undefined
      ? {}
      : { executableArgumentsPrefix: [...config.executableArgumentsPrefix] }),
    workspaceLimits: { ...config.workspaceLimits },
    ...(config.environment === undefined ? {} : { environment: { ...config.environment } }),
  };
}

async function requirePolicyFile(hostPath: string): Promise<Buffer> {
  try {
    const stat = await lstat(hostPath);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size === 0 || stat.size > 65_536) {
      throw new Error("invalid file");
    }
    return await readFile(hostPath);
  } catch {
    throw new CoreLoopException(
      "EXPERIENCE_SUMMARIZATION_FAILED",
      "Pi Experience summarizer policy is unavailable",
    );
  }
}

export class PiExperienceSummarizer implements ExperienceSummarizer {
  private readonly config: PiExperimentConfig;
  private readonly extensionFile: string;

  public constructor(config: PiExperimentConfig) {
    this.config = clonePiConfig(config);
    this.extensionFile = path.join(
      this.config.repositoryRoot,
      ".pi",
      "extensions",
      "rtl-experience-summarizer-policy.mjs",
    );
  }

  public async summarize(request: ExperienceSummaryRequest): Promise<ExperienceSummarizerOutput> {
    const normalizedRequest: ExperienceSummaryRequest = {
      ...request,
      runId: RunIdSchema.parse(request.runId),
    };
    FixtureCaseRefSchema.parse(normalizedRequest.caseRef);
    const eligibility = ExperienceEligibilityDecisionSchema.parse(normalizedRequest.eligibility);
    if (eligibility.status !== "ELIGIBLE") {
      throw new CoreLoopException(
        "EXPERIENCE_SUMMARIZATION_FAILED",
        "Experience summarizer requires an eligible trajectory",
      );
    }
    const functionalResults = normalizedRequest.functionalResults.map((result) =>
      FunctionalCaseResultSchema.parse(result),
    );
    if (
      functionalResults.some(
        (result) =>
          result.runId !== normalizedRequest.runId ||
          result.caseRef.identity.datasetId !== normalizedRequest.caseRef.identity.datasetId ||
          result.caseRef.identity.split !== normalizedRequest.caseRef.identity.split ||
          result.caseRef.identity.caseId !== normalizedRequest.caseRef.identity.caseId,
      ) ||
      !functionalResults.some(
        (result) => result.agentAttempt === eligibility.final_attempt && result.status === "PASSED",
      ) ||
      (eligibility.kind === "simulation_debug" &&
        !functionalResults.some(
          (result) =>
            result.agentAttempt === eligibility.initial_attempt && result.status === "MISMATCH",
        ))
    ) {
      throw new CoreLoopException(
        "EXPERIENCE_SUMMARIZATION_FAILED",
        "Experience summarizer input is not bound to the eligible trajectory",
      );
    }
    const workspace = summaryWorkspace(normalizedRequest);
    const existingMetadata = await readFile(
      path.join(workspace, "summary-metadata.json"),
      "utf8",
    ).catch(() => undefined);
    if (existingMetadata !== undefined) {
      try {
        return ExperienceSummarizerOutputSchema.parse(
          JSON.parse(await readFile(path.join(workspace, "summary.json"), "utf8")) as unknown,
        );
      } catch {
        throw new CoreLoopException(
          "EXPERIENCE_SUMMARIZATION_FAILED",
          "Existing Experience summary evidence is invalid",
        );
      }
    }
    const spec = await prepareSummaryWorkspace(normalizedRequest, workspace);
    await mkdir(this.config.configDirectory, { recursive: true });
    const [extensionBytes, semanticConfig, runtimeConfig] = await Promise.all([
      requirePolicyFile(this.extensionFile),
      createFileManifest(this.config.configDirectory, (logicalPath) => logicalPath !== "auth.json"),
      createFileManifest(this.config.configDirectory),
    ]);
    const environment = buildIsolatedPiEnvironment(this.config);
    environment.RTL_AGENT_PI_EXPERIENCE_POLICY_REQUIRED = "1";
    environment.RTL_AGENT_PI_WORKSPACE_ROOT = workspace;
    const probe = async (arguments_: readonly string[]) =>
      executeProbeCommand({
        executable: this.config.executable,
        arguments: [...(this.config.executableArgumentsPrefix ?? []), ...arguments_],
        cwd: this.config.repositoryRoot,
        environment,
        timeoutMs: Math.min(this.config.timeoutMs, 30_000),
        terminationGraceMs: this.config.terminationGraceMs,
      });
    const [version, help] = await Promise.all([probe(["--version"]), probe(["--help"])]);
    const normalizedVersion = version.stdout.trim().replace(/^pi\s+/iu, "");
    const helpOutput = `${help.stdout}\n${help.stderr}`;
    if (
      version.exitCode !== 0 ||
      version.timedOut ||
      version.terminationFailed ||
      version.spawnError !== undefined ||
      version.stdoutTruncated ||
      version.stderrTruncated ||
      normalizedVersion !== this.config.expectedPiVersion ||
      help.exitCode !== 0 ||
      help.timedOut ||
      help.terminationFailed ||
      help.spawnError !== undefined ||
      help.stdoutTruncated ||
      help.stderrTruncated ||
      PI_SUMMARIZER_REQUIRED_FLAGS.some((flag) => !helpOutput.includes(flag))
    ) {
      throw new CoreLoopException(
        "EXPERIENCE_SUMMARIZATION_FAILED",
        "Pi Experience summarizer capability probe failed",
      );
    }
    const verifyConfigStable = async (): Promise<void> => {
      if (
        (await createFileManifest(this.config.configDirectory)).manifestDigest !==
        runtimeConfig.manifestDigest
      ) {
        throw new CoreLoopException(
          "EXPERIENCE_SUMMARIZATION_FAILED",
          "Shared Pi configuration changed during Experience summarization",
        );
      }
    };
    let summary: ReturnType<typeof ExperienceSummarizerOutputSchema.safeParse> | undefined;
    let durationMs = 0;
    let turns = 0;
    for (let turn = 1; turn <= 2; turn += 1) {
      turns = turn;
      await verifyConfigStable();
      const before = await immutableSummaryManifest(workspace);
      const processResult = await executeOpenCodeProcess({
        executable: this.config.executable,
        arguments: [
          ...(this.config.executableArgumentsPrefix ?? []),
          "--mode",
          "json",
          "--no-session",
          "--provider",
          this.config.provider,
          "--model",
          this.config.model,
          "--tools",
          PI_SUMMARIZER_TOOLS.join(","),
          "--no-extensions",
          "--extension",
          this.extensionFile,
          "--no-skills",
          "--no-prompt-templates",
          "--no-themes",
          "--no-context-files",
          "--no-approve",
          "--offline",
          "--system-prompt",
          PI_SUMMARIZER_SYSTEM_PROMPT,
          PI_SUMMARIZER_TURN_INSTRUCTIONS[turn - 1]!,
        ],
        cwd: workspace,
        environment,
        timeoutMs: this.config.timeoutMs,
        terminationGraceMs: this.config.terminationGraceMs,
        stderrLimitBytes: this.config.stderrLimitBytes,
        maximumEvents: this.config.maximumEvents,
        maximumEventLineBytes: this.config.maximumEventLineBytes,
      });
      durationMs += processResult.durationMs;
      const after = await immutableSummaryManifest(workspace);
      await verifyConfigStable();
      if (
        processResult.exitCode !== 0 ||
        processResult.timedOut ||
        processResult.terminationFailed ||
        processResult.spawnError !== undefined ||
        before.manifestDigest !== after.manifestDigest
      ) {
        throw new CoreLoopException(
          "EXPERIENCE_SUMMARIZATION_FAILED",
          "Pi Experience summarizer failed or changed protected inputs",
        );
      }
      try {
        summary = ExperienceSummarizerOutputSchema.safeParse(
          JSON.parse(await readFile(path.join(workspace, "summary.json"), "utf8")) as unknown,
        );
      } catch {
        summary = undefined;
      }
      if (summary?.success === true) {
        if (
          (summary.data.status === "REJECTED" &&
            normalizedRequest.eligibility.kind !== "simulation_debug") ||
          (summary.data.status === "CREATED" &&
            (summary.data.experience.source.dataset !==
              normalizedRequest.caseRef.identity.datasetId ||
              summary.data.experience.source.split !== normalizedRequest.caseRef.identity.split ||
              summary.data.experience.source.case_id !==
                normalizedRequest.caseRef.identity.caseId ||
              summary.data.experience.kind !== normalizedRequest.eligibility.kind ||
              summary.data.experience.language !== normalizedRequest.language ||
              summary.data.experience.tool !== normalizedRequest.tool ||
              (normalizedRequest.circuitType !== undefined &&
                summary.data.experience.circuit_type !== normalizedRequest.circuitType) ||
              (spec.trim().length >= 20 && JSON.stringify(summary.data).includes(spec.trim()))))
        ) {
          summary = undefined;
        } else {
          break;
        }
      }
      if (turn === 1) {
        const issues =
          summary === undefined
            ? [
                {
                  path: "<binding>",
                  message: "Output is invalid or does not match landed provenance",
                },
              ]
            : validationIssues(summary.error);
        await writeFile(
          path.join(workspace, "context", "summary-validation-errors.json"),
          `${JSON.stringify({ schema_version: 1, issues }, undefined, 2)}\n`,
          "utf8",
        );
      }
    }
    if (summary?.success !== true) {
      throw new CoreLoopException(
        "EXPERIENCE_SUMMARIZATION_FAILED",
        "Experience summary remained invalid after one bounded schema-repair turn",
      );
    }
    await writeFile(
      path.join(workspace, "summary-metadata.json"),
      `${JSON.stringify(
        {
          schema_version: 1,
          backend: "pi",
          provider: this.config.provider,
          model: this.config.model,
          pi_version: normalizedVersion,
          resolved_config_digest: semanticConfig.manifestDigest,
          prompt_digest: EXPERIENCE_SUMMARIZER_PROMPT_DIGEST,
          request_digest: summaryRequestDigest(normalizedRequest),
          summarizer_policy_digest: sha256Jcs(PI_SUMMARIZER_POLICY),
          extension_file_digest: sha256Bytes(extensionBytes),
          summary_turns: turns,
          duration_ms: durationMs,
        },
        undefined,
        2,
      )}\n`,
      { encoding: "utf8", flag: "wx" },
    );
    return summary.data;
  }
}

export const ExperienceCaseResultSchema = z.union([
  z.strictObject({
    schema_version: z.literal(1),
    status: z.literal("CREATED"),
    eligibility: z.literal("ELIGIBLE"),
    experience: ExperienceRecordSchema,
  }),
  z.strictObject({
    schema_version: z.literal(1),
    status: z.literal("SKIPPED"),
    eligibility: z.literal("INELIGIBLE"),
    reason: ExperienceIneligibilityReasonSchema,
  }),
  z.strictObject({
    schema_version: z.literal(1),
    status: z.literal("SKIPPED"),
    eligibility: z.literal("ELIGIBLE"),
    reason: z.literal("ROOT_CAUSE_UNCONFIRMED"),
  }),
  z.strictObject({
    schema_version: z.literal(1),
    status: z.literal("FAILED"),
    eligibility: z.literal("ELIGIBLE"),
    reason: z.literal("SUMMARIZER_FAILED"),
  }),
]);

export type ExperienceCaseResult = z.infer<typeof ExperienceCaseResultSchema>;

function createdExperienceMatchesRequest(
  experience: ExperienceRecord,
  request: Omit<ExperienceSummaryRequest, "eligibility">,
  eligibility: Extract<ExperienceEligibilityDecision, { readonly status: "ELIGIBLE" }>,
): boolean {
  return (
    experience.source.dataset === request.caseRef.identity.datasetId &&
    experience.source.split === request.caseRef.identity.split &&
    experience.source.case_id === request.caseRef.identity.caseId &&
    experience.kind === eligibility.kind &&
    experience.language === request.language &&
    experience.tool === request.tool &&
    (request.circuitType === undefined || experience.circuit_type === request.circuitType)
  );
}

async function persistExperienceCaseResult(
  batchDirectory: string,
  runId: RunId,
  result: ExperienceCaseResult,
): Promise<void> {
  const directory = path.join(batchDirectory, "_internal", "experience-summaries", runId);
  await mkdir(directory, { recursive: true });
  await writeJsonReplacingAtomic(path.join(directory, "case-result.json"), result);
}

/** Non-blocking Case End boundary: all summarizer failures become bounded evidence. */
export async function summarizeCaseExperienceBestEffort(options: {
  readonly request: Omit<ExperienceSummaryRequest, "eligibility" | "runId">;
  readonly run: RunExecutionResult;
  readonly summarizer: ExperienceSummarizer;
}): Promise<ExperienceCaseResult> {
  const run = RunExecutionResultSchema.parse(options.run);
  const request: Omit<ExperienceSummaryRequest, "eligibility"> = {
    ...options.request,
    runId: run.runId,
  };
  const eligibility = classifyExperienceEligibility({
    caseRef: request.caseRef,
    run,
    functionalResults: request.functionalResults,
  });
  if (eligibility.status === "INELIGIBLE") {
    const result = ExperienceCaseResultSchema.parse({
      schema_version: 1,
      status: "SKIPPED",
      eligibility: "INELIGIBLE",
      reason: eligibility.reason,
    });
    await persistExperienceCaseResult(request.batchDirectory, run.runId, result);
    return result;
  }
  let result: ExperienceCaseResult;
  try {
    const output = ExperienceSummarizerOutputSchema.parse(
      await options.summarizer.summarize({ ...request, eligibility }),
    );
    if (
      output.status === "CREATED" &&
      !createdExperienceMatchesRequest(output.experience, request, eligibility)
    ) {
      throw new CoreLoopException(
        "EXPERIENCE_SUMMARIZATION_FAILED",
        "Experience summary is not bound to the requested trajectory",
      );
    }
    result = ExperienceCaseResultSchema.parse(
      output.status === "REJECTED"
        ? {
            schema_version: 1,
            status: "SKIPPED",
            eligibility: "ELIGIBLE",
            reason: output.reason,
          }
        : {
            schema_version: 1,
            status: "CREATED",
            eligibility: "ELIGIBLE",
            experience: output.experience,
          },
    );
  } catch {
    result = ExperienceCaseResultSchema.parse({
      schema_version: 1,
      status: "FAILED",
      eligibility: "ELIGIBLE",
      reason: "SUMMARIZER_FAILED",
    });
  }
  await persistExperienceCaseResult(request.batchDirectory, run.runId, result);
  return result;
}
