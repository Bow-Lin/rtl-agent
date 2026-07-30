import path from "node:path";
import process from "node:process";

function normalizedRelativePath(workspaceRoot, candidate) {
  if (typeof candidate !== "string" || candidate.length === 0 || candidate.includes("\0")) {
    return undefined;
  }
  const resolved = path.resolve(workspaceRoot, candidate);
  const relative = path.relative(workspaceRoot, resolved);
  if (
    relative === "" ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    return undefined;
  }
  return relative.split(path.sep).join("/");
}

function allowedRead(logicalPath) {
  return (
    logicalPath === "spec.md" ||
    logicalPath === "analysis.json" ||
    logicalPath.startsWith("context/") ||
    logicalPath.startsWith("rtl/")
  );
}

export default function rtlMismatchAnalyzerPolicy(pi) {
  if (process.env.RTL_AGENT_PI_MISMATCH_POLICY_REQUIRED !== "1") return;

  const workspaceRoot = process.env.RTL_AGENT_PI_WORKSPACE_ROOT;
  if (workspaceRoot === undefined || !path.isAbsolute(workspaceRoot)) {
    throw new Error("RTL_AGENT_PI_WORKSPACE_ROOT must be an absolute path");
  }

  pi.on("tool_call", async (event) => {
    if (!["read", "edit"].includes(event.toolName)) {
      return { block: true, reason: "Tool is outside the locked mismatch analyzer allowlist" };
    }
    const input =
      typeof event.input === "object" && event.input !== null && !Array.isArray(event.input)
        ? event.input
        : {};
    const logicalPath = normalizedRelativePath(workspaceRoot, input.path);
    const allowed =
      logicalPath !== undefined &&
      (event.toolName === "read" ? allowedRead(logicalPath) : logicalPath === "analysis.json");
    if (!allowed) {
      return { block: true, reason: "Path is outside the locked mismatch analyzer policy" };
    }
    return undefined;
  });
}
