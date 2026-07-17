import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  CompleteRunExecutionResultSchema,
  compilerCapabilityLockFromCapability,
  executeValidatedCoreLoopRun,
  validateCoreLoopRunBaseline,
} from "../src/index.js";
import {
  EvaluationTestProvider,
  ScriptedAgentAdapter,
  ScriptedCompilerAdapter,
  TEST_AGENT_CAPABILITY,
  TEST_COMPILER_CAPABILITY,
  createEvaluationTestRun,
} from "./evaluation-test-fixtures.js";

const roots: string[] = [];

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "rtl-agent-r04-run-test-"));
  roots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function validatedRun(
  root: string,
  compiler: ScriptedCompilerAdapter,
  maximumAttempts = 3,
  blank = false,
) {
  const provider = new EvaluationTestProvider([
    {
      caseId: "case/001",
      fixtureId: "case-001",
      category: blank ? "BLANK_GENERATION" : "SEEDED_COMPILE_REPAIR",
    },
  ]);
  const run = await createEvaluationTestRun(root, provider, maximumAttempts);
  const validated = await validateCoreLoopRunBaseline(run, {
    caseIndex: 0,
    compilerAdapter: compiler,
    lockedCompilerCapability: compilerCapabilityLockFromCapability(TEST_COMPILER_CAPABILITY),
  });
  return { provider, run, validated };
}

function executionOptions(agent: ScriptedAgentAdapter, compiler: ScriptedCompilerAdapter) {
  return {
    agentAdapter: agent,
    compilerAdapter: compiler,
    lockedAgentCapability: TEST_AGENT_CAPABILITY,
    lockedCompilerCapability: compilerCapabilityLockFromCapability(TEST_COMPILER_CAPABILITY),
  };
}

describe("bounded Core Loop run orchestration", () => {
  it("repairs only after COMPILE_ERROR and independently recompiles the final pass", async () => {
    const root = await temporaryRoot();
    const compiler = new ScriptedCompilerAdapter([
      "COMPILE_ERROR",
      "COMPILE_ERROR",
      "COMPILE_PASSED",
      "COMPILE_PASSED",
    ]);
    const { run, validated } = await validatedRun(root, compiler);
    const agent = new ScriptedAgentAdapter([
      {
        outcome: "RTL_CHANGED",
        source: "module dut(input logic a, output logic y); BROKEN endmodule\n",
      },
      {
        outcome: "RTL_CHANGED",
        source: "module dut(input logic a, output logic y); assign y = a; endmodule\n",
      },
    ]);

    const result = await executeValidatedCoreLoopRun(validated, executionOptions(agent, compiler));

    expect(result).toMatchObject({
      status: "COMPLETE",
      attemptCount: 2,
      passAttempt: 2,
      finalResult: { outcome: "COMPILE_PASSED", attemptCount: 2 },
    });
    expect(compiler.requests.map((request) => request.attempt)).toEqual([0, 1, 2, 2]);
    expect(agent.inputs).toHaveLength(2);
    expect(agent.inputs[0]!.previousCompileResultPath).toBe("context/previous-compile-result.json");
    expect(agent.inputs[1]!.previousCompileResultPath).toBe("context/previous-compile-result.json");
    expect(
      CompleteRunExecutionResultSchema.safeParse({
        ...result,
        compileObservations:
          result.status === "COMPLETE"
            ? result.compileObservations.filter(
                (observation) => observation.phase !== "FINAL_RECOMPILE",
              )
            : [],
      }).success,
    ).toBe(false);
    await expect(
      readFile(
        path.join(run.runDirectory, "evidence", "attempts", "2", "final-recompile", "result.json"),
        "utf8",
      ),
    ).resolves.toContain("COMPILE_PASSED");
    await expect(
      access(path.join(run.runDirectory, "evidence", "attempts", "1", "agent-output.jsonl")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("treats maxAttempts as total Agent turns without an off-by-one repair", async () => {
    const root = await temporaryRoot();
    const compiler = new ScriptedCompilerAdapter(["COMPILE_ERROR", "COMPILE_ERROR"]);
    const { validated } = await validatedRun(root, compiler, 1);
    const agent = new ScriptedAgentAdapter([
      { outcome: "RTL_CHANGED", source: "module dut; BROKEN endmodule\n" },
    ]);

    const result = await executeValidatedCoreLoopRun(validated, executionOptions(agent, compiler));

    expect(result).toMatchObject({
      status: "COMPLETE",
      attemptCount: 1,
      finalResult: { outcome: "MAX_ATTEMPTS" },
    });
    expect(agent.inputs).toHaveLength(1);
    expect(compiler.requests.map((request) => request.attempt)).toEqual([0, 1]);
  });

  it.each([
    ["NO_RTL_CHANGE", "NO_RTL_CHANGE"],
    ["AGENT_PROCESS_ERROR", "AGENT_FAILED"],
    ["AGENT_TIMEOUT", "TIMEOUT"],
    ["POLICY_VIOLATION", "POLICY_VIOLATION"],
  ] as const)(
    "maps Agent %s without invoking the attempt compiler",
    async (outcome, finalOutcome) => {
      const root = await temporaryRoot();
      const compiler = new ScriptedCompilerAdapter(["COMPILE_ERROR"]);
      const { validated } = await validatedRun(root, compiler);
      const agent = new ScriptedAgentAdapter([{ outcome }]);

      const result = await executeValidatedCoreLoopRun(
        validated,
        executionOptions(agent, compiler),
      );

      expect(result).toMatchObject({
        status: "COMPLETE",
        attemptCount: 1,
        finalResult: { outcome: finalOutcome },
      });
      expect(compiler.requests).toHaveLength(1);
    },
  );

  it.each([
    ["TIMEOUT", "TIMEOUT", "EVALUATION_VALID"],
    ["TOOL_ERROR", "TOOL_ERROR", "INFRASTRUCTURE_INVALID"],
  ] as const)("stops after attempt compiler %s", async (compileStatus, outcome, validity) => {
    const root = await temporaryRoot();
    const compiler = new ScriptedCompilerAdapter(["COMPILE_ERROR", compileStatus]);
    const { validated } = await validatedRun(root, compiler);
    const agent = new ScriptedAgentAdapter([
      {
        outcome: "RTL_CHANGED",
        source: "module dut(input logic a, output logic y); assign y = a; endmodule\n",
      },
    ]);

    const result = await executeValidatedCoreLoopRun(validated, executionOptions(agent, compiler));

    expect(result).toMatchObject({
      status: "COMPLETE",
      evaluationValidity: validity,
      finalResult: { outcome },
    });
    expect(agent.inputs).toHaveLength(1);
  });

  it("classifies a pass/error final recompile as infrastructure-invalid TOOL_ERROR", async () => {
    const root = await temporaryRoot();
    const compiler = new ScriptedCompilerAdapter([
      "COMPILE_ERROR",
      "COMPILE_PASSED",
      "COMPILE_ERROR",
    ]);
    const { validated } = await validatedRun(root, compiler);
    const agent = new ScriptedAgentAdapter([
      {
        outcome: "RTL_CHANGED",
        source: "module dut(input logic a, output logic y); assign y = a; endmodule\n",
      },
    ]);

    const result = await executeValidatedCoreLoopRun(validated, executionOptions(agent, compiler));

    expect(result).toMatchObject({
      status: "COMPLETE",
      evaluationValidity: "INFRASTRUCTURE_INVALID",
      failureStage: "FINAL_RECOMPILE",
      passAttempt: null,
      finalResult: { outcome: "TOOL_ERROR" },
    });
  });

  it("writes preparation but no CompileResult when Agent leaves no source", async () => {
    const root = await temporaryRoot();
    const compiler = new ScriptedCompilerAdapter(["COMPILE_ERROR"]);
    const { run, validated } = await validatedRun(root, compiler);
    const agent = new ScriptedAgentAdapter([{ outcome: "RTL_CHANGED", source: null }]);

    const result = await executeValidatedCoreLoopRun(validated, executionOptions(agent, compiler));

    expect(result).toMatchObject({
      status: "COMPLETE",
      finalResult: { outcome: "AGENT_FAILED" },
    });
    await expect(
      readFile(
        path.join(run.runDirectory, "evidence", "attempts", "1", "compile", "preparation.json"),
        "utf8",
      ),
    ).resolves.toContain("NO_RTL_SOURCE");
    await expect(
      access(path.join(run.runDirectory, "evidence", "attempts", "1", "compile", "result.json")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("fails closed on per-turn capability drift before compile", async () => {
    const root = await temporaryRoot();
    const compiler = new ScriptedCompilerAdapter(["COMPILE_ERROR"]);
    const { validated } = await validatedRun(root, compiler);
    const agent = new ScriptedAgentAdapter([
      {
        outcome: "RTL_CHANGED",
        source: "module dut; endmodule\n",
        driftCapability: true,
      },
    ]);

    const result = await executeValidatedCoreLoopRun(validated, executionOptions(agent, compiler));

    expect(result).toMatchObject({
      status: "COMPLETE",
      evaluationValidity: "INFRASTRUCTURE_INVALID",
      finalResult: { outcome: "TOOL_ERROR" },
    });
    expect(compiler.requests).toHaveLength(1);
  });

  it("leaves the run incomplete when required evidence already exists", async () => {
    const root = await temporaryRoot();
    const compiler = new ScriptedCompilerAdapter(["COMPILE_ERROR"]);
    const { run, validated } = await validatedRun(root, compiler);
    const target = path.join(run.runDirectory, "evidence", "attempts", "1", "agent-input.json");
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, "{}\n");
    const agent = new ScriptedAgentAdapter([{ outcome: "NO_RTL_CHANGE" }]);

    const result = await executeValidatedCoreLoopRun(validated, executionOptions(agent, compiler));

    expect(result).toMatchObject({
      status: "INCOMPLETE",
      failureStage: "EVIDENCE_WRITE",
    });
    await expect(
      access(path.join(run.runDirectory, "evidence", "final-result.json")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("accepts the expected blank baseline without invoking attempt zero", async () => {
    const root = await temporaryRoot();
    const compiler = new ScriptedCompilerAdapter(["COMPILE_PASSED", "COMPILE_PASSED"]);
    const { validated } = await validatedRun(root, compiler, 1, true);
    const agent = new ScriptedAgentAdapter([
      {
        outcome: "RTL_CHANGED",
        source: "module dut(input logic a, output logic y); assign y = a; endmodule\n",
      },
    ]);

    const result = await executeValidatedCoreLoopRun(validated, executionOptions(agent, compiler));

    expect(validated.validation.status).toBe("VALID");
    expect(result).toMatchObject({
      status: "COMPLETE",
      passAttempt: 1,
      finalResult: { outcome: "COMPILE_PASSED" },
    });
    expect(agent.inputs[0]!.previousCompileResultPath).toBeUndefined();
    expect(compiler.requests.map((request) => request.attempt)).toEqual([1, 1]);
  });
});
