import { spawn } from "node:child_process";
import { once } from "node:events";

import { afterEach, describe, expect, it } from "vitest";

import { waitForProcess } from "../src/opencode-process.js";

const children = new Set<ReturnType<typeof spawn>>();

function spawnWaitingChild(): ReturnType<typeof spawn> {
  const child = spawn(process.execPath, ["-e", "setInterval(() => undefined, 1000)"], {
    shell: false,
    windowsHide: true,
    stdio: "ignore",
  });
  children.add(child);
  return child;
}

afterEach(async () => {
  await Promise.all(
    [...children].map(async (child) => {
      children.delete(child);
      if (child.exitCode !== null || child.signalCode !== null) return;
      const closed = once(child, "close").catch(() => []);
      child.kill("SIGKILL");
      await Promise.race([closed, new Promise((resolve) => setTimeout(resolve, 2_000))]);
    }),
  );
});

describe("OpenCode process timeout boundary", () => {
  it("returns a termination failure when the terminator never settles", async () => {
    const child = spawnWaitingChild();
    const startedAt = performance.now();
    const result = await waitForProcess(child, 25, 10, () => new Promise<void>(() => undefined));

    expect(result).toMatchObject({
      exitCode: null,
      timedOut: true,
      terminationFailed: true,
    });
    expect(performance.now() - startedAt).toBeLessThan(1_500);
  });

  it("returns a termination failure when the child never closes after termination", async () => {
    const child = spawnWaitingChild();
    const result = await waitForProcess(child, 25, 10, async () => undefined);

    expect(result).toMatchObject({
      exitCode: null,
      timedOut: true,
      terminationFailed: true,
    });
  });
});
