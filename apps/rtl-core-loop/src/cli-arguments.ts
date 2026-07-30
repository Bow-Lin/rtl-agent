import { CoreLoopException } from "@rtl-agent/core-loop";

export function parseNamedOptions(arguments_: readonly string[]): ReadonlyMap<string, string> {
  if (arguments_.length % 2 !== 0) {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      "Core Loop evaluation command arguments are invalid",
    );
  }
  const options = new Map<string, string>();
  for (let index = 0; index < arguments_.length; index += 2) {
    const name = arguments_[index]!;
    const value = arguments_[index + 1]!;
    if (!name.startsWith("--") || value.length === 0 || options.has(name)) {
      throw new CoreLoopException(
        "EVALUATION_PROFILE_INVALID",
        "Core Loop evaluation command arguments are invalid",
      );
    }
    options.set(name, value);
  }
  return options;
}
