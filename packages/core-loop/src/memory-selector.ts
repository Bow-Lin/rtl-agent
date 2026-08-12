import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import { CoreLoopException } from "./errors.js";
import { writeJsonEvidenceExclusive } from "./evidence.js";
import { sha256Bytes, sha256Jcs } from "./filesystem.js";
import {
  MAXIMUM_SELECTED_MEMORIES,
  MEMORY_SELECTOR_PROMPT_DIGEST,
  MEMORY_SELECTOR_SYSTEM_PROMPT,
  MemoryItemIdSchema,
} from "./memory.js";
import type { MemorySelector, MemorySelectorRequest } from "./memory.js";
import { createFileManifest } from "./manifest.js";
import { executeOpenCodeProcess, executeProbeCommand } from "./opencode-process.js";
import { buildIsolatedPiEnvironment } from "./pi-agent-adapter.js";
import type { PiExperimentConfig } from "./pi-agent-adapter.js";

const SelectionOutputSchema = z.strictObject({
  schema_version: z.literal(1),
  memory_ids: z.array(MemoryItemIdSchema).max(MAXIMUM_SELECTED_MEMORIES),
});

const REQUIRED_FLAGS = [
  "--mode",
  "--no-session",
  "--provider",
  "--model",
  "--tools",
  "--no-extensions",
  "--extension",
  "--no-skills",
  "--no-prompt-templates",
  "--no-themes",
  "--no-context-files",
  "--no-approve",
  "--offline",
  "--system-prompt",
] as const;

function failure(message: string): CoreLoopException {
  return new CoreLoopException("MEMORY_STORE_INVALID", message);
}

async function requirePolicyFile(hostPath: string): Promise<Buffer> {
  try {
    const stat = await lstat(hostPath);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size === 0 || stat.size > 65_536) {
      throw new Error("invalid policy");
    }
    return await readFile(hostPath);
  } catch {
    throw failure("Pi Memory Selector policy is unavailable");
  }
}

async function readSelectionOutput(
  hostPath: string,
): Promise<z.infer<typeof SelectionOutputSchema>> {
  const stat = await lstat(hostPath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 65_536) {
    throw failure("Memory Selector output is not a bounded regular file");
  }
  return SelectionOutputSchema.parse(JSON.parse(await readFile(hostPath, "utf8")) as unknown);
}

async function requireReadAudit(hostPath: string, requiredPaths: readonly string[]): Promise<void> {
  const stat = await lstat(hostPath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 65_536) {
    throw failure("Memory Selector read audit is invalid");
  }
  const lines = (await readFile(hostPath, "utf8")).trim().split("\n").filter(Boolean);
  const paths = new Set(
    lines.map(
      (line) => z.strictObject({ path: z.string() }).parse(JSON.parse(line) as unknown).path,
    ),
  );
  if (requiredPaths.some((required) => !paths.has(required))) {
    throw failure("Pi Memory Selector did not read every required input");
  }
}

export class PiMemorySelector implements MemorySelector {
  private readonly config: PiExperimentConfig;
  private readonly extensionFile: string;

  public constructor(config: PiExperimentConfig) {
    this.config = {
      ...config,
      ...(config.executableArgumentsPrefix === undefined
        ? {}
        : { executableArgumentsPrefix: [...config.executableArgumentsPrefix] }),
      workspaceLimits: { ...config.workspaceLimits },
      ...(config.environment === undefined ? {} : { environment: { ...config.environment } }),
    };
    this.extensionFile = path.join(
      this.config.repositoryRoot,
      ".pi",
      "extensions",
      "rtl-memory-selector-policy.mjs",
    );
  }

  public async select(request: MemorySelectorRequest): Promise<readonly string[]> {
    if (
      Buffer.byteLength(request.specification, "utf8") > 1_000_000 ||
      (request.feedback !== null && Buffer.byteLength(request.feedback, "utf8") > 100_000)
    ) {
      throw failure("Memory Selector input exceeds the V1 size bound");
    }
    const workspace = path.resolve(request.evidenceDirectory);
    await mkdir(path.join(workspace, "context"), { recursive: true });
    const selectionPath = path.join(workspace, "selection.json");
    const auditPath = path.join(workspace, "context", "read-audit.jsonl");
    const requiredReads = [
      "spec.md",
      "context/selection-input.json",
      ...(request.feedback === null ? [] : ["context/functional-feedback.txt"]),
    ];
    const turnInstruction = `First read exactly ${requiredReads.join(
      ", ",
    )}. Then write selection.json now. Do not read a directory or any other path.`;
    if (await lstat(selectionPath).catch(() => undefined)) {
      try {
        await requireReadAudit(auditPath, requiredReads);
        return (await readSelectionOutput(selectionPath)).memory_ids;
      } catch {
        throw failure("Existing Memory Selector evidence is invalid");
      }
    }
    await Promise.all([
      writeFile(path.join(workspace, "spec.md"), request.specification, { flag: "wx" }),
      writeFile(
        path.join(workspace, "context", "selection-input.json"),
        `${JSON.stringify(
          {
            schema_version: 1,
            snapshot_id: request.snapshotId,
            stage: request.stage,
            filtered_catalog: request.filteredCatalog,
            maximum_selected: MAXIMUM_SELECTED_MEMORIES,
          },
          undefined,
          2,
        )}\n`,
        { flag: "wx" },
      ),
      ...(request.feedback === null
        ? []
        : [
            writeFile(
              path.join(workspace, "context", "functional-feedback.txt"),
              request.feedback,
              { flag: "wx" },
            ),
          ]),
    ]);
    await mkdir(this.config.configDirectory, { recursive: true });
    const [policyBytes, semanticConfig, runtimeConfig] = await Promise.all([
      requirePolicyFile(this.extensionFile),
      createFileManifest(this.config.configDirectory, (logicalPath) => logicalPath !== "auth.json"),
      createFileManifest(this.config.configDirectory),
    ]);
    const environment = buildIsolatedPiEnvironment(this.config);
    environment.RTL_AGENT_PI_MEMORY_SELECTOR_POLICY_REQUIRED = "1";
    environment.RTL_AGENT_PI_WORKSPACE_ROOT = workspace;
    environment.RTL_AGENT_PI_MEMORY_SELECTOR_READ_AUDIT = auditPath;
    const probe = async (arguments_: readonly string[]) =>
      executeProbeCommand({
        executable: this.config.executable,
        arguments: [...(this.config.executableArgumentsPrefix ?? []), ...arguments_],
        cwd: this.config.repositoryRoot,
        environment,
        timeoutMs: Math.min(this.config.timeoutMs, 30_000),
        terminationGraceMs: this.config.terminationGraceMs,
      });
    const [version, help] = await Promise.all([probe(["--version"]), probe(["--help"])]);
    const normalizedVersion = version.stdout.trim().replace(/^pi\s+/iu, "");
    const helpOutput = `${help.stdout}\n${help.stderr}`;
    if (
      version.exitCode !== 0 ||
      version.timedOut ||
      normalizedVersion !== this.config.expectedPiVersion ||
      help.exitCode !== 0 ||
      help.timedOut ||
      REQUIRED_FLAGS.some((flag) => !helpOutput.includes(flag))
    ) {
      throw failure("Pi Memory Selector capability probe failed");
    }
    const before = await createFileManifest(workspace);
    const processResult = await executeOpenCodeProcess({
      executable: this.config.executable,
      arguments: [
        ...(this.config.executableArgumentsPrefix ?? []),
        "--mode",
        "json",
        "--no-session",
        "--provider",
        this.config.provider,
        "--model",
        this.config.model,
        "--tools",
        "read,write",
        "--no-extensions",
        "--extension",
        this.extensionFile,
        "--no-skills",
        "--no-prompt-templates",
        "--no-themes",
        "--no-context-files",
        "--no-approve",
        "--offline",
        "--system-prompt",
        MEMORY_SELECTOR_SYSTEM_PROMPT,
        turnInstruction,
      ],
      cwd: workspace,
      environment,
      timeoutMs: this.config.timeoutMs,
      terminationGraceMs: this.config.terminationGraceMs,
      stderrLimitBytes: this.config.stderrLimitBytes,
      maximumEvents: this.config.maximumEvents,
      maximumEventLineBytes: this.config.maximumEventLineBytes,
    });
    const afterConfig = await createFileManifest(this.config.configDirectory);
    if (
      processResult.exitCode !== 0 ||
      processResult.timedOut ||
      processResult.terminationFailed ||
      processResult.spawnError !== undefined ||
      afterConfig.manifestDigest !== runtimeConfig.manifestDigest
    ) {
      throw failure("Pi Memory Selector failed or changed shared configuration");
    }
    await requireReadAudit(auditPath, requiredReads);
    let selection: z.infer<typeof SelectionOutputSchema>;
    try {
      selection = await readSelectionOutput(selectionPath);
    } catch {
      throw failure("Pi Memory Selector output is invalid");
    }
    const allowed = new Set(request.filteredCatalog.map((entry) => entry.memory_id));
    if (
      new Set(selection.memory_ids).size !== selection.memory_ids.length ||
      selection.memory_ids.some((id) => !allowed.has(id))
    ) {
      throw failure("Pi Memory Selector returned an ID outside the filtered catalog");
    }
    const after = await createFileManifest(workspace);
    await writeJsonEvidenceExclusive(workspace, "selection-metadata.json", {
      schema_version: 1,
      backend: "pi",
      provider: this.config.provider,
      model: this.config.model,
      pi_version: normalizedVersion,
      prompt_digest: MEMORY_SELECTOR_PROMPT_DIGEST,
      request_digest: sha256Jcs({
        snapshotId: request.snapshotId,
        filteredCatalog: request.filteredCatalog,
        specification: request.specification,
        feedback: request.feedback,
        stage: request.stage,
      }),
      policy_digest: sha256Bytes(policyBytes),
      config_digest: semanticConfig.manifestDigest,
      input_manifest_digest: before.manifestDigest,
      output_manifest_digest: after.manifestDigest,
      duration_ms: processResult.durationMs,
    });
    return selection.memory_ids;
  }
}
