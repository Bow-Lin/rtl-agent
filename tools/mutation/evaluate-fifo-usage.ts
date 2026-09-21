import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { recordedProcess } from "./family-process.ts";

// Evaluator-only development diagnosis. Nothing in this module is passed to an Agent.
const digest = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const normalized = (value: Buffer) => value.toString("utf8").replace(/\r\n?/g, "\n");
const runPattern =
  /^\.rtl-agent\/fifo-target-runs\/([a-z0-9][a-z0-9-]{0,100})\/dpretet-depth8-width8\/run_[a-z0-9-]+$/;
const sourcePaths = [
  "rtl/async_fifo.v",
  "rtl/fifomem.v",
  "rtl/rptr_empty.v",
  "rtl/wptr_full.v",
  "rtl/sync_r2w.v",
  "rtl/sync_w2r.v",
] as const;
const verificationPaths = ["rtl/dut/top_wrapper.sv", "rtl/checker.sv", "rtl/tb.sv"];

export interface UsageSelection {
  group: "A" | "B" | "C" | "D";
  repeat: number;
  name: string;
  run: string | null;
  agentAttempts: number;
  selectedAttempt: number;
  selectedSnapshot: string | null;
  selectedManifestDigest: string | null;
  generationStatus: string;
  stopReason: string | null;
}

export interface GenerationComplete {
  schemaVersion: 1;
  planDigest: string;
  completed: UsageSelection[];
  finishedAt: string;
}

function hexDigest(value: unknown): string {
  assert.equal(typeof value, "string", "MISSING_DIGEST");
  assert.match(value as string, /^(?:sha256:)?[a-f0-9]{64}$/, "INVALID_DIGEST");
  return (value as string).replace(/^sha256:/, "");
}

export function validateGenerationComplete(value: unknown, planBytes: Buffer): GenerationComplete {
  assert.ok(value && typeof value === "object", "INVALID_GENERATION_SEAL");
  const seal = value as GenerationComplete;
  assert.equal(seal.schemaVersion, 1);
  assert.equal(hexDigest(seal.planDigest), digest(planBytes), "PLAN_DIGEST_MISMATCH");
  assert.ok(Array.isArray(seal.completed) && seal.completed.length === 12, "ALL_12_REQUIRED");
  assert.ok(typeof seal.finishedAt === "string" && Number.isFinite(Date.parse(seal.finishedAt)));
  const pairs = new Set<string>();
  const names = new Set<string>();
  const runs = new Set<string>();
  for (const item of seal.completed) {
    assert.ok(["A", "B", "C", "D"].includes(item.group), "INVALID_GROUP");
    assert.ok([1, 2, 3].includes(item.repeat), "INVALID_REPEAT");
    const key = `${item.group}-${item.repeat}`;
    assert.ok(!pairs.has(key), "DUPLICATE_GROUP_REPEAT");
    pairs.add(key);
    assert.match(item.name, /^[a-z0-9][a-z0-9-]{0,100}$/);
    assert.ok(!names.has(item.name), "DUPLICATE_NAME");
    names.add(item.name);
    assert.ok(
      Number.isInteger(item.agentAttempts) && item.agentAttempts >= 0 && item.agentAttempts <= 3,
    );
    assert.equal(
      item.selectedAttempt,
      item.agentAttempts > 0 ? item.agentAttempts + 1 : 0,
      "FINAL_SELECTION_REQUIRED",
    );
    assert.ok(
      ["completed", "generation-failed", "infrastructure-failed"].includes(item.generationStatus),
      "NONTERMINAL_GENERATION",
    );
    assert.ok(item.stopReason === null || typeof item.stopReason === "string");
    if (item.run === null) {
      assert.equal(item.selectedSnapshot, null, "SNAPSHOT_WITHOUT_RUN");
    } else {
      const match = item.run.match(runPattern);
      assert.ok(match, "INVALID_RUN_PATH");
      assert.equal(match[1], item.name, "RUN_NAME_MISMATCH");
      assert.ok(!runs.has(item.run), "DUPLICATE_RUN");
      runs.add(item.run);
    }
    if (item.selectedSnapshot === null) {
      assert.equal(item.selectedManifestDigest, null, "DIGEST_WITHOUT_SNAPSHOT");
    } else {
      assert.equal(
        item.selectedSnapshot,
        `${item.run}/evidence/verification-assets/attempt-${item.selectedAttempt}`,
        "FINAL_SNAPSHOT_PATH_REQUIRED",
      );
      hexDigest(item.selectedManifestDigest);
    }
  }
  assert.equal(pairs.size, 12);
  return seal;
}

async function protectedRead(repo: string, logical: string): Promise<Buffer> {
  assert.ok(!logical.includes("\\") && !logical.includes(":"), "INVALID_LOGICAL_PATH");
  assert.ok(
    !path.posix.isAbsolute(logical) &&
      logical.split("/").every((p) => p !== ".." && p !== "." && p !== ""),
    "INVALID_LOGICAL_PATH",
  );
  const file = path.join(repo, ...logical.split("/"));
  assert.equal(await realpath(file), file, "REDIRECTED_INPUT");
  assert.ok((await lstat(file)).isFile(), "NONFILE_INPUT");
  return readFile(file);
}

export function usageCompileArguments(windows: boolean): string[] {
  return [
    "--binary",
    "--assert",
    "--timing",
    "-Wno-fatal",
    "--top-module",
    "tb",
    "--Mdir",
    "build",
    "-o",
    windows ? "sim.exe" : "sim",
    ...(windows ? ["-CFLAGS", "-D_GLIBCXX_USE_CXX11_ABI=0"] : []),
    "-Irtl",
    ...sourcePaths,
    ...verificationPaths,
  ];
}

export function rawSimulationVerdict(
  result: {
    exitCode: number | null;
    error: string | null;
    stdout: string;
    stderr: string;
  },
  golden: boolean,
): string {
  if (result.error) return result.error.includes("TIMEOUT") ? "timeout" : "infrastructure-error";
  if (result.exitCode !== 0) {
    const output = result.stdout + result.stderr;
    if (/\b(?:TIMEOUT|WATCHDOG(?:_TIMEOUT)?)\b/i.test(output)) return "timeout";
    if (/Assertion failed|\$fatal|%Error:.*Assertion/i.test(output))
      return golden ? "golden-invalid" : "killed";
    return "program-error";
  }
  return result.stdout.includes("DPRETET_GOLDEN_PASS") ? "survived" : "output-invalid";
}

export function semanticReviewTemplate(
  item: UsageSelection,
  goldenPassed: boolean | null,
  rawM010Verdict: string | null,
) {
  return {
    group: item.group,
    repeat: item.repeat,
    name: item.name,
    generationStatus: item.generationStatus,
    selectedSnapshot: item.selectedSnapshot,
    goldenPassed,
    rawM010Verdict,
    state: "pending-human-semantic-review",
    semanticStatus: "unreviewed",
    executionStatus: "unconfirmed",
    primaryStatus: "unconfirmed",
    checkCodeReferences: [],
    correctnessAuthority: [],
    samplingWindowEvidence: [],
    actualExecutionEvidence: [],
    unsupportedAssertions: [],
    explanation:
      "Raw outcomes do not establish semantic validity or executed adoption. Missing execution evidence is unconfirmed adoption, not infrastructure failure.",
  };
}

interface SnapshotEntry {
  path: string;
  byteLength: number;
  contentDigest: string;
}
interface Mutant {
  id: string;
  file: string;
  line: number;
  originalLine: string;
  mutatedLine: string;
  mutatedDigest: string;
  patchDigest: string;
}

export async function prepareUsageEvaluation(repo: string, label: string) {
  assert.match(label, /^[a-z0-9][a-z0-9-]{0,60}$/);
  const campaign = `.rtl-agent/fifo-usage-campaigns/${label}`;
  const planBytes = await protectedRead(repo, `${campaign}/plan.json`);
  const sealBytes = await protectedRead(repo, `${campaign}/generation-complete.json`);
  const seal = validateGenerationComplete(JSON.parse(sealBytes.toString()), planBytes);
  const plan = JSON.parse(planBytes.toString()) as { suiteDigest: string };
  const suiteBytes = await protectedRead(repo, "mutation/fifo-transfer-v2/manifest.json");
  assert.equal(digest(suiteBytes), hexDigest(plan.suiteDigest), "SUITE_CHANGED");
  const publication = "mutation/fifo-transfer-v2/dpretet";
  const manifestBytes = await protectedRead(repo, `${publication}/manifest.json`);
  const suite = JSON.parse(suiteBytes.toString()) as {
    ips: { id: string; manifestDigest: string }[];
  };
  assert.equal(
    digest(manifestBytes),
    hexDigest(suite.ips.find((ip) => ip.id === "dpretet")?.manifestDigest),
  );
  const manifest = JSON.parse(manifestBytes.toString()) as {
    sourceHashes: Record<string, string>;
    mutants: Mutant[];
  };
  const mutant = manifest.mutants.find((m) => m.id === "M010");
  assert.ok(mutant, "M010_MISSING");
  assert.equal(mutant.file, "rtl/wptr_full.v");
  assert.match(mutant.originalLine, /wfull\s*<=\s*1'b0/);
  assert.match(mutant.mutatedLine, /wfull\s*<=\s*1'b1/);
  const patch = await protectedRead(repo, `${publication}/mutants/M010.patch`);
  assert.equal(digest(patch), hexDigest(mutant.patchDigest), "PATCH_CHANGED");
  assert.deepEqual(
    Object.keys(manifest.sourceHashes).sort(),
    [...sourcePaths].sort(),
    "SOURCE_SET_CHANGED",
  );
  const sources = new Map<string, Buffer>();
  for (const file of sourcePaths) {
    const bytes = await protectedRead(repo, `${publication}/golden-source/${file}`);
    assert.equal(digest(bytes), hexDigest(manifest.sourceHashes[file]), "SOURCE_CHANGED");
    sources.set(file, bytes);
  }
  const selections = [];
  for (const item of seal.completed) {
    if (item.selectedSnapshot === null) {
      selections.push({ item, assets: null });
      continue;
    }
    const snapshotBytes = await protectedRead(repo, `${item.selectedSnapshot}/manifest.json`);
    assert.equal(
      digest(snapshotBytes),
      hexDigest(item.selectedManifestDigest),
      "SELECTED_MANIFEST_CHANGED",
    );
    const snapshot = JSON.parse(snapshotBytes.toString()) as {
      attempt: number;
      entries: SnapshotEntry[];
    };
    assert.equal(snapshot.attempt, item.selectedAttempt, "SELECTED_ATTEMPT_MISMATCH");
    const expectedPaths = [
      ...sourcePaths.map((file) => file.replace("rtl/", "rtl/dut/")),
      ...verificationPaths,
    ].sort();
    assert.deepEqual(
      snapshot.entries.map((entry) => entry.path).sort(),
      expectedPaths,
      "SNAPSHOT_FILE_SET_CHANGED",
    );
    const assets = new Map(sources);
    for (const entry of snapshot.entries) {
      const bytes = await protectedRead(repo, `${item.selectedSnapshot}/${entry.path}`);
      assert.equal(digest(bytes), hexDigest(entry.contentDigest), "SNAPSHOT_CONTENT_CHANGED");
      assert.equal(bytes.length, entry.byteLength, "SNAPSHOT_LENGTH_CHANGED");
      if (verificationPaths.includes(entry.path)) assets.set(entry.path, bytes);
      else {
        const original = sources.get(entry.path.replace("rtl/dut/", "rtl/"));
        assert.ok(original);
        assert.equal(normalized(bytes), normalized(original), "PROTECTED_DUT_CHANGED");
      }
    }
    selections.push({ item, assets });
  }
  return {
    seal,
    planDigest: digest(planBytes),
    sealDigest: digest(sealBytes),
    suiteDigest: digest(suiteBytes),
    manifestDigest: digest(manifestBytes),
    mutant,
    patch,
    selections,
  };
}

export async function evaluateUsage(repoInput: string, label: string) {
  const repo = await realpath(repoInput);
  const prepared = await prepareUsageEvaluation(repo, label);
  for (const file of [
    ".rtl-agent/fifo-target-campaigns/active.lock",
    ".rtl-agent/family-process-active.json",
    ".rtl-agent/family-preparation.pause.json",
  ]) {
    await lstat(path.join(repo, ...file.split("/"))).then(
      () => {
        throw new Error(`RTL_NOT_IDLE:${file}`);
      },
      (error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error;
      },
    );
  }
  const logical = (file: string) => path.relative(repo, file).split(path.sep).join("/");
  const root = path.join(repo, ".rtl-agent", "fifo-usage-evaluations", label);
  await mkdir(path.dirname(root), { recursive: true });
  assert.equal(await realpath(path.dirname(root)), path.dirname(root), "REDIRECTED_OUTPUT_PARENT");
  await mkdir(root); // Exclusive; failed or partial evaluations are never overwritten.
  assert.equal(await realpath(root), root, "REDIRECTED_OUTPUT");
  const json = async (file: string, value: unknown) =>
    writeFile(path.join(root, file), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
  const windows = process.platform === "win32";
  const env = { ...process.env };
  if (windows) {
    env.PATH = [
      path.win32.join("C:\\", "msys64", "ucrt64", "bin"),
      path.win32.join("C:\\", "msys64", "usr", "bin"),
      env.PATH ?? "",
    ].join(path.delimiter);
    env.VERILATOR_ROOT = path.win32.join("C:\\", "msys64", "ucrt64", "share", "verilator");
  }
  const verilator = windows
    ? path.win32.join("C:\\", "msys64", "ucrt64", "bin", "verilator_bin.exe")
    : "verilator";
  const git = windows ? path.win32.join("C:\\", "Program Files", "Git", "cmd", "git.exe") : "git";
  const compileArgs = usageCompileArguments(windows);
  await json("plan.json", {
    kind: "fixed-v1-usage-development-diagnostic-final-only",
    authoritative: false,
    blindTransferEvidence: false,
    platform: process.platform,
    modelCalls: 0,
    campaign: `.rtl-agent/fifo-usage-campaigns/${label}`,
    generationFinishedAt: prepared.seal.finishedAt,
    generationPlanDigest: prepared.planDigest,
    generationSealDigest: prepared.sealDigest,
    suiteDigest: prepared.suiteDigest,
    targetManifestDigest: prepared.manifestDigest,
    patchDigest: digest(prepared.patch),
    compileArguments: compileArgs,
    selected: prepared.seal.completed,
    semanticPolicy:
      "Manual code/window/correctness-authority review plus actual execution evidence and unmodified golden pass. Raw M010 kill alone, especially post-release FULL_AND_EMPTY, is insufficient. No missing assertion may be added during evaluation.",
    startedAt: new Date().toISOString(),
  });
  const results: {
    selection: UsageSelection;
    status: string;
    directory: string | null;
    raw: { id: string; verdict: string; directory: string }[];
    goldenPassed: boolean | null;
    rawM010KillWithGoldenPass: boolean;
  }[] = [];
  const review = [];
  try {
    const version = await recordedProcess({
      repo,
      cwd: root,
      executable: verilator,
      args: ["--version"],
      label: "tool-version",
      env,
      timeoutMs: 10000,
    });
    assert.equal(version.exitCode, 0, "TOOL_VERSION_FAILED");
    for (const { item, assets } of prepared.selections) {
      if (assets === null) {
        results.push({
          selection: item,
          status: "selected-final-unavailable",
          directory: null,
          raw: [],
          goldenPassed: null,
          rawM010KillWithGoldenPass: false,
        });
        review.push(semanticReviewTemplate(item, null, null));
        continue;
      }
      const sample = path.join(root, `${item.group.toLowerCase()}-r${item.repeat}`);
      await mkdir(sample);
      await writeFile(
        path.join(sample, "assets.json"),
        JSON.stringify(
          [...assets].map(([file, bytes]) => ({ path: file, sha256: digest(bytes) })),
          null,
          2,
        ) + "\n",
        { flag: "wx" },
      );
      const raw = [];
      for (const id of ["golden", "M010"] as const) {
        const work = path.join(sample, id);
        await mkdir(work);
        for (const [file, bytes] of assets) {
          const dest = path.join(work, ...file.split("/"));
          await mkdir(path.dirname(dest), { recursive: true });
          await writeFile(dest, bytes, { flag: "wx" });
        }
        const command = (executable: string, args: string[], label: string, timeoutMs: number) =>
          recordedProcess({ repo, cwd: work, executable, args, label, env, timeoutMs });
        if (id === "M010") {
          await writeFile(path.join(work, "mutant.patch"), prepared.patch, { flag: "wx" });
          const applied = await command(
            git,
            ["apply", "--unidiff-zero", "--ignore-space-change", "mutant.patch"],
            "apply",
            10000,
          );
          assert.equal(applied.exitCode, 0, "PATCH_APPLY_FAILED");
          const m = prepared.mutant;
          const lines: string[] = assets.get(m.file)!.toString().split("\n");
          assert.equal(lines[m.line - 1], m.originalLine);
          lines[m.line - 1] = m.mutatedLine;
          const expected = Buffer.from(lines.join("\n"));
          assert.equal(digest(expected), hexDigest(m.mutatedDigest));
          const actual = await readFile(path.join(work, ...m.file.split("/")));
          assert.equal(normalized(actual), normalized(expected), "APPLIED_MUTANT_CHANGED");
          await writeFile(
            path.join(work, "digest-audit.json"),
            JSON.stringify(
              {
                published: digest(expected),
                applied: digest(actual),
                normalized: digest(normalized(actual)),
                normalizationOnly: true,
              },
              null,
              2,
            ) + "\n",
            { flag: "wx" },
          );
        }
        const compile = await command(verilator, compileArgs, "compile", 180000);
        let verdict = "compile-invalid";
        if (compile.exitCode === 0) {
          const simulation = await command(
            path.join(work, "build", windows ? "sim.exe" : "sim"),
            [],
            "simulation",
            30000,
          );
          verdict = rawSimulationVerdict(simulation, id === "golden");
        }
        const result = { id, verdict, directory: logical(work) };
        raw.push(result);
        await writeFile(path.join(work, "result.json"), JSON.stringify(result, null, 2) + "\n", {
          flag: "wx",
        });
        console.log(JSON.stringify({ group: item.group, repeat: item.repeat, ...result }));
      }
      const goldenPassed = raw[0]!.verdict === "survived";
      const rawM010Verdict = raw[1]!.verdict;
      const result = {
        selection: item,
        status: "raw-replay-complete",
        directory: logical(sample),
        raw,
        goldenPassed,
        rawM010KillWithGoldenPass: goldenPassed && rawM010Verdict === "killed",
      };
      results.push(result);
      review.push(semanticReviewTemplate(item, goldenPassed, rawM010Verdict));
      await writeFile(path.join(sample, "summary.json"), JSON.stringify(result, null, 2) + "\n", {
        flag: "wx",
      });
    }
    // Re-read every sealed snapshot and publication before publishing a completed evaluation.
    const after = await prepareUsageEvaluation(repo, label);
    assert.equal(after.sealDigest, prepared.sealDigest, "GENERATION_SEAL_CHANGED");
    assert.equal(after.planDigest, prepared.planDigest, "GENERATION_PLAN_CHANGED");
    assert.equal(after.suiteDigest, prepared.suiteDigest, "SUITE_CHANGED_DURING_REPLAY");
    await json("semantic-review-template.json", {
      rubricVersion: "reset-effective-window-v1",
      automatedSemanticAcceptance: false,
      primaryDenominatorPerGroup: 3,
      samples: review,
    });
    await json("summary.json", {
      completed: true,
      authoritative: false,
      blindTransferEvidence: false,
      modelCalls: 0,
      platform: process.platform,
      generationSealDigest: prepared.sealDigest,
      semanticReviewCompleted: false,
      primaryDenominatorPerGroup: 3,
      results,
      finishedAt: new Date().toISOString(),
    });
  } catch (error) {
    await json("failure.json", {
      error: String(error),
      completed: results,
      finishedAt: new Date().toISOString(),
    });
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  assert.equal(process.argv.length, 3, "USAGE: node evaluate-fifo-usage.ts <campaign-label>");
  await evaluateUsage(process.cwd(), process.argv[2]!);
}
