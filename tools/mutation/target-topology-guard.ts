import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import {
  AgentAttemptInputSchema,
  projectCoverageLock,
} from "../../packages/core-loop/dist/index.js";
import type {
  RtlAgentAdapter,
  CoreLoopRun,
  CoverageRoundRunner,
} from "../../packages/core-loop/dist/index.js";
import { DPRETET_TB, AXIS_TB } from "../../packages/core-loop/src/target-fifo-coverage-assets.ts";
import { safeRead } from "./verification-memory.ts";
import { hash } from "./verification-frozen-adapter.ts";
import { readTargetCoverageDomainSignature } from "./target-coverage-domain.ts";

type Target = "dpretet" | "axis";
// Deliberately bounded lexical contract, not a general SystemVerilog parser. Preserve the
// seed's module prefix through the complete DUT declaration, leaving stimulus tasks editable.
function tokens(source: string): string[] {
  assert.ok(source.length <= 1_048_576, "TARGET_SOURCE_TOO_LARGE");
  const lexer =
    /\s+|\/\/[^\n\r]*|\/\*[\s\S]*?\*\/|"(?:\\[^\r\n]|[^"\\\r\n])*"|[a-zA-Z_$][a-zA-Z0-9_$]*|[0-9]+|[^\s]/gy;
  const result: string[] = [];
  let at = 0;
  while (at < source.length) {
    lexer.lastIndex = at;
    const m = lexer.exec(source);
    assert.ok(m && m.index === at, "TARGET_LEXICAL_ERROR");
    const value = m[0];
    assert.ok(!(source.startsWith("/*", at) && !value.endsWith("*/")), "TARGET_UNCLOSED_COMMENT");
    assert.ok(!(source[at] === '"' && value.length === 1), "TARGET_UNCLOSED_STRING");
    if (!/^\s|^\/\/|^\/\*/.test(value)) result.push(value);
    at = lexer.lastIndex;
  }
  return result;
}
function prefix(target: Target) {
  const seed = tokens(target === "dpretet" ? DPRETET_TB : AXIS_TB);
  const at = seed.indexOf("TopModule");
  assert.ok(at >= 0);
  const end = seed.indexOf(";", at);
  assert.ok(end > at);
  return seed.slice(0, end + 1);
}
export function validateTargetTopology(target: Target, tb: string, checker: string) {
  const a = tokens(tb),
    b = tokens(checker);
  const expected = prefix(target);
  assert.deepEqual(a.slice(0, expected.length), expected, "TARGET_DUT_PREFIX_CHANGED");
  assert.equal(a.filter((t) => t === "TopModule").length, 1, "TARGET_EXTRA_DUT_INSTANCE");
  assert.ok(!b.includes("TopModule"), "TARGET_CHECKER_DUT_INSTANCE");
  assert.equal(a.filter((t) => t === "module").length, 1, "TARGET_EXTRA_TB_MODULE");
  assert.equal(b.filter((t) => t === "module").length, 1, "TARGET_EXTRA_CHECKER_MODULE");
  assert.equal(a.filter((t) => t === "tb").length, 1, "TARGET_RECURSIVE_TB");
  assert.ok(!b.includes("tb"), "TARGET_CHECKER_TB_INSTANCE");
  assert.equal(a.filter((t) => t === "`").length, 1, "TARGET_PREPROCESSOR_CHANGED");
  assert.ok(!b.includes("`"), "TARGET_CHECKER_PREPROCESSOR");
  const forbidden = new Set([
    "defparam",
    "config",
    "bind",
    "force",
    "release",
    "\\",
    "async_fifo",
    "axis_fifo",
    "fifomem",
    "rptr_empty",
    "wptr_full",
    "sync_r2w",
    "sync_w2r",
  ]);
  assert.ok(![...a, ...b].some((t) => forbidden.has(t)), "TARGET_DUT_BYPASS");
  return {
    target,
    version: "seeded-prefix-v1",
    topologyDigest: hash(JSON.stringify(expected)),
    tbDigest: hash(tb),
    checkerDigest: hash(checker),
  };
}
async function validateRun(target: Target, run: CoreLoopRun) {
  const tb = await safeRead(run.workspaceDirectory, "rtl/tb.sv");
  const checker = await safeRead(run.workspaceDirectory, "rtl/checker.sv");
  return validateTargetTopology(target, tb.toString(), checker.toString());
}
export function withTargetTopology(delegate: RtlAgentAdapter, target: Target): RtlAgentAdapter {
  return {
    probe: () => delegate.probe(),
    async runTurn(raw: unknown, run: CoreLoopRun) {
      const input = AgentAttemptInputSchema.parse(raw);
      await validateRun(target, run);
      const turn = await delegate.runTurn(input, run);
      let audit;
      try {
        audit = { status: "passed", ...(await validateRun(target, run)) };
      } catch (error) {
        await writeFile(
          path.join(run.runDirectory, "evidence", `target-topology-${input.attempt}.json`),
          JSON.stringify({ status: "failed", code: "TARGET_TOPOLOGY_CHANGED", target }),
          { flag: "wx" },
        );
        throw new Error("TARGET_TOPOLOGY_CHANGED", { cause: error });
      }
      await writeFile(
        path.join(run.runDirectory, "evidence", `target-topology-${input.attempt}.json`),
        JSON.stringify(audit, null, 2),
        { flag: "wx" },
      );
      return turn;
    },
  };
}
export function withTargetCoverageBoundary(
  delegate: CoverageRoundRunner,
  target: Target,
): CoverageRoundRunner {
  let baseline: number[] | undefined;
  let baselineDomain: string | undefined;
  return {
    async runRound(run, round, attempt) {
      await validateRun(target, run);
      const feedback = await delegate.runRound(run, round, attempt);
      const denominator = [feedback.line.found, feedback.branch.found, feedback.toggle?.found ?? 0];
      let domain: string;
      try {
        domain = await readTargetCoverageDomainSignature(
          run.runDirectory,
          round,
          attempt ?? round,
          projectCoverageLock(target).dutSourcePaths,
        );
      } catch (error) {
        await writeFile(
          path.join(run.runDirectory, "evidence", `target-coverage-scope-${round}.json`),
          JSON.stringify({
            target,
            round,
            status: "failed",
            reason: "TARGET_COVERAGE_DOMAIN_INVALID",
          }),
          { flag: "wx" },
        );
        throw new Error("TARGET_COVERAGE_DOMAIN_INVALID", { cause: error });
      }
      if (round === 1) {
        assert.equal(baseline, undefined, "TARGET_BASELINE_REUSED");
        baseline = denominator;
        baselineDomain = domain;
      }
      const matches =
        JSON.stringify(denominator) === JSON.stringify(baseline) && domain === baselineDomain;
      await writeFile(
        path.join(run.runDirectory, "evidence", `target-coverage-scope-${round}.json`),
        JSON.stringify({
          target,
          round,
          denominator,
          baseline,
          domain,
          baselineDomain,
          status: matches ? "passed" : "failed",
        }),
        { flag: "wx" },
      );
      assert.ok(matches, "TARGET_COVERAGE_SCOPE_CHANGED");
      return feedback;
    },
  };
}
