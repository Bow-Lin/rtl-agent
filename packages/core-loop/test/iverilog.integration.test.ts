import { readdir } from "node:fs/promises";

import { afterEach, describe, expect, it } from "vitest";

import {
  FIXED_ICARUS_PROFILE_ID,
  IcarusCompileAdapter,
  icarusExecutableFromEnvironment,
} from "../src/index.js";
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

async function compile(sources: Readonly<Record<string, string>>, topModule = "dut") {
  const workspace = await createCompilerTestWorkspace(sources);
  workspaces.add(workspace);
  const adapter = new IcarusCompileAdapter({
    executable: icarusExecutableFromEnvironment(process.env),
    probeWorkingDirectory: workspace.root,
  });
  const request = await workspace.request(topModule);
  return {
    workspace,
    request,
    adapter,
    result: await adapter.compile(request, workspace.workspace),
  };
}

describe("real fixed Icarus profile", () => {
  it("passes ordered multi-file elaboration with the null target and reruns deterministically", async () => {
    const before = await compile({
      "rtl/child.sv": "module child(input logic a, output logic y); assign y = a; endmodule\n",
      "rtl/dut.sv":
        "module dut(input logic a, output logic y); child u_child(.a(a), .y(y)); endmodule\n",
    });
    expect(before.result).toMatchObject({
      status: "COMPILE_PASSED",
      compilerProfileId: FIXED_ICARUS_PROFILE_ID,
      authoritative: false,
      claim: "COMPILE_ONLY",
      exitCode: 0,
    });
    const rerun = await before.adapter.compile(before.request, before.workspace.workspace);
    expect(rerun).toMatchObject({
      status: before.result.status,
      toolVersion: before.result.toolVersion,
      workspaceManifestDigest: before.result.workspaceManifestDigest,
    });
    expect(await readdir(before.workspace.workspace.runDirectory)).toEqual(["workspace"]);
  });

  it.each([
    ["syntax error", { "rtl/dut.sv": "module dut( endmodule\n" }, "dut"],
    ["missing top", { "rtl/other.sv": "module other; endmodule\n" }, "dut"],
    ["blank source", { "rtl/dut.sv": "\n" }, "dut"],
    [
      "elaboration error",
      { "rtl/dut.sv": "module dut; missing_module instance(); endmodule\n" },
      "dut",
    ],
    [
      "procedural assignment to an implicit wire",
      {
        "rtl/dut.sv": "module dut(input logic in, output out); always_comb out = in; endmodule\n",
      },
      "dut",
    ],
  ] as const)("classifies %s as a repairable compile error", async (_label, sources, top) => {
    const { result } = await compile(sources, top);
    expect(result.status).toBe("COMPILE_ERROR");
    expect(result.exitCode).not.toBe(0);
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "ERROR" })]),
    );
  });
});
