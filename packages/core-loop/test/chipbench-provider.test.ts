import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { c as createTar } from "tar";
import { afterEach, describe, expect, it } from "vitest";

import {
  CHIPBENCH_DATASET_LOCK,
  ChipBenchFixtureProvider,
  asHostDirectoryForProvider,
  createFileManifest,
  listFixtureCases,
  prepareChipBenchDataset,
  sha256Bytes,
} from "../src/index.js";
import type { ChipBenchDatasetLock } from "../src/index.js";

const roots: string[] = [];
const REPOSITORY_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "rtl-agent-chipbench-test-"));
  roots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function createSyntheticDataset(root: string): Promise<ChipBenchDatasetLock> {
  await mkdir(root, { recursive: true });
  await writeFile(path.join(root, "LICENSE"), "Synthetic MIT fixture\n");
  await mkdir(path.join(root, "Verilog Gen"));
  await writeFile(path.join(root, "Verilog Gen", "README.md"), "Synthetic generation data\n");
  const splits = CHIPBENCH_DATASET_LOCK.splits.map((split, index) => ({
    ...split,
    expectedCaseCount: 1,
    caseId: `Prob${String(index + 1).padStart(3, "0")}_case_${String(index + 1)}`,
  }));
  for (const split of splits) {
    const directory = path.join(root, ...split.datasetDirectory.split("/"));
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, "problems.txt"), `${split.caseId}\n`);
    await writeFile(
      path.join(directory, `${split.caseId}_prompt.txt`),
      `Implement ${split.caseId} as module TopModule.\n`,
    );
    await writeFile(
      path.join(directory, `${split.caseId}_ref.sv`),
      "module RefModule; endmodule\n",
    );
    await writeFile(path.join(directory, `${split.caseId}_test.sv`), "module tb; endmodule\n");
  }
  const manifest = await createFileManifest(root);
  return {
    ...CHIPBENCH_DATASET_LOCK,
    datasetVersion: "test",
    archiveRoot: "ChipBench-test",
    archiveDigest: sha256Bytes(Buffer.from("not-yet-created")),
    contentManifestDigest: manifest.manifestDigest,
    expectedFileCount: manifest.entries.length,
    expectedCaseCount: splits.length,
    splits: splits.map((split) => ({
      split: split.split,
      datasetDirectory: split.datasetDirectory,
      expectedCaseCount: split.expectedCaseCount,
      fixturePrefix: split.fixturePrefix,
      category: split.category,
    })),
  };
}

describe("ChipBench pinned dataset Provider", () => {
  it("lists all generation splits and materializes only the public prompt", async () => {
    const root = await temporaryRoot();
    const source = path.join(root, "source");
    const lock = await createSyntheticDataset(source);
    const provider = new ChipBenchFixtureProvider(source, lock);

    await expect(provider.describe()).resolves.toMatchObject({
      datasetId: "zhongkaiyu-chipbench",
      datasetVersion: "test",
      datasetSourceDigest: lock.contentManifestDigest,
      license: { spdxId: "MIT" },
      splits: CHIPBENCH_DATASET_LOCK.splits.map((entry) => entry.split),
    });
    const cases = await listFixtureCases(provider, {
      schemaVersion: 1,
      split: "self-contained",
    });
    expect(cases).toHaveLength(1);
    expect(cases[0]).toMatchObject({
      fixtureId: "cb-sc-p011",
      identity: { caseId: "Prob011_case_11" },
    });

    const staging = path.join(root, "staging");
    await mkdir(staging);
    const materialization = await provider.materialize(
      cases[0]!,
      asHostDirectoryForProvider(staging),
    );
    expect(materialization).toMatchObject({
      category: "BLANK_GENERATION",
      specPath: "prompt.txt",
      topModule: "TopModule",
    });
    await expect(createFileManifest(staging)).resolves.toMatchObject({
      entries: [{ path: "prompt.txt" }],
    });

    const debugging = await listFixtureCases(provider, {
      schemaVersion: 1,
      split: "debug-zero-shot-assignment",
    });
    const debuggingStaging = path.join(root, "debugging-staging");
    await mkdir(debuggingStaging);
    await expect(
      provider.materialize(debugging[0]!, asHostDirectoryForProvider(debuggingStaging)),
    ).resolves.toMatchObject({
      category: "PROMPTED_FUNCTIONAL_REPAIR",
      tags: expect.arrayContaining(["prompted-functional-repair"]),
    });
    await expect(createFileManifest(debuggingStaging)).resolves.toMatchObject({
      entries: [{ path: "prompt.txt" }],
    });
  });

  it("detects source drift and rejects unsupported debugging splits", async () => {
    const root = await temporaryRoot();
    const source = path.join(root, "source");
    const lock = await createSyntheticDataset(source);
    const provider = new ChipBenchFixtureProvider(source, lock);
    await expect(
      listFixtureCases(provider, { schemaVersion: 1, split: "debug-zero-shot" }),
    ).rejects.toMatchObject({ error: { code: "DATASET_PROVENANCE_INVALID" } });
    await writeFile(path.join(source, "LICENSE"), "tampered\n");
    await expect(provider.describe()).rejects.toMatchObject({
      error: { code: "DATASET_PROVENANCE_INVALID" },
    });
  });

  it("prepares an allowlisted cache atomically and reuses valid content", async () => {
    const root = await temporaryRoot();
    const contentRoot = path.join(root, "content");
    const baseLock = await createSyntheticDataset(contentRoot);
    const sourceParent = path.join(root, "archive-source");
    const archiveRoot = path.join(sourceParent, baseLock.archiveRoot);
    await mkdir(archiveRoot, { recursive: true });
    for (const entry of (await createFileManifest(contentRoot)).entries) {
      const sourcePath = path.join(contentRoot, ...entry.path.split("/"));
      const targetPath = path.join(archiveRoot, ...entry.path.split("/"));
      await mkdir(path.dirname(targetPath), { recursive: true });
      await writeFile(targetPath, await readFile(sourcePath));
    }
    await mkdir(path.join(archiveRoot, "Tool_Box"));
    await writeFile(path.join(archiveRoot, "Tool_Box", "must-not-extract.txt"), "excluded\n");
    const archivePath = path.join(root, "source.tar.gz");
    await createTar({ cwd: sourceParent, file: archivePath, gzip: true }, [baseLock.archiveRoot]);
    const archiveBytes = await readFile(archivePath);
    const lock = { ...baseLock, archiveDigest: sha256Bytes(archiveBytes) };
    const destination = path.join(root, "cache", lock.datasetVersion);

    await expect(
      prepareChipBenchDataset({
        destinationDirectory: destination,
        lock,
        downloadArchive: async () => archiveBytes,
      }),
    ).resolves.toMatchObject({ expectedCaseCount: 11, reused: false });
    await expect(
      readFile(path.join(destination, "Tool_Box", "must-not-extract.txt")),
    ).rejects.toThrow();
    await expect(
      prepareChipBenchDataset({
        destinationDirectory: destination,
        lock,
        downloadArchive: async () => {
          throw new Error("valid cache must not redownload");
        },
      }),
    ).resolves.toMatchObject({ reused: true });
  });

  it("keeps committed lock metadata and Provider source digest synchronized", async () => {
    const lockPath = path.join(REPOSITORY_ROOT, "core-loop", "fixtures", "chipbench.lock.json");
    await expect(readFile(lockPath, "utf8").then((value) => JSON.parse(value))).resolves.toEqual(
      CHIPBENCH_DATASET_LOCK,
    );
    const providerSource = await readFile(
      path.join(REPOSITORY_ROOT, "packages", "core-loop", "src", "chipbench-provider.ts"),
    );
    expect(sha256Bytes(providerSource)).toBe(CHIPBENCH_DATASET_LOCK.providerImplementationDigest);
  });
});
