import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  CompileRequestSchema,
  FIXED_ICARUS_PROFILE_ID,
  RunIdSchema,
  createBaselineWorkspaceManifest,
} from "../src/index.js";
import type { CompileRequest, CompileWorkspace } from "../src/index.js";

export interface CompilerTestWorkspace {
  readonly root: string;
  readonly workspace: CompileWorkspace;
  request(topModule?: string): Promise<CompileRequest>;
  cleanup(): Promise<void>;
}

export async function createCompilerTestWorkspace(
  sources: Readonly<Record<string, string>>,
): Promise<CompilerTestWorkspace> {
  const root = await mkdtemp(path.join(os.tmpdir(), "rtl-agent-iverilog-test-"));
  const runId = RunIdSchema.parse("run_123e4567-e89b-42d3-a456-426614174000");
  const runDirectory = path.join(root, runId);
  const workspaceDirectory = path.join(runDirectory, "workspace");
  await mkdir(path.join(workspaceDirectory, "rtl"), { recursive: true });
  await writeFile(path.join(workspaceDirectory, "spec.md"), "Synthetic mechanics input\n");
  for (const [logicalPath, contents] of Object.entries(sources)) {
    const hostPath = path.join(workspaceDirectory, ...logicalPath.split("/"));
    await mkdir(path.dirname(hostPath), { recursive: true });
    await writeFile(hostPath, contents);
  }
  const workspace = { runId, runDirectory, workspaceDirectory };
  return {
    root,
    workspace,
    async request(topModule = "dut") {
      const manifest = await createBaselineWorkspaceManifest(runDirectory);
      return CompileRequestSchema.parse({
        schemaVersion: 1,
        runId,
        attempt: 1,
        compilerProfileId: FIXED_ICARUS_PROFILE_ID,
        topModule,
        workspaceRtlRoot: "rtl",
        sourceFiles: Object.keys(sources)
          .filter((source) => /\.(?:sv|v)$/.test(source))
          .sort(),
        workspaceManifestDigest: manifest.manifestDigest,
      });
    },
    async cleanup() {
      await rm(root, { recursive: true, force: true });
    },
  };
}
