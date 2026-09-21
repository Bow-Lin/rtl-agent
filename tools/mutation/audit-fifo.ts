import { readFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { candidates, applyCandidate, patchFor, sha } from "./fifo-candidates.ts";
import type { Candidate } from "./fifo-candidates.ts";

for (const arg of process.argv.slice(2)) {
  const root = path.resolve(arg);
  const m = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
  const source = await readFile(path.resolve(m.config.root, m.config.dut), "utf8");
  const regenerated: (Candidate & { file: string })[] = [];
  for (const [file, ranges] of Object.entries(
    m.config.mutationFiles ?? { [m.config.dut]: m.config.ranges },
  )) {
    const s = await readFile(path.resolve(m.config.root, file), "utf8");
    regenerated.push(
      ...candidates(s, ranges as [number, number][], m.seed, m.config.policyVersion === 2)
        .filter(
          (c) =>
            !(m.config.excludedMutations ?? []).some(
              (e: { file?: string; line: number; operator: string; before?: string }) =>
                (!e.file || e.file === file) &&
                e.line === c.line &&
                e.operator === c.operator &&
                (!e.before || e.before === c.before),
            ),
        )
        .map((c) => ({ ...c, file })),
    );
  }
  if (m.config.mutationFiles)
    regenerated.sort((a, b) => a.rank.localeCompare(b.rank) || a.file.localeCompare(b.file));
  assert.equal(regenerated.length, m.candidates);
  const seen = new Set<string>();
  for (const mutant of m.mutants) {
    const c = regenerated[mutant.candidate - 1]!;
    const mutantSource: string =
      c.file === m.config.dut
        ? source
        : await readFile(path.resolve(m.config.root, c.file), "utf8");
    assert.equal(sha(applyCandidate(mutantSource, c)), mutant.mutatedDigest);
    const patch = await readFile(path.join(root, "mutants", `${mutant.id}.patch`), "utf8");
    assert.equal(patch, patchFor(c.file, c));
    assert.equal(sha(patch), mutant.patchDigest);
    assert.ok(!seen.has(mutant.mutatedDigest));
    seen.add(mutant.mutatedDigest);
    const candidateRoot = path.join(root, `candidate-${String(mutant.candidate).padStart(3, "0")}`);
    assert.equal(sha(await readFile(path.join(candidateRoot, c.file))), mutant.mutatedDigest);
    const compile = JSON.parse(await readFile(path.join(candidateRoot, "compile.json"), "utf8"));
    assert.equal(compile.exitCode, 0);
    assert.equal(compile.error, null);
  }
  for (const [file, digest] of Object.entries(m.sourceHashes)) {
    assert.equal(sha(await readFile(path.resolve(m.config.root, file))), digest);
  }
  assert.equal(sha(await readFile(path.resolve(m.config.tb))), m.tbDigest);
  process.stdout.write(
    JSON.stringify({
      id: m.config.id,
      verified: seen.size,
      deterministic: true,
      sourcesUnchanged: true,
    }) + "\n",
  );
}
