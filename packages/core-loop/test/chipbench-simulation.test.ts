import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  ChipBenchFunctionalResultSchema,
  evaluateChipBenchFunctionalBatch,
  sha256Bytes,
} from "../src/index.js";
import type {
  ChipBenchFixtureProvider,
  CompilerProcessOptions,
  CompilerProcessResult,
  CoreLoopBatchExecution,
  HostDirectory,
} from "../src/index.js";

const roots: string[] = [];
const emptyOutput = { preview: "", truncated: false, originalByteLength: 0 } as const;

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function processResult(stdout = "", exitCode = 0): CompilerProcessResult {
  return {
    exitCode,
    signal: null,
    timedOut: false,
    terminationFailed: false,
    closeConfirmed: true,
    durationMs: 1,
    stdout: { preview: stdout, truncated: false, originalByteLength: Buffer.byteLength(stdout) },
    stderr: emptyOutput,
  };
}

describe("ChipBench functional simulation", () => {
  it("keeps ref/test private and scores the upstream mismatch summary", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "rtl-agent-chipbench-simulation-test-"));
    roots.push(root);
    const runId = "run_123e4567-e89b-42d3-a456-426614174000";
    const caseRef = {
      schemaVersion: 1,
      fixtureId: "cb-sc-p000",
      identity: {
        datasetId: "zhongkaiyu-chipbench",
        datasetVersion: "test",
        split: "self-contained",
        caseId: "Prob000_mux",
      },
      caseSourceDigest: `sha256:${"a".repeat(64)}`,
    } as const;
    const rtlDirectory = path.join(root, "_internal", "runs", runId, "workspace", "rtl");
    await mkdir(rtlDirectory, { recursive: true });
    await writeFile(path.join(rtlDirectory, "dut.sv"), "module TopModule; endmodule\n");
    const execution = {
      batchDirectory: root,
      inputManifest: { selectedCases: [caseRef], materializedCases: [{ caseRef, runId }] },
      result: {
        batchId: "b-20260806-001",
        status: "COMPLETED",
        runs: [
          {
            runId,
            status: "COMPLETE",
            evaluationValidity: "EVALUATION_VALID",
            finalResult: { outcome: "COMPILE_PASSED" },
          },
        ],
      },
    } as unknown as CoreLoopBatchExecution;
    const provider = {
      materializeVerification: async (_caseRef: unknown, destination: HostDirectory) => {
        const reference = Buffer.from("module RefModule; endmodule\n");
        const testbench = Buffer.from("module tb; endmodule\n");
        await Promise.all([
          writeFile(path.join(destination, "reference.sv"), reference),
          writeFile(path.join(destination, "testbench.sv"), testbench),
        ]);
        return {
          referenceLogicalPath: "reference.sv" as const,
          referenceDigest: sha256Bytes(reference),
          testbenchLogicalPath: "testbench.sv" as const,
          testbenchDigest: sha256Bytes(testbench),
          testbenchTopModule: "tb" as const,
        };
      },
    } as unknown as ChipBenchFixtureProvider;
    const invocations: CompilerProcessOptions[] = [];
    const results = [processResult(), processResult("Mismatches: 2 in 100 samples\n")];
    const result = await evaluateChipBenchFunctionalBatch({
      execution,
      provider,
      iverilogExecutable: path.resolve("iverilog.exe"),
      processRunner: async (options) => {
        invocations.push(options);
        return results.shift()!;
      },
    });

    expect(ChipBenchFunctionalResultSchema.parse(result)).toMatchObject({
      claim: "FUNCTIONAL_SIMULATION",
      status: "COMPLETED",
      compilePassed: 1,
      functionalPassed: 0,
      functionalFailed: 1,
      verificationInvalid: 0,
      cases: [{ status: "MISMATCH", mismatches: 2, samples: 100 }],
    });
    expect(invocations[0]?.arguments).toEqual(expect.arrayContaining(["-g2012", "-s", "tb"]));
    expect(invocations[0]?.arguments.some((argument) => argument.endsWith("reference.sv"))).toBe(
      true,
    );
    expect(invocations[0]?.arguments.some((argument) => argument.endsWith("testbench.sv"))).toBe(
      true,
    );
    await expect(
      readFile(path.join(root, "rtl", "Prob000_mux", "dut.sv"), "utf8"),
    ).resolves.toContain("TopModule");
    await expect(readFile(path.join(root, "rtl", "Prob000_mux", "reference.sv"))).rejects.toThrow();
    await expect(
      readFile(
        path.join(root, "_internal", "verification", "0001", "assets", "reference.sv"),
        "utf8",
      ),
    ).resolves.toContain("RefModule");
  });
});
