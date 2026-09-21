import test from "node:test";
import assert from "node:assert/strict";
import { finalAttempt, implementationExposure, usageQueue } from "./fifo-usage-campaign.ts";
import { IMPLEMENTATION_CHECK } from "./verification-implementation-check.ts";

test("fixed diagnostic schedule gives three independent draws per factorial cell", () => {
  const queue = usageQueue();
  assert.deepEqual(
    queue.map((x) => `${x.repeat}${x.group}`),
    ["1A", "1B", "1C", "1D", "2D", "2C", "2B", "2A", "3C", "3A", "3D", "3B"],
  );
  for (const q of queue) {
    assert.equal(q.check, q.group === "C" || q.group === "D");
    assert.equal(q.mode, q.group === "B" || q.group === "D" ? "frozen" : "off");
  }
});

test("final selection depends only on last attempt count, not intermediate score", () => {
  assert.deepEqual([0, 1, 2, 3].map(finalAttempt), [0, 2, 3, 4]);
  assert.throws(() => finalAttempt(4));
  assert.throws(() => finalAttempt(-1));
});

test("actual intervention exposure needs a successful prior spec read result", () => {
  const read = {
    response: {
      content: [{ type: "toolCall", name: "read", id: "spec1", arguments: { path: "spec.md" } }],
    },
  };
  const result = (id: string, error = false) => ({
    request: {
      messages: [
        {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: id,
              is_error: error,
              content: `original spec\n${IMPLEMENTATION_CHECK}`,
            },
          ],
        },
      ],
    },
  });
  assert.deepEqual(
    implementationExposure({ exchanges: [read, result("spec1"), result("spec1")] }),
    { exposed: true, requestSequences: [2, 3], specReadCalls: 1 },
  );
  assert.equal(implementationExposure({ exchanges: [read, result("wrong")] }).exposed, false);
  assert.equal(implementationExposure({ exchanges: [read, result("spec1", true)] }).exposed, false);
  assert.equal(implementationExposure({ exchanges: [result("spec1"), read] }).exposed, false);
  assert.equal(
    implementationExposure({
      exchanges: [
        read,
        {
          request: {
            messages: [
              { role: "assistant", content: [{ type: "text", text: IMPLEMENTATION_CHECK }] },
            ],
          },
        },
      ],
    }).exposed,
    false,
  );
});
