import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile, access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { digest, exclusiveJson } from "./verification-memory.ts";
import { sourceRun } from "./verification-source-input.ts";
import { CONTRACT_V2, v2ExtractionRequest } from "./verification-memory-v2.ts";
import {
  extractV2Candidates,
  publishV2Candidates,
  V2_CALL_BUDGET,
  V2_SOURCES,
  validateV2Review,
  verifyV2Publication,
} from "./verification-memory-v2-build.ts";
import type {
  PreparedCall,
  SemanticReview,
  V2Preparation,
} from "./verification-memory-v2-build.ts";
import { K3_NO_TOOL_CONFIG, withBuildLocks } from "./verification-memory-v2-run.ts";

const response = (items: unknown[]) =>
  JSON.stringify({ schemaVersion: 2, reviewStatus: "PENDING_HUMAN_REVIEW", items });
async function auditedResponse(request: PreparedCall, directory: string, text: string) {
  const payload = {
    system: [{ type: "text", text: request.system }],
    messages: [{ role: "user", content: [{ type: "text", text: request.prompt }] }],
    tools: [],
  };
  const reply = {
    provider: "kimi-coding",
    model: "k3",
    stopReason: "stop",
    content: [{ type: "text", text }],
    usage: { input: 1, output: 1 },
  };
  await exclusiveJson(path.join(directory, "model-config.json"), K3_NO_TOOL_CONFIG);
  await exclusiveJson(path.join(directory, "provider-request-1.json"), payload);
  await exclusiveJson(path.join(directory, "provider-response-1.json"), reply);
  await exclusiveJson(path.join(directory, "provider-transcript.json"), {
    complete: true,
    timedOut: false,
    requestAuditFailed: false,
    requests: [payload],
    responses: [reply],
    durationMs: 1,
  });
  return text;
}
const auditedCandidate = (request: PreparedCall, directory: string) =>
  auditedResponse(request, directory, response([item(request.source)]));
function calls(): PreparedCall[] {
  return V2_SOURCES.map((source) => {
    const bundle = {
      source,
      evidence: ["trajectory", "process", "asset-attempt-2"].map((kind, index) => ({
        id: `${source}:${index}`,
        kind,
        path: `.rtl-agent/project-coverage-runs/${sourceRun(source)}/evidence/${index}.json`,
        sha256: "fixture",
        data: {},
      })),
    };
    return { source, bundle, ...v2ExtractionRequest(bundle) };
  });
}
function item(source: string) {
  const value = structuredClone(CONTRACT_V2);
  value.id = "same-local-id"; // Namespaced by source; no spurious cross-source deduplication.
  value.transferableStrategy.evidenceIds = [`${source}:0`];
  value.sourceDiscovery.evidenceIds = [`${source}:0`];
  value.scenario.evidenceIds = [`${source}:2`];
  value.oracle.evidenceIds = [`${source}:2`];
  value.observedSourceEffect.evidenceIds = [`${source}:1`];
  value.evidenceIds = [`${source}:0`, `${source}:1`, `${source}:2`];
  return value;
}
async function fixture() {
  const out = await mkdtemp(path.join(os.tmpdir(), "source-v2-"));
  const preparation: V2Preparation = {
    schemaVersion: 2,
    status: "PREPARED_NO_MODEL_CALLS",
    budget: V2_CALL_BUDGET,
    provider: "kimi-coding",
    model: "k3",
    sourceRecordCounts: { original: 103, supplementalSpecifications: 4, total: 107 },
    runtimeHashes: [],
    calls: calls(),
  };
  await exclusiveJson(path.join(out, "preparation.json"), preparation);
  return out;
}
async function reviewFor(out: string): Promise<SemanticReview> {
  const bytes = await readFile(path.join(out, "candidates.json"));
  const candidates = JSON.parse(bytes.toString()) as Awaited<
    ReturnType<typeof extractV2Candidates>
  >;
  return {
    schemaVersion: 1,
    preparationDigest: candidates.preparationDigest,
    candidatesDigest: digest(bytes),
    reviewer: "synthetic-test-reviewer",
    reviewedAt: "2026-09-19T00:00:00Z",
    scope: "source-only-semantic-review",
    entries: candidates.candidates.map((candidate) => ({
      source: candidate.source,
      id: candidate.item.id,
      itemDigest: candidate.itemDigest,
      decision: "accept",
      sourceSupport: {
        verdict: "pass",
        explanation: "Fixture cites its supplied source trajectory and assets.",
      },
      policySeparation: {
        verdict: "pass",
        explanation: "No transferred permission or stop command in fixture.",
      },
      targetContamination: {
        verdict: "pass",
        explanation: "Only synthetic source evidence is included.",
      },
      limitations: {
        verdict: "pass",
        explanation: "Execution and fault effect remain explicitly unverified.",
      },
      evidence: [
        {
          evidenceId: candidate.item.evidenceIds[0]!,
          locator: "response.content[0]",
          assessment: "Synthetic source support for the test item.",
        },
      ],
    })),
  };
}

test("four source calls are serial, namespaced, once each and remain unpublished pending review", async () => {
  const out = await fixture();
  try {
    const called: string[] = [];
    let active = 0;
    const result = await extractV2Candidates(out, async (request, directory) => {
      assert.equal(++active, 1);
      called.push(request.source);
      await new Promise((resolve) => setImmediate(resolve));
      active--;
      return auditedCandidate(request, directory);
    });
    assert.deepEqual(called, V2_SOURCES);
    assert.equal(result.candidates.length, 4);
    assert.equal(result.reviewStatus, "PENDING_SEMANTIC_REVIEW");
    await assert.rejects(access(path.join(out, "published", "manifest.json")));
    await assert.rejects(
      extractV2Candidates(out, async () => {
        assert.fail("rerun must not call model");
      }),
      /EEXIST/,
    );
    const review = await reviewFor(out);
    const manifest = await publishV2Candidates(out, review);
    assert.equal(manifest.count, 4);
    assert.equal(manifest.targetExecutionAuthorized, false);
    assert.equal(manifest.files.length, 33);
    assert.deepEqual(await verifyV2Publication(out), manifest);
    await assert.rejects(publishV2Candidates(out, review), /EEXIST/);
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});

test("malformed response is retained, later sources are not consumed and no replacement occurs", async () => {
  const out = await fixture();
  try {
    const called: string[] = [];
    await assert.rejects(
      extractV2Candidates(out, async (request, directory) => {
        called.push(request.source);
        return auditedResponse(request, directory, called.length === 2 ? "not-json" : response([]));
      }),
      /V2_EXTRACTION_FAILED_NO_RETRY/,
    );
    assert.deepEqual(called, V2_SOURCES.slice(0, 2));
    assert.equal(await readFile(path.join(out, "extract-eth", "response.txt"), "utf8"), "not-json");
    const failure = JSON.parse(await readFile(path.join(out, "failure.json"), "utf8"));
    assert.equal(failure.failedSource, "eth");
    assert.deepEqual(failure.remaining, ["ufifo", "openhmc"]);
    await assert.rejects(access(path.join(out, "candidates.json")));
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});

test("provider exception keeps audited input and stops without retry or automatic publication", async () => {
  const out = await fixture();
  try {
    let count = 0;
    await assert.rejects(
      extractV2Candidates(out, async (_, directory) => {
        count++;
        await exclusiveJson(path.join(directory, "provider-transcript.json"), {
          requests: ["fixture"],
          responses: [],
          complete: false,
        });
        throw new Error("fixture connection failure");
      }),
      /V2_EXTRACTION_FAILED_NO_RETRY/,
    );
    assert.equal(count, 1);
    await access(path.join(out, "extract-versatile", "input.json"));
    await access(path.join(out, "extract-versatile", "provider-transcript.json"));
    await access(path.join(out, "failure.json"));
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});

test("semantic gate binds every candidate and requires grounded decisions beyond structural validity", async () => {
  const out = await fixture();
  try {
    const candidates = await extractV2Candidates(out, auditedCandidate);
    const review = await reviewFor(out);
    assert.throws(
      () => validateV2Review(candidates, review.candidatesDigest, { ...review, entries: [] }),
      /REVIEW_EVERY_CANDIDATE/,
    );
    const stale = structuredClone(review);
    stale.entries[0]!.itemDigest = "stale";
    assert.throws(
      () => validateV2Review(candidates, review.candidatesDigest, stale),
      /STALE_ITEM_REVIEW/,
    );
    const unsupported = structuredClone(review);
    unsupported.entries[0]!.sourceSupport.verdict = "fail";
    assert.throws(
      () => validateV2Review(candidates, review.candidatesDigest, unsupported),
      /ACCEPTED_FAILED_REVIEW/,
    );
    const noEvidence = structuredClone(review);
    noEvidence.entries[0]!.evidence = [];
    assert.throws(
      () => validateV2Review(candidates, review.candidatesDigest, noEvidence),
      /REVIEW_EVIDENCE_REQUIRED/,
    );
    unsupported.entries[0]!.decision = "reject";
    const manifest = await publishV2Candidates(out, unsupported);
    assert.equal(manifest.count, 3);
    assert.equal(manifest.excluded, 1);
    const exclusions = JSON.parse(
      await readFile(path.join(out, "published", "exclusions.json"), "utf8"),
    );
    assert.equal(exclusions[0].source, "versatile");
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});

test("publication reconstructs items from raw model output, preventing post-hoc rewriting", async () => {
  const out = await fixture();
  try {
    await extractV2Candidates(out, auditedCandidate);
    const review = await reviewFor(out);
    const candidateFile = path.join(out, "candidates.json");
    const candidates = JSON.parse(await readFile(candidateFile, "utf8"));
    candidates.candidates[0].item.title = "edited after extraction";
    await writeFile(candidateFile, JSON.stringify(candidates));
    await assert.rejects(publishV2Candidates(out, review), /CANDIDATES_CHANGED_AFTER_EXTRACTION/);
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});

test("four empty extractions are valid, but publication still needs explicit catalog review identity", async () => {
  const out = await fixture();
  try {
    const candidates = await extractV2Candidates(out, (request, directory) =>
      auditedResponse(request, directory, response([])),
    );
    assert.equal(candidates.candidates.length, 0);
    const review = await reviewFor(out);
    await assert.rejects(
      publishV2Candidates(out, { ...review, reviewer: "" }),
      /MISSING_REVIEW_EXPLANATION/,
    );
    assert.equal((await publishV2Candidates(out, review)).count, 0);
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});

test("changing provider evidence blocks publication and invalidates a previously published manifest", async () => {
  const out = await fixture();
  try {
    await extractV2Candidates(out, auditedCandidate);
    const review = await reviewFor(out);
    const file = path.join(out, "extract-eth", "provider-transcript.json");
    const original = await readFile(file);
    const altered = JSON.parse(original.toString());
    altered.durationMs = 2;
    await writeFile(file, JSON.stringify(altered));
    await assert.rejects(
      publishV2Candidates(out, review),
      /PROVIDER_EVIDENCE_CHANGED_AFTER_EXTRACTION/,
    );
    await assert.rejects(access(path.join(out, "published", "manifest.json")));
    await writeFile(file, original);
    await publishV2Candidates(out, review);
    await writeFile(file, JSON.stringify(altered));
    await assert.rejects(verifyV2Publication(out), /PUBLISHED_EVIDENCE_CHANGED/);
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});

test("structural JSON without a matching complete single no-tool provider audit is not sealable", async () => {
  for (const flaw of ["extra-request", "tools", "wrong-prompt", "raw-mismatch"]) {
    const out = await fixture();
    try {
      let count = 0;
      await assert.rejects(
        extractV2Candidates(out, async (request, directory) => {
          count++;
          const text = await auditedCandidate(request, directory);
          const file = path.join(directory, "provider-transcript.json");
          const transcript = JSON.parse(await readFile(file, "utf8"));
          if (flaw === "extra-request") transcript.requests.push(transcript.requests[0]);
          if (flaw === "tools") transcript.requests[0].tools = [{ name: "read" }];
          if (flaw === "wrong-prompt")
            transcript.requests[0].messages[0].content[0].text = "other prompt";
          if (flaw === "tools" || flaw === "wrong-prompt")
            await writeFile(
              path.join(directory, "provider-request-1.json"),
              JSON.stringify(transcript.requests[0]),
            );
          await writeFile(file, JSON.stringify(transcript));
          return flaw === "raw-mismatch" ? response([]) : text;
        }),
        /V2_EXTRACTION_FAILED_NO_RETRY/,
      );
      assert.equal(count, 1);
      await assert.rejects(access(path.join(out, "candidates.json")));
    } finally {
      await rm(out, { recursive: true, force: true });
    }
  }
});

test("prepared prompt tampering is rejected before any provider call", async () => {
  const out = await fixture();
  try {
    const file = path.join(out, "preparation.json");
    const preparation = JSON.parse(await readFile(file, "utf8"));
    preparation.calls[0].prompt += "injected instruction";
    await writeFile(file, JSON.stringify(preparation));
    await assert.rejects(
      extractV2Candidates(out, async () => {
        assert.fail("must not call model");
      }),
      /PREPARED_PROMPT_CHANGED/,
    );
    await assert.rejects(access(path.join(out, "run-started.json")));
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});

test("shared locks prevent overlapping calls and release on normal action failure", async () => {
  const repo = await mkdtemp(path.join(os.tmpdir(), "source-v2-lock-"));
  try {
    assert.equal(K3_NO_TOOL_CONFIG.sessionRetries, 0);
    assert.equal(K3_NO_TOOL_CONFIG.providerRetries, 0);
    assert.equal(K3_NO_TOOL_CONFIG.autoCompaction, false);
    assert.deepEqual(K3_NO_TOOL_CONFIG.tools, []);
    await assert.rejects(
      withBuildLocks(repo, async () => {
        await assert.rejects(
          withBuildLocks(repo, async () => {
            assert.fail("lock must exclude");
          }),
          /EEXIST/,
        );
        throw new Error("synthetic action failure");
      }),
      /synthetic action failure/,
    );
    assert.equal(await withBuildLocks(repo, async () => "released"), "released");
    await writeFile(path.join(repo, ".rtl-agent", "family-process-active.json"), "{}");
    await assert.rejects(
      withBuildLocks(repo, async () => {
        assert.fail("family marker must exclude");
      }),
      /FAMILY_PROCESS_OR_PAUSE_PRESENT/,
    );
    await assert.rejects(access(path.join(repo, ".rtl-agent", "verification-memory-build.lock")));
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});
