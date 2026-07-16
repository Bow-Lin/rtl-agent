import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  OpenCodeRtlAgentAdapter,
  buildIsolatedOpenCodeEnvironment,
  createCoreLoopRun,
  openCodeExperimentConfigFromEnvironment,
} from "../src/index.js";
import { executeOpenCodeProcess } from "../src/opencode-process.js";
import { RUN_REQUEST, TestFixtureProvider } from "./fixtures.js";

const enabled = process.env.CORE_LOOP_REAL_AGENT_TEST === "1";
const REPOSITORY_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

describe("real OpenCode RTL Agent smoke", () => {
  it.skipIf(!enabled)(
    "performs one explicit test-only blank-generation turn",
    async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "rtl-agent-r02-real-smoke-"));
      try {
        const run = await createCoreLoopRun(new TestFixtureProvider({ blank: true }), RUN_REQUEST, {
          runsRoot: path.join(root, "runs"),
          stagingRoot: path.join(root, "staging"),
        });
        const adapter = new OpenCodeRtlAgentAdapter(
          openCodeExperimentConfigFromEnvironment(process.env, REPOSITORY_ROOT),
        );
        const result = await adapter.runTurn(
          {
            schemaVersion: 1,
            runId: run.runId,
            attempt: 1,
            category: "BLANK_GENERATION",
            specPath: "spec.md",
            workspaceRtlRoot: "rtl",
            rtlSourceFiles: [],
            topModule: "dut",
          },
          run,
        );
        expect(result.outcome, JSON.stringify(result, undefined, 2)).toBe("RTL_CHANGED");
        expect(result.workspaceUsableForCompile).toBe(true);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
    900_000,
  );

  it.skipIf(!enabled)(
    "observes an actual denied write without changing the workspace",
    async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "rtl-agent-r02-deny-smoke-"));
      try {
        const workspace = path.join(root, "workspace");
        const configDirectory = path.join(root, "opencode-config");
        await Promise.all([
          mkdir(workspace, { recursive: true }),
          mkdir(path.join(configDirectory, "agents"), { recursive: true }),
        ]);
        await writeFile(
          path.join(configDirectory, "agents", "permission-probe.md"),
          `---
description: Test-only proof that a denied write reaches the permission boundary
mode: primary
temperature: 0
steps: 3
permission:
  "*": deny
  edit:
    "*": deny
    "allowed/*.txt": allow
    "**/allowed/*.txt": allow
---

Call the write tool exactly once to create denied.txt containing the word denied.
Do not use another tool and do not merely describe the call.
`,
          "utf8",
        );
        const config = openCodeExperimentConfigFromEnvironment(process.env, REPOSITORY_ROOT);
        const environment = buildIsolatedOpenCodeEnvironment(config);
        environment.OPENCODE_CONFIG_DIR = configDirectory;
        const processResult = await executeOpenCodeProcess({
          executable: config.executable,
          arguments: [
            "--pure",
            "run",
            "--agent",
            "permission-probe",
            "--model",
            config.providerModel,
            ...(config.variant === undefined ? [] : ["--variant", config.variant]),
            "--format",
            "json",
            "--dir",
            workspace,
            "--title",
            "r02-permission-deny-smoke",
            "Execute the permission probe instruction now.",
          ],
          cwd: REPOSITORY_ROOT,
          environment,
          timeoutMs: Math.min(config.timeoutMs, 180_000),
          terminationGraceMs: config.terminationGraceMs,
          stderrLimitBytes: config.stderrLimitBytes,
          maximumEvents: config.maximumEvents,
          maximumEventLineBytes: config.maximumEventLineBytes,
        });
        expect(processResult.exitCode).toBe(0);
        expect(processResult.timedOut).toBe(false);
        expect(processResult.eventStream.events).toContainEqual(
          expect.objectContaining({
            category: "TOOL_RESULT",
            toolName: "write",
            status: "error",
          }),
        );
        await expect(access(path.join(workspace, "denied.txt"))).rejects.toMatchObject({
          code: "ENOENT",
        });
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
    300_000,
  );
});
