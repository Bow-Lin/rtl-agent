import { randomUUID } from "node:crypto";
import { copyFile, lstat, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { LogicalPath } from "@rtl-agent/contracts";

import {
  CreateRunRequestSchema,
  DatasetDescriptorSchema,
  FixtureMaterializationSchema,
  NormalizedFixtureSchema,
  RunIdSchema,
} from "./contracts.js";
import type {
  CreateRunRequest,
  DatasetDescriptor,
  FixtureCaseRef,
  FixtureMaterialization,
  NormalizedFixture,
  RunId,
} from "./contracts.js";
import { CoreLoopException, requireFixtureProvider } from "./errors.js";
import { asHostDirectoryForProvider } from "./fixture-provider.js";
import type { FixtureProvider } from "./fixture-provider.js";
import {
  assertNoLogicalPathCollisions,
  resolveLogicalPath,
  scanRegularFiles,
  sha256Jcs,
} from "./filesystem.js";
import type { ScannedFile } from "./filesystem.js";
import { createBaselineWorkspaceManifest, createManifestFromEntries } from "./manifest.js";
import type { FileManifest, FileManifestEntry } from "./manifest.js";

interface NormalizedSourceFile {
  readonly sourceHostPath: string;
  readonly destinationPath: LogicalPath;
  readonly byteLength: number;
  readonly contentDigest: FileManifestEntry["contentDigest"];
}

interface PreparedFixture {
  readonly stagingDirectory: string;
  readonly fixture: NormalizedFixture;
  readonly sourceFiles: readonly NormalizedSourceFile[];
}

export interface CreateCoreLoopRunOptions {
  readonly runsRoot: string;
  readonly stagingRoot?: string;
  readonly runIdFactory?: () => RunId;
  readonly removeStagingDirectory?: (directory: string) => Promise<void>;
}

export type CoreLoopCleanupWarning = "STAGING_CLEANUP_FAILED";

export interface CoreLoopRun {
  readonly runId: RunId;
  readonly runDirectory: string;
  readonly workspaceDirectory: string;
  readonly fixture: NormalizedFixture;
  readonly request: CreateRunRequest;
  readonly baselineManifest: FileManifest;
  readonly baselineWorkspaceManifestDigest: FileManifest["manifestDigest"];
  readonly cleanupWarnings: readonly CoreLoopCleanupWarning[];
}

function sameIdentity(
  left: FixtureCaseRef["identity"],
  right: FixtureCaseRef["identity"],
): boolean {
  return (
    left.datasetId === right.datasetId &&
    left.datasetVersion === right.datasetVersion &&
    left.split === right.split &&
    left.caseId === right.caseId
  );
}

function validateProvenance(
  descriptor: DatasetDescriptor,
  caseRef: FixtureCaseRef,
  materialization: FixtureMaterialization,
): void {
  if (
    descriptor.datasetId !== caseRef.identity.datasetId ||
    descriptor.datasetVersion !== caseRef.identity.datasetVersion ||
    !descriptor.splits.includes(caseRef.identity.split) ||
    !sameIdentity(caseRef.identity, materialization.identity) ||
    caseRef.fixtureId !== materialization.fixtureId ||
    caseRef.caseSourceDigest !== materialization.caseSourceDigest
  ) {
    throw new CoreLoopException(
      "DATASET_PROVENANCE_INVALID",
      "Dataset descriptor, case reference, and materialized case provenance do not match",
    );
  }
}

function isLogicalDescendant(candidate: string, root: string): boolean {
  return candidate.startsWith(`${root}/`);
}

async function requireRegularFile(hostPath: string, label: string): Promise<void> {
  const stat = await lstat(hostPath).catch(() => undefined);
  if (stat === undefined || !stat.isFile() || stat.isSymbolicLink()) {
    throw new CoreLoopException("FIXTURE_INVALID", `${label} must identify a regular file`);
  }
}

async function requireRegularDirectory(hostPath: string, label: string): Promise<void> {
  const stat = await lstat(hostPath).catch(() => undefined);
  if (stat === undefined || !stat.isDirectory() || stat.isSymbolicLink()) {
    throw new CoreLoopException("FIXTURE_INVALID", `${label} must identify a regular directory`);
  }
}

function normalizedFiles(
  files: readonly ScannedFile[],
  materialization: FixtureMaterialization,
): readonly NormalizedSourceFile[] {
  const results: NormalizedSourceFile[] = [];
  for (const file of files) {
    if (file.logicalPath === materialization.specPath) {
      results.push({
        ...file,
        sourceHostPath: file.hostPath,
        destinationPath: "spec.md" as LogicalPath,
      });
      continue;
    }
    if (
      materialization.category === "SEEDED_COMPILE_REPAIR" &&
      isLogicalDescendant(file.logicalPath, materialization.starterRtlRoot)
    ) {
      const relative = file.logicalPath.slice(materialization.starterRtlRoot.length + 1);
      if (!/\.(?:sv|svh|v|vh)$/i.test(relative)) {
        throw new CoreLoopException(
          "FIXTURE_INVALID",
          `Starter RTL contains a non-RTL file: ${file.logicalPath}`,
        );
      }
      results.push({
        ...file,
        sourceHostPath: file.hostPath,
        destinationPath: `rtl/${relative}` as LogicalPath,
      });
      continue;
    }
    throw new CoreLoopException(
      "FIXTURE_INVALID",
      `Provider wrote a file outside the declared spec/starter RTL allowlist: ${file.logicalPath}`,
    );
  }
  assertNoLogicalPathCollisions(results.map((file) => file.destinationPath));
  return results.sort((left, right) => (left.destinationPath < right.destinationPath ? -1 : 1));
}

function fixtureDigestInput(
  descriptor: DatasetDescriptor,
  materialization: FixtureMaterialization,
  files: readonly NormalizedSourceFile[],
): unknown {
  return {
    schemaVersion: 1,
    fixtureId: materialization.fixtureId,
    provenance: {
      identity: materialization.identity,
      ...(descriptor.datasetSourceDigest === undefined
        ? {}
        : { datasetSourceDigest: descriptor.datasetSourceDigest }),
      caseSourceDigest: materialization.caseSourceDigest,
      license: descriptor.license,
      adapter: descriptor.adapter,
    },
    category: materialization.category,
    specPath: "spec.md",
    workspaceRtlRoot: "rtl",
    topModule: materialization.topModule,
    tags: materialization.tags,
    files: files.map((file) => ({
      path: file.destinationPath,
      byteLength: file.byteLength,
      contentDigest: file.contentDigest,
    })),
  };
}

async function prepareFixture(
  provider: FixtureProvider,
  caseRef: FixtureCaseRef,
  stagingRoot: string,
): Promise<PreparedFixture> {
  await mkdir(stagingRoot, { recursive: true });
  const stagingDirectory = await mkdtemp(path.join(stagingRoot, "fixture-"));
  try {
    let descriptor: DatasetDescriptor;
    try {
      descriptor = DatasetDescriptorSchema.parse(await provider.describe());
    } catch (error) {
      throw error instanceof CoreLoopException
        ? error
        : new CoreLoopException("DATASET_PROVENANCE_INVALID", "Dataset descriptor is invalid");
    }

    let rawMaterialization: unknown;
    try {
      rawMaterialization = await provider.materialize(
        caseRef,
        asHostDirectoryForProvider(stagingDirectory),
      );
    } catch (error) {
      throw error instanceof CoreLoopException
        ? error
        : new CoreLoopException(
            "FIXTURE_MATERIALIZATION_FAILED",
            "Fixture provider failed to materialize the requested case",
          );
    }
    const parsed = FixtureMaterializationSchema.safeParse(rawMaterialization);
    if (!parsed.success) {
      throw new CoreLoopException("FIXTURE_INVALID", "Fixture materialization metadata is invalid");
    }
    const materialization = parsed.data;
    validateProvenance(descriptor, caseRef, materialization);

    const files = await scanRegularFiles(stagingDirectory);
    await requireRegularFile(
      resolveLogicalPath(stagingDirectory, materialization.specPath),
      "Fixture specPath",
    );
    if (materialization.category === "SEEDED_COMPILE_REPAIR") {
      await requireRegularDirectory(
        resolveLogicalPath(stagingDirectory, materialization.starterRtlRoot),
        "Fixture starterRtlRoot",
      );
    }
    const sources = normalizedFiles(files, materialization);
    const rtlEntries = sources.filter((source) => source.destinationPath.startsWith("rtl/"));
    if (materialization.category === "SEEDED_COMPILE_REPAIR" && rtlEntries.length === 0) {
      throw new CoreLoopException("FIXTURE_INVALID", "Seeded fixture must contain starter RTL");
    }

    const normalizedFixtureDigest = sha256Jcs(
      fixtureDigestInput(descriptor, materialization, sources),
    );
    const provenance = {
      identity: materialization.identity,
      ...(descriptor.datasetSourceDigest === undefined
        ? {}
        : { datasetSourceDigest: descriptor.datasetSourceDigest }),
      caseSourceDigest: materialization.caseSourceDigest,
      license: descriptor.license,
      adapter: descriptor.adapter,
    };
    const fixture = NormalizedFixtureSchema.parse(
      materialization.category === "BLANK_GENERATION"
        ? {
            schemaVersion: 1,
            fixtureId: materialization.fixtureId,
            provenance,
            category: materialization.category,
            specPath: "spec.md",
            workspaceRtlRoot: "rtl",
            topModule: materialization.topModule,
            tags: materialization.tags,
            normalizedFixtureDigest,
          }
        : {
            schemaVersion: 1,
            fixtureId: materialization.fixtureId,
            provenance,
            category: materialization.category,
            specPath: "spec.md",
            starterRtlRoot: "rtl",
            workspaceRtlRoot: "rtl",
            topModule: materialization.topModule,
            tags: materialization.tags,
            normalizedFixtureDigest,
            starterRtlDigest: createManifestFromEntries(
              rtlEntries.map((file) => ({
                path: file.destinationPath,
                byteLength: file.byteLength,
                contentDigest: file.contentDigest,
              })),
            ).manifestDigest,
          },
    );
    return { stagingDirectory, fixture, sourceFiles: sources };
  } catch (error) {
    await rm(stagingDirectory, { recursive: true, force: true });
    throw error;
  }
}

async function writeJson(hostPath: string, value: unknown): Promise<void> {
  await writeFile(hostPath, `${JSON.stringify(value, undefined, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
}

async function publishRun(
  prepared: PreparedFixture,
  request: CreateRunRequest,
  runsRoot: string,
  runId: RunId,
): Promise<CoreLoopRun> {
  await mkdir(runsRoot, { recursive: true });
  const runDirectory = path.join(path.resolve(runsRoot), runId);
  const existing = await lstat(runDirectory).catch(() => undefined);
  if (existing !== undefined) {
    throw new CoreLoopException("RUN_ALREADY_EXISTS", "Core Loop run ID already exists");
  }

  const temporaryRun = await mkdtemp(path.join(path.resolve(runsRoot), ".run-staging-"));
  try {
    const workspace = path.join(temporaryRun, "workspace");
    const evidence = path.join(temporaryRun, "evidence");
    await mkdir(path.join(workspace, "context"), { recursive: true });
    await mkdir(path.join(workspace, "rtl"), { recursive: true });
    await mkdir(path.join(evidence, "attempts"), { recursive: true });

    for (const source of prepared.sourceFiles) {
      const target = resolveLogicalPath(workspace, source.destinationPath);
      await mkdir(path.dirname(target), { recursive: true });
      await copyFile(source.sourceHostPath, target);
    }

    const baselineManifest = await createBaselineWorkspaceManifest(temporaryRun);
    const expectedEntries = prepared.sourceFiles.map((source) => ({
      path: `workspace/${source.destinationPath}` as LogicalPath,
      byteLength: source.byteLength,
      contentDigest: source.contentDigest,
    }));
    const expectedBaseline = createManifestFromEntries(expectedEntries);
    if (baselineManifest.manifestDigest !== expectedBaseline.manifestDigest) {
      throw new CoreLoopException(
        "FIXTURE_MATERIALIZATION_FAILED",
        "Fixture content changed between staging validation and run publication",
      );
    }
    await writeJson(path.join(evidence, "run-request.json"), request);
    await writeJson(path.join(evidence, "fixture.json"), prepared.fixture);
    await writeJson(path.join(evidence, "baseline-manifest.json"), baselineManifest);

    try {
      await rename(temporaryRun, runDirectory);
    } catch (error) {
      const nowExists = await lstat(runDirectory).catch(() => undefined);
      if (nowExists !== undefined) {
        throw new CoreLoopException("RUN_ALREADY_EXISTS", "Core Loop run ID already exists");
      }
      throw error;
    }
    return {
      runId,
      runDirectory,
      workspaceDirectory: path.join(runDirectory, "workspace"),
      fixture: prepared.fixture,
      request,
      baselineManifest,
      baselineWorkspaceManifestDigest: baselineManifest.manifestDigest,
      cleanupWarnings: [],
    };
  } catch (error) {
    await rm(temporaryRun, { recursive: true, force: true });
    throw error;
  }
}

export function createRunId(): RunId {
  return RunIdSchema.parse(`run_${randomUUID()}`);
}

export async function createCoreLoopRun(
  provider: FixtureProvider | undefined,
  rawRequest: unknown,
  options: CreateCoreLoopRunOptions,
): Promise<CoreLoopRun> {
  try {
    const configuredProvider = requireFixtureProvider(provider);
    const parsedRequest = CreateRunRequestSchema.safeParse(rawRequest);
    if (!parsedRequest.success) {
      throw new CoreLoopException("FIXTURE_INVALID", "Core Loop run request is invalid");
    }
    const request = parsedRequest.data;
    const stagingRoot = path.resolve(
      options.stagingRoot ?? path.join(os.tmpdir(), "rtl-agent-core-loop"),
    );
    const prepared = await prepareFixture(configuredProvider, request.caseRef, stagingRoot);
    const removeStagingDirectory =
      options.removeStagingDirectory ??
      ((directory: string) => rm(directory, { recursive: true, force: true }));
    let publishedRun: CoreLoopRun;
    try {
      const runId = options.runIdFactory?.() ?? createRunId();
      publishedRun = await publishRun(
        prepared,
        request,
        options.runsRoot,
        RunIdSchema.parse(runId),
      );
    } catch (error) {
      await removeStagingDirectory(prepared.stagingDirectory).catch(() => undefined);
      throw error;
    }
    try {
      await removeStagingDirectory(prepared.stagingDirectory);
      return publishedRun;
    } catch {
      return { ...publishedRun, cleanupWarnings: ["STAGING_CLEANUP_FAILED"] };
    }
  } catch (error) {
    if (error instanceof CoreLoopException) throw error;
    throw new CoreLoopException("INTERNAL_ERROR", "An internal error occurred");
  }
}

export async function readRunEvidenceJson(
  run: CoreLoopRun,
  logicalPath: LogicalPath,
): Promise<unknown> {
  if (!logicalPath.startsWith("evidence/")) {
    throw new CoreLoopException(
      "PATH_POLICY_VIOLATION",
      "Evidence reads must stay below evidence/",
    );
  }
  const content = await readFile(resolveLogicalPath(run.runDirectory, logicalPath), "utf8");
  return JSON.parse(content) as unknown;
}
