import { createHash } from "node:crypto";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { CoreLoopException, executeCompilerProcess, scanRegularFiles } from "@rtl-agent/core-loop";
import type { CompilerProcessOptions, CompilerProcessResult } from "@rtl-agent/core-loop";

import { parseNamedOptions } from "./cli-arguments.js";
import { withDefaultWindowsVerilatorEnvironment } from "./environment.js";

const MUTATION_VERSION = "i2c-mutants-v1";
const MUTATION_SEED = 42;
const MUTANT_COUNT = 30;
const MUTATION_INPUT_SET_DIGEST =
  "sha256:db47177ad9347e9187d1d8d88929abd684d4f5b5ab63a5752b2b51537db32924";
const DEFAULT_TIMEOUT_MS = 120_000;

const DUT_PATHS = [
  "rtl/dut/i2c_master_bit_ctrl.v",
  "rtl/dut/i2c_master_byte_ctrl.v",
  "rtl/dut/i2c_master_defines.v",
  "rtl/dut/i2c_master_top.v",
] as const;

const SUPPORT_PATHS = [
  "rtl/checker.sv",
  "rtl/i2c_slave_model.v",
  "rtl/tb.sv",
  "rtl/wb_master_model.v",
] as const;

const SUITES = [
  {
    id: "baseline-78.16",
    sourceRunId: "run_20260804-151037-229",
    expectedCoverage: 78.16,
    coverageField: "baselineCoverage" as const,
    expectedStatus: "FAILED",
    expectedTbDigest: "sha256:e4dc4230dd669c34cb952be3f56efde7d9fca862249ef74cc96527783696536b",
    reviewStatus: "BASELINE_ASSET",
  },
  {
    id: "enhanced-93.99",
    sourceRunId: "run_20260804-154957-029",
    expectedCoverage: 93.99,
    coverageField: "finalCoverage" as const,
    expectedStatus: "PENDING_HUMAN_REVIEW",
    expectedTbDigest: "sha256:c82c8ac398f76188e1cdbb40786f3e5a1dcf0c279b146e986705b88c7ef802c0",
    reviewStatus: "PENDING_HUMAN_REVIEW",
  },
  {
    id: "enhanced-100.00",
    sourceRunId: "run_20260805-091253-770",
    expectedCoverage: 100,
    coverageField: "finalCoverage" as const,
    expectedStatus: "PENDING_HUMAN_REVIEW",
    expectedTbDigest: "sha256:314b02d9483c64d754fc0213198b4f0c0a5bec77b3bc46bd4e207bf216b06e5f",
    reviewStatus: "PENDING_HUMAN_REVIEW",
  },
] as const;

type SuiteId = (typeof SUITES)[number]["id"];
type MutationOutcome =
  "KILLED" | "SURVIVED" | "TIMEOUT" | "COMPILE_INVALID" | "APPLY_FAILED" | "INFRASTRUCTURE_ERROR";

interface MutationManifestEntry {
  readonly id: string;
  readonly file: string;
  readonly module: string;
  readonly operator: string;
  readonly original: string;
  readonly mutated: string;
  readonly compile: string;
  readonly equivalence: string;
}

interface MutationManifest {
  readonly version: string;
  readonly seed: number;
  readonly golden_commit: string;
  readonly golden_digests: Readonly<Record<string, string>>;
  readonly support_digests: Readonly<Record<string, string>>;
  readonly mutants: readonly MutationManifestEntry[];
}

interface CoverageResult {
  readonly status: string;
  readonly baselineCoverage: { readonly score: number } | null;
  readonly finalCoverage: { readonly score: number } | null;
}

interface MutationInputAudit {
  readonly version: string;
  readonly seed: number;
  readonly goldenCommit: string;
  readonly inputSetDigest: string;
  readonly files: readonly {
    readonly path: string;
    readonly byteLength: number;
    readonly contentDigest: string;
  }[];
}

interface AssetAudit {
  readonly suiteId: SuiteId;
  readonly sourceRunId: string;
  readonly sourceStatus: string;
  readonly reviewStatus: string;
  readonly coverageScore: number;
  readonly files: readonly {
    readonly path: string;
    readonly byteLength: number;
    readonly contentDigest: string;
  }[];
}

interface CommandEvidence {
  readonly executable: string;
  readonly arguments: readonly string[];
  readonly cwd: string;
  readonly environment: {
    readonly platform: NodeJS.Platform;
    readonly architecture: string;
    readonly nodeVersion: string;
    readonly verilatorRootConfigured: boolean;
  };
}

interface MutationCaseResult {
  readonly mutantId: string;
  readonly module: string;
  readonly operator: string;
  readonly sourcePath: string;
  readonly equivalence: string;
  readonly outcome: MutationOutcome;
  readonly durationMs: number;
  readonly originalDigest: string;
  readonly mutatedDigest: string | null;
  readonly apply: CompilerProcessResult;
  readonly compile: CompilerProcessResult | null;
  readonly simulation: CompilerProcessResult | null;
}

interface SuiteResult {
  readonly suiteId: SuiteId;
  readonly sourceRunId: string;
  readonly coverageScore: number;
  readonly reviewStatus: string;
  readonly goldenPassed: boolean;
  readonly goldenCompile: CompilerProcessResult;
  readonly goldenSimulation: CompilerProcessResult | null;
  readonly mutants: readonly MutationCaseResult[];
  readonly counts: Readonly<Record<MutationOutcome, number>>;
  readonly rawMutationScore: number | null;
  readonly adjustedMutationScore: null;
  readonly durationMs: number;
}

export interface MutationCommandOptions {
  readonly suites: readonly SuiteId[];
  readonly timeoutMs: number;
}

export interface MutationProcessRunner {
  (options: CompilerProcessOptions): Promise<CompilerProcessResult>;
}

export interface MutationCommandDependencies {
  readonly processRunner?: MutationProcessRunner;
  readonly runsRoot?: string;
  readonly now?: () => Date;
}

function fail(message: string): never {
  throw new CoreLoopException("COVERAGE_EXPERIMENT_FAILED", message);
}

function asObject(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(`${label} is not a JSON object`);
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) fail(`${label} is not a non-empty string`);
  return value;
}

function asNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) fail(`${label} is not a number`);
  return value;
}

function asStringRecord(value: unknown, label: string): Readonly<Record<string, string>> {
  const object = asObject(value, label);
  return Object.fromEntries(
    Object.entries(object).map(([key, entry]) => [key, asString(entry, `${label}.${key}`)]),
  );
}

function parseMutationManifest(value: unknown): MutationManifest {
  const object = asObject(value, "mutation manifest");
  if (!Array.isArray(object.mutants)) fail("mutation manifest mutants is not an array");
  const mutants = object.mutants.map((entry, index) => {
    const mutant = asObject(entry, `mutation manifest mutants[${String(index)}]`);
    return {
      id: asString(mutant.id, "mutant id"),
      file: asString(mutant.file, "mutant file"),
      module: asString(mutant.module, "mutant module"),
      operator: asString(mutant.operator, "mutant operator"),
      original: asString(mutant.original, "mutant original"),
      mutated: asString(mutant.mutated, "mutant mutated"),
      compile: asString(mutant.compile, "mutant compile"),
      equivalence: asString(mutant.equivalence, "mutant equivalence"),
    };
  });
  return {
    version: asString(object.version, "mutation version"),
    seed: asNumber(object.seed, "mutation seed"),
    golden_commit: asString(object.golden_commit, "golden commit"),
    golden_digests: asStringRecord(object.golden_digests, "golden digests"),
    support_digests: asStringRecord(object.support_digests, "support digests"),
    mutants,
  };
}

function parseCoverageResult(value: unknown): CoverageResult {
  const object = asObject(value, "coverage result");
  const coverage = (field: "baselineCoverage" | "finalCoverage") => {
    const raw = object[field];
    if (raw === null) return null;
    const parsed = asObject(raw, field);
    return { score: asNumber(parsed.score, `${field}.score`) };
  };
  return {
    status: asString(object.status, "coverage result status"),
    baselineCoverage: coverage("baselineCoverage"),
    finalCoverage: coverage("finalCoverage"),
  };
}

export function patchMatchesManifestEntry(
  patchText: string,
  entry: Pick<MutationManifestEntry, "file" | "original" | "mutated">,
): boolean {
  const patchLines = patchText.replace(/\r\n?/g, "\n").split("\n");
  const removedLines = patchLines
    .filter((line) => line.startsWith("-") && !line.startsWith("---"))
    .map((line) => line.slice(1).trim());
  const addedLines = patchLines
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
    .map((line) => line.slice(1).trim());
  return (
    patchText.includes(`--- a/${entry.file}`) &&
    patchText.includes(`+++ b/${entry.file}`) &&
    removedLines.includes(entry.original.trim()) &&
    addedLines.includes(entry.mutated.trim())
  );
}

function digest(bytes: Uint8Array): string {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, "utf8")) as unknown;
}

async function fileEvidence(root: string, logicalPath: string) {
  const bytes = await readFile(path.join(root, ...logicalPath.split("/")));
  return { path: logicalPath, byteLength: bytes.byteLength, contentDigest: digest(bytes) };
}

async function mutationInputAudit(repositoryRoot: string): Promise<{
  readonly manifest: MutationManifest;
  readonly audit: MutationInputAudit;
}> {
  const mutationRoot = path.join(repositoryRoot, "mutation");
  const manifestPath = path.join(mutationRoot, "manifest.json");
  const selectionPath = path.join(mutationRoot, "selection.json");
  const manifest = parseMutationManifest(await readJson(manifestPath));
  const selection = asObject(await readJson(selectionPath), "mutation selection");
  if (
    manifest.version !== MUTATION_VERSION ||
    manifest.seed !== MUTATION_SEED ||
    asNumber(selection.seed, "mutation selection seed") !== MUTATION_SEED ||
    manifest.mutants.length !== MUTANT_COUNT
  ) {
    fail("frozen mutation manifest/selection identity does not match i2c-mutants-v1");
  }
  const expectedIds = Array.from(
    { length: MUTANT_COUNT },
    (_, index) => `M${String(index + 1).padStart(3, "0")}`,
  );
  if (manifest.mutants.map((mutant) => mutant.id).join(",") !== expectedIds.join(",")) {
    fail("frozen mutation manifest does not contain M001..M030 in order");
  }
  const logicalPaths = [
    "mutation/manifest.json",
    "mutation/selection.json",
    ...expectedIds.map((id) => `mutation/mutants/${id}.patch`),
  ];
  const files = await Promise.all(
    logicalPaths.map(async (logicalPath) => {
      const bytes = await readFile(path.join(repositoryRoot, ...logicalPath.split("/")));
      return { path: logicalPath, byteLength: bytes.byteLength, contentDigest: digest(bytes) };
    }),
  );
  const aggregate = digest(
    Buffer.from(files.map((file) => `${file.path}\0${file.contentDigest.slice(7)}\n`).join("")),
  );
  if (aggregate !== MUTATION_INPUT_SET_DIGEST) {
    fail(`frozen mutation input digest mismatch: ${aggregate}`);
  }
  await Promise.all(
    manifest.mutants.map(async (mutant) => {
      if (
        mutant.compile !== "PASS" ||
        mutant.equivalence !== "suspected_non_equivalent" ||
        !DUT_PATHS.includes(mutant.file as (typeof DUT_PATHS)[number])
      ) {
        fail(`mutant ${mutant.id} violates the frozen selection contract`);
      }
      const patchText = await readFile(
        path.join(mutationRoot, "mutants", `${mutant.id}.patch`),
        "utf8",
      );
      if (!patchMatchesManifestEntry(patchText, mutant)) {
        fail(`mutant ${mutant.id} patch does not match its manifest entry`);
      }
    }),
  );
  return {
    manifest,
    audit: {
      version: manifest.version,
      seed: manifest.seed,
      goldenCommit: manifest.golden_commit,
      inputSetDigest: aggregate,
      files,
    },
  };
}

async function auditAsset(
  repositoryRoot: string,
  manifest: MutationManifest,
  suite: (typeof SUITES)[number],
): Promise<AssetAudit> {
  const sourceRoot = path.join(
    repositoryRoot,
    ".rtl-agent",
    "i2c-coverage-runs",
    "i2c-master",
    suite.sourceRunId,
  );
  const workspace = path.join(sourceRoot, "workspace");
  const coverageResult = parseCoverageResult(
    await readJson(path.join(sourceRoot, "evidence", "i2c-coverage-experiment-result.json")),
  );
  const selectedCoverage = coverageResult[suite.coverageField];
  if (
    coverageResult.status !== suite.expectedStatus ||
    selectedCoverage === null ||
    selectedCoverage.score !== suite.expectedCoverage
  ) {
    fail(`verification asset ${suite.id} coverage provenance is invalid`);
  }
  const paths = [...DUT_PATHS, ...SUPPORT_PATHS];
  const files = await Promise.all(paths.map((logicalPath) => fileEvidence(workspace, logicalPath)));
  const byPath = new Map(files.map((file) => [file.path, file] as const));
  for (const logicalPath of DUT_PATHS) {
    if (byPath.get(logicalPath)?.contentDigest !== manifest.golden_digests[logicalPath]) {
      fail(`verification asset ${suite.id} changed golden DUT ${logicalPath}`);
    }
  }
  for (const logicalPath of SUPPORT_PATHS.filter((entry) => entry !== "rtl/tb.sv")) {
    if (byPath.get(logicalPath)?.contentDigest !== manifest.support_digests[logicalPath]) {
      fail(`verification asset ${suite.id} changed protected support file ${logicalPath}`);
    }
  }
  if (byPath.get("rtl/tb.sv")?.contentDigest !== suite.expectedTbDigest) {
    fail(`verification asset ${suite.id} testbench digest is invalid`);
  }
  return {
    suiteId: suite.id,
    sourceRunId: suite.sourceRunId,
    sourceStatus: coverageResult.status,
    reviewStatus: suite.reviewStatus,
    coverageScore: suite.expectedCoverage,
    files,
  };
}

function processPassed(result: CompilerProcessResult): boolean {
  return (
    result.exitCode === 0 &&
    result.signal === null &&
    !result.timedOut &&
    !result.terminationFailed &&
    result.closeConfirmed &&
    result.spawnError === undefined
  );
}

function infrastructureFailed(result: CompilerProcessResult): boolean {
  return (
    result.spawnError !== undefined ||
    result.terminationFailed ||
    !result.closeConfirmed ||
    result.signal !== null
  );
}

export function classifyMutationExecution(
  apply: CompilerProcessResult,
  compile: CompilerProcessResult | null,
  simulation: CompilerProcessResult | null,
): MutationOutcome {
  if (!processPassed(apply)) return "APPLY_FAILED";
  if (compile === null) return "INFRASTRUCTURE_ERROR";
  if (compile.timedOut) return "TIMEOUT";
  if (infrastructureFailed(compile)) return "INFRASTRUCTURE_ERROR";
  if (!processPassed(compile)) return "COMPILE_INVALID";
  if (simulation === null) return "INFRASTRUCTURE_ERROR";
  if (simulation.timedOut) return "TIMEOUT";
  if (infrastructureFailed(simulation)) return "INFRASTRUCTURE_ERROR";
  return processPassed(simulation) ? "SURVIVED" : "KILLED";
}

export function rawMutationScore(outcomes: readonly MutationOutcome[]): number | null {
  const killed = outcomes.filter((outcome) => outcome === "KILLED").length;
  const survived = outcomes.filter((outcome) => outcome === "SURVIVED").length;
  const denominator = killed + survived;
  return denominator === 0 ? null : Math.round((killed / denominator) * 10_000) / 100;
}

function logicalCommandArguments(
  arguments_: readonly string[],
  replacements: ReadonlyMap<string, string>,
) {
  return arguments_.map((argument) => {
    let normalized = argument;
    for (const [hostPath, logicalPath] of replacements) {
      normalized = normalized.replaceAll(hostPath, logicalPath);
    }
    return normalized.replaceAll("\\", "/");
  });
}

function commandEvidence(
  executable: string,
  arguments_: readonly string[],
  cwd: string,
  environment: NodeJS.ProcessEnv,
  repositoryRoot: string,
  runDirectory: string,
): CommandEvidence {
  const replacements = new Map([
    [repositoryRoot, "<repository>"],
    [runDirectory, "<mutation-run>"],
  ]);
  return {
    executable: path.basename(executable),
    arguments: logicalCommandArguments(arguments_, replacements),
    cwd: logicalCommandArguments([cwd], replacements)[0]!,
    environment: {
      platform: process.platform,
      architecture: process.arch,
      nodeVersion: process.version,
      verilatorRootConfigured: environment.VERILATOR_ROOT !== undefined,
    },
  };
}

async function writeJson(target: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(value, undefined, 2)}\n`, { flag: "wx" });
}

async function createRunDirectory(runsRoot: string, now: Date): Promise<string> {
  const stem = `mutation_${now.toISOString().replaceAll(/[-:.]/g, "").replace("Z", "Z")}`;
  for (let collision = 0; collision < 1_000; collision += 1) {
    const name = collision === 0 ? stem : `${stem}-${String(collision).padStart(3, "0")}`;
    const candidate = path.join(runsRoot, name);
    try {
      await mkdir(candidate, { recursive: false });
      return candidate;
    } catch (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? (error as { readonly code?: unknown }).code
          : undefined;
      if (code !== "EEXIST") throw error;
    }
  }
  fail("could not allocate a unique mutation run directory");
}

function commonProcessOptions(
  environment: NodeJS.ProcessEnv,
  timeoutMs: number,
  repositoryRoot: string,
  runDirectory: string,
) {
  return {
    environment,
    timeoutMs,
    terminationGraceMs: 1_000,
    retainedOutputBytes: 131_072,
    stdoutLimitBytes: 65_536,
    stderrLimitBytes: 65_536,
    logicalPathReplacements: {
      [repositoryRoot]: "<repository>",
      [runDirectory]: "<mutation-run>",
    },
  } as const;
}

async function compileAndSimulate(options: {
  readonly workspace: string;
  readonly evidenceRoot: string;
  readonly repositoryRoot: string;
  readonly runDirectory: string;
  readonly environment: NodeJS.ProcessEnv;
  readonly verilatorExecutable: string;
  readonly cflags: readonly string[];
  readonly timeoutMs: number;
  readonly processRunner: MutationProcessRunner;
}): Promise<{
  readonly compile: CompilerProcessResult;
  readonly simulation: CompilerProcessResult | null;
}> {
  const buildDirectory = path.join(options.evidenceRoot, "build");
  await mkdir(buildDirectory, { recursive: true });
  const sources = (await scanRegularFiles(path.join(options.workspace, "rtl")))
    .map((file) => `rtl/${file.logicalPath}`)
    .filter((file) => /\.(?:sv|v)$/i.test(file))
    .sort();
  const executableName = process.platform === "win32" ? "sim.exe" : "sim";
  const compileArguments = [
    "--binary",
    "--timing",
    "-Wno-fatal",
    "--top-module",
    "tb",
    "--Mdir",
    buildDirectory,
    "-o",
    executableName,
    ...options.cflags.flatMap((flag) => ["-CFLAGS", flag]),
    "-Irtl/dut",
    ...sources,
  ];
  const common = commonProcessOptions(
    options.environment,
    options.timeoutMs,
    options.repositoryRoot,
    options.runDirectory,
  );
  const compile = await options.processRunner({
    ...common,
    executable: options.verilatorExecutable,
    arguments: compileArguments,
    cwd: options.workspace,
  });
  await writeJson(path.join(options.evidenceRoot, "compile.json"), {
    command: commandEvidence(
      options.verilatorExecutable,
      compileArguments,
      options.workspace,
      options.environment,
      options.repositoryRoot,
      options.runDirectory,
    ),
    result: compile,
  });
  if (!processPassed(compile)) return { compile, simulation: null };
  const simulationExecutable = path.join(buildDirectory, executableName);
  const simulation = await options.processRunner({
    ...common,
    executable: simulationExecutable,
    arguments: [],
    cwd: buildDirectory,
  });
  await writeJson(path.join(options.evidenceRoot, "simulation.json"), {
    command: commandEvidence(
      simulationExecutable,
      [],
      buildDirectory,
      options.environment,
      options.repositoryRoot,
      options.runDirectory,
    ),
    result: simulation,
  });
  return { compile, simulation };
}

function zeroCounts(): Record<MutationOutcome, number> {
  return {
    KILLED: 0,
    SURVIVED: 0,
    TIMEOUT: 0,
    COMPILE_INVALID: 0,
    APPLY_FAILED: 0,
    INFRASTRUCTURE_ERROR: 0,
  };
}

async function replaySuite(options: {
  readonly repositoryRoot: string;
  readonly runDirectory: string;
  readonly environment: NodeJS.ProcessEnv;
  readonly suite: (typeof SUITES)[number];
  readonly audit: AssetAudit;
  readonly manifest: MutationManifest;
  readonly processRunner: MutationProcessRunner;
  readonly gitExecutable: string;
  readonly verilatorExecutable: string;
  readonly cflags: readonly string[];
  readonly timeoutMs: number;
  readonly writeOutput: (line: string) => void;
}): Promise<SuiteResult> {
  const startedAt = performance.now();
  const suiteRoot = path.join(options.runDirectory, "suites", options.suite.id);
  const sourceRtl = path.join(
    options.repositoryRoot,
    ".rtl-agent",
    "i2c-coverage-runs",
    "i2c-master",
    options.suite.sourceRunId,
    "workspace",
    "rtl",
  );
  await writeJson(path.join(suiteRoot, "asset-audit.json"), options.audit);

  const goldenWorkspace = path.join(suiteRoot, "workspaces", "golden");
  await mkdir(goldenWorkspace, { recursive: true });
  await cp(sourceRtl, path.join(goldenWorkspace, "rtl"), {
    recursive: true,
    errorOnExist: true,
    force: false,
  });
  const golden = await compileAndSimulate({
    workspace: goldenWorkspace,
    evidenceRoot: path.join(suiteRoot, "golden"),
    repositoryRoot: options.repositoryRoot,
    runDirectory: options.runDirectory,
    environment: options.environment,
    verilatorExecutable: options.verilatorExecutable,
    cflags: options.cflags,
    timeoutMs: options.timeoutMs,
    processRunner: options.processRunner,
  });
  const goldenPassed =
    processPassed(golden.compile) && golden.simulation !== null && processPassed(golden.simulation);
  if (!goldenPassed) {
    const result: SuiteResult = {
      suiteId: options.suite.id,
      sourceRunId: options.suite.sourceRunId,
      coverageScore: options.suite.expectedCoverage,
      reviewStatus: options.suite.reviewStatus,
      goldenPassed: false,
      goldenCompile: golden.compile,
      goldenSimulation: golden.simulation,
      mutants: [],
      counts: zeroCounts(),
      rawMutationScore: null,
      adjustedMutationScore: null,
      durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
    };
    await writeJson(path.join(suiteRoot, "suite-result.json"), result);
    options.writeOutput(`${options.suite.id}: golden DUT failed; suite invalid`);
    return result;
  }

  const mutants: MutationCaseResult[] = [];
  for (const mutant of options.manifest.mutants) {
    const mutantStartedAt = performance.now();
    const caseRoot = path.join(suiteRoot, "mutants", mutant.id);
    const workspace = path.join(suiteRoot, "workspaces", mutant.id);
    await mkdir(workspace, { recursive: true });
    await cp(sourceRtl, path.join(workspace, "rtl"), {
      recursive: true,
      errorOnExist: true,
      force: false,
    });
    const target = path.join(workspace, ...mutant.file.split("/"));
    const originalDigest = digest(await readFile(target));
    const patchPath = path.join(
      options.repositoryRoot,
      "mutation",
      "mutants",
      `${mutant.id}.patch`,
    );
    const applyArguments = ["apply", "--whitespace=nowarn", patchPath];
    const apply = await options.processRunner({
      ...commonProcessOptions(
        options.environment,
        options.timeoutMs,
        options.repositoryRoot,
        options.runDirectory,
      ),
      executable: options.gitExecutable,
      arguments: applyArguments,
      cwd: workspace,
    });
    await writeJson(path.join(caseRoot, "apply.json"), {
      command: commandEvidence(
        options.gitExecutable,
        applyArguments,
        workspace,
        options.environment,
        options.repositoryRoot,
        options.runDirectory,
      ),
      result: apply,
    });
    let mutatedDigest: string | null = null;
    let compile: CompilerProcessResult | null = null;
    let simulation: CompilerProcessResult | null = null;
    if (processPassed(apply)) {
      mutatedDigest = digest(await readFile(target));
      if (mutatedDigest === originalDigest) fail(`${mutant.id} patch did not change its target`);
      const execution = await compileAndSimulate({
        workspace,
        evidenceRoot: caseRoot,
        repositoryRoot: options.repositoryRoot,
        runDirectory: options.runDirectory,
        environment: options.environment,
        verilatorExecutable: options.verilatorExecutable,
        cflags: options.cflags,
        timeoutMs: options.timeoutMs,
        processRunner: options.processRunner,
      });
      compile = execution.compile;
      simulation = execution.simulation;
    }
    const outcome = classifyMutationExecution(apply, compile, simulation);
    const result: MutationCaseResult = {
      mutantId: mutant.id,
      module: mutant.module,
      operator: mutant.operator,
      sourcePath: mutant.file,
      equivalence: mutant.equivalence,
      outcome,
      durationMs: Math.max(0, Math.round(performance.now() - mutantStartedAt)),
      originalDigest,
      mutatedDigest,
      apply,
      compile,
      simulation,
    };
    await writeJson(path.join(caseRoot, "result.json"), result);
    mutants.push(result);
    options.writeOutput(`${options.suite.id} ${mutant.id}: ${outcome}`);
  }
  const counts = zeroCounts();
  for (const mutant of mutants) counts[mutant.outcome] += 1;
  const result: SuiteResult = {
    suiteId: options.suite.id,
    sourceRunId: options.suite.sourceRunId,
    coverageScore: options.suite.expectedCoverage,
    reviewStatus: options.suite.reviewStatus,
    goldenPassed: true,
    goldenCompile: golden.compile,
    goldenSimulation: golden.simulation,
    mutants,
    counts,
    rawMutationScore: rawMutationScore(mutants.map((mutant) => mutant.outcome)),
    adjustedMutationScore: null,
    durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
  };
  await writeJson(path.join(suiteRoot, "suite-result.json"), result);
  return result;
}

export function parseMutationCommandOptions(arguments_: readonly string[]): MutationCommandOptions {
  const named = parseNamedOptions(arguments_);
  const allowed = new Set(["--suite", "--timeout-ms"]);
  const requestedSuite = named.get("--suite");
  const timeoutText = named.get("--timeout-ms");
  const timeoutMs = timeoutText === undefined ? DEFAULT_TIMEOUT_MS : Number(timeoutText);
  const suites =
    requestedSuite === undefined
      ? SUITES.map((suite) => suite.id)
      : SUITES.filter((suite) => suite.id === requestedSuite).map((suite) => suite.id);
  if (
    [...named.keys()].some((name) => !allowed.has(name)) ||
    suites.length === 0 ||
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 1_000 ||
    timeoutMs > 600_000
  ) {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      "mutation-run accepts optional --suite <baseline-78.16|enhanced-93.99|enhanced-100.00> and --timeout-ms <1000-600000>",
    );
  }
  return { suites, timeoutMs };
}

export async function runMutationCommand(options: {
  readonly arguments_: readonly string[];
  readonly writeOutput: (line: string) => void;
  readonly environment: NodeJS.ProcessEnv;
  readonly repositoryRoot: string;
  readonly dependencies?: MutationCommandDependencies;
}): Promise<number> {
  const parsed = parseMutationCommandOptions(options.arguments_.slice(1));
  const startedAt = options.dependencies?.now?.() ?? new Date();
  const runsRoot =
    options.dependencies?.runsRoot ??
    path.join(options.repositoryRoot, ".rtl-agent", "mutation-runs", "i2c-master");
  const { manifest, audit: inputAudit } = await mutationInputAudit(options.repositoryRoot);
  const selectedSuites = SUITES.filter((suite) => parsed.suites.includes(suite.id));
  const assetAudits = await Promise.all(
    selectedSuites.map((suite) => auditAsset(options.repositoryRoot, manifest, suite)),
  );
  await mkdir(runsRoot, { recursive: true });
  const runDirectory = await createRunDirectory(runsRoot, startedAt);
  await writeJson(path.join(runDirectory, "input-audit.json"), {
    mutation: inputAudit,
    assets: assetAudits,
  });

  const windowsDefault = process.platform === "win32";
  const environment =
    windowsDefault && options.environment.RTL_AGENT_VERILATOR_EXECUTABLE === undefined
      ? withDefaultWindowsVerilatorEnvironment(options.environment)
      : options.environment;
  const verilatorExecutable =
    options.environment.RTL_AGENT_VERILATOR_EXECUTABLE ??
    (windowsDefault ? "C:\\msys64\\ucrt64\\bin\\verilator_bin.exe" : "verilator");
  const gitExecutable = options.environment.RTL_AGENT_GIT_EXECUTABLE ?? "git";
  const cflags = windowsDefault ? ["-D_GLIBCXX_USE_CXX11_ABI=0"] : [];
  const processRunner = options.dependencies?.processRunner ?? executeCompilerProcess;
  const suiteResults: SuiteResult[] = [];
  for (const suite of selectedSuites) {
    const audit = assetAudits.find((entry) => entry.suiteId === suite.id);
    if (audit === undefined) fail(`asset audit for ${suite.id} is missing`);
    suiteResults.push(
      await replaySuite({
        repositoryRoot: options.repositoryRoot,
        runDirectory,
        environment,
        suite,
        audit,
        manifest,
        processRunner,
        gitExecutable,
        verilatorExecutable,
        cflags,
        timeoutMs: parsed.timeoutMs,
        writeOutput: options.writeOutput,
      }),
    );
  }
  const complete = suiteResults.every(
    (suite) => suite.goldenPassed && suite.mutants.length === MUTANT_COUNT,
  );
  const result = {
    schemaVersion: 1,
    status: complete ? "COMPLETED" : "INVALID",
    startedAt: startedAt.toISOString(),
    finishedAt: (options.dependencies?.now?.() ?? new Date()).toISOString(),
    mutationVersion: MUTATION_VERSION,
    seed: MUTATION_SEED,
    patchCount: MUTANT_COUNT,
    inputSetDigest: MUTATION_INPUT_SET_DIGEST,
    adjustedMutationScorePolicy:
      "null until equivalence or unreachability is confirmed by human review or formal evidence",
    suites: suiteResults,
    runDirectory: path.relative(options.repositoryRoot, runDirectory).replaceAll(path.sep, "/"),
  };
  await writeJson(path.join(runDirectory, "mutation-result.json"), result);
  options.writeOutput(JSON.stringify({ ok: complete, result }));
  return complete ? 0 : 3;
}
