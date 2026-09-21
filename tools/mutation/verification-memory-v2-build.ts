import assert from "node:assert/strict";
import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { collectBundle, digest, exclusiveJson, safeRead } from "./verification-memory.ts";
import type { Bundle } from "./verification-memory.ts";
import { SOURCE_RUNS, sourceRun } from "./verification-source-input.ts";
import { parseV2Extraction, v2ExtractionRequest } from "./verification-memory-v2.ts";
import type { ExperienceV2 } from "./verification-memory-v2.ts";

export const V2_SOURCES = Object.keys(SOURCE_RUNS);
export const V2_CALL_BUDGET = {
  maximumCalls: 4,
  perSource: 1,
  timeoutMs: 900000,
  retries: 0,
  consolidationCalls: 0,
} as const;
export const K3_NO_TOOL_CONFIG = {
  provider: "kimi-coding",
  model: "k3",
  sdk: "pi-0.81.1",
  tools: [],
  contextFiles: false,
  thinkingLevel: "high",
  timeoutMs: 900000,
  sessionRetries: 0,
  providerRetries: 0,
  autoCompaction: false,
} as const;
const originalCounts = [18, 35, 20, 30];
const runtimePaths = [
  "tools/mutation/verification-memory-v2.ts",
  "tools/mutation/verification-memory-v2-build.ts",
  "tools/mutation/verification-memory-v2-run.ts",
  "tools/mutation/verification-memory.ts",
  "tools/mutation/verification-source-input.ts",
  ".rtl-agent/tools/pi-0.81.1/node_modules/@earendil-works/pi-coding-agent/package.json",
  ".rtl-agent/tools/pi-0.81.1/node_modules/@earendil-works/pi-coding-agent/dist/core/sdk.js",
  ".rtl-agent/tools/pi-0.81.1/node_modules/@earendil-works/pi-coding-agent/dist/core/agent-session.js",
  ".rtl-agent/tools/pi-0.81.1/node_modules/@earendil-works/pi-coding-agent/dist/core/settings-manager.js",
];
export type PreparedCall = { source: string; bundle: Bundle; system: string; prompt: string };
export type V2Preparation = {
  schemaVersion: 2;
  status: "PREPARED_NO_MODEL_CALLS";
  budget: typeof V2_CALL_BUDGET;
  provider: "kimi-coding";
  model: "k3";
  sourceRecordCounts: { original: 103; supplementalSpecifications: 4; total: 107 };
  runtimeHashes: { path: string; sha256: string }[];
  calls: PreparedCall[];
};
export type V2Caller = (request: PreparedCall, callDirectory: string) => Promise<string>;
export type Candidate = { source: string; itemDigest: string; item: ExperienceV2 };
type EvidenceDigest = { path: string; sha256: string };
type Candidates = {
  schemaVersion: 2;
  reviewStatus: "PENDING_SEMANTIC_REVIEW";
  preparationDigest: string;
  candidates: Candidate[];
  callEvidence: EvidenceDigest[];
};

/** Bind actual provider evidence to the prepared input and the exact retained text. */
async function auditCall(out: string, call: PreparedCall): Promise<EvidenceDigest[]> {
  const prefix = `extract-${call.source}`;
  const names = [
    "input.json",
    "model-config.json",
    "provider-request-1.json",
    "provider-response-1.json",
    "provider-transcript.json",
    "response.txt",
    "structural-validation.json",
  ];
  const bytes = new Map<string, Buffer>();
  const files = [];
  for (const name of names) {
    const logical = `${prefix}/${name}`;
    const data = await safeRead(out, logical);
    bytes.set(name, data);
    files.push({ path: logical, sha256: digest(data) });
  }
  const json = (name: string) => JSON.parse(bytes.get(name)!.toString());
  assert.deepEqual(
    json("input.json"),
    { system: call.system, prompt: call.prompt },
    "CALL_INPUT_MISMATCH",
  );
  assert.deepEqual(json("model-config.json"), K3_NO_TOOL_CONFIG, "CALL_CONFIG_MISMATCH");
  const transcript = json("provider-transcript.json");
  assert.equal(transcript.complete, true, "INCOMPLETE_CALL_AUDIT");
  assert.equal(transcript.timedOut, false, "CALL_TIMED_OUT");
  assert.equal(transcript.requestAuditFailed, false, "CALL_REQUEST_AUDIT_FAILED");
  assert.equal(transcript.requests.length, 1, "EXACTLY_ONE_REQUEST_REQUIRED");
  assert.equal(transcript.responses.length, 1, "EXACTLY_ONE_RESPONSE_REQUIRED");
  const request = json("provider-request-1.json");
  const response = json("provider-response-1.json");
  assert.deepEqual(transcript.requests[0], request, "RAW_REQUEST_MISMATCH");
  assert.deepEqual(transcript.responses[0], response, "RAW_RESPONSE_MISMATCH");
  assert.ok(!request.tools || request.tools.length === 0, "PROVIDER_TOOLS_FORBIDDEN");
  const requestText = JSON.stringify(request);
  for (const content of [call.system, call.prompt])
    assert.ok(
      requestText.includes(JSON.stringify(content).slice(1, -1)),
      "PREPARED_CONTENT_NOT_EXPOSED",
    );
  assert.equal(response.provider, "kimi-coding");
  assert.equal(response.model, "k3");
  assert.equal(response.stopReason, "stop", "INCOMPLETE_PROVIDER_RESPONSE");
  const blocks = response.content as { type: string; text?: string }[];
  assert.ok(
    blocks.every((block) => block.type !== "toolCall"),
    "TOOLS_FORBIDDEN",
  );
  const raw = bytes.get("response.txt")!.toString();
  assert.equal(
    raw,
    blocks
      .filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("\n"),
    "RETAINED_TEXT_NOT_PROVIDER_OUTPUT",
  );
  assert.deepEqual(
    json("structural-validation.json"),
    { valid: true, semanticReview: "pending", items: parseV2Extraction(raw, call.bundle) },
    "STRUCTURAL_AUDIT_MISMATCH",
  );
  return files;
}

/** Preserve the original projection, then add only this run's original specification. */
export async function collectV2Bundle(repo: string, source: string): Promise<Bundle> {
  const bundle = await collectBundle(repo, source);
  const index = V2_SOURCES.indexOf(source);
  assert.equal(
    bundle.evidence.length,
    originalCounts[index],
    "ORIGINAL_SOURCE_RECORD_COUNT_CHANGED",
  );
  const logical = `.rtl-agent/project-coverage-runs/${sourceRun(source)}/workspace/spec.md`;
  const bytes = await safeRead(await realpath(repo), logical);
  return {
    source,
    evidence: [
      ...bundle.evidence,
      {
        id: `${source}:spec`,
        path: logical,
        sha256: digest(bytes),
        kind: "source-specification",
        data: bytes.toString("utf8"),
      },
    ],
  };
}

/** Read-only payload preview; never reads credentials or v1 Memory summaries. */
export async function prepareV2Build(repo: string): Promise<V2Preparation> {
  const root = await realpath(repo);
  const calls: PreparedCall[] = [];
  for (const source of V2_SOURCES) {
    const bundle = await collectV2Bundle(root, source);
    calls.push({ source, bundle, ...v2ExtractionRequest(bundle) });
  }
  const runtimeHashes = [];
  for (const logical of runtimePaths)
    runtimeHashes.push({ path: logical, sha256: digest(await safeRead(root, logical)) });
  return {
    schemaVersion: 2,
    status: "PREPARED_NO_MODEL_CALLS",
    budget: V2_CALL_BUDGET,
    provider: "kimi-coding",
    model: "k3",
    sourceRecordCounts: { original: 103, supplementalSpecifications: 4, total: 107 },
    runtimeHashes,
    calls,
  };
}

export function v2Output(repo: string, label: string) {
  assert.match(label, /^[a-z0-9][a-z0-9-]{0,80}$/, "BAD_BUILD_LABEL");
  return path.join(repo, ".rtl-agent", "verification-memory-v2", label);
}
export async function writeV2Preparation(repo: string, label: string) {
  const preparation = await prepareV2Build(repo);
  const out = v2Output(repo, label);
  await mkdir(path.dirname(out), { recursive: true });
  await mkdir(out); // Never reuse a build or overwrite earlier evidence.
  await exclusiveJson(path.join(out, "preparation.json"), preparation);
  return { out, preparation };
}

function validateCalls(preparation: V2Preparation) {
  assert.equal(preparation.schemaVersion, 2);
  assert.equal(preparation.status, "PREPARED_NO_MODEL_CALLS");
  assert.equal(preparation.provider, "kimi-coding");
  assert.equal(preparation.model, "k3");
  assert.deepEqual(preparation.budget, V2_CALL_BUDGET);
  assert.deepEqual(
    preparation.calls.map((call) => call.source),
    V2_SOURCES,
  );
  for (const call of preparation.calls) {
    assert.equal(call.source, call.bundle.source);
    assert.deepEqual(
      { system: call.system, prompt: call.prompt },
      v2ExtractionRequest(call.bundle),
      "PREPARED_PROMPT_CHANGED",
    );
  }
}

/** Injected caller permits local tests; the CLI verifies fresh source/runtime bytes before this. */
export async function extractV2Candidates(out: string, call: V2Caller) {
  const preparationBytes = await readFile(path.join(out, "preparation.json"));
  const preparation = JSON.parse(preparationBytes.toString()) as V2Preparation;
  validateCalls(preparation);
  const preparationDigest = digest(preparationBytes);
  await exclusiveJson(path.join(out, "run-started.json"), {
    preparationDigest,
    startedAt: new Date().toISOString(),
    budget: V2_CALL_BUDGET,
  });
  const candidates: Candidate[] = [];
  const callEvidence: EvidenceDigest[] = [];
  const completed: string[] = [];
  let activeSource: string | null = null;
  let stage = "initialization";
  try {
    for (const request of preparation.calls) {
      activeSource = request.source;
      const directory = path.join(out, `extract-${request.source}`);
      await mkdir(directory);
      await exclusiveJson(path.join(directory, "input.json"), {
        system: request.system,
        prompt: request.prompt,
      });
      stage = "provider-call";
      const response = await call(request, directory); // Exactly one call; no retry/repair/consolidation.
      stage = "retain-response";
      await writeFile(path.join(directory, "response.txt"), response, { flag: "wx" });
      stage = "structural-and-reference-validation";
      const items = parseV2Extraction(response, request.bundle);
      await exclusiveJson(path.join(directory, "structural-validation.json"), {
        valid: true,
        semanticReview: "pending",
        items,
      });
      stage = "actual-provider-evidence-seal";
      callEvidence.push(...(await auditCall(out, request)));
      for (const item of items)
        candidates.push({ source: request.source, itemDigest: digest(JSON.stringify(item)), item });
      completed.push(request.source);
    }
    const result: Candidates = {
      schemaVersion: 2,
      reviewStatus: "PENDING_SEMANTIC_REVIEW",
      preparationDigest,
      candidates,
      callEvidence,
    };
    await exclusiveJson(path.join(out, "candidates.json"), result);
    await exclusiveJson(path.join(out, "review-required.json"), {
      preparationDigest,
      candidatesDigest: digest(await readFile(path.join(out, "candidates.json"))),
      status: "PENDING_ITEM_BY_ITEM_REVIEW",
      entries: candidates.map(({ source, itemDigest, item }) => ({
        source,
        id: item.id,
        itemDigest,
        decision: "pending",
      })),
      required: [
        "source support with precise evidence locators",
        "history versus current policy",
        "target contamination",
        "limitations and unverified claims",
      ],
      note: "Structural checks and bounded text filters do not establish semantic correctness. No catalog is published.",
    });
    return result;
  } catch {
    await exclusiveJson(path.join(out, "failure.json"), {
      status: "FAILED_NOT_PUBLISHED",
      failedAt: new Date().toISOString(),
      completed,
      failedSource: activeSource,
      stage,
      remaining: V2_SOURCES.filter(
        (source) => source !== activeSource && !completed.includes(source),
      ),
      reason:
        "Inspect retained request/response/provider evidence; no automatic retry or replacement.",
    });
    throw new Error("V2_EXTRACTION_FAILED_NO_RETRY");
  }
}

export type ReviewCheck = { verdict: "pass" | "fail"; explanation: string };
export type SemanticReview = {
  schemaVersion: 1;
  preparationDigest: string;
  candidatesDigest: string;
  reviewer: string;
  reviewedAt: string;
  scope: "source-only-semantic-review";
  entries: {
    source: string;
    id: string;
    itemDigest: string;
    decision: "accept" | "reject";
    sourceSupport: ReviewCheck;
    policySeparation: ReviewCheck;
    targetContamination: ReviewCheck;
    limitations: ReviewCheck;
    evidence: { evidenceId: string; locator: string; assessment: string }[];
  }[];
};
function prose(value: unknown) {
  assert.ok(typeof value === "string" && value.trim(), "MISSING_REVIEW_EXPLANATION");
}

/** The review is an explicit external judgment, not generated by this extraction tool. */
export function validateV2Review(
  candidates: Candidates,
  candidatesDigest: string,
  review: SemanticReview,
) {
  assert.equal(review.schemaVersion, 1);
  assert.equal(
    review.preparationDigest,
    candidates.preparationDigest,
    "REVIEW_PREPARATION_MISMATCH",
  );
  assert.equal(review.candidatesDigest, candidatesDigest, "STALE_CANDIDATE_REVIEW");
  assert.equal(review.scope, "source-only-semantic-review");
  prose(review.reviewer);
  assert.ok(Number.isFinite(Date.parse(review.reviewedAt)), "MISSING_REVIEW_DATE");
  assert.equal(review.entries.length, candidates.candidates.length, "REVIEW_EVERY_CANDIDATE");
  const seen = new Set<string>();
  for (const entry of review.entries) {
    const key = `${entry.source}:${entry.id}`;
    assert.ok(!seen.has(key), "DUPLICATE_REVIEW");
    seen.add(key);
    const candidate = candidates.candidates.find(
      ({ source, item }) => source === entry.source && item.id === entry.id,
    );
    assert.ok(candidate, "UNKNOWN_REVIEW_ITEM");
    assert.equal(entry.itemDigest, candidate.itemDigest, "STALE_ITEM_REVIEW");
    assert.ok(
      entry.decision === "accept" || entry.decision === "reject",
      "SEMANTIC_REVIEW_REQUIRED",
    );
    for (const check of [
      entry.sourceSupport,
      entry.policySeparation,
      entry.targetContamination,
      entry.limitations,
    ]) {
      assert.ok(check && ["pass", "fail"].includes(check.verdict), "SEMANTIC_REVIEW_REQUIRED");
      prose(check.explanation);
      if (entry.decision === "accept")
        assert.equal(check.verdict, "pass", "ACCEPTED_FAILED_REVIEW");
    }
    assert.ok(entry.evidence.length > 0, "REVIEW_EVIDENCE_REQUIRED");
    for (const ref of entry.evidence) {
      assert.ok(
        candidate.item.evidenceIds.includes(ref.evidenceId),
        "REVIEW_REFERENCE_OUTSIDE_ITEM",
      );
      prose(ref.locator);
      prose(ref.assessment);
    }
  }
  return candidates.candidates.filter((candidate) =>
    review.entries.some(
      (entry) =>
        entry.source === candidate.source &&
        entry.id === candidate.item.id &&
        entry.decision === "accept",
    ),
  );
}

export async function publishV2Candidates(out: string, review: SemanticReview) {
  const preparationBytes = await readFile(path.join(out, "preparation.json"));
  const preparation = JSON.parse(preparationBytes.toString()) as V2Preparation;
  validateCalls(preparation);
  const candidateBytes = await readFile(path.join(out, "candidates.json"));
  const candidates = JSON.parse(candidateBytes.toString()) as Candidates;
  assert.equal(candidates.schemaVersion, 2);
  assert.equal(candidates.reviewStatus, "PENDING_SEMANTIC_REVIEW");
  assert.equal(candidates.preparationDigest, digest(preparationBytes));
  const reconstructed: Candidate[] = [];
  const callEvidence: EvidenceDigest[] = [];
  for (const call of preparation.calls) {
    callEvidence.push(...(await auditCall(out, call)));
    const raw = await readFile(path.join(out, `extract-${call.source}`, "response.txt"), "utf8");
    for (const item of parseV2Extraction(raw, call.bundle))
      reconstructed.push({ source: call.source, itemDigest: digest(JSON.stringify(item)), item });
  }
  assert.deepEqual(
    candidates.callEvidence,
    callEvidence,
    "PROVIDER_EVIDENCE_CHANGED_AFTER_EXTRACTION",
  );
  assert.deepEqual(candidates.candidates, reconstructed, "CANDIDATES_CHANGED_AFTER_EXTRACTION");
  const accepted = validateV2Review(candidates, digest(candidateBytes), review);
  const publication = path.join(out, "published");
  await mkdir(publication);
  await exclusiveJson(path.join(publication, "semantic-review.json"), review);
  await exclusiveJson(path.join(publication, "items.json"), {
    schemaVersion: 2,
    reviewStatus: "SEMANTICALLY_REVIEWED",
    items: accepted,
  });
  await exclusiveJson(
    path.join(publication, "exclusions.json"),
    review.entries.filter((entry) => entry.decision === "reject"),
  );
  const files: EvidenceDigest[] = [
    { path: "preparation.json", sha256: digest(preparationBytes) },
    { path: "candidates.json", sha256: digest(candidateBytes) },
    ...callEvidence,
  ];
  for (const name of ["semantic-review.json", "items.json", "exclusions.json"])
    files.push({
      path: `published/${name}`,
      sha256: digest(await readFile(path.join(publication, name))),
    });
  const manifest = {
    schemaVersion: 2,
    status: "SOURCE_CANDIDATE_LIBRARY_REVIEWED",
    sourceOnly: true,
    targetExecutionAuthorized: false,
    preparationDigest: candidates.preparationDigest,
    candidatesDigest: digest(candidateBytes),
    count: accepted.length,
    excluded: review.entries.length - accepted.length,
    files,
    publishedAt: new Date().toISOString(),
  };
  await exclusiveJson(path.join(publication, "manifest.json"), manifest); // Commit marker last.
  return manifest;
}

/** Revalidate a published library before use; every raw call artifact is manifest-bound. */
export async function verifyV2Publication(out: string) {
  const manifest = JSON.parse((await safeRead(out, "published/manifest.json")).toString());
  assert.equal(manifest.schemaVersion, 2);
  assert.equal(manifest.status, "SOURCE_CANDIDATE_LIBRARY_REVIEWED");
  const preparation = JSON.parse(
    (await safeRead(out, "preparation.json")).toString(),
  ) as V2Preparation;
  const expected = [
    "preparation.json",
    "candidates.json",
    ...preparation.calls.flatMap((call) =>
      [
        "input.json",
        "model-config.json",
        "provider-request-1.json",
        "provider-response-1.json",
        "provider-transcript.json",
        "response.txt",
        "structural-validation.json",
      ].map((name) => `extract-${call.source}/${name}`),
    ),
    "published/semantic-review.json",
    "published/items.json",
    "published/exclusions.json",
  ];
  assert.deepEqual(
    manifest.files.map((file: EvidenceDigest) => file.path),
    expected,
    "INCOMPLETE_PUBLISHED_EVIDENCE",
  );
  for (const file of manifest.files as EvidenceDigest[])
    assert.equal(digest(await safeRead(out, file.path)), file.sha256, "PUBLISHED_EVIDENCE_CHANGED");
  return manifest;
}
