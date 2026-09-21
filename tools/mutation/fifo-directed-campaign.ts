import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { lstat, mkdir, open, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { BUILD, frozenContext, hash } from "./verification-frozen-adapter.ts";
import { DIRECTED_WORK_ITEM, directedContext } from "./verification-directed-memory.ts";
import { safeRead } from "./verification-memory.ts";

type Group = "E";
type Condition = { group: Group; repeat: number; mode: "directed-memory10"; check: false };
type Completed = Condition & {
  name: string;
  run: string | null;
  agentAttempts: number;
  selectedAttempt: number;
  selectedSnapshot: string | null;
  selectedManifestDigest: string | null;
  generationStatus: "completed" | "generation-failed" | "infrastructure-failed";
  stopReason: string;
};

export function directedQueue(): Condition[] {
  return [1, 2, 3].map((repeat) => ({
    group: "E",
    repeat,
    mode: "directed-memory10",
    check: false,
  }));
}

export function finalAttempt(agentAttempts: number) {
  assert.ok(Number.isSafeInteger(agentAttempts) && agentAttempts >= 0 && agentAttempts <= 3);
  return agentAttempts > 0 ? agentAttempts + 1 : 0;
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
function textContent(value: unknown): string {
  if (typeof value === "string") return value;
  return array(value)
    .map((v) => (typeof record(v).text === "string" ? record(v).text : ""))
    .join("\n");
}

// A quotation by the assistant is not evidence that the actual spec was read. Link the
// successful tool_result to an earlier read(spec.md) response, then inspect every request.
export function directedSpecExposure(capture: unknown) {
  const specReads = new Set<string>();
  const requestSequences: number[] = [];
  const exchanges = array(record(capture).exchanges);
  for (const [index, raw] of exchanges.entries()) {
    const exchange = record(raw);
    const messages = array(record(exchange.request).messages);
    const observed = messages.some(
      (message) =>
        record(message).role === "user" &&
        array(record(message).content).some((rawBlock) => {
          const block = record(rawBlock);
          return (
            block.type === "tool_result" &&
            block.is_error === false &&
            typeof block.tool_use_id === "string" &&
            specReads.has(block.tool_use_id) &&
            textContent(block.content).includes(DIRECTED_WORK_ITEM)
          );
        }),
    );
    if (observed) requestSequences.push(index + 1);
    for (const rawBlock of array(record(exchange.response).content)) {
      const block = record(rawBlock);
      if (
        block.type === "toolCall" &&
        block.name === "read" &&
        ["spec.md", "./spec.md"].includes(String(record(block.arguments).path)) &&
        typeof block.id === "string"
      )
        specReads.add(block.id);
    }
  }
  return { exposed: requestSequences.length > 0, requestSequences, specReadCalls: specReads.size };
}

async function walk(dir: string): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    assert.ok(!entry.isSymbolicLink(), "REDIRECTED_EVIDENCE");
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...(await walk(file)));
    else if (entry.isFile()) result.push(file);
    else throw new Error("NON_REGULAR_EVIDENCE");
  }
  return result.sort();
}
async function optionalBytes(file: string) {
  try {
    return await readFile(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
async function exists(file: string) {
  try {
    await lstat(file);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}
async function json(file: string) {
  return JSON.parse(await readFile(file, "utf8"));
}
const logical = (repo: string, file: string) => path.relative(repo, file).split(path.sep).join("/");
const host = (repo: string, file: string) => path.join(repo, ...file.split("/"));
const encoded = (value: unknown) => JSON.stringify(value, null, 2) + "\n";

const PRIOR_PLAN = ".rtl-agent/fifo-usage-campaigns/fifo-usage-v1-20260918-0931/plan.json";
const PRIOR_PLAN_DIGEST = "8a5d6d0e81cbdaa134ac0078c01937f79b980c0cb027fa22260ac47bef3b6cc1";
const REFERENCE = {
  baselineDigest: "6fc2634b77381987ec33b880222dde37ca6da26f8d637b76c98fa4f76c19d931",
  configDigest: "8f5fdf30544842f7c8697ffd91a08b6699be60ba29dab9e318fafe834cfcfd78",
  originalSpecDigest: "a31ff1ef48c91f2c0d92baf816784d59fad8469bcd4d0a0827324e402c3b949d",
};
async function runtimeHashes(repo: string) {
  const priorBytes = await safeRead(repo, PRIOR_PLAN);
  assert.equal(hash(priorBytes), PRIOR_PLAN_DIGEST, "PRIOR_PLAN_CHANGED");
  const prior = JSON.parse(priorBytes.toString());
  const result: Record<string, string> = {};
  for (const [file, digest] of Object.entries(prior.runtimeHashes)) {
    const current = hash(await safeRead(repo, file));
    assert.equal(current, digest, "PRIOR_RUNTIME_CHANGED:" + file);
    result[file] = current;
  }
  for (const file of [
    "tools/mutation/fifo-directed-campaign.ts",
    "tools/mutation/verification-directed-memory.ts",
    "tools/mutation/directed-target-coverage-run.ts",
    "tools/mutation/evaluate-fifo-directed.ts",
    "tools/mutation/evaluate-fifo-usage.ts",
    "tools/mutation/family-process.ts",
  ])
    result[file] = hash(await safeRead(repo, file));
  return result;
}
async function verifySnapshot(repo: string, snapshot: string) {
  const bytes = await safeRead(host(repo, snapshot), "manifest.json");
  const manifest = JSON.parse(bytes.toString());
  for (const entry of manifest.entries) {
    const actual = await safeRead(host(repo, snapshot), entry.path);
    assert.equal(actual.byteLength, entry.byteLength, "SNAPSHOT_SIZE_CHANGED");
    assert.equal(
      hash(actual),
      String(entry.contentDigest).replace(/^sha256:/, ""),
      "SNAPSHOT_BYTES_CHANGED",
    );
  }
  return { bytes, manifest };
}
export function generationClassification(
  providerFailed: boolean,
  integrityFailed: boolean,
  result: { status: string; stopReason: string } | null,
  processFailed = false,
) {
  if (providerFailed || processFailed) return "infrastructure-failed" as const;
  if (integrityFailed) return "generation-failed" as const;
  if (result === null || result.stopReason === "BASELINE_VERILATOR_FAILED")
    return "infrastructure-failed" as const;
  return result.status === "FAILED" ? ("generation-failed" as const) : ("completed" as const);
}
export function processEvidenceStatus(
  records: unknown[],
  agentRecords: unknown[] = [],
  expectedAgentRecords = agentRecords.length,
) {
  const values = records.map(record);
  const agentValues = agentRecords.map(record);
  const agentCleanupConfirmed =
    agentValues.length === expectedAgentRecords &&
    agentValues.every(
      (value) => value.timedOut === false && value.outcome !== "AGENT_PROCESS_ERROR",
    );
  const cleanupConfirmed =
    values.length > 0 &&
    agentCleanupConfirmed &&
    values.every((value) => value.closeConfirmed === true && value.terminationFailed === false);
  const infrastructureFailure =
    !cleanupConfirmed ||
    values.some((value) => value.timedOut !== false || value.spawnError !== undefined);
  return { recordCount: values.length, cleanupConfirmed, infrastructureFailure };
}
export async function preflightDirectedCampaign(repo: string, label: string) {
  assert.match(label, /^[a-z0-9][a-z0-9-]{0,60}$/);
  for (const file of [
    ".rtl-agent/fifo-target-campaigns/active.lock",
    ".rtl-agent/family-process-active.json",
    ".rtl-agent/family-preparation.pause.json",
    ".rtl-agent/fifo-directed-campaigns/" + label,
  ])
    assert.equal(await exists(host(repo, file)), false, "NOT_IDLE_OR_OUTPUT_EXISTS:" + file);
  for (const q of directedQueue())
    assert.equal(
      await exists(
        path.join(repo, ".rtl-agent", "fifo-target-runs", label + "-dpretet-r" + q.repeat + "-e"),
      ),
      false,
      "CONDITION_ALREADY_EXISTS",
    );
  const memory = await directedContext(repo);
  const runtime = await runtimeHashes(repo);
  await safeRead(repo, "docs/fifo-memory10-directed-diagnostic.md");
  return { memory, runtime, reference: REFERENCE };
}

export async function runDirectedCampaign(repo: string, label: string) {
  await preflightDirectedCampaign(repo, label);
  const parent = path.join(repo, ".rtl-agent", "fifo-directed-campaigns");
  const lockPath = path.join(repo, ".rtl-agent", "fifo-target-campaigns", "active.lock");
  await mkdir(parent, { recursive: true });
  await mkdir(path.dirname(lockPath), { recursive: true });
  const lockBytes = encoded({ pid: process.pid, label, kind: "fifo-directed-generation" });
  const lock = await open(lockPath, "wx");
  await lock.writeFile(lockBytes);
  await lock.close();
  const root = path.join(parent, label);
  const completed: Completed[] = [];
  let preserveLock = false;
  let baselineDigest: string | undefined;
  let configDigest: string | undefined;
  let originalSpecDigest: string | undefined;
  let rootCreated = false;
  try {
    for (const marker of ["family-process-active.json", "family-preparation.pause.json"])
      assert.equal(
        await exists(path.join(repo, ".rtl-agent", marker)),
        false,
        "FAMILY_PROCESS_OR_PAUSE_PRESENT",
      );
    await mkdir(root); // An existing or partial campaign is never silently resumed/replaced.
    rootCreated = true;
    const queue = directedQueue();
    const memory = await directedContext(repo);
    const suitePath = path.join(repo, "mutation", "fifo-transfer-v2", "manifest.json");
    const protocolPath = path.join(repo, "docs", "fifo-memory10-directed-diagnostic.md");
    const suiteDigest = hash(await readFile(suitePath));
    const protocolDigest = hash(await readFile(protocolPath));
    const frozenRuntime = await runtimeHashes(repo);
    // Preflight every output path before the first generation; never reuse a historical draw.
    for (const q of queue) {
      const name = `${label}-dpretet-r${q.repeat}-${q.group.toLowerCase()}`;
      assert.equal(
        await exists(path.join(repo, ".rtl-agent", "fifo-target-runs", name)),
        false,
        "CONDITION_ALREADY_EXISTS",
      );
    }
    const planBytes = encoded({
      schemaVersion: 1,
      kind: "directed-memory10-development-diagnostic",
      priorPlan: PRIOR_PLAN,
      priorPlanDigest: PRIOR_PLAN_DIGEST,
      reference: REFERENCE,
      label,
      queue,
      project: "dpretet",
      boundaryVersion: "target-recovery-v2",
      build: BUILD,
      manifestDigest: memory.manifestDigest,
      itemsDigest: memory.itemsDigest,
      suiteDigest,
      protocolDigest,
      runtimeHashes: frozenRuntime,
      directedWorkItem: DIRECTED_WORK_ITEM,
      directedWorkItemDigest: hash(DIRECTED_WORK_ITEM),
      selectedIds: memory.selectedIds,
      selectedItemDigest: memory.selectedItemDigest,
      injectionDigest: memory.injectionDigest,
      selector: "select-memory10-v1",
      language: "original-Chinese",
      maximumIterations: 3,
      selection: "last-attempt-only-no-fallback",
      evaluationDuringGeneration: false,
      targetUpdates: false,
      authoritative: false,
      startedAt: new Date().toISOString(),
    });
    const planDigest = hash(planBytes);
    await writeFile(path.join(root, "plan.json"), planBytes, { flag: "wx" });
    const progress = async (active: unknown) =>
      writeFile(
        path.join(root, "progress.json"),
        encoded({
          schemaVersion: 1,
          planDigest,
          pid: process.pid,
          completed,
          active,
          remaining: queue.length - completed.length,
          updatedAt: new Date().toISOString(),
        }),
      );
    await progress(null);
    for (const q of queue) {
      await frozenContext(repo);
      assert.equal(hash(await readFile(suitePath)), suiteDigest, "SUITE_CHANGED");
      assert.equal(hash(await readFile(protocolPath)), protocolDigest, "PROTOCOL_CHANGED");
      assert.deepEqual(await runtimeHashes(repo), frozenRuntime, "RUNTIME_CHANGED");
      const name = `${label}-dpretet-r${q.repeat}-${q.group.toLowerCase()}`;
      const conditionRoot = path.join(repo, ".rtl-agent", "fifo-target-runs", name);
      const stdout = await open(path.join(root, `${name}.stdout.log`), "wx");
      const stderr = await open(path.join(root, `${name}.stderr.log`), "wx");
      const argv = ["tools/mutation/directed-target-coverage-run.ts", "dpretet", q.mode, name];
      let childCode: number;
      console.log(encoded({ phase: "generation-start", name }).trim());
      try {
        const child = spawn(process.execPath, [host(repo, argv[0]!), ...argv.slice(1)], {
          cwd: repo,
          shell: false,
          windowsHide: true,
          stdio: ["ignore", stdout.fd, stderr.fd],
        });
        // Until terminal runner evidence is read, any failure (including a failed PID/log
        // write) leaves the lock in place; an owned child may still be running.
        if (child.pid !== undefined) preserveLock = true;
        const done = new Promise<number>((resolve, reject) => {
          child.once("error", reject);
          child.once("close", (code, signal) => {
            if (signal) {
              preserveLock = true;
              reject(new Error(`CHILD_SIGNAL_${signal}`));
            } else resolve(code ?? -1);
          });
        });
        // Attach rejection handling while persisting the PID, then await the same promise.
        void done.catch(() => undefined);
        const active = {
          name,
          ...q,
          childPid: child.pid ?? null,
          startedAt: new Date().toISOString(),
        };
        await writeFile(path.join(root, `${name}.child.json`), encoded({ ...active, argv }), {
          flag: "wx",
        });
        await progress(active);
        childCode = await done;
        await writeFile(
          path.join(root, `${name}.child-result.json`),
          encoded({
            childPid: child.pid ?? null,
            exitCode: childCode,
            finishedAt: new Date().toISOString(),
          }),
          { flag: "wx" },
        );
      } finally {
        await stdout.close();
        await stderr.close();
      }

      const condition = await json(path.join(conditionRoot, "condition.json"));
      assert.equal(condition.boundaryVersion, "target-recovery-v2");
      assert.equal(condition.project, "dpretet");
      assert.equal(condition.mode, q.mode);
      assert.equal(condition.maxIterations, 3);
      assert.equal(condition.selector, "select-memory10-v1");
      const nextConfigDigest = hash(JSON.stringify(condition.configAudit));
      assert.equal(nextConfigDigest, REFERENCE.configDigest, "ORIGINAL_CONFIG_CHANGED");
      if (configDigest !== undefined)
        assert.equal(nextConfigDigest, configDigest, "MODEL_CONFIG_CHANGED");
      else configDigest = nextConfigDigest;
      const executionBytes = await optionalBytes(path.join(conditionRoot, "execution.json"));
      const result = executionBytes === null ? null : JSON.parse(executionBytes.toString()).result;
      const conditionFiles = await walk(conditionRoot);
      const processFiles = conditionFiles.filter((file) =>
        /^(compile|simulation|coverage)-process\.json$/.test(path.basename(file)),
      );
      const processRecords = await Promise.all(processFiles.map(json));
      const baselineManifests = conditionFiles.filter((file) =>
        logical(conditionRoot, file).endsWith(
          "/evidence/verification-assets/attempt-0/manifest.json",
        ),
      );
      assert.ok(baselineManifests.length <= 1, "MULTIPLE_RUNS_IN_SAMPLE");
      const run =
        baselineManifests.length === 0
          ? null
          : path.dirname(path.dirname(path.dirname(path.dirname(baselineManifests[0]!))));
      const runLogical = run === null ? null : logical(repo, run);
      if (result !== null) assert.equal(result.runDirectory, runLogical, "RUN_PATH_MISMATCH");
      const evidenceFiles =
        run === null
          ? []
          : conditionFiles.filter((file) => file.startsWith(path.join(run, "evidence") + path.sep));
      const audits = async (pattern: RegExp) =>
        Promise.all(evidenceFiles.filter((file) => pattern.test(path.basename(file))).map(json));
      const providers = await audits(/^target-provider-\d+\.json$/);
      const topology = await audits(/^target-topology-\d+\.json$/);
      const scopes = await audits(/^target-coverage-scope-\d+\.json$/);
      const receipts = await audits(/^directed-memory-\d+\.json$/);
      const transcripts = await audits(/^provider-transcript\.json$/);
      const agentAttempts = result?.agentAttempts ?? providers.length;
      const agentRecords = await audits(/^agent-turn-result\.json$/);
      const processStatus = processEvidenceStatus(processRecords, agentRecords, agentAttempts);
      // A terminal runner result alone cannot confirm native or Agent process teardown.
      preserveLock = result === null || !processStatus.cleanupConfirmed;
      finalAttempt(agentAttempts);
      if (run !== null) {
        const baseline = (
          await verifySnapshot(repo, logical(repo, path.dirname(baselineManifests[0]!)))
        ).manifest;
        const nextBaselineDigest = hash(JSON.stringify(baseline.entries));
        assert.equal(nextBaselineDigest, REFERENCE.baselineDigest, "ORIGINAL_BASELINE_CHANGED");
        if (baselineDigest !== undefined)
          assert.equal(nextBaselineDigest, baselineDigest, "BASELINE_CHANGED");
        else baselineDigest = nextBaselineDigest;
        const specBytes = await readFile(path.join(run, "workspace", "spec.md"));
        const suffix = Buffer.from(`\n\n${DIRECTED_WORK_ITEM}\n`);
        const original = receipts.length > 0 ? specBytes.subarray(0, -suffix.length) : specBytes;
        if (receipts.length > 0)
          assert.deepEqual(specBytes.subarray(-suffix.length), suffix, "INTERVENTION_SPEC_CHANGED");
        const nextSpecDigest = hash(original);
        assert.equal(nextSpecDigest, REFERENCE.originalSpecDigest, "REFERENCE_SPEC_CHANGED");
        if (originalSpecDigest !== undefined)
          assert.equal(nextSpecDigest, originalSpecDigest, "ORIGINAL_SPEC_CHANGED");
        else originalSpecDigest = nextSpecDigest;
      }
      assert.equal(receipts.length, agentAttempts, "DIRECTED_RECEIPT_COUNT_MISMATCH");
      for (const receipt of receipts) {
        assert.deepEqual(receipt.selectedIds, memory.selectedIds);
        assert.equal(receipt.itemsDigest, memory.itemsDigest);
        assert.equal(receipt.selectedItemDigest, memory.selectedItemDigest);
        assert.equal(receipt.injectionDigest, memory.injectionDigest);
        assert.equal(receipt.addendumDigest, hash(DIRECTED_WORK_ITEM));
      }
      const exposure = transcripts.map((capture) => ({
        attempt: capture.attempt,
        ...directedSpecExposure(capture),
        transcriptRequests: capture.exchanges.length,
      }));
      for (const capture of transcripts) {
        const request = JSON.stringify(capture.exchanges[0]?.request);
        assert.ok(request, "MISSING_PROVIDER_REQUEST");
        assert.equal(
          request.includes(JSON.stringify(memory.content).slice(1, -1)),
          true,
          "MEMORY_EXPOSURE_MISMATCH",
        );
        assert.ok(
          request.includes(JSON.stringify(DIRECTED_WORK_ITEM).slice(1, -1)),
          "WORK_ITEM_EXPOSURE_MISSING",
        );
        assert.ok(!request.includes("Deterministic select-all-v1"), "FULL_CATALOG_LEAK");
      }
      const providerFailure = providers.find((audit) => audit.status !== "PASSED");
      const integrityFailure =
        topology.some((audit) => audit.status !== "passed") ||
        scopes.some((audit) => audit.status !== "passed") ||
        result?.stopReason === "PROTECTED_RTL_MODIFIED";
      if (providerFailure === undefined && result !== null) {
        assert.equal(providers.length, agentAttempts, "PROVIDER_AUDIT_COUNT_MISMATCH");
        assert.equal(topology.length, agentAttempts, "TOPOLOGY_AUDIT_COUNT_MISMATCH");
        assert.equal(transcripts.length, agentAttempts, "TRANSCRIPT_COUNT_MISMATCH");
      }
      const selectedAttempt = finalAttempt(agentAttempts);
      const snapshot =
        run === null
          ? null
          : path.join(run, "evidence", "verification-assets", `attempt-${selectedAttempt}`);
      const snapshotBytes =
        snapshot === null ||
        (agentAttempts === 0 && (result === null || result.status === "FAILED"))
          ? null
          : await optionalBytes(path.join(snapshot, "manifest.json"));
      const generationStatus = generationClassification(
        providerFailure !== undefined,
        integrityFailure,
        result,
        processStatus.infrastructureFailure,
      );
      const infrastructureFailure = generationStatus === "infrastructure-failed";
      const item: Completed = {
        ...q,
        name,
        run: runLogical,
        agentAttempts,
        selectedAttempt,
        selectedSnapshot: snapshotBytes === null ? null : logical(repo, snapshot!),
        selectedManifestDigest: snapshotBytes === null ? null : hash(snapshotBytes),
        generationStatus,
        stopReason:
          (processStatus.infrastructureFailure ? "NATIVE_PROCESS_FAILURE" : undefined) ??
          providerFailure?.classification ??
          result?.stopReason ??
          `CHILD_EXIT_${childCode}_NO_EXECUTION`,
      };
      if (snapshotBytes !== null) {
        const verified = await verifySnapshot(repo, logical(repo, snapshot!));
        assert.equal(verified.manifest.attempt, selectedAttempt);
        assert.equal(hash(verified.bytes), hash(snapshotBytes));
      }
      await writeFile(
        path.join(root, `${name}-audit.json`),
        encoded({
          ...item,
          childExitCode: childCode,
          processStatus,
          processes: processRecords.map((value, index) => ({
            path: logical(repo, processFiles[index]!),
            exitCode: value.exitCode,
            timedOut: value.timedOut,
            spawnError: value.spawnError ?? null,
            terminationFailed: value.terminationFailed,
            closeConfirmed: value.closeConfirmed,
          })),
          agentProcesses: agentRecords.map((value) => ({
            attempt: value.attempt,
            outcome: value.outcome,
            timedOut: value.timedOut,
            exitCode: value.exitCode,
          })),
          baselineDigest,
          configDigest,
          originalSpecDigest,
          providers,
          topology,
          scopes,
          receipts,
          directedSpecExposure: exposure,
          workflowExposure: transcripts.length === agentAttempts && agentAttempts > 0,
          integrityFailure,
        }),
        { flag: "wx" },
      );
      completed.push(item);
      await progress(null);
      console.log(
        encoded({ phase: "generation-terminal", ...item, count: completed.length }).trim(),
      );
      if (infrastructureFailure || integrityFailure) {
        // A crashing child may leave native descendants; keep ownership until inspected.
        if (result === null) preserveLock = true;
        throw new Error(
          `CAMPAIGN_STOP_${integrityFailure ? "BOUNDARY_INTEGRITY" : item.stopReason}`,
        );
      }
      assert.ok(childCode === 0 || childCode === 3, "UNEXPECTED_CHILD_EXIT");
    }
    assert.equal(completed.length, 3);
    await frozenContext(repo);
    assert.deepEqual(await runtimeHashes(repo), frozenRuntime, "RUNTIME_CHANGED");
    await writeFile(
      path.join(root, "generation-complete.json"),
      encoded({
        schemaVersion: 1,
        planDigest,
        completed,
        finishedAt: new Date().toISOString(),
      }),
      { flag: "wx" },
    );
  } catch (error) {
    if (rootCreated)
      await writeFile(
        path.join(root, "failure.json"),
        encoded({
          error: String(error),
          completed,
          preserveLock,
          at: new Date().toISOString(),
        }),
        { flag: "wx" },
      ).catch(() => undefined);
    throw error;
  } finally {
    if (!preserveLock) {
      assert.equal(await readFile(lockPath, "utf8"), lockBytes, "LOCK_OWNERSHIP_CHANGED");
      await unlink(lockPath);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  assert.ok(
    process.argv.length === 3 || (process.argv.length === 4 && process.argv[3] === "--preflight"),
  );
  if (process.argv[3] === "--preflight") {
    const result = await preflightDirectedCampaign(process.cwd(), process.argv[2] ?? "");
    console.log(
      encoded({
        status: "PASS",
        runtimeFiles: Object.keys(result.runtime).length,
        selectedIds: result.memory.selectedIds,
        reference: result.reference,
      }),
    );
  } else await runDirectedCampaign(process.cwd(), process.argv[2] ?? "");
}
