import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildGenericGuidance,
  GENERIC_GUIDANCE_PROMPT,
  GENERIC_GUIDANCE_SYSTEM,
  parseGenericGuidance,
} from "./verification-generic-guidance.ts";

const guidance =
  "依据当前公开契约建立预期，区分发出的请求与实际接受的事务。检查采样与状态更新之间的先后关系，保留已有的有效检查，并为等待完成设置有限边界。";

test("generic author input contains no source library or implementation", () => {
  const input = GENERIC_GUIDANCE_SYSTEM + GENERIC_GUIDANCE_PROMPT;
  assert.doesNotMatch(input, /dpretet|versatile|openhmc|ufifo|M010|full|empty/i);
  assert.match(input, /no tools/i);
});
test("declared character bounds match validation, including supplementary Unicode", () => {
  assert.match(GENERIC_GUIDANCE_SYSTEM, /50 to 600 Unicode characters after trimming/);
  for (const length of [50, 600]) {
    const text = "核".repeat(length);
    assert.equal(parseGenericGuidance(JSON.stringify({ guidance: text })), text);
  }
  for (const text of ["核".repeat(49), "核".repeat(601), "𠮷".repeat(49)]) {
    assert.throws(
      () => parseGenericGuidance(JSON.stringify({ guidance: text })),
      /BAD_GUIDE_LENGTH/,
    );
  }
  const text = "  " + "𠮷".repeat(50) + "  ";
  assert.equal(parseGenericGuidance(JSON.stringify({ guidance: text })), text);
});
test("one isolated call stores raw output and keeps semantic review pending", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "generic-guide-"));
  let calls = 0;
  try {
    const result = await buildGenericGuidance(path.join(root, "out"), async (request) => {
      calls++;
      assert.deepEqual(Object.keys(request).sort(), ["name", "prompt", "system"]);
      return JSON.stringify({ guidance });
    });
    assert.equal(calls, 1);
    assert.equal(result.semanticReview, "PENDING");
    assert.equal(result.guidance, guidance);
    assert.ok(JSON.parse(await readFile(path.join(root, "out", "raw-response.json"), "utf8")).text);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("malformed response is retained without retry or invented replacement", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "generic-guide-"));
  let calls = 0;
  try {
    await assert.rejects(
      buildGenericGuidance(path.join(root, "out"), async () => {
        calls++;
        return "not-json";
      }),
      /GENERIC_GUIDANCE_FAILED/,
    );
    assert.equal(calls, 1);
    assert.equal(
      JSON.parse(await readFile(path.join(root, "out", "raw-response.json"), "utf8")).text,
      "not-json",
    );
    assert.equal(
      JSON.parse(await readFile(path.join(root, "out", "failure.json"), "utf8")).retry,
      false,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
  assert.throws(
    () => parseGenericGuidance(JSON.stringify({ guidance, extra: true })),
    /BAD_GUIDE_FIELDS/,
  );
});
