import test from "node:test";
import assert from "node:assert/strict";
import {
  directedQueue,
  directedSpecExposure,
  finalAttempt,
  generationClassification,
  processEvidenceStatus,
} from "./fifo-directed-campaign.ts";
import { DIRECTED_WORK_ITEM } from "./verification-directed-memory.ts";

test("bounded directed batch has three fresh draws and last-attempt-only selection", () => {
  assert.deepEqual(
    directedQueue(),
    [1, 2, 3].map((repeat) => ({
      group: "E",
      repeat,
      mode: "directed-memory10",
      check: false,
    })),
  );
  assert.deepEqual([0, 1, 2, 3].map(finalAttempt), [0, 2, 3, 4]);
  assert.throws(() => finalAttempt(4));
  assert.throws(() => finalAttempt(-1));
  assert.throws(() => finalAttempt(1.5));
});

test("native process teardown failure stops even when runner wrote a terminal result", () => {
  const success = { closeConfirmed: true, terminationFailed: false, timedOut: false, exitCode: 0 };
  assert.deepEqual(processEvidenceStatus([success, { ...success, exitCode: 1 }]), {
    recordCount: 2,
    cleanupConfirmed: true,
    infrastructureFailure: false,
  });
  for (const change of [{ closeConfirmed: false }, { terminationFailed: true }]) {
    const state = processEvidenceStatus([success, { ...success, ...change }]);
    assert.equal(state.cleanupConfirmed, false);
    assert.equal(state.infrastructureFailure, true);
    assert.equal(
      generationClassification(
        false,
        false,
        { status: "FAILED", stopReason: "VERILATOR_FAILED" },
        state.infrastructureFailure,
      ),
      "infrastructure-failed",
    );
  }
  for (const change of [{ timedOut: true }, { spawnError: "ENOENT" }]) {
    const state = processEvidenceStatus([{ ...success, ...change }]);
    assert.equal(state.cleanupConfirmed, true);
    assert.equal(state.infrastructureFailure, true);
  }
  assert.equal(processEvidenceStatus([]).cleanupConfirmed, false);
  assert.equal(processEvidenceStatus([{}]).infrastructureFailure, true);
  assert.equal(
    processEvidenceStatus([success], [{ timedOut: false, outcome: "RTL_CHANGED" }], 1)
      .cleanupConfirmed,
    true,
  );
  for (const value of [
    { timedOut: true, outcome: "RTL_CHANGED" },
    { timedOut: false, outcome: "AGENT_PROCESS_ERROR" },
  ]) {
    assert.equal(processEvidenceStatus([success], [value], 1).cleanupConfirmed, false);
    assert.equal(processEvidenceStatus([success], [value], 1).infrastructureFailure, true);
  }
  assert.equal(processEvidenceStatus([success], [], 1).cleanupConfirmed, false);
});

test("generated boundary failure remains a failed draw even without execution.json", () => {
  assert.equal(generationClassification(false, true, null), "generation-failed");
  assert.equal(generationClassification(false, false, null), "infrastructure-failed");
  assert.equal(
    generationClassification(true, false, { status: "FAILED", stopReason: "AGENT_FAILED" }),
    "infrastructure-failed",
  );
  assert.equal(
    generationClassification(false, false, { status: "FAILED", stopReason: "VERILATOR_FAILED" }),
    "generation-failed",
  );
  assert.equal(
    generationClassification(false, false, {
      status: "FAILED",
      stopReason: "BASELINE_VERILATOR_FAILED",
    }),
    "infrastructure-failed",
  );
  assert.equal(
    generationClassification(false, false, {
      status: "COMPLETED",
      stopReason: "NO_MEANINGFUL_GAIN",
    }),
    "completed",
  );
});

test("spec exposure does not confuse the first-context directive or self-report with a real read", () => {
  const read = {
    response: {
      content: [{ type: "toolCall", name: "read", id: "read1", arguments: { path: "spec.md" } }],
    },
  };
  const response = (id: string, error = false) => ({
    request: {
      messages: [
        {
          role: "user",
          content: [
            { type: "tool_result", tool_use_id: id, is_error: error, content: DIRECTED_WORK_ITEM },
          ],
        },
      ],
    },
  });
  assert.equal(directedSpecExposure({ exchanges: [read, response("read1")] }).exposed, true);
  assert.equal(directedSpecExposure({ exchanges: [read, response("other")] }).exposed, false);
  assert.equal(directedSpecExposure({ exchanges: [read, response("read1", true)] }).exposed, false);
  assert.equal(directedSpecExposure({ exchanges: [response("read1"), read] }).exposed, false);
  assert.equal(
    directedSpecExposure({
      exchanges: [{ request: { messages: [{ role: "user", content: DIRECTED_WORK_ITEM }] } }],
    }).exposed,
    false,
  );
});
