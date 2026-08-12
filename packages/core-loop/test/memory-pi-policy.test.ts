import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

const REPOSITORY_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const roots: string[] = [];

afterEach(async () => {
  delete process.env.RTL_AGENT_PI_MEMORY_SELECTOR_POLICY_REQUIRED;
  delete process.env.RTL_AGENT_PI_MEMORY_SELECTOR_READ_AUDIT;
  delete process.env.RTL_AGENT_PI_MEMORY_CONSOLIDATOR_POLICY_REQUIRED;
  delete process.env.RTL_AGENT_PI_MEMORY_CONSOLIDATOR_READ_AUDIT;
  delete process.env.RTL_AGENT_PI_WORKSPACE_ROOT;
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function policyFixture(policyFile: string, activation: string, auditVariable: string) {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "rtl-memory-pi-policy-"));
  roots.push(workspace);
  const auditPath = path.join(workspace, "context", "read-audit.jsonl");
  await mkdir(path.dirname(auditPath), { recursive: true });
  process.env[activation] = "1";
  process.env.RTL_AGENT_PI_WORKSPACE_ROOT = workspace;
  process.env[auditVariable] = auditPath;
  let toolHandler: ((event: { toolName: string; input: unknown }) => Promise<unknown>) | undefined;
  const extension = (await import(pathToFileURL(policyFile).href)) as {
    default(pi: {
      on(
        name: string,
        callback: (event: { toolName: string; input: unknown }) => Promise<unknown>,
      ): void;
    }): void;
  };
  extension.default({
    on: (name, callback) => {
      if (name === "tool_call") toolHandler = callback;
    },
  });
  return { auditPath, tool: (event: { toolName: string; input: unknown }) => toolHandler!(event) };
}

describe("Memory Pi policy extensions", () => {
  it("audits Selector reads and restricts output to selection.json", async () => {
    const fixture = await policyFixture(
      path.join(REPOSITORY_ROOT, ".pi", "extensions", "rtl-memory-selector-policy.mjs"),
      "RTL_AGENT_PI_MEMORY_SELECTOR_POLICY_REQUIRED",
      "RTL_AGENT_PI_MEMORY_SELECTOR_READ_AUDIT",
    );

    await expect(
      fixture.tool({ toolName: "read", input: { path: "spec.md" } }),
    ).resolves.toBeUndefined();
    await expect(
      fixture.tool({ toolName: "write", input: { path: "selection.json" } }),
    ).resolves.toBeUndefined();
    await expect(
      fixture.tool({ toolName: "write", input: { path: "context/selection-input.json" } }),
    ).resolves.toMatchObject({ block: true });
    await expect(
      fixture.tool({ toolName: "read", input: { path: "context" } }),
    ).resolves.toMatchObject({ block: true });
    await expect(
      fixture.tool({ toolName: "read", input: { path: "context/read-audit.jsonl" } }),
    ).resolves.toMatchObject({ block: true });
    expect(await readFile(fixture.auditPath, "utf8")).toBe(
      `${JSON.stringify({ path: "spec.md" })}\n`,
    );
  });

  it("audits Consolidator reads and restricts output to result.json", async () => {
    const fixture = await policyFixture(
      path.join(REPOSITORY_ROOT, ".pi", "extensions", "rtl-memory-consolidator-policy.mjs"),
      "RTL_AGENT_PI_MEMORY_CONSOLIDATOR_POLICY_REQUIRED",
      "RTL_AGENT_PI_MEMORY_CONSOLIDATOR_READ_AUDIT",
    );

    await expect(
      fixture.tool({ toolName: "read", input: { path: "context/snapshot.json" } }),
    ).resolves.toBeUndefined();
    await expect(
      fixture.tool({ toolName: "write", input: { path: "result.json" } }),
    ).resolves.toBeUndefined();
    await expect(
      fixture.tool({ toolName: "read", input: { path: "../outside.json" } }),
    ).resolves.toMatchObject({ block: true });
    await expect(
      fixture.tool({ toolName: "read", input: { path: "context" } }),
    ).resolves.toMatchObject({ block: true });
    await expect(
      fixture.tool({ toolName: "read", input: { path: "context/read-audit.jsonl" } }),
    ).resolves.toMatchObject({ block: true });
    expect(await readFile(fixture.auditPath, "utf8")).toBe(
      `${JSON.stringify({ path: "context/snapshot.json" })}\n`,
    );
  });
});
