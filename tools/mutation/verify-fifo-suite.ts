import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { sha } from "./fifo-candidates.ts";

// Deterministic, model-free validation. Does not simulate mutants or choose on kills.
const suite = JSON.parse(
  await readFile(path.resolve("tools/mutation/fixtures/six-fifo-suite-v2.json"), "utf8"),
);
const env = { ...process.env };
const windows = process.platform === "win32";
if (windows) {
  env.PATH = ["C:/msys64/ucrt64/bin", "C:/msys64/usr/bin", env.PATH ?? ""].join(path.delimiter);
  env.VERILATOR_ROOT = "C:/msys64/ucrt64/share/verilator";
}
const exe =
  process.env.VERILATOR_EXE ?? (windows ? "C:/msys64/ucrt64/bin/verilator_bin.exe" : "verilator");
const tool = spawnSync(exe, ["--version"], {
  env,
  encoding: "utf8",
  shell: false,
  windowsHide: true,
  timeout: 10000,
});
assert.equal(tool.status, 0);
for (const logical of [...suite.sources, ...suite.targets] as string[]) {
  assert.match(logical, /^(source|target)\/[a-z0-9-]+$/);
  const root = path.resolve(".rtl-agent", "fifo-prepared", ...logical.split("/"));
  const m = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
  assert.equal(m.selected, 30);
  const coverage = spawnSync(
    process.execPath,
    [
      path.resolve("tools/mutation/fifo-coverage.ts"),
      path.relative(process.cwd(), root).split(path.sep).join("/"),
    ],
    {
      env,
      shell: false,
      windowsHide: true,
      encoding: "utf8",
      timeout: 240000,
      maxBuffer: 8 * 1024 * 1024,
    },
  );
  await writeFile(
    path.join(root, "coverage-driver.json"),
    JSON.stringify(
      {
        exitCode: coverage.status,
        error: coverage.error?.message ?? null,
        stdout: coverage.stdout,
        stderr: coverage.stderr,
      },
      null,
      2,
    ) + "\n",
  );
  assert.equal(coverage.status, 0, `GOLDEN_COVERAGE_FAILED ${logical}: ${coverage.stderr}`);
  const results = [];
  for (const mutant of m.mutants) {
    const dir = path.join(root, `candidate-${String(mutant.candidate).padStart(3, "0")}`);
    for (const [file, digest] of Object.entries(m.sourceHashes)) {
      assert.equal(
        sha(await readFile(path.join(dir, ...file.split("/")))),
        file === mutant.file ? mutant.mutatedDigest : digest,
      );
    }
    assert.equal(sha(await readFile(path.join(dir, "tb.sv"))), m.tbDigest);
    const args = [
      "--lint-only",
      "--timing",
      "-Wno-fatal",
      "--top-module",
      "tb",
      ...Object.keys(m.config.files).map((f) => `-I${path.dirname(f)}`),
      ...(m.config.defines ?? []).map((d: string) => `-D${d}`),
      ...(m.config.units ?? [m.config.dut]),
      "tb.sv",
    ];
    const start = Date.now();
    const r = spawnSync(exe, args, {
      cwd: dir,
      env,
      shell: false,
      windowsHide: true,
      encoding: "utf8",
      timeout: 30000,
      maxBuffer: 8 * 1024 * 1024,
    });
    const result = {
      id: mutant.id,
      executable: path.basename(exe),
      argv: args,
      exitCode: r.status,
      error: r.error?.message ?? null,
      signal: r.signal,
      durationMs: Date.now() - start,
      stdout: r.stdout,
      stderr: r.stderr,
    };
    await writeFile(path.join(dir, "verilator-lint.json"), JSON.stringify(result, null, 2) + "\n");
    results.push({
      id: mutant.id,
      passed: r.status === 0 && !r.error,
      durationMs: result.durationMs,
    });
    await writeFile(
      path.join(root, "frontend-progress.json"),
      JSON.stringify({ completed: results.length, results }, null, 2) + "\n",
    );
  }
  await writeFile(
    path.join(root, "frontend-summary.json"),
    JSON.stringify(
      {
        tool: tool.stdout.trim(),
        platform: process.platform,
        authoritative: false,
        requested: 30,
        passed: results.filter((r) => r.passed).length,
        results,
        note: "Icarus compilation plus Verilator lint/elaboration; mutant simulation and kills not run.",
      },
      null,
      2,
    ) + "\n",
  );
  assert.equal(results.filter((r) => r.passed).length, 30, `MUTANT_FRONTEND_FAILURE ${logical}`);
  process.stdout.write(
    JSON.stringify({
      ip: m.config.id,
      golden: "dual-simulator pass with Verilator coverage",
      mutants: 30,
      frontend: "pass",
    }) + "\n",
  );
}
