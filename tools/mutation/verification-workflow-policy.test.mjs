import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import test from "node:test";
import policy from "../../.pi/extensions/rtl-verification-workflow-policy.mjs";

async function fixture(callback) {
  const root = await mkdtemp(path.join(os.tmpdir(), "work-policy-"));
  const saved = {};
  const variables = {
    RTL_AGENT_PI_POLICY_REQUIRED: "1",
    RTL_AGENT_PI_WORKSPACE_ROOT: root,
    RTL_AGENT_PI_PROVIDER_TRANSCRIPT_PATH: path.join(root, "capture.jsonl"),
    RTL_AGENT_PI_PROVIDER_CAPTURE_MAX_REQUESTS: "10",
    RTL_AGENT_PI_PROVIDER_CAPTURE_MAX_BYTES: "100000",
    RTL_AGENT_PI_RELEVANT_MEMORY_PATH: path.join(root, "context", "relevant-rtl-memory.md"),
  };
  for (const [key, value] of Object.entries(variables)) {
    saved[key] = process.env[key];
    process.env[key] = value;
  }
  try {
    await mkdir(path.join(root, "context"));
    await writeFile(
      path.join(root, "context", "verification-workflow.md"),
      "# Verification work-item workflow\nshared workflow",
    );
    await writeFile(
      path.join(root, "context", "work-state.json"),
      JSON.stringify({ schemaVersion: 1, runId: "test-run" }),
    );
    await writeFile(
      path.join(root, "context", "relevant-rtl-memory.md"),
      "# Relevant RTL Memory\nadvisory context",
    );
    const handlers = new Map();
    const api = {
      on: (event, handler) => {
        const list = handlers.get(event) ?? [];
        list.push(handler);
        handlers.set(event, list);
      },
    };
    await callback(root, api, handlers);
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith("work-policy-"));
    await rm(root, { recursive: true, force: true });
  }
}

test("workflow and advisory context both survive; tool permissions remain bounded", async () => {
  await fixture(async (_root, api, handlers) => {
    policy(api);
    const messages = handlers.get("before_agent_start").map((handler) => handler().message);
    assert.deepEqual(
      messages.map((message) => message.customType),
      ["rtl-relevant-memory", "rtl-verification-workflow"],
    );
    const guard = handlers.get("tool_call")[0];
    assert.equal(
      (await guard({ toolName: "write", input: { path: "context/work-state.json" } })).block,
      true,
    );
    assert.equal((await guard({ toolName: "bash", input: {} })).block, true);
    assert.equal(await guard({ toolName: "edit", input: { path: "rtl/checker.sv" } }), undefined);
    assert.equal(
      await guard({ toolName: "read", input: { path: "context/work-state.json" } }),
      undefined,
    );
    assert.equal(handlers.get("before_provider_request").length, 1);
  });
});
test("N receives exactly the same workflow without an advisory-memory message", async () => {
  await fixture(async (_root, api, handlers) => {
    delete process.env.RTL_AGENT_PI_RELEVANT_MEMORY_PATH;
    policy(api);
    assert.equal(handlers.get("before_agent_start").length, 1);
    assert.equal(
      handlers.get("before_agent_start")[0]().message.customType,
      "rtl-verification-workflow",
    );
  });
});
test("missing or malformed harness state fails before provider capture starts", async () => {
  await fixture(async (root, api, handlers) => {
    await writeFile(path.join(root, "context", "work-state.json"), "{}");
    assert.throws(() => policy(api), /WORKFLOW_STATE_REQUIRED/);
    assert.equal(handlers.size, 0);
  });
});
