import { describe, expect, it } from "vitest";

import { createSpecUnderstandingTemplate } from "../src/index.js";

const SPEC_DIGEST = `sha256:${"1".repeat(64)}`;
const DUT_DIGEST = `sha256:${"2".repeat(64)}`;

describe("Spec-understanding Markdown templates", () => {
  it("creates different best-effort templates for facts, RTL, and verification tasks", () => {
    const facts = createSpecUnderstandingTemplate({
      taskKind: "SPEC_FACTS",
      specDigest: SPEC_DIGEST,
    });
    const rtl = createSpecUnderstandingTemplate({
      taskKind: "RTL_GENERATION",
      specDigest: SPEC_DIGEST,
    });
    const verification = createSpecUnderstandingTemplate({
      taskKind: "VERIFICATION_PLANNING",
      specDigest: SPEC_DIGEST,
      dutManifestDigest: DUT_DIGEST,
    });

    expect(facts).toContain("task_kind: SPEC_FACTS");
    expect(facts).toContain("## Functional Behavior");
    expect(rtl).toContain("## Implementation Approach");
    expect(rtl).toContain("## Requirement Coverage");
    expect(verification).toContain(`dut_manifest_digest: ${DUT_DIGEST}`);
    expect(verification).toContain("## Assertion, Checker, and Testbench Ideas");
  });

  it("requires a DUT identity only for verification planning", () => {
    expect(() =>
      createSpecUnderstandingTemplate({
        taskKind: "VERIFICATION_PLANNING",
        specDigest: SPEC_DIGEST,
      }),
    ).toThrow();

    expect(() =>
      createSpecUnderstandingTemplate({
        taskKind: "SPEC_FACTS",
        specDigest: SPEC_DIGEST,
        dutManifestDigest: DUT_DIGEST,
      }),
    ).toThrow();
  });

  it("rejects an invalid trusted Spec digest before creating a template", () => {
    expect(() =>
      createSpecUnderstandingTemplate({
        taskKind: "RTL_GENERATION",
        specDigest: "not-a-digest",
      }),
    ).toThrow();
  });
});
