import assert from "node:assert/strict";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { recordedProcess } from "./family-replay-process.ts";
import { auditFamilyPublication, frozenPatchArgs, icarusArgs } from "./family-replay.ts";

// Evaluator-only, fixed two diagnostic hypotheses. Never replace a baseline verdict or TB.
assert.ok(process.argv[2] === undefined || process.argv[2] === "aes-recovery");
const recovery = process.argv[2] === "aes-recovery";
const repo = process.cwd(),
  label = recovery ? "uart-aes-witness-20260920-aes-recovery-v1" : "uart-aes-witness-20260920-v1";
const root = path.join(repo, ".rtl-agent", "family-replays", label);
const baseline = path.join(repo, ".rtl-agent", "family-replays", "uart-aes-baseline-20260920-v2");
const sha = (x: Buffer | string) => createHash("sha256").update(x).digest("hex");
const json = async (p: string, v: unknown) =>
  writeFile(p, JSON.stringify(v, null, 2) + "\n", { flag: "wx" });
const a = await auditFamilyPublication(repo);
const planned = [
  {
    id: "uart16550",
    mutant: "M021",
    hypothesis:
      "Queued legal 8N1 writes reveal shortened TX stop bit; separate witness TB, same DUT/config.",
  },
  {
    id: "aes-pipeline",
    mutant: "M011",
    hypothesis:
      "Passive observer of first rising edge after reset release: valid before any accepted input; original TB unchanged.",
  },
].filter((p) => !recovery || p.id === "aes-pipeline");
const uartTb = `\`timescale 1ns/1ps
module tb;
reg clk=0; always #5 clk=~clk;
reg rst=1,rx=1; wire tx;
reg cyc=0,stb=0,we=0; reg[2:0] addr=0; reg[7:0] wdata=0; wire[7:0] rdata; wire ack;
integer checked=0;
uart_top dut(.wb_clk_i(clk),.wb_rst_i(rst),.wb_adr_i(addr),.wb_dat_i(wdata),.wb_dat_o(rdata),.wb_we_i(we),.wb_stb_i(stb),.wb_cyc_i(cyc),.wb_ack_o(ack),.wb_sel_i(4'h1),.srx_pad_i(rx),.stx_pad_o(tx),.cts_pad_i(1'b0),.dsr_pad_i(1'b0),.ri_pad_i(1'b0),.dcd_pad_i(1'b0));
task ticks(input integer n); repeat(n) @(negedge clk); endtask
task wr(input[2:0] a,input[7:0] d);
 integer n; begin
 @(negedge clk); cyc=1;stb=1;we=1;addr=a;wdata=d;
 @(negedge clk);n=0;while(!ack&&n<16) begin @(negedge clk);n=n+1;end
 if(!ack) $fatal(1,"WITNESS_BUS_FAILURE");
 cyc=0;stb=0;we=0;ticks(4);
 end
endtask
task decode(input[7:0] expected);
 reg[7:0] data; integer i; begin
 @(negedge tx);ticks(16);if(tx!==0)$fatal(1,"WITNESS_START");
 for(i=0;i<8;i=i+1)begin ticks(32);data[i]=tx;end
 ticks(32);if(tx!==1)$fatal(1,"WITNESS_TX_STOP frame=%0d sampled=%b",checked,tx);
 if(data!==expected)$fatal(1,"WITNESS_TX_DATA expected=%h got=%h",expected,data);
 checked=checked+1;
 end
endtask
initial begin wait(!rst);decode(8'h00);decode(8'hff);end
initial begin
 ticks(8);rst=0;ticks(8);
 wr(3,8'h83);wr(0,8'h02);wr(1,8'h00);wr(3,8'h03);wr(2,8'h07);
 ticks(96);wr(0,8'h00);wr(0,8'hff);
 ticks(800);if(checked!=2)$fatal(1,"WITNESS_COUNT %0d",checked);
 $display("WITNESS_PASS uart16550 two_queued_frames");$finish;
end
initial begin #200000;$fatal(1,"WITNESS_GLOBAL_TIMEOUT");end
endmodule
`;
const observer = `\`timescale 1ns/1ps
module witness_observer;
integer accepted=0,observed=0;
// Pre-NBA sampling models a synchronous consumer of the registered valid output.
// No DUT/TB signals are driven; no comparison while reset is asserted or valid is low.
always @(posedge tb.clk) begin
 if(!tb.reset)begin accepted=0;observed=0;end
 else begin
  if(tb.valid_out===1'b1)begin
   $display("WITNESS_VALID time=%0t accepted=%0d observed=%0d data=%h",$time,accepted,observed,tb.cipher_text);
   if(observed>=accepted)$display("WITNESS_UNEXPECTED_VALID time=%0t accepted=%0d",$time,accepted);
   observed=observed+1;
  end
  if(tb.data_valid_in && tb.cipherkey_valid_in)accepted=accepted+1;
 end
end
endmodule
`;
const lock = path.join(repo, ".rtl-agent", "fifo-target-campaigns", "active.lock");
for (const parts of [
  ["fifo-target-campaigns", "active.lock"],
  ["family-process-active.json"],
  ["family-preparation.pause.json"],
  ["verification-memory-build.lock"],
])
  assert.ok(!existsSync(path.join(repo, ".rtl-agent", ...parts)), "NOT_IDLE");
assert.ok(!existsSync(root), "OUTPUT_EXISTS");
const token = randomUUID(),
  lockBytes =
    JSON.stringify({ pid: process.pid, token, label, kind: "evaluator-only-witness" }) + "\n";
await writeFile(lock, lockBytes, { flag: "wx" });
const windows = process.platform === "win32";
const git =
  process.env.GIT_EXE ??
  (windows ? path.join("C:", "Program Files", "Git", "cmd", "git.exe") : "git");
const iv =
  process.env.IVERILOG_EXE ??
  (windows ? path.join("C:", "iverilog", "bin", "iverilog.exe") : "iverilog");
const vvp =
  process.env.VVP_EXE ?? (windows ? path.join("C:", "iverilog", "bin", "vvp.exe") : "vvp");
const rows: unknown[] = [];
async function cmd(cwd: string, executable: string, args: string[], name: string) {
  return recordedProcess({
    repo,
    cwd,
    executable,
    args,
    label: name,
    env: { ...process.env },
    timeoutMs: 30000,
    fifoLockToken: token,
  });
}
try {
  await mkdir(root);
  await writeFile(
    path.join(root, "script.ts"),
    await readFile(path.resolve("tools", "mutation", "family-survivor-witness.ts")),
    { flag: "wx" },
  );
  await json(path.join(root, "plan.json"), {
    planned,
    baseline: ".rtl-agent/family-replays/uart-aes-baseline-20260920-v2",
    baselineSummaryDigest: sha(await readFile(path.join(baseline, "summary.json"))),
    publicationHashes: a.publicationHashes,
    uartWitnessDigest: sha(uartTb),
    passiveObserverDigest: sha(observer),
    scriptDigest: sha(
      await readFile(path.resolve("tools", "mutation", "family-survivor-witness.ts")),
    ),
    baselineScoresUnchanged: true,
  });
  for (const p of planned) {
    const f = a.fixtures.find((x) => x.id === p.id)!;
    assert.equal(
      JSON.parse(await readFile(path.join(baseline, p.id, p.mutant, "result.json"), "utf8"))
        .outcome,
      "survived",
    );
    for (const id of ["golden", p.mutant]) {
      const cwd = path.join(root, p.id, id);
      await mkdir(cwd, { recursive: true });
      for (const [file, bytes] of f.sources) {
        const dest = path.join(cwd, ...file.split("/"));
        await mkdir(path.dirname(dest), { recursive: true });
        await writeFile(dest, bytes, { flag: "wx" });
      }
      if (id !== "golden") {
        assert.equal((await cmd(cwd, git, ["init", "--quiet"], "git-init")).exitCode, 0);
        assert.equal(
          (
            await cmd(
              cwd,
              git,
              frozenPatchArgs(path.resolve(...f.root.split("/"), "mutants", id + ".patch")),
              "apply",
            )
          ).exitCode,
          0,
        );
      }
      const m = f.manifest.mutants.find((x) => x.id === id);
      for (const [file, digest] of Object.entries(f.manifest.sourceHashes))
        assert.equal(
          sha(await readFile(path.join(cwd, ...file.split("/")))),
          m?.file === file ? m.mutatedDigest : digest,
        );
      const tb = p.id === "uart16550" ? uartTb : f.tb;
      await writeFile(path.join(cwd, "tb.sv"), tb, { flag: "wx" });
      const args = icarusArgs(f.manifest.config);
      if (p.id === "aes-pipeline") {
        await writeFile(path.join(cwd, "observer.sv"), observer, { flag: "wx" });
        args.unshift("-s", "witness_observer");
        args.push("observer.sv");
        assert.equal(sha(tb), f.manifest.tbDigest);
      }
      const c = await cmd(cwd, iv, args, "compile");
      assert.equal(c.exitCode, 0);
      const s = await cmd(cwd, vvp, ["sim.vvp"], "simulation");
      for (const [file, digest] of Object.entries(f.manifest.sourceHashes))
        assert.equal(
          sha(await readFile(path.join(cwd, ...file.split("/")))),
          m?.file === file ? m.mutatedDigest : digest,
        );
      assert.equal(sha(await readFile(path.join(cwd, "tb.sv"))), sha(tb));
      if (id === "golden") assert.equal(s.exitCode, 0, "WITNESS_GOLDEN_FAILED");
      const result = {
        ip: p.id,
        id,
        compileMs: c.durationMs,
        simulationMs: s.durationMs,
        exitCode: s.exitCode,
        stdout: s.stdout,
        stderr: s.stderr,
        cleanupConfirmed: s.cleanupConfirmed,
        tbDigest: sha(tb),
        patchDigest: m?.patchDigest ?? null,
        hypothesis: p.hypothesis,
      };
      await json(path.join(cwd, "witness.json"), result);
      rows.push(result);
      process.stdout.write(JSON.stringify(result) + "\n");
    }
  }
  assert.deepEqual((await auditFamilyPublication(repo)).publicationHashes, a.publicationHashes);
  await json(path.join(root, "summary.json"), {
    complete: true,
    modelCalls: 0,
    results: rows,
    publicationUnchanged: true,
    baselineScoresUnchanged: true,
  });
} finally {
  if (!existsSync(path.join(repo, ".rtl-agent", "family-process-active.json"))) {
    assert.equal(await readFile(lock, "utf8"), lockBytes);
    await unlink(lock);
  }
}
