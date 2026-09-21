import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  directedSemanticReviewTemplate,
  prepareDirectedEvaluation,
  validateDirectedGenerationComplete,
  type DirectedGenerationComplete,
} from "./evaluate-fifo-directed.ts";
import { rawSimulationVerdict, usageCompileArguments } from "./evaluate-fifo-usage.ts";

const sha = (value: Buffer | string) => createHash("sha256").update(value).digest("hex");
const label = "test-directed";
const plan = Buffer.from('{"suiteDigest":"' + "a".repeat(64) + '"}\n');
function seal(): DirectedGenerationComplete {
  return {
    schemaVersion: 1,
    planDigest: sha(plan),
    finishedAt: "2026-09-18T00:00:00.000Z",
    completed: [1, 2, 3].map((repeat) => {
      const name = `${label}-dpretet-r${repeat}-e`;
      const run = `.rtl-agent/fifo-target-runs/${name}/dpretet-depth8-width8/run_001`;
      return {
        group: "E",
        mode: "directed-memory10",
        check: false,
        repeat,
        name,
        run,
        agentAttempts: 2,
        selectedAttempt: 3,
        selectedSnapshot: `${run}/evidence/verification-assets/attempt-3`,
        selectedManifestDigest: "b".repeat(64),
        generationStatus: "completed",
        stopReason: "NO_MEANINGFUL_GAIN",
      };
    }),
  };
}

test("directed evaluator waits for exactly three distinct terminal E repetitions", () => {
  assert.equal(validateDirectedGenerationComplete(seal(), plan, label).completed.length, 3);
  const short = seal();
  short.completed.pop();
  assert.throws(() => validateDirectedGenerationComplete(short, plan, label), /ALL_3_REQUIRED/);
  const long = seal();
  long.completed.push(long.completed[0]!);
  assert.throws(() => validateDirectedGenerationComplete(long, plan, label), /ALL_3_REQUIRED/);
  const wrongGroup: unknown = {
    ...seal(),
    completed: seal().completed.map((s) => ({ ...s, group: "D" })),
  };
  assert.throws(() => validateDirectedGenerationComplete(wrongGroup, plan, label), /INVALID_GROUP/);
  const duplicate = seal();
  duplicate.completed[1] = duplicate.completed[0]!;
  assert.throws(
    () => validateDirectedGenerationComplete(duplicate, plan, label),
    /DUPLICATE_GROUP_REPEAT/,
  );
  const running = seal();
  running.completed[2]!.generationStatus = "running";
  assert.throws(
    () => validateDirectedGenerationComplete(running, plan, label),
    /NONTERMINAL_GENERATION/,
  );
});

test("seal binds raw plan bytes, exact sample names, final attempt and snapshot paths", () => {
  assert.throws(
    () => validateDirectedGenerationComplete(seal(), Buffer.from("changed"), label),
    /PLAN_DIGEST_MISMATCH/,
  );
  const early = seal();
  early.completed[0]!.selectedAttempt = 2;
  assert.throws(
    () => validateDirectedGenerationComplete(early, plan, label),
    /FINAL_SELECTION_REQUIRED/,
  );
  const escape = seal();
  escape.completed[0]!.selectedSnapshot = "../../rtl";
  assert.throws(
    () => validateDirectedGenerationComplete(escape, plan, label),
    /FINAL_SNAPSHOT_PATH_REQUIRED/,
  );
  const wrongName = seal();
  wrongName.completed[0]!.name = "some-other-campaign-dpretet-r1-e";
  assert.throws(
    () => validateDirectedGenerationComplete(wrongName, plan, label),
    /SAMPLE_NAME_MISMATCH/,
  );
  const wrongRun = seal();
  wrongRun.completed[0]!.run = wrongRun.completed[1]!.run;
  assert.throws(
    () => validateDirectedGenerationComplete(wrongRun, plan, label),
    /RUN_NAME_MISMATCH/,
  );
  const tooMany = seal();
  tooMany.completed[0]!.agentAttempts = 4;
  assert.throws(() => validateDirectedGenerationComplete(tooMany, plan, label));
});

test("failed final selections remain in the denominator without fallback or extra samples", () => {
  const value = seal();
  Object.assign(value.completed[0]!, {
    run: null,
    selectedSnapshot: null,
    selectedManifestDigest: null,
    agentAttempts: 0,
    selectedAttempt: 0,
    generationStatus: "generation-failed",
  });
  assert.equal(validateDirectedGenerationComplete(value, plan, label).completed.length, 3);
  assert.equal(value.completed[0]!.selectedSnapshot, null);
  const wrongDigest = structuredClone(value);
  wrongDigest.completed[0]!.selectedManifestDigest = "b".repeat(64);
  assert.throws(
    () => validateDirectedGenerationComplete(wrongDigest, plan, label),
    /DIGEST_WITHOUT_SNAPSHOT/,
  );
});

test("raw kill still cannot automatically establish directed semantic adoption", () => {
  const fatal = { exitCode: 1, error: null, stdout: "Assertion failed FULL_AND_EMPTY", stderr: "" };
  assert.equal(rawSimulationVerdict(fatal, false), "killed");
  assert.equal(rawSimulationVerdict(fatal, true), "golden-invalid");
  assert.equal(
    rawSimulationVerdict({ ...fatal, stdout: "Assertion failed TIMEOUT" }, false),
    "timeout",
  );
  const review = directedSemanticReviewTemplate(seal().completed[0]!, true, "killed");
  assert.equal(review.group, "E");
  assert.equal(review.primaryStatus, "unconfirmed");
  assert.equal(review.executionStatus, "unconfirmed");
  assert.equal(review.semanticStatus, "unreviewed");
  assert.deepEqual(review.actualExecutionEvidence, []);
  const argv = usageCompileArguments(true);
  assert.equal(argv[argv.indexOf("--Mdir") + 1], "build");
  assert.equal(argv[argv.indexOf("-o") + 1], "sim.exe");
  assert.ok(argv.includes("--assert") && argv.includes("--timing"));
});

async function fixture() {
  const parent = path.resolve(".rtl-agent", "fifo-directed-evaluator-tests");
  await mkdir(parent, { recursive: true });
  const repo = await mkdtemp(path.join(parent, "case-"));
  const write = async (logical: string, value: string | Buffer) => {
    const dest = path.join(repo, ...logical.split("/"));
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, value);
  };
  const sourcePaths = ["async_fifo", "fifomem", "rptr_empty", "wptr_full", "sync_r2w", "sync_w2r"];
  const sourceHashes: Record<string, string> = {};
  for (const name of sourcePaths) {
    const bytes = name === "wptr_full" ? "wfull <= 1'b0;\n" : `module ${name}; endmodule\n`;
    sourceHashes[`rtl/${name}.v`] = sha(bytes);
    await write(`mutation/fifo-transfer-v2/dpretet/golden-source/rtl/${name}.v`, bytes);
  }
  const patch = "fixture patch never executed\n";
  await write("mutation/fifo-transfer-v2/dpretet/mutants/M010.patch", patch);
  const manifest = JSON.stringify({
    sourceHashes,
    mutants: [
      {
        id: "M010",
        file: "rtl/wptr_full.v",
        line: 1,
        originalLine: "wfull <= 1'b0;",
        mutatedLine: "wfull <= 1'b1;",
        mutatedDigest: sha("wfull <= 1'b1;\n"),
        patchDigest: sha(patch),
      },
    ],
  });
  await write("mutation/fifo-transfer-v2/dpretet/manifest.json", manifest);
  const suite = JSON.stringify({ ips: [{ id: "dpretet", manifestDigest: sha(manifest) }] });
  await write("mutation/fifo-transfer-v2/manifest.json", suite);
  const protocol = "fixture preregistered directed protocol\n";
  const runtime = "fixture runtime without execution\n";
  await write("docs/fifo-memory10-directed-diagnostic.md", protocol);
  await write("tools/fixture.ts", runtime);
  const memoryRoot = ".rtl-agent/verification-memory/k3-build-20260917-100104";
  const items = JSON.stringify({
    items: Array.from({ length: 13 }, (_, index) => ({
      id: index === 9 ? "consol-mid-reset-assert" : `fixture-${index}`,
    })),
  });
  const memoryManifest = JSON.stringify({
    memoryCount: 13,
    itemsDigest: "sha256:" + sha(items),
    sourceOnly: true,
    targetUpdates: false,
  });
  await write(memoryRoot + "/items.json", items);
  await write(memoryRoot + "/manifest.json", memoryManifest);
  const value = seal();
  const planValue = {
    kind: "directed-memory10-development-diagnostic",
    build: "k3-build-20260917-100104",
    suiteDigest: sha(suite),
    protocolDigest: sha(protocol),
    itemsDigest: sha(items),
    manifestDigest: sha(memoryManifest),
    runtimeHashes: { "tools/fixture.ts": sha(runtime) },
    queue: [1, 2, 3].map((repeat) => ({ group: "E", repeat })),
  };
  const entries = [];
  for (const name of sourcePaths) {
    const bytes = await readFile(
      path.join(
        repo,
        "mutation",
        "fifo-transfer-v2",
        "dpretet",
        "golden-source",
        "rtl",
        `${name}.v`,
      ),
    );
    entries.push({
      path: `rtl/dut/${name}.v`,
      byteLength: bytes.length,
      contentDigest: `sha256:${sha(bytes)}`,
      bytes,
    });
  }
  for (const file of ["rtl/dut/top_wrapper.sv", "rtl/checker.sv", "rtl/tb.sv"]) {
    const bytes = Buffer.from("// fixture, no simulation\n");
    entries.push({
      path: file,
      byteLength: bytes.length,
      contentDigest: `sha256:${sha(bytes)}`,
      bytes,
    });
  }
  const snapshot = {
    attempt: 3,
    entries: entries.map(({ path: entryPath, byteLength, contentDigest }) => ({
      path: entryPath,
      byteLength,
      contentDigest,
    })),
  };
  for (const item of value.completed) {
    const bytes = JSON.stringify(snapshot);
    item.selectedManifestDigest = sha(bytes);
    await write(`${item.selectedSnapshot}/manifest.json`, bytes);
    for (const entry of entries) await write(`${item.selectedSnapshot}/${entry.path}`, entry.bytes);
  }
  const saveSeal = async () => {
    const planBytes = JSON.stringify(planValue);
    value.planDigest = sha(planBytes);
    await write(`.rtl-agent/fifo-directed-campaigns/${label}/plan.json`, planBytes);
    await write(
      `.rtl-agent/fifo-directed-campaigns/${label}/generation-complete.json`,
      JSON.stringify(value),
    );
  };
  await saveSeal();
  return { repo, write, seal: value, planValue, saveSeal, snapshot, memoryRoot };
}

test("all three final snapshot contents are hash-checked before any RTL process", async () => {
  const f = await fixture();
  const prepared = await prepareDirectedEvaluation(f.repo, label);
  assert.equal(prepared.selections.length, 3);
  assert.equal(prepared.selections[0]!.assets!.size, 9);
  await f.write(`${f.seal.completed[2]!.selectedSnapshot}/rtl/tb.sv`, "changed last candidate\n");
  await assert.rejects(prepareDirectedEvaluation(f.repo, label), /SNAPSHOT_CONTENT_CHANGED/);
});

test("fresh snapshot and seal hashes cannot authorize edits to protected DUT bytes", async () => {
  const f = await fixture();
  const selected = f.seal.completed[0]!;
  const modified = Buffer.from("wfull <= 1'b1;\n");
  const entry = f.snapshot.entries.find((e) => e.path === "rtl/dut/wptr_full.v")!;
  entry.contentDigest = "sha256:" + sha(modified);
  entry.byteLength = modified.length;
  await f.write(`${selected.selectedSnapshot}/${entry.path}`, modified);
  const bytes = JSON.stringify(f.snapshot);
  selected.selectedManifestDigest = sha(bytes);
  await f.write(`${selected.selectedSnapshot}/manifest.json`, bytes);
  await f.saveSeal();
  await assert.rejects(prepareDirectedEvaluation(f.repo, label), /PROTECTED_DUT_CHANGED/);
});

test("runtime, protocol and frozen original Memory changes fail before evaluation", async () => {
  const runtime = await fixture();
  await runtime.write("tools/fixture.ts", "changed runtime");
  await assert.rejects(prepareDirectedEvaluation(runtime.repo, label), /RUNTIME_CHANGED/);
  const protocol = await fixture();
  await protocol.write("docs/fifo-memory10-directed-diagnostic.md", "changed protocol");
  await assert.rejects(prepareDirectedEvaluation(protocol.repo, label), /PROTOCOL_CHANGED/);
  const memory = await fixture();
  await memory.write(memory.memoryRoot + "/items.json", "changed Memory");
  await assert.rejects(prepareDirectedEvaluation(memory.repo, label), /FROZEN_ITEMS_CHANGED/);
});

test("plan cannot substitute another diagnostic kind, extra draws or path escapes", async () => {
  const wrongKind = await fixture();
  wrongKind.planValue.kind = "usage-2x2";
  await wrongKind.saveSeal();
  await assert.rejects(prepareDirectedEvaluation(wrongKind.repo, label), /INVALID_PLAN_KIND/);
  const queue = await fixture();
  queue.planValue.queue.push({ group: "E", repeat: 4 });
  await queue.saveSeal();
  await assert.rejects(prepareDirectedEvaluation(queue.repo, label), /DIRECTED_QUEUE_REQUIRED/);
  const escape = await fixture();
  Object.assign(escape.planValue.runtimeHashes, { "../outside": sha("x") });
  await escape.saveSeal();
  await assert.rejects(prepareDirectedEvaluation(escape.repo, label), /INVALID_LOGICAL_PATH/);
});
