# FIFO verification Memory transfer v1

## Authorization and scope

User authorized execution on 2026-09-13. Four sources run independently with no Memory:
Versatile FIFO, ethmac/eth_fifo, WBUART32 ufifo, openHMC. Only after all four source
experiments finish may their verification experiences be extracted, deduplicated and
consolidated into a NEW isolated verification Memory store. Never modify or mix in the
existing RTL Generation/Debug snapshots. Targets are dpretet async_fifo and axis_fifo.
This protocol overrides the old 3+3 roles for this experiment, not frozen asset manifests.

## Fixed execution defaults

- Source: one independent seeded-TB coverage-improvement run per IP, at most3 Agent
  iterations, existing runner early-stop rules retained and recorded. No cross-source Memory.
- Target: two paired rounds per IP, R1 off then frozen, R2 frozen then off; same seeded
  verification inputs, model/config, max3 iterations, feedback and stop rules per condition.
- Persist seeded baseline, first Agent iteration and final assets. This is seeded verification
  improvement, NOT blank initial TB generation. Report first improvement separately from final.
- Mutation is evaluation-only: same30 frozen patches per IP, run on baseline/first/final assets
  in isolated workspaces. No patch, mutant identity, kill feedback or evaluator scoreboard is
  provided to Agent prompts or Experience extraction. Coverage/compile/golden feedback only.
- New generated TB/checker must accept golden; compile-invalid, infrastructure failures and
  not-run are never killed. Timeouts separate, not automatically killed. Equivalence review
  pending; adjusted score unavailable until human confirmation. Do not regenerate mutants.
- Source execution order Versatile, eth_fifo, ufifo, openHMC is scheduling only, not learning.
  Targets start only after source-derived snapshot is frozen/digest-locked. No target updates.
- All model/Verilator/mutation runs serial; hidden Windows process and unique logs. Existing
  frozen RTL campaign stays paused for its independent timeout decision; never silently reclassify.

## Implementation plan and validation

1. Start supported Versatile source coverage run with existing runner and unchanged fixture.
2. Add locked fixture adapters for remaining FIFO sources/targets; validate consumed DUT bytes
   against publication. Different source IPs may have interface-specific TBs, but target off/frozen
   must use identical initial bytes. Protect original DUT and published180 patches.
3. Adapt deterministic mutation replay for these fixtures and captured verification assets;
   validate golden and each mutant independently. Keep oracle/patch paths outside Agent workspace.
4. Implement isolated verification Experience/consolidation/selector integration reusing RTL
   mechanics, not RTL task prompts. Test source-only provenance and target leakage rejection.
5. Audit four source traces before consolidation; freeze snapshot before target execution.
6. Report per-IP coverage, golden, raw kill score, paired mutant transitions, selector evidence,
   token/cost/duration and errors; separate first/final. No cross-IP generality claim beyond FIFO.

For code changes: focused unit/integration tests, typecheck, lint, build and harness check per
docs/verification.md; retain Linux validation boundary. Existing Windows coverage is non-authoritative.
No new code is needed to launch first supported source. A successful source coverage run alone
does not complete mutation replay, Memory construction or target comparison.

## Target execution binding (2026-09-17)

User confirmed two independent repetitions per condition per target (8 runs total).
Order reversal is scheduling only; no carry-over or claimed seed-level randomness control.
Use original Chinese k3-build-20260917-100104 (13 items); preserve PENDING_HUMAN_REVIEW.
The small catalog uses deterministic select-all-v1, no additional inference or manual item
filtering. All fields remain verbatim. This measures full-catalog Memory exposure, not retrieval
quality. The existing bounded Relevant RTL Memory transport carries a verification-specific
advisory wrapper. Target contracts and runner stopping rules take priority over Memory.
Per-attempt selector evidence binds manifest/items/injection digests. Campaign verifies actual
first provider requests contain the entire frozen context for every frozen attempt and no
Memory marker in off. Identical baseline asset hashes required across repetitions/conditions.

Run after build: `node tools/mutation/target-campaign.ts <unique-label>`. Owns an exclusive
active.lock; serial child processes, isolated condition directories, logs, coverage followed
by golden-gated baseline/first/final fixed30 replay. A failed Agent or changed protected asset
stops the queue for inspection, never silently retries. replay-target --smoke is diagnostic
only (baseline golden and M001) and excluded from experiment results.

## Controlled recovery v2 (2026-09-17)

User authorized continuation after inspecting the first stopped campaign. Preserve
fifo-target-20260917-1120 as diagnostics: off final instantiated another parameter configuration;
frozen provider turns ended with connection errors. The replacement campaign explicitly records
supersedes and runs all8 conditions from original seeds. No target-derived Memory updates.

Both conditions share seeded-prefix-v1: preserve TB tokens through the complete sole TopModule
instance (parameters, ports and preceding declarations), reject additional DUT/raw-module or tb
instances, preprocessor/defparam/bind/force bypasses. Additional stimulus follows the instance.
Before accepting coverage, compare found denominators AND the full raw DUT coverage metadata
multiset to baseline, excluding hit counts. Any scope drift stops as diagnostics. Model provider
transcripts must contain complete kimi-coding/k3 responses ending normally, with no error/abort
in any exchange, even if edits occurred before the connection failure. All checks are target-only.

Network recovery is established by a separate isolated no-tools K3 ACK probe, not by an Agent
trial that could contaminate evaluation. New campaign invocation takes optional superseded label:
`node tools/mutation/target-campaign.ts <new-label> fifo-target-20260917-1120`.
No automatic retry of failed trials. Preserve snapshots, original scores, patches and labels.
