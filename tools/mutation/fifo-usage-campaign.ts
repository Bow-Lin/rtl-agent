import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { lstat, mkdir, open, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { BUILD, frozenContext, hash } from "./verification-frozen-adapter.ts";
import { IMPLEMENTATION_CHECK } from "./verification-implementation-check.ts";

type Group = "A" | "B" | "C" | "D";
type Condition = { group: Group; repeat: number; mode: "off" | "frozen"; check: boolean };
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

export function usageQueue(): Condition[] {
  return (
    [
      ["A", "B", "C", "D"],
      ["D", "C", "B", "A"],
      ["C", "A", "D", "B"],
    ] as Group[][]
  ).flatMap((groups, i) =>
    groups.map((group) => ({
      group,
      repeat: i + 1,
      mode: group === "B" || group === "D" ? "frozen" : "off",
      check: group === "C" || group === "D",
    })),
  );
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
export function implementationExposure(capture: unknown) {
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
            textContent(block.content).includes(IMPLEMENTATION_CHECK)
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

async function runtimeHashes(repo: string) {
  const files = new Set([
    "tools/mutation/fifo-usage-campaign.ts",
    "tools/mutation/target-coverage-run.ts",
    "tools/mutation/target-provider-guard.ts",
    "tools/mutation/target-topology-guard.ts",
    "tools/mutation/target-coverage-domain.ts",
    "tools/mutation/verification-frozen-adapter.ts",
    "tools/mutation/verification-memory.ts",
    "tools/mutation/verification-implementation-check.ts",
    "packages/core-loop/src/target-fifo-coverage-assets.ts",
    ".pi/extensions/rtl-core-loop-policy.mjs",
    ".pi/capability.json",
    "config/agents/rtl-core-loop/coverage-guidance.md",
    "config/agents/rtl-core-loop/common-guidance.md",
    "pnpm-lock.yaml",
  ]);
  for (const dir of [
    "packages/core-loop/dist",
    "packages/contracts/dist",
    "apps/rtl-core-loop/dist",
  ])
    for (const file of await walk(host(repo, dir)))
      if (file.endsWith(".js")) files.add(logical(repo, file));
  return Object.fromEntries(
    await Promise.all(
      [...files].sort().map(async (file) => [file, hash(await readFile(host(repo, file)))]),
    ),
  );
}

export async function runUsageCampaign(repo: string, label: string) {
  assert.match(label, /^[a-z0-9][a-z0-9-]{0,60}$/);
  const parent = path.join(repo, ".rtl-agent", "fifo-usage-campaigns");
  const lockPath = path.join(repo, ".rtl-agent", "fifo-target-campaigns", "active.lock");
  await mkdir(parent, { recursive: true });
  await mkdir(path.dirname(lockPath), { recursive: true });
  const lockBytes = encoded({ pid: process.pid, label, kind: "fifo-usage-generation" });
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
    const queue = usageQueue();
    const memory = await frozenContext(repo);
    const suitePath = path.join(repo, "mutation", "fifo-transfer-v2", "manifest.json");
    const protocolPath = path.join(repo, "docs", "fifo-memory-usage-2x2.md");
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
      implementationCheck: IMPLEMENTATION_CHECK,
      implementationCheckDigest: hash(IMPLEMENTATION_CHECK),
      selector: "select-all-v1",
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
      const argv = [
        "tools/mutation/target-coverage-run.ts",
        "dpretet",
        q.mode,
        name,
        ...(q.check ? ["implementation-check"] : []),
      ];
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
      assert.equal(condition.workflow, q.check ? "implementation-check" : undefined);
      const nextConfigDigest = hash(JSON.stringify(condition.configAudit));
      if (configDigest !== undefined)
        assert.equal(nextConfigDigest, configDigest, "MODEL_CONFIG_CHANGED");
      else configDigest = nextConfigDigest;
      const executionBytes = await optionalBytes(path.join(conditionRoot, "execution.json"));
      const result = executionBytes === null ? null : JSON.parse(executionBytes.toString()).result;
      if (result !== null) preserveLock = false;
      const conditionFiles = await walk(conditionRoot);
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
      const selectors = await audits(/^verification-selector-\d+\.json$/);
      const checks = await audits(/^implementation-check-\d+\.json$/);
      const transcripts = await audits(/^provider-transcript\.json$/);
      const agentAttempts = result?.agentAttempts ?? providers.length;
      finalAttempt(agentAttempts);
      if (run !== null) {
        const baseline = await json(baselineManifests[0]!);
        const nextBaselineDigest = hash(JSON.stringify(baseline.entries));
        if (baselineDigest !== undefined)
          assert.equal(nextBaselineDigest, baselineDigest, "BASELINE_CHANGED");
        else baselineDigest = nextBaselineDigest;
        const specBytes = await readFile(path.join(run, "workspace", "spec.md"));
        const suffix = Buffer.from(`\n\n${IMPLEMENTATION_CHECK}\n`);
        const original =
          q.check && checks.length > 0 ? specBytes.subarray(0, -suffix.length) : specBytes;
        if (q.check && checks.length > 0)
          assert.deepEqual(specBytes.subarray(-suffix.length), suffix, "INTERVENTION_SPEC_CHANGED");
        const nextSpecDigest = hash(original);
        if (originalSpecDigest !== undefined)
          assert.equal(nextSpecDigest, originalSpecDigest, "ORIGINAL_SPEC_CHANGED");
        else originalSpecDigest = nextSpecDigest;
      }
      assert.equal(
        selectors.length,
        q.mode === "off" ? 0 : agentAttempts,
        "SELECTOR_COUNT_MISMATCH",
      );
      assert.equal(
        checks.length,
        q.check ? agentAttempts : 0,
        "IMPLEMENTATION_CHECK_COUNT_MISMATCH",
      );
      const exposure = transcripts.map((capture) => ({
        attempt: capture.attempt,
        ...implementationExposure(capture),
        transcriptRequests: capture.exchanges.length,
      }));
      for (const capture of transcripts) {
        const request = JSON.stringify(capture.exchanges[0]?.request);
        assert.ok(request, "MISSING_PROVIDER_REQUEST");
        assert.equal(
          request.includes(JSON.stringify(memory.content).slice(1, -1)),
          q.mode === "frozen",
          "MEMORY_EXPOSURE_MISMATCH",
        );
        if (q.mode === "off")
          assert.ok(
            !JSON.stringify(capture.exchanges.map((x: { request: unknown }) => x.request)).includes(
              "Deterministic select-all-v1",
            ),
            "OFF_MEMORY_LEAK",
          );
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
      const infrastructureFailure =
        providerFailure !== undefined ||
        result === null ||
        result.stopReason === "BASELINE_VERILATOR_FAILED";
      const item: Completed = {
        ...q,
        name,
        run: runLogical,
        agentAttempts,
        selectedAttempt,
        selectedSnapshot: snapshotBytes === null ? null : logical(repo, snapshot!),
        selectedManifestDigest: snapshotBytes === null ? null : hash(snapshotBytes),
        generationStatus: infrastructureFailure
          ? "infrastructure-failed"
          : result.status === "FAILED"
            ? "generation-failed"
            : "completed",
        stopReason:
          providerFailure?.classification ??
          result?.stopReason ??
          `CHILD_EXIT_${childCode}_NO_EXECUTION`,
      };
      if (snapshotBytes !== null)
        assert.equal(JSON.parse(snapshotBytes.toString()).attempt, selectedAttempt);
      await writeFile(
        path.join(root, `${name}-audit.json`),
        encoded({
          ...item,
          childExitCode: childCode,
          baselineDigest,
          configDigest,
          originalSpecDigest,
          providers,
          topology,
          scopes,
          selectors: selectors.length,
          checks: checks.length,
          implementationExposure: exposure,
          workflowExposure: q.check
            ? exposure.length === agentAttempts &&
              agentAttempts > 0 &&
              exposure.every((x) => x.exposed)
            : null,
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
    assert.equal(completed.length, 12);
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

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href)
  await runUsageCampaign(process.cwd(), process.argv[2] ?? "");
