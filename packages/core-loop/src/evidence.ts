import { randomUUID } from "node:crypto";
import { link, mkdir, open, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";

import { LogicalPathSchema } from "@rtl-agent/contracts";
import type { LogicalPath } from "@rtl-agent/contracts";

import { resolveLogicalPath, scanRegularFiles, sha256Bytes, sha256Jcs } from "./filesystem.js";

export class EvidenceWriteError extends Error {
  public constructor() {
    super("EVIDENCE_WRITE_FAILED");
    this.name = "EvidenceWriteError";
  }
}

async function publishBytesExclusive(target: string, bytes: Uint8Array): Promise<void> {
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = path.join(
    path.dirname(target),
    `.${path.basename(target)}.tmp-${randomUUID()}`,
  );
  let temporaryExists = false;
  try {
    const handle = await open(temporary, "wx");
    temporaryExists = true;
    try {
      await handle.writeFile(bytes);
      await handle.sync();
    } finally {
      await handle.close();
    }
    await link(temporary, target);
  } catch {
    throw new EvidenceWriteError();
  } finally {
    if (temporaryExists) {
      await rm(temporary, { force: true }).catch(() => undefined);
    }
  }
}

export async function writeJsonEvidenceExclusive(
  rootDirectory: string,
  logicalPath: LogicalPath | string,
  value: unknown,
): Promise<void> {
  try {
    const parsedPath = LogicalPathSchema.parse(logicalPath);
    const bytes = Buffer.from(`${JSON.stringify(value, undefined, 2)}\n`, "utf8");
    await publishBytesExclusive(resolveLogicalPath(rootDirectory, parsedPath), bytes);
  } catch (error) {
    if (error instanceof EvidenceWriteError) throw error;
    throw new EvidenceWriteError();
  }
}

export async function ensureJsonEvidence(
  rootDirectory: string,
  logicalPath: LogicalPath | string,
  value: unknown,
): Promise<void> {
  const parsedPath = LogicalPathSchema.parse(logicalPath);
  const target = resolveLogicalPath(rootDirectory, parsedPath);
  try {
    const existing = JSON.parse(await readFile(target, "utf8")) as unknown;
    if (sha256Jcs(existing) !== sha256Jcs(value)) throw new EvidenceWriteError();
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? (error as { readonly code?: unknown }).code
        : undefined;
    if (code === "ENOENT") {
      await writeJsonEvidenceExclusive(rootDirectory, parsedPath, value);
      return;
    }
    if (error instanceof EvidenceWriteError) throw error;
    throw new EvidenceWriteError();
  }
}

export async function writeJsonReplacingAtomic(target: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = path.join(
    path.dirname(target),
    `.${path.basename(target)}.tmp-${randomUUID()}`,
  );
  try {
    const handle = await open(temporary, "wx");
    try {
      await handle.writeFile(`${JSON.stringify(value, undefined, 2)}\n`, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temporary, target);
  } catch {
    throw new EvidenceWriteError();
  } finally {
    await rm(temporary, { force: true }).catch(() => undefined);
  }
}

export async function copyRegularTreeToEvidence(
  sourceRoot: string,
  evidenceRoot: string,
  destinationLogicalRoot: LogicalPath | string,
): Promise<void> {
  try {
    const destination = LogicalPathSchema.parse(destinationLogicalRoot);
    const files = await scanRegularFiles(sourceRoot);
    for (const file of files) {
      const bytes = await readFile(file.hostPath);
      if (sha256Bytes(bytes) !== file.contentDigest) throw new EvidenceWriteError();
      const targetPath = LogicalPathSchema.parse(`${destination}/${file.logicalPath}`);
      await publishBytesExclusive(resolveLogicalPath(evidenceRoot, targetPath), bytes);
    }
  } catch (error) {
    if (error instanceof EvidenceWriteError) throw error;
    throw new EvidenceWriteError();
  }
}
