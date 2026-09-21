import type { CompilerProcessResult } from "@rtl-agent/core-loop";
import { describe, expect, it } from "vitest";

import {
  classifyMutationExecution,
  parseMutationCommandOptions,
  patchMatchesManifestEntry,
  rawMutationScore,
} from "../src/mutation-command.js";

function processResult(overrides: Partial<CompilerProcessResult> = {}): CompilerProcessResult {
  return {
    exitCode: 0,
    signal: null,
    timedOut: false,
    terminationFailed: false,
    closeConfirmed: true,
    durationMs: 1,
    stdout: { preview: "", truncated: false, originalByteLength: 0 },
    stderr: { preview: "", truncated: false, originalByteLength: 0 },
    ...overrides,
  };
}

describe("mutation command", () => {
  it("defaults to all locked suites with a bounded timeout", () => {
    expect(parseMutationCommandOptions([])).toEqual({
      suites: ["baseline-78.16", "enhanced-93.99", "enhanced-100.00"],
      timeoutMs: 120_000,
    });
    expect(
      parseMutationCommandOptions(["--suite", "enhanced-93.99", "--timeout-ms", "300000"]),
    ).toEqual({ suites: ["enhanced-93.99"], timeoutMs: 300_000 });
  });

  it("rejects unknown suites and unsafe timeout bounds", () => {
    expect(() => parseMutationCommandOptions(["--suite", "unknown"])).toThrow();
    expect(() => parseMutationCommandOptions(["--timeout-ms", "999"])).toThrow();
  });

  it("accepts indentation differences introduced by unified diff prefixes", () => {
    expect(
      patchMatchesManifestEntry(
        [
          "--- a/rtl/dut/example.v",
          "+++ b/rtl/dut/example.v",
          "@@ -1 +1 @@",
          "-\telse if (ready) begin",
          "+\telse if (!(ready)) begin",
          "",
        ].join("\n"),
        {
          file: "rtl/dut/example.v",
          original: "else if (ready) begin",
          mutated: "else if (!(ready)) begin",
        },
      ),
    ).toBe(true);
  });

  it("classifies only clean nonzero simulation exits as killed", () => {
    const pass = processResult();
    expect(classifyMutationExecution(pass, pass, pass)).toBe("SURVIVED");
    expect(classifyMutationExecution(pass, pass, processResult({ exitCode: 1 }))).toBe("KILLED");
    expect(classifyMutationExecution(pass, processResult({ exitCode: 1 }), null)).toBe(
      "COMPILE_INVALID",
    );
    expect(classifyMutationExecution(pass, pass, processResult({ timedOut: true }))).toBe(
      "TIMEOUT",
    );
    expect(classifyMutationExecution(pass, pass, processResult({ spawnError: "failed" }))).toBe(
      "INFRASTRUCTURE_ERROR",
    );
    expect(classifyMutationExecution(processResult({ exitCode: 1 }), null, null)).toBe(
      "APPLY_FAILED",
    );
  });

  it("excludes invalid and unexecuted outcomes from the raw mutation denominator", () => {
    expect(
      rawMutationScore([
        "KILLED",
        "KILLED",
        "SURVIVED",
        "COMPILE_INVALID",
        "TIMEOUT",
        "APPLY_FAILED",
      ]),
    ).toBe(66.67);
    expect(rawMutationScore(["TIMEOUT", "COMPILE_INVALID"])).toBeNull();
  });
});
