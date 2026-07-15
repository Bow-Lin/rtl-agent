export type JsonPrimitive = null | boolean | number | string;
export type JsonArray = readonly JsonValue[];
export type JsonObject = { readonly [key: string]: JsonValue };
export type JsonValue = JsonPrimitive | JsonArray | JsonObject;

export class CanonicalJsonError extends TypeError {
  public constructor(message: string) {
    super(message);
    this.name = "CanonicalJsonError";
  }
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function hasUnpairedSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!Number.isFinite(next) || next < 0xdc00 || next > 0xdfff) {
        return true;
      }
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return true;
    }
  }

  return false;
}

function serializeJcs(value: unknown, activeObjects: Set<object>): string {
  if (value === null || typeof value === "boolean") {
    return JSON.stringify(value);
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new CanonicalJsonError("JCS numbers must be finite IEEE 754 values");
    }
    return JSON.stringify(value);
  }

  if (typeof value === "string") {
    if (hasUnpairedSurrogate(value)) {
      throw new CanonicalJsonError("JCS strings must contain valid Unicode scalar values");
    }
    return JSON.stringify(value);
  }

  if (typeof value !== "object" || value === null) {
    throw new CanonicalJsonError(`Unsupported JCS value type: ${typeof value}`);
  }

  if (activeObjects.has(value)) {
    throw new CanonicalJsonError("JCS input must not contain circular references");
  }

  activeObjects.add(value);
  try {
    if (Array.isArray(value)) {
      const ownKeys = Reflect.ownKeys(value);
      const elementKeys = ownKeys.filter((key) => key !== "length");
      if (elementKeys.length !== value.length) {
        throw new CanonicalJsonError("JCS arrays must be dense and contain no extra properties");
      }

      const elements = new Array<string>(value.length);
      for (const key of elementKeys) {
        if (typeof key !== "string") {
          throw new CanonicalJsonError("JCS arrays must not contain symbol properties");
        }
        const index = Number(key);
        if (
          !Number.isInteger(index) ||
          index < 0 ||
          index >= value.length ||
          String(index) !== key
        ) {
          throw new CanonicalJsonError("JCS arrays must contain indexed elements only");
        }
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
          throw new CanonicalJsonError(
            "JCS array elements must be enumerable data properties only",
          );
        }
        elements[index] = serializeJcs(descriptor.value, activeObjects);
      }
      return `[${elements.join(",")}]`;
    }

    if (!isPlainObject(value)) {
      throw new CanonicalJsonError("JCS objects must be plain objects");
    }

    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.some((key) => typeof key !== "string")) {
      throw new CanonicalJsonError("JCS objects must not contain symbol keys");
    }

    const keys = ownKeys as string[];
    for (const key of keys) {
      if (hasUnpairedSurrogate(key)) {
        throw new CanonicalJsonError("JCS object keys must contain valid Unicode scalar values");
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
        throw new CanonicalJsonError("JCS objects must contain enumerable data properties only");
      }
    }

    // ECMAScript's default string sort compares unsigned UTF-16 code units,
    // which is the property ordering required by RFC 8785 JCS.
    keys.sort();
    const members = keys.map((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !("value" in descriptor)) {
        throw new CanonicalJsonError("JCS object changed during serialization");
      }
      return `${JSON.stringify(key)}:${serializeJcs(descriptor.value, activeObjects)}`;
    });
    return `{${members.join(",")}}`;
  } finally {
    activeObjects.delete(value);
  }
}

/** Returns RFC 8785 JCS text. Hash callers must encode it as UTF-8 without a BOM. */
export function canonicalizeJsonJcs(value: JsonValue): string;
export function canonicalizeJsonJcs(value: unknown): string;
export function canonicalizeJsonJcs(value: unknown): string {
  return serializeJcs(value, new Set<object>());
}

export const canonicalizeJson = canonicalizeJsonJcs;
