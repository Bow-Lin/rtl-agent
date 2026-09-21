import assert from "node:assert/strict";
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { digest, exclusiveJson } from "./verification-memory.ts";
import { K3_NO_TOOL_CONFIG } from "./verification-memory-v2-build.ts";
import { v2ExtractionRequest } from "./verification-memory-v2.ts";
import { sourceRun } from "./verification-source-input.ts";
import {
  RECOVERY_ID,
  RECOVERY_LABEL,
  REMAINING_SOURCES,
  auditRecoveryProvider,
  recoveryMain,
  runRecovery,
  verifyBoundFiles,
} from "./verification-preparation-recovery.ts";
import type { RecoveryPlan } from "./verification-preparation-recovery.ts";

const valid = JSON.stringify({ schemaVersion: 2, reviewStatus: "PENDING_HUMAN_REVIEW", items: [] });
async function fixture() {
  const repo = await mkdtemp(path.join(os.tmpdir(), "preparation-recovery-"));
  const original = path.join(repo, ".rtl-agent", "verification-memory-v2", RECOVERY_LABEL);
  await mkdir(original, { recursive: true });
  await writeFile(path.join(repo, "original.txt"), "immutable original evidence");
  const plan: RecoveryPlan = {
    schemaVersion: 1,
    label: RECOVERY_LABEL,
    recovery: RECOVERY_ID,
    originalProviderCalls: 2,
    maximumNewProviderCalls: 3,
    maximumTotalProviderCalls: 5,
    calls: REMAINING_SOURCES.map((source) => {
      const bundle = {
        source,
        evidence: [
          {
            id: `${source}:fixture`,
            kind: "trajectory",
            sha256: "fixture",
            path: `.rtl-agent/project-coverage-runs/${sourceRun(source)}/evidence/fixture.json`,
            data: {},
          },
        ],
      };
      return { source, bundle, ...v2ExtractionRequest(bundle) };
    }),
    boundFiles: [{ path: "original.txt", sha256: digest("immutable original evidence") }],
  };
  return { repo, plan, out: path.join(original, RECOVERY_ID), original };
}
type MockInput = { repo: string; callDirectory: string; system: string; prompt: string };
async function provider(input: MockInput, raw = valid) {
  const request = {
    model: "k3",
    system: [
      {
        type: "text",
        text: `${input.system}\nCurrent working directory: ${input.callDirectory.split(path.sep).join("/")}`,
      },
    ],
    messages: [{ role: "user", content: [{ type: "text", text: input.prompt }] }],
  };
  const response = {
    provider: "kimi-coding",
    model: "k3",
    stopReason: "stop",
    content: [{ type: "text", text: raw }],
  };
  await exclusiveJson(path.join(input.callDirectory, "model-config.json"), K3_NO_TOOL_CONFIG);
  await exclusiveJson(path.join(input.callDirectory, "provider-request-1.json"), request);
  await exclusiveJson(path.join(input.callDirectory, "provider-response-1.json"), response);
  await exclusiveJson(path.join(input.callDirectory, "provider-transcript.json"), {
    complete: true,
    timedOut: false,
    requestAuditFailed: false,
    requests: [request],
    responses: [response],
  });
  return raw;
}

test("reuses exactly the three original requests serially; structural failure consumes its call and continues", async () => {
  const { repo, plan, out, original } = await fixture();
  const calls: string[] = [];
  let active = 0;
  try {
    const result = await runRecovery(repo, {
      preflight: async () => plan,
      caller: async (input) => {
        const expected = plan.calls[calls.length]!;
        assert.equal(input.system, expected.system);
        assert.equal(input.prompt, expected.prompt);
        assert.equal(++active, 1);
        calls.push(expected.source);
        await new Promise((resolve) => setImmediate(resolve));
        const text = await provider(input, expected.source === "ufifo" ? "not-json" : valid);
        active--;
        return text;
      },
    });
    assert.deepEqual(calls, REMAINING_SOURCES);
    assert.equal(result.totalProviderCalls, 5);
    assert.equal(result.publication, false);
    assert.deepEqual(
      result.results.map((entry) => entry.status),
      ["VALID_PENDING_SEMANTIC_REVIEW", "STRUCTURAL_FAILURE", "VALID_PENDING_SEMANTIC_REVIEW"],
    );
    assert.equal(
      await readFile(path.join(out, "extract-ufifo", "response.txt"), "utf8"),
      "not-json",
    );
    await verifyBoundFiles(repo, [
      ...result.originalAndRuntimeFiles,
      result.recoveryPlan,
      ...result.files,
    ]);
    for (const source of REMAINING_SOURCES)
      await assert.rejects(access(path.join(original, `extract-${source}`)));
    await assert.rejects(access(path.join(out, "published")));
    await assert.rejects(
      runRecovery(repo, {
        preflight: async () => plan,
        caller: async () => assert.fail("no second attempt"),
      }),
      /EEXIST/,
    );
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("provider error stops at the submitted source, retains evidence and rejects reentry", async () => {
  const { repo, plan, out } = await fixture();
  let count = 0;
  try {
    await assert.rejects(
      runRecovery(repo, {
        preflight: async () => plan,
        caller: async (input) => {
          count++;
          if (count === 1) return provider(input);
          await exclusiveJson(path.join(input.callDirectory, "provider-transcript.json"), {
            complete: false,
            requests: [{}],
            responses: [],
            timedOut: true,
            requestAuditFailed: false,
          });
          throw new Error("connection uncertain");
        },
      }),
      /STOPPED_NO_RETRY/,
    );
    assert.equal(count, 2);
    const failure = JSON.parse(await readFile(path.join(out, "failure.json"), "utf8"));
    assert.equal(failure.maximumTotalCallsPossiblyConsumed, 4);
    assert.equal(failure.results[1].status, "PROVIDER_OR_INFRASTRUCTURE_FAILURE");
    assert.equal(failure.results[1].callStarted, true);
    await assert.rejects(access(path.join(out, "extract-openhmc")));
    await assert.rejects(access(path.join(out, "manifest.json")));
    await assert.rejects(
      runRecovery(repo, {
        preflight: async () => plan,
        caller: async () => assert.fail("no retry"),
      }),
      /EEXIST/,
    );
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("bound original change blocks all calls; mid-run change blocks the next source", async () => {
  for (const before of [true, false]) {
    const { repo, plan, out } = await fixture();
    let count = 0;
    try {
      if (before) await writeFile(path.join(repo, "original.txt"), "changed");
      await assert.rejects(
        runRecovery(repo, {
          preflight: async () => plan,
          caller: async (input) => {
            count++;
            const raw = await provider(input);
            await writeFile(path.join(repo, "original.txt"), "changed");
            return raw;
          },
        }),
      );
      assert.equal(count, before ? 0 : 1);
      await assert.rejects(access(path.join(out, "manifest.json")));
    } finally {
      await rm(repo, { recursive: true, force: true });
    }
  }
});

test("invalid or extra actual provider evidence is infrastructure failure, never parser-only continuation", async () => {
  for (const flaw of ["missing", "extra-request", "context", "tools", "raw-mismatch"]) {
    const { repo, plan, out } = await fixture();
    let count = 0;
    try {
      await assert.rejects(
        runRecovery(repo, {
          preflight: async () => plan,
          caller: async (input) => {
            count++;
            if (flaw === "missing") return valid;
            const raw = await provider(input);
            const file = path.join(input.callDirectory, "provider-transcript.json");
            const transcript = JSON.parse(await readFile(file, "utf8"));
            if (flaw === "extra-request") transcript.requests.push(transcript.requests[0]);
            if (flaw === "context")
              transcript.requests[0].messages.push({
                role: "user",
                content: [{ type: "text", text: "extra context" }],
              });
            if (flaw === "tools") transcript.requests[0].tools = [{ name: "read" }];
            if (flaw === "context" || flaw === "tools")
              await writeFile(
                path.join(input.callDirectory, "provider-request-1.json"),
                JSON.stringify(transcript.requests[0]),
              );
            await writeFile(file, JSON.stringify(transcript));
            return flaw === "raw-mismatch" ? "different raw" : raw;
          },
        }),
        /STOPPED_NO_RETRY/,
      );
      assert.equal(count, 1);
      const failure = JSON.parse(await readFile(path.join(out, "failure.json"), "utf8"));
      assert.equal(failure.results[0].status, "PROVIDER_OR_INFRASTRUCTURE_FAILURE");
      await assert.rejects(access(path.join(out, "extract-ufifo")));
    } finally {
      await rm(repo, { recursive: true, force: true });
    }
  }
});

test("unknown original-source directory and lock ownership changes stop before another submission", async () => {
  for (const flaw of ["source-started", "lock-owner"]) {
    const { repo, plan, out, original } = await fixture();
    let count = 0;
    try {
      await assert.rejects(
        runRecovery(repo, {
          preflight: async () => plan,
          caller: async (input) => {
            count++;
            const raw = await provider(input);
            if (flaw === "source-started") await mkdir(path.join(original, "extract-ufifo"));
            else
              await writeFile(
                path.join(repo, ".rtl-agent", "verification-memory-build.lock"),
                JSON.stringify({ pid: -1 }),
              );
            return raw;
          },
        }),
        /STOPPED_NO_RETRY/,
      );
      assert.equal(count, 1);
      await assert.rejects(access(path.join(out, "manifest.json")));
    } finally {
      await rm(repo, { recursive: true, force: true });
    }
  }
});

test("strict CLI rejects other labels or recovery IDs without starting work", async () => {
  for (const args of [
    ["run", "other", RECOVERY_ID],
    ["run", RECOVERY_LABEL, "recovery-v2"],
    ["retry", RECOVERY_LABEL, RECOVERY_ID],
  ])
    await assert.rejects(recoveryMain(os.tmpdir(), args));
});

test("actual prepared prompt and expected current-directory suffix must match exactly", async () => {
  const { repo, plan } = await fixture();
  try {
    const logical = "fixture-call";
    const directory = path.join(repo, logical);
    await mkdir(directory);
    const input = { repo, callDirectory: directory, ...plan.calls[0]! };
    await provider(input);
    await auditRecoveryProvider(repo, logical, input, valid);
    await assert.rejects(
      auditRecoveryProvider(repo, logical, { ...input, prompt: input.prompt + " altered" }, valid),
      /PREPARED_PROMPT_CHANGED/,
    );
    await assert.rejects(
      auditRecoveryProvider(repo, logical, { ...input, system: input.system + " altered" }, valid),
      /SYSTEM_CONTEXT_CHANGED/,
    );
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});
