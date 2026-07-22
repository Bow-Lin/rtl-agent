import { lstat, readFile, writeFile } from "node:fs/promises";
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
import type { FixtureProvider, HostDirectory } from "./fixture-provider.js";
import { createManifestFromEntries } from "./manifest.js";
import { scanRegularFiles, sha256Bytes, sha256Jcs } from "./filesystem.js";
import type { ScannedFile } from "./filesystem.js";
import { VERILOG_EVAL_DATASET_LOCK, type VerilogEvalDatasetLock } from "./verilog-eval-lock.js";

interface VerilogEvalCase {
  readonly caseRef: FixtureCaseRef;
  readonly promptPath: string;
  readonly promptDigest: ScannedFile["contentDigest"];
  readonly referencePath: string;
  readonly referenceDigest: ScannedFile["contentDigest"];
  readonly testbenchPath: string;
  readonly testbenchDigest: ScannedFile["contentDigest"];
}

export interface VerilogEvalVerificationMaterialization {
  readonly referenceLogicalPath: "reference.sv";
  readonly referenceDigest: ScannedFile["contentDigest"];
  readonly testbenchLogicalPath: "testbench.sv";
  readonly testbenchDigest: ScannedFile["contentDigest"];
  readonly testbenchTopModule: "tb";
}

interface VerilogEvalMetadata {
  readonly cases: readonly VerilogEvalCase[];
  readonly byCaseId: ReadonlyMap<string, VerilogEvalCase>;
}

function fixtureIdForCase(caseId: string): string {
  return `ve2-${caseId.toLowerCase().replace(/^prob/, "p").replaceAll("_", "-")}`;
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

function manifestFromScan(files: readonly ScannedFile[]) {
  return createManifestFromEntries(
    files.map((file) => ({
      path: file.logicalPath,
      byteLength: file.byteLength,
      contentDigest: file.contentDigest,
    })),
  );
}

function requiredEntry(
  entries: ReadonlyMap<string, ScannedFile>,
  logicalPath: string,
): ScannedFile {
  const entry = entries.get(logicalPath);
  if (entry === undefined) {
    throw new CoreLoopException(
      "DATASET_PROVENANCE_INVALID",
      "VerilogEval dataset is missing a locked case file",
    );
  }
  return entry;
}

function parseProblemIds(content: string, lock: VerilogEvalDatasetLock): readonly string[] {
  const values = content
    .split(/\r?\n/u)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  if (
    values.length !== lock.expectedCaseCount ||
    values.some((value) => !/^Prob[0-9]{3}_[A-Za-z0-9_]+$/u.test(value)) ||
    values.some((value, index) => index > 0 && values[index - 1]! >= value)
  ) {
    throw new CoreLoopException(
      "DATASET_PROVENANCE_INVALID",
      "VerilogEval problem ordering does not match the locked dataset",
    );
  }
  return values;
}

export class VerilogEvalFixtureProvider implements FixtureProvider {
  private metadataPromise: Promise<VerilogEvalMetadata> | undefined;

  public constructor(
    private readonly datasetRoot: string,
    private readonly lock: VerilogEvalDatasetLock = VERILOG_EVAL_DATASET_LOCK,
  ) {}

  private descriptor(): DatasetDescriptor {
    return DatasetDescriptorSchema.parse({
      schemaVersion: 1,
      datasetId: this.lock.datasetId,
      datasetVersion: this.lock.datasetVersion,
      datasetSourceDigest: this.lock.contentManifestDigest,
      license: this.lock.license,
      adapter: this.lock.adapter,
      splits: [this.lock.split],
    });
  }

  private async scanAndValidate(): Promise<readonly ScannedFile[]> {
    const root = path.resolve(this.datasetRoot);
    await requireRegularDirectory(root, "VerilogEval dataset root");
    let files: readonly ScannedFile[];
    try {
      files = await scanRegularFiles(root);
    } catch {
      throw new CoreLoopException(
        "DATASET_PROVENANCE_INVALID",
        "VerilogEval dataset files could not be scanned safely",
      );
    }
    const manifest = manifestFromScan(files);
    if (
      files.length !== this.lock.expectedFileCount ||
      manifest.manifestDigest !== this.lock.contentManifestDigest
    ) {
      throw new CoreLoopException(
        "DATASET_PROVENANCE_INVALID",
        "VerilogEval dataset content does not match the locked manifest",
      );
    }
    return files;
  }

  private async loadMetadata(): Promise<VerilogEvalMetadata> {
    this.metadataPromise ??= this.createMetadata();
    return this.metadataPromise;
  }

  private async createMetadata(): Promise<VerilogEvalMetadata> {
    const files = await this.scanAndValidate();
    const entries = new Map(files.map((file) => [file.logicalPath, file]));
    const problemsEntry = requiredEntry(entries, this.lock.problemsFile);
    const problems = parseProblemIds(await readFile(problemsEntry.hostPath, "utf8"), this.lock);
    const cases = problems.map((caseId) => {
      const prefix = `${this.lock.datasetDirectory}/${caseId}`;
      const prompt = requiredEntry(entries, `${prefix}_prompt.txt`);
      const reference = requiredEntry(entries, `${prefix}_ref.sv`);
      const testbench = requiredEntry(entries, `${prefix}_test.sv`);
      const caseSourceDigest = sha256Jcs({
        caseId,
        prompt: {
          byteLength: prompt.byteLength,
          contentDigest: prompt.contentDigest,
        },
        reference: {
          byteLength: reference.byteLength,
          contentDigest: reference.contentDigest,
        },
        testbench: {
          byteLength: testbench.byteLength,
          contentDigest: testbench.contentDigest,
        },
      });
      const caseRef = FixtureCaseRefSchema.parse({
        schemaVersion: 1,
        fixtureId: fixtureIdForCase(caseId),
        identity: {
          datasetId: this.lock.datasetId,
          datasetVersion: this.lock.datasetVersion,
          split: this.lock.split,
          caseId,
        },
        caseSourceDigest,
      });
      return {
        caseRef,
        promptPath: prompt.hostPath,
        promptDigest: prompt.contentDigest,
        referencePath: reference.hostPath,
        referenceDigest: reference.contentDigest,
        testbenchPath: testbench.hostPath,
        testbenchDigest: testbench.contentDigest,
      };
    });
    return {
      cases,
      byCaseId: new Map(cases.map((entry) => [entry.caseRef.identity.caseId, entry])),
    };
  }

  public async describe(): Promise<DatasetDescriptor> {
    await this.scanAndValidate();
    return this.descriptor();
  }

  public async *listCases(rawSelection: DatasetSelection): AsyncIterable<FixtureCaseRef> {
    const selection = DatasetSelectionSchema.parse(rawSelection);
    if (selection.split !== this.lock.split) {
      throw new CoreLoopException(
        "DATASET_PROVENANCE_INVALID",
        "VerilogEval Provider supports only the locked spec-to-RTL split",
      );
    }
    const metadata = await this.loadMetadata();
    const requested = selection.caseIds === undefined ? undefined : new Set(selection.caseIds);
    let emitted = 0;
    for (const entry of metadata.cases) {
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
    const parsedCaseRef = FixtureCaseRefSchema.parse(caseRef);
    const metadata = await this.loadMetadata();
    const entry = metadata.byCaseId.get(parsedCaseRef.identity.caseId);
    if (entry === undefined || sha256Jcs(entry.caseRef) !== sha256Jcs(parsedCaseRef)) {
      throw new CoreLoopException(
        "DATASET_PROVENANCE_INVALID",
        "Requested VerilogEval case does not match the locked catalog",
      );
    }
    await requireRegularDirectory(destination, "Fixture staging destination");
    const prompt = await readFile(entry.promptPath);
    if (sha256Bytes(prompt) !== entry.promptDigest) {
      throw new CoreLoopException(
        "DATASET_PROVENANCE_INVALID",
        "VerilogEval prompt changed after dataset validation",
      );
    }
    await writeFile(path.join(destination, "prompt.txt"), prompt, { flag: "wx" });
    return FixtureMaterializationSchema.parse({
      schemaVersion: 1,
      fixtureId: entry.caseRef.fixtureId,
      identity: entry.caseRef.identity,
      caseSourceDigest: entry.caseRef.caseSourceDigest,
      category: "BLANK_GENERATION",
      specPath: "prompt.txt",
      topModule: "TopModule",
      tags: ["spec-to-rtl", "verilog-eval-v2"],
    });
  }

  public async materializeVerification(
    caseRef: FixtureCaseRef,
    destination: HostDirectory,
  ): Promise<VerilogEvalVerificationMaterialization> {
    const parsedCaseRef = FixtureCaseRefSchema.parse(caseRef);
    const metadata = await this.loadMetadata();
    const entry = metadata.byCaseId.get(parsedCaseRef.identity.caseId);
    if (entry === undefined || sha256Jcs(entry.caseRef) !== sha256Jcs(parsedCaseRef)) {
      throw new CoreLoopException(
        "DATASET_PROVENANCE_INVALID",
        "Requested VerilogEval verification case does not match the locked catalog",
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
        "VerilogEval verification assets changed after dataset validation",
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
