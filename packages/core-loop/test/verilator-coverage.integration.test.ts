import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { VerilatorCoverageRunner, createCoreLoopRun } from "../src/index.js";
import { RUN_REQUEST, TestFixtureProvider } from "./fixtures.js";

const enabled = process.env.RUN_VERILATOR_COVERAGE === "1";
const roots: string[] = [];

afterAll(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe.skipIf(!enabled)("Verilator coverage integration", () => {
  it("compiles, simulates, and converts coverage into DUT targets", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "rtl-agent-verilator-coverage-"));
    roots.push(root);
    const run = await createCoreLoopRun(new TestFixtureProvider(), RUN_REQUEST, {
      runsRoot: path.join(root, "runs"),
    });
    await writeFile(
      path.join(run.workspaceDirectory, "rtl", "dut.sv"),
      ["module dut(input logic a, output logic y);", "  assign y = a;", "endmodule", ""].join("\n"),
    );
    await writeFile(
      path.join(run.workspaceDirectory, "rtl", "checker.sv"),
      [
        "`timescale 1ns/1ps",
        "module tb_checker(input logic a, input logic y);",
        '  always_comb assert (y === a) else $fatal(1, "mismatch");',
        "endmodule",
        "",
      ].join("\n"),
    );
    await writeFile(
      path.join(run.workspaceDirectory, "rtl", "tb.sv"),
      [
        "`timescale 1ns/1ps",
        "module tb;",
        "  logic a = 1'b0;",
        "  logic y;",
        "  dut u_dut(.a(a), .y(y));",
        "  tb_checker u_checker(.a(a), .y(y));",
        "  initial begin #1; $finish; end",
        "endmodule",
        "",
      ].join("\n"),
    );
    const pathKey =
      Object.keys(process.env).find((name) => name.toLowerCase() === "path") ?? "Path";
    const windowsEnvironment = {
      ...process.env,
      VERILATOR_ROOT: process.env.VERILATOR_ROOT ?? "C:\\msys64\\ucrt64\\share\\verilator",
      [pathKey]: `C:\\msys64\\ucrt64\\bin;C:\\msys64\\usr\\bin;${process.env[pathKey] ?? ""}`,
    };
    const runner = new VerilatorCoverageRunner({
      verilatorExecutable:
        process.env.RTL_AGENT_VERILATOR_EXECUTABLE ??
        (process.platform === "win32" ? "C:\\msys64\\ucrt64\\bin\\verilator_bin.exe" : "verilator"),
      coverageExecutable:
        process.env.RTL_AGENT_VERILATOR_COVERAGE_EXECUTABLE ??
        (process.platform === "win32"
          ? "C:\\msys64\\ucrt64\\bin\\verilator_coverage_bin_dbg.exe"
          : "verilator_coverage"),
      environment: process.platform === "win32" ? windowsEnvironment : process.env,
      ...(process.platform === "win32" ? { cflags: ["-D_GLIBCXX_USE_CXX11_ABI=0"] } : {}),
    });
    const feedback = await runner.runRound(run, 1);
    expect(feedback.line.found).toBe(0);
    expect(feedback.toggle.found).toBeGreaterThan(0);
    expect(feedback.uncoveredTargets.every((target) => target.sourcePath === "rtl/dut.sv")).toBe(
      true,
    );
  }, 150_000);
});
