import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { c as createTar } from "tar";
import { afterEach, describe, expect, it } from "vitest";

import {
  VERILOG_EVAL_DATASET_LOCK,
  VerilogEvalFixtureProvider,
  asHostDirectoryForProvider,
  createFileManifest,
  listFixtureCases,
  prepareVerilogEvalDataset,
  sha256Bytes,
} from "../src/index.js";
import type { VerilogEvalDatasetLock } from "../src/index.js";

const roots: string[] = [];
const REPOSITORY_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "rtl-agent-verilog-eval-test-"));
  roots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function createSyntheticDataset(root: string): Promise<VerilogEvalDatasetLock> {
  const datasetDirectory = path.join(root, "dataset_spec-to-rtl");
  await mkdir(datasetDirectory, { recursive: true });
  await writeFile(path.join(root, "LICENSE"), "Synthetic MIT fixture\n");
  const cases = ["Prob001_zero", "Prob002_notgate"];
  await writeFile(path.join(datasetDirectory, "problems.txt"), `${cases.join("\n")}\n`);
  for (const caseId of cases) {
    await writeFile(
      path.join(datasetDirectory, `${caseId}_prompt.txt`),
      `Implement ${caseId} as module TopModule.\n`,
    );
    await writeFile(
      path.join(datasetDirectory, `${caseId}_ref.sv`),
      "module RefModule; endmodule\n",
    );
    await writeFile(path.join(datasetDirectory, `${caseId}_test.sv`), "module tb; endmodule\n");
  }
  const manifest = await createFileManifest(root);
  return {
    ...VERILOG_EVAL_DATASET_LOCK,
    datasetVersion: "v2-test",
    archiveRoot: "verilog-eval-test",
    archiveDigest: sha256Bytes(Buffer.from("not-yet-created")),
    contentManifestDigest: manifest.manifestDigest,
    expectedFileCount: manifest.entries.length,
    expectedCaseCount: cases.length,
  };
}

describe("VerilogEval pinned dataset Provider", () => {
  it("lists locked cases and materializes only the public prompt", async () => {
    const root = await temporaryRoot();
    const source = path.join(root, "source");
    const lock = await createSyntheticDataset(source);
    const provider = new VerilogEvalFixtureProvider(source, lock);

    await expect(provider.describe()).resolves.toMatchObject({
      datasetId: "nvlabs-verilog-eval",
      datasetVersion: "v2-test",
      datasetSourceDigest: lock.contentManifestDigest,
      license: { spdxId: "MIT" },
      splits: ["spec-to-rtl"],
    });
    const cases = await listFixtureCases(provider, {
      schemaVersion: 1,
      split: "spec-to-rtl",
    });
    expect(cases.map((entry) => entry.identity.caseId)).toEqual([
      "Prob001_zero",
      "Prob002_notgate",
    ]);
    expect(cases.map((entry) => entry.fixtureId)).toEqual(["ve2-p001-zero", "ve2-p002-notgate"]);

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
    await expect(readFile(path.join(staging, "prompt.txt"), "utf8")).resolves.toContain(
      "Prob001_zero",
    );
    await expect(createFileManifest(staging)).resolves.toMatchObject({
      entries: [{ path: "prompt.txt" }],
    });

    const verification = path.join(root, "verification");
    await mkdir(verification);
    await expect(
      provider.materializeVerification(cases[0]!, asHostDirectoryForProvider(verification)),
    ).resolves.toMatchObject({
      referenceLogicalPath: "reference.sv",
      testbenchLogicalPath: "testbench.sv",
      testbenchTopModule: "tb",
    });
    await expect(createFileManifest(verification)).resolves.toMatchObject({
      entries: [{ path: "reference.sv" }, { path: "testbench.sv" }],
    });
  });

  it("honors explicit selection and detects source drift", async () => {
    const root = await temporaryRoot();
    const source = path.join(root, "source");
    const lock = await createSyntheticDataset(source);
    const provider = new VerilogEvalFixtureProvider(source, lock);
    const selected = await listFixtureCases(provider, {
      schemaVersion: 1,
      split: "spec-to-rtl",
      caseIds: ["Prob002_notgate"],
    });
    expect(selected).toHaveLength(1);
    expect(selected[0]!.identity.caseId).toBe("Prob002_notgate");
    const allCases = await listFixtureCases(provider, {
      schemaVersion: 1,
      split: "spec-to-rtl",
    });

    await writeFile(
      path.join(source, "dataset_spec-to-rtl", "Prob001_zero_prompt.txt"),
      "changed\n",
    );
    await expect(provider.describe()).rejects.toMatchObject({
      error: { code: "DATASET_PROVENANCE_INVALID" },
    });
    const staging = path.join(root, "staging");
    await mkdir(staging);
    await expect(
      provider.materialize(allCases[0]!, asHostDirectoryForProvider(staging)),
    ).rejects.toMatchObject({ error: { code: "DATASET_PROVENANCE_INVALID" } });
  });

  it("prepares a verified cache atomically and reuses only valid content", async () => {
    const root = await temporaryRoot();
    const sourceParent = path.join(root, "archive-source");
    const archiveRoot = path.join(sourceParent, "verilog-eval-test");
    const contentRoot = path.join(root, "content-for-lock");
    const baseLock = await createSyntheticDataset(contentRoot);
    await mkdir(sourceParent, { recursive: true });
    await mkdir(archiveRoot);
    await writeFile(path.join(archiveRoot, "ignored-script.sh"), "must not be extracted\n");
    await mkdir(path.join(archiveRoot, "dataset_spec-to-rtl"));
    for (const entry of (await createFileManifest(contentRoot)).entries) {
      const sourcePath = path.join(contentRoot, ...entry.path.split("/"));
      const targetPath = path.join(archiveRoot, ...entry.path.split("/"));
      await mkdir(path.dirname(targetPath), { recursive: true });
      await writeFile(targetPath, await readFile(sourcePath));
    }
    const archivePath = path.join(root, "source.tar.gz");
    await createTar({ cwd: sourceParent, file: archivePath, gzip: true }, ["verilog-eval-test"]);
    const archiveBytes = await readFile(archivePath);
    const lock: VerilogEvalDatasetLock = {
      ...baseLock,
      archiveDigest: sha256Bytes(archiveBytes),
    };
    const destination = path.join(root, "cache", lock.datasetVersion);
    const first = await prepareVerilogEvalDataset({
      destinationDirectory: destination,
      lock,
      downloadArchive: async () => archiveBytes,
    });
    expect(first.reused).toBe(false);
    expect(first.expectedCaseCount).toBe(2);
    await expect(readFile(path.join(destination, "ignored-script.sh"))).rejects.toThrow();

    const second = await prepareVerilogEvalDataset({
      destinationDirectory: destination,
      lock,
      downloadArchive: async () => {
        throw new Error("valid cache must not redownload");
      },
    });
    expect(second.reused).toBe(true);

    await writeFile(path.join(destination, "LICENSE"), "tampered\n");
    await expect(
      prepareVerilogEvalDataset({
        destinationDirectory: destination,
        lock,
        downloadArchive: async () => archiveBytes,
      }),
    ).rejects.toMatchObject({ error: { code: "DATASET_PROVENANCE_INVALID" } });
  });

  it("keeps the committed lock metadata synchronized", async () => {
    const lockPath = path.join(
      REPOSITORY_ROOT,
      "core-loop",
      "fixtures",
      "verilog-eval-v2.lock.json",
    );
    await expect(readFile(lockPath, "utf8").then((value) => JSON.parse(value))).resolves.toEqual(
      VERILOG_EVAL_DATASET_LOCK,
    );
    const providerSource = await readFile(
      path.join(REPOSITORY_ROOT, "packages", "core-loop", "src", "verilog-eval-provider.ts"),
    );
    expect(sha256Bytes(providerSource)).toBe(
      VERILOG_EVAL_DATASET_LOCK.providerImplementationDigest,
    );
  });
});
