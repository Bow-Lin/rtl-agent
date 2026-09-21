import { test } from "node:test";
import assert from "node:assert/strict";
import { candidates, applyCandidate, patchFor, coveragePoints } from "./fifo-candidates.ts";

test("seeded candidates deterministic; only reviewed ranges; one line per mutation", () => {
  const source = "// if(a == b)\nassign next = ptr + 1'b1;\nassign full = a == b;\n";
  const a = candidates(source, [[2, 3]]);
  assert.deepEqual(a, candidates(source, [[2, 3]]));
  assert.ok(a.length >= 3);
  for (const c of a) {
    const lines = applyCandidate(source, c).split("\n");
    assert.equal(lines.filter((l, i) => l !== source.split("\n")[i]).length, 1);
    assert.match(patchFor("rtl/fifo.v", c), /^--- a\/rtl\/fifo.v\n/);
  }
});
test("line provenance mismatch fails closed", () => {
  const c = candidates("assign full = a == b;", [[1, 1]])[0]!;
  assert.throws(() => applyCandidate("different", c), /MISMATCH/);
});
test("comments and excluded branches cannot create candidates", () => {
  assert.deepEqual(candidates("// if(a == b)\nassign q = a ^ b;\n", [[1, 1]]), []);
});
test("coverage normalizes host path and line endings; separates native types", () => {
  const raw =
    "C '\x01f\x02rtl\\fifo.v\x01t\x02line' 3\r\nC '\x01f\x02rtl/fifo.v\x01t\x02toggle' 0\r\nC '\x01f\x02tb.sv\x01t\x02line' 9\r\n";
  assert.deepEqual(coveragePoints(raw, ["rtl/fifo.v"]), {
    line: { hit: 1, total: 1 },
    toggle: { hit: 0, total: 1 },
  });
  assert.throws(() => coveragePoints(raw, ["missing.v"]), /NO_DUT/);
});

test("v2 adds meaningful enable/reset/transfer sites without changing v1", () => {
  const source = "if (enable)\n q <= data;\nelse if(reset)\n q <= 0;\nwire full = a == b;";
  const old = candidates(source, [[1, 5]]);
  const expanded = candidates(source, [[1, 5]], 42, true);
  assert.equal(old.length, 0);
  assert.deepEqual(expanded, candidates(source, [[1, 5]], 42, true));
  for (const name of ["enable_inversion", "reset_offset", "transfer_lsb", "comparison"])
    assert.ok(expanded.some((c) => c.operator === name));
  for (const c of expanded)
    assert.equal(
      applyCandidate(source, c)
        .split("\n")
        .filter((s, i) => s !== source.split("\n")[i]).length,
      1,
    );
});

test("transfer mutation preserves nested address and changes one assignment only", () => {
  const source = "q <= mem[ptr[W-1:0]]; // ignored <= comment;";
  const cs = candidates(source, [[1, 1]], 42, true).filter((c) => c.operator === "transfer_lsb");
  assert.equal(cs.length, 1);
  assert.equal(cs[0]!.before, "mem[ptr[W-1:0]]");
  assert.match(cs[0]!.mutatedLine, /\(mem\[ptr\[W-1:0\]\]\) \^ 1'b1/);
});
