import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { sha, coveragePoints } from "./fifo-candidates.ts";

// Operates only on an already published isolated preparation workspace.
const arg = process.argv[2];
if (!arg || path.isAbsolute(arg) || arg.includes("..") || arg.includes("\\"))
  throw new Error("EXPECTED_RELATIVE_PREPARATION_ROOT");
const root = path.resolve(arg);
const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
const config = manifest.config;
const workspace = path.join(root, "golden");
for (const [file, hash] of Object.entries(config.files)) {
  if (path.isAbsolute(file) || file.includes("..") || file.includes("\\"))
    throw new Error("INVALID_FILE");
  if (sha(await readFile(path.join(workspace, file))) !== hash)
    throw new Error("GOLDEN_SOURCE_CHANGED");
}
if (sha(await readFile(path.join(workspace, "tb.sv"))) !== manifest.tbDigest)
  throw new Error("TB_CHANGED");
const build = path.join(workspace, "verilator");
const summarizeOnly = process.argv[3] === "--summarize-only";
if (!summarizeOnly) await mkdir(build);
const env = { ...process.env };
const windows = process.platform === "win32";
if (windows) {
  env.PATH = ["C:/msys64/ucrt64/bin", "C:/msys64/usr/bin", env.PATH ?? ""].join(path.delimiter);
  env.VERILATOR_ROOT = "C:/msys64/ucrt64/share/verilator";
}
const exe =
  process.env.VERILATOR_EXE ?? (windows ? "C:/msys64/ucrt64/bin/verilator_bin.exe" : "verilator");
function command(executable: string, args: string[], cwd: string) {
  const start = Date.now();
  const r = spawnSync(executable, args, {
    cwd,
    env,
    shell: false,
    windowsHide: true,
    timeout: 180000,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  return {
    exitCode: r.status,
    error: r.error?.message ?? null,
    signal: r.signal,
    stdout: r.stdout,
    stderr: r.stderr,
    durationMs: Date.now() - start,
  };
}
const argv = [
  "--binary",
  "--coverage-line",
  "--coverage-toggle",
  "--timing",
  "-Wno-fatal",
  "--top-module",
  "tb",
  "--Mdir",
  build,
  "-o",
  windows ? "sim.exe" : "sim",
  ...(windows ? ["-CFLAGS", "-D_GLIBCXX_USE_CXX11_ABI=0"] : []),
  ...Object.keys(config.files).map((f) => `-I${path.dirname(f)}`),
  ...(config.defines ?? []).map((d: string) => `-D${d}`),
  ...(config.units ?? [config.dut]),
  "tb.sv",
];
const compile = summarizeOnly
  ? JSON.parse(await readFile(path.join(build, "compile.json"), "utf8"))
  : command(exe, argv, workspace);
await writeFile(
  path.join(build, "compile.json"),
  JSON.stringify(
    {
      ...compile,
      argv: argv.map((a) => (a === build ? "verilator" : a)),
      executable: path.basename(exe),
    },
    null,
    2,
  ) + "\n",
);
if (compile.exitCode !== 0 || compile.error) throw new Error("VERILATOR_COMPILE_FAILED");
const sim = summarizeOnly
  ? JSON.parse(await readFile(path.join(build, "simulation.json"), "utf8"))
  : command(path.join(build, windows ? "sim.exe" : "sim"), [], build);
await writeFile(path.join(build, "simulation.json"), JSON.stringify(sim, null, 2) + "\n");
if (sim.exitCode !== 0 || sim.error) throw new Error("VERILATOR_SIMULATION_FAILED");
const raw = await readFile(path.join(build, "coverage.dat"), "utf8");
// Count native point types separately, never mislabel toggle as line/branch.
const groups = coveragePoints(raw, Object.keys(config.mutationFiles ?? { [config.dut]: [] }));
const summary = {
  id: config.id,
  platform: process.platform,
  authoritative: false,
  compile: true,
  simulation: true,
  durationMs: compile.durationMs + sim.durationMs,
  coverageRawDigest: sha(raw),
  points: groups,
  note: "Native DUT point hit counts, not the combined project-coverage score. No mutation kill result.",
};
await writeFile(path.join(root, "coverage-summary.json"), JSON.stringify(summary, null, 2) + "\n");
process.stdout.write(JSON.stringify(summary) + "\n");
