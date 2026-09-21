import assert from "node:assert/strict";
import { mkdir, readFile, open, unlink } from "node:fs/promises";
import path from "node:path";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";
import { buildMemory, exclusiveJson, prepare, SYSTEM } from "./verification-memory.ts";
import {
  createAgentSession,
  DefaultResourceLoader,
  ModelRuntime,
  SessionManager,
} from "../../.rtl-agent/tools/pi-0.81.1/node_modules/@earendil-works/pi-coding-agent/dist/index.js";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
async function main() {
  const mode = process.argv[2];
  const label = process.argv[3];
  assert.ok(mode === "prepare" || mode === "build", "Use prepare|build <unique-build-name>");
  assert.ok(label && /^[a-z0-9][a-z0-9-]{0,80}$/.test(label), "Invalid build name");
  const parent = path.join(repo, ".rtl-agent", "verification-memory");
  await mkdir(parent, { recursive: true });
  const out = path.join(parent, label);
  const bundles = await prepare(repo, out);
  console.log(
    JSON.stringify({
      phase: "prepared",
      sources: bundles.length,
      output: path.relative(repo, out),
    }),
  );
  if (mode === "build") {
    try {
      const envFile = parseEnv(await readFile(path.join(repo, ".env"), "utf8"));
      const apiKey =
        process.env.KIMI_API_KEY ?? process.env.KIMI_CODE_API_KEY ?? envFile.KIMI_CODE_API_KEY;
      assert.ok(apiKey, "KIMI credential missing");
      const state = path.join(out, "agent-state");
      await mkdir(state);
      // Empty build-local auth/session/context; no user extensions or workspace tools.
      const runtime = await ModelRuntime.create({
        authPath: path.join(state, "auth.json"),
        modelsPath: null,
      });
      runtime.setRuntimeApiKey("kimi-coding", apiKey);
      const model = runtime.getModel("kimi-coding", "k3");
      assert.ok(model, "Configured k3 model is unavailable; no silent alias/fallback");
      await exclusiveJson(path.join(out, "model-config.json"), {
        provider: model.provider,
        model: model.id,
        sdk: "pi-0.81.1",
        tools: [],
        contextFiles: false,
        thinkingLevel: "high",
        callTimeoutMs: 900000,
      });
      const manifest = await buildMemory(bundles, out, async (name, prompt) => {
        const callDir = path.join(out, name);
        await mkdir(callDir);
        const started = Date.now();
        const requests: unknown[] = [];
        const responses: unknown[] = [];
        const loader = new DefaultResourceLoader({
          cwd: callDir,
          agentDir: state,
          noExtensions: true,
          noSkills: true,
          noPromptTemplates: true,
          noThemes: true,
          noContextFiles: true,
          systemPrompt: SYSTEM,
          extensionFactories: [
            (pi) => {
              pi.on("before_provider_request", (event) => {
                requests.push(event.payload);
              });
            },
          ],
        });
        await loader.reload();
        const { session } = await createAgentSession({
          cwd: callDir,
          agentDir: state,
          model,
          modelRuntime: runtime,
          resourceLoader: loader,
          sessionManager: SessionManager.inMemory(),
          noTools: "all",
          thinkingLevel: "high",
        });
        session.subscribe((event) => {
          if (event.type === "message_end" && event.message.role === "assistant")
            responses.push(event.message);
        });
        await exclusiveJson(path.join(callDir, "input.json"), { system: SYSTEM, prompt });
        let timedOut = false;
        const timer = setTimeout(() => {
          timedOut = true;
          void session.abort();
        }, 900000);
        try {
          await session.prompt(prompt);
          assert.ok(!timedOut, "MODEL_TIMEOUT");
          assert.equal(responses.length, 1, "Expected single no-tool model response");
          const response = responses[0] as {
            provider: string;
            model: string;
            stopReason: string;
            content: { type: string; text?: string }[];
          };
          assert.equal(response.provider, "kimi-coding");
          assert.equal(response.model, "k3");
          assert.equal(response.stopReason, "stop", "Incomplete/provider-error response");
          console.log(JSON.stringify({ phase: name, elapsedMs: Date.now() - started }));
          return response.content
            .filter((b) => b.type === "text")
            .map((b) => b.text ?? "")
            .join("\n");
        } finally {
          clearTimeout(timer);
          await exclusiveJson(path.join(callDir, "provider-transcript.json"), {
            startedAt: new Date(started).toISOString(),
            endedAt: new Date().toISOString(),
            durationMs: Date.now() - started,
            timedOut,
            requests,
            responses,
          }); // response retains actual model, token usage and cost; never auth headers
          session.dispose();
        }
      });
      console.log(JSON.stringify({ phase: "published", ...manifest }));
    } catch (error) {
      // Do not serialize arbitrary SDK errors that might contain credentials.
      await exclusiveJson(path.join(out, "failure.json"), {
        failedAt: new Date().toISOString(),
        status: "FAILED_NOT_PUBLISHED",
        reason: "Inspect last audited stage; no automatic retry",
      });
      console.error(
        error instanceof assert.AssertionError
          ? error.message
          : "Memory build failed; inspect audit evidence",
      );
      process.exitCode = 1;
    }
  }
}
const lockPath = path.join(repo, ".rtl-agent", "verification-memory-build.lock");
const lock = await open(lockPath, "wx");
try {
  await lock.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
  await main();
} finally {
  await lock.close();
  await unlink(lockPath);
}
