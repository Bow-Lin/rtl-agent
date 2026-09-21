import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  createAgentSession,
  DefaultResourceLoader,
  ModelRuntime,
  SessionManager,
} from "../../.rtl-agent/tools/pi-0.81.1/node_modules/@earendil-works/pi-coding-agent/dist/index.js";
import { loadRepositoryEnvironment } from "../../apps/rtl-core-loop/dist/environment.js";

const label = process.argv[2];
assert.match(label ?? "", /^[a-z0-9][a-z0-9-]{0,60}$/);
const root = path.join(process.cwd(), ".rtl-agent", "target-connection-probes", label!);
await mkdir(path.dirname(root), { recursive: true });
await mkdir(root);
const env = await loadRepositoryEnvironment(process.cwd());
const key = env.KIMI_API_KEY ?? env.KIMI_CODE_API_KEY;
assert.ok(key, "KIMI_KEY_MISSING");
const runtime = await ModelRuntime.create({
  authPath: path.join(root, "auth.json"),
  modelsPath: null,
});
runtime.setRuntimeApiKey("kimi-coding", key);
const model = runtime.getModel("kimi-coding", "k3");
assert.ok(model, "K3_UNAVAILABLE");
const loader = new DefaultResourceLoader({
  cwd: root,
  agentDir: root,
  noExtensions: true,
  noSkills: true,
  noPromptTemplates: true,
  noThemes: true,
  noContextFiles: true,
  systemPrompt: "This is a connection probe. Reply with exactly ACK. No tools.",
});
await loader.reload();
const { session } = await createAgentSession({
  cwd: root,
  agentDir: root,
  model,
  modelRuntime: runtime,
  resourceLoader: loader,
  sessionManager: SessionManager.inMemory(),
  noTools: "all",
  thinkingLevel: "off",
});
const responses: unknown[] = [];
session.subscribe((event) => {
  if (event.type === "message_end" && event.message.role === "assistant")
    responses.push(event.message);
});
const started = Date.now();
const timer = setTimeout(() => {
  void session.abort();
}, 90_000);
try {
  await session.prompt("ACK");
  await writeFile(path.join(root, "responses.json"), JSON.stringify(responses, null, 2), {
    flag: "wx",
  });
  const last = responses.at(-1) as
    | { model?: string; stopReason?: string; content?: { type: string; text?: string }[] }
    | undefined;
  assert.equal(last?.model, "k3", "PROBE_MODEL_MISMATCH");
  assert.equal(last?.stopReason, "stop", "PROBE_CONNECTION_FAILED");
  assert.equal(
    last?.content
      ?.filter((x) => x.type === "text")
      .map((x) => x.text)
      .join("")
      .trim(),
    "ACK",
    "PROBE_RESPONSE_INVALID",
  );
  const result = {
    status: "passed",
    model: "k3",
    provider: "kimi-coding",
    elapsedMs: Date.now() - started,
    diagnosticOnly: true,
    at: new Date().toISOString(),
  };
  await writeFile(path.join(root, "result.json"), JSON.stringify(result, null, 2), { flag: "wx" });
  console.log(JSON.stringify(result));
} finally {
  clearTimeout(timer);
  session.dispose();
}
