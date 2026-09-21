import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { sha } from "./fifo-candidates.ts";

const repo = process.cwd();
const suite = JSON.parse(
  await readFile(path.resolve("tools/mutation/fixtures/six-fifo-suite-v2.json"), "utf8"),
);
const output = path.resolve("mutation", "fifo-transfer-v2");
await mkdir(output); // exclusive: an existing frozen publication must never be overwritten
const index = [];
const rationale: Record<string, string> = {
  comparison: "Changes the pointer/boundary equality decision",
  boolean: "Changes the required enable combination, reduction or Gray encoding",
  increment: "Reverses a count/address/occupancy step",
  polarity: "Removes a required reset/flag/Gray-bit polarity",
  bit_constant: "Corrupts a reset, flag, address mask or increment constant",
  enable_inversion: "Inverts a live write/read/reset/set enable",
  reset_offset: "Introduces a nonzero reset pointer/count/valid state",
  transfer_lsb: "Corrupts the low bit of a live data, pointer or state transfer",
};
for (const logical of [...suite.sources, ...suite.targets] as string[]) {
  assert.match(logical, /^(source|target)\/[a-z0-9-]+$/);
  const root = path.resolve(".rtl-agent", "fifo-prepared", ...logical.split("/"));
  const m = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
  const frontend = JSON.parse(await readFile(path.join(root, "frontend-summary.json"), "utf8"));
  const coverage = JSON.parse(await readFile(path.join(root, "coverage-summary.json"), "utf8"));
  assert.equal(m.selected, 30);
  assert.equal(frontend.passed, 30);
  assert.equal(coverage.simulation, true);
  const dest = path.join(output, m.config.id);
  await mkdir(path.join(dest, "mutants"), { recursive: true });
  if (m.config.id === "dpretet" || m.config.id === "axis") {
    const licenseFile = m.config.id === "dpretet" ? "LICENSE" : "COPYING";
    const license = await readFile(path.resolve(m.config.root, licenseFile));
    await writeFile(path.join(dest, licenseFile), license, { flag: "wx" });
    m.licenseEvidence = { file: licenseFile, digest: sha(license) };
  }
  for (const mutant of m.mutants) {
    const patch = await readFile(path.join(root, "mutants", `${mutant.id}.patch`));
    assert.equal(sha(patch), mutant.patchDigest);
    await writeFile(path.join(dest, "mutants", `${mutant.id}.patch`), patch, { flag: "wx" });
    const source = await readFile(path.resolve(m.config.root, ...mutant.file.split("/")), "utf8");
    const prefix = source.split("\n").slice(0, mutant.line).join("\n");
    mutant.module = [...prefix.matchAll(/^\s*module\s+(\w+)/gm)].at(-1)?.[1];
    assert.ok(mutant.module);
    mutant.faultHypothesis = `${rationale[mutant.operator]} in ${mutant.module}: ${mutant.before} -> ${mutant.after}`;
    mutant.staticReview =
      "Reviewed live parameter branch and fault rationale; no known semantic-padding duplicate retained; no kill input";
    mutant.equivalence = "not-formally-proven; human equivalence review pending";
  }
  // Bundle consumed upstream sources, not hidden implementation dependencies.
  for (const [file, hash] of Object.entries(m.sourceHashes)) {
    const bytes = await readFile(path.resolve(m.config.root, ...file.split("/")));
    assert.equal(sha(bytes), hash);
    const destination = path.join(dest, "golden-source", ...file.split("/"));
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, bytes, { flag: "wx" });
  }
  const tb = await readFile(path.resolve(m.config.tb));
  assert.equal(sha(tb), m.tbDigest);
  await writeFile(path.join(dest, "golden-tb.sv"), tb, { flag: "wx" });
  m.preparationRoot = path.relative(repo, root).split(path.sep).join("/");
  m.scope =
    "Preparation only; evaluator-owned golden TB. Target oracle/mutants must not be exposed to Memory construction or initial TB generation.";
  await writeFile(path.join(dest, "manifest.json"), JSON.stringify(m, null, 2) + "\n", {
    flag: "wx",
  });
  for (const file of ["selection.json", "coverage-summary.json", "frontend-summary.json"])
    await copyFile(path.join(root, file), path.join(dest, file));
  const manifestDigest = sha(await readFile(path.join(dest, "manifest.json")));
  index.push({
    id: m.config.id,
    role: m.role,
    manifest: `${m.config.id}/manifest.json`,
    manifestDigest,
    mutants: 30,
    coverage: coverage.points,
  });
}
await writeFile(
  path.join(output, "manifest.json"),
  JSON.stringify(
    {
      ...suite,
      ips: index,
      total: 180,
      equivalence: "pending human/formal review",
      killReplay: "not-run",
    },
    null,
    2,
  ) + "\n",
  { flag: "wx" },
);
process.stdout.write(
  JSON.stringify({ publication: "mutation/fifo-transfer-v2", ips: index.length, mutants: 180 }) +
    "\n",
);
