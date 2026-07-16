import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  CoreLoopException,
  FileManifestSchema,
  assertAllowedRunChanges,
  assertNoLogicalPathCollisions,
  checkAllowedRunChanges,
  createAttemptRunManifest,
  createBaselineWorkspaceManifest,
  createFileManifest,
  sha256Jcs,
} from "../src/index.js";

const roots: string[] = [];

async function makeRun(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "rtl-agent-r01-manifest-"));
  roots.push(root);
  await mkdir(path.join(root, "workspace", "context"), { recursive: true });
  await mkdir(path.join(root, "workspace", "rtl"), { recursive: true });
  await mkdir(path.join(root, "evidence"), { recursive: true });
  await writeFile(path.join(root, "workspace", "spec.md"), "spec\n");
  await writeFile(path.join(root, "workspace", "context", "agent-input.json"), "{}\n");
  await writeFile(path.join(root, "workspace", "rtl", "dut.sv"), "module dut; endmodule\n");
  await writeFile(path.join(root, "evidence", "run-request.json"), "{}\n");
  return root;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("manifest scopes and write policy", () => {
  it("hashes raw bytes into a stable JCS manifest and scopes the baseline", async () => {
    const run = await makeRun();
    const first = await createBaselineWorkspaceManifest(run);
    expect(first.entries.map((entry) => entry.path)).toEqual([
      "workspace/rtl/dut.sv",
      "workspace/spec.md",
    ]);
    await writeFile(path.join(run, "workspace", "context", "agent-input.json"), '{"attempt":1}\n');
    await writeFile(path.join(run, "evidence", "run-request.json"), '{"changed":true}\n');
    const second = await createBaselineWorkspaceManifest(run);
    expect(second.manifestDigest).toBe(first.manifestDigest);

    await writeFile(path.join(run, "workspace", "rtl", "dut.sv"), "module dut;\r\nendmodule\r\n");
    const third = await createBaselineWorkspaceManifest(run);
    expect(third.manifestDigest).not.toBe(first.manifestDigest);
  });

  it("allows only net changes below workspace/rtl across the entire run root", async () => {
    const run = await makeRun();
    const before = await createAttemptRunManifest(run);
    await writeFile(
      path.join(run, "workspace", "rtl", "dut.sv"),
      "module dut; assign y=a; endmodule\n",
    );
    await writeFile(path.join(run, "workspace", "rtl", "helper.sv"), "module helper; endmodule\n");
    const allowed = await createAttemptRunManifest(run);
    expect(checkAllowedRunChanges(before, allowed)).toMatchObject({ ok: true });
    expect(() => assertAllowedRunChanges(before, allowed)).not.toThrow();

    await writeFile(path.join(run, "workspace", "spec.md"), "tampered\n");
    await writeFile(path.join(run, "evidence", "intrusion.txt"), "tampered\n");
    const forbidden = await createAttemptRunManifest(run);
    const result = checkAllowedRunChanges(allowed, forbidden);
    expect(result.ok).toBe(false);
    expect(result.violations.map((change) => change.path)).toEqual([
      "evidence/intrusion.txt",
      "workspace/spec.md",
    ]);
    expect(() => assertAllowedRunChanges(allowed, forbidden)).toThrow(CoreLoopException);
  });

  it("rejects Unicode-normalized and case-folded path collisions", () => {
    expect(() => assertNoLogicalPathCollisions(["rtl/Dut.sv", "rtl/dut.sv"])).toThrowError(
      /collide/,
    );
    expect(() => assertNoLogicalPathCollisions(["rtl/café.sv", "rtl/café.sv"])).toThrowError(
      /collide/,
    );
  });

  it.each([
    ["rtl/Dut.sv", "rtl/dut.sv"],
    ["rtl/café.sv", "rtl/café.sv"],
  ])("rejects colliding paths at the manifest schema boundary", (first, second) => {
    const entries = [first, second]
      .sort()
      .map((path_) => ({ path: path_, byteLength: 1, contentDigest: `sha256:${"a".repeat(64)}` }));
    expect(
      FileManifestSchema.safeParse({
        schemaVersion: 1,
        entries,
        manifestDigest: sha256Jcs(entries),
      }).success,
    ).toBe(false);
  });

  it("rejects symlinks or Windows junctions instead of following them", async () => {
    const run = await makeRun();
    const target = path.join(run, "outside");
    await mkdir(target);
    const link = path.join(run, "workspace", "rtl", "linked");
    await symlink(target, link, process.platform === "win32" ? "junction" : "dir");
    await expect(createFileManifest(run)).rejects.toMatchObject({
      error: { code: "PATH_POLICY_VIOLATION" },
    });
  });
});
