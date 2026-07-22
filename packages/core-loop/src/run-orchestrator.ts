import path from "node:path";

import { LogicalPathSchema } from "@rtl-agent/contracts";

import { AgentTurnResultSchema } from "./agent-contracts.js";
import type { AgentTurnResult, OpenCodeCapability } from "./agent-contracts.js";
import type { RtlAgentAdapter } from "./agent-adapter.js";
import { prepareCompileRequest } from "./compile-preparation.js";
import type { IcarusCapability } from "./compiler-contracts.js";
import { AgentAttemptInputSchema, CompileResultSchema, FinalResultSchema } from "./contracts.js";
import type { CompileRequest, CompileResult, FinalResult, ToolVersion } from "./contracts.js";
import {
  CaseValidationResultSchema,
  CompileObservationSchema,
  CompilerCapabilityLockSchema,
  CompleteRunExecutionResultSchema,
  CoreLoopRunStateSchema,
  IncompleteRunExecutionResultSchema,
} from "./evaluation-contracts.js";
import type {
  CaseValidationResult,
  CompileObservation,
  CompilerCapabilityLock,
  CompleteRunExecutionResult,
  CoreLoopRunState,
  FailureStage,
  IncompleteRunExecutionResult,
  RunExecutionResult,
} from "./evaluation-contracts.js";
import {
  EvidenceWriteError,
  copyRegularTreeToEvidence,
  ensureJsonEvidence,
  writeJsonEvidenceExclusive,
  writeJsonReplacingAtomic,
} from "./evidence.js";
import { sha256Jcs } from "./filesystem.js";
import type { CoreLoopRun } from "./materialize.js";
import { createBaselineWorkspaceManifest, createFileManifest } from "./manifest.js";
import type { FileManifest } from "./manifest.js";

export interface CoreLoopCompilerAdapter {
  probe(): Promise<IcarusCapability>;
  compile(
    request: CompileRequest,
    workspace: {
      readonly runId: CoreLoopRun["runId"];
      readonly runDirectory: string;
      readonly workspaceDirectory: string;
    },
  ): Promise<CompileResult>;
}

export interface RunClock {
  now(): Date;
  monotonicNow(): number;
}

const SYSTEM_CLOCK: RunClock = {
  now: () => new Date(),
  monotonicNow: () => performance.now(),
};

export interface ValidatedCoreLoopRun {
  readonly run: CoreLoopRun;
  readonly validation: CaseValidationResult;
  readonly baselineCompileResult?: CompileResult;
  readonly nextStateSequence: number;
}

export interface ValidateRunBaselineOptions {
  readonly caseIndex: number;
  readonly compilerAdapter: CoreLoopCompilerAdapter;
  readonly lockedCompilerCapability: CompilerCapabilityLock;
  readonly clock?: RunClock;
}

export interface ExecuteCoreLoopRunOptions {
  readonly agentAdapter: RtlAgentAdapter;
  readonly compilerAdapter: CoreLoopCompilerAdapter;
  readonly lockedAgentCapability: OpenCodeCapability;
  readonly lockedCompilerCapability: CompilerCapabilityLock;
  readonly clock?: RunClock;
}

export function compilerCapabilityLockFromCapability(
  capability: IcarusCapability,
): CompilerCapabilityLock {
  return CompilerCapabilityLockSchema.parse({
    schemaVersion: capability.schemaVersion,
    compilerProfileId: capability.compilerProfileId,
    executableProduct: capability.executableProduct,
    executableDigest: capability.executableDigest,
    toolVersion: capability.toolVersion,
    profileDigest: capability.profileDigest,
    platform: capability.platform,
  });
}

export function compilerCapabilityMatches(
  capability: IcarusCapability,
  locked: CompilerCapabilityLock,
): boolean {
  return sha256Jcs(compilerCapabilityLockFromCapability(capability)) === sha256Jcs(locked);
}

export function agentCapabilityMatches(
  capability: OpenCodeCapability,
  locked: OpenCodeCapability,
): boolean {
  return sha256Jcs(capability) === sha256Jcs(locked);
}

function agentTurnMatchesLock(result: AgentTurnResult, locked: OpenCodeCapability): boolean {
  return (
    result.openCodeVersion === locked.openCodeVersion &&
    result.model === locked.model &&
    result.variant === locked.variant &&
    result.resolvedConfigDigest === locked.resolvedConfigDigest &&
    result.resolvedAgentPermissionDigest === locked.resolvedAgentPermissionDigest &&
    result.agentFileDigest === locked.agentFileDigest &&
    result.skillFileDigest === locked.skillFileDigest &&
    result.guidanceFileDigest === locked.guidanceFileDigest &&
    result.experimentConfigDigest === locked.experimentConfigDigest
  );
}

function statePath(sequence: number): ReturnType<typeof LogicalPathSchema.parse> {
  return LogicalPathSchema.parse(`evidence/states/${String(sequence).padStart(4, "0")}.json`);
}

async function writeState(
  run: CoreLoopRun,
  sequence: number,
  state: CoreLoopRunState["state"],
  clock: RunClock,
): Promise<number> {
  const value = CoreLoopRunStateSchema.parse({
    schemaVersion: 1,
    runId: run.runId,
    sequence,
    state,
    at: clock.now().toISOString(),
  });
  await writeJsonEvidenceExclusive(run.runDirectory, statePath(sequence), value);
  return sequence + 1;
}

async function probeCompilerLocked(
  adapter: CoreLoopCompilerAdapter,
  locked: CompilerCapabilityLock,
): Promise<boolean> {
  try {
    return compilerCapabilityMatches(await adapter.probe(), locked);
  } catch {
    return false;
  }
}

function caseValidation(
  run: CoreLoopRun,
  caseIndex: number,
  status: CaseValidationResult["status"],
  message: string,
  baselinePreparationStatus: CaseValidationResult["baselinePreparationStatus"],
  baselineCompileStatus: CaseValidationResult["baselineCompileStatus"],
): CaseValidationResult {
  return CaseValidationResultSchema.parse({
    schemaVersion: 1,
    caseIndex,
    caseRef: run.request.caseRef,
    status,
    runId: run.runId,
    category: run.fixture.category,
    normalizedFixtureDigest: run.fixture.normalizedFixtureDigest,
    baselinePreparationStatus,
    baselineCompileStatus,
    message,
  });
}

export async function validateCoreLoopRunBaseline(
  run: CoreLoopRun,
  options: ValidateRunBaselineOptions,
): Promise<ValidatedCoreLoopRun> {
  const clock = options.clock ?? SYSTEM_CLOCK;
  let sequence = 1;
  await writeJsonEvidenceExclusive(
    run.runDirectory,
    "evidence/dataset-provenance.json",
    run.fixture.provenance,
  );
  sequence = await writeState(run, sequence, "MATERIALIZING", clock);
  sequence = await writeState(run, sequence, "BASELINE_PREPARING", clock);
  const preparation = await prepareCompileRequest(run, 0);
  await writeJsonEvidenceExclusive(
    run.runDirectory,
    "evidence/baseline/compile-preparation.json",
    preparation,
  );

  if (run.fixture.category !== "SEEDED_COMPILE_REPAIR") {
    const valid = preparation.status === "NO_RTL_SOURCE";
    const prompted = run.fixture.category === "PROMPTED_FUNCTIONAL_REPAIR";
    return {
      run,
      validation: caseValidation(
        run,
        options.caseIndex,
        valid ? "VALID" : prompted ? "INVALID_PROMPT_ONLY_BASELINE" : "INVALID_BLANK_BASELINE",
        valid
          ? prompted
            ? "Prompted functional-repair fixture has the expected compiler-not-invoked baseline"
            : "Blank fixture has the expected compiler-not-invoked baseline"
          : "Prompt-only fixture baseline did not produce NO_RTL_SOURCE",
        preparation.status,
        null,
      ),
      nextStateSequence: sequence,
    };
  }

  if (preparation.status !== "READY") {
    return {
      run,
      validation: caseValidation(
        run,
        options.caseIndex,
        "INVALID_FIXTURE_PREPARATION",
        "Seeded fixture did not produce a READY baseline compile request",
        preparation.status,
        null,
      ),
      nextStateSequence: sequence,
    };
  }

  sequence = await writeState(run, sequence, "BASELINE_COMPILING", clock);
  if (!(await probeCompilerLocked(options.compilerAdapter, options.lockedCompilerCapability))) {
    return {
      run,
      validation: caseValidation(
        run,
        options.caseIndex,
        "INFRASTRUCTURE_INVALID",
        "Compiler capability did not match the locked evaluation profile",
        preparation.status,
        null,
      ),
      nextStateSequence: sequence,
    };
  }

  let result: CompileResult;
  try {
    result = CompileResultSchema.parse(
      await options.compilerAdapter.compile(preparation.request, run),
    );
  } catch {
    return {
      run,
      validation: caseValidation(
        run,
        options.caseIndex,
        "INFRASTRUCTURE_INVALID",
        "Compiler adapter failed during seeded baseline validation",
        preparation.status,
        null,
      ),
      nextStateSequence: sequence,
    };
  }
  if (!resultBoundToRequest(result, preparation.request)) {
    return {
      run,
      validation: caseValidation(
        run,
        options.caseIndex,
        "INFRASTRUCTURE_INVALID",
        "Baseline compiler result did not match its locked request",
        preparation.status,
        null,
      ),
      nextStateSequence: sequence,
    };
  }
  await writeJsonEvidenceExclusive(
    run.runDirectory,
    "evidence/baseline/compile-result.json",
    result,
  );

  const status: CaseValidationResult["status"] =
    result.status === "COMPILE_ERROR"
      ? "VALID"
      : result.status === "COMPILE_PASSED"
        ? "INVALID_SEEDED_BASELINE_PASSED"
        : "INFRASTRUCTURE_INVALID";
  const message =
    result.status === "COMPILE_ERROR"
      ? "Seeded fixture has the expected repairable compile-error baseline"
      : result.status === "COMPILE_PASSED"
        ? "Seeded fixture unexpectedly passed baseline compilation"
        : "Seeded baseline compiler execution was infrastructure-invalid";
  return {
    run,
    validation: caseValidation(
      run,
      options.caseIndex,
      status,
      message,
      preparation.status,
      result.status,
    ),
    baselineCompileResult: result,
    nextStateSequence: sequence,
  };
}

async function rtlManifest(run: CoreLoopRun): Promise<FileManifest> {
  return createFileManifest(run.workspaceDirectory, (logicalPath) =>
    logicalPath.startsWith("rtl/"),
  );
}

function compileObservation(
  phase: CompileObservation["phase"],
  result: CompileResult,
): CompileObservation {
  return CompileObservationSchema.parse({
    phase,
    attempt: result.attempt,
    status: result.status,
    durationMs: result.durationMs,
    issues: result.issues,
  });
}

function sameCompileRequest(left: CompileRequest, right: CompileRequest): boolean {
  return sha256Jcs(left) === sha256Jcs(right);
}

function resultBoundToRequest(result: CompileResult, request: CompileRequest): boolean {
  return (
    result.runId === request.runId &&
    result.attempt === request.attempt &&
    result.compilerProfileId === request.compilerProfileId &&
    result.topModule === request.topModule &&
    result.workspaceManifestDigest === request.workspaceManifestDigest
  );
}

function incompleteResult(
  run: CoreLoopRun,
  attemptCount: number,
  startedAt: string,
  startedMonotonic: number,
  observations: readonly CompileObservation[],
  firstAttemptCompileError: boolean,
  failureStage: FailureStage,
  message: string,
  clock: RunClock,
): IncompleteRunExecutionResult {
  return IncompleteRunExecutionResultSchema.parse({
    schemaVersion: 1,
    status: "INCOMPLETE",
    runId: run.runId,
    fixtureId: run.fixture.fixtureId,
    fixtureIdentity: run.fixture.provenance.identity,
    category: run.fixture.category,
    attemptCount,
    startedAt,
    completedAt: clock.now().toISOString(),
    durationMs: Math.max(0, Math.round(clock.monotonicNow() - startedMonotonic)),
    compileObservations: observations,
    firstAttemptCompileError,
    failureOrigin: "INFRASTRUCTURE",
    failureStage,
    message,
  });
}

interface CompleteParameters {
  readonly outcome: FinalResult["outcome"];
  readonly toolVersion: ToolVersion | null;
  readonly evaluationValidity: CompleteRunExecutionResult["evaluationValidity"];
  readonly failureStage: FailureStage | null;
  readonly passAttempt: number | null;
}

export async function executeValidatedCoreLoopRun(
  validated: ValidatedCoreLoopRun,
  options: ExecuteCoreLoopRunOptions,
): Promise<RunExecutionResult> {
  const run = validated.run;
  const clock = options.clock ?? SYSTEM_CLOCK;
  const startedAt = clock.now().toISOString();
  const startedMonotonic = clock.monotonicNow();
  const observations: CompileObservation[] = [];
  let firstAttemptCompileError = false;
  let attemptCount = 0;
  let sequence = validated.nextStateSequence;
  let activeStage: FailureStage = "ORCHESTRATOR";

  if (validated.validation.status !== "VALID") {
    return incompleteResult(
      run,
      attemptCount,
      startedAt,
      startedMonotonic,
      observations,
      firstAttemptCompileError,
      "BATCH_PREFLIGHT",
      "Run evaluation cannot start before a valid baseline",
      clock,
    );
  }

  const complete = async (parameters: CompleteParameters): Promise<CompleteRunExecutionResult> => {
    activeStage = "FINAL_VALIDATION";
    const finalRtlManifest = await rtlManifest(run);
    activeStage = "EVIDENCE_WRITE";
    await writeJsonEvidenceExclusive(
      run.runDirectory,
      "evidence/final-rtl-manifest.json",
      finalRtlManifest,
    );
    const completedAt = clock.now().toISOString();
    const durationMs = Math.max(0, Math.round(clock.monotonicNow() - startedMonotonic));
    const finalResult = FinalResultSchema.parse({
      schemaVersion: 1,
      authoritative: false,
      claim: "COMPILE_ONLY",
      outcome: parameters.outcome,
      runId: run.runId,
      fixtureId: run.fixture.fixtureId,
      fixtureIdentity: run.fixture.provenance.identity,
      normalizedFixtureDigest: run.fixture.normalizedFixtureDigest,
      profileId: run.request.profile.profileId,
      compilerProfileId: run.request.profile.compilerProfileId,
      toolVersion: parameters.toolVersion,
      attemptCount,
      finalRtlManifestDigest: finalRtlManifest.manifestDigest,
      startedAt,
      completedAt,
    });
    const summary = CompleteRunExecutionResultSchema.parse({
      schemaVersion: 1,
      status: "COMPLETE",
      runId: run.runId,
      fixtureId: run.fixture.fixtureId,
      fixtureIdentity: run.fixture.provenance.identity,
      category: run.fixture.category,
      attemptCount,
      startedAt,
      completedAt,
      durationMs,
      compileObservations: observations,
      firstAttemptCompileError,
      evaluationValidity: parameters.evaluationValidity,
      failureStage: parameters.failureStage,
      passAttempt: parameters.passAttempt,
      finalResult,
    });
    sequence = await writeState(run, sequence, "COMPLETED", clock);
    await writeJsonEvidenceExclusive(run.runDirectory, "evidence/final-result.json", finalResult);
    return summary;
  };

  let previousCompileResult = validated.baselineCompileResult;
  try {
    for (let attempt = 1; attempt <= run.request.profile.maxAttempts; attempt += 1) {
      attemptCount = attempt;
      const attemptRoot = `evidence/attempts/${String(attempt)}`;
      const sourceManifest = await rtlManifest(run);
      const input = AgentAttemptInputSchema.parse({
        schemaVersion: 1,
        runId: run.runId,
        attempt,
        category: run.fixture.category,
        specPath: "spec.md",
        workspaceRtlRoot: "rtl",
        rtlSourceFiles: sourceManifest.entries.map((entry) => entry.path),
        topModule: run.fixture.topModule,
        ...(previousCompileResult === undefined
          ? {}
          : { previousCompileResultPath: "context/previous-compile-result.json" }),
      });

      if (previousCompileResult !== undefined) {
        await writeJsonReplacingAtomic(
          path.join(run.workspaceDirectory, "context", "previous-compile-result.json"),
          previousCompileResult,
        );
        await writeJsonEvidenceExclusive(
          run.runDirectory,
          `${attemptRoot}/previous-compile-result.json`,
          previousCompileResult,
        );
      }
      await writeJsonEvidenceExclusive(run.runDirectory, `${attemptRoot}/agent-input.json`, input);
      const beforeManifest = await createBaselineWorkspaceManifest(run.runDirectory);
      await writeJsonEvidenceExclusive(
        run.runDirectory,
        `${attemptRoot}/workspace-before-manifest.json`,
        beforeManifest,
      );
      await copyRegularTreeToEvidence(
        path.join(run.workspaceDirectory, "rtl"),
        run.runDirectory,
        `${attemptRoot}/rtl-before`,
      );

      activeStage = "AGENT_ATTEMPT";
      sequence = await writeState(run, sequence, "AGENT_RUNNING", clock);
      const rawAgentResult = await options.agentAdapter.runTurn(input, run);
      const agentResult = AgentTurnResultSchema.parse(rawAgentResult);
      if (
        agentResult.runId !== run.runId ||
        agentResult.attempt !== attempt ||
        agentResult.evidencePath !== `evidence/attempts/${String(attempt)}/agent-turn-result.json`
      ) {
        throw new Error("Agent result binding mismatch");
      }
      await ensureJsonEvidence(run.runDirectory, agentResult.evidencePath, agentResult);
      sequence = await writeState(run, sequence, "AGENT_VALIDATING", clock);
      const afterManifest = await createBaselineWorkspaceManifest(run.runDirectory);
      await writeJsonEvidenceExclusive(
        run.runDirectory,
        `${attemptRoot}/workspace-after-manifest.json`,
        afterManifest,
      );
      await copyRegularTreeToEvidence(
        path.join(run.workspaceDirectory, "rtl"),
        run.runDirectory,
        `${attemptRoot}/rtl-after`,
      );

      if (!agentTurnMatchesLock(agentResult, options.lockedAgentCapability)) {
        return await complete({
          outcome: "TOOL_ERROR",
          toolVersion: options.lockedCompilerCapability.toolVersion,
          evaluationValidity: "INFRASTRUCTURE_INVALID",
          failureStage: "AGENT_ATTEMPT",
          passAttempt: null,
        });
      }

      if (agentResult.outcome === "POLICY_VIOLATION") {
        return await complete({
          outcome: "POLICY_VIOLATION",
          toolVersion: options.lockedCompilerCapability.toolVersion,
          evaluationValidity: "EVALUATION_VALID",
          failureStage: "AGENT_ATTEMPT",
          passAttempt: null,
        });
      }
      if (agentResult.outcome === "NO_RTL_CHANGE") {
        return await complete({
          outcome: "NO_RTL_CHANGE",
          toolVersion: options.lockedCompilerCapability.toolVersion,
          evaluationValidity: "EVALUATION_VALID",
          failureStage: "AGENT_ATTEMPT",
          passAttempt: null,
        });
      }
      if (agentResult.outcome === "AGENT_PROCESS_ERROR") {
        return await complete({
          outcome: "AGENT_FAILED",
          toolVersion: options.lockedCompilerCapability.toolVersion,
          evaluationValidity: "EVALUATION_VALID",
          failureStage: "AGENT_ATTEMPT",
          passAttempt: null,
        });
      }
      if (agentResult.outcome === "AGENT_TIMEOUT") {
        return await complete({
          outcome: "TIMEOUT",
          toolVersion: options.lockedCompilerCapability.toolVersion,
          evaluationValidity: "EVALUATION_VALID",
          failureStage: "AGENT_ATTEMPT",
          passAttempt: null,
        });
      }

      activeStage = "ATTEMPT_PREPARATION";
      sequence = await writeState(run, sequence, "COMPILE_PREPARING", clock);
      const preparation = await prepareCompileRequest(run, attempt);
      await writeJsonEvidenceExclusive(
        run.runDirectory,
        `${attemptRoot}/compile/preparation.json`,
        preparation,
      );
      if (preparation.status !== "READY") {
        const policyViolation =
          preparation.status === "UNSUPPORTED_INCLUDE_DIRECTIVE" ||
          preparation.status === "SOURCE_POLICY_VIOLATION";
        return await complete({
          outcome: policyViolation ? "POLICY_VIOLATION" : "AGENT_FAILED",
          toolVersion: options.lockedCompilerCapability.toolVersion,
          evaluationValidity: "EVALUATION_VALID",
          failureStage: "ATTEMPT_PREPARATION",
          passAttempt: null,
        });
      }

      activeStage = "ATTEMPT_COMPILE";
      sequence = await writeState(run, sequence, "COMPILING", clock);
      if (!(await probeCompilerLocked(options.compilerAdapter, options.lockedCompilerCapability))) {
        return await complete({
          outcome: "TOOL_ERROR",
          toolVersion: options.lockedCompilerCapability.toolVersion,
          evaluationValidity: "INFRASTRUCTURE_INVALID",
          failureStage: "ATTEMPT_COMPILE",
          passAttempt: null,
        });
      }
      const compileResult = CompileResultSchema.parse(
        await options.compilerAdapter.compile(preparation.request, run),
      );
      if (!resultBoundToRequest(compileResult, preparation.request)) {
        throw new Error("Compile result binding mismatch");
      }
      await writeJsonEvidenceExclusive(
        run.runDirectory,
        `${attemptRoot}/compile/result.json`,
        compileResult,
      );
      observations.push(compileObservation("ATTEMPT", compileResult));
      if (attempt === 1 && compileResult.status === "COMPILE_ERROR") {
        firstAttemptCompileError = true;
      }

      if (compileResult.status === "COMPILE_ERROR") {
        if (attempt === run.request.profile.maxAttempts) {
          return await complete({
            outcome: "MAX_ATTEMPTS",
            toolVersion: compileResult.toolVersion,
            evaluationValidity: "EVALUATION_VALID",
            failureStage: "ATTEMPT_COMPILE",
            passAttempt: null,
          });
        }
        previousCompileResult = compileResult;
        continue;
      }
      if (compileResult.status === "TIMEOUT") {
        return await complete({
          outcome: "TIMEOUT",
          toolVersion: compileResult.toolVersion,
          evaluationValidity: "EVALUATION_VALID",
          failureStage: "ATTEMPT_COMPILE",
          passAttempt: null,
        });
      }
      if (compileResult.status === "TOOL_ERROR") {
        return await complete({
          outcome: "TOOL_ERROR",
          toolVersion: compileResult.toolVersion,
          evaluationValidity: "INFRASTRUCTURE_INVALID",
          failureStage: "ATTEMPT_COMPILE",
          passAttempt: null,
        });
      }

      activeStage = "FINAL_RECOMPILE";
      sequence = await writeState(run, sequence, "FINAL_RECOMPILING", clock);
      const finalPreparation = await prepareCompileRequest(run, attempt);
      await writeJsonEvidenceExclusive(
        run.runDirectory,
        `${attemptRoot}/final-recompile/preparation.json`,
        finalPreparation,
      );
      if (
        finalPreparation.status !== "READY" ||
        !sameCompileRequest(preparation.request, finalPreparation.request)
      ) {
        return await complete({
          outcome: "TOOL_ERROR",
          toolVersion: compileResult.toolVersion,
          evaluationValidity: "INFRASTRUCTURE_INVALID",
          failureStage: "FINAL_RECOMPILE",
          passAttempt: null,
        });
      }
      if (!(await probeCompilerLocked(options.compilerAdapter, options.lockedCompilerCapability))) {
        return await complete({
          outcome: "TOOL_ERROR",
          toolVersion: options.lockedCompilerCapability.toolVersion,
          evaluationValidity: "INFRASTRUCTURE_INVALID",
          failureStage: "FINAL_RECOMPILE",
          passAttempt: null,
        });
      }
      const finalCompileResult = CompileResultSchema.parse(
        await options.compilerAdapter.compile(finalPreparation.request, run),
      );
      if (!resultBoundToRequest(finalCompileResult, finalPreparation.request)) {
        throw new Error("Final compile result binding mismatch");
      }
      await writeJsonEvidenceExclusive(
        run.runDirectory,
        `${attemptRoot}/final-recompile/result.json`,
        finalCompileResult,
      );
      observations.push(compileObservation("FINAL_RECOMPILE", finalCompileResult));

      if (
        finalCompileResult.status === "COMPILE_PASSED" &&
        finalCompileResult.toolVersion === compileResult.toolVersion
      ) {
        return await complete({
          outcome: "COMPILE_PASSED",
          toolVersion: finalCompileResult.toolVersion,
          evaluationValidity: "EVALUATION_VALID",
          failureStage: null,
          passAttempt: attempt,
        });
      }
      if (finalCompileResult.status === "TIMEOUT") {
        return await complete({
          outcome: "TIMEOUT",
          toolVersion: finalCompileResult.toolVersion,
          evaluationValidity: "EVALUATION_VALID",
          failureStage: "FINAL_RECOMPILE",
          passAttempt: null,
        });
      }
      return await complete({
        outcome: "TOOL_ERROR",
        toolVersion: finalCompileResult.toolVersion,
        evaluationValidity: "INFRASTRUCTURE_INVALID",
        failureStage: "FINAL_RECOMPILE",
        passAttempt: null,
      });
    }
    throw new Error("Attempt loop exhausted without a terminal result");
  } catch (error) {
    return incompleteResult(
      run,
      attemptCount,
      startedAt,
      startedMonotonic,
      observations,
      firstAttemptCompileError,
      error instanceof EvidenceWriteError ? "EVIDENCE_WRITE" : activeStage,
      error instanceof EvidenceWriteError
        ? "Required run evidence could not be committed"
        : "Run orchestration did not produce a trustworthy terminal result",
      clock,
    );
  }
}
