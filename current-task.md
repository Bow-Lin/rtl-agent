# Current Task

## Goal

Repair the locked VerilogEval Prob099 verification testbench during dataset preparation while
preserving upstream archive provenance and cold-start reproducibility.

## Current Status

Implementation and validation are complete. VerilogEval preparation now applies lock-declared
patches after archive SHA validation and safe extraction but before the repaired content manifest
is validated. Each patch locks its logical path, source SHA, literal replacement counts, and result
SHA.

The production patch changes all 27 `Y2` tokens to `Y1` and all 27 `Y4` tokens to `Y3` only in
`Prob099_m2014_q6c_test.sv`. The pinned upstream archive and archive SHA remain unchanged. The
repaired dataset is identified as `v2-c498220d-prob099fix1` with manifest digest
`sha256:403633924c1491de25b7cc896cedd1500594930ef0c00a174adc1040d476d210`.

A real cold preparation completed with `reused: false`; a second run reused the valid cache, and
`fixtures-check` reported 156 cases. The repaired file has its locked result SHA and contains no
`Y2`/`Y4`. Historical Pi/K3 candidate `b-20260731-002` compiled and simulated against the repaired
fixture with 0 mismatches in 200 samples. Historical batch evidence remains unchanged.

Typecheck, lint, build, focused Provider/CLI tests, and real preparation/simulation passed. The
Agent-adapter regression now verifies dynamic injection of the selected guidance instead of
requiring v1-specific headings or wording, so operators may switch guidance revisions without
editing source tests. The ordinary full suite passes 281 tests with two skipped. Prettier, session
JSON, repaired-dataset assertions, `git diff --check`, and the equivalent Windows Harness check
also pass.

## Next Boundary

Use the repaired dataset identity for future VerilogEval batches. If desired, re-simulate historical
Prob099 candidates as supplemental evidence without mutating their original batch results.

## Last Updated

2026-08-04T08:42:01+08:00
