import { appendFileSync, writeFileSync } from "node:fs";
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

export default function rtlMemorySelectorPolicy(pi) {
  if (process.env.RTL_AGENT_PI_MEMORY_SELECTOR_POLICY_REQUIRED !== "1") return;
  const workspaceRoot = process.env.RTL_AGENT_PI_WORKSPACE_ROOT;
  if (workspaceRoot === undefined || !path.isAbsolute(workspaceRoot)) {
    throw new Error("RTL_AGENT_PI_WORKSPACE_ROOT must be an absolute path");
  }
  const auditPath = process.env.RTL_AGENT_PI_MEMORY_SELECTOR_READ_AUDIT;
  if (
    auditPath === undefined ||
    !path.isAbsolute(auditPath) ||
    normalizedRelativePath(workspaceRoot, auditPath) !== "context/read-audit.jsonl"
  ) {
    throw new Error("RTL_AGENT_PI_MEMORY_SELECTOR_READ_AUDIT must bind the audit file");
  }
  writeFileSync(auditPath, "", { encoding: "utf8", flag: "wx" });
  pi.on("tool_call", async (event) => {
    if (!["read", "write"].includes(event.toolName)) {
      return { block: true, reason: "Tool is outside the locked Memory Selector allowlist" };
    }
    const input =
      typeof event.input === "object" && event.input !== null && !Array.isArray(event.input)
        ? event.input
        : {};
    const logicalPath = normalizedRelativePath(workspaceRoot, input.path);
    const allowedReadPaths = new Set([
      "spec.md",
      "context/selection-input.json",
      "context/functional-feedback.txt",
    ]);
    const allowed =
      logicalPath !== undefined &&
      (event.toolName === "read"
        ? allowedReadPaths.has(logicalPath)
        : logicalPath === "selection.json");
    if (allowed && event.toolName === "read") {
      appendFileSync(auditPath, `${JSON.stringify({ path: logicalPath })}\n`, "utf8");
    }
    return allowed
      ? undefined
      : { block: true, reason: "Path is outside the locked Memory Selector workspace policy" };
  });
}
