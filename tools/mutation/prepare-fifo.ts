import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { candidates, applyCandidate, patchFor, sha } from "./fifo-candidates.ts";

interface Config {
  id: string;
  role: "source" | "target";
  root: string;
  module: string;
  revision: string;
  reference: string;
  license: string;
  files: Record<string, string>;
  dut: string;
  tb: string;
  ranges: [number, number][];
  defines?: string[];
  units?: string[];
  mutationFiles?: Record<string, [number, number][]>;
  policyVersion?: number;
  excludedMutations?: {
    file?: string;
    line: number;
    operator: string;
    before?: string;
    reason: string;
  }[];
}
function bound(root: string, logical: string): string {
  if (
    !logical ||
    logical.includes("\\") ||
    path.isAbsolute(logical) ||
    logical.split("/").some((p) => p === ".." || p === "")
  )
    throw new Error("INVALID_LOGICAL_PATH");
  const p = path.resolve(root, ...logical.split("/"));
  if (path.relative(root, p).startsWith("..")) throw new Error("PATH_ESCAPE");
  return p;
}
const repo = process.cwd();
const [configArg, outputArg] = process.argv.slice(2);
if (!configArg || !outputArg)
  throw new Error("Usage: node tools/mutation/prepare-fifo.ts config.json unique-output-directory");
const config = JSON.parse(await readFile(bound(repo, configArg), "utf8")) as Config;
if (!/^[a-z0-9-]+$/.test(config.id) || !["source", "target"].includes(config.role))
  throw new Error("INVALID_CONFIG");
const sourceRoot = bound(repo, config.root),
  output = bound(repo, outputArg);
// Exclusive publication root; never replace earlier evidence or upstream files.
await mkdir(output, { recursive: false });
const originals = new Map<string, Buffer>();
for (const [file, digest] of Object.entries(config.files)) {
  const bytes = await readFile(bound(sourceRoot, file));
  if (sha(bytes) !== digest) throw new Error(`SOURCE_DIGEST_MISMATCH: ${file}`);
  originals.set(file, bytes);
}
const source = originals.get(config.dut)?.toString("utf8");
if (!source) throw new Error("DUT_NOT_LOCKED");
const tb = await readFile(bound(repo, config.tb));
const iverilog =
  process.env.IVERILOG_EXE ??
  (process.platform === "win32" ? "C:/iverilog/bin/iverilog.exe" : "iverilog");
const vvp =
  process.env.VVP_EXE ?? (process.platform === "win32" ? "C:/iverilog/bin/vvp.exe" : "vvp");
async function run(dir: string, exe: string, args: string[], label: string) {
  const start = Date.now();
  const r = spawnSync(exe, args, {
    cwd: dir,
    shell: false,
    windowsHide: true,
    timeout: 30000,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  const evidence = {
    executable: path.basename(exe),
    argv: args,
    exitCode: r.status,
    signal: r.signal,
    error: r.error?.message ?? null,
    durationMs: Date.now() - start,
  };
  await writeFile(path.join(dir, `${label}.stdout.log`), r.stdout ?? "");
  await writeFile(path.join(dir, `${label}.stderr.log`), r.stderr ?? "");
  await writeFile(path.join(dir, `${label}.json`), JSON.stringify(evidence, null, 2) + "\n");
  return { passed: r.status === 0 && !r.error, evidence };
}
async function materialize(name: string, mutated?: string, target = config.dut) {
  const dir = path.join(output, name);
  await mkdir(dir);
  for (const [file, bytes] of originals) {
    const dest = bound(dir, file);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, file === target && mutated !== undefined ? mutated : bytes);
  }
  await writeFile(path.join(dir, "tb.sv"), tb);
  return dir;
}
const compileArgs = [
  "-g2012",
  "-s",
  "tb",
  ...Object.keys(config.files).flatMap((f) => ["-I", path.dirname(f)]),
  ...(config.defines ?? []).map((d) => `-D${d}`),
  "-o",
  "sim.vvp",
  ...(config.units ?? [config.dut]),
  "tb.sv",
];
const goldenDir = await materialize("golden");
const compile = await run(goldenDir, iverilog, compileArgs, "compile");
if (!compile.passed) throw new Error("GOLDEN_COMPILE_FAILED");
const simulation = await run(goldenDir, vvp, ["sim.vvp"], "simulation");
if (!simulation.passed) throw new Error("GOLDEN_SIMULATION_FAILED");
const all = Object.entries(config.mutationFiles ?? { [config.dut]: config.ranges }).flatMap(
  ([file, ranges]) => {
    const text = originals.get(file)?.toString("utf8");
    if (!text) throw new Error("MUTATION_FILE_NOT_LOCKED");
    return candidates(text, ranges, 42, config.policyVersion === 2)
      .filter(
        (c) =>
          !(config.excludedMutations ?? []).some(
            (e) =>
              (!e.file || e.file === file) &&
              e.line === c.line &&
              e.operator === c.operator &&
              (!e.before || e.before === c.before),
          ),
      )
      .map((c) => ({ ...c, file }));
  },
);
// Interleave modules using the same seed ranking; no simulation outcome input.
if (config.mutationFiles)
  all.sort((a, b) => a.rank.localeCompare(b.rank) || a.file.localeCompare(b.file));
const accepted = [];
const attempts = [];
const seen = new Set<string>();
await mkdir(path.join(output, "mutants"));
for (const [index, c] of all.entries()) {
  if (accepted.length >= 30) break;
  const mutated = applyCandidate(originals.get(c.file)!.toString("utf8"), c),
    digest = sha(mutated);
  if (seen.has(digest)) continue;
  seen.add(digest);
  const dir = await materialize(`candidate-${String(index + 1).padStart(3, "0")}`, mutated, c.file);
  const result = await run(dir, iverilog, compileArgs, "compile");
  attempts.push({ candidate: index + 1, ...c, compiled: result.passed, digest });
  if (result.passed) {
    const id: string = `M${String(accepted.length + 1).padStart(3, "0")}`;
    const patch = patchFor(c.file, c);
    await writeFile(path.join(output, "mutants", `${id}.patch`), patch);
    accepted.push({
      id,
      candidate: index + 1,
      ...c,
      faultHypothesis: `${c.operator} at executable ${c.file}:${c.line}: ${c.before} -> ${c.after}`,
      mutatedDigest: digest,
      patchDigest: sha(patch),
      equivalence: "unreviewed",
      simulation: "not-run",
      kill: null,
    });
  }
}
for (const [file, bytes] of originals)
  if (sha(await readFile(bound(sourceRoot, file))) !== sha(bytes))
    throw new Error("SOURCE_CHANGED");
const manifest = {
  version: `${config.id}-mutants-v${config.policyVersion ?? 1}`,
  seed: 42,
  role: config.role,
  config,
  sourceHashes: config.files,
  tbDigest: sha(tb),
  platform: process.platform,
  authoritative: false,
  golden: { compile: true, simulation: true },
  selectionPolicy:
    "Reviewed executable ranges and static exclusions; seed42 operator round-robin (multi-file rank merge); v2 additionally enable_inversion/reset_offset/transfer_lsb; compile-only replacement; no kill/coverage input",
  requested: 30,
  selected: accepted.length,
  shortfall: 30 - accepted.length,
  candidates: all.length,
  mutants: accepted,
};
await writeFile(path.join(output, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
await writeFile(path.join(output, "selection.json"), JSON.stringify({ attempts }, null, 2) + "\n");
await copyFile(bound(repo, configArg), path.join(output, "config.json"));
process.stdout.write(
  JSON.stringify({
    id: config.id,
    selected: accepted.length,
    candidates: all.length,
    golden: "passed",
    mutationSimulation: "not-run",
  }) + "\n",
);
