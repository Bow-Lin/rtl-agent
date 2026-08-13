import { lstat, mkdtemp, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { Sha256DigestSchema } from "@rtl-agent/contracts";
import { z } from "zod";

import { CoreLoopException } from "./errors.js";
import { sha256Jcs } from "./filesystem.js";

export const MemoryModeSchema = z.enum(["off", "read_write", "frozen"]);
export type MemoryMode = z.infer<typeof MemoryModeSchema>;

export const MAXIMUM_SELECTED_MEMORIES = 3 as const;
export const MEMORY_METADATA_CHARACTER_LIMIT = 1_024 as const;

export const MEMORY_SELECTOR_SYSTEM_PROMPT = [
  "Select only genuinely relevant RTL Memory IDs from the already filtered catalog.",
  "Read only the exact input paths named in the user instruction; do not read directories or guess paths.",
  "Write selection.json with exactly {schema_version:1,memory_ids:string[]}.",
  `Return zero to ${String(MAXIMUM_SELECTED_MEMORIES)} unique IDs; do not invent IDs or fill quota.`,
  "The current specification and real feedback take precedence over Memory.",
].join("\n");

export const MEMORY_SELECTOR_PROMPT_DIGEST = sha256Jcs({
  schema_version: 1,
  system_prompt: MEMORY_SELECTOR_SYSTEM_PROMPT,
});

export const MEMORY_CONSOLIDATOR_SYSTEM_PROMPT = [
  "Consolidate factual successful RTL Experiences into general long-term Memory.",
  "First read exactly context/snapshot.json, context/experiences.json, and context/output-schema.json; do not read directories or guess paths.",
  "Write result.json with exactly the schema_version and operations top-level fields, using only ADD, MERGE, REINFORCE, REJECT, or CONFLICT operations.",
  "Handle every Experience index exactly once across all operations.",
  "ADD at most five items. Prefer REJECT to weak, duplicate, uncertain, or case-specific guidance.",
  "For stage, use initial_generation for design_observation or first_functional_pass guidance, functional_simulation for simulation_debug or repaired_functional_pass guidance, and null or unknown only for genuinely mixed or uncertain applicability.",
  `Keep each non-null circuit_type, failure_type, language, and tool metadata value at or below ${String(MEMORY_METADATA_CHARACTER_LIMIT)} characters; put explanatory detail in the six-section content instead.`,
  // Retain this defensive instruction in the V1 prompt identity; the catalog schema now rejects noncanonical stages.
  "If a relevant existing item has any other stage label, normalize it with MERGE; never REINFORCE a noncanonical stage.",
  "Every ADD or MERGE content must contain, in order, the six Markdown headings ## Trigger, ## Problem Pattern, ## Diagnosis Principle, ## Repair Principle, ## Applicability, and ## Verification.",
  "Never include a complete problem, hidden reference, testbench, testcase, golden RTL, case solution, or unnecessary signal/state names.",
  "Do not overwrite conflicts. Current Memory remains authoritative until an atomic next snapshot is published.",
].join("\n");

export const MEMORY_CONSOLIDATOR_PROMPT_DIGEST = sha256Jcs({
  schema_version: 1,
  system_prompt: MEMORY_CONSOLIDATOR_SYSTEM_PROMPT,
});

export const MemorySnapshotIdSchema = z.string().regex(/^mem-v\d{4,}$/u);
export type MemorySnapshotId = z.infer<typeof MemorySnapshotIdSchema>;

export const MemoryBuildScopeSchema = z.strictObject({
  dataset: z.string().min(1).max(128),
  split: z.string().min(1).max(64),
});
export type MemoryBuildScope = z.infer<typeof MemoryBuildScopeSchema>;

function buildScopesAreSortedUnique(scopes: readonly MemoryBuildScope[]): boolean {
  return scopes.every((scope, index) => {
    if (index === 0) return true;
    const previous = scopes[index - 1]!;
    return `${previous.dataset}\u0000${previous.split}` < `${scope.dataset}\u0000${scope.split}`;
  });
}

const ActiveMemoryIdentityFields = {
  snapshot_id: MemorySnapshotIdSchema,
  snapshot_sha256: Sha256DigestSchema,
  selector_prompt_digest: Sha256DigestSchema,
  experience_prompt_digest: Sha256DigestSchema,
  consolidator_prompt_digest: Sha256DigestSchema,
  pi_identity_digest: Sha256DigestSchema,
  maximum_selected: z.literal(MAXIMUM_SELECTED_MEMORIES),
  allowed_memory_build_splits: z.array(MemoryBuildScopeSchema).max(128),
} as const;

export const MemoryExperimentIdentitySchema = z.discriminatedUnion("mode", [
  z.strictObject({ mode: z.literal("off") }),
  z
    .strictObject({ mode: z.literal("read_write"), ...ActiveMemoryIdentityFields })
    .refine((value) => buildScopesAreSortedUnique(value.allowed_memory_build_splits), {
      path: ["allowed_memory_build_splits"],
      message: "Memory build split identity must be sorted and unique",
    }),
  z
    .strictObject({ mode: z.literal("frozen"), ...ActiveMemoryIdentityFields })
    .refine((value) => buildScopesAreSortedUnique(value.allowed_memory_build_splits), {
      path: ["allowed_memory_build_splits"],
      message: "Memory build split identity must be sorted and unique",
    }),
]);
export type MemoryExperimentIdentity = z.infer<typeof MemoryExperimentIdentitySchema>;

export const MemoryItemIdSchema = z.string().regex(/^memory-\d{6,}$/u);
export type MemoryItemId = z.infer<typeof MemoryItemIdSchema>;

export const MemoryMetadataValueSchema = z.string().min(1).max(MEMORY_METADATA_CHARACTER_LIMIT);

const OptionalFilterSchema = MemoryMetadataValueSchema.nullable();

export const MemoryStageSchema = z
  .enum(["initial_generation", "functional_simulation", "unknown"])
  .nullable();
export type MemoryStage = z.infer<typeof MemoryStageSchema>;

export const MemoryEvidenceSchema = z.strictObject({
  dataset: z.string().min(1).max(128),
  split: z.string().min(1).max(64),
  case_id: z.string().min(1).max(256),
});
export type MemoryEvidence = z.infer<typeof MemoryEvidenceSchema>;

export const MemoryCatalogEntrySchema = z
  .strictObject({
    memory_id: MemoryItemIdSchema,
    path: z.string().regex(/^items\/memory-\d{6,}\.md$/u),
    stage: MemoryStageSchema,
    circuit_type: OptionalFilterSchema,
    failure_type: OptionalFilterSchema,
    language: OptionalFilterSchema,
    tool: OptionalFilterSchema,
    evidence_count: z.int().positive().max(1_000_000),
    evidence: z.array(MemoryEvidenceSchema).min(1).max(1_000_000),
  })
  .refine((entry) => entry.evidence_count === entry.evidence.length, {
    message: "Memory evidence count must match its provenance entries",
    path: ["evidence_count"],
  })
  .refine(
    (entry) =>
      entry.evidence.every((evidence, index) => {
        if (index === 0) return true;
        const previous = entry.evidence[index - 1]!;
        return (
          `${previous.dataset}\u0000${previous.split}\u0000${previous.case_id}` <
          `${evidence.dataset}\u0000${evidence.split}\u0000${evidence.case_id}`
        );
      }),
    {
      message: "Memory evidence provenance must be sorted and unique",
      path: ["evidence"],
    },
  );
export type MemoryCatalogEntry = z.infer<typeof MemoryCatalogEntrySchema>;

function sortedUniqueEntries(entries: readonly MemoryCatalogEntry[]): boolean {
  return entries.every(
    (entry, index) =>
      entry.path === `items/${entry.memory_id}.md` &&
      (index === 0 || entries[index - 1]!.memory_id < entry.memory_id),
  );
}

export const MemoryCatalogSchema = z
  .strictObject({
    schema_version: z.literal(1),
    snapshot_id: MemorySnapshotIdSchema,
    entries: z.array(MemoryCatalogEntrySchema).max(100_000),
  })
  .refine((value) => sortedUniqueEntries(value.entries), {
    message: "Memory catalog entries must be sorted, unique, and use their canonical item path",
    path: ["entries"],
  });
export type MemoryCatalog = z.infer<typeof MemoryCatalogSchema>;

export const MemorySnapshotManifestSchema = z.strictObject({
  schema_version: z.literal(1),
  snapshot_id: MemorySnapshotIdSchema,
  parent_snapshot: MemorySnapshotIdSchema.nullable(),
  source_batch: z.string().min(1).max(256).nullable(),
  memory_count: z.int().nonnegative().max(100_000),
  sha256: Sha256DigestSchema,
});
export type MemorySnapshotManifest = z.infer<typeof MemorySnapshotManifestSchema>;

export interface MemoryItem {
  readonly metadata: MemoryCatalogEntry;
  readonly content: string;
}

export interface MemorySnapshot {
  readonly manifest: MemorySnapshotManifest;
  readonly catalog: MemoryCatalog;
  readonly items: readonly MemoryItem[];
}

export interface MemorySnapshotDraft {
  readonly parentSnapshot: MemorySnapshot | null;
  readonly sourceBatch: string | null;
  readonly items: readonly MemoryItem[];
}

export interface PrepareMemoryExperimentOptions {
  readonly mode: MemoryMode;
  readonly requestedSnapshotId?: string;
  readonly store: FilesystemMemoryStore;
  readonly piIdentityDigest?: string;
  readonly experiencePromptDigest: string;
  readonly allowedBuildSplits: readonly MemoryBuildScope[];
  readonly currentScope: MemoryBuildScope;
}

export interface PreparedMemoryExperiment {
  readonly identity: MemoryExperimentIdentity;
  readonly snapshot: MemorySnapshot | null;
}

function normalizedBuildScopes(scopes: readonly MemoryBuildScope[]): readonly MemoryBuildScope[] {
  const parsed = scopes.map((scope) => MemoryBuildScopeSchema.parse(scope));
  parsed.sort((left, right) =>
    `${left.dataset}\u0000${left.split}`.localeCompare(
      `${right.dataset}\u0000${right.split}`,
      "en",
    ),
  );
  if (
    parsed.some(
      (scope, index) =>
        index > 0 &&
        scope.dataset === parsed[index - 1]!.dataset &&
        scope.split === parsed[index - 1]!.split,
    )
  ) {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      "Memory build split configuration contains duplicates",
    );
  }
  return parsed;
}

export async function prepareMemoryExperiment(
  options: PrepareMemoryExperimentOptions,
): Promise<PreparedMemoryExperiment> {
  const mode = MemoryModeSchema.parse(options.mode);
  const allowedBuildSplits = normalizedBuildScopes(options.allowedBuildSplits);
  if (mode === "off") {
    if (options.requestedSnapshotId !== undefined || allowedBuildSplits.length !== 0) {
      throw new CoreLoopException(
        "EVALUATION_PROFILE_INVALID",
        "Memory snapshot and build splits require an active Memory mode",
      );
    }
    return { identity: { mode: "off" }, snapshot: null };
  }
  const piIdentityDigest = Sha256DigestSchema.safeParse(options.piIdentityDigest);
  const experiencePromptDigest = Sha256DigestSchema.safeParse(options.experiencePromptDigest);
  if (!piIdentityDigest.success || !experiencePromptDigest.success) {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      "Memory V1 requires the Pi Agent backend",
    );
  }
  let snapshot: MemorySnapshot;
  if (mode === "frozen") {
    if (options.requestedSnapshotId === undefined) {
      throw new CoreLoopException(
        "EVALUATION_PROFILE_INVALID",
        "Frozen Memory mode requires --memory-snapshot",
      );
    }
    const requested = MemorySnapshotIdSchema.safeParse(options.requestedSnapshotId);
    if (!requested.success) {
      throw new CoreLoopException(
        "EVALUATION_PROFILE_INVALID",
        "--memory-snapshot must use the mem-vNNNN format",
      );
    }
    snapshot = await options.store.loadSnapshot(requested.data);
  } else {
    if (
      !allowedBuildSplits.some(
        (scope) =>
          scope.dataset === options.currentScope.dataset &&
          scope.split === options.currentScope.split,
      )
    ) {
      throw new CoreLoopException(
        "EVALUATION_PROFILE_INVALID",
        "Read-write Memory mode requires the current dataset split in --memory-build-splits",
      );
    }
    const latest = await options.store.ensureInitialSnapshot();
    if (options.requestedSnapshotId !== undefined) {
      const requested = MemorySnapshotIdSchema.safeParse(options.requestedSnapshotId);
      if (!requested.success) {
        throw new CoreLoopException(
          "EVALUATION_PROFILE_INVALID",
          "--memory-snapshot must use the mem-vNNNN format",
        );
      }
      if (requested.data !== latest.manifest.snapshot_id) {
        throw new CoreLoopException(
          "EVALUATION_PROFILE_INVALID",
          "Read-write Memory mode can only extend the latest snapshot",
        );
      }
    }
    snapshot = latest;
  }
  return {
    snapshot,
    identity: MemoryExperimentIdentitySchema.parse({
      mode,
      snapshot_id: snapshot.manifest.snapshot_id,
      snapshot_sha256: snapshot.manifest.sha256,
      selector_prompt_digest: MEMORY_SELECTOR_PROMPT_DIGEST,
      experience_prompt_digest: experiencePromptDigest.data,
      consolidator_prompt_digest: MEMORY_CONSOLIDATOR_PROMPT_DIGEST,
      pi_identity_digest: piIdentityDigest.data,
      maximum_selected: MAXIMUM_SELECTED_MEMORIES,
      allowed_memory_build_splits: allowedBuildSplits,
    }),
  };
}

const MEMORY_HEADINGS = [
  "## Trigger",
  "## Problem Pattern",
  "## Diagnosis Principle",
  "## Repair Principle",
  "## Applicability",
  "## Verification",
] as const;

export function validateMemoryItemContent(content: string): string {
  if (Buffer.byteLength(content, "utf8") > 32_768 || content.length < 120) {
    throw new CoreLoopException("MEMORY_STORE_INVALID", "Memory item size is outside V1 bounds");
  }
  let previous = -1;
  for (const heading of MEMORY_HEADINGS) {
    const position = content.indexOf(heading);
    if (position <= previous) {
      throw new CoreLoopException(
        "MEMORY_STORE_INVALID",
        "Memory item is missing the required ordered V1 sections",
      );
    }
    previous = position;
  }
  if (
    /(?:hidden\s+(?:reference|test)|golden\s+rtl|reference\.sv|testbench|specific\s+testcase)/iu.test(
      content,
    )
  ) {
    throw new CoreLoopException(
      "MEMORY_STORE_INVALID",
      "Memory item contains forbidden hidden or case-specific solution content",
    );
  }
  return content.endsWith("\n") ? content : `${content}\n`;
}

function snapshotDigest(catalog: MemoryCatalog, items: readonly MemoryItem[]): string {
  return sha256Jcs({
    catalog,
    items: items.map((item) => ({ memory_id: item.metadata.memory_id, content: item.content })),
  });
}

function memoryFailure(message: string): CoreLoopException {
  return new CoreLoopException("MEMORY_STORE_INVALID", message);
}

async function readBoundedText(hostPath: string, maximumBytes: number): Promise<string> {
  const stat = await lstat(hostPath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maximumBytes) {
    throw memoryFailure("Memory file is not a bounded regular file");
  }
  const value = await readFile(hostPath, "utf8");
  if (Buffer.byteLength(value, "utf8") !== stat.size) {
    throw memoryFailure("Memory file changed while it was being read");
  }
  return value;
}

async function readBoundedJson(hostPath: string): Promise<unknown> {
  const value = await readBoundedText(hostPath, 16 * 1024 * 1024);
  return JSON.parse(value) as unknown;
}

function snapshotNumber(snapshotId: MemorySnapshotId): number {
  const number = Number(snapshotId.slice("mem-v".length));
  if (!Number.isSafeInteger(number) || number < 1) throw memoryFailure("Snapshot ID is invalid");
  return number;
}

function snapshotId(number: number): MemorySnapshotId {
  return MemorySnapshotIdSchema.parse(`mem-v${String(number).padStart(4, "0")}`);
}

async function validateSnapshotDirectory(
  directory: string,
  expectedSnapshotId: MemorySnapshotId,
): Promise<MemorySnapshot> {
  try {
    const manifest = MemorySnapshotManifestSchema.parse(
      await readBoundedJson(path.join(directory, "manifest.json")),
    );
    const catalog = MemoryCatalogSchema.parse(
      await readBoundedJson(path.join(directory, "catalog.json")),
    );
    if (
      manifest.snapshot_id !== expectedSnapshotId ||
      catalog.snapshot_id !== expectedSnapshotId ||
      manifest.memory_count !== catalog.entries.length
    ) {
      throw memoryFailure("Memory snapshot identity or count is inconsistent");
    }
    const items = await Promise.all(
      catalog.entries.map(async (metadata) => ({
        metadata,
        content: validateMemoryItemContent(
          await readBoundedText(path.join(directory, metadata.path), 32_768),
        ),
      })),
    );
    const allowedFiles = new Set([
      "manifest.json",
      "catalog.json",
      ...catalog.entries.map((entry) => entry.path),
    ]);
    const discovered: string[] = [];
    const pending = [{ host: directory, logical: "" }];
    while (pending.length > 0) {
      const current = pending.pop()!;
      for (const entry of await readdir(current.host, { withFileTypes: true })) {
        if (entry.isSymbolicLink()) throw memoryFailure("Memory snapshots cannot contain links");
        const logical =
          current.logical.length === 0 ? entry.name : `${current.logical}/${entry.name}`;
        if (entry.isDirectory()) {
          pending.push({ host: path.join(current.host, entry.name), logical });
        } else if (entry.isFile()) {
          discovered.push(logical);
        } else {
          throw memoryFailure("Memory snapshots cannot contain special filesystem entries");
        }
      }
    }
    if (
      discovered.length !== allowedFiles.size ||
      discovered.some((logicalPath) => !allowedFiles.has(logicalPath))
    ) {
      throw memoryFailure("Memory snapshot contains missing or unexpected files");
    }
    if (snapshotDigest(catalog, items) !== manifest.sha256) {
      throw memoryFailure("Memory snapshot digest does not match catalog and item content");
    }
    return { manifest, catalog, items };
  } catch (error) {
    if (error instanceof CoreLoopException) throw error;
    throw memoryFailure("Memory snapshot is missing, malformed, or unreadable");
  }
}

export class FilesystemMemoryStore {
  private readonly snapshotsRoot: string;

  public constructor(memoryRoot: string) {
    this.snapshotsRoot = path.join(path.resolve(memoryRoot), "snapshots");
  }

  public async listSnapshotIds(): Promise<readonly MemorySnapshotId[]> {
    await mkdir(this.snapshotsRoot, { recursive: true });
    const entries = await readdir(this.snapshotsRoot, { withFileTypes: true });
    const ids = entries
      .filter(
        (entry) => entry.isDirectory() && MemorySnapshotIdSchema.safeParse(entry.name).success,
      )
      .map((entry) => MemorySnapshotIdSchema.parse(entry.name));
    ids.sort((left, right) => snapshotNumber(left) - snapshotNumber(right));
    return ids;
  }

  public async loadSnapshot(id: MemorySnapshotId): Promise<MemorySnapshot> {
    const parsedId = MemorySnapshotIdSchema.parse(id);
    return validateSnapshotDirectory(path.join(this.snapshotsRoot, parsedId), parsedId);
  }

  public async loadLatestSnapshot(): Promise<MemorySnapshot | null> {
    const ids = await this.listSnapshotIds();
    return ids.length === 0 ? null : await this.loadSnapshot(ids.at(-1)!);
  }

  public async ensureInitialSnapshot(): Promise<MemorySnapshot> {
    const latest = await this.loadLatestSnapshot();
    if (latest !== null) return latest;
    try {
      return await this.publishSnapshot({ parentSnapshot: null, sourceBatch: null, items: [] });
    } catch (error) {
      const raced = await this.loadLatestSnapshot();
      if (raced !== null) return raced;
      throw error;
    }
  }

  public async publishSnapshot(draft: MemorySnapshotDraft): Promise<MemorySnapshot> {
    await mkdir(this.snapshotsRoot, { recursive: true });
    const ids = await this.listSnapshotIds();
    const nextNumber = ids.length === 0 ? 1 : snapshotNumber(ids.at(-1)!) + 1;
    if (
      (draft.parentSnapshot === null && ids.length !== 0) ||
      (draft.parentSnapshot !== null && draft.parentSnapshot.manifest.snapshot_id !== ids.at(-1))
    ) {
      throw memoryFailure("Memory publication parent is not the latest snapshot");
    }
    const nextId = snapshotId(nextNumber);
    let parsedItems: readonly MemoryItem[];
    try {
      parsedItems = draft.items
        .map((item) => ({
          metadata: MemoryCatalogEntrySchema.parse(item.metadata),
          content: validateMemoryItemContent(item.content),
        }))
        .sort((left, right) =>
          left.metadata.memory_id.localeCompare(right.metadata.memory_id, "en"),
        );
    } catch (error) {
      if (error instanceof CoreLoopException) throw error;
      throw memoryFailure("Memory snapshot draft contains invalid item metadata");
    }
    const catalog = MemoryCatalogSchema.parse({
      schema_version: 1,
      snapshot_id: nextId,
      entries: parsedItems.map((item) => item.metadata),
    });
    const manifest = MemorySnapshotManifestSchema.parse({
      schema_version: 1,
      snapshot_id: nextId,
      parent_snapshot: draft.parentSnapshot?.manifest.snapshot_id ?? null,
      source_batch: draft.sourceBatch,
      memory_count: parsedItems.length,
      sha256: snapshotDigest(catalog, parsedItems),
    });
    const staging = await mkdtemp(path.join(this.snapshotsRoot, ".memory-staging-"));
    let published = false;
    try {
      await mkdir(path.join(staging, "items"));
      await Promise.all([
        writeFile(
          path.join(staging, "catalog.json"),
          `${JSON.stringify(catalog, undefined, 2)}\n`,
          {
            flag: "wx",
          },
        ),
        ...parsedItems.map((item) =>
          writeFile(path.join(staging, item.metadata.path), item.content, { flag: "wx" }),
        ),
      ]);
      await writeFile(
        path.join(staging, "manifest.json"),
        `${JSON.stringify(manifest, undefined, 2)}\n`,
        { flag: "wx" },
      );
      await validateSnapshotDirectory(staging, nextId);
      await rename(staging, path.join(this.snapshotsRoot, nextId));
      published = true;
      return await this.loadSnapshot(nextId);
    } catch (error) {
      if (error instanceof CoreLoopException) throw error;
      throw memoryFailure("Memory snapshot could not be atomically published");
    } finally {
      if (!published) await rm(staging, { recursive: true, force: true });
    }
  }
}

export interface MemorySelectionQuery {
  readonly stage: string | null;
  readonly circuit_type: string | null;
  readonly failure_type: string | null;
  readonly language: string | null;
  readonly tool: string | null;
}

export interface MemorySelectorRequest {
  readonly snapshotId: MemorySnapshotId;
  readonly filteredCatalog: readonly MemoryCatalogEntry[];
  readonly specification: string;
  readonly feedback: string | null;
  readonly stage: "initial_generation" | "functional_repair";
  readonly evidenceDirectory: string;
}

export interface MemorySelector {
  select(request: MemorySelectorRequest): Promise<readonly string[]>;
}

function metadataMatches(expected: string | null, actual: string | null): boolean {
  return (
    expected === null ||
    actual === null ||
    actual.toLowerCase() === "unknown" ||
    expected.toLowerCase() === actual.toLowerCase()
  );
}

export function filterMemoryCatalog(
  snapshot: MemorySnapshot,
  query: MemorySelectionQuery,
): readonly MemoryCatalogEntry[] {
  return snapshot.catalog.entries.filter(
    (entry) =>
      metadataMatches(query.stage, entry.stage) &&
      metadataMatches(query.circuit_type, entry.circuit_type) &&
      metadataMatches(query.failure_type, entry.failure_type) &&
      metadataMatches(query.language, entry.language) &&
      metadataMatches(query.tool, entry.tool),
  );
}

export async function selectMemoryBestEffort(options: {
  readonly snapshot: MemorySnapshot;
  readonly query: MemorySelectionQuery;
  readonly specification: string;
  readonly feedback: string | null;
  readonly stage: MemorySelectorRequest["stage"];
  readonly evidenceDirectory: string;
  readonly selector: MemorySelector;
}): Promise<readonly MemoryItem[]> {
  const filteredCatalog = filterMemoryCatalog(options.snapshot, options.query);
  if (filteredCatalog.length === 0) return [];
  try {
    const rawIds = await options.selector.select({
      snapshotId: options.snapshot.manifest.snapshot_id,
      filteredCatalog,
      specification: options.specification,
      feedback: options.feedback,
      stage: options.stage,
      evidenceDirectory: options.evidenceDirectory,
    });
    if (
      !Array.isArray(rawIds) ||
      rawIds.length > MAXIMUM_SELECTED_MEMORIES ||
      rawIds.some((id) => typeof id !== "string")
    ) {
      return [];
    }
    const ids = rawIds.map((id) => MemoryItemIdSchema.safeParse(id));
    if (ids.some((id) => !id.success)) return [];
    const selectedIds = ids.map((id) => id.data!);
    if (new Set(selectedIds).size !== selectedIds.length) return [];
    const allowedIds = new Set(filteredCatalog.map((entry) => entry.memory_id));
    if (selectedIds.some((id) => !allowedIds.has(id))) return [];
    const itemsById = new Map(
      options.snapshot.items.map((item) => [item.metadata.memory_id, item] as const),
    );
    return selectedIds.map((id) => itemsById.get(id)!).filter((item) => item !== undefined);
  } catch {
    return [];
  }
}

export function renderRelevantRtlMemory(items: readonly MemoryItem[]): string | null {
  if (items.length === 0) return null;
  if (items.length > MAXIMUM_SELECTED_MEMORIES) {
    throw memoryFailure("Relevant RTL Memory cannot contain more than three items");
  }
  return [
    "# Relevant RTL Memory",
    "",
    "Memory is advisory. The current spec.md and real compiler/simulation feedback always take precedence.",
    "",
    ...items.flatMap((item) => [`## ${item.metadata.memory_id}`, "", item.content.trim(), ""]),
  ].join("\n");
}
