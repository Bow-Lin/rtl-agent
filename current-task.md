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
- `debug-evaluate` now emits the same per-Case stderr progress line as ordinary `evaluate`, for
  example `正在处理 Prob001... (1/30)`.
- Seeded Debug accepts Memory `off` (default) or explicit `frozen` plus a snapshot, while
  `read_write` remains rejected. It defaults to zero additional feedback-repair iterations, and
  `--functional-repair-iterations <0-10>` can override that independently.
- The assignment split's original `r2` baseline remains sealed with manifest
  `sha256:c19159fe6a9d84d625fda6991a5cf27b15dafca918ff359451345b296e544897`.
  After the dataset/Provider identity moved to `r5`, the current 30-Case assignment baseline was
  prepared successfully with manifest
  `sha256:53155540d4d3286c45d9f0e4eeaa0e08455b3536cc71730e9a7e6c817ea1e3bf`; an immediate repeat
  returned `reused: true`.
- The first real seeded assignment Debug Batch, `b-20260817-001`, completed with 30/30 candidates
  compiling and 20/30 passing functional simulation. It used Memory off, minimal guidance, one
  Agent turn per Case, and no additional feedback-repair iterations.
- Published `exp_result/chipbench/08.17-k3-pi-seeded-debug-zero-shot-assignment.md`. Relative to the
  cached buggy starters, the Batch produced 20 full repairs, six partial improvements, and four
  regressions; total mismatches fell from 18,564 to 4,793.
- Subsequent operator runs completed seeded Debug Batch `b-20260817-002` for state-machine at 4/6
  functional passes and `b-20260817-003` for arithmetic at 17/24 functional passes.
- Timing baseline preparation initially failed because its pinned prompts use two target-marker
  variants. The extractor now accepts both observed fixed variants and still rejects unknown ones.
- The operator kept the experiment functional-only and authorized normalization of obvious dataset
  defects. Dataset `c74fe7d28-r5` applies three digest-locked preparation patches to `Prob013`,
  `Prob016`, and `Prob022`; each starter remains functionally wrong but now compiles and completes
  simulation.
- The timing split's 29 Cases prepared successfully with manifest
  `sha256:1f4303f62a02cf87d1005fdf9575c0c108a314068da70a7aef2836e09943555b`.
  All 29 have positive mismatch counts (7,368 total), and an immediate repeat returned
  `reused: true`.
- Timing seeded Debug Batch `b-20260817-004` completed at 14/29 functional passes. Twelve candidates
  compiled but retained mismatches; two candidates omitted `dual_port_RAM` and failed compilation;
  one Agent attempt timed out.
- Published `exp_result/chipbench/08.17-k3-pi-seeded-debug-zero-shot-all-splits.md`. Across all four
  completed batches, 55/89 Cases passed, 16 partially improved, two were unchanged, 13 regressed,
  and three did not reach functional simulation. The 86 paired runnable candidates reduced mismatch
  count from 32,016 to 10,802. Main Agent transcripts recorded 1,191,502 provider total tokens and
  $4.029632 provider-reported cost; mismatch Analyzer usage remains excluded.

## Commands

The four frozen-Memory splits are complete. Before attributing their result solely to Memory, prepare
and run r5 Memory-off controls for assignment, state-machine, and arithmetic; the existing timing
Memory-off Batch already shares the r5 dataset, Provider implementation, and starter baseline.

## Validation Boundary

Deterministic tests, repository checks, real dataset prepare/fixture validation, and the real 29-Case
timing baseline prepare/reuse check remain the latest implementation evidence. The combined report
was produced only from sealed batch and baseline artifacts; it did not rerun Pi/K3, compile,
simulation, Memory, Experience, consolidation, or snapshot publication.

## Prompt-Only Baseline Report

- Published `exp_result/chipbench/08.14-k3-pi-debug-zero-shot-assignment-baseline.md` from sealed
  ordinary-evaluation Batch `b-20260814-001`. Its 30 prompt-only candidates all compiled and ran;
  19 passed functional simulation and 11 remained mismatches.
- The report pairs those results with the separately prepared seeded starter manifest. All 30 buggy
  starters have a positive mismatch; prompt-only candidates reduced total mismatch samples from
  18,564 to 6,284, with 19 passes, six partial improvements, one unchanged mismatch, and four
  regressions.
- Batch `b-20260814-001` used `prompt-only-v2` and `PROMPTED_FUNCTIONAL_REPAIR`; it is not evidence
  from the new `core-loop:debug:chipbench:pi` command.

## Seeded Debug Report

- Published `exp_result/chipbench/08.17-k3-pi-seeded-debug-zero-shot-assignment.md` from sealed
  Batch `b-20260817-001`.
- The strict functional result is 20/30 = 66.67%, versus 19/30 for the earlier prompt-only run.
  The protocols have different task representations and the model sampling was not locked, so the
  one-Case difference is observational rather than a clean causal estimate.
- The 30 main Agent turns recorded 418,453 provider total tokens and $1.393244 provider-reported
  cost. Ten mismatch Analyzer calls lack persisted usage and are excluded.
- The four-split report is published at
  `exp_result/chipbench/08.17-k3-pi-seeded-debug-zero-shot-all-splits.md`. It preserves the dataset
  boundary: assignment/state-machine/arithmetic use `c74fe7d28-r2`, while timing uses normalized
  `c74fe7d28-r5`; `55/89` is therefore a disclosed cross-version observation.

## Frozen Memory Follow-up

- The operator completed the store switch while implementation was in progress. The active
  `.rtl-agent/memory` is now the VerilogEval store; its latest published snapshot is `mem-v0003`
  with nine items built only from `nvlabs-verilog-eval/spec-to-rtl` Experience.
- `.rtl-agent/memory-chip` now archives the later ChipBench store. It contains ChipBench
  self-contained Experience from `b-20260813-002`, but its only published snapshot is the empty
  `mem-v0001` with zero items.
- The runtime resolves `.rtl-agent/memory`, so no further directory switch is required before the
  frozen Debug experiment.
- Seeded Debug now accepts `off` or `frozen`, continues to reject `read_write`, and no longer
  hard-codes Memory off in its package script. Omitting Memory flags still selects `off`.
- The first seeded Debug turn queries `functional_simulation` / `output_mismatch` Memory and is
  labeled as functional repair for selection, so the nine VerilogEval `mem-v0003` items are eligible
  before any new mismatch feedback exists.
- Frozen seeded Debug retains selector-driven read/injection but skips Experience summarization,
  persistence, Memory Build input, and snapshot publication.
- Completed frozen `mem-v0003` Batches `b-20260817-005`, `b-20260818-001`,
  `b-20260818-002`, and `b-20260818-003` for all four zero-shot Debug splits.
- Published `exp_result/chipbench/08.19-k3-pi-frozen-memory-seeded-debug-zero-shot-all-splits.md`.
  Frozen Memory passed 53/89 Cases versus 55/89 in the available Memory-off comparison. On the 86
  runnable paired Cases, final mismatch count was 10,935 versus 10,802.
- Memory selection completed for all 89 Cases; 85 selected at least one item and injected 179 total
  references. Frozen read-only evidence is intact: no Batch Experience directory or new snapshot
  was created.
- Main Agent transcripts recorded 1,615,691 provider total tokens and $5.187995 cost. Selector
  metadata records 47:19 cumulative latency but no provider usage, so selector token/cost remains
  excluded.

## Verification Coverage Assessment

- The repository has a bounded, non-authoritative Verilator coverage loop for generated
  VerilogEval verification assets and a separate locked FreeCores I2C refinement loop.
- Local evidence contains nine VerilogEval result artifacts across only four unique Cases. These
  runs primarily validate orchestration and edge cases; they are not a representative benchmark.
- Six I2C attempts share the same 78.16% baseline. Two ended `PENDING_HUMAN_REVIEW`: the published
  run reached 93.99%, and a later unreported run reached 100% line/branch score with 87.03% toggle.
  The other four attempts exposed Agent timeout, simulation/assertion, and later-turn failure modes.
- The existing evidence proves that the loop can increase structural coverage while protecting the
  DUT, but it does not yet prove improved bug-finding power, stable repeatability, Linux readiness,
  or sign-off-quality verification.
- Highest-priority follow-up is a preregistered, repeated paired experiment with fixed fixtures and
  budgets, mutation/fault-detection as the primary quality metric, independent checker/oracle
  validation, and a broader predeclared design set.
- Commit-main review found no P1/P2 findings. The reviewed handoff/audit documents are ready to
  land; the experimental minimal common guidance, local Claude settings, and workflow screenshot
  remain explicitly excluded.
- Commit `b0dd4e8` (`docs: record coverage experiment assessment`) was pushed to `origin/master`.

## Last Updated

2026-08-19T14:59:30+08:00
