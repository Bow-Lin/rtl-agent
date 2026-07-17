import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  BatchInputManifestSchema,
  EvaluationProfileSchema,
  IcarusCapabilitySchema,
  evaluateCoreLoopBatch,
  sha256Bytes,
  writeCoreLoopBatchReview,
} from "../src/index.js";
import {
  EvaluationTestProvider,
  ScriptedAgentAdapter,
  ScriptedCompilerAdapter,
  TEST_COMPILER_CAPABILITY,
  TEST_PROVIDER_IMPLEMENTATION_DIGEST,
  testEvaluationProfile,
} from "./evaluation-test-fixtures.js";

const roots: string[] = [];

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "rtl-agent-r04-batch-test-"));
  roots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("Core Loop batch preflight and evaluation", () => {
  it("locks all fixtures before the first Agent turn and reports category metrics", async () => {
    const root = await temporaryRoot();
    const provider = new EvaluationTestProvider([
      {
        caseId: "case/001",
        fixtureId: "case-001",
        category: "SEEDED_COMPILE_REPAIR",
      },
      {
        caseId: "case/002",
        fixtureId: "case-002",
        category: "BLANK_GENERATION",
      },
    ]);
    const profile = await testEvaluationProfile(provider);
    const compiler = new ScriptedCompilerAdapter([
      "COMPILE_ERROR",
      "COMPILE_PASSED",
      "COMPILE_PASSED",
    ]);
    const agent = new ScriptedAgentAdapter(
      [
        { outcome: "NO_RTL_CHANGE" },
        {
          outcome: "RTL_CHANGED",
          source: "module dut(input logic a, output logic y); assign y = a; endmodule\n",
        },
      ],
      () => expect(provider.materializedCount).toBe(2),
    );

    const execution = await evaluateCoreLoopBatch({
      provider,
      providerImplementationDigest: TEST_PROVIDER_IMPLEMENTATION_DIGEST,
      profile,
      agentAdapter: agent,
      compilerAdapter: compiler,
      batchesRoot: path.join(root, "batches"),
    });

    expect(execution.result).toMatchObject({
      status: "COMPLETED",
      authoritative: false,
      claim: "COMPILE_ONLY",
      metrics: {
        overall: {
          evaluationDenominator: 2,
          rawFirstAttempt: { numerator: 1, denominator: 2, value: 0.5 },
          rawWithinMaxAttempts: {
            numerator: 1,
            denominator: 2,
            value: 0.5,
          },
          noChangeCount: 1,
          policyViolationCount: 0,
          infrastructureInvalidCount: 0,
          notExecutedCount: 0,
        },
        blankGeneration: {
          evaluationDenominator: 1,
          rawFirstAttempt: { numerator: 1, denominator: 1, value: 1 },
        },
        seededCompileRepair: {
          evaluationDenominator: 1,
          rawWithinMaxAttempts: {
            numerator: 0,
            denominator: 1,
            value: 0,
          },
        },
      },
      checkpoint: { status: "PENDING_HUMAN_REVIEW" },
    });
    expect(execution.inputManifest.selectedCases).toHaveLength(2);
    expect(execution.inputManifest.materializedCases).toHaveLength(2);
    expect(
      BatchInputManifestSchema.safeParse({
        ...execution.inputManifest,
        manifestDigest: sha256Bytes(Buffer.from("tampered-batch-manifest")),
      }).success,
    ).toBe(false);
    expect(agent.inputs).toHaveLength(2);
    await expect(
      readFile(path.join(execution.batchDirectory, "evidence", "batch-result.json"), "utf8"),
    ).resolves.toContain('"claim": "COMPILE_ONLY"');
  });

  it("keeps an unexpectedly passing seeded baseline outside formal evaluation", async () => {
    const root = await temporaryRoot();
    const provider = new EvaluationTestProvider([
      {
        caseId: "case/001",
        fixtureId: "case-001",
        category: "SEEDED_COMPILE_REPAIR",
      },
      {
        caseId: "case/002",
        fixtureId: "case-002",
        category: "SEEDED_COMPILE_REPAIR",
      },
    ]);
    const profile = await testEvaluationProfile(provider);
    const compiler = new ScriptedCompilerAdapter(["COMPILE_PASSED", "COMPILE_ERROR"]);
    const agent = new ScriptedAgentAdapter([{ outcome: "NO_RTL_CHANGE" }]);

    const execution = await evaluateCoreLoopBatch({
      provider,
      providerImplementationDigest: TEST_PROVIDER_IMPLEMENTATION_DIGEST,
      profile,
      agentAdapter: agent,
      compilerAdapter: compiler,
      batchesRoot: path.join(root, "batches"),
    });

    expect(execution.result.status).toBe("INVALID");
    expect(execution.result.caseValidations.map((validation) => validation.status)).toEqual([
      "INVALID_SEEDED_BASELINE_PASSED",
      "VALID",
    ]);
    expect(execution.result.metrics.overall).toMatchObject({
      evaluationDenominator: 1,
      preflightInvalidCount: 1,
      notExecutedCount: 0,
    });
    expect(agent.inputs).toHaveLength(1);
    const invalidRun = execution.inputManifest.materializedCases[0]!;
    await expect(
      access(
        path.join(
          execution.batchDirectory,
          "runs",
          invalidRun.runId,
          "evidence",
          "final-result.json",
        ),
      ),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("does not start Agent evaluation after baseline infrastructure failure", async () => {
    const root = await temporaryRoot();
    const provider = new EvaluationTestProvider([
      {
        caseId: "case/001",
        fixtureId: "case-001",
        category: "SEEDED_COMPILE_REPAIR",
      },
      {
        caseId: "case/002",
        fixtureId: "case-002",
        category: "SEEDED_COMPILE_REPAIR",
      },
    ]);
    const profile = await testEvaluationProfile(provider);
    const compiler = new ScriptedCompilerAdapter(["TIMEOUT", "COMPILE_ERROR"]);
    const agent = new ScriptedAgentAdapter([]);

    const execution = await evaluateCoreLoopBatch({
      provider,
      providerImplementationDigest: TEST_PROVIDER_IMPLEMENTATION_DIGEST,
      profile,
      agentAdapter: agent,
      compilerAdapter: compiler,
      batchesRoot: path.join(root, "batches"),
    });

    expect(execution.result).toMatchObject({
      status: "INVALID",
      metrics: {
        overall: {
          evaluationDenominator: 0,
          infrastructureInvalidCount: 1,
          notExecutedCount: 1,
        },
      },
      checkpoint: { status: "INCONCLUSIVE" },
    });
    expect(agent.inputs).toHaveLength(0);
  });

  it("fails preflight before materialization when compiler capability drifts", async () => {
    const root = await temporaryRoot();
    const provider = new EvaluationTestProvider();
    const profile = await testEvaluationProfile(provider);
    const driftedCapability = IcarusCapabilitySchema.parse({
      ...TEST_COMPILER_CAPABILITY,
      executableDigest: sha256Bytes(Buffer.from("different executable")),
    });

    await expect(
      evaluateCoreLoopBatch({
        provider,
        providerImplementationDigest: TEST_PROVIDER_IMPLEMENTATION_DIGEST,
        profile,
        agentAdapter: new ScriptedAgentAdapter([]),
        compilerAdapter: new ScriptedCompilerAdapter([], driftedCapability),
        batchesRoot: path.join(root, "batches"),
      }),
    ).rejects.toMatchObject({
      error: { code: "EVALUATION_CAPABILITY_MISMATCH" },
    });
    expect(provider.materializedCount).toBe(0);
  });

  it("rejects a Provider implementation digest mismatch before dataset access", async () => {
    const root = await temporaryRoot();
    const provider = new EvaluationTestProvider();
    const profile = await testEvaluationProfile(provider);

    await expect(
      evaluateCoreLoopBatch({
        provider,
        providerImplementationDigest: sha256Bytes(Buffer.from("different provider implementation")),
        profile,
        agentAdapter: new ScriptedAgentAdapter([]),
        compilerAdapter: new ScriptedCompilerAdapter([]),
        batchesRoot: path.join(root, "batches"),
      }),
    ).rejects.toMatchObject({
      error: { code: "EVALUATION_PROFILE_INVALID" },
    });
    expect(provider.materializedCount).toBe(0);
  });

  it("keeps policy, no-change, Agent failure, and Agent timeout in the capability denominator", async () => {
    const root = await temporaryRoot();
    const provider = new EvaluationTestProvider(
      Array.from({ length: 5 }, (_, index) => ({
        caseId: `case/00${String(index + 1)}`,
        fixtureId: `case-00${String(index + 1)}`,
        category: "SEEDED_COMPILE_REPAIR" as const,
      })),
    );
    const profile = await testEvaluationProfile(provider);
    const compiler = new ScriptedCompilerAdapter([
      "COMPILE_ERROR",
      "COMPILE_ERROR",
      "COMPILE_ERROR",
      "COMPILE_ERROR",
      "COMPILE_ERROR",
      "COMPILE_PASSED",
      "COMPILE_PASSED",
    ]);
    const agent = new ScriptedAgentAdapter([
      {
        outcome: "RTL_CHANGED",
        source: "module dut(input logic a, output logic y); assign y = a; endmodule\n",
      },
      { outcome: "POLICY_VIOLATION" },
      { outcome: "NO_RTL_CHANGE" },
      { outcome: "AGENT_PROCESS_ERROR" },
      { outcome: "AGENT_TIMEOUT" },
    ]);

    const execution = await evaluateCoreLoopBatch({
      provider,
      providerImplementationDigest: TEST_PROVIDER_IMPLEMENTATION_DIGEST,
      profile,
      agentAdapter: agent,
      compilerAdapter: compiler,
      batchesRoot: path.join(root, "batches"),
    });

    expect(execution.result.metrics.overall).toMatchObject({
      evaluationDenominator: 5,
      rawWithinMaxAttempts: {
        numerator: 1,
        denominator: 5,
        value: 0.2,
      },
      policyViolationCount: 1,
      noChangeCount: 1,
      agentFailureCount: 1,
      agentTimeoutCount: 1,
      infrastructureInvalidCount: 0,
    });
  });

  it("reports repair recovery and diagnostic path/line coverage from Agent attempts", async () => {
    const root = await temporaryRoot();
    const provider = new EvaluationTestProvider();
    const baseProfile = await testEvaluationProfile(provider);
    const profile = EvaluationProfileSchema.parse({
      ...baseProfile,
      thresholds: {
        ...baseProfile.thresholds,
        minimumRecoveryDenominator: 1,
        minimumRecoveryRate: 1,
      },
    });
    const compiler = new ScriptedCompilerAdapter([
      "COMPILE_ERROR",
      "COMPILE_ERROR",
      "COMPILE_PASSED",
      "COMPILE_PASSED",
    ]);
    const agent = new ScriptedAgentAdapter([
      { outcome: "RTL_CHANGED", source: "module dut; BROKEN endmodule\n" },
      {
        outcome: "RTL_CHANGED",
        source: "module dut(input logic a, output logic y); assign y = a; endmodule\n",
      },
    ]);

    const execution = await evaluateCoreLoopBatch({
      provider,
      providerImplementationDigest: TEST_PROVIDER_IMPLEMENTATION_DIGEST,
      profile,
      agentAdapter: agent,
      compilerAdapter: compiler,
      batchesRoot: path.join(root, "batches"),
    });

    expect(execution.result.metrics.overall).toMatchObject({
      repairRecovery: { numerator: 1, denominator: 1, value: 1 },
      reviewAcceptedRepairRecovery: { numerator: 1, denominator: 1, value: 1 },
      diagnosticCoverage: {
        totalIssues: 1,
        path: { numerator: 1, denominator: 1, value: 1 },
        line: { numerator: 1, denominator: 1, value: 1 },
        pathAndLine: { numerator: 1, denominator: 1, value: 1 },
        fallbackIssueCount: 0,
      },
    });
    const recoveredRun = execution.result.runs[0]!;
    const reviewResult = await writeCoreLoopBatchReview(
      execution.batchDirectory,
      profile,
      execution.result,
      [{ runId: recoveredRun.runId, disposition: "COMPILE_PASS_BUT_REVIEW_REJECTED" }],
      new Date("2026-07-17T08:00:00.000Z"),
    );
    expect(reviewResult.metrics.overall).toMatchObject({
      repairRecovery: { numerator: 1, denominator: 1, value: 1 },
      reviewAcceptedRepairRecovery: { numerator: 0, denominator: 1, value: 0 },
    });
    expect(reviewResult.checkpoint.status).toBe("STOP_OR_RETHINK");
  });

  it("preserves raw compiler metrics while excluding a human-rejected pass from checkpoint metrics", async () => {
    const root = await temporaryRoot();
    const provider = new EvaluationTestProvider();
    const baseProfile = await testEvaluationProfile(provider);
    const profile = EvaluationProfileSchema.parse({
      ...baseProfile,
      thresholds: {
        ...baseProfile.thresholds,
        minimumFirstAttemptRate: 1,
        minimumWithinMaxAttemptsRate: 1,
      },
    });
    const execution = await evaluateCoreLoopBatch({
      provider,
      providerImplementationDigest: TEST_PROVIDER_IMPLEMENTATION_DIGEST,
      profile,
      agentAdapter: new ScriptedAgentAdapter([
        {
          outcome: "RTL_CHANGED",
          source: "module dut(input logic a, output logic y); assign y = a; endmodule\n",
        },
      ]),
      compilerAdapter: new ScriptedCompilerAdapter([
        "COMPILE_ERROR",
        "COMPILE_PASSED",
        "COMPILE_PASSED",
      ]),
      batchesRoot: path.join(root, "batches"),
    });
    const passedRun = execution.result.runs[0]!;
    const reviewResult = await writeCoreLoopBatchReview(
      execution.batchDirectory,
      profile,
      execution.result,
      [
        {
          runId: passedRun.runId,
          disposition: "COMPILE_PASS_BUT_REVIEW_REJECTED",
        },
      ],
      new Date("2026-07-17T08:00:00.000Z"),
    );

    expect(reviewResult.metrics.overall).toMatchObject({
      rawFirstAttempt: { numerator: 1, denominator: 1, value: 1 },
      reviewAcceptedFirstAttempt: {
        numerator: 0,
        denominator: 1,
        value: 0,
      },
      rawWithinMaxAttempts: { numerator: 1, denominator: 1, value: 1 },
      reviewAcceptedWithinMaxAttempts: {
        numerator: 0,
        denominator: 1,
        value: 0,
      },
      reviewPendingPassCount: 0,
    });
    expect(reviewResult.checkpoint.status).toBe("STOP_OR_RETHINK");
    await expect(
      readFile(path.join(execution.batchDirectory, "evidence", "batch-review-result.json"), "utf8"),
    ).resolves.toContain("COMPILE_PASS_BUT_REVIEW_REJECTED");
  });

  it("fails closed when no Provider is configured", async () => {
    const root = await temporaryRoot();
    const provider = new EvaluationTestProvider();
    const profile = await testEvaluationProfile(provider);

    await expect(
      evaluateCoreLoopBatch({
        provider: undefined,
        providerImplementationDigest: TEST_PROVIDER_IMPLEMENTATION_DIGEST,
        profile,
        agentAdapter: new ScriptedAgentAdapter([]),
        compilerAdapter: new ScriptedCompilerAdapter([]),
        batchesRoot: path.join(root, "batches"),
      }),
    ).rejects.toMatchObject({
      error: { code: "DATASET_NOT_CONFIGURED" },
    });
  });
});
