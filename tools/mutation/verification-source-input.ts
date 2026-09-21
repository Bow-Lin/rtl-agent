import { createHash } from "node:crypto";
import { readFile, realpath, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";

// Provenance/metrics audit only: not Experience or a Memory snapshot.
export const SOURCE_RUNS = {
  versatile: "versatile-fifo-async-duplex/run_20260913-135221-083",
  eth: "eth-fifo-depth8-width32/run_20260914-184218-176",
  ufifo: "ufifo-rx-depth16-width8/run_20260915-064348-272",
  openhmc: "openhmc-depth8-width8/run_20260915-184524-998",
} as const;
export function sourceRun(source: string): string {
  assert.ok(Object.hasOwn(SOURCE_RUNS, source), "SOURCE_NOT_ALLOWED");
  return SOURCE_RUNS[source as keyof typeof SOURCE_RUNS];
}
export function projectResult(value: unknown) {
  const r = value as Record<string, unknown>;
  assert.equal(r.status, "PENDING_HUMAN_REVIEW");
  assert.equal(r.maxAgentIterations, 3);
  const score = (x: unknown) => {
    const n = (x as Record<string, unknown>).score;
    assert.ok(typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 100);
    return n;
  };
  assert.ok(
    Number.isInteger(r.agentAttempts) &&
      Number(r.agentAttempts) >= 0 &&
      Number(r.agentAttempts) <= 3,
  );
  assert.ok(
    ["NO_UNCOVERED_TARGETS", "NO_MEANINGFUL_GAIN", "MAX_ITERATIONS"].includes(String(r.stopReason)),
  );
  return {
    baselineScore: score(r.baselineCoverage),
    finalScore: score(r.finalCoverage),
    agentAttempts: Number(r.agentAttempts),
    stopReason: String(r.stopReason),
  };
}
export async function collectSourceMetrics(repo: string, sources: readonly string[]) {
  assert.equal(sources.length, 4);
  assert.equal(new Set(sources).size, 4);
  sources.forEach(sourceRun);
  const root = await realpath(repo);
  const result = [];
  for (const source of sources) {
    const logical = `.rtl-agent/project-coverage-runs/${sourceRun(source)}/evidence/project-coverage-experiment-result.json`;
    const file = path.join(root, ...logical.split("/"));
    assert.equal(await realpath(file), file, "REDIRECTED_SOURCE_PATH");
    const bytes = await readFile(file);
    result.push({
      source,
      evidence: logical,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      ...projectResult(JSON.parse(bytes.toString("utf8"))),
    });
  }
  return {
    schemaVersion: 1,
    kind: "verification_source_metrics_audit",
    memorySnapshot: false,
    sourceOnly: true,
    containsMutationFeedback: false,
    containsOracle: false,
    sources: result,
  };
}
export async function writeSourceMetrics(repo: string) {
  const result = await collectSourceMetrics(repo, Object.keys(SOURCE_RUNS));
  const root = path.join(repo, ".rtl-agent", "verification-memory-inputs");
  await mkdir(root, { recursive: true });
  await writeFile(
    path.join(root, "four-source-metrics-v1.json"),
    JSON.stringify(result, null, 2) + "\n",
    { flag: "wx" },
  );
  return result;
}
