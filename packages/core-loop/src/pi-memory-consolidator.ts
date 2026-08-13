import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  MemoryConsolidatorOutputSchema,
  type MemoryConsolidator,
  type MemoryConsolidatorRequest,
  type MemoryConsolidatorOutput,
} from "./memory-consolidator.js";
import { MEMORY_CONSOLIDATOR_PROMPT_DIGEST, MEMORY_CONSOLIDATOR_SYSTEM_PROMPT } from "./memory.js";
import { MEMORY_METADATA_CHARACTER_LIMIT } from "./memory.js";
import { CoreLoopException } from "./errors.js";
import { writeJsonEvidenceExclusive } from "./evidence.js";
import { sha256Bytes, sha256Jcs } from "./filesystem.js";
import { createFileManifest } from "./manifest.js";
import { executeOpenCodeProcess, executeProbeCommand } from "./opencode-process.js";
import { buildIsolatedPiEnvironment } from "./pi-agent-adapter.js";
import type { PiExperimentConfig } from "./pi-agent-adapter.js";

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
  return new CoreLoopException("MEMORY_CONSOLIDATION_FAILED", message);
}

async function requirePolicyFile(hostPath: string): Promise<Buffer> {
  try {
    const stat = await lstat(hostPath);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size === 0 || stat.size > 65_536) {
      throw new Error("invalid policy");
    }
    return await readFile(hostPath);
  } catch {
    throw failure("Pi Memory Consolidator policy is unavailable");
  }
}

async function readConsolidatorOutput(hostPath: string): Promise<MemoryConsolidatorOutput> {
  const stat = await lstat(hostPath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 8 * 1024 * 1024) {
    throw failure("Memory Consolidator output is not a bounded regular file");
  }
  return MemoryConsolidatorOutputSchema.parse(
    JSON.parse(await readFile(hostPath, "utf8")) as unknown,
  );
}

async function requireReadAudit(hostPath: string): Promise<void> {
  const stat = await lstat(hostPath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 65_536) {
    throw failure("Memory Consolidator read audit is invalid");
  }
  const lines = (await readFile(hostPath, "utf8")).trim().split("\n").filter(Boolean);
  const paths = new Set(
    lines.map((line) => {
      const parsed = JSON.parse(line) as unknown;
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed) ||
        Object.keys(parsed).length !== 1 ||
        !("path" in parsed) ||
        typeof parsed.path !== "string"
      ) {
        throw failure("Memory Consolidator read audit line is invalid");
      }
      return parsed.path;
    }),
  );
  const required = [
    "context/snapshot.json",
    "context/experiences.json",
    "context/output-schema.json",
  ];
  if (required.some((logicalPath) => !paths.has(logicalPath))) {
    throw failure("Pi Memory Consolidator did not read every required input");
  }
}

export class PiMemoryConsolidator implements MemoryConsolidator {
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
      "rtl-memory-consolidator-policy.mjs",
    );
  }

  public async consolidate(request: MemoryConsolidatorRequest): Promise<MemoryConsolidatorOutput> {
    const workspace = path.resolve(request.evidenceDirectory);
    const contextDirectory = path.join(workspace, "context");
    await mkdir(contextDirectory, { recursive: true });
    const resultPath = path.join(workspace, "result.json");
    const auditPath = path.join(contextDirectory, "read-audit.jsonl");
    if (await lstat(resultPath).catch(() => undefined)) {
      try {
        await requireReadAudit(auditPath);
        return await readConsolidatorOutput(resultPath);
      } catch {
        throw failure("Existing Memory Consolidator evidence is invalid");
      }
    }
    await Promise.all([
      writeFile(
        path.join(contextDirectory, "snapshot.json"),
        `${JSON.stringify(
          {
            manifest: request.snapshot.manifest,
            catalog: request.snapshot.catalog,
            items: request.snapshot.items,
          },
          undefined,
          2,
        )}\n`,
        { flag: "wx" },
      ),
      writeFile(
        path.join(contextDirectory, "experiences.json"),
        `${JSON.stringify(request.experiences, undefined, 2)}\n`,
        { flag: "wx" },
      ),
      writeFile(
        path.join(contextDirectory, "output-schema.json"),
        `${JSON.stringify(
          {
            schema_version: 1,
            exact_top_level_shape: {
              schema_version: 1,
              operations: "operation[]",
            },
            operation_shapes: [
              {
                operation: "ADD",
                memory: {
                  stage: "initial_generation | functional_simulation | unknown | null",
                  circuit_type: `string (1-${String(MEMORY_METADATA_CHARACTER_LIMIT)} characters) | null`,
                  failure_type: `string (1-${String(MEMORY_METADATA_CHARACTER_LIMIT)} characters) | null`,
                  language: `string (1-${String(MEMORY_METADATA_CHARACTER_LIMIT)} characters) | null`,
                  tool: `string (1-${String(MEMORY_METADATA_CHARACTER_LIMIT)} characters) | null`,
                  content:
                    "Markdown with the six required ordered ## headings named in the system prompt",
                },
                experience_indexes: "sorted unique zero-based integer[]",
              },
              {
                operation: "MERGE",
                memory_id: "existing memory-NNNNNN ID",
                memory: "same exact object as ADD.memory",
                experience_indexes: "sorted unique zero-based integer[]",
              },
              {
                operation: "REINFORCE",
                memory_id: "existing memory-NNNNNN ID",
                experience_indexes: "sorted unique zero-based integer[]",
              },
              {
                operation: "REJECT",
                experience_indexes: "sorted unique zero-based integer[]",
                reason: "10-500 character string",
              },
              {
                operation: "CONFLICT",
                memory_id: "existing memory-NNNNNN ID",
                experience_indexes: "sorted unique zero-based integer[]",
                detail: "10-500 character string",
              },
            ],
            invariants: [
              "No additional fields are allowed in the top level or any operation",
              "Every Experience index must appear exactly once across all operations",
              "At most five ADD operations",
            ],
          },
          undefined,
          2,
        )}\n`,
        { flag: "wx" },
      ),
    ]);
    await mkdir(this.config.configDirectory, { recursive: true });
    const [policyBytes, semanticConfig, runtimeConfig] = await Promise.all([
      requirePolicyFile(this.extensionFile),
      createFileManifest(this.config.configDirectory, (logicalPath) => logicalPath !== "auth.json"),
      createFileManifest(this.config.configDirectory),
    ]);
    const environment = buildIsolatedPiEnvironment(this.config);
    environment.RTL_AGENT_PI_MEMORY_CONSOLIDATOR_POLICY_REQUIRED = "1";
    environment.RTL_AGENT_PI_WORKSPACE_ROOT = workspace;
    environment.RTL_AGENT_PI_MEMORY_CONSOLIDATOR_READ_AUDIT = auditPath;
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
      throw failure("Pi Memory Consolidator capability probe failed");
    }
    const inputManifest = await createFileManifest(workspace);
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
        MEMORY_CONSOLIDATOR_SYSTEM_PROMPT,
        "First read exactly context/snapshot.json, context/experiences.json, and context/output-schema.json. Then write result.json now. Do not read a directory or any other path.",
      ],
      cwd: workspace,
      environment,
      timeoutMs: this.config.timeoutMs,
      terminationGraceMs: this.config.terminationGraceMs,
      stderrLimitBytes: this.config.stderrLimitBytes,
      maximumEvents: this.config.maximumEvents,
      maximumEventLineBytes: this.config.maximumEventLineBytes,
    });
    if (
      processResult.exitCode !== 0 ||
      processResult.timedOut ||
      processResult.terminationFailed ||
      processResult.spawnError !== undefined ||
      (await createFileManifest(this.config.configDirectory)).manifestDigest !==
        runtimeConfig.manifestDigest
    ) {
      throw failure("Pi Memory Consolidator failed or changed shared configuration");
    }
    await requireReadAudit(auditPath);
    let output: MemoryConsolidatorOutput;
    try {
      output = await readConsolidatorOutput(resultPath);
    } catch {
      throw failure("Pi Memory Consolidator output is invalid");
    }
    await writeJsonEvidenceExclusive(workspace, "consolidator-metadata.json", {
      schema_version: 1,
      backend: "pi",
      provider: this.config.provider,
      model: this.config.model,
      pi_version: normalizedVersion,
      prompt_digest: MEMORY_CONSOLIDATOR_PROMPT_DIGEST,
      request_digest: sha256Jcs({
        snapshot: request.snapshot,
        experiences: request.experiences,
      }),
      policy_digest: sha256Bytes(policyBytes),
      config_digest: semanticConfig.manifestDigest,
      input_manifest_digest: inputManifest.manifestDigest,
      duration_ms: processResult.durationMs,
    });
    return output;
  }
}
