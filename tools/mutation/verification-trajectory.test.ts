import { test } from "node:test";
import assert from "node:assert/strict";
import { narrativeParagraphs, responseNarratives } from "./verification-trajectory.ts";
test("discard evaluator, target, code and scoreboard paragraphs", () => {
  const r = narrativeParagraphs(
    "Exercise reset transitions.\n\nscoreboard says expected data=5\n\nM001 killed\n\naxis_fifo solution\n\n```verilog\nsecret code\n```\n\nCheck both toggle directions.",
  );
  assert.deepEqual(
    r.accepted.map((x) => x.text),
    ["Exercise reset transitions.", "Check both toggle directions."],
  );
  assert.equal(r.discardedParagraphs, 3);
  assert.equal(r.hadCode, true);
});
test("only response text, never requests/tools/thinking", () => {
  const r = responseNarratives({
    exchanges: [
      {
        request: { secret: "SECRET" },
        response: {
          content: [
            { type: "thinking", text: "SECRET" },
            { type: "toolCall", text: "SECRET", arguments: { content: "SECRET" } },
            { type: "text", text: "Exercise reset transitions." },
          ],
        },
      },
    ],
  });
  assert.ok(!JSON.stringify(r).includes("SECRET"));
  assert.equal(r[0].accepted[0].kind, "unverified_agent_claim");
});
test("bounded input and malformed transcripts fail closed", () => {
  assert.throws(() => narrativeParagraphs("a".repeat(200000)));
  assert.throws(() => responseNarratives({}));
});
