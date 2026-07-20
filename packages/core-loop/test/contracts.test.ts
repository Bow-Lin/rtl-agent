import { describe, expect, it } from "vitest";

import {
  AgentAttemptInputSchema,
  CapturedOutputSchema,
  CompileRequestSchema,
  CompileResultSchema,
  CoreLoopErrorSchema,
  FinalResultSchema,
  NormalizedFixtureSchema,
  captureOutput,
} from "../src/index.js";
import { CASE_DIGEST, CASE_REF, DATASET_DIGEST, PROFILE } from "./fixtures.js";

const RUN_ID = "run_123e4567-e89b-42d3-a456-426614174000";

describe("Core Loop contracts", () => {
  it("keeps blank generation and seeded repair structurally distinct", () => {
    const common = {
      schemaVersion: 1,
      fixtureId: CASE_REF.fixtureId,
      provenance: {
        identity: CASE_REF.identity,
        datasetSourceDigest: DATASET_DIGEST,
        caseSourceDigest: CASE_DIGEST,
        license: { name: "Synthetic" },
        adapter: {
          adapterId: "test-adapter",
          adapterVersion: "v1",
          normalizationVersion: "v1",
        },
      },
      specPath: "spec.md",
      workspaceRtlRoot: "rtl",
      topModule: "dut",
      tags: [],
      normalizedFixtureDigest: CASE_DIGEST,
    };
    expect(
      NormalizedFixtureSchema.safeParse({ ...common, category: "BLANK_GENERATION" }).success,
    ).toBe(true);
    expect(
      NormalizedFixtureSchema.safeParse({
        ...common,
        category: "PROMPTED_FUNCTIONAL_REPAIR",
      }).success,
    ).toBe(true);
    expect(
      NormalizedFixtureSchema.safeParse({
        ...common,
        category: "SEEDED_COMPILE_REPAIR",
      }).success,
    ).toBe(false);
    expect(
      NormalizedFixtureSchema.safeParse({
        ...common,
        category: "SEEDED_COMPILE_REPAIR",
        starterRtlRoot: "rtl",
        starterRtlDigest: CASE_DIGEST,
      }).success,
    ).toBe(true);
  });

  it("defines the complete R02 and R03 handoff inputs", () => {
    expect(
      AgentAttemptInputSchema.parse({
        schemaVersion: 1,
        runId: RUN_ID,
        attempt: 1,
        category: "BLANK_GENERATION",
        specPath: "spec.md",
        workspaceRtlRoot: "rtl",
        rtlSourceFiles: [],
        topModule: "dut",
      }),
    ).toBeDefined();
    const seededAgentInput = {
      schemaVersion: 1,
      runId: RUN_ID,
      attempt: 1,
      category: "SEEDED_COMPILE_REPAIR",
      specPath: "spec.md",
      workspaceRtlRoot: "rtl",
      topModule: "dut",
    };
    expect(
      AgentAttemptInputSchema.safeParse({
        ...seededAgentInput,
        rtlSourceFiles: ["rtl/DUT.sv", "rtl/dut.sv"],
      }).success,
    ).toBe(false);
    expect(
      AgentAttemptInputSchema.safeParse({
        ...seededAgentInput,
        rtlSourceFiles: ["rtl/readme.txt"],
      }).success,
    ).toBe(false);
    expect(
      CompileRequestSchema.parse({
        schemaVersion: 1,
        runId: RUN_ID,
        attempt: 1,
        compilerProfileId: PROFILE.compilerProfileId,
        topModule: "dut",
        workspaceRtlRoot: "rtl",
        sourceFiles: ["rtl/dut.sv"],
        workspaceManifestDigest: CASE_DIGEST,
      }),
    ).toBeDefined();
    expect(
      CompileRequestSchema.safeParse({
        schemaVersion: 1,
        runId: RUN_ID,
        attempt: 1,
        compilerProfileId: PROFILE.compilerProfileId,
        topModule: "dut",
        workspaceRtlRoot: "rtl",
        sourceFiles: ["rtl/dut.sv", "rtl/DUT.sv"],
        workspaceManifestDigest: CASE_DIGEST,
      }).success,
    ).toBe(false);
  });

  it.each(["COMPILE_PASSED", "COMPILE_ERROR", "TIMEOUT", "TOOL_ERROR"] as const)(
    "parses the %s compile result variant",
    (status) => {
      const exitCode = status === "COMPILE_PASSED" ? 0 : status === "COMPILE_ERROR" ? 1 : null;
      expect(
        CompileResultSchema.parse({
          schemaVersion: 1,
          authoritative: false,
          claim: "COMPILE_ONLY",
          status,
          runId: RUN_ID,
          attempt: 1,
          compilerProfileId: PROFILE.compilerProfileId,
          toolVersion: "Icarus Verilog version 12.0",
          topModule: "dut",
          workspaceManifestDigest: CASE_DIGEST,
          exitCode,
          durationMs: 3,
          issues: [],
          stdout: { preview: "", truncated: false, originalByteLength: 0 },
          stderr: { preview: "", truncated: false, originalByteLength: 0 },
        }),
      ).toBeDefined();
    },
  );

  it("allows an unknown tool version only for tool-error results", () => {
    const common = {
      schemaVersion: 1,
      authoritative: false,
      claim: "COMPILE_ONLY",
      runId: RUN_ID,
      attempt: 1,
      compilerProfileId: PROFILE.compilerProfileId,
      toolVersion: null,
      topModule: "dut",
      workspaceManifestDigest: CASE_DIGEST,
      exitCode: null,
      durationMs: 3,
      issues: [],
      stdout: { preview: "", truncated: false, originalByteLength: 0 },
      stderr: { preview: "", truncated: false, originalByteLength: 0 },
    } as const;
    expect(CompileResultSchema.safeParse({ ...common, status: "TOOL_ERROR" }).success).toBe(true);
    expect(CompileResultSchema.safeParse({ ...common, status: "TIMEOUT" }).success).toBe(false);
  });

  it("requires explicit non-authoritative compile-only final results", () => {
    const result = {
      schemaVersion: 1,
      authoritative: false,
      claim: "COMPILE_ONLY",
      outcome: "COMPILE_PASSED",
      runId: RUN_ID,
      fixtureId: CASE_REF.fixtureId,
      fixtureIdentity: CASE_REF.identity,
      normalizedFixtureDigest: CASE_DIGEST,
      profileId: PROFILE.profileId,
      compilerProfileId: PROFILE.compilerProfileId,
      toolVersion: "12.0",
      attemptCount: 1,
      finalRtlManifestDigest: CASE_DIGEST,
      startedAt: "2026-07-15T00:00:00.000Z",
      completedAt: "2026-07-15T00:00:01.000Z",
    };
    expect(FinalResultSchema.safeParse(result).success).toBe(true);
    expect(FinalResultSchema.safeParse({ ...result, authoritative: true }).success).toBe(false);
    expect(FinalResultSchema.safeParse({ ...result, extra: true }).success).toBe(false);
    expect(FinalResultSchema.safeParse({ ...result, toolVersion: null }).success).toBe(false);
    expect(
      FinalResultSchema.safeParse({ ...result, outcome: "TOOL_ERROR", toolVersion: null }).success,
    ).toBe(true);
  });

  it("captures sanitized UTF-8 byte-bounded output without host paths", () => {
    const output = captureOutput("C:\\secret\\run 😀 done\u001b[31m!", {
      limitBytes: 16,
      artifactPath: "evidence/attempts/1/stderr.txt",
      redactHostPaths: ["C:\\secret\\run"],
    });
    expect(output.preview).not.toContain("C:\\secret\\run");
    expect(Buffer.byteLength(output.preview, "utf8")).toBeLessThanOrEqual(16);
    expect(output.originalByteLength).toBeGreaterThan(Buffer.byteLength(output.preview, "utf8"));
    expect(output.truncated).toBe(true);
  });

  it("redacts host absolute paths even without caller-provided path hints", () => {
    const output = captureOutput(
      'C:\\secret\\run \\\\server\\share\\dut.sv "/home/user/rtl/dut.sv" file:///tmp/dut.sv https://example.com/docs',
      { limitBytes: 1024 },
    );
    expect(output.preview).toBe(
      '<host-path> <host-path> "<host-path>" <host-path> https://example.com/docs',
    );
    expect(output.truncated).toBe(false);
    for (const preview of [
      "compiler read C:\\secret\\run\\dut.sv",
      "compiler read \\\\server\\share\\dut.sv",
      "compiler read /home/user/rtl/dut.sv",
      'compiler read "/home/user/rtl/dut.sv"',
      "compiler read file:///home/user/rtl/dut.sv",
    ]) {
      expect(
        CapturedOutputSchema.safeParse({
          preview,
          truncated: false,
          originalByteLength: Buffer.byteLength(preview),
        }).success,
      ).toBe(false);
    }
    expect(
      CapturedOutputSchema.safeParse({
        preview: "see https://example.com/docs",
        truncated: false,
        originalByteLength: Buffer.byteLength("see https://example.com/docs"),
      }).success,
    ).toBe(true);
  });

  it("enforces the captured preview maximum in UTF-8 bytes", () => {
    const preview = "😀".repeat(262_145);
    expect(preview.length).toBeLessThan(1_048_576);
    expect(Buffer.byteLength(preview, "utf8")).toBeGreaterThan(1_048_576);
    expect(
      CapturedOutputSchema.safeParse({
        preview,
        truncated: false,
        originalByteLength: Buffer.byteLength(preview, "utf8"),
      }).success,
    ).toBe(false);
  });

  it("tracks raw pipe bytes independently from a sanitized preview", () => {
    const output = captureOutput("C:\\secret\\dut.sv\u001b[31m", { limitBytes: 1024 });
    expect(output.preview).toBe("<host-path>");
    expect(output.truncated).toBe(false);
    expect(output.originalByteLength).toBe(Buffer.byteLength("C:\\secret\\dut.sv\u001b[31m"));
    expect(output.originalByteLength).not.toBe(Buffer.byteLength(output.preview));
    expect(CapturedOutputSchema.safeParse(output).success).toBe(true);
  });

  it("enforces fixed retryability and the safe internal error", () => {
    expect(
      CoreLoopErrorSchema.safeParse({
        schemaVersion: 1,
        code: "RUN_ALREADY_EXISTS",
        message: "exists",
        retryable: true,
      }).success,
    ).toBe(false);
    expect(
      CoreLoopErrorSchema.safeParse({
        schemaVersion: 1,
        code: "INTERNAL_ERROR",
        message: "leaked stack",
        retryable: false,
      }).success,
    ).toBe(false);
  });
});
