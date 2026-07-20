import { lstat, mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { x as extractTar } from "tar";

import type { DatasetDescriptor } from "./contracts.js";
import { CoreLoopException } from "./errors.js";
import { sha256Bytes } from "./filesystem.js";
import { VERILOG_EVAL_DATASET_LOCK, type VerilogEvalDatasetLock } from "./verilog-eval-lock.js";
import { VerilogEvalFixtureProvider } from "./verilog-eval-provider.js";

const MAXIMUM_ARCHIVE_BYTES = 16 * 1024 * 1024;

export interface PrepareVerilogEvalDatasetOptions {
  readonly destinationDirectory: string;
  readonly lock?: VerilogEvalDatasetLock;
  readonly downloadArchive?: (url: string) => Promise<Uint8Array>;
}

export interface PreparedVerilogEvalDataset {
  readonly datasetVersion: string;
  readonly datasetSourceDigest: NonNullable<DatasetDescriptor["datasetSourceDigest"]>;
  readonly expectedCaseCount: number;
  readonly reused: boolean;
}

async function downloadArchive(url: string): Promise<Uint8Array> {
  const response = await fetch(url, {
    headers: { "user-agent": "rtl-agent-verilog-eval-provider/1" },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new CoreLoopException(
      "FIXTURE_MATERIALIZATION_FAILED",
      "VerilogEval archive download failed",
    );
  }
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAXIMUM_ARCHIVE_BYTES) {
    throw new CoreLoopException(
      "FIXTURE_MATERIALIZATION_FAILED",
      "VerilogEval archive exceeds the download limit",
    );
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > MAXIMUM_ARCHIVE_BYTES) {
    throw new CoreLoopException(
      "FIXTURE_MATERIALIZATION_FAILED",
      "VerilogEval archive size is invalid",
    );
  }
  return bytes;
}

function archiveEntryAllowed(entryPath: string, lock: VerilogEvalDatasetLock): boolean {
  const root = lock.archiveRoot;
  const dataset = `${root}/${lock.datasetDirectory}`;
  return (
    entryPath === root ||
    entryPath === `${root}/` ||
    entryPath === `${root}/LICENSE` ||
    entryPath === dataset ||
    entryPath === `${dataset}/` ||
    entryPath.startsWith(`${dataset}/`)
  );
}

async function existingDatasetResult(
  destination: string,
  lock: VerilogEvalDatasetLock,
): Promise<PreparedVerilogEvalDataset | undefined> {
  const stat = await lstat(destination).catch(() => undefined);
  if (stat === undefined) return undefined;
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new CoreLoopException(
      "DATASET_PROVENANCE_INVALID",
      "VerilogEval cache target is not a regular directory",
    );
  }
  const descriptor = await new VerilogEvalFixtureProvider(destination, lock).describe();
  return {
    datasetVersion: lock.datasetVersion,
    datasetSourceDigest: descriptor.datasetSourceDigest!,
    expectedCaseCount: lock.expectedCaseCount,
    reused: true,
  };
}

export async function prepareVerilogEvalDataset(
  options: PrepareVerilogEvalDatasetOptions,
): Promise<PreparedVerilogEvalDataset> {
  const lock = options.lock ?? VERILOG_EVAL_DATASET_LOCK;
  const destination = path.resolve(options.destinationDirectory);
  const existing = await existingDatasetResult(destination, lock);
  if (existing !== undefined) return existing;

  const parent = path.dirname(destination);
  await mkdir(parent, { recursive: true });
  const staging = await mkdtemp(path.join(parent, ".verilog-eval-staging-"));
  const archivePath = path.join(staging, "source.tar.gz");
  const extracted = path.join(staging, "content");
  try {
    const bytes = await (options.downloadArchive ?? downloadArchive)(lock.archiveUrl);
    if (bytes.byteLength === 0 || bytes.byteLength > MAXIMUM_ARCHIVE_BYTES) {
      throw new CoreLoopException(
        "FIXTURE_MATERIALIZATION_FAILED",
        "VerilogEval archive size is invalid",
      );
    }
    if (sha256Bytes(bytes) !== lock.archiveDigest) {
      throw new CoreLoopException(
        "DATASET_PROVENANCE_INVALID",
        "VerilogEval archive does not match the locked digest",
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
    const descriptor = await new VerilogEvalFixtureProvider(extracted, lock).describe();
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
      "VerilogEval dataset preparation failed",
    );
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}
