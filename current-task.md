# Current Task

## Goal

Connect the locked FreeCores I2C baseline to an Agent-driven coverage-improvement flow through a
new command, without changing the existing `core-loop:coverage` command.

## Current Status

Implementation and scoped validation are complete. The new command is
`corepack pnpm core-loop:i2c-coverage --agent <pi|opencode>`. It validates and normalizes the exact
seven-file baseline, measures the unchanged baseline in round one, and permits at most two Agent
turns that may edit only `rtl/tb.sv` and `rtl/checker.sv`.

The normalized baseline completed a real Windows Verilator round at 78.16% aggregate coverage
(359/443 lines, 20/28 branches, and 553/740 toggles). No real Agent refinement run was performed,
so no Agent coverage-gain claim is made. Results remain non-authoritative and require semantic
human review.

The latest completed full-dataset VerilogEval guidance experiment ran on common-guidance v1. The
I2C workflow is a separate experiment and does not alter that historical identity. An unrelated
user-owned worktree edit currently changes active `common-guidance.md` to v2; it is outside this
task and must not be included silently in the I2C commit.

## Next Boundary

Complete the guarded commit-main review and land only the reviewed I2C implementation and handoff
files. Later, run the new command with a selected Agent and perform semantic human review if a real
coverage-improvement experiment is intended.

## Last Updated

2026-08-03T11:40:00+08:00
