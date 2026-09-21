import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  prepareUsageEvaluation,
  rawSimulationVerdict,
  semanticReviewTemplate,
  usageCompileArguments,
  validateGenerationComplete,
  type GenerationComplete,
} from "./evaluate-fifo-usage.ts";

const sha = (value: Buffer | string) => createHash("sha256").update(value).digest("hex");
const plan = Buffer.from('{"suiteDigest":"' + "a".repeat(64) + '"}\n');
function seal(): GenerationComplete {
  return {
    schemaVersion: 1,
    planDigest: sha(plan),
    finishedAt: "2026-09-18T00:00:00.000Z",
    completed: (["A", "B", "C", "D"] as const).flatMap((group) =>
      [1, 2, 3].map((repeat) => {
        const name = `usage-${group.toLowerCase()}-r${repeat}`;
        const run = `.rtl-agent/fifo-target-runs/${name}/dpretet-depth8-width8/run_001`;
        return {
          group,
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
    ),
  };
}

test("evaluator requires a digest-bound complete 2x2 seal with three distinct draws per cell", () => {
  assert.equal(validateGenerationComplete(seal(), plan).completed.length, 12);
  const short = seal();
  short.completed.pop();
  assert.throws(() => validateGenerationComplete(short, plan), /ALL_12_REQUIRED/);
  const duplicate = seal();
  duplicate.completed[1] = duplicate.completed[0]!;
  assert.throws(() => validateGenerationComplete(duplicate, plan), /DUPLICATE_GROUP_REPEAT/);
  const running = seal();
  running.completed[11]!.generationStatus = "running";
  assert.throws(() => validateGenerationComplete(running, plan), /NONTERMINAL_GENERATION/);
  assert.throws(
    () => validateGenerationComplete(seal(), Buffer.from("changed")),
    /PLAN_DIGEST_MISMATCH/,
  );
});

test("selection cannot pick an earlier valid attempt or escape its sealed run", () => {
  const early = seal();
  early.completed[0]!.selectedAttempt = 2;
  assert.throws(() => validateGenerationComplete(early, plan), /FINAL_SELECTION_REQUIRED/);
  const pathEscape = seal();
  pathEscape.completed[0]!.selectedSnapshot = "../../rtl";
  assert.throws(() => validateGenerationComplete(pathEscape, plan), /FINAL_SNAPSHOT_PATH_REQUIRED/);
  const mismatch = seal();
  mismatch.completed[0]!.name = "different";
  assert.throws(() => validateGenerationComplete(mismatch, plan), /RUN_NAME_MISMATCH/);
});

test("unavailable final draws stay in the denominator without baseline or best fallback", () => {
  const value = seal();
  Object.assign(value.completed[0]!, {
    run: null,
    selectedSnapshot: null,
    selectedManifestDigest: null,
    agentAttempts: 0,
    selectedAttempt: 0,
    generationStatus: "generation-failed",
  });
  assert.equal(validateGenerationComplete(value, plan).completed.length, 12);
  assert.equal(value.completed[0]!.selectedSnapshot, null);
  const wrongDigest = structuredClone(value);
  wrongDigest.completed[0]!.selectedManifestDigest = "b".repeat(64);
  assert.throws(() => validateGenerationComplete(wrongDigest, plan), /DIGEST_WITHOUT_SNAPSHOT/);
});

test("raw M010 kill never automatically establishes primary success or execution", () => {
  const fatal = { exitCode: 1, error: null, stdout: "Assertion failed FULL_AND_EMPTY", stderr: "" };
  assert.equal(rawSimulationVerdict(fatal, false), "killed");
  assert.equal(rawSimulationVerdict(fatal, true), "golden-invalid");
  assert.equal(
    rawSimulationVerdict({ ...fatal, stdout: "Assertion failed: TIMEOUT" }, false),
    "timeout",
  );
  const review = semanticReviewTemplate(seal().completed[0]!, true, "killed");
  assert.equal(review.primaryStatus, "unconfirmed");
  assert.equal(review.executionStatus, "unconfirmed");
  assert.equal(review.semanticStatus, "unreviewed");
  assert.deepEqual(review.actualExecutionEvidence, []);
  assert.equal(
    rawSimulationVerdict({ ...fatal, stdout: "uncaught program error" }, false),
    "program-error",
  );
  assert.equal(
    rawSimulationVerdict({ ...fatal, exitCode: 0, stdout: "" }, false),
    "output-invalid",
  );
});

test("fixed compile profile has only final golden source units and bounded relative outputs", () => {
  const argv = usageCompileArguments(true);
  assert.equal(argv[argv.indexOf("--Mdir") + 1], "build");
  assert.equal(argv[argv.indexOf("-o") + 1], "sim.exe");
  assert.equal(argv.filter((value) => value.endsWith(".sv") || value.endsWith(".v")).length, 9);
  assert.ok(argv.includes("--assert") && argv.includes("--timing"));
  assert.ok(!argv.some((value) => path.isAbsolute(value) || value.includes("..")));
  assert.ok(!usageCompileArguments(false).includes("-CFLAGS"));
});

test("prepare hashes every selected final and protected DUT before any process can run", async () => {
  const parent = path.resolve(".rtl-agent", "fifo-usage-evaluator-tests");
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
  const patch = "test patch only; preparation never executes it\n";
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
  const value = seal();
  const planBytes = Buffer.from(JSON.stringify({ suiteDigest: sha(suite) }));
  value.planDigest = sha(planBytes);
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
    const bytes = Buffer.from("// unexecuted fixture\n");
    entries.push({
      path: file,
      byteLength: bytes.length,
      contentDigest: `sha256:${sha(bytes)}`,
      bytes,
    });
  }
  for (const item of value.completed) {
    const snapshot = JSON.stringify({
      attempt: 3,
      entries: entries.map(({ path: entryPath, byteLength, contentDigest }) => ({
        path: entryPath,
        byteLength,
        contentDigest,
      })),
    });
    item.selectedManifestDigest = sha(snapshot);
    await write(`${item.selectedSnapshot}/manifest.json`, snapshot);
    for (const entry of entries) await write(`${item.selectedSnapshot}/${entry.path}`, entry.bytes);
  }
  await write(".rtl-agent/fifo-usage-campaigns/test/plan.json", planBytes);
  await write(
    ".rtl-agent/fifo-usage-campaigns/test/generation-complete.json",
    JSON.stringify(value),
  );
  const prepared = await prepareUsageEvaluation(repo, "test");
  assert.equal(prepared.selections.length, 12);
  assert.equal(prepared.selections[0]!.assets!.size, 9);
  await write(`${value.completed[11]!.selectedSnapshot}/rtl/tb.sv`, "changed last sample\n");
  await assert.rejects(prepareUsageEvaluation(repo, "test"), /SNAPSHOT_CONTENT_CHANGED/);
});
