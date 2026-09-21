import assert from "node:assert/strict";
import {
  AgentAttemptInputSchema,
  writeJsonEvidenceExclusive,
} from "../../packages/core-loop/dist/index.js";
import type {
  AgentTurnResult,
  CoreLoopRun,
  RtlAgentAdapter,
} from "../../packages/core-loop/dist/index.js";
import { digest, safeRead } from "./verification-memory.ts";

type Failure =
  | "TRANSCRIPT_UNAVAILABLE"
  | "INVALID_TRANSCRIPT"
  | "PROVIDER_IDENTITY_MISMATCH"
  | "MISSING_RESPONSE"
  | "PROVIDER_CONNECTION_ERROR"
  | "PROVIDER_ERROR"
  | "PROVIDER_ABORTED"
  | "INCOMPLETE_RESPONSE"
  | "DELEGATE_FAILED";

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function transcriptFailure(value: unknown, attempt: number): Failure | null {
  const capture = record(value);
  if (capture?.schemaVersion !== 1 || capture.attempt !== attempt) return "INVALID_TRANSCRIPT";
  if (capture.provider !== "kimi-coding" || capture.model !== "k3")
    return "PROVIDER_IDENTITY_MISMATCH";
  if (!Array.isArray(capture.exchanges) || capture.exchanges.length === 0)
    return "MISSING_RESPONSE";
  for (const [index, rawExchange] of capture.exchanges.entries()) {
    const exchange = record(rawExchange);
    if (exchange?.sequence !== index + 1 || record(exchange.request) === undefined)
      return "INVALID_TRANSCRIPT";
    const response = record(exchange.response);
    if (response === undefined) return "MISSING_RESPONSE";
    if (response.provider !== "kimi-coding" || response.model !== "k3")
      return "PROVIDER_IDENTITY_MISMATCH";
    if (response.stopReason === "aborted" || response.aborted === true) return "PROVIDER_ABORTED";
    if (
      response.stopReason === "error" ||
      response.errorMessage != null ||
      response.error != null
    ) {
      // Never publish provider error strings: they can contain URLs, headers or credentials.
      return typeof response.errorMessage === "string" &&
        /connection error|network error|fetch failed|ECONNRESET|ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i.test(
          response.errorMessage,
        )
        ? "PROVIDER_CONNECTION_ERROR"
        : "PROVIDER_ERROR";
    }
    if (response.role !== "assistant" || !Array.isArray(response.content))
      return "INVALID_TRANSCRIPT";
    if (
      !["stop", "toolUse"].includes(String(response.stopReason)) ||
      (index === capture.exchanges.length - 1 && response.stopReason !== "stop")
    )
      return "INCOMPLETE_RESPONSE";
  }
  return null;
}

/** Target-only fail-closed audit; does not retry or alter the delegate's persisted evidence. */
export function withTargetProviderGuard(delegate: RtlAgentAdapter): RtlAgentAdapter {
  return {
    probe: () => delegate.probe(),
    async runTurn(rawInput: unknown, run: CoreLoopRun) {
      const input = AgentAttemptInputSchema.parse(rawInput);
      assert.ok(
        ["dpretet-depth8-width8", "axis-depth8-width8"].includes(
          String(run.fixture.provenance.identity.caseId),
        ),
        "TARGET_ONLY",
      );
      let result: AgentTurnResult | undefined;
      try {
        result = await delegate.runTurn(input, run);
      } catch {
        // Continue to the persisted capture, which may explain failure after successful edits.
      }
      const transcriptPath = `evidence/attempts/${input.attempt}/provider-transcript.json`;
      let transcriptDigest: string | null = null;
      let failure: Failure | null = "TRANSCRIPT_UNAVAILABLE";
      try {
        const bytes = await safeRead(run.runDirectory, transcriptPath);
        transcriptDigest = `sha256:${digest(bytes)}`;
        failure = "INVALID_TRANSCRIPT";
        failure = transcriptFailure(JSON.parse(bytes.toString()) as unknown, input.attempt);
      } catch {
        // Preserve the bounded reason, never the filesystem or JSON parser's source text.
      }
      if (failure === null && result === undefined) failure = "DELEGATE_FAILED";
      if (
        failure === null &&
        (result?.attempt !== input.attempt ||
          result.runId !== input.runId ||
          !("provider" in result) ||
          result.provider !== "kimi-coding" ||
          result.model !== "k3")
      )
        failure = "PROVIDER_IDENTITY_MISMATCH";
      await writeJsonEvidenceExclusive(
        run.runDirectory,
        `evidence/target-provider-${input.attempt}.json`,
        {
          schemaVersion: 1,
          attempt: input.attempt,
          provider: "kimi-coding",
          model: "k3",
          transcriptPath,
          transcriptDigest,
          status: failure === null ? "PASSED" : "FAILED",
          classification: failure ?? "COMPLETE",
          delegateReturned: result !== undefined,
          rtlChanged: result?.rtlChanged ?? null,
        },
      );
      if (failure !== null || result === undefined)
        throw new Error(`TARGET_PROVIDER_FAILED: ${failure ?? "DELEGATE_FAILED"}`);
      return result;
    },
  };
}
