import { describe, expect, it } from "vitest";

import {
  createVerilogEvalKimiBaseProfile,
  createVerilogEvalKimiPiBaseProfile,
} from "../src/verilog-eval-profile.js";
import {
  DatasetDescriptorSchema,
  FixtureCaseRefSchema,
  IcarusCapabilitySchema,
  OpenCodeCapabilitySchema,
  PiCapabilitySchema,
  VERILOG_EVAL_DATASET_LOCK,
  sha256Bytes,
} from "../../../packages/core-loop/src/index.js";
import type {
  AgentCapability,
  AgentTurnResult,
  CompileResult,
  CoreLoopCompilerAdapter,
  DatasetSelection,
  FixtureCaseRef,
  FixtureMaterialization,
  FixtureProvider,
  IcarusCapability,
  RtlAgentAdapter,
} from "../../../packages/core-loop/src/index.js";

const DIGEST_A = `sha256:${"a".repeat(64)}` as const;
const DIGEST_B = `sha256:${"b".repeat(64)}` as const;
const DIGEST_C = `sha256:${"c".repeat(64)}` as const;

class VerilogEvalProfileTestProvider implements FixtureProvider {
  public async describe() {
    return DatasetDescriptorSchema.parse({
      schemaVersion: 1,
      datasetId: VERILOG_EVAL_DATASET_LOCK.datasetId,
      datasetVersion: VERILOG_EVAL_DATASET_LOCK.datasetVersion,
      datasetSourceDigest: VERILOG_EVAL_DATASET_LOCK.contentManifestDigest,
      license: VERILOG_EVAL_DATASET_LOCK.license,
      adapter: VERILOG_EVAL_DATASET_LOCK.adapter,
      splits: [VERILOG_EVAL_DATASET_LOCK.split],
    });
  }

  public async *listCases(selection: DatasetSelection): AsyncIterable<FixtureCaseRef> {
    for (let index = 1; index <= VERILOG_EVAL_DATASET_LOCK.expectedCaseCount; index += 1) {
      yield FixtureCaseRefSchema.parse({
        schemaVersion: 1,
        fixtureId: `ve2-p${String(index).padStart(3, "0")}`,
        identity: {
          datasetId: VERILOG_EVAL_DATASET_LOCK.datasetId,
          datasetVersion: VERILOG_EVAL_DATASET_LOCK.datasetVersion,
          split: selection.split,
          caseId: `Prob${String(index).padStart(3, "0")}_test`,
        },
        caseSourceDigest: sha256Bytes(Buffer.from(`case-${String(index)}`)),
      });
    }
  }

  public materialize(): Promise<FixtureMaterialization> {
    throw new Error("Profile construction does not materialize fixtures");
  }
}

class StaticAgentAdapter implements RtlAgentAdapter {
  public constructor(private readonly capability: AgentCapability) {}

  public async probe(): Promise<AgentCapability> {
    return this.capability;
  }

  public runTurn(): Promise<AgentTurnResult> {
    throw new Error("Profile construction does not run Agent turns");
  }
}

class StaticCompilerAdapter implements CoreLoopCompilerAdapter {
  public constructor(private readonly capability: IcarusCapability) {}

  public async probe(): Promise<IcarusCapability> {
    return this.capability;
  }

  public compile(): Promise<CompileResult> {
    throw new Error("Profile construction does not compile");
  }
}

function compilerAdapter(): CoreLoopCompilerAdapter {
  return new StaticCompilerAdapter(
    IcarusCapabilitySchema.parse({
      schemaVersion: 1,
      compilerProfileId: "iverilog-systemverilog-2012-null-v1",
      executableProduct: "Icarus Verilog",
      executableDigest: DIGEST_A,
      toolVersion: "Icarus Verilog version 12.0",
      profileDigest: DIGEST_B,
      platform: process.platform,
      probeStdout: { preview: "", truncated: false, originalByteLength: 0 },
      probeStderr: { preview: "", truncated: false, originalByteLength: 0 },
    }),
  );
}

function openCodeAgent(model: string): RtlAgentAdapter {
  return new StaticAgentAdapter(
    OpenCodeCapabilitySchema.parse({
      schemaVersion: 1,
      openCodeVersion: "1.18.2",
      model,
      pureMode: true,
      agentName: "rtl-core-loop",
      requiredFlags: ["--agent", "--dir", "--format", "--model", "--title"],
      resolvedConfigDigest: DIGEST_A,
      resolvedAgentPermissionDigest: DIGEST_B,
      agentFileDigest: DIGEST_C,
      skillFileDigest: sha256Bytes(Buffer.from("skill")),
      guidanceFileDigest: sha256Bytes(Buffer.from("guidance")),
      experimentConfigDigest: sha256Bytes(Buffer.from(`opencode-${model}`)),
    }),
  );
}

function piAgent(provider: string, model: string): RtlAgentAdapter {
  return new StaticAgentAdapter(
    PiCapabilitySchema.parse({
      schemaVersion: 1,
      piVersion: "0.81.1",
      provider,
      model,
      sessionMode: "EPHEMERAL",
      agentName: "rtl-core-loop",
      requiredFlags: ["--provider", "--model"],
      enabledTools: ["read", "write", "edit"],
      resolvedConfigDigest: DIGEST_A,
      isolationConfigDigest: DIGEST_B,
      toolPolicyDigest: DIGEST_C,
      extensionFileDigest: sha256Bytes(Buffer.from("extension")),
      guidanceFileDigest: sha256Bytes(Buffer.from("guidance")),
      experimentConfigDigest: sha256Bytes(Buffer.from(`pi-${provider}-${model}`)),
    }),
  );
}

describe("VerilogEval Kimi profile", () => {
  it("locks the OpenCode model selected by environment instead of requiring kimi-for-coding", async () => {
    const profile = await createVerilogEvalKimiBaseProfile(
      new VerilogEvalProfileTestProvider(),
      openCodeAgent("kimi-code/k3"),
      compilerAdapter(),
    );

    expect(profile.agentCapability).toMatchObject({
      model: "kimi-code/k3",
    });
  });

  it("locks the Pi model selected by environment instead of requiring kimi-for-coding", async () => {
    const profile = await createVerilogEvalKimiPiBaseProfile(
      new VerilogEvalProfileTestProvider(),
      piAgent("kimi-coding", "k3"),
      compilerAdapter(),
    );

    expect(profile.agentCapability).toMatchObject({
      provider: "kimi-coding",
      model: "k3",
    });
  });

  it("still rejects non-Kimi OpenCode or Pi backends", async () => {
    await expect(
      createVerilogEvalKimiBaseProfile(
        new VerilogEvalProfileTestProvider(),
        openCodeAgent("openai/gpt-5"),
        compilerAdapter(),
      ),
    ).rejects.toMatchObject({ error: { code: "EVALUATION_PROFILE_INVALID" } });
    await expect(
      createVerilogEvalKimiPiBaseProfile(
        new VerilogEvalProfileTestProvider(),
        piAgent("other-provider", "k3"),
        compilerAdapter(),
      ),
    ).rejects.toMatchObject({ error: { code: "EVALUATION_PROFILE_INVALID" } });
  });
});
