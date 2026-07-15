import { describe, expect, it } from "vitest";

import {
  LogicalPathSchema,
  MAX_LOGICAL_PATH_SEGMENT_UTF8_BYTES,
  MAX_LOGICAL_PATH_UTF8_BYTES,
} from "../src/index.js";

describe("LogicalPath", () => {
  it.each(["rtl/fifo.sv", ".config/tool.json", "规格/设计.md"])("accepts %s", (value) => {
    expect(LogicalPathSchema.parse(value)).toBe(value);
  });

  it.each([
    "",
    "/rtl/fifo.sv",
    "C:/rtl/fifo.sv",
    "C:rtl/fifo.sv",
    "//server/share/file",
    "rtl\\fifo.sv",
    "rtl/../secret",
    "./rtl",
    "rtl//fifo.sv",
    "rtl/fifo?.sv",
    "rtl/bad\u0001name",
    "rtl/trailing. ",
    "rtl/trailing.",
    "rtl/ leading",
    "rtl/CON",
    "rtl/nul.json",
    "rtl/COM1.txt",
    "rtl/LPT¹.log",
    `rtl/\ud800.sv`,
  ])("rejects a non-portable path: %s", (value) => {
    expect(LogicalPathSchema.safeParse(value).success).toBe(false);
  });

  it("enforces UTF-8 byte limits rather than UTF-16 length", () => {
    const maxAsciiSegment = "a".repeat(MAX_LOGICAL_PATH_SEGMENT_UTF8_BYTES);
    expect(LogicalPathSchema.safeParse(maxAsciiSegment).success).toBe(true);
    expect(LogicalPathSchema.safeParse(`${maxAsciiSegment}a`).success).toBe(false);
    expect(LogicalPathSchema.safeParse("😀".repeat(63)).success).toBe(true);
    expect(LogicalPathSchema.safeParse("😀".repeat(64)).success).toBe(false);

    const segments = Array.from({ length: 5 }, () => "a".repeat(204));
    expect(segments.join("/").length).toBe(MAX_LOGICAL_PATH_UTF8_BYTES);
    expect(LogicalPathSchema.safeParse(segments.join("/")).success).toBe(true);
    expect(LogicalPathSchema.safeParse(`${segments.join("/")}a`).success).toBe(false);
  });
});
