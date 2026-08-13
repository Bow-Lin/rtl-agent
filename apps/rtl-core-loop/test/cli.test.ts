import { describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  parseI2cCoverageCommandOptions,
  runRtlCoreLoopCli,
  updateObservedIssuesBestEffort,
} from "../src/index.js";
import {
  EvaluationTestProvider,
  ScriptedAgentAdapter,
  ScriptedCompilerAdapter,
  TEST_PROVIDER_IMPLEMENTATION_DIGEST,
  testEvaluationProfile,
} from "../../../packages/core-loop/test/evaluation-test-fixtures.js";
import {
  AgentTurnResultSchema,
  BatchEvaluationResultSchema,
  BatchInputManifestSchema,
  CHIPBENCH_DATASET_LOCK,
  CoreLoopException,
  DatasetDescriptorSchema,
  DatasetSelectionSchema,
  EvaluationProfileSchema,
  FixtureCaseRefSchema,
  FixtureMaterializationSchema,
  MismatchAnalysisSchema,
  PiCapabilitySchema,
  FilesystemMemoryStore,
  VERILOG_EVAL_DATASET_LOCK,
  VerilogEvalFunctionalResultSchema,
  sha256Bytes,
  sha256Jcs,
} from "../../../packages/core-loop/src/index.js";
import type {
  AgentAttemptInput,
  AgentTurnResult,
  CoreLoopRun,
  DatasetSelection,
  FixtureCaseRef,
  FixtureMaterialization,
  FixtureProvider,
  HostDirectory,
  PiCapability,
  RtlAgentAdapter,
} from "../../../packages/core-loop/src/index.js";

const PI_TEST_CAPABILITY: PiCapability = PiCapabilitySchema.parse({
  schemaVersion: 1,
  piVersion: "0.81.1",
  provider: "kimi-coding",
  model: "k3",
  sessionMode: "EPHEMERAL",
  agentName: "rtl-core-loop",
  requiredFlags: ["--provider", "--model"],
  enabledTools: ["read", "write", "edit"],
  resolvedConfigDigest: sha256Bytes(Buffer.from("pi-config")),
  isolationConfigDigest: sha256Bytes(Buffer.from("pi-isolation")),
  toolPolicyDigest: sha256Bytes(Buffer.from("pi-policy")),
  extensionFileDigest: sha256Bytes(Buffer.from("pi-extension")),
  guidanceFileDigest: sha256Bytes(Buffer.from("pi-guidance")),
  experimentConfigDigest: sha256Bytes(Buffer.from("pi-experiment")),
});

class NoChangePiAgentAdapter implements RtlAgentAdapter {
  public async probe(): Promise<PiCapability> {
    return PI_TEST_CAPABILITY;
  }

  public async runTurn(rawInput: unknown, run: CoreLoopRun): Promise<AgentTurnResult> {
    const input = rawInput as AgentAttemptInput;
    return AgentTurnResultSchema.parse({
      schemaVersion: 1,
      runId: run.runId,
      attempt: input.attempt,
      outcome: "NO_RTL_CHANGE",
      workspaceUsableForCompile: false,
      rtlChanged: false,
      beforeManifestDigest: sha256Bytes(Buffer.from("before")),
      afterManifestDigest: sha256Bytes(Buffer.from("after")),
      exitCode: 0,
      timedOut: false,
      durationMs: 1,
      piVersion: PI_TEST_CAPABILITY.piVersion,
      provider: PI_TEST_CAPABILITY.provider,
      model: PI_TEST_CAPABILITY.model,
      sessionMode: PI_TEST_CAPABILITY.sessionMode,
      enabledTools: PI_TEST_CAPABILITY.enabledTools,
      resolvedConfigDigest: PI_TEST_CAPABILITY.resolvedConfigDigest,
      isolationConfigDigest: PI_TEST_CAPABILITY.isolationConfigDigest,
      toolPolicyDigest: PI_TEST_CAPABILITY.toolPolicyDigest,
      extensionFileDigest: PI_TEST_CAPABILITY.extensionFileDigest,
      guidanceFileDigest: PI_TEST_CAPABILITY.guidanceFileDigest,
      experimentConfigDigest: PI_TEST_CAPABILITY.experimentConfigDigest,
      violations: [],
      eventStream: { originalByteLength: 0, truncated: false, events: [] },
      stderr: { preview: "", truncated: false, originalByteLength: 0 },
      evidencePath: `evidence/attempts/${String(input.attempt)}/agent-turn-result.json`,
    });
  }
}

class ChipBenchCliTestProvider implements FixtureProvider {
  private readonly caseId = "Prob000_mux";

  public async describe() {
    return DatasetDescriptorSchema.parse({
      schemaVersion: 1,
      datasetId: CHIPBENCH_DATASET_LOCK.datasetId,
      datasetVersion: CHIPBENCH_DATASET_LOCK.datasetVersion,
      datasetSourceDigest: CHIPBENCH_DATASET_LOCK.contentManifestDigest,
      license: CHIPBENCH_DATASET_LOCK.license,
      adapter: CHIPBENCH_DATASET_LOCK.adapter,
      splits: CHIPBENCH_DATASET_LOCK.splits.map((entry) => entry.split),
    });
  }

  public async *listCases(selection: DatasetSelection): AsyncIterable<FixtureCaseRef> {
    if (selection.split !== "self-contained") return;
    yield FixtureCaseRefSchema.parse({
      schemaVersion: 1,
      fixtureId: "cb-sc-p000",
      identity: {
        datasetId: CHIPBENCH_DATASET_LOCK.datasetId,
        datasetVersion: CHIPBENCH_DATASET_LOCK.datasetVersion,
        split: selection.split,
        caseId: this.caseId,
      },
      caseSourceDigest: sha256Bytes(Buffer.from(this.caseId)),
    });
  }

  public async materialize(
    caseRef: FixtureCaseRef,
    destination: HostDirectory,
  ): Promise<FixtureMaterialization> {
    await writeFile(path.join(destination, "prompt.txt"), "Implement module TopModule.\n");
    return FixtureMaterializationSchema.parse({
      schemaVersion: 1,
      fixtureId: caseRef.fixtureId,
      identity: caseRef.identity,
      caseSourceDigest: caseRef.caseSourceDigest,
      category: "BLANK_GENERATION",
      specPath: "prompt.txt",
      topModule: "TopModule",
      tags: ["chipbench", "self-contained"],
    });
  }
}

describe("rtl-core-loop CLI boundary", () => {
  it.each(["-1", "11", "1.5", "three"])(
    "rejects invalid functional repair iteration limit %s",
    async (value) => {
      const errors: string[] = [];
      const exitCode = await runRtlCoreLoopCli(
        [
          "run",
          "--profile",
          "missing-profile",
          "--case",
          "case/001",
          "--functional-repair-iterations",
          value,
        ],
        new EvaluationTestProvider(),
        () => undefined,
        (line) => errors.push(line),
      );

      expect(exitCode).toBe(2);
      expect(JSON.parse(errors[0]!) as unknown).toMatchObject({
        error: {
          code: "EVALUATION_PROFILE_INVALID",
          message: "--functional-repair-iterations must be an integer from 0 to 10",
        },
      });
    },
  );

  it("rejects Memory V1 on a non-Pi evaluation profile before any Agent turn", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "rtl-core-loop-cli-memory-"));
    try {
      const provider = new EvaluationTestProvider();
      const profile = await testEvaluationProfile(provider);
      const agent = new ScriptedAgentAdapter([]);
      const errors: string[] = [];
      const exitCode = await runRtlCoreLoopCli(
        [
          "evaluate",
          "--profile",
          profile.evaluationProfileId,
          "--memory-mode",
          "read_write",
          "--memory-build-splits",
          `${profile.dataset.datasetId}:${profile.selection.split}`,
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
          batchesRoot: path.join(root, "batches"),
        },
      );

      expect(exitCode).toBe(2);
      expect(agent.inputs).toEqual([]);
      expect(JSON.parse(errors[0]!) as unknown).toMatchObject({
        error: {
          code: "EVALUATION_PROFILE_INVALID",
          message: "Memory V1 requires the Pi Agent backend",
        },
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("defers read-write Memory publication to the explicit memory-build command", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "rtl-core-loop-cli-memory-deferred-"));
    try {
      const provider = new EvaluationTestProvider();
      const baseProfile = await testEvaluationProfile(provider);
      const profile = EvaluationProfileSchema.parse({
        ...baseProfile,
        agentCapability: PI_TEST_CAPABILITY,
      });
      const memoryRoot = path.join(root, "memory");
      const store = new FilesystemMemoryStore(memoryRoot);
      const consolidate = vi.fn(async () => {
        throw new Error("evaluation must not invoke Memory consolidation");
      });
      const output: string[] = [];
      const errors: string[] = [];
      const exitCode = await runRtlCoreLoopCli(
        [
          "evaluate",
          "--profile",
          profile.evaluationProfileId,
          "--memory-mode",
          "read_write",
          "--memory-build-splits",
          `${profile.dataset.datasetId}:${profile.selection.split}`,
        ],
        provider,
        (line) => output.push(line),
        (line) => errors.push(line),
        {},
        process.cwd(),
        {
          profiles: [profile],
          providerImplementationDigest: TEST_PROVIDER_IMPLEMENTATION_DIGEST,
          agentAdapter: new NoChangePiAgentAdapter(),
          compilerAdapter: new ScriptedCompilerAdapter(["COMPILE_ERROR"]),
          batchesRoot: path.join(root, "batches"),
          memoryStore: store,
          memorySelector: { select: async () => [] },
          experienceSummarizer: {
            summarize: async () => {
              throw new Error("synthetic Provider has no functional Experience boundary");
            },
          },
          memoryConsolidator: { consolidate },
        },
      );

      expect(exitCode, errors.join("\n")).toBe(0);
      expect(consolidate).not.toHaveBeenCalled();
      expect((await store.listSnapshotIds()) as string[]).toEqual(["mem-v0001"]);
      expect(JSON.parse(output[0]!) as unknown).toMatchObject({
        result: {
          memory: {
            mode: "read_write",
            snapshot_id: "mem-v0001",
            publication: "DEFERRED_TO_MEMORY_BUILD",
          },
        },
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

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
            datasetVersion: VERILOG_EVAL_DATASET_LOCK.datasetVersion,
            datasetSourceDigest: VERILOG_EVAL_DATASET_LOCK.contentManifestDigest,
            expectedCaseCount: 156,
            reused: false,
          };
        },
      },
    );

    expect(exitCode).toBe(0);
    expect(errors).toEqual([]);
    expect(destinationDirectory).toBe(
      path.resolve("operator-cache", VERILOG_EVAL_DATASET_LOCK.datasetVersion),
    );
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

  it("reports the stable missing-Pi diagnostic for an unconfigured probe", async () => {
    const output: string[] = [];
    const errors: string[] = [];
    const exitCode = await runRtlCoreLoopCli(
      ["pi-agent-probe"],
      undefined,
      (line) => output.push(line),
      (line) => errors.push(line),
      {},
    );
    expect(exitCode).toBe(2);
    expect(output).toEqual([]);
    expect(JSON.parse(errors[0]!) as unknown).toMatchObject({
      ok: false,
      error: { code: "PI_AGENT_NOT_CONFIGURED", retryable: false },
    });
  });

  it("routes the independent I2C coverage command and rejects unsupported agents", async () => {
    const output: string[] = [];
    const errors: string[] = [];
    const exitCode = await runRtlCoreLoopCli(
      ["i2c-coverage", "--agent", "unsupported"],
      undefined,
      (line) => output.push(line),
      (line) => errors.push(line),
      {},
    );
    expect(exitCode).toBe(2);
    expect(output).toEqual([]);
    expect(JSON.parse(errors[0]!) as unknown).toMatchObject({
      ok: false,
      error: { code: "EVALUATION_PROFILE_INVALID", retryable: false },
    });
  });

  it("parses bounded I2C iteration and optional threshold controls", () => {
    expect(parseI2cCoverageCommandOptions([])).toEqual({
      backend: "opencode",
      maxAgentIterations: 2,
    });
    expect(
      parseI2cCoverageCommandOptions([
        "--agent",
        "pi",
        "--iterations",
        "4",
        "--coverage-threshold",
        "95.5",
      ]),
    ).toEqual({
      backend: "pi",
      maxAgentIterations: 4,
      coverageThreshold: 95.5,
    });
  });

  it.each([
    ["--iterations", "0"],
    ["--iterations", "11"],
    ["--iterations", "1.5"],
    ["--coverage-threshold", "-1"],
    ["--coverage-threshold", "101"],
    ["--coverage-threshold", "not-a-number"],
    ["--unknown", "1"],
  ])("rejects invalid I2C option %s=%s", (name, value) => {
    expect(() => parseI2cCoverageCommandOptions([name, value])).toThrowError(
      expect.objectContaining({
        error: expect.objectContaining({ code: "EVALUATION_PROFILE_INVALID" }),
      }),
    );
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
      expect(errors).toEqual(["正在处理 case/001... (1/1)"]);
      expect(JSON.parse(output[0]!) as unknown).toMatchObject({
        ok: true,
        result: {
          status: "COMPLETED",
          caseCount: 1,
          claim: "COMPILE_ONLY",
          agentBackend: "opencode",
        },
      });
      expect(output[0]).not.toContain(root);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reanalyzes an existing batch without rerunning generation and keeps analysis best-effort", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "rtl-core-loop-cli-reanalyze-"));
    try {
      const provider = new EvaluationTestProvider();
      const profile = await testEvaluationProfile(provider);
      const batchesRoot = path.join(root, "batches");
      const initialOutput: string[] = [];
      const dependencies = {
        profiles: [profile],
        providerImplementationDigest: TEST_PROVIDER_IMPLEMENTATION_DIGEST,
        agentAdapter: new ScriptedAgentAdapter([{ outcome: "NO_RTL_CHANGE" }]),
        compilerAdapter: new ScriptedCompilerAdapter(["COMPILE_ERROR"]),
        batchesRoot,
      } as const;
      expect(
        await runRtlCoreLoopCli(
          ["evaluate", "--profile", profile.evaluationProfileId],
          provider,
          (line) => initialOutput.push(line),
          () => undefined,
          {},
          process.cwd(),
          dependencies,
        ),
      ).toBe(0);
      const batchId = (JSON.parse(initialOutput[0]!) as { result: { batchId: string } }).result
        .batchId;
      const batchDirectory = path.join(batchesRoot, batchId);
      const evidenceDirectory = path.join(batchDirectory, "_internal", "evidence");
      const inputManifest = BatchInputManifestSchema.parse(
        JSON.parse(
          await readFile(path.join(evidenceDirectory, "batch-input-manifest.json"), "utf8"),
        ) as unknown,
      );
      const result = BatchEvaluationResultSchema.parse(
        JSON.parse(
          await readFile(path.join(evidenceDirectory, "batch-result.json"), "utf8"),
        ) as unknown,
      );
      const materialized = inputManifest.materializedCases[0]!;
      const functionalResult = VerilogEvalFunctionalResultSchema.parse({
        schemaVersion: 1,
        authoritative: false,
        claim: "FUNCTIONAL_SIMULATION",
        batchId,
        status: "COMPLETED",
        caseCount: 1,
        compilePassed: 1,
        functionalPassed: 0,
        functionalFailed: 1,
        functionalNotRun: 0,
        verificationInvalid: 0,
        cases: [
          {
            schemaVersion: 1,
            caseRef: materialized.caseRef,
            runId: materialized.runId,
            status: "MISMATCH",
            mismatches: 1,
            samples: 41,
            outputMismatches: [{ outputPort: "q", mismatches: 1, firstMismatchTime: 5 }],
            compileExitCode: 0,
            simulationExitCode: 0,
            compileDurationMs: 1,
            simulationDurationMs: 1,
            stdout: {
              preview: "Mismatches: 1 in 41 samples",
              truncated: false,
              originalByteLength: 27,
            },
            stderr: { preview: "", truncated: false, originalByteLength: 0 },
          },
        ],
      });
      await writeFile(
        path.join(evidenceDirectory, "functional-simulation-result.json"),
        `${JSON.stringify(functionalResult, undefined, 2)}\n`,
      );
      await rm(path.join(root, "knowledge"), { recursive: true, force: true });
      const analyze = vi.fn(async () =>
        MismatchAnalysisSchema.parse({
          schemaVersion: 1,
          category: "INITIALIZATION_SEMANTICS",
          rootCause:
            "The candidate output has no defined initial value before the first positive edge.",
          evidence: [
            {
              path: "rtl/TopModule.sv",
              lineStart: 1,
              lineEnd: 1,
              observation: "The candidate declares the output without an initial assignment.",
            },
          ],
          confidence: "MEDIUM",
          limitations: "The hidden reference behavior is unavailable to the diagnosis.",
        }),
      );
      const output: string[] = [];
      const errors: string[] = [];
      let selectedAnalyzerBackend: string | undefined;
      const exitCode = await runRtlCoreLoopCli(
        ["reanalyze", "--batch", batchId, "--analyzer", "pi"],
        undefined,
        (line) => output.push(line),
        (line) => errors.push(line),
        {},
        process.cwd(),
        {
          ...dependencies,
          mismatchAnalyzerFactory: (backend) => {
            selectedAnalyzerBackend = backend;
            return { analyze };
          },
        },
      );

      expect(exitCode).toBe(0);
      expect(errors).toEqual([]);
      expect(analyze).toHaveBeenCalledTimes(1);
      expect(selectedAnalyzerBackend).toBe("pi");
      expect(JSON.parse(output[0]!) as unknown).toMatchObject({
        ok: true,
        result: { batchId, status: "ANALYSIS_COMPLETED" },
      });
      await expect(
        readFile(path.join(root, "knowledge", "observed-issues.md"), "utf8"),
      ).resolves.toContain("Conclusion [INITIALIZATION_SEMANTICS, MEDIUM]");

      selectedAnalyzerBackend = undefined;
      expect(
        await runRtlCoreLoopCli(
          ["reanalyze", "--batch", batchId],
          undefined,
          () => undefined,
          () => undefined,
          {},
          process.cwd(),
          {
            ...dependencies,
            mismatchAnalyzerFactory: (backend) => {
              selectedAnalyzerBackend = backend;
              return { analyze };
            },
          },
        ),
      ).toBe(0);
      expect(selectedAnalyzerBackend).toBe("opencode");

      await rm(path.join(root, "knowledge"), { recursive: true, force: true });
      const warning = await updateObservedIssuesBestEffort({
        knowledgeRoot: path.join(root, "knowledge"),
        execution: { batchDirectory, inputManifest, result },
        functionalResult,
        mismatchAnalyzer: {
          analyze: async () => {
            throw new CoreLoopException("MISMATCH_ANALYSIS_FAILED", "Synthetic diagnosis failure");
          },
        },
      });
      expect(warning).toEqual({
        code: "MISMATCH_ANALYSIS_FAILED",
        message: "Synthetic diagnosis failure",
        retryCommand: `rtl-core-loop reanalyze --batch ${batchId}`,
      });
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
        "--agent",
        "opencode",
        "--begin",
        "Prob001",
        "--end",
        "Prob002",
        "--functional-repair-iterations",
        "0",
      ],
      expectedCaseIds: ["Prob001_zero", "Prob002_one"],
      expectedFunctionalRepairIterations: 0,
    },
    {
      arguments: ["evaluate", "--profile", "evaluation-test-v1", "--cases", "Prob010,Prob001"],
      expectedCaseIds: ["Prob001_zero", "Prob010_ten"],
      expectedFunctionalRepairIterations: 3,
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
      expect(errors).toEqual(
        example.expectedCaseIds.map(
          (caseId, index) =>
            `正在处理 ${caseId}... (${String(index + 1)}/${String(example.expectedCaseIds.length)})`,
        ),
      );
      expect(agent.inputs.map((input) => input.runId)).toHaveLength(2);
      const result = JSON.parse(output[0]!) as {
        result: { batchId: string; caseCount: number; batchDirectory: string };
      };
      expect(result.result.batchId).toMatch(/^b-[0-9]{8}-[0-9]{3}$/);
      expect(result.result.caseCount).toBe(2);
      expect(result.result.batchDirectory).toContain(result.result.batchId);
      expect(agent.inputs).toHaveLength(example.expectedCaseIds.length);
      const storedProfile = EvaluationProfileSchema.parse(
        JSON.parse(
          await readFile(
            path.join(
              root,
              "batches",
              result.result.batchId,
              "_internal",
              "evidence",
              "evaluation-profile.json",
            ),
            "utf8",
          ),
        ) as unknown,
      );
      expect(storedProfile.functionalRepair?.maxIterations).toBe(
        example.expectedFunctionalRepairIterations,
      );
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

  it("rejects an unsupported Agent backend before any Agent turn", async () => {
    const provider = new EvaluationTestProvider();
    const profile = await testEvaluationProfile(provider);
    const agent = new ScriptedAgentAdapter([]);
    const errors: string[] = [];
    const exitCode = await runRtlCoreLoopCli(
      [
        "evaluate",
        "--profile",
        profile.evaluationProfileId,
        "--agent",
        "unsupported",
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
      error: {
        code: "EVALUATION_PROFILE_INVALID",
        message: "--agent must be either opencode or pi",
      },
    });
  });

  it("maps the generic Kimi profile to Pi and rejects a conflicting capability", async () => {
    const provider = new EvaluationTestProvider();
    const profile = await testEvaluationProfile(provider);
    const agent = new ScriptedAgentAdapter([]);
    const errors: string[] = [];
    const exitCode = await runRtlCoreLoopCli(
      ["evaluate", "--profile", "verilog-eval-kimi-v1", "--agent", "pi", "--cases", "case/001"],
      provider,
      () => undefined,
      (line) => errors.push(line),
      {},
      process.cwd(),
      {
        profiles: [
          EvaluationProfileSchema.parse({
            ...profile,
            evaluationProfileId: "verilog-eval-kimi-pi-v1",
          }),
        ],
        providerImplementationDigest: TEST_PROVIDER_IMPLEMENTATION_DIGEST,
        agentAdapter: agent,
        compilerAdapter: new ScriptedCompilerAdapter([]),
      },
    );

    expect(exitCode).toBe(2);
    expect(agent.inputs).toHaveLength(0);
    expect(JSON.parse(errors[0]!) as unknown).toMatchObject({
      error: {
        code: "EVALUATION_PROFILE_INVALID",
        message: "Requested profile does not use the pi Agent backend",
      },
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

  it("accepts a complete ChipBench dataset/split scope before profile lookup", async () => {
    const errors: string[] = [];
    const exitCode = await runRtlCoreLoopCli(
      [
        "evaluate",
        "--profile",
        "missing-chipbench-profile",
        "--dataset",
        "chipbench",
        "--split",
        "self-contained",
      ],
      new EvaluationTestProvider(),
      () => undefined,
      (line) => errors.push(line),
      {},
      process.cwd(),
      {
        profiles: [],
        providerImplementationDigest: TEST_PROVIDER_IMPLEMENTATION_DIGEST,
      },
    );

    expect(exitCode).toBe(2);
    expect(JSON.parse(errors[0]!) as unknown).toMatchObject({
      error: { code: "EVALUATION_PROFILE_NOT_CONFIGURED" },
    });
  });

  it("runs a registered ChipBench split without requiring case selectors", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "rtl-core-loop-chipbench-cli-"));
    try {
      const provider = new ChipBenchCliTestProvider();
      const base = await testEvaluationProfile(
        new EvaluationTestProvider([
          { caseId: "case/001", fixtureId: "case-001", category: "BLANK_GENERATION" },
        ]),
      );
      const descriptor = await provider.describe();
      const caseIds = ["Prob000_mux"];
      const profile = EvaluationProfileSchema.parse({
        ...base,
        evaluationProfileId: "chipbench-cli-test-v1",
        dataset: descriptor,
        providerImplementationDigest: TEST_PROVIDER_IMPLEMENTATION_DIGEST,
        selection: DatasetSelectionSchema.parse({
          schemaVersion: 1,
          split: "self-contained",
          caseIds,
        }),
        expectedCaseCount: 1,
        expectedOrderedCaseIdsDigest: sha256Jcs(caseIds),
      });
      const output: string[] = [];
      const errors: string[] = [];
      const agent = new ScriptedAgentAdapter([{ outcome: "NO_RTL_CHANGE" }]);
      const exitCode = await runRtlCoreLoopCli(
        [
          "evaluate",
          "--profile",
          profile.evaluationProfileId,
          "--dataset",
          "chipbench",
          "--split",
          "self-contained",
        ],
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
      expect(errors).toEqual(["正在处理 Prob000_mux... (1/1)"]);
      expect(agent.inputs).toHaveLength(1);
      expect(JSON.parse(output[0]!) as unknown).toMatchObject({
        ok: true,
        result: {
          status: "COMPLETED",
          claim: "COMPILE_ONLY",
          caseCount: 1,
          compilePassed: 0,
        },
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects ChipBench evaluation when dataset and split are not provided together", async () => {
    const errors: string[] = [];
    const exitCode = await runRtlCoreLoopCli(
      ["evaluate", "--profile", "chipbench-kimi-v1", "--dataset", "chipbench"],
      new EvaluationTestProvider(),
      () => undefined,
      (line) => errors.push(line),
      {},
      process.cwd(),
      {
        profiles: [],
        providerImplementationDigest: TEST_PROVIDER_IMPLEMENTATION_DIGEST,
      },
    );

    expect(exitCode).toBe(2);
    expect(JSON.parse(errors[0]!) as unknown).toMatchObject({
      error: {
        code: "EVALUATION_PROFILE_INVALID",
        message: "ChipBench evaluation requires --dataset chipbench with --split",
      },
    });
  });
});
