import { describe, expect, it } from "vitest";

import { parseProjectCoverageCommandOptions } from "../src/index.js";

describe("project-coverage command", () => {
  it("defaults to a deterministic baseline-only Pi-compatible configuration", () => {
    expect(parseProjectCoverageCommandOptions(["--project", "versatile-fifo"])).toEqual({
      projectId: "versatile-fifo",
      backend: "pi",
      maxAgentIterations: 0,
    });
  });

  it("accepts explicit Agent iterations and a threshold", () => {
    expect(
      parseProjectCoverageCommandOptions([
        "--project",
        "aes-highthroughput-lowarea",
        "--agent",
        "opencode",
        "--iterations",
        "3",
        "--coverage-threshold",
        "90",
      ]),
    ).toEqual({
      projectId: "aes-highthroughput-lowarea",
      backend: "opencode",
      maxAgentIterations: 3,
      coverageThreshold: 90,
    });
  });

  it.each([
    { arguments_: [] },
    { arguments_: ["--project", "unknown"] },
    { arguments_: ["--project", "scalable-arbiter", "--iterations", "11"] },
    { arguments_: ["--project", "scalable-arbiter", "--coverage-threshold", "101"] },
  ])("rejects invalid options %#", ({ arguments_ }) => {
    expect(() => parseProjectCoverageCommandOptions(arguments_)).toThrowError();
  });
});
