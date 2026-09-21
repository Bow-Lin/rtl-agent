import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { sha, applyCandidate, patchFor, coveragePoints } from "./fifo-candidates.ts";
import { familyCandidates, logicalPath, validateConfig } from "./family-preparation.ts";
import type { FamilyConfig } from "./family-preparation.ts";

const repo = process.cwd();
const git =
  process.env.GIT_EXE ??
  (process.platform === "win32"
    ? path.join("C:", "Program Files", "Git", "cmd", "git.exe")
    : "git");
const parse = async (p: string) => JSON.parse(await readFile(p, "utf8"));
const exclusive = async (p: string, v: unknown) =>
  writeFile(p, JSON.stringify(v, null, 2) + "\n", { flag: "wx" });
const normalize = (b: Buffer | string) => b.toString().replace(/\r\n?/g, "\n");
const suite = await parse(path.resolve("tools", "mutation", "fixtures", "uart-aes", "suite.json"));
const [mode, arg] = process.argv.slice(2);

function gitRun(cwd: string, args: string[]) {
  const r = spawnSync(git, args, {
    cwd,
    shell: false,
    windowsHide: true,
    encoding: "utf8",
    timeout: 30000,
  });
  assert.equal(r.status, 0, `GIT_FAILED ${args[0]}: ${r.stderr}`);
  assert.equal(r.error, undefined);
  return r.stdout;
}
async function writeBound(root: string, file: string, bytes: Buffer | string) {
  const p = logicalPath(root, file);
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, bytes, { flag: "wx" });
}
async function verifyPreparation(logical: string) {
  const root = logicalPath(repo, logical),
    m = await parse(path.join(root, "manifest.json"));
  const c = m.config as FamilyConfig;
  validateConfig(c);
  const originals = new Map<string, Buffer>();
  for (const [file, hash] of Object.entries(c.files)) {
    const bytes = await readFile(logicalPath(logicalPath(repo, c.root), file));
    assert.equal(sha(bytes), hash);
    originals.set(file, bytes);
    assert.equal(sha(await readFile(logicalPath(path.join(root, "golden"), file))), hash);
  }
  assert.equal(sha(await readFile(logicalPath(repo, c.tb))), m.tbDigest);
  assert.equal(sha(await readFile(path.join(root, "golden", "tb.sv"))), m.tbDigest);
  const all = familyCandidates(c, originals);
  assert.equal(all.length, m.candidates);
  assert.equal(m.mutants.length, m.selected);
  assert.equal(m.shortfall, 30 - m.selected);
  const seen = new Set<string>();
  for (const mutant of m.mutants) {
    const candidate = all[mutant.candidate - 1];
    assert.ok(candidate);
    for (const key of ["file", "line", "column", "before", "after", "operator", "rank"] as const)
      assert.equal(mutant[key], candidate[key]);
    const mutated = applyCandidate(originals.get(candidate.file)!.toString(), candidate);
    assert.equal(sha(mutated), mutant.mutatedDigest);
    assert.ok(!seen.has(mutant.mutatedDigest));
    seen.add(mutant.mutatedDigest);
    const patch = await readFile(path.join(root, "mutants", `${mutant.id}.patch`), "utf8");
    assert.equal(patch, patchFor(candidate.file, candidate));
    assert.equal(sha(patch), mutant.patchDigest);
    const workspace = path.join(root, `candidate-${String(mutant.candidate).padStart(3, "0")}`);
    for (const [file, hash] of Object.entries(c.files))
      assert.equal(
        sha(await readFile(logicalPath(workspace, file))),
        file === candidate.file ? mutant.mutatedDigest : hash,
      );
    assert.equal(sha(await readFile(path.join(workspace, "tb.sv"))), m.tbDigest);
    for (const label of ["compile", "verilator-lint"]) {
      const result = await parse(path.join(workspace, `${label}.json`));
      assert.equal(result.exitCode, 0);
      assert.equal(result.error, null);
    }
  }
  for (const label of ["compile", "simulation"]) {
    const result = await parse(path.join(root, "golden", `${label}.json`));
    assert.equal(result.exitCode, 0);
    assert.equal(result.error, null);
    if (label === "simulation") assert.ok(result.stdout.includes("IP_PREPARATION_PASS"));
  }
  return { root, m, c, originals };
}

if (mode === "audit-prepared" && arg) {
  const audit = logicalPath(repo, arg);
  await mkdir(audit);
  const results = [];
  for (const ip of suite.ips) {
    const { root, m, c, originals } = await verifyPreparation(ip.preparation);
    // Actual patch application in a fresh isolated Git root. Checking only exit status
    // inside the parent repository can silently skip patches outside its current prefix.
    const scratch = path.join(audit, ip.id);
    await mkdir(scratch);
    gitRun(scratch, ["init", "--quiet"]);
    for (const [file, bytes] of originals) await writeBound(scratch, file, normalize(bytes));
    const patches = [];
    for (const mutant of m.mutants) {
      const patch = path.join(root, "mutants", `${mutant.id}.patch`);
      gitRun(scratch, ["apply", "--check", "--unidiff-zero", "--ignore-space-change", patch]);
      gitRun(scratch, ["apply", "--unidiff-zero", "--ignore-space-change", patch]);
      const applied = await readFile(logicalPath(scratch, mutant.file));
      assert.equal(
        normalize(applied),
        normalize(applyCandidate(originals.get(mutant.file)!.toString(), mutant)),
      );
      await writeFile(logicalPath(scratch, mutant.file), normalize(originals.get(mutant.file)!));
      patches.push({
        id: mutant.id,
        patchDigest: mutant.patchDigest,
        applyCheck: true,
        actualApply: true,
        normalizedMutantDigest: sha(normalize(applied)),
      });
    }
    for (const [file, bytes] of originals)
      assert.equal(normalize(await readFile(logicalPath(scratch, file))), normalize(bytes));
    await exclusive(path.join(scratch, "audit.json"), { id: c.id, patches, sourceUnchanged: true });
    results.push({ id: c.id, mutants: m.selected, sourceUnchanged: true, deterministic: true });
  }
  await exclusive(path.join(audit, "summary.json"), { results });
  process.stdout.write(JSON.stringify({ audited: results }) + "\n");
} else if (mode === "publish" && arg) {
  const root = logicalPath(repo, arg);
  await mkdir(root);
  const auditRoot = logicalPath(repo, ".rtl-agent/family-patch-audits/uart-aes-v1");
  const reviewed = await parse(
    path.resolve("tools", "mutation", "fixtures", "uart-aes", "static-review.json"),
  );
  const indexes = [];
  for (const family of ["uart", "aes"]) {
    const familyRoot = path.join(root, family);
    await mkdir(familyRoot);
    const ips = [];
    for (const ip of suite.ips.filter((item: { family: string }) => item.family === family)) {
      const { root: prep, m, c, originals } = await verifyPreparation(ip.preparation);
      assert.equal(c.family, family);
      assert.equal(c.id, ip.id);
      const review = reviewed.ips.find((item: { id: string }) => item.id === c.id);
      assert.ok(review);
      assert.deepEqual(
        review.patchDigests,
        m.mutants.map((item: { patchDigest: string }) => item.patchDigest),
      );
      const audit = await parse(path.join(auditRoot, c.id, "audit.json"));
      assert.deepEqual(
        audit.patches.map((p: { patchDigest: string }) => p.patchDigest),
        review.patchDigests,
      );
      const coverage = await parse(path.join(prep, "coverage-summary.json"));
      assert.equal(coverage.compile, true);
      assert.equal(coverage.simulation, true);
      const rawCoverage = await readFile(path.join(prep, "golden", "verilator", "coverage.dat"));
      assert.equal(sha(rawCoverage), coverage.coverageRawDigest);
      assert.deepEqual(coverage.points, coveragePoints(rawCoverage.toString(), c.units));
      for (const file of ["verilator-compile.json", path.join("verilator", "simulation.json")]) {
        const execution = await parse(path.join(prep, "golden", file));
        assert.equal(execution.exitCode, 0);
        assert.equal(execution.error, null);
        assert.equal(execution.signal, null);
        assert.notEqual(execution.cleanupConfirmed, false);
        if (file !== "verilator-compile.json")
          assert.ok(execution.stdout.includes("IP_PREPARATION_PASS"));
      }
      const frontend = await parse(path.join(prep, "frontend-summary.json"));
      assert.equal(frontend.passed, m.selected);
      const dest = path.join(familyRoot, c.id);
      await mkdir(dest);
      const publicationHashes: Record<string, string> = {};
      for (const [file, bytes] of originals) {
        const canonical = normalize(bytes);
        publicationHashes[file] = sha(canonical);
        await writeBound(dest, path.posix.join("golden-source", file), canonical);
      }
      await writeBound(dest, "golden-tb.sv", await readFile(logicalPath(repo, c.tb)));
      for (const item of m.mutants)
        await writeBound(
          dest,
          path.posix.join("mutants", `${item.id}.patch`),
          await readFile(path.join(prep, "mutants", `${item.id}.patch`)),
        );
      for (const file of ["selection.json", "coverage-summary.json", "frontend-summary.json"])
        await writeBound(dest, file, await readFile(path.join(prep, file)));
      const licenses = [];
      for (const file of c.licenseEvidence) {
        const bytes = await readFile(logicalPath(logicalPath(repo, c.root), file));
        const destFile = path.posix.join("license-evidence", file);
        await writeBound(dest, destFile, bytes);
        licenses.push({ path: destFile, digest: sha(bytes) });
      }
      await writeBound(
        dest,
        "spec.md",
        `# ${c.id}\n\n${c.specification}\n\n${c.ancestry}\n\nRole: unassigned. This is a bounded seed baseline, not exhaustive protocol or cryptographic verification.\n`,
      );
      await writeBound(dest, "static-review.json", JSON.stringify(review, null, 2) + "\n");
      await writeBound(dest, "patch-audit.json", JSON.stringify(audit, null, 2) + "\n");
      const provenance = {
        reference: c.reference,
        revision: c.revision,
        license: c.license,
        licenseFiles: licenses,
        metadataReference:
          c.id === "uart2bus-uart"
            ? "https://opencores.org/projects/uart2bus"
            : c.id === "aes-pipeline"
              ? "https://opencores.org/projects/aes-128_pipelined_encryption"
              : null,
        note: "Source headers preserved verbatim; project-only license metadata does not establish an exact license variant/version",
        ancestry: c.ancestry,
      };
      await writeBound(dest, "provenance.json", JSON.stringify(provenance, null, 2) + "\n");
      const published = {
        ...m,
        upstreamSourceHashes: m.sourceHashes,
        sourceHashes: publicationHashes,
        sourceNormalization:
          "LF publication per .gitattributes; exact upstream hashes retained separately; no RTL token changes",
        preparationRoot: ip.preparation,
        staticReview:
          "completed; known fixed-configuration non-observable sites excluded; non-equivalence not proven",
        licenses,
        scope:
          "Preparation only, evaluator-owned golden TB/mutants; roles unassigned; no Memory or model calls",
        mutants: m.mutants.map((mutant: Record<string, unknown>) => ({
          ...mutant,
          upstreamMutatedDigest: mutant.mutatedDigest,
          mutatedDigest: audit.patches.find((patch: { id: string }) => patch.id === mutant.id)
            .normalizedMutantDigest,
          staticReview: review.findings,
          equivalence: "human/formal confirmation pending",
        })),
        artifactDigests: Object.fromEntries(
          await Promise.all(
            [
              "selection.json",
              "coverage-summary.json",
              "frontend-summary.json",
              "spec.md",
              "static-review.json",
              "patch-audit.json",
              "provenance.json",
            ].map(async (file) => [file, sha(await readFile(path.join(dest, file)))]),
          ),
        ),
      };
      await exclusive(path.join(dest, "manifest.json"), published);
      ips.push({
        id: c.id,
        family,
        role: "unassigned",
        manifest: path.posix.join(c.id, "manifest.json"),
        manifestDigest: sha(await readFile(path.join(dest, "manifest.json"))),
        mutants: m.selected,
        shortfall: m.shortfall,
        coverage: coverage.points,
      });
    }
    const reused = [];
    for (const item of suite.reused.filter((item: { family: string }) => item.family === family)) {
      const manifestPath = path.posix.join(item.baseline, item.baselineManifest);
      const bytes = await readFile(logicalPath(repo, manifestPath));
      const original = JSON.parse(bytes.toString());
      for (const entry of original.entries)
        assert.equal(
          `sha256:${sha(await readFile(logicalPath(logicalPath(repo, item.baseline), entry.path)))}`,
          entry.contentDigest,
        );
      reused.push({
        ...item,
        baselineManifestSha256: sha(bytes),
        role: "unassigned",
        kind: "existing-baseline-reference",
      });
    }
    await exclusive(path.join(familyRoot, "manifest.json"), {
      version: `${family}-transfer-v1`,
      seed: 42,
      modelCalls: false,
      ips,
      reused,
      total: ips.reduce((n, ip) => n + ip.mutants, 0),
      requested: ips.length * 30,
      shortfall: ips.reduce((n, ip) => n + ip.shortfall, 0),
      sources: [],
      targets: [],
      sourceTargetAssignment: "pending",
      equivalence: "pending human/formal review",
      killReplay: "not-run",
    });
    indexes.push({
      family,
      manifest: path.posix.join(family, "manifest.json"),
      manifestDigest: sha(await readFile(path.join(familyRoot, "manifest.json"))),
    });
  }
  await exclusive(path.join(root, "manifest.json"), {
    version: "uart-aes-transfer-v1",
    families: indexes,
    newImplementations: 7,
    reusedImplementations: 1,
    modelCalls: false,
  });
  process.stdout.write(JSON.stringify({ publication: arg, families: indexes }) + "\n");
} else if (mode === "audit-published" && arg) {
  const root = logicalPath(repo, arg),
    index = await parse(path.join(root, "manifest.json"));
  let count = 0,
    ips = 0;
  for (const family of index.families) {
    const bytes = await readFile(logicalPath(root, family.manifest));
    assert.equal(sha(bytes), family.manifestDigest);
    const suite = JSON.parse(bytes.toString()),
      familyRoot = path.dirname(logicalPath(root, family.manifest));
    for (const ip of suite.ips) {
      const manifestBytes = await readFile(logicalPath(familyRoot, ip.manifest));
      assert.equal(sha(manifestBytes), ip.manifestDigest);
      const m = JSON.parse(manifestBytes.toString()),
        dir = path.dirname(logicalPath(familyRoot, ip.manifest));
      for (const [file, hash] of Object.entries(m.sourceHashes))
        assert.equal(sha(await readFile(logicalPath(path.join(dir, "golden-source"), file))), hash);
      assert.equal(sha(await readFile(path.join(dir, "golden-tb.sv"))), m.tbDigest);
      for (const mutant of m.mutants) {
        assert.equal(
          sha(await readFile(path.join(dir, "mutants", `${mutant.id}.patch`))),
          mutant.patchDigest,
        );
        count++;
      }
      for (const license of m.licenses)
        assert.equal(sha(await readFile(logicalPath(dir, license.path))), license.digest);
      for (const [file, hash] of Object.entries(m.artifactDigests))
        assert.equal(sha(await readFile(logicalPath(dir, file))), hash);
      assert.equal(m.selected, m.mutants.length);
      ips++;
    }
  }
  process.stdout.write(JSON.stringify({ ips, mutants: count, hashes: "pass" }) + "\n");
} else
  throw new Error(
    "Usage: family-publication.ts audit-prepared unique-audit-root | publish exclusive-publication-root | audit-published publication-root",
  );
