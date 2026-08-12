import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { ExperienceRecordSchema } from "../src/experience.js";
import {
  applyMemoryConsolidation,
  consolidateMemoryBatchBestEffort,
} from "../src/memory-consolidator.js";
import { FilesystemMemoryStore } from "../src/memory.js";

const CONTENT = [
  "## Trigger",
  "A sequential boundary produces an output one cycle earlier or later than specified.",
  "## Problem Pattern",
  "State transition and observation semantics use inconsistent current and next values.",
  "## Diagnosis Principle",
  "Map each externally visible value to the exact sampling edge before changing equations.",
  "## Repair Principle",
  "Use one explicit cycle convention across state updates and dependent combinational outputs.",
  "## Applicability",
  "Counters, bounded controllers, and state machines with transition-sensitive outputs.",
  "## Verification",
  "Compile and simulate reset, boundary transitions, saturation, and long-duration sequences.",
  "",
].join("\n");

const EXPERIENCE = ExperienceRecordSchema.parse({
  schema_version: 1,
  kind: "design_observation",
  source: { dataset: "synthetic", split: "build", case_id: "case-001" },
  outcome: "first_functional_pass",
  circuit_type: "counter",
  language: "SYSTEMVERILOG",
  tool: "iverilog",
  failure: null,
  diagnosis: null,
  repair: null,
  verification: "Compilation passed and functional simulation reported zero mismatches.",
});

describe("Memory consolidation", () => {
  it("rejects noncanonical stages before snapshot publication", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "rtl-memory-consolidation-"));
    const snapshot = await new FilesystemMemoryStore(root).ensureInitialSnapshot();
    expect(() =>
      applyMemoryConsolidation(snapshot, [EXPERIENCE], {
        schema_version: 1,
        operations: [
          {
            operation: "ADD",
            memory: {
              stage: "design",
              circuit_type: "counter",
              failure_type: null,
              language: "SYSTEMVERILOG",
              tool: "iverilog",
              content: CONTENT,
            },
            experience_indexes: [0],
          },
        ],
      }),
    ).toThrow();
  });

  it("applies an ADD with bound Experience provenance", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "rtl-memory-consolidation-"));
    const snapshot = await new FilesystemMemoryStore(root).ensureInitialSnapshot();
    const applied = applyMemoryConsolidation(snapshot, [EXPERIENCE], {
      schema_version: 1,
      operations: [
        {
          operation: "ADD",
          memory: {
            stage: "initial_generation",
            circuit_type: "counter",
            failure_type: null,
            language: "SYSTEMVERILOG",
            tool: "iverilog",
            content: CONTENT,
          },
          experience_indexes: [0],
        },
      ],
    });

    expect(applied.items[0]).toMatchObject({
      metadata: {
        memory_id: "memory-000001",
        evidence_count: 1,
        evidence: [{ dataset: "synthetic", split: "build", case_id: "case-001" }],
      },
    });
  });

  it("publishes only after a complete valid consolidation", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "rtl-memory-consolidation-"));
    const store = new FilesystemMemoryStore(root);
    const snapshot = await store.ensureInitialSnapshot();
    const result = await consolidateMemoryBatchBestEffort({
      store,
      parentSnapshot: snapshot,
      batchId: "b-20260810-010",
      experiences: [EXPERIENCE],
      evidenceDirectory: path.join(root, "consolidations", "b-20260810-010"),
      batchComplete: true,
      consolidator: {
        consolidate: async () => ({
          schema_version: 1,
          operations: [
            {
              operation: "ADD",
              memory: {
                stage: "initial_generation",
                circuit_type: "counter",
                failure_type: null,
                language: "SYSTEMVERILOG",
                tool: "iverilog",
                content: CONTENT,
              },
              experience_indexes: [0],
            },
          ],
        }),
      },
    });

    expect(result).toMatchObject({
      status: "PUBLISHED",
      parent_snapshot: "mem-v0001",
      snapshot_id: "mem-v0002",
      memory_count: 1,
    });
  });

  it("records failure and leaves the parent as latest when output is invalid", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "rtl-memory-consolidation-"));
    const store = new FilesystemMemoryStore(root);
    const snapshot = await store.ensureInitialSnapshot();
    const result = await consolidateMemoryBatchBestEffort({
      store,
      parentSnapshot: snapshot,
      batchId: "b-20260810-011",
      experiences: [EXPERIENCE],
      evidenceDirectory: path.join(root, "consolidations", "b-20260810-011"),
      batchComplete: true,
      consolidator: {
        consolidate: async () => ({
          schema_version: 1,
          operations: [
            {
              operation: "REINFORCE",
              memory_id: "memory-999999",
              experience_indexes: [0],
            },
          ],
        }),
      },
    });

    expect(result).toEqual({
      schema_version: 1,
      status: "FAILED",
      reason: "CONSOLIDATION_FAILED",
    });
    expect((await store.loadLatestSnapshot())?.manifest.snapshot_id).toBe("mem-v0001");
  });

  it("does not consolidate a partially executed Batch", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "rtl-memory-consolidation-"));
    const store = new FilesystemMemoryStore(root);
    const snapshot = await store.ensureInitialSnapshot();
    const result = await consolidateMemoryBatchBestEffort({
      store,
      parentSnapshot: snapshot,
      batchId: "b-20260810-012",
      experiences: [EXPERIENCE],
      evidenceDirectory: path.join(root, "consolidations", "b-20260810-012"),
      batchComplete: false,
      consolidator: {
        consolidate: async () => {
          throw new Error("must not be called");
        },
      },
    });

    expect(result.status).toBe("FAILED");
    expect((await store.listSnapshotIds()) as string[]).toEqual(["mem-v0001"]);
  });
});
