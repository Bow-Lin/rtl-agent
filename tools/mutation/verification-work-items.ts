import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import path from "node:path";

export type WorkCondition = "N" | "G" | "M";
export type CodeReference = {
  snapshot: "baseline" | "current";
  path: string;
  startLine: number;
  endLine: number;
};
export type GroundedDecision = { description: string; refs: CodeReference[] };
export type VerificationWorkItem = {
  id: string;
  gap: GroundedDecision;
  applicability: GroundedDecision;
  authority: GroundedDecision & {
    kind: "specification" | "interface-contract" | "approved-golden" | "unresolved";
  };
  plannedChange: string;
  provenance: { kind: "self" | "generic" | "source"; ids: string[] };
  targetRederivation: string;
  disposition: "proposed" | "implemented" | "withdrawn";
  implementationRefs: CodeReference[];
  executionEvidenceIds: string[];
  withdrawal: GroundedDecision | null;
};
export type WorkItemLedger = {
  schemaVersion: 1;
  runId: string;
  attempt: number;
  analysis: { target: GroundedDecision; baseline: GroundedDecision };
  items: VerificationWorkItem[];
  remaining: GroundedDecision & { direction: "none" | "plausible" };
};
export type WorkSnapshot = {
  runId: string;
  attempt: number;
  digest: string;
  files: Record<string, string>;
};
export type EvidenceArtifact = { path: string; content: string };
/** Harness-only input, never deserialize this shape from an Agent ledger. */
export type RuntimeEvidence = {
  runId: string;
  attempt: number;
  snapshotDigest: string;
  compile: EvidenceArtifact;
  simulation: EvidenceArtifact | null;
  coverage: EvidenceArtifact | null;
  coverageState: { score: number; increment: number | null; uncoveredTargets: number } | null;
};
export type GoldenStatus =
  "passed" | "compile-failed" | "simulation-failed" | "infrastructure-failed";
export type RuntimeObservation = {
  id: string;
  runId: string;
  attempt: number;
  snapshotDigest: string;
  artifactPath: string;
  artifactDigest: string;
  recordLine: number;
  sourcePath: string;
  sourceLine: number;
  count: number;
};
export type WorkItemReviewContext = {
  condition: WorkCondition;
  allowedSourceIds: readonly string[];
  allowedGenericIds: readonly string[];
  baseline: WorkSnapshot;
  current: WorkSnapshot;
  runtimeEvidence: readonly RuntimeEvidence[];
  previousLedger: WorkItemLedger | null;
  approvedGoldenPaths?: readonly string[];
};

export const workDigest = (value: string) => createHash("sha256").update(value).digest("hex");
function object(
  value: unknown,
  keys?: readonly string[],
): asserts value is Record<string, unknown> {
  assert(value !== null && typeof value === "object" && !Array.isArray(value), "EXPECTED_OBJECT");
  if (keys) assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), "UNEXPECTED_FIELDS");
}
function prose(value: unknown): asserts value is string {
  assert(
    typeof value === "string" && value.trim().length > 0 && value.length <= 4096,
    "INVALID_TEXT",
  );
}
function integer(value: unknown, min: number, max: number): asserts value is number {
  assert(
    Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max,
    "INVALID_INTEGER",
  );
}
function logical(value: unknown): asserts value is string {
  prose(value);
  assert(
    !path.posix.isAbsolute(value) &&
      !path.win32.isAbsolute(value) &&
      !value.includes("\\") &&
      !value.includes(":") &&
      // Paths containing control bytes are not filesystem identities.
      // eslint-disable-next-line no-control-regex
      !/[\x00-\x1f]/u.test(value) &&
      value.split("/").every((part) => part !== "" && part !== "." && part !== ".."),
    "INVALID_LOGICAL_PATH",
  );
}
function enumeration(value: unknown, choices: readonly string[]): void {
  assert(typeof value === "string" && choices.includes(value), "INVALID_ENUM");
}
function refs(value: unknown, minimum = 1): void {
  assert(
    Array.isArray(value) && value.length >= minimum && value.length <= 12,
    "INVALID_REFERENCES",
  );
  for (const ref of value) {
    object(ref, ["snapshot", "path", "startLine", "endLine"]);
    enumeration(ref.snapshot, ["baseline", "current"]);
    logical(ref.path);
    integer(ref.startLine, 1, 1_000_000);
    integer(ref.endLine, ref.startLine, ref.startLine + 200);
  }
}
function grounded(
  value: unknown,
  extra: readonly string[] = [],
): asserts value is Record<string, unknown> {
  object(value, ["description", "refs", ...extra]);
  prose(value.description);
  refs(value.refs);
}
function ids(value: unknown, maximum: number): asserts value is string[] {
  assert(Array.isArray(value) && value.length <= maximum, "INVALID_IDS");
  value.forEach(prose);
  assert.equal(new Set(value).size, value.length, "DUPLICATE_ID");
}

export function parseWorkItemLedger(
  text: string,
  expected: { runId: string; attempt: number },
): WorkItemLedger {
  assert(Buffer.byteLength(text) <= 64_000, "LEDGER_TOO_LARGE");
  const value: unknown = JSON.parse(text);
  object(value, ["schemaVersion", "runId", "attempt", "analysis", "items", "remaining"]);
  assert.equal(value.schemaVersion, 1);
  assert.equal(value.runId, expected.runId, "WRONG_RUN");
  assert.equal(value.attempt, expected.attempt, "WRONG_ATTEMPT");
  integer(value.attempt, 2, 4);
  object(value.analysis, ["target", "baseline"]);
  grounded(value.analysis.target);
  grounded(value.analysis.baseline);
  grounded(value.remaining, ["direction"]);
  enumeration(value.remaining.direction, ["none", "plausible"]);
  assert(Array.isArray(value.items) && value.items.length <= 2, "TOO_MANY_WORK_ITEMS");
  const seen = new Set<string>();
  for (const item of value.items) {
    object(item, [
      "id",
      "gap",
      "applicability",
      "authority",
      "plannedChange",
      "provenance",
      "targetRederivation",
      "disposition",
      "implementationRefs",
      "executionEvidenceIds",
      "withdrawal",
    ]);
    prose(item.id);
    assert(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/u.test(item.id), "INVALID_WORK_ID");
    assert(!seen.has(item.id), "DUPLICATE_WORK_ID");
    seen.add(item.id);
    grounded(item.gap);
    grounded(item.applicability);
    grounded(item.authority, ["kind"]);
    enumeration(item.authority.kind, [
      "specification",
      "interface-contract",
      "approved-golden",
      "unresolved",
    ]);
    prose(item.plannedChange);
    prose(item.targetRederivation);
    object(item.provenance, ["kind", "ids"]);
    enumeration(item.provenance.kind, ["self", "generic", "source"]);
    ids(item.provenance.ids, 4);
    assert.equal(
      item.provenance.ids.length === 0,
      item.provenance.kind === "self",
      "PROVENANCE_IDS_REQUIRED",
    );
    enumeration(item.disposition, ["proposed", "implemented", "withdrawn"]);
    refs(item.implementationRefs, item.disposition === "implemented" ? 1 : 0);
    ids(item.executionEvidenceIds, 12);
    if (item.disposition === "withdrawn") grounded(item.withdrawal);
    else assert.equal(item.withdrawal, null, "UNEXPECTED_WITHDRAWAL");
  }
  return value as WorkItemLedger;
}

/** Never search earlier assistant messages for a valid answer after the final answer fails. */
export function parseWorkItemLedgerFromTranscript(
  transcript: unknown,
  expected: { runId: string; attempt: number },
): WorkItemLedger {
  object(transcript);
  assert.equal(transcript.schemaVersion, 1);
  assert.equal(transcript.attempt, expected.attempt, "TRANSCRIPT_ATTEMPT_MISMATCH");
  assert(Array.isArray(transcript.exchanges) && transcript.exchanges.length > 0, "NO_EXCHANGES");
  const last: unknown = transcript.exchanges.at(-1);
  object(last);
  object(last.response);
  assert.equal(last.response.role, "assistant");
  assert.equal(last.response.stopReason, "stop", "FINAL_RESPONSE_NOT_COMPLETE");
  assert(
    last.response.error == null &&
      last.response.errorMessage == null &&
      last.response.aborted !== true,
    "FINAL_RESPONSE_FAILED",
  );
  assert(Array.isArray(last.response.content), "NO_FINAL_CONTENT");
  const texts: string[] = [];
  for (const block of last.response.content) {
    object(block);
    if (block.type === "text") {
      assert(typeof block.text === "string");
      texts.push(block.text);
    } else assert.equal(block.type, "thinking", "FINAL_RESPONSE_HAS_TOOL_CALL");
  }
  assert(texts.length > 0, "NO_FINAL_TEXT");
  return parseWorkItemLedger(texts.join(""), expected);
}

export function makeWorkSnapshot(
  runId: string,
  attempt: number,
  files: Record<string, string>,
): WorkSnapshot {
  prose(runId);
  integer(attempt, 0, 4);
  const sorted = Object.keys(files).sort();
  assert(sorted.length > 0 && sorted.length <= 256, "INVALID_SNAPSHOT_FILES");
  const cases = new Set<string>();
  for (const file of sorted) {
    logical(file);
    assert(file === "spec.md" || file.startsWith("rtl/"), "NON_PUBLIC_SNAPSHOT_FILE");
    assert(typeof files[file] === "string", "INVALID_SNAPSHOT_BYTES");
    const folded = file.normalize("NFC").toLowerCase();
    assert(!cases.has(folded), "CASE_COLLISION");
    cases.add(folded);
  }
  const digest = workDigest(JSON.stringify(sorted.map((file) => [file, workDigest(files[file]!)])));
  return { runId, attempt, digest, files: { ...files } };
}
export function validateWorkSnapshot(snapshot: WorkSnapshot): void {
  assert.equal(
    makeWorkSnapshot(snapshot.runId, snapshot.attempt, snapshot.files).digest,
    snapshot.digest,
    "SNAPSHOT_DIGEST_MISMATCH",
  );
}
function artifact(value: EvidenceArtifact): void {
  logical(value.path);
  assert(value.path.startsWith("evidence/"), "NON_RUNNER_ARTIFACT");
  assert(typeof value.content === "string", "INVALID_ARTIFACT");
}
function processStatus(value: EvidenceArtifact): "passed" | "failed" | "infrastructure-failed" {
  artifact(value);
  const raw: unknown = JSON.parse(value.content);
  object(raw);
  if (
    raw.closeConfirmed !== true ||
    raw.terminationFailed !== false ||
    raw.timedOut !== false ||
    raw.spawnError !== undefined ||
    raw.signal !== null ||
    !Number.isInteger(raw.exitCode)
  )
    return "infrastructure-failed";
  return raw.exitCode === 0 ? "passed" : "failed";
}
export function goldenEvidenceStatus(evidence: RuntimeEvidence): GoldenStatus {
  assert(/^[a-f0-9]{64}$/u.test(evidence.snapshotDigest), "INVALID_EVIDENCE_DIGEST");
  integer(evidence.attempt, 0, 4);
  const compile = processStatus(evidence.compile);
  if (compile === "infrastructure-failed") return compile;
  if (compile === "failed") return "compile-failed";
  if (evidence.simulation === null) return "infrastructure-failed";
  const simulation = processStatus(evidence.simulation);
  return simulation === "passed"
    ? "passed"
    : simulation === "failed"
      ? "simulation-failed"
      : simulation;
}

/** Positive native line counters show execution of source locations, NOT oracle correctness.
 * No trace marker or Agent claim is promoted to execution evidence by this first version.
 */
export function runtimeObservations(evidence: RuntimeEvidence): RuntimeObservation[] {
  if (goldenEvidenceStatus(evidence) !== "passed" || evidence.coverage === null) return [];
  const coverage = evidence.coverage;
  artifact(coverage);
  const artifactDigest = workDigest(coverage.content);
  return coverage.content.split(/\r?\n/u).flatMap((line, index) => {
    const m = /^C '([^']+)' ([0-9]+)$/u.exec(line);
    if (!m) return [];
    const fields = new Map(
      m[1]!
        .split("\x01")
        .filter(Boolean)
        .map((part) => {
          const at = part.indexOf("\x02");
          return [part.slice(0, at), part.slice(at + 1)];
        }),
    );
    if (fields.get("t") !== "line") return [];
    const sourcePath = fields.get("f")?.replaceAll("\\", "/");
    const sourceLine = Number(fields.get("l")),
      count = Number(m[2]);
    if (
      sourcePath === undefined ||
      !Number.isSafeInteger(sourceLine) ||
      sourceLine < 1 ||
      !Number.isSafeInteger(count) ||
      count <= 0
    )
      return [];
    logical(sourcePath);
    if (!sourcePath.startsWith("rtl/")) return [];
    return [
      {
        id: `a${evidence.attempt}-${artifactDigest.slice(0, 16)}-l${index + 1}`,
        runId: evidence.runId,
        attempt: evidence.attempt,
        snapshotDigest: evidence.snapshotDigest,
        artifactPath: coverage.path,
        artifactDigest,
        recordLine: index + 1,
        sourcePath,
        sourceLine,
        count,
      },
    ];
  });
}

export type BoundCodeReference = CodeReference & {
  snapshotDigest: string;
  fileDigest: string;
  text: string;
};
export type WorkItemReview = {
  analysisReferences: BoundCodeReference[];
  items: {
    id: string;
    status: "pending" | "withdrawn" | "runtime-observed" | "unconfirmed";
    reasons: string[];
    implementation: BoundCodeReference[];
    observations: RuntimeObservation[];
    evidenceSelection: "explicit" | "harness-associated";
    agentExecutionEvidenceIds: string[];
    baselineGapApproved: null;
    semanticApproved: null;
  }[];
  pendingIds: string[];
  semanticApproved: null;
  executionMeaning: string;
};
export function reviewWorkItems(
  ledger: WorkItemLedger,
  context: WorkItemReviewContext,
): WorkItemReview {
  validateWorkSnapshot(context.baseline);
  validateWorkSnapshot(context.current);
  assert.equal(ledger.runId, context.current.runId);
  assert.equal(context.baseline.runId, context.current.runId);
  assert.equal(ledger.attempt, context.current.attempt);
  const bind = (ref: CodeReference): BoundCodeReference => {
    const snapshot = ref.snapshot === "baseline" ? context.baseline : context.current;
    const content = snapshot.files[ref.path];
    assert(content !== undefined, "REFERENCE_FILE_MISSING");
    const lines = content.split(/\r?\n/u);
    assert(ref.endLine <= lines.length, "REFERENCE_LINE_MISSING");
    return {
      ...ref,
      snapshotDigest: snapshot.digest,
      fileDigest: workDigest(content),
      text: lines.slice(ref.startLine - 1, ref.endLine).join("\n"),
    };
  };
  assert(
    ledger.analysis.baseline.refs.every((ref) => ref.snapshot === "baseline"),
    "BASELINE_ANALYSIS_REQUIRES_BASELINE",
  );
  const baselineCode = (ref: CodeReference) =>
    ref.snapshot === "baseline" && ["rtl/tb.sv", "rtl/checker.sv"].includes(ref.path);
  assert(
    ledger.analysis.baseline.refs.some(baselineCode),
    "BASELINE_VERIFICATION_REFERENCE_REQUIRED",
  );
  const analysisReferences = [
    ...ledger.analysis.target.refs,
    ...ledger.analysis.baseline.refs,
    ...ledger.remaining.refs,
  ].map(bind);
  if (context.previousLedger !== null) {
    assert.equal(context.previousLedger.runId, ledger.runId);
    assert(context.previousLedger.attempt < ledger.attempt, "LEDGER_HISTORY_NOT_PRIOR");
    for (const previous of context.previousLedger.items) {
      const item = ledger.items.find((candidate) => candidate.id === previous.id);
      assert(item, "WORK_ITEM_HISTORY_DROPPED");
      assert.deepEqual(item.provenance, previous.provenance, "WORK_ITEM_PROVENANCE_CHANGED");
      if (previous.disposition === "withdrawn")
        assert.equal(item.disposition, "withdrawn", "WITHDRAWN_ITEM_REOPENED");
    }
  }
  const observations = new Map<string, RuntimeObservation>();
  for (const evidence of context.runtimeEvidence) {
    assert.equal(evidence.runId, ledger.runId, "CROSS_RUN_EVIDENCE");
    assert(evidence.attempt <= ledger.attempt, "FUTURE_RUNTIME_EVIDENCE");
    for (const observation of runtimeObservations(evidence)) {
      assert(!observations.has(observation.id), "DUPLICATE_RUNTIME_EVIDENCE");
      observations.set(observation.id, observation);
    }
  }
  const items = ledger.items.map((item): WorkItemReview["items"][number] => {
    [
      ...item.gap.refs,
      ...item.applicability.refs,
      ...item.authority.refs,
      ...(item.withdrawal?.refs ?? []),
    ].forEach(bind);
    assert(item.gap.refs.some(baselineCode), "GAP_REQUIRES_BASELINE_REFERENCE");
    if (item.provenance.kind !== "self") {
      assert.equal(
        context.condition,
        item.provenance.kind === "source" ? "M" : "G",
        "CROSS_CONDITION_PROVENANCE",
      );
      const allowed =
        item.provenance.kind === "source" ? context.allowedSourceIds : context.allowedGenericIds;
      assert(
        item.provenance.ids.every((id) => allowed.includes(id)),
        "UNKNOWN_PROVENANCE_ID",
      );
    }
    const implementation = item.implementationRefs.map((ref) => {
      assert(
        ref.snapshot === "current" && ["rtl/tb.sv", "rtl/checker.sv"].includes(ref.path),
        "IMPLEMENTATION_MUST_BE_CURRENT_MUTABLE_CODE",
      );
      return bind(ref);
    });
    const evidenceSelection: "explicit" | "harness-associated" =
      item.executionEvidenceIds.length > 0 ? "explicit" : "harness-associated";
    const cited =
      item.executionEvidenceIds.length > 0
        ? item.executionEvidenceIds.map((id) => {
            const value = observations.get(id);
            assert(value, "UNKNOWN_EXECUTION_EVIDENCE");
            return value;
          })
        : [...observations.values()].filter(
            (observation) =>
              observation.snapshotDigest === context.current.digest &&
              implementation.some(
                (ref) =>
                  observation.sourcePath === ref.path &&
                  observation.sourceLine >= ref.startLine &&
                  observation.sourceLine <= ref.endLine,
              ),
          );
    const reasons: string[] = [];
    const common = {
      id: item.id,
      implementation,
      observations: cited,
      evidenceSelection,
      agentExecutionEvidenceIds: item.executionEvidenceIds,
      baselineGapApproved: null,
      semanticApproved: null,
    };
    if (item.disposition === "withdrawn") return { ...common, status: "withdrawn", reasons };
    if (item.disposition === "proposed")
      return { ...common, status: "pending", reasons: ["NOT_IMPLEMENTED"] };
    if (item.authority.kind === "unresolved") reasons.push("AUTHORITY_UNRESOLVED");
    if (
      ["specification", "interface-contract"].includes(item.authority.kind) &&
      !item.authority.refs.some((ref) => ref.path === "spec.md")
    )
      reasons.push("PUBLIC_CONTRACT_REFERENCE_REQUIRED");
    if (
      item.authority.kind === "approved-golden" &&
      !item.authority.refs.some((ref) => context.approvedGoldenPaths?.includes(ref.path))
    )
      reasons.push("GOLDEN_AUTHORITY_NOT_PREREGISTERED");
    const mutableUnchanged = ["rtl/tb.sv", "rtl/checker.sv"].every(
      (file) => context.baseline.files[file] === context.current.files[file],
    );
    const allCodeAlreadyPresent = implementation.every((ref) =>
      context.baseline.files[ref.path]?.replace(/\r\n/gu, "\n").includes(ref.text),
    );
    if (mutableUnchanged || allCodeAlreadyPresent) reasons.push("BASELINE_IMPLEMENTATION_NOT_NEW");
    if (cited.length === 0) reasons.push("NO_EXECUTION_EVIDENCE");
    if (cited.some((observation) => observation.snapshotDigest !== context.current.digest))
      reasons.push("STALE_RUNTIME_EVIDENCE");
    for (const ref of implementation) {
      if (
        !cited.some(
          (observation) =>
            observation.snapshotDigest === context.current.digest &&
            observation.sourcePath === ref.path &&
            observation.sourceLine >= ref.startLine &&
            observation.sourceLine <= ref.endLine,
        )
      )
        reasons.push("IMPLEMENTATION_LOCATION_NOT_OBSERVED");
    }
    return {
      ...common,
      status: reasons.length === 0 ? "runtime-observed" : "unconfirmed",
      reasons: [...new Set(reasons)],
    };
  });
  return {
    analysisReferences,
    items,
    pendingIds: items
      .filter((item) => ["pending", "unconfirmed"].includes(item.status))
      .map((item) => item.id),
    semanticApproved: null,
    executionMeaning:
      "A positive native line counter in a passing golden run of exactly these assets establishes execution of the cited code location only. It does not establish oracle correctness, complete guard/window coverage or fault detection; semantic review remains independent.",
  };
}
