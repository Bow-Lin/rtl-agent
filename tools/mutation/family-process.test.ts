import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { recordedProcess } from "./family-process.ts";

async function options() {
  const parent = path.resolve(".rtl-agent", "family-process-tests");
  await mkdir(parent, { recursive: true });
  const repo = await mkdtemp(path.join(parent, "case-"));
  const cwd = path.join(repo, "work");
  await mkdir(cwd);
  return {
    repo,
    cwd,
    executable: process.execPath,
    args: ["-e", "console.log('persisted')"],
    label: "test",
    env: process.env,
    timeoutMs: 10000,
  };
}
test("process evidence is persisted and successful ownership marker released", async () => {
  const o = await options();
  const result = await recordedProcess(o);
  assert.equal(result.exitCode, 0);
  assert.equal(result.cleanupConfirmed, true);
  assert.match(await readFile(path.join(o.cwd, "test.stdout.log"), "utf8"), /persisted/);
  assert.ok(JSON.parse(await readFile(path.join(o.cwd, "test.started.json"), "utf8")).childPid);
  await assert.rejects(access(path.join(o.repo, ".rtl-agent", "family-process-active.json")));
});
test("active FIFO lock blocks launch before creating process evidence", async () => {
  const o = await options();
  const dir = path.join(o.repo, ".rtl-agent", "fifo-target-campaigns");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "active.lock"), "{}");
  await assert.rejects(recordedProcess(o), /NOT_IDLE/);
  await assert.rejects(access(path.join(o.cwd, "test.started.json")));
});
test("a parent workspace is rejected before any control files or child are created", async () => {
  const o = await options();
  await assert.rejects(recordedProcess({ ...o, cwd: path.dirname(o.repo) }), /WORKSPACE_ESCAPE/);
  await assert.rejects(access(path.join(o.repo, ".rtl-agent")));
});
test("timeout terminates an owned parent and descendant and persistently pauses later jobs", async () => {
  const o = await options();
  o.args = [
    "-e",
    "const {spawn}=require('node:child_process'); const c=spawn(process.execPath,['-e','setTimeout(()=>{},8000)'],{stdio:'ignore',windowsHide:true}); console.log(c.pid); setTimeout(()=>{},8000)",
  ];
  o.timeoutMs = 1000;
  await assert.rejects(recordedProcess(o), /TIMEOUT/);
  const result = JSON.parse(await readFile(path.join(o.cwd, "test.json"), "utf8"));
  assert.equal(result.error, "TIMEOUT");
  assert.equal(result.cleanupConfirmed, true);
  const descendant = Number(result.stdout.trim());
  assert.ok(descendant > 0);
  assert.throws(() => process.kill(descendant, 0));
  await assert.rejects(recordedProcess({ ...o, label: "second" }), /NOT_IDLE/);
});
