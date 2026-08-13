import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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
const MISMATCH_POLICY_EXTENSION = path.join(
  REPOSITORY_ROOT,
  ".pi",
  "extensions",
  "rtl-mismatch-analyzer-policy.mjs",
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
  process.env.RTL_AGENT_PI_PROVIDER_TRANSCRIPT_PATH &&
  process.env.FAKE_PI_MODE !== "missing-capture"
) {
  const systemPromptIndex = args.indexOf("--system-prompt");
  writeFileSync(process.env.RTL_AGENT_PI_PROVIDER_TRANSCRIPT_PATH, "", { flag: "wx", mode: 0o600 });
  appendFileSync(
    process.env.RTL_AGENT_PI_PROVIDER_TRANSCRIPT_PATH,
    JSON.stringify({
      kind: "request",
      sequence: 1,
      payload: {
        system: args[systemPromptIndex + 1],
        messages: [{ role: "user", content: args.at(-1) }]
      }
    }) + "\n",
    "utf8"
  );
  if (process.env.FAKE_PI_MODE === "provider-retry") {
    appendFileSync(
      process.env.RTL_AGENT_PI_PROVIDER_TRANSCRIPT_PATH,
      JSON.stringify({
        kind: "request",
        sequence: 2,
        payload: {
          system: args[systemPromptIndex + 1],
          messages: [{ role: "user", content: "retry prompt" }]
        }
      }) + "\n",
      "utf8"
    );
  }
  if (process.env.FAKE_PI_MODE !== "missing-response") {
    appendFileSync(
      process.env.RTL_AGENT_PI_PROVIDER_TRANSCRIPT_PATH,
      JSON.stringify({
        kind: "response",
        sequence: process.env.FAKE_PI_MODE === "provider-retry" ? 2 : 1,
        message: {
          role: "assistant",
          content: [{ type: "text", text: "completed" }],
          stopReason: "stop",
          usage: { input: 10, output: 2, totalTokens: 12 }
        }
      }) + "\n",
      "utf8"
    );
  }
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
  delete process.env.RTL_AGENT_PI_MISMATCH_POLICY_REQUIRED;
  delete process.env.RTL_AGENT_PI_WORKSPACE_ROOT;
  delete process.env.RTL_AGENT_PI_PROVIDER_TRANSCRIPT_PATH;
  delete process.env.RTL_AGENT_PI_PROVIDER_CAPTURE_PATH;
  delete process.env.RTL_AGENT_PI_PROVIDER_CAPTURE_MAX_REQUESTS;
  delete process.env.RTL_AGENT_PI_PROVIDER_CAPTURE_MAX_BYTES;
  delete process.env.RTL_AGENT_PI_RELEVANT_MEMORY_PATH;
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

  it("selects coverage guidance instead of generation guidance", async () => {
    const root = await temporaryRoot();
    const fake = await fakePi(root);
    const run = await createBlankRun(root);
    const generation = await new PiRtlAgentAdapter(config(fake, "change")).probe();
    const coverageConfig: PiExperimentConfig = {
      ...config(fake, "change"),
      guidanceProfile: "coverage-improvement",
    };
    const adapter = new PiRtlAgentAdapter(coverageConfig);
    const coverage = await adapter.probe();

    expect(coverage.guidanceFileDigest).not.toBe(generation.guidanceFileDigest);
    expect(coverage.experimentConfigDigest).not.toBe(generation.experimentConfigDigest);

    await adapter.runTurn(inputFor(run), run);
    const log = (await readFile(fake.log, "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as { args: string[] });
    const args = log.at(-1)!.args;
    const prompt = args[args.indexOf("--system-prompt") + 1]!;
    expect(prompt).toContain("verification coverage improvement attempt");
    expect(prompt).toContain("# RTL Verification Coverage Improvement Guidance v1");
    expect(prompt).toContain("verilatorSimulationFeedbackPath");
    expect(prompt).not.toContain("# RTL Generation Common Guidance v2");
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
    const providerTranscript = JSON.parse(
      await readFile(
        path.join(run.runDirectory, "evidence", "attempts", "1", "provider-transcript.json"),
        "utf8",
      ),
    ) as {
      readonly provider: string;
      readonly exchanges: readonly {
        readonly sequence: number;
        readonly request: {
          readonly system: string;
          readonly messages: readonly { readonly content: string }[];
        };
        readonly response: {
          readonly role: string;
          readonly content: readonly { readonly text: string }[];
          readonly stopReason: string;
        };
      }[];
    };
    expect(providerTranscript.provider).toBe("kimi-coding");
    expect(providerTranscript.exchanges).toHaveLength(1);
    expect(providerTranscript.exchanges[0]?.sequence).toBe(1);
    expect(providerTranscript.exchanges[0]?.request.system).toContain(
      "Read context/agent-input.json",
    );
    expect(providerTranscript.exchanges[0]?.request.messages[0]?.content).toBe(
      "Execute the bounded RTL attempt now.",
    );
    expect(providerTranscript.exchanges[0]?.response).toMatchObject({
      role: "assistant",
      content: [{ type: "text", text: "completed" }],
      stopReason: "stop",
    });
  });

  it("reuses one successful external capability probe across turns", async () => {
    const root = await temporaryRoot();
    const fake = await fakePi(root);
    const firstRun = await createBlankRun(root);
    const secondRun = await createBlankRun(root);
    const adapter = new PiRtlAgentAdapter(config(fake, "change"));

    await adapter.probe();
    await adapter.runTurn(inputFor(firstRun), firstRun);
    await adapter.runTurn(inputFor(secondRun), secondRun);

    const log = (await readFile(fake.log, "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as { args: string[] });
    expect(
      log.filter((entry) => entry.args.length === 1 && entry.args[0] === "--version"),
    ).toHaveLength(1);
    expect(
      log.filter((entry) => entry.args.length === 1 && entry.args[0] === "--help"),
    ).toHaveLength(1);
    expect(log.filter((entry) => entry.args.includes("--mode"))).toHaveLength(2);
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

  it("preserves an incomplete final exchange when Pi exits before an Assistant response", async () => {
    const root = await temporaryRoot();
    const fake = await fakePi(root);
    const run = await createBlankRun(root);

    await new PiRtlAgentAdapter(config(fake, "missing-response")).runTurn(inputFor(run), run);
    const transcript = JSON.parse(
      await readFile(
        path.join(run.runDirectory, "evidence", "attempts", "1", "provider-transcript.json"),
        "utf8",
      ),
    ) as { readonly exchanges: readonly { readonly response: unknown }[] };

    expect(transcript.exchanges).toHaveLength(1);
    expect(transcript.exchanges[0]?.response).toBeNull();
  });

  it("preserves retried provider requests with the final Assistant response on the latest request", async () => {
    const root = await temporaryRoot();
    const fake = await fakePi(root);
    const run = await createBlankRun(root);

    await new PiRtlAgentAdapter(config(fake, "provider-retry")).runTurn(inputFor(run), run);
    const transcript = JSON.parse(
      await readFile(
        path.join(run.runDirectory, "evidence", "attempts", "1", "provider-transcript.json"),
        "utf8",
      ),
    ) as {
      readonly exchanges: readonly {
        readonly sequence: number;
        readonly response: unknown | null;
      }[];
    };

    expect(transcript.exchanges).toHaveLength(2);
    expect(transcript.exchanges[0]).toMatchObject({ sequence: 1, response: null });
    expect(transcript.exchanges[1]?.sequence).toBe(2);
    expect(transcript.exchanges[1]?.response).toMatchObject({ role: "assistant" });
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
    const capturePath = path.join(root, "provider-transcript.jsonl");
    const memoryPath = path.join(workspace, "context", "relevant-rtl-memory.md");
    await mkdir(path.dirname(memoryPath), { recursive: true });
    await writeFile(
      memoryPath,
      "# Relevant RTL Memory\n\nMemory is advisory; the current specification takes precedence.\n",
    );
    process.env.RTL_AGENT_PI_POLICY_REQUIRED = "1";
    process.env.RTL_AGENT_PI_WORKSPACE_ROOT = workspace;
    process.env.RTL_AGENT_PI_PROVIDER_TRANSCRIPT_PATH = capturePath;
    process.env.RTL_AGENT_PI_PROVIDER_CAPTURE_MAX_REQUESTS = "1";
    process.env.RTL_AGENT_PI_PROVIDER_CAPTURE_MAX_BYTES = "4096";
    process.env.RTL_AGENT_PI_RELEVANT_MEMORY_PATH = memoryPath;
    let toolHandler:
      ((event: { toolName: string; input: unknown }) => Promise<unknown>) | undefined;
    let providerHandler: ((event: { payload: unknown }) => unknown) | undefined;
    let messageHandler: ((event: { message: unknown }) => unknown) | undefined;
    let beforeAgentHandler: (() => unknown) | undefined;
    const extension = (await import(pathToFileURL(POLICY_EXTENSION).href)) as {
      default(pi: {
        on(
          name: string,
          callback:
            | ((event: { toolName: string; input: unknown }) => Promise<unknown>)
            | ((event: { payload: unknown }) => unknown)
            | ((event: { message: unknown }) => unknown),
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
        } else if (name === "message_end") {
          messageHandler = callback as (event: { message: unknown }) => unknown;
        } else if (name === "before_agent_start") {
          beforeAgentHandler = callback as () => unknown;
        }
      },
    });

    expect(await toolHandler?.({ toolName: "read", input: { path: "spec.md" } })).toBeUndefined();
    expect(beforeAgentHandler?.()).toMatchObject({
      message: {
        customType: "rtl-relevant-memory",
        content: expect.stringContaining("# Relevant RTL Memory"),
        display: false,
      },
    });
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
    const message = {
      role: "assistant",
      content: [{ type: "text", text: "response" }],
      stopReason: "stop",
      usage: { input: 1, output: 1, totalTokens: 2 },
    };
    expect(messageHandler?.({ message })).toBeUndefined();
    expect(
      (await readFile(capturePath, "utf8"))
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line)),
    ).toEqual([
      { kind: "request", sequence: 1, payload },
      { kind: "response", sequence: 1, message },
    ]);
    expect(() => providerHandler?.({ payload })).toThrow(
      "Pi provider request capture count limit exceeded",
    );
    expect((await readFile(capturePath, "utf8")).trim().split("\n")).toHaveLength(2);
  });

  it("allows mismatch inputs but only permits edits to analysis.json", async () => {
    const root = await temporaryRoot();
    const workspace = path.join(root, "workspace");
    process.env.RTL_AGENT_PI_MISMATCH_POLICY_REQUIRED = "1";
    process.env.RTL_AGENT_PI_WORKSPACE_ROOT = workspace;
    let toolHandler:
      ((event: { toolName: string; input: unknown }) => Promise<unknown>) | undefined;
    const extension = (await import(pathToFileURL(MISMATCH_POLICY_EXTENSION).href)) as {
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

    expect(await toolHandler?.({ toolName: "read", input: { path: "spec.md" } })).toBeUndefined();
    expect(
      await toolHandler?.({ toolName: "read", input: { path: "context/mismatch.json" } }),
    ).toBeUndefined();
    expect(
      await toolHandler?.({ toolName: "edit", input: { path: "analysis.json" } }),
    ).toBeUndefined();
    await expect(
      toolHandler?.({ toolName: "edit", input: { path: "rtl/TopModule.sv" } }),
    ).resolves.toMatchObject({ block: true });
    await expect(
      toolHandler?.({ toolName: "read", input: { path: "../.env" } }),
    ).resolves.toMatchObject({ block: true });
    await expect(
      toolHandler?.({ toolName: "write", input: { path: "analysis.json" } }),
    ).resolves.toMatchObject({ block: true });
  });

  it("rejects a provider payload before writing when the byte limit would be exceeded", async () => {
    const root = await temporaryRoot();
    const workspace = path.join(root, "workspace");
    const capturePath = path.join(root, "provider-requests.jsonl");
    process.env.RTL_AGENT_PI_POLICY_REQUIRED = "1";
    process.env.RTL_AGENT_PI_WORKSPACE_ROOT = workspace;
    process.env.RTL_AGENT_PI_PROVIDER_TRANSCRIPT_PATH = capturePath;
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
    ).toThrow("Pi provider transcript byte limit exceeded");
    expect(await readFile(capturePath, "utf8")).toBe("");
  });

  it("rejects an Assistant response before writing when the transcript byte limit is exceeded", async () => {
    const root = await temporaryRoot();
    const workspace = path.join(root, "workspace");
    const capturePath = path.join(root, "provider-transcript.jsonl");
    process.env.RTL_AGENT_PI_POLICY_REQUIRED = "1";
    process.env.RTL_AGENT_PI_WORKSPACE_ROOT = workspace;
    process.env.RTL_AGENT_PI_PROVIDER_TRANSCRIPT_PATH = capturePath;
    process.env.RTL_AGENT_PI_PROVIDER_CAPTURE_MAX_REQUESTS = "64";
    process.env.RTL_AGENT_PI_PROVIDER_CAPTURE_MAX_BYTES = "256";
    let providerHandler: ((event: { payload: unknown }) => unknown) | undefined;
    let messageHandler: ((event: { message: unknown }) => unknown) | undefined;
    const extension = (await import(pathToFileURL(POLICY_EXTENSION).href)) as {
      default(pi: {
        on(
          name: string,
          callback: (event: { payload?: unknown; message?: unknown }) => unknown,
        ): void;
      }): void;
    };
    extension.default({
      on: (name, callback) => {
        if (name === "before_provider_request") {
          providerHandler = callback as (event: { payload: unknown }) => unknown;
        } else if (name === "message_end") {
          messageHandler = callback as (event: { message: unknown }) => unknown;
        }
      },
    });

    providerHandler?.({ payload: { messages: [] } });
    const requestOnly = await readFile(capturePath, "utf8");
    expect(() =>
      messageHandler?.({
        message: { role: "assistant", content: [{ type: "text", text: "x".repeat(256) }] },
      }),
    ).toThrow("Pi provider transcript byte limit exceeded");
    expect(await readFile(capturePath, "utf8")).toBe(requestOnly);
  });
});
