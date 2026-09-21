import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { digest, exclusiveJson } from "./verification-memory.ts";

export const GENERIC_GUIDANCE_MIN_CHARACTERS = 50;
export const GENERIC_GUIDANCE_MAX_CHARACTERS = 600;

export const GENERIC_GUIDANCE_SYSTEM = `Generic guidance contract revision 1.1.
Write general RTL verification guidance from general
engineering knowledge only. You have no tools, repository context, source trajectories,
experiment results, experience library or target implementation. Do not invent prior experience.
Return only JSON with exactly one field, guidance, containing concise Chinese prose of
${GENERIC_GUIDANCE_MIN_CHARACTERS} to ${GENERIC_GUIDANCE_MAX_CHARACTERS} Unicode characters after trimming leading and trailing whitespace.
Count punctuation and each Unicode code point as one character. Do not include implementation names, signal names, a prescribed check,
literal cycle counts, fault labels, code or empirical claims. No additional permissions or
stopping policies. This is a generic guidance control, not a source-derived experience.`;

export const GENERIC_GUIDANCE_PROMPT = `The shared task workflow already reads the current
target contract, fixed configuration and testbench/checker, considers both unstimulated behavior
and stimulated-but-unchecked behavior, selects zero to two feasible work items, implements them,
and inspects execution evidence. All conditions have the same budget. The DUT is protected;
only testbench and checker are mutable. Hidden evaluation results are unavailable.
Provide a short supplemental general verification guide. Useful topics include authoritative
expected behavior, legal boundary cases and operation interactions, accepted transactions and
reference-model updates, sampling relative to clocked updates, bounded progress, check execution
and preserving existing checks. Do not repeat the entire shared workflow. Do not prescribe a
specific implementation, strategy or test direction. Return {"guidance":"..."}.`;

export type GenericGuidanceCall = (request: {
  name: string;
  system: string;
  prompt: string;
}) => Promise<string>;

export function parseGenericGuidance(raw: string) {
  const parsed: unknown = JSON.parse(raw);
  assert.ok(parsed && typeof parsed === "object" && !Array.isArray(parsed), "BAD_GUIDE_OBJECT");
  const value = parsed as Record<string, unknown>;
  assert.deepEqual(Object.keys(value), ["guidance"], "BAD_GUIDE_FIELDS");
  assert.ok(typeof value.guidance === "string", "BAD_GUIDE_LENGTH");
  const characters = [...value.guidance.trim()].length;
  assert.ok(
    characters >= GENERIC_GUIDANCE_MIN_CHARACTERS && characters <= GENERIC_GUIDANCE_MAX_CHARACTERS,
    "BAD_GUIDE_LENGTH",
  );
  assert.ok(!/dpretet|M\d{3}|axis_fifo|consol-/i.test(value.guidance), "OUT_OF_SCOPE_GUIDE");
  return value.guidance;
}

/** A fresh no-tool author call; never receives source material or a previous model response. */
export async function buildGenericGuidance(output: string, call: GenericGuidanceCall) {
  await mkdir(output);
  const request = {
    name: "generic-guidance",
    system: GENERIC_GUIDANCE_SYSTEM,
    prompt: GENERIC_GUIDANCE_PROMPT,
  };
  await exclusiveJson(path.join(output, "request.json"), request);
  try {
    const raw = await call(request);
    await exclusiveJson(path.join(output, "raw-response.json"), { text: raw });
    const guidance = parseGenericGuidance(raw);
    const artifact = {
      schemaVersion: 1,
      condition: "G",
      provenance: "fresh-no-tool-author-session-without-source-or-target-input",
      requestDigest: `sha256:${digest(JSON.stringify(request))}`,
      responseDigest: `sha256:${digest(raw)}`,
      guidanceDigest: `sha256:${digest(guidance)}`,
      guidance,
      sourceEvidenceIncluded: false,
      tools: [],
      modelCalls: 1,
      retries: 0,
      semanticReview: "PENDING",
    };
    await exclusiveJson(path.join(output, "candidate.json"), artifact);
    return artifact;
  } catch {
    await exclusiveJson(path.join(output, "failure.json"), {
      status: "FAILED_NOT_FROZEN",
      retry: false,
    });
    throw new Error("GENERIC_GUIDANCE_FAILED_SEE_AUDIT");
  }
}
