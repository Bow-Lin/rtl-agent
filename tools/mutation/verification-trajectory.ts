import { createHash } from "node:crypto";
import { readFile, realpath, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { SOURCE_RUNS, sourceRun, collectSourceMetrics } from "./verification-source-input.ts";

const hash = (s: string | Buffer) => createHash("sha256").update(s).digest("hex");
// Conservative lossful projection, not a semantic guarantee. Review before model submission.
const forbidden =
  /scoreboard|oracle|mutant|mutation|\bkill\b|M\d{3}|dpretet|axis_fifo|reference\s+model|expected\s*(?:value|data)|```|\$fatal|\$display|\bmodule\b|\bassert\s*\(|\.patch|\/|\\|[<>]=|\b(?:queue|fifo)\s*\[/i;
export function narrativeParagraphs(text: string) {
  assert.ok(text.length < 200000, "OVERSIZED_NARRATIVE");
  // Drop fenced code completely, not only delimiter lines.
  const withoutCode = text.replace(/```[\s\S]*?(?:```|$)/g, "");
  const paragraphs = withoutCode
    .split(/\n\s*\n/)
    .map((x) => x.trim())
    .filter(Boolean);
  const accepted = paragraphs.filter((x) => x.length <= 2400 && !forbidden.test(x));
  return {
    accepted: accepted.map((text) => ({
      sha256: hash(text),
      text,
      kind: "unverified_agent_claim",
    })),
    discardedParagraphs: paragraphs.length - accepted.length,
    hadCode: withoutCode !== text,
  };
}
export function responseNarratives(transcript: unknown) {
  const t = transcript as {
    exchanges?: { response?: { content?: { type?: string; text?: string }[] } }[];
  };
  assert.ok(Array.isArray(t.exchanges) && t.exchanges.length <= 64);
  return t.exchanges.flatMap((x, index) =>
    (x.response?.content ?? [])
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => ({ exchange: index, ...narrativeParagraphs(b.text!) })),
  );
}
export async function writeTrajectoryBundle(repo: string) {
  const root = await realpath(repo);
  const metrics = await collectSourceMetrics(root, Object.keys(SOURCE_RUNS));
  const sources = [];
  for (const metric of metrics.sources) {
    const run = `.rtl-agent/project-coverage-runs/${sourceRun(metric.source)}`;
    const attempts = [];
    for (let index = 0; index < metric.agentAttempts; index++) {
      const attempt = index + 2;
      const logical = `${run}/evidence/attempts/${attempt}/provider-transcript.json`;
      const file = path.join(root, ...logical.split("/"));
      assert.equal(await realpath(file), file, "REDIRECTED_TRANSCRIPT");
      const bytes = await readFile(file);
      assert.ok(bytes.length <= 8 * 1024 * 1024, "OVERSIZED_TRANSCRIPT");
      attempts.push({
        attempt,
        evidence: logical,
        sha256: hash(bytes),
        narratives: responseNarratives(JSON.parse(bytes.toString("utf8"))),
      });
    }
    sources.push({ ...metric, attempts });
  }
  const output = {
    schemaVersion: 1,
    kind: "verification_narrative_review_bundle",
    reviewRequired: true,
    memorySnapshot: false,
    sourceOnly: true,
    agentStatementsAreNotVerifiedFacts: true,
    sources,
  };
  const dest = path.join(root, ".rtl-agent", "verification-memory-inputs");
  await mkdir(dest, { recursive: true });
  await writeFile(
    path.join(dest, "four-source-narratives-v1.json"),
    JSON.stringify(output, null, 2) + "\n",
    { flag: "wx" },
  );
  return output;
}
