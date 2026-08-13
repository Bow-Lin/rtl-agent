import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import { FilesystemMemoryStore } from "../../../packages/core-loop/src/memory.js";
import { ExperienceRecordSchema } from "../../../packages/core-loop/src/experience.js";
import { runMemoryBuildCommand } from "../src/memory-build-command.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((entry) => rm(entry, { recursive: true, force: true })));
});

it("publishes Memory from an explicitly selected Experience Batch", async () => {
  const repositoryRoot = await mkdtemp(path.join(os.tmpdir(), "memory-build-command-"));
  roots.push(repositoryRoot);
  const memoryRoot = path.join(repositoryRoot, ".rtl-agent", "memory");
  const experienceDirectory = path.join(memoryRoot, "experiences", "b-20260812-001");
  await mkdir(experienceDirectory, { recursive: true });
  await writeFile(
    path.join(experienceDirectory, "000001.json"),
    `${JSON.stringify(
      ExperienceRecordSchema.parse({
        schema_version: 1,
        kind: "design_observation",
        source: { dataset: "synthetic", split: "build", case_id: "case-1" },
        outcome: "first_functional_pass",
        circuit_type: "counter",
        language: "SYSTEMVERILOG",
        tool: "iverilog",
        failure: null,
        diagnosis: null,
        repair: null,
        verification: "Compilation and functional simulation both completed without a mismatch.",
      }),
    )}\n`,
  );
  const output: string[] = [];
  const store = new FilesystemMemoryStore(memoryRoot);
  const exitCode = await runMemoryBuildCommand({
    arguments_: ["memory-build", "--experience-batches", "b-20260812-001"],
    repositoryRoot,
    writeOutput: (line) => output.push(line),
    dependencies: {
      memoryRoot,
      store,
      clock: () => new Date("2026-08-12T00:00:00.000Z"),
      consolidator: {
        consolidate: async () => ({
          schema_version: 1,
          operations: [
            {
              operation: "REJECT",
              experience_indexes: [0],
              reason: "No reusable general lesson was found.",
            },
          ],
        }),
      },
    },
  });

  expect(exitCode).toBe(0);
  expect(JSON.parse(output[0]!) as unknown).toMatchObject({
    ok: true,
    result: {
      buildId: "b-20260812-001",
      experienceBatches: ["b-20260812-001"],
      experienceCount: 1,
      consolidation: { status: "PUBLISHED", snapshot_id: "mem-v0002" },
    },
  });
  expect((await store.loadLatestSnapshot())?.manifest).toMatchObject({
    snapshot_id: "mem-v0002",
    source_batch: "memory-build/b-20260812-001",
  });
  const manifest = JSON.parse(
    await readFile(
      path.join(memoryRoot, "builds", "b-20260812-001", "experience-pool-manifest.json"),
      "utf8",
    ),
  ) as unknown;
  expect(manifest).toMatchObject({ source_file_count: 1, experience_count: 1 });
});
