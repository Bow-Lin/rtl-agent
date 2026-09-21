import assert from "node:assert/strict";
import { mkdir, readFile, writeFile, readdir, lstat, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { logicalPath } from "./family-preparation.ts";
import { recordedProcess } from "./family-replay-process.ts";
import type { FamilyConfig } from "./family-preparation.ts";

const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const publication = "mutation/uart-aes-transfer-v1";
const expectedCounts = {
  uart16550: 30,
  wbuart32: 30,
  osdvu: 10,
  "uart2bus-uart": 30,
  "aes-core": 30,
  "tiny-aes": 30,
  "aes-pipeline": 30,
};
type Mutant = {
  id: string;
  file: string;
  line: number;
  column: number;
  operator: string;
  before: string;
  after: string;
  patchDigest: string;
  mutatedDigest: string;
};
type Manifest = {
  config: FamilyConfig;
  sourceHashes: Record<string, string>;
  tbDigest: string;
  mutants: Mutant[];
  selected: number;
  artifactDigests: Record<string, string>;
  licenses: { path: string; digest: string }[];
};
type Fixture = {
  id: string;
  root: string;
  manifest: Manifest;
  tb: string;
  sources: Map<string, Buffer>;
};
export type ProcessEvidence = {
  exitCode: number | null;
  signal: string | null;
  error: string | null;
  cleanupConfirmed: boolean;
  stdout: string;
  stderr: string;
  durationMs: number;
};
export type RawOutcome =
  "survived" | "tb-failure" | "compile-error" | "runtime-error" | "unresolved" | "not-run";
export type FatalEvidence = { line: number; message: string; time: string | null; source: string };
export function classifyIcarus(
  r: ProcessEvidence,
  tb: string,
  marker: string,
): { outcome: RawOutcome; reason: string; fatal?: FatalEvidence } {
  if (r.error || r.signal || !r.cleanupConfirmed)
    return { outcome: "runtime-error", reason: "PROCESS_BOUNDARY_FAILURE" };
  const output = r.stdout + "\n" + r.stderr;
  const fatal = output.match(/^FATAL:\s+(?:\.\/)?tb\.sv:(\d+):\s*([^\r\n]*)/m);
  const anyFatal = /FATAL:|ERROR:|\$fatal|assertion failed/i.test(output);
  if (r.exitCode === 0 && output.split(/\r?\n/).some((line) => line.trim() === marker) && !anyFatal)
    return { outcome: "survived", reason: "NORMAL_EXIT_AND_EXACT_PASS_MARKER" };
  if (r.exitCode !== 0 && r.exitCode !== null && fatal) {
    const line = Number(fatal[1]),
      source = tb.split(/\r?\n/)[line - 1] ?? "";
    const message = fatal[2].trim(),
      label = message.split(/\s/)[0];
    if (source.includes("$fatal") && source.includes('"' + label))
      return {
        outcome: "tb-failure",
        reason: "FROZEN_TB_FATAL_REQUIRES_SEMANTIC_REVIEW",
        fatal: { line, message, time: output.match(/Time:\s*(\d+)/)?.[1] ?? null, source },
      };
  }
  return {
    outcome: r.exitCode === 0 ? "unresolved" : "runtime-error",
    reason: "NO_VALID_PASS_OR_FROZEN_TB_FATAL",
  };
}
export function icarusArgs(c: Pick<FamilyConfig, "files" | "defines" | "units">) {
  const includes = [...new Set(Object.keys(c.files).map((f) => path.posix.dirname(f)))];
  return [
    "-g2012",
    "-s",
    "tb",
    ...includes.flatMap((f) => ["-I", f]),
    ...c.defines.map((d) => `-D${d}`),
    "-o",
    "sim.vvp",
    ...c.units,
    "tb.sv",
  ];
}
export function frozenPatchArgs(patch: string) {
  return ["-c", "core.autocrlf=false", "apply", "--unidiff-zero", "--ignore-space-change", patch];
}
async function json(file: string, value: unknown) {
  await writeFile(file, JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
}
// All paths below are repository-relative logical paths. Refuse filesystem redirection.
async function boundRead(repo: string, logical: string) {
  const full = logicalPath(repo, logical);
  let cursor = repo;
  for (const part of logical.split("/")) {
    cursor = path.join(cursor, part);
    assert.ok(!(await lstat(cursor)).isSymbolicLink(), "REDIRECT_NOT_ALLOWED");
  }
  return readFile(full);
}
async function treeHashes(repo: string, logical: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  async function walk(current: string) {
    for (const e of (await readdir(logicalPath(repo, current), { withFileTypes: true })).sort(
      (a, b) => a.name.localeCompare(b.name),
    )) {
      assert.ok(!e.isSymbolicLink(), "REDIRECT_NOT_ALLOWED");
      const file = path.posix.join(current, e.name);
      if (e.isDirectory()) await walk(file);
      else result[file] = sha(await boundRead(repo, file));
    }
  }
  await walk(logical);
  return result;
}
export async function auditFamilyPublication(repo: string) {
  const index = JSON.parse(
    (await boundRead(repo, path.posix.join(publication, "manifest.json"))).toString(),
  );
  const fixtures: Fixture[] = [];
  for (const family of index.families) {
    const familyPath = path.posix.join(publication, family.manifest);
    const bytes = await boundRead(repo, familyPath);
    assert.equal(sha(bytes), family.manifestDigest);
    const f = JSON.parse(bytes.toString());
    for (const ip of f.ips) {
      const mp = path.posix.join(path.posix.dirname(familyPath), ip.manifest);
      const mb = await boundRead(repo, mp);
      assert.equal(sha(mb), ip.manifestDigest);
      const m = JSON.parse(mb.toString()) as Manifest,
        root = path.posix.dirname(mp);
      assert.equal(m.selected, expectedCounts[ip.id as keyof typeof expectedCounts]);
      assert.equal(m.mutants.length, m.selected);
      assert.equal(m.config.id, ip.id);
      assert.equal(new Set(m.mutants.map((x) => x.id)).size, m.selected);
      const sources = new Map<string, Buffer>();
      for (const [file, digest] of Object.entries(m.sourceHashes)) {
        const b = await boundRead(repo, path.posix.join(root, "golden-source", file));
        assert.equal(sha(b), digest);
        sources.set(file, b);
      }
      const tb = await boundRead(repo, path.posix.join(root, "golden-tb.sv"));
      assert.equal(sha(tb), m.tbDigest);
      for (const x of m.mutants) {
        assert.match(x.id, /^M\d{3}$/);
        assert.ok(sources.has(x.file));
        assert.equal(
          sha(await boundRead(repo, path.posix.join(root, "mutants", x.id + ".patch"))),
          x.patchDigest,
        );
      }
      for (const [file, digest] of Object.entries(m.artifactDigests))
        assert.equal(sha(await boundRead(repo, path.posix.join(root, file))), digest);
      for (const license of m.licenses)
        assert.equal(
          sha(await boundRead(repo, path.posix.join(root, license.path))),
          license.digest,
        );
      fixtures.push({ id: ip.id, root, manifest: m, tb: tb.toString(), sources });
    }
  }
  assert.deepEqual(
    fixtures.map((f) => f.id),
    Object.keys(expectedCounts),
  );
  return { fixtures, publicationHashes: await treeHashes(repo, publication) };
}
export async function replayFamily(repo: string, label: string) {
  assert.match(label, /^[a-z0-9][a-z0-9-]{0,70}$/);
  const audited = await auditFamilyPublication(repo);
  const parent = path.join(repo, ".rtl-agent", "family-replays"),
    root = path.join(parent, label);
  const serialPath = path.join(repo, ".rtl-agent", "fifo-target-campaigns", "active.lock");
  for (const parts of [
    ["family-process-active.json"],
    ["family-preparation.pause.json"],
    ["verification-memory-build.lock"],
    ["fifo-target-campaigns", "active.lock"],
  ])
    assert.ok(!existsSync(path.join(repo, ".rtl-agent", ...parts)), "NOT_IDLE:" + parts.join("/"));
  assert.ok(!existsSync(root), "OUTPUT_EXISTS");
  await mkdir(parent, { recursive: true });
  await mkdir(path.dirname(serialPath), { recursive: true });
  const token = randomUUID(),
    lockBytes =
      JSON.stringify({
        pid: process.pid,
        token,
        label,
        kind: "uart-aes-icarus-baseline",
        startedAt: new Date().toISOString(),
      }) + "\n";
  await writeFile(serialPath, lockBytes, { flag: "wx" });
  const windows = process.platform === "win32";
  const exe = {
    iverilog:
      process.env.IVERILOG_EXE ??
      (windows ? path.join("C:", "iverilog", "bin", "iverilog.exe") : "iverilog"),
    vvp: process.env.VVP_EXE ?? (windows ? path.join("C:", "iverilog", "bin", "vvp.exe") : "vvp"),
    git:
      process.env.GIT_EXE ??
      (windows ? path.join("C:", "Program Files", "Git", "cmd", "git.exe") : "git"),
  };
  const allResults: unknown[] = [],
    goldens: unknown[] = [];
  let rootCreated = false;
  async function command(
    cwd: string,
    executable: string,
    args: string[],
    name: string,
    timeoutMs = 30000,
  ) {
    return recordedProcess({
      repo,
      cwd,
      executable,
      args,
      label: name,
      env: { ...process.env },
      timeoutMs,
      fifoLockToken: token,
    });
  }
  async function materialize(f: Fixture, name: string, mutant?: Mutant) {
    const cwd = path.join(root, f.id, name);
    await mkdir(cwd, { recursive: true });
    for (const [file, bytes] of f.sources) {
      const dest = logicalPath(cwd, file);
      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(dest, bytes, { flag: "wx" });
    }
    await writeFile(path.join(cwd, "tb.sv"), f.tb, { flag: "wx" });
    if (mutant) {
      const initialized = await command(cwd, exe.git, ["init", "--quiet"], "git-init");
      assert.equal(initialized.exitCode, 0);
      const p = logicalPath(repo, path.posix.join(f.root, "mutants", mutant.id + ".patch"));
      const applied = await command(cwd, exe.git, frozenPatchArgs(p), "apply");
      assert.equal(applied.exitCode, 0);
    }
    await checkWorkspace(f, cwd, mutant);
    return cwd;
  }
  async function checkWorkspace(f: Fixture, cwd: string, mutant?: Mutant) {
    for (const [file, digest] of Object.entries(f.manifest.sourceHashes))
      assert.equal(
        sha(await readFile(logicalPath(cwd, file))),
        mutant?.file === file ? mutant.mutatedDigest : digest,
        "SOURCE_DRIFT:" + file,
      );
    assert.equal(sha(await readFile(path.join(cwd, "tb.sv"))), f.manifest.tbDigest, "TB_DRIFT");
  }
  async function runCase(f: Fixture, mutant?: Mutant) {
    const id = mutant?.id ?? "golden",
      cwd = await materialize(f, id, mutant);
    let compile: ProcessEvidence | undefined, simulation: ProcessEvidence | undefined;
    let verdict: { outcome: RawOutcome; reason: string; fatal?: FatalEvidence };
    try {
      compile = await command(cwd, exe.iverilog, icarusArgs(f.manifest.config), "compile", 60000);
      if (compile.exitCode !== 0)
        verdict = { outcome: "compile-error", reason: "ICARUS_COMPILE_NONZERO" };
      else {
        simulation = await command(cwd, exe.vvp, ["sim.vvp"], "simulation", 30000);
        const marker = f.tb.match(/\$display\("(IP_PREPARATION_PASS[^"\r\n]+)"\)/)?.[1];
        assert.ok(marker, "PASS_MARKER_MISSING");
        verdict = classifyIcarus(simulation, f.tb, marker);
      }
    } catch (error) {
      const value = {
        ip: f.id,
        id,
        outcome: "runtime-error",
        reason: String(error),
        compileMs: compile?.durationMs ?? null,
        simulationMs: simulation?.durationMs ?? null,
      };
      await json(path.join(cwd, "result.json"), value);
      allResults.push(value);
      throw error;
    }
    await checkWorkspace(f, cwd, mutant);
    const result = {
      ip: f.id,
      id,
      ...verdict,
      semanticStatus:
        verdict.outcome === "tb-failure"
          ? "pending-review"
          : verdict.outcome === "survived"
            ? "mutation-validity-unresolved"
            : "not-accepted",
      compileMs: compile.durationMs,
      simulationMs: simulation?.durationMs ?? null,
      sourceDigest: mutant?.mutatedDigest ?? null,
      tbDigest: f.manifest.tbDigest,
      patchDigest: mutant?.patchDigest ?? null,
      evidence: path.posix.join(".rtl-agent", "family-replays", label, f.id, id),
    };
    await json(path.join(cwd, "result.json"), result);
    process.stdout.write(
      JSON.stringify({
        ip: f.id,
        id,
        outcome: verdict.outcome,
        reason: verdict.fatal?.message ?? verdict.reason,
      }) + "\n",
    );
    return result;
  }
  try {
    await mkdir(root);
    rootCreated = true;
    const runtimeFiles = [
      "tools/mutation/family-replay.ts",
      "tools/mutation/family-process.ts",
      "tools/mutation/family-replay-process.ts",
      "tools/mutation/family-preparation.ts",
      "tools/mutation/fifo-candidates.ts",
      "docs/uart-aes-baseline-replay.md",
    ];
    const runtimeHashes: Record<string, string> = {};
    for (const file of runtimeFiles) {
      const bytes = await boundRead(repo, file);
      runtimeHashes[file] = sha(bytes);
      const dest = logicalPath(path.join(root, "runtime"), file);
      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(dest, bytes, { flag: "wx" });
    }
    await json(path.join(root, "plan.json"), {
      version: "uart-aes-icarus-baseline-v2",
      createdAt: new Date().toISOString(),
      platform: process.platform,
      authoritative: false,
      modelCalls: 0,
      publication,
      publicationHashes: audited.publicationHashes,
      runtimeHashes,
      compileTimeoutMs: 60000,
      simulationTimeoutMs: 30000,
      queue: audited.fixtures.flatMap((f) =>
        f.manifest.mutants.map((m) => ({ ip: f.id, id: m.id, patchDigest: m.patchDigest })),
      ),
      classification:
        "raw TB failure requires independent semantic acceptance; all survivors validity unresolved",
    });
    for (const [name, file] of Object.entries(exe)) {
      const version = await command(
        root,
        file,
        [name === "git" ? "--version" : "-V"],
        name + "-version",
      );
      assert.equal(version.exitCode, 0);
    }
    for (const f of audited.fixtures) {
      const result = await runCase(f);
      goldens.push(result);
      assert.equal(result.outcome, "survived", "GOLDEN_FAILED:" + f.id);
    }
    await json(path.join(root, "goldens.json"), goldens);
    for (const f of audited.fixtures)
      for (const m of f.manifest.mutants) allResults.push(await runCase(f, m));
    assert.deepEqual(
      await treeHashes(repo, publication),
      audited.publicationHashes,
      "PUBLICATION_CHANGED",
    );
    for (const [file, digest] of Object.entries(runtimeHashes))
      assert.equal(sha(await boundRead(repo, file)), digest, "RUNTIME_CHANGED");
    await json(path.join(root, "summary.json"), {
      completedAt: new Date().toISOString(),
      complete: true,
      engine: "Icarus",
      goldens: goldens.length,
      mutants: allResults.length,
      results: allResults,
      publicationUnchanged: true,
      runtimeUnchanged: true,
      semanticReview: "pending",
    });
  } catch (error) {
    if (rootCreated)
      await json(path.join(root, "failure.json"), {
        finishedAt: new Date().toISOString(),
        complete: false,
        error: String(error),
        results: allResults,
        goldens,
        remaining: "See fixed plan queue minus recorded mutant results; not-run is never survived",
      });
    throw error;
  } finally {
    // Boundary runner retains its marker when cleanup cannot be confirmed. Keep serial ownership too.
    if (!existsSync(path.join(repo, ".rtl-agent", "family-process-active.json"))) {
      assert.equal(await readFile(serialPath, "utf8"), lockBytes, "SERIAL_OWNERSHIP_CHANGED");
      await unlink(serialPath);
    }
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [mode, label] = process.argv.slice(2);
  if (mode === "preflight" && !label) {
    const a = await auditFamilyPublication(process.cwd());
    process.stdout.write(
      JSON.stringify({
        ips: a.fixtures.length,
        mutants: a.fixtures.reduce((n, f) => n + f.manifest.mutants.length, 0),
        publicationFiles: Object.keys(a.publicationHashes).length,
      }) + "\n",
    );
  } else if (mode === "run" && label) await replayFamily(process.cwd(), label);
  else throw Error("Usage: family-replay.ts preflight | run unique-label");
}
