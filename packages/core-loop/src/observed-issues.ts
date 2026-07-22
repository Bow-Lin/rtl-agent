import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { CoreLoopException } from "./errors.js";
import type { CoreLoopBatchExecution } from "./batch-evaluator.js";
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
    lines.push("");
    await replaceTextAtomic(journalPath, `${lines.join("\n")}\n`);
    return journalPath;
  } finally {
    await rm(lockPath, { recursive: true, force: true }).catch(() => undefined);
  }
}
