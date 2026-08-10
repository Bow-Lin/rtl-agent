# Current Task

## Goal

Review, validate, and land the accumulated Core Loop, ChipBench, coverage-feedback, guidance, and
experiment-documentation changes on the repository primary branch.

## Current Status

The guarded review is complete with no remaining P1/P2 findings. The operator confirmed that
`common-guidance.md` is intentionally switchable experiment configuration; each batch binds the
actual guidance digest, so the active file does not have to remain aligned with an inactive
candidate decision between experiments. The duplicated v4 decision entry is a non-blocking P3
documentation note.

The accumulated implementation includes split-scoped ChipBench functional evaluation, private
reference/testbench materialization, reusable functional-simulation orchestration, structured
Verilator simulation feedback for repair turns, coverage prompt updates, v3/v4 guidance candidates,
and the completed experiment analyses. The change set is validated and ready for guarded landing on
`master`.

## Validation

- Frozen install, lint, typecheck, build, Prettier, peer dependency checks: passed
- Full repository tests: 39 passed / 1 skipped files; 305 passed / 2 skipped tests
- ChipBench `fixtures-check`: passed for 683 files and all 223 cases across 11 splits
- Real Icarus integration: 2 passed / 1 skipped files; 7 passed / 1 skipped tests
- Real Icarus compile smoke: passed
- Real Verilator coverage integration: passed
- `git diff --check` and the Git Bash Harness check: passed
- A real model-backed `coverage --case` run was not repeated because it would consume model quota;
  deterministic orchestration tests and the real Verilator integration cover the changed boundary

## Next Boundary

After landing, keep runtime experiment evidence immutable. Remove compile/timeout noise before
running repeated paired guidance experiments, and continue tracking strict case accuracy, compile
rate, status transitions, and same-denominator sample mismatch rate separately.

## Last Updated

2026-08-10T08:25:34+08:00
