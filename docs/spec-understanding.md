# Spec Understanding Markdown Templates

## Purpose

The Spec Understanding module provides task-specific Markdown starting points for model-generated
analysis. Markdown remains the primary human- and Agent-readable artifact; the MVP does not require
a duplicate JSON representation.

The module provides:

- separate templates for Spec facts, RTL-generation analysis, and DUT-aware verification planning
- trusted caller input validation for the task kind and Spec/DUT identities
- lightweight frontmatter that carries those identities into the prompt artifact

The model is expected to fill the document on a best-effort basis. The generated Markdown is not
parsed or rejected based on headings, tables, requirement IDs, completeness, or other formatting
rules.

## Artifact Flow

```text
spec.md
  -> spec-understanding.md (SPEC_FACTS)
       -> rtl-generation-brief.md (RTL_GENERATION)
       -> verification-plan.md (VERIFICATION_PLANNING + immutable DUT manifest)
            -> later assertion/checker/TB generators
```

`SPEC_FACTS` should stay grounded in `spec.md`. `RTL_GENERATION` should explain how the interpreted
requirements could be implemented as RTL. `VERIFICATION_PLANNING` may combine the Spec with DUT
observations to identify behaviors and risks to test, while keeping DUT observations distinguishable
from Spec expectations.

## Trusted Template Inputs

`createSpecUnderstandingTemplate` accepts a task kind and trusted artifact digests. The caller must
provide a valid Spec digest for every task and a DUT manifest digest only for
`VERIFICATION_PLANNING`:

```ts
createSpecUnderstandingTemplate({
  taskKind,
  specDigest,
  dutManifestDigest?,
});
```

The generated starting point contains this frontmatter:

```yaml
---
schema_version: 1
task_kind: SPEC_FACTS
spec_digest: sha256:<64 lowercase hex characters>
dut_manifest_digest: null
status: DRAFT
---
```

This validation protects inputs controlled by the workflow before model generation. It is not a
schema for accepting or rejecting the model's completed document: the model may reorganize or
expand the Markdown when that produces a clearer analysis.

## Task-Specific Guidance

The three templates intentionally emphasize different decisions:

- `SPEC_FACTS`: module interface, functional behavior, timing, boundaries, ambiguities, and
  contradictions grounded in the Spec
- `RTL_GENERATION`: interpreted module contract, implementation approach, requirement coverage,
  risks, and unresolved questions
- `VERIFICATION_PLANNING`: Spec-versus-DUT understanding, behaviors and risks to test, assertion,
  checker, and testbench ideas, coverage targets, and remaining uncertainty

These headings are prompt guidance, not an acceptance grammar. Requirement IDs, citations, tables,
or other traceability conventions may still be useful, but this MVP does not require or validate
them.

## Current Boundary

The implementation creates templates only. It does not call a model, judge semantic correctness,
generate RTL/TB/SVA, or integrate the result with workflow state. A human or a downstream model must
judge whether a completed analysis is useful for its task.

If a later workflow needs deterministic machine consumption, introduce a separate, explicitly
versioned structured result or validator based on that concrete consumer's requirements. Do not
assume the current free-form Markdown is machine-validated.
