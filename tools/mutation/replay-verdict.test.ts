import { test } from "node:test";
import assert from "node:assert/strict";
import { simulationVerdict } from "./replay-verdict.ts";
test("only explicit assertion failures kill; timeout and infrastructure never kill", () => {
  const base = { exitCode: 0, error: null, stdout: "GOLDEN_PASS versatile-fifo", stderr: "" };
  assert.equal(simulationVerdict(base), "survived");
  assert.equal(
    simulationVerdict({ ...base, stdout: "ETH_FIFO_GOLDEN_PASS" }, "ETH_FIFO_GOLDEN_PASS"),
    "survived",
  );
  assert.equal(simulationVerdict(base, "ETH_FIFO_GOLDEN_PASS"), "output-invalid");
  assert.equal(simulationVerdict({ ...base, stdout: "" }), "output-invalid");
  assert.equal(
    simulationVerdict({ ...base, exitCode: 1, stdout: "%Error: Assertion failed" }),
    "killed",
  );
  assert.equal(simulationVerdict({ ...base, exitCode: 1 }), "infrastructure-error");
  assert.equal(simulationVerdict({ ...base, error: "spawn ETIMEDOUT" }), "timeout");
  assert.equal(simulationVerdict({ ...base, error: "ENOENT" }), "infrastructure-error");
});
