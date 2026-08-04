import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { LogicalPathSchema, SchemaVersionSchema } from "@rtl-agent/contracts";
import { z } from "zod";

import { AgentAttemptInputSchema, MAX_AGENT_TURN_ATTEMPT, RunIdSchema } from "./contracts.js";
import type { FixtureCaseRef, RunId } from "./contracts.js";
import type { RtlAgentAdapter } from "./agent-adapter.js";
import { executeCompilerProcess } from "./compiler-process.js";
import type { CompilerProcessResult } from "./compiler-process.js";
import { CoreLoopException } from "./errors.js";
import { resolveLogicalPath, scanRegularFiles, sha256Bytes } from "./filesystem.js";
import { createCoreLoopRun } from "./materialize.js";
import type { CoreLoopRun } from "./materialize.js";
import type { FixtureProvider } from "./fixture-provider.js";

const CoverageTargetSchema = z.strictObject({
  kind: z.enum(["LINE", "BRANCH", "TOGGLE"]),
  sourcePath: LogicalPathSchema,
  line: z.int().positive(),
  block: z.int().nonnegative().optional(),
  branch: z.int().nonnegative().optional(),
  signal: z.string().min(1).max(128).optional(),
  transition: z.string().min(1).max(32).optional(),
  hitCount: z.int().nonnegative(),
  description: z.string().min(1).max(256),
});

export const CoverageFeedbackSchema = z.strictObject({
  schemaVersion: SchemaVersionSchema,
  runId: RunIdSchema,
  round: z.int().positive().max(MAX_AGENT_TURN_ATTEMPT),
  line: z.strictObject({
    found: z.int().nonnegative(),
    hit: z.int().nonnegative(),
    percent: z.number().min(0).max(100),
  }),
  branch: z.strictObject({
    found: z.int().nonnegative(),
    hit: z.int().nonnegative(),
    percent: z.number().min(0).max(100),
  }),
  toggle: z.strictObject({
    found: z.int().nonnegative(),
    hit: z.int().nonnegative(),
    percent: z.number().min(0).max(100),
  }),
  score: z.number().min(0).max(100),
  increment: z.number().min(-100).max(100).nullable(),
  uncoveredTargets: z.array(CoverageTargetSchema).max(256),
});

export const VerificationAssetRequirementSchema = z.enum([
  "TB_FILE_MISSING",
  "CHECKER_FILE_MISSING",
  "TB_TOP_MODULE_MISSING",
  "DUT_INSTANCE_MISSING",
  "BOUNDED_FINISH_MISSING",
  "CHECKER_MODULE_MISSING",
  "ASSERTION_MISSING",
  "FATAL_FAILURE_MISSING",
]);

export const VerificationAssetFeedbackSchema = z.strictObject({
  schemaVersion: SchemaVersionSchema,
  runId: RunIdSchema,
  attempt: z.int().positive().max(MAX_AGENT_TURN_ATTEMPT),
  missingRequirements: z.array(VerificationAssetRequirementSchema).min(1).max(8),
});

const VerilatorCompileIssueSchema = z.strictObject({
  kind: z.literal("ERROR"),
  message: z.string().min(1).max(1024),
  path: z.enum(["rtl/tb.sv", "rtl/checker.sv"]),
  line: z.int().positive(),
  column: z.int().positive().optional(),
});

export const VerilatorCompileFeedbackSchema = z.strictObject({
  schemaVersion: SchemaVersionSchema,
  runId: RunIdSchema,
  attempt: z.int().positive().max(MAX_AGENT_TURN_ATTEMPT),
  stage: z.literal("VERILATOR_COMPILE"),
  issues: z.array(VerilatorCompileIssueSchema).min(1).max(64),
});

export const CoverageExperimentResultSchema = z.strictObject({
  schemaVersion: SchemaVersionSchema,
  runId: RunIdSchema,
  caseId: z.string().min(1).max(256),
  status: z.enum(["PENDING_HUMAN_REVIEW", "STOPPED", "FAILED"]),
  stopReason: z.enum([
    "COVERAGE_THRESHOLD_REACHED",
    "NO_UNCOVERED_TARGETS",
    "NO_MEANINGFUL_GAIN",
    "MAX_ROUNDS",
    "MAX_AGENT_ATTEMPTS",
    "AGENT_FAILED",
    "VERILATOR_FAILED",
    "DUT_MODIFIED",
    "VERIFICATION_ASSETS_MISSING",
  ]),
  authoritative: z.literal(false),
  claim: z.literal("COVERAGE_EXPERIMENT"),
  roundsCompleted: z.int().nonnegative().max(3),
  finalCoverage: CoverageFeedbackSchema.nullable(),
  humanReviewRequired: z.literal(true),
  humanReviewRules: z.tuple([
    z.literal("CHECKER_MATCHES_SPEC"),
    z.literal("ASSERTIONS_HAVE_CORRECT_TIMING"),
    z.literal("DUT_WAS_NOT_MODIFIED"),
    z.literal("RESIDUAL_UNCOVERED_TARGETS_ARE_ACCEPTED"),
  ]),
});

export type CoverageFeedback = z.infer<typeof CoverageFeedbackSchema>;
export type VerificationAssetRequirement = z.infer<typeof VerificationAssetRequirementSchema>;
export type VerilatorCompileIssue = z.infer<typeof VerilatorCompileIssueSchema>;
export type CoverageExperimentResult = z.infer<typeof CoverageExperimentResultSchema>;

export class RepairableVerilatorCompileError extends Error {
  public readonly issues: readonly VerilatorCompileIssue[];

  public constructor(issues: readonly VerilatorCompileIssue[]) {
    super("Verilator rejected generated verification assets");
    this.name = "RepairableVerilatorCompileError";
    this.issues = z.array(VerilatorCompileIssueSchema).min(1).max(64).parse(issues);
  }
}

export interface VerilatorCoverageConfig {
  readonly verilatorExecutable: string;
  readonly coverageExecutable: string;
  readonly environment: NodeJS.ProcessEnv;
  readonly timeoutMs?: number;
  readonly cflags?: readonly string[];
  readonly dutSourcePaths?: readonly string[];
  readonly includeDirectories?: readonly string[];
}

export interface CoverageRoundRunner {
  runRound(run: CoreLoopRun, round: number, agentAttempt?: number): Promise<CoverageFeedback>;
}

function percent(hit: number, found: number): number {
  return found === 0 ? 100 : Math.round((hit / found) * 10_000) / 100;
}

function normalizedDutSourcePaths(sourcePaths: readonly string[] | undefined): readonly string[] {
  const paths = (sourcePaths ?? ["rtl/dut.sv"]).map((sourcePath) =>
    LogicalPathSchema.parse(sourcePath),
  );
  if (paths.length === 0 || new Set(paths).size !== paths.length) {
    throw new CoreLoopException(
      "COVERAGE_EXPERIMENT_FAILED",
      "DUT coverage source paths must be non-empty and unique",
    );
  }
  return paths;
}

function matchDutSource(
  rawSource: string | undefined,
  dutSourcePaths: readonly string[],
): string | undefined {
  if (rawSource === undefined) return undefined;
  const normalized = rawSource.replaceAll("\\", "/").replace(/^\.\//, "");
  return dutSourcePaths.find(
    (sourcePath) => normalized === sourcePath || normalized.endsWith(`/${sourcePath}`),
  );
}

export function parseLcovCoverage(
  content: string,
  runId: RunId,
  round: number,
  previousScore: number | undefined,
  dutSources?: readonly string[],
): CoverageFeedback {
  const dutSourcePaths = normalizedDutSourcePaths(dutSources);
  const targets: z.infer<typeof CoverageTargetSchema>[] = [];
  let activeSource: string | undefined;
  let lineFound = 0;
  let lineHit = 0;
  let branchFound = 0;
  let branchHit = 0;
  for (const rawLine of content.replace(/\r\n?/g, "\n").split("\n")) {
    if (rawLine.startsWith("SF:")) {
      activeSource = matchDutSource(rawLine.slice(3), dutSourcePaths);
      continue;
    }
    if (activeSource === undefined) continue;
    if (rawLine.startsWith("DA:")) {
      const [rawLineNumber, rawCount] = rawLine.slice(3).split(",");
      const line = Number(rawLineNumber);
      const hitCount = Number(rawCount);
      if (
        !Number.isSafeInteger(line) ||
        line < 1 ||
        !Number.isSafeInteger(hitCount) ||
        hitCount < 0
      )
        continue;
      lineFound += 1;
      if (hitCount > 0) lineHit += 1;
      else
        targets.push({
          kind: "LINE",
          sourcePath: LogicalPathSchema.parse(activeSource),
          line,
          hitCount,
          description: `Execute ${activeSource} line ${String(line)}`,
        });
      continue;
    }
    if (rawLine.startsWith("BRDA:")) {
      const [rawLineNumber, rawBlock, rawBranch, rawTaken] = rawLine.slice(5).split(",");
      const line = Number(rawLineNumber);
      const block = Number(rawBlock);
      const branch = Number(rawBranch);
      const hitCount = rawTaken === "-" ? 0 : Number(rawTaken);
      if (
        ![line, block, branch, hitCount].every(
          (value) => Number.isSafeInteger(value) && value >= 0,
        ) ||
        line < 1
      )
        continue;
      branchFound += 1;
      if (hitCount > 0) branchHit += 1;
      else
        targets.push({
          kind: "BRANCH",
          sourcePath: LogicalPathSchema.parse(activeSource),
          line,
          block,
          branch,
          hitCount,
          description: `Exercise ${activeSource} branch ${String(branch)} on line ${String(line)}`,
        });
    }
  }
  const linePercent = percent(lineHit, lineFound);
  const branchPercent = percent(branchHit, branchFound);
  const score =
    branchFound === 0
      ? linePercent
      : Math.round((linePercent * 0.7 + branchPercent * 0.3) * 100) / 100;
  return CoverageFeedbackSchema.parse({
    schemaVersion: 1,
    runId,
    round,
    line: { found: lineFound, hit: lineHit, percent: linePercent },
    branch: { found: branchFound, hit: branchHit, percent: branchPercent },
    toggle: { found: 0, hit: 0, percent: 100 },
    score,
    increment: previousScore === undefined ? null : Math.round((score - previousScore) * 100) / 100,
    uncoveredTargets: targets.slice(0, 256),
  });
}

interface VerilatorCoverageRecord {
  readonly metadata: Readonly<Record<string, string>>;
  readonly hitCount: number;
  readonly sourceLine: string;
}

function parseVerilatorCoverageRecords(content: string): readonly VerilatorCoverageRecord[] {
  const records: VerilatorCoverageRecord[] = [];
  for (const sourceLine of content.replace(/\r\n?/g, "\n").split("\n")) {
    const match = /^C '(.*)' (\d+)$/.exec(sourceLine);
    if (match === null) continue;
    const encodedMetadata = match[1];
    if (encodedMetadata === undefined) continue;
    const hitCount = Number(match[2]);
    if (!Number.isSafeInteger(hitCount) || hitCount < 0) continue;
    const metadata: Record<string, string> = {};
    for (const field of encodedMetadata.split("\x01")) {
      if (field.length === 0) continue;
      const separator = field.indexOf("\x02");
      if (separator < 1) continue;
      metadata[field.slice(0, separator)] = field.slice(separator + 1);
    }
    records.push({ metadata, hitCount, sourceLine });
  }
  return records;
}

function coverageDataForType(
  content: string,
  records: readonly VerilatorCoverageRecord[],
  type: string,
): string {
  const header = content.replace(/\r\n?/g, "\n").split("\n")[0] ?? "# SystemC::Coverage-3";
  const selected = records
    .filter((record) => record.metadata.t === type)
    .map((record) => record.sourceLine);
  return `${[header, ...selected].join("\n")}\n`;
}

export function parseVerilatorToggleCoverage(
  content: string,
  dutSources?: readonly string[],
): {
  readonly metric: CoverageFeedback["toggle"];
  readonly uncoveredTargets: CoverageFeedback["uncoveredTargets"];
} {
  const dutSourcePaths = normalizedDutSourcePaths(dutSources);
  const records = parseVerilatorCoverageRecords(content).flatMap((record) => {
    const sourcePath = matchDutSource(record.metadata.f, dutSourcePaths);
    return record.metadata.t === "toggle" && sourcePath !== undefined
      ? [{ record, sourcePath }]
      : [];
  });
  const hit = records.filter(({ record }) => record.hitCount > 0).length;
  const uncoveredTargets = records
    .filter(({ record }) => record.hitCount === 0)
    .flatMap(({ record, sourcePath }) => {
      const line = Number(record.metadata.l);
      const operation = record.metadata.o;
      const operationMatch = operation === undefined ? null : /^(.+):(.+->.+)$/.exec(operation);
      if (!Number.isSafeInteger(line) || line < 1 || operationMatch === null) return [];
      const signal = operationMatch[1];
      const transition = operationMatch[2];
      return [
        CoverageTargetSchema.parse({
          kind: "TOGGLE",
          sourcePath,
          line,
          signal,
          transition,
          hitCount: 0,
          description: `Toggle DUT signal ${signal} through ${transition}`,
        }),
      ];
    })
    .slice(0, 256);
  return {
    metric: { found: records.length, hit, percent: percent(hit, records.length) },
    uncoveredTargets,
  };
}

function processPassed(result: CompilerProcessResult): boolean {
  return (
    result.exitCode === 0 &&
    !result.timedOut &&
    !result.terminationFailed &&
    result.spawnError === undefined
  );
}

export function parseRepairableVerilatorCompileIssues(
  stderr: string,
): readonly VerilatorCompileIssue[] {
  const issues: VerilatorCompileIssue[] = [];
  const seen = new Set<string>();
  for (const rawLine of stderr.replace(/\r\n?/g, "\n").split("\n")) {
    const match = /^%Error(?:-[A-Z0-9_]+)?:\s+(.+?):(\d+):(?:(\d+):)?\s*(.+)$/.exec(rawLine);
    if (match === null) continue;
    const normalizedPath = match[1]?.replaceAll("\\", "/");
    if (normalizedPath !== "rtl/tb.sv" && normalizedPath !== "rtl/checker.sv") continue;
    const line = Number(match[2]);
    const column = match[3] === undefined ? undefined : Number(match[3]);
    const message = match[4]?.trim().slice(0, 1024);
    if (!Number.isSafeInteger(line) || line < 1 || message === undefined || message.length === 0)
      continue;
    if (column !== undefined && (!Number.isSafeInteger(column) || column < 1)) continue;
    const key = `${normalizedPath}:${String(line)}:${String(column ?? 0)}:${message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    issues.push(
      VerilatorCompileIssueSchema.parse({
        kind: "ERROR",
        message,
        path: normalizedPath,
        line,
        ...(column === undefined ? {} : { column }),
      }),
    );
  }
  return issues.slice(0, 64);
}

export class VerilatorCoverageRunner implements CoverageRoundRunner {
  public constructor(private readonly config: VerilatorCoverageConfig) {}

  public async runRound(
    run: CoreLoopRun,
    round: number,
    agentAttempt = round,
  ): Promise<CoverageFeedback> {
    const buildDirectory = path.join(
      run.runDirectory,
      "evidence",
      "coverage",
      `round-${String(round)}-attempt-${String(agentAttempt)}`,
    );
    await mkdir(buildDirectory, { recursive: true });
    const sources = (await scanRegularFiles(path.join(run.workspaceDirectory, "rtl")))
      .map((file) => `rtl/${file.logicalPath}`)
      .filter((file) => /\.(?:sv|v)$/i.test(file))
      .sort();
    const dutSourcePaths = normalizedDutSourcePaths(this.config.dutSourcePaths);
    const includeArguments = (this.config.includeDirectories ?? []).map(
      (directory) => `-I${LogicalPathSchema.parse(directory)}`,
    );
    const executableName = process.platform === "win32" ? "sim.exe" : "sim";
    const common = {
      environment: this.config.environment,
      timeoutMs: this.config.timeoutMs ?? 120_000,
      terminationGraceMs: 1_000,
      retainedOutputBytes: 131_072,
      stdoutLimitBytes: 65_536,
      stderrLimitBytes: 65_536,
      logicalPathReplacements: { [run.workspaceDirectory]: "workspace", [run.runDirectory]: "." },
    } as const;
    const compile = await executeCompilerProcess({
      ...common,
      executable: this.config.verilatorExecutable,
      arguments: [
        "--binary",
        "--coverage-line",
        "--coverage-toggle",
        "--timing",
        "-Wno-fatal",
        "--top-module",
        "tb",
        "--Mdir",
        buildDirectory,
        "-o",
        executableName,
        ...(this.config.cflags === undefined
          ? []
          : this.config.cflags.flatMap((flag) => ["-CFLAGS", flag])),
        ...includeArguments,
        ...sources,
      ],
      cwd: run.workspaceDirectory,
    });
    await writeFile(
      path.join(buildDirectory, "compile-process.json"),
      `${JSON.stringify(compile, undefined, 2)}\n`,
      { flag: "wx" },
    );
    if (!processPassed(compile)) {
      const repairableIssues = parseRepairableVerilatorCompileIssues(compile.stderr.preview);
      if (
        repairableIssues.length > 0 &&
        compile.exitCode !== null &&
        compile.exitCode !== 0 &&
        compile.signal === null &&
        !compile.timedOut &&
        !compile.terminationFailed &&
        compile.spawnError === undefined
      ) {
        throw new RepairableVerilatorCompileError(repairableIssues);
      }
      throw new CoreLoopException(
        "COVERAGE_EXPERIMENT_FAILED",
        `Verilator compilation failed: ${compile.stderr.preview.slice(0, 768)}`,
      );
    }
    const simulation = await executeCompilerProcess({
      ...common,
      executable: path.join(buildDirectory, executableName),
      arguments: [],
      cwd: buildDirectory,
    });
    await writeFile(
      path.join(buildDirectory, "simulation-process.json"),
      `${JSON.stringify(simulation, undefined, 2)}\n`,
      { flag: "wx" },
    );
    if (!processPassed(simulation))
      throw new CoreLoopException(
        "COVERAGE_EXPERIMENT_FAILED",
        `Verilator simulation failed: ${simulation.stderr.preview.slice(0, 768)}`,
      );
    const coverageData = path.join(buildDirectory, "coverage.dat");
    const lineCoverageData = path.join(buildDirectory, "coverage-line.dat");
    const coverageInfo = path.join(buildDirectory, "coverage.info");
    if ((await lstat(coverageData).catch(() => undefined)) === undefined)
      throw new CoreLoopException(
        "COVERAGE_EXPERIMENT_FAILED",
        "Verilator coverage data is missing",
      );
    const rawCoverage = await readFile(coverageData, "utf8");
    const coverageRecords = parseVerilatorCoverageRecords(rawCoverage);
    await writeFile(lineCoverageData, coverageDataForType(rawCoverage, coverageRecords, "line"), {
      flag: "wx",
    });
    const report = await executeCompilerProcess({
      ...common,
      executable: this.config.coverageExecutable,
      arguments: ["--write-info", coverageInfo, lineCoverageData],
      cwd: buildDirectory,
    });
    await writeFile(
      path.join(buildDirectory, "coverage-process.json"),
      `${JSON.stringify(report, undefined, 2)}\n`,
      { flag: "wx" },
    );
    if (!processPassed(report))
      throw new CoreLoopException(
        "COVERAGE_EXPERIMENT_FAILED",
        "Verilator coverage conversion failed",
      );
    const prior =
      round === 1
        ? undefined
        : CoverageFeedbackSchema.parse(
            JSON.parse(
              await readFile(
                path.join(
                  run.workspaceDirectory,
                  "context",
                  `coverage-round-${String(round - 1)}.json`,
                ),
                "utf8",
              ),
            ) as unknown,
          ).score;
    const lineFeedback = parseLcovCoverage(
      await readFile(coverageInfo, "utf8"),
      run.runId,
      round,
      undefined,
      dutSourcePaths,
    );
    const toggleFeedback = parseVerilatorToggleCoverage(rawCoverage, dutSourcePaths);
    if (lineFeedback.line.found === 0 && toggleFeedback.metric.found === 0) {
      throw new CoreLoopException(
        "COVERAGE_EXPERIMENT_FAILED",
        "Verilator report contains no DUT coverage points",
      );
    }
    const useToggleTargets = lineFeedback.line.found === 0;
    const score = useToggleTargets ? toggleFeedback.metric.percent : lineFeedback.score;
    return CoverageFeedbackSchema.parse({
      ...lineFeedback,
      toggle: toggleFeedback.metric,
      score,
      increment: prior === undefined ? null : Math.round((score - prior) * 100) / 100,
      uncoveredTargets: [
        ...lineFeedback.uncoveredTargets,
        ...(useToggleTargets ? toggleFeedback.uncoveredTargets : []),
      ].slice(0, 256),
    });
  }
}

export interface RunCoverageExperimentOptions {
  readonly provider: FixtureProvider;
  readonly caseRef: FixtureCaseRef;
  readonly agentAdapter: RtlAgentAdapter;
  readonly coverageRunner: CoverageRoundRunner;
  readonly runsRoot: string;
  readonly clock?: () => Date;
  readonly maxRounds?: 1 | 2 | 3;
  readonly coverageThreshold?: number;
  readonly minimumGain?: number;
}

const PORTABLE_COVERAGE_CASE_DIRECTORY = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const WINDOWS_RESERVED_DIRECTORY_NAME = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;

export function coverageCaseDirectoryName(caseId: string): string {
  const normalized = caseId.normalize("NFC");
  if (
    PORTABLE_COVERAGE_CASE_DIRECTORY.test(normalized) &&
    !WINDOWS_RESERVED_DIRECTORY_NAME.test(normalized) &&
    !normalized.endsWith(".")
  ) {
    return normalized;
  }
  const readableStem = normalized
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 80);
  const digestSuffix = sha256Bytes(Buffer.from(normalized, "utf8")).slice(7, 19);
  return `case-${readableStem || "unnamed"}-${digestSuffix}`;
}

function padDatePart(value: number, width = 2): string {
  return String(value).padStart(width, "0");
}

export function coverageRunDirectoryName(startedAt: Date, collisionIndex = 0): string {
  if (!Number.isFinite(startedAt.getTime()) || collisionIndex < 0 || collisionIndex > 999) {
    throw new TypeError("Coverage run directory timestamp or collision index is invalid");
  }
  const timestamp = [
    padDatePart(startedAt.getFullYear(), 4),
    padDatePart(startedAt.getMonth() + 1),
    padDatePart(startedAt.getDate()),
    "-",
    padDatePart(startedAt.getHours()),
    padDatePart(startedAt.getMinutes()),
    padDatePart(startedAt.getSeconds()),
    "-",
    padDatePart(startedAt.getMilliseconds(), 3),
  ].join("");
  return `run_${timestamp}${collisionIndex === 0 ? "" : `-${padDatePart(collisionIndex, 3)}`}`;
}

export async function missingVerificationAssetRequirements(
  run: CoreLoopRun,
): Promise<readonly VerificationAssetRequirement[]> {
  const tbPath = path.join(run.workspaceDirectory, "rtl", "tb.sv");
  const checkerPath = path.join(run.workspaceDirectory, "rtl", "checker.sv");
  const [tb, checker] = await Promise.all([
    lstat(tbPath).catch(() => undefined),
    lstat(checkerPath).catch(() => undefined),
  ]);
  const missing: VerificationAssetRequirement[] = [];
  if (tb === undefined || !tb.isFile()) missing.push("TB_FILE_MISSING");
  if (checker === undefined || !checker.isFile()) missing.push("CHECKER_FILE_MISSING");
  if (missing.length > 0) return missing;
  const [tbSource, checkerSource] = await Promise.all([
    readFile(tbPath, "utf8"),
    readFile(checkerPath, "utf8"),
  ]);
  if (!tbSource.includes("module tb")) missing.push("TB_TOP_MODULE_MISSING");
  if (!tbSource.includes("TopModule")) missing.push("DUT_INSTANCE_MISSING");
  if (!tbSource.includes("$finish")) missing.push("BOUNDED_FINISH_MISSING");
  if (!checkerSource.includes("module tb_checker")) missing.push("CHECKER_MODULE_MISSING");
  if (!checkerSource.includes("assert")) missing.push("ASSERTION_MISSING");
  if (!checkerSource.includes("$fatal")) missing.push("FATAL_FAILURE_MISSING");
  return missing;
}

const REVIEW_RULES = [
  "CHECKER_MATCHES_SPEC",
  "ASSERTIONS_HAVE_CORRECT_TIMING",
  "DUT_WAS_NOT_MODIFIED",
  "RESIDUAL_UNCOVERED_TARGETS_ARE_ACCEPTED",
] as const;

export async function runCoverageExperiment(
  options: RunCoverageExperimentOptions,
): Promise<{ readonly run: CoreLoopRun; readonly result: CoverageExperimentResult }> {
  const maxRounds = options.maxRounds ?? 2;
  const threshold = options.coverageThreshold ?? 90;
  const minimumGain = options.minimumGain ?? 0.5;
  const startedAt = options.clock?.() ?? new Date();
  const run = await createCoreLoopRun(
    options.provider,
    {
      schemaVersion: 1,
      caseRef: options.caseRef,
      profile: {
        schemaVersion: 1,
        profileId: "verilator-coverage-agent-v1",
        compilerProfileId: "fixed-verilator-coverage-v1",
        maxAttempts: 3,
        stdoutLimitBytes: 65536,
        stderrLimitBytes: 65536,
        maximumIssues: 256,
        issueMessageLimitBytes: 1024,
      },
    },
    {
      runsRoot: path.join(
        options.runsRoot,
        coverageCaseDirectoryName(options.caseRef.identity.caseId),
      ),
      runDirectoryNameFactory: (_runId, collisionIndex) =>
        coverageRunDirectoryName(startedAt, collisionIndex),
    },
  );
  const dutPath = path.join(run.workspaceDirectory, "rtl", "dut.sv");
  const dutDigest = sha256Bytes(await readFile(dutPath));
  let finalCoverage: CoverageFeedback | null = null;
  let stopReason: CoverageExperimentResult["stopReason"] = "MAX_ROUNDS";
  let status: CoverageExperimentResult["status"] = "STOPPED";
  let roundsCompleted = 0;
  let feedback:
    | { readonly kind: "coverage"; readonly path: string }
    | { readonly kind: "verification"; readonly path: string }
    | { readonly kind: "verilator-compile"; readonly path: string }
    | undefined;
  for (let attempt = 1; attempt <= 3 && roundsCompleted < maxRounds; attempt += 1) {
    const sourceFiles = (await scanRegularFiles(path.join(run.workspaceDirectory, "rtl")))
      .map((file) => `rtl/${file.logicalPath}`)
      .sort();
    const input = AgentAttemptInputSchema.parse({
      schemaVersion: 1,
      runId: run.runId,
      attempt,
      category: run.fixture.category,
      specPath: "spec.md",
      workspaceRtlRoot: "rtl",
      rtlSourceFiles: sourceFiles,
      topModule: run.fixture.topModule,
      taskKind: "VERIFICATION_ASSET_GENERATION",
      ...(feedback?.kind === "coverage" ? { coverageFeedbackPath: feedback.path } : {}),
      ...(feedback?.kind === "verification" ? { verificationFeedbackPath: feedback.path } : {}),
      ...(feedback?.kind === "verilator-compile"
        ? { verilatorCompileFeedbackPath: feedback.path }
        : {}),
    });
    const turn = await options.agentAdapter.runTurn(input, run);
    if (turn.outcome !== "RTL_CHANGED" || !turn.workspaceUsableForCompile) {
      stopReason = "AGENT_FAILED";
      status = "FAILED";
      break;
    }
    if (sha256Bytes(await readFile(dutPath)) !== dutDigest) {
      stopReason = "DUT_MODIFIED";
      status = "FAILED";
      break;
    }
    const missingRequirements = await missingVerificationAssetRequirements(run);
    if (missingRequirements.length > 0) {
      if (attempt === 3) {
        stopReason = "VERIFICATION_ASSETS_MISSING";
        status = "FAILED";
        break;
      }
      const verificationFeedbackPath = LogicalPathSchema.parse(
        `context/verification-feedback-attempt-${String(attempt)}.json`,
      );
      const assetFeedback = VerificationAssetFeedbackSchema.parse({
        schemaVersion: 1,
        runId: run.runId,
        attempt,
        missingRequirements,
      });
      await writeFile(
        resolveLogicalPath(run.workspaceDirectory, verificationFeedbackPath),
        `${JSON.stringify(assetFeedback, undefined, 2)}\n`,
        { flag: "wx" },
      );
      feedback = { kind: "verification", path: verificationFeedbackPath };
      continue;
    }
    const coverageRound = roundsCompleted + 1;
    try {
      finalCoverage = await options.coverageRunner.runRound(run, coverageRound, attempt);
    } catch (error) {
      if (error instanceof RepairableVerilatorCompileError && attempt < 3) {
        const compileFeedbackPath = LogicalPathSchema.parse(
          `context/verilator-compile-feedback-attempt-${String(attempt)}.json`,
        );
        const compileFeedback = VerilatorCompileFeedbackSchema.parse({
          schemaVersion: 1,
          runId: run.runId,
          attempt,
          stage: "VERILATOR_COMPILE",
          issues: error.issues,
        });
        await writeFile(
          resolveLogicalPath(run.workspaceDirectory, compileFeedbackPath),
          `${JSON.stringify(compileFeedback, undefined, 2)}\n`,
          { flag: "wx" },
        );
        feedback = { kind: "verilator-compile", path: compileFeedbackPath };
        continue;
      }
      stopReason = "VERILATOR_FAILED";
      status = "FAILED";
      break;
    }
    roundsCompleted = coverageRound;
    const currentFeedbackPath = resolveLogicalPath(
      run.workspaceDirectory,
      LogicalPathSchema.parse(`context/coverage-round-${String(coverageRound)}.json`),
    );
    await writeFile(currentFeedbackPath, `${JSON.stringify(finalCoverage, undefined, 2)}\n`, {
      flag: "wx",
    });
    if (finalCoverage.score >= threshold) {
      stopReason = "COVERAGE_THRESHOLD_REACHED";
      status = "PENDING_HUMAN_REVIEW";
      break;
    }
    if (finalCoverage.uncoveredTargets.length === 0) {
      stopReason = "NO_UNCOVERED_TARGETS";
      status = "PENDING_HUMAN_REVIEW";
      break;
    }
    if (finalCoverage.increment !== null && finalCoverage.increment < minimumGain) {
      stopReason = "NO_MEANINGFUL_GAIN";
      status = "PENDING_HUMAN_REVIEW";
      break;
    }
    if (coverageRound === maxRounds) {
      stopReason = "MAX_ROUNDS";
      status = "PENDING_HUMAN_REVIEW";
      break;
    }
    feedback = {
      kind: "coverage",
      path: `context/coverage-round-${String(coverageRound)}.json`,
    };
  }
  if (status === "STOPPED" && finalCoverage !== null) {
    stopReason = "MAX_AGENT_ATTEMPTS";
    status = "PENDING_HUMAN_REVIEW";
  }
  const result = CoverageExperimentResultSchema.parse({
    schemaVersion: 1,
    runId: run.runId,
    caseId: options.caseRef.identity.caseId,
    status,
    stopReason,
    authoritative: false,
    claim: "COVERAGE_EXPERIMENT",
    roundsCompleted,
    finalCoverage,
    humanReviewRequired: true,
    humanReviewRules: REVIEW_RULES,
  });
  await writeFile(
    path.join(run.runDirectory, "evidence", "coverage-experiment-result.json"),
    `${JSON.stringify(result, undefined, 2)}\n`,
    { flag: "wx" },
  );
  return { run, result };
}
