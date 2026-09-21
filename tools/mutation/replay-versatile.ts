import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { simulationVerdict } from "./replay-verdict.ts";

// Fixed source-only replay. No Agent, no source edits, no mutant selection.
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
const repo = process.cwd();
const logical = process.argv[2];
assert.match(logical ?? "", /^\.rtl-agent\/fifo-replays\/[a-z0-9-]+$/);
const out = path.resolve(repo, ...logical.split("/"));
const publication = path.join(repo, "mutation", "fifo-transfer-v2");
const suite = JSON.parse(await readFile(path.join(publication, "manifest.json"), "utf8"));
const dir = path.join(publication, "versatile-fifo");
const manifestBytes = await readFile(path.join(dir, "manifest.json"));
assert.equal(
  sha(manifestBytes),
  suite.ips.find((ip: { id: string }) => ip.id === "versatile-fifo").manifestDigest,
);
const m = JSON.parse(manifestBytes.toString());
assert.equal(m.mutants.length, 30);
const run = path.join(
  repo,
  ".rtl-agent",
  "project-coverage-runs",
  "versatile-fifo-async-duplex",
  "run_20260913-135221-083",
);
const baseline = path.join(
  repo,
  ".rtl-agent",
  "project-coverage-runs",
  "versatile-fifo-async-duplex",
  "run_20260907-224018-009",
  "workspace",
);
const recovery = path.join(repo, ".rtl-agent", "fifo-transfer-recovery", "versatile-first-v1");
const baselineManifest = JSON.parse(
  await readFile(path.join(run, "evidence", "baseline-manifest.json"), "utf8"),
);
const recovered = JSON.parse(await readFile(path.join(recovery, "recovery.json"), "utf8"));
const dutPath = "rtl/dut/async_fifo_dw_simplex.v";
const dut = await readFile(path.join(dir, "golden-source", ...dutPath.split("/")));
assert.equal(sha(dut), m.sourceHashes[dutPath]);
assert.equal(sha(await readFile(path.join(run, "workspace", ...dutPath.split("/")))), sha(dut));
const windows = process.platform === "win32";
const env = { ...process.env };
if (windows) {
  env.PATH = ["C:/msys64/ucrt64/bin", "C:/msys64/usr/bin", env.PATH ?? ""].join(path.delimiter);
  env.VERILATOR_ROOT = "C:/msys64/ucrt64/share/verilator";
}
const exe = windows ? "C:/msys64/ucrt64/bin/verilator_bin.exe" : "verilator";
await mkdir(path.dirname(out), { recursive: true });
await mkdir(out);
async function command(
  executable: string,
  argv: string[],
  cwd: string,
  name: string,
  timeout = 180000,
) {
  const start = Date.now();
  const r = spawnSync(executable, argv, {
    cwd,
    env,
    shell: false,
    windowsHide: true,
    timeout,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  const result = {
    exitCode: r.status,
    error: r.error?.message ?? null,
    signal: r.signal,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
    durationMs: Date.now() - start,
  };
  await writeFile(
    path.join(cwd, `${name}.json`),
    JSON.stringify({ ...result, executable: path.basename(executable), argv }, null, 2) + "\n",
    { flag: "wx" },
  );
  if (result.error?.includes("ETIMEDOUT") && name === "compile")
    throw new Error("COMPILE_TIMEOUT_STOP_CHECK_DESCENDANTS");
  return result;
}
await command(exe, ["--version"], out, "tool-version", 10000);
const summary = [];
for (const [stage, source] of [
  ["baseline", baseline],
  ["first", recovery],
  ["final", path.join(run, "workspace")],
]) {
  const assets = new Map<string, Buffer>([[dutPath, dut]]);
  for (const file of ["rtl/tb.sv", "rtl/checker.sv"]) {
    const bytes = await readFile(path.join(source, ...file.split("/")));
    if (stage === "baseline")
      assert.equal(
        `sha256:${sha(bytes)}`,
        baselineManifest.entries.find((e: { path: string }) => e.path === `workspace/${file}`)
          .contentDigest,
      );
    if (stage === "first")
      assert.equal(
        sha(bytes),
        recovered.entries.find((e: { path: string }) => e.path === file).sha256,
      );
    assets.set(file, bytes);
  }
  const stageRoot = path.join(out, stage);
  await mkdir(stageRoot);
  await writeFile(
    path.join(stageRoot, "assets.json"),
    JSON.stringify(
      [...assets].map(([file, bytes]) => ({ path: file, sha256: sha(bytes) })),
      null,
      2,
    ),
  );
  const results = [];
  for (const mutant of [null, ...m.mutants]) {
    const id = mutant?.id ?? "golden";
    assert.match(id, /^(golden|M\d{3})$/);
    const work = path.join(stageRoot, id);
    await mkdir(work);
    for (const [file, bytes] of assets) {
      const dest = path.join(work, ...file.split("/"));
      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(dest, bytes, { flag: "wx" });
    }
    if (mutant) {
      const patch = await readFile(path.join(dir, "mutants", `${id}.patch`));
      assert.equal(sha(patch), mutant.patchDigest);
      await writeFile(path.join(work, "mutant.patch"), patch);
      const applied = await command(
        windows ? "C:/Program Files/Git/cmd/git.exe" : "git",
        ["apply", "--unidiff-zero", "--ignore-space-change", "mutant.patch"],
        work,
        "apply",
      );
      assert.equal(applied.exitCode, 0, "PATCH_APPLY_FAILED");
      assert.equal(mutant.file, dutPath);
      assert.equal(
        sha(await readFile(path.join(work, ...dutPath.split("/")))),
        mutant.mutatedDigest,
      );
    }
    const compile = await command(
      exe,
      [
        "--binary",
        "--assert",
        "--timing",
        "-Wno-fatal",
        "--top-module",
        "tb",
        "--Mdir",
        "build",
        "-o",
        windows ? "sim.exe" : "sim",
        ...(windows ? ["-CFLAGS", "-D_GLIBCXX_USE_CXX11_ABI=0"] : []),
        dutPath,
        "rtl/checker.sv",
        "rtl/tb.sv",
      ],
      work,
      "compile",
    );
    let verdict = compile.error ? "infrastructure-error" : "compile-invalid";
    if (!compile.error && compile.exitCode === 0) {
      const sim = await command(
        path.join(work, "build", windows ? "sim.exe" : "sim"),
        [],
        work,
        "simulation",
        30000,
      );
      verdict = simulationVerdict(sim);
    }
    results.push({ id, verdict });
    await writeFile(path.join(work, "result.json"), JSON.stringify({ id, verdict }) + "\n");
    process.stdout.write(JSON.stringify({ stage, id, verdict }) + "\n");
    if (!mutant && verdict !== "survived") throw new Error(`GOLDEN_FAILED_${stage}`);
  }
  summary.push({ stage, results });
  await writeFile(path.join(stageRoot, "summary.json"), JSON.stringify(results, null, 2));
}
await writeFile(
  path.join(out, "summary.json"),
  JSON.stringify(
    { authoritative: false, platform: process.platform, modelCalls: 0, summary },
    null,
    2,
  ),
);
