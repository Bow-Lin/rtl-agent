import path from "node:path";

import { Sha256DigestSchema } from "@rtl-agent/contracts";
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
  datasetVersion: "c74fe7d28-r2",
  sourceRepository: "https://github.com/zhongkaiyu/ChipBench.git",
  sourceCommit: "74fe7d283225ae030ef59326a06111c9d372b48e",
  archiveUrl:
    "https://codeload.github.com/zhongkaiyu/ChipBench/tar.gz/74fe7d283225ae030ef59326a06111c9d372b48e",
  archiveRoot: "ChipBench-74fe7d283225ae030ef59326a06111c9d372b48e",
  archiveDigest: Sha256DigestSchema.parse(
    "sha256:03dc173f64ee2e7f0860222850a6c71db9714a3f529038cbb7cdb75807ae6d68",
  ),
  contentManifestDigest: Sha256DigestSchema.parse(
    "sha256:e30a2947718f958f25ef63b1bad981c24e8837563d4dcbddeb0bf116547aa5c9",
  ),
  expectedFileCount: 683,
  expectedCaseCount: 223,
  providerImplementationDigest: Sha256DigestSchema.parse(
    "sha256:a00cea795fc1388ad76c135250924364665ca6ac9533d19f5f4d54b8a571a15c",
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
    adapterVersion: "v2.0.0",
    normalizationVersion: "prompt-only-v2",
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
