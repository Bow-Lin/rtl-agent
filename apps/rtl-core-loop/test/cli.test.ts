import { describe, expect, it } from "vitest";

import { runRtlCoreLoopCli } from "../src/index.js";

describe("rtl-core-loop CLI boundary", () => {
  it("reports the stable missing-dataset diagnostic instead of using built-in samples", async () => {
    const output: string[] = [];
    const errors: string[] = [];
    const exitCode = await runRtlCoreLoopCli(
      ["fixtures-check"],
      undefined,
      (line) => output.push(line),
      (line) => errors.push(line),
    );
    expect(exitCode).toBe(2);
    expect(output).toEqual([]);
    expect(JSON.parse(errors[0]!) as unknown).toMatchObject({
      ok: false,
      error: { code: "DATASET_NOT_CONFIGURED", retryable: false },
    });
  });

  it("reports the stable missing-OpenCode diagnostic for an unconfigured probe", async () => {
    const output: string[] = [];
    const errors: string[] = [];
    const exitCode = await runRtlCoreLoopCli(
      ["agent-probe"],
      undefined,
      (line) => output.push(line),
      (line) => errors.push(line),
      {},
    );
    expect(exitCode).toBe(2);
    expect(output).toEqual([]);
    expect(JSON.parse(errors[0]!) as unknown).toMatchObject({
      ok: false,
      error: { code: "OPENCODE_NOT_CONFIGURED", retryable: false },
    });
  });
});
