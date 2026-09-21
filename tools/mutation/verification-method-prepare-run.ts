import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { digest, exclusiveJson, safeRead } from "./verification-memory.ts";
import {
  extractV2Candidates,
  prepareV2Build,
  v2Output,
  writeV2Preparation,
} from "./verification-memory-v2-build.ts";
import { callK3NoTools, K3_NO_TOOL_CONFIG, withBuildLocks } from "./verification-memory-v2-run.ts";
import {
  buildGenericGuidance,
  GENERIC_GUIDANCE_PROMPT,
  GENERIC_GUIDANCE_SYSTEM,
} from "./verification-generic-guidance.ts";

const oldPlan = ".rtl-agent/fifo-directed-campaigns/fifo-directed-memory10-20260918-v1/plan.json";
const oldPlanDigest = "336363695269d2e4136d658e5ad1f58f413277d504e3533085fdea49cee1a9a9";
const methodFiles = [
  "tools/mutation/verification-method-prepare-run.ts",
  "tools/mutation/verification-generic-guidance.ts",
  "docs/autonomous-verification-work-items-plan.md",
];
function output(repo: string, label: string) {
  assert.match(label, /^[a-z0-9][a-z0-9-]{0,80}$/);
  return path.join(repo, ".rtl-agent", "verification-method-preparation", label);
}
async function frozenRuntime(repo: string) {
  const bytes = await safeRead(repo, oldPlan);
  assert.equal(digest(bytes), oldPlanDigest, "OLD_PLAN_CHANGED");
  const hashes = (JSON.parse(bytes.toString()) as { runtimeHashes: Record<string, string> })
    .runtimeHashes;
  assert.equal(Object.keys(hashes).length, 103);
  for (const [logical, expected] of Object.entries(hashes)) {
    assert.equal(digest(await safeRead(repo, logical)), expected, `OLD_RUNTIME_CHANGED:${logical}`);
  }
  return hashes;
}
async function sealGenericCall(out: string) {
  const directory = path.join(out, "generic-guidance");
  const names = [
    "request.json",
    "model-config.json",
    "provider-request-1.json",
    "provider-response-1.json",
    "provider-transcript.json",
    "raw-response.json",
    "candidate.json",
  ];
  const files: { path: string; sha256: string }[] = [];
  const values = new Map<string, Buffer>();
  for (const name of names) {
    const bytes = await safeRead(directory, name);
    values.set(name, bytes);
    files.push({ path: `generic-guidance/${name}`, sha256: digest(bytes) });
  }
  const json = (name: string) => JSON.parse(values.get(name)!.toString());
  assert.deepEqual(json("model-config.json"), K3_NO_TOOL_CONFIG);
  const transcript = json("provider-transcript.json");
  assert.equal(transcript.complete, true);
  assert.equal(transcript.timedOut, false);
  assert.equal(transcript.requestAuditFailed, false);
  assert.equal(transcript.requests.length, 1);
  assert.equal(transcript.responses.length, 1);
  const request = json("provider-request-1.json");
  const response = json("provider-response-1.json");
  assert.deepEqual(transcript.requests[0], request);
  assert.deepEqual(transcript.responses[0], response);
  assert.ok(!request.tools || request.tools.length === 0);
  for (const text of [GENERIC_GUIDANCE_SYSTEM, GENERIC_GUIDANCE_PROMPT]) {
    assert.ok(
      JSON.stringify(request).includes(JSON.stringify(text).slice(1, -1)),
      "GENERIC_INPUT_NOT_EXPOSED",
    );
  }
  assert.equal(response.provider, "kimi-coding");
  assert.equal(response.model, "k3");
  assert.equal(response.stopReason, "stop");
  assert.ok(response.content.every((block: { type: string }) => block.type !== "toolCall"));
  assert.equal(
    response.content
      .filter((block: { type: string }) => block.type === "text")
      .map((block: { text: string }) => block.text)
      .join("\n"),
    json("raw-response.json").text,
  );
  await exclusiveJson(path.join(directory, "evidence-seal.json"), {
    schemaVersion: 1,
    status: "ACTUAL_CALL_BOUND_PENDING_SEMANTIC_REVIEW",
    files,
  });
  return files;
}
async function receipt(repo: string, label: string) {
  const preparation = await prepareV2Build(repo);
  const sourceFile = path.join(v2Output(repo, label), "preparation.json");
  const prepared = await readFile(sourceFile);
  assert.deepEqual(JSON.parse(prepared.toString()), preparation, "SOURCE_PREPARATION_CHANGED");
  const runtime = [];
  for (const logical of methodFiles)
    runtime.push({ path: logical, sha256: digest(await safeRead(repo, logical)) });
  return {
    schemaVersion: 1,
    phase: "PREPARED_NO_MODEL_CALLS",
    label,
    provider: "kimi-coding",
    model: "k3",
    maximumCalls: 5,
    maximumSourceCalls: 4,
    maximumGenericCalls: 1,
    maxCallDurationMs: 900000,
    retries: 0,
    targetCalls: 0,
    rtlExecutions: 0,
    tools: [],
    contextFiles: false,
    oldRuntimeHashes: await frozenRuntime(repo),
    runtime,
    sourcePreparation: {
      path: path.relative(repo, sourceFile).split(path.sep).join("/"),
      sha256: digest(prepared),
      records: preparation.sourceRecordCounts,
      calls: preparation.calls.map((call) => ({
        source: call.source,
        evidence: call.bundle.evidence.length,
        systemBytes: Buffer.byteLength(call.system),
        promptBytes: Buffer.byteLength(call.prompt),
        systemDigest: digest(call.system),
        promptDigest: digest(call.prompt),
      })),
    },
    genericRequest: { system: GENERIC_GUIDANCE_SYSTEM, prompt: GENERIC_GUIDANCE_PROMPT },
  };
}

export async function methodPreparationMain(repo: string, args: string[]) {
  const [mode, label] = args;
  assert.ok(mode === "prepare" || mode === "run", "Use prepare|run <unique-label>");
  assert.equal(args.length, 2);
  const out = output(repo, label!);
  if (mode === "prepare") {
    await mkdir(path.dirname(out), { recursive: true });
    await mkdir(out);
    await writeV2Preparation(repo, label!);
    const prepared = await receipt(repo, label!);
    await exclusiveJson(path.join(out, "preparation.json"), prepared);
    return {
      status: prepared.phase,
      output: path.relative(repo, out).split(path.sep).join("/"),
      calls: 5,
      sourceRecords: prepared.sourcePreparation.records,
      priorRuntimeVerified: 103,
    };
  }
  return withBuildLocks(repo, async () => {
    const prepared = await receipt(repo, label!);
    assert.deepEqual(
      JSON.parse(await readFile(path.join(out, "preparation.json"), "utf8")),
      prepared,
      "METHOD_PREPARATION_CHANGED",
    );
    await exclusiveJson(path.join(out, "run-started.json"), {
      startedAt: new Date().toISOString(),
      maximumCalls: 5,
    });
    try {
      process.stdout.write(
        JSON.stringify({ phase: "generic-guide-started", maximumCalls: 5 }) + "\n",
      );
      const generic = await buildGenericGuidance(
        path.join(out, "generic-guidance"),
        async (request) =>
          callK3NoTools({
            repo,
            callDirectory: path.join(out, "generic-guidance"),
            system: request.system,
            prompt: request.prompt,
          }),
      );
      const genericCallEvidence = await sealGenericCall(out);
      process.stdout.write(
        JSON.stringify({
          phase: "generic-guide-complete",
          semanticReview: generic.semanticReview,
        }) + "\n",
      );
      const source = await extractV2Candidates(
        v2Output(repo, label!),
        async (request, callDirectory) => {
          process.stdout.write(
            JSON.stringify({ phase: "source-extraction-started", source: request.source }) + "\n",
          );
          const raw = await callK3NoTools({
            repo,
            callDirectory,
            system: request.system,
            prompt: request.prompt,
          });
          process.stdout.write(
            JSON.stringify({ phase: "source-response-received", source: request.source }) + "\n",
          );
          return raw;
        },
      );
      await frozenRuntime(repo);
      const result = {
        status: "CANDIDATES_READY_FOR_REVIEW",
        completedAt: new Date().toISOString(),
        sourceCandidates: source.candidates.length,
        genericReview: generic.semanticReview,
        genericCallEvidence,
        newLibraryPublished: false,
        targetCalls: 0,
        rtlExecutions: 0,
      };
      await exclusiveJson(path.join(out, "result.json"), result);
      return result;
    } catch {
      await exclusiveJson(path.join(out, "failure.json"), {
        status: "FAILED_RETAINED_NO_RETRY",
        at: new Date().toISOString(),
        note: "Inspect raw stage evidence. No replacement response or target run was launched.",
      });
      throw new Error("METHOD_PREPARATION_FAILED_SEE_EVIDENCE");
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  try {
    process.stdout.write(
      JSON.stringify(await methodPreparationMain(repo, process.argv.slice(2))) + "\n",
    );
  } catch {
    process.stderr.write("METHOD_PREPARATION_FAILED: inspect retained stage evidence; no retry\n");
    process.exitCode = 1;
  }
}
