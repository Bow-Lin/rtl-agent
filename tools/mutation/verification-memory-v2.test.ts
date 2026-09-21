import assert from "node:assert/strict";
import { test } from "node:test";
import type { Bundle } from "./verification-memory.ts";
import { sourceRun } from "./verification-source-input.ts";
import { CONTRACT_V2, parseV2Extraction, v2ExtractionRequest } from "./verification-memory-v2.ts";

const bundle: Bundle = {
  source: "eth",
  evidence: [
    { id: "eth:t", kind: "trajectory" },
    { id: "eth:p", kind: "process" },
    { id: "eth:a", kind: "asset-attempt-2" },
  ].map((entry) => ({
    ...entry,
    path: `.rtl-agent/project-coverage-runs/${sourceRun("eth")}/evidence/${entry.kind}.json`,
    sha256: "synthetic",
    data: {},
  })),
};
function candidate() {
  const item = structuredClone(CONTRACT_V2);
  item.transferableStrategy.evidenceIds = ["eth:t"];
  item.sourceDiscovery.evidenceIds = ["eth:t", "eth:p"];
  item.scenario.evidenceIds = ["eth:t", "eth:a"];
  item.oracle.evidenceIds = ["eth:a"];
  item.observedSourceEffect.evidenceIds = ["eth:p"];
  item.evidenceIds = ["eth:t", "eth:p", "eth:a"];
  return item;
}
const response = (items: unknown[]) =>
  JSON.stringify({ schemaVersion: 2, reviewStatus: "PENDING_HUMAN_REVIEW", items });

test("v2 preserves unknown execution, authority and fault benefit rather than inventing proof", () => {
  const item = candidate();
  assert.deepEqual(parseV2Extraction(response([item]), bundle), [item]);
  assert.deepEqual(parseV2Extraction(response([]), bundle), []);
  const request = JSON.parse(v2ExtractionRequest(bundle).prompt);
  assert.deepEqual(request.sourceEvidence, bundle);
  assert.equal(request.outputContract.schemaVersion, 2);
});

test("every advertised execution enum is accepted in its declared field", () => {
  const request = JSON.parse(v2ExtractionRequest(bundle).prompt);
  assert.equal(request.contractRevision, "verification-memory-v2.1");
  assert.deepEqual(request.enumChoices.scenarioExecution, ["observed", "code-only", "unverified"]);
  assert.deepEqual(request.enumChoices.oracleExecution, [
    "observed",
    "code-only",
    "unverified",
    "not-added",
  ]);
  for (const field of ["scenario", "oracle"] as const) {
    for (const execution of request.enumChoices[`${field}Execution`]) {
      const item = candidate();
      item[field].execution = execution;
      item[field].evidenceIds.push("eth:p");
      assert.equal(parseV2Extraction(response([item]), bundle).length, 1);
    }
  }
  const invalidScenario = candidate();
  assert.throws(
    () =>
      parseV2Extraction(
        response([
          { ...invalidScenario, scenario: { ...invalidScenario.scenario, execution: "not-added" } },
        ]),
        bundle,
      ),
    /INVALID_CLAIM_KIND/,
  );
});

test("request declares the top-level provenance rules enforced by the parser", () => {
  const request = v2ExtractionRequest(bundle);
  const prompt = JSON.parse(request.prompt);
  assert.deepEqual(prompt.evidenceRules, {
    topLevelField: "items[].evidenceIds",
    nonEmpty: true,
    requiredEvidenceKind: "trajectory",
    includeEveryNestedEvidenceId: true,
    uniqueIdsInEveryEvidenceArray: true,
  });
  assert.match(
    request.system,
    /top-level evidenceIds must be non-empty, contain at least one trajectory/,
  );
  assert.match(
    request.system,
    /include every evidence ID cited anywhere in that item's nested fields/,
  );
  const item = candidate();
  item.evidenceIds = ["eth:p", "eth:a"];
  assert.throws(
    () => parseV2Extraction(response([item]), bundle),
    /items\[\]\.evidenceIds: MISSING_TRAJECTORY_REFERENCE/,
  );
  item.evidenceIds = ["eth:t", "eth:p"];
  assert.throws(
    () => parseV2Extraction(response([item]), bundle),
    /items\[\]\.evidenceIds: INCOMPLETE_PROVENANCE/,
  );
  item.evidenceIds = ["eth:t", "eth:p", "eth:a"];
  assert.equal(parseV2Extraction(response([item]), bundle).length, 1);
});

test("legacy annotated enum stays invalid; historical outputs are not normalized", () => {
  const item = candidate();
  assert.throws(
    () =>
      parseV2Extraction(
        response([{ ...item, oracle: { ...item.oracle, execution: "not-added (oracle only)" } }]),
        bundle,
      ),
    /INVALID_CLAIM_KIND/,
  );
});

test("discovery context stays historical; transferable policy commands and known targets are rejected", () => {
  const item = candidate();
  item.sourceDiscovery.description = "source 因 coverage 无增益而停止；并不决定未来任务停止规则";
  assert.equal(parseV2Extraction(response([item]), bundle).length, 1);
  item.applicability.requiredMechanisms = ["后续 target 不得修改 checker"];
  assert.throws(() => parseV2Extraction(response([item]), bundle), /HISTORICAL_POLICY_COMMAND/);
  item.applicability.requiredMechanisms = ["coverage 无增益即必须停止"];
  assert.throws(() => parseV2Extraction(response([item]), bundle), /HISTORICAL_POLICY_COMMAND/);
  item.applicability.requiredMechanisms = ["固定接口契约"];
  item.title = "M010 known target result";
  assert.throws(() => parseV2Extraction(response([item]), bundle), /KNOWN_TARGET_CONTAMINATION/);
});

test("source request rejects another source, target artifacts and path traversal", () => {
  for (const bad of [
    { ...bundle, source: "held-out" },
    {
      ...bundle,
      evidence: [{ ...bundle.evidence[0]!, path: ".rtl-agent/fifo-replays/example/result.json" }],
    },
    {
      ...bundle,
      evidence: [{ ...bundle.evidence[0]!, path: `${bundle.evidence[0]!.path}/../other.json` }],
    },
  ])
    assert.throws(() => v2ExtractionRequest(bad));
});

test("rejects observed fault gains and isolated causality absent from these source inputs", () => {
  const item = candidate();
  assert.throws(
    () =>
      parseV2Extraction(
        response([
          {
            ...item,
            observedSourceEffect: { ...item.observedSourceEffect, kind: "mutation-gain" },
          },
        ]),
        bundle,
      ),
    /INVALID_CLAIM_KIND/,
  );
  assert.throws(
    () =>
      parseV2Extraction(
        response([
          {
            ...item,
            observedSourceEffect: { ...item.observedSourceEffect, causality: "isolated" },
          },
        ]),
        bundle,
      ),
    /UNPROVEN_CAUSALITY/,
  );
  assert.throws(
    () =>
      parseV2Extraction(
        response([
          {
            ...item,
            hypothesizedFaultMechanism: { ...item.hypothesizedFaultMechanism, status: "proven" },
          },
        ]),
        bundle,
      ),
    /UNOBSERVED_FAULT_BENEFIT/,
  );
});

test("code presence cannot mechanically pass the observed-execution reference gate", () => {
  const item = candidate();
  item.oracle.execution = "observed";
  assert.throws(() => parseV2Extraction(response([item]), bundle), /MISSING_OBSERVATION/);
  item.oracle.evidenceIds.push("eth:p");
  assert.equal(parseV2Extraction(response([item]), bundle).length, 1);
  // This only establishes the reference kind. The log must still be reviewed for actual execution.
});

test("an oracle requires its timing, simulator semantics and a cited correctness authority or unresolved", () => {
  const item = candidate();
  item.oracle.sampling.updateOrdering = "";
  assert.throws(() => parseV2Extraction(response([item]), bundle), /MISSING_PROSE/);
  item.oracle.sampling.updateOrdering = "not established";
  item.oracle.correctnessBasis.kind = "approved-golden";
  assert.throws(() => parseV2Extraction(response([item]), bundle), /MISSING_REFERENCE/);
  item.oracle.correctnessBasis.kind = "unresolved";
  item.oracle.simulatorSemantics = "";
  assert.throws(() => parseV2Extraction(response([item]), bundle), /MISSING_PROSE/);
});

test("negative experience cannot silently become a recommended action", () => {
  const item = candidate();
  item.kind = "negative";
  assert.throws(() => parseV2Extraction(response([item]), bundle), /MISSING_NEGATIVE_LESSON/);
  item.negativeExperience = {
    description: "no observed gain",
    failedAction: "repeated same sequence",
    failureConditions: "unchanged relevant state",
    avoidRepeat: "check the enabling mechanism first",
    evidenceIds: ["eth:p"],
  };
  assert.equal(parseV2Extraction(response([item]), bundle).length, 1);
});

test("rejects historical control fields, unknown references and incomplete provenance", () => {
  const item = candidate();
  assert.throws(
    () => parseV2Extraction(response([{ ...item, stopPolicy: "stop now" }]), bundle),
    /UNEXPECTED_CONTRACT_FIELDS/,
  );
  item.oracle.evidenceIds = ["unknown"];
  assert.throws(() => parseV2Extraction(response([item]), bundle), /UNKNOWN_REFERENCE/);
  item.oracle.evidenceIds = ["eth:a"];
  item.evidenceIds = ["eth:t", "eth:p"];
  assert.throws(() => parseV2Extraction(response([item]), bundle), /INCOMPLETE_PROVENANCE/);
});
