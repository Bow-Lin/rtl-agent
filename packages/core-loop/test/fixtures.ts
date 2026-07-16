import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  CoreLoopRunProfileSchema,
  CreateRunRequestSchema,
  DatasetDescriptorSchema,
  FixtureCaseRefSchema,
  FixtureMaterializationSchema,
} from "../src/index.js";
import type {
  CreateRunRequest,
  DatasetDescriptor,
  FixtureCaseRef,
  FixtureMaterialization,
  FixtureProvider,
  HostDirectory,
} from "../src/index.js";

export const CASE_DIGEST = `sha256:${"a".repeat(64)}` as const;
export const DATASET_DIGEST = `sha256:${"b".repeat(64)}` as const;

export const CASE_REF = FixtureCaseRefSchema.parse({
  schemaVersion: 1,
  fixtureId: "case-0001",
  identity: {
    datasetId: "test-dataset",
    datasetVersion: "v1.0.0",
    split: "test",
    caseId: "source/case-0001",
  },
  caseSourceDigest: CASE_DIGEST,
});

export const PROFILE = CoreLoopRunProfileSchema.parse({
  schemaVersion: 1,
  profileId: "compile-repair-v1",
  compilerProfileId: "iverilog-systemverilog-2012-v1",
  maxAttempts: 3,
  stdoutLimitBytes: 65_536,
  stderrLimitBytes: 65_536,
  maximumIssues: 50,
  issueMessageLimitBytes: 500,
});

export const RUN_REQUEST = CreateRunRequestSchema.parse({
  schemaVersion: 1,
  caseRef: CASE_REF,
  profile: PROFILE,
});

export interface TestProviderOptions {
  readonly blank?: boolean;
  readonly extraFile?: boolean;
  readonly mismatchedProvenance?: boolean;
}

export class TestFixtureProvider implements FixtureProvider {
  public constructor(private readonly options: TestProviderOptions = {}) {}

  public async describe(): Promise<DatasetDescriptor> {
    return DatasetDescriptorSchema.parse({
      schemaVersion: 1,
      datasetId: "test-dataset",
      datasetVersion: "v1.0.0",
      datasetSourceDigest: DATASET_DIGEST,
      license: {
        name: "Synthetic test data only",
        spdxId: "CC0-1.0",
        reference: "https://example.invalid/test-data",
      },
      adapter: {
        adapterId: "test-adapter",
        adapterVersion: "v1.0.0",
        normalizationVersion: "v1",
      },
      splits: ["test"],
    });
  }

  public async *listCases(): AsyncIterable<FixtureCaseRef> {
    yield CASE_REF;
  }

  public async materialize(
    caseRef: FixtureCaseRef,
    destination: HostDirectory,
  ): Promise<FixtureMaterialization> {
    await writeFile(
      path.join(destination, "problem.md"),
      "Create module dut(input a, output y).\n",
    );
    if (!this.options.blank) {
      await mkdir(path.join(destination, "starter"), { recursive: true });
      await writeFile(
        path.join(destination, "starter", "dut.sv"),
        "module dut; BROKEN endmodule\n",
      );
    }
    if (this.options.extraFile) {
      await writeFile(path.join(destination, "hidden-answer.txt"), "not allowed\n");
    }
    return FixtureMaterializationSchema.parse({
      schemaVersion: 1,
      fixtureId: caseRef.fixtureId,
      identity: this.options.mismatchedProvenance
        ? { ...caseRef.identity, caseId: "different-case" }
        : caseRef.identity,
      caseSourceDigest: caseRef.caseSourceDigest,
      category: this.options.blank ? "BLANK_GENERATION" : "SEEDED_COMPILE_REPAIR",
      specPath: "problem.md",
      ...(!this.options.blank && { starterRtlRoot: "starter" }),
      topModule: "dut",
      tags: ["syntax-repair", "test-only"],
    });
  }
}

export function requestWithCaseRef(caseRef: FixtureCaseRef): CreateRunRequest {
  return CreateRunRequestSchema.parse({ ...RUN_REQUEST, caseRef });
}
