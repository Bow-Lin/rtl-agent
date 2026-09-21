import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { logicalPath, validateConfig, familyCandidates } from "./family-preparation.ts";
import type { FamilyConfig } from "./family-preparation.ts";
import { applyCandidate, patchFor, sha } from "./fifo-candidates.ts";

function config(source: string): FamilyConfig {
  return {
    id: "test-ip",
    family: "uart",
    role: "unassigned",
    root: "fixtures/test-ip",
    module: "dut",
    revision: "a".repeat(40),
    reference: "https://example.invalid/repo",
    license: "test",
    licenseEvidence: [],
    files: { "rtl/dut.v": sha(source) },
    units: ["rtl/dut.v"],
    dut: "rtl/dut.v",
    tb: "fixtures/tb.sv",
    defines: [],
    mutationFiles: { "rtl/dut.v": [[1, 20]] },
    specification: "test",
    ancestry: "test",
    policyVersion: 2,
  };
}

test("logical paths reject Windows/Posix absolute paths, traversal and ambiguous components", () => {
  const root = process.cwd();
  for (const value of [
    "C:/tmp/a",
    "C:relative",
    "//server/share",
    "/tmp/a",
    "a\\b",
    "../x",
    "a/../b",
    "a//b",
    "a/./b",
    "a./b",
    "a /b",
    "a\0b",
  ])
    assert.throws(() => logicalPath(root, value), value);
  assert.equal(logicalPath(root, "rtl/dut.v"), path.join(root, "rtl", "dut.v"));
});
test("config refuses case aliases, unlocked compile/mutation files and premature role assignment", () => {
  const c = config("module dut; endmodule\n");
  validateConfig(c);
  assert.throws(() => validateConfig({ ...c, files: { ...c.files, "rtl/DUT.v": sha("other") } }));
  assert.throws(() => validateConfig({ ...c, files: { ...c.files, "RTL/other.v": sha("other") } }));
  assert.throws(() => validateConfig({ ...c, units: ["elsewhere.v"] }));
  assert.throws(() => validateConfig({ ...c, mutationFiles: { "hidden.v": [[1, 2]] } }));
  assert.throws(() => validateConfig({ ...c, role: "source" } as unknown as FamilyConfig));
});
test("mutation candidates exclude block comments and deterministically reconstruct exactly one line", () => {
  const source =
    "module dut;\n/*\nif (bad == 1'b0)\n*/\nassign out = a ^ b; // if (bad)\nalways @(posedge clk) if (enable) state <= data;\nendmodule\n";
  const c = config(source),
    originals = new Map([["rtl/dut.v", Buffer.from(source)]]);
  const first = familyCandidates(c, originals);
  assert.ok(first.length > 0);
  assert.deepEqual(first, familyCandidates(c, originals));
  assert.ok(first.every((item) => item.line === 5 || item.line === 6));
  for (const item of first) {
    const changed = applyCandidate(source, item).split("\n");
    assert.equal(changed.filter((line, i) => line !== source.split("\n")[i]).length, 1);
    assert.ok(patchFor(item.file, item).startsWith("--- a/rtl/dut.v\n+++ b/rtl/dut.v\n"));
  }
});
