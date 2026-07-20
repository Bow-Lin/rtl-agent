import { lstat, mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { x as extractTar } from "tar";

import type { DatasetDescriptor } from "./contracts.js";
import { CoreLoopException } from "./errors.js";
import { sha256Bytes } from "./filesystem.js";
import { CHIPBENCH_DATASET_LOCK, type ChipBenchDatasetLock } from "./chipbench-lock.js";
import { ChipBenchFixtureProvider } from "./chipbench-provider.js";

const MAXIMUM_ARCHIVE_BYTES = 16 * 1024 * 1024;

export interface PrepareChipBenchDatasetOptions {
  readonly destinationDirectory: string;
  readonly lock?: ChipBenchDatasetLock;
  readonly downloadArchive?: (url: string) => Promise<Uint8Array>;
}

export interface PreparedChipBenchDataset {
  readonly datasetVersion: string;
  readonly datasetSourceDigest: NonNullable<DatasetDescriptor["datasetSourceDigest"]>;
  readonly expectedCaseCount: number;
  readonly reused: boolean;
}

async function downloadArchive(url: string): Promise<Uint8Array> {
  const response = await fetch(url, {
    headers: { "user-agent": "rtl-agent-chipbench-provider/1" },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new CoreLoopException(
      "FIXTURE_MATERIALIZATION_FAILED",
      "ChipBench archive download failed",
    );
  }
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAXIMUM_ARCHIVE_BYTES) {
    throw new CoreLoopException(
      "FIXTURE_MATERIALIZATION_FAILED",
      "ChipBench archive exceeds the download limit",
    );
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > MAXIMUM_ARCHIVE_BYTES) {
    throw new CoreLoopException(
      "FIXTURE_MATERIALIZATION_FAILED",
      "ChipBench archive size is invalid",
    );
  }
  return bytes;
}

function archiveEntryAllowed(entryPath: string, lock: ChipBenchDatasetLock): boolean {
  const root = lock.archiveRoot;
  const datasets = [`${root}/Verilog Gen`, `${root}/Verilog Debugging`];
  return (
    entryPath === root ||
    entryPath === `${root}/` ||
    entryPath === `${root}/LICENSE` ||
    datasets.some(
      (dataset) =>
        entryPath === dataset || entryPath === `${dataset}/` || entryPath.startsWith(`${dataset}/`),
    )
  );
}

async function existingDatasetResult(
  destination: string,
  lock: ChipBenchDatasetLock,
): Promise<PreparedChipBenchDataset | undefined> {
  const stat = await lstat(destination).catch(() => undefined);
  if (stat === undefined) return undefined;
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new CoreLoopException(
      "DATASET_PROVENANCE_INVALID",
      "ChipBench cache target is not a regular directory",
    );
  }
  const descriptor = await new ChipBenchFixtureProvider(destination, lock).describe();
  return {
    datasetVersion: lock.datasetVersion,
    datasetSourceDigest: descriptor.datasetSourceDigest!,
    expectedCaseCount: lock.expectedCaseCount,
    reused: true,
  };
}

export async function prepareChipBenchDataset(
  options: PrepareChipBenchDatasetOptions,
): Promise<PreparedChipBenchDataset> {
  const lock = options.lock ?? CHIPBENCH_DATASET_LOCK;
  const destination = path.resolve(options.destinationDirectory);
  const existing = await existingDatasetResult(destination, lock);
  if (existing !== undefined) return existing;

  const parent = path.dirname(destination);
  await mkdir(parent, { recursive: true });
  const staging = await mkdtemp(path.join(parent, ".chipbench-staging-"));
  const archivePath = path.join(staging, "source.tar.gz");
  const extracted = path.join(staging, "content");
  try {
    const bytes = await (options.downloadArchive ?? downloadArchive)(lock.archiveUrl);
    if (bytes.byteLength === 0 || bytes.byteLength > MAXIMUM_ARCHIVE_BYTES) {
      throw new CoreLoopException(
        "FIXTURE_MATERIALIZATION_FAILED",
        "ChipBench archive size is invalid",
      );
    }
    if (sha256Bytes(bytes) !== lock.archiveDigest) {
      throw new CoreLoopException(
        "DATASET_PROVENANCE_INVALID",
        "ChipBench archive does not match the locked digest",
      );
    }
    await mkdir(extracted);
    await writeFile(archivePath, bytes, { flag: "wx" });
    await extractTar({
      cwd: extracted,
      file: archivePath,
      filter: (entryPath) => archiveEntryAllowed(entryPath, lock),
      preservePaths: false,
      strict: true,
      strip: 1,
    });
    const descriptor = await new ChipBenchFixtureProvider(extracted, lock).describe();
    await rm(archivePath, { force: true });
    try {
      await rename(extracted, destination);
    } catch (error) {
      const raced = await existingDatasetResult(destination, lock);
      if (raced === undefined) throw error;
      return raced;
    }
    return {
      datasetVersion: lock.datasetVersion,
      datasetSourceDigest: descriptor.datasetSourceDigest!,
      expectedCaseCount: lock.expectedCaseCount,
      reused: false,
    };
  } catch (error) {
    if (error instanceof CoreLoopException) throw error;
    throw new CoreLoopException(
      "FIXTURE_MATERIALIZATION_FAILED",
      "ChipBench dataset preparation failed",
    );
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}
