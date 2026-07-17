import path from "node:path";

import { LogicalPathSchema, Sha256DigestSchema } from "@rtl-agent/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  FIXED_ICARUS_PROFILE,
  FIXED_ICARUS_TOOL_VERSION,
  IcarusCompileAdapter,
  ToolVersionSchema,
  captureOutput,
  createBaselineWorkspaceManifest,
  createManifestFromEntries,
} from "../src/index.js";
import type { CompilerProcessOptions, CompilerProcessResult, FileManifest } from "../src/index.js";
import { CASE_DIGEST } from "./fixtures.js";
import {
  createCompilerTestWorkspace,
  type CompilerTestWorkspace,
} from "./compiler-test-fixtures.js";

const workspaces = new Set<CompilerTestWorkspace>();

afterEach(async () => {
  await Promise.all(
    [...workspaces].map(async (workspace) => {
      await workspace.cleanup();
      workspaces.delete(workspace);
    }),
  );
});

function processResult(
  stdout = "",
  stderr = "",
  overrides: Partial<CompilerProcessResult> = {},
): CompilerProcessResult {
  return {
    exitCode: 0,
    signal: null,
    timedOut: false,
    terminationFailed: false,
    closeConfirmed: true,
    durationMs: 1,
    stdout: captureOutput(stdout, { limitBytes: 65_536 }),
    stderr: captureOutput(stderr, { limitBytes: 65_536 }),
    ...overrides,
  };
}

function probeResult(version: string = FIXED_ICARUS_TOOL_VERSION): CompilerProcessResult {
  return processResult(`${ToolVersionSchema.parse(version)}\n`);
}

async function setup(): Promise<{
  workspace: CompilerTestWorkspace;
  manifest: FileManifest;
}> {
  const workspace = await createCompilerTestWorkspace({
    "rtl/dut.sv": "module dut; endmodule\n",
  });
  workspaces.add(workspace);
  return {
    workspace,
    manifest: await createBaselineWorkspaceManifest(workspace.workspace.runDirectory),
  };
}

describe("fixed Icarus compile adapter", () => {
  it("uses the exact null-target argv and maps a clean close to COMPILE_PASSED", async () => {
    const { workspace } = await setup();
    const calls: CompilerProcessOptions[] = [];
    const runner = vi.fn(async (options: CompilerProcessOptions) => {
      calls.push(options);
      return calls.length === 1 ? probeResult() : processResult();
    });
    const adapter = new IcarusCompileAdapter(
      {
        executable: process.execPath,
        probeWorkingDirectory: workspace.root,
      },
      { processRunner: runner },
    );
    const result = await adapter.compile(await workspace.request(), workspace.workspace);
    expect(result.status).toBe("COMPILE_PASSED");
    expect(result.authoritative).toBe(false);
    expect(result.claim).toBe("COMPILE_ONLY");
    expect(calls[1]?.arguments.slice(0, 4)).toEqual(["-g2012", "-tnull", "-s", "dut"]);
    expect(calls[1]?.arguments).not.toContain("-o");
    expect(calls[1]?.cwd).toBe(workspace.workspace.runDirectory);
    expect(calls[1]?.environment).not.toBe(process.env);
  });

  it("rejects a workspace that is not structurally bound to the request run", async () => {
    const { workspace } = await setup();
    const adapter = new IcarusCompileAdapter({
      executable: process.execPath,
      probeWorkingDirectory: workspace.root,
    });
    const result = await adapter.compile(await workspace.request(), {
      ...workspace.workspace,
      workspaceDirectory: workspace.root,
    });
    expect(result).toMatchObject({
      status: "TOOL_ERROR",
      toolVersion: null,
      issues: [{ message: "COMPILE_REQUEST_BINDING_INVALID" }],
    });
  });

  it("separates explicit design errors from unknown nonzero tool failures", async () => {
    const { workspace } = await setup();
    const request = await workspace.request();
    for (const [stderr, expected] of [
      ["rtl/dut.sv:1: syntax error\n", "COMPILE_ERROR"],
      ["compiler returned an unknown failure\n", "TOOL_ERROR"],
      ["error: compiler configuration is unavailable\n", "TOOL_ERROR"],
      ["ivl: internal error\n", "TOOL_ERROR"],
    ] as const) {
      let call = 0;
      const adapter = new IcarusCompileAdapter(
        { executable: process.execPath, probeWorkingDirectory: workspace.root },
        {
          processRunner: async () =>
            call++ === 0 ? probeResult() : processResult("", stderr, { exitCode: 1 }),
        },
      );
      const result = await adapter.compile(request, workspace.workspace);
      expect(result.status).toBe(expected);
      if (expected === "COMPILE_ERROR") {
        expect(result.issues).toEqual([
          expect.objectContaining({ kind: "ERROR", path: "rtl/dut.sv", line: 1 }),
        ]);
      }
    }
  });

  it("fails closed for version drift, a missing executable, and unconfirmed termination", async () => {
    const { workspace } = await setup();
    const request = await workspace.request();
    const mismatch = new IcarusCompileAdapter(
      { executable: process.execPath, probeWorkingDirectory: workspace.root },
      { processRunner: async () => probeResult("Icarus Verilog version 99.0") },
    );
    const mismatchResult = await mismatch.compile(request, workspace.workspace);
    expect(mismatchResult).toMatchObject({
      status: "TOOL_ERROR",
      toolVersion: "Icarus Verilog version 99.0",
      issues: [{ message: "IVERILOG_VERSION_MISMATCH" }],
    });

    const missing = new IcarusCompileAdapter({
      executable: path.join(workspace.root, "missing.exe"),
      probeWorkingDirectory: workspace.root,
    });
    expect(await missing.compile(request, workspace.workspace)).toMatchObject({
      status: "TOOL_ERROR",
      toolVersion: null,
      issues: [{ message: "IVERILOG_EXECUTABLE_UNAVAILABLE" }],
    });

    let call = 0;
    const unconfirmed = new IcarusCompileAdapter(
      { executable: process.execPath, probeWorkingDirectory: workspace.root },
      {
        processRunner: async () =>
          call++ === 0
            ? probeResult()
            : processResult("", "", {
                timedOut: true,
                terminationFailed: true,
                closeConfirmed: false,
              }),
      },
    );
    expect(await unconfirmed.compile(request, workspace.workspace)).toMatchObject({
      status: "TOOL_ERROR",
      issues: [{ message: "IVERILOG_TERMINATION_UNCONFIRMED" }],
    });
  });

  it("fails closed for spawn, signal, zero-exit error, and adapter exceptions", async () => {
    const { workspace } = await setup();
    const request = await workspace.request();
    const cases: readonly [Partial<CompilerProcessResult> | "THROW", string][] = [
      [{ spawnError: "not persisted" }, "IVERILOG_COMPILE_SPAWN_FAILED"],
      [{ signal: "SIGTERM", exitCode: null }, "IVERILOG_SIGNAL_TERMINATION"],
      [
        {
          stderr: captureOutput("rtl/dut.sv:1: syntax error\n", {
            limitBytes: 65_536,
          }),
        },
        "IVERILOG_ZERO_EXIT_WITH_ERROR",
      ],
      ["THROW", "IVERILOG_ADAPTER_INTERNAL_FAILURE"],
    ];
    for (const [compileOutcome, expectedMessage] of cases) {
      let call = 0;
      const adapter = new IcarusCompileAdapter(
        { executable: process.execPath, probeWorkingDirectory: workspace.root },
        {
          processRunner: async () => {
            if (call++ === 0) return probeResult();
            if (compileOutcome === "THROW") throw new Error("private detail");
            return processResult("", "", compileOutcome);
          },
        },
      );
      expect(await adapter.compile(request, workspace.workspace)).toMatchObject({
        status: "TOOL_ERROR",
        issues: [{ message: expectedMessage }],
      });
    }
  });

  it("keeps warnings on successful zero-exit results", async () => {
    const { workspace } = await setup();
    let call = 0;
    const adapter = new IcarusCompileAdapter(
      { executable: process.execPath, probeWorkingDirectory: workspace.root },
      {
        processRunner: async () =>
          call++ === 0
            ? probeResult()
            : processResult("", "rtl/dut.sv:1: warning: synthetic warning\n"),
      },
    );
    const result = await adapter.compile(await workspace.request(), workspace.workspace);
    expect(result).toMatchObject({
      status: "COMPILE_PASSED",
      issues: [{ kind: "WARNING", path: "rtl/dut.sv", line: 1 }],
    });
  });

  it("preserves confirmed timeout priority but gives manifest drift higher priority", async () => {
    const { workspace, manifest } = await setup();
    const request = await workspace.request();
    let call = 0;
    const timeout = new IcarusCompileAdapter(
      { executable: process.execPath, probeWorkingDirectory: workspace.root },
      {
        processRunner: async () =>
          call++ === 0 ? probeResult() : processResult("", "", { timedOut: true, exitCode: 1 }),
      },
    );
    expect(await timeout.compile(request, workspace.workspace)).toMatchObject({
      status: "TIMEOUT",
      exitCode: null,
    });

    const changed = createManifestFromEntries([
      ...manifest.entries,
      {
        path: LogicalPathSchema.parse("workspace/rtl/changed.sv"),
        byteLength: 1,
        contentDigest: Sha256DigestSchema.parse(CASE_DIGEST),
      },
    ]);
    const manifests = [manifest, manifest, changed, changed];
    let manifestCall = 0;
    call = 0;
    const drift = new IcarusCompileAdapter(
      { executable: process.execPath, probeWorkingDirectory: workspace.root },
      {
        processRunner: async () =>
          call++ === 0 ? probeResult() : processResult("", "", { timedOut: true, exitCode: 1 }),
        manifestFactory: async () => manifests[manifestCall++]!,
      },
    );
    expect(await drift.compile(request, workspace.workspace)).toMatchObject({
      status: "TOOL_ERROR",
      issues: [{ message: "WORKSPACE_CHANGED_DURING_COMPILE" }],
    });
  });

  it("rejects a request-time source policy bypass before compile spawn", async () => {
    const workspace = await createCompilerTestWorkspace({
      "rtl/dut.sv": '`include "defs.svh"\nmodule dut; endmodule\n',
    });
    workspaces.add(workspace);
    let calls = 0;
    const adapter = new IcarusCompileAdapter(
      { executable: process.execPath, probeWorkingDirectory: workspace.root },
      {
        processRunner: async () => {
          calls += 1;
          return probeResult();
        },
      },
    );
    expect(await adapter.compile(await workspace.request(), workspace.workspace)).toMatchObject({
      status: "TOOL_ERROR",
      issues: [{ message: "UNSUPPORTED_INCLUDE_DIRECTIVE" }],
    });
    expect(calls).toBe(1);
  });

  it("locks the profile limits independently of a run request", () => {
    expect(FIXED_ICARUS_PROFILE).toMatchObject({
      compilerProfileId: "iverilog-systemverilog-2012-null-v1",
      argvPrefix: ["-g2012", "-tnull"],
      includePolicy: "forbidden",
      timeoutMs: 30_000,
    });
    expect(Object.isFrozen(FIXED_ICARUS_PROFILE)).toBe(true);
    expect(Object.isFrozen(FIXED_ICARUS_PROFILE.argvPrefix)).toBe(true);
    expect(Object.isFrozen(FIXED_ICARUS_PROFILE.environmentKeys.win32)).toBe(true);
  });
});
