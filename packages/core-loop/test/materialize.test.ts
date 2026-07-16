import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  CoreLoopException,
  RunIdSchema,
  createCoreLoopRun,
  readRunEvidenceJson,
} from "../src/index.js";
import { CASE_REF, RUN_REQUEST, TestFixtureProvider, requestWithCaseRef } from "./fixtures.js";

const roots: string[] = [];

async function temporaryRoot(): Promise<string> {
  const root = await import("node:fs/promises").then(({ mkdtemp }) =>
    mkdtemp(path.join(os.tmpdir(), "rtl-agent-r01-test-")),
  );
  roots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("dataset fixture staging and run publication", () => {
  it("fails closed when no provider is configured", async () => {
    const root = await temporaryRoot();
    await expect(
      createCoreLoopRun(undefined, RUN_REQUEST, { runsRoot: path.join(root, "runs") }),
    ).rejects.toMatchObject({
      error: { code: "DATASET_NOT_CONFIGURED" },
    });
  });

  it("normalizes a seeded dataset case into a fresh run without leaking host paths", async () => {
    const root = await temporaryRoot();
    const run = await createCoreLoopRun(new TestFixtureProvider(), RUN_REQUEST, {
      runsRoot: path.join(root, "runs"),
      stagingRoot: path.join(root, "staging"),
    });

    await expect(readFile(path.join(run.workspaceDirectory, "spec.md"), "utf8")).resolves.toContain(
      "Create module dut",
    );
    await expect(
      readFile(path.join(run.workspaceDirectory, "rtl", "dut.sv"), "utf8"),
    ).resolves.toContain("BROKEN");
    expect(run.fixture.category).toBe("SEEDED_COMPILE_REPAIR");
    if (run.fixture.category === "SEEDED_COMPILE_REPAIR") {
      expect(run.fixture.starterRtlDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
    }
    const fixtureEvidence = await readRunEvidenceJson(
      run,
      "evidence/fixture.json" as Parameters<typeof readRunEvidenceJson>[1],
    );
    const serialized = JSON.stringify(fixtureEvidence);
    expect(serialized).not.toContain(root);
    expect(serialized).not.toMatch(/[A-Za-z]:\\/);
  });

  it("creates distinct runs with identical normalized and baseline digests", async () => {
    const root = await temporaryRoot();
    const options = {
      runsRoot: path.join(root, "runs"),
      stagingRoot: path.join(root, "staging"),
    };
    const first = await createCoreLoopRun(new TestFixtureProvider(), RUN_REQUEST, options);
    const second = await createCoreLoopRun(new TestFixtureProvider(), RUN_REQUEST, options);
    expect(first.runId).not.toBe(second.runId);
    expect(first.runDirectory).not.toBe(second.runDirectory);
    expect(first.fixture.normalizedFixtureDigest).toBe(second.fixture.normalizedFixtureDigest);
    expect(first.baselineManifest.manifestDigest).toBe(second.baselineManifest.manifestDigest);
    expect(first.cleanupWarnings).toEqual([]);
    expect(second.cleanupWarnings).toEqual([]);
  });

  it("does not rewrite a published run as failed when staging cleanup fails", async () => {
    const root = await temporaryRoot();
    let cleanupAttempted = false;
    const run = await createCoreLoopRun(new TestFixtureProvider(), RUN_REQUEST, {
      runsRoot: path.join(root, "runs"),
      stagingRoot: path.join(root, "staging"),
      removeStagingDirectory: async () => {
        cleanupAttempted = true;
        throw new Error("injected cleanup failure");
      },
    });

    expect(cleanupAttempted).toBe(true);
    expect(run.cleanupWarnings).toEqual(["STAGING_CLEANUP_FAILED"]);
    await expect(readFile(path.join(run.workspaceDirectory, "spec.md"), "utf8")).resolves.toContain(
      "Create module dut",
    );
  });

  it("does not overwrite an existing run ID", async () => {
    const root = await temporaryRoot();
    const runId = RunIdSchema.parse("run_123e4567-e89b-42d3-a456-426614174000");
    const options = {
      runsRoot: path.join(root, "runs"),
      stagingRoot: path.join(root, "staging"),
      runIdFactory: () => runId,
    };
    await createCoreLoopRun(new TestFixtureProvider(), RUN_REQUEST, options);
    await expect(
      createCoreLoopRun(new TestFixtureProvider(), RUN_REQUEST, options),
    ).rejects.toMatchObject({ error: { code: "RUN_ALREADY_EXISTS" } });
  });

  it("fails closed on mismatched provenance and undeclared files", async () => {
    const root = await temporaryRoot();
    await expect(
      createCoreLoopRun(new TestFixtureProvider({ mismatchedProvenance: true }), RUN_REQUEST, {
        runsRoot: path.join(root, "runs-a"),
        stagingRoot: path.join(root, "staging-a"),
      }),
    ).rejects.toMatchObject({ error: { code: "DATASET_PROVENANCE_INVALID" } });
    await expect(
      createCoreLoopRun(new TestFixtureProvider({ extraFile: true }), RUN_REQUEST, {
        runsRoot: path.join(root, "runs-b"),
        stagingRoot: path.join(root, "staging-b"),
      }),
    ).rejects.toMatchObject({ error: { code: "FIXTURE_INVALID" } });
  });

  it("rejects a case reference that does not match the descriptor", async () => {
    const root = await temporaryRoot();
    const different = {
      ...CASE_REF,
      identity: { ...CASE_REF.identity, datasetVersion: "v2.0.0" },
    } as typeof CASE_REF;
    await expect(
      createCoreLoopRun(new TestFixtureProvider(), requestWithCaseRef(different), {
        runsRoot: path.join(root, "runs"),
      }),
    ).rejects.toMatchObject({ error: { code: "DATASET_PROVENANCE_INVALID" } });
  });

  it("leaves an existing target untouched after collision", async () => {
    const root = await temporaryRoot();
    const runId = RunIdSchema.parse("run_123e4567-e89b-42d3-a456-426614174000");
    const target = path.join(root, "runs", runId);
    await mkdir(target, { recursive: true });
    await writeFile(path.join(target, "sentinel.txt"), "keep\n");
    await expect(
      createCoreLoopRun(new TestFixtureProvider(), RUN_REQUEST, {
        runsRoot: path.join(root, "runs"),
        runIdFactory: () => runId,
      }),
    ).rejects.toBeInstanceOf(CoreLoopException);
    await expect(readFile(path.join(target, "sentinel.txt"), "utf8")).resolves.toBe("keep\n");
  });
});
