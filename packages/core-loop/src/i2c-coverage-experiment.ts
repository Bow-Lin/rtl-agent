import { writeFile } from "node:fs/promises";
import path from "node:path";

import { LogicalPathSchema } from "@rtl-agent/contracts";
import { z } from "zod";

import type { RtlAgentAdapter } from "./agent-adapter.js";
import { AgentAttemptInputSchema, RunIdSchema } from "./contracts.js";
import type { FixtureCaseRef } from "./contracts.js";
import {
  CoverageFeedbackSchema,
  RepairableVerilatorCompileError,
  VerificationAssetFeedbackSchema,
  VerilatorCompileFeedbackSchema,
  coverageCaseDirectoryName,
  coverageRunDirectoryName,
  missingVerificationAssetRequirements,
} from "./coverage-experiment.js";
import type { CoverageFeedback, CoverageRoundRunner } from "./coverage-experiment.js";
import type { FixtureProvider } from "./fixture-provider.js";
import { resolveLogicalPath, scanRegularFiles } from "./filesystem.js";
import { createCoreLoopRun } from "./materialize.js";
import type { CoreLoopRun } from "./materialize.js";

export const I2cCoverageExperimentResultSchema = z.strictObject({
  schemaVersion: z.literal(1),
  runId: RunIdSchema,
  caseId: z.literal("i2c-master"),
  status: z.enum(["PENDING_HUMAN_REVIEW", "FAILED"]),
  stopReason: z.enum([
    "BASELINE_THRESHOLD_REACHED",
    "BASELINE_NO_UNCOVERED_TARGETS",
    "COVERAGE_THRESHOLD_REACHED",
    "NO_UNCOVERED_TARGETS",
    "NO_MEANINGFUL_GAIN",
    "MAX_ROUNDS",
    "MAX_AGENT_ATTEMPTS",
    "BASELINE_VERILATOR_FAILED",
    "AGENT_FAILED",
    "PROTECTED_RTL_MODIFIED",
    "VERIFICATION_ASSETS_MISSING",
    "VERILATOR_FAILED",
  ]),
  authoritative: z.literal(false),
  claim: z.literal("I2C_COVERAGE_EXPERIMENT"),
  roundsCompleted: z.int().nonnegative().max(3),
  agentAttempts: z.int().nonnegative().max(2),
  baselineCoverage: CoverageFeedbackSchema.nullable(),
  finalCoverage: CoverageFeedbackSchema.nullable(),
  coverageGain: z.number().min(-100).max(100).nullable(),
  humanReviewRequired: z.literal(true),
  humanReviewRules: z.tuple([
    z.literal("BASELINE_REGRESSION_PASSED"),
    z.literal("CHECKER_MATCHES_I2C_BEHAVIOR"),
    z.literal("ASSERTIONS_HAVE_CORRECT_TIMING"),
    z.literal("PROTECTED_RTL_WAS_NOT_MODIFIED"),
    z.literal("RESIDUAL_UNCOVERED_TARGETS_ARE_ACCEPTED"),
  ]),
});

export type I2cCoverageExperimentResult = z.infer<typeof I2cCoverageExperimentResultSchema>;

export interface RunI2cCoverageExperimentOptions {
  readonly provider: FixtureProvider;
  readonly caseRef: FixtureCaseRef;
  readonly agentAdapter: RtlAgentAdapter;
  readonly coverageRunner: CoverageRoundRunner;
  readonly runsRoot: string;
  readonly clock?: () => Date;
  readonly coverageThreshold?: number;
  readonly minimumGain?: number;
}

const MUTABLE_VERIFICATION_PATHS = new Set(["rtl/tb.sv", "rtl/checker.sv"]);
const REVIEW_RULES = [
  "BASELINE_REGRESSION_PASSED",
  "CHECKER_MATCHES_I2C_BEHAVIOR",
  "ASSERTIONS_HAVE_CORRECT_TIMING",
  "PROTECTED_RTL_WAS_NOT_MODIFIED",
  "RESIDUAL_UNCOVERED_TARGETS_ARE_ACCEPTED",
] as const;

async function rtlSnapshot(run: CoreLoopRun): Promise<ReadonlyMap<string, string>> {
  const files = await scanRegularFiles(path.join(run.workspaceDirectory, "rtl"));
  return new Map(files.map((file) => [`rtl/${file.logicalPath}`, file.contentDigest] as const));
}

function protectedRtlChanged(
  baseline: ReadonlyMap<string, string>,
  current: ReadonlyMap<string, string>,
): boolean {
  const allPaths = new Set([...baseline.keys(), ...current.keys()]);
  for (const logicalPath of allPaths) {
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

function coverageGain(
  baseline: CoverageFeedback | null,
  finalCoverage: CoverageFeedback | null,
): number | null {
  if (baseline === null || finalCoverage === null) return null;
  return Math.round((finalCoverage.score - baseline.score) * 100) / 100;
}

export async function runI2cCoverageExperiment(
  options: RunI2cCoverageExperimentOptions,
): Promise<{ readonly run: CoreLoopRun; readonly result: I2cCoverageExperimentResult }> {
  const threshold = options.coverageThreshold ?? 90;
  const minimumGain = options.minimumGain ?? 0.5;
  const startedAt = options.clock?.() ?? new Date();
  const run = await createCoreLoopRun(
    options.provider,
    {
      schemaVersion: 1,
      caseRef: options.caseRef,
      profile: {
        schemaVersion: 1,
        profileId: "freecores-i2c-coverage-agent-v1",
        compilerProfileId: "fixed-verilator-i2c-coverage-v1",
        maxAttempts: 3,
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
  let baselineCoverage: CoverageFeedback | null;
  let finalCoverage: CoverageFeedback | null = null;
  let roundsCompleted = 0;
  let agentAttempts = 0;
  let status: I2cCoverageExperimentResult["status"] = "FAILED";
  let stopReason: I2cCoverageExperimentResult["stopReason"] = "BASELINE_VERILATOR_FAILED";

  try {
    baselineCoverage = await options.coverageRunner.runRound(run, 1, 0);
    finalCoverage = baselineCoverage;
    roundsCompleted = 1;
    await writeWorkspaceJson(run, "context/coverage-round-1.json", baselineCoverage);
  } catch {
    baselineCoverage = null;
  }

  if (baselineCoverage !== null) {
    if (baselineCoverage.score >= threshold) {
      status = "PENDING_HUMAN_REVIEW";
      stopReason = "BASELINE_THRESHOLD_REACHED";
    } else if (baselineCoverage.uncoveredTargets.length === 0) {
      status = "PENDING_HUMAN_REVIEW";
      stopReason = "BASELINE_NO_UNCOVERED_TARGETS";
    } else {
      let feedback:
        | { readonly kind: "coverage"; readonly path: string }
        | { readonly kind: "verification"; readonly path: string }
        | { readonly kind: "verilator-compile"; readonly path: string } = {
        kind: "coverage",
        path: "context/coverage-round-1.json",
      };
      for (let attempt = 2; attempt <= 3; attempt += 1) {
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
        });
        const turn = await options.agentAdapter.runTurn(input, run);
        if (turn.outcome !== "RTL_CHANGED" || !turn.workspaceUsableForCompile) {
          stopReason = "AGENT_FAILED";
          break;
        }
        if (protectedRtlChanged(protectedBaseline, await rtlSnapshot(run))) {
          stopReason = "PROTECTED_RTL_MODIFIED";
          break;
        }
        const missing = await missingVerificationAssetRequirements(run);
        if (missing.length > 0) {
          if (attempt === 3) {
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
          if (error instanceof RepairableVerilatorCompileError && attempt < 3) {
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
          stopReason = "VERILATOR_FAILED";
          break;
        }
        roundsCompleted = round;
        await writeWorkspaceJson(
          run,
          `context/coverage-round-${String(round)}.json`,
          finalCoverage,
        );
        if (finalCoverage.score >= threshold) {
          status = "PENDING_HUMAN_REVIEW";
          stopReason = "COVERAGE_THRESHOLD_REACHED";
          break;
        }
        if (finalCoverage.uncoveredTargets.length === 0) {
          status = "PENDING_HUMAN_REVIEW";
          stopReason = "NO_UNCOVERED_TARGETS";
          break;
        }
        if (finalCoverage.increment !== null && finalCoverage.increment < minimumGain) {
          status = "PENDING_HUMAN_REVIEW";
          stopReason = "NO_MEANINGFUL_GAIN";
          break;
        }
        if (round === 3) {
          status = "PENDING_HUMAN_REVIEW";
          stopReason = "MAX_ROUNDS";
          break;
        }
        feedback = {
          kind: "coverage",
          path: `context/coverage-round-${String(round)}.json`,
        };
      }
      if (
        status === "FAILED" &&
        roundsCompleted > 1 &&
        stopReason === "BASELINE_VERILATOR_FAILED"
      ) {
        status = "PENDING_HUMAN_REVIEW";
        stopReason = "MAX_AGENT_ATTEMPTS";
      }
    }
  }

  const result = I2cCoverageExperimentResultSchema.parse({
    schemaVersion: 1,
    runId: run.runId,
    caseId: "i2c-master",
    status,
    stopReason,
    authoritative: false,
    claim: "I2C_COVERAGE_EXPERIMENT",
    roundsCompleted,
    agentAttempts,
    baselineCoverage,
    finalCoverage,
    coverageGain: coverageGain(baselineCoverage, finalCoverage),
    humanReviewRequired: true,
    humanReviewRules: REVIEW_RULES,
  });
  await writeFile(
    path.join(run.runDirectory, "evidence", "i2c-coverage-experiment-result.json"),
    `${JSON.stringify(result, undefined, 2)}\n`,
    { flag: "wx" },
  );
  return { run, result };
}
