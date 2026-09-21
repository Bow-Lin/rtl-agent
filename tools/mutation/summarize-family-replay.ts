import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { auditFamilyPublication, classifyIcarus } from "./family-replay.ts";

const repo = process.cwd();
const baseline = ".rtl-agent/family-replays/uart-aes-baseline-20260920-v2";
const audit = ".rtl-agent/family-replay-audits/uart-aes-baseline-20260920-v1";
const digest = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const host = (file: string) => path.resolve(repo, ...file.split("/"));
const inputDigests: Record<string, string> = {};
async function bytes(file: string) {
  const b = await readFile(host(file));
  inputDigests[file] = digest(b);
  return b;
}
async function json(file: string) {
  return JSON.parse((await bytes(file)).toString());
}
async function output(file: string, value: unknown) {
  await writeFile(host(file), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
}
const review = await json("tools/mutation/fixtures/uart-aes-replay-review.json");
const summary = await json(path.posix.join(baseline, "summary.json"));
const plan = await json(path.posix.join(baseline, "plan.json"));
const audited = await auditFamilyPublication(repo);
assert.equal(summary.complete, true);
assert.equal(summary.mutants, 190);
assert.equal(summary.goldens, 7);
assert.deepEqual(audited.publicationHashes, plan.publicationHashes);
for (const [file, hash] of Object.entries(plan.runtimeHashes)) {
  assert.equal(digest(await bytes(file)), hash);
  assert.equal(digest(await bytes(path.posix.join(baseline, "runtime", file))), hash);
}
for (const name of ["iverilog", "vvp", "git"])
  await json(path.posix.join(baseline, name + "-version.json"));
const accepted: Record<string, unknown>[] = [];
const survivors: Record<string, unknown>[] = [];
const rows = [];
let caseIndex = 0;
for (const f of audited.fixtures) {
  const prefix = path.posix.join(baseline, f.id),
    marker = f.tb.match(/\$display\("(IP_PREPARATION_PASS[^"\r\n]+)"\)/)![1];
  const gc = await json(path.posix.join(prefix, "golden", "compile.json")),
    gs = await json(path.posix.join(prefix, "golden", "simulation.json"));
  assert.equal(gc.exitCode, 0);
  assert.equal(classifyIcarus(gs, f.tb, marker).outcome, "survived");
  const row = {
    ip: f.id,
    total: f.manifest.mutants.length,
    killed: 0,
    survived: 0,
    infrastructure: 0,
    unresolvedOutcome: 0,
    validityUnresolved: 0,
    witnessedSurvivors: 0,
    compileMs: 0,
    simulationMs: 0,
    goldenCompileMs: gc.durationMs,
    goldenSimulationMs: gs.durationMs,
    xSensitiveKills: [] as string[],
    failureKinds: {} as Record<string, number>,
    survivorIds: [] as string[],
  };
  for (const m of f.manifest.mutants) {
    const caseRoot = path.posix.join(prefix, m.id);
    assert.deepEqual(plan.queue[caseIndex], { ip: f.id, id: m.id, patchDigest: m.patchDigest });
    const r = await json(path.posix.join(caseRoot, "result.json"));
    assert.deepEqual(r, summary.results[caseIndex++]);
    const c = await json(path.posix.join(caseRoot, "compile.json")),
      s = await json(path.posix.join(caseRoot, "simulation.json")),
      apply = await json(path.posix.join(caseRoot, "apply.json"));
    for (const p of [c, s, apply]) {
      assert.equal(p.error, null);
      assert.equal(p.signal, null);
      assert.equal(p.cleanupConfirmed, true);
    }
    assert.equal(c.exitCode, 0);
    assert.equal(apply.exitCode, 0);
    const raw = classifyIcarus(s, f.tb, marker);
    assert.equal(raw.outcome, r.outcome);
    if (raw.fatal) assert.deepEqual(raw.fatal, r.fatal);
    for (const [file, hash] of Object.entries(f.manifest.sourceHashes))
      assert.equal(
        digest(await readFile(host(path.posix.join(caseRoot, file)))),
        file === m.file ? m.mutatedDigest : hash,
      );
    assert.equal(digest(await bytes(path.posix.join(caseRoot, "tb.sv"))), f.manifest.tbDigest);
    await bytes(path.posix.join(caseRoot, "sim.vvp"));
    row.compileMs += c.durationMs;
    row.simulationMs += s.durationMs;
    const entry: Record<string, unknown> = {
      ip: f.id,
      id: m.id,
      patchDigest: m.patchDigest,
      tbDigest: f.manifest.tbDigest,
      sourceFile: m.file,
      sourceLine: m.line,
      operator: m.operator,
      rawOutcome: r.outcome,
      evidence: caseRoot,
      firstFailure: r.fatal ?? null,
      compileMs: c.durationMs,
      simulationMs: s.durationMs,
    };
    if (raw.outcome === "tb-failure") {
      const kind = r.fatal.message.split(/\s/)[0];
      const rule =
        review.fatalRules[f.id + ":" + kind] ??
        (f.manifest.config.family === "uart" ? review.fatalRules["uart:" + kind] : undefined);
      assert.ok(rule, "UNREVIEWED_FATAL:" + f.id + ":" + kind);
      entry.baselineVerdict = "killed";
      entry.semanticReview = rule;
      entry.validity = "witnessed-in-frozen-baseline";
      entry.fourStateUnknownObserved = /got=.*x/.test(r.fatal.message);
      if (entry.fourStateUnknownObserved) row.xSensitiveKills.push(m.id);
      row.killed++;
      row.failureKinds[kind] = (row.failureKinds[kind] ?? 0) + 1;
    } else {
      assert.equal(raw.outcome, "survived", "NON_FUNCTIONAL_OUTCOME_NEEDS_REVIEW");
      const note = review.survivors[f.id + "/" + m.id];
      assert.ok(note, "MISSING_SURVIVOR_AUDIT");
      entry.baselineVerdict = "survived";
      entry.validity = note.status;
      entry.audit = note;
      row.survived++;
      row.survivorIds.push(m.id);
      if (note.status === "unresolved") row.validityUnresolved++;
      else row.witnessedSurvivors++;
      survivors.push(entry);
    }
    accepted.push(entry);
  }
  rows.push(row);
}
assert.equal(caseIndex, 190);
assert.equal(survivors.length, 25);
assert.equal(Object.keys(review.survivors).length, 25);
const uartWitness = ".rtl-agent/family-replays/uart-aes-witness-20260920-v1/uart16550";
const aesWitness =
  ".rtl-agent/family-replays/uart-aes-witness-20260920-aes-recovery-v1/aes-pipeline";
const ug = await json(path.posix.join(uartWitness, "golden", "witness.json")),
  um = await json(path.posix.join(uartWitness, "M021", "witness.json"));
assert.equal(ug.exitCode, 0);
assert.match(ug.stdout, /WITNESS_PASS/);
assert.equal(um.exitCode, 1);
assert.match(um.stdout, /WITNESS_TX_STOP frame=0 sampled=0/);
assert.equal(ug.tbDigest, um.tbDigest);
const ag = await json(path.posix.join(aesWitness, "golden", "witness.json")),
  am = await json(path.posix.join(aesWitness, "M011", "witness.json"));
assert.equal(ag.exitCode, 0);
assert.equal(am.exitCode, 0);
assert.ok(!ag.stdout.includes("WITNESS_UNEXPECTED_VALID"));
assert.match(am.stdout, /WITNESS_VALID time=55000 accepted=0 observed=0 data=0+/);
const pipe = audited.fixtures.find((f) => f.id === "aes-pipeline")!;
assert.equal(ag.tbDigest, pipe.manifest.tbDigest);
assert.equal(am.tbDigest, pipe.manifest.tbDigest);
for (const [where, id] of [
  [uartWitness, "M021"],
  [aesWitness, "M011"],
])
  for (const item of ["golden", id])
    for (const name of ["compile.json", "simulation.json"]) {
      const p = await json(path.posix.join(where, item, name));
      assert.equal(p.error, null);
      assert.equal(p.signal, null);
      assert.equal(p.cleanupConfirmed, true);
    }
const old = await json(
  ".rtl-agent/fifo-directed-campaigns/fifo-directed-memory10-20260918-v1/plan.json",
);
for (const [file, hash] of Object.entries(old.runtimeHashes))
  assert.equal(digest(await readFile(host(file))), hash);
await mkdir(path.dirname(host(audit)), { recursive: true });
await mkdir(host(audit), { recursive: false });
const result = {
  version: "uart-aes-baseline-review-v1",
  reviewedAt: new Date().toISOString(),
  reviewer: review.reviewer,
  baseline,
  engine: "Icarus Verilog 12.0 devel g2693dd32b; four-state",
  modelCalls: 0,
  rows,
  totals: {
    mutants: 190,
    killed: 165,
    survived: 25,
    infrastructure: 0,
    unresolvedOutcome: 0,
    witnessedSurvivors: 2,
    validityUnresolvedSurvivors: 23,
  },
  adjustedScore: null,
  independentWitnesses: [
    { ip: "uart16550", id: "M021", evidence: uartWitness },
    { ip: "aes-pipeline", id: "M011", evidence: aesWitness },
  ],
  baselineScoresChangedByWitnesses: false,
  publicationFilesUnchanged: Object.keys(plan.publicationHashes).length,
  priorFifoRuntimeFilesUnchanged: Object.keys(old.runtimeHashes).length,
  accepted,
  survivors,
  inputDigests,
};
assert.equal(
  rows.reduce((n, r) => n + r.killed, 0),
  165,
);
assert.equal(
  rows.reduce((n, r) => n + r.validityUnresolved, 0),
  23,
);
await output(path.posix.join(audit, "review.json"), result);
await output("exp_result/09.20-uart-aes-kill-baseline.json", result);
process.stdout.write(JSON.stringify({ audit, rows, totals: result.totals }) + "\n");
