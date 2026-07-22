import { access, appendFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import {
  OpenCodeRtlAgentAdapter,
  buildIsolatedOpenCodeEnvironment,
  createCoreLoopRun,
  openCodeExperimentConfigFromEnvironment,
  sha256Bytes,
} from "../src/index.js";
import type { AgentAttemptInput, CoreLoopRun, OpenCodeExperimentConfig } from "../src/index.js";
import { RUN_REQUEST, TestFixtureProvider } from "./fixtures.js";

const roots: string[] = [];
const REPOSITORY_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

const FAKE_OPENCODE_SOURCE = String.raw`
import { appendFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const args = process.argv.slice(2);
if (process.env.FAKE_OPENCODE_LOG) {
  appendFileSync(process.env.FAKE_OPENCODE_LOG, JSON.stringify(args) + "\n", "utf8");
}
if (args.length === 1 && args[0] === "--version") {
  process.stdout.write(process.env.FAKE_OPENCODE_VERSION ?? "1.2.3");
  process.exit(0);
}
if (args[0] === "run" && args[1] === "--help") {
  process.stdout.write("--agent --dir --format --model --title --variant");
  process.exit(0);
}
if (args[0] === "agent" && args[1] === "list") {
  const permissions = [
    { permission: "*", action: "deny", pattern: "*" },
    { permission: "read", action: "allow", pattern: "spec.md" },
    { permission: "read", action: "allow", pattern: "**/spec.md" },
    { permission: "read", action: "allow", pattern: "context/*" },
    { permission: "read", action: "allow", pattern: "**/context/*" },
    { permission: "read", action: "allow", pattern: "rtl/**" },
    { permission: "read", action: "allow", pattern: "**/rtl/**" },
    { permission: "edit", action: "allow", pattern: "rtl/*.sv" },
    { permission: "edit", action: "allow", pattern: "**/rtl/*.sv" },
    { permission: "edit", action: "allow", pattern: "rtl/**/*.sv" },
    { permission: "edit", action: "allow", pattern: "**/rtl/**/*.sv" },
    { permission: "edit", action: "allow", pattern: "rtl/*.v" },
    { permission: "edit", action: "allow", pattern: "**/rtl/*.v" },
    { permission: "edit", action: "allow", pattern: "rtl/**/*.v" },
    { permission: "edit", action: "allow", pattern: "**/rtl/**/*.v" },
    { permission: "edit", action: "allow", pattern: "rtl/*.svh" },
    { permission: "edit", action: "allow", pattern: "**/rtl/*.svh" },
    { permission: "edit", action: "allow", pattern: "rtl/**/*.svh" },
    { permission: "edit", action: "allow", pattern: "**/rtl/**/*.svh" },
    { permission: "edit", action: "allow", pattern: "rtl/*.vh" },
    { permission: "edit", action: "allow", pattern: "**/rtl/*.vh" },
    { permission: "edit", action: "allow", pattern: "rtl/**/*.vh" },
    { permission: "edit", action: "allow", pattern: "**/rtl/**/*.vh" },
    { permission: "skill", action: "allow", pattern: "rtl-core-loop" }
  ];
  if (process.env.FAKE_AGENT_PERMISSION_MODE === "allow-bash") {
    permissions.push({ permission: "bash", action: "allow", pattern: "*" });
  }
  process.stdout.write("rtl-core-loop (primary)\n" + JSON.stringify(permissions));
  process.exit(0);
}
if (args[0] === "debug" && args[1] === "config") {
  const resolved = {
    autoupdate: false,
    share: "disabled",
    snapshot: false,
    formatter: false,
    lsp: false,
    plugin: [],
    mcp: {},
    instructions: [],
    permission: process.env.FAKE_CONFIG_MODE === "allow"
      ? { "*": "deny", read: "allow" }
      : { "*": "deny" }
  };
  if (process.env.FAKE_CONFIG_DRIFT_KEY) {
    resolved[process.env.FAKE_CONFIG_DRIFT_KEY] =
      process.env.FAKE_CONFIG_DRIFT_KEY === "share" ? "auto" : true;
  }
  process.stdout.write(JSON.stringify(resolved));
  process.exit(0);
}
if (args[0] === "db" && args[1] === "path") {
  process.stdout.write(path.join(process.cwd(), "fake-opencode.db"));
  process.exit(0);
}

const runIndex = args.indexOf("run");
if (runIndex < 0 || args[0] !== "--pure") process.exit(64);
const directoryIndex = args.indexOf("--dir");
const workspace = args[directoryIndex + 1];
if (!workspace) process.exit(65);
const rtl = path.join(workspace, "rtl");
mkdirSync(rtl, { recursive: true });
switch (process.env.FAKE_OPENCODE_MODE) {
  case "change":
    writeFileSync(path.join(rtl, "dut.sv"), "module dut(input a, output y); assign y = a; endmodule\n");
    process.stdout.write(JSON.stringify({
      type: "part.updated",
      part: {
        type: "tool",
        tool: "edit",
        state: {
          status: "completed",
          output: "RAW_ASSISTANT_SECRET_MUST_NOT_PERSIST"
        }
      }
    }) + "\n");
    break;
  case "protected":
    writeFileSync(path.join(workspace, "spec.md"), "tampered\n");
    break;
  case "bad-extension":
    writeFileSync(path.join(rtl, "notes.txt"), "not rtl\n");
    break;
  case "no-compile-unit":
    rmSync(path.join(rtl, "dut.sv"), { force: true });
    writeFileSync(path.join(rtl, "defs.svh"), "\\x60define ONLY_HEADER 1\n");
    break;
  case "process-error":
    process.stderr.write(("failure C:\\private\\token \u001b[31msecret\u001b[0m\n").repeat(100));
    process.exit(7);
  case "timeout": {
    const latePath = path.join(rtl, "late.sv");
    const childSource = "setTimeout(() => require('node:fs').writeFileSync(process.env.FAKE_LATE_PATH, 'module late; endmodule\\n'), 2000)";
    spawn(process.execPath, ["-e", childSource], {
      env: { ...process.env, FAKE_LATE_PATH: latePath },
      stdio: "ignore"
    });
    setInterval(() => undefined, 1000);
    break;
  }
}
`;

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "rtl-agent-r02-test-"));
  roots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function createFakeOpenCode(root: string): Promise<{ script: string; log: string }> {
  const script = path.join(root, "fake-opencode.mjs");
  const log = path.join(root, "argv.jsonl");
  await writeFile(script, FAKE_OPENCODE_SOURCE, "utf8");
  await writeFile(log, "", "utf8");
  return { script, log };
}

async function createAgentFiles(root: string, guidance: string): Promise<void> {
  const agentDirectory = path.join(root, ".opencode", "agents");
  const skillDirectory = path.join(root, ".opencode", "skills", "rtl-core-loop");
  await mkdir(agentDirectory, { recursive: true });
  await mkdir(skillDirectory, { recursive: true });
  await Promise.all([
    writeFile(path.join(agentDirectory, "rtl-core-loop.md"), "synthetic agent\n", "utf8"),
    writeFile(path.join(skillDirectory, "SKILL.md"), "synthetic skill\n", "utf8"),
    writeFile(path.join(skillDirectory, "common-guidance.md"), guidance, "utf8"),
  ]);
}

function config(
  fake: { script: string; log: string },
  mode: string,
  overrides: Partial<OpenCodeExperimentConfig> = {},
): OpenCodeExperimentConfig {
  return {
    executable: process.execPath,
    executableArgumentsPrefix: [fake.script],
    expectedOpenCodeVersion: "1.2.3",
    repositoryRoot: REPOSITORY_ROOT,
    providerModel: "test/provider-model",
    variant: "deterministic",
    timeoutMs: 2_000,
    terminationGraceMs: 50,
    stabilityWindowMs: 20,
    stderrLimitBytes: 128,
    maximumEvents: 8,
    maximumEventLineBytes: 256,
    workspaceLimits: {
      maximumFiles: 8,
      maximumFileBytes: 4_096,
      maximumTotalBytes: 16_384,
    },
    environment: {
      FAKE_OPENCODE_LOG: fake.log,
      FAKE_OPENCODE_MODE: mode,
    },
    ...overrides,
  };
}

async function createRun(root: string, blank = false): Promise<CoreLoopRun> {
  return createCoreLoopRun(new TestFixtureProvider({ blank }), RUN_REQUEST, {
    runsRoot: path.join(root, "runs"),
    stagingRoot: path.join(root, "staging"),
  });
}

function inputFor(run: CoreLoopRun, rtlSourceFiles: readonly string[]): AgentAttemptInput {
  return {
    schemaVersion: 1,
    runId: run.runId,
    attempt: 1,
    category: run.fixture.category,
    specPath: "spec.md",
    workspaceRtlRoot: "rtl",
    rtlSourceFiles: [...rtlSourceFiles] as AgentAttemptInput["rtlSourceFiles"],
    topModule: run.fixture.topModule,
  };
}

async function expectMissing(hostPath: string): Promise<void> {
  await expect(access(hostPath)).rejects.toMatchObject({ code: "ENOENT" });
}

describe("OpenCode RTL Agent adapter", () => {
  it("removes caller overrides and installs the fixed isolation environment", async () => {
    const root = await temporaryRoot();
    const fake = await createFakeOpenCode(root);
    const isolated = buildIsolatedOpenCodeEnvironment({
      ...config(fake, "no-change"),
      environment: {
        OPENCODE_CONFIG: "host-config.json",
        OPENCODE_CONFIG_DIR: "host-config-directory",
        OPENCODE_PERMISSION: "allow",
      },
    });
    expect(isolated.OPENCODE_CONFIG).toBeUndefined();
    expect(isolated.OPENCODE_CONFIG_DIR).toBe(path.join(REPOSITORY_ROOT, ".opencode"));
    expect(isolated.OPENCODE_PERMISSION).toBeUndefined();
    expect(isolated.OPENCODE_DISABLE_AUTOUPDATE).toBe("1");
    expect(JSON.parse(isolated.OPENCODE_CONFIG_CONTENT!) as unknown).toMatchObject({
      autoupdate: false,
      share: "disabled",
      snapshot: false,
      formatter: false,
      lsp: false,
      plugin: [],
      mcp: {},
      instructions: [],
      permission: { "*": "deny" },
    });
  });

  it("configures Kimi Code through an environment reference without serializing its key", async () => {
    const root = await temporaryRoot();
    const fake = await createFakeOpenCode(root);
    const configured = openCodeExperimentConfigFromEnvironment(
      {
        RTL_AGENT_OPENCODE_EXECUTABLE: fake.script,
        RTL_AGENT_OPENCODE_VERSION: "1.2.3",
        RTL_AGENT_OPENCODE_MODEL: "kimi-code/kimi-for-coding",
        KIMI_CODE_API_KEY: "test-only-key",
      },
      REPOSITORY_ROOT,
    );
    const isolated = buildIsolatedOpenCodeEnvironment(configured);
    const serializedConfig = isolated.OPENCODE_CONFIG_CONTENT!;

    expect(isolated.KIMI_CODE_API_KEY).toBe("test-only-key");
    expect(serializedConfig).not.toContain("test-only-key");
    expect(JSON.parse(serializedConfig) as unknown).toMatchObject({
      provider: {
        "kimi-code": {
          npm: "@ai-sdk/openai-compatible",
          options: {
            baseURL: "https://api.kimi.com/coding/v1",
            apiKey: "{env:KIMI_CODE_API_KEY}",
          },
          models: {
            "kimi-for-coding": { name: "Kimi for Coding" },
          },
        },
      },
    });
  });

  it("requires a Kimi Code key when that provider is selected", () => {
    expect(() =>
      openCodeExperimentConfigFromEnvironment(
        {
          RTL_AGENT_OPENCODE_EXECUTABLE: "C:\\tools\\opencode.exe",
          RTL_AGENT_OPENCODE_VERSION: "1.18.2",
          RTL_AGENT_OPENCODE_MODEL: "kimi-code/kimi-for-coding",
        },
        REPOSITORY_ROOT,
      ),
    ).toThrowError(
      expect.objectContaining({
        error: expect.objectContaining({ code: "OPENCODE_NOT_CONFIGURED" }),
      }),
    );
  });

  it("probes locked capabilities and records only projected events for a valid RTL change", async () => {
    const root = await temporaryRoot();
    const fake = await createFakeOpenCode(root);
    const run = await createRun(root);
    const adapter = new OpenCodeRtlAgentAdapter(config(fake, "change"));
    const capability = await adapter.probe();
    expect(capability).toMatchObject({
      openCodeVersion: "1.2.3",
      model: "test/provider-model",
      variant: "deterministic",
      pureMode: true,
      agentName: "rtl-core-loop",
    });
    const guidanceBytes = await readFile(
      path.join(REPOSITORY_ROOT, ".opencode", "skills", "rtl-core-loop", "common-guidance.md"),
    );
    expect(capability.guidanceFileDigest).toBe(sha256Bytes(guidanceBytes));

    const result = await adapter.runTurn(inputFor(run, ["rtl/dut.sv"]), run);
    expect(result).toMatchObject({
      outcome: "RTL_CHANGED",
      workspaceUsableForCompile: true,
      rtlChanged: true,
      exitCode: 0,
      timedOut: false,
      guidanceFileDigest: capability.guidanceFileDigest,
      eventStream: {
        events: [{ category: "TOOL_RESULT", toolName: "edit", status: "completed" }],
      },
    });
    const evidence = await readFile(
      path.join(run.runDirectory, "evidence", "attempts", "1", "agent-turn-result.json"),
      "utf8",
    );
    expect(evidence).not.toContain("RAW_ASSISTANT_SECRET_MUST_NOT_PERSIST");
    expect(evidence).not.toContain(fake.log);

    const invocations = (await readFile(fake.log, "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as string[]);
    const turn = invocations.at(-1)!;
    expect(turn.slice(0, 2)).toEqual(["--pure", "run"]);
    expect(turn).toContain("--model");
    expect(turn).toContain("--variant");
    expect(turn).not.toContain("--auto");
    expect(turn).not.toContain("--thinking");
    expect(turn).not.toContain("--continue");
    expect(turn).not.toContain("--session");
    expect(turn).not.toContain("--fork");
    expect(turn).not.toContain("--attach");
    const prompt = turn.at(-1)!;
    expect(prompt).toContain("# RTL Generation Common Guidance");
    expect(prompt).toContain("## Compile");
    expect(prompt).toContain("## Logic");
    expect(prompt).toContain("Avoid ternary expressions that assign directly to an enum variable");
  });

  it("changes the experiment digest when executable prefix arguments change", async () => {
    const firstRoot = await temporaryRoot();
    const secondRoot = await temporaryRoot();
    const firstFake = await createFakeOpenCode(firstRoot);
    const secondFake = await createFakeOpenCode(secondRoot);
    const firstPrefix = [firstFake.script];
    const firstAdapter = new OpenCodeRtlAgentAdapter({
      ...config(firstFake, "no-change"),
      executableArgumentsPrefix: firstPrefix,
    });
    firstPrefix.push("--mutated-after-construction");

    const first = await firstAdapter.probe();
    const second = await new OpenCodeRtlAgentAdapter(config(secondFake, "no-change")).probe();

    expect(first.experimentConfigDigest).not.toBe(second.experimentConfigDigest);
  });

  it("changes the locked capability when common guidance changes", async () => {
    const root = await temporaryRoot();
    const fake = await createFakeOpenCode(root);
    await createAgentFiles(root, "# Guidance v1\n");
    const adapter = new OpenCodeRtlAgentAdapter(
      config(fake, "no-change", { repositoryRoot: root }),
    );
    const first = await adapter.probe();
    await writeFile(
      path.join(root, ".opencode", "skills", "rtl-core-loop", "common-guidance.md"),
      "# Guidance v2\n",
      "utf8",
    );
    const second = await adapter.probe();

    expect(first.guidanceFileDigest).not.toBe(second.guidanceFileDigest);
    expect(first.agentFileDigest).toBe(second.agentFileDigest);
    expect(first.skillFileDigest).toBe(second.skillFileDigest);
  });

  it.each([
    ["no-change", "NO_RTL_CHANGE"],
    ["process-error", "AGENT_PROCESS_ERROR"],
    ["protected", "POLICY_VIOLATION"],
    ["bad-extension", "POLICY_VIOLATION"],
    ["no-compile-unit", "POLICY_VIOLATION"],
  ] as const)("maps fake mode %s to %s", async (mode, expectedOutcome) => {
    const root = await temporaryRoot();
    const fake = await createFakeOpenCode(root);
    const run = await createRun(root);
    const result = await new OpenCodeRtlAgentAdapter(config(fake, mode)).runTurn(
      inputFor(run, ["rtl/dut.sv"]),
      run,
    );
    expect(result.outcome).toBe(expectedOutcome);
    expect(result.workspaceUsableForCompile).toBe(false);
    if (mode === "process-error") {
      expect(result.exitCode).toBe(7);
      expect(result.stderr.truncated).toBe(true);
      expect(Buffer.byteLength(result.stderr.preview, "utf8")).toBeLessThanOrEqual(128);
    }
  });

  it("fails closed when the declared RTL source list does not match the workspace", async () => {
    const root = await temporaryRoot();
    const fake = await createFakeOpenCode(root);
    const run = await createRun(root);
    await expect(
      new OpenCodeRtlAgentAdapter(config(fake, "change")).runTurn(inputFor(run, []), run),
    ).rejects.toMatchObject({ error: { code: "AGENT_INPUT_INVALID" } });
  });

  it("kills the complete fake process tree before post-turn evidence is accepted", async () => {
    const root = await temporaryRoot();
    const fake = await createFakeOpenCode(root);
    const run = await createRun(root);
    const result = await new OpenCodeRtlAgentAdapter(
      config(fake, "timeout", {
        timeoutMs: 500,
        terminationGraceMs: 250,
      }),
    ).runTurn(inputFor(run, ["rtl/dut.sv"]), run);
    expect(result).toMatchObject({
      outcome: "AGENT_TIMEOUT",
      workspaceUsableForCompile: false,
      timedOut: true,
    });
    await new Promise((resolve) => setTimeout(resolve, 2200));
    await expectMissing(path.join(run.workspaceDirectory, "rtl", "late.sv"));
  });

  it("rejects a capability version mismatch with a stable error", async () => {
    const root = await temporaryRoot();
    const fake = await createFakeOpenCode(root);
    await appendFile(fake.log, "", "utf8");
    const adapter = new OpenCodeRtlAgentAdapter(
      config(fake, "no-change", {
        environment: {
          FAKE_OPENCODE_LOG: fake.log,
          FAKE_OPENCODE_VERSION: "9.9.9",
        },
      }),
    );
    await expect(adapter.probe()).rejects.toMatchObject({
      error: { code: "OPENCODE_CAPABILITY_MISMATCH" },
    });
  });

  it("rejects a resolved config that retains an allow permission", async () => {
    const root = await temporaryRoot();
    const fake = await createFakeOpenCode(root);
    const adapter = new OpenCodeRtlAgentAdapter(
      config(fake, "no-change", {
        environment: {
          FAKE_OPENCODE_LOG: fake.log,
          FAKE_CONFIG_MODE: "allow",
        },
      }),
    );
    await expect(adapter.probe()).rejects.toMatchObject({
      error: { code: "OPENCODE_CAPABILITY_MISMATCH" },
    });
  });

  it.each(["autoupdate", "share", "snapshot", "formatter", "lsp"] as const)(
    "rejects effective OpenCode %s drift",
    async (key) => {
      const root = await temporaryRoot();
      const fake = await createFakeOpenCode(root);
      const adapter = new OpenCodeRtlAgentAdapter(
        config(fake, "no-change", {
          environment: {
            FAKE_OPENCODE_LOG: fake.log,
            FAKE_CONFIG_DRIFT_KEY: key,
          },
        }),
      );
      await expect(adapter.probe()).rejects.toMatchObject({
        error: { code: "OPENCODE_CAPABILITY_MISMATCH" },
      });
    },
  );

  it("rejects a resolved Agent that retains an unexpected tool allow", async () => {
    const root = await temporaryRoot();
    const fake = await createFakeOpenCode(root);
    const adapter = new OpenCodeRtlAgentAdapter(
      config(fake, "no-change", {
        environment: {
          FAKE_OPENCODE_LOG: fake.log,
          FAKE_AGENT_PERMISSION_MODE: "allow-bash",
        },
      }),
    );
    await expect(adapter.probe()).rejects.toMatchObject({
      error: { code: "OPENCODE_CAPABILITY_MISMATCH" },
    });
  });
});
