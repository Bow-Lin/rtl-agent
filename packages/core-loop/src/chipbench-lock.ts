import path from "node:path";

import { LogicalPathSchema, Sha256DigestSchema } from "@rtl-agent/contracts";
import type { Sha256Digest } from "@rtl-agent/contracts";

export type ChipBenchSplit =
  | "cpu-ip"
  | "debug-one-shot-arithmetic"
  | "debug-one-shot-assignment"
  | "debug-one-shot-state-machine"
  | "debug-one-shot-timing"
  | "debug-zero-shot-arithmetic"
  | "debug-zero-shot-assignment"
  | "debug-zero-shot-state-machine"
  | "debug-zero-shot-timing"
  | "not-self-contained"
  | "self-contained";

export interface ChipBenchSplitLock {
  readonly split: ChipBenchSplit;
  readonly datasetDirectory: string;
  readonly expectedCaseCount: number;
  readonly fixturePrefix: string;
  readonly category: "BLANK_GENERATION" | "PROMPTED_FUNCTIONAL_REPAIR";
}

export interface ChipBenchPreparationPatch {
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

export interface ChipBenchDatasetLock {
  readonly schemaVersion: 1;
  readonly datasetId: "zhongkaiyu-chipbench";
  readonly datasetVersion: string;
  readonly sourceRepository: string;
  readonly sourceCommit: string;
  readonly archiveUrl: string;
  readonly archiveRoot: string;
  readonly archiveDigest: Sha256Digest;
  readonly contentManifestDigest: Sha256Digest;
  readonly expectedFileCount: number;
  readonly expectedCaseCount: number;
  readonly preparationPatches: readonly ChipBenchPreparationPatch[];
  readonly providerImplementationDigest: Sha256Digest;
  readonly splits: readonly ChipBenchSplitLock[];
  readonly license: {
    readonly name: string;
    readonly spdxId: "MIT";
    readonly reference: string;
  };
  readonly adapter: {
    readonly adapterId: "chipbench";
    readonly adapterVersion: string;
    readonly normalizationVersion: string;
  };
}

export const CHIPBENCH_DATASET_LOCK = Object.freeze({
  schemaVersion: 1,
  datasetId: "zhongkaiyu-chipbench",
  datasetVersion: "c74fe7d28-r5",
  sourceRepository: "https://github.com/zhongkaiyu/ChipBench.git",
  sourceCommit: "74fe7d283225ae030ef59326a06111c9d372b48e",
  archiveUrl:
    "https://codeload.github.com/zhongkaiyu/ChipBench/tar.gz/74fe7d283225ae030ef59326a06111c9d372b48e",
  archiveRoot: "ChipBench-74fe7d283225ae030ef59326a06111c9d372b48e",
  archiveDigest: Sha256DigestSchema.parse(
    "sha256:03dc173f64ee2e7f0860222850a6c71db9714a3f529038cbb7cdb75807ae6d68",
  ),
  contentManifestDigest: Sha256DigestSchema.parse(
    "sha256:faaadfbe3d459eba8f87e98c9040902278c7baca99997a7d6ae0012299d2291c",
  ),
  expectedFileCount: 683,
  expectedCaseCount: 223,
  preparationPatches: Object.freeze([
    Object.freeze({
      patchId: "debug-zero-shot-timing-prob013-mcd-output-reg-v1",
      logicalPath: LogicalPathSchema.parse(
        "Verilog Debugging/dataset_debug_zero_shot_timing/Prob013_least_common_multiple_prompt.txt",
      ),
      sourceDigest: Sha256DigestSchema.parse(
        "sha256:5118d821118e2b059b656102561de82f85c496067d393017fc67fabe37cb51a9",
      ),
      resultDigest: Sha256DigestSchema.parse(
        "sha256:a548bf669e03415f3600054619d9c268fef88bc434c6419423e0e9ac634676df",
      ),
      replacements: Object.freeze([
        Object.freeze({
          from: "output  wire   [DATA_W-1:0]            mcd_out,",
          to: "output  reg    [DATA_W-1:0]            mcd_out,",
          expectedOccurrences: 1,
        }),
      ]),
    }),
    Object.freeze({
      patchId: "debug-zero-shot-timing-prob016-clock-output-reg-v1",
      logicalPath: LogicalPathSchema.parse(
        "Verilog Debugging/dataset_debug_zero_shot_timing/Prob016_odd-number_division_with_a_duty_cycle_of_half_prompt.txt",
      ),
      sourceDigest: Sha256DigestSchema.parse(
        "sha256:e788de0b320a4dd15057547d37cd776458508a1281bf93aab47bc25c3c619235",
      ),
      resultDigest: Sha256DigestSchema.parse(
        "sha256:68d790b950a0fde82d57aa70565e9f6e2d6662271ca5bf452ef56cbf0136ca5f",
      ),
      replacements: Object.freeze([
        Object.freeze({
          from: "output   wire  clk_out7",
          to: "output   reg   clk_out7",
          expectedOccurrences: 1,
        }),
        Object.freeze({
          from: "always @(posedge clk or negedge rst_n)",
          to: "always @(posedge clk_in or negedge rst)",
          expectedOccurrences: 1,
        }),
        Object.freeze({ from: "if (!rst_n)", to: "if (!rst)", expectedOccurrences: 1 }),
      ]),
    }),
    Object.freeze({
      patchId: "debug-zero-shot-timing-prob022-negedge-write-pointer-v1",
      logicalPath: LogicalPathSchema.parse(
        "Verilog Debugging/dataset_debug_zero_shot_timing/Prob022_synchronous_FIFO_prompt.txt",
      ),
      sourceDigest: Sha256DigestSchema.parse(
        "sha256:af11f61421104688eee7d0dd17a9bce70295d1328efb7ae1da67144efbfa95f5",
      ),
      resultDigest: Sha256DigestSchema.parse(
        "sha256:61db4b57807b0808e909f6090026e03b26b54b3338caa765f0959ae4439dfd9c",
      ),
      replacements: Object.freeze([
        Object.freeze({
          from: "always @(*) begin",
          to: "always @(negedge clk or negedge rst_n) begin",
          expectedOccurrences: 1,
        }),
      ]),
    }),
  ]),
  providerImplementationDigest: Sha256DigestSchema.parse(
    "sha256:49399b411eb7a032d2ab98f73d880eadbb5c82ba1e87581198eb6a8ab5dec684",
  ),
  splits: Object.freeze([
    Object.freeze({
      split: "cpu-ip",
      datasetDirectory: "Verilog Gen/dataset_cpu_ip",
      expectedCaseCount: 9,
      fixturePrefix: "cb-cpu",
      category: "BLANK_GENERATION",
    }),
    Object.freeze({
      split: "debug-one-shot-arithmetic",
      datasetDirectory: "Verilog Debugging/dataset_debug_one_shot_arithmetic",
      expectedCaseCount: 24,
      fixturePrefix: "cb-d1a",
      category: "PROMPTED_FUNCTIONAL_REPAIR",
    }),
    Object.freeze({
      split: "debug-one-shot-assignment",
      datasetDirectory: "Verilog Debugging/dataset_debug_one_shot_assignment",
      expectedCaseCount: 30,
      fixturePrefix: "cb-d1n",
      category: "PROMPTED_FUNCTIONAL_REPAIR",
    }),
    Object.freeze({
      split: "debug-one-shot-state-machine",
      datasetDirectory: "Verilog Debugging/dataset_debug_one_shot_state_machine",
      expectedCaseCount: 6,
      fixturePrefix: "cb-d1s",
      category: "PROMPTED_FUNCTIONAL_REPAIR",
    }),
    Object.freeze({
      split: "debug-one-shot-timing",
      datasetDirectory: "Verilog Debugging/dataset_debug_one_shot_timing",
      expectedCaseCount: 29,
      fixturePrefix: "cb-d1t",
      category: "PROMPTED_FUNCTIONAL_REPAIR",
    }),
    Object.freeze({
      split: "debug-zero-shot-arithmetic",
      datasetDirectory: "Verilog Debugging/dataset_debug_zero_shot_arithmetic",
      expectedCaseCount: 24,
      fixturePrefix: "cb-d0a",
      category: "PROMPTED_FUNCTIONAL_REPAIR",
    }),
    Object.freeze({
      split: "debug-zero-shot-assignment",
      datasetDirectory: "Verilog Debugging/dataset_debug_zero_shot_assignment",
      expectedCaseCount: 30,
      fixturePrefix: "cb-d0n",
      category: "PROMPTED_FUNCTIONAL_REPAIR",
    }),
    Object.freeze({
      split: "debug-zero-shot-state-machine",
      datasetDirectory: "Verilog Debugging/dataset_debug_zero_shot_state_machine",
      expectedCaseCount: 6,
      fixturePrefix: "cb-d0s",
      category: "PROMPTED_FUNCTIONAL_REPAIR",
    }),
    Object.freeze({
      split: "debug-zero-shot-timing",
      datasetDirectory: "Verilog Debugging/dataset_debug_zero_shot_timing",
      expectedCaseCount: 29,
      fixturePrefix: "cb-d0t",
      category: "PROMPTED_FUNCTIONAL_REPAIR",
    }),
    Object.freeze({
      split: "not-self-contained",
      datasetDirectory: "Verilog Gen/dataset_not_self_contain",
      expectedCaseCount: 6,
      fixturePrefix: "cb-nsc",
      category: "BLANK_GENERATION",
    }),
    Object.freeze({
      split: "self-contained",
      datasetDirectory: "Verilog Gen/dataset_self_contain",
      expectedCaseCount: 30,
      fixturePrefix: "cb-sc",
      category: "BLANK_GENERATION",
    }),
  ]),
  license: Object.freeze({
    name: "MIT License",
    spdxId: "MIT",
    reference:
      "https://github.com/zhongkaiyu/ChipBench/blob/74fe7d283225ae030ef59326a06111c9d372b48e/LICENSE",
  }),
  adapter: Object.freeze({
    adapterId: "chipbench",
    adapterVersion: "v2.3.0",
    normalizationVersion: "prompt-only-v5-timing-starter-normalization-v1",
  }),
} satisfies ChipBenchDatasetLock);

export function chipBenchCacheRoot(repositoryRoot: string): string {
  return path.join(repositoryRoot, ".rtl-agent", "datasets", "chipbench");
}

export function chipBenchDatasetDirectory(
  cacheRoot: string,
  lock: ChipBenchDatasetLock = CHIPBENCH_DATASET_LOCK,
): string {
  return path.join(cacheRoot, lock.datasetVersion);
}
