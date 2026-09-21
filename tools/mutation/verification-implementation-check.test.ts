import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { CoreLoopRun, RtlAgentAdapter } from "../../packages/core-loop/dist/index.js";
import {
  IMPLEMENTATION_CHECK,
  withImplementationCheck,
} from "./verification-implementation-check.ts";
import { hash } from "./verification-frozen-adapter.ts";

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
  coverageFeedbackPath: "context/coverage-round-1.json",
};
async function setup() {
  const root = await mkdtemp(path.join(os.tmpdir(), "fifo-usage-test-"));
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

test("generic check adds only the workflow text, once, and forwards identical input/budget", async () => {
  const { root, workspace, run } = await setup();
  let calls = 0;
  const delegate = {
    async runTurn(actual: unknown, actualRun: CoreLoopRun) {
      calls++;
      assert.deepEqual(actual, { ...input, attempt: calls + 1 });
      assert.equal(actualRun, run);
      assert.equal(
        await readFile(path.join(workspace, "spec.md"), "utf8"),
        `Original contract.\n\n\n${IMPLEMENTATION_CHECK}\n`,
      );
      return { sentinel: calls };
    },
  } as unknown as RtlAgentAdapter;
  const adapter = withImplementationCheck(delegate);
  await adapter.runTurn(input, run);
  await adapter.runTurn({ ...input, attempt: 3 }, run);
  assert.equal(calls, 2);
  assert.equal(
    await readFile(path.join(workspace, "rtl", "tb.sv"), "utf8"),
    "module tb; endmodule\n",
  );
  assert.equal(
    await readFile(path.join(workspace, "context", "coverage-round-1.json"), "utf8"),
    "{}\n",
  );
  const audit = JSON.parse(
    await readFile(path.join(root, "evidence", "implementation-check-2.json"), "utf8"),
  );
  assert.equal(audit.originalSpecDigest, hash("Original contract.\n"));
  assert.equal(audit.additionalModelTurns, 0);
  assert.doesNotMatch(IMPLEMENTATION_CHECK, /reset|full|empty|M010|70\s*ns|复位/iu);
});

test("reject altered spec before a subsequent delegate call", async () => {
  const { workspace, run } = await setup();
  let calls = 0;
  const adapter = withImplementationCheck({
    async runTurn() {
      calls++;
      return {};
    },
  } as unknown as RtlAgentAdapter);
  await adapter.runTurn(input, run);
  await writeFile(path.join(workspace, "spec.md"), "changed\n");
  await assert.rejects(
    adapter.runTurn({ ...input, attempt: 3 }, run),
    /IMPLEMENTATION_CHECK_SPEC_CHANGED/,
  );
  assert.equal(calls, 1);
});

test("refuse mid-run injection and non-target fixtures", async () => {
  const { run } = await setup();
  const adapter = withImplementationCheck({
    async runTurn() {
      assert.fail("must not call");
    },
  } as unknown as RtlAgentAdapter);
  await assert.rejects(
    adapter.runTurn({ ...input, attempt: 3 }, run),
    /IMPLEMENTATION_CHECK_FIRST_ATTEMPT_REQUIRED/,
  );
  await assert.rejects(
    adapter.runTurn(input, {
      ...run,
      fixture: { provenance: { identity: { caseId: "axis-depth8-width8" } } },
    } as unknown as CoreLoopRun),
  );
});
