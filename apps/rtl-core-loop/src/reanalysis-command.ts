import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  AgentCapabilitySchema,
  BatchEvaluationResultSchema,
  BatchIdSchema,
  BatchInputManifestSchema,
  CoreLoopException,
  VerilogEvalFunctionalResultSchema,
  sha256Jcs,
  updateObservedIssues,
} from "@rtl-agent/core-loop";
import type {
  AgentCapability,
  CoreLoopBatchExecution,
  MismatchAnalyzer,
  VerilogEvalFunctionalResult,
} from "@rtl-agent/core-loop";

import { parseNamedOptions } from "./cli-arguments.js";
import { parsedCoreLoopError } from "./cli-error.js";
import {
  createMismatchAnalyzer,
  mismatchAnalyzerBackendFromCapability,
  parseMismatchAnalyzerBackend,
  type MismatchAnalyzerBackend,
  type MismatchAnalyzerFactory,
} from "./mismatch-analyzer-selection.js";

interface PostProcessingWarning {
  readonly code: "MISMATCH_ANALYSIS_FAILED";
  readonly message: string;
  readonly retryCommand: string;
}

async function readJsonFile(hostPath: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(hostPath, "utf8")) as unknown;
  } catch {
    throw new CoreLoopException(
      "MISMATCH_ANALYSIS_FAILED",
      "Existing batch evidence could not be read for mismatch reanalysis",
    );
  }
}

async function loadExistingBatchExecution(
  batchesRoot: string,
  rawBatchId: string,
): Promise<{
  execution: CoreLoopBatchExecution;
  functionalResult: VerilogEvalFunctionalResult;
  agentCapability: AgentCapability;
}> {
  const parsedBatchId = BatchIdSchema.safeParse(rawBatchId);
  if (!parsedBatchId.success) {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      "Core Loop reanalyze command requires a valid batch ID",
    );
  }
  const batchId = parsedBatchId.data;
  const batchDirectory = path.join(path.resolve(batchesRoot), batchId);
  try {
    const [inputManifest, result, functionalResult, agentCapability] = await Promise.all([
      readJsonFile(path.join(batchDirectory, "_internal", "evidence", "batch-input-manifest.json")),
      readJsonFile(path.join(batchDirectory, "_internal", "evidence", "batch-result.json")),
      readJsonFile(
        path.join(batchDirectory, "_internal", "evidence", "functional-simulation-result.json"),
      ),
      readJsonFile(path.join(batchDirectory, "_internal", "evidence", "agent-capability.json")),
    ]);
    const parsedInputManifest = BatchInputManifestSchema.parse(inputManifest);
    const parsedResult = BatchEvaluationResultSchema.parse(result);
    const parsedFunctional = VerilogEvalFunctionalResultSchema.parse(functionalResult);
    const parsedAgentCapability = AgentCapabilitySchema.parse(agentCapability);
    const materializedByRunId = new Map<
      string,
      (typeof parsedInputManifest.materializedCases)[number]
    >(parsedInputManifest.materializedCases.map((item) => [item.runId, item]));
    const mismatchIdentityInvalid = parsedFunctional.cases
      .filter((item) => item.status === "MISMATCH")
      .some((item) => {
        const materialized = materializedByRunId.get(item.runId);
        return (
          materialized === undefined ||
          materialized.caseRef.identity.caseId !== item.caseRef.identity.caseId ||
          materialized.caseRef.caseSourceDigest !== item.caseRef.caseSourceDigest
        );
      });
    if (
      parsedResult.batchId !== batchId ||
      parsedFunctional.batchId !== batchId ||
      parsedResult.batchInputManifestDigest !== parsedInputManifest.manifestDigest ||
      sha256Jcs(parsedAgentCapability) !== parsedInputManifest.agentCapabilityDigest ||
      mismatchIdentityInvalid
    ) {
      throw new Error("batch identity mismatch");
    }
    return {
      execution: {
        batchDirectory,
        inputManifest: parsedInputManifest,
        result: parsedResult,
      },
      functionalResult: parsedFunctional,
      agentCapability: parsedAgentCapability,
    };
  } catch (error) {
    if (error instanceof CoreLoopException) throw error;
    throw new CoreLoopException(
      "MISMATCH_ANALYSIS_FAILED",
      "Existing batch evidence is missing, invalid, or identity-inconsistent",
    );
  }
}

export async function updateObservedIssuesBestEffort(options: {
  readonly knowledgeRoot: string;
  readonly execution: CoreLoopBatchExecution;
  readonly functionalResult?: VerilogEvalFunctionalResult;
  readonly mismatchAnalyzer?: MismatchAnalyzer;
}): Promise<PostProcessingWarning | undefined> {
  try {
    await updateObservedIssues(options);
    return undefined;
  } catch (error) {
    const parsedError = parsedCoreLoopError(error);
    if (parsedError?.code === "MISMATCH_ANALYSIS_FAILED") {
      return {
        code: "MISMATCH_ANALYSIS_FAILED",
        message: parsedError.message,
        retryCommand: `rtl-core-loop reanalyze --batch ${options.execution.result.batchId}`,
      };
    }
    throw error;
  }
}

export async function runReanalysisCommand(options: {
  readonly arguments_: readonly string[];
  readonly writeOutput: (line: string) => void;
  readonly environment: NodeJS.ProcessEnv;
  readonly repositoryRoot: string;
  readonly batchesRoot?: string;
  readonly mismatchAnalyzer?: MismatchAnalyzer;
  readonly mismatchAnalyzerBackend?: MismatchAnalyzerBackend;
  readonly mismatchAnalyzerFactory?: MismatchAnalyzerFactory;
}): Promise<number> {
  const namedOptions = parseNamedOptions(options.arguments_.slice(1));
  const rawBatchId = namedOptions.get("--batch");
  const requestedAnalyzerBackend = parseMismatchAnalyzerBackend(namedOptions.get("--analyzer"));
  const allowedOptions = new Set(["--batch", "--analyzer"]);
  if (
    rawBatchId === undefined ||
    [...namedOptions.keys()].some((name) => !allowedOptions.has(name)) ||
    namedOptions.size !== (requestedAnalyzerBackend === undefined ? 1 : 2)
  ) {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      "Core Loop reanalyze command requires --batch and optional --analyzer",
    );
  }
  const batchesRoot =
    options.batchesRoot ?? path.join(options.repositoryRoot, ".rtl-agent", "batches");
  const { execution, functionalResult, agentCapability } = await loadExistingBatchExecution(
    batchesRoot,
    rawBatchId,
  );
  const hasMismatch = functionalResult.cases.some((item) => item.status === "MISMATCH");
  const mismatchAnalyzer =
    options.mismatchAnalyzer ??
    (hasMismatch
      ? (
          options.mismatchAnalyzerFactory ??
          ((backend) =>
            createMismatchAnalyzer({
              backend,
              environment: options.environment,
              repositoryRoot: options.repositoryRoot,
            }))
        )(
          options.mismatchAnalyzerBackend ??
            requestedAnalyzerBackend ??
            mismatchAnalyzerBackendFromCapability(agentCapability),
        )
      : undefined);
  await updateObservedIssues({
    knowledgeRoot: path.join(path.dirname(batchesRoot), "knowledge"),
    execution,
    functionalResult,
    ...(mismatchAnalyzer === undefined ? {} : { mismatchAnalyzer }),
  });
  options.writeOutput(
    JSON.stringify({
      ok: true,
      result: {
        batchId: execution.result.batchId,
        status: "ANALYSIS_COMPLETED",
        mismatchCount: functionalResult.functionalFailed,
      },
    }),
  );
  return 0;
}
