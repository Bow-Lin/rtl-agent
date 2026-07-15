import { describe, expect, it } from "vitest";

import { packageVersion } from "../src/index.js";

describe("contracts package", () => {
  it("is discovered by the workspace test runner", () => {
    expect(packageVersion).toBe("0.0.0");
  });
});
