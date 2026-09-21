import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { LogicalPathSchema } from "@rtl-agent/contracts";
import { z } from "zod";

import type { RtlAgentAdapter } from "./agent-adapter.js";
import { AgentAttemptInputSchema, MAX_AGENT_TURN_ATTEMPT, RunIdSchema } from "./contracts.js";
import type { FixtureCaseRef } from "./contracts.js";
import {
  CoverageFeedbackSchema,
  RepairableVerilatorCompileError,
  RepairableVerilatorSimulationError,
  VerificationAssetFeedbackSchema,
  VerilatorCompileFeedbackSchema,
  VerilatorSimulationFeedbackSchema,
  coverageCaseDirectoryName,
  coverageRunDirectoryName,
  missingVerificationAssetRequirements,
} from "./coverage-experiment.js";
import type { CoverageFeedback, CoverageRoundRunner } from "./coverage-experiment.js";
import type { FixtureProvider } from "./fixture-provider.js";
import { resolveLogicalPath, scanRegularFiles, sha256Bytes } from "./filesystem.js";
import { createCoreLoopRun } from "./materialize.js";
import type { CoreLoopRun } from "./materialize.js";
import { COVERAGE_PROJECT_IDS } from "./project-coverage-lock.js";
import type { CoverageProjectId } from "./project-coverage-lock.js";

const MUTABLE_VERIFICATION_PATHS = new Set(["rtl/checker.sv", "rtl/tb.sv"]);

// Evaluator-only replay evidence, never copied into the Agent workspace.
export async function captureVerificationAssets(run: CoreLoopRun, attempt: number): Promise<void> {
  if (!Number.isSafeInteger(attempt) || attempt < 0 || attempt > MAX_AGENT_TURN_ATTEMPT) {
    throw new TypeError("Invalid verification snapshot attempt");
  }
  const files = await scanRegularFiles(path.join(run.workspaceDirectory, "rtl"));
  const parent = path.join(run.runDirectory, "evidence", "verification-assets");
  await mkdir(parent, { recursive: true });
  const destination = path.join(parent, `attempt-${String(attempt)}`);
  await mkdir(destination); // Never overwrite prior evidence.
  const entries = [];
  for (const file of files) {
    const logicalPath = LogicalPathSchema.parse(`rtl/${file.logicalPath}`);
    const bytes = await readFile(file.hostPath);
    if (sha256Bytes(bytes) !== file.contentDigest) throw new Error("SNAPSHOT_SOURCE_CHANGED");
    const target = resolveLogicalPath(destination, logicalPath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes, { flag: "wx" });
    entries.push({
      path: logicalPath,
      byteLength: bytes.length,
      contentDigest: file.contentDigest,
    });
  }
  await writeFile(
    path.join(destination, "manifest.json"),
    `${JSON.stringify({ schemaVersion: 1, runId: run.runId, attempt, entries }, null, 2)}\n`,
    { flag: "wx" },
  );
}

export const ProjectCoverageExperimentResultSchema = z.strictObject({
  schemaVersion: z.literal(1),
  runId: RunIdSchema,
  projectId: z.enum(COVERAGE_PROJECT_IDS),
  caseId: z.string().min(1).max(256),
  status: z.enum(["PENDING_HUMAN_REVIEW", "FAILED"]),
  stopReason: z.enum([
    "BASELINE_ONLY",
    "BASELINE_THRESHOLD_REACHED",
    "BASELINE_NO_UNCOVERED_TARGETS",
    "COVERAGE_THRESHOLD_REACHED",
    "NO_UNCOVERED_TARGETS",
    "NO_MEANINGFUL_GAIN",
    "MAX_ITERATIONS",
    "BASELINE_VERILATOR_FAILED",
    "AGENT_FAILED",
    "PROTECTED_RTL_MODIFIED",
    "VERIFICATION_ASSETS_MISSING",
    "VERILATOR_FAILED",
  ]),
  authoritative: z.literal(false),
  claim: z.literal("PROJECT_COVERAGE_EXPERIMENT"),
  maxAgentIterations: z
    .int()
    .min(0)
    .max(MAX_AGENT_TURN_ATTEMPT - 1),
  coverageThreshold: z.number().min(0).max(100).nullable(),
  roundsCompleted: z.int().nonnegative().max(MAX_AGENT_TURN_ATTEMPT),
  agentAttempts: z
    .int()
    .nonnegative()
    .max(MAX_AGENT_TURN_ATTEMPT - 1),
  baselineCoverage: CoverageFeedbackSchema.nullable(),
  finalCoverage: CoverageFeedbackSchema.nullable(),
  coverageGain: z.number().min(-100).max(100).nullable(),
  humanReviewRequired: z.literal(true),
  humanReviewRules: z.tuple([
    z.literal("BASELINE_GOLDEN_PASSED"),
    z.literal("CHECKER_MATCHES_PROJECT_BEHAVIOR"),
    z.literal("ASSERTIONS_HAVE_CORRECT_TIMING"),
    z.literal("PROTECTED_RTL_WAS_NOT_MODIFIED"),
    z.literal("RESIDUAL_UNCOVERED_TARGETS_ARE_ACCEPTED"),
  ]),
});

export type ProjectCoverageExperimentResult = z.infer<typeof ProjectCoverageExperimentResultSchema>;

export interface RunProjectCoverageExperimentOptions {
  readonly projectId: CoverageProjectId;
  readonly provider: FixtureProvider;
  readonly caseRef: FixtureCaseRef;
  readonly coverageRunner: CoverageRoundRunner;
  readonly runsRoot: string;
  readonly agentAdapter?: RtlAgentAdapter;
  readonly maxAgentIterations?: number;
  readonly coverageThreshold?: number;
  readonly minimumGain?: number;
  readonly clock?: () => Date;
}

async function rtlSnapshot(run: CoreLoopRun): Promise<ReadonlyMap<string, string>> {
  const files = await scanRegularFiles(path.join(run.workspaceDirectory, "rtl"));
  return new Map(files.map((file) => [`rtl/${file.logicalPath}`, file.contentDigest] as const));
}

function protectedRtlChanged(
  baseline: ReadonlyMap<string, string>,
  current: ReadonlyMap<string, string>,
): boolean {
  const paths = new Set([...baseline.keys(), ...current.keys()]);
  for (const logicalPath of paths) {
    if (MUTABLE_VERIFICATION_PATHS.has(logicalPath)) continue;
    if (baseline.get(logicalPath) !== current.get(logicalPath)) return true;
  }
  return false;
}

async function writeWorkspaceJson(run: CoreLoopRun, logicalPath: string, value: unknown) {
  await writeFile(
    resolveLogicalPath(run.workspaceDirectory, LogicalPathSchema.parse(logicalPath)),
    `${JSON.stringify(value, undefined, 2)}\n`,
    { flag: "wx" },
  );
}

function gain(baseline: CoverageFeedback | null, final: CoverageFeedback | null): number | null {
  if (baseline === null || final === null) return null;
  return Math.round((final.score - baseline.score) * 100) / 100;
}

export async function runProjectCoverageExperiment(
  options: RunProjectCoverageExperimentOptions,
): Promise<{ readonly run: CoreLoopRun; readonly result: ProjectCoverageExperimentResult }> {
  const maxAgentIterations = options.maxAgentIterations ?? 0;
  if (
    !Number.isSafeInteger(maxAgentIterations) ||
    maxAgentIterations < 0 ||
    maxAgentIterations >= MAX_AGENT_TURN_ATTEMPT
  ) {
    throw new TypeError(
      `maxAgentIterations must be an integer from 0 to ${String(MAX_AGENT_TURN_ATTEMPT - 1)}`,
    );
  }
  if (maxAgentIterations > 0 && options.agentAdapter === undefined) {
    throw new TypeError("agentAdapter is required when maxAgentIterations is positive");
  }
  const threshold = options.coverageThreshold;
  if (
    threshold !== undefined &&
    (!Number.isFinite(threshold) || threshold < 0 || threshold > 100)
  ) {
    throw new TypeError("coverageThreshold must be a finite number from 0 to 100");
  }
  const startedAt = options.clock?.() ?? new Date();
  const run = await createCoreLoopRun(
    options.provider,
    {
      schemaVersion: 1,
      caseRef: options.caseRef,
      profile: {
        schemaVersion: 1,
        profileId: `${options.projectId}-coverage-agent-v1`,
        compilerProfileId: `fixed-verilator-${options.projectId}-coverage-v1`,
        maxAttempts: Math.max(1, maxAgentIterations),
        stdoutLimitBytes: 65_536,
        stderrLimitBytes: 65_536,
        maximumIssues: 256,
        issueMessageLimitBytes: 1_024,
      },
    },
    {
      runsRoot: path.join(
        options.runsRoot,
        coverageCaseDirectoryName(options.caseRef.identity.caseId),
      ),
      runDirectoryNameFactory: (_runId, collisionIndex) =>
        coverageRunDirectoryName(startedAt, collisionIndex),
    },
  );
  const protectedBaseline = await rtlSnapshot(run);
  await captureVerificationAssets(run, 0);
  let baselineCoverage: CoverageFeedback | null = null;
  let finalCoverage: CoverageFeedback | null = null;
  let roundsCompleted = 0;
  let agentAttempts = 0;
  let status: ProjectCoverageExperimentResult["status"] = "FAILED";
  let stopReason: ProjectCoverageExperimentResult["stopReason"] = "BASELINE_VERILATOR_FAILED";

  try {
    baselineCoverage = await options.coverageRunner.runRound(run, 1, 0);
    finalCoverage = baselineCoverage;
    roundsCompleted = 1;
    await writeWorkspaceJson(run, "context/coverage-round-1.json", baselineCoverage);
  } catch {
    // The persisted process evidence is authoritative; a failed baseline remains null here.
  }

  if (baselineCoverage !== null) {
    if (maxAgentIterations === 0) {
      status = "PENDING_HUMAN_REVIEW";
      stopReason = "BASELINE_ONLY";
    } else if (threshold !== undefined && baselineCoverage.score >= threshold) {
      status = "PENDING_HUMAN_REVIEW";
      stopReason = "BASELINE_THRESHOLD_REACHED";
    } else if (baselineCoverage.uncoveredTargets.length === 0) {
      status = "PENDING_HUMAN_REVIEW";
      stopReason = "BASELINE_NO_UNCOVERED_TARGETS";
    } else {
      let feedback:
        | { readonly kind: "coverage"; readonly path: string }
        | { readonly kind: "verification"; readonly path: string }
        | { readonly kind: "verilator-compile"; readonly path: string }
        | { readonly kind: "verilator-simulation"; readonly path: string } = {
        kind: "coverage",
        path: "context/coverage-round-1.json",
      };
      const maximumAttempt = maxAgentIterations + 1;
      for (let attempt = 2; attempt <= maximumAttempt; attempt += 1) {
        agentAttempts += 1;
        const sourceFiles = (await scanRegularFiles(path.join(run.workspaceDirectory, "rtl")))
          .map((file) => `rtl/${file.logicalPath}`)
          .sort();
        const input = AgentAttemptInputSchema.parse({
          schemaVersion: 1,
          runId: run.runId,
          attempt,
          category: "SEEDED_COMPILE_REPAIR",
          specPath: "spec.md",
          workspaceRtlRoot: "rtl",
          rtlSourceFiles: sourceFiles,
          protectedRtlPaths: sourceFiles.filter(
            (sourceFile) => !MUTABLE_VERIFICATION_PATHS.has(sourceFile),
          ),
          mutableRtlPaths: [...MUTABLE_VERIFICATION_PATHS].sort(),
          topModule: run.fixture.topModule,
          taskKind: "VERIFICATION_ASSET_GENERATION",
          ...(feedback.kind === "coverage" ? { coverageFeedbackPath: feedback.path } : {}),
          ...(feedback.kind === "verification" ? { verificationFeedbackPath: feedback.path } : {}),
          ...(feedback.kind === "verilator-compile"
            ? { verilatorCompileFeedbackPath: feedback.path }
            : {}),
          ...(feedback.kind === "verilator-simulation"
            ? { verilatorSimulationFeedbackPath: feedback.path }
            : {}),
        });
        const turn = await options.agentAdapter!.runTurn(input, run);
        if (turn.outcome !== "RTL_CHANGED" || !turn.workspaceUsableForCompile) {
          stopReason = "AGENT_FAILED";
          break;
        }
        if (protectedRtlChanged(protectedBaseline, await rtlSnapshot(run))) {
          stopReason = "PROTECTED_RTL_MODIFIED";
          break;
        }
        await captureVerificationAssets(run, attempt);
        const missing = await missingVerificationAssetRequirements(run);
        if (missing.length > 0) {
          if (attempt === maximumAttempt) {
            stopReason = "VERIFICATION_ASSETS_MISSING";
            break;
          }
          const feedbackPath = `context/verification-feedback-attempt-${String(attempt)}.json`;
          await writeWorkspaceJson(
            run,
            feedbackPath,
            VerificationAssetFeedbackSchema.parse({
              schemaVersion: 1,
              runId: run.runId,
              attempt,
              missingRequirements: missing,
            }),
          );
          feedback = { kind: "verification", path: feedbackPath };
          continue;
        }
        const round = roundsCompleted + 1;
        try {
          finalCoverage = await options.coverageRunner.runRound(run, round, attempt);
        } catch (error) {
          if (error instanceof RepairableVerilatorCompileError && attempt < maximumAttempt) {
            const feedbackPath = `context/verilator-compile-feedback-attempt-${String(attempt)}.json`;
            await writeWorkspaceJson(
              run,
              feedbackPath,
              VerilatorCompileFeedbackSchema.parse({
                schemaVersion: 1,
                runId: run.runId,
                attempt,
                stage: "VERILATOR_COMPILE",
                issues: error.issues,
              }),
            );
            feedback = { kind: "verilator-compile", path: feedbackPath };
            continue;
          }
          if (error instanceof RepairableVerilatorSimulationError) {
            const feedbackPath = `context/verilator-simulation-feedback-attempt-${String(attempt)}.json`;
            await writeWorkspaceJson(
              run,
              feedbackPath,
              VerilatorSimulationFeedbackSchema.parse(error.feedback),
            );
            if (attempt < maximumAttempt) {
              feedback = { kind: "verilator-simulation", path: feedbackPath };
              continue;
            }
          }
          stopReason = "VERILATOR_FAILED";
          break;
        }
        roundsCompleted = round;
        await writeWorkspaceJson(
          run,
          `context/coverage-round-${String(round)}.json`,
          finalCoverage,
        );
        if (threshold !== undefined && finalCoverage.score >= threshold) {
          status = "PENDING_HUMAN_REVIEW";
          stopReason = "COVERAGE_THRESHOLD_REACHED";
          break;
        }
        if (finalCoverage.uncoveredTargets.length === 0) {
          status = "PENDING_HUMAN_REVIEW";
          stopReason = "NO_UNCOVERED_TARGETS";
          break;
        }
        if (
          finalCoverage.increment !== null &&
          finalCoverage.increment < (options.minimumGain ?? 0.5)
        ) {
          status = "PENDING_HUMAN_REVIEW";
          stopReason = "NO_MEANINGFUL_GAIN";
          break;
        }
        if (attempt === maximumAttempt) {
          status = "PENDING_HUMAN_REVIEW";
          stopReason = "MAX_ITERATIONS";
          break;
        }
        feedback = { kind: "coverage", path: `context/coverage-round-${String(round)}.json` };
      }
    }
  }

  const result = ProjectCoverageExperimentResultSchema.parse({
    schemaVersion: 1,
    runId: run.runId,
    projectId: options.projectId,
    caseId: options.caseRef.identity.caseId,
    status,
    stopReason,
    authoritative: false,
    claim: "PROJECT_COVERAGE_EXPERIMENT",
    maxAgentIterations,
    coverageThreshold: threshold ?? null,
    roundsCompleted,
    agentAttempts,
    baselineCoverage,
    finalCoverage,
    coverageGain: gain(baselineCoverage, finalCoverage),
    humanReviewRequired: true,
    humanReviewRules: [
      "BASELINE_GOLDEN_PASSED",
      "CHECKER_MATCHES_PROJECT_BEHAVIOR",
      "ASSERTIONS_HAVE_CORRECT_TIMING",
      "PROTECTED_RTL_WAS_NOT_MODIFIED",
      "RESIDUAL_UNCOVERED_TARGETS_ARE_ACCEPTED",
    ],
  });
  await writeFile(
    path.join(run.runDirectory, "evidence", "project-coverage-experiment-result.json"),
    `${JSON.stringify(result, undefined, 2)}\n`,
    { flag: "wx" },
  );
  return { run, result };
}
