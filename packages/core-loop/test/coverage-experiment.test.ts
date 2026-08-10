import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  CoverageFeedbackSchema,
  RepairableVerilatorCompileError,
  RepairableVerilatorSimulationError,
  captureOutput,
  coverageCaseDirectoryName,
  coverageRunDirectoryName,
  parseLcovCoverage,
  parseRepairableVerilatorCompileIssues,
  parseVerilatorToggleCoverage,
  repairableVerilatorSimulationFeedback,
  runCoverageExperiment,
} from "../src/index.js";
import type {
  AgentAttemptInput,
  AgentTurnResult,
  CoreLoopRun,
  CoverageFeedback,
  CoverageRoundRunner,
  RtlAgentAdapter,
} from "../src/index.js";
import { CASE_REF, TestFixtureProvider } from "./fixtures.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

class VerificationAgent implements RtlAgentAdapter {
  public readonly inputs: AgentAttemptInput[] = [];

  public probe(): Promise<never> {
    throw new Error("probe is not used by the coverage orchestrator");
  }

  public async runTurn(rawInput: unknown, run: CoreLoopRun): Promise<AgentTurnResult> {
    const input = rawInput as AgentAttemptInput;
    this.inputs.push(input);
    await writeFile(
      path.join(run.workspaceDirectory, "rtl", "tb.sv"),
      `module tb; dut TopModule(); initial begin #${String(input.attempt)}; $finish; end endmodule\n`,
    );
    await writeFile(
      path.join(run.workspaceDirectory, "rtl", "checker.sv"),
      "module tb_checker; initial assert (1) else $fatal(1); endmodule\n",
    );
    return {
      outcome: "RTL_CHANGED",
      workspaceUsableForCompile: true,
    } as AgentTurnResult;
  }
}

class RepairingVerificationAgent implements RtlAgentAdapter {
  public readonly inputs: AgentAttemptInput[] = [];

  public probe(): Promise<never> {
    throw new Error("probe is not used by the coverage orchestrator");
  }

  public async runTurn(rawInput: unknown, run: CoreLoopRun): Promise<AgentTurnResult> {
    const input = rawInput as AgentAttemptInput;
    this.inputs.push(input);
    await writeFile(
      path.join(run.workspaceDirectory, "rtl", "tb.sv"),
      "module tb; dut TopModule(); initial begin #1; $finish; end endmodule\n",
    );
    await writeFile(
      path.join(run.workspaceDirectory, "rtl", "checker.sv"),
      input.attempt === 1
        ? "module tb_checker; initial if (0) $finish; endmodule\n"
        : "module tb_checker; initial assert (1) else $fatal(1); endmodule\n",
    );
    return {
      outcome: "RTL_CHANGED",
      workspaceUsableForCompile: true,
    } as AgentTurnResult;
  }
}

class ScriptedCoverageRunner implements CoverageRoundRunner {
  public readonly rounds: number[] = [];

  public async runRound(run: CoreLoopRun, round: number): Promise<CoverageFeedback> {
    this.rounds.push(round);
    return CoverageFeedbackSchema.parse({
      schemaVersion: 1,
      runId: run.runId,
      round,
      line: { found: 10, hit: round === 1 ? 5 : 9, percent: round === 1 ? 50 : 90 },
      branch: { found: 0, hit: 0, percent: 100 },
      toggle: { found: 0, hit: 0, percent: 100 },
      score: round === 1 ? 50 : 90,
      increment: round === 1 ? null : 40,
      uncoveredTargets:
        round === 1
          ? [
              {
                kind: "LINE",
                sourcePath: "rtl/dut.sv",
                line: 3,
                hitCount: 0,
                description: "Execute DUT line 3",
              },
            ]
          : [],
    });
  }
}

class CompileRepairCoverageRunner implements CoverageRoundRunner {
  public readonly invocations: { readonly round: number; readonly agentAttempt: number }[] = [];

  public async runRound(
    run: CoreLoopRun,
    round: number,
    agentAttempt = round,
  ): Promise<CoverageFeedback> {
    this.invocations.push({ round, agentAttempt });
    if (agentAttempt === 1) {
      throw new RepairableVerilatorCompileError([
        {
          kind: "ERROR",
          message: "syntax error, unexpected checker, expecting '('",
          path: "rtl/tb.sv",
          line: 15,
          column: 14,
        },
      ]);
    }
    return CoverageFeedbackSchema.parse({
      schemaVersion: 1,
      runId: run.runId,
      round,
      line: { found: 2, hit: 2, percent: 100 },
      branch: { found: 0, hit: 0, percent: 100 },
      toggle: { found: 0, hit: 0, percent: 100 },
      score: 100,
      increment: null,
      uncoveredTargets: [],
    });
  }
}

class SimulationRepairCoverageRunner implements CoverageRoundRunner {
  public readonly invocations: { readonly round: number; readonly agentAttempt: number }[] = [];

  public runRound(
    run: CoreLoopRun,
    round: number,
    agentAttempt = round,
  ): Promise<CoverageFeedback> {
    this.invocations.push({ round, agentAttempt });
    if (agentAttempt === 1) {
      throw new RepairableVerilatorSimulationError({
        schemaVersion: 1,
        runId: run.runId,
        attempt: agentAttempt,
        stage: "VERILATOR_SIMULATION",
        outcome: "NONZERO_EXIT",
        exitCode: 1,
        signal: null,
        timedOut: false,
        durationMs: 10,
        stdout: captureOutput("%Fatal: rtl/tb.sv:10: assertion failed\n", {
          limitBytes: 8_192,
        }),
        stderr: captureOutput("", { limitBytes: 8_192 }),
      });
    }
    return Promise.resolve(
      CoverageFeedbackSchema.parse({
        schemaVersion: 1,
        runId: run.runId,
        round,
        line: { found: 2, hit: 2, percent: 100 },
        branch: { found: 0, hit: 0, percent: 100 },
        toggle: { found: 0, hit: 0, percent: 100 },
        score: 100,
        increment: null,
        uncoveredTargets: [],
      }),
    );
  }
}

describe("coverage experiment", () => {
  it("uses readable portable case and time directory names", () => {
    expect(coverageCaseDirectoryName("Prob131_mt2015_q4")).toBe("Prob131_mt2015_q4");
    expect(coverageCaseDirectoryName("source/case-0001")).toMatch(
      /^case-source_case-0001-[0-9a-f]{12}$/,
    );
    expect(coverageCaseDirectoryName("source:case-0001")).not.toBe(
      coverageCaseDirectoryName("source/case-0001"),
    );
    const startedAt = new Date(2026, 6, 28, 15, 30, 45, 123);
    expect(coverageRunDirectoryName(startedAt)).toBe("run_20260728-153045-123");
    expect(coverageRunDirectoryName(startedAt, 1)).toBe("run_20260728-153045-123-001");
  });

  it("parses uncovered DUT line and branch targets from LCOV", () => {
    const feedback = parseLcovCoverage(
      [
        "TN:",
        "SF:C:\\work\\run\\workspace\\rtl\\dut.sv",
        "DA:2,4",
        "DA:3,0",
        "BRDA:4,0,0,1",
        "BRDA:4,0,1,-",
        "end_of_record",
        "SF:C:\\work\\run\\workspace\\rtl\\tb.sv",
        "DA:1,0",
        "end_of_record",
      ].join("\n"),
      "run_00000000-0000-4000-8000-000000000000" as never,
      2,
      20,
    );
    expect(feedback).toMatchObject({
      line: { found: 2, hit: 1, percent: 50 },
      branch: { found: 2, hit: 1, percent: 50 },
      score: 50,
      increment: 30,
    });
    expect(feedback.uncoveredTargets).toEqual([
      expect.objectContaining({ kind: "LINE", line: 3 }),
      expect.objectContaining({ kind: "BRANCH", line: 4, branch: 1 }),
    ]);
  });

  it("aggregates coverage across an explicit multi-file DUT allowlist", () => {
    const feedback = parseLcovCoverage(
      [
        "SF:rtl/dut/first.v",
        "DA:2,1",
        "end_of_record",
        "SF:rtl/dut/second.v",
        "DA:7,0",
        "end_of_record",
        "SF:rtl/tb.sv",
        "DA:1,0",
        "end_of_record",
      ].join("\n"),
      "run_00000000-0000-4000-8000-000000000000" as never,
      1,
      undefined,
      ["rtl/dut/first.v", "rtl/dut/second.v"],
    );

    expect(feedback.line).toEqual({ found: 2, hit: 1, percent: 50 });
    expect(feedback.uncoveredTargets).toEqual([
      expect.objectContaining({ sourcePath: "rtl/dut/second.v", line: 7 }),
    ]);
  });

  it("preserves DUT toggle targets from Verilator coverage metadata", () => {
    const toggle = parseVerilatorToggleCoverage(
      [
        "# SystemC::Coverage-3",
        "C '\x01f\x02rtl\\dut.sv\x01l\x023\x01t\x02toggle\x01o\x02a:0->1' 2",
        "C '\x01f\x02rtl\\dut.sv\x01l\x023\x01t\x02toggle\x01o\x02a:1->0' 0",
        "C '\x01f\x02rtl\\tb.sv\x01l\x025\x01t\x02toggle\x01o\x02a:1->0' 0",
      ].join("\n"),
    );

    expect(toggle.metric).toEqual({ found: 2, hit: 1, percent: 50 });
    expect(toggle.uncoveredTargets).toEqual([
      expect.objectContaining({
        kind: "TOGGLE",
        line: 3,
        signal: "a",
        transition: "1->0",
      }),
    ]);
  });

  it("parses source-bound Verilator errors without exposing non-verification paths", () => {
    const issues = parseRepairableVerilatorCompileIssues(
      [
        "%Error: rtl\\tb.sv:15:14: syntax error, unexpected checker, expecting '('",
        "%Error-UNSUPPORTED: rtl\\checker.sv:20: Unsupported construct",
        "%Error: rtl\\dut.sv:3:9: DUT errors are not Agent-repairable",
      ].join("\n"),
    );

    expect(issues).toEqual([
      {
        kind: "ERROR",
        message: "syntax error, unexpected checker, expecting '('",
        path: "rtl/tb.sv",
        line: 15,
        column: 14,
      },
      {
        kind: "ERROR",
        message: "Unsupported construct",
        path: "rtl/checker.sv",
        line: 20,
      },
    ]);
  });

  it("builds bounded repair feedback for completed simulation failures", () => {
    const runId = "run_00000000-0000-4000-8000-000000000000" as never;
    const feedback = repairableVerilatorSimulationFeedback(
      {
        exitCode: 1,
        signal: null,
        timedOut: false,
        terminationFailed: false,
        closeConfirmed: true,
        durationMs: 476,
        stdout: captureOutput(
          `${"baseline status\n".repeat(1_000)}%Fatal: rtl/tb.sv:481: Expected CR mirror 00, received 40\n`,
          { limitBytes: 65_536 },
        ),
        stderr: captureOutput("", { limitBytes: 65_536 }),
      },
      runId,
      2,
    );

    expect(feedback).toMatchObject({
      runId,
      attempt: 2,
      stage: "VERILATOR_SIMULATION",
      outcome: "NONZERO_EXIT",
      exitCode: 1,
      timedOut: false,
      durationMs: 476,
      stdout: { truncated: true },
    });
    expect(feedback?.stdout.preview).toContain("Expected CR mirror 00, received 40");
    expect(Buffer.byteLength(feedback?.stdout.preview ?? "", "utf8")).toBeLessThanOrEqual(8_192);
  });

  it("does not route unconfirmed simulation process failures to the Agent", () => {
    const feedback = repairableVerilatorSimulationFeedback(
      {
        exitCode: null,
        signal: null,
        timedOut: true,
        terminationFailed: true,
        closeConfirmed: false,
        durationMs: 120_000,
        stdout: captureOutput("", { limitBytes: 65_536 }),
        stderr: captureOutput("", { limitBytes: 65_536 }),
      },
      "run_00000000-0000-4000-8000-000000000000" as never,
      2,
    );

    expect(feedback).toBeUndefined();
  });

  it("feeds round-one gaps back to the Agent and stops for human review", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "rtl-agent-coverage-test-"));
    roots.push(root);
    const agent = new VerificationAgent();
    const runner = new ScriptedCoverageRunner();
    const startedAt = new Date(2026, 6, 28, 15, 30, 45, 123);
    const caseDirectory = path.join(
      root,
      "runs",
      coverageCaseDirectoryName(CASE_REF.identity.caseId),
    );
    await mkdir(path.join(caseDirectory, coverageRunDirectoryName(startedAt)), {
      recursive: true,
    });
    const execution = await runCoverageExperiment({
      provider: new TestFixtureProvider(),
      caseRef: CASE_REF,
      agentAdapter: agent,
      coverageRunner: runner,
      runsRoot: path.join(root, "runs"),
      clock: () => startedAt,
    });

    expect(execution.run.runDirectory).toBe(
      path.join(caseDirectory, coverageRunDirectoryName(startedAt, 1)),
    );
    expect(path.basename(execution.run.runDirectory)).not.toBe(execution.run.runId);
    expect(runner.rounds).toEqual([1, 2]);
    expect(agent.inputs).toHaveLength(2);
    expect(agent.inputs[0]).toMatchObject({ taskKind: "VERIFICATION_ASSET_GENERATION" });
    expect(agent.inputs[1]).toMatchObject({
      coverageFeedbackPath: "context/coverage-round-1.json",
    });
    expect(execution.result).toMatchObject({
      status: "PENDING_HUMAN_REVIEW",
      stopReason: "COVERAGE_THRESHOLD_REACHED",
      roundsCompleted: 2,
      authoritative: false,
      humanReviewRequired: true,
    });
    await expect(
      readFile(
        path.join(execution.run.runDirectory, "evidence", "coverage-experiment-result.json"),
        "utf8",
      ),
    ).resolves.toContain('"claim": "COVERAGE_EXPERIMENT"');
  });

  it("repairs missing assertion requirements before starting coverage rounds", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "rtl-agent-coverage-repair-test-"));
    roots.push(root);
    const agent = new RepairingVerificationAgent();
    const runner = new ScriptedCoverageRunner();
    const execution = await runCoverageExperiment({
      provider: new TestFixtureProvider(),
      caseRef: CASE_REF,
      agentAdapter: agent,
      coverageRunner: runner,
      runsRoot: path.join(root, "runs"),
      coverageThreshold: 50,
    });

    expect(agent.inputs).toHaveLength(2);
    expect(agent.inputs[1]).toMatchObject({
      attempt: 2,
      verificationFeedbackPath: "context/verification-feedback-attempt-1.json",
    });
    expect(runner.rounds).toEqual([1]);
    expect(execution.result).toMatchObject({
      status: "PENDING_HUMAN_REVIEW",
      stopReason: "COVERAGE_THRESHOLD_REACHED",
      roundsCompleted: 1,
    });
    await expect(
      readFile(
        path.join(
          execution.run.workspaceDirectory,
          "context",
          "verification-feedback-attempt-1.json",
        ),
        "utf8",
      ),
    ).resolves.toContain('"ASSERTION_MISSING"');
  });

  it("feeds repairable Verilator compile errors back without consuming a coverage round", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "rtl-agent-compile-repair-test-"));
    roots.push(root);
    const agent = new VerificationAgent();
    const runner = new CompileRepairCoverageRunner();
    const execution = await runCoverageExperiment({
      provider: new TestFixtureProvider(),
      caseRef: CASE_REF,
      agentAdapter: agent,
      coverageRunner: runner,
      runsRoot: path.join(root, "runs"),
    });

    expect(runner.invocations).toEqual([
      { round: 1, agentAttempt: 1 },
      { round: 1, agentAttempt: 2 },
    ]);
    expect(agent.inputs).toHaveLength(2);
    expect(agent.inputs[1]).toMatchObject({
      attempt: 2,
      verilatorCompileFeedbackPath: "context/verilator-compile-feedback-attempt-1.json",
    });
    expect(execution.result).toMatchObject({
      status: "PENDING_HUMAN_REVIEW",
      stopReason: "COVERAGE_THRESHOLD_REACHED",
      roundsCompleted: 1,
      finalCoverage: { score: 100 },
    });
    await expect(
      readFile(
        path.join(
          execution.run.workspaceDirectory,
          "context",
          "verilator-compile-feedback-attempt-1.json",
        ),
        "utf8",
      ),
    ).resolves.toContain("unexpected checker");
  });

  it("feeds repairable Verilator simulation failures back without consuming a coverage round", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "rtl-agent-simulation-repair-test-"));
    roots.push(root);
    const agent = new VerificationAgent();
    const runner = new SimulationRepairCoverageRunner();
    const execution = await runCoverageExperiment({
      provider: new TestFixtureProvider(),
      caseRef: CASE_REF,
      agentAdapter: agent,
      coverageRunner: runner,
      runsRoot: path.join(root, "runs"),
    });

    expect(runner.invocations).toEqual([
      { round: 1, agentAttempt: 1 },
      { round: 1, agentAttempt: 2 },
    ]);
    expect(agent.inputs[1]).toMatchObject({
      attempt: 2,
      verilatorSimulationFeedbackPath: "context/verilator-simulation-feedback-attempt-1.json",
    });
    expect(execution.result).toMatchObject({
      status: "PENDING_HUMAN_REVIEW",
      stopReason: "COVERAGE_THRESHOLD_REACHED",
      roundsCompleted: 1,
      finalCoverage: { score: 100 },
    });
    await expect(
      readFile(
        path.join(
          execution.run.workspaceDirectory,
          "context",
          "verilator-simulation-feedback-attempt-1.json",
        ),
        "utf8",
      ),
    ).resolves.toContain("assertion failed");
  });
});
