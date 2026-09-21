import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { CoreLoopRun, RtlAgentAdapter } from "../../packages/core-loop/dist/index.js";
import { BUILD, frozenContext, hash } from "./verification-frozen-adapter.ts";
import {
  DIRECTED_MEMORY_ID,
  DIRECTED_WORK_ITEM,
  directedContext,
  withDirectedMemory,
} from "./verification-directed-memory.ts";

const input = {
  schemaVersion: 1,
  runId: "run_12345678-1234-4234-8234-123456789012",
  attempt: 2,
  category: "SEEDED_COMPILE_REPAIR",
  specPath: "spec.md",
  workspaceRtlRoot: "rtl",
  rtlSourceFiles: ["rtl/checker.sv", "rtl/dut/top_wrapper.sv", "rtl/tb.sv"],
  topModule: "TopModule",
  taskKind: "VERIFICATION_ASSET_GENERATION",
  protectedRtlPaths: ["rtl/dut/top_wrapper.sv"],
  mutableRtlPaths: ["rtl/checker.sv", "rtl/tb.sv"],
  coverageFeedbackPath: "context/coverage-round-1.json",
};
async function setup() {
  const root = await mkdtemp(path.join(os.tmpdir(), "fifo-directed-test-"));
  const workspace = path.join(root, "workspace");
  await mkdir(path.join(workspace, "context"), { recursive: true });
  await mkdir(path.join(workspace, "rtl"));
  await mkdir(path.join(root, "evidence"));
  await writeFile(path.join(workspace, "spec.md"), "Original contract.\n");
  await writeFile(path.join(workspace, "rtl", "tb.sv"), "module tb; endmodule\n");
  await writeFile(path.join(workspace, "context", "coverage-round-1.json"), "{}\n");
  const run = {
    runDirectory: root,
    workspaceDirectory: workspace,
    fixture: { provenance: { identity: { caseId: "dpretet-depth8-width8" } } },
  } as unknown as CoreLoopRun;
  return { root, workspace, run };
}

test("selects only original item10 with every field verbatim and original advisory", async () => {
  const repo = process.cwd();
  const all = JSON.parse(
    await readFile(
      path.join(repo, ".rtl-agent", "verification-memory", BUILD, "items.json"),
      "utf8",
    ),
  );
  const selected = await directedContext(repo);
  assert.equal(all.items[9].id, DIRECTED_MEMORY_ID);
  assert.deepEqual(selected.selectedItem, all.items[9]);
  assert.deepEqual(selected.selectedIds, [DIRECTED_MEMORY_ID]);
  assert.ok(
    selected.content.includes(JSON.stringify({ schemaVersion: 1, items: [all.items[9]] }, null, 2)),
  );
  for (const item of all.items)
    if (item.id !== DIRECTED_MEMORY_ID) assert.ok(!selected.content.includes(item.id));
  assert.equal(selected.selectedItemDigest, hash(selected.selectedItemCanonical));
  assert.deepEqual(JSON.parse(selected.selectedItemCanonical), all.items[9]);
  assert.deepEqual(
    Object.keys(JSON.parse(selected.selectedItemCanonical)),
    Object.keys(all.items[9]).sort(),
  );
  const full = await frozenContext(repo);
  const originalAdvisory = full.content.slice(
    0,
    full.content.indexOf("Deterministic select-all-v1:"),
  );
  assert.ok(selected.content.startsWith(originalAdvisory + DIRECTED_WORK_ITEM));
  assert.doesNotMatch(selected.content, /Deterministic select-all-v1/);
  assert.doesNotMatch(
    DIRECTED_WORK_ITEM,
    /reset|full|empty|M010|C3|negedge|posedge|\d+\s*ns|复位/iu,
  );
});

test("adds the same work item to context and spec without changing input permissions or turns", async () => {
  const { root, workspace, run } = await setup();
  const selected = await directedContext(process.cwd());
  let calls = 0,
    probes = 0;
  const adapter = withDirectedMemory(
    {
      async probe() {
        probes++;
        return { sentinel: "probe" };
      },
      async runTurn(actual: unknown, actualRun: CoreLoopRun) {
        calls++;
        assert.deepEqual(actual, {
          ...input,
          attempt: calls + 1,
          relevantMemoryPath: "context/relevant-rtl-memory.md",
        });
        assert.equal(actualRun, run);
        assert.equal(
          await readFile(path.join(workspace, "spec.md"), "utf8"),
          `Original contract.\n\n\n${DIRECTED_WORK_ITEM}\n`,
        );
        assert.equal(
          await readFile(path.join(workspace, "context", "relevant-rtl-memory.md"), "utf8"),
          selected.content,
        );
        return { sentinel: calls };
      },
    } as unknown as RtlAgentAdapter,
    process.cwd(),
  );
  await adapter.probe();
  for (const attempt of [2, 3, 4]) {
    assert.deepEqual(await adapter.runTurn({ ...input, attempt }, run), { sentinel: attempt - 1 });
    const receipt = JSON.parse(
      await readFile(path.join(root, "evidence", `directed-memory-${attempt}.json`), "utf8"),
    );
    assert.equal(receipt.additionalModelTurns, 0);
    assert.equal(receipt.originalSpecDigest, hash("Original contract.\n"));
    assert.equal(
      receipt.preparedSpecDigest,
      hash(`Original contract.\n\n\n${DIRECTED_WORK_ITEM}\n`),
    );
    assert.equal(receipt.injectionDigest, selected.injectionDigest);
    assert.equal(receipt.addendumDigest, hash(DIRECTED_WORK_ITEM));
    assert.deepEqual(receipt.selectedItem, selected.selectedItem);
    assert.equal(receipt.placement.length, 2);
  }
  assert.equal(calls, 3);
  assert.equal(probes, 1);
  assert.equal(
    await readFile(path.join(workspace, "rtl", "tb.sv"), "utf8"),
    "module tb; endmodule\n",
  );
  assert.equal(
    await readFile(path.join(workspace, "context", "coverage-round-1.json"), "utf8"),
    "{}\n",
  );
  await assert.rejects(
    adapter.runTurn({ ...input, attempt: 5 }, run),
    /DIRECTED_THREE_TURN_BUDGET/,
  );
  assert.equal(calls, 3);
});

for (const changed of ["spec.md", "context/relevant-rtl-memory.md"])
  test(`rejects altered ${changed} before another turn`, async () => {
    const { workspace, run } = await setup();
    let calls = 0;
    const adapter = withDirectedMemory(
      {
        async runTurn() {
          calls++;
          return {};
        },
      } as unknown as RtlAgentAdapter,
      process.cwd(),
    );
    await adapter.runTurn(input, run);
    await writeFile(path.join(workspace, ...changed.split("/")), "changed\n");
    await assert.rejects(
      adapter.runTurn({ ...input, attempt: 3 }, run),
      /DIRECTED_(?:SPEC|CONTEXT)_CHANGED/,
    );
    assert.equal(calls, 1);
  });

test("rejects spec/context tampering even when delegate throws", async () => {
  const { workspace, run } = await setup();
  const adapter = withDirectedMemory(
    {
      async runTurn() {
        await writeFile(path.join(workspace, "context", "relevant-rtl-memory.md"), "tampered\n");
        throw new Error("delegate failed");
      },
    } as unknown as RtlAgentAdapter,
    process.cwd(),
  );
  await assert.rejects(adapter.runTurn(input, run), /DIRECTED_CONTEXT_CHANGED/);
});

test("rejects wrong target, late injection, skipped attempts, and pre-bound Memory", async () => {
  const { run } = await setup();
  let calls = 0;
  const adapter = withDirectedMemory(
    {
      async runTurn() {
        calls++;
        return {};
      },
    } as unknown as RtlAgentAdapter,
    process.cwd(),
  );
  await assert.rejects(
    adapter.runTurn(input, {
      ...run,
      fixture: { provenance: { identity: { caseId: "axis-depth8-width8" } } },
    } as unknown as CoreLoopRun),
    /DIRECTED_TARGET_REQUIRED/,
  );
  await assert.rejects(adapter.runTurn({ ...input, attempt: 3 }, run), /DIRECTED_ATTEMPT_ORDER/);
  await assert.rejects(
    adapter.runTurn({ ...input, relevantMemoryPath: "context/relevant-rtl-memory.md" }, run),
    /DIRECTED_INPUT_ALREADY_HAS_MEMORY/,
  );
  assert.equal(calls, 0);
  await adapter.runTurn(input, run);
  await assert.rejects(adapter.runTurn({ ...input, attempt: 4 }, run), /DIRECTED_ATTEMPT_ORDER/);
  await assert.rejects(
    adapter.runTurn(
      { ...input, attempt: 3 },
      { ...run, runDirectory: path.join(run.runDirectory, "different") },
    ),
    /DIRECTED_RUN_CHANGED/,
  );
  assert.equal(calls, 1);
});
