import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import {
  PiRtlAgentAdapter,
  cleanupProviderCaptureDirectory,
  createCoreLoopRun,
  piExperimentConfigFromEnvironment,
} from "../src/index.js";
import type { AgentAttemptInput, CoreLoopRun, PiExperimentConfig } from "../src/index.js";
import { RUN_REQUEST, TestFixtureProvider } from "./fixtures.js";

const REPOSITORY_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const POLICY_EXTENSION = path.join(
  REPOSITORY_ROOT,
  ".pi",
  "extensions",
  "rtl-core-loop-policy.mjs",
);
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
    policyRequired: process.env.RTL_AGENT_PI_POLICY_REQUIRED,
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
if (
  process.env.RTL_AGENT_PI_PROVIDER_CAPTURE_PATH &&
  process.env.FAKE_PI_MODE !== "missing-capture"
) {
  const systemPromptIndex = args.indexOf("--system-prompt");
  writeFileSync(process.env.RTL_AGENT_PI_PROVIDER_CAPTURE_PATH, "", { flag: "wx", mode: 0o600 });
  appendFileSync(
    process.env.RTL_AGENT_PI_PROVIDER_CAPTURE_PATH,
    JSON.stringify({
      sequence: 1,
      payload: {
        system: args[systemPromptIndex + 1],
        messages: [{ role: "user", content: args.at(-1) }]
      }
    }) + "\n",
    "utf8"
  );
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
if (process.env.FAKE_PI_MODE === "capability-drift") {
  writeFileSync(
    process.env.FAKE_PI_CAPABILITY_FILE,
    '{"schemaVersion":1,"enabledTools":["read","write"]}\n'
  );
}
`;

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "rtl-agent-pi-test-"));
  roots.push(root);
  return root;
}

afterEach(async () => {
  delete process.env.RTL_AGENT_PI_POLICY_REQUIRED;
  delete process.env.RTL_AGENT_PI_WORKSPACE_ROOT;
  delete process.env.RTL_AGENT_PI_PROVIDER_CAPTURE_PATH;
  delete process.env.RTL_AGENT_PI_PROVIDER_CAPTURE_MAX_REQUESTS;
  delete process.env.RTL_AGENT_PI_PROVIDER_CAPTURE_MAX_BYTES;
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function fakePi(
  root: string,
): Promise<{ readonly script: string; readonly log: string; readonly capability: string }> {
  const script = path.join(root, "fake-pi.mjs");
  const log = path.join(root, "pi-log.jsonl");
  const capability = path.join(root, "capability.json");
  await Promise.all([
    writeFile(script, FAKE_PI_SOURCE, "utf8"),
    writeFile(log, "", "utf8"),
    writeFile(capability, '{"schemaVersion":1,"enabledTools":["read","write","edit"]}\n', "utf8"),
  ]);
  return { script, log, capability };
}

function config(
  fake: { readonly script: string; readonly log: string; readonly capability: string },
  mode = "change",
): PiExperimentConfig {
  return {
    executable: process.execPath,
    executableArgumentsPrefix: [fake.script],
    expectedPiVersion: "0.81.1",
    repositoryRoot: REPOSITORY_ROOT,
    configDirectory: path.join(path.dirname(fake.script), "pi-state"),
    provider: "kimi-coding",
    model: "kimi-for-coding",
    capabilityFile: fake.capability,
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
      FAKE_PI_CAPABILITY_FILE: fake.capability,
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
    expect(invocation.policyRequired).toBe("1");
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
    const providerRequests = JSON.parse(
      await readFile(
        path.join(run.runDirectory, "evidence", "attempts", "1", "provider-request-payloads.json"),
        "utf8",
      ),
    ) as {
      readonly provider: string;
      readonly requests: readonly {
        readonly sequence: number;
        readonly payload: {
          readonly system: string;
          readonly messages: readonly { readonly content: string }[];
        };
      }[];
    };
    expect(providerRequests.provider).toBe("kimi-coding");
    expect(providerRequests.requests).toHaveLength(1);
    expect(providerRequests.requests[0]?.sequence).toBe(1);
    expect(providerRequests.requests[0]?.payload.system).toContain("Read context/agent-input.json");
    expect(providerRequests.requests[0]?.payload.messages[0]?.content).toBe(
      "Execute the bounded RTL attempt now.",
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
    expect(configured.configDirectory).toBe(path.join(REPOSITORY_ROOT, ".rtl-agent", "pi-state"));
    expect(configured.capabilityFile).toBe(path.join(REPOSITORY_ROOT, ".pi", "capability.json"));
    expect(configured.extensionFile).toBe(POLICY_EXTENSION);
  });

  it("fails closed when the versioned Pi tool capability changes", async () => {
    const root = await temporaryRoot();
    const fake = await fakePi(root);
    const adapter = new PiRtlAgentAdapter(config(fake));
    await adapter.probe();
    await writeFile(
      fake.capability,
      '{"schemaVersion":1,"enabledTools":["read","write"]}\n',
      "utf8",
    );

    await expect(adapter.probe()).rejects.toMatchObject({
      error: { code: "PI_AGENT_CAPABILITY_MISMATCH" },
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

  it("rejects a turn when the project capability changes while Pi is running", async () => {
    const root = await temporaryRoot();
    const fake = await fakePi(root);
    const run = await createBlankRun(root);

    await expect(
      new PiRtlAgentAdapter(config(fake, "capability-drift")).runTurn(inputFor(run), run),
    ).rejects.toMatchObject({
      error: { code: "PI_AGENT_CAPABILITY_MISMATCH" },
    });
  });

  it("fails closed when the Pi provider hook does not create its capture", async () => {
    const root = await temporaryRoot();
    const fake = await fakePi(root);
    const run = await createBlankRun(root);

    await expect(
      new PiRtlAgentAdapter(config(fake, "missing-capture")).runTurn(inputFor(run), run),
    ).rejects.toMatchObject({
      error: { code: "PI_AGENT_CAPABILITY_MISMATCH" },
    });
  });

  it("reports cleanup failure after passing bounded retry options without failing the turn", async () => {
    const warnings: string[] = [];
    const removeCalls: unknown[] = [];
    const cleaned = await cleanupProviderCaptureDirectory(
      "C:\\synthetic-provider-capture",
      async (_directory, options) => {
        removeCalls.push(options);
        throw new Error("synthetic cleanup failure");
      },
      (message) => warnings.push(message),
    );

    expect(cleaned).toBe(false);
    expect(removeCalls).toEqual([{ recursive: true, force: true, maxRetries: 3, retryDelay: 100 }]);
    expect(warnings).toEqual([
      "Pi provider capture temporary directory could not be removed after bounded retries",
    ]);
  });
});

describe("Pi RTL policy extension", () => {
  it("stays inactive during ordinary project-level Pi discovery", async () => {
    let registered = false;
    const extension = (await import(pathToFileURL(POLICY_EXTENSION).href)) as {
      default(pi: { on(): void }): void;
    };
    extension.default({
      on: () => {
        registered = true;
      },
    });

    expect(registered).toBe(false);
  });

  it("allows bounded RTL access and blocks paths outside the workspace", async () => {
    const root = await temporaryRoot();
    const workspace = path.join(root, "workspace");
    const capturePath = path.join(root, "provider-requests.jsonl");
    process.env.RTL_AGENT_PI_POLICY_REQUIRED = "1";
    process.env.RTL_AGENT_PI_WORKSPACE_ROOT = workspace;
    process.env.RTL_AGENT_PI_PROVIDER_CAPTURE_PATH = capturePath;
    process.env.RTL_AGENT_PI_PROVIDER_CAPTURE_MAX_REQUESTS = "1";
    process.env.RTL_AGENT_PI_PROVIDER_CAPTURE_MAX_BYTES = "4096";
    let toolHandler:
      ((event: { toolName: string; input: unknown }) => Promise<unknown>) | undefined;
    let providerHandler: ((event: { payload: unknown }) => unknown) | undefined;
    const extension = (await import(pathToFileURL(POLICY_EXTENSION).href)) as {
      default(pi: {
        on(
          name: string,
          callback:
            | ((event: { toolName: string; input: unknown }) => Promise<unknown>)
            | ((event: { payload: unknown }) => unknown),
        ): void;
      }): void;
    };
    extension.default({
      on: (name, callback) => {
        if (name === "tool_call") {
          toolHandler = callback as (event: {
            toolName: string;
            input: unknown;
          }) => Promise<unknown>;
        } else if (name === "before_provider_request") {
          providerHandler = callback as (event: { payload: unknown }) => unknown;
        }
      },
    });

    expect(await toolHandler?.({ toolName: "read", input: { path: "spec.md" } })).toBeUndefined();
    expect(
      await toolHandler?.({ toolName: "write", input: { path: "rtl/dut.sv" } }),
    ).toBeUndefined();
    await expect(
      toolHandler?.({ toolName: "write", input: { path: "../escaped.sv" } }),
    ).resolves.toMatchObject({ block: true });
    await expect(
      toolHandler?.({ toolName: "read", input: { path: ".env" } }),
    ).resolves.toMatchObject({ block: true });
    await expect(
      toolHandler?.({ toolName: "bash", input: { command: "whoami" } }),
    ).resolves.toMatchObject({ block: true });
    const payload = { system: "system prompt", messages: [{ role: "user", content: "prompt" }] };
    expect(providerHandler?.({ payload })).toBeUndefined();
    expect(JSON.parse((await readFile(capturePath, "utf8")).trim())).toEqual({
      sequence: 1,
      payload,
    });
    expect(() => providerHandler?.({ payload })).toThrow(
      "Pi provider request capture count limit exceeded",
    );
    expect((await readFile(capturePath, "utf8")).trim().split("\n")).toHaveLength(1);
  });

  it("rejects a provider payload before writing when the byte limit would be exceeded", async () => {
    const root = await temporaryRoot();
    const workspace = path.join(root, "workspace");
    const capturePath = path.join(root, "provider-requests.jsonl");
    process.env.RTL_AGENT_PI_POLICY_REQUIRED = "1";
    process.env.RTL_AGENT_PI_WORKSPACE_ROOT = workspace;
    process.env.RTL_AGENT_PI_PROVIDER_CAPTURE_PATH = capturePath;
    process.env.RTL_AGENT_PI_PROVIDER_CAPTURE_MAX_REQUESTS = "64";
    process.env.RTL_AGENT_PI_PROVIDER_CAPTURE_MAX_BYTES = "16";
    let providerHandler: ((event: { payload: unknown }) => unknown) | undefined;
    const extension = (await import(pathToFileURL(POLICY_EXTENSION).href)) as {
      default(pi: {
        on(name: string, callback: (event: { payload: unknown }) => unknown): void;
      }): void;
    };
    extension.default({
      on: (name, callback) => {
        if (name === "before_provider_request") providerHandler = callback;
      },
    });

    expect(() =>
      providerHandler?.({ payload: { messages: [{ role: "user", content: "too large" }] } }),
    ).toThrow("Pi provider request capture byte limit exceeded");
    expect(await readFile(capturePath, "utf8")).toBe("");
  });
});
