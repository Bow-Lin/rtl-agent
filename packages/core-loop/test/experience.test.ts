import { glob, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CompleteRunExecutionResultSchema,
  ExperienceRecordSchema,
  ExperienceSummarizerOutputSchema,
  FixtureCaseRefSchema,
  FunctionalCaseResultSchema,
  PiExperienceSummarizer,
  RunIdSchema,
  classifyExperienceEligibility,
  sha256Bytes,
  summarizeCaseExperienceBestEffort,
} from "../src/index.js";
import type {
  CompileObservation,
  ExperienceSummaryRequest,
  FunctionalCaseResult,
  PiExperimentConfig,
  RunExecutionResult,
} from "../src/index.js";

const roots: string[] = [];
const runId = RunIdSchema.parse("run_323e4567-e89b-42d3-a456-426614174000");
const startedAt = "2026-08-10T01:00:00.000Z";
const completedAt = "2026-08-10T01:00:01.000Z";
const digest = sha256Bytes(Buffer.from("experience-test"));

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

const caseRef = FixtureCaseRefSchema.parse({
  schemaVersion: 1,
  fixtureId: "experience-case",
  identity: {
    datasetId: "experience-dataset",
    datasetVersion: "v1",
    split: "build",
    caseId: "case-001",
  },
  caseSourceDigest: digest,
});

function compileObservation(
  attempt: number,
  phase: "ATTEMPT" | "FINAL_RECOMPILE",
  status: "COMPILE_PASSED" | "COMPILE_ERROR" = "COMPILE_PASSED",
): CompileObservation {
  return { phase, attempt, status, durationMs: 1, issues: [] };
}

function completeRun(options: {
  attemptCount: number;
  observations: readonly CompileObservation[];
  outcome?: "COMPILE_PASSED" | "MAX_ATTEMPTS";
}): RunExecutionResult {
  const outcome = options.outcome ?? "COMPILE_PASSED";
  const passAttempt =
    outcome === "COMPILE_PASSED"
      ? (options.observations.find(
          (item) => item.phase === "FINAL_RECOMPILE" && item.status === "COMPILE_PASSED",
        )?.attempt ?? null)
      : null;
  return CompleteRunExecutionResultSchema.parse({
    schemaVersion: 1,
    runId,
    fixtureId: caseRef.fixtureId,
    fixtureIdentity: caseRef.identity,
    category: "BLANK_GENERATION",
    attemptCount: options.attemptCount,
    startedAt,
    completedAt,
    durationMs: 1_000,
    compileObservations: options.observations,
    firstAttemptCompileError: options.observations.some(
      (item) => item.attempt === 1 && item.phase === "ATTEMPT" && item.status === "COMPILE_ERROR",
    ),
    status: "COMPLETE",
    evaluationValidity: "EVALUATION_VALID",
    failureStage: outcome === "COMPILE_PASSED" ? null : "ATTEMPT_COMPILE",
    passAttempt,
    finalResult: {
      schemaVersion: 1,
      authoritative: false,
      claim: "COMPILE_ONLY",
      runId,
      fixtureId: caseRef.fixtureId,
      fixtureIdentity: caseRef.identity,
      normalizedFixtureDigest: digest,
      profileId: "experience-test-profile",
      compilerProfileId: "iverilog-systemverilog-2012-v1",
      attemptCount: options.attemptCount,
      finalRtlManifestDigest: digest,
      startedAt,
      completedAt,
      outcome,
      toolVersion: "Icarus Verilog version 12.0",
    },
  });
}

function functional(
  attempt: number,
  status: "PASSED" | "MISMATCH" | "SIMULATION_TIMEOUT",
  repairIterations: number,
): FunctionalCaseResult {
  return FunctionalCaseResultSchema.parse({
    schemaVersion: 1,
    caseRef,
    runId,
    status,
    mismatches: status === "MISMATCH" ? 3 : status === "PASSED" ? 0 : null,
    samples: status === "PASSED" || status === "MISMATCH" ? 20 : null,
    compileExitCode: status === "SIMULATION_TIMEOUT" ? null : 0,
    simulationExitCode: status === "SIMULATION_TIMEOUT" ? null : 0,
    compileDurationMs: 2,
    simulationDurationMs: 3,
    stdout: null,
    stderr: null,
    agentAttempt: attempt,
    repairIterations,
  });
}

describe("Experience eligibility", () => {
  it("requires an auditable missing public fact when a summary is rejected", () => {
    expect(
      ExperienceSummarizerOutputSchema.safeParse({
        schema_version: 1,
        status: "REJECTED",
        reason: "ROOT_CAUSE_UNCONFIRMED",
      }).success,
    ).toBe(false);
    expect(
      ExperienceSummarizerOutputSchema.safeParse({
        schema_version: 1,
        status: "REJECTED",
        reason: "ROOT_CAUSE_UNCONFIRMED",
        missing_fact: "FINAL_REPAIR_NOT_LINKED_TO_DEFECT",
        detail: "The final RTL change is unrelated to the defect visible in the initial candidate.",
      }).success,
    ).toBe(true);
  });

  it("keeps a first functional pass as a non-debug design observation", () => {
    const run = completeRun({
      attemptCount: 1,
      observations: [compileObservation(1, "ATTEMPT"), compileObservation(1, "FINAL_RECOMPILE")],
    });
    expect(
      classifyExperienceEligibility({
        caseRef,
        run,
        functionalResults: [functional(1, "PASSED", 0)],
      }),
    ).toEqual({
      schema_version: 1,
      status: "ELIGIBLE",
      kind: "design_observation",
      initial_attempt: 1,
      final_attempt: 1,
    });
  });

  it("rejects an earlier functional pass that is not the successful Run terminal", () => {
    const failedRun = completeRun({
      attemptCount: 2,
      observations: [
        compileObservation(1, "ATTEMPT"),
        compileObservation(1, "FINAL_RECOMPILE"),
        compileObservation(2, "ATTEMPT", "COMPILE_ERROR"),
      ],
      outcome: "MAX_ATTEMPTS",
    });
    expect(
      classifyExperienceEligibility({
        caseRef,
        run: failedRun,
        functionalResults: [functional(1, "PASSED", 0)],
      }),
    ).toMatchObject({ status: "INELIGIBLE", reason: "TRAJECTORY_INVALID" });

    const laterSuccessfulRun = completeRun({
      attemptCount: 2,
      observations: [
        compileObservation(1, "ATTEMPT"),
        compileObservation(2, "ATTEMPT"),
        compileObservation(2, "FINAL_RECOMPILE"),
      ],
    });
    expect(
      classifyExperienceEligibility({
        caseRef,
        run: laterSuccessfulRun,
        functionalResults: [functional(1, "PASSED", 0)],
      }),
    ).toMatchObject({ status: "INELIGIBLE", reason: "TRAJECTORY_INVALID" });
  });

  it("rejects pass and mismatch statuses whose landed facts contradict the status", () => {
    const run = completeRun({
      attemptCount: 1,
      observations: [compileObservation(1, "ATTEMPT"), compileObservation(1, "FINAL_RECOMPILE")],
    });
    expect(
      classifyExperienceEligibility({
        caseRef,
        run,
        functionalResults: [{ ...functional(1, "PASSED", 0), mismatches: 1 }],
      }),
    ).toMatchObject({ status: "INELIGIBLE", reason: "TRAJECTORY_INVALID" });
    expect(
      classifyExperienceEligibility({
        caseRef,
        run,
        functionalResults: [{ ...functional(1, "MISMATCH", 0), mismatches: 0 }],
      }),
    ).toMatchObject({ status: "INELIGIBLE", reason: "TRAJECTORY_INVALID" });
  });

  it("distinguishes a missing functional result from a malformed trajectory", () => {
    const run = completeRun({
      attemptCount: 1,
      observations: [compileObservation(1, "ATTEMPT"), compileObservation(1, "FINAL_RECOMPILE")],
    });
    expect(classifyExperienceEligibility({ caseRef, run, functionalResults: [] })).toMatchObject({
      status: "INELIGIBLE",
      reason: "NO_FUNCTIONAL_RESULT",
    });
  });

  it("accepts only a landed mismatch-repair-compile-pass-simulation-pass chain for debug", () => {
    const run = completeRun({
      attemptCount: 2,
      observations: [
        compileObservation(1, "ATTEMPT"),
        compileObservation(1, "FINAL_RECOMPILE"),
        compileObservation(2, "ATTEMPT"),
        compileObservation(2, "FINAL_RECOMPILE"),
      ],
    });
    expect(
      classifyExperienceEligibility({
        caseRef,
        run,
        functionalResults: [functional(1, "MISMATCH", 0), functional(2, "PASSED", 1)],
      }),
    ).toMatchObject({
      status: "ELIGIBLE",
      kind: "simulation_debug",
      initial_attempt: 1,
      final_attempt: 2,
    });
  });

  it("rejects exhausted repair, repair compile failure, and simulation infrastructure failure", () => {
    const exhausted = completeRun({
      attemptCount: 2,
      observations: [
        compileObservation(1, "ATTEMPT"),
        compileObservation(1, "FINAL_RECOMPILE"),
        compileObservation(2, "ATTEMPT"),
        compileObservation(2, "FINAL_RECOMPILE"),
      ],
    });
    expect(
      classifyExperienceEligibility({
        caseRef,
        run: exhausted,
        functionalResults: [functional(1, "MISMATCH", 0), functional(2, "MISMATCH", 1)],
      }),
    ).toMatchObject({ reason: "REPAIR_EXHAUSTED" });

    const compileFailed = completeRun({
      attemptCount: 2,
      observations: [
        compileObservation(1, "ATTEMPT"),
        compileObservation(1, "FINAL_RECOMPILE"),
        compileObservation(2, "ATTEMPT", "COMPILE_ERROR"),
      ],
      outcome: "MAX_ATTEMPTS",
    });
    expect(
      classifyExperienceEligibility({
        caseRef,
        run: compileFailed,
        functionalResults: [functional(1, "MISMATCH", 0)],
      }),
    ).toMatchObject({ reason: "REPAIR_COMPILE_FAILED" });

    expect(
      classifyExperienceEligibility({
        caseRef,
        run: exhausted,
        functionalResults: [functional(1, "MISMATCH", 0), functional(2, "SIMULATION_TIMEOUT", 1)],
      }),
    ).toMatchObject({ reason: "SIMULATION_INFRASTRUCTURE_INVALID" });
  });

  it("does not let a summarizer failure change the Case result", async () => {
    const batchDirectory = await mkdtemp(path.join(os.tmpdir(), "rtl-experience-best-effort-"));
    roots.push(batchDirectory);
    const run = completeRun({
      attemptCount: 1,
      observations: [compileObservation(1, "ATTEMPT"), compileObservation(1, "FINAL_RECOMPILE")],
    });
    const summarize = vi.fn().mockRejectedValue(new Error("model unavailable"));
    const requestWithIgnoredCallerRunId = {
      batchDirectory,
      caseRef,
      functionalResults: [functional(1, "PASSED", 0)],
      language: "SYSTEMVERILOG" as const,
      tool: "iverilog+vvp",
      runId: "../../caller-controlled",
    };
    const result = await summarizeCaseExperienceBestEffort({
      request: requestWithIgnoredCallerRunId,
      run,
      summarizer: { summarize },
    });
    expect(result).toEqual({
      schema_version: 1,
      status: "FAILED",
      eligibility: "ELIGIBLE",
      reason: "SUMMARIZER_FAILED",
    });
    expect(summarize).toHaveBeenCalledWith(expect.objectContaining({ runId }));
    await expect(
      readFile(
        path.join(batchDirectory, "_internal", "experience-summaries", runId, "case-result.json"),
        "utf8",
      ),
    ).resolves.toContain('"SUMMARIZER_FAILED"');
  });

  it("fails closed when a backend returns an Experience for different provenance", async () => {
    const batchDirectory = await mkdtemp(path.join(os.tmpdir(), "rtl-experience-binding-"));
    roots.push(batchDirectory);
    const run = completeRun({
      attemptCount: 1,
      observations: [compileObservation(1, "ATTEMPT"), compileObservation(1, "FINAL_RECOMPILE")],
    });
    const result = await summarizeCaseExperienceBestEffort({
      request: {
        batchDirectory,
        caseRef,
        functionalResults: [functional(1, "PASSED", 0)],
        language: "SYSTEMVERILOG",
        tool: "iverilog+vvp",
      },
      run,
      summarizer: {
        summarize: vi.fn().mockResolvedValue({
          schema_version: 1,
          status: "CREATED",
          experience: {
            schema_version: 1,
            kind: "design_observation",
            source: { dataset: "wrong-dataset", split: "build", case_id: "case-001" },
            outcome: "first_functional_pass",
            circuit_type: null,
            language: "SYSTEMVERILOG",
            tool: "iverilog+vvp",
            failure: null,
            diagnosis: null,
            repair: null,
            verification: "The candidate compiled and passed every functional simulation sample.",
          },
        }),
      },
    });
    expect(result).toMatchObject({ status: "FAILED", reason: "SUMMARIZER_FAILED" });
  });
});

async function piFixture(mode: "valid" | "missing-read" | "tamper") {
  const root = await mkdtemp(path.join(os.tmpdir(), "rtl-experience-summarizer-"));
  roots.push(root);
  const batchDirectory = path.join(root, "batches", "b-20260810-001");
  const runDirectory = path.join(batchDirectory, "_internal", "runs", runId);
  const configDirectory = path.join(root, "pi-state");
  const extensionDirectory = path.join(root, ".pi", "extensions");
  await Promise.all([
    mkdir(path.join(runDirectory, "workspace"), { recursive: true }),
    mkdir(path.join(runDirectory, "evidence", "attempts", "1", "rtl-after"), {
      recursive: true,
    }),
    mkdir(path.join(runDirectory, "evidence", "attempts", "2", "rtl-after"), {
      recursive: true,
    }),
    mkdir(configDirectory, { recursive: true }),
    mkdir(extensionDirectory, { recursive: true }),
  ]);
  await Promise.all([
    writeFile(
      path.join(runDirectory, "workspace", "spec.md"),
      "Create a small synchronous counter with a held terminal output.\n",
    ),
    writeFile(
      path.join(runDirectory, "evidence", "attempts", "1", "rtl-after", "dut.sv"),
      "module dut; logic [1:0] counter; endmodule\n",
    ),
    writeFile(
      path.join(runDirectory, "evidence", "attempts", "2", "rtl-after", "dut.sv"),
      "module dut; logic [2:0] counter; endmodule\n",
    ),
    writeFile(
      path.join(extensionDirectory, "rtl-experience-summarizer-policy.mjs"),
      "export default function policy() {}\n",
    ),
  ]);
  const argumentsFile = path.join(root, "pi-summary-arguments.json");
  const script = path.join(root, "fake-pi-summary.mjs");
  await writeFile(
    script,
    `import { appendFileSync, writeFileSync } from "node:fs";
import path from "node:path";
const args = process.argv.slice(2);
if (args[0] === "--version") { process.stdout.write("pi 0.81.1"); process.exit(0); }
if (args[0] === "--help") {
  process.stdout.write("--mode --no-session --provider --model --tools --no-extensions --extension --no-skills --no-prompt-templates --no-themes --no-context-files --no-approve --offline");
  process.exit(0);
}
writeFileSync(process.env.PI_SUMMARY_ARGUMENTS_FILE, JSON.stringify(args));
const workspace = process.cwd();
${
  mode === "missing-read"
    ? ""
    : `for (const path of ["spec.md", "summary.json", "context/experience-input.json", "context/summary-schema.json", "rtl/initial/dut.sv", "rtl/final/dut.sv"]) {
  appendFileSync(process.env.RTL_AGENT_PI_EXPERIENCE_READ_AUDIT, JSON.stringify({ path }) + "\\n");
}`
}
${mode === "tamper" ? 'writeFileSync(path.join(workspace, "spec.md"), "tampered\\n");' : ""}
writeFileSync(path.join(workspace, "summary.json"), JSON.stringify({
  schema_version: 1,
  status: "CREATED",
  experience: {
    schema_version: 1,
    kind: "simulation_debug",
    source: { dataset: "experience-dataset", split: "build", case_id: "case-001" },
    outcome: "repaired_functional_pass",
    circuit_type: "counter",
    language: "SYSTEMVERILOG",
    tool: "iverilog+vvp",
    failure: { stage: "functional_simulation", failure_type: "output_mismatch", symptom: "The terminal condition diverged after the expected count boundary." },
    diagnosis: "The state width could not represent the terminal count before rollover occurred.",
    repair: "Widen the state representation so the terminal boundary is representable before holding the result.",
    verification: "The repaired candidate passed both compilation phases and all functional simulation samples."
  }
}));
`,
  );
  const config: PiExperimentConfig = {
    executable: process.execPath,
    executableArgumentsPrefix: [script],
    expectedPiVersion: "0.81.1",
    repositoryRoot: root,
    configDirectory,
    provider: "kimi-coding",
    model: "k3",
    capabilityFile: path.join(root, ".pi", "capability.json"),
    extensionFile: path.join(extensionDirectory, "rtl-core-loop-policy.mjs"),
    timeoutMs: 5_000,
    terminationGraceMs: 100,
    stabilityWindowMs: 10,
    stderrLimitBytes: 4_096,
    maximumEvents: 32,
    maximumEventLineBytes: 4_096,
    workspaceLimits: { maximumFiles: 20, maximumFileBytes: 10_000, maximumTotalBytes: 50_000 },
    environment: { PI_SUMMARY_ARGUMENTS_FILE: argumentsFile },
  };
  const eligibility = {
    schema_version: 1,
    status: "ELIGIBLE",
    kind: "simulation_debug",
    initial_attempt: 1,
    final_attempt: 2,
  } as const;
  const request: ExperienceSummaryRequest = {
    batchDirectory,
    runId,
    caseRef,
    eligibility,
    functionalResults: [functional(1, "MISMATCH", 0), functional(2, "PASSED", 1)],
    language: "SYSTEMVERILOG",
    tool: "iverilog+vvp",
  };
  return { config, request, argumentsFile };
}

describe("Pi Experience summarizer", () => {
  it("rejects an unbranded traversal-shaped Run ID before constructing workspace paths", async () => {
    const test = await piFixture("valid");
    const unsafeRequest = {
      ...test.request,
      runId: "../../caller-controlled",
    } as unknown as ExperienceSummaryRequest;
    await expect(
      new PiExperienceSummarizer(test.config).summarize(unsafeRequest),
    ).rejects.toThrow();
  });

  it("rejects a valid-looking summary when required public evidence was not read", async () => {
    const test = await piFixture("missing-read");
    await expect(
      new PiExperienceSummarizer(test.config).summarize(test.request),
    ).rejects.toMatchObject({ error: { code: "EXPERIENCE_SUMMARIZATION_FAILED" } });
  });

  it("uses an isolated read/edit-only turn and creates a provenance-bound record", async () => {
    const test = await piFixture("valid");
    const result = await new PiExperienceSummarizer(test.config).summarize(test.request);
    expect(result.status).toBe("CREATED");
    if (result.status === "CREATED") {
      expect(ExperienceRecordSchema.parse(result.experience)).toMatchObject({
        kind: "simulation_debug",
        source: { dataset: "experience-dataset", split: "build", case_id: "case-001" },
      });
    }
    const arguments_ = JSON.parse(await readFile(test.argumentsFile, "utf8")) as string[];
    expect(
      arguments_.slice(arguments_.indexOf("--tools"), arguments_.indexOf("--tools") + 2),
    ).toEqual(["--tools", "read,edit"]);
    expect(arguments_[arguments_.indexOf("--extension") + 1]).toMatch(
      /rtl-experience-summarizer-policy\.mjs$/u,
    );
    const contextFiles: string[] = [];
    for await (const candidate of glob("**/context/experience-input.json", {
      cwd: test.request.batchDirectory,
    })) {
      contextFiles.push(await readFile(path.join(test.request.batchDirectory, candidate), "utf8"));
    }
    expect(contextFiles.join("\n")).toContain('"final_recompile": "COMPILE_PASSED"');
  });

  it("rejects a summarizer turn that changes protected public evidence", async () => {
    const test = await piFixture("tamper");
    await expect(
      new PiExperienceSummarizer(test.config).summarize(test.request),
    ).rejects.toMatchObject({ error: { code: "EXPERIENCE_SUMMARIZATION_FAILED" } });
  });
});
