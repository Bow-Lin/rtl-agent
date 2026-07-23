import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import {
  PiRtlAgentAdapter,
  createCoreLoopRun,
  piExperimentConfigFromEnvironment,
} from "../src/index.js";
import type { AgentAttemptInput, CoreLoopRun, PiExperimentConfig } from "../src/index.js";
import { RUN_REQUEST, TestFixtureProvider } from "./fixtures.js";

const REPOSITORY_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const POLICY_EXTENSION = path.join(REPOSITORY_ROOT, "config", "pi", "rtl-core-loop-extension.mjs");
const roots: string[] = [];

const FAKE_PI_SOURCE = String.raw`
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
if (process.env.FAKE_PI_LOG) {
  appendFileSync(process.env.FAKE_PI_LOG, JSON.stringify({
    args,
    cwd: process.cwd(),
    configDir: process.env.PI_CODING_AGENT_DIR,
    workspaceRoot: process.env.RTL_AGENT_PI_WORKSPACE_ROOT,
    offline: process.env.PI_OFFLINE,
    telemetry: process.env.PI_TELEMETRY
  }) + "\n", "utf8");
}
if (args.length === 1 && args[0] === "--version") {
  process.stdout.write("pi 0.81.1");
  process.exit(0);
}
if (args.length === 1 && args[0] === "--help") {
  process.stdout.write([
    "--mode", "--no-session", "--provider", "--model", "--tools",
    "--no-extensions", "--extension", "--no-skills", "--no-prompt-templates",
    "--no-themes", "--no-context-files", "--no-approve", "--offline"
  ].join(" "));
  process.exit(0);
}
if (process.env.FAKE_PI_MODE === "change") {
  const rtl = path.join(process.cwd(), "rtl");
  mkdirSync(rtl, { recursive: true });
  writeFileSync(
    path.join(rtl, "dut.sv"),
    "module dut(input a, output y); assign y = a; endmodule\n"
  );
  process.stdout.write(JSON.stringify({
    type: "tool_execution_end",
    toolName: "write",
    status: "completed"
  }) + "\n");
}
if (process.env.FAKE_PI_MODE === "config-drift") {
  writeFileSync(
    path.join(process.env.PI_CODING_AGENT_DIR, "models.json"),
    '{"providers":{"kimi-coding":{"baseUrl":"https://changed.invalid"}}}\n'
  );
}
`;

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "rtl-agent-pi-test-"));
  roots.push(root);
  return root;
}

afterEach(async () => {
  delete process.env.RTL_AGENT_PI_WORKSPACE_ROOT;
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function fakePi(root: string): Promise<{ readonly script: string; readonly log: string }> {
  const script = path.join(root, "fake-pi.mjs");
  const log = path.join(root, "pi-log.jsonl");
  await Promise.all([writeFile(script, FAKE_PI_SOURCE, "utf8"), writeFile(log, "", "utf8")]);
  return { script, log };
}

function config(
  fake: { readonly script: string; readonly log: string },
  mode = "change",
): PiExperimentConfig {
  return {
    executable: process.execPath,
    executableArgumentsPrefix: [fake.script],
    expectedPiVersion: "0.81.1",
    repositoryRoot: REPOSITORY_ROOT,
    configDirectory: path.join(path.dirname(fake.script), "pi-config"),
    provider: "kimi-coding",
    model: "kimi-for-coding",
    extensionFile: POLICY_EXTENSION,
    timeoutMs: 2_000,
    terminationGraceMs: 50,
    stabilityWindowMs: 20,
    stderrLimitBytes: 1_024,
    maximumEvents: 16,
    maximumEventLineBytes: 1_024,
    workspaceLimits: {
      maximumFiles: 8,
      maximumFileBytes: 4_096,
      maximumTotalBytes: 16_384,
    },
    environment: {
      FAKE_PI_LOG: fake.log,
      FAKE_PI_MODE: mode,
      KIMI_API_KEY: "test-key",
    },
  };
}

async function createBlankRun(root: string): Promise<CoreLoopRun> {
  return createCoreLoopRun(new TestFixtureProvider({ blank: true }), RUN_REQUEST, {
    runsRoot: path.join(root, "runs"),
    stagingRoot: path.join(root, "staging"),
  });
}

function inputFor(run: CoreLoopRun): AgentAttemptInput {
  return {
    schemaVersion: 1,
    runId: run.runId,
    attempt: 1,
    category: run.fixture.category,
    specPath: "spec.md",
    workspaceRtlRoot: "rtl",
    rtlSourceFiles: [],
    topModule: run.fixture.topModule,
  };
}

describe("Pi RTL Agent adapter", () => {
  it("locks the Pi version, isolation flags, tools, policy, and guidance", async () => {
    const root = await temporaryRoot();
    const fake = await fakePi(root);
    const capability = await new PiRtlAgentAdapter(config(fake)).probe();

    expect(capability).toMatchObject({
      piVersion: "0.81.1",
      provider: "kimi-coding",
      model: "kimi-for-coding",
      sessionMode: "EPHEMERAL",
      enabledTools: ["read", "write", "edit"],
    });
    expect(capability.requiredFlags).toContain("--no-context-files");
    expect(capability.requiredFlags).toContain("--offline");
  });

  it("runs one isolated JSON turn and records Pi-specific evidence", async () => {
    const root = await temporaryRoot();
    const fake = await fakePi(root);
    const run = await createBlankRun(root);
    const result = await new PiRtlAgentAdapter(config(fake)).runTurn(inputFor(run), run);
    const log = (await readFile(fake.log, "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    const invocation = log.at(-1)!;

    expect(result).toMatchObject({
      outcome: "RTL_CHANGED",
      piVersion: "0.81.1",
      provider: "kimi-coding",
      sessionMode: "EPHEMERAL",
    });
    expect(invocation.cwd).toBe(run.workspaceDirectory);
    expect(invocation.workspaceRoot).toBe(run.workspaceDirectory);
    expect(invocation.offline).toBe("1");
    expect(invocation.telemetry).toBe("0");
    expect(invocation.args).toEqual(
      expect.arrayContaining([
        "--mode",
        "json",
        "--no-session",
        "--tools",
        "read,write,edit",
        "--no-context-files",
        "--no-approve",
      ]),
    );
  });

  it("maps the repository Kimi credential without passing it on argv", () => {
    const configured = piExperimentConfigFromEnvironment(
      {
        RTL_AGENT_PI_EXECUTABLE: process.execPath,
        RTL_AGENT_PI_ENTRYPOINT: "tools/pi/index.js",
        RTL_AGENT_PI_VERSION: "0.81.1",
        RTL_AGENT_PI_PROVIDER: "kimi-coding",
        RTL_AGENT_PI_MODEL: "kimi-for-coding",
        KIMI_CODE_API_KEY: "secret",
      },
      REPOSITORY_ROOT,
    );

    expect(configured.executableArgumentsPrefix).toEqual([
      path.join(REPOSITORY_ROOT, "tools", "pi", "index.js"),
    ]);
    expect(configured.environment).toMatchObject({
      KIMI_API_KEY: "secret",
      KIMI_CODE_API_KEY: "secret",
    });
  });

  it("fails closed when the shared semantic configuration changes", async () => {
    const root = await temporaryRoot();
    const fake = await fakePi(root);
    const adapterConfig = config(fake);
    const adapter = new PiRtlAgentAdapter(adapterConfig);
    const first = await adapter.probe();
    await writeFile(
      path.join(adapterConfig.configDirectory, "models.json"),
      '{"providers":{"kimi-coding":{"baseUrl":"https://example.invalid"}}}\n',
      "utf8",
    );

    await expect(adapter.probe()).rejects.toMatchObject({
      error: { code: "PI_AGENT_CAPABILITY_MISMATCH" },
    });
    expect(first.resolvedConfigDigest).toMatch(/^sha256:/);
  });

  it("detects shared credential drift without exposing the credential in capability evidence", async () => {
    const root = await temporaryRoot();
    const fake = await fakePi(root);
    const adapterConfig = config(fake);
    const adapter = new PiRtlAgentAdapter(adapterConfig);
    const capability = await adapter.probe();
    await writeFile(
      path.join(adapterConfig.configDirectory, "auth.json"),
      '{"kimi-coding":{"type":"api_key","key":"must-not-persist-in-evidence"}}\n',
      "utf8",
    );

    expect(JSON.stringify(capability)).not.toContain("must-not-persist");
    await expect(adapter.probe()).rejects.toMatchObject({
      error: { code: "PI_AGENT_CAPABILITY_MISMATCH" },
    });
  });

  it("rejects a turn when the shared configuration changes while Pi is running", async () => {
    const root = await temporaryRoot();
    const fake = await fakePi(root);
    const run = await createBlankRun(root);

    await expect(
      new PiRtlAgentAdapter(config(fake, "config-drift")).runTurn(inputFor(run), run),
    ).rejects.toMatchObject({
      error: { code: "PI_AGENT_CAPABILITY_MISMATCH" },
    });
  });
});

describe("Pi RTL policy extension", () => {
  it("allows bounded RTL access and blocks paths outside the workspace", async () => {
    const workspace = path.join(await temporaryRoot(), "workspace");
    process.env.RTL_AGENT_PI_WORKSPACE_ROOT = workspace;
    let handler: ((event: { toolName: string; input: unknown }) => Promise<unknown>) | undefined;
    const extension = (await import(pathToFileURL(POLICY_EXTENSION).href)) as {
      default(pi: {
        on(
          name: string,
          callback: (event: { toolName: string; input: unknown }) => Promise<unknown>,
        ): void;
      }): void;
    };
    extension.default({
      on: (_name, callback) => {
        handler = callback;
      },
    });

    expect(await handler?.({ toolName: "read", input: { path: "spec.md" } })).toBeUndefined();
    expect(await handler?.({ toolName: "write", input: { path: "rtl/dut.sv" } })).toBeUndefined();
    await expect(
      handler?.({ toolName: "write", input: { path: "../escaped.sv" } }),
    ).resolves.toMatchObject({ block: true });
    await expect(handler?.({ toolName: "read", input: { path: ".env" } })).resolves.toMatchObject({
      block: true,
    });
    await expect(
      handler?.({ toolName: "bash", input: { command: "whoami" } }),
    ).resolves.toMatchObject({ block: true });
  });
});
