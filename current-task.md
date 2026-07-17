# Current Task

## Goal

Implement R04 as a bounded, non-authoritative Core Loop that composes the completed R01 fixture boundary, R02 restricted Agent turn, and R03 fixed Icarus compile adapter without duplicating or weakening their established contracts.

## Current Status

R04 is `IN_PROGRESS`.

Reusable single-run/batch orchestration, batch preflight, conditional and exclusive evidence, independent final recompile, raw/review-adjusted metrics, human-review publication, and thin CLI behavior are implemented and validated. R02 effective isolation was also narrowed explicitly without changing its established turn protocol.

A real checkpoint batch cannot run until an operator selects and license-reviews a concrete dataset/provider and registers a versioned evaluation profile.

## Locked Implementation Boundaries

- `maxAttempts` is total Agent turns; baseline is attempt zero.
- only R02 `RTL_CHANGED` is compile-eligible.
- only R03 `COMPILE_ERROR` can start another Agent turn.
- raw OpenCode JSONL, reasoning, full Assistant text, and tool payloads are never R04 evidence.
- every compile preparation is evidence; compile results exist only when the compiler was invoked.
- strict `FinalResult` is written last only for evidence-complete runs with a trustworthy final RTL manifest.
- invalid fixtures and incomplete runs remain batch-level records rather than new R01 final outcomes.
- all results remain `authoritative: false` and `claim: "COMPILE_ONLY"`.

## Validation Baseline

- lint, typecheck, build, format, peer dependency, frozen-install, package, and full-repository checks pass.
- Core Loop ordinary tests: 12 files passed / 1 skipped; 88 tests passed / 2 skipped.
- thin CLI tests: 1 file and 5 tests passed.
- full repository: 26 files passed / 1 skipped; 194 tests passed / 2 skipped in three consecutive isolated runs.
- real Icarus integration: 2 files and 6 tests passed, including synthetic R04 baseline/repair/final-recompile composition.
- real OpenCode 1.18.2 static probe and two live restricted-Agent smoke tests pass.
- unconfigured fixture discovery fails closed with `DATASET_NOT_CONFIGURED`, as required.
- Windows checkout now keeps `.mjs` configuration files at LF, so the same Prettier check is stable on `windows-latest`.

These are mechanics checks only. Real Linux execution remains unavailable and no formal Gate, functional-correctness, dataset capability, or checkpoint claim is permitted.

## Current Plan

1. Operator selects and license-reviews a real dataset and repository-owned Provider implementation.
2. Register a versioned evaluation profile locking the Provider digest, ordered cases, Agent/compiler capabilities, thresholds, and review rule.
3. Execute the real batch, complete the predeclared human review, fill the report, and record exactly one checkpoint recommendation.

## External Completion Requirement

R04 remains incomplete until a real operator-selected dataset/provider/profile batch and human review produce the required report and checkpoint recommendation. Synthetic tests, the R02 live smoke, and the R04 real-Icarus composition test must not supply those metrics.

## Last Updated

2026-07-17T17:26:51+08:00
