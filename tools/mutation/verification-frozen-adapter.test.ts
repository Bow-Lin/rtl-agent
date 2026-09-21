import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { BUILD, frozenContext, withFrozenMemory, hash } from "./verification-frozen-adapter.ts";
import type { CoreLoopRun, RtlAgentAdapter } from "../../packages/core-loop/dist/index.js";

test("frozen selector retains all source items verbatim and rejects changed bytes", async () => {
  const original = await frozenContext(process.cwd());
  assert.equal(original.selectedIds.length, 13);
  assert.ok(original.content.startsWith("# Relevant RTL Memory\n"));
  const root = await mkdtemp(path.join(os.tmpdir(), "frozen-test-"));
  try {
    const dest = path.join(root, ".rtl-agent", "verification-memory", BUILD);
    await mkdir(dest, { recursive: true });
    for (const f of ["manifest.json", "items.json"])
      await writeFile(
        path.join(dest, f),
        await readFile(path.join(process.cwd(), ".rtl-agent", "verification-memory", BUILD, f)),
      );
    assert.equal((await frozenContext(root)).injectionDigest, original.injectionDigest);
    await writeFile(path.join(dest, "items.json"), "{}");
    await assert.rejects(frozenContext(root), /FROZEN_ITEMS_CHANGED/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("frozen adapter binds injection and per-attempt evidence; rejects modified context", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "injection-test-"));
  try {
    const workspace = path.join(root, "workspace");
    await mkdir(path.join(workspace, "context"), { recursive: true });
    await mkdir(path.join(root, "evidence"));
    const run = {
      runDirectory: root,
      workspaceDirectory: workspace,
      fixture: { provenance: { identity: { caseId: "axis-depth8-width8" } } },
    } as unknown as CoreLoopRun;
    let calls = 0;
    const delegate = {
      async runTurn(input: { relevantMemoryPath: string }) {
        calls++;
        assert.equal(input.relevantMemoryPath, "context/relevant-rtl-memory.md");
        return {};
      },
    } as unknown as RtlAgentAdapter;
    const adapter = withFrozenMemory(delegate, process.cwd());
    const input = {
      schemaVersion: 1,
      runId: "run_12345678-1234-4234-8234-123456789012",
      attempt: 2,
      category: "SEEDED_COMPILE_REPAIR",
      specPath: "spec.md",
      workspaceRtlRoot: "rtl",
      rtlSourceFiles: ["rtl/tb.sv"],
      topModule: "TopModule",
      taskKind: "VERIFICATION_ASSET_GENERATION",
      protectedRtlPaths: [],
      mutableRtlPaths: ["rtl/tb.sv"],
    };
    await adapter.runTurn(input, run);
    const content = await readFile(path.join(workspace, "context", "relevant-rtl-memory.md"));
    const evidence = JSON.parse(
      await readFile(path.join(root, "evidence", "verification-selector-2.json"), "utf8"),
    );
    assert.equal(evidence.injectionDigest, hash(content));
    assert.equal(calls, 1);
    await writeFile(path.join(workspace, "context", "relevant-rtl-memory.md"), "changed");
    await assert.rejects(adapter.runTurn({ ...input, attempt: 3 }, run), /INJECTED_MEMORY_CHANGED/);
    assert.equal(calls, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
