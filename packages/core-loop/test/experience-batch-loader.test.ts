import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { loadExperienceBatchPool } from "../src/experience-batch-loader.js";
import { ExperienceRecordSchema } from "../src/experience.js";
import { sha256Bytes } from "../src/filesystem.js";

const roots: string[] = [];

function experience(caseId: string) {
  return ExperienceRecordSchema.parse({
    schema_version: 1,
    kind: "design_observation",
    source: { dataset: "synthetic", split: "build", case_id: caseId },
    outcome: "first_functional_pass",
    circuit_type: "counter",
    language: "SYSTEMVERILOG",
    tool: "iverilog",
    failure: null,
    diagnosis: null,
    repair: null,
    verification: "Compilation and functional simulation both completed without a mismatch.",
  });
}

async function root(): Promise<string> {
  const created = await mkdtemp(path.join(os.tmpdir(), "experience-batch-pool-"));
  roots.push(created);
  return created;
}

async function writeExperience(
  memoryRoot: string,
  batchId: string,
  name: string,
  value: unknown,
): Promise<void> {
  const directory = path.join(memoryRoot, "experiences", batchId);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, name), `${JSON.stringify(value)}\n`);
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((entry) => rm(entry, { recursive: true, force: true })));
});

describe("Experience Batch pool loader", () => {
  it("loads deterministic input and de-duplicates identical Experience records", async () => {
    const memoryRoot = await root();
    await writeExperience(memoryRoot, "b-20260812-002", "000001.json", experience("case-2"));
    await writeExperience(memoryRoot, "b-20260812-001", "000001.json", experience("case-1"));
    await writeExperience(memoryRoot, "b-20260812-002", "000002.json", experience("case-1"));

    const pool = await loadExperienceBatchPool({
      memoryRoot,
      batchIds: ["b-20260812-002", "b-20260812-001"],
    });

    expect(pool.manifest).toMatchObject({
      experience_batches: ["b-20260812-001", "b-20260812-002"],
      source_file_count: 3,
      experience_count: 2,
    });
    expect(pool.experiences.map((entry) => entry.source.case_id)).toEqual(["case-1", "case-2"]);
    expect(pool.manifest.entries[0]?.sources).toHaveLength(2);
    for (const entry of pool.manifest.entries) {
      for (const source of entry.sources) {
        expect(source.content_digest).toBe(
          sha256Bytes(
            await readFile(path.join(memoryRoot, "experiences", source.batch_id, source.path)),
          ),
        );
      }
    }
  });

  it("rejects unexpected files and malformed Experience records", async () => {
    const memoryRoot = await root();
    await writeExperience(memoryRoot, "b-20260812-001", "notes.json", experience("case-1"));

    await expect(
      loadExperienceBatchPool({ memoryRoot, batchIds: ["b-20260812-001"] }),
    ).rejects.toMatchObject({ error: { code: "MEMORY_STORE_INVALID" } });
  });
});
