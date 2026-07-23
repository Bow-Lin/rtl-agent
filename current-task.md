# Current Task

## Goal

Implement R04 as a bounded, non-authoritative Core Loop that composes the completed R01 fixture boundary, R02 restricted Agent turn, and R03 fixed Icarus compile adapter without duplicating or weakening their established contracts.

## Current Status

R04 is `IN_PROGRESS`.

Reusable single-run/batch orchestration, batch preflight, conditional and exclusive evidence, independent final recompile, raw/review-adjusted metrics, human-review publication, and thin CLI behavior are implemented and validated. R02 effective isolation was also narrowed explicitly without changing its established turn protocol.

The operator selected NVlabs VerilogEval v2 and ChipBench without submodules. Repository-owned Providers, pinned archive/cache preparation, source/content/implementation digests, MIT license metadata, all 156 VerilogEval `spec-to-rtl` cases, and 223 ChipBench generation/debugging cases are implemented and validated. Ignored local caches contain only allowlisted license/dataset content; reference/testbench files never enter Agent workspaces.

ChipBench exposes 45 generation cases as `BLANK_GENERATION` and 178 prompt-embedded debugging cases as `PROMPTED_FUNCTIONAL_REPAIR`. The latter remains a separate compile-only metric category: compile success does not prove the timing, assignment, arithmetic, or state-machine bug was functionally repaired.

The restricted OpenCode `1.18.2` Agent is now locally configured for
`kimi-code/kimi-for-coding`. The direct CLI safely loads an allowlisted root `.env`/`.env.local`
configuration and keeps the credential out of inline configuration and capability evidence. Only
the standard `KIMI_CODE_API_KEY` credential name is accepted. A static probe and one live Kimi
blank-generation turn passed on Windows. Root `test_connection.ts` provides a minimal direct
subscription check with sufficient output budget for model reasoning and reports the returned
answer plus bounded finish/token metadata. It reports HTTP acceptance and non-empty-answer validity
separately, and exits unsuccessfully when a 2xx response contains no usable answer.

Pi Coding Agent `0.81.1` is now available as a parallel backend without replacing the established
OpenCode path. Legacy OpenCode capability/profile/turn evidence remains readable, while Pi uses a
separate capability branch, `pi-agent-probe`, and `verilog-eval-kimi-pi-v1` profile. Pi runs in
one-shot JSON/ephemeral mode with discovered resources and project trust disabled, only
`read,write,edit` enabled, and a digest-locked extension that restricts public reads and RTL writes.
All turns use the same operator-owned `.rtl-agent/pi-config`; its semantic state is capability
locked, while complete state including authentication is privately checked for drift within one
adapter/batch without serializing credentials.
The installed runtime is version-isolated under ignored `.rtl-agent/tools/pi-0.81.1`. Real batch
`b-20260723-005` passed one Pi/Kimi case end to end: compile 1/1, functional simulation 1/1, and
post-processing completed.

The direct CLI now registers the generic `verilog-eval-kimi-v1` template. Each invocation must
select either an inclusive `--begin/--end` range or a `--cases` list. Both forms resolve
case-insensitive unambiguous prefixes to complete IDs, canonicalize them in the pinned Provider
order, and derive a concrete profile identity/digest before any model turn. The v1 template uses
one Agent attempt per case.

A real local generation and functional-simulation batch can now run from an explicit VerilogEval
range/list. The same `evaluate` command performs generation, candidate compilation, hidden
reference/testbench compilation, `vvp` simulation, and mismatch classification. New batches use
short daily IDs, publish generated modules under `rtl/<case-id>/`, and keep detailed evidence/runs
under `_internal/`. A checkpoint claim remains blocked until the operator records the final
license-review disposition, executes the resolved profile, and completes its predeclared human
review.

Stable RTL generation advice now lives in the versioned
`.opencode/skills/rtl-core-loop/common-guidance.md` checklist. The adapter injects the full
Compile/Logic/Safety guidance into every generation or repair prompt and locks its digest into the
Agent capability and per-turn evidence. The guide is methodology-only and contains no case-specific
reference or hidden testbench information.

Every dataset evaluation now appends its observed compile, functional, infrastructure, and not-run
outcomes to ignored runtime knowledge at `.rtl-agent/knowledge/observed-issues.md`. A functional
mismatch triggers an additional restricted Kimi diagnosis turn using only the public specification,
candidate RTL, total mismatch count, and parsed public-output mismatch counts/first times. The
diagnosis must select a concrete root-cause category, cite candidate/specification lines, and state
confidence and limitations; hidden reference/testbench assets remain unavailable. Complete analysis
stays under `_internal/mismatch-analysis/`; `observed-issues.md` retains only one category/confidence/
root-cause conclusion per mismatched case. `common-guidance.md` is never updated by this workflow and
changes only after an explicit operator request to promote observations into guidance.

Mismatch diagnosis now receives its complete machine-readable category/confidence/evidence
contract. One invalid response may consume one bounded correction turn using private structured
validation issues. Diagnosis and journal publication are recoverable post-processing: they cannot
replace an already published batch result, and `reanalyze --batch <batch-id>` reuses validated
existing evidence without regenerating candidates. Batch `b-20260723-002` was recovered through
this path; its `Prob034_dff8` conclusion is `INITIALIZATION_SEMANTICS` with medium confidence.

The journal now expands every `functionalNotRun` total into a `Not Run Details` list. Each selected
case records its stable run outcome or validation status. `MAX_ATTEMPTS` includes the latest
structured compile error when available, while later timeout or tool failures retain their own
final stage reason instead of inheriting an earlier attempt's compiler message. Missing compile
units and cases never reached by the batch are distinguished as `NO_COMPILE_UNIT` and
`NOT_EXECUTED`. A valid baseline is not treated as the reason for a later not-executed outcome;
stopped batches receive an explicit stopped-before-functional-simulation reason.

The first complete local Prob001–Prob156 Kimi run is summarized in
`exp_result/verilog-eval/07.21-baseline.md`. After replacing the interrupted Prob071–Prob100 segment with its
successful rerun, 119 of 156 unique cases functionally passed. Two cases are separated from ordinary
model outcomes: Prob040 was not executed after the historical classifier stop, and Prob099 has a
testbench port mismatch against both the public/reference interface and candidate.

Functional summaries now reserve `functionalFailed` for genuine nonzero simulated mismatches and
report verification compile/process/timeout/output failures separately as `verificationInvalid`.
Any verification-invalid result makes the CLI return `INVALID`/`ok: false`. Historical evidence
without `outputMismatches` or `verificationInvalid` remains readable. The operator accepts direct
host `vvp` execution for this local non-authoritative benchmark; no production or formal-Gate
sandbox claim is made.

## Locked Implementation Boundaries

- `maxAttempts` is total Agent turns; baseline is attempt zero.
- only R02 `RTL_CHANGED` is compile-eligible.
- only R03 `COMPILE_ERROR` can start another Agent turn.
- raw OpenCode JSONL, reasoning, full Assistant text, and tool payloads are never R04 evidence.
- every compile preparation is evidence; compile results exist only when the compiler was invoked.
- strict `FinalResult` is written last only for evidence-complete runs with a trustworthy final RTL manifest.
- invalid fixtures and incomplete runs remain batch-level records rather than new R01 final outcomes.
- strict per-run results remain `authoritative: false` / `COMPILE_ONLY`; VerilogEval adds a separate
  non-authoritative `FUNCTIONAL_SIMULATION` batch result without claiming a formal Gate.

## Validation Baseline

- lint, typecheck, build, format, peer dependency, frozen-install, package, and full-repository checks pass.
- Core Loop ordinary tests: 13 files passed / 1 skipped; 92 tests passed / 2 skipped.
- thin CLI/profile-selection tests: 3 files and 18 tests passed.
- full repository: 34 files passed / 1 skipped; 244 tests passed / 2 skipped.
- real Icarus integration: 2 files and 6 tests passed, including synthetic R04 baseline/repair/final-recompile composition.
- real OpenCode 1.18.2 static probe and two live restricted-Agent smoke tests pass.
- Kimi Code `kimi-for-coding` static probe and one live restricted-Agent blank-generation turn pass
  with the key loaded only from ignored local environment files.
- Pi Coding Agent `0.81.1` static probe and real `verilog-eval-kimi-pi-v1` batch
  `b-20260723-005` pass with one compile/functional pass and no verification invalidity.
- the pinned VerilogEval archive prepared successfully; `fixtures-check` validates the locked manifest and reports 156 `spec-to-rtl` cases.
- real Icarus/vvp checks against existing Kimi-generated Prob001 and Prob002 candidates passed with
  `0/20` and `0/100` mismatched samples respectively; no model request was made.
- source-bound Icarus errors such as Prob071's invalid procedural assignment now classify as
  `COMPILE_ERROR`; real-Icarus and batch-continuation regressions prove they no longer stop later
  cases as infrastructure-invalid.
- deterministic Agent tests prove the complete common-guidance guide is present in every turn prompt
  and that guide changes alter the locked capability digest.
- the pinned ChipBench archive prepared successfully; its check validates the 683-file manifest and reports 45 generation plus 178 debugging cases across 11 splits.
- Windows checkout now keeps `.mjs` configuration files at LF, so the same Prettier check is stable on `windows-latest`.

These are non-authoritative benchmark mechanics checks. Real Linux execution remains unavailable
and no formal Gate, production-readiness, full-dataset capability, or checkpoint claim is permitted.

## Current Plan

1. Choose a VerilogEval range/list and record the operator's final MIT/license-review disposition.
2. Resolve the operator's requested `verilog-eval-kimi-v1` range/list and inspect the derived profile evidence.
3. Execute the real batch, complete the predeclared human review, fill the report, and record exactly one checkpoint recommendation.

## External Completion Requirement

R04 remains incomplete until a locked dataset profile batch and human review produce the required report and checkpoint recommendation. Provider/cache validation, synthetic tests, the R02 live smoke, and the R04 real-Icarus composition test must not supply those metrics.

## Last Updated

2026-07-23T14:54:00+08:00
