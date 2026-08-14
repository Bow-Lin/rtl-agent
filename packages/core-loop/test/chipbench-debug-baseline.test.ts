import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  CHIPBENCH_DATASET_LOCK,
  DatasetDescriptorSchema,
  FixtureCaseRefSchema,
  FixtureMaterializationSchema,
  prepareChipBenchDebugBaseline,
  sha256Bytes,
} from "../src/index.js";
import type {
  DatasetSelection,
  FixtureCaseRef,
  FixtureProvider,
  HostDirectory,
} from "../src/index.js";
import { ScriptedCompilerAdapter, TEST_COMPILER_CAPABILITY } from "./evaluation-test-fixtures.js";

const roots: string[] = [];
const providerDigest = sha256Bytes(Buffer.from("seeded-debug-test-provider"));
const emptyOutput = { preview: "", truncated: false, originalByteLength: 0 } as const;

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

class DebugBaselineTestProvider implements FixtureProvider {
  private readonly cases = Array.from({ length: 30 }, (_, index) =>
    FixtureCaseRefSchema.parse({
      schemaVersion: 1,
      fixtureId: `cb-d0n-p${String(index + 1).padStart(3, "0")}`,
      identity: {
        datasetId: CHIPBENCH_DATASET_LOCK.datasetId,
        datasetVersion: CHIPBENCH_DATASET_LOCK.datasetVersion,
        split: "debug-zero-shot-assignment",
        caseId: `Prob${String(index + 1).padStart(3, "0")}_synthetic`,
      },
      caseSourceDigest: sha256Bytes(Buffer.from(`case-${String(index + 1)}`)),
    }),
  );

  public async describe() {
    return DatasetDescriptorSchema.parse({
      schemaVersion: 1,
      datasetId: CHIPBENCH_DATASET_LOCK.datasetId,
      datasetVersion: CHIPBENCH_DATASET_LOCK.datasetVersion,
      datasetSourceDigest: CHIPBENCH_DATASET_LOCK.contentManifestDigest,
      license: CHIPBENCH_DATASET_LOCK.license,
      adapter: CHIPBENCH_DATASET_LOCK.adapter,
      splits: CHIPBENCH_DATASET_LOCK.splits.map((entry) => entry.split),
    });
  }

  public async *listCases(selection: DatasetSelection): AsyncIterable<FixtureCaseRef> {
    if (selection.split !== "debug-zero-shot-assignment") return;
    const requested = selection.caseIds === undefined ? undefined : new Set(selection.caseIds);
    for (const caseRef of this.cases) {
      if (requested === undefined || requested.has(caseRef.identity.caseId)) yield caseRef;
    }
  }

  public async materialize(caseRef: FixtureCaseRef, destination: HostDirectory) {
    await mkdir(path.join(destination, "rtl"));
    await writeFile(path.join(destination, "prompt.txt"), "Repair the existing TopModule.\n");
    await writeFile(
      path.join(destination, "rtl", "dut.sv"),
      "module TopModule(input logic a, output logic y); assign y = 1'b0; endmodule\n",
    );
    return FixtureMaterializationSchema.parse({
      schemaVersion: 1,
      fixtureId: caseRef.fixtureId,
      identity: caseRef.identity,
      caseSourceDigest: caseRef.caseSourceDigest,
      category: "SEEDED_FUNCTIONAL_REPAIR",
      specPath: "prompt.txt",
      starterRtlRoot: "rtl",
      topModule: "TopModule",
      tags: ["chipbench", "debug-zero-shot-assignment", "seeded-functional-repair"].sort(),
    });
  }

  public async materializeVerification(_caseRef: FixtureCaseRef, destination: HostDirectory) {
    await writeFile(path.join(destination, "reference.sv"), "module RefModule; endmodule\n");
    await writeFile(path.join(destination, "testbench.sv"), "module tb; endmodule\n");
    return {
      referenceLogicalPath: "reference.sv" as const,
      testbenchLogicalPath: "testbench.sv" as const,
      testbenchTopModule: "tb" as const,
    };
  }
}

describe("ChipBench seeded Debug baseline cache", () => {
  it("publishes one content-bound mismatch baseline and reuses it", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "rtl-agent-debug-baseline-test-"));
    roots.push(root);
    const vvpExecutable = path.join(root, process.platform === "win32" ? "vvp.exe" : "vvp");
    await writeFile(vvpExecutable, "synthetic-vvp");
    let processCalls = 0;
    const options = {
      provider: new DebugBaselineTestProvider(),
      split: "debug-zero-shot-assignment" as const,
      compilerAdapter: new ScriptedCompilerAdapter([], TEST_COMPILER_CAPABILITY),
      providerImplementationDigest: providerDigest,
      cacheRoot: path.join(root, "cache"),
      iverilogExecutable: path.join(
        root,
        process.platform === "win32" ? "iverilog.exe" : "iverilog",
      ),
      vvpExecutable,
      functionalProcessRunner: async () => {
        processCalls += 1;
        return processCalls % 2 === 1
          ? {
              exitCode: 0,
              signal: null,
              timedOut: false,
              terminationFailed: false,
              closeConfirmed: true,
              durationMs: 1,
              stdout: emptyOutput,
              stderr: emptyOutput,
            }
          : {
              exitCode: 0,
              signal: null,
              timedOut: false,
              terminationFailed: false,
              closeConfirmed: true,
              durationMs: 1,
              stdout: {
                preview: "Mismatches: 1 in 10 samples\n",
                truncated: false,
                originalByteLength: Buffer.byteLength("Mismatches: 1 in 10 samples\n"),
              },
              stderr: emptyOutput,
            };
      },
    };

    const first = await prepareChipBenchDebugBaseline(options);
    expect(first).toMatchObject({ reused: false, manifest: { cases: { length: 30 } } });
    expect(processCalls).toBe(60);
    const second = await prepareChipBenchDebugBaseline(options);
    expect(second).toMatchObject({
      reused: true,
      manifest: { manifestDigest: first.manifest.manifestDigest },
    });
    expect(processCalls).toBe(60);
  });
});
