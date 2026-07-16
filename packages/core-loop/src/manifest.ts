import { LogicalPathSchema, Sha256DigestSchema } from "@rtl-agent/contracts";
import type { LogicalPath, Sha256Digest } from "@rtl-agent/contracts";
import { z } from "zod";

import { CoreLoopException } from "./errors.js";
import {
  assertNoLogicalPathCollisions,
  logicalPathCollisionKey,
  scanRegularFiles,
  sha256Jcs,
} from "./filesystem.js";

export const FileManifestEntrySchema = z.strictObject({
  path: LogicalPathSchema,
  byteLength: z.int().nonnegative(),
  contentDigest: Sha256DigestSchema,
});

export const FileManifestSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    entries: z.array(FileManifestEntrySchema),
    manifestDigest: Sha256DigestSchema,
  })
  .superRefine((value, context) => {
    const collisionKeys = new Map<string, number>();
    value.entries.forEach((entry, index) => {
      const key = logicalPathCollisionKey(entry.path);
      const previous = collisionKeys.get(key);
      if (previous !== undefined) {
        context.addIssue({
          code: "custom",
          path: ["entries", index, "path"],
          message: `Manifest path collides with entries[${String(previous)}] after normalization and case folding`,
        });
      } else {
        collisionKeys.set(key, index);
      }
    });
    if (
      value.entries.some(
        (entry, index) => index > 0 && value.entries[index - 1]!.path >= entry.path,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["entries"],
        message: "Manifest entries must be strictly sorted by logical path",
      });
    }
    if (sha256Jcs(value.entries) !== value.manifestDigest) {
      context.addIssue({
        code: "custom",
        path: ["manifestDigest"],
        message: "Manifest digest does not match its JCS-canonical entries",
      });
    }
  });

export type FileManifestEntry = z.infer<typeof FileManifestEntrySchema>;
export type FileManifest = z.infer<typeof FileManifestSchema>;

export async function createFileManifest(
  rootDirectory: string,
  include: (logicalPath: LogicalPath) => boolean = () => true,
): Promise<FileManifest> {
  const scanned = await scanRegularFiles(rootDirectory);
  const entries = scanned
    .filter((file) => include(file.logicalPath))
    .map((file) => ({
      path: file.logicalPath,
      byteLength: file.byteLength,
      contentDigest: file.contentDigest,
    }));
  const manifestDigest = sha256Jcs(entries);
  return FileManifestSchema.parse({ schemaVersion: 1, entries, manifestDigest });
}

export function createManifestFromEntries(entries: readonly FileManifestEntry[]): FileManifest {
  const parsedEntries = z.array(FileManifestEntrySchema).parse(entries);
  const sorted = [...parsedEntries].sort((left, right) => (left.path < right.path ? -1 : 1));
  assertNoLogicalPathCollisions(sorted.map((entry) => entry.path));
  return FileManifestSchema.parse({
    schemaVersion: 1,
    entries: sorted,
    manifestDigest: sha256Jcs(sorted),
  });
}

export function createBaselineWorkspaceManifest(runDirectory: string): Promise<FileManifest> {
  return createFileManifest(
    runDirectory,
    (logicalPath) =>
      logicalPath === "workspace/spec.md" || logicalPath.startsWith("workspace/rtl/"),
  );
}

export function createAttemptRunManifest(runDirectory: string): Promise<FileManifest> {
  return createFileManifest(runDirectory);
}

export interface FileChange {
  readonly path: LogicalPath;
  readonly kind: "ADDED" | "MODIFIED" | "DELETED";
}

export interface WorkspacePolicyResult {
  readonly ok: boolean;
  readonly changes: readonly FileChange[];
  readonly violations: readonly FileChange[];
}

export function checkAllowedRunChanges(
  before: FileManifest,
  after: FileManifest,
): WorkspacePolicyResult {
  const validBefore = FileManifestSchema.parse(before);
  const validAfter = FileManifestSchema.parse(after);
  const beforeByPath = new Map(validBefore.entries.map((entry) => [entry.path, entry]));
  const afterByPath = new Map(validAfter.entries.map((entry) => [entry.path, entry]));
  const allPaths = [...new Set([...beforeByPath.keys(), ...afterByPath.keys()])].sort();
  const changes: FileChange[] = [];

  for (const candidate of allPaths) {
    const logicalPath = LogicalPathSchema.parse(candidate);
    const previous = beforeByPath.get(logicalPath);
    const next = afterByPath.get(logicalPath);
    if (previous === undefined && next !== undefined) {
      changes.push({ path: logicalPath, kind: "ADDED" });
    } else if (previous !== undefined && next === undefined) {
      changes.push({ path: logicalPath, kind: "DELETED" });
    } else if (
      previous !== undefined &&
      next !== undefined &&
      (previous.byteLength !== next.byteLength || previous.contentDigest !== next.contentDigest)
    ) {
      changes.push({ path: logicalPath, kind: "MODIFIED" });
    }
  }

  const violations = changes.filter((change) => !change.path.startsWith("workspace/rtl/"));
  return { ok: violations.length === 0, changes, violations };
}

export function assertAllowedRunChanges(before: FileManifest, after: FileManifest): void {
  const result = checkAllowedRunChanges(before, after);
  if (!result.ok) {
    throw new CoreLoopException(
      "PATH_POLICY_VIOLATION",
      `Agent changed protected run paths: ${result.violations.map((change) => change.path).join(", ")}`,
    );
  }
}

export function manifestDigest(entries: readonly FileManifestEntry[]): Sha256Digest {
  return createManifestFromEntries(entries).manifestDigest;
}
