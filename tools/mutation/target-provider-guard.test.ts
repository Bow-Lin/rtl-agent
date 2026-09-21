import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type {
  AgentTurnResult,
  CoreLoopRun,
  RtlAgentAdapter,
} from "../../packages/core-loop/dist/index.js";
import { withTargetProviderGuard } from "./target-provider-guard.ts";

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

// Projected structure of the 2026-09-17 target provider captures. Requests, generated
// source and usage values are synthetic; successful captures end with stop, after toolUse.
function response(stopReason: string, errorMessage?: string) {
  return {
    role: "assistant",
    content: stopReason === "error" ? [] : [{ type: "text", text: "Synthetic response." }],
    api: "anthropic-messages",
    provider: "kimi-coding",
    model: "k3",
    usage: { input: 0, output: 0 },
    stopReason,
    timestamp: 1,
    ...(errorMessage === undefined ? {} : { errorMessage }),
  };
}

function transcript(responses: unknown[]) {
  return {
    schemaVersion: 1,
    provider: "kimi-coding",
    model: "k3",
    attempt: input.attempt,
    exchanges: responses.map((value, index) => ({
      sequence: index + 1,
      request: { model: "k3", messages: [] },
      response: value,
    })),
  };
}

async function fixture(capture: unknown, edited = true, delegateThrows = false) {
  const root = await mkdtemp(path.join(os.tmpdir(), "target-provider-test-"));
  const workspace = path.join(root, "workspace");
  await mkdir(path.join(workspace, "rtl"), { recursive: true });
  await mkdir(path.join(root, "evidence", "attempts", "2"), { recursive: true });
  const tb = path.join(workspace, "rtl", "tb.sv");
  await writeFile(tb, "original");
  const transcriptFile = path.join(root, "evidence", "attempts", "2", "provider-transcript.json");
  const auditFile = path.join(root, "evidence", "target-provider-2.json");
  const result = {
    attempt: input.attempt,
    runId: input.runId,
    provider: "kimi-coding",
    model: "k3",
    rtlChanged: edited,
    outcome: edited ? "RTL_CHANGED" : "NO_RTL_CHANGE",
    workspaceUsableForCompile: edited,
    exitCode: 0,
    timedOut: false,
  } as AgentTurnResult;
  let calls = 0;
  const delegate: RtlAgentAdapter = {
    async probe() {
      throw new Error("Probe unused in fixture");
    },
    async runTurn() {
      calls++;
      if (edited) await writeFile(tb, "edited");
      if (capture !== undefined) await writeFile(transcriptFile, JSON.stringify(capture));
      if (delegateThrows) throw new Error("Connection error with private-token");
      return result;
    },
  };
  const run = {
    runDirectory: root,
    workspaceDirectory: workspace,
    fixture: { provenance: { identity: { caseId: "dpretet-depth8-width8" } } },
  } as unknown as CoreLoopRun;
  return {
    root,
    result,
    run,
    adapter: withTargetProviderGuard(delegate),
    callCount: () => calls,
    audit: async () => JSON.parse(await readFile(auditFile, "utf8")),
    auditFile,
    transcriptFile,
    tb,
  };
}

test("completed observed response shape passes and keeps transcript and result unchanged", async () => {
  const capture = transcript([
    ...Array.from({ length: 6 }, () => response("toolUse")),
    response("stop"),
  ]);
  const f = await fixture(capture);
  try {
    assert.equal(await f.adapter.runTurn(input, f.run), f.result);
    assert.equal(f.callCount(), 1);
    const audit = await f.audit();
    assert.equal(audit.status, "PASSED");
    assert.equal(audit.classification, "COMPLETE");
    assert.match(audit.transcriptDigest, /^sha256:[a-f0-9]{64}$/);
    assert.equal(audit.transcriptPath, "evidence/attempts/2/provider-transcript.json");
    assert.equal(await readFile(f.transcriptFile, "utf8"), JSON.stringify(capture));
    // Exclusive evidence never accepts a second turn for an already audited attempt.
    const before = await readFile(f.auditFile, "utf8");
    await assert.rejects(f.adapter.runTurn(input, f.run), /EVIDENCE_WRITE_FAILED/);
    assert.equal(await readFile(f.auditFile, "utf8"), before);
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});

for (const edited of [true, false]) {
  test(`connection errors fail before coverage receives the turn, edited=${edited}`, async () => {
    const capture = transcript([
      ...(edited ? Array.from({ length: 6 }, () => response("toolUse")) : []),
      ...Array.from({ length: 4 }, () => response("error", "Connection error. private-token")),
    ]);
    const f = await fixture(capture, edited);
    try {
      let coverageReceivedTurn = false;
      await assert.rejects(
        f.adapter.runTurn(input, f.run).then(() => {
          coverageReceivedTurn = true;
        }),
        /^Error: TARGET_PROVIDER_FAILED: PROVIDER_CONNECTION_ERROR$/,
      );
      assert.equal(coverageReceivedTurn, false);
      assert.equal(f.callCount(), 1);
      assert.equal(await readFile(f.tb, "utf8"), edited ? "edited" : "original");
      const audit = await f.audit();
      assert.equal(audit.classification, "PROVIDER_CONNECTION_ERROR");
      assert.equal(audit.rtlChanged, edited);
      assert.ok(!JSON.stringify(audit).includes("private-token"));
      assert.equal(await readFile(f.transcriptFile, "utf8"), JSON.stringify(capture));
    } finally {
      await rm(f.root, { recursive: true, force: true });
    }
  });
}

test("all error, abort, missing, truncated and identity failures reject conservatively", async () => {
  const cases: [unknown, string][] = [
    [transcript([response("error", "HTTP 403 private-token"), response("stop")]), "PROVIDER_ERROR"],
    [transcript([response("aborted")]), "PROVIDER_ABORTED"],
    [transcript([response("length")]), "INCOMPLETE_RESPONSE"],
    [transcript([response("toolUse")]), "INCOMPLETE_RESPONSE"],
    [transcript([null, response("stop")]), "MISSING_RESPONSE"],
    [transcript([]), "MISSING_RESPONSE"],
    [transcript([{ ...response("stop"), provider: "other" }]), "PROVIDER_IDENTITY_MISMATCH"],
    [transcript([{ ...response("stop"), model: "other" }]), "PROVIDER_IDENTITY_MISMATCH"],
    [{ ...transcript([response("stop")]), attempt: 3 }, "INVALID_TRANSCRIPT"],
    [{ ...transcript([response("stop")]), model: "other" }, "PROVIDER_IDENTITY_MISMATCH"],
    [undefined, "TRANSCRIPT_UNAVAILABLE"],
    ["malformed object", "INVALID_TRANSCRIPT"],
  ];
  for (const [capture, classification] of cases) {
    const f = await fixture(capture);
    try {
      await assert.rejects(f.adapter.runTurn(input, f.run), /TARGET_PROVIDER_FAILED/);
      assert.equal((await f.audit()).classification, classification);
      assert.equal(f.callCount(), 1);
    } finally {
      await rm(f.root, { recursive: true, force: true });
    }
  }
});

test("delegate exceptions are audited without exposing their text or retrying", async () => {
  const f = await fixture(transcript([response("stop")]), true, true);
  try {
    await assert.rejects(
      f.adapter.runTurn(input, f.run),
      /^Error: TARGET_PROVIDER_FAILED: DELEGATE_FAILED$/,
    );
    assert.equal((await f.audit()).delegateReturned, false);
    assert.equal(f.callCount(), 1);
    assert.ok(!(await readFile(f.auditFile, "utf8")).includes("private-token"));
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});
