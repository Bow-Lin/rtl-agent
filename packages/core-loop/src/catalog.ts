import {
  DatasetDescriptorSchema,
  DatasetSelectionSchema,
  FixtureCaseRefSchema,
} from "./contracts.js";
import type { DatasetSelection, FixtureCaseRef } from "./contracts.js";
import { CoreLoopException, requireFixtureProvider } from "./errors.js";
import type { FixtureProvider } from "./fixture-provider.js";
import { assertNoLogicalPathCollisions } from "./filesystem.js";

async function listFixtureCasesInternal(
  provider: FixtureProvider | undefined,
  rawSelection: unknown,
): Promise<readonly FixtureCaseRef[]> {
  const configuredProvider = requireFixtureProvider(provider);
  const selectionResult = DatasetSelectionSchema.safeParse(rawSelection);
  if (!selectionResult.success) {
    throw new CoreLoopException("FIXTURE_INVALID", "Dataset selection is invalid");
  }
  const selection: DatasetSelection = selectionResult.data;
  const descriptorResult = DatasetDescriptorSchema.safeParse(await configuredProvider.describe());
  if (!descriptorResult.success || !descriptorResult.data.splits.includes(selection.split)) {
    throw new CoreLoopException(
      "DATASET_PROVENANCE_INVALID",
      "Dataset descriptor does not contain the selected split",
    );
  }
  const descriptor = descriptorResult.data;
  const requested = selection.caseIds === undefined ? undefined : new Set(selection.caseIds);
  const cases: FixtureCaseRef[] = [];
  for await (const candidate of configuredProvider.listCases(selection)) {
    const parsed = FixtureCaseRefSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new CoreLoopException(
        "DATASET_PROVENANCE_INVALID",
        "Provider returned an invalid case reference",
      );
    }
    const caseRef = parsed.data;
    if (
      caseRef.identity.datasetId !== descriptor.datasetId ||
      caseRef.identity.datasetVersion !== descriptor.datasetVersion ||
      caseRef.identity.split !== selection.split ||
      (requested !== undefined && !requested.has(caseRef.identity.caseId))
    ) {
      throw new CoreLoopException(
        "DATASET_PROVENANCE_INVALID",
        "Provider returned a case outside the selected pinned dataset",
      );
    }
    if (cases.length > 0 && cases[cases.length - 1]!.identity.caseId >= caseRef.identity.caseId) {
      throw new CoreLoopException(
        "CASE_COLLISION",
        "Provider case references must be strictly ordered by case ID",
      );
    }
    cases.push(caseRef);
    if (selection.maximumCases !== undefined && cases.length > selection.maximumCases) {
      throw new CoreLoopException(
        "DATASET_PROVENANCE_INVALID",
        "Provider returned more cases than the declared selection limit",
      );
    }
  }

  assertNoLogicalPathCollisions(cases.map((caseRef) => caseRef.fixtureId));
  if (requested !== undefined) {
    const found = new Set(cases.map((caseRef) => caseRef.identity.caseId));
    if ([...requested].some((caseId) => !found.has(caseId))) {
      throw new CoreLoopException(
        "DATASET_CASE_NOT_FOUND",
        "One or more explicitly selected dataset cases were not found",
      );
    }
  }
  return cases;
}

export async function listFixtureCases(
  provider: FixtureProvider | undefined,
  rawSelection: unknown,
): Promise<readonly FixtureCaseRef[]> {
  try {
    return await listFixtureCasesInternal(provider, rawSelection);
  } catch (error) {
    if (error instanceof CoreLoopException) throw error;
    throw new CoreLoopException("INTERNAL_ERROR", "An internal error occurred");
  }
}
