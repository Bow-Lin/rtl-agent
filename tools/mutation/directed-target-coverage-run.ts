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
import { withTargetProviderGuard } from "./target-provider-guard.ts";
import { withTargetTopology, withTargetCoverageBoundary } from "./target-topology-guard.ts";
import { directedContext, withDirectedMemory } from "./verification-directed-memory.ts";

const [project, mode, label] = process.argv.slice(2);
assert.equal(process.argv.length, 5);
assert.equal(project, "dpretet");
assert.equal(mode, "directed-memory10");
assert.match(label ?? "", /^[a-z0-9][a-z0-9-]{0,100}$/);
const repo = process.cwd();
const root = path.join(repo, ".rtl-agent", "fifo-target-runs", label!);
await mkdir(path.dirname(root), { recursive: true });
await mkdir(root);
const selected = await directedContext(repo);
const environment = await loadRepositoryEnvironment(repo);
const config = piExperimentConfigFromEnvironment(environment, repo);
assert.equal(config.provider, "kimi-coding");
assert.equal(config.model, "k3");
const adapter = new PiRtlAgentAdapter({ ...config, guidanceProfile: "coverage-improvement" });
const guarded = withTargetTopology(withTargetProviderGuard(adapter), project);
const selectedAdapter = withDirectedMemory(guarded, repo);
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
      maxIterations: 3,
      selector: "select-memory10-v1",
      selectedIds: selected.selectedIds,
      selectedItemDigest: selected.selectedItemDigest,
      manifestDigest: selected.manifestDigest,
      itemsDigest: selected.itemsDigest,
      injectionDigest: selected.injectionDigest,
      directedWorkItemDigest: selected.addendumDigest,
      reviewStatus: "PENDING_HUMAN_REVIEW",
      boundaryVersion: "target-recovery-v2",
      workflow: "directed-work-item",
      workItemPlacement: ["relevantMemoryPath context", "spec.md append-only"],
    },
    null,
    2,
  ) + "\n",
  { flag: "wx" },
);
const code = await runProjectCoverageCommand({
  arguments_: ["project-coverage", "--project", project, "--agent", "pi", "--iterations", "3"],
  environment,
  repositoryRoot: repo,
  dependencies: { runsRoot: root, agentAdapter: selectedAdapter, coverageRunner },
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
