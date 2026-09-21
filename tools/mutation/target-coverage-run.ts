import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { writeFileSync } from "node:fs";
import path from "node:path";
import {
  PiRtlAgentAdapter,
  piExperimentConfigFromEnvironment,
  VerilatorCoverageRunner,
  projectCoverageLock,
} from "../../packages/core-loop/dist/index.js";
import { runProjectCoverageCommand } from "../../apps/rtl-core-loop/dist/project-coverage-command.js";
import {
  loadRepositoryEnvironment,
  withDefaultWindowsVerilatorEnvironment,
} from "../../apps/rtl-core-loop/dist/environment.js";
import { frozenContext, withFrozenMemory } from "./verification-frozen-adapter.ts";
import { withTargetProviderGuard } from "./target-provider-guard.ts";
import { withTargetTopology, withTargetCoverageBoundary } from "./target-topology-guard.ts";
import {
  IMPLEMENTATION_CHECK,
  withImplementationCheck,
} from "./verification-implementation-check.ts";
import { hash } from "./verification-frozen-adapter.ts";

const [project, mode, label, workflow] = process.argv.slice(2);
assert.ok(process.argv.length <= 6);
assert.ok(workflow === undefined || workflow === "implementation-check");
assert.ok(project === "dpretet" || project === "axis");
assert.ok(mode === "off" || mode === "frozen" || mode === "baseline");
assert.ok(workflow === undefined || (project === "dpretet" && mode !== "baseline"));
assert.match(label ?? "", /^[a-z0-9][a-z0-9-]{0,100}$/);
const repo = process.cwd();
const root = path.join(repo, ".rtl-agent", "fifo-target-runs", label!);
await mkdir(path.dirname(root), { recursive: true });
await mkdir(root);
await frozenContext(repo); // Validate the same lock for both conditions, never expose it in off.
const environment = await loadRepositoryEnvironment(repo);
const config = piExperimentConfigFromEnvironment(environment, repo);
assert.equal(config.provider, "kimi-coding");
assert.equal(config.model, "k3");
const adapter = new PiRtlAgentAdapter({ ...config, guidanceProfile: "coverage-improvement" });
const guarded = withTargetTopology(withTargetProviderGuard(adapter), project);
const memoryAdapter = mode === "frozen" ? withFrozenMemory(guarded, repo) : guarded;
const selectedAdapter =
  workflow === "implementation-check" ? withImplementationCheck(memoryAdapter) : memoryAdapter;
const windows = process.platform === "win32";
const projectLock = projectCoverageLock(project);
const coverageRunner = withTargetCoverageBoundary(
  new VerilatorCoverageRunner({
    verilatorExecutable:
      environment.RTL_AGENT_VERILATOR_EXECUTABLE ??
      (windows
        ? path.win32.join("C:\\", "msys64", "ucrt64", "bin", "verilator_bin.exe")
        : "verilator"),
    coverageExecutable:
      environment.RTL_AGENT_VERILATOR_COVERAGE_EXECUTABLE ??
      (windows
        ? path.win32.join("C:\\", "msys64", "ucrt64", "bin", "verilator_coverage_bin_dbg.exe")
        : "verilator_coverage"),
    environment:
      windows && environment.RTL_AGENT_VERILATOR_EXECUTABLE === undefined
        ? withDefaultWindowsVerilatorEnvironment(environment)
        : environment,
    ...(windows ? { cflags: ["-D_GLIBCXX_USE_CXX11_ABI=0"] } : {}),
    dutSourcePaths: projectLock.dutSourcePaths,
    includeDirectories: projectLock.includeDirectories,
    includeToggleInScore: true,
  }),
  project,
);
await writeFile(
  path.join(root, "condition.json"),
  JSON.stringify(
    {
      project,
      mode,
      label,
      configAudit: {
        model: config.model,
        provider: config.provider,
        version: config.expectedPiVersion,
        timeoutMs: config.timeoutMs,
        terminationGraceMs: config.terminationGraceMs,
        stabilityWindowMs: config.stabilityWindowMs,
        maximumEvents: config.maximumEvents,
        maximumEventLineBytes: config.maximumEventLineBytes,
        workspaceLimits: config.workspaceLimits,
      },
      model: config.model,
      provider: config.provider,
      maxIterations: mode === "baseline" ? 0 : 3,
      selector: mode === "frozen" ? "select-all-v1" : null,
      reviewStatus: "PENDING_HUMAN_REVIEW",
      boundaryVersion: "target-recovery-v2",
      ...(workflow === undefined
        ? {}
        : { workflow, implementationCheckDigest: hash(IMPLEMENTATION_CHECK) }),
    },
    null,
    2,
  ),
);
const code = await runProjectCoverageCommand({
  arguments_: [
    "project-coverage",
    "--project",
    project,
    "--agent",
    "pi",
    "--iterations",
    mode === "baseline" ? "0" : "3",
  ],
  environment,
  repositoryRoot: repo,
  dependencies: {
    runsRoot: root,
    agentAdapter: selectedAdapter,
    coverageRunner,
  },
  writeOutput: (line) => {
    writeFileSync(path.join(root, "execution.json"), line + "\n", { flag: "wx" });
    const execution = JSON.parse(line);
    process.stdout.write(
      JSON.stringify({
        phase: "coverage-complete",
        project,
        mode,
        run: execution.result.runDirectory,
        status: execution.result.status,
        stopReason: execution.result.stopReason,
        baseline: execution.result.baselineCoverage?.score,
        final: execution.result.finalCoverage?.score,
        attempts: execution.result.agentAttempts,
      }) + "\n",
    );
  },
});
process.exitCode = code;
