import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  AgentTurnResultSchema,
  CompileResultSchema,
  CoreLoopRunProfileSchema,
  CreateRunRequestSchema,
  DatasetDescriptorSchema,
  DatasetSelectionSchema,
  EvaluationProfileSchema,
  FIXED_ICARUS_PROFILE_ID,
  FixtureCaseRefSchema,
  FixtureMaterializationSchema,
  IcarusCapabilitySchema,
  OpenCodeCapabilitySchema,
  compilerCapabilityLockFromCapability,
  createCoreLoopRun,
  sha256Bytes,
  sha256Jcs,
} from "../src/index.js";
import type {
  AgentAttemptInput,
  AgentTurnOutcome,
  AgentTurnResult,
  CompileRequest,
  CompileResult,
  CoreLoopCompilerAdapter,
  CoreLoopRun,
  DatasetDescriptor,
  DatasetSelection,
  EvaluationProfile,
  FixtureCaseRef,
  FixtureMaterialization,
  FixtureProvider,
  HostDirectory,
  IcarusCapability,
  OpenCodeCapability,
  RtlAgentAdapter,
} from "../src/index.js";

const EMPTY_OUTPUT = {
  preview: "",
  truncated: false,
  originalByteLength: 0,
} as const;
const DIGEST_A = `sha256:${"a".repeat(64)}` as const;
const DIGEST_B = `sha256:${"b".repeat(64)}` as const;
const DIGEST_C = `sha256:${"c".repeat(64)}` as const;
const TOOL_VERSION = "Icarus Verilog version 12.0 (devel) (s20150603-1539-g2693dd32b)" as const;
export const TEST_PROVIDER_IMPLEMENTATION_DIGEST = sha256Bytes(
  Buffer.from("evaluation-test-provider-v1"),
);

export const TEST_AGENT_CAPABILITY: OpenCodeCapability = OpenCodeCapabilitySchema.parse({
  schemaVersion: 1,
  openCodeVersion: "1.18.2",
  model: "test/model",
  variant: "deterministic",
  pureMode: true,
  agentName: "rtl-core-loop",
  requiredFlags: ["--agent", "--dir", "--format", "--model", "--title", "--variant"],
  resolvedConfigDigest: DIGEST_A,
  resolvedAgentPermissionDigest: DIGEST_B,
  agentFileDigest: DIGEST_C,
  skillFileDigest: sha256Bytes(Buffer.from("skill")),
  experimentConfigDigest: sha256Bytes(Buffer.from("experiment")),
});

export const TEST_COMPILER_CAPABILITY: IcarusCapability = IcarusCapabilitySchema.parse({
  schemaVersion: 1,
  compilerProfileId: FIXED_ICARUS_PROFILE_ID,
  executableProduct: "Icarus Verilog",
  executableDigest: sha256Bytes(Buffer.from("iverilog")),
  toolVersion: TOOL_VERSION,
  profileDigest: sha256Bytes(Buffer.from("profile")),
  platform: process.platform,
  probeStdout: EMPTY_OUTPUT,
  probeStderr: EMPTY_OUTPUT,
});

export interface TestCaseDefinition {
  readonly caseId: string;
  readonly fixtureId: string;
  readonly category: "BLANK_GENERATION" | "PROMPTED_FUNCTIONAL_REPAIR" | "SEEDED_COMPILE_REPAIR";
}

export class EvaluationTestProvider implements FixtureProvider {
  public materializedCount = 0;

  public constructor(
    public readonly cases: readonly TestCaseDefinition[] = [
      {
        caseId: "case/001",
        fixtureId: "case-001",
        category: "SEEDED_COMPILE_REPAIR",
      },
    ],
  ) {}

  public async describe(): Promise<DatasetDescriptor> {
    return DatasetDescriptorSchema.parse({
      schemaVersion: 1,
      datasetId: "evaluation-test-dataset",
      datasetVersion: "v1",
      datasetSourceDigest: sha256Bytes(Buffer.from("evaluation-test-dataset")),
      license: {
        name: "Synthetic test data only",
        spdxId: "CC0-1.0",
        reference: "https://example.invalid/evaluation-test",
      },
      adapter: {
        adapterId: "evaluation-test-adapter",
        adapterVersion: "v1",
        normalizationVersion: "v1",
      },
      splits: ["test"],
    });
  }

  private caseRef(definition: TestCaseDefinition): FixtureCaseRef {
    return FixtureCaseRefSchema.parse({
      schemaVersion: 1,
      fixtureId: definition.fixtureId,
      identity: {
        datasetId: "evaluation-test-dataset",
        datasetVersion: "v1",
        split: "test",
        caseId: definition.caseId,
      },
      caseSourceDigest: sha256Bytes(Buffer.from(definition.caseId)),
    });
  }

  public async *listCases(selection: DatasetSelection): AsyncIterable<FixtureCaseRef> {
    const requested =
      selection.caseIds === undefined ? undefined : new Set<string>(selection.caseIds);
    let count = 0;
    for (const definition of this.cases) {
      if (requested !== undefined && !requested.has(definition.caseId)) continue;
      count += 1;
      if (selection.maximumCases !== undefined && count > selection.maximumCases) {
        break;
      }
      yield this.caseRef(definition);
    }
  }

  public async materialize(
    caseRef: FixtureCaseRef,
    destination: HostDirectory,
  ): Promise<FixtureMaterialization> {
    const definition = this.cases.find((candidate) => candidate.caseId === caseRef.identity.caseId);
    if (definition === undefined) throw new Error("missing test case");
    this.materializedCount += 1;
    await writeFile(
      path.join(destination, "problem.md"),
      "Create module dut(input logic a, output logic y).\n",
    );
    if (definition.category === "SEEDED_COMPILE_REPAIR") {
      await mkdir(path.join(destination, "starter"), { recursive: true });
      await writeFile(
        path.join(destination, "starter", "dut.sv"),
        "module dut; BROKEN endmodule\n",
      );
    }
    return FixtureMaterializationSchema.parse({
      schemaVersion: 1,
      fixtureId: caseRef.fixtureId,
      identity: caseRef.identity,
      caseSourceDigest: caseRef.caseSourceDigest,
      category: definition.category,
      specPath: "problem.md",
      ...(definition.category === "SEEDED_COMPILE_REPAIR" ? { starterRtlRoot: "starter" } : {}),
      topModule: "dut",
      tags: ["evaluation", "test-only"],
    });
  }
}

export async function testEvaluationProfile(
  provider: EvaluationTestProvider,
  maximumAttempts = 3,
): Promise<EvaluationProfile> {
  const descriptor = await provider.describe();
  const selection = DatasetSelectionSchema.parse({
    schemaVersion: 1,
    split: "test",
    caseIds: provider.cases.map((definition) => definition.caseId),
  });
  return EvaluationProfileSchema.parse({
    schemaVersion: 1,
    evaluationProfileId: "evaluation-test-v1",
    dataset: descriptor,
    providerImplementationDigest: TEST_PROVIDER_IMPLEMENTATION_DIGEST,
    selection,
    expectedCaseCount: provider.cases.length,
    expectedOrderedCaseIdsDigest: sha256Jcs(provider.cases.map((definition) => definition.caseId)),
    runProfile: CoreLoopRunProfileSchema.parse({
      schemaVersion: 1,
      profileId: "evaluation-test-run-v1",
      compilerProfileId: FIXED_ICARUS_PROFILE_ID,
      maxAttempts: maximumAttempts,
      stdoutLimitBytes: 65_536,
      stderrLimitBytes: 65_536,
      maximumIssues: 100,
      issueMessageLimitBytes: 2_048,
    }),
    agentCapability: TEST_AGENT_CAPABILITY,
    compilerCapability: compilerCapabilityLockFromCapability(TEST_COMPILER_CAPABILITY),
    thresholds: {
      minimumValidCases: 1,
      minimumBlankGenerationCases: provider.cases.some(
        (definition) => definition.category === "BLANK_GENERATION",
      )
        ? 1
        : 0,
      minimumSeededCompileRepairCases: provider.cases.some(
        (definition) => definition.category === "SEEDED_COMPILE_REPAIR",
      )
        ? 1
        : 0,
      minimumFirstAttemptDenominator: 1,
      minimumWithinMaxAttemptsDenominator: 1,
      minimumRecoveryDenominator: 0,
      minimumFirstAttemptRate: 0,
      minimumWithinMaxAttemptsRate: 0,
      minimumRecoveryRate: 0,
      maximumPolicyViolations: 0,
    },
    humanReview: { strategy: "ALL_CONFIRMED_PASSES" },
  });
}

export async function createEvaluationTestRun(
  root: string,
  provider: EvaluationTestProvider,
  maximumAttempts = 3,
): Promise<CoreLoopRun> {
  const profile = await testEvaluationProfile(provider, maximumAttempts);
  const selection = profile.selection;
  let caseRef: FixtureCaseRef | undefined;
  for await (const candidate of provider.listCases(selection)) {
    caseRef = candidate;
    break;
  }
  if (caseRef === undefined) throw new Error("test provider has no case");
  return createCoreLoopRun(
    provider,
    CreateRunRequestSchema.parse({
      schemaVersion: 1,
      caseRef,
      profile: profile.runProfile,
    }),
    {
      runsRoot: path.join(root, "runs"),
      stagingRoot: path.join(root, "staging"),
    },
  );
}

export interface AgentAction {
  readonly outcome: AgentTurnOutcome;
  readonly source?: string | null;
  readonly driftCapability?: boolean;
}

export class ScriptedAgentAdapter implements RtlAgentAdapter {
  public readonly inputs: AgentAttemptInput[] = [];

  public constructor(
    private readonly actions: readonly AgentAction[],
    private readonly onTurn?: () => void,
  ) {}

  public async probe(): Promise<OpenCodeCapability> {
    return TEST_AGENT_CAPABILITY;
  }

  public async runTurn(rawInput: unknown, run: CoreLoopRun): Promise<AgentTurnResult> {
    this.onTurn?.();
    const input = rawInput as AgentAttemptInput;
    this.inputs.push(input);
    const action = this.actions[this.inputs.length - 1];
    if (action === undefined) throw new Error("No scripted Agent action");
    const sourcePath = path.join(run.workspaceDirectory, "rtl", "dut.sv");
    if (action.source === null) {
      await rm(sourcePath, { force: true });
    } else if (action.source !== undefined) {
      await writeFile(sourcePath, action.source);
    }
    const policyViolation = action.outcome === "POLICY_VIOLATION";
    const changed = action.outcome === "RTL_CHANGED";
    return AgentTurnResultSchema.parse({
      schemaVersion: 1,
      runId: run.runId,
      attempt: input.attempt,
      outcome: action.outcome,
      workspaceUsableForCompile: changed,
      rtlChanged: changed,
      beforeManifestDigest: DIGEST_A,
      afterManifestDigest: DIGEST_B,
      exitCode:
        action.outcome === "AGENT_PROCESS_ERROR"
          ? 7
          : action.outcome === "AGENT_TIMEOUT"
            ? null
            : 0,
      timedOut: action.outcome === "AGENT_TIMEOUT",
      durationMs: 10,
      openCodeVersion: TEST_AGENT_CAPABILITY.openCodeVersion,
      model: TEST_AGENT_CAPABILITY.model,
      variant: TEST_AGENT_CAPABILITY.variant,
      resolvedConfigDigest: action.driftCapability
        ? DIGEST_C
        : TEST_AGENT_CAPABILITY.resolvedConfigDigest,
      resolvedAgentPermissionDigest: TEST_AGENT_CAPABILITY.resolvedAgentPermissionDigest,
      agentFileDigest: TEST_AGENT_CAPABILITY.agentFileDigest,
      skillFileDigest: TEST_AGENT_CAPABILITY.skillFileDigest,
      experimentConfigDigest: TEST_AGENT_CAPABILITY.experimentConfigDigest,
      violations: policyViolation
        ? [
            {
              reason: "PROTECTED_PATH_CHANGED",
              path: "workspace/spec.md",
              changeKind: "MODIFIED",
              message: "Agent changed a protected run path",
            },
          ]
        : [],
      eventStream: {
        originalByteLength: 0,
        truncated: false,
        events: [],
      },
      stderr: EMPTY_OUTPUT,
      evidencePath: `evidence/attempts/${String(input.attempt)}/agent-turn-result.json`,
    });
  }
}

export class ScriptedCompilerAdapter implements CoreLoopCompilerAdapter {
  public readonly requests: CompileRequest[] = [];

  public constructor(
    private readonly statuses: readonly CompileResult["status"][],
    private readonly capability: IcarusCapability = TEST_COMPILER_CAPABILITY,
  ) {}

  public async probe(): Promise<IcarusCapability> {
    return this.capability;
  }

  public async compile(request: CompileRequest): Promise<CompileResult> {
    const status = this.statuses[this.requests.length];
    if (status === undefined) throw new Error("No scripted compiler result");
    this.requests.push(request);
    const issues =
      status === "COMPILE_ERROR"
        ? [
            {
              kind: "ERROR" as const,
              message: "rtl/dut.sv:1: syntax error",
              path: "rtl/dut.sv",
              line: 1,
            },
          ]
        : [];
    return CompileResultSchema.parse({
      schemaVersion: 1,
      authoritative: false,
      claim: "COMPILE_ONLY",
      status,
      runId: request.runId,
      attempt: request.attempt,
      compilerProfileId: request.compilerProfileId,
      toolVersion: this.capability.toolVersion,
      topModule: request.topModule,
      workspaceManifestDigest: request.workspaceManifestDigest,
      exitCode: status === "COMPILE_PASSED" ? 0 : status === "COMPILE_ERROR" ? 1 : null,
      durationMs: 5,
      issues,
      stdout: EMPTY_OUTPUT,
      stderr: EMPTY_OUTPUT,
    });
  }
}
