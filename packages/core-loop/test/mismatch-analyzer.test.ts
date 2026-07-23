import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { FixtureCaseRefSchema, OpenCodeMismatchAnalyzer } from "../src/index.js";
import type { OpenCodeExperimentConfig } from "../src/index.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function fixture(mode: "valid" | "repair" | "invalid" | "tamper" | "broad") {
  const root = await mkdtemp(path.join(os.tmpdir(), "rtl-mismatch-analyzer-"));
  roots.push(root);
  const batchDirectory = path.join(root, "batches", "b-20260722-010");
  const runId = "run_123e4567-e89b-42d3-a456-426614174000";
  const sourceWorkspace = path.join(batchDirectory, "_internal", "runs", runId, "workspace");
  await Promise.all([
    mkdir(path.join(sourceWorkspace, "rtl"), { recursive: true }),
    mkdir(path.join(root, ".opencode", "agents"), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(path.join(sourceWorkspace, "spec.md"), "Keep done high for four cycles.\n", "utf8"),
    writeFile(
      path.join(sourceWorkspace, "rtl", "TopModule.sv"),
      "module TopModule; logic [1:0] count; endmodule\n",
      "utf8",
    ),
    writeFile(
      path.join(root, ".opencode", "agents", "rtl-mismatch-analyzer.md"),
      "synthetic analyzer\n",
      "utf8",
    ),
  ]);
  const script = path.join(root, "fake-analyzer.mjs");
  await writeFile(
    script,
    `import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
const args = process.argv.slice(2);
if (args[0] === "--version") { process.stdout.write("1.0.0"); process.exit(0); }
if (args[0] === "agent" && args[1] === "list") {
  process.stdout.write("rtl-mismatch-analyzer (primary)\\n" + JSON.stringify([
    { permission: "*", action: "deny", pattern: "*" },
    { permission: "read", action: "allow", pattern: "spec.md" },
    { permission: "read", action: "allow", pattern: "**/spec.md" },
    { permission: "read", action: "allow", pattern: "context/*" },
    { permission: "read", action: "allow", pattern: "**/context/*" },
    { permission: "read", action: "allow", pattern: "rtl/**" },
    { permission: "read", action: "allow", pattern: "**/rtl/**" },
    { permission: "read", action: "allow", pattern: "analysis.json" },
    { permission: "read", action: "allow", pattern: "**/analysis.json" },
    { permission: "edit", action: "allow", pattern: "analysis.json" },
    { permission: "edit", action: "allow", pattern: "**/analysis.json" }
    ${mode === "broad" ? ',{ permission: "bash", action: "allow", pattern: "*" }' : ""}
  ]));
  process.exit(0);
}
const workspace = args[args.indexOf("--dir") + 1];
${mode === "tamper" ? 'writeFileSync(path.join(workspace, "spec.md"), "tampered\\n");' : ""}
const needsRepair = existsSync(path.join(workspace, "context", "analysis-validation-errors.json"));
if (${JSON.stringify(mode)} === "invalid" || (${JSON.stringify(mode)} === "repair" && !needsRepair)) {
  writeFileSync(path.join(workspace, "analysis.json"), JSON.stringify({
    schemaVersion: 1,
    category: "INITIALIZATION",
    rootCause: "The candidate register has no explicit initial state before the first active edge.",
    evidence: ["rtl/TopModule.sv line 1"],
    confidence: "medium",
    limitations: "Hidden verification assets were unavailable."
  }));
  process.exit(0);
}
writeFileSync(path.join(workspace, "analysis.json"), JSON.stringify({
  schemaVersion: 1,
  category: "COUNTER_BOUNDARY",
  rootCause: "The two-bit counter rolls over before representing the required fourth active cycle.",
  evidence: [{ path: "rtl/TopModule.sv", lineStart: 1, lineEnd: 1, observation: "The counter has only two bits and no explicit terminal hold state." }],
  confidence: "MEDIUM",
  limitations: "The hidden verification assets were not available to the diagnosis."
}));
`,
    "utf8",
  );
  const config: OpenCodeExperimentConfig = {
    executable: process.execPath,
    executableArgumentsPrefix: [script],
    expectedOpenCodeVersion: "1.0.0",
    repositoryRoot: root,
    providerModel: "test/model",
    timeoutMs: 5_000,
    terminationGraceMs: 100,
    stabilityWindowMs: 10,
    stderrLimitBytes: 4_096,
    maximumEvents: 32,
    maximumEventLineBytes: 4_096,
    workspaceLimits: { maximumFiles: 10, maximumFileBytes: 10_000, maximumTotalBytes: 20_000 },
  };
  return { batchDirectory, runId, config };
}

const caseRef = FixtureCaseRefSchema.parse({
  schemaVersion: 1,
  fixtureId: "ve2-p101-counter",
  identity: {
    datasetId: "nvlabs-verilog-eval",
    datasetVersion: "v2-test",
    split: "spec-to-rtl",
    caseId: "Prob101_counter",
  },
  caseSourceDigest: `sha256:${"a".repeat(64)}`,
});

describe("OpenCode mismatch analyzer", () => {
  it("accepts a concrete structured diagnosis produced without hidden assets", async () => {
    const test = await fixture("valid");
    const result = await new OpenCodeMismatchAnalyzer(test.config).analyze({
      batchDirectory: test.batchDirectory,
      runId: test.runId,
      caseRef,
      mismatches: 5,
      samples: 100,
      outputMismatches: [{ outputPort: "done", mismatches: 5, firstMismatchTime: 205 }],
    });

    expect(result).toMatchObject({ category: "COUNTER_BOUNDARY", confidence: "MEDIUM" });
    await expect(
      readFile(
        path.join(
          test.batchDirectory,
          "_internal",
          "mismatch-analysis",
          test.runId,
          "context",
          "mismatch.json",
        ),
        "utf8",
      ),
    ).resolves.toContain('"outputPort": "done"');
    await expect(
      readFile(
        path.join(
          test.batchDirectory,
          "_internal",
          "mismatch-analysis",
          test.runId,
          "context",
          "analysis-schema.json",
        ),
        "utf8",
      ),
    ).resolves.toContain('"INITIALIZATION_SEMANTICS"');
  });

  it("uses one bounded repair turn after returning schema validation errors", async () => {
    const test = await fixture("repair");
    const result = await new OpenCodeMismatchAnalyzer(test.config).analyze({
      batchDirectory: test.batchDirectory,
      runId: test.runId,
      caseRef,
      mismatches: 1,
      samples: 41,
      outputMismatches: [{ outputPort: "q", mismatches: 1, firstMismatchTime: 5 }],
    });

    expect(result.category).toBe("COUNTER_BOUNDARY");
    const metadata = JSON.parse(
      await readFile(
        path.join(
          test.batchDirectory,
          "_internal",
          "mismatch-analysis",
          test.runId,
          "analysis-metadata.json",
        ),
        "utf8",
      ),
    ) as { diagnosisTurns: number };
    expect(metadata.diagnosisTurns).toBe(2);
  });

  it("fails closed after one bounded repair turn remains schema-invalid", async () => {
    const test = await fixture("invalid");
    await expect(
      new OpenCodeMismatchAnalyzer(test.config).analyze({
        batchDirectory: test.batchDirectory,
        runId: test.runId,
        caseRef,
        mismatches: 1,
        samples: 41,
        outputMismatches: [{ outputPort: "q", mismatches: 1, firstMismatchTime: 5 }],
      }),
    ).rejects.toMatchObject({ error: { code: "MISMATCH_ANALYSIS_FAILED" } });
  });

  it("rejects a diagnosis turn that changes the public specification", async () => {
    const test = await fixture("tamper");
    await expect(
      new OpenCodeMismatchAnalyzer(test.config).analyze({
        batchDirectory: test.batchDirectory,
        runId: test.runId,
        caseRef,
        mismatches: 5,
        samples: 100,
        outputMismatches: [{ outputPort: "done", mismatches: 5, firstMismatchTime: 205 }],
      }),
    ).rejects.toMatchObject({ error: { code: "MISMATCH_ANALYSIS_FAILED" } });
  });

  it("rejects an analyzer whose resolved permissions include an unexpected allow", async () => {
    const test = await fixture("broad");
    await expect(
      new OpenCodeMismatchAnalyzer(test.config).analyze({
        batchDirectory: test.batchDirectory,
        runId: test.runId,
        caseRef,
        mismatches: 5,
        samples: 100,
        outputMismatches: [{ outputPort: "done", mismatches: 5, firstMismatchTime: 205 }],
      }),
    ).rejects.toMatchObject({ error: { code: "MISMATCH_ANALYSIS_FAILED" } });
  });
});
