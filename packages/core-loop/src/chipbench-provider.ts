import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  DatasetDescriptorSchema,
  DatasetSelectionSchema,
  FixtureCaseRefSchema,
  FixtureMaterializationSchema,
} from "./contracts.js";
import type {
  DatasetDescriptor,
  DatasetSelection,
  FixtureCaseRef,
  FixtureMaterialization,
} from "./contracts.js";
import { CoreLoopException } from "./errors.js";
import { scanRegularFiles, sha256Bytes, sha256Jcs } from "./filesystem.js";
import type { ScannedFile } from "./filesystem.js";
import type { FixtureProvider, HostDirectory } from "./fixture-provider.js";
import { createManifestFromEntries } from "./manifest.js";
import {
  CHIPBENCH_DATASET_LOCK,
  type ChipBenchDatasetLock,
  type ChipBenchSplit,
  type ChipBenchSplitLock,
} from "./chipbench-lock.js";

interface ChipBenchCase {
  readonly caseRef: FixtureCaseRef;
  readonly promptPath: string;
  readonly promptDigest: ScannedFile["contentDigest"];
  readonly referencePath: string;
  readonly referenceDigest: ScannedFile["contentDigest"];
  readonly testbenchPath: string;
  readonly testbenchDigest: ScannedFile["contentDigest"];
}

export interface ChipBenchVerificationMaterialization {
  readonly referenceLogicalPath: "reference.sv";
  readonly referenceDigest: ScannedFile["contentDigest"];
  readonly testbenchLogicalPath: "testbench.sv";
  readonly testbenchDigest: ScannedFile["contentDigest"];
  readonly testbenchTopModule: "tb";
}

interface ChipBenchMetadata {
  readonly bySplit: ReadonlyMap<ChipBenchSplit, readonly ChipBenchCase[]>;
  readonly byIdentity: ReadonlyMap<string, ChipBenchCase>;
}

export type ChipBenchProviderMode = "prompt-only" | "zero-shot-seeded-debug";

const DEBUG_TARGET_MARKERS = Object.freeze([
  "code below in TopModule has bug, please fix that:",
  "code below has bug, please fix that:",
] as const);

export function extractChipBenchZeroShotBuggyRtl(prompt: string): string {
  const marker = DEBUG_TARGET_MARKERS.find((candidate) => prompt.includes(candidate));
  if (marker === undefined) {
    throw new CoreLoopException(
      "DATASET_PROVENANCE_INVALID",
      "ChipBench Debug prompt is missing the locked target marker",
    );
  }
  const markerIndex = prompt.indexOf(marker);
  const target = prompt.slice(markerIndex + marker.length);
  const match = /```(?:verilog|systemverilog)?[ \t]*\r?\n([\s\S]*?)\r?\n```/u.exec(target);
  if (match === null || !/(?:^|\n)\s*module\s+TopModule\b/u.test(match[1]!)) {
    throw new CoreLoopException(
      "DATASET_PROVENANCE_INVALID",
      "ChipBench Debug prompt does not contain one extractable TopModule target",
    );
  }
  const rtl = `${match[1]!.trim()}\n`;
  if (Buffer.byteLength(rtl, "utf8") > 1_048_576 || rtl.includes("```")) {
    throw new CoreLoopException(
      "DATASET_PROVENANCE_INVALID",
      "ChipBench Debug starter RTL exceeds the locked extraction boundary",
    );
  }
  return rtl;
}

function requireRegularDirectory(hostPath: string, label: string): Promise<void> {
  return lstat(hostPath)
    .then((stat) => {
      if (!stat.isDirectory() || stat.isSymbolicLink()) {
        throw new CoreLoopException(
          "DATASET_PROVENANCE_INVALID",
          `${label} must be a regular directory`,
        );
      }
    })
    .catch((error: unknown) => {
      if (error instanceof CoreLoopException) throw error;
      throw new CoreLoopException("DATASET_PROVENANCE_INVALID", `${label} is unavailable`);
    });
}

function requiredEntry(
  entries: ReadonlyMap<string, ScannedFile>,
  logicalPath: string,
): ScannedFile {
  const entry = entries.get(logicalPath);
  if (entry === undefined) {
    throw new CoreLoopException(
      "DATASET_PROVENANCE_INVALID",
      "ChipBench dataset is missing a locked case file",
    );
  }
  return entry;
}

function fixtureId(split: ChipBenchSplitLock, caseId: string): string {
  const match = /^Prob([0-9]{3})_/u.exec(caseId);
  if (match === null) {
    throw new CoreLoopException(
      "DATASET_PROVENANCE_INVALID",
      "ChipBench case name does not match the locked naming contract",
    );
  }
  return `${split.fixturePrefix}-p${match[1]}`;
}

function identityKey(split: string, caseId: string): string {
  return `${split}\u0000${caseId}`;
}

export class ChipBenchFixtureProvider implements FixtureProvider {
  private metadataPromise: Promise<ChipBenchMetadata> | undefined;

  public constructor(
    private readonly datasetRoot: string,
    private readonly lock: ChipBenchDatasetLock = CHIPBENCH_DATASET_LOCK,
    private readonly mode: ChipBenchProviderMode = "prompt-only",
  ) {}

  private descriptor(): DatasetDescriptor {
    return DatasetDescriptorSchema.parse({
      schemaVersion: 1,
      datasetId: this.lock.datasetId,
      datasetVersion: this.lock.datasetVersion,
      datasetSourceDigest: this.lock.contentManifestDigest,
      license: this.lock.license,
      adapter: this.lock.adapter,
      splits: this.lock.splits.map((entry) => entry.split),
    });
  }

  private async scanAndValidate(): Promise<readonly ScannedFile[]> {
    const root = path.resolve(this.datasetRoot);
    await requireRegularDirectory(root, "ChipBench dataset root");
    let files: readonly ScannedFile[];
    try {
      files = await scanRegularFiles(root);
    } catch {
      throw new CoreLoopException(
        "DATASET_PROVENANCE_INVALID",
        "ChipBench dataset files could not be scanned safely",
      );
    }
    const manifest = createManifestFromEntries(
      files.map((file) => ({
        path: file.logicalPath,
        byteLength: file.byteLength,
        contentDigest: file.contentDigest,
      })),
    );
    if (
      files.length !== this.lock.expectedFileCount ||
      manifest.manifestDigest !== this.lock.contentManifestDigest
    ) {
      throw new CoreLoopException(
        "DATASET_PROVENANCE_INVALID",
        "ChipBench dataset content does not match the locked manifest",
      );
    }
    return files;
  }

  private async createMetadata(): Promise<ChipBenchMetadata> {
    const files = await this.scanAndValidate();
    const entries = new Map(files.map((file) => [file.logicalPath, file]));
    const bySplit = new Map<ChipBenchSplit, readonly ChipBenchCase[]>();
    const byIdentity = new Map<string, ChipBenchCase>();
    for (const split of this.lock.splits) {
      const promptSuffix = "_prompt.txt";
      const caseIds = files
        .map((file) => file.logicalPath)
        .filter(
          (logicalPath) =>
            logicalPath.startsWith(`${split.datasetDirectory}/`) &&
            logicalPath.endsWith(promptSuffix),
        )
        .map((logicalPath) =>
          logicalPath.slice(split.datasetDirectory.length + 1, -promptSuffix.length),
        )
        .sort();
      if (
        caseIds.length !== split.expectedCaseCount ||
        caseIds.some((caseId, index) => index > 0 && caseIds[index - 1]! >= caseId)
      ) {
        throw new CoreLoopException(
          "DATASET_PROVENANCE_INVALID",
          "ChipBench split case count or ordering does not match the lock",
        );
      }
      const cases = caseIds.map((caseId) => {
        const prefix = `${split.datasetDirectory}/${caseId}`;
        const prompt = requiredEntry(entries, `${prefix}_prompt.txt`);
        const reference = requiredEntry(entries, `${prefix}_ref.sv`);
        const testbench = requiredEntry(entries, `${prefix}_test.sv`);
        const caseRef = FixtureCaseRefSchema.parse({
          schemaVersion: 1,
          fixtureId: fixtureId(split, caseId),
          identity: {
            datasetId: this.lock.datasetId,
            datasetVersion: this.lock.datasetVersion,
            split: split.split,
            caseId,
          },
          caseSourceDigest: sha256Jcs({
            caseId,
            prompt: { byteLength: prompt.byteLength, contentDigest: prompt.contentDigest },
            reference: {
              byteLength: reference.byteLength,
              contentDigest: reference.contentDigest,
            },
            testbench: {
              byteLength: testbench.byteLength,
              contentDigest: testbench.contentDigest,
            },
          }),
        });
        const entry = {
          caseRef,
          promptPath: prompt.hostPath,
          promptDigest: prompt.contentDigest,
          referencePath: reference.hostPath,
          referenceDigest: reference.contentDigest,
          testbenchPath: testbench.hostPath,
          testbenchDigest: testbench.contentDigest,
        };
        byIdentity.set(identityKey(split.split, caseId), entry);
        return entry;
      });
      bySplit.set(split.split, cases);
    }
    if (byIdentity.size !== this.lock.expectedCaseCount) {
      throw new CoreLoopException(
        "DATASET_PROVENANCE_INVALID",
        "ChipBench total case count does not match the lock",
      );
    }
    return { bySplit, byIdentity };
  }

  private async loadMetadata(): Promise<ChipBenchMetadata> {
    this.metadataPromise ??= this.createMetadata();
    return this.metadataPromise;
  }

  public async describe(): Promise<DatasetDescriptor> {
    await this.scanAndValidate();
    return this.descriptor();
  }

  public async *listCases(rawSelection: DatasetSelection): AsyncIterable<FixtureCaseRef> {
    const selection = DatasetSelectionSchema.parse(rawSelection);
    const metadata = await this.loadMetadata();
    const cases = metadata.bySplit.get(selection.split as ChipBenchSplit);
    if (cases === undefined) {
      throw new CoreLoopException(
        "DATASET_PROVENANCE_INVALID",
        "ChipBench Provider does not support the requested split",
      );
    }
    const requested = selection.caseIds === undefined ? undefined : new Set(selection.caseIds);
    let emitted = 0;
    for (const entry of cases) {
      if (requested !== undefined && !requested.has(entry.caseRef.identity.caseId)) continue;
      if (selection.maximumCases !== undefined && emitted >= selection.maximumCases) break;
      emitted += 1;
      yield entry.caseRef;
    }
  }

  public async materialize(
    caseRef: FixtureCaseRef,
    destination: HostDirectory,
  ): Promise<FixtureMaterialization> {
    const parsed = FixtureCaseRefSchema.parse(caseRef);
    const metadata = await this.loadMetadata();
    const entry = metadata.byIdentity.get(
      identityKey(parsed.identity.split, parsed.identity.caseId),
    );
    if (entry === undefined || sha256Jcs(entry.caseRef) !== sha256Jcs(parsed)) {
      throw new CoreLoopException(
        "DATASET_PROVENANCE_INVALID",
        "Requested ChipBench case does not match the locked catalog",
      );
    }
    await requireRegularDirectory(destination, "Fixture staging destination");
    const prompt = await readFile(entry.promptPath);
    if (sha256Bytes(prompt) !== entry.promptDigest) {
      throw new CoreLoopException(
        "DATASET_PROVENANCE_INVALID",
        "ChipBench prompt changed after dataset validation",
      );
    }
    await writeFile(path.join(destination, "prompt.txt"), prompt, { flag: "wx" });
    const split = this.lock.splits.find(
      (candidate) => candidate.split === entry.caseRef.identity.split,
    );
    if (split === undefined) {
      throw new CoreLoopException(
        "DATASET_PROVENANCE_INVALID",
        "ChipBench case split is not present in the locked catalog",
      );
    }
    const seededDebug = this.mode === "zero-shot-seeded-debug";
    if (seededDebug && !entry.caseRef.identity.split.startsWith("debug-zero-shot-")) {
      throw new CoreLoopException(
        "DATASET_PROVENANCE_INVALID",
        "Seeded ChipBench Debug mode accepts only locked zero-shot Debug splits",
      );
    }
    if (seededDebug) {
      const rtlDirectory = path.join(destination, "rtl");
      await mkdir(rtlDirectory);
      await writeFile(
        path.join(rtlDirectory, "dut.sv"),
        extractChipBenchZeroShotBuggyRtl(prompt.toString("utf8")),
        { encoding: "utf8", flag: "wx" },
      );
    }
    return FixtureMaterializationSchema.parse({
      schemaVersion: 1,
      fixtureId: entry.caseRef.fixtureId,
      identity: entry.caseRef.identity,
      caseSourceDigest: entry.caseRef.caseSourceDigest,
      category: seededDebug ? "SEEDED_FUNCTIONAL_REPAIR" : split.category,
      specPath: "prompt.txt",
      ...(seededDebug ? { starterRtlRoot: "rtl" } : {}),
      topModule: "TopModule",
      tags: [
        "chipbench",
        entry.caseRef.identity.split,
        seededDebug
          ? "seeded-functional-repair"
          : split.category === "BLANK_GENERATION"
            ? "verilog-generation"
            : "prompted-functional-repair",
      ].sort(),
    });
  }

  public async materializeVerification(
    caseRef: FixtureCaseRef,
    destination: HostDirectory,
  ): Promise<ChipBenchVerificationMaterialization> {
    const parsed = FixtureCaseRefSchema.parse(caseRef);
    const metadata = await this.loadMetadata();
    const entry = metadata.byIdentity.get(
      identityKey(parsed.identity.split, parsed.identity.caseId),
    );
    if (entry === undefined || sha256Jcs(entry.caseRef) !== sha256Jcs(parsed)) {
      throw new CoreLoopException(
        "DATASET_PROVENANCE_INVALID",
        "Requested ChipBench verification case does not match the locked catalog",
      );
    }
    await requireRegularDirectory(destination, "Verification staging destination");
    const [reference, testbench] = await Promise.all([
      readFile(entry.referencePath),
      readFile(entry.testbenchPath),
    ]);
    if (
      sha256Bytes(reference) !== entry.referenceDigest ||
      sha256Bytes(testbench) !== entry.testbenchDigest
    ) {
      throw new CoreLoopException(
        "DATASET_PROVENANCE_INVALID",
        "ChipBench verification assets changed after dataset validation",
      );
    }
    await Promise.all([
      writeFile(path.join(destination, "reference.sv"), reference, { flag: "wx" }),
      writeFile(path.join(destination, "testbench.sv"), testbench, { flag: "wx" }),
    ]);
    return {
      referenceLogicalPath: "reference.sv",
      referenceDigest: entry.referenceDigest,
      testbenchLogicalPath: "testbench.sv",
      testbenchDigest: entry.testbenchDigest,
      testbenchTopModule: "tb",
    };
  }
}
