import assert from "node:assert/strict";
import { mkdir, open, readFile, unlink, access } from "node:fs/promises";
import path from "node:path";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";
import { exclusiveJson, safeRead } from "./verification-memory.ts";
import {
  extractV2Candidates,
  prepareV2Build,
  publishV2Candidates,
  V2_CALL_BUDGET,
  v2Output,
  writeV2Preparation,
  K3_NO_TOOL_CONFIG,
} from "./verification-memory-v2-build.ts";
import type { SemanticReview } from "./verification-memory-v2-build.ts";
import {
  createAgentSession,
  DefaultResourceLoader,
  ModelRuntime,
  SessionManager,
  SettingsManager,
} from "../../.rtl-agent/tools/pi-0.81.1/node_modules/@earendil-works/pi-coding-agent/dist/index.js";

export { K3_NO_TOOL_CONFIG } from "./verification-memory-v2-build.ts";

/** Explicit invocation only. The caller owns serialization and payload authorization. */
export async function callK3NoTools(input: {
  repo: string;
  callDirectory: string;
  system: string;
  prompt: string;
}) {
  const { repo, callDirectory, system, prompt } = input;
  const started = Date.now();
  const requests: unknown[] = [];
  const responses: unknown[] = [];
  const writes: Promise<void>[] = [];
  let session: Awaited<ReturnType<typeof createAgentSession>>["session"] | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  let complete = false;
  let requestAuditFailed = false;
  try {
    await exclusiveJson(path.join(callDirectory, "model-config.json"), K3_NO_TOOL_CONFIG);
    const envKey = process.env.KIMI_API_KEY ?? process.env.KIMI_CODE_API_KEY;
    const apiKey =
      envKey ?? parseEnv(await readFile(path.join(repo, ".env"), "utf8")).KIMI_CODE_API_KEY;
    assert.ok(apiKey, "KIMI_CREDENTIAL_MISSING");
    const state = path.join(callDirectory, "agent-state");
    await mkdir(state);
    const runtime = await ModelRuntime.create({
      authPath: path.join(state, "auth.json"),
      modelsPath: null,
    });
    runtime.setRuntimeApiKey("kimi-coding", apiKey);
    const model = runtime.getModel("kimi-coding", "k3");
    assert.ok(model && model.provider === "kimi-coding" && model.id === "k3", "NO_MODEL_FALLBACK");
    const settings = SettingsManager.inMemory({
      compaction: { enabled: false },
      retry: {
        enabled: false,
        maxRetries: 0,
        provider: { maxRetries: 0, timeoutMs: V2_CALL_BUDGET.timeoutMs },
      },
    });
    assert.equal(settings.getRetryEnabled(), false);
    assert.equal(settings.getProviderRetrySettings().maxRetries, 0);
    const loader = new DefaultResourceLoader({
      cwd: callDirectory,
      agentDir: state,
      noExtensions: true,
      noSkills: true,
      noPromptTemplates: true,
      noThemes: true,
      noContextFiles: true,
      systemPrompt: system,
      extensionFactories: [
        (pi) => {
          pi.on("before_provider_request", async (event) => {
            requests.push(event.payload);
            try {
              assert.equal(requests.length, 1, "EXTRA_PROVIDER_REQUEST_FORBIDDEN");
              const payload = event.payload as { tools?: unknown[] };
              assert.ok(!payload.tools || payload.tools.length === 0, "PROVIDER_TOOLS_FORBIDDEN");
              await exclusiveJson(
                path.join(callDirectory, `provider-request-${requests.length}.json`),
                event.payload,
              );
            } catch {
              // The SDK swallows extension callback exceptions; retain a fail-closed flag.
              requestAuditFailed = true;
              void session?.abort();
            }
          });
        },
      ],
    });
    await loader.reload();
    ({ session } = await createAgentSession({
      cwd: callDirectory,
      agentDir: state,
      model,
      modelRuntime: runtime,
      settingsManager: settings,
      resourceLoader: loader,
      sessionManager: SessionManager.inMemory(),
      noTools: "all",
      thinkingLevel: "high",
    }));
    assert.deepEqual(session.getActiveToolNames(), []);
    assert.equal(session.autoRetryEnabled, false);
    session.subscribe((event) => {
      if (event.type === "message_end" && event.message.role === "assistant") {
        responses.push(event.message);
        const writing = exclusiveJson(
          path.join(callDirectory, `provider-response-${responses.length}.json`),
          event.message,
        );
        // Observe rejections immediately; rethrow at final audit below.
        void writing.catch(() => {});
        writes.push(writing);
      }
    });
    timer = setTimeout(() => {
      timedOut = true;
      void session?.abort();
    }, V2_CALL_BUDGET.timeoutMs);
    await session.prompt(prompt);
    assert.ok(!requestAuditFailed, "REQUEST_AUDIT_FAILED");
    assert.ok(!timedOut, "MODEL_TIMEOUT");
    assert.equal(requests.length, 1, "EXACTLY_ONE_PROVIDER_REQUEST_REQUIRED");
    assert.equal(responses.length, 1, "EXACTLY_ONE_RESPONSE_REQUIRED");
    const response = responses[0] as {
      provider: string;
      model: string;
      stopReason: string;
      content: { type: string; text?: string }[];
    };
    assert.equal(response.provider, "kimi-coding");
    assert.equal(response.model, "k3");
    assert.equal(response.stopReason, "stop", "INCOMPLETE_PROVIDER_RESPONSE");
    assert.ok(
      response.content.every((block) => block.type !== "toolCall"),
      "TOOLS_FORBIDDEN",
    );
    complete = true;
    return response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("\n");
  } finally {
    if (timer) clearTimeout(timer);
    session?.dispose();
    await exclusiveJson(path.join(callDirectory, "provider-transcript.json"), {
      startedAt: new Date(started).toISOString(),
      endedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
      timedOut,
      requestAuditFailed,
      complete,
      requests,
      responses,
    }); // Raw response retains usage/cost, not request auth headers or credentials.
    await Promise.all(writes);
  }
}

export async function withBuildLocks<T>(repo: string, action: () => Promise<T>) {
  const parent = path.join(repo, ".rtl-agent", "fifo-target-campaigns");
  await mkdir(parent, { recursive: true });
  const acquired: { file: string; handle: Awaited<ReturnType<typeof open>> }[] = [];
  try {
    for (const file of [
      path.join(repo, ".rtl-agent", "verification-memory-build.lock"),
      path.join(parent, "active.lock"),
    ]) {
      const handle = await open(file, "wx");
      acquired.push({ file, handle });
      await handle.writeFile(
        JSON.stringify({
          pid: process.pid,
          purpose: "source-v2-extraction",
          startedAt: new Date().toISOString(),
        }),
      );
    }
    for (const marker of ["family-process-active.json", "family-preparation.pause.json"]) {
      assert.ok(
        !(await access(path.join(repo, ".rtl-agent", marker)).then(
          () => true,
          (error: NodeJS.ErrnoException) => {
            if (error.code === "ENOENT") return false;
            throw error;
          },
        )),
        "FAMILY_PROCESS_OR_PAUSE_PRESENT",
      );
    }
    return await action();
  } finally {
    for (const entry of acquired.reverse()) {
      await entry.handle.close();
      await unlink(entry.file);
    }
  }
}

export async function v2Main(repo: string, args: string[]) {
  const [mode, label, reviewPath] = args;
  assert.ok(
    label && ["prepare", "run", "publish"].includes(mode ?? ""),
    "Use prepare|run <label>, or publish <label> <logical-review.json>",
  );
  assert.equal(args.length, mode === "publish" ? 3 : 2, "UNEXPECTED_ARGUMENTS");
  const out = v2Output(repo, label);
  if (mode === "prepare") {
    const { preparation } = await writeV2Preparation(repo, label);
    return {
      status: preparation.status,
      budget: preparation.budget,
      payloads: preparation.calls.map((call) => ({
        source: call.source,
        records: call.bundle.evidence.length,
        systemBytes: Buffer.byteLength(call.system),
        promptBytes: Buffer.byteLength(call.prompt),
      })),
    };
  }
  if (mode === "publish") {
    const review = JSON.parse((await safeRead(repo, reviewPath!)).toString()) as SemanticReview;
    return publishV2Candidates(out, review);
  }
  return withBuildLocks(repo, async () => {
    assert.deepEqual(
      JSON.parse(await readFile(path.join(out, "preparation.json"), "utf8")),
      await prepareV2Build(repo),
      "SOURCE_OR_RUNTIME_CHANGED_SINCE_PREPARATION",
    );
    return extractV2Candidates(out, (request, callDirectory) =>
      callK3NoTools({ repo, callDirectory, system: request.system, prompt: request.prompt }),
    );
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  try {
    console.log(JSON.stringify(await v2Main(repo, process.argv.slice(2))));
  } catch {
    console.error("V2_COMMAND_FAILED: inspect retained evidence; no automatic retry");
    process.exitCode = 1;
  }
}
