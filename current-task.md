# Current Task

## Goal

Create a shorter common-guidance v2 candidate from the original-guidance and v1 Pi/K3 VerilogEval
results and their mismatch/compile analyses, without activating the candidate or rerunning models.

## Current Status

R05 is `DONE` as of 2026-07-30.

The inactive `config/agents/rtl-core-loop/common-guidance_v2.md` candidate is complete. It is based
on the original run's 131/156 result and v1's 130/156 result, including the 10 improvements, 11
regressions, 15 v1 mismatches, and 10 repeated Icarus enum/state compile failures.

v2 keeps timing, Moore/Mealy, exact index/width, FSM transition, bit mapping, and counter-boundary
checks. It replaces v1's mandatory pre-coding process with conditional analysis, prefers the
smallest specification-faithful implementation, forbids unrequested latency/state/reset behavior,
and defaults FSM encodings to `logic` plus `localparam logic`. At 98 lines and 915 words it is
shorter than v1's 123 lines and 1,188 words.

The active `config/agents/rtl-core-loop/common-guidance.md` is v1. The latest full-dataset
experiment explicitly activated that content and recorded one consistent v1 guidance digest across
all three batches and v1 content in all 156 generation transcripts. Creating v2 did not change the
active v1 guidance and made no additional model call, RTL generation, compile, or simulation.
Scoped content assertions, Prettier, session-state JSON parsing, `git diff --check`, and the Harness
check pass. R04 and R05 remain `DONE`.

## Next Boundary

Review and explicitly activate v2 only if an experiment is intended. Then run separately identified,
preferably repeated A/B trials or held-out cases before making a general capability claim.

## Last Updated

2026-08-03T10:40:31+08:00
