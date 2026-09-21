import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

function logicalSourcePath(value: string): string {
  const normalized = value.replaceAll("\\", "/");
  if (
    normalized.length === 0 ||
    normalized.startsWith("/") ||
    /^[a-z]:/i.test(normalized) ||
    [...normalized].some((character) => character.charCodeAt(0) < 32) ||
    normalized.split("/").some((part) => part === "" || part === "." || part === "..")
  ) {
    throw new Error("TARGET_COVERAGE_INVALID_SOURCE_PATH");
  }
  return normalized;
}

/** Full DUT point multiset, independent of hit counts and serialization order. */
export function targetCoverageDomainSignature(
  rawCoverage: string,
  dutSourcePaths: readonly string[],
): string {
  const allowed = new Set(dutSourcePaths.map(logicalSourcePath));
  if (allowed.size === 0) throw new Error("TARGET_COVERAGE_EMPTY_SOURCE_ALLOWLIST");
  if (new Set([...allowed].map((source) => source.toLowerCase())).size !== allowed.size) {
    throw new Error("TARGET_COVERAGE_AMBIGUOUS_SOURCE_PATH");
  }
  const points: string[] = [];
  for (const line of rawCoverage.replace(/\r\n?/g, "\n").split("\n")) {
    if (line.trim() === "" || line.startsWith("#")) continue;
    const record = /^C '(.*)' ([0-9]+)$/.exec(line);
    if (record === null || !record[1]?.startsWith("\x01")) {
      throw new Error("TARGET_COVERAGE_INVALID_RECORD");
    }
    const metadata = new Map<string, string>();
    for (const field of record[1].slice(1).split("\x01")) {
      const separator = field.indexOf("\x02");
      const key = field.slice(0, separator);
      if (separator < 1 || field.indexOf("\x02", separator + 1) !== -1 || metadata.has(key)) {
        throw new Error("TARGET_COVERAGE_INVALID_METADATA");
      }
      metadata.set(key, field.slice(separator + 1));
    }
    const source = metadata.get("f");
    if (source === undefined || !metadata.get("t")) {
      throw new Error("TARGET_COVERAGE_INVALID_METADATA");
    }
    const normalizedSource = logicalSourcePath(source);
    if (!allowed.has(normalizedSource)) continue;
    metadata.set("f", normalizedSource);
    // Retain hierarchy, specialization, and every other metadata field. Duplicate
    // point identities remain duplicated so an added instance cannot disappear.
    points.push(
      JSON.stringify(
        [...metadata].sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)),
      ),
    );
  }
  if (points.length === 0) throw new Error("TARGET_COVERAGE_NO_DUT_POINTS");
  points.sort();
  return `sha256:${createHash("sha256")
    .update(JSON.stringify({ schemaVersion: 1, points }))
    .digest("hex")}`;
}

/** The trusted runner writes each round to this fixed evidence location. */
export async function readTargetCoverageDomainSignature(
  runDirectory: string,
  round: number,
  attempt: number,
  dutSourcePaths: readonly string[],
): Promise<string> {
  if (!Number.isSafeInteger(round) || round < 1 || !Number.isSafeInteger(attempt) || attempt < 0) {
    throw new Error("TARGET_COVERAGE_INVALID_ROUND");
  }
  const coveragePath = path.join(
    runDirectory,
    "evidence",
    "coverage",
    `round-${String(round)}-attempt-${String(attempt)}`,
    "coverage.dat",
  );
  return targetCoverageDomainSignature(await readFile(coveragePath, "utf8"), dutSourcePaths);
}
