# Current Task

## Goal

Implement Memory V1 in the frozen order from `docs/memory-v1.md`, preserving Batch snapshot
isolation and learning only from factual successful Case trajectories.

## Current Status

The first implementation milestone is complete. `packages/core-loop/src/experience.ts` now
provides:

- backend-neutral Experience v1 records for `design_observation` and `simulation_debug`;
- deterministic eligibility over sealed Run, compile, final-recompile, and functional evidence;
- terminal pass binding to the Run's final successful outcome and last Agent attempt, with
  status-specific functional fact consistency checks;
- one sealed-Run source of truth for Summarizer request identity and Case-result evidence paths,
  with branded and runtime-validated Run IDs at the direct Pi boundary;
- high-precision exclusion of infrastructure-invalid, compile-failed, exhausted, and final-failed
  repair trajectories;
- a Pi-only isolated Experience Summarizer with read/edit-only policy, one schema-repair turn,
  provenance/kind/tool binding, auditable semantic rejection, and bounded Case result evidence;
- prompt/request-digest Summary workspace identity without overwriting older prompt evidence.

The implementation is not wired into the CLI Case End path yet. Store, Selector, Consolidator,
Memory modes, snapshot publication, and `Relevant RTL Memory` injection are also not implemented.

## Real Regression Evidence

The empty pre-Store snapshot sentinel was fixed as `EMPTY_SNAPSHOT_V1` with zero selectable
Memories. Real Pi 0.81.1 / `kimi-coding` / `k3` trials used repair budget 3 and kept Experience
isolated under ignored Batch evidence.

The successful build trajectory is Batch `b-20260810-006`, Run
`run_7e3ca297-f99b-42c9-8763-3b3675ff5c81`, Case `Prob155_lemmings4`:

1. Attempt 1 compiled/recompiled, then functional simulation reported 114/1003 mismatches.
2. Structured public feedback triggered one Pi repair.
3. Attempt 2 compiled/recompiled and passed 1003/1003 functional samples.
4. Pi produced a current-schema-valid `simulation_debug` Experience describing counter-cycle
   alignment, inclusive threshold semantics, and saturation against long-duration wraparound.

Additional trials proved that unstated initialization and public spec/reference ambiguity are
rejected, while first-try functional passes cannot become `simulation_debug`. A later stochastic
replay falsely claimed that present RTL evidence was absent; the now-auditable rejection exposed
this, but execution-level proof of required file reads is still needed before automatic Case End
wiring.

## Next Implementation Boundary

1. Require and test that the Pi Summarizer actually reads the listed spec/context/initial/final RTL
   evidence before accepting CREATED or REJECTED output.
2. Add `off`, `read_write`, and `frozen` experiment identity plus automatic Case End Experience
   wiring; keep `frozen` Experience inside Batch evidence and publish `read_write` Experience only
   after the Case is sealed.
3. Implement the filesystem Memory Store and empty/validated snapshot loading.
4. Implement deterministic metadata filtering plus Pi Selector, max 3 and fail-open to zero, then
   inject one bounded `Relevant RTL Memory` block.
5. Implement Batch Consolidator and atomic `M_n+1` publication only after all Cases finish.

## Validation

- `corepack pnpm@11.13.0 lint` passed.
- `corepack pnpm@11.13.0 typecheck` passed.
- `corepack pnpm@11.13.0 test` passed: 40 files passed, 1 skipped; 326 tests passed, 2 skipped.
- `corepack pnpm@11.13.0 format:check` passed.
- `git diff --check` passed.
- `C:\Program Files\Git\bin\bash.exe scripts/harness_check.sh` passed.
- Real Pi/Icarus regression passed as described above; it is experimental and non-authoritative.

## Last Updated

2026-08-10T16:48:23+08:00
