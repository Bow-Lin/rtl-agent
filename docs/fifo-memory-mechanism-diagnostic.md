# FIFO Memory mechanism diagnostic — 2026-09-18

## Scope and plan

User requests three bounded actions: diagnose Memory10's reset-active oracle on golden/M010,
audit actual adoption of Memory1/9/10, and define the next extraction contract around scenario,
oracle, sampling window and correctness authority. Do not rerun off/frozen campaigns or edit
the frozen13 catalog, target evidence or raw scores. M010 is already known: this is a post-hoc
mechanism diagnosis, not blind transfer evidence. Use exclusive diagnostic output directories.

1. Confirm idle RTL state and pinned dpretet reset behavior: active-low asynchronous resets,
   wfull reset0 and rempty reset1. Correctness authority for this diagnosis is the experiment's
   accepted immutable golden implementation, not a new claim about an external product spec.
2. Copy the digest-checked R2 off baseline verification assets into isolated golden/M010 cases.
   Preserve baseline checker, stimulus, clocks, parameters and scoreboard. Add one value check
   immediately after the reset task's existing five read-clock waiting cycles and before release;
   log the reset levels, values and time. This stable reset-active point avoids reset/NBA races.
3. Run exactly the new golden and M010 with assertions enabled, serially. Reuse historical
   baseline golden/M010 results as the no-added-check controls after checking asset digests.
   Golden must finish with its existing pass marker; M010 must fail specifically at the new
   reset-active check. Persist source hashes, exact delta, compile/simulation logs and verdicts.
4. Independently compare baseline/first/final code for Memory1/9/10 across all8 target runs;
   distinguish code presence, compiled observable checks and actual execution evidence. Inspect
   actual Verilator5.050 generated code for isunknown rather than relying on latest documentation.
5. Add a separate opt-in future extraction contract with observed outcomes versus hypothesized
   fault mechanisms, applicability conditions and policy separation. Do not feed M010 or target
   analysis into source extraction, regenerate Memory, or change the v1 default campaign.

## Validation

Run NodeNext noEmit/ESLint on new portable tools; focused tests for a new extraction contract.
Diagnostic integration is the two native Verilator compile/simulations plus before/after frozen
hash checks. Validate evidence/report JSON, git diff --check and scripts/harness_check.sh.
No Linux/formal-Gate acceptance is claimed; follow up with Linux checks before production use.
No extra parameter sweep, CDC counterexample run or model call is part of this diagnostic.

## Completed evidence

Two serial Verilator5.050 cases completed in .rtl-agent/fifo-diagnostics/reset-window-20260918-v1.
Golden passed with reset-active checks at70ns/6888ns and161 reads; M010 failed only the new
reset-value check at70ns with both resets0/full1/empty1. Historical baseline controls both pass.
All29 retained-file hashes unchanged. Review replaced historical argv execution with literal
fixed compile arguments plus exact profile comparison; resulting arguments match the actual runs.
No further RTL was needed for that validation-only hardening; no remaining P1/P2 in scoped review.

Adoption audit covers24 snapshots/24 raw coverage files/168 generated C++ files. Four frozen
conditions implement Memory1, but off matches the same36 dpretet/18 axis new toggle bins.
Memory9 largely preexists;45 isunknown failure points compile away. Dpretet never implements
Memory10's reset-active window; AXIS R2 off does adapt a synchronous reset-active check.

Opt-in verification-memory-v2 contract/tests/docs added without touching legacy defaults or
published catalog. Combined15 Node tests and focused typecheck/lint/format pass; real-source
preparation18/35/20/30 records (103 total), no target/replay paths, no model calls/new catalog.
Reports: exp_result/09.18-fifo-reset-mechanism-diagnosis.md and
exp_result/09.18-fifo-memory-adoption-audit.md; contract docs/verification-memory-v2.md.
