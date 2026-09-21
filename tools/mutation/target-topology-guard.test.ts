import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { validateTargetTopology, withTargetCoverageBoundary } from "./target-topology-guard.ts";
import {
  DPRETET_TB,
  DPRETET_CHECKER,
  AXIS_TB,
  AXIS_CHECKER,
} from "../../packages/core-loop/src/target-fifo-coverage-assets.ts";
import type { CoreLoopRun, CoverageFeedback } from "../../packages/core-loop/dist/index.js";

test("both seeds and ordinary stimulus edits retain fixed DUT topology", () => {
  validateTargetTopology("dpretet", DPRETET_TB, DPRETET_CHECKER);
  validateTargetTopology("axis", AXIS_TB, AXIS_CHECKER);
  validateTargetTopology(
    "dpretet",
    DPRETET_TB.replace("put(8'hab)", "put(8'hff)").replace(
      "TopModule #",
      "/* extra comment */ TopModule  #",
    ),
    DPRETET_CHECKER,
  );
});

test("rejects parameter changes, extra instances, raw DUTs and generate wrappers", () => {
  assert.throws(
    () =>
      validateTargetTopology(
        "dpretet",
        DPRETET_TB.replace('.FALLTHROUGH("TRUE")', '.FALLTHROUGH("FALSE")'),
        DPRETET_CHECKER,
      ),
    /TARGET_DUT_PREFIX_CHANGED/,
  );
  for (const extra of [
    "TopModule extra();",
    "async_fifo extra();",
    "defparam dut.ASIZE = 4;",
    '`include "extra.sv"',
    "bind tb TopModule extra();",
    "module extra; endmodule",
  ]) {
    assert.throws(
      () =>
        validateTargetTopology(
          "dpretet",
          DPRETET_TB.replace("endmodule", extra + "\nendmodule"),
          DPRETET_CHECKER,
        ),
      /TARGET_/,
    );
  }
  assert.throws(
    () =>
      validateTargetTopology(
        "dpretet",
        DPRETET_TB.replace("TopModule #", "for(genvar n=0;n<2;n++) begin TopModule #"),
        DPRETET_CHECKER,
      ),
    /TARGET_DUT_PREFIX_CHANGED/,
  );
  assert.throws(
    () =>
      validateTargetTopology(
        "dpretet",
        DPRETET_TB,
        DPRETET_CHECKER.replace("endmodule", "TopModule hidden(); endmodule"),
      ),
    /TARGET_CHECKER_DUT_INSTANCE/,
  );
  assert.throws(
    () =>
      validateTargetTopology(
        "axis",
        AXIS_TB.replace("endmodule", "tb hidden(); endmodule"),
        AXIS_CHECKER,
      ),
    /TARGET_RECURSIVE_TB/,
  );
});

test("rejects observed failed-campaign second configuration while preserving clean first snapshot", async () => {
  const root = path.join(
    process.cwd(),
    ".rtl-agent",
    "fifo-target-runs",
    "fifo-target-20260917-1120-dpretet-r1-off",
    "dpretet-depth8-width8",
    "run_20260917-111914-372",
    "evidence",
    "verification-assets",
  );
  for (const attempt of [2, 3]) {
    const dir = path.join(root, `attempt-${attempt}`, "rtl");
    const tb = await readFile(path.join(dir, "tb.sv"), "utf8");
    const checker = await readFile(path.join(dir, "checker.sv"), "utf8");
    if (attempt === 2) validateTargetTopology("dpretet", tb, checker);
    else
      assert.throws(
        () => validateTargetTopology("dpretet", tb, checker),
        /TARGET_EXTRA_DUT_INSTANCE/,
      );
  }
});

test("coverage boundary rejects changed elaboration denominator", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "target-scope-"));
  try {
    await mkdir(path.join(root, "rtl"));
    await mkdir(path.join(root, "evidence"));
    await writeFile(path.join(root, "rtl", "tb.sv"), DPRETET_TB);
    await writeFile(path.join(root, "rtl", "checker.sv"), DPRETET_CHECKER);
    const run = { workspaceDirectory: root, runDirectory: root } as unknown as CoreLoopRun;
    const guard = withTargetCoverageBoundary(
      {
        async runRound(_run, round) {
          const coverage = path.join(
            root,
            "evidence",
            "coverage",
            `round-${round}-attempt-${round === 1 ? 0 : 2}`,
          );
          if (round < 3) {
            await mkdir(coverage, { recursive: true });
            await writeFile(
              path.join(coverage, "coverage.dat"),
              "C '\x01f\x02rtl/dut/async_fifo.v\x01t\x0220\x01o\x02wdata[7]\x01h\x02tb.dut' 1\n",
            );
          }
          return {
            line: { found: round === 1 ? 7 : 8 },
            branch: { found: 0 },
            toggle: { found: round === 1 ? 486 : 780 },
          } as CoverageFeedback;
        },
      },
      "dpretet",
    );
    await guard.runRound(run, 1, 0);
    await assert.rejects(guard.runRound(run, 2, 2), /TARGET_COVERAGE_SCOPE_CHANGED/);
    await assert.rejects(guard.runRound(run, 3, 3), /TARGET_COVERAGE_DOMAIN_INVALID/);
    const missingAudit = JSON.parse(
      await readFile(path.join(root, "evidence", "target-coverage-scope-3.json"), "utf8"),
    );
    assert.equal(missingAudit.status, "failed");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
