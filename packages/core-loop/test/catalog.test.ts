import { describe, expect, it } from "vitest";

import { listFixtureCases } from "../src/index.js";
import type { FixtureCaseRef } from "../src/index.js";
import { CASE_REF, TestFixtureProvider } from "./fixtures.js";

const SELECTION = {
  schemaVersion: 1,
  split: "test",
} as const;

describe("fixture catalog validation", () => {
  it("accepts deterministic case references from the pinned descriptor", async () => {
    await expect(listFixtureCases(new TestFixtureProvider(), SELECTION)).resolves.toEqual([
      CASE_REF,
    ]);
  });

  it("fails when an explicitly requested dataset case is missing", async () => {
    class EmptyProvider extends TestFixtureProvider {
      public override async *listCases(): AsyncIterable<FixtureCaseRef> {
        yield* [] as FixtureCaseRef[];
      }
    }
    await expect(
      listFixtureCases(new EmptyProvider(), {
        schemaVersion: 1,
        split: "test",
        caseIds: ["missing-case"],
      }),
    ).rejects.toMatchObject({ error: { code: "DATASET_CASE_NOT_FOUND" } });
  });
});
