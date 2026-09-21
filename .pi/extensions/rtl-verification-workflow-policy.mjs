import { lstatSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { TextDecoder } from "node:util";
import rtlCoreLoopPolicy from "./rtl-core-loop-policy.mjs";

function boundedContext(workspace, name, maximumBytes) {
  const root = realpathSync(workspace);
  const file = path.join(root, "context", name);
  if (realpathSync(file) !== file) throw new Error("WORKFLOW_REDIRECTED_CONTEXT");
  const stat = lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maximumBytes) {
    throw new Error("WORKFLOW_INVALID_CONTEXT");
  }
  const content = readFileSync(file);
  if (content.length !== stat.size) throw new Error("WORKFLOW_CONTEXT_CHANGED");
  return new TextDecoder("utf-8", { fatal: true }).decode(content);
}

/** Adds shared task context without broadening the frozen read/write/edit tool policy. */
export default function verificationWorkflowPolicy(pi) {
  if (process.env.RTL_AGENT_PI_POLICY_REQUIRED !== "1") return;
  const workspace = process.env.RTL_AGENT_PI_WORKSPACE_ROOT;
  if (typeof workspace !== "string" || !path.isAbsolute(workspace)) {
    throw new Error("WORKFLOW_WORKSPACE_REQUIRED");
  }
  const workflow = boundedContext(workspace, "verification-workflow.md", 32_000);
  if (!workflow.startsWith("# Verification work-item workflow\n")) {
    throw new Error("WORKFLOW_HEADER_REQUIRED");
  }
  const state = boundedContext(workspace, "work-state.json", 128_000);
  const parsed = JSON.parse(state);
  if (parsed?.schemaVersion !== 1 || typeof parsed.runId !== "string") {
    throw new Error("WORKFLOW_STATE_REQUIRED");
  }
  rtlCoreLoopPolicy(pi);
  // Pi 0.81.1 collects the messages returned by all before_agent_start handlers.
  // The existing relevant-memory handler therefore remains present for G/M.
  pi.on("before_agent_start", () => ({
    message: {
      customType: "rtl-verification-workflow",
      content: `${workflow}\n\nHarness-owned current work state:\n${state}`,
      display: false,
    },
  }));
}
