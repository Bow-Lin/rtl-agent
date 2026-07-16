import { createHash } from "node:crypto";
import { lstat, readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { LogicalPathSchema, Sha256DigestSchema, canonicalizeJsonJcs } from "@rtl-agent/contracts";
import type { LogicalPath, Sha256Digest } from "@rtl-agent/contracts";

import { CoreLoopException } from "./errors.js";

export interface ScannedFile {
  readonly logicalPath: LogicalPath;
  readonly hostPath: string;
  readonly byteLength: number;
  readonly contentDigest: Sha256Digest;
}

export function sha256Bytes(value: Uint8Array): Sha256Digest {
  return Sha256DigestSchema.parse(`sha256:${createHash("sha256").update(value).digest("hex")}`);
}

export function sha256Jcs(value: unknown): Sha256Digest {
  return sha256Bytes(Buffer.from(canonicalizeJsonJcs(value), "utf8"));
}

export function logicalPathCollisionKey(logicalPath: string): string {
  return logicalPath.normalize("NFC").toLowerCase();
}

export function assertNoLogicalPathCollisions(paths: readonly string[]): void {
  const seen = new Map<string, string>();
  for (const candidate of paths) {
    const parsed = LogicalPathSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new CoreLoopException(
        "PATH_POLICY_VIOLATION",
        "Path collection contains a non-portable logical path",
      );
    }
    const logicalPath = parsed.data;
    const key = logicalPathCollisionKey(logicalPath);
    const previous = seen.get(key);
    if (previous !== undefined) {
      throw new CoreLoopException(
        "CASE_COLLISION",
        `Logical paths collide after Unicode normalization and case folding: ${previous}, ${logicalPath}`,
      );
    }
    seen.set(key, logicalPath);
  }
}

export function resolveLogicalPath(rootDirectory: string, logicalPath: LogicalPath): string {
  const root = path.resolve(rootDirectory);
  const candidate = path.resolve(root, ...logicalPath.split("/"));
  const relative = path.relative(root, candidate);
  if (
    relative === "" ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new CoreLoopException("PATH_POLICY_VIOLATION", "Logical path escapes its bound root");
  }
  return candidate;
}

function toLogicalPath(rootDirectory: string, hostPath: string): LogicalPath {
  const relative = path.relative(rootDirectory, hostPath);
  const logical = relative.split(path.sep).join("/");
  const parsed = LogicalPathSchema.safeParse(logical);
  if (!parsed.success) {
    throw new CoreLoopException(
      "PATH_POLICY_VIOLATION",
      `Filesystem entry cannot be represented as a portable logical path: ${logical}`,
    );
  }
  return parsed.data;
}

async function scanRegularFilesInternal(rootDirectory: string): Promise<readonly ScannedFile[]> {
  const root = path.resolve(rootDirectory);
  const rootStat = await lstat(root).catch(() => undefined);
  if (rootStat === undefined || !rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new CoreLoopException("PATH_POLICY_VIOLATION", "Scan root must be a regular directory");
  }

  const pending = [root];
  const files: ScannedFile[] = [];
  const discoveredPaths: LogicalPath[] = [];
  while (pending.length > 0) {
    const directory = pending.pop()!;
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name, "en"));
    for (const entry of entries) {
      const hostPath = path.join(directory, entry.name);
      const stat = await lstat(hostPath);
      const logicalPath = toLogicalPath(root, hostPath);
      discoveredPaths.push(logicalPath);
      if (stat.isSymbolicLink()) {
        throw new CoreLoopException(
          "PATH_POLICY_VIOLATION",
          `Symbolic links and junctions are forbidden: ${logicalPath}`,
        );
      }
      if (stat.isDirectory()) {
        pending.push(hostPath);
        continue;
      }
      if (!stat.isFile()) {
        throw new CoreLoopException(
          "PATH_POLICY_VIOLATION",
          `Special filesystem entries are forbidden: ${logicalPath}`,
        );
      }
      const content = await readFile(hostPath);
      files.push({
        logicalPath,
        hostPath,
        byteLength: content.byteLength,
        contentDigest: sha256Bytes(content),
      });
    }
  }

  assertNoLogicalPathCollisions(discoveredPaths);
  files.sort((left, right) => (left.logicalPath < right.logicalPath ? -1 : 1));
  return files;
}

export async function scanRegularFiles(rootDirectory: string): Promise<readonly ScannedFile[]> {
  try {
    return await scanRegularFilesInternal(rootDirectory);
  } catch (error) {
    if (error instanceof CoreLoopException) throw error;
    throw new CoreLoopException("INTERNAL_ERROR", "An internal error occurred");
  }
}
