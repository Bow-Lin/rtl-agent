import assert from "node:assert/strict";
import { mkdir, readFile, writeFile, open, unlink, readdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { frozenContext, hash, BUILD } from "./verification-frozen-adapter.ts";

const repo = process.cwd();
const label = process.argv[2];
assert.match(label ?? "", /^[a-z0-9][a-z0-9-]{0,60}$/);
const supersedes = process.argv[3] ?? null;
if (supersedes !== null) assert.match(supersedes, /^[a-z0-9][a-z0-9-]{0,60}$/);
const parent = path.join(repo, ".rtl-agent", "fifo-target-campaigns");
await mkdir(parent, { recursive: true });
const lockPath = path.join(parent, "active.lock");
const lock = await open(lockPath, "wx");
await lock.writeFile(JSON.stringify({ pid: process.pid, label }));
await lock.close();
const root = path.join(parent, label!);
const queue = ["dpretet", "axis"].flatMap((project) => [
  { project, repeat: 1, mode: "off" },
  { project, repeat: 1, mode: "frozen" },
  { project, repeat: 2, mode: "frozen" },
  { project, repeat: 2, mode: "off" },
]);
const completed: unknown[] = [];
const baselineDigests = new Map<string, string>();
let configDigest: string | undefined;
async function child(tool: string, args: string[], log: string) {
  const stdout = await open(path.join(root, `${log}.stdout.log`), "wx");
  const stderr = await open(path.join(root, `${log}.stderr.log`), "wx");
  try {
    return await new Promise<number>((resolve, reject) => {
      const p = spawn(process.execPath, [path.join(repo, "tools", "mutation", tool), ...args], {
        cwd: repo,
        shell: false,
        windowsHide: true,
        stdio: ["ignore", stdout.fd, stderr.fd],
      });
      p.once("error", reject);
      p.once("exit", (code, signal) =>
        signal ? reject(new Error(`CHILD_SIGNAL_${signal}`)) : resolve(code ?? -1),
      );
    });
  } finally {
    await stdout.close();
    await stderr.close();
  }
}
async function walk(dir: string): Promise<string[]> {
  const result: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    assert.ok(!e.isSymbolicLink(), "REDIRECTED_EVIDENCE");
    const p = path.join(dir, e.name);
    if (e.isDirectory()) result.push(...(await walk(p)));
    else result.push(p);
  }
  return result;
}
try {
  await mkdir(root);
  const memory = await frozenContext(repo);
  const suitePath = path.join(repo, "mutation", "fifo-transfer-v2", "manifest.json");
  const suiteDigest = hash(await readFile(suitePath));
  await writeFile(
    path.join(root, "plan.json"),
    JSON.stringify(
      {
        queue,
        boundaryVersion: "target-recovery-v2",
        supersedes,
        replacementReason:
          supersedes === null
            ? null
            : "Prior campaign diagnostics: off configuration drift and frozen incomplete provider turns. All conditions start from original seeds with shared strengthened boundaries.",
        build: BUILD,
        manifestDigest: memory.manifestDigest,
        itemsDigest: memory.itemsDigest,
        suiteDigest,
        selector: "select-all-v1",
        language: "original-Chinese",
        maximumIterations: 3,
        targetUpdates: false,
        authoritative: false,
        startedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    { flag: "wx" },
  );
  for (const q of queue) {
    await frozenContext(repo);
    assert.equal(hash(await readFile(suitePath)), suiteDigest);
    const name = `${label}-${q.project}-r${q.repeat}-${q.mode}`;
    console.log(JSON.stringify({ phase: "coverage-start", name }));
    const code = await child(
      "target-coverage-run.ts",
      [q.project, q.mode, name],
      `${name}-coverage`,
    );
    assert.ok(code === 0 || code === 3, `COVERAGE_CHILD_FAILED_${code}`);
    const execution = JSON.parse(
      await readFile(
        path.join(repo, ".rtl-agent", "fifo-target-runs", name, "execution.json"),
        "utf8",
      ),
    );
    const condition = JSON.parse(
      await readFile(
        path.join(repo, ".rtl-agent", "fifo-target-runs", name, "condition.json"),
        "utf8",
      ),
    );
    const nextConfigDigest = hash(JSON.stringify(condition.configAudit));
    if (configDigest !== undefined)
      assert.equal(nextConfigDigest, configDigest, "MODEL_CONFIG_CHANGED");
    else configDigest = nextConfigDigest;
    const result = execution.result;
    assert.equal(
      condition.boundaryVersion,
      "target-recovery-v2",
      "TARGET_BOUNDARY_VERSION_MISMATCH",
    );
    assert.ok(
      !["AGENT_FAILED", "PROTECTED_RTL_MODIFIED", "BASELINE_VERILATOR_FAILED"].includes(
        result.stopReason,
      ),
      `CAMPAIGN_STOP_${result.stopReason}`,
    );
    const runLogical = result.runDirectory as string;
    assert.ok(runLogical.startsWith(`.rtl-agent/fifo-target-runs/${name}/`));
    const run = path.join(repo, ...runLogical.split("/"));
    const baseline = JSON.parse(
      await readFile(
        path.join(run, "evidence", "verification-assets", "attempt-0", "manifest.json"),
        "utf8",
      ),
    );
    const baselineDigest = hash(JSON.stringify(baseline.entries));
    if (baselineDigests.has(q.project))
      assert.equal(baselineDigest, baselineDigests.get(q.project), "PAIRED_BASELINE_CHANGED");
    else baselineDigests.set(q.project, baselineDigest);
    const files = await walk(path.join(run, "evidence"));
    const scopeAudits = files.filter((f) =>
      /^target-coverage-scope-\d+\.json$/.test(path.basename(f)),
    );
    assert.ok(scopeAudits.length >= 1, "TARGET_BASELINE_SCOPE_AUDIT_MISSING");
    for (const file of scopeAudits)
      assert.equal(
        JSON.parse(await readFile(file, "utf8")).status,
        "passed",
        "TARGET_COVERAGE_SCOPE_CHANGED",
      );
    const providerAudits = files.filter((f) =>
      /^target-provider-\d+\.json$/.test(path.basename(f)),
    );
    const topologyAudits = files.filter((f) =>
      /^target-topology-\d+\.json$/.test(path.basename(f)),
    );
    assert.equal(providerAudits.length, result.agentAttempts, "PROVIDER_AUDIT_COUNT_MISMATCH");
    assert.equal(topologyAudits.length, result.agentAttempts, "TOPOLOGY_AUDIT_COUNT_MISMATCH");
    for (const file of providerAudits)
      assert.equal(
        JSON.parse(await readFile(file, "utf8")).status,
        "PASSED",
        "PROVIDER_AUDIT_FAILED",
      );
    for (const file of topologyAudits)
      assert.equal(
        JSON.parse(await readFile(file, "utf8")).status,
        "passed",
        "TOPOLOGY_AUDIT_FAILED",
      );
    const selectors = files.filter((f) =>
      /^verification-selector-\d+\.json$/.test(path.basename(f)),
    );
    assert.equal(
      selectors.length,
      q.mode === "off" ? 0 : result.agentAttempts,
      "SELECTOR_COUNT_MISMATCH",
    );
    // Actual provider capture is checked, not just the existence of a context file.
    const transcripts = files.filter((f) => path.basename(f) === "provider-transcript.json");
    assert.equal(transcripts.length, result.agentAttempts, "PROVIDER_TRANSCRIPT_COUNT_MISMATCH");
    let injected = 0;
    for (const file of transcripts) {
      const capture = JSON.parse(await readFile(file, "utf8"));
      const request = JSON.stringify(capture.exchanges[0]?.request);
      assert.ok(request, "MISSING_PROVIDER_REQUEST");
      if (request.includes(JSON.stringify(memory.content).slice(1, -1))) injected++;
      if (q.mode === "off")
        assert.ok(!request.includes("Deterministic select-all-v1"), "OFF_MEMORY_LEAK");
    }
    assert.ok(
      q.mode === "off" ? injected === 0 : injected === result.agentAttempts,
      "PROVIDER_MEMORY_EXPOSURE_MISMATCH",
    );
    await writeFile(
      path.join(root, `${name}-audit.json`),
      JSON.stringify(
        {
          ...q,
          baselineDigest,
          selectors: selectors.length,
          providerTranscriptsWithMemory: injected,
          status: result.status,
          stopReason: result.stopReason,
          baselineScore: result.baselineCoverage?.score,
          finalScore: result.finalCoverage?.score,
        },
        null,
        2,
      ),
      { flag: "wx" },
    );
    console.log(
      JSON.stringify({
        phase: "replay-start",
        name,
        baseline: result.baselineCoverage?.score,
        final: result.finalCoverage?.score,
      }),
    );
    assert.equal(
      await child(
        "replay-target.ts",
        [`.rtl-agent/fifo-replays/${name}`, q.project, runLogical],
        `${name}-replay`,
      ),
      0,
      "REPLAY_FAILED",
    );
    completed.push({
      ...q,
      name,
      run: runLogical,
      status: result.status,
      stopReason: result.stopReason,
    });
    await writeFile(
      path.join(root, "progress.json"),
      JSON.stringify({ completed, remaining: queue.length - completed.length }, null, 2),
    );
    console.log(JSON.stringify({ phase: "condition-complete", name, completed: completed.length }));
  }
  await writeFile(
    path.join(root, "complete.json"),
    JSON.stringify({ completed, finishedAt: new Date().toISOString() }, null, 2),
    { flag: "wx" },
  );
} catch (error) {
  await writeFile(
    path.join(root, "failure.json"),
    JSON.stringify({ error: String(error), completed, at: new Date().toISOString() }, null, 2),
    { flag: "wx" },
  ).catch(() => undefined);
  throw error;
} finally {
  await unlink(lockPath);
}
