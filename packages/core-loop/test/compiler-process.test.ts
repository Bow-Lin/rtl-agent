import { describe, expect, it } from "vitest";

import { executeCompilerProcess } from "../src/index.js";

function options(arguments_: readonly string[]) {
  return {
    executable: process.execPath,
    arguments: arguments_,
    cwd: process.cwd(),
    environment: { ...process.env },
    timeoutMs: 5_000,
    terminationGraceMs: 100,
    retainedOutputBytes: 1024,
    stdoutLimitBytes: 512,
    stderrLimitBytes: 512,
  };
}

describe("compiler process boundary", () => {
  it("continuously drains output beyond the retained preview limit", async () => {
    const result = await executeCompilerProcess(
      options(["-e", "process.stdout.write(Buffer.alloc(262144, 0x61))"]),
    );
    expect(result).toMatchObject({
      exitCode: 0,
      timedOut: false,
      terminationFailed: false,
      closeConfirmed: true,
    });
    expect(result.stdout.originalByteLength).toBe(262_144);
    expect(result.stdout.truncated).toBe(true);
    expect(Buffer.byteLength(result.stdout.preview)).toBe(512);
  });

  it("uses streaming UTF-8 decoding across process chunks", async () => {
    const script =
      "process.stdout.write(Buffer.from([0xf0,0x9f]));" +
      "setTimeout(() => process.stdout.write(Buffer.from([0x98,0x80])), 10)";
    const result = await executeCompilerProcess(options(["-e", script]));
    expect(result.stdout.preview).toBe("😀");
    expect(result.stdout.originalByteLength).toBe(4);
    expect(result.stdout.truncated).toBe(false);
  });

  it("bounds timeout termination and waits for close confirmation", async () => {
    const result = await executeCompilerProcess({
      ...options(["-e", "setInterval(() => undefined, 1000)"]),
      timeoutMs: 200,
    });
    expect(result.timedOut).toBe(true);
    expect(result.closeConfirmed).toBe(true);
    expect(result.terminationFailed).toBe(false);
  });
});
