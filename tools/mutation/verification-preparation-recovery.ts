import assert from "node:assert/strict";
import { lstat, mkdir, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { digest, exclusiveJson, safeRead } from "./verification-memory.ts";
import { prepareV2Build, K3_NO_TOOL_CONFIG } from "./verification-memory-v2-build.ts";
import type { PreparedCall, V2Preparation } from "./verification-memory-v2-build.ts";
import { parseV2Extraction } from "./verification-memory-v2.ts";
import type { ExperienceV2 } from "./verification-memory-v2.ts";
import { callK3NoTools, withBuildLocks } from "./verification-memory-v2-run.ts";

export const RECOVERY_LABEL = "work-items-v2-20260919-prep1";
export const RECOVERY_ID = "recovery-v1";
export const REMAINING_SOURCES = ["eth", "ufifo", "openhmc"] as const;
const methodRoot = `.rtl-agent/verification-method-preparation/${RECOVERY_LABEL}`;
const sourceRoot = `.rtl-agent/verification-memory-v2/${RECOVERY_LABEL}`;
const recoveryRoot = `${sourceRoot}/${RECOVERY_ID}`;
const oldPlan = ".rtl-agent/fifo-directed-campaigns/fifo-directed-memory10-20260918-v1/plan.json";
const pins = [
  [
    methodRoot + "/preparation.json",
    "b2b3a59d4e067987688725aa60bd57d1d86c3ae4218883ab433cf45ab89f7d9f",
  ],
  [
    sourceRoot + "/preparation.json",
    "db2511a4515510c0fcb991dc6f840ae8c66e6e9082b698d04a04f137cb07612e",
  ],
  [
    sourceRoot + "/failure.json",
    "8ce53d9c0e6647cdb8f898d94e657d2a22108c16afc0d6814d96f17c64cfd7d6",
  ],
  [
    sourceRoot + "/extract-versatile/response.txt",
    "6068335ef62ec17e82f847899c70e65bef68c1617ce9ba7f01bb6e31a6f35281",
  ],
  [
    sourceRoot + "/extract-versatile/provider-transcript.json",
    "9fa47dedb98615cbdeddd5c2019f7770dfd8e66cd1d3ee86c3079a07187fec88",
  ],
  [
    methodRoot + "/generic-guidance/provider-transcript.json",
    "cf4882533cadaecb38f261865d61f12946300fd8eb3a08e3798fce1a33633c03",
  ],
  [oldPlan, "336363695269d2e4136d658e5ad1f58f413277d504e3533085fdea49cee1a9a9"],
] as const;
const ownFiles = [
  "docs/verification-v2-preparation-recovery.md",
  "tools/mutation/verification-preparation-recovery.ts",
  "tools/mutation/verification-preparation-recovery.test.ts",
];
const providerFiles = [
  "model-config.json",
  "provider-request-1.json",
  "provider-response-1.json",
  "provider-transcript.json",
];
const lockFiles = [
  ".rtl-agent/verification-memory-build.lock",
  ".rtl-agent/fifo-target-campaigns/active.lock",
];
type BoundFile = { path: string; sha256: string };
type CallInput = { system: string; prompt: string };
type ProviderTextBlock = { type: string; text?: string };
export type RecoveryPlan = {
  schemaVersion: 1;
  label: typeof RECOVERY_LABEL;
  recovery: typeof RECOVERY_ID;
  originalProviderCalls: 2;
  maximumNewProviderCalls: 3;
  maximumTotalProviderCalls: 5;
  calls: PreparedCall[];
  boundFiles: BoundFile[];
};

async function json(repo: string, logical: string) {
  return JSON.parse((await safeRead(repo, logical)).toString());
}
async function absent(repo: string, logical: string) {
  try {
    await lstat(path.join(repo, ...logical.split("/")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  throw new Error(`ALREADY_EXISTS_NO_RETRY:${logical}`);
}
async function bind(repo: string, logical: string): Promise<BoundFile> {
  return { path: logical, sha256: digest(await safeRead(repo, logical)) };
}
export async function verifyBoundFiles(repo: string, files: BoundFile[]) {
  for (const file of files)
    assert.equal(
      digest(await safeRead(repo, file.path)),
      file.sha256,
      `RECOVERY_BOUND_FILE_CHANGED:${file.path}`,
    );
}

/** Only the frozen request text and the SDK's known current-directory suffix are allowed. */
export async function auditRecoveryProvider(
  repo: string,
  directory: string,
  input: CallInput,
  raw: string,
) {
  const transcript = await json(repo, `${directory}/provider-transcript.json`);
  assert.equal(transcript.complete, true, "INCOMPLETE_PROVIDER_CALL");
  assert.equal(transcript.timedOut, false, "PROVIDER_TIMED_OUT");
  assert.equal(transcript.requestAuditFailed, false, "PROVIDER_REQUEST_AUDIT_FAILED");
  assert.equal(transcript.requests.length, 1, "EXACTLY_ONE_PROVIDER_REQUEST");
  assert.equal(transcript.responses.length, 1, "EXACTLY_ONE_PROVIDER_RESPONSE");
  assert.deepEqual(await json(repo, `${directory}/model-config.json`), K3_NO_TOOL_CONFIG);
  const request = await json(repo, `${directory}/provider-request-1.json`);
  const response = await json(repo, `${directory}/provider-response-1.json`);
  assert.deepEqual(request, transcript.requests[0]);
  assert.deepEqual(response, transcript.responses[0]);
  assert.equal(request.model, "k3");
  assert.ok(!request.tools || request.tools.length === 0, "TOOLS_FORBIDDEN");
  assert.equal(request.system.length, 1, "EXTRA_SYSTEM_CONTEXT");
  assert.equal(request.system[0].type, "text");
  const cwd = path
    .join(repo, ...directory.split("/"))
    .split(path.sep)
    .join("/");
  assert.equal(
    request.system[0].text,
    `${input.system}\nCurrent working directory: ${cwd}`,
    "SYSTEM_CONTEXT_CHANGED",
  );
  assert.equal(request.messages.length, 1, "EXTRA_CONVERSATION_CONTEXT");
  assert.equal(request.messages[0].role, "user");
  assert.equal(request.messages[0].content.length, 1);
  assert.equal(request.messages[0].content[0].type, "text");
  assert.equal(request.messages[0].content[0].text, input.prompt, "PREPARED_PROMPT_CHANGED");
  assert.equal(response.provider, "kimi-coding");
  assert.equal(response.model, "k3");
  assert.equal(response.stopReason, "stop", "INCOMPLETE_PROVIDER_RESPONSE");
  const blocks = response.content as ProviderTextBlock[];
  assert.ok(
    blocks.every((block) => block.type !== "toolCall"),
    "TOOLS_FORBIDDEN",
  );
  assert.equal(
    blocks
      .filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("\n"),
    raw,
    "RAW_RESPONSE_MISMATCH",
  );
  return Promise.all(providerFiles.map((name) => bind(repo, `${directory}/${name}`)));
}

/** Read-only: no directories, credentials, provider calls or changes to original evidence. */
export async function recoveryPreflight(repo: string): Promise<RecoveryPlan> {
  repo = await realpath(repo);
  const boundFiles: BoundFile[] = [];
  for (const [logical, expected] of pins) {
    const file = await bind(repo, logical);
    assert.equal(file.sha256, expected, `ORIGINAL_BATCH_CHANGED:${logical}`);
    boundFiles.push(file);
  }
  const receipt = await json(repo, `${methodRoot}/preparation.json`);
  assert.equal(receipt.maximumCalls, 5);
  assert.equal(receipt.maximumSourceCalls, 4);
  assert.equal(receipt.maximumGenericCalls, 1);
  const preparation = (await json(repo, `${sourceRoot}/preparation.json`)) as V2Preparation;
  assert.deepEqual(await prepareV2Build(repo), preparation, "ORIGINAL_SOURCE_OR_RUNTIME_CHANGED");
  assert.equal(receipt.sourcePreparation.sha256, pins[1][1]);
  const previousPlan = await json(repo, oldPlan);
  assert.equal(Object.keys(previousPlan.runtimeHashes).length, 103);
  assert.deepEqual(receipt.oldRuntimeHashes, previousPlan.runtimeHashes);
  const runtime: BoundFile[] = [
    ...Object.entries(previousPlan.runtimeHashes as Record<string, string>).map(
      ([logical, sha256]) => ({ path: logical, sha256 }),
    ),
    ...receipt.runtime,
    ...preparation.runtimeHashes,
  ];
  await verifyBoundFiles(repo, runtime);
  boundFiles.push(...runtime);
  const failure = await json(repo, `${sourceRoot}/failure.json`);
  assert.equal(failure.status, "FAILED_NOT_PUBLISHED");
  assert.equal(failure.failedSource, "versatile");
  assert.equal(failure.stage, "structural-and-reference-validation");
  assert.deepEqual(failure.completed, []);
  assert.deepEqual(failure.remaining, REMAINING_SOURCES);
  assert.equal((await json(repo, `${methodRoot}/failure.json`)).status, "FAILED_RETAINED_NO_RETRY");
  assert.equal((await json(repo, `${methodRoot}/run-started.json`)).maximumCalls, 5);
  assert.equal((await json(repo, `${sourceRoot}/run-started.json`)).preparationDigest, pins[1][1]);
  assert.deepEqual(
    preparation.calls.map((call) => call.source),
    ["versatile", ...REMAINING_SOURCES],
  );
  const original = preparation.calls[0]!;
  const originalRaw = (
    await safeRead(repo, `${sourceRoot}/extract-versatile/response.txt`)
  ).toString();
  assert.throws(
    () => parseV2Extraction(originalRaw, original.bundle),
    "ORIGINAL_STRUCTURAL_FAILURE_CHANGED",
  );
  assert.deepEqual(await json(repo, `${sourceRoot}/extract-versatile/input.json`), {
    system: original.system,
    prompt: original.prompt,
  });
  boundFiles.push(
    ...(await auditRecoveryProvider(
      repo,
      `${sourceRoot}/extract-versatile`,
      original,
      originalRaw,
    )),
  );
  const generic = receipt.genericRequest as CallInput;
  assert.deepEqual(await json(repo, `${methodRoot}/generic-guidance/request.json`), {
    name: "generic-guidance",
    ...generic,
  });
  const genericRaw = (await json(repo, `${methodRoot}/generic-guidance/raw-response.json`))
    .text as string;
  boundFiles.push(
    ...(await auditRecoveryProvider(repo, `${methodRoot}/generic-guidance`, generic, genericRaw)),
  );
  const genericSeal = await json(repo, `${methodRoot}/generic-guidance/evidence-seal.json`);
  assert.equal(genericSeal.status, "ACTUAL_CALL_BOUND_PENDING_SEMANTIC_REVIEW");
  assert.equal(genericSeal.files.length, 7);
  for (const file of genericSeal.files as BoundFile[]) {
    const bound = { path: `${methodRoot}/${file.path}`, sha256: file.sha256 };
    await verifyBoundFiles(repo, [bound]);
    boundFiles.push(bound);
  }
  for (const logical of [
    `${methodRoot}/failure.json`,
    `${methodRoot}/run-started.json`,
    `${sourceRoot}/run-started.json`,
    `${methodRoot}/generic-guidance/evidence-seal.json`,
    `${sourceRoot}/extract-versatile/input.json`,
    ...ownFiles,
  ])
    boundFiles.push(await bind(repo, logical));
  await absent(repo, recoveryRoot);
  await absent(repo, `${sourceRoot}/published`);
  await absent(repo, `${sourceRoot}/candidates.json`);
  for (const source of REMAINING_SOURCES) await absent(repo, `${sourceRoot}/extract-${source}`);
  const unique = new Map(boundFiles.map((file) => [file.path, file]));
  return {
    schemaVersion: 1,
    label: RECOVERY_LABEL,
    recovery: RECOVERY_ID,
    originalProviderCalls: 2,
    maximumNewProviderCalls: 3,
    maximumTotalProviderCalls: 5,
    calls: preparation.calls.slice(1),
    boundFiles: [...unique.values()],
  };
}

type RecoveryResult = {
  source: string;
  status:
    "VALID_PENDING_SEMANTIC_REVIEW" | "STRUCTURAL_FAILURE" | "PROVIDER_OR_INFRASTRUCTURE_FAILURE";
  callStarted: boolean;
  rawDigest: string | null;
  candidates: { itemDigest: string; item: ExperienceV2 }[] | null;
};
type RecoveryDependencies = {
  preflight?: (repo: string) => Promise<RecoveryPlan>;
  caller?: (input: Parameters<typeof callK3NoTools>[0]) => Promise<string>;
};
async function verifyOwnership(repo: string) {
  for (const logical of lockFiles)
    assert.equal((await json(repo, logical)).pid, process.pid, "RECOVERY_LOCK_OWNERSHIP_CHANGED");
  for (const marker of [
    ".rtl-agent/family-process-active.json",
    ".rtl-agent/family-preparation.pause.json",
  ])
    await absent(repo, marker);
}
async function availableEvidence(repo: string, directory: string) {
  const files: BoundFile[] = [];
  for (const name of ["input.json", ...providerFiles, "response.txt", "result.json"]) {
    try {
      files.push(await bind(repo, `${directory}/${name}`));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return files;
}

/** Dependency injection is only for offline fixtures. The CLI never accepts injected providers. */
export async function runRecovery(repo: string, dependencies: RecoveryDependencies = {}) {
  repo = await realpath(repo);
  return withBuildLocks(repo, async () => {
    const plan = await (dependencies.preflight ?? recoveryPreflight)(repo);
    assert.equal(plan.label, RECOVERY_LABEL);
    assert.equal(plan.recovery, RECOVERY_ID);
    assert.equal(plan.originalProviderCalls, 2);
    assert.equal(plan.maximumNewProviderCalls, 3);
    assert.equal(plan.maximumTotalProviderCalls, 5);
    assert.deepEqual(
      plan.calls.map((call) => call.source),
      REMAINING_SOURCES,
    );
    await verifyOwnership(repo);
    await verifyBoundFiles(repo, plan.boundFiles);
    const out = path.join(repo, ...recoveryRoot.split("/"));
    await mkdir(out); // A prior success, failure or uncertain submission must never be resumed.
    await exclusiveJson(path.join(out, "recovery-plan.json"), {
      ...plan,
      startedAt: new Date().toISOString(),
      deviation: "continue-original-uncalled-sources-after-structural-failure",
      actualPayloadDifference:
        "SDK current-working-directory suffix points to the exclusive recovery directory; prepared system and prompt unchanged",
    });
    const planFile = await bind(repo, `${recoveryRoot}/recovery-plan.json`);
    const results: RecoveryResult[] = [];
    const files: BoundFile[] = [];
    let attempted = 0;
    let active: PreparedCall | undefined;
    let callStarted = false;
    try {
      for (const call of plan.calls) {
        active = call;
        callStarted = false;
        await verifyOwnership(repo);
        await verifyBoundFiles(repo, [...plan.boundFiles, planFile, ...files]);
        for (const source of REMAINING_SOURCES)
          await absent(repo, `${sourceRoot}/extract-${source}`);
        const logical = `${recoveryRoot}/extract-${call.source}`;
        const directory = path.join(repo, ...logical.split("/"));
        await mkdir(directory);
        await exclusiveJson(path.join(directory, "input.json"), {
          system: call.system,
          prompt: call.prompt,
        });
        assert.ok(attempted < 3, "RECOVERY_BUDGET_EXCEEDED");
        attempted++;
        callStarted = true;
        process.stdout.write(
          JSON.stringify({
            phase: "source-started",
            source: call.source,
            maximumTotalProviderCalls: 5,
          }) + "\n",
        );
        const raw = await (dependencies.caller ?? callK3NoTools)({
          repo,
          callDirectory: directory,
          system: call.system,
          prompt: call.prompt,
        });
        await writeFile(path.join(directory, "response.txt"), raw, { flag: "wx" });
        await auditRecoveryProvider(repo, logical, call, raw);
        let candidates: RecoveryResult["candidates"] = null;
        try {
          candidates = parseV2Extraction(raw, call.bundle).map((item) => ({
            itemDigest: digest(JSON.stringify(item)),
            item,
          }));
        } catch {
          // Only parser rejection is recoverable. No prompt change, normalization or replacement.
        }
        const result: RecoveryResult = {
          source: call.source,
          status: candidates === null ? "STRUCTURAL_FAILURE" : "VALID_PENDING_SEMANTIC_REVIEW",
          callStarted: true,
          rawDigest: digest(raw),
          candidates,
        };
        await exclusiveJson(path.join(directory, "result.json"), result);
        results.push(result);
        files.push(...(await availableEvidence(repo, logical)));
        active = undefined;
        process.stdout.write(
          JSON.stringify({
            source: call.source,
            status: result.status,
            totalCallsConsumed: 2 + attempted,
          }) + "\n",
        );
      }
      await verifyOwnership(repo);
      await verifyBoundFiles(repo, [...plan.boundFiles, planFile, ...files]);
      const manifest = {
        schemaVersion: 1,
        status: "ORIGINAL_FIVE_CALLS_ACCOUNTED_PENDING_SEMANTIC_REVIEW",
        completedAt: new Date().toISOString(),
        originalProviderCalls: 2,
        recoveryProviderCalls: attempted,
        totalProviderCalls: 2 + attempted,
        originalVersatileStatus: "STRUCTURAL_FAILURE_RETAINED",
        results,
        originalAndRuntimeFiles: plan.boundFiles,
        recoveryPlan: planFile,
        files,
        publication: false,
        retries: 0,
        targetCalls: 0,
        rtlExecutions: 0,
      };
      await exclusiveJson(path.join(out, "manifest.json"), manifest);
      return manifest;
    } catch {
      if (active && !results.some((result) => result.source === active!.source))
        results.push({
          source: active.source,
          status: "PROVIDER_OR_INFRASTRUCTURE_FAILURE",
          callStarted,
          rawDigest: null,
          candidates: null,
        });
      if (active)
        files.push(...(await availableEvidence(repo, `${recoveryRoot}/extract-${active.source}`)));
      await exclusiveJson(path.join(out, "failure.json"), {
        status: "STOPPED_NO_RETRY_OR_REPLACEMENT",
        failedAt: new Date().toISOString(),
        attemptedRecoveryCalls: attempted,
        maximumTotalCallsPossiblyConsumed: 2 + attempted,
        results,
        originalAndRuntimeFiles: plan.boundFiles,
        recoveryPlan: planFile,
        files,
        note: "Inspect retained provider evidence. An uncertain or submitted request is consumed and must not be retried.",
      });
      throw new Error("PREPARATION_RECOVERY_STOPPED_NO_RETRY");
    }
  });
}

export async function recoveryMain(repo: string, args: string[]) {
  assert.equal(args.length, 3, "Use --preflight|run work-items-v2-20260919-prep1 recovery-v1");
  assert.equal(args[1], RECOVERY_LABEL);
  assert.equal(args[2], RECOVERY_ID);
  assert.ok(args[0] === "--preflight" || args[0] === "run");
  if (args[0] === "run") {
    const result = await runRecovery(repo);
    return {
      status: result.status,
      originalProviderCalls: result.originalProviderCalls,
      recoveryProviderCalls: result.recoveryProviderCalls,
      totalProviderCalls: result.totalProviderCalls,
      sources: result.results.map((entry) => ({
        source: entry.source,
        status: entry.status,
        candidates: entry.candidates?.length ?? null,
      })),
      manifest: `${recoveryRoot}/manifest.json`,
    };
  }
  const plan = await recoveryPreflight(repo);
  return {
    status: "PREFLIGHT_PASSED_NO_MODEL_CALLS",
    originalProviderCalls: 2,
    maximumNewProviderCalls: 3,
    boundFiles: plan.boundFiles.length,
    sources: plan.calls.map((call) => call.source),
  };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  try {
    process.stdout.write(JSON.stringify(await recoveryMain(repo, process.argv.slice(2))) + "\n");
  } catch {
    process.stderr.write("PREPARATION_RECOVERY_REJECTED: inspect retained evidence; no retry\n");
    process.exitCode = 1;
  }
}
