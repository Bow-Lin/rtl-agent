import { CoreLoopErrorSchema, CoreLoopException } from "@rtl-agent/core-loop";
import type { CoreLoopError } from "@rtl-agent/core-loop";

export function parsedCoreLoopError(error: unknown): CoreLoopError | undefined {
  if (error instanceof CoreLoopException) return error.error;
  if (typeof error !== "object" || error === null || !("error" in error)) return undefined;
  const parsed = CoreLoopErrorSchema.safeParse((error as { readonly error: unknown }).error);
  return parsed.success ? parsed.data : undefined;
}

export async function executeCliCommand(
  command: () => Promise<number>,
  writeError: (line: string) => void,
): Promise<number> {
  try {
    return await command();
  } catch (error) {
    const safeError =
      error instanceof CoreLoopException
        ? error.error
        : new CoreLoopException("INTERNAL_ERROR", "An internal error occurred").error;
    writeError(JSON.stringify({ ok: false, error: safeError }));
    return 2;
  }
}
