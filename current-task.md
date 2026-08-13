# Current Task

## Goal

Make long evaluations resilient to one Case infrastructure failure and decouple Memory construction
from evaluation Batch completion by allowing an operator to select one or more retained Experience
Batches explicitly.

## Current Status

Implementation and deterministic validation are complete:

- Published `exp_result/verilog-eval/08.12-k3-pi-memory-v1-001-156.md` from existing evidence for
  `b-20260812-001` and `b-20260812-002`. The report derives one complete `Prob001`-`Prob156` view
  from the first Batch's 91 complete Cases and the second Batch's 65 Cases, while preserving the
  first Batch's native `INVALID` status and the local non-authoritative evidence boundary.
- The Batch evaluator no longer stops after one valid Case returns infrastructure-incomplete or
  infrastructure-invalid. It records that Case as invalid, continues later valid Cases, and keeps the
  overall evaluation Batch `INVALID`.
- A successful Pi capability probe is cached for one adapter lifecycle. Every turn still validates
  configuration, project capability, policy, and guidance digests, but does not repeat external
  `pi --version` and `pi --help` probes.
- New CLI entry point:
  `memory-build --experience-batches b-20260812-001` or a comma-separated list of Batch IDs.
- `run` and `evaluate` no longer call the Memory Consolidator or publish a snapshot in any mode.
  `read_write` now means fixed-snapshot read plus eligible Experience persistence; CLI output reports
  `publication: DEFERRED_TO_MEMORY_BUILD`. Only the explicit `memory-build` command advances Memory.
- The offline Memory Build validates regular-file and path safety, requires six-digit JSON filenames,
  validates every `ExperienceRecord`, sorts Batch IDs/files deterministically, de-duplicates identical
  canonical Experience content, verifies parsed bytes against the scan-time digest, and records all source files in
  `.rtl-agent/memory/builds/<build-id>/experience-pool-manifest.json`.
- It consolidates against the latest validated snapshot and uses existing exact Experience accounting
  plus atomic snapshot publication. It does not inspect or modify the selected evaluation Batches and
  therefore accepts retained Experience from either `COMPLETED` or `INVALID` Batches.
- A read-only load of real `b-20260812-001` succeeded: 76 source files, 76 unique schema-valid
  Experiences. No Consolidator model call or snapshot publication was performed.
- Resume was deliberately not implemented.
- Memory/Experience descriptive metadata (`circuit_type`, `failure_type`, `language`, and `tool`)
  now shares a 1024-character defensive limit. The former 128-character limit rejected the valid
  135-character `circuit_type` produced by Memory Build `b-20260813-001`; prompts and generated
  output contracts now disclose the exact limit.

The originating diagnosis remains:

- Cases 1 through 91 completed and passed functional simulation.
- Case 92, `Prob092_gatesv100`, entered `AGENT_RUNNING` but ended 32.356 seconds later as
  infrastructure-level `INCOMPLETE` at `AGENT_ATTEMPT`. It has no `context/agent-input.json`, Agent
  result, provider transcript, RTL, compile result, or functional run.
- The Pi adapter performs its bounded `--version` and `--help` capability probes before writing
  `context/agent-input.json`; each probe is capped at 30 seconds. The timing and evidence boundary
  therefore identify a transient capability-probe failure or timeout before any model request.
  Existing evidence does not distinguish which of the two probes failed because the orchestrator
  intentionally collapses unexpected exceptions into a stable generic incomplete-run message.
- The Batch evaluator stops after an incomplete/infrastructure-invalid Run, so Cases 93 through 156
  were not executed. The one failed Case plus 64 skipped Cases explains `functionalNotRun: 65`.
- Memory consolidation requires `execution.result.status === "COMPLETED"`. Because the Batch was
  `INVALID`, it skipped the Consolidator turn and wrote the fail-closed generic
  `CONSOLIDATION_FAILED` result. The missing `pi/` consolidation workspace confirms no Consolidator
  model call occurred and no next snapshot was published.
- A read-only current probe succeeded: Pi `--version` returned `0.81.1` in 3.741 seconds and `--help`
  returned successfully in 4.151 seconds. The configured Pi files and locked guidance/policy digests
  are unchanged, so the failure appears transient rather than a persistent configuration defect.

No model call, dataset rerun, compile, simulation, Experience generation, consolidation, snapshot
publication, or Batch evidence rewrite was performed while implementing or validating this change.

The previous Memory V1 implementation and full-run analysis remain complete:

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
- An explicit `memory-build` consolidates only the selected Experience Batch set. ADD/MERGE/
  REINFORCE/REJECT/CONFLICT output is schema-checked, every eligible Experience is handled exactly
  once, ADD is capped at five, required consolidation input reads are audited, and only a fully
  validated result can publish `M_n+1`. Input or consolidation failure leaves `M_n` unchanged.

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

- Report-specific assertions passed: 156 unique consecutive Cases, repair histogram
  `138/13/3/2`, 181 Agent turns, 25 repair turns, 24 Memory-injected repair turns, 130 CREATED
  Experiences (`114 design_observation` plus `16 simulation_debug`), and exact coverage of all 130
  offline-build Experience indexes. The observed failed-build `circuit_type` length is 135.
- The observed 135-character Memory `circuit_type` passes the shared schema; a 1025-character value
  remains rejected.
- Current full validation passed: 45 test files passed and 1 skipped; 353 tests passed and 2 skipped.
- Current lint, typecheck, build, format, peer dependency, `git diff --check`, and Harness checks
  passed.
- Commit-main review found no P1. One P2 was fixed before landing by binding each parsed Experience
  to the scan-time source digest; focused regression passed 76 tests, and the post-fix full suite
  passed 353 tests with 2 skipped.

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

2026-08-13T21:20:00+08:00
