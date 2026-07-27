import { Buffer } from "node:buffer";
import { appendFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const RTL_EXTENSIONS = new Set([".sv", ".svh", ".v", ".vh"]);

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
    logicalPath.startsWith("context/") ||
    logicalPath.startsWith("rtl/")
  );
}

function allowedWrite(logicalPath) {
  return (
    logicalPath.startsWith("rtl/") &&
    RTL_EXTENSIONS.has(path.posix.extname(logicalPath).toLowerCase())
  );
}

function requiredPositiveIntegerEnvironment(name) {
  const value = Number(process.env[name]);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

export default function rtlCoreLoopPolicy(pi) {
  if (process.env.RTL_AGENT_PI_POLICY_REQUIRED !== "1") {
    return;
  }
  const workspaceRoot = process.env.RTL_AGENT_PI_WORKSPACE_ROOT;
  if (workspaceRoot === undefined || !path.isAbsolute(workspaceRoot)) {
    throw new Error("RTL_AGENT_PI_WORKSPACE_ROOT must be an absolute path");
  }
  const providerTranscriptPath = process.env.RTL_AGENT_PI_PROVIDER_TRANSCRIPT_PATH;
  if (providerTranscriptPath === undefined || !path.isAbsolute(providerTranscriptPath)) {
    throw new Error("RTL_AGENT_PI_PROVIDER_TRANSCRIPT_PATH must be an absolute path");
  }
  const maximumProviderRequests = requiredPositiveIntegerEnvironment(
    "RTL_AGENT_PI_PROVIDER_CAPTURE_MAX_REQUESTS",
  );
  const maximumProviderCaptureBytes = requiredPositiveIntegerEnvironment(
    "RTL_AGENT_PI_PROVIDER_CAPTURE_MAX_BYTES",
  );
  writeFileSync(providerTranscriptPath, "", { encoding: "utf8", flag: "wx", mode: 0o600 });
  let providerRequestSequence = 0;
  let lastProviderResponseSequence = 0;
  let providerCaptureBytes = 0;

  function appendProviderTranscriptEntry(entry, limitDescription) {
    const serialized = JSON.stringify(entry);
    if (serialized === undefined) {
      throw new Error(`Pi provider ${limitDescription} is not JSON serializable`);
    }
    const line = `${serialized}\n`;
    const nextByteLength = Buffer.byteLength(line, "utf8");
    if (providerCaptureBytes + nextByteLength > maximumProviderCaptureBytes) {
      throw new Error("Pi provider transcript byte limit exceeded");
    }
    appendFileSync(providerTranscriptPath, line, "utf8");
    providerCaptureBytes += nextByteLength;
  }

  pi.on("before_provider_request", (event) => {
    const nextSequence = providerRequestSequence + 1;
    if (nextSequence > maximumProviderRequests) {
      throw new Error("Pi provider request capture count limit exceeded");
    }
    appendProviderTranscriptEntry(
      { kind: "request", sequence: nextSequence, payload: event.payload },
      "request payload",
    );
    providerRequestSequence = nextSequence;
    return undefined;
  });

  pi.on("message_end", (event) => {
    if (event.message?.role !== "assistant") return undefined;
    const responseSequence = providerRequestSequence;
    if (responseSequence <= lastProviderResponseSequence) {
      throw new Error("Pi provider response has no matching request");
    }
    appendProviderTranscriptEntry(
      { kind: "response", sequence: responseSequence, message: event.message },
      "response message",
    );
    lastProviderResponseSequence = responseSequence;
    return undefined;
  });

  pi.on("tool_call", async (event) => {
    if (!["read", "write", "edit"].includes(event.toolName)) {
      return { block: true, reason: "Tool is outside the locked RTL Agent allowlist" };
    }
    const input =
      typeof event.input === "object" && event.input !== null && !Array.isArray(event.input)
        ? event.input
        : {};
    const logicalPath = normalizedRelativePath(workspaceRoot, input.path);
    const allowed =
      logicalPath !== undefined &&
      (event.toolName === "read" ? allowedRead(logicalPath) : allowedWrite(logicalPath));
    if (!allowed) {
      return { block: true, reason: "Path is outside the locked RTL Agent workspace policy" };
    }
    return undefined;
  });
}
