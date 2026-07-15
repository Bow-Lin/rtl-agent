import { describe, expect, it } from "vitest";

import { CanonicalJsonError, canonicalizeJsonJcs } from "../src/index.js";

describe("RFC 8785 JSON Canonicalization Scheme", () => {
  it("uses the official UTF-16 property-ordering sample", () => {
    const input = {
      "€": "Euro Sign",
      "\r": "Carriage Return",
      דּ: "Hebrew Letter Dalet With Dagesh",
      "1": "One",
      "😀": "Emoji: Grinning Face",
      "\u0080": "Control",
      ö: "Latin Small Letter O With Diaeresis",
    };

    expect(canonicalizeJsonJcs(input)).toBe(
      '{"\\r":"Carriage Return","1":"One","":"Control","ö":"Latin Small Letter O With Diaeresis","€":"Euro Sign","😀":"Emoji: Grinning Face","דּ":"Hebrew Letter Dalet With Dagesh"}',
    );
  });

  it("matches the RFC primitive serialization sample", () => {
    const input = {
      numbers: [Number("333333333.33333329"), 1e30, 4.5, 0.002, 1e-27, -0],
      string: '€$\u000f\nA\'B"\\\\"/',
      literals: [null, true, false],
    };
    expect(canonicalizeJsonJcs(input)).toBe(
      String.raw`{"literals":[null,true,false],"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27,0],"string":"€$\u000f\nA'B\"\\\\\"/"}`,
    );
  });

  it("recursively sorts objects but preserves arrays and Unicode normalization", () => {
    expect(canonicalizeJsonJcs({ b: [{ z: 1, a: 2 }], a: [2, 1] })).toBe(
      '{"a":[2,1],"b":[{"a":2,"z":1}]}',
    );
    const distinctNormalizationForms = canonicalizeJsonJcs({ é: 1, "e\u0301": 2 });
    expect(distinctNormalizationForms).toContain('"é":1');
    expect(distinctNormalizationForms).toContain('"é":2');
    expect(canonicalizeJsonJcs({ z: 1, a: 2 })).toBe(canonicalizeJsonJcs({ a: 2, z: 1 }));
  });

  it.each([NaN, Infinity, -Infinity, undefined, 1n, new Date(0), "\ud800"])(
    "fails closed for non-I-JSON input: %s",
    (value) => {
      expect(() => canonicalizeJsonJcs(value)).toThrow(CanonicalJsonError);
    },
  );

  it("rejects circular references, accessors, and symbol keys", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => canonicalizeJsonJcs(circular)).toThrow(CanonicalJsonError);

    const accessor = Object.defineProperty({}, "value", { enumerable: true, get: () => 1 });
    expect(() => canonicalizeJsonJcs(accessor)).toThrow(CanonicalJsonError);
    expect(() => canonicalizeJsonJcs({ [Symbol("secret")]: 1 })).toThrow(CanonicalJsonError);
  });

  it.each([
    {
      name: "sparse array",
      value: (() => {
        const value: unknown[] = [];
        value.length = 1;
        return value;
      })(),
    },
    { name: "named property", value: Object.assign([], { extra: 1 }) },
    { name: "symbol property", value: Object.assign([], { [Symbol("secret")]: 1 }) },
    {
      name: "accessor element",
      value: Object.defineProperty([], "0", { enumerable: true, get: () => 1 }),
    },
    {
      name: "non-enumerable element",
      value: Object.defineProperty([], "0", { enumerable: false, value: 1 }),
    },
  ])("rejects $name without collapsing it to another hash input", ({ value }) => {
    expect(() => canonicalizeJsonJcs(value)).toThrow(CanonicalJsonError);
  });
});
