import {
  DPRETET_TB,
  DPRETET_CHECKER,
  DPRETET_WRAPPER,
  AXIS_TB,
  AXIS_CHECKER,
  AXIS_WRAPPER,
} from "./target-fifo-coverage-assets.js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ETH_FIFO_TB, ETH_FIFO_CHECKER, ETH_FIFO_WRAPPER } from "./eth-fifo-coverage-assets.js";
import { UFIFO_TB, UFIFO_CHECKER, UFIFO_WRAPPER } from "./ufifo-coverage-assets.js";
import { OPENHMC_TB, OPENHMC_CHECKER, OPENHMC_WRAPPER } from "./openhmc-coverage-assets.js";

import {
  DatasetDescriptorSchema,
  DatasetSelectionSchema,
  FixtureCaseRefSchema,
  FixtureMaterializationSchema,
} from "./contracts.js";
import type {
  DatasetDescriptor,
  DatasetSelection,
  FixtureCaseRef,
  FixtureMaterialization,
} from "./contracts.js";
import { CoreLoopException } from "./errors.js";
import type { FixtureProvider, HostDirectory } from "./fixture-provider.js";
import { scanRegularFiles } from "./filesystem.js";
import {
  projectCoverageLock,
  type CoverageProjectId,
  type ProjectCoverageDatasetLock,
} from "./project-coverage-lock.js";

const FIFO_SPEC = `# Versatile FIFO verification-coverage refinement

Improve verification coverage for the locked dual-clock, dual-width Versatile FIFO without
modifying the DUT. Preserve the seeded cross-clock data checks and bounded execution. Add focused
stimulus and assertions for reset, empty/full transitions, wraparound, both transfer directions,
and differing clock phases. Only \`rtl/tb.sv\` and \`rtl/checker.sv\` are mutable.
`;

const FIFO_CHECKER = `module tb_checker (
  input logic a_clk,
  input logic a_rst,
  input logic b_clk,
  input logic b_rst,
  input logic a_fifo_full,
  input logic a_fifo_empty,
  input logic b_fifo_full,
  input logic b_fifo_empty,
  input logic [7:0] a_q,
  input logic [7:0] b_q
);
  always @(posedge a_clk) begin
    if (!a_rst) begin
      assert (!$isunknown({a_fifo_full, a_fifo_empty, a_q}))
        else $fatal(1, "FIFO A-domain outputs contain X/Z");
    end
  end
  always @(posedge b_clk) begin
    if (!b_rst) begin
      assert (!$isunknown({b_fifo_full, b_fifo_empty, b_q}))
        else $fatal(1, "FIFO B-domain outputs contain X/Z");
    end
  end
endmodule
`;

const FIFO_TB = `\`timescale 1ns/1ps
module tb;
  logic a_clk = 0;
  logic b_clk = 0;
  logic a_rst = 1;
  logic b_rst = 1;
  logic [7:0] a_d = 0;
  logic a_wr = 0;
  logic a_rd = 0;
  logic [7:0] b_d = 0;
  logic b_wr = 0;
  logic b_rd = 0;
  wire a_fifo_full, a_fifo_empty, b_fifo_full, b_fifo_empty;
  wire [7:0] a_q, b_q;

  always #5 a_clk = ~a_clk;
  always #7 b_clk = ~b_clk;

  TopModule #(.data_width(8), .addr_width(2)) dut (
    .a_d(a_d), .a_wr(a_wr), .a_fifo_full(a_fifo_full),
    .a_q(a_q), .a_rd(a_rd), .a_fifo_empty(a_fifo_empty),
    .a_clk(a_clk), .a_rst(a_rst),
    .b_d(b_d), .b_wr(b_wr), .b_fifo_full(b_fifo_full),
    .b_q(b_q), .b_rd(b_rd), .b_fifo_empty(b_fifo_empty),
    .b_clk(b_clk), .b_rst(b_rst)
  );

  tb_checker checker_i (.*);

  task automatic write_a(input logic [7:0] value);
    @(negedge a_clk); a_d = value; a_wr = 1;
    @(negedge a_clk); a_wr = 0;
  endtask
  task automatic write_b(input logic [7:0] value);
    @(negedge b_clk); b_d = value; b_wr = 1;
    @(negedge b_clk); b_wr = 0;
  endtask
  task automatic read_b_expect(input logic [7:0] expected);
    wait (!b_fifo_empty);
    @(negedge b_clk); b_rd = 1;
    @(posedge b_clk); #1;
    if (b_q !== expected) $fatal(1, "FIFO A-to-B mismatch: got %02h expected %02h", b_q, expected);
    @(negedge b_clk); b_rd = 0;
  endtask
  task automatic read_a_expect(input logic [7:0] expected);
    wait (!a_fifo_empty);
    @(negedge a_clk); a_rd = 1;
    @(posedge a_clk); #1;
    if (a_q !== expected) $fatal(1, "FIFO B-to-A mismatch: got %02h expected %02h", a_q, expected);
    @(negedge a_clk); a_rd = 0;
  endtask

  initial begin
    repeat (4) @(posedge a_clk);
    repeat (4) @(posedge b_clk);
    a_rst = 0;
    b_rst = 0;
    repeat (3) @(posedge b_clk);
    if (!b_fifo_empty || !a_fifo_empty) $fatal(1, "FIFO not empty after reset");
    write_a(8'h3c);
    read_b_expect(8'h3c);
    write_b(8'ha7);
    read_a_expect(8'ha7);
    $display("GOLDEN_PASS versatile-fifo");
    $finish;
  end

  initial begin
    #20000;
    $fatal(1, "Versatile FIFO baseline timeout");
  end
endmodule
`;

const AES_SPEC = `# High-throughput low-area AES verification-coverage refinement

Improve verification coverage for the locked AES datapath without modifying the DUT. Preserve the
seeded AES-128 known-answer test and bounded execution. Add independent known-answer stimulus for
encryption/decryption, key sizes, pipelining and enable stalls. Never weaken or replace an expected
ciphertext check. Only \`rtl/tb.sv\` and \`rtl/checker.sv\` are mutable.
`;

const AES_CHECKER = `module tb_checker (
  input logic clk,
  input logic reset,
  input logic o_ready,
  input logic o_data_valid,
  input logic o_key_ready,
  input logic [127:0] o_data
);
  always @(posedge clk) begin
    if (!reset) begin
      assert (!$isunknown({o_ready, o_data_valid, o_key_ready}))
        else $fatal(1, "AES handshake output contains X/Z");
      if (o_data_valid) begin
        assert (!$isunknown(o_data)) else $fatal(1, "AES valid data contains X/Z");
      end
    end
  end
endmodule
`;

const AES_TB = `\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  logic reset = 1;
  logic i_start = 0;
  logic i_enable = 1;
  logic i_ende = 0;
  logic [255:0] i_key = 0;
  logic [1:0] i_key_mode = 0;
  logic [127:0] i_data = 0;
  logic i_data_valid = 0;
  wire o_ready, o_data_valid, o_key_ready;
  wire [127:0] o_data;

  always #5 clk = ~clk;

  TopModule dut (.*);
  tb_checker checker_i (.*);

  initial begin
    repeat (5) @(posedge clk);
    reset = 0;
    @(negedge clk);
    i_key_mode = 2'b00;
    i_key = {128'h000102030405060708090a0b0c0d0e0f, 128'b0};
    i_start = 1;
    @(negedge clk); i_start = 0;
    wait (o_key_ready);
    @(negedge clk);
    i_data = 128'h00112233445566778899aabbccddeeff;
    i_data_valid = 1;
    @(negedge clk); i_data_valid = 0;
    wait (o_data_valid);
    #1;
    if (o_data !== 128'h69c4e0d86a7b0430d8cdb78070b4c55a)
      $fatal(1, "AES-128 KAT mismatch: got %032h", o_data);
    $display("GOLDEN_PASS aes-highthroughput-lowarea");
    $finish;
  end

  initial begin
    #200000;
    $fatal(1, "AES baseline timeout");
  end
endmodule
`;

const ARBITER_SPEC = `# Scalable Arbiter verification-coverage refinement

Improve verification coverage for the locked sixteen-requester, two-level round-robin arbiter
without modifying the DUT. Preserve the seeded one-hot request, enable-mask, grant/select
consistency and bounded execution checks. Add focused request-contention and hold-until-grant
sequences that check fairness, turnaround and reset behavior. Only \`rtl/tb.sv\` and
\`rtl/checker.sv\` are mutable.
`;

const ARBITER_WRAPPER = `module TopModule (
  input logic enable,
  input logic [15:0] req,
  output logic [15:0] grant,
  output logic [3:0] select,
  output logic valid,
  input logic clock,
  input logic reset
);
  arbiter_x2 #(.width(16), .select_width(4)) dut_core (.*);
endmodule
`;

const ARBITER_CHECKER = `module tb_checker (
  input logic clock,
  input logic reset,
  input logic enable,
  input logic [15:0] req,
  input logic [15:0] grant,
  input logic [3:0] select,
  input logic valid
);
  always @(posedge clock) begin
    if (!reset) begin
      assert (!$isunknown({grant, select, valid})) else $fatal(1, "Arbiter output contains X/Z");
      assert ((grant & (grant - 1'b1)) == 0) else $fatal(1, "Arbiter issued multiple grants");
      assert (enable || grant == 0) else $fatal(1, "Arbiter ignored enable mask");
      if (grant != 0) begin
        assert (grant == (16'b1 << select)) else $fatal(1, "Arbiter grant/select mismatch");
      end
    end
  end
endmodule
`;

const ARBITER_TB = `\`timescale 1ns/1ps
module tb;
  logic clock = 0;
  logic reset = 1;
  logic enable = 1;
  logic [15:0] req = 0;
  wire [15:0] grant;
  wire [3:0] select;
  wire valid;

  always #5 clock = ~clock;
  TopModule dut (.*);
  tb_checker checker_i (.*);

  task automatic request_one(input integer index);
    @(negedge clock); req = 16'b1 << index;
    repeat (7) @(posedge clock);
    #1;
    if (grant !== (16'b1 << index))
      $fatal(1, "Arbiter failed requester %0d: grant=%04h", index, grant);
    @(negedge clock); req = 0;
    repeat (2) @(posedge clock);
  endtask

  initial begin
    repeat (3) @(posedge clock);
    reset = 0;
    request_one(0);
    request_one(5);
    request_one(15);
    @(negedge clock); enable = 0; req = 16'hffff;
    repeat (7) @(posedge clock);
    #1;
    if (grant !== 0) $fatal(1, "Arbiter enable mask failed");
    @(negedge clock); req = 0; enable = 1;
    $display("GOLDEN_PASS scalable-arbiter");
    $finish;
  end

  initial begin
    #20000;
    $fatal(1, "Scalable Arbiter baseline timeout");
  end
endmodule
`;

function normalized(content: Buffer): string {
  return content.toString("utf8").replace(/\r\n?/g, "\n");
}

function replaceExactly(content: string, search: string, replacement: string): string {
  const count = content.split(search).length - 1;
  if (count !== 1) {
    throw new CoreLoopException(
      "DATASET_PROVENANCE_INVALID",
      "Locked project source no longer matches its normalization contract",
    );
  }
  return content.replace(search, replacement);
}

interface ProjectAssets {
  readonly spec: string;
  readonly tb: string;
  readonly checker: string;
  readonly sources: readonly {
    readonly input: string;
    readonly output: string;
    readonly transform?: (content: string) => string;
  }[];
  readonly generated?: readonly { readonly output: string; readonly content: string }[];
}

function projectAssets(projectId: CoverageProjectId): ProjectAssets {
  switch (projectId) {
    case "dpretet":
      return {
        spec: "# Target FIFO seeded verification improvement\nFixed DSIZE8 ASIZE3 FALLTHROUGH TRUE asynchronous FIFO. Preserve two clocks, active-low resets, legal local full/empty guards and pre-edge fallthrough data checks. Almost flags are look-ahead equalities, not full/empty implications. Only rtl/tb.sv and rtl/checker.sv may change. Preserve the seeded module prefix through the complete TopModule dut instantiation, including its parameters, ports and preceding declarations. Add new stimulus/tasks/declarations after that instance. Exactly one DUT instance is permitted. Never instantiate a second configuration, instantiate raw DUT submodules, use defparam/bind/force or add preprocessor directives. Fixed-configuration unreachable bins must remain reported, not activated by another configuration. Preserve all seed checks and global timeout. Frozen Memory, if present, is advisory: validate every source-specific assumption against this DUT. Runner alone decides stopping and residual acceptance requires review.\n",
        tb: DPRETET_TB,
        checker: DPRETET_CHECKER,
        sources: [
          { input: "rtl/async_fifo.v", output: "async_fifo.v" },
          { input: "rtl/fifomem.v", output: "fifomem.v" },
          { input: "rtl/rptr_empty.v", output: "rptr_empty.v" },
          { input: "rtl/wptr_full.v", output: "wptr_full.v" },
          { input: "rtl/sync_r2w.v", output: "sync_r2w.v" },
          { input: "rtl/sync_w2r.v", output: "sync_w2r.v" },
        ],
        generated: [{ output: "top_wrapper.sv", content: DPRETET_WRAPPER }],
      };
    case "axis":
      return {
        spec: "# Target FIFO seeded verification improvement\nFixed DEPTH8 DATA_WIDTH8 RAM_PIPELINE1 FRAME_FIFO0 AXI stream FIFO. Preserve ready/valid handshake, data/last/user ordering and output stability under backpressure. Do not change parameter configuration. Only rtl/tb.sv and rtl/checker.sv may change. Preserve the seeded module prefix through the complete TopModule dut instantiation, including its parameters, ports and preceding declarations. Add new stimulus/tasks/declarations after that instance. Exactly one DUT instance is permitted. Never instantiate a second configuration, instantiate raw DUT submodules, use defparam/bind/force or add preprocessor directives. Fixed-configuration unreachable bins must remain reported, not activated by another configuration. Preserve all seed checks and global timeout. Frozen Memory, if present, is advisory: validate every source-specific assumption against this DUT. Runner alone decides stopping and residual acceptance requires review.\n",
        tb: AXIS_TB,
        checker: AXIS_CHECKER,
        sources: [{ input: "rtl/axis_fifo.v", output: "axis_fifo.v" }],
        generated: [{ output: "top_wrapper.sv", content: AXIS_WRAPPER }],
      };

    case "openhmc":
      return {
        spec: "# openHMC FIFO verification refinement\nIndependent source seeded-TB improvement. Fixed DWIDTH8/ENTRIES8, separate write/read clocks and active-low resets. Respect local full/empty flags and synchronization latency; never shift_in while full or shift_out while empty. Preserve data-order scoreboard, reset/fill/drain/concurrent tests and bounded timeout. Only rtl/tb.sv and rtl/checker.sv may change, never DUT.\n",
        tb: OPENHMC_TB,
        checker: OPENHMC_CHECKER,
        sources: [
          {
            input: "rtl/building_blocks/fifos/async/openhmc_async_fifo.v",
            output: "openhmc_async_fifo.v",
          },
        ],
        generated: [{ output: "top_wrapper.sv", content: OPENHMC_WRAPPER }],
      };
    case "ufifo":
      return {
        spec: "# ufifo verification refinement\nImprove seeded verification, not DUT. Fixed BW8/LGFLEN4/RXFIFO1, usable capacity15. Synchronous active-high reset. Empty read ignored, full write rejected unless reading simultaneously; o_err reports rejected writes. Read data is checked before the active clock update. Preserve queue/status checks and bounded legal/reset/overflow tests. Only rtl/tb.sv and rtl/checker.sv may change.\n",
        tb: UFIFO_TB,
        checker: UFIFO_CHECKER,
        sources: [{ input: "rtl/ufifo.v", output: "ufifo.v" }],
        generated: [{ output: "top_wrapper.sv", content: UFIFO_WRAPPER }],
      };
    case "eth-fifo":
      return {
        spec: "# eth_fifo verification refinement\nImprove seeded FIFO verification without modifying DUT. Fixed width32/depth8/generic RAM. Never read empty or write full. Reset is asynchronous active-high; clear synchronously discards queued data. Simultaneous read/write preserves occupancy. almost_empty means count1; almost_full means count7. Preserve scoreboard and bounded tests. Only rtl/tb.sv and rtl/checker.sv may change.\n",
        tb: ETH_FIFO_TB,
        checker: ETH_FIFO_CHECKER,
        sources: [
          { input: "rtl/verilog/eth_fifo.v", output: "eth_fifo.v" },
          { input: "rtl/verilog/ethmac_defines.v", output: "ethmac_defines.v" },
          { input: "rtl/verilog/timescale.v", output: "timescale.v" },
        ],
        generated: [{ output: "top_wrapper.sv", content: ETH_FIFO_WRAPPER }],
      };
    case "versatile-fifo":
      return {
        spec: FIFO_SPEC,
        tb: FIFO_TB,
        checker: FIFO_CHECKER,
        sources: [
          {
            input: "rtl/verilog/async_fifo_dw_simplex_actel.v",
            output: "async_fifo_dw_simplex.v",
            transform: (content) =>
              replaceExactly(content, "module async_fifo_dw_simplex_top (", "module TopModule ("),
          },
        ],
      };
    case "aes-highthroughput-lowarea":
      return {
        spec: AES_SPEC,
        tb: AES_TB,
        checker: AES_CHECKER,
        sources: [
          {
            input: "verilog/rtl/aes.v",
            output: "aes.v",
            transform: (content) => replaceExactly(content, "module aes (", "module TopModule ("),
          },
          { input: "verilog/rtl/key_exp.v", output: "key_exp.v" },
          { input: "verilog/rtl/sbox.v", output: "sbox.v" },
          { input: "verilog/rtl/shift_rows.v", output: "shift_rows.v" },
          { input: "verilog/rtl/inv_shift_rows.v", output: "inv_shift_rows.v" },
          { input: "verilog/rtl/mix_columns.v", output: "mix_columns.v" },
          { input: "verilog/rtl/xram_16x64.v", output: "xram_16x64.v" },
        ],
      };
    case "scalable-arbiter":
      return {
        spec: ARBITER_SPEC,
        tb: ARBITER_TB,
        checker: ARBITER_CHECKER,
        sources: [
          { input: "rtl/verilog/arbiter.v", output: "arbiter.v" },
          { input: "rtl/verilog/functions.v", output: "functions.v" },
        ],
        generated: [{ output: "top_wrapper.sv", content: ARBITER_WRAPPER }],
      };
  }
}

export function projectCoverageCaseRef(
  projectId: CoverageProjectId,
  lock: ProjectCoverageDatasetLock = projectCoverageLock(projectId),
): FixtureCaseRef {
  return FixtureCaseRefSchema.parse({
    schemaVersion: 1,
    fixtureId: lock.fixtureId,
    identity: {
      datasetId: lock.datasetId,
      datasetVersion: lock.datasetVersion,
      split: lock.split,
      caseId: lock.caseId,
    },
    caseSourceDigest: lock.datasetSourceDigest,
  });
}

export class ProjectCoverageFixtureProvider implements FixtureProvider {
  public constructor(
    private readonly sourceRoot: string,
    private readonly lock: ProjectCoverageDatasetLock,
  ) {}

  public describe(): Promise<DatasetDescriptor> {
    return Promise.resolve(
      DatasetDescriptorSchema.parse({
        schemaVersion: 1,
        datasetId: this.lock.datasetId,
        datasetVersion: this.lock.datasetVersion,
        datasetSourceDigest: this.lock.datasetSourceDigest,
        license: { name: this.lock.licenseName, reference: this.lock.licenseReference },
        adapter: {
          adapterId: "opencores-project-coverage-provider",
          adapterVersion: this.lock.adapterVersion,
          normalizationVersion: this.lock.normalizationVersion,
        },
        splits: [this.lock.split],
      }),
    );
  }

  public async *listCases(rawSelection: DatasetSelection): AsyncIterable<FixtureCaseRef> {
    const selection = DatasetSelectionSchema.parse(rawSelection);
    if (selection.split !== this.lock.split) return;
    if (
      selection.caseIds !== undefined &&
      !selection.caseIds.map(String).includes(this.lock.caseId)
    )
      return;
    yield projectCoverageCaseRef(this.lock.projectId, this.lock);
  }

  private async validatedSources(): Promise<ReadonlyMap<string, Buffer>> {
    const scanned = await scanRegularFiles(path.resolve(this.sourceRoot)).catch(() => undefined);
    if (scanned === undefined) {
      throw new CoreLoopException(
        "DATASET_NOT_CONFIGURED",
        `Locked ${this.lock.projectId} source tree is unavailable`,
      );
    }
    const scannedByPath = new Map<string, (typeof scanned)[number]>(
      scanned.map((file) => [file.logicalPath, file] as const),
    );
    const sources = new Map<string, Buffer>();
    for (const locked of this.lock.files) {
      const file = scannedByPath.get(locked.logicalPath);
      if (
        file === undefined ||
        file.byteLength !== locked.byteLength ||
        file.contentDigest !== locked.contentDigest
      ) {
        throw new CoreLoopException(
          "DATASET_PROVENANCE_INVALID",
          `${this.lock.projectId} source content does not match the lock`,
        );
      }
      sources.set(locked.logicalPath, await readFile(file.hostPath));
    }
    return sources;
  }

  public async materialize(
    caseRef: FixtureCaseRef,
    destination: HostDirectory,
  ): Promise<FixtureMaterialization> {
    const expected = projectCoverageCaseRef(this.lock.projectId, this.lock);
    const parsed = FixtureCaseRefSchema.parse(caseRef);
    if (JSON.stringify(parsed) !== JSON.stringify(expected)) {
      throw new CoreLoopException(
        "DATASET_CASE_NOT_FOUND",
        `Requested ${this.lock.projectId} coverage case is not locked`,
      );
    }
    const sources = await this.validatedSources();
    const assets = projectAssets(this.lock.projectId);
    const starter = path.join(destination, "starter");
    const dut = path.join(starter, "dut");
    await mkdir(dut, { recursive: true });
    const writes: Promise<void>[] = [
      writeFile(path.join(destination, "problem.md"), assets.spec, { flag: "wx" }),
      writeFile(path.join(starter, "tb.sv"), assets.tb, { flag: "wx" }),
      writeFile(path.join(starter, "checker.sv"), assets.checker, { flag: "wx" }),
    ];
    for (const source of assets.sources) {
      const bytes = sources.get(source.input);
      if (bytes === undefined) throw new Error("validated project source is missing");
      const content = normalized(bytes);
      writes.push(
        writeFile(
          path.join(dut, source.output),
          source.transform === undefined ? content : source.transform(content),
          { flag: "wx" },
        ),
      );
    }
    for (const generated of assets.generated ?? []) {
      writes.push(writeFile(path.join(dut, generated.output), generated.content, { flag: "wx" }));
    }
    await Promise.all(writes);
    return FixtureMaterializationSchema.parse({
      schemaVersion: 1,
      fixtureId: expected.fixtureId,
      identity: expected.identity,
      caseSourceDigest: expected.caseSourceDigest,
      category: "SEEDED_COMPILE_REPAIR",
      specPath: "problem.md",
      starterRtlRoot: "starter",
      topModule: "TopModule",
      tags: ["coverage-experiment", this.lock.projectId, "seeded-golden-testbench"].sort(),
    });
  }
}
