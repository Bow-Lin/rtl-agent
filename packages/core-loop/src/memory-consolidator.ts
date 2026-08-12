import { mkdir } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import { writeJsonEvidenceExclusive } from "./evidence.js";
import { ExperienceRecordSchema } from "./experience.js";
import type { ExperienceRecord } from "./experience.js";
import {
  MemoryCatalogEntrySchema,
  MemoryItemIdSchema,
  MemorySnapshotIdSchema,
  MemoryStageSchema,
  validateMemoryItemContent,
} from "./memory.js";
import type {
  FilesystemMemoryStore,
  MemoryEvidence,
  MemoryItem,
  MemorySnapshot,
} from "./memory.js";

const ExperienceIndexesSchema = z
  .array(z.int().nonnegative().max(100_000))
  .min(1)
  .max(100_000)
  .refine(
    (values) => values.every((value, index) => index === 0 || values[index - 1]! < value),
    "Experience indexes must be sorted and unique",
  );

const MemoryDraftSchema = z.strictObject({
  stage: MemoryStageSchema,
  circuit_type: z.string().min(1).max(128).nullable(),
  failure_type: z.string().min(1).max(128).nullable(),
  language: z.string().min(1).max(128).nullable(),
  tool: z.string().min(1).max(128).nullable(),
  content: z.string().min(120).max(32_768),
});

export const MemoryConsolidationOperationSchema = z.discriminatedUnion("operation", [
  z.strictObject({
    operation: z.literal("ADD"),
    memory: MemoryDraftSchema,
    experience_indexes: ExperienceIndexesSchema,
  }),
  z.strictObject({
    operation: z.literal("MERGE"),
    memory_id: MemoryItemIdSchema,
    memory: MemoryDraftSchema,
    experience_indexes: ExperienceIndexesSchema,
  }),
  z.strictObject({
    operation: z.literal("REINFORCE"),
    memory_id: MemoryItemIdSchema,
    experience_indexes: ExperienceIndexesSchema,
  }),
  z.strictObject({
    operation: z.literal("REJECT"),
    experience_indexes: ExperienceIndexesSchema,
    reason: z.string().min(10).max(500),
  }),
  z.strictObject({
    operation: z.literal("CONFLICT"),
    memory_id: MemoryItemIdSchema,
    experience_indexes: ExperienceIndexesSchema,
    detail: z.string().min(10).max(500),
  }),
]);
export type MemoryConsolidationOperation = z.infer<typeof MemoryConsolidationOperationSchema>;

export const MemoryConsolidatorOutputSchema = z
  .strictObject({
    schema_version: z.literal(1),
    operations: z.array(MemoryConsolidationOperationSchema).max(100_000),
  })
  .refine(
    (value) => value.operations.filter((operation) => operation.operation === "ADD").length <= 5,
    { message: "A Batch can add at most five Memory items", path: ["operations"] },
  );
export type MemoryConsolidatorOutput = z.infer<typeof MemoryConsolidatorOutputSchema>;

export interface MemoryConsolidatorRequest {
  readonly snapshot: MemorySnapshot;
  readonly experiences: readonly ExperienceRecord[];
  readonly evidenceDirectory: string;
}

export interface MemoryConsolidator {
  consolidate(request: MemoryConsolidatorRequest): Promise<MemoryConsolidatorOutput>;
}

export const MemoryBatchConsolidationResultSchema = z.discriminatedUnion("status", [
  z.strictObject({
    schema_version: z.literal(1),
    status: z.literal("SKIPPED"),
    reason: z.literal("NO_ELIGIBLE_EXPERIENCE"),
  }),
  z.strictObject({
    schema_version: z.literal(1),
    status: z.literal("FAILED"),
    reason: z.literal("CONSOLIDATION_FAILED"),
  }),
  z.strictObject({
    schema_version: z.literal(1),
    status: z.literal("PUBLISHED"),
    parent_snapshot: MemorySnapshotIdSchema,
    snapshot_id: MemorySnapshotIdSchema,
    memory_count: z.int().nonnegative(),
    operations: z.array(MemoryConsolidationOperationSchema),
  }),
]);
export type MemoryBatchConsolidationResult = z.infer<typeof MemoryBatchConsolidationResultSchema>;

function evidenceFromExperience(experience: ExperienceRecord): MemoryEvidence {
  return {
    dataset: experience.source.dataset,
    split: experience.source.split,
    case_id: experience.source.case_id,
  };
}

function evidenceKey(evidence: MemoryEvidence): string {
  return `${evidence.dataset}\u0000${evidence.split}\u0000${evidence.case_id}`;
}

function mergedEvidence(
  existing: readonly MemoryEvidence[],
  experiences: readonly ExperienceRecord[],
  indexes: readonly number[],
): readonly MemoryEvidence[] {
  const evidence = new Map(existing.map((item) => [evidenceKey(item), item] as const));
  for (const index of indexes) {
    const experience = experiences[index];
    if (experience === undefined) throw new Error("Consolidator referenced an absent Experience");
    const item = evidenceFromExperience(experience);
    evidence.set(evidenceKey(item), item);
  }
  return [...evidence.values()].sort((left, right) =>
    evidenceKey(left).localeCompare(evidenceKey(right), "en"),
  );
}

function nextMemoryNumber(items: readonly MemoryItem[]): number {
  return (
    items.reduce(
      (maximum, item) => Math.max(maximum, Number(item.metadata.memory_id.slice("memory-".length))),
      0,
    ) + 1
  );
}

export function applyMemoryConsolidation(
  snapshot: MemorySnapshot,
  experiences: readonly ExperienceRecord[],
  rawOutput: unknown,
): { readonly items: readonly MemoryItem[]; readonly output: MemoryConsolidatorOutput } {
  const parsedExperiences = experiences.map((experience) =>
    ExperienceRecordSchema.parse(experience),
  );
  const output = MemoryConsolidatorOutputSchema.parse(rawOutput);
  const referencedIndexes = output.operations
    .flatMap((operation) => operation.experience_indexes)
    .sort((left, right) => left - right);
  if (
    referencedIndexes.length !== parsedExperiences.length ||
    referencedIndexes.some((index, position) => index !== position)
  ) {
    throw new Error("Every eligible Experience must be handled exactly once");
  }
  const items = new Map(
    snapshot.items.map((item) => [
      item.metadata.memory_id,
      { ...item, metadata: { ...item.metadata } },
    ]),
  );
  const targeted = new Set<string>();
  let nextNumber = nextMemoryNumber(snapshot.items);
  for (const operation of output.operations) {
    if (operation.experience_indexes.some((index) => index >= parsedExperiences.length)) {
      throw new Error("Consolidator referenced an absent Experience");
    }
    if (operation.operation === "REJECT") continue;
    if (operation.operation === "CONFLICT") {
      if (targeted.has(operation.memory_id)) {
        throw new Error("One existing Memory item cannot be targeted twice in one consolidation");
      }
      targeted.add(operation.memory_id);
      if (!items.has(operation.memory_id)) throw new Error("Conflict target is absent");
      continue;
    }
    if (operation.operation === "ADD") {
      const memoryId = MemoryItemIdSchema.parse(`memory-${String(nextNumber).padStart(6, "0")}`);
      nextNumber += 1;
      const evidence = mergedEvidence([], parsedExperiences, operation.experience_indexes);
      items.set(memoryId, {
        metadata: MemoryCatalogEntrySchema.parse({
          memory_id: memoryId,
          path: `items/${memoryId}.md`,
          stage: operation.memory.stage,
          circuit_type: operation.memory.circuit_type,
          failure_type: operation.memory.failure_type,
          language: operation.memory.language,
          tool: operation.memory.tool,
          evidence_count: evidence.length,
          evidence,
        }),
        content: validateMemoryItemContent(operation.memory.content),
      });
      continue;
    }
    if (targeted.has(operation.memory_id)) {
      throw new Error("One existing Memory item cannot be mutated twice in one consolidation");
    }
    targeted.add(operation.memory_id);
    const existing = items.get(operation.memory_id);
    if (existing === undefined) throw new Error("Consolidation target is absent");
    const evidence = mergedEvidence(
      existing.metadata.evidence,
      parsedExperiences,
      operation.experience_indexes,
    );
    items.set(operation.memory_id, {
      metadata: MemoryCatalogEntrySchema.parse({
        ...existing.metadata,
        ...(operation.operation === "MERGE"
          ? {
              stage: operation.memory.stage,
              circuit_type: operation.memory.circuit_type,
              failure_type: operation.memory.failure_type,
              language: operation.memory.language,
              tool: operation.memory.tool,
            }
          : {}),
        evidence_count: evidence.length,
        evidence,
      }),
      content:
        operation.operation === "MERGE"
          ? validateMemoryItemContent(operation.memory.content)
          : existing.content,
    });
  }
  return {
    output,
    items: [...items.values()].sort((left, right) =>
      left.metadata.memory_id.localeCompare(right.metadata.memory_id, "en"),
    ),
  };
}

export async function consolidateMemoryBatchBestEffort(options: {
  readonly store: FilesystemMemoryStore;
  readonly parentSnapshot: MemorySnapshot;
  readonly batchId: string;
  readonly experiences: readonly ExperienceRecord[];
  readonly consolidator: MemoryConsolidator;
  readonly evidenceDirectory: string;
  readonly batchComplete: boolean;
}): Promise<MemoryBatchConsolidationResult> {
  await mkdir(options.evidenceDirectory, { recursive: true });
  let result: MemoryBatchConsolidationResult;
  if (!options.batchComplete) {
    result = { schema_version: 1, status: "FAILED", reason: "CONSOLIDATION_FAILED" };
  } else if (options.experiences.length === 0) {
    result = { schema_version: 1, status: "SKIPPED", reason: "NO_ELIGIBLE_EXPERIENCE" };
  } else {
    try {
      const rawOutput = await options.consolidator.consolidate({
        snapshot: options.parentSnapshot,
        experiences: options.experiences,
        evidenceDirectory: path.join(options.evidenceDirectory, "pi"),
      });
      const applied = applyMemoryConsolidation(
        options.parentSnapshot,
        options.experiences,
        rawOutput,
      );
      const snapshot = await options.store.publishSnapshot({
        parentSnapshot: options.parentSnapshot,
        sourceBatch: options.batchId,
        items: applied.items,
      });
      result = {
        schema_version: 1,
        status: "PUBLISHED",
        parent_snapshot: options.parentSnapshot.manifest.snapshot_id,
        snapshot_id: snapshot.manifest.snapshot_id,
        memory_count: snapshot.manifest.memory_count,
        operations: applied.output.operations,
      };
    } catch {
      result = { schema_version: 1, status: "FAILED", reason: "CONSOLIDATION_FAILED" };
    }
  }
  const parsed = MemoryBatchConsolidationResultSchema.parse(result);
  await writeJsonEvidenceExclusive(options.evidenceDirectory, "result.json", parsed);
  return parsed;
}
