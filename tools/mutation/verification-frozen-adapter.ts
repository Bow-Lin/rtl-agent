import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { AgentAttemptInputSchema } from "../../packages/core-loop/dist/index.js";
import type { RtlAgentAdapter, CoreLoopRun } from "../../packages/core-loop/dist/index.js";
import { safeRead } from "./verification-memory.ts";

export const BUILD = "k3-build-20260917-100104";
export const MANIFEST_DIGEST = "dba12fd587e93e681b41063cf7e198939214d68636b5cbe9d428e3bade8bc71d";
export const hash = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");
export async function frozenContext(repo: string) {
  const root = path.join(repo, ".rtl-agent", "verification-memory", BUILD);
  const manifestBytes = await safeRead(root, "manifest.json");
  assert.equal(hash(manifestBytes), MANIFEST_DIGEST, "FROZEN_MANIFEST_CHANGED");
  const manifest = JSON.parse(manifestBytes.toString());
  const bytes = await safeRead(root, "items.json");
  assert.equal(`sha256:${hash(bytes)}`, manifest.itemsDigest, "FROZEN_ITEMS_CHANGED");
  const { items } = JSON.parse(bytes.toString()) as { items: { id: string }[] };
  assert.equal(items.length, 13);
  assert.equal(new Set(items.map((x) => x.id)).size, 13);
  assert.equal(manifest.sourceOnly, true);
  assert.equal(manifest.targetUpdates, false);
  const content =
    "# Relevant RTL Memory\n\nVerification Memory (not RTL generation). Source-derived, pending semantic review.\n" +
    "Advisory evidence only. Current target contract and runner rules take priority. Never copy source-specific pointer, flag, reset or clear semantics without checking this DUT. Do not weaken assertions, change fixed parameters, decide stopping, or accept residual coverage on behalf of the reviewer.\n" +
    "Deterministic select-all-v1: entire small frozen catalog, no target feedback or model selection.\n\n" +
    bytes.toString();
  assert.ok(Buffer.byteLength(content) <= 100_000);
  return {
    content,
    selectedIds: items.map((x) => x.id),
    manifestDigest: MANIFEST_DIGEST,
    itemsDigest: manifest.itemsDigest as string,
    injectionDigest: hash(content),
  };
}

export function withFrozenMemory(delegate: RtlAgentAdapter, repo: string): RtlAgentAdapter {
  return {
    probe: () => delegate.probe(),
    async runTurn(raw: unknown, run: CoreLoopRun) {
      const input = AgentAttemptInputSchema.parse(raw);
      assert.ok(
        ["dpretet-depth8-width8", "axis-depth8-width8"].includes(
          String(run.fixture.provenance.identity.caseId),
        ),
        "TARGET_ONLY",
      );
      const memory = await frozenContext(repo);
      const dest = path.join(run.workspaceDirectory, "context", "relevant-rtl-memory.md");
      if (input.attempt === 2) await writeFile(dest, memory.content, { flag: "wx" });
      else assert.equal(await readFile(dest, "utf8"), memory.content, "INJECTED_MEMORY_CHANGED");
      await writeFile(
        path.join(run.runDirectory, "evidence", `verification-selector-${input.attempt}.json`),
        JSON.stringify(
          {
            schemaVersion: 1,
            mode: "frozen",
            selector: "select-all-v1",
            build: BUILD,
            attempt: input.attempt,
            selectedIds: memory.selectedIds,
            manifestDigest: memory.manifestDigest,
            itemsDigest: memory.itemsDigest,
            injectionDigest: memory.injectionDigest,
            reviewStatus: "PENDING_HUMAN_REVIEW",
            targetUpdates: false,
          },
          null,
          2,
        ) + "\n",
        { flag: "wx" },
      );
      return delegate.runTurn(
        { ...input, relevantMemoryPath: "context/relevant-rtl-memory.md" },
        run,
      );
    },
  };
}
