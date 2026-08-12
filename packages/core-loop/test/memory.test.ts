import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { EXPERIENCE_SUMMARIZER_PROMPT_DIGEST } from "../src/experience.js";
import { sha256Jcs } from "../src/filesystem.js";
import {
  FilesystemMemoryStore,
  filterMemoryCatalog,
  prepareMemoryExperiment,
  renderRelevantRtlMemory,
  selectMemoryBestEffort,
} from "../src/memory.js";
import type { MemoryItem } from "../src/memory.js";

function item(id: string, overrides: Partial<MemoryItem["metadata"]> = {}): MemoryItem {
  return {
    metadata: {
      memory_id: id,
      path: `items/${id}.md`,
      stage: "functional_simulation",
      circuit_type: "counter",
      failure_type: "output_mismatch",
      language: "SYSTEMVERILOG",
      tool: "iverilog",
      evidence_count: 2,
      evidence: [
        { dataset: "synthetic", split: "build", case_id: `${id}-a` },
        { dataset: "synthetic", split: "build", case_id: `${id}-b` },
      ],
      ...overrides,
    },
    content: [
      "## Trigger",
      "A sequential design diverges around a terminal count transition.",
      "## Problem Pattern",
      "The implementation mixes current-cycle and next-cycle interpretations.",
      "## Diagnosis Principle",
      "Compare the specified observation edge with each state update boundary.",
      "## Repair Principle",
      "Express the transition with one consistent cycle convention and explicit limits.",
      "## Applicability",
      "Counters and bounded state machines with edge-sensitive outputs.",
      "## Verification",
      "Recompile and simulate boundary, saturation, and long-duration sequences.",
      "",
    ].join("\n"),
  };
}

describe("FilesystemMemoryStore", () => {
  it("creates one empty initial snapshot and reuses it", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "rtl-memory-store-"));
    const store = new FilesystemMemoryStore(root);

    const first = await store.ensureInitialSnapshot();
    const second = await store.ensureInitialSnapshot();

    expect(first).toEqual(second);
    expect(first.manifest).toMatchObject({
      snapshot_id: "mem-v0001",
      parent_snapshot: null,
      source_batch: null,
      memory_count: 0,
    });
    expect(first.catalog.entries).toEqual([]);
  });

  it("publishes an immutable sequential snapshot and validates its digest", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "rtl-memory-store-"));
    const store = new FilesystemMemoryStore(root);
    const initial = await store.ensureInitialSnapshot();
    const published = await store.publishSnapshot({
      parentSnapshot: initial,
      sourceBatch: "b-20260810-001",
      items: [item("memory-000001")],
    });

    expect(published.manifest).toMatchObject({
      snapshot_id: "mem-v0002",
      parent_snapshot: "mem-v0001",
      source_batch: "b-20260810-001",
      memory_count: 1,
    });
    expect((await store.listSnapshotIds()) as string[]).toEqual(["mem-v0001", "mem-v0002"]);

    const itemPath = path.join(root, "snapshots", "mem-v0002", "items", "memory-000001.md");
    await writeFile(itemPath, `${await readFile(itemPath, "utf8")}tampered\n`);
    await expect(store.loadSnapshot("mem-v0002")).rejects.toMatchObject({
      error: { code: "MEMORY_STORE_INVALID" },
    });
  });

  it("rejects a publication whose parent is not the latest snapshot", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "rtl-memory-store-"));
    const store = new FilesystemMemoryStore(root);
    const initial = await store.ensureInitialSnapshot();
    await store.publishSnapshot({
      parentSnapshot: initial,
      sourceBatch: "b-20260810-001",
      items: [item("memory-000001")],
    });

    await expect(
      store.publishSnapshot({
        parentSnapshot: initial,
        sourceBatch: "b-20260810-002",
        items: [item("memory-000001")],
      }),
    ).rejects.toMatchObject({ error: { code: "MEMORY_STORE_INVALID" } });
  });

  it("rejects a snapshot item outside the canonical V1 stage vocabulary", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "rtl-memory-store-"));
    const store = new FilesystemMemoryStore(root);
    const initial = await store.ensureInitialSnapshot();
    const invalid = item("memory-000001") as unknown as MemoryItem;
    Object.assign(invalid.metadata, { stage: "design" });

    await expect(
      store.publishSnapshot({
        parentSnapshot: initial,
        sourceBatch: "b-20260810-002",
        items: [invalid],
      }),
    ).rejects.toMatchObject({ error: { code: "MEMORY_STORE_INVALID" } });
    expect((await store.listSnapshotIds()) as string[]).toEqual(["mem-v0001"]);
  });
});

describe("Memory selection primitives", () => {
  it("filters catalog metadata deterministically and renders at most three advisory items", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "rtl-memory-store-"));
    const store = new FilesystemMemoryStore(root);
    const initial = await store.ensureInitialSnapshot();
    const snapshot = await store.publishSnapshot({
      parentSnapshot: initial,
      sourceBatch: "b-20260810-003",
      items: [
        item("memory-000001"),
        item("memory-000002", { circuit_type: "fifo" }),
        item("memory-000003", { circuit_type: null }),
        item("memory-000004", {
          stage: "unknown",
          circuit_type: "unknown",
          failure_type: "unknown",
          language: "unknown",
          tool: "unknown",
        }),
      ],
    });

    const entries = filterMemoryCatalog(snapshot, {
      stage: "functional_simulation",
      circuit_type: "counter",
      failure_type: "output_mismatch",
      language: "SYSTEMVERILOG",
      tool: "iverilog",
    });
    expect(entries.map((entry) => entry.memory_id)).toEqual([
      "memory-000001",
      "memory-000003",
      "memory-000004",
    ]);
    const selected = snapshot.items.filter((candidate) =>
      entries.some((entry) => entry.memory_id === candidate.metadata.memory_id),
    );
    expect(renderRelevantRtlMemory(selected)).toContain(
      "The current spec.md and real compiler/simulation feedback always take precedence.",
    );
  });

  it("fails closed when an injection exceeds the V1 maximum", () => {
    expect(() =>
      renderRelevantRtlMemory([
        item("memory-000001"),
        item("memory-000002"),
        item("memory-000003"),
        item("memory-000004"),
      ]),
    ).toThrow(/more than three/u);
  });

  it("fails open to zero when a selector returns an ID outside the filtered snapshot catalog", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "rtl-memory-store-"));
    const store = new FilesystemMemoryStore(root);
    const initial = await store.ensureInitialSnapshot();
    const snapshot = await store.publishSnapshot({
      parentSnapshot: initial,
      sourceBatch: "b-20260810-004",
      items: [item("memory-000001")],
    });

    await expect(
      selectMemoryBestEffort({
        snapshot,
        query: {
          stage: "functional_simulation",
          circuit_type: null,
          failure_type: "output_mismatch",
          language: "SYSTEMVERILOG",
          tool: "iverilog",
        },
        specification: "Implement a bounded counter.",
        feedback: "The output diverged at the terminal transition.",
        stage: "functional_repair",
        evidenceDirectory: path.join(root, "selection-evidence"),
        selector: { select: async () => ["memory-999999"] },
      }),
    ).resolves.toEqual([]);
  });
});

describe("Memory experiment modes", () => {
  it("keeps off mode free of snapshot identity", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "rtl-memory-mode-"));
    const prepared = await prepareMemoryExperiment({
      mode: "off",
      store: new FilesystemMemoryStore(root),
      experiencePromptDigest: EXPERIENCE_SUMMARIZER_PROMPT_DIGEST,
      allowedBuildSplits: [],
      currentScope: { dataset: "verilog-eval", split: "build" },
    });

    expect(prepared).toEqual({ identity: { mode: "off" }, snapshot: null });
  });

  it("fixes the latest snapshot for an explicitly allowed read-write build split", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "rtl-memory-mode-"));
    const prepared = await prepareMemoryExperiment({
      mode: "read_write",
      store: new FilesystemMemoryStore(root),
      piIdentityDigest: sha256Jcs({ backend: "pi", provider: "synthetic", model: "test" }),
      experiencePromptDigest: EXPERIENCE_SUMMARIZER_PROMPT_DIGEST,
      allowedBuildSplits: [{ dataset: "verilog-eval", split: "build" }],
      currentScope: { dataset: "verilog-eval", split: "build" },
    });

    expect(prepared.identity).toMatchObject({ mode: "read_write", snapshot_id: "mem-v0001" });
    expect(prepared.snapshot?.manifest.memory_count).toBe(0);
  });

  it("requires an explicit existing snapshot in frozen mode", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "rtl-memory-mode-"));
    const store = new FilesystemMemoryStore(root);
    await store.ensureInitialSnapshot();
    const common = {
      store,
      piIdentityDigest: sha256Jcs({ backend: "pi" }),
      experiencePromptDigest: EXPERIENCE_SUMMARIZER_PROMPT_DIGEST,
      allowedBuildSplits: [] as const,
      currentScope: { dataset: "cvdp", split: "heldout" },
    };

    await expect(prepareMemoryExperiment({ ...common, mode: "frozen" })).rejects.toMatchObject({
      error: { code: "EVALUATION_PROFILE_INVALID" },
    });
    await expect(
      prepareMemoryExperiment({ ...common, mode: "frozen", requestedSnapshotId: "mem-v0001" }),
    ).resolves.toMatchObject({ identity: { mode: "frozen", snapshot_id: "mem-v0001" } });
  });
});
