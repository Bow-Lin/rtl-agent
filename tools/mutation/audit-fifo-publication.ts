import { readFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { sha } from "./fifo-candidates.ts";

const root = path.resolve("mutation", "fifo-transfer-v2");
const suite = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
let count = 0;
for (const ip of suite.ips) {
  assert.match(ip.id, /^[a-z0-9-]+$/);
  const dir = path.join(root, ip.id);
  const bytes = await readFile(path.join(dir, "manifest.json"));
  assert.equal(sha(bytes), ip.manifestDigest);
  const m = JSON.parse(bytes.toString());
  for (const [file, digest] of Object.entries(m.sourceHashes)) {
    assert.ok(!file.includes("..") && !file.includes("\\") && !path.isAbsolute(file));
    assert.equal(sha(await readFile(path.join(dir, "golden-source", ...file.split("/")))), digest);
  }
  assert.equal(sha(await readFile(path.join(dir, "golden-tb.sv"))), m.tbDigest);
  for (const mutant of m.mutants) {
    assert.match(mutant.id, /^M\d{3}$/);
    const patch = path.join(dir, "mutants", `${mutant.id}.patch`);
    assert.equal(sha(await readFile(patch)), mutant.patchDigest);
    const r = spawnSync(
      "git",
      ["apply", "--check", "--unidiff-zero", "--ignore-space-change", patch],
      {
        cwd: path.join(dir, "golden-source"),
        shell: false,
        windowsHide: true,
        encoding: "utf8",
        timeout: 10000,
      },
    );
    assert.equal(r.status, 0, `${ip.id}/${mutant.id}: ${r.stderr}`);
    count++;
  }
}
assert.equal(count, 180);
process.stdout.write(
  JSON.stringify({
    ips: suite.ips.length,
    patchApplyChecks: count,
    allSourceTbManifestHashes: "pass",
    mutatedGoldenFiles: 0,
  }) + "\n",
);
