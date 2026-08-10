import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  CoverageFeedbackSchema,
  I2cCoverageExperimentResultSchema,
  I2cCoverageFixtureProvider,
  RepairableVerilatorSimulationError,
  captureOutput,
  createCoreLoopRun,
  i2cCoverageCaseRef,
  runI2cCoverageExperiment,
  sha256Bytes,
  sha256Jcs,
} from "../src/index.js";
import type {
  AgentAttemptInput,
  AgentTurnResult,
  CoreLoopRun,
  CoverageFeedback,
  CoverageRoundRunner,
  I2cCoverageDatasetLock,
  RtlAgentAdapter,
} from "../src/index.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

const sourceFiles = new Map<string, string>([
  ["rtl/verilog/i2c_master_bit_ctrl.v", "module i2c_master_bit_ctrl; endmodule\n"],
  ["rtl/verilog/i2c_master_byte_ctrl.v", "module i2c_master_byte_ctrl; endmodule\n"],
  ["rtl/verilog/i2c_master_defines.v", "`define I2C_CMD_NOP 4'b0000\n"],
  ["rtl/verilog/i2c_master_top.v", "module i2c_master_top; endmodule\n"],
  ["bench/verilog/i2c_slave_model.v", "module i2c_slave_model; endmodule\n"],
  [
    "bench/verilog/tst_bench_top.v",
    [
      "module tst_bench_top();",
      "wire clk, rstn;",
      "\twire scl, scl0_o, scl0_oen, scl1_o, scl1_oen;",
      "\twire sda, sda0_o, sda0_oen, sda1_o, sda1_oen;",
      "\treg [7:0] q, qq;",
      "i2c_master_top #(0) first();",
      "i2c_master_top #(0) second();",
      "\tdelay m0_scl (scl0_oen ? 1'bz : scl0_o, scl),",
      "\t      m1_scl (scl1_oen ? 1'bz : scl1_o, scl),",
      "\t      m0_sda (sda0_oen ? 1'bz : sda0_o, sda),",
      "\t      m1_sda (sda1_oen ? 1'bz : sda1_o, sda);",
      "",
      "\tpullup p1(scl); // pullup scl line",
      "\tpullup p2(sda); // pullup sda line",
      "initial begin",
      "\t      clk = 0;",
      "while (scl) #1;",
      "force scl= 1'b0;",
      "#100000;",
      "release scl;",
      'if (0) $display("\\nERROR: Expected a5, received %x at time %t", qq, $time);',
      'if (0) $display("\\nERROR: Expected 5a, received %x at time %t", qq, $time);',
      'if (0) $display("\\nERROR: Expected NACK, received ACK\\n");',
      "$finish;",
      "end",
      "endmodule",
      "",
    ].join("\n"),
  ],
  ["bench/verilog/wb_master_model.v", "module wb_master_model; endmodule\n"],
]);

async function syntheticBaseline(): Promise<{
  readonly root: string;
  readonly lock: I2cCoverageDatasetLock;
}> {
  const root = await mkdtemp(path.join(os.tmpdir(), "rtl-agent-i2c-baseline-test-"));
  roots.push(root);
  for (const [logicalPath, content] of sourceFiles) {
    const target = path.join(root, ...logicalPath.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }
  await mkdir(path.join(root, "doc"), { recursive: true });
  await writeFile(path.join(root, "doc", "ignored.txt"), "not consumed by the locked provider\n");
  const files = [...sourceFiles.entries()]
    .map(([logicalPath, content]) => ({
      logicalPath,
      byteLength: Buffer.byteLength(content),
      contentDigest: sha256Bytes(Buffer.from(content)),
    }))
    .sort((left, right) => left.logicalPath.localeCompare(right.logicalPath));
  return {
    root,
    lock: {
      datasetId: "freecores-i2c",
      datasetVersion: "test",
      sourceCommit: "test",
      split: "baseline",
      caseId: "i2c-master",
      fixtureId: "freecores-i2c-master",
      adapterVersion: "test",
      normalizationVersion: "test",
      sourceReference: "https://example.invalid/freecores-i2c",
      files,
      datasetSourceDigest: sha256Jcs(files),
      providerImplementationDigest: sha256Jcs({ adapter: "test" }),
    },
  };
}

class I2cTestAgent implements RtlAgentAdapter {
  public readonly inputs: AgentAttemptInput[] = [];

  public probe(): Promise<never> {
    throw new Error("probe is not used");
  }

  public async runTurn(rawInput: unknown, run: CoreLoopRun): Promise<AgentTurnResult> {
    const input = rawInput as AgentAttemptInput;
    this.inputs.push(input);
    const tbPath = path.join(run.workspaceDirectory, "rtl", "tb.sv");
    await writeFile(
      tbPath,
      `${await readFile(tbPath, "utf8")}\n// attempt ${String(input.attempt)}\n`,
    );
    return { outcome: "RTL_CHANGED", workspaceUsableForCompile: true } as AgentTurnResult;
  }
}

class I2cTestCoverageRunner implements CoverageRoundRunner {
  public readonly rounds: number[] = [];

  public runRound(run: CoreLoopRun, round: number): Promise<CoverageFeedback> {
    this.rounds.push(round);
    const score = round === 1 ? 40 : round === 2 ? 75 : 92;
    return Promise.resolve(
      CoverageFeedbackSchema.parse({
        schemaVersion: 1,
        runId: run.runId,
        round,
        line: { found: 100, hit: score, percent: score },
        branch: { found: 0, hit: 0, percent: 100 },
        toggle: { found: 0, hit: 0, percent: 100 },
        score,
        increment: round === 1 ? null : round === 2 ? 35 : 17,
        uncoveredTargets:
          round === 3
            ? []
            : [
                {
                  kind: "LINE",
                  sourcePath: "rtl/dut/i2c_master_top.v",
                  line: 10,
                  hitCount: 0,
                  description: "Execute uncovered I2C control path",
                },
              ],
      }),
    );
  }
}

class PersistentI2cCoverageRunner implements CoverageRoundRunner {
  public readonly rounds: number[] = [];

  public runRound(run: CoreLoopRun, round: number): Promise<CoverageFeedback> {
    this.rounds.push(round);
    const scores = [40, 75, 92, 94, 95] as const;
    const score = scores[round - 1] ?? 95;
    const previousScore = round === 1 ? null : (scores[round - 2] ?? 95);
    return Promise.resolve(
      CoverageFeedbackSchema.parse({
        schemaVersion: 1,
        runId: run.runId,
        round,
        line: { found: 100, hit: score, percent: score },
        branch: { found: 0, hit: 0, percent: 100 },
        toggle: { found: 0, hit: 0, percent: 100 },
        score,
        increment: previousScore === null ? null : score - previousScore,
        uncoveredTargets: [
          {
            kind: "LINE",
            sourcePath: "rtl/dut/i2c_master_top.v",
            line: 10,
            hitCount: 0,
            description: "Execute remaining I2C control path",
          },
        ],
      }),
    );
  }
}

class SimulationRepairI2cCoverageRunner implements CoverageRoundRunner {
  public readonly invocations: { readonly round: number; readonly agentAttempt: number }[] = [];

  public runRound(
    run: CoreLoopRun,
    round: number,
    agentAttempt = round,
  ): Promise<CoverageFeedback> {
    this.invocations.push({ round, agentAttempt });
    if (agentAttempt === 2) {
      throw new RepairableVerilatorSimulationError({
        schemaVersion: 1,
        runId: run.runId,
        attempt: agentAttempt,
        stage: "VERILATOR_SIMULATION",
        outcome: "NONZERO_EXIT",
        exitCode: 1,
        signal: null,
        timedOut: false,
        durationMs: 476,
        stdout: captureOutput("%Fatal: rtl/tb.sv:481: Expected CR mirror 00, received 40\n", {
          limitBytes: 8_192,
        }),
        stderr: captureOutput("", { limitBytes: 8_192 }),
      });
    }
    const score = round === 1 ? 40 : 85;
    return Promise.resolve(
      CoverageFeedbackSchema.parse({
        schemaVersion: 1,
        runId: run.runId,
        round,
        line: { found: 100, hit: score, percent: score },
        branch: { found: 0, hit: 0, percent: 100 },
        toggle: { found: 0, hit: 0, percent: 100 },
        score,
        increment: round === 1 ? null : 45,
        uncoveredTargets:
          round === 1
            ? [
                {
                  kind: "LINE",
                  sourcePath: "rtl/dut/i2c_master_top.v",
                  line: 10,
                  hitCount: 0,
                  description: "Execute remaining I2C control path",
                },
              ]
            : [],
      }),
    );
  }
}

describe("FreeCores I2C coverage flow", () => {
  it("validates and normalizes the locked multi-file baseline", async () => {
    const baseline = await syntheticBaseline();
    const provider = new I2cCoverageFixtureProvider(baseline.root, baseline.lock);
    const runRoot = await mkdtemp(path.join(os.tmpdir(), "rtl-agent-i2c-run-test-"));
    roots.push(runRoot);
    const run = await createCoreLoopRun(
      provider,
      {
        schemaVersion: 1,
        caseRef: i2cCoverageCaseRef(baseline.lock),
        profile: {
          schemaVersion: 1,
          profileId: "i2c-test",
          compilerProfileId: "i2c-test",
          maxAttempts: 3,
          stdoutLimitBytes: 1024,
          stderrLimitBytes: 1024,
          maximumIssues: 10,
          issueMessageLimitBytes: 256,
        },
      },
      { runsRoot: path.join(runRoot, "runs") },
    );

    await expect(
      readFile(path.join(run.workspaceDirectory, "rtl", "dut", "i2c_master_top.v"), "utf8"),
    ).resolves.toContain("module TopModule");
    const tb = await readFile(path.join(run.workspaceDirectory, "rtl", "tb.sv"), "utf8");
    expect(tb).toContain("module tb");
    expect(tb).toContain("TopModule #(");
    expect(tb).toContain("tb_checker u_checker");
    expect(tb).toContain('$fatal(1, "Expected a5');
    expect(tb).toContain("scl_stretch_low = 1'b1");
    expect(tb).not.toContain("force scl");
  });

  it("runs two Agent iterations by default without an implicit coverage threshold", async () => {
    const baseline = await syntheticBaseline();
    const agent = new I2cTestAgent();
    const runner = new I2cTestCoverageRunner();
    const runRoot = await mkdtemp(path.join(os.tmpdir(), "rtl-agent-i2c-experiment-test-"));
    roots.push(runRoot);
    const execution = await runI2cCoverageExperiment({
      provider: new I2cCoverageFixtureProvider(baseline.root, baseline.lock),
      caseRef: i2cCoverageCaseRef(baseline.lock),
      agentAdapter: agent,
      coverageRunner: runner,
      runsRoot: path.join(runRoot, "runs"),
    });

    expect(runner.rounds).toEqual([1, 2, 3]);
    expect(agent.inputs.map((input) => input.attempt)).toEqual([2, 3]);
    expect(agent.inputs[0]).toMatchObject({
      coverageFeedbackPath: "context/coverage-round-1.json",
      protectedRtlPaths: expect.arrayContaining(["rtl/dut/i2c_master_top.v"]),
      mutableRtlPaths: ["rtl/checker.sv", "rtl/tb.sv"],
    });
    expect(execution.result).toMatchObject({
      status: "PENDING_HUMAN_REVIEW",
      stopReason: "NO_UNCOVERED_TARGETS",
      maxAgentIterations: 2,
      coverageThreshold: null,
      roundsCompleted: 3,
      agentAttempts: 2,
      baselineCoverage: { score: 40 },
      finalCoverage: { score: 92 },
      coverageGain: 52,
    });
  });

  it("honors a configurable Agent iteration budget after crossing 90 percent", async () => {
    const baseline = await syntheticBaseline();
    const agent = new I2cTestAgent();
    const runner = new PersistentI2cCoverageRunner();
    const runRoot = await mkdtemp(path.join(os.tmpdir(), "rtl-agent-i2c-iterations-test-"));
    roots.push(runRoot);
    const execution = await runI2cCoverageExperiment({
      provider: new I2cCoverageFixtureProvider(baseline.root, baseline.lock),
      caseRef: i2cCoverageCaseRef(baseline.lock),
      agentAdapter: agent,
      coverageRunner: runner,
      runsRoot: path.join(runRoot, "runs"),
      maxAgentIterations: 4,
      minimumGain: 0,
    });

    expect(runner.rounds).toEqual([1, 2, 3, 4, 5]);
    expect(agent.inputs.map((input) => input.attempt)).toEqual([2, 3, 4, 5]);
    expect(execution.run.request.profile.maxAttempts).toBe(4);
    expect(execution.result).toMatchObject({
      status: "PENDING_HUMAN_REVIEW",
      stopReason: "MAX_ITERATIONS",
      maxAgentIterations: 4,
      coverageThreshold: null,
      roundsCompleted: 5,
      agentAttempts: 4,
      finalCoverage: { score: 95 },
      coverageGain: 55,
    });
    const legacyResult = Object.fromEntries(
      Object.entries(execution.result).filter(
        ([name]) => name !== "maxAgentIterations" && name !== "coverageThreshold",
      ),
    );
    expect(I2cCoverageExperimentResultSchema.parse(legacyResult)).toMatchObject({
      maxAgentIterations: 2,
      coverageThreshold: 90,
    });
  });

  it("stops at an explicitly configured coverage threshold", async () => {
    const baseline = await syntheticBaseline();
    const agent = new I2cTestAgent();
    const runner = new PersistentI2cCoverageRunner();
    const runRoot = await mkdtemp(path.join(os.tmpdir(), "rtl-agent-i2c-threshold-test-"));
    roots.push(runRoot);
    const execution = await runI2cCoverageExperiment({
      provider: new I2cCoverageFixtureProvider(baseline.root, baseline.lock),
      caseRef: i2cCoverageCaseRef(baseline.lock),
      agentAdapter: agent,
      coverageRunner: runner,
      runsRoot: path.join(runRoot, "runs"),
      maxAgentIterations: 4,
      coverageThreshold: 70,
    });

    expect(runner.rounds).toEqual([1, 2]);
    expect(agent.inputs.map((input) => input.attempt)).toEqual([2]);
    expect(execution.result).toMatchObject({
      status: "PENDING_HUMAN_REVIEW",
      stopReason: "COVERAGE_THRESHOLD_REACHED",
      maxAgentIterations: 4,
      coverageThreshold: 70,
      roundsCompleted: 2,
      agentAttempts: 1,
      finalCoverage: { score: 75 },
    });
  });

  it("feeds a repairable simulation failure to the next Agent iteration", async () => {
    const baseline = await syntheticBaseline();
    const agent = new I2cTestAgent();
    const runner = new SimulationRepairI2cCoverageRunner();
    const runRoot = await mkdtemp(path.join(os.tmpdir(), "rtl-agent-i2c-simulation-repair-test-"));
    roots.push(runRoot);
    const execution = await runI2cCoverageExperiment({
      provider: new I2cCoverageFixtureProvider(baseline.root, baseline.lock),
      caseRef: i2cCoverageCaseRef(baseline.lock),
      agentAdapter: agent,
      coverageRunner: runner,
      runsRoot: path.join(runRoot, "runs"),
      maxAgentIterations: 3,
    });

    expect(runner.invocations).toEqual([
      { round: 1, agentAttempt: 0 },
      { round: 2, agentAttempt: 2 },
      { round: 2, agentAttempt: 3 },
    ]);
    expect(agent.inputs.map((input) => input.attempt)).toEqual([2, 3]);
    expect(agent.inputs[1]).toMatchObject({
      verilatorSimulationFeedbackPath: "context/verilator-simulation-feedback-attempt-2.json",
    });
    expect(execution.result).toMatchObject({
      status: "PENDING_HUMAN_REVIEW",
      stopReason: "NO_UNCOVERED_TARGETS",
      roundsCompleted: 2,
      agentAttempts: 2,
      baselineCoverage: { score: 40 },
      finalCoverage: { score: 85 },
      coverageGain: 45,
    });
    const feedback = JSON.parse(
      await readFile(
        path.join(
          execution.run.workspaceDirectory,
          "context",
          "verilator-simulation-feedback-attempt-2.json",
        ),
        "utf8",
      ),
    ) as Record<string, unknown>;
    expect(feedback).toMatchObject({
      stage: "VERILATOR_SIMULATION",
      outcome: "NONZERO_EXIT",
      attempt: 2,
      stdout: expect.objectContaining({
        preview: expect.stringContaining("Expected CR mirror 00, received 40"),
      }),
    });
  });

  it("fails when an Agent changes protected DUT RTL", async () => {
    const baseline = await syntheticBaseline();
    const runRoot = await mkdtemp(path.join(os.tmpdir(), "rtl-agent-i2c-protection-test-"));
    roots.push(runRoot);
    const agent: RtlAgentAdapter = {
      probe: () => Promise.reject(new Error("not used")),
      runTurn: async (_input, run) => {
        await writeFile(
          path.join(run.workspaceDirectory, "rtl", "dut", "i2c_master_top.v"),
          "module TopModule; endmodule\n// unauthorized DUT change\n",
        );
        return { outcome: "RTL_CHANGED", workspaceUsableForCompile: true } as AgentTurnResult;
      },
    };
    const execution = await runI2cCoverageExperiment({
      provider: new I2cCoverageFixtureProvider(baseline.root, baseline.lock),
      caseRef: i2cCoverageCaseRef(baseline.lock),
      agentAdapter: agent,
      coverageRunner: new I2cTestCoverageRunner(),
      runsRoot: path.join(runRoot, "runs"),
    });

    expect(execution.result).toMatchObject({
      status: "FAILED",
      stopReason: "PROTECTED_RTL_MODIFIED",
      roundsCompleted: 1,
    });
  });
});
