# Current Task

## Goal

Make ChipBench zero-shot debugging a command-selected seeded-RTL task and validate each split's
original buggy RTL once for reuse across later Debug batches.

## Current Status

Implementation and local validation are complete:

- `debug-baseline-prepare` extracts the locked target `TopModule` for every Case in one zero-shot
  Debug split, compiles and simulates it with private verification assets, and accepts only a
  positive functional mismatch.
- The baseline cache is content-addressed by dataset/case order, Provider implementation, compiler
  capability, VVP binary, and runner version. Existing cache contents are schema-, digest-, and
  identity-validated before reuse.
- `debug-evaluate` requires the matching cache. It never falls back to rerunning baseline
  simulations inside a Batch.
- Debug materialization records `SEEDED_FUNCTIONAL_REPAIR`; the evaluation profile records
  `SEEDED_FUNCTIONAL_DEBUG`; the Agent input records `FUNCTIONAL_DEBUG` and starts with the buggy RTL
  already below `rtl/`.
- The ordinary `evaluate` generation path still uses the prompt-only ChipBench Provider.
- Debug v1 requires `--memory-mode off` and defaults to zero additional feedback-repair iterations.
  Memory/Experience behavior for seeded Debug is intentionally deferred.
- The assignment split's 30 Cases prepared successfully on the local Windows Icarus/VVP toolchain.
  A second invocation returned `reused: true` with the same manifest digest
  `sha256:c19159fe6a9d84d625fda6991a5cf27b15dafca918ff359451345b296e544897`.

## Commands

```powershell
corepack pnpm core-loop:debug-baseline:chipbench --split debug-zero-shot-assignment
corepack pnpm core-loop:debug:chipbench:pi --split debug-zero-shot-assignment
```

The first command is required once for each split/toolchain identity. The second command performs
the model-backed experiment and was not run during implementation validation.

## Validation Boundary

Deterministic tests, full repository checks, and the real 30-Case baseline prepare/reuse check are
the completion evidence. No Pi/model call, Memory selection, Experience generation, Memory Build,
or Debug evaluation Batch was started.

## Prompt-Only Baseline Report

- Published `exp_result/chipbench/08.14-k3-pi-debug-zero-shot-assignment-baseline.md` from sealed
  ordinary-evaluation Batch `b-20260814-001`. Its 30 prompt-only candidates all compiled and ran;
  19 passed functional simulation and 11 remained mismatches.
- The report pairs those results with the separately prepared seeded starter manifest. All 30 buggy
  starters have a positive mismatch; prompt-only candidates reduced total mismatch samples from
  18,564 to 6,284, with 19 passes, six partial improvements, one unchanged mismatch, and four
  regressions.
- Batch `b-20260814-001` used `prompt-only-v2` and `PROMPTED_FUNCTIONAL_REPAIR`; it is not evidence
  from the new `core-loop:debug:chipbench:pi` command. The next seeded Debug evaluation remains an
  operator action.

## Last Updated

2026-08-14T11:48:32+08:00
