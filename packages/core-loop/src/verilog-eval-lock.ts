import path from "node:path";

import { LogicalPathSchema, Sha256DigestSchema } from "@rtl-agent/contracts";
import type { Sha256Digest } from "@rtl-agent/contracts";

export interface VerilogEvalPreparationPatch {
  readonly patchId: string;
  readonly logicalPath: string;
  readonly sourceDigest: Sha256Digest;
  readonly resultDigest: Sha256Digest;
  readonly replacements: readonly {
    readonly from: string;
    readonly to: string;
    readonly expectedOccurrences: number;
  }[];
}

export interface VerilogEvalDatasetLock {
  readonly schemaVersion: 1;
  readonly datasetId: "nvlabs-verilog-eval";
  readonly datasetVersion: string;
  readonly split: "spec-to-rtl";
  readonly sourceRepository: string;
  readonly sourceCommit: string;
  readonly archiveUrl: string;
  readonly archiveRoot: string;
  readonly archiveDigest: Sha256Digest;
  readonly contentManifestDigest: Sha256Digest;
  readonly expectedFileCount: number;
  readonly expectedCaseCount: number;
  readonly preparationPatches: readonly VerilogEvalPreparationPatch[];
  readonly providerImplementationDigest: Sha256Digest;
  readonly datasetDirectory: "dataset_spec-to-rtl";
  readonly problemsFile: "dataset_spec-to-rtl/problems.txt";
  readonly license: {
    readonly name: string;
    readonly spdxId: "MIT";
    readonly reference: string;
  };
  readonly adapter: {
    readonly adapterId: "verilog-eval-v2";
    readonly adapterVersion: string;
    readonly normalizationVersion: string;
  };
}

export const VERILOG_EVAL_DATASET_LOCK = Object.freeze({
  schemaVersion: 1,
  datasetId: "nvlabs-verilog-eval",
  datasetVersion: "v2-c498220d-prob099fix1",
  split: "spec-to-rtl",
  sourceRepository: "https://github.com/NVlabs/verilog-eval.git",
  sourceCommit: "c498220d0a52248f8e3fdffe279075215bde2da6",
  archiveUrl:
    "https://codeload.github.com/NVlabs/verilog-eval/tar.gz/c498220d0a52248f8e3fdffe279075215bde2da6",
  archiveRoot: "verilog-eval-c498220d0a52248f8e3fdffe279075215bde2da6",
  archiveDigest: Sha256DigestSchema.parse(
    "sha256:179e0fa36027e93e78adeca687d27d9020f6655bde829ade9baf88aeb20d3fbd",
  ),
  contentManifestDigest: Sha256DigestSchema.parse(
    "sha256:403633924c1491de25b7cc896cedd1500594930ef0c00a174adc1040d476d210",
  ),
  expectedFileCount: 472,
  expectedCaseCount: 156,
  preparationPatches: Object.freeze([
    Object.freeze({
      patchId: "prob099-testbench-y1-y3-v1",
      logicalPath: LogicalPathSchema.parse("dataset_spec-to-rtl/Prob099_m2014_q6c_test.sv"),
      sourceDigest: Sha256DigestSchema.parse(
        "sha256:f0646c83cf045e2b151dd54af1772e6b22666d2367ef1f91179309271d9c64a7",
      ),
      resultDigest: Sha256DigestSchema.parse(
        "sha256:f1b10c83ca644b8346a193254e7d0c93fa75406ede8916a81fe557217c44f097",
      ),
      replacements: Object.freeze([
        Object.freeze({ from: "Y2", to: "Y1", expectedOccurrences: 27 }),
        Object.freeze({ from: "Y4", to: "Y3", expectedOccurrences: 27 }),
      ]),
    }),
  ]),
  providerImplementationDigest: Sha256DigestSchema.parse(
    "sha256:06040bf5a4319dc06deb0069817219fcc3f10bfdce6c748d867e3173d9153771",
  ),
  datasetDirectory: "dataset_spec-to-rtl",
  problemsFile: "dataset_spec-to-rtl/problems.txt",
  license: Object.freeze({
    name: "MIT License",
    spdxId: "MIT",
    reference:
      "https://github.com/NVlabs/verilog-eval/blob/c498220d0a52248f8e3fdffe279075215bde2da6/LICENSE",
  }),
  adapter: Object.freeze({
    adapterId: "verilog-eval-v2",
    adapterVersion: "v1.1.0",
    normalizationVersion: "spec-prompt-plus-prob099-testbench-y1-y3-v2",
  }),
} satisfies VerilogEvalDatasetLock);

export function verilogEvalCacheRoot(repositoryRoot: string): string {
  return path.join(repositoryRoot, ".rtl-agent", "datasets", "verilog-eval");
}

export function verilogEvalDatasetDirectory(
  cacheRoot: string,
  lock: VerilogEvalDatasetLock = VERILOG_EVAL_DATASET_LOCK,
): string {
  return path.join(cacheRoot, lock.datasetVersion);
}
