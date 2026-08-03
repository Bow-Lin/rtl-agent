import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

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
import { I2C_COVERAGE_DATASET_LOCK, type I2cCoverageDatasetLock } from "./i2c-coverage-lock.js";

const SPECIFICATION = `# FreeCores I2C coverage refinement

Improve verification coverage for the locked FreeCores Wishbone I2C controller without modifying
the DUT or support models. The existing testbench is the functional baseline and must continue to
pass. Preserve its checks, add focused bounded stimulus for the structured uncovered DUT targets,
and keep failures terminating with \`$fatal\`.

The normalized DUT top module is \`TopModule\`. The mutable verification files are \`rtl/tb.sv\`
and \`rtl/checker.sv\`. Files below \`rtl/dut/\`, plus \`rtl/i2c_slave_model.v\` and
\`rtl/wb_master_model.v\`, are protected. The I2C bus is open-drain and uses pullups in the seeded
testbench.
`;

const CHECKER = `module tb_checker (
  input wire clk,
  input wire rstn,
  input wire scl0_o,
  input wire sda0_o,
  input wire scl1_o,
  input wire sda1_o
);
  always @(posedge clk) begin
    if (rstn) begin
      assert ({scl0_o, sda0_o, scl1_o, sda1_o} === 4'b0000)
        else $fatal(1, "Open-drain data outputs must remain low");
    end
  end
endmodule
`;

function normalizeNewlines(content: string): string {
  return content.replace(/\r\n?/g, "\n");
}

function replaceCount(
  content: string,
  search: string,
  replacement: string,
  expected: number,
): string {
  const actual = content.split(search).length - 1;
  if (actual !== expected) {
    throw new CoreLoopException(
      "DATASET_PROVENANCE_INVALID",
      "Locked I2C source no longer matches the normalization contract",
    );
  }
  return content.replaceAll(search, replacement);
}

function normalizeTop(source: string): string {
  return replaceCount(normalizeNewlines(source), "module i2c_master_top", "module TopModule", 1);
}

function normalizeTestbench(source: string): string {
  let normalized = normalizeNewlines(source).replaceAll("tst_bench_top", "tb");
  normalized = replaceCount(normalized, "i2c_master_top #(", "TopModule #(", 2);
  normalized = replaceCount(
    normalized,
    "\twire scl, scl0_o, scl0_oen, scl1_o, scl1_oen;",
    "\ttri1 scl;\n\twire scl0_o, scl0_oen, scl1_o, scl1_oen;",
    1,
  );
  normalized = replaceCount(
    normalized,
    "\twire sda, sda0_o, sda0_oen, sda1_o, sda1_oen;",
    "\ttri1 sda;\n\twire sda0_o, sda0_oen, sda1_o, sda1_oen;",
    1,
  );
  normalized = replaceCount(
    normalized,
    "\treg [7:0] q, qq;",
    "\treg [7:0] q, qq;\n\treg scl_stretch_low;",
    1,
  );
  normalized = replaceCount(
    normalized,
    [
      "\tdelay m0_scl (scl0_oen ? 1'bz : scl0_o, scl),",
      "\t      m1_scl (scl1_oen ? 1'bz : scl1_o, scl),",
      "\t      m0_sda (sda0_oen ? 1'bz : sda0_o, sda),",
      "\t      m1_sda (sda1_oen ? 1'bz : sda1_o, sda);",
      "",
      "\tpullup p1(scl); // pullup scl line",
      "\tpullup p2(sda); // pullup sda line",
    ].join("\n"),
    [
      "\tassign scl = scl0_oen ? 1'bz : scl0_o;",
      "\tassign scl = scl1_oen ? 1'bz : scl1_o;",
      "\tassign sda = sda0_oen ? 1'bz : sda0_o;",
      "\tassign sda = sda1_oen ? 1'bz : sda1_o;",
      "",
      "\ttb_checker u_checker (",
      "\t\t.clk(clk),",
      "\t\t.rstn(rstn),",
      "\t\t.scl0_o(scl0_o),",
      "\t\t.sda0_o(sda0_o),",
      "\t\t.scl1_o(scl1_o),",
      "\t\t.sda1_o(sda1_o)",
      "\t);",
      "",
      "\tassign scl = scl_stretch_low ? 1'b0 : 1'bz;",
      "",
      "\tinitial begin : bounded_watchdog",
      "\t\t#5000000;",
      '\t\t$fatal(1, "I2C baseline exceeded the bounded simulation window");',
      "\tend",
    ].join("\n"),
    1,
  );
  normalized = replaceCount(
    normalized,
    "\t      clk = 0;",
    "\t      clk = 0;\n\t      scl_stretch_low = 1'b0;",
    1,
  );
  normalized = replaceCount(
    normalized,
    ["while (scl) #1;", "force scl= 1'b0;", "#100000;", "release scl;"].join("\n"),
    ["while (scl) #1;", "scl_stretch_low = 1'b1;", "#100000;", "scl_stretch_low = 1'b0;"].join(
      "\n",
    ),
    1,
  );
  normalized = replaceCount(
    normalized,
    '$display("\\nERROR: Expected a5, received %x at time %t", qq, $time);',
    '$fatal(1, "Expected a5, received %x at time %t", qq, $time);',
    1,
  );
  normalized = replaceCount(
    normalized,
    '$display("\\nERROR: Expected 5a, received %x at time %t", qq, $time);',
    '$fatal(1, "Expected 5a, received %x at time %t", qq, $time);',
    1,
  );
  return replaceCount(
    normalized,
    '$display("\\nERROR: Expected NACK, received ACK\\n");',
    '$fatal(1, "Expected NACK, received ACK");',
    1,
  );
}

export function i2cCoverageCaseRef(
  lock: I2cCoverageDatasetLock = I2C_COVERAGE_DATASET_LOCK,
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

export class I2cCoverageFixtureProvider implements FixtureProvider {
  public constructor(
    private readonly baselineRoot: string,
    private readonly lock: I2cCoverageDatasetLock = I2C_COVERAGE_DATASET_LOCK,
  ) {}

  public describe(): Promise<DatasetDescriptor> {
    return Promise.resolve(
      DatasetDescriptorSchema.parse({
        schemaVersion: 1,
        datasetId: this.lock.datasetId,
        datasetVersion: this.lock.datasetVersion,
        datasetSourceDigest: this.lock.datasetSourceDigest,
        license: {
          name: "FreeCores I2C source-file license",
          reference: this.lock.sourceReference,
        },
        adapter: {
          adapterId: "freecores-i2c-coverage-provider",
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
    yield i2cCoverageCaseRef(this.lock);
  }

  private async validatedSources(): Promise<ReadonlyMap<string, Buffer>> {
    const scanned = await scanRegularFiles(path.resolve(this.baselineRoot)).catch(() => undefined);
    if (scanned === undefined) {
      throw new CoreLoopException("DATASET_NOT_CONFIGURED", "Locked I2C baseline is unavailable");
    }
    const expected = new Map<string, I2cCoverageDatasetLock["files"][number]>(
      this.lock.files.map((file) => [file.logicalPath, file] as const),
    );
    const scannedByPath = new Map<string, (typeof scanned)[number]>(
      scanned.map((file) => [file.logicalPath, file] as const),
    );
    const sources = new Map<string, Buffer>();
    for (const locked of expected.values()) {
      const file = scannedByPath.get(locked.logicalPath);
      if (
        file === undefined ||
        file.byteLength !== locked.byteLength ||
        file.contentDigest !== locked.contentDigest
      ) {
        throw new CoreLoopException(
          "DATASET_PROVENANCE_INVALID",
          "I2C baseline content does not match the lock",
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
    const expectedCase = i2cCoverageCaseRef(this.lock);
    const parsedCase = FixtureCaseRefSchema.parse(caseRef);
    if (JSON.stringify(parsedCase) !== JSON.stringify(expectedCase)) {
      throw new CoreLoopException("DATASET_CASE_NOT_FOUND", "Requested I2C case is not locked");
    }
    const sources = await this.validatedSources();
    const starter = path.join(destination, "starter");
    const dut = path.join(starter, "dut");
    await mkdir(dut, { recursive: true });
    const text = (logicalPath: string) => {
      const source = sources.get(logicalPath);
      if (source === undefined) throw new Error("validated I2C source is missing");
      return source.toString("utf8");
    };
    await Promise.all([
      writeFile(path.join(destination, "problem.md"), SPECIFICATION, { flag: "wx" }),
      writeFile(path.join(dut, "i2c_master_defines.v"), text("rtl/verilog/i2c_master_defines.v"), {
        flag: "wx",
      }),
      writeFile(
        path.join(dut, "i2c_master_bit_ctrl.v"),
        text("rtl/verilog/i2c_master_bit_ctrl.v"),
        { flag: "wx" },
      ),
      writeFile(
        path.join(dut, "i2c_master_byte_ctrl.v"),
        text("rtl/verilog/i2c_master_byte_ctrl.v"),
        { flag: "wx" },
      ),
      writeFile(
        path.join(dut, "i2c_master_top.v"),
        normalizeTop(text("rtl/verilog/i2c_master_top.v")),
        { flag: "wx" },
      ),
      writeFile(path.join(starter, "i2c_slave_model.v"), text("bench/verilog/i2c_slave_model.v"), {
        flag: "wx",
      }),
      writeFile(path.join(starter, "wb_master_model.v"), text("bench/verilog/wb_master_model.v"), {
        flag: "wx",
      }),
      writeFile(
        path.join(starter, "tb.sv"),
        normalizeTestbench(text("bench/verilog/tst_bench_top.v")),
        { flag: "wx" },
      ),
      writeFile(path.join(starter, "checker.sv"), CHECKER, { flag: "wx" }),
    ]);
    return FixtureMaterializationSchema.parse({
      schemaVersion: 1,
      fixtureId: expectedCase.fixtureId,
      identity: expectedCase.identity,
      caseSourceDigest: expectedCase.caseSourceDigest,
      category: "SEEDED_COMPILE_REPAIR",
      specPath: "problem.md",
      starterRtlRoot: "starter",
      topModule: "TopModule",
      tags: ["coverage-experiment", "freecores-i2c", "seeded-testbench"],
    });
  }
}
