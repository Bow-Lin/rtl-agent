import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

// One-time evidence recovery, not a tool-call executor. Fixed paths and allowlisted operations.
const root = path.resolve(
  ".rtl-agent",
  "project-coverage-runs",
  "versatile-fifo-async-duplex",
  "run_20260913-135221-083",
);
const hash = (b: string | Buffer) => createHash("sha256").update(b).digest("hex");
const assets = new Map<string, string>();
const transcriptHashes: Record<string, string> = {};
for (const attempt of [2, 3]) {
  const bytes = await readFile(
    path.join(root, "evidence", "attempts", String(attempt), "provider-transcript.json"),
  );
  transcriptHashes[String(attempt)] = hash(bytes);
  const transcript = JSON.parse(bytes.toString());
  const first = new Map(assets);
  for (const exchange of transcript.exchanges) {
    for (const call of exchange.response.content) {
      if (call.type !== "toolCall" || call.name === "read") continue;
      const a = call.arguments;
      assert.ok(["rtl/tb.sv", "rtl/checker.sv"].includes(a.path));
      if (attempt === 2) {
        assert.equal(call.name, "write");
        assert.equal(typeof a.content, "string");
        assert.ok(!assets.has(a.path));
        assets.set(a.path, a.content);
      } else {
        assert.equal(call.name, "edit");
        assert.ok(Array.isArray(a.edits));
        for (const edit of a.edits) {
          assert.equal(typeof edit.oldText, "string");
          assert.equal(typeof edit.newText, "string");
          const original = assets.get(a.path)!;
          assert.ok(edit.oldText.length > 0);
          assert.equal(original.split(edit.oldText).length, 2, "Edit must match exactly once");
          assets.set(a.path, original.replace(edit.oldText, edit.newText));
        }
      }
    }
  }
  assert.equal(assets.size, 2);
  if (attempt === 3) {
    for (const [logical, content] of assets) {
      assert.equal(
        hash(content),
        hash(await readFile(path.join(root, "workspace", ...logical.split("/")))),
      );
    }
    const out = path.resolve(".rtl-agent", "fifo-transfer-recovery", "versatile-first-v1");
    await mkdir(path.dirname(out), { recursive: true });
    await mkdir(out);
    const entries = [];
    for (const [logical, content] of first) {
      const file = path.join(out, ...logical.split("/"));
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, content, { flag: "wx" });
      entries.push({ path: logical, sha256: hash(content) });
    }
    await writeFile(
      path.join(out, "recovery.json"),
      JSON.stringify(
        {
          sourceRun: path.relative(process.cwd(), root).split(path.sep).join("/"),
          method: "Complete attempt2 writes; exact attempt3 edits reproduce final bytes",
          transcriptHashes,
          entries,
          finalBytesVerified: true,
          simulationReplay: "pending",
        },
        null,
        2,
      ) + "\n",
      { flag: "wx" },
    );
    process.stdout.write(
      JSON.stringify({ recovered: entries.length, finalBytesVerified: true }) + "\n",
    );
  }
}
