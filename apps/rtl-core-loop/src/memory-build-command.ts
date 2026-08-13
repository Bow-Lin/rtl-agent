import { mkdir } from "node:fs/promises";
import path from "node:path";

import {
  CoreLoopException,
  FilesystemMemoryStore,
  consolidateMemoryBatchBestEffort,
  createBatchId,
  loadExperienceBatchPool,
  writeJsonEvidenceExclusive,
} from "@rtl-agent/core-loop";
import type { MemoryConsolidator } from "@rtl-agent/core-loop";

import { parseNamedOptions } from "./cli-arguments.js";

export interface MemoryBuildCommandDependencies {
  readonly memoryRoot?: string;
  readonly store?: FilesystemMemoryStore;
  readonly consolidator: MemoryConsolidator;
  readonly clock?: () => Date;
}

function parseExperienceBatches(arguments_: readonly string[]): readonly string[] {
  const options = parseNamedOptions(arguments_.slice(1));
  if (options.size !== 1 || !options.has("--experience-batches")) {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      "memory-build requires --experience-batches <batch-id,...>",
    );
  }
  const batchIds = options
    .get("--experience-batches")!
    .split(",")
    .map((value) => value.trim());
  if (batchIds.some((value) => value.length === 0)) {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      "--experience-batches must be a comma-separated list of Batch IDs",
    );
  }
  return batchIds;
}

async function allocateMemoryBuildDirectory(root: string, now: Date) {
  await mkdir(root, { recursive: true });
  for (let sequence = 1; sequence <= 9_999; sequence += 1) {
    const buildId = createBatchId(now, sequence);
    const buildDirectory = path.join(root, buildId);
    try {
      await mkdir(buildDirectory);
      return { buildId, buildDirectory };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
  throw new CoreLoopException("BATCH_ALREADY_EXISTS", "Memory Build ID space is exhausted");
}

export async function runMemoryBuildCommand(options: {
  readonly arguments_: readonly string[];
  readonly repositoryRoot: string;
  readonly writeOutput: (line: string) => void;
  readonly dependencies: MemoryBuildCommandDependencies;
}): Promise<number> {
  const batchIds = parseExperienceBatches(options.arguments_);
  const memoryRoot = path.resolve(
    options.dependencies.memoryRoot ?? path.join(options.repositoryRoot, ".rtl-agent", "memory"),
  );
  const pool = await loadExperienceBatchPool({ memoryRoot, batchIds });
  const allocated = await allocateMemoryBuildDirectory(
    path.join(memoryRoot, "builds"),
    options.dependencies.clock?.() ?? new Date(),
  );
  await writeJsonEvidenceExclusive(
    allocated.buildDirectory,
    "experience-pool-manifest.json",
    pool.manifest,
  );
  const store = options.dependencies.store ?? new FilesystemMemoryStore(memoryRoot);
  const parentSnapshot = await store.ensureInitialSnapshot();
  const consolidation = await consolidateMemoryBatchBestEffort({
    store,
    parentSnapshot,
    batchId: `memory-build/${allocated.buildId}`,
    experiences: pool.experiences,
    consolidator: options.dependencies.consolidator,
    evidenceDirectory: path.join(allocated.buildDirectory, "consolidation"),
    batchComplete: true,
  });
  const published = consolidation.status === "PUBLISHED";
  options.writeOutput(
    JSON.stringify({
      ok: published,
      result: {
        buildId: allocated.buildId,
        status: consolidation.status,
        experienceBatches: pool.manifest.experience_batches,
        sourceFileCount: pool.manifest.source_file_count,
        experienceCount: pool.manifest.experience_count,
        buildDirectory: `.rtl-agent/memory/builds/${allocated.buildId}`,
        consolidation,
      },
    }),
  );
  return published ? 0 : 3;
}
