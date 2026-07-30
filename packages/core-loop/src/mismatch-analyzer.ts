import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import type { OpenCodeExperimentConfig } from "./agent-adapter.js";
import { buildIsolatedOpenCodeEnvironment } from "./agent-adapter.js";
import type { PiExperimentConfig } from "./pi-agent-adapter.js";
import { buildIsolatedPiEnvironment } from "./pi-agent-adapter.js";
import { FixtureCaseRefSchema } from "./contracts.js";
import type { FixtureCaseRef } from "./contracts.js";
import { CoreLoopException } from "./errors.js";
import { copyRegularTreeToEvidence } from "./evidence.js";
import { sha256Bytes, sha256Jcs } from "./filesystem.js";
import { createFileManifest } from "./manifest.js";
import { executeOpenCodeProcess, executeProbeCommand } from "./opencode-process.js";

const ANALYZER_AGENT_NAME = "rtl-mismatch-analyzer" as const;
const EXPECTED_ANALYZER_ALLOWS = new Set([
  "read:spec.md",
  "read:**/spec.md",
  "read:context/*",
  "read:**/context/*",
  "read:rtl/**",
  "read:**/rtl/**",
  "read:analysis.json",
  "read:**/analysis.json",
  "edit:analysis.json",
  "edit:**/analysis.json",
]);

interface PermissionRule {
  readonly permission: string;
  readonly action: "allow" | "ask" | "deny";
  readonly pattern: string;
}

function extractPermissionArray(output: string): unknown {
  const markerIndex = output.indexOf(`${ANALYZER_AGENT_NAME} (`);
  if (markerIndex < 0) return undefined;
  const start = output.indexOf("[", markerIndex);
  if (start < 0) return undefined;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < output.length; index += 1) {
    const character = output[index]!;
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === "[") depth += 1;
    else if (character === "]") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(output.slice(start, index + 1)) as unknown;
        } catch {
          return undefined;
        }
      }
    }
  }
  return undefined;
}

function validateAnalyzerPermissions(output: string): ReturnType<typeof sha256Jcs> {
  const raw = extractPermissionArray(output);
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 128) {
    throw new CoreLoopException(
      "MISMATCH_ANALYSIS_FAILED",
      "Mismatch diagnosis Agent permissions could not be resolved",
    );
  }
  const rules: PermissionRule[] = raw.map((entry) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new CoreLoopException(
        "MISMATCH_ANALYSIS_FAILED",
        "Mismatch diagnosis Agent reported malformed permissions",
      );
    }
    const rule = entry as Record<string, unknown>;
    if (
      typeof rule.permission !== "string" ||
      typeof rule.pattern !== "string" ||
      (rule.action !== "allow" && rule.action !== "ask" && rule.action !== "deny")
    ) {
      throw new CoreLoopException(
        "MISMATCH_ANALYSIS_FAILED",
        "Mismatch diagnosis Agent reported malformed permissions",
      );
    }
    return {
      permission: rule.permission,
      action: rule.action,
      pattern: rule.pattern,
    };
  });
  let denyAll = -1;
  rules.forEach((rule, index) => {
    if (rule.permission === "*" && rule.pattern === "*" && rule.action === "deny") denyAll = index;
  });
  if (denyAll < 0) {
    throw new CoreLoopException(
      "MISMATCH_ANALYSIS_FAILED",
      "Mismatch diagnosis Agent has no deny-all permission boundary",
    );
  }
  const observed = new Set<string>();
  for (const rule of rules.slice(denyAll + 1)) {
    if (rule.action === "deny") continue;
    const key = `${rule.permission}:${rule.pattern}`;
    const toolOutputException =
      rule.action === "allow" &&
      rule.permission === "external_directory" &&
      /[\\/]\.local[\\/]share[\\/]opencode[\\/]tool-output[\\/]\*$/.test(rule.pattern);
    if (rule.action === "allow" && EXPECTED_ANALYZER_ALLOWS.has(key)) observed.add(key);
    else if (!toolOutputException) {
      throw new CoreLoopException(
        "MISMATCH_ANALYSIS_FAILED",
        "Mismatch diagnosis Agent retains an unexpected permission",
      );
    }
  }
  if ([...EXPECTED_ANALYZER_ALLOWS].some((allow) => !observed.has(allow))) {
    throw new CoreLoopException(
      "MISMATCH_ANALYSIS_FAILED",
      "Mismatch diagnosis Agent is missing a required bounded permission",
    );
  }
  return sha256Jcs(rules);
}

export const MISMATCH_ROOT_CAUSE_CATEGORIES = [
  "RESET_SEMANTICS",
  "INITIALIZATION_SEMANTICS",
  "SPEC_REFERENCE_AMBIGUITY",
  "FSM_TRANSITION",
  "PRIORITY_SELECTION",
  "EDGE_HISTORY",
  "COUNTER_BOUNDARY",
  "COMBINATIONAL_COVERAGE",
  "WIDTH_SIGNEDNESS",
  "BIT_ORDERING",
  "SEQUENTIAL_TIMING",
  "INTERFACE_PROTOCOL",
  "OTHER_SPEC_VIOLATION",
] as const;

export const MismatchRootCauseCategorySchema = z.enum(MISMATCH_ROOT_CAUSE_CATEGORIES);

const MismatchEvidenceSchema = z.strictObject({
  path: z.string().regex(/^(?:spec\.md|rtl\/[A-Za-z0-9._/-]+)$/u),
  lineStart: z.int().positive(),
  lineEnd: z.int().positive(),
  observation: z.string().min(10).max(500),
});

export const MismatchAnalysisSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    category: MismatchRootCauseCategorySchema,
    rootCause: z.string().min(30).max(1_500),
    evidence: z.array(MismatchEvidenceSchema).min(1).max(12),
    confidence: z.enum(["LOW", "MEDIUM", "HIGH"]),
    limitations: z.string().min(10).max(500),
  })
  .superRefine((value, context) => {
    if (!value.evidence.some((item) => item.path.startsWith("rtl/"))) {
      context.addIssue({
        code: "custom",
        path: ["evidence"],
        message: "Mismatch analysis must cite candidate RTL",
      });
    }
    if (/^(?:the )?implementation (?:differs|is incorrect)/iu.test(value.rootCause.trim())) {
      context.addIssue({
        code: "custom",
        path: ["rootCause"],
        message: "Mismatch analysis must state a concrete cause",
      });
    }
    if (
      [value.rootCause, value.limitations, ...value.evidence.map((item) => item.observation)].some(
        (item) => item.includes("REPLACE_ME"),
      )
    ) {
      context.addIssue({
        code: "custom",
        path: [],
        message: "Mismatch analysis must replace every placeholder value",
      });
    }
  });

export type MismatchAnalysis = z.infer<typeof MismatchAnalysisSchema>;

export interface MismatchAnalysisRequest {
  readonly batchDirectory: string;
  readonly runId: string;
  readonly caseRef: FixtureCaseRef;
  readonly mismatches: number;
  readonly samples: number;
  readonly outputMismatches: readonly {
    readonly outputPort: string;
    readonly mismatches: number;
    readonly firstMismatchTime: number;
  }[];
}

export interface MismatchAnalyzer {
  analyze(request: MismatchAnalysisRequest): Promise<MismatchAnalysis>;
}

function analyzerWorkspace(request: MismatchAnalysisRequest): string {
  return path.join(request.batchDirectory, "_internal", "mismatch-analysis", request.runId);
}

function immutableManifest(workspace: string) {
  return createFileManifest(workspace, (logicalPath) => logicalPath !== "analysis.json");
}

const ANALYSIS_SCHEMA_GUIDE = {
  schemaVersion: 1,
  requiredKeys: ["schemaVersion", "category", "rootCause", "evidence", "confidence", "limitations"],
  allowedCategories: MISMATCH_ROOT_CAUSE_CATEGORIES,
  allowedConfidence: ["LOW", "MEDIUM", "HIGH"],
  evidenceItem: {
    path: "spec.md or rtl/<logical-source-path>",
    lineStart: "positive integer",
    lineEnd: "positive integer",
    observation: "10 to 500 characters",
  },
  constraints: {
    rootCause: "30 to 1500 characters and a concrete hypothesis",
    evidence: "1 to 12 objects, including at least one rtl/ citation",
    limitations: "10 to 500 characters",
  },
} as const;

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
        "MISMATCH_ANALYSIS_FAILED",
        "Existing mismatch diagnosis inputs do not match the requested run",
      );
    }
  }
}

function validationIssues(error: z.ZodError): readonly { path: string; message: string }[] {
  return error.issues.slice(0, 20).map((issue) => ({
    path: issue.path.map(String).join(".") || "<root>",
    message: issue.message.slice(0, 500),
  }));
}

interface MismatchAnalyzerRuntime {
  readonly metadata: Readonly<Record<string, unknown>>;
  runTurn(instruction: string): Promise<number>;
}

type MismatchAnalyzerRuntimeFactory = (options: {
  readonly workspace: string;
  readonly request: MismatchAnalysisRequest;
}) => Promise<MismatchAnalyzerRuntime>;

function validateMismatchRequest(rawRequest: MismatchAnalysisRequest): MismatchAnalysisRequest {
  const caseRef = FixtureCaseRefSchema.parse(rawRequest.caseRef);
  if (
    !Number.isSafeInteger(rawRequest.mismatches) ||
    rawRequest.mismatches <= 0 ||
    !Number.isSafeInteger(rawRequest.samples) ||
    rawRequest.samples <= 0 ||
    rawRequest.outputMismatches.length > 512 ||
    rawRequest.outputMismatches.some(
      (item) =>
        !/^[A-Za-z_][A-Za-z0-9_$]*$/u.test(item.outputPort) ||
        !Number.isSafeInteger(item.mismatches) ||
        item.mismatches <= 0 ||
        !Number.isSafeInteger(item.firstMismatchTime) ||
        item.firstMismatchTime < 0,
    )
  ) {
    throw new CoreLoopException("MISMATCH_ANALYSIS_FAILED", "Mismatch analysis input is invalid");
  }
  return { ...rawRequest, caseRef };
}

async function prepareMismatchWorkspace(
  request: MismatchAnalysisRequest,
  workspace: string,
): Promise<void> {
  const sourceWorkspace = path.join(
    request.batchDirectory,
    "_internal",
    "runs",
    request.runId,
    "workspace",
  );
  await Promise.all([
    mkdir(path.join(workspace, "context"), { recursive: true }),
    mkdir(path.join(workspace, "rtl"), { recursive: true }),
  ]);
  const sourceRtlDirectory = path.join(sourceWorkspace, "rtl");
  const sourceRtlManifest = await createFileManifest(sourceRtlDirectory);
  const rtlSourceFiles = sourceRtlManifest.entries.map((entry) => `rtl/${entry.path}`);
  const spec = await readFile(path.join(sourceWorkspace, "spec.md"), "utf8");
  const mismatchInput = `${JSON.stringify(
    {
      schemaVersion: 1,
      caseId: request.caseRef.identity.caseId,
      mismatches: request.mismatches,
      samples: request.samples,
      outputMismatches: request.outputMismatches,
      rtlSourceFiles,
    },
    undefined,
    2,
  )}\n`;
  await Promise.all([
    ensureExactFile(path.join(workspace, "spec.md"), spec),
    ensureExactFile(path.join(workspace, "context", "mismatch.json"), mismatchInput),
    ensureExactFile(
      path.join(workspace, "context", "analysis-schema.json"),
      `${JSON.stringify(ANALYSIS_SCHEMA_GUIDE, undefined, 2)}\n`,
    ),
  ]);
  let workspaceRtlManifest = await createFileManifest(path.join(workspace, "rtl"));
  if (workspaceRtlManifest.entries.length === 0) {
    await copyRegularTreeToEvidence(sourceRtlDirectory, workspace, "rtl");
    workspaceRtlManifest = await createFileManifest(path.join(workspace, "rtl"));
  }
  if (workspaceRtlManifest.manifestDigest !== sourceRtlManifest.manifestDigest) {
    throw new CoreLoopException(
      "MISMATCH_ANALYSIS_FAILED",
      "Existing mismatch diagnosis RTL does not match the evaluated candidate",
    );
  }
  try {
    await writeFile(
      path.join(workspace, "analysis.json"),
      `${JSON.stringify(
        {
          schemaVersion: 1,
          category: "REPLACE_ME",
          rootCause: "REPLACE_ME with a concrete root-cause hypothesis grounded in the files.",
          evidence: [
            {
              path: rtlSourceFiles[0] ?? "rtl/REPLACE_ME.sv",
              lineStart: 1,
              lineEnd: 1,
              observation: "REPLACE_ME with the relevant candidate RTL observation.",
            },
          ],
          confidence: "REPLACE_ME",
          limitations: "REPLACE_ME with what cannot be proven without hidden assets.",
        },
        undefined,
        2,
      )}\n`,
      { encoding: "utf8", flag: "wx" },
    );
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? (error as { readonly code?: unknown }).code
        : undefined;
    if (code !== "EEXIST") throw error;
  }
}

async function analyzeMismatch(
  rawRequest: MismatchAnalysisRequest,
  createRuntime: MismatchAnalyzerRuntimeFactory,
): Promise<MismatchAnalysis> {
  const request = validateMismatchRequest(rawRequest);
  const workspace = analyzerWorkspace(request);
  const existingMetadata = await readFile(
    path.join(workspace, "analysis-metadata.json"),
    "utf8",
  ).catch(() => undefined);
  if (existingMetadata !== undefined) {
    try {
      return MismatchAnalysisSchema.parse(
        JSON.parse(await readFile(path.join(workspace, "analysis.json"), "utf8")) as unknown,
      );
    } catch {
      throw new CoreLoopException(
        "MISMATCH_ANALYSIS_FAILED",
        "Existing mismatch diagnosis evidence is invalid",
      );
    }
  }
  await prepareMismatchWorkspace(request, workspace);
  const runtime = await createRuntime({ workspace, request });
  let analysis: ReturnType<typeof MismatchAnalysisSchema.safeParse> | undefined;
  let durationMs = 0;
  let diagnosisTurns = 0;
  for (let turn = 1; turn <= 2; turn += 1) {
    diagnosisTurns = turn;
    durationMs += await runtime.runTurn(
      turn === 1
        ? "Read context/analysis-schema.json, context/mismatch.json, spec.md, and every listed RTL source. Replace analysis.json with one concrete JSON result that exactly obeys the provided schema."
        : "The previous analysis.json failed validation. Read context/analysis-validation-errors.json and context/analysis-schema.json, then replace only analysis.json with a corrected concrete result.",
    );
    try {
      analysis = MismatchAnalysisSchema.safeParse(
        JSON.parse(await readFile(path.join(workspace, "analysis.json"), "utf8")) as unknown,
      );
    } catch {
      analysis = undefined;
    }
    if (analysis?.success === true) break;
    if (turn === 1) {
      const issues =
        analysis === undefined
          ? [{ path: "<json>", message: "analysis.json is not valid JSON" }]
          : validationIssues(analysis.error);
      await writeFile(
        path.join(workspace, "context", "analysis-validation-errors.json"),
        `${JSON.stringify({ schemaVersion: 1, issues }, undefined, 2)}\n`,
        "utf8",
      );
    }
  }
  if (analysis?.success !== true) {
    throw new CoreLoopException(
      "MISMATCH_ANALYSIS_FAILED",
      "Mismatch diagnosis remained invalid after one bounded schema-repair turn",
    );
  }
  await writeFile(
    path.join(workspace, "analysis-metadata.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        ...runtime.metadata,
        diagnosisTurns,
        durationMs,
      },
      undefined,
      2,
    )}\n`,
    { encoding: "utf8", flag: "wx" },
  );
  return analysis.data;
}

function cloneOpenCodeConfig(config: OpenCodeExperimentConfig): OpenCodeExperimentConfig {
  return {
    ...config,
    ...(config.executableArgumentsPrefix === undefined
      ? {}
      : { executableArgumentsPrefix: [...config.executableArgumentsPrefix] }),
    workspaceLimits: { ...config.workspaceLimits },
    ...(config.environment === undefined ? {} : { environment: { ...config.environment } }),
  };
}

export class OpenCodeMismatchAnalyzer implements MismatchAnalyzer {
  private readonly config: OpenCodeExperimentConfig;
  private readonly environment: NodeJS.ProcessEnv;

  public constructor(config: OpenCodeExperimentConfig) {
    this.config = cloneOpenCodeConfig(config);
    this.environment = buildIsolatedOpenCodeEnvironment(this.config);
  }

  public async analyze(rawRequest: MismatchAnalysisRequest): Promise<MismatchAnalysis> {
    return analyzeMismatch(rawRequest, async ({ workspace, request }) => {
      const agentFile = await readFile(
        path.join(this.config.repositoryRoot, ".opencode", "agents", `${ANALYZER_AGENT_NAME}.md`),
      );
      const version = await executeProbeCommand({
        executable: this.config.executable,
        arguments: [...(this.config.executableArgumentsPrefix ?? []), "--version"],
        cwd: this.config.repositoryRoot,
        environment: this.environment,
        timeoutMs: Math.min(this.config.timeoutMs, 30_000),
        terminationGraceMs: this.config.terminationGraceMs,
      });
      const permissions = await executeProbeCommand({
        executable: this.config.executable,
        arguments: [...(this.config.executableArgumentsPrefix ?? []), "agent", "list"],
        cwd: this.config.repositoryRoot,
        environment: this.environment,
        timeoutMs: Math.min(this.config.timeoutMs, 30_000),
        terminationGraceMs: this.config.terminationGraceMs,
      });
      if (
        version.exitCode !== 0 ||
        version.timedOut ||
        version.terminationFailed ||
        version.stdout.trim() !== this.config.expectedOpenCodeVersion ||
        permissions.exitCode !== 0 ||
        permissions.timedOut ||
        permissions.terminationFailed
      ) {
        throw new CoreLoopException(
          "MISMATCH_ANALYSIS_FAILED",
          "Mismatch diagnosis Agent capability probe failed",
        );
      }
      const analyzerPermissionDigest = validateAnalyzerPermissions(permissions.stdout);
      return {
        metadata: {
          backend: "opencode",
          model: this.config.providerModel,
          analyzerAgentDigest: sha256Bytes(agentFile),
          analyzerPermissionDigest,
        },
        runTurn: async (instruction: string): Promise<number> => {
          const before = await immutableManifest(workspace);
          const processResult = await executeOpenCodeProcess({
            executable: this.config.executable,
            arguments: [
              ...(this.config.executableArgumentsPrefix ?? []),
              "--pure",
              "run",
              "--agent",
              ANALYZER_AGENT_NAME,
              "--model",
              this.config.providerModel,
              ...(this.config.variant === undefined ? [] : ["--variant", this.config.variant]),
              "--format",
              "json",
              "--dir",
              workspace,
              "--title",
              `mismatch-${request.runId}`,
              instruction,
            ],
            cwd: this.config.repositoryRoot,
            environment: this.environment,
            timeoutMs: this.config.timeoutMs,
            terminationGraceMs: this.config.terminationGraceMs,
            stderrLimitBytes: this.config.stderrLimitBytes,
            maximumEvents: this.config.maximumEvents,
            maximumEventLineBytes: this.config.maximumEventLineBytes,
          });
          const after = await immutableManifest(workspace);
          if (
            processResult.exitCode !== 0 ||
            processResult.timedOut ||
            processResult.terminationFailed ||
            processResult.spawnError !== undefined ||
            before.manifestDigest !== after.manifestDigest
          ) {
            throw new CoreLoopException(
              "MISMATCH_ANALYSIS_FAILED",
              "Mismatch diagnosis Agent failed or changed protected inputs",
            );
          }
          return processResult.durationMs;
        },
      };
    });
  }
}

const PI_ANALYZER_TOOLS = ["read", "edit"] as const;
const PI_ANALYZER_REQUIRED_FLAGS = [
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
const PI_ANALYZER_POLICY = {
  read: ["spec.md", "context/**", "rtl/**", "analysis.json"],
  edit: ["analysis.json"],
  deniedTools: ["write", "bash", "grep", "find", "ls"],
} as const;

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

function piAnalyzerEnvironment(config: PiExperimentConfig, workspace: string): NodeJS.ProcessEnv {
  const environment = buildIsolatedPiEnvironment(config);
  environment.RTL_AGENT_PI_MISMATCH_POLICY_REQUIRED = "1";
  environment.RTL_AGENT_PI_WORKSPACE_ROOT = workspace;
  return environment;
}

async function requirePiAnalyzerFile(hostPath: string, description: string): Promise<Buffer> {
  try {
    const stat = await lstat(hostPath);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size === 0 || stat.size > 65_536) {
      throw new Error("invalid file");
    }
    return await readFile(hostPath);
  } catch {
    throw new CoreLoopException("MISMATCH_ANALYSIS_FAILED", `${description} is unavailable`);
  }
}

export class PiMismatchAnalyzer implements MismatchAnalyzer {
  private readonly config: PiExperimentConfig;
  private readonly extensionFile: string;

  public constructor(config: PiExperimentConfig) {
    this.config = clonePiConfig(config);
    this.extensionFile = path.join(
      this.config.repositoryRoot,
      ".pi",
      "extensions",
      "rtl-mismatch-analyzer-policy.mjs",
    );
  }

  public async analyze(rawRequest: MismatchAnalysisRequest): Promise<MismatchAnalysis> {
    return analyzeMismatch(rawRequest, async ({ workspace }) => {
      await mkdir(this.config.configDirectory, { recursive: true });
      const [extensionBytes, initialSemanticConfigManifest, initialRuntimeConfigManifest] =
        await Promise.all([
          requirePiAnalyzerFile(this.extensionFile, "Pi mismatch analyzer policy"),
          createFileManifest(
            this.config.configDirectory,
            (logicalPath) => logicalPath !== "auth.json",
          ),
          createFileManifest(this.config.configDirectory),
        ]);
      const environment = piAnalyzerEnvironment(this.config, workspace);
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
        PI_ANALYZER_REQUIRED_FLAGS.some((flag) => !helpOutput.includes(flag))
      ) {
        throw new CoreLoopException(
          "MISMATCH_ANALYSIS_FAILED",
          "Pi mismatch diagnosis capability probe failed",
        );
      }
      const verifyConfigStable = async (): Promise<void> => {
        if (
          (await createFileManifest(this.config.configDirectory)).manifestDigest !==
          initialRuntimeConfigManifest.manifestDigest
        ) {
          throw new CoreLoopException(
            "MISMATCH_ANALYSIS_FAILED",
            "Shared Pi configuration changed during mismatch diagnosis",
          );
        }
      };
      return {
        metadata: {
          backend: "pi",
          provider: this.config.provider,
          model: this.config.model,
          piVersion: normalizedVersion,
          resolvedConfigDigest: initialSemanticConfigManifest.manifestDigest,
          analyzerPolicyDigest: sha256Jcs(PI_ANALYZER_POLICY),
          extensionFileDigest: sha256Bytes(extensionBytes),
        },
        runTurn: async (instruction: string): Promise<number> => {
          await verifyConfigStable();
          const before = await immutableManifest(workspace);
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
              PI_ANALYZER_TOOLS.join(","),
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
              "Read only spec.md, context/**, rtl/**, and analysis.json. Edit only analysis.json. Never change the specification, candidate RTL, or context evidence.",
              instruction,
            ],
            cwd: workspace,
            environment,
            timeoutMs: this.config.timeoutMs,
            terminationGraceMs: this.config.terminationGraceMs,
            stderrLimitBytes: this.config.stderrLimitBytes,
            maximumEvents: this.config.maximumEvents,
            maximumEventLineBytes: this.config.maximumEventLineBytes,
          });
          const after = await immutableManifest(workspace);
          await verifyConfigStable();
          if (
            processResult.exitCode !== 0 ||
            processResult.timedOut ||
            processResult.terminationFailed ||
            processResult.spawnError !== undefined ||
            before.manifestDigest !== after.manifestDigest
          ) {
            throw new CoreLoopException(
              "MISMATCH_ANALYSIS_FAILED",
              "Pi mismatch diagnosis failed or changed protected inputs",
            );
          }
          return processResult.durationMs;
        },
      };
    });
  }
}
