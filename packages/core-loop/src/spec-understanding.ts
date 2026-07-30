import { Sha256DigestSchema } from "@rtl-agent/contracts";
import { z } from "zod";

export const SpecUnderstandingTaskKindSchema = z.enum([
  "SPEC_FACTS",
  "RTL_GENERATION",
  "VERIFICATION_PLANNING",
]);

export const SpecUnderstandingStatusSchema = z.enum(["DRAFT", "NEEDS_REVIEW", "READY"]);

export const SpecUnderstandingFrontmatterSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    taskKind: SpecUnderstandingTaskKindSchema,
    specDigest: Sha256DigestSchema,
    dutManifestDigest: Sha256DigestSchema.nullable(),
    status: SpecUnderstandingStatusSchema,
  })
  .superRefine((value, context) => {
    const requiresDut = value.taskKind === "VERIFICATION_PLANNING";
    if (requiresDut !== (value.dutManifestDigest !== null)) {
      context.addIssue({
        code: "custom",
        path: ["dutManifestDigest"],
        message: requiresDut
          ? "Verification planning requires a DUT manifest digest"
          : "Spec facts and RTL generation must not bind a DUT manifest",
      });
    }
  });

export type SpecUnderstandingTaskKind = z.infer<typeof SpecUnderstandingTaskKindSchema>;
export type SpecUnderstandingFrontmatter = z.infer<typeof SpecUnderstandingFrontmatterSchema>;

function frontmatterText(value: SpecUnderstandingFrontmatter): string {
  return [
    "---",
    `schema_version: ${String(value.schemaVersion)}`,
    `task_kind: ${value.taskKind}`,
    `spec_digest: ${value.specDigest}`,
    `dut_manifest_digest: ${value.dutManifestDigest ?? "null"}`,
    `status: ${value.status}`,
    "---",
  ].join("\n");
}

function specFactsTemplate(frontmatter: SpecUnderstandingFrontmatter): string {
  return `${frontmatterText(frontmatter)}

# Spec Understanding

## Module Interface

<!-- Describe the module name, ports, directions, widths, clocks, and resets as clearly as possible. -->

## Functional Behavior

<!-- Summarize explicit behavior, timing, priority, invariants, and boundary conditions. -->

## Ambiguities and Contradictions

<!-- Preserve anything uncertain instead of inventing an authoritative answer. -->

None identified.
`;
}

function rtlGenerationTemplate(frontmatter: SpecUnderstandingFrontmatter): string {
  return `${frontmatterText(frontmatter)}

# RTL Generation Brief

## Interpreted Module Contract

<!-- Describe the interface and externally visible behavior the RTL should implement. -->

## Implementation Approach

<!-- Propose state, datapath, reset, timing, priority, and boundary-handling choices. -->

## Requirement Coverage

<!-- Explain how the proposed implementation addresses the important Spec requirements. -->

## Risks and Unresolved Questions

None identified.
`;
}

function verificationPlanningTemplate(frontmatter: SpecUnderstandingFrontmatter): string {
  return `${frontmatterText(frontmatter)}

# Verification Plan

## Spec and DUT Understanding

<!-- Keep Spec expectations separate from observations about the immutable DUT. -->

## Behaviors and Risks to Test

<!-- Identify normal, boundary, priority, reset, timing, and likely conformance-risk scenarios. -->

## Assertion, Checker, and Testbench Ideas

<!-- Suggest temporal properties, end-to-end checks, directed scenarios, and reusable stimulus. -->

## Coverage and Remaining Uncertainty

<!-- Describe useful coverage targets and any behavior that cannot yet be verified confidently. -->

None identified.
`;
}

export function createSpecUnderstandingTemplate(options: {
  readonly taskKind: SpecUnderstandingTaskKind;
  readonly specDigest: string;
  readonly dutManifestDigest?: string;
}): string {
  const frontmatter = SpecUnderstandingFrontmatterSchema.parse({
    schemaVersion: 1,
    taskKind: options.taskKind,
    specDigest: options.specDigest,
    dutManifestDigest: options.dutManifestDigest ?? null,
    status: "DRAFT",
  });
  if (frontmatter.taskKind === "SPEC_FACTS") return specFactsTemplate(frontmatter);
  if (frontmatter.taskKind === "RTL_GENERATION") return rtlGenerationTemplate(frontmatter);
  return verificationPlanningTemplate(frontmatter);
}
