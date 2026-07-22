import {
  CoreLoopException,
  DatasetSelectionSchema,
  EvaluationProfileSchema,
  listFixtureCases,
  sha256Jcs,
} from "@rtl-agent/core-loop";
import type { EvaluationProfile, FixtureProvider } from "@rtl-agent/core-loop";

export type EvaluationCaseSelectionRequest =
  | {
      readonly kind: "RANGE";
      readonly begin: string;
      readonly end: string;
    }
  | {
      readonly kind: "CASES";
      readonly cases: readonly string[];
    };

function normalizedToken(token: string): string {
  const value = token.trim();
  if (
    value.length === 0 ||
    value.length > 256 ||
    [...value].some((character) => character.charCodeAt(0) < 0x20)
  ) {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      "Evaluation case selectors must be non-empty bounded strings",
    );
  }
  return value.toLowerCase();
}

function resolveCaseId(token: string, availableCaseIds: readonly string[]): string {
  const normalized = normalizedToken(token);
  const exact = availableCaseIds.filter((caseId) => caseId.toLowerCase() === normalized);
  if (exact.length === 1) return exact[0]!;
  const prefixed = availableCaseIds.filter((caseId) =>
    caseId.toLowerCase().startsWith(`${normalized}_`),
  );
  if (prefixed.length !== 1) {
    throw new CoreLoopException(
      prefixed.length === 0 ? "DATASET_CASE_NOT_FOUND" : "EVALUATION_PROFILE_INVALID",
      prefixed.length === 0
        ? "A selected dataset case was not found"
        : "A selected dataset case prefix is ambiguous",
    );
  }
  return prefixed[0]!;
}

function selectedCaseIds(
  request: EvaluationCaseSelectionRequest,
  availableCaseIds: readonly string[],
): readonly string[] {
  if (request.kind === "RANGE") {
    const begin = resolveCaseId(request.begin, availableCaseIds);
    const end = resolveCaseId(request.end, availableCaseIds);
    const beginIndex = availableCaseIds.indexOf(begin);
    const endIndex = availableCaseIds.indexOf(end);
    if (beginIndex > endIndex) {
      throw new CoreLoopException(
        "EVALUATION_PROFILE_INVALID",
        "Evaluation case range begin must not follow its end",
      );
    }
    return availableCaseIds.slice(beginIndex, endIndex + 1);
  }

  if (request.cases.length === 0 || request.cases.length > 10_000) {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      "Evaluation case list must contain from 1 to 10000 selectors",
    );
  }
  const requested = request.cases.map((token) => resolveCaseId(token, availableCaseIds));
  if (new Set(requested).size !== requested.length) {
    throw new CoreLoopException(
      "EVALUATION_PROFILE_INVALID",
      "Evaluation case selectors must resolve to unique cases",
    );
  }
  const selected = new Set(requested);
  return availableCaseIds.filter((caseId) => selected.has(caseId));
}

export async function resolveEvaluationProfileSelection(
  provider: FixtureProvider,
  baseProfile: EvaluationProfile,
  request: EvaluationCaseSelectionRequest,
): Promise<EvaluationProfile> {
  const available = await listFixtureCases(provider, baseProfile.selection);
  const availableCaseIds = available.map((caseRef) => caseRef.identity.caseId);
  const caseIds = selectedCaseIds(request, availableCaseIds);
  const selectionDigest = sha256Jcs(caseIds);
  const resolvedIdentityDigest = sha256Jcs({ baseProfile, caseIds });
  const digestSuffix = resolvedIdentityDigest.slice("sha256:".length, "sha256:".length + 16);
  const baseIdPrefix = baseProfile.evaluationProfileId.slice(0, 107).replace(/[._-]+$/u, "");
  return EvaluationProfileSchema.parse({
    ...baseProfile,
    evaluationProfileId: `${baseIdPrefix}-sel-${digestSuffix}`,
    selection: DatasetSelectionSchema.parse({
      schemaVersion: 1,
      split: baseProfile.selection.split,
      caseIds,
    }),
    expectedCaseCount: caseIds.length,
    expectedOrderedCaseIdsDigest: selectionDigest,
  });
}
