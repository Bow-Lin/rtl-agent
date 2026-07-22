import path from "node:path";

import { describe, expect, it } from "vitest";

import { parseCompilerDiagnostics } from "../src/index.js";

describe("Icarus diagnostic projection", () => {
  it("maps source locations without leaking unrelated host paths", () => {
    const workspace = path.resolve("synthetic-workspace");
    const hostPath = path.join(workspace, "rtl", "dut.sv");
    const external = process.platform === "win32" ? "C:\\secret\\other.sv" : "/secret/other.sv";
    const parsed = parseCompilerDiagnostics(
      `${hostPath}:12:3: error: unable to bind ${external}\n`,
      "",
      workspace,
      [{ logicalPath: "rtl/dut.sv", hostPath }],
      10,
      256,
    );
    expect(parsed.hasDesignError).toBe(true);
    expect(parsed.issues).toEqual([
      {
        kind: "ERROR",
        message: "error: unable to bind <host-path>",
        path: "rtl/dut.sv",
        line: 12,
        column: 3,
      },
    ]);
  });

  it("omits unsafe numeric locations and enforces stream precedence and issue limits", () => {
    const parsed = parseCompilerDiagnostics(
      "rtl/dut.sv:999999999999999999999: error: stderr first\n",
      "rtl/dut.sv:2: warning: stdout second\n",
      path.resolve("workspace"),
      [],
      1,
      64,
    );
    expect(parsed.issues).toEqual([
      {
        kind: "ERROR",
        message: "error: stderr first",
      },
    ]);
  });

  it("classifies an error attached to a workspace RTL source as a design error", () => {
    const workspace = path.resolve("synthetic-workspace");
    const hostPath = path.join(workspace, "rtl", "TopModule.sv");
    const parsed = parseCompilerDiagnostics(
      `${hostPath}:8: error: pos is not a valid l-value in TopModule.\n`,
      "",
      workspace,
      [{ logicalPath: "rtl/TopModule.sv", hostPath }],
      10,
      256,
    );

    expect(parsed.hasDesignError).toBe(true);
    expect(parsed.hasInternalError).toBe(false);
    expect(parsed.issues).toEqual([
      {
        kind: "ERROR",
        message: "error: pos is not a valid l-value in TopModule.",
        path: "rtl/TopModule.sv",
        line: 8,
      },
    ]);
  });
});
