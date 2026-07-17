import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  CoreLoopRunProfileSchema,
  CreateRunRequestSchema,
  FIXED_ICARUS_PROFILE_ID,
  IncludeDirectiveScanner,
  NormalizedFixtureSchema,
  RunIdSchema,
  createBaselineWorkspaceManifest,
  prepareCompileRequest,
} from "../src/index.js";
import type { CoreLoopRun } from "../src/index.js";
import { CASE_DIGEST, CASE_REF } from "./fixtures.js";

const temporaryRoots = new Set<string>();

afterEach(async () => {
  await Promise.all(
    [...temporaryRoots].map(async (root) => {
      await rm(root, { recursive: true, force: true });
      temporaryRoots.delete(root);
    }),
  );
});

async function createRun(sources: Readonly<Record<string, string>>): Promise<CoreLoopRun> {
  const root = await mkdtemp(path.join(os.tmpdir(), "rtl-prepare-test-"));
  temporaryRoots.add(root);
  const runId = RunIdSchema.parse("run_123e4567-e89b-42d3-a456-426614174000");
  const runDirectory = path.join(root, runId);
  const workspaceDirectory = path.join(runDirectory, "workspace");
  await mkdir(path.join(workspaceDirectory, "rtl"), { recursive: true });
  await writeFile(path.join(workspaceDirectory, "spec.md"), "Create dut\n");
  for (const [logicalPath, contents] of Object.entries(sources)) {
    const target = path.join(workspaceDirectory, ...logicalPath.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, contents);
  }
  const request = CreateRunRequestSchema.parse({
    schemaVersion: 1,
    caseRef: CASE_REF,
    profile: CoreLoopRunProfileSchema.parse({
      schemaVersion: 1,
      profileId: "compile-repair-v1",
      compilerProfileId: FIXED_ICARUS_PROFILE_ID,
      maxAttempts: 3,
      stdoutLimitBytes: 65_536,
      stderrLimitBytes: 65_536,
      maximumIssues: 50,
      issueMessageLimitBytes: 500,
    }),
  });
  const fixture = NormalizedFixtureSchema.parse({
    schemaVersion: 1,
    fixtureId: CASE_REF.fixtureId,
    provenance: {
      identity: CASE_REF.identity,
      caseSourceDigest: CASE_DIGEST,
      license: { name: "Synthetic" },
      adapter: {
        adapterId: "test-adapter",
        adapterVersion: "v1",
        normalizationVersion: "v1",
      },
    },
    specPath: "spec.md",
    workspaceRtlRoot: "rtl",
    topModule: "dut",
    tags: [],
    normalizedFixtureDigest: CASE_DIGEST,
    category: "BLANK_GENERATION",
  });
  const baselineManifest = await createBaselineWorkspaceManifest(runDirectory);
  return {
    runId,
    runDirectory,
    workspaceDirectory,
    fixture,
    request,
    baselineManifest,
    baselineWorkspaceManifestDigest: baselineManifest.manifestDigest,
    cleanupWarnings: [],
  };
}

describe("R03 compile preparation", () => {
  it("returns a stable READY request with ordinal source ordering", async () => {
    const run = await createRun({
      "rtl/z.sv": "module z; endmodule\n",
      "rtl/a.v": "module dut; z child(); endmodule\n",
    });
    const result = await prepareCompileRequest(run, 0);
    expect(result.status).toBe("READY");
    if (result.status === "READY") {
      expect(result.request.sourceFiles).toEqual(["rtl/a.v", "rtl/z.sv"]);
      expect(result.request.workspaceManifestDigest).toBe(
        (await createBaselineWorkspaceManifest(run.runDirectory)).manifestDigest,
      );
    }
  });

  it("does not invoke a compiler for empty, include, or extension failures", async () => {
    expect((await prepareCompileRequest(await createRun({}), 1)).status).toBe("NO_RTL_SOURCE");
    expect(
      (
        await prepareCompileRequest(
          await createRun({ "rtl/dut.sv": '`include "defs.svh"\nmodule dut; endmodule\n' }),
          1,
        )
      ).status,
    ).toBe("UNSUPPORTED_INCLUDE_DIRECTIVE");
    expect(
      (
        await prepareCompileRequest(
          await createRun({ "rtl/dut.sv": "module dut; endmodule\n", "rtl/readme.txt": "x" }),
          1,
        )
      ).status,
    ).toBe("SOURCE_POLICY_VIOLATION");
  });

  it("tracks directives across chunks without matching comments or strings", () => {
    const scanner = new IncludeDirectiveScanner();
    scanner.push(Buffer.from('// `include "ignored.svh"\n"`include ignored"\n/* `incl'));
    scanner.push(Buffer.from('ude "ignored.svh" */\n`inc'));
    expect(scanner.push(Buffer.from('lude "real.svh"\n'))).toBe(true);

    const commentsOnly = new IncludeDirectiveScanner();
    commentsOnly.push(Buffer.from('// `include "ignored"\n/* `include "ignored" */'));
    expect(commentsOnly.finish()).toBe(false);

    const escapedNewline = new IncludeDirectiveScanner();
    escapedNewline.push(Buffer.from('"unterminated\\\n`include "real.svh"\n'));
    expect(escapedNewline.finish()).toBe(true);
  });
});
