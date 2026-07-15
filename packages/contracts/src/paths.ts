import { z } from "zod";

import { hasUnpairedSurrogate } from "./json.js";

export const MAX_LOGICAL_PATH_UTF8_BYTES = 1024;
export const MAX_LOGICAL_PATH_SEGMENT_UTF8_BYTES = 255;

const WINDOWS_RESERVED_CHARACTER = /[<>:"|?*\\]/;
const WINDOWS_RESERVED_DEVICE =
  /^(?:con|prn|aux|nul|conin\$|conout\$|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i;

export type LogicalPathFailureReason =
  | "EMPTY"
  | "ABSOLUTE"
  | "INVALID_SEPARATOR"
  | "EMPTY_SEGMENT"
  | "TRAVERSAL_SEGMENT"
  | "RESERVED_CHARACTER"
  | "CONTROL_CHARACTER"
  | "AMBIGUOUS_WHITESPACE"
  | "RESERVED_DEVICE_NAME"
  | "INVALID_UNICODE"
  | "SEGMENT_TOO_LONG"
  | "PATH_TOO_LONG";

export function utf8ByteLength(value: string): number {
  let length = 0;
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit <= 0x7f) {
      length += 1;
    } else if (codeUnit <= 0x7ff) {
      length += 2;
    } else if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!Number.isFinite(next) || next < 0xdc00 || next > 0xdfff) {
        return Number.POSITIVE_INFINITY;
      }
      length += 4;
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return Number.POSITIVE_INFINITY;
    } else {
      length += 3;
    }
  }
  return length;
}

export function validateLogicalPath(value: string): LogicalPathFailureReason | null {
  if (value.length === 0) return "EMPTY";
  if (value.startsWith("/") || /^[A-Za-z]:/.test(value) || value.startsWith("//")) {
    return "ABSOLUTE";
  }
  if (value.includes("\\")) return "INVALID_SEPARATOR";
  if (hasUnpairedSurrogate(value)) return "INVALID_UNICODE";
  if (utf8ByteLength(value) > MAX_LOGICAL_PATH_UTF8_BYTES) return "PATH_TOO_LONG";

  for (const segment of value.split("/")) {
    if (segment.length === 0) return "EMPTY_SEGMENT";
    if (segment === "." || segment === "..") return "TRAVERSAL_SEGMENT";
    if ([...segment].some((character) => character.charCodeAt(0) <= 0x1f)) {
      return "CONTROL_CHARACTER";
    }
    if (WINDOWS_RESERVED_CHARACTER.test(segment)) return "RESERVED_CHARACTER";
    if (segment.startsWith(" ") || segment.endsWith(" ") || segment.endsWith(".")) {
      return "AMBIGUOUS_WHITESPACE";
    }
    if (WINDOWS_RESERVED_DEVICE.test(segment)) return "RESERVED_DEVICE_NAME";
    if (utf8ByteLength(segment) > MAX_LOGICAL_PATH_SEGMENT_UTF8_BYTES) {
      return "SEGMENT_TOO_LONG";
    }
  }

  return null;
}

export const LogicalPathSchema = z
  .string()
  .superRefine((value, context) => {
    const reason = validateLogicalPath(value);
    if (reason !== null) {
      context.addIssue({ code: "custom", message: `Invalid logical path: ${reason}` });
    }
  })
  .brand<"LogicalPath">();

export type LogicalPath = z.infer<typeof LogicalPathSchema>;
