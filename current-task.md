# Current Task

## Goal

Prepare the Core Loop for Memory V1 by running VerilogEval and ChipBench functional simulation
case by case: each case must finish Agent generation, candidate compile/repair, and functional
verification before the next case's Agent turn starts.

## Current Status

Implemented and validated. The batch evaluator exposes an awaited optional case-completion
boundary. The VerilogEval and ChipBench CLI uses it to run Icarus/VVP functional verification and
persist per-case evidence immediately after each completed compile run. The existing batch
functional execution API and ChipBench/VerilogEval forwarding wrappers were removed; the final
summary schemas remain compatible.

A completion-boundary infrastructure failure no longer discards the compile batch result: later
completion callbacks are skipped, compile-only case processing finishes, the batch result is
published, and the original failure is then reported.

The complete 13-file change set passed a fresh guarded landing review with no P1/P2 finding and is
ready to commit on `master`.

## Validation

- Focused batch, functional-simulation, and CLI tests: 42 passed
- Full repository tests: 39 passed / 1 skipped files; 307 passed / 2 skipped tests
- Frozen dependency install: passed
- Typecheck, build, lint, Prettier, and peer dependency checks: passed
- Real Icarus integration: 2 passed / 1 skipped files; 7 passed / 1 skipped tests
- `git diff --check` and the Git Bash Harness check: passed

No model-backed dataset batch was run because it would consume model quota. No production Linux,
formal-Gate, or authoritative functional-verification claim is made.

## Next Boundary

Freeze the Memory V1 execution contract before implementation: Pi-only/backend scope, Memory root
and snapshot identity, read/write/frozen semantics, structured Selector/Extractor/Manager output,
and the policy for consuming the new per-case functional evidence. A functional mismatch still
does not trigger an RTL repair turn.

## Last Updated

2026-08-10T10:09:36+08:00
