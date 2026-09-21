import { mkdir, readFile, writeFile, realpath, lstat, access } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { candidates, applyCandidate, patchFor, sha, coveragePoints } from "./fifo-candidates.ts";
import type { Candidate } from "./fifo-candidates.ts";
import { recordedProcess } from "./family-process.ts";

export interface FamilyConfig {
  id: string;
  family: "uart" | "aes";
  role: "unassigned";
  root: string;
  module: string;
  revision: string;
  reference: string;
  license: string;
  licenseEvidence: string[];
  files: Record<string, string>;
  units: string[];
  dut: string;
  tb: string;
  defines: string[];
  mutationFiles: Record<string, [number, number][]>;
  excludedMutations?: { file: string; line: number; operator: string; reason: string }[];
  specification: string;
  ancestry: string;
  policyVersion: 2;
}

export function logicalPath(root: string, logical: string): string {
  if (
    !logical ||
    !/^[A-Za-z0-9_. /-]+$/.test(logical) ||
    logical.includes(":") ||
    logical.includes("\\") ||
    path.posix.isAbsolute(logical) ||
    path.win32.isAbsolute(logical) ||
    logical
      .split("/")
      .some((p) => p === ".." || p === "." || p === "" || p.endsWith(".") || p.endsWith(" "))
  )
    throw new Error("INVALID_LOGICAL_PATH");
  const full = path.resolve(root, ...logical.split("/"));
  const relative = path.relative(root, full);
  if (!relative || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
    throw new Error("PATH_ESCAPE");
  return full;
}

async function checkedRead(root: string, logical: string): Promise<Buffer> {
  const full = logicalPath(root, logical);
  let current = root;
  for (const part of logical.split("/")) {
    current = path.join(current, part);
    if ((await lstat(current)).isSymbolicLink()) throw new Error("REDIRECT_NOT_ALLOWED");
  }
  const relative = path.relative(await realpath(root), await realpath(full));
  if (relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
    throw new Error("PATH_ESCAPE");
  return readFile(full);
}

export function validateConfig(c: FamilyConfig) {
  assert.match(c.id, /^[a-z0-9-]+$/);
  assert.ok(["uart", "aes"].includes(c.family));
  assert.equal(c.role, "unassigned");
  assert.match(c.revision, /^[a-f0-9]{40}$/);
  assert.equal(c.policyVersion, 2);
  const names = Object.keys(c.files);
  assert.equal(new Set(names.map((f) => f.toLowerCase())).size, names.length, "CASE_COLLISION");
  const components = new Map<string, string>();
  for (const name of names) {
    const parts = name.split("/");
    for (let i = 1; i <= parts.length; i++) {
      const prefix = parts.slice(0, i).join("/");
      const prior = components.get(prefix.toLowerCase());
      assert.ok(prior === undefined || prior === prefix, "CASE_COLLISION");
      components.set(prefix.toLowerCase(), prefix);
    }
  }
  for (const file of [c.root, c.tb, ...names, ...c.licenseEvidence])
    logicalPath(process.cwd(), file);
  assert.ok(c.files[c.dut]);
  for (const file of [...c.units, ...Object.keys(c.mutationFiles)])
    assert.ok(c.files[file], "UNLOCKED_FILE");
  for (const hash of Object.values(c.files)) assert.match(hash, /^[a-f0-9]{64}$/);
  for (const excluded of c.excludedMutations ?? []) {
    assert.ok(c.files[excluded.file], "UNLOCKED_EXCLUSION");
    assert.ok(Number.isInteger(excluded.line) && excluded.line > 0 && excluded.reason.length > 0);
  }
  for (const ranges of Object.values(c.mutationFiles))
    for (const [a, b] of ranges)
      assert.ok(Number.isInteger(a) && Number.isInteger(b) && a > 0 && b >= a);
}

export function familyCandidates(
  c: FamilyConfig,
  originals: Map<string, Buffer>,
): (Candidate & { file: string })[] {
  // Keep the FIFO lexical operators and seed. Strip comments for eligibility, without
  // changing line/column locations in the original text used to construct each patch.
  const all = Object.entries(c.mutationFiles).flatMap(([file, ranges]) => {
    const source = originals.get(file)!.toString("utf8");
    const clean = source
      .replace(/\/\*[\s\S]*?\*\//g, (s) => s.replace(/[^\r\n]/g, " "))
      .replace(/\/\/[^\r\n]*/g, (s) => " ".repeat(s.length));
    const cleanLines = clean.split("\n");
    return candidates(source, ranges, 42, true)
      .filter(
        (item) =>
          cleanLines[item.line - 1]!.slice(
            item.column - 1,
            item.column - 1 + item.before.length,
          ) === item.before &&
          !(c.excludedMutations ?? []).some(
            (e) => e.file === file && e.line === item.line && e.operator === item.operator,
          ),
      )
      .map((item) => ({ ...item, file }));
  });
  // Preserve operator strata across modules rather than letting a prolific XOR datapath
  // monopolize the first 30. No coverage, simulation or kill result affects ordering.
  const names = [...new Set(all.map((item) => item.operator))].sort();
  const groups = names.map((name) =>
    all
      .filter((item) => item.operator === name)
      .sort((a, b) => a.rank.localeCompare(b.rank) || a.file.localeCompare(b.file)),
  );
  const result: typeof all = [];
  while (groups.some((group) => group.length))
    for (const group of groups) {
      const next = group.shift();
      if (next) result.push(next);
    }
  return result;
}

const windows = process.platform === "win32";
const bin = (envName: string, winPath: string[], linux: string) =>
  process.env[envName] ?? (windows ? path.join("C:", ...winPath) : linux);
const iverilog = bin("IVERILOG_EXE", ["iverilog", "bin", "iverilog.exe"], "iverilog");
const vvp = bin("VVP_EXE", ["iverilog", "bin", "vvp.exe"], "vvp");
const verilator = bin(
  "VERILATOR_EXE",
  ["msys64", "ucrt64", "bin", "verilator_bin.exe"],
  "verilator",
);
const git = bin("GIT_EXE", ["Program Files", "Git", "cmd", "git.exe"], "git");
const env = { ...process.env };
if (windows) {
  env.PATH = [
    path.join("C:", "msys64", "ucrt64", "bin"),
    path.join("C:", "msys64", "usr", "bin"),
    env.PATH ?? "",
  ].join(path.delimiter);
  env.VERILATOR_ROOT = path.join("C:", "msys64", "ucrt64", "share", "verilator");
}
async function command(cwd: string, exe: string, args: string[], label: string, timeout = 30000) {
  return recordedProcess({
    repo: process.cwd(),
    cwd,
    executable: exe,
    args,
    label,
    env,
    timeoutMs: timeout,
  });
}
const pass = (r: { exitCode: number | null; error: string | null }) =>
  r.exitCode === 0 && r.error === null;
const json = async (p: string, obj: unknown) =>
  writeFile(p, JSON.stringify(obj, null, 2) + "\n", { flag: "wx" });
async function copy(root: string, file: string, bytes: Buffer | string) {
  const full = logicalPath(root, file);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, bytes, { flag: "wx" });
}
function args(c: FamilyConfig) {
  const includes = [...new Set(Object.keys(c.files).map((f) => path.posix.dirname(f)))];
  return {
    icarus: [
      "-g2012",
      "-s",
      "tb",
      ...includes.flatMap((f) => ["-I", f]),
      ...c.defines.map((d) => `-D${d}`),
      "-o",
      "sim.vvp",
      ...c.units,
      "tb.sv",
    ],
    verilator: [
      "--timing",
      "-Wno-fatal",
      "--top-module",
      "tb",
      ...includes.map((f) => `-I${f}`),
      ...c.defines.map((d) => `-D${d}`),
      ...c.units,
      "tb.sv",
    ],
  };
}

export async function prepare(configArg: string, outputArg: string, probe = false) {
  const repo = process.cwd();
  const c = JSON.parse((await checkedRead(repo, configArg)).toString("utf8")) as FamilyConfig;
  validateConfig(c);
  const sourceRoot = logicalPath(repo, c.root);
  const originals = new Map<string, Buffer>();
  for (const [file, digest] of Object.entries(c.files)) {
    const bytes = await checkedRead(repo, path.posix.join(c.root, file));
    assert.equal(sha(bytes), digest, `SOURCE_DIGEST:${file}`);
    originals.set(file, bytes);
  }
  const revision = spawnSync(git, ["rev-parse", "HEAD"], {
    cwd: sourceRoot,
    shell: false,
    windowsHide: true,
    encoding: "utf8",
  });
  assert.equal(revision.status, 0);
  assert.equal(revision.stdout.trim(), c.revision);
  const tb = await checkedRead(repo, c.tb);
  const output = logicalPath(repo, outputArg);
  await mkdir(output); // exclusive root; failures remain diagnostic, never overwritten
  await json(path.join(output, "config.json"), c);
  async function materialize(name: string, candidate?: Candidate & { file: string }) {
    const dir = path.join(output, name);
    await mkdir(dir);
    for (const [file, bytes] of originals)
      await copy(
        dir,
        file,
        candidate?.file === file ? applyCandidate(bytes.toString("utf8"), candidate) : bytes,
      );
    await copy(dir, "tb.sv", tb);
    return dir;
  }
  const golden = await materialize("golden");
  const argv = args(c);
  assert.ok(pass(await command(golden, iverilog, argv.icarus, "compile")), "GOLDEN_COMPILE_FAILED");
  const sim = await command(golden, vvp, ["sim.vvp"], "simulation");
  assert.ok(pass(sim) && sim.stdout.includes("IP_PREPARATION_PASS"), "GOLDEN_SIMULATION_FAILED");
  if (probe) {
    process.stdout.write(JSON.stringify({ id: c.id, probe: "passed" }) + "\n");
    return;
  }
  const all = familyCandidates(c, originals);
  const mutants = [];
  const attempts = [];
  const seen = new Set<string>();
  await mkdir(path.join(output, "mutants"));
  for (const [index, item] of all.entries()) {
    if (mutants.length === 30) break;
    const digest = sha(applyCandidate(originals.get(item.file)!.toString("utf8"), item));
    if (seen.has(digest)) continue;
    seen.add(digest);
    const dir = await materialize(`candidate-${String(index + 1).padStart(3, "0")}`, item);
    const compiled = pass(await command(dir, iverilog, argv.icarus, "compile"));
    const linted =
      compiled &&
      pass(await command(dir, verilator, ["--lint-only", ...argv.verilator], "verilator-lint"));
    attempts.push({ candidate: index + 1, ...item, compiled, linted, digest });
    if (!compiled || !linted) continue;
    const id: string = `M${String(mutants.length + 1).padStart(3, "0")}`;
    const patch = patchFor(item.file, item);
    await copy(output, `mutants/${id}.patch`, patch);
    mutants.push({
      id,
      candidate: index + 1,
      ...item,
      mutatedDigest: digest,
      patchDigest: sha(patch),
      faultHypothesis: `${item.operator} changes ${c.family} data/control behavior at ${item.file}:${item.line}: ${item.before} -> ${item.after}`,
      staticReview:
        "Candidate lies in the declared executable range; individual semantic review pending",
      equivalence: "unproven",
      simulation: "not-run",
      kill: null,
    });
  }
  await json(path.join(output, "selection.json"), { attempts });
  await json(path.join(output, "frontend-summary.json"), {
    platform: process.platform,
    authoritative: false,
    requested: 30,
    passed: mutants.length,
    results: mutants.map((m) => ({ id: m.id, passed: true })),
    note: "Icarus compile and Verilator lint only; no mutant simulation",
  });
  for (const [file, bytes] of originals)
    assert.equal(sha(await checkedRead(sourceRoot, file)), sha(bytes));
  const manifest = {
    version: `${c.id}-mutants-v1`,
    seed: 42,
    family: c.family,
    role: c.role,
    config: c,
    sourceHashes: c.files,
    tbDigest: sha(tb),
    platform: process.platform,
    authoritative: false,
    golden: { compile: true, simulation: true },
    selectionPolicy:
      "seed42 global operator round-robin; reviewed ranges; frontend-only rejection; no coverage or kill input",
    requested: 30,
    selected: mutants.length,
    shortfall: 30 - mutants.length,
    shortfallReason:
      mutants.length < 30
        ? "Declared executable ranges exhausted after deduplication and frontend checks; no padding"
        : null,
    candidates: all.length,
    mutants,
  };
  await json(path.join(output, "manifest.json"), manifest);
  process.stdout.write(
    JSON.stringify({
      id: c.id,
      selected: mutants.length,
      candidates: all.length,
      golden: "passed",
    }) + "\n",
  );
}

export async function coverage(rootArg: string) {
  const root = logicalPath(process.cwd(), rootArg);
  const m = JSON.parse((await checkedRead(root, "manifest.json")).toString("utf8"));
  const c = m.config as FamilyConfig;
  validateConfig(c);
  const golden = path.join(root, "golden");
  for (const [file, hash] of Object.entries(c.files))
    assert.equal(sha(await checkedRead(golden, file)), hash);
  assert.equal(sha(await checkedRead(golden, "tb.sv")), m.tbDigest);
  const build = path.join(golden, "verilator");
  await mkdir(build);
  const buildArgs = [
    "--binary",
    "--coverage-line",
    "--coverage-toggle",
    "--Mdir",
    "verilator",
    "-o",
    windows ? "sim.exe" : "sim",
    "-CFLAGS",
    windows ? "-D_GLIBCXX_USE_CXX11_ABI=0 -O0" : "-O0",
    ...args(c).verilator,
  ];
  const compile = await command(golden, verilator, buildArgs, "verilator-compile", 1200000);
  assert.ok(pass(compile), "VERILATOR_COMPILE_FAILED");
  const sim = await command(build, path.join(build, windows ? "sim.exe" : "sim"), [], "simulation");
  assert.ok(pass(sim) && sim.stdout.includes("IP_PREPARATION_PASS"), "VERILATOR_SIMULATION_FAILED");
  const raw = await checkedRead(build, "coverage.dat");
  const summary = {
    id: c.id,
    platform: process.platform,
    authoritative: false,
    compile: true,
    simulation: true,
    durationMs: compile.durationMs + sim.durationMs,
    compilerProfile:
      "native C++ -O0; Windows libstdc++ ABI0; serial build; 20 minute compile boundary",
    coverageRawDigest: sha(raw),
    points: coveragePoints(raw.toString("utf8"), c.units),
    coverageFiles: c.units,
    note: "Native whole-DUT line/branch/toggle points, not combined score; no kill result",
  };
  await json(path.join(root, "coverage-summary.json"), summary);
  process.stdout.write(JSON.stringify(summary) + "\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let paused = false;
  try {
    await access(path.resolve(".rtl-agent", "family-preparation.pause.json"));
    paused = true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (paused) throw new Error("FAMILY_PREPARATION_PAUSED_FOR_ACTIVE_FIFO_CAMPAIGN");
  const [mode, input, output] = process.argv.slice(2);
  if ((mode === "prepare" || mode === "probe") && input && output)
    await prepare(input, output, mode === "probe");
  else if (mode === "coverage" && input && !output) await coverage(input);
  else
    throw new Error(
      "Usage: family-preparation.ts probe|prepare config.json unique-root OR coverage preparation-root",
    );
}
