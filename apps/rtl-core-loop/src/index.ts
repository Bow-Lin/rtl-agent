#!/usr/bin/env node

import { fileURLToPath } from "node:url";

import {
  CoreLoopException,
  DatasetDescriptorSchema,
  requireFixtureProvider,
} from "@rtl-agent/core-loop";
import type * as CoreLoop from "@rtl-agent/core-loop";
import type { FixtureProvider } from "@rtl-agent/core-loop";

export type RtlCoreLoopWorkspaceDependency = typeof CoreLoop.packageVersion;

export async function runRtlCoreLoopCli(
  arguments_: readonly string[],
  provider: FixtureProvider | undefined,
  writeOutput: (line: string) => void = console.log,
  writeError: (line: string) => void = console.error,
): Promise<number> {
  if (arguments_.length === 1 && arguments_[0] === "fixtures-check") {
    try {
      const configured = requireFixtureProvider(provider);
      const descriptor = DatasetDescriptorSchema.parse(await configured.describe());
      writeOutput(JSON.stringify({ ok: true, descriptor }));
      return 0;
    } catch (error) {
      const safeError =
        error instanceof CoreLoopException
          ? error.error
          : new CoreLoopException("INTERNAL_ERROR", "An internal error occurred").error;
      writeError(JSON.stringify({ ok: false, error: safeError }));
      return 2;
    }
  }
  writeError("Usage: rtl-core-loop fixtures-check");
  return 2;
}

export const packageVersion = "0.0.0" as const;

const invokedPath = process.argv[1];
if (invokedPath !== undefined && fileURLToPath(import.meta.url) === invokedPath) {
  process.exitCode = await runRtlCoreLoopCli(process.argv.slice(2), undefined);
}
