import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  evaluateVerilogEvalFunctionalBatch,
  sha256Bytes,
  VerilogEvalFunctionalResultSchema,
} from "../src/index.js";
import type {
  CompilerProcessResult,
  CoreLoopBatchExecution,
  HostDirectory,
  VerilogEvalFixtureProvider,
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

describe("VerilogEval functional simulation", () => {
  it.each([
    {
      name: "accepts zero mismatch",
      simulationOutput: "Mismatches: 0 in 100 samples\n",
      expectedStatus: "PASSED",
      expectedBatchStatus: "COMPLETED",
      compileExitCode: 0,
      functionalPassed: 1,
      functionalFailed: 0,
      verificationInvalid: 0,
      mismatches: 0,
      outputMismatches: [],
    },
    {
      name: "reports a nonzero mismatch",
      simulationOutput:
        "Hint: Output 'done' has 3 mismatches. First mismatch occurred at time 205.\nMismatches: 3 in 100 samples\n",
      expectedStatus: "MISMATCH",
      expectedBatchStatus: "COMPLETED",
      compileExitCode: 0,
      functionalPassed: 0,
      functionalFailed: 1,
      verificationInvalid: 0,
      mismatches: 3,
      outputMismatches: [{ outputPort: "done", mismatches: 3, firstMismatchTime: 205 }],
    },
    {
      name: "separates a verification compile error from a functional mismatch",
      simulationOutput: undefined,
      expectedStatus: "SIMULATION_COMPILE_ERROR",
      expectedBatchStatus: "INVALID",
      compileExitCode: 1,
      functionalPassed: 0,
      functionalFailed: 0,
      verificationInvalid: 1,
      mismatches: null,
      outputMismatches: [],
    },
  ])("keeps hidden assets internal, publishes candidate RTL, and $name", async (example) => {
    const root = await mkdtemp(path.join(os.tmpdir(), "rtl-agent-functional-test-"));
    roots.push(root);
    const runId = "run_123e4567-e89b-42d3-a456-426614174000";
    const caseRef = {
      schemaVersion: 1,
      fixtureId: "ve2-p001-zero",
      identity: {
        datasetId: "nvlabs-verilog-eval",
        datasetVersion: "v2-test",
        split: "spec-to-rtl",
        caseId: "Prob001_zero",
      },
      caseSourceDigest: `sha256:${"a".repeat(64)}`,
    } as const;
    const rtlDirectory = path.join(root, "_internal", "runs", runId, "workspace", "rtl");
    await mkdir(rtlDirectory, { recursive: true });
    await writeFile(path.join(rtlDirectory, "TopModule.sv"), "module TopModule; endmodule\n");
    const execution = {
      batchDirectory: root,
      inputManifest: { selectedCases: [caseRef], materializedCases: [{ caseRef, runId }] },
      result: {
        batchId: "b-20260721-001",
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
    } as unknown as VerilogEvalFixtureProvider;
    const results = [
      processResult("", example.compileExitCode),
      ...(example.simulationOutput === undefined ? [] : [processResult(example.simulationOutput)]),
    ];
    const result = await evaluateVerilogEvalFunctionalBatch({
      execution,
      provider,
      iverilogExecutable: path.resolve("iverilog.exe"),
      processRunner: async () => results.shift()!,
    });

    expect(result).toMatchObject({
      claim: "FUNCTIONAL_SIMULATION",
      status: example.expectedBatchStatus,
      compilePassed: 1,
      functionalPassed: example.functionalPassed,
      functionalFailed: example.functionalFailed,
      functionalNotRun: 0,
      verificationInvalid: example.verificationInvalid,
      cases: [
        {
          status: example.expectedStatus,
          mismatches: example.mismatches,
          samples: example.simulationOutput === undefined ? null : 100,
          outputMismatches: example.outputMismatches,
        },
      ],
    });
    await expect(
      readFile(path.join(root, "rtl", "Prob001_zero", "TopModule.sv"), "utf8"),
    ).resolves.toContain("TopModule");
    await expect(readFile(path.join(root, "summary.json"), "utf8")).resolves.toContain(
      `"functionalPassed": ${example.functionalPassed}`,
    );
    await expect(
      readFile(path.join(root, "rtl", "Prob001_zero", "reference.sv")),
    ).rejects.toThrow();
    await expect(
      readFile(
        path.join(root, "_internal", "verification", "0001", "assets", "reference.sv"),
        "utf8",
      ),
    ).resolves.toContain("RefModule");

    const legacyEvidence = JSON.parse(JSON.stringify(result)) as {
      verificationInvalid?: unknown;
      cases: { outputMismatches?: unknown }[];
    };
    delete legacyEvidence.verificationInvalid;
    for (const caseResult of legacyEvidence.cases) delete caseResult.outputMismatches;
    expect(VerilogEvalFunctionalResultSchema.parse(legacyEvidence).verificationInvalid).toBe(0);
  });
});
