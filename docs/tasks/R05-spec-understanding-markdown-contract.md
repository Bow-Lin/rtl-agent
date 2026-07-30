# R05 — Spec Understanding Markdown Template MVP

## Status

`DONE` (2026-07-30)

## Goal

Provide small, task-aware Markdown templates that help a future model produce different kinds of
Spec analysis without forcing the natural-language result into a premature machine-checked schema.

## Scope

- `SPEC_FACTS` template grounded in `spec.md`
- `RTL_GENERATION` template focused on how to implement the interpreted Spec as RTL
- `VERIFICATION_PLANNING` template combining Spec expectations with an immutable DUT identity
- trusted task-kind and Spec/DUT digest validation before template creation
- focused deterministic template and input-boundary tests

## Out of Scope

- model or Agent invocation
- generated Markdown format, heading, completeness, or traceability validation
- semantic correctness scoring of natural-language analysis
- direct RTL, assertion, checker, or testbench generation
- workflow database/state integration
- formal verification or simulation

## Acceptance

- Markdown remains the primary artifact; no duplicate analysis JSON is required.
- Spec Facts, RTL generation, and verification planning receive visibly different guidance.
- Every template is created from a valid trusted Spec digest.
- Verification planning requires a DUT manifest digest; the other task kinds do not accept one.
- The completed model output remains best effort and is not rejected for Markdown shape.
- Focused tests, full repository tests, lint, typecheck, build, format, diff, and Harness checks pass.

## Acceptance Evidence

- focused Spec Understanding template suite: 3/3 passed
- full repository single-worker run: 37 files passed / 1 skipped; 276 tests passed / 2 skipped
- lint, typecheck, build, format, and peer dependency checks passed
- final diff, JSON, and Harness results are recorded in `.harness/session-log.md`
