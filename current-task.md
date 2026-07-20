# Current Task

## Goal

Implement R04 as a bounded, non-authoritative Core Loop that composes the completed R01 fixture boundary, R02 restricted Agent turn, and R03 fixed Icarus compile adapter without duplicating or weakening their established contracts.

## Current Status

R04 is `IN_PROGRESS`.

Reusable single-run/batch orchestration, batch preflight, conditional and exclusive evidence, independent final recompile, raw/review-adjusted metrics, human-review publication, and thin CLI behavior are implemented and validated. R02 effective isolation was also narrowed explicitly without changing its established turn protocol.

The operator selected NVlabs VerilogEval v2 and ChipBench without submodules. Repository-owned Providers, pinned archive/cache preparation, source/content/implementation digests, MIT license metadata, all 156 VerilogEval `spec-to-rtl` cases, and 223 ChipBench generation/debugging cases are implemented and validated. Ignored local caches contain only allowlisted license/dataset content; reference/testbench files never enter Agent workspaces.

ChipBench exposes 45 generation cases as `BLANK_GENERATION` and 178 prompt-embedded debugging cases as `PROMPTED_FUNCTIONAL_REPAIR`. The latter remains a separate compile-only metric category: compile success does not prove the timing, assignment, arithmetic, or state-machine bug was functionally repaired.

A real checkpoint batch cannot run until the operator records the final license-review disposition and registers a versioned evaluation profile with its case selection, capabilities, thresholds, and human-review rule.

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
- Core Loop ordinary tests: 13 files passed / 1 skipped; 92 tests passed / 2 skipped.
- thin CLI tests: 1 file and 6 tests passed.
- full repository: 27 files passed / 1 skipped; 199 tests passed / 2 skipped.
- real Icarus integration: 2 files and 6 tests passed, including synthetic R04 baseline/repair/final-recompile composition.
- real OpenCode 1.18.2 static probe and two live restricted-Agent smoke tests pass.
- the pinned VerilogEval archive prepared successfully; `fixtures-check` validates the locked manifest and reports 156 `spec-to-rtl` cases.
- the pinned ChipBench archive prepared successfully; its check validates the 683-file manifest and reports 45 generation plus 178 debugging cases across 11 splits.
- Windows checkout now keeps `.mjs` configuration files at LF, so the same Prettier check is stable on `windows-latest`.

These are mechanics checks only. Real Linux execution remains unavailable and no formal Gate, functional-correctness, dataset capability, or checkpoint claim is permitted.

## Current Plan

1. Choose the locked VerilogEval or ChipBench selection and record the operator's final MIT/license-review disposition.
2. Register a versioned evaluation profile locking the selected Provider digest, ordered case selection, Agent/compiler capabilities, thresholds, and review rule.
3. Execute the real batch, complete the predeclared human review, fill the report, and record exactly one checkpoint recommendation.

## External Completion Requirement

R04 remains incomplete until a locked dataset profile batch and human review produce the required report and checkpoint recommendation. Provider/cache validation, synthetic tests, the R02 live smoke, and the R04 real-Icarus composition test must not supply those metrics.

## Last Updated

2026-07-20T10:35:00+08:00
