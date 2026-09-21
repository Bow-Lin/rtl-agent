import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import { captureVerificationAssets } from "../src/project-coverage-experiment.js";

import {
  CoverageFeedbackSchema,
  ProjectCoverageFixtureProvider,
  combinedCoverageScoreWithToggle,
  createCoreLoopRun,
  projectCoverageCaseRef,
  runProjectCoverageExperiment,
  sha256Bytes,
  sha256Jcs,
} from "../src/index.js";
import type {
  CoreLoopRun,
  CoverageFeedback,
  CoverageProjectId,
  CoverageRoundRunner,
  ProjectCoverageDatasetLock,
} from "../src/index.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

const SYNTHETIC_SOURCES: Readonly<Record<CoverageProjectId, ReadonlyMap<string, string>>> = {
  dpretet: new Map(
    ["async_fifo", "fifomem", "rptr_empty", "wptr_full", "sync_r2w", "sync_w2r"].map((n) => [
      `rtl/${n}.v`,
      `module ${n}(); endmodule\n`,
    ]),
  ),
  axis: new Map([["rtl/axis_fifo.v", "module axis_fifo(); endmodule\n"]]),
  openhmc: new Map([
    [
      "rtl/building_blocks/fifos/async/openhmc_async_fifo.v",
      "module openhmc_async_fifo(); endmodule\n",
    ],
  ]),
  ufifo: new Map([["rtl/ufifo.v", "module ufifo(); endmodule\n"]]),
  "eth-fifo": new Map([
    ["rtl/verilog/eth_fifo.v", "module eth_fifo(); endmodule\n"],
    ["rtl/verilog/ethmac_defines.v", "// synthetic defines\n"],
    ["rtl/verilog/timescale.v", "`timescale 1ns/1ps\n"],
  ]),
  "versatile-fifo": new Map([
    [
      "rtl/verilog/async_fifo_dw_simplex_actel.v",
      "module async_fifo_dw_simplex_top (); endmodule\n",
    ],
  ]),
  "aes-highthroughput-lowarea": new Map([
    ["verilog/rtl/aes.v", "module aes (); endmodule\n"],
    ["verilog/rtl/key_exp.v", "module key_exp; endmodule\n"],
    ["verilog/rtl/sbox.v", "module sbox; endmodule\n"],
    ["verilog/rtl/shift_rows.v", "module shift_rows; endmodule\n"],
    ["verilog/rtl/inv_shift_rows.v", "module inv_shift_rows; endmodule\n"],
    ["verilog/rtl/mix_columns.v", "module mix_columns; endmodule\n"],
    ["verilog/rtl/xram_16x64.v", "module xram_16x64; endmodule\n"],
  ]),
  "scalable-arbiter": new Map([
    ["rtl/verilog/arbiter.v", "module arbiter; endmodule\n"],
    ["rtl/verilog/functions.v", "function integer clog2; input integer n; clog2=1; endfunction\n"],
  ]),
};

async function syntheticProject(projectId: CoverageProjectId): Promise<{
  readonly root: string;
  readonly lock: ProjectCoverageDatasetLock;
}> {
  const root = await mkdtemp(path.join(os.tmpdir(), `rtl-agent-${projectId}-test-`));
  roots.push(root);
  const sources = SYNTHETIC_SOURCES[projectId];
  for (const [logicalPath, content] of sources) {
    const target = path.join(root, ...logicalPath.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }
  const files = [...sources.entries()]
    .map(([logicalPath, content]) => ({
      logicalPath,
      byteLength: Buffer.byteLength(content),
      contentDigest: sha256Bytes(Buffer.from(content)),
    }))
    .sort((left, right) => left.logicalPath.localeCompare(right.logicalPath));
  const caseId = `${projectId}-case`;
  return {
    root,
    lock: {
      projectId,
      datasetId: `test-${projectId}`,
      datasetVersion: "test",
      sourceCommit: "test",
      sourceDirectoryName: projectId,
      split: "baseline",
      caseId,
      fixtureId: caseId,
      adapterVersion: "test",
      normalizationVersion: "test",
      sourceReference: `https://example.invalid/${projectId}`,
      licenseName: "Synthetic",
      licenseReference: "https://example.invalid/license",
      files,
      datasetSourceDigest: sha256Jcs(files),
      providerImplementationDigest: sha256Jcs({ projectId }),
      dutSourcePaths: ["rtl/dut/source.v"],
      includeDirectories: ["rtl/dut"],
    },
  };
}

class BaselineRunner implements CoverageRoundRunner {
  public readonly rounds: number[] = [];

  public runRound(run: CoreLoopRun, round: number): Promise<CoverageFeedback> {
    this.rounds.push(round);
    return Promise.resolve(
      CoverageFeedbackSchema.parse({
        schemaVersion: 1,
        runId: run.runId,
        round,
        line: { found: 10, hit: 6, percent: 60 },
        branch: { found: 2, hit: 1, percent: 50 },
        toggle: { found: 20, hit: 10, percent: 50 },
        score: 55,
        increment: null,
        uncoveredTargets: [
          {
            kind: "LINE",
            sourcePath: "rtl/dut/aes.v",
            line: 1,
            hitCount: 0,
            description: "Execute uncovered test line",
          },
        ],
      }),
    );
  }
}

describe("multi-IP project coverage fixtures", () => {
  it("uses toggle coverage and redistributes an absent branch weight", () => {
    expect(
      combinedCoverageScoreWithToggle({
        line: { found: 33, hit: 25, percent: 75.76 },
        branch: { found: 2, hit: 1, percent: 50 },
        toggle: { found: 408, hit: 137, percent: 33.58 },
      }),
    ).toBe(57.95);
    expect(
      combinedCoverageScoreWithToggle({
        line: { found: 6, hit: 6, percent: 100 },
        branch: { found: 0, hit: 0, percent: 100 },
        toggle: { found: 282, hit: 201, percent: 71.28 },
      }),
    ).toBe(91.38);
  });

  it("materializes each locked project without changing its upstream source", async () => {
    for (const projectId of [
      "dpretet",
      "axis",
      "openhmc",
      "ufifo",
      "eth-fifo",
      "versatile-fifo",
      "aes-highthroughput-lowarea",
      "scalable-arbiter",
    ] as const) {
      const synthetic = await syntheticProject(projectId);
      const runRoot = await mkdtemp(path.join(os.tmpdir(), `rtl-agent-${projectId}-run-`));
      roots.push(runRoot);
      const provider = new ProjectCoverageFixtureProvider(synthetic.root, synthetic.lock);
      const run = await createCoreLoopRun(
        provider,
        {
          schemaVersion: 1,
          caseRef: projectCoverageCaseRef(projectId, synthetic.lock),
          profile: {
            schemaVersion: 1,
            profileId: "project-coverage-test",
            compilerProfileId: "project-coverage-test",
            maxAttempts: 1,
            stdoutLimitBytes: 1024,
            stderrLimitBytes: 1024,
            maximumIssues: 10,
            issueMessageLimitBytes: 256,
          },
        },
        { runsRoot: path.join(runRoot, "runs") },
      );
      const tb = await readFile(path.join(run.workspaceDirectory, "rtl", "tb.sv"), "utf8");
      const checker = await readFile(
        path.join(run.workspaceDirectory, "rtl", "checker.sv"),
        "utf8",
      );
      expect(tb).toContain("GOLDEN_PASS");
      expect(checker).toContain("$fatal");
      if (projectId === "dpretet" || projectId === "axis") {
        for (const [logical, content] of SYNTHETIC_SOURCES[projectId]) {
          expect(
            await readFile(
              path.join(run.workspaceDirectory, "rtl", "dut", path.posix.basename(logical)),
              "utf8",
            ),
          ).toBe(content);
        }
        expect(tb).toContain("TopModule #");
      } else if (projectId === "versatile-fifo") {
        await expect(
          readFile(
            path.join(run.workspaceDirectory, "rtl", "dut", "async_fifo_dw_simplex.v"),
            "utf8",
          ),
        ).resolves.toContain("module TopModule (");
      } else if (projectId === "aes-highthroughput-lowarea") {
        await expect(
          readFile(path.join(run.workspaceDirectory, "rtl", "dut", "aes.v"), "utf8"),
        ).resolves.toContain("module TopModule (");
      } else if (projectId === "openhmc") {
        await expect(
          readFile(path.join(run.workspaceDirectory, "rtl", "dut", "openhmc_async_fifo.v"), "utf8"),
        ).resolves.toBe("module openhmc_async_fifo(); endmodule\n");
        expect(tb).toContain("TopModule dut");
      } else if (projectId === "ufifo") {
        await expect(
          readFile(path.join(run.workspaceDirectory, "rtl", "dut", "ufifo.v"), "utf8"),
        ).resolves.toBe("module ufifo(); endmodule\n");
        expect(tb).toContain("TopModule dut");
      } else if (projectId === "eth-fifo") {
        await expect(
          readFile(path.join(run.workspaceDirectory, "rtl", "dut", "eth_fifo.v"), "utf8"),
        ).resolves.toBe("module eth_fifo(); endmodule\n");
        expect(tb).toContain("TopModule dut");
      } else {
        await expect(
          readFile(path.join(run.workspaceDirectory, "rtl", "dut", "top_wrapper.sv"), "utf8"),
        ).resolves.toContain("arbiter_x2 #(.width(16)");
      }
    }
  });

  it("rejects a source tree whose bytes no longer match its lock", async () => {
    const synthetic = await syntheticProject("versatile-fifo");
    await writeFile(
      path.join(synthetic.root, "rtl", "verilog", "async_fifo_dw_simplex_actel.v"),
      "tampered\n",
    );
    const provider = new ProjectCoverageFixtureProvider(synthetic.root, synthetic.lock);
    const destination = await mkdtemp(path.join(os.tmpdir(), "rtl-agent-project-tamper-"));
    roots.push(destination);
    await expect(
      provider.materialize(
        projectCoverageCaseRef("versatile-fifo", synthetic.lock),
        destination as never,
      ),
    ).rejects.toMatchObject({ error: { code: "DATASET_PROVENANCE_INVALID" } });
  });

  it("runs a deterministic baseline without constructing an Agent", async () => {
    const synthetic = await syntheticProject("aes-highthroughput-lowarea");
    const runner = new BaselineRunner();
    const runRoot = await mkdtemp(path.join(os.tmpdir(), "rtl-agent-project-baseline-"));
    roots.push(runRoot);
    const execution = await runProjectCoverageExperiment({
      projectId: "aes-highthroughput-lowarea",
      provider: new ProjectCoverageFixtureProvider(synthetic.root, synthetic.lock),
      caseRef: projectCoverageCaseRef("aes-highthroughput-lowarea", synthetic.lock),
      coverageRunner: runner,
      runsRoot: path.join(runRoot, "runs"),
      maxAgentIterations: 0,
    });

    expect(runner.rounds).toEqual([1]);
    const snapshot = path.join(execution.run.runDirectory, "evidence", "verification-assets");
    const original = await readFile(path.join(snapshot, "attempt-0", "rtl", "tb.sv"));
    expect(original).toEqual(
      await readFile(path.join(execution.run.workspaceDirectory, "rtl", "tb.sv")),
    );
    await writeFile(path.join(execution.run.workspaceDirectory, "rtl", "tb.sv"), "// edited\n");
    await captureVerificationAssets(execution.run, 2);
    expect(await readFile(path.join(snapshot, "attempt-0", "rtl", "tb.sv"))).toEqual(original);
    expect(await readFile(path.join(snapshot, "attempt-2", "rtl", "tb.sv"), "utf8")).toBe(
      "// edited\n",
    );
    const manifest = JSON.parse(
      await readFile(path.join(snapshot, "attempt-2", "manifest.json"), "utf8"),
    );
    expect(
      manifest.entries.find((entry: { path: string }) => entry.path === "rtl/tb.sv").contentDigest,
    ).toBe(sha256Bytes(Buffer.from("// edited\n")));
    await expect(captureVerificationAssets(execution.run, 2)).rejects.toMatchObject({
      code: "EEXIST",
    });
    await expect(captureVerificationAssets(execution.run, -1)).rejects.toThrow(
      "Invalid verification",
    );
    expect(execution.result).toMatchObject({
      status: "PENDING_HUMAN_REVIEW",
      stopReason: "BASELINE_ONLY",
      roundsCompleted: 1,
      agentAttempts: 0,
      baselineCoverage: { score: 55 },
    });
  });
});
