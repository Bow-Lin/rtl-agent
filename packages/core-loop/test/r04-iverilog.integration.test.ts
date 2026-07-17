import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  EvaluationProfileSchema,
  IcarusCompileAdapter,
  compilerCapabilityLockFromCapability,
  evaluateCoreLoopBatch,
  icarusExecutableFromEnvironment,
} from "../src/index.js";
import {
  EvaluationTestProvider,
  ScriptedAgentAdapter,
  TEST_PROVIDER_IMPLEMENTATION_DIGEST,
  testEvaluationProfile,
} from "./evaluation-test-fixtures.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("R04 with the real fixed Icarus adapter", () => {
  it("runs seeded baseline, Agent edit, compile, and independent recompile", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "rtl-agent-r04-iverilog-integration-"));
    roots.push(root);
    const provider = new EvaluationTestProvider();
    const baseProfile = await testEvaluationProfile(provider, 1);
    const compilerAdapter = new IcarusCompileAdapter({
      executable: icarusExecutableFromEnvironment(process.env),
      probeWorkingDirectory: root,
    });
    const profile = EvaluationProfileSchema.parse({
      ...baseProfile,
      compilerCapability: compilerCapabilityLockFromCapability(await compilerAdapter.probe()),
    });

    const execution = await evaluateCoreLoopBatch({
      provider,
      providerImplementationDigest: TEST_PROVIDER_IMPLEMENTATION_DIGEST,
      profile,
      agentAdapter: new ScriptedAgentAdapter([
        {
          outcome: "RTL_CHANGED",
          source: "module dut(input logic a, output logic y); assign y = a; endmodule\n",
        },
      ]),
      compilerAdapter,
      batchesRoot: path.join(root, "batches"),
    });

    expect(execution.result).toMatchObject({
      status: "COMPLETED",
      runs: [
        {
          status: "COMPLETE",
          passAttempt: 1,
          finalResult: {
            outcome: "COMPILE_PASSED",
            authoritative: false,
            claim: "COMPILE_ONLY",
          },
        },
      ],
      metrics: {
        overall: {
          rawFirstAttempt: { numerator: 1, denominator: 1, value: 1 },
        },
      },
    });
  });
});
