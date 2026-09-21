import { test } from "node:test";
import assert from "node:assert/strict";
import { sourceRun, projectResult, collectSourceMetrics } from "./verification-source-input.ts";
test("only four sources, reject targets and path tricks", () => {
  for (const s of ["versatile", "eth", "ufifo", "openhmc"]) assert.ok(sourceRun(s));
  for (const s of ["axis", "dpretet", "../eth", "constructor", "toString", "ETH"])
    assert.throws(() => sourceRun(s));
});
test("scalar projection excludes oracle, transcript and kill fields", () => {
  const input = {
    status: "PENDING_HUMAN_REVIEW",
    maxAgentIterations: 3,
    agentAttempts: 2,
    stopReason: "NO_MEANINGFUL_GAIN",
    baselineCoverage: { score: 90, oracle: "SECRET" },
    finalCoverage: { score: 91 },
    transcript: "SECRET",
    kill: "SECRET",
  };
  assert.ok(!JSON.stringify(projectResult(input)).includes("SECRET"));
  assert.throws(() => projectResult({ ...input, status: "RUNNING" }));
  assert.throws(() => projectResult({ ...input, agentAttempts: 4 }));
  assert.throws(() => projectResult({ ...input, finalCoverage: { score: NaN } }));
});
test("missing, duplicate and target sources fail before I/O", async () => {
  await assert.rejects(collectSourceMetrics("absent", ["eth"]));
  await assert.rejects(collectSourceMetrics("absent", ["eth", "eth", "ufifo", "openhmc"]));
  await assert.rejects(collectSourceMetrics("absent", ["eth", "axis", "ufifo", "openhmc"]));
});
