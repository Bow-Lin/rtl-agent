import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { lstat, mkdir, open, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { finalAttempt, implementationExposure, usageQueue } from "./fifo-usage-campaign.ts";
import { frozenContext, hash } from "./verification-frozen-adapter.ts";
import { IMPLEMENTATION_CHECK } from "./verification-implementation-check.ts";
import { safeRead } from "./verification-memory.ts";
import type { UsageSelection } from "./evaluate-fifo-usage.ts";

// Recovery of this exact interrupted queue, not a resampling or general retry facility.
const LABEL = "fifo-usage-v1-20260918-0931";
const PLAN_DIGEST = "8a5d6d0e81cbdaa134ac0078c01937f79b980c0cb027fa22260ac47bef3b6cc1";
const ROOT = `.rtl-agent/fifo-usage-campaigns/${LABEL}`;
const LOCK = ".rtl-agent/fifo-target-campaigns/active.lock";
const encode = (value: unknown) => JSON.stringify(value, null, 2) + "\n";
const host = (repo: string, logical: string) => path.join(repo, ...logical.split("/"));
async function exists(file: string) {
  try {
    await lstat(file);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}
async function json(repo: string, logical: string) {
  return JSON.parse((await safeRead(repo, logical)).toString());
}
function assertDead(pid: number) {
  assert.ok(Number.isSafeInteger(pid) && pid > 0);
  let absent = false;
  try {
    process.kill(pid, 0);
  } catch (error) {
    assert.equal((error as NodeJS.ErrnoException).code, "ESRCH", "PROCESS_IDENTITY_UNCONFIRMED");
    absent = true;
  }
  assert.ok(absent, "PREVIOUS_PROCESS_STILL_PRESENT");
}
async function verifyManifest(repo: string, snapshot: string, expectedDigest?: string) {
  const bytes = await safeRead(repo, `${snapshot}/manifest.json`);
  if (expectedDigest !== undefined)
    assert.equal(hash(bytes), expectedDigest.replace(/^sha256:/, ""), "SNAPSHOT_MANIFEST_CHANGED");
  const manifest = JSON.parse(bytes.toString());
  for (const entry of manifest.entries) {
    const asset = await safeRead(repo, `${snapshot}/${entry.path}`);
    assert.equal(asset.length, entry.byteLength, "SNAPSHOT_SIZE_CHANGED");
    assert.equal(`sha256:${hash(asset)}`, entry.contentDigest, "SNAPSHOT_BYTES_CHANGED");
  }
  return { manifest, digest: hash(bytes) };
}
async function frozenPlan(repo: string) {
  const bytes = await safeRead(repo, `${ROOT}/plan.json`);
  assert.equal(hash(bytes), PLAN_DIGEST, "ORIGINAL_PLAN_CHANGED");
  const plan = JSON.parse(bytes.toString());
  assert.deepEqual(plan.queue, usageQueue());
  assert.equal(hash(await safeRead(repo, "docs/fifo-memory-usage-2x2.md")), plan.protocolDigest);
  assert.equal(
    hash(await safeRead(repo, "mutation/fifo-transfer-v2/manifest.json")),
    plan.suiteDigest,
  );
  for (const [file, digest] of Object.entries(plan.runtimeHashes))
    assert.equal(hash(await safeRead(repo, file)), digest, `FROZEN_RUNTIME_CHANGED:${file}`);
  const memory = await frozenContext(repo);
  assert.equal(memory.manifestDigest, plan.manifestDigest);
  assert.equal(memory.itemsDigest, plan.itemsDigest);
  assert.equal(hash(IMPLEMENTATION_CHECK), plan.implementationCheckDigest);
  return { plan, memory };
}

export async function preflightUsageResume(repo: string) {
  const frozen = await frozenPlan(repo);
  for (const marker of ["family-process-active.json", "family-preparation.pause.json"])
    assert.equal(await exists(host(repo, `.rtl-agent/${marker}`)), false, "FAMILY_NOT_IDLE");
  assert.equal(
    await exists(host(repo, `${ROOT}/generation-complete.json`)),
    false,
    "ALREADY_SEALED",
  );
  const oldLockBytes = await safeRead(repo, LOCK);
  const oldLock = JSON.parse(oldLockBytes.toString());
  assert.equal(oldLock.label, LABEL);
  assert.equal(oldLock.pid, 22220);
  assertDead(oldLock.pid);
  const progressBytes = await safeRead(repo, `${ROOT}/progress.json`);
  const progress = JSON.parse(progressBytes.toString());
  assert.equal(progress.planDigest, PLAN_DIGEST);
  assert.equal(progress.completed.length, 10);
  assert.equal(progress.active, null);
  assert.equal(progress.remaining, 2);
  const failureBytes = await safeRead(repo, `${ROOT}/failure.json`);
  const failure = JSON.parse(failureBytes.toString());
  assert.deepEqual(failure.completed, progress.completed);
  assert.equal(failure.error, "Error: CAMPAIGN_STOP_BOUNDARY_INTEGRITY");
  const completed = progress.completed as UsageSelection[];
  const evidenceDigests: Record<string, string> = {};
  let reference:
    { baselineDigest: string; configDigest: string; originalSpecDigest: string } | undefined;
  for (const [i, item] of completed.entries()) {
    const q = usageQueue()[i]!;
    for (const [key, value] of Object.entries(q))
      assert.equal((item as unknown as Record<string, unknown>)[key], value);
    assert.equal(item.name, `${LABEL}-dpretet-r${q.repeat}-${q.group.toLowerCase()}`);
    assert.ok(
      item.run?.startsWith(`.rtl-agent/fifo-target-runs/${item.name}/dpretet-depth8-width8/run_`),
    );
    assert.equal(item.selectedAttempt, finalAttempt(item.agentAttempts));
    const auditPath = `${ROOT}/${item.name}-audit.json`;
    const auditBytes = await safeRead(repo, auditPath);
    evidenceDigests[auditPath] = hash(auditBytes);
    const audit = JSON.parse(auditBytes.toString());
    for (const [key, value] of Object.entries(item)) assert.deepEqual(audit[key], value);
    const current = {
      baselineDigest: audit.baselineDigest,
      configDigest: audit.configDigest,
      originalSpecDigest: audit.originalSpecDigest,
    };
    if (reference === undefined) reference = current;
    else assert.deepEqual(current, reference, "HISTORICAL_BASELINE_CONFIG_CHANGED");
    const baseline = await verifyManifest(
      repo,
      `${item.run}/evidence/verification-assets/attempt-0`,
    );
    assert.equal(hash(JSON.stringify(baseline.manifest.entries)), audit.baselineDigest);
    if (i < 9) {
      assert.equal(item.generationStatus, "completed");
      assert.equal(
        item.selectedSnapshot,
        `${item.run}/evidence/verification-assets/attempt-${item.selectedAttempt}`,
      );
      assert.ok(item.selectedManifestDigest);
      const selected = await verifyManifest(
        repo,
        item.selectedSnapshot!,
        item.selectedManifestDigest,
      );
      assert.equal(selected.manifest.attempt, item.selectedAttempt);
      evidenceDigests[`${item.selectedSnapshot}/manifest.json`] = selected.digest;
    }
  }
  const failed = completed[9]!;
  assert.equal(failed.name, `${LABEL}-dpretet-r3-a`);
  assert.equal(failed.agentAttempts, 2);
  assert.equal(failed.selectedSnapshot, null);
  assert.equal(failed.selectedManifestDigest, null);
  assert.equal(failed.generationStatus, "infrastructure-failed");
  assert.equal(failed.stopReason, "CHILD_EXIT_1_NO_EXECUTION");
  assert.equal(
    await exists(host(repo, `${failed.run}/evidence/verification-assets/attempt-3`)),
    false,
  );
  const child = await json(repo, `${ROOT}/${failed.name}.child.json`);
  assertDead(child.childPid);
  for (const attempt of [2, 3]) {
    const providerPath = `${failed.run}/evidence/target-provider-${attempt}.json`;
    const providerBytes = await safeRead(repo, providerPath);
    evidenceDigests[providerPath] = hash(providerBytes);
    const provider = JSON.parse(providerBytes.toString());
    assert.equal(provider.status, "PASSED");
    assert.equal(provider.classification, "COMPLETE");
    assert.equal(
      provider.transcriptDigest,
      `sha256:${hash(await safeRead(repo, `${failed.run}/${provider.transcriptPath}`))}`,
    );
    const topologyPath = `${failed.run}/evidence/target-topology-${attempt}.json`;
    const topologyBytes = await safeRead(repo, topologyPath);
    evidenceDigests[topologyPath] = hash(topologyBytes);
    assert.equal(JSON.parse(topologyBytes.toString()).status, attempt === 2 ? "passed" : "failed");
  }
  const stderrPath = `${ROOT}/${failed.name}.stderr.log`;
  const stderr = await safeRead(repo, stderrPath);
  assert.match(stderr.toString(), /TARGET_EXTRA_DUT_INSTANCE/);
  evidenceDigests[stderrPath] = hash(stderr);
  for (const q of usageQueue().slice(10))
    assert.equal(
      await exists(
        host(
          repo,
          `.rtl-agent/fifo-target-runs/${LABEL}-dpretet-r${q.repeat}-${q.group.toLowerCase()}`,
        ),
      ),
      false,
      "UNSTARTED_SAMPLE_EXISTS",
    );
  return {
    ...frozen,
    completed,
    reference: reference!,
    oldLockBytes,
    progressDigest: hash(progressBytes),
    failureDigest: hash(failureBytes),
    evidenceDigests,
  };
}

export async function resumeUsageCampaign(repo: string) {
  const preflight = await preflightUsageResume(repo);
  const recovery = `${ROOT}/recovery-v1`;
  await mkdir(host(repo, recovery));
  const completed = preflight.completed.map((item) => ({ ...item }));
  completed[9] = {
    ...completed[9]!,
    generationStatus: "generation-failed",
    stopReason: "TARGET_EXTRA_DUT_INSTANCE",
  };
  const replacementLock = Buffer.from(
    encode({ pid: process.pid, label: LABEL, kind: "fifo-usage-generation-resume-v1" }),
  );
  const metadata = {
    schemaVersion: 1,
    planDigest: PLAN_DIGEST,
    previousProgressDigest: preflight.progressDigest,
    previousFailureDigest: preflight.failureDigest,
    previousLock: JSON.parse(preflight.oldLockBytes.toString()),
    recoveryToolDigest: hash(await safeRead(repo, "tools/mutation/resume-fifo-usage.ts")),
    evidenceDigests: preflight.evidenceDigests,
    processCheck:
      "previous parent and last child both ESRCH; operator separately verified native process tree idle",
    reclassification: {
      original: preflight.completed[9],
      corrected: completed[9],
      reason:
        "Both provider turns completed. The existing topology guard rejected an extra DUT instance before final snapshot capture. This is generated-program failure, not provider infrastructure failure.",
    },
    queue: usageQueue().slice(10),
    unchangedPreviouslyAttemptedSamples: 10,
    resampling: false,
    startedAt: new Date().toISOString(),
  };
  const recoveryPlanPath = `${recovery}/recovery-plan.json`;
  const recoveryPlanBytes = encode(metadata);
  const recoveryPlanDigest = hash(recoveryPlanBytes);
  await writeFile(host(repo, recoveryPlanPath), recoveryPlanBytes, { flag: "wx" });
  // Retain the prior lock in the sidecar before claiming it in place (no unlocked gap).
  await writeFile(host(repo, `${recovery}/previous-active.lock`), preflight.oldLockBytes, {
    flag: "wx",
  });
  const lock = await open(host(repo, LOCK), "r+");
  assert.deepEqual(await lock.readFile(), preflight.oldLockBytes, "LOCK_CHANGED_DURING_RECOVERY");
  await lock.truncate(0);
  await lock.write(replacementLock, 0, replacementLock.length, 0);
  await lock.sync();
  await lock.close();
  let preserveLock = false;
  const progress = async (active: unknown) =>
    writeFile(
      host(repo, `${recovery}/progress.json`),
      encode({
        schemaVersion: 1,
        planDigest: PLAN_DIGEST,
        pid: process.pid,
        completed,
        active,
        remaining: 12 - completed.length,
        updatedAt: new Date().toISOString(),
      }),
    );
  try {
    await progress(null);
    for (const q of usageQueue().slice(10)) {
      await frozenPlan(repo);
      assert.equal(
        hash(await safeRead(repo, "tools/mutation/resume-fifo-usage.ts")),
        metadata.recoveryToolDigest,
      );
      const name = `${LABEL}-dpretet-r${q.repeat}-${q.group.toLowerCase()}`;
      const conditionRoot = `.rtl-agent/fifo-target-runs/${name}`;
      assert.equal(await exists(host(repo, conditionRoot)), false, "NO_RETRY_ALLOWED");
      const stdout = await open(host(repo, `${recovery}/${name}.stdout.log`), "wx");
      const stderr = await open(host(repo, `${recovery}/${name}.stderr.log`), "wx");
      const argv = [
        "tools/mutation/target-coverage-run.ts",
        "dpretet",
        q.mode,
        name,
        ...(q.check ? ["implementation-check"] : []),
      ];
      let childCode: number;
      try {
        const child = spawn(process.execPath, [host(repo, argv[0]!), ...argv.slice(1)], {
          cwd: repo,
          shell: false,
          windowsHide: true,
          stdio: ["ignore", stdout.fd, stderr.fd],
        });
        if (child.pid !== undefined) preserveLock = true;
        const done = new Promise<number>((resolve, reject) => {
          child.once("error", reject);
          child.once("close", (code, signal) =>
            signal ? reject(new Error(`CHILD_SIGNAL_${signal}`)) : resolve(code ?? -1),
          );
        });
        void done.catch(() => undefined);
        const active = {
          ...q,
          name,
          childPid: child.pid ?? null,
          startedAt: new Date().toISOString(),
        };
        await writeFile(host(repo, `${recovery}/${name}.child.json`), encode({ ...active, argv }), {
          flag: "wx",
        });
        await progress(active);
        console.log(encode({ phase: "resume-generation-start", ...active }).trim());
        childCode = await done;
        await writeFile(
          host(repo, `${recovery}/${name}.child-result.json`),
          encode({
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
      const execution = await json(repo, `${conditionRoot}/execution.json`);
      preserveLock = false;
      assert.ok(childCode === 0 || childCode === 3, "CHILD_PROCESS_FAILED");
      const result = execution.result;
      const condition = await json(repo, `${conditionRoot}/condition.json`);
      assert.equal(hash(JSON.stringify(condition.configAudit)), preflight.reference.configDigest);
      assert.equal(condition.boundaryVersion, "target-recovery-v2");
      assert.equal(condition.project, "dpretet");
      assert.equal(condition.mode, q.mode);
      assert.equal(condition.maxIterations, 3);
      assert.equal(condition.workflow, q.check ? "implementation-check" : undefined);
      assert.match(
        result.runDirectory,
        new RegExp(`^\\.rtl-agent/fifo-target-runs/${name}/dpretet-depth8-width8/run_[a-z0-9-]+$`),
      );
      const run = result.runDirectory as string;
      const baseline = await verifyManifest(repo, `${run}/evidence/verification-assets/attempt-0`);
      assert.equal(
        hash(JSON.stringify(baseline.manifest.entries)),
        preflight.reference.baselineDigest,
      );
      const spec = await safeRead(repo, `${run}/workspace/spec.md`);
      const suffix = Buffer.from(`\n\n${IMPLEMENTATION_CHECK}\n`);
      const checkAppended = q.check && result.agentAttempts > 0;
      if (checkAppended) assert.deepEqual(spec.subarray(-suffix.length), suffix);
      assert.equal(
        hash(checkAppended ? spec.subarray(0, -suffix.length) : spec),
        preflight.reference.originalSpecDigest,
      );
      const exposure = [];
      const providers = [],
        topology = [];
      for (let attempt = 2; attempt <= result.agentAttempts + 1; attempt++) {
        const provider = await json(repo, `${run}/evidence/target-provider-${attempt}.json`);
        const topo = await json(repo, `${run}/evidence/target-topology-${attempt}.json`);
        providers.push(provider);
        topology.push(topo);
        assert.equal(provider.status, "PASSED");
        assert.equal(topo.status, "passed");
        const captureBytes = await safeRead(
          repo,
          `${run}/evidence/attempts/${attempt}/provider-transcript.json`,
        );
        assert.equal(provider.transcriptDigest, `sha256:${hash(captureBytes)}`);
        const capture = JSON.parse(captureBytes.toString());
        assert.ok(
          JSON.stringify(capture.exchanges[0]?.request).includes(
            JSON.stringify(preflight.memory.content).slice(1, -1),
          ),
          "FROZEN_MEMORY_EXPOSURE_MISSING",
        );
        const selector = await json(repo, `${run}/evidence/verification-selector-${attempt}.json`);
        assert.equal(selector.itemsDigest, preflight.memory.itemsDigest);
        if (q.check)
          assert.equal(
            (await json(repo, `${run}/evidence/implementation-check-${attempt}.json`))
              .addendumDigest,
            hash(IMPLEMENTATION_CHECK),
          );
        else
          assert.equal(
            await exists(host(repo, `${run}/evidence/implementation-check-${attempt}.json`)),
            false,
          );
        exposure.push({ attempt, ...implementationExposure(capture) });
      }
      const scopes = [];
      for (const file of await readdir(host(repo, `${run}/evidence`)))
        if (/^target-coverage-scope-\d+\.json$/.test(file)) {
          const scope = await json(repo, `${run}/evidence/${file}`);
          scopes.push(scope);
          assert.equal(scope.status, "passed");
        }
      assert.ok(scopes.length >= 1 || result.stopReason === "BASELINE_VERILATOR_FAILED");
      const selectedAttempt = finalAttempt(result.agentAttempts);
      const selectedSnapshot = `${run}/evidence/verification-assets/attempt-${selectedAttempt}`;
      const selected =
        !(result.agentAttempts === 0 && result.status === "FAILED") &&
        (await exists(host(repo, `${selectedSnapshot}/manifest.json`)))
          ? await verifyManifest(repo, selectedSnapshot)
          : null;
      const item = {
        ...q,
        name,
        run,
        agentAttempts: result.agentAttempts as number,
        selectedAttempt,
        selectedSnapshot: selected === null ? null : selectedSnapshot,
        selectedManifestDigest: selected?.digest ?? null,
        generationStatus:
          result.stopReason === "BASELINE_VERILATOR_FAILED"
            ? "infrastructure-failed"
            : result.status === "FAILED"
              ? "generation-failed"
              : "completed",
        stopReason: result.stopReason as string,
      };
      await writeFile(
        host(repo, `${ROOT}/${name}-audit.json`),
        encode({
          ...item,
          ...preflight.reference,
          childExitCode: childCode,
          providers,
          topology,
          scopes,
          implementationExposure: exposure,
          workflowExposure: q.check
            ? exposure.length > 0 && exposure.every((x) => x.exposed)
            : null,
          recoveryPlan: `${recovery}/recovery-plan.json`,
        }),
        { flag: "wx" },
      );
      completed.push(item);
      await progress(null);
      console.log(
        encode({ phase: "resume-generation-terminal", ...item, count: completed.length }).trim(),
      );
      // Ordinary terminal program failures remain draws in the fixed denominator. Only
      // infrastructure/protected-boundary failure pauses the remaining original queue.
      assert.notEqual(
        item.generationStatus,
        "infrastructure-failed",
        "NEW_INFRASTRUCTURE_FAILURE_STOP",
      );
      assert.notEqual(item.stopReason, "PROTECTED_RTL_MODIFIED", "NEW_BOUNDARY_FAILURE_STOP");
    }
    await frozenPlan(repo);
    assert.equal(hash(await safeRead(repo, recoveryPlanPath)), recoveryPlanDigest);
    assert.equal(
      hash(await safeRead(repo, "tools/mutation/resume-fifo-usage.ts")),
      metadata.recoveryToolDigest,
    );
    assert.equal(completed.length, 12);
    // Preserve all historical evidence bytes, including the original generic classification.
    assert.equal(hash(await safeRead(repo, `${ROOT}/progress.json`)), preflight.progressDigest);
    assert.equal(hash(await safeRead(repo, `${ROOT}/failure.json`)), preflight.failureDigest);
    for (const [file, digest] of Object.entries(preflight.evidenceDigests))
      assert.equal(hash(await safeRead(repo, file)), digest);
    for (const item of completed)
      if (item.selectedSnapshot !== null)
        await verifyManifest(repo, item.selectedSnapshot, item.selectedManifestDigest!);
    await writeFile(
      host(repo, `${ROOT}/generation-complete.json`),
      encode({
        schemaVersion: 1,
        planDigest: PLAN_DIGEST,
        recoveryPlan: { path: recoveryPlanPath, digest: `sha256:${recoveryPlanDigest}` },
        completed,
        finishedAt: new Date().toISOString(),
      }),
      { flag: "wx" },
    );
  } catch (error) {
    await writeFile(
      host(repo, `${recovery}/failure.json`),
      encode({ error: String(error), completed, preserveLock, at: new Date().toISOString() }),
      { flag: "wx" },
    );
    throw error;
  } finally {
    if (!preserveLock) {
      assert.deepEqual(await readFile(host(repo, LOCK)), replacementLock);
      await unlink(host(repo, LOCK));
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  assert.ok(
    process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === "--preflight"),
  );
  if (process.argv[2] === "--preflight") {
    const result = await preflightUsageResume(process.cwd());
    console.log(
      encode({
        status: "passed",
        planDigest: PLAN_DIGEST,
        preservedSamples: result.completed.length,
        remaining: usageQueue().slice(10),
        evidenceDigests: Object.keys(result.evidenceDigests).length,
      }),
    );
  } else await resumeUsageCampaign(process.cwd());
}
