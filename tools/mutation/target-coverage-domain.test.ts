import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  readTargetCoverageDomainSignature,
  targetCoverageDomainSignature,
} from "./target-coverage-domain.ts";

const sources = ["rtl/dut/async_fifo.v"];
function point(overrides: Record<string, string> = {}, hits = 0): string {
  const metadata = {
    f: sources[0]!,
    l: "14",
    n: "33",
    t: "toggle",
    page: "v_toggle/async_fifo__A3",
    o: "wclk:0->1",
    h: "tb.dut.dut_core",
    ...overrides,
  };
  return `C '${Object.entries(metadata)
    .map(([key, value]) => `\x01${key}\x02${value}`)
    .join("")}' ${String(hits)}`;
}
const raw = (...points: string[]) => `# SystemC::Coverage-3\n${points.join("\n")}\n`;

test("coverage point identity ignores hits and record/metadata order", () => {
  const first = raw(point(), point({ o: "wclk:1->0" }, 3));
  const reordered = point({}, 99).replace(
    "\x01f\x02rtl/dut/async_fifo.v\x01l\x0214",
    "\x01l\x0214\x01f\x02rtl/dut/async_fifo.v",
  );
  const second = raw(point({ o: "wclk:1->0" }, 700), reordered);
  assert.equal(
    targetCoverageDomainSignature(first, sources),
    targetCoverageDomainSignature(second, sources),
  );
});

test("same-count point substitution, hierarchy, specialization and duplicates change domain", () => {
  const baseline = targetCoverageDomainSignature(raw(point()), sources);
  for (const changed of [
    point({ o: "wclk:1->0" }),
    point({ h: "tb.dut2.dut_core" }),
    point({ page: "v_toggle/async_fifo__F_FALSE" }),
    point({ l: "15" }),
  ]) {
    assert.notEqual(targetCoverageDomainSignature(raw(changed), sources), baseline);
  }
  assert.notEqual(targetCoverageDomainSignature(raw(point(), point()), sources), baseline);
});

test("source separators normalize while non-DUT checker points are excluded", () => {
  const baseline = targetCoverageDomainSignature(raw(point()), sources);
  const windows = raw(
    point({ f: "rtl\\dut\\async_fifo.v" }, 10),
    point({ f: "rtl\\checker.sv", h: "tb.checker_i" }),
  );
  assert.equal(targetCoverageDomainSignature(windows.replaceAll("\n", "\r\n"), sources), baseline);
  assert.equal(targetCoverageDomainSignature(raw(point()), ["rtl\\dut\\async_fifo.v"]), baseline);
});

test("empty, malformed and ambiguous domains fail closed", () => {
  assert.throws(() => targetCoverageDomainSignature(raw(point()), []), /EMPTY_SOURCE_ALLOWLIST/);
  assert.throws(
    () => targetCoverageDomainSignature(raw(point({ f: "rtl/checker.sv" })), sources),
    /NO_DUT_POINTS/,
  );
  assert.throws(
    () => targetCoverageDomainSignature("# SystemC::Coverage-3\n", sources),
    /NO_DUT_POINTS/,
  );
  assert.throws(
    () => targetCoverageDomainSignature(raw(point()).replace("' 0", "' invalid"), sources),
    /INVALID_RECORD/,
  );
  assert.throws(
    () => targetCoverageDomainSignature(raw(point()).replace("\x01l", "\x01f"), sources),
    /INVALID_METADATA/,
  );
  assert.throws(
    () => targetCoverageDomainSignature(raw(point()), [...sources, "rtl/dut/Async_fifo.v"]),
    /AMBIGUOUS_SOURCE_PATH/,
  );
  for (const source of [
    "../rtl/dut/async_fifo.v",
    "C:/rtl/dut/async_fifo.v",
    "/rtl/dut/async_fifo.v",
  ]) {
    assert.throws(
      () => targetCoverageDomainSignature(raw(point({ f: source })), sources),
      /INVALID_SOURCE_PATH/,
    );
  }
});

test("round evidence helper rejects invalid numeric path components", async () => {
  for (const [round, attempt] of [
    [0, 0],
    [1, -1],
    [1.5, 0],
    [1, Number.NaN],
  ]) {
    await assert.rejects(
      readTargetCoverageDomainSignature("unused", round!, attempt!, sources),
      /INVALID_ROUND/,
    );
  }
});

test("observed dpretet first attempt retains baseline domain and drift final changes it", async (t) => {
  const run = path.join(
    process.cwd(),
    ".rtl-agent",
    "fifo-target-runs",
    "fifo-target-20260917-1120-dpretet-r1-off",
    "dpretet-depth8-width8",
    "run_20260917-111914-372",
  );
  const baselinePath = path.join(run, "evidence", "coverage", "round-1-attempt-0", "coverage.dat");
  try {
    await readFile(baselinePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    t.skip("Historical diagnostic artifacts are optional outside the experiment host");
    return;
  }
  const allSources = [
    "async_fifo.v",
    "fifomem.v",
    "rptr_empty.v",
    "sync_r2w.v",
    "sync_w2r.v",
    "wptr_full.v",
  ].map((file) => `rtl/dut/${file}`);
  const baseline = await readTargetCoverageDomainSignature(run, 1, 0, allSources);
  assert.equal(await readTargetCoverageDomainSignature(run, 2, 2, allSources), baseline);
  assert.notEqual(await readTargetCoverageDomainSignature(run, 3, 3, allSources), baseline);
});
