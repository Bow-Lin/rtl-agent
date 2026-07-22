import { describe, expect, it } from "vitest";

import { resolveEvaluationProfileSelection } from "../src/profile-selection.js";
import {
  EvaluationTestProvider,
  testEvaluationProfile,
} from "../../../packages/core-loop/test/evaluation-test-fixtures.js";

const CASES = [
  {
    caseId: "Prob001_zero",
    fixtureId: "prob-001",
    category: "BLANK_GENERATION" as const,
  },
  {
    caseId: "Prob002_m2014_q4i",
    fixtureId: "prob-002",
    category: "BLANK_GENERATION" as const,
  },
  {
    caseId: "Prob003_step_one",
    fixtureId: "prob-003",
    category: "BLANK_GENERATION" as const,
  },
  {
    caseId: "Prob010_mt2015_q4a",
    fixtureId: "prob-010",
    category: "BLANK_GENERATION" as const,
  },
] as const;

describe("evaluation profile selection", () => {
  it("resolves an inclusive case-insensitive range in locked Provider order", async () => {
    const provider = new EvaluationTestProvider(CASES);
    const base = await testEvaluationProfile(provider);
    const profile = await resolveEvaluationProfileSelection(provider, base, {
      kind: "RANGE",
      begin: "prob002",
      end: "Prob010",
    });

    expect(profile.selection.caseIds).toEqual([
      "Prob002_m2014_q4i",
      "Prob003_step_one",
      "Prob010_mt2015_q4a",
    ]);
    expect(profile.expectedCaseCount).toBe(3);
    expect(profile.evaluationProfileId).toMatch(/^evaluation-test-v1-sel-[0-9a-f]{16}$/);
  });

  it("canonicalizes an explicit unordered case list to locked Provider order", async () => {
    const provider = new EvaluationTestProvider(CASES);
    const base = await testEvaluationProfile(provider);
    const profile = await resolveEvaluationProfileSelection(provider, base, {
      kind: "CASES",
      cases: ["Prob010", "prob001"],
    });

    expect(profile.selection.caseIds).toEqual(["Prob001_zero", "Prob010_mt2015_q4a"]);
    expect(profile.expectedCaseCount).toBe(2);
  });

  it.each([
    { kind: "RANGE" as const, begin: "Prob010", end: "Prob001" },
    { kind: "CASES" as const, cases: ["Prob001", "prob001"] },
    { kind: "CASES" as const, cases: [""] },
  ])("rejects invalid, duplicate, or ambiguous selectors", async (selection) => {
    const provider = new EvaluationTestProvider(CASES);
    const base = await testEvaluationProfile(provider);
    await expect(
      resolveEvaluationProfileSelection(provider, base, selection),
    ).rejects.toMatchObject({
      error: {
        code: "EVALUATION_PROFILE_INVALID",
      },
    });
  });

  it("rejects an ambiguous case prefix", async () => {
    const provider = new EvaluationTestProvider([
      {
        caseId: "Prob001_alpha",
        fixtureId: "prob-001-alpha",
        category: "BLANK_GENERATION",
      },
      {
        caseId: "Prob001_beta",
        fixtureId: "prob-001-beta",
        category: "BLANK_GENERATION",
      },
    ]);
    const base = await testEvaluationProfile(provider);
    await expect(
      resolveEvaluationProfileSelection(provider, base, {
        kind: "CASES",
        cases: ["Prob001"],
      }),
    ).rejects.toMatchObject({
      error: {
        code: "EVALUATION_PROFILE_INVALID",
      },
    });
  });

  it("reports a stable missing-case error", async () => {
    const provider = new EvaluationTestProvider(CASES);
    const base = await testEvaluationProfile(provider);
    await expect(
      resolveEvaluationProfileSelection(provider, base, {
        kind: "CASES",
        cases: ["Prob999"],
      }),
    ).rejects.toMatchObject({
      error: {
        code: "DATASET_CASE_NOT_FOUND",
      },
    });
  });
});
