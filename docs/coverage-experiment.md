# Verilator Coverage Agent Experiment

This document describes the existing single-case VerilogEval command. The FreeCores I2C baseline
uses the separate `core-loop:i2c-coverage` command documented in
`docs/i2c-coverage-experiment.md`; the existing command and its case semantics are unchanged.

This is a minimal, non-authoritative verification loop for one locked VerilogEval case. It uses the
case prompt as `spec.md` and the case reference model as `rtl/dut.sv`. The Provider deterministically
renames the dataset's `RefModule` declaration to the spec-facing `TopModule`. The upstream
`*_test.sv` is not materialized into the run and is never shown to the Agent or passed to Verilator.

## Run

On the validated default Windows MSYS2 UCRT64 installation:

```powershell
corepack pnpm core-loop:coverage --case Prob001 --agent opencode
```

`--case` accepts the exact case ID or a case-insensitive unique prefix, so `Prob001` resolves to
`Prob001_zero`. An ambiguous or missing prefix fails before any Agent call.

Each new run is grouped by the resolved case ID and named with the local start time:

```text
.rtl-agent/coverage-runs/Prob131_mt2015_q4/run_20260728-153045-123/
```

The timestamp uses `YYYYMMDD-HHmmss-SSS`, so directory names sort chronologically. If two runs of
the same case start in the same millisecond, the later directory receives `-001`, `-002`, and so
on. The evidence JSON retains its UUID `runId` as the internal protocol identity; only the directory
display name uses time. Historical UUID-named directories remain in place and are not migrated.

The default Windows executable automatically receives the matching
`VERILATOR_ROOT=C:\msys64\ucrt64\share\verilator`, UCRT64/MSYS PATH entries, and the validated GCC
ABI flag. Set the `RTL_AGENT_VERILATOR_*` variables explicitly only when using another installation;
an overridden executable is responsible for its own environment.

Use `--agent pi` to select the existing Pi backend. The Agent may read only `spec.md`, `context/**`,
and `rtl/**`. In verification mode it must leave `rtl/dut.sv` unchanged and create or improve:

- `rtl/tb.sv`, with top module `tb`, a `TopModule` instance, bounded stimulus, and `$finish`
- `rtl/checker.sv`, with module `tb_checker` and at least one assertion

The orchestrator verifies the DUT digest and these minimum structural requirements after every
Agent turn. If TB/checker structure, an assertion, or its `$fatal` failure path is missing, the
orchestrator writes `context/verification-feedback-attempt-<n>.json` and gives the Agent a bounded
repair turn before starting Verilator. Asset-repair attempts do not consume the two coverage rounds.
If Verilator returns source-bound compile errors in generated `rtl/tb.sv` or `rtl/checker.sv`, the
orchestrator writes `context/verilator-compile-feedback-attempt-<n>.json` with bounded path, line,
column, and message fields, then gives the Agent a repair turn without consuming a coverage round.
Errors in `rtl/dut.sv`, process startup, timeout/termination, simulation, and coverage conversion
remain terminal. The DUT digest is checked after every Agent turn.
The total Agent budget is still bounded. If it is exhausted after at least one successful coverage
run, the experiment stops as `MAX_AGENT_ATTEMPTS` and requires human review.

## Loop and evidence

Verilator runs with fixed argv, `shell: false`, `--binary`, `--timing`, `-Wno-fatal`, line coverage,
and toggle coverage. The raw report is split by its preserved Verilator type before conversion:
line records are converted to LCOV, while toggle records remain explicitly typed. Line coverage is
the primary score and supplementation signal. A DUT with no instrumentable line point, such as a
single continuous assignment, falls back to DUT toggle coverage instead of being reported as an
empty 100% score. A report with neither DUT line nor toggle points fails explicitly. Warnings remain
visible in evidence but do not replace real compilation errors. Build, simulation, and
coverage-conversion process records are written below
`evidence/coverage/round-<n>-attempt-<n>/`, so a failed compile and its retry never overwrite each
other. LCOV is filtered to `rtl/dut.sv` and converted into bounded
structured line/branch/toggle targets in `workspace/context/coverage-round-<n>.json`. A second Agent turn,
when needed, receives that path and is instructed to add focused stimulus without weakening the
checker.

The default loop stops after at most two rounds when one of these conditions is met:

- coverage score reaches 90%
- no uncovered DUT target remains
- coverage gain is less than 0.5 percentage points
- the maximum round count is reached
- Agent, asset-policy, DUT-integrity, compilation, simulation, or coverage conversion fails

The final result is `evidence/coverage-experiment-result.json`. Successful execution remains
`PENDING_HUMAN_REVIEW`; it never becomes authoritative automatically.

## Required human review

Before accepting generated verification assets, a reviewer must confirm:

1. checker behavior matches the specification and is not self-fulfilling
2. assertion sampling/timing is correct
3. the DUT was not modified
4. any remaining uncovered targets are understood and accepted

Structural coverage alone does not prove functional correctness. This Windows workflow is
exploratory host evidence and does not replace the Linux formal RTL Gate.
