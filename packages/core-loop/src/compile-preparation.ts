import path from "node:path";

import { CompileRequestSchema } from "./contracts.js";
import type { CompileRequest } from "./contracts.js";
import { CompilePreparationResultSchema, FIXED_ICARUS_PROFILE_ID } from "./compiler-contracts.js";
import type { CompilePreparationResult } from "./compiler-contracts.js";
import { containsIncludeDirective } from "./include-scanner.js";
import type { CoreLoopRun } from "./materialize.js";
import { createBaselineWorkspaceManifest } from "./manifest.js";
import { scanRegularFiles } from "./filesystem.js";

export type SourcePreparationFailure =
  "NO_RTL_SOURCE" | "UNSUPPORTED_INCLUDE_DIRECTIVE" | "SOURCE_POLICY_VIOLATION";

export class SourcePreparationError extends Error {
  public constructor(public readonly status: SourcePreparationFailure) {
    super(status);
    this.name = "SourcePreparationError";
  }
}

export interface PreparedCompilerSource {
  readonly logicalPath: CompileRequest["sourceFiles"][number];
  readonly hostPath: string;
}

export async function discoverCompilerSources(
  workspaceDirectory: string,
): Promise<readonly PreparedCompilerSource[]> {
  let scanned;
  try {
    scanned = await scanRegularFiles(path.join(workspaceDirectory, "rtl"));
  } catch {
    throw new SourcePreparationError("SOURCE_POLICY_VIOLATION");
  }
  if (scanned.length === 0) throw new SourcePreparationError("NO_RTL_SOURCE");
  if (scanned.some((file) => !/\.(?:sv|v)$/.test(file.logicalPath))) {
    throw new SourcePreparationError("SOURCE_POLICY_VIOLATION");
  }
  const sources = scanned.map((file) => ({
    logicalPath: `rtl/${file.logicalPath}` as CompileRequest["sourceFiles"][number],
    hostPath: file.hostPath,
  }));
  for (const source of sources) {
    if (await containsIncludeDirective(source.hostPath)) {
      throw new SourcePreparationError("UNSUPPORTED_INCLUDE_DIRECTIVE");
    }
  }
  return sources;
}

const messages: Record<SourcePreparationFailure, string> = {
  NO_RTL_SOURCE: "No .sv or .v source files were found below rtl/",
  UNSUPPORTED_INCLUDE_DIRECTIVE: "Core Loop compiler profile v1 forbids `include directives",
  SOURCE_POLICY_VIOLATION: "RTL source files do not satisfy the fixed compiler source policy",
};

export async function prepareCompileRequest(
  run: CoreLoopRun,
  attempt: number,
): Promise<CompilePreparationResult> {
  const common = {
    schemaVersion: 1,
    runId: run.runId,
    attempt,
    compilerProfileId: FIXED_ICARUS_PROFILE_ID,
    compilerInvoked: false,
  } as const;
  if (run.request.profile.compilerProfileId !== FIXED_ICARUS_PROFILE_ID) {
    return CompilePreparationResultSchema.parse({
      ...common,
      status: "SOURCE_POLICY_VIOLATION",
      message: "Run request does not select the repository-owned compiler profile",
    });
  }
  try {
    const sources = await discoverCompilerSources(run.workspaceDirectory);
    const firstManifest = await createBaselineWorkspaceManifest(run.runDirectory);
    const secondManifest = await createBaselineWorkspaceManifest(run.runDirectory);
    if (firstManifest.manifestDigest !== secondManifest.manifestDigest) {
      throw new SourcePreparationError("SOURCE_POLICY_VIOLATION");
    }
    const request = CompileRequestSchema.parse({
      schemaVersion: 1,
      runId: run.runId,
      attempt,
      compilerProfileId: FIXED_ICARUS_PROFILE_ID,
      topModule: run.fixture.topModule,
      workspaceRtlRoot: "rtl",
      sourceFiles: sources.map((source) => source.logicalPath),
      workspaceManifestDigest: secondManifest.manifestDigest,
    });
    return CompilePreparationResultSchema.parse({ ...common, status: "READY", request });
  } catch (error) {
    const status =
      error instanceof SourcePreparationError ? error.status : "SOURCE_POLICY_VIOLATION";
    return CompilePreparationResultSchema.parse({
      ...common,
      status,
      message: messages[status],
    });
  }
}
