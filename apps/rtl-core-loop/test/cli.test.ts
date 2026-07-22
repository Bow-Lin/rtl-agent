import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { runRtlCoreLoopCli } from "../src/index.js";
import {
  EvaluationTestProvider,
  ScriptedAgentAdapter,
  ScriptedCompilerAdapter,
  TEST_PROVIDER_IMPLEMENTATION_DIGEST,
  testEvaluationProfile,
} from "../../../packages/core-loop/test/evaluation-test-fixtures.js";
import {
  CHIPBENCH_DATASET_LOCK,
  VERILOG_EVAL_DATASET_LOCK,
} from "../../../packages/core-loop/src/index.js";

describe("rtl-core-loop CLI boundary", () => {
  it("prepares the pinned dataset through an injected cache boundary", async () => {
    const output: string[] = [];
    const errors: string[] = [];
    let destinationDirectory: string | undefined;
    const exitCode = await runRtlCoreLoopCli(
      ["dataset-prepare"],
      undefined,
      (line) => output.push(line),
      (line) => errors.push(line),
      {},
      process.cwd(),
      undefined,
      {
        cacheRoot: path.join("operator-cache"),
        prepareDataset: async (options) => {
          destinationDirectory = options.destinationDirectory;
          return {
            datasetVersion: "v2-c498220d",
            datasetSourceDigest: VERILOG_EVAL_DATASET_LOCK.contentManifestDigest,
            expectedCaseCount: 156,
            reused: false,
          };
        },
      },
    );

    expect(exitCode).toBe(0);
    expect(errors).toEqual([]);
    expect(destinationDirectory).toBe(path.resolve("operator-cache", "v2-c498220d"));
    expect(JSON.parse(output[0]!) as unknown).toMatchObject({
      ok: true,
      result: { expectedCaseCount: 156, reused: false },
    });
    expect(output[0]).not.toContain("operator-cache");
  });

  it("prepares ChipBench only when it is selected explicitly", async () => {
    const output: string[] = [];
    const errors: string[] = [];
    let destinationDirectory: string | undefined;
    const exitCode = await runRtlCoreLoopCli(
      ["dataset-prepare", "--dataset", "chipbench"],
      undefined,
      (line) => output.push(line),
      (line) => errors.push(line),
      {},
      process.cwd(),
      undefined,
      {
        chipBenchCacheRoot: path.join("chipbench-cache"),
        prepareChipBenchDataset: async (options) => {
          destinationDirectory = options.destinationDirectory;
          return {
            datasetVersion: CHIPBENCH_DATASET_LOCK.datasetVersion,
            datasetSourceDigest: CHIPBENCH_DATASET_LOCK.contentManifestDigest,
            expectedCaseCount: 223,
            reused: false,
          };
        },
      },
    );

    expect(exitCode).toBe(0);
    expect(errors).toEqual([]);
    expect(destinationDirectory).toBe(
      path.resolve("chipbench-cache", CHIPBENCH_DATASET_LOCK.datasetVersion),
    );
    expect(JSON.parse(output[0]!) as unknown).toMatchObject({
      ok: true,
      result: { expectedCaseCount: 223, reused: false },
    });
    expect(output[0]).not.toContain("chipbench-cache");
  });

  it("reports the stable missing-dataset diagnostic instead of using built-in samples", async () => {
    const output: string[] = [];
    const errors: string[] = [];
    const exitCode = await runRtlCoreLoopCli(
      ["fixtures-check"],
      undefined,
      (line) => output.push(line),
      (line) => errors.push(line),
    );
    expect(exitCode).toBe(2);
    expect(output).toEqual([]);
    expect(JSON.parse(errors[0]!) as unknown).toMatchObject({
      ok: false,
      error: { code: "DATASET_NOT_CONFIGURED", retryable: false },
    });
  });

  it("reports the stable missing-OpenCode diagnostic for an unconfigured probe", async () => {
    const output: string[] = [];
    const errors: string[] = [];
    const exitCode = await runRtlCoreLoopCli(
      ["agent-probe"],
      undefined,
      (line) => output.push(line),
      (line) => errors.push(line),
      {},
    );
    expect(exitCode).toBe(2);
    expect(output).toEqual([]);
    expect(JSON.parse(errors[0]!) as unknown).toMatchObject({
      ok: false,
      error: { code: "OPENCODE_NOT_CONFIGURED", retryable: false },
    });
  });

  it("recognizes compile-smoke and fails closed when Icarus is unavailable", async () => {
    const output: string[] = [];
    const errors: string[] = [];
    const exitCode = await runRtlCoreLoopCli(
      ["compile-smoke"],
      undefined,
      (line) => output.push(line),
      (line) => errors.push(line),
      { RTL_AGENT_IVERILOG_EXECUTABLE: path.resolve("missing-iverilog.exe") },
      process.cwd(),
    );
    expect(exitCode).toBe(2);
    expect(output).toEqual([]);
    expect(JSON.parse(errors[0]!) as unknown).toMatchObject({
      ok: false,
      error: { code: "INTERNAL_ERROR", retryable: false },
    });
  });

  it("runs the thin evaluate command with registered operator dependencies", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "rtl-core-loop-cli-evaluate-"));
    try {
      const provider = new EvaluationTestProvider();
      const profile = await testEvaluationProfile(provider);
      const output: string[] = [];
      const errors: string[] = [];
      const exitCode = await runRtlCoreLoopCli(
        ["evaluate", "--profile", profile.evaluationProfileId],
        provider,
        (line) => output.push(line),
        (line) => errors.push(line),
        {},
        process.cwd(),
        {
          profiles: [profile],
          providerImplementationDigest: TEST_PROVIDER_IMPLEMENTATION_DIGEST,
          agentAdapter: new ScriptedAgentAdapter([{ outcome: "NO_RTL_CHANGE" }]),
          compilerAdapter: new ScriptedCompilerAdapter(["COMPILE_ERROR"]),
          batchesRoot: path.join(root, "batches"),
        },
      );

      expect(exitCode).toBe(0);
      expect(errors).toEqual([]);
      expect(JSON.parse(output[0]!) as unknown).toMatchObject({
        ok: true,
        result: {
          status: "COMPLETED",
          caseCount: 1,
          claim: "COMPILE_ONLY",
        },
      });
      expect(output[0]).not.toContain(root);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it.each([
    {
      arguments: [
        "evaluate",
        "--profile",
        "evaluation-test-v1",
        "--begin",
        "Prob001",
        "--end",
        "Prob002",
      ],
      expectedCaseIds: ["Prob001_zero", "Prob002_one"],
    },
    {
      arguments: ["evaluate", "--profile", "evaluation-test-v1", "--cases", "Prob010,Prob001"],
      expectedCaseIds: ["Prob001_zero", "Prob010_ten"],
    },
  ])("runs a derived profile for selectable evaluation cases", async (example) => {
    const root = await mkdtemp(path.join(os.tmpdir(), "rtl-core-loop-cli-selection-"));
    try {
      const provider = new EvaluationTestProvider([
        {
          caseId: "Prob001_zero",
          fixtureId: "prob-001",
          category: "BLANK_GENERATION",
        },
        {
          caseId: "Prob002_one",
          fixtureId: "prob-002",
          category: "BLANK_GENERATION",
        },
        {
          caseId: "Prob010_ten",
          fixtureId: "prob-010",
          category: "BLANK_GENERATION",
        },
      ]);
      const profile = await testEvaluationProfile(provider);
      const agent = new ScriptedAgentAdapter([
        { outcome: "NO_RTL_CHANGE" },
        { outcome: "NO_RTL_CHANGE" },
      ]);
      const output: string[] = [];
      const errors: string[] = [];
      const exitCode = await runRtlCoreLoopCli(
        example.arguments,
        provider,
        (line) => output.push(line),
        (line) => errors.push(line),
        {},
        process.cwd(),
        {
          profiles: [profile],
          providerImplementationDigest: TEST_PROVIDER_IMPLEMENTATION_DIGEST,
          agentAdapter: agent,
          compilerAdapter: new ScriptedCompilerAdapter([]),
          batchesRoot: path.join(root, "batches"),
        },
      );

      expect(exitCode).toBe(0);
      expect(errors).toEqual([]);
      expect(agent.inputs.map((input) => input.runId)).toHaveLength(2);
      const result = JSON.parse(output[0]!) as {
        result: { batchId: string; caseCount: number; batchDirectory: string };
      };
      expect(result.result.batchId).toMatch(/^b-[0-9]{8}-[0-9]{3}$/);
      expect(result.result.caseCount).toBe(2);
      expect(result.result.batchDirectory).toContain(result.result.batchId);
      expect(agent.inputs).toHaveLength(example.expectedCaseIds.length);
      await expect(
        readFile(path.join(root, "knowledge", "observed-issues.md"), "utf8"),
      ).resolves.toContain(`<!-- batch:${result.result.batchId} -->`);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects mixed range and explicit-list selection before any Agent turn", async () => {
    const provider = new EvaluationTestProvider();
    const profile = await testEvaluationProfile(provider);
    const agent = new ScriptedAgentAdapter([]);
    const errors: string[] = [];
    const exitCode = await runRtlCoreLoopCli(
      [
        "evaluate",
        "--profile",
        profile.evaluationProfileId,
        "--begin",
        "case/001",
        "--end",
        "case/001",
        "--cases",
        "case/001",
      ],
      provider,
      () => undefined,
      (line) => errors.push(line),
      {},
      process.cwd(),
      {
        profiles: [profile],
        providerImplementationDigest: TEST_PROVIDER_IMPLEMENTATION_DIGEST,
        agentAdapter: agent,
        compilerAdapter: new ScriptedCompilerAdapter([]),
      },
    );

    expect(exitCode).toBe(2);
    expect(agent.inputs).toHaveLength(0);
    expect(JSON.parse(errors[0]!) as unknown).toMatchObject({
      error: { code: "EVALUATION_PROFILE_INVALID" },
    });
  });

  it("fails closed when evaluate has no registered profile", async () => {
    const output: string[] = [];
    const errors: string[] = [];
    const exitCode = await runRtlCoreLoopCli(
      ["evaluate", "--profile", "missing-profile"],
      new EvaluationTestProvider(),
      (line) => output.push(line),
      (line) => errors.push(line),
      {},
      process.cwd(),
      {
        profiles: [],
        providerImplementationDigest: TEST_PROVIDER_IMPLEMENTATION_DIGEST,
      },
    );

    expect(exitCode).toBe(2);
    expect(output).toEqual([]);
    expect(JSON.parse(errors[0]!) as unknown).toMatchObject({
      ok: false,
      error: { code: "EVALUATION_PROFILE_NOT_CONFIGURED" },
    });
  });
});
