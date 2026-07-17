# Spec-to-RTL Core Loop Evaluation Report

## Status

`NOT_EXECUTED` — R04 mechanics are implemented, but no operator-selected, license-reviewed dataset Provider and versioned evaluation profile are registered. This document must not contain synthetic-test metrics or a checkpoint recommendation.

## Required Locked Inputs

- evaluation profile ID and digest
- Provider adapter ID/version and implementation digest
- dataset ID/version/source digest/license reference
- split, selection rule, expected case count, and ordered case IDs digest
- per-case normalized fixture digests and batch input manifest digest
- OpenCode version/provider/model and effective config/permission/Agent/Skill/experiment digests
- Icarus executable/version/profile digests
- `CoreLoopRunProfile.maxAttempts`, thresholds, and human review sampling rule

## Mechanics Evidence

The implemented harness:

- materializes and baseline-validates all selected fixtures before the first Agent turn
- executes at most `maxAttempts` total Agent turns and continues only after `COMPILE_ERROR`
- consumes strict R02 outcomes and persists no raw OpenCode JSONL/reasoning/tool payloads
- writes unconditional compile-preparation evidence and conditional compile results
- independently rebuilds and recompiles every candidate pass
- leaves evidence-failed or unscannable runs incomplete instead of manufacturing `FinalResult`
- reports overall, Blank Generation, and Seeded Compile Repair metrics with explicit numerators and denominators
- keeps policy/no-change/Agent failure/timeout in the capability denominator
- keeps raw compiler-confirmed metrics separate from human-review-adjusted metrics

Synthetic fake-adapter tests and the fake-Agent/real-Icarus integration validate mechanics only. They are not dataset evaluation evidence.

## Dataset and Batch

Pending operator registration.

## Results

Pending real locked batch. Report raw and review-adjusted first-attempt, within-max-attempts, and repair-recovery rates, attempt/time medians, failure taxonomy, diagnostic coverage, category slices, infrastructure-invalid cases, and not-executed cases.

## Human Review

Pending the predeclared review sample. Record accepted and `COMPILE_PASS_BUT_REVIEW_REJECTED` runs without changing original R03 compiler results.

## Limitations

Every result remains `authoritative: false` with claim `COMPILE_ONLY`. Compile/elaboration and a quick human inspection do not prove functional correctness, testbench correctness, Linux readiness, immutable-snapshot trust, or formal Gate acceptance.

## Checkpoint Recommendation

`PENDING_REAL_BATCH`

Do not select `PROCEED_TO_FUNCTIONAL_VALIDATION`, `REFINE_CORE_LOOP_ONCE`, or `STOP_OR_RETHINK` until the locked real batch and required human review are complete.
