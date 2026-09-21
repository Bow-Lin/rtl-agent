import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  buildMemory,
  digest,
  parseItems,
  projectTrajectory,
  safeRead,
  validateExtraction,
} from "./verification-memory.ts";
import type { Bundle, Item } from "./verification-memory.ts";
const item = (id: string, evidenceIds: string[]): Item => ({
  id,
  title: "scoreboard consistency",
  trigger: "clear/write",
  strategy: "Check queue pointers",
  applicability: "contract dependent",
  limitations: "no causal proof",
  confidence: "observed",
  evidenceIds,
});
const bundles: Bundle[] = ["versatile", "eth", "ufifo", "openhmc"].map((source) => ({
  source,
  evidence: [
    { id: `${source}:t`, path: "source/trace.json", sha256: "test", kind: "trajectory", data: [] },
    { id: `${source}:r`, path: "source/result.json", sha256: "test", kind: "result", data: {} },
  ],
}));
test("retain full strategy/code edits; exclude reasoning, request and foreign writes", () => {
  const output = projectTrajectory({
    provider: "kimi-coding",
    model: "k3",
    request: "SECRET",
    exchanges: [
      {
        response: {
          content: [
            { type: "text", text: "scoreboard expected data / boundary" },
            { type: "thinking", text: "PRIVATE" },
            { type: "toolCall", name: "write", arguments: { path: "rtl/tb.sv", content: "tb" } },
            { type: "toolCall", name: "read", arguments: { path: "mutation/patch" } },
          ],
        },
      },
    ],
  });
  assert.equal(output[0]!.content.length, 2);
  assert.ok(!JSON.stringify(output).includes("PRIVATE"));
  assert.throws(() =>
    projectTrajectory({ provider: "kimi-coding", model: "other", exchanges: [] }),
  );
});
test("reject dangling references, duplicates and missing observations", () => {
  const x = item("a", ["s:t"]);
  assert.throws(() => parseItems(JSON.stringify({ items: [x] }), new Set()));
  assert.throws(() => parseItems(JSON.stringify({ items: [x, x] }), new Set(["s:t"])));
  assert.throws(() => validateExtraction([item("a", ["versatile:t"])], bundles[0]!));
});
test("logical paths reject traversal, absolute and platform paths", async () => {
  for (const logical of ["../target", "C:/target", "/target", "a\\b", "a//b"]) {
    await assert.rejects(safeRead(path.resolve("."), logical));
  }
});
test("four independent calls then consolidation; manifest digest binds items", async () => {
  const out = await mkdtemp(path.join(os.tmpdir(), "verification-memory-test-"));
  const calls: string[] = [];
  try {
    const manifest = await buildMemory(bundles, out, async (name, prompt) => {
      calls.push(name);
      if (name === "consolidate")
        return JSON.stringify({
          items: [
            item(
              "merged",
              bundles.map((b) => `${b.source}-a`),
            ),
          ],
        });
      const source = name.replace("extract-", "");
      assert.ok(!prompt.includes("six-item"));
      return JSON.stringify({ items: [item("a", [`${source}:t`, `${source}:r`])] });
    });
    assert.equal(calls.length, 5);
    assert.equal(calls[4], "consolidate");
    assert.equal(
      manifest.itemsDigest,
      `sha256:${digest(await readFile(path.join(out, "items.json")))}`,
    );
    await assert.rejects(buildMemory(bundles, out, async () => "{}"));
  } finally {
    await rm(out, { recursive: true });
  }
});
test("invalid response cannot publish manifest", async () => {
  const out = await mkdtemp(path.join(os.tmpdir(), "verification-memory-test-"));
  try {
    await assert.rejects(
      buildMemory(bundles, out, async () => JSON.stringify({ items: [item("bad", ["target"])] })),
    );
    await assert.rejects(readFile(path.join(out, "manifest.json")));
  } finally {
    await rm(out, { recursive: true });
  }
});
