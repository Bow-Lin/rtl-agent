import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, rmdir, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { digest } from "./verification-memory.ts";
import { createWorkContextWriter, WORKFLOW_INSTRUCTIONS } from "./verification-workflow-context.ts";
import { makeWorkSnapshot } from "./verification-work-items.ts";
import type { WorkCondition } from "./verification-work-items.ts";
import type { WorkTurnContext } from "./verification-work-items-loop.ts";

function turn(condition: WorkCondition, attempt = 2): WorkTurnContext {
  const baseline = makeWorkSnapshot("case-run", 0, {
    "spec.md": "contract",
    "rtl/tb.sv": "baseline",
  });
  return {
    runId: "case-run",
    attempt,
    turn: attempt - 1,
    turnsRemaining: 4 - attempt,
    condition,
    baseline,
    current: { ...baseline, attempt: attempt - 1 },
    previousLedger: null,
    previousReview: null,
    runtimeEvidence: [],
    observations: [],
    repair: null,
  };
}
async function temporary(callback: (root: string) => Promise<void>) {
  const root = await mkdtemp(path.join(os.tmpdir(), "work-context-"));
  try {
    await mkdir(path.join(root, "context"));
    await callback(root);
  } finally {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith("work-context-"));
    await rm(root, { recursive: true, force: true });
  }
}
test("N/G/M receive byte-identical common workflow without padding or extra calls", async () => {
  for (const condition of ["N", "G", "M"] as const) {
    await temporary(async (root) => {
      const content = "# Relevant RTL Memory\nAdvisory candidate";
      const writer = createWorkContextWriter(
        root,
        condition,
        condition === "N"
          ? null
          : {
              condition,
              content,
              ids: ["candidate"],
              digest: `sha256:${digest(content)}`,
            },
      );
      const input = await writer(turn(condition));
      assert.equal(
        await readFile(path.join(root, "context", "verification-workflow.md"), "utf8"),
        WORKFLOW_INSTRUCTIONS,
      );
      assert.equal(
        input.relevantMemoryPath,
        condition === "N" ? undefined : "context/relevant-rtl-memory.md",
      );
      const state = JSON.parse(
        await readFile(path.join(root, "context", "work-state.json"), "utf8"),
      );
      assert.equal(state.turnsRemaining, 2);
      assert.equal(state.condition, condition);
      assert.deepEqual(state.allowedAdvisoryIds, condition === "N" ? [] : ["candidate"]);
    });
  }
});
test("context writer preserves baseline and per-attempt state, detects tampering", async () => {
  await temporary(async (root) => {
    const writer = createWorkContextWriter(root, "N", null);
    await writer(turn("N"));
    const initial = await readFile(path.join(root, "context", "work-state-2.json"), "utf8");
    await writer(turn("N", 3));
    assert.equal(await readFile(path.join(root, "context", "work-state-2.json"), "utf8"), initial);
    await writeFile(path.join(root, "context", "verification-workflow.md"), "tampered");
    await assert.rejects(writer(turn("N", 4)), /CONTEXT_TAMPERED/);
  });
});
test("cross-condition guidance and changed digest are rejected", async () => {
  await temporary(async (root) => {
    assert.throws(() => createWorkContextWriter(root, "M", null), /CONDITION_CONTEXT_MISMATCH/);
    assert.throws(
      () =>
        createWorkContextWriter(root, "G", {
          condition: "G",
          ids: ["g"],
          content: "# Relevant RTL Memory\nGuide",
          digest: "bad",
        }),
      /ADVISORY_DIGEST_MISMATCH/,
    );
  });
});

test("all earlier state files and the current pointer are verified before a new turn", async () => {
  for (const name of ["work-state-2.json", "work-state.json"]) {
    await temporary(async (root) => {
      const writer = createWorkContextWriter(root, "N", null);
      await writer(turn("N"));
      await writeFile(path.join(root, "context", name), "tampered");
      await assert.rejects(writer(turn("N", 3)), /CONTEXT_TAMPERED|STATE_POINTER_TAMPERED/);
    });
  }
});
test("a redirected context directory is rejected before any output is written", async () => {
  await temporary(async (root) => {
    const redirect = path.join(root, "redirect");
    await mkdir(redirect);
    await rmdir(path.join(root, "context"));
    await symlink(
      redirect,
      path.join(root, "context"),
      process.platform === "win32" ? "junction" : "dir",
    );
    await assert.rejects(
      createWorkContextWriter(root, "N", null)(turn("N")),
      /CONTEXT_PARENT_REDIRECTED/,
    );
    await assert.rejects(readFile(path.join(redirect, "verification-workflow.md")), {
      code: "ENOENT",
    });
  });
});
test("a preexisting pointer cannot be overwritten on the first turn", async () => {
  await temporary(async (root) => {
    const pointer = path.join(root, "context", "work-state.json");
    await writeFile(pointer, "existing");
    await assert.rejects(createWorkContextWriter(root, "N", null)(turn("N")), { code: "EEXIST" });
    assert.equal(await readFile(pointer, "utf8"), "existing");
  });
});
