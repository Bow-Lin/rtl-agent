import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { AgentAttemptInputSchema } from "../../packages/core-loop/dist/index.js";
import type { CoreLoopRun, RtlAgentAdapter } from "../../packages/core-loop/dist/index.js";
import { safeRead } from "./verification-memory.ts";
import { hash } from "./verification-frozen-adapter.ts";

// Same neutral workflow instruction in both treatment groups; contains no target answer.
export const IMPLEMENTATION_CHECK = [
  "## 检查实现核对",
  "",
  "对准备采用的验证策略，确认其适用条件、检查内容、采样窗口和判错依据，并对应到实际代码。",
  "对声称已经完成的关键检查，提供能够证明其执行的证据。",
  "基线已有的行为应明确标记，不重复声称新增；不适用或尚未执行的策略应说明状态，不能声称已完成。",
].join("\n");

/** Opt-in task addendum only. Does not edit DUT contract text, inputs, feedback or tools. */
export function withImplementationCheck(delegate: RtlAgentAdapter): RtlAgentAdapter {
  let originalSpec: Buffer | undefined;
  let preparedSpec: Buffer | undefined;
  let preparedRun: string | undefined;
  return {
    probe: () => delegate.probe(),
    async runTurn(raw: unknown, run: CoreLoopRun) {
      const input = AgentAttemptInputSchema.parse(raw);
      assert.equal(run.fixture.provenance.identity.caseId, "dpretet-depth8-width8");
      const current = await safeRead(run.workspaceDirectory, "spec.md");
      if (preparedSpec === undefined) {
        assert.equal(input.attempt, 2, "IMPLEMENTATION_CHECK_FIRST_ATTEMPT_REQUIRED");
        assert.ok(!current.includes(IMPLEMENTATION_CHECK), "DUPLICATE_IMPLEMENTATION_CHECK");
        originalSpec = current;
        preparedSpec = Buffer.concat([current, Buffer.from(`\n\n${IMPLEMENTATION_CHECK}\n`)]);
        preparedRun = run.runDirectory;
        await writeFile(path.join(run.workspaceDirectory, "spec.md"), preparedSpec);
      } else {
        assert.equal(preparedRun, run.runDirectory, "IMPLEMENTATION_CHECK_RUN_CHANGED");
        assert.deepEqual(current, preparedSpec, "IMPLEMENTATION_CHECK_SPEC_CHANGED");
      }
      await writeFile(
        path.join(run.runDirectory, "evidence", `implementation-check-${input.attempt}.json`),
        JSON.stringify(
          {
            schemaVersion: 1,
            attempt: input.attempt,
            placement: "spec.md append-only workflow instruction",
            originalSpecDigest: hash(originalSpec!),
            addendumDigest: hash(IMPLEMENTATION_CHECK),
            preparedSpecDigest: hash(preparedSpec),
            additionalModelTurns: 0,
          },
          null,
          2,
        ) + "\n",
        { flag: "wx" },
      );
      const result = await delegate.runTurn(input, run);
      assert.deepEqual(
        await readFile(path.join(run.workspaceDirectory, "spec.md")),
        preparedSpec,
        "IMPLEMENTATION_CHECK_SPEC_CHANGED",
      );
      return result;
    },
  };
}
