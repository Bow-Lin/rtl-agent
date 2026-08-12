# Current Task

## Goal

Analyze the completed full VerilogEval Memory-build run `b-20260811-004` and publish a detailed,
evidence-backed report of the Experience and Memory iteration from `mem-v0001` to `mem-v0002`.

## Current Status

The Memory V1 implementation path remains complete. The new full-run analysis is also complete:

- Published `exp_result/verilog-eval/08.11-k3-pi-memory-v1-full-build.md` from existing runtime
  evidence without starting a model call or rerunning generation, compilation, simulation, or
  diagnosis.
- Confirmed that `b-20260811-004` fixed the empty `mem-v0001` for all 156 Cases, executed 178 Agent
  attempts with no `relevantMemoryPath`, created 128 of 150 eligible Experiences, and published five
  functional-simulation Memories in `mem-v0002` only after the complete Batch.
- Reconstructed the full Experience funnel: 56 first-turn summary acceptance failures, 34 bounded
  recoveries, 22 final `SUMMARIZER_FAILED` results, 117 design observations, 11 successful repair
  records, ten retained repair records, and one over-specific repair rejection.
- Audited all 128 consolidation indexes exactly once, the five ADD and four grouped REJECT operations,
  the three required Consolidator reads, the item provenance, six-section item format, and snapshot
  lineage/digest.
- Added an attempt-depth result comparison: 139 Cases passed on the first candidate, 11 first passed
  after one repair, none first passed after two or three repairs, and six remained unsuccessful.
- Corrected the initial-result breakdown to 15 functional mismatches and two compile failures; the
  report now lists the exact terminal evidence for every unsuccessful Case.

The implementation guarantees remain:

- Pi Experience Summarizer acceptance requires audited reads of the exact spec, input contract,
  schema, and listed initial/final RTL evidence.
- CLI evaluation records `off`, `read_write`, or `frozen` Memory identity. Active modes require Pi;
  `frozen` requires an explicit snapshot, while `read_write` requires the current split in the
  explicit build-split allowlist and can only extend the latest snapshot.
- Every Batch fixes one validated filesystem snapshot before Agent execution. Snapshot manifests
  bind canonical catalog/item content, parent snapshot, source Batch, count, and SHA-256; publication
  uses a validated staging directory and atomic rename without overwriting an existing snapshot.
- Initial generation and each functional-mismatch repair run deterministic catalog filtering followed
  by a Pi Selector. Acceptance requires audited reads of the spec, filtered catalog, and repair
  feedback when present. Invalid output and Pi failures fail open to zero selections. At most three
  selected items are injected once per turn through a bounded `Relevant RTL Memory` block.
- Case End generates best-effort Experience from the sealed Run and complete attempt-scoped functional
  history. `frozen` keeps it under Batch evidence; `read_write` publishes only CREATED records to the
  Batch Experience Pool after Case sealing.
- A `read_write` Batch consolidates only after complete Batch execution. ADD/MERGE/REINFORCE/REJECT/
  CONFLICT output is schema-checked, every eligible Experience is handled exactly once, ADD is capped
  at five, required consolidation input reads are audited, and only a fully validated result can
  publish `M_n+1`. Partial Batch or consolidation failure leaves `M_n` unchanged and records failure.

## Real Regression Evidence

Batch `b-20260810-006` remains the successful mismatch-repair Experience regression: 114/1003
mismatches became 0/1003 after one feedback-driven repair and produced a valid `simulation_debug`.

Batch `b-20260810-009` completed a full `read_write` path and atomically published `mem-v0002`.
The first frozen replay then exposed a stage vocabulary mismatch (`design` versus
`initial_generation`). Current snapshot catalogs and Consolidator ADD/MERGE output now accept only
canonical V1 stages. Batch `b-20260810-011` performed a one-time migration and published `mem-v0003`
from the experimental `mem-v0002`.

The guarded landing review made that boundary explicit in the shared schema: catalog entries and
Consolidator drafts accept only `initial_generation`, `functional_simulation`, `unknown`, or `null`.
It also separated Batch consolidation failures from Experience summarization failures by emitting
`MEMORY_CONSOLIDATION_FAILED` for the former.

Frozen Batch `b-20260810-012` fixed `mem-v0003`, audited exact Selector reads, selected
`memory-000001`, bound `context/relevant-rtl-memory.md` in attempt 1, and captured the complete
advisory Memory block in the Pi provider transcript. The Case compiled and passed functional
simulation after the configured repair loop. No frozen snapshot update occurred.

## Remaining Validation Boundary

Memory V1 implementation and its minimal real `Experience → consolidation → frozen selection →
Agent injection` loop are complete. The full `b-20260811-004` run proves the Memory-build write path,
but not capability uplift: its source snapshot was empty, so no Memory was selected or injected.
Actual efficacy requires a paired held-out `frozen mem-v0002` run with an `off` control and no overlap
with the build selection. Results remain non-authoritative Windows/local experiment evidence and do
not establish Linux production readiness or CVDP runtime support. CVDP composition remains deferred
until its Provider, profile, and functional-simulation adapter exist.

## Validation

- `corepack pnpm@11.13.0 install --frozen-lockfile` passed with the workspace already up to date.
- `corepack pnpm@11.13.0 lint` passed.
- `corepack pnpm@11.13.0 typecheck` passed.
- `corepack pnpm@11.13.0 test` passed: 43 files passed, 1 skipped; 345 tests passed, 2 skipped.
- The first aggregate test invocation hit the documented Windows process-tree capability-probe
  race. The affected file passed with `--maxWorkers=1`, and a clean aggregate rerun then passed.
- `corepack pnpm@11.13.0 build`, `format:check`, and `peers check` passed.
- `git diff --check` and `C:\Program Files\Git\bin\bash.exe scripts/harness_check.sh` passed.
- Report-specific evidence assertions passed for Batch counts, Experience statuses/kinds,
  consolidation accounting, and snapshot lineage.
- The repair-depth assertion passed: 139 first-candidate passes, 11 first passes after one repair,
  zero after two or three repairs, and six unsuccessful Cases, totaling 156.
- Report Prettier check, evidence assertions, final repository `git diff --check`, and the explicit
  Git Bash Harness check passed.

## Last Updated

2026-08-12T10:05:55+08:00
