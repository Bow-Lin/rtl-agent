import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  MismatchAnalysisSchema,
  VerilogEvalFunctionalResultSchema,
  updateObservedIssues,
} from "../src/index.js";
import type {
  CoreLoopBatchExecution,
  MismatchAnalyzer,
  VerilogEvalFunctionalResult,
} from "../src/index.js";

const roots: string[] = [];
const caseRef = {
  schemaVersion: 1,
  fixtureId: "ve2-p101-fsm",
  identity: {
    datasetId: "nvlabs-verilog-eval",
    datasetVersion: "v2-test",
    split: "spec-to-rtl",
    caseId: "Prob101_fsm",
  },
  caseSourceDigest: `sha256:${"a".repeat(64)}`,
} as const;

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "rtl-observed-issues-"));
  roots.push(root);
  return root;
}

function execution(root: string): CoreLoopBatchExecution {
  return {
    batchDirectory: path.join(root, "batches", "b-20260722-009"),
    inputManifest: { selectedCases: [caseRef] },
    result: {
      batchId: "b-20260722-009",
      runs: [
        {
          runId: "run_123e4567-e89b-42d3-a456-426614174000",
          fixtureIdentity: caseRef.identity,
          compileObservations: [
            {
              phase: "ATTEMPT",
              attempt: 1,
              status: "COMPILE_ERROR",
              durationMs: 1,
              issues: [{ message: "This assignment requires an explicit cast." }],
            },
          ],
        },
      ],
    },
  } as unknown as CoreLoopBatchExecution;
}

function functionalResult(): VerilogEvalFunctionalResult {
  return VerilogEvalFunctionalResultSchema.parse({
    schemaVersion: 1,
    authoritative: false,
    claim: "FUNCTIONAL_SIMULATION",
    batchId: "b-20260722-009",
    status: "COMPLETED",
    caseCount: 1,
    compilePassed: 1,
    functionalPassed: 0,
    functionalFailed: 1,
    functionalNotRun: 0,
    cases: [
      {
        schemaVersion: 1,
        caseRef,
        runId: "run_123e4567-e89b-42d3-a456-426614174000",
        status: "MISMATCH",
        mismatches: 7,
        samples: 100,
        outputMismatches: [{ outputPort: "done", mismatches: 7, firstMismatchTime: 205 }],
        compileExitCode: 0,
        simulationExitCode: 0,
        compileDurationMs: 1,
        simulationDurationMs: 1,
        stdout: {
          preview: "Mismatches: 7 in 100 samples",
          truncated: false,
          originalByteLength: 36,
        },
        stderr: { preview: "", truncated: false, originalByteLength: 0 },
      },
    ],
  });
}

describe("observed dataset issues", () => {
  it("records compile evidence and a concrete mismatch diagnosis once per batch", async () => {
    const root = await temporaryRoot();
    const analyze = vi.fn(async () =>
      MismatchAnalysisSchema.parse({
        schemaVersion: 1,
        category: "FSM_TRANSITION",
        rootCause:
          "The next-state branch returns to IDLE one cycle before the specification's terminal condition.",
        evidence: [
          {
            path: "rtl/TopModule.sv",
            lineStart: 21,
            lineEnd: 24,
            observation:
              "The transition compares count against 3 before incrementing the register.",
          },
          {
            path: "spec.md",
            lineStart: 8,
            lineEnd: 9,
            observation: "The output must remain asserted through the fourth active cycle.",
          },
        ],
        confidence: "HIGH",
        limitations: "The diagnosis is based on the public specification and candidate RTL only.",
      }),
    );
    const mismatchAnalyzer: MismatchAnalyzer = { analyze };
    const options = {
      knowledgeRoot: path.join(root, "knowledge"),
      execution: execution(root),
      functionalResult: functionalResult(),
      mismatchAnalyzer,
      completedAt: new Date("2026-07-22T03:00:00.000Z"),
    } as const;

    const journalPath = await updateObservedIssues(options);
    await updateObservedIssues(options);
    const journal = await readFile(journalPath, "utf8");

    expect(analyze).toHaveBeenCalledTimes(1);
    expect(analyze).toHaveBeenCalledWith(
      expect.objectContaining({
        outputMismatches: [{ outputPort: "done", mismatches: 7, firstMismatchTime: 205 }],
      }),
    );
    expect(journal.match(/<!-- batch:b-20260722-009 -->/gu)).toHaveLength(1);
    expect(journal).toContain("This assignment requires an explicit cast.");
    expect(journal).toContain("Conclusion [FSM_TRANSITION, HIGH]");
    expect(journal).not.toContain("rtl/TopModule.sv:21-24");
    expect(journal).not.toContain("The diagnosis is based on the public specification");
    expect(journal).not.toContain("LOGIC_MISMATCH_UNKNOWN");
  });

  it("refuses to journal a mismatch without a concrete analyzer", async () => {
    const root = await temporaryRoot();
    await expect(
      updateObservedIssues({
        knowledgeRoot: path.join(root, "knowledge"),
        execution: execution(root),
        functionalResult: functionalResult(),
      }),
    ).rejects.toMatchObject({ error: { code: "MISMATCH_ANALYSIS_FAILED" } });
  });

  it("rejects generic diagnoses and analyses without candidate evidence", () => {
    expect(
      MismatchAnalysisSchema.safeParse({
        schemaVersion: 1,
        category: "OTHER_SPEC_VIOLATION",
        rootCause: "The implementation differs from the expected behavior in an unspecified way.",
        evidence: [
          {
            path: "spec.md",
            lineStart: 1,
            lineEnd: 1,
            observation: "The specification describes the intended module behavior.",
          },
        ],
        confidence: "LOW",
        limitations: "Hidden verification assets are unavailable to this analysis.",
      }).success,
    ).toBe(false);
  });
});
