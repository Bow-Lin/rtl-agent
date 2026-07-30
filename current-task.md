# Current Task

## Goal

Implement R05 as task-aware Spec Understanding Markdown templates. Keep Markdown as the primary
artifact, give RTL generation and DUT-aware verification different analysis guidance, and let a
future model produce the completed document on a best-effort basis without format checking.

## Current Status

R05 is `DONE` as of 2026-07-30.

Implemented the template boundary in `packages/core-loop/src/spec-understanding.ts`:

- `SPEC_FACTS`, `RTL_GENERATION`, and `VERIFICATION_PLANNING` task kinds
- visibly different task-specific Markdown guidance
- trusted task-kind and Spec digest validation before template creation
- required DUT manifest binding for verification planning only
- no parser or Checker for the model-generated Markdown

The focused template suite passes 3/3 tests. The full repository single-worker run passes 37 files
with one skipped and 276 tests with two skipped. Lint, typecheck, build, format, and peer dependency
checks pass; session-state JSON, diff, and Harness checks also pass. Model/Agent invocation,
semantic scoring, completed-Markdown format validation, and direct RTL/assertion/checker/TB
generation remain out of scope for this MVP.

R04 remains `DONE`; its accepted evidence and limitations are recorded in the task breakdown and
checkpoint report. The existing uncommitted R04 completion-record changes are preserved in this
worktree.

## Next Boundary

Wait for explicit operator direction before selecting an Agent/model integration, defining derived
assertion/checker/TB generation contracts, or connecting these artifacts to the durable workflow.

## Last Updated

2026-07-30T17:25:08+08:00
