import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, realpath, lstat } from "node:fs/promises";
import path from "node:path";
import { recordedProcess } from "./family-process.ts";

// Post-hoc, known-mutant diagnosis only. No model calls or frozen-score updates.
const repo = await realpath(process.cwd());
const label = process.argv[2];
assert.match(label ?? "", /^[a-z0-9][a-z0-9-]{0,60}$/);
const sha = (b: string | Buffer) => createHash("sha256").update(b).digest("hex");
const readJson = async (p: string) => JSON.parse(await readFile(p, "utf8"));
const logical = (p: string) => path.relative(repo, p).split(path.sep).join("/");
const root = path.join(repo, ".rtl-agent", "fifo-diagnostics", label!);
const campaign = "fifo-target-recovery-20260917-153613";
const source = path.join(
  repo,
  ".rtl-agent",
  "fifo-replays",
  `${campaign}-dpretet-r2-off`,
  "baseline",
);
const publication = path.join(repo, "mutation", "fifo-transfer-v2", "dpretet");
const campaignPlan = await readJson(
  path.join(repo, ".rtl-agent", "fifo-target-campaigns", campaign, "plan.json"),
);
const suiteBytes = await readFile(path.join(repo, "mutation", "fifo-transfer-v2", "manifest.json"));
assert.equal(sha(suiteBytes), campaignPlan.suiteDigest);
assert.equal(
  sha(await readFile(path.join(publication, "manifest.json"))),
  JSON.parse(suiteBytes.toString()).ips.find((ip: { id: string }) => ip.id === "dpretet")
    .manifestDigest,
);
const manifest = await readJson(path.join(publication, "manifest.json"));
const mutant = manifest.mutants.find((m: { id: string }) => m.id === "M010");
assert.equal(mutant.file, "rtl/wptr_full.v");
assert.match(mutant.originalLine, /wfull\s*<=\s*1'b0/);
assert.match(mutant.mutatedLine, /wfull\s*<=\s*1'b1/);
const assets: { path: string; sha256: string }[] = await readJson(path.join(source, "assets.json"));
const bytes = new Map<string, Buffer>();
for (const entry of assets) {
  assert.match(entry.path, /^rtl\/(?:dut\/)?[a-z0-9_]+\.(sv|v)$/);
  const file = path.join(source, "golden", ...entry.path.split("/"));
  assert.equal(await realpath(file), file, "REDIRECTED_INPUT");
  assert.ok((await lstat(file)).isFile());
  const value = await readFile(file);
  assert.equal(sha(value), entry.sha256);
  bytes.set(entry.path, value);
}
const tb = bytes.get("rtl/tb.sv")!.toString();
assert.ok(!tb.includes("FULL_AND_EMPTY"));
const anchor = "      si_res_n=1;so_res_n=1;head=0;tail=0;";
assert.equal(tb.split(anchor).length, 2);
assert.ok(tb.includes("repeat(5) @(negedge so_clk);\n" + anchor));
const insertion =
  [
    "      // Diagnostic Memory10: both active-low resets have been held for five read cycles.",
    '      $display("RESET_ACTIVE_OBSERVE time=%0t wrst_n=%b rrst_n=%b full=%b empty=%b", $time, si_res_n, so_res_n, full, empty);',
    "      assert (si_res_n === 1'b0 && so_res_n === 1'b0) else $fatal(1,\"DIAGNOSTIC_RESET_WINDOW_INVALID\");",
    "      assert (full === 1'b0 && empty === 1'b1) else $fatal(1,\"RESET_ACTIVE_FLAG_VALUE\");",
  ].join("\n") + "\n";
const modifiedTb = tb.replace(anchor, insertion + anchor);
assert.equal(modifiedTb.replace(insertion, ""), tb);
const control: Record<string, unknown>[] = [];
for (const id of ["golden", "M010"]) {
  for (const [file, expected] of bytes) {
    const actual = await readFile(path.join(source, id, ...file.split("/")));
    if (id === "M010" && file === mutant.file) {
      const lines = expected.toString().split("\n");
      assert.equal(lines[mutant.line - 1], mutant.originalLine);
      lines[mutant.line - 1] = mutant.mutatedLine;
      assert.equal(sha(lines.join("\n")), mutant.mutatedDigest);
      assert.equal(
        actual.toString().replace(/\r\n?/g, "\n"),
        lines.join("\n").replace(/\r\n?/g, "\n"),
      );
    } else assert.equal(sha(actual), sha(expected), "HISTORICAL_CONTROL_ASSETS_CHANGED");
  }
  const result = await readJson(path.join(source, id, "result.json"));
  const simulation = await readJson(path.join(source, id, "simulation.json"));
  assert.equal(result.verdict, "survived");
  assert.equal(simulation.exitCode, 0);
  assert.match(simulation.stdout, /DPRETET_GOLDEN_PASS/);
  control.push({ id, result, simulation: logical(path.join(source, id, "simulation.json")) });
}
const pinned = [
  path.join(repo, ".rtl-agent", "verification-memory", "k3-build-20260917-100104", "items.json"),
  path.join(repo, ".rtl-agent", "verification-memory", "k3-build-20260917-100104", "manifest.json"),
  path.join(repo, "mutation", "fifo-transfer-v2", "manifest.json"),
  path.join(publication, "manifest.json"),
  ...assets.map((e) => path.join(source, "golden", ...e.path.split("/"))),
];
const done = await readJson(
  path.join(repo, ".rtl-agent", "fifo-target-campaigns", campaign, "complete.json"),
);
for (const c of done.completed) {
  pinned.push(path.join(repo, ".rtl-agent", "fifo-replays", c.name, "summary.json"));
  pinned.push(
    path.join(repo, ...c.run.split("/"), "evidence", "project-coverage-experiment-result.json"),
  );
}
const before = await Promise.all(
  pinned.map(async (p) => ({ path: logical(p), sha256: sha(await readFile(p)) })),
);
await mkdir(path.dirname(root), { recursive: true });
assert.equal(await realpath(path.dirname(root)), path.dirname(root), "REDIRECTED_OUTPUT_PARENT");
await mkdir(root); // Exclusive output: never overwrite a diagnostic.
assert.equal(await realpath(root), root, "REDIRECTED_OUTPUT");
const json = async (file: string, value: unknown) =>
  writeFile(path.join(root, file), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
await json("plan.json", {
  kind: "known-mutant-mechanism-diagnostic",
  authoritative: false,
  platform: process.platform,
  memoryUpdated: false,
  modelCalls: 0,
  sourceAssets: logical(path.join(source, "assets.json")),
  correctnessAuthority:
    "experiment-accepted pinned golden reset behavior; no independent external specification claim",
  intervention:
    "baseline TB only: one reset-active value oracle immediately before existing reset release",
  originalFullEmptyAssertionIncluded: false,
  control,
  insertion,
  preservedHashes: before,
});
await writeFile(path.join(root, "tb-added-lines.sv.txt"), insertion, { flag: "wx" });
const windows = process.platform === "win32";
const env = { ...process.env };
if (windows) {
  env.PATH = [
    path.join("C:", "msys64", "ucrt64", "bin"),
    path.join("C:", "msys64", "usr", "bin"),
    env.PATH ?? "",
  ].join(path.delimiter);
  env.VERILATOR_ROOT = path.join("C:", "msys64", "ucrt64", "share", "verilator");
}
const verilator = windows
  ? path.join("C:", "msys64", "ucrt64", "bin", "verilator_bin.exe")
  : "verilator";
const git = windows ? path.join("C:", "Program Files", "Git", "cmd", "git.exe") : "git";
// Historical argv is evidence, never an execution template. Fixed relative outputs prevent escape.
const compileArguments = (isWindows: boolean) => [
  "--binary",
  "--assert",
  "--timing",
  "-Wno-fatal",
  "--top-module",
  "tb",
  "--Mdir",
  "build",
  "-o",
  isWindows ? "sim.exe" : "sim",
  ...(isWindows ? ["-CFLAGS", "-D_GLIBCXX_USE_CXX11_ABI=0"] : []),
  "-Irtl",
  "rtl/async_fifo.v",
  "rtl/fifomem.v",
  "rtl/rptr_empty.v",
  "rtl/wptr_full.v",
  "rtl/sync_r2w.v",
  "rtl/sync_w2r.v",
  "rtl/dut/top_wrapper.sv",
  "rtl/checker.sv",
  "rtl/tb.sv",
];
assert.deepEqual(
  (await readJson(path.join(source, "golden", "compile.json"))).argv,
  compileArguments(true),
  "HISTORICAL_COMPILE_PROFILE_CHANGED",
);
const compileArgs = compileArguments(windows);
const results = [];
try {
  for (const id of ["golden", "M010"]) {
    const work = path.join(root, id);
    await mkdir(work);
    for (const [file, value] of bytes) {
      const dest = path.join(work, ...file.split("/"));
      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(dest, file === "rtl/tb.sv" ? modifiedTb : value, { flag: "wx" });
    }
    const command = (executable: string, args: string[], label: string, timeoutMs: number) =>
      recordedProcess({ repo, cwd: work, executable, args, label, env, timeoutMs });
    if (id === "M010") {
      const patch = await readFile(path.join(publication, "mutants", "M010.patch"));
      assert.equal(sha(patch), mutant.patchDigest);
      await writeFile(path.join(work, "mutant.patch"), patch, { flag: "wx" });
      const applied = await command(
        git,
        ["apply", "--unidiff-zero", "--ignore-space-change", "mutant.patch"],
        "apply",
        10000,
      );
      assert.equal(applied.exitCode, 0);
      const lines = bytes.get(mutant.file)!.toString().split("\n");
      assert.equal(lines[mutant.line - 1], mutant.originalLine);
      lines[mutant.line - 1] = mutant.mutatedLine;
      assert.equal(sha(lines.join("\n")), mutant.mutatedDigest);
      const actual = await readFile(path.join(work, ...mutant.file.split("/")), "utf8");
      assert.equal(actual.replace(/\r\n?/g, "\n"), lines.join("\n").replace(/\r\n?/g, "\n"));
    }
    const compile = await command(verilator, compileArgs, "compile", 180000);
    assert.equal(compile.exitCode, 0, "DIAGNOSTIC_COMPILE_FAILED");
    const simulation = await command(
      path.join(work, "build", windows ? "sim.exe" : "sim"),
      [],
      "simulation",
      30000,
    );
    const observations = simulation.stdout
      .split(/\r?\n/)
      .filter((s) => s.startsWith("RESET_ACTIVE_OBSERVE"));
    assert.ok(observations.length >= 1);
    assert.ok(observations.every((s) => s.includes("wrst_n=0 rrst_n=0")));
    if (id === "golden") {
      assert.equal(simulation.exitCode, 0);
      assert.match(simulation.stdout, /DPRETET_GOLDEN_PASS/);
      assert.ok(observations.every((s) => s.includes("full=0 empty=1")));
      assert.equal(observations.length, 2, "EXPECTED_INITIAL_AND_MIDRUN_RESET_CHECKS");
    } else {
      assert.notEqual(simulation.exitCode, 0);
      assert.match(simulation.stdout, /RESET_ACTIVE_FLAG_VALUE/);
      assert.match(observations[0], /time=70000 .*full=1 empty=1/);
    }
    results.push({
      id,
      compileExit: compile.exitCode,
      simulationExit: simulation.exitCode,
      observations,
      verdict: id === "golden" ? "golden-passed" : "known-reset-fault-detected",
      directory: logical(work),
    });
    console.log(JSON.stringify(results.at(-1)));
  }
  for (const p of before)
    assert.equal(sha(await readFile(path.join(repo, ...p.path.split("/")))), p.sha256);
  await json("summary.json", {
    completed: true,
    authoritative: false,
    blindTransferEvidence: false,
    interventionOnly: "reset-active value check",
    frozenAssetsUnchanged: true,
    originalScoresUnchanged: true,
    preservedFileCount: before.length,
    control,
    results,
  });
} catch (error) {
  await json("failure.json", { error: String(error), completed: results });
  throw error;
}
