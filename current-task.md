# Current Task

## Goal

After each VerilogEval or ChipBench candidate is generated and compiled, run functional simulation
inside the same case lifecycle. If the result is a mismatch, perform a bounded RTL
debug/regeneration loop before moving to the next case. The maximum extra repair turns are
operator-configurable and default to 3.

## Current Status

Implemented and validated. Candidate functional simulation now runs before final RTL evidence is
sealed. A mismatch writes a structured public feedback file and schedules another Agent turn; that
candidate is compiled, final-recompiled, and simulated with the same private verification assets.
The loop ends on functional pass, invalid verification, another terminal run outcome, or exhausted
repair budget.

Both `run` and `evaluate` accept `--functional-repair-iterations <0-10>`. The default is 3 and zero
disables repair. Initial generation does not consume the repair budget; every extra Agent turn does,
including a turn that produces a compile error. The selected maximum is part of evaluation-profile
identity and final functional evidence. Per-attempt simulation evidence and final per-case repair
counts are retained without exposing reference RTL or dataset testbenches to the Agent.

The complete change set passed guarded landing review for the confirmed VerilogEval/ChipBench
scope and is ready to commit on `master`.

## Validation

- Focused lifecycle, simulation, Agent-input, and CLI tests: 5 files / 72 tests passed
- Full repository tests: 39 passed / 1 skipped files; 314 passed / 2 skipped tests
- Frozen dependency install, typecheck, build, lint, Prettier, and peer dependency checks: passed
- Real Icarus integration: 2 passed / 1 skipped files; 7 passed / 1 skipped tests
- `git diff --check` and the Git Bash Harness check: passed

No model-backed VerilogEval/ChipBench batch was run because it would consume model quota. No
production Linux or authoritative Gate claim is made.

## Next Boundary

Return to the Memory V1 contract. Functional mismatch and repair-attempt evidence now exists for
future `simulation_debug` extraction, but Memory read/write/frozen semantics, backend scope,
snapshot identity, structured selection, and extraction policy still need to be frozen before
Memory implementation.

TODO: add the same functional-simulation and bounded-repair composition for CVDP after its
repository Provider, evaluation profile, and functional-simulation adapter exist. The current
support guarantee is limited to VerilogEval and ChipBench.

## Last Updated

2026-08-10T10:56:48+08:00
