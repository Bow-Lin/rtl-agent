import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseEnv } from "node:util";

import {
  createAgentSession,
  DefaultResourceLoader,
  ModelRuntime,
  SessionManager,
} from "./.rtl-agent/tools/pi-0.81.1/node_modules/@earendil-works/pi-coding-agent/dist/index.js";

const root = import.meta.dirname;
const prompt = process.argv.slice(2).join(" ").trim();
if (prompt.length === 0) {
  throw new Error('用法: node test_pi_connection.ts "你的 prompt"');
}

const envFile = parseEnv(await readFile(path.join(root, ".env"), "utf8"));
const apiKey = process.env.KIMI_API_KEY ?? envFile.KIMI_CODE_API_KEY;
if (apiKey === undefined) throw new Error("缺少 KIMI_API_KEY 或 KIMI_CODE_API_KEY");

const agentDir = path.join(root, ".rtl-agent", "pi-state");
const provider = "kimi-coding";
const modelId = "kimi-for-coding";
const modelRuntime = await ModelRuntime.create({
  authPath: path.join(agentDir, "auth.json"),
  modelsPath: path.join(agentDir, "models.json"),
});
modelRuntime.setRuntimeApiKey(provider, apiKey);
const model = modelRuntime.getModel(provider, modelId);
if (model === undefined) throw new Error(`找不到模型: ${provider}/${modelId}`);

let providerRequest: unknown;
const resourceLoader = new DefaultResourceLoader({
  cwd: root,
  agentDir,
  noExtensions: true,
  noSkills: true,
  noPromptTemplates: true,
  noThemes: true,
  noContextFiles: true,
  systemPrompt: "Answer directly. Do not use tools.",
  extensionFactories: [
    (pi) => {
      pi.on("before_provider_request", (event) => {
        providerRequest = event.payload;
      });
    },
  ],
});
await resourceLoader.reload();

const { session } = await createAgentSession({
  cwd: root,
  agentDir,
  model,
  modelRuntime,
  resourceLoader,
  sessionManager: SessionManager.inMemory(),
  noTools: "all",
});

let providerResponse: unknown;
session.subscribe((event) => {
  if (event.type === "message_end" && event.message?.role === "assistant") {
    providerResponse = event.message;
  }
});

try {
  await session.prompt(prompt);
  console.log("=== 发送给 provider ===");
  console.log(JSON.stringify(providerRequest, undefined, 2));
  console.log("\n=== provider 返回结果 ===");
  console.log(JSON.stringify(providerResponse, undefined, 2));
} finally {
  session.dispose();
}
