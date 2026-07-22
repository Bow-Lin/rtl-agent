import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { CoreLoopException } from "./errors.js";
import type { CoreLoopBatchExecution } from "./batch-evaluator.js";
import type { RunExecutionResult } from "./evaluation-contracts.js";
import type { MismatchAnalysis, MismatchAnalyzer } from "./mismatch-analyzer.js";
import type { VerilogEvalFunctionalResult } from "./verilog-eval-simulation.js";

const JOURNAL_HEADER = `# Observed Dataset Issues

This file is generated after dataset evaluation batches. It records observed failures and concise
mismatch conclusions. Detailed diagnosis evidence remains in each batch's internal directory. It is
runtime evidence, not prompt guidance. Updating
\`.opencode/skills/rtl-core-loop/common-guidance.md\` requires an explicit human request.
`;

export interface UpdateObservedIssuesOptions {
  readonly knowledgeRoot: string;
  readonly execution: CoreLoopBatchExecution;
  readonly functionalResult?: VerilogEvalFunctionalResult;
  readonly mismatchAnalyzer?: MismatchAnalyzer;
  readonly completedAt?: Date;
}

function oneLine(value: string): string {
  // Intentional removal of control bytes before model-authored text enters Markdown.
  // eslint-disable-next-line no-control-regex
  const controlBytes = /[\u0000-\u001f\u007f]+/gu;
  return value
    .replace(controlBytes, " ")
    .replace(/\s+/gu, " ")
    .replaceAll("`", "'")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .trim();
}

async function readJournal(journalPath: string): Promise<string> {
  try {
    return await readFile(journalPath, "utf8");
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? (error as { readonly code?: unknown }).code
        : undefined;
    if (code === "ENOENT") return JOURNAL_HEADER;
    throw new CoreLoopException(
      "MISMATCH_ANALYSIS_FAILED",
      "Observed-issue journal could not be read safely",
    );
  }
}

function renderConclusion(analysis: MismatchAnalysis): string {
  return `Conclusion [${analysis.category}, ${analysis.confidence}]: ${oneLine(analysis.rootCause)}`;
}

function latestCompileError(run: RunExecutionResult): string | undefined {
  const observation = [...run.compileObservations]
    .reverse()
    .find((item) => item.status === "COMPILE_ERROR");
  if (observation === undefined) return undefined;
  const messages = [...new Set(observation.issues.map((issue) => oneLine(issue.message)))];
  return messages.length === 0 ? undefined : messages.join("; ");
}

function completedNotRunReason(run: Extract<RunExecutionResult, { status: "COMPLETE" }>): string {
  switch (run.finalResult.outcome) {
    case "NO_RTL_CHANGE":
      return "Agent completed without changing the RTL workspace.";
    case "AGENT_FAILED":
      return run.failureStage === "ATTEMPT_PREPARATION"
        ? "Agent output did not contain a compile-ready RTL source set."
        : "Agent process failed before producing a compile-passed candidate.";
    case "TIMEOUT":
      return `Timed out during ${run.failureStage ?? "the case run"}.`;
    case "POLICY_VIOLATION":
      return "Agent output violated the bounded RTL workspace or source policy.";
    case "TOOL_ERROR":
      return `Infrastructure failed during ${run.failureStage ?? "the case run"}.`;
    case "MAX_ATTEMPTS":
      return (
        latestCompileError(run) ?? "Candidate did not compile within the configured Agent attempts."
      );
    case "COMPILE_PASSED":
      return "Candidate compile passed but functional simulation was not recorded.";
  }
}

function completedNotRunCode(run: Extract<RunExecutionResult, { status: "COMPLETE" }>): string {
  return run.finalResult.outcome === "AGENT_FAILED" && run.failureStage === "ATTEMPT_PREPARATION"
    ? "NO_COMPILE_UNIT"
    : run.finalResult.outcome;
}

function notRunDetails(
  execution: CoreLoopBatchExecution,
  functionalResult: VerilogEvalFunctionalResult,
): readonly string[] {
  const functionalByCaseId = new Map(
    functionalResult.cases.map((item) => [item.caseRef.identity.caseId, item]),
  );
  const runsById = new Map<string, RunExecutionResult>(
    execution.result.runs.map((run) => [run.runId, run]),
  );
  const validationsByCaseId = new Map(
    execution.result.caseValidations.map((item) => [item.caseRef.identity.caseId, item]),
  );
  const details: string[] = [];
  for (const caseRef of execution.inputManifest.selectedCases) {
    const caseId = caseRef.identity.caseId;
    const functional = functionalByCaseId.get(caseId);
    if (functional !== undefined && functional.status !== "CANDIDATE_NOT_COMPILE_PASSED") continue;

    if (functional !== undefined) {
      const run = runsById.get(functional.runId);
      if (run?.status === "COMPLETE") {
        details.push(
          `- \`${caseId}\`: \`${completedNotRunCode(run)}\` — ${completedNotRunReason(run)}`,
        );
      } else if (run?.status === "INCOMPLETE") {
        details.push(`- \`${caseId}\`: \`INCOMPLETE\` — ${oneLine(run.message)}`);
      } else {
        const validation = validationsByCaseId.get(caseId);
        const code = validation?.status === "VALID" ? "NOT_EXECUTED" : validation?.status;
        details.push(
          `- \`${caseId}\`: \`${code ?? "NOT_EXECUTED"}\` — ${oneLine(
            validation?.status === "VALID"
              ? "Functional simulation was not reached before the batch stopped."
              : (validation?.message ?? "No run result was produced for the selected case."),
          )}`,
        );
      }
      continue;
    }

    const validation = validationsByCaseId.get(caseId);
    const code = validation?.status === "VALID" ? "NOT_EXECUTED" : validation?.status;
    details.push(
      `- \`${caseId}\`: \`${code ?? "NOT_EXECUTED"}\` — ${oneLine(
        validation?.status === "VALID" || validation === undefined
          ? "Functional simulation was not reached before the batch stopped."
          : validation.message,
      )}`,
    );
  }
  return details;
}

async function replaceTextAtomic(target: string, content: string): Promise<void> {
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = path.join(
    path.dirname(target),
    `.${path.basename(target)}.${randomUUID()}.tmp`,
  );
  try {
    await writeFile(temporary, content, { encoding: "utf8", flag: "wx" });
    await rename(temporary, target);
  } finally {
    await rm(temporary, { force: true }).catch(() => undefined);
  }
}

export async function updateObservedIssues(options: UpdateObservedIssuesOptions): Promise<string> {
  const knowledgeRoot = path.resolve(options.knowledgeRoot);
  const journalPath = path.join(knowledgeRoot, "observed-issues.md");
  const lockPath = path.join(knowledgeRoot, ".observed-issues.lock");
  await mkdir(knowledgeRoot, { recursive: true });
  try {
    await mkdir(lockPath);
  } catch {
    throw new CoreLoopException(
      "MISMATCH_ANALYSIS_FAILED",
      "Observed-issue journal is already being updated",
    );
  }
  try {
    const existing = await readJournal(journalPath);
    const marker = `<!-- batch:${options.execution.result.batchId} -->`;
    if (existing.includes(marker)) return journalPath;
    const lines = [
      existing.trimEnd(),
      "",
      marker,
      `## Batch ${options.execution.result.batchId}`,
      "",
      `- Completed: ${(options.completedAt ?? new Date()).toISOString()}`,
      `- Dataset: \`${options.execution.inputManifest.selectedCases[0]?.identity.datasetId ?? "empty-selection"}\``,
      `- Selected cases: ${String(options.execution.inputManifest.selectedCases.length)}`,
      "",
      "### Compile",
      "",
    ];
    const compileFailures = options.execution.result.runs.flatMap((run) =>
      run.compileObservations
        .filter((observation) => observation.status === "COMPILE_ERROR")
        .map((observation) => ({ run, observation })),
    );
    if (compileFailures.length === 0) {
      lines.push("- No compile errors observed.");
    } else {
      for (const { run, observation } of compileFailures) {
        const messages = [...new Set(observation.issues.map((issue) => oneLine(issue.message)))];
        lines.push(
          `- \`${run.fixtureIdentity.caseId}\`, attempt ${String(observation.attempt)}: ${messages.join("; ")}`,
        );
      }
    }
    lines.push("", "### Logic", "");
    const mismatches =
      options.functionalResult?.cases.filter((item) => item.status === "MISMATCH") ?? [];
    if (mismatches.length === 0) {
      lines.push("- No functional mismatches observed.");
    } else {
      if (options.mismatchAnalyzer === undefined) {
        throw new CoreLoopException(
          "MISMATCH_ANALYSIS_FAILED",
          "A concrete mismatch analyzer is required before observed issues can be updated",
        );
      }
      for (const mismatch of mismatches) {
        if (mismatch.mismatches === null || mismatch.samples === null) {
          throw new CoreLoopException(
            "MISMATCH_ANALYSIS_FAILED",
            "Mismatch evidence is incomplete",
          );
        }
        const analysis = await options.mismatchAnalyzer.analyze({
          batchDirectory: options.execution.batchDirectory,
          runId: mismatch.runId,
          caseRef: mismatch.caseRef,
          mismatches: mismatch.mismatches,
          samples: mismatch.samples,
          outputMismatches: mismatch.outputMismatches ?? [],
        });
        lines.push(`- \`${mismatch.caseRef.identity.caseId}\`: ${renderConclusion(analysis)}`);
      }
    }
    const abnormalFunctional =
      options.functionalResult?.cases.filter(
        (item) => !["PASSED", "MISMATCH", "CANDIDATE_NOT_COMPILE_PASSED"].includes(item.status),
      ) ?? [];
    const notRun = options.functionalResult?.functionalNotRun ?? 0;
    lines.push("", "### Infrastructure and Not Run", "");
    if (abnormalFunctional.length === 0 && notRun === 0) {
      lines.push("- No infrastructure or not-run outcomes observed.");
    } else {
      if (notRun > 0) lines.push(`- Functional simulation not run: ${String(notRun)} case(s).`);
      for (const item of abnormalFunctional) {
        lines.push(`- \`${item.caseRef.identity.caseId}\`: \`${item.status}\`.`);
      }
    }
    if (options.functionalResult !== undefined && notRun > 0) {
      lines.push(
        "",
        "### Not Run Details",
        "",
        ...notRunDetails(options.execution, options.functionalResult),
      );
    }
    lines.push("");
    await replaceTextAtomic(journalPath, `${lines.join("\n")}\n`);
    return journalPath;
  } finally {
    await rm(lockPath, { recursive: true, force: true }).catch(() => undefined);
  }
}
