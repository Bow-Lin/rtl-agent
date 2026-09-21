import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyIcarus,
  icarusArgs,
  auditFamilyPublication,
  frozenPatchArgs,
} from "./family-replay.ts";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import type { ProcessEvidence } from "./family-replay.ts";

const marker = "IP_PREPARATION_PASS example checks=16";
const tb =
  'module tb;\nif (valid && actual !== expected) $fatal(1,"AES_DATA %h",actual);\nendmodule\n';
const passed: ProcessEvidence = {
  exitCode: 0,
  signal: null,
  error: null,
  cleanupConfirmed: true,
  stdout: marker + "\n",
  stderr: "",
  durationMs: 1,
};

test("survivor requires normal cleanup and an exact pass marker with no error", () => {
  assert.equal(classifyIcarus(passed, tb, marker).outcome, "survived");
  for (const changes of [
    { stdout: "prefix " + marker },
    { stdout: marker + " suffix" },
    { stderr: "ERROR: unexpected" },
    { stdout: "" },
  ])
    assert.equal(classifyIcarus({ ...passed, ...changes }, tb, marker).outcome, "unresolved");
});
test("a frozen checker failure stays pending semantic review and captures line/time", () => {
  const result = classifyIcarus(
    {
      ...passed,
      exitCode: 1,
      stdout: "FATAL: tb.sv:2: AES_DATA deadbeef\n Time: 125000 Scope: tb",
    },
    tb,
    marker,
  );
  assert.equal(result.outcome, "tb-failure");
  assert.equal(result.fatal?.line, 2);
  assert.equal(result.fatal?.time, "125000");
  assert.match(result.reason, /SEMANTIC_REVIEW/);
  for (const text of [
    "FATAL: dut.v:2: AES_DATA 1",
    "FATAL: tb.sv:20: AES_DATA 1",
    "FATAL: tb.sv:2: UNREVIEWED 1",
  ])
    assert.equal(
      classifyIcarus({ ...passed, exitCode: 1, stdout: text }, tb, marker).outcome,
      "runtime-error",
    );
});
test("host timeout, signal or unconfirmed cleanup cannot be a functional failure", () => {
  for (const changes of [
    { error: "TIMEOUT" },
    { signal: "SIGTERM" },
    { cleanupConfirmed: false },
    { error: "ENOENT" },
  ])
    assert.equal(
      classifyIcarus(
        { ...passed, exitCode: 1, stdout: "FATAL: tb.sv:2: AES_DATA 0", ...changes },
        tb,
        marker,
      ).outcome,
      "runtime-error",
    );
});
test("simulation-time watchdog is a review candidate, never an automatic kill", () => {
  const source = 'initial #100 $fatal(1,"GLOBAL_TIMEOUT");';
  assert.equal(
    classifyIcarus(
      { ...passed, exitCode: 1, stdout: "FATAL: tb.sv:1: GLOBAL_TIMEOUT" },
      source,
      marker,
    ).outcome,
    "tb-failure",
  );
});
test("Icarus configuration includes frozen units and defines without shell expansion", () => {
  assert.deepEqual(
    icarusArgs({
      files: { "rtl/a.v": "a", "rtl/b.v": "b" },
      defines: ["WIDTH=8"],
      units: ["rtl/a.v", "rtl/b.v"],
    }),
    [
      "-g2012",
      "-s",
      "tb",
      "-I",
      "rtl",
      "-DWIDTH=8",
      "-o",
      "sim.vvp",
      "rtl/a.v",
      "rtl/b.v",
      "tb.sv",
    ],
  );
});
test("all seven published fixtures retain their exact 190-mutant manifests and bytes", async () => {
  const a = await auditFamilyPublication(process.cwd());
  assert.equal(a.fixtures.length, 7);
  assert.equal(
    a.fixtures.reduce((n, f) => n + f.manifest.mutants.length, 0),
    190,
  );
  assert.equal(a.fixtures.find((f) => f.id === "osdvu")?.manifest.mutants.length, 10);
});

test("published patch preserves exact LF digest even when Git autocrlf is true", async () => {
  const parent = path.resolve(".rtl-agent", "family-replay-tests");
  await mkdir(parent, { recursive: true });
  const cwd = await mkdtemp(path.join(parent, "patch-"));
  const fixture = path.resolve("mutation", "uart-aes-transfer-v1", "uart", "uart16550");
  const m = JSON.parse(await readFile(path.join(fixture, "manifest.json"), "utf8"));
  const mutant = m.mutants[0];
  const file = path.join(cwd, ...mutant.file.split("/"));
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(
    file,
    await readFile(path.join(fixture, "golden-source", ...mutant.file.split("/"))),
  );
  const git =
    process.env.GIT_EXE ??
    (process.platform === "win32"
      ? path.join("C:", "Program Files", "Git", "cmd", "git.exe")
      : "git");
  for (const args of [
    ["init", "--quiet"],
    ["config", "core.autocrlf", "true"],
    frozenPatchArgs(path.join(fixture, "mutants", "M001.patch")),
  ]) {
    const r = spawnSync(git, args, {
      cwd,
      shell: false,
      windowsHide: true,
      encoding: "utf8",
      timeout: 10000,
    });
    assert.equal(r.status, 0, r.stderr);
  }
  assert.equal(
    createHash("sha256")
      .update(await readFile(file))
      .digest("hex"),
    mutant.mutatedDigest,
  );
});
