import { readFile } from "node:fs/promises";
import path from "node:path";

import { Sha256DigestSchema } from "@rtl-agent/contracts";
import { z } from "zod";

import { CoreLoopException } from "./errors.js";
import { BatchIdSchema } from "./evaluation-contracts.js";
import type { BatchId } from "./evaluation-contracts.js";
import { ExperienceRecordSchema } from "./experience.js";
import type { ExperienceRecord } from "./experience.js";
import { scanRegularFiles, sha256Bytes, sha256Jcs } from "./filesystem.js";

const EXPERIENCE_FILE_PATTERN = /^[0-9]{6}\.json$/u;
const MAXIMUM_EXPERIENCE_BATCHES = 100;
const MAXIMUM_EXPERIENCES = 100_000;

export const ExperienceBatchSourceSchema = z.strictObject({
  batch_id: BatchIdSchema,
  path: z.string().regex(EXPERIENCE_FILE_PATTERN),
  content_digest: Sha256DigestSchema,
});

export const ExperienceBatchPoolEntrySchema = z.strictObject({
  index: z
    .int()
    .nonnegative()
    .max(MAXIMUM_EXPERIENCES - 1),
  experience_digest: Sha256DigestSchema,
  sources: z.array(ExperienceBatchSourceSchema).min(1).max(MAXIMUM_EXPERIENCES),
});

export const ExperienceBatchPoolManifestSchema = z.strictObject({
  schema_version: z.literal(1),
  experience_batches: z.array(BatchIdSchema).min(1).max(MAXIMUM_EXPERIENCE_BATCHES),
  source_file_count: z.int().positive().max(MAXIMUM_EXPERIENCES),
  experience_count: z.int().positive().max(MAXIMUM_EXPERIENCES),
  entries: z.array(ExperienceBatchPoolEntrySchema).min(1).max(MAXIMUM_EXPERIENCES),
});

export type ExperienceBatchPoolManifest = z.infer<typeof ExperienceBatchPoolManifestSchema>;

export interface LoadedExperienceBatchPool {
  readonly manifest: ExperienceBatchPoolManifest;
  readonly experiences: readonly ExperienceRecord[];
}

function memoryInputFailure(message: string): CoreLoopException {
  return new CoreLoopException("MEMORY_STORE_INVALID", message);
}

function parseBatchIds(batchIds: readonly string[]): readonly BatchId[] {
  if (batchIds.length === 0 || batchIds.length > MAXIMUM_EXPERIENCE_BATCHES) {
    throw memoryInputFailure("Select between one and 100 Experience Batches");
  }
  const parsed = batchIds.map((batchId) => {
    const result = BatchIdSchema.safeParse(batchId);
    if (!result.success) {
      throw memoryInputFailure("Experience Batch IDs must use the b-YYYYMMDD-NNN format");
    }
    return result.data;
  });
  if (new Set(parsed).size !== parsed.length) {
    throw memoryInputFailure("Experience Batch IDs must be unique");
  }
  return [...parsed].sort((left, right) => left.localeCompare(right, "en"));
}

export async function loadExperienceBatchPool(options: {
  readonly memoryRoot: string;
  readonly batchIds: readonly string[];
}): Promise<LoadedExperienceBatchPool> {
  const batchIds = parseBatchIds(options.batchIds);
  const records = new Map<
    string,
    {
      readonly experience: ExperienceRecord;
      readonly experienceDigest: z.infer<typeof Sha256DigestSchema>;
      readonly sources: z.infer<typeof ExperienceBatchSourceSchema>[];
    }
  >();
  let sourceFileCount = 0;
  try {
    for (const batchId of batchIds) {
      const directory = path.join(path.resolve(options.memoryRoot), "experiences", batchId);
      const files = await scanRegularFiles(directory);
      if (
        files.length === 0 ||
        files.some((file) => !EXPERIENCE_FILE_PATTERN.test(file.logicalPath))
      ) {
        throw memoryInputFailure(
          `Experience Batch ${batchId} must contain only six-digit JSON Experience files`,
        );
      }
      sourceFileCount += files.length;
      if (sourceFileCount > MAXIMUM_EXPERIENCES) {
        throw memoryInputFailure("Selected Experience Batches contain too many files");
      }
      for (const file of files) {
        const content = await readFile(file.hostPath);
        if (sha256Bytes(content) !== file.contentDigest) {
          throw memoryInputFailure(
            `Experience Batch ${batchId} changed while its input manifest was being built`,
          );
        }
        const experience = ExperienceRecordSchema.parse(
          JSON.parse(content.toString("utf8")) as unknown,
        );
        const experienceDigest = sha256Jcs(experience);
        const existing = records.get(experienceDigest);
        const source = ExperienceBatchSourceSchema.parse({
          batch_id: batchId,
          path: file.logicalPath,
          content_digest: file.contentDigest,
        });
        if (existing === undefined) {
          records.set(experienceDigest, { experience, experienceDigest, sources: [source] });
        } else {
          existing.sources.push(source);
        }
      }
    }
  } catch (error) {
    if (error instanceof CoreLoopException && error.error.code === "MEMORY_STORE_INVALID") {
      throw error;
    }
    throw memoryInputFailure("Selected Experience Batches are missing, malformed, or unsafe");
  }
  if (records.size === 0) {
    throw memoryInputFailure("Selected Experience Batches contain no Experience records");
  }
  const experiences = [...records.values()];
  const manifest = ExperienceBatchPoolManifestSchema.parse({
    schema_version: 1,
    experience_batches: batchIds,
    source_file_count: sourceFileCount,
    experience_count: experiences.length,
    entries: experiences.map((record, index) => ({
      index,
      experience_digest: record.experienceDigest,
      sources: record.sources,
    })),
  });
  return { manifest, experiences: experiences.map((record) => record.experience) };
}
