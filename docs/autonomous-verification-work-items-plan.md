# Autonomous verification work items: implementation and pilot plan

Origin: academic-research-suite / experiment planning and engineering. Date: 2026-09-19.
Version: draft-1. Status: implementation; neither method nor target cohort is frozen.

## Research boundary

The designated original-Memory10 experiment is closed. Its result supports executability under
designation on that fixed configuration, not autonomous adoption or held-out transfer. No more
dpretet/M010 generation, tuning or extra E3 testing is planned. Preserve the old 103 runtime
digests, all old protocols, raw evidence and the original 13-item snapshot. New code uses isolated
entry points; do not rebuild frozen dist artifacts. Existing repository changes are not this task's
diff and must not be reverted.

Question: does evidence accumulated on source implementations help an Agent autonomously select
and implement useful missing verification work on new implementations, beyond the same workflow
without source experience and beyond generic guidance?

## Common workflow

All N/G/M conditions read the current contract, fixed configuration and baseline verification
assets, consider unstimulated behavior and stimulated-but-unchecked behavior, and select zero to
two feasible work items. A work item records the gap and code references, semantic applicability
and authority references, planned change, implementation/execution evidence, and provenance plus
what must be rederived for the target. Concise decisions and evidence locations are sufficient;
do not request private reasoning. Memory can suggest candidates from target semantics before a
gap has independently been noticed. Existing equivalent checks and current scope must be checked
before adopting a candidate. No specific reset/full/empty task is in the common workflow.

Reuse the same Kimi coding K3 provider, tool permissions and maximum three Agent turns for all
conditions. There is no separate M-only selector/planning call and no irrelevant context padding.
N has no added guidance, G has generic verification guidance authored without source trajectories,
and M has the frozen source-derived v2 candidate library. Selection occurs inside the ordinary
Agent turn. Record actual turns, provider exchanges, tokens and duration separately.

The old coverage loop cannot represent a successful zero-edit gap analysis and may stop before
any analysis when coverage is saturated. Add an isolated loop/policy module. Reuse immutable
materialization, snapshots, runner and provider/scope guards where their APIs permit. Keep work
state in harness-owned context. The Agent returns a small final-response JSON ledger; it does not
gain filesystem permissions to modify its own evidence or policy.

Compile/golden/scope failures consume a draw and permit repair only within remaining turns and
existing safety boundaries. Coverage stagnation cannot stop a selected pending check; the Agent
must complete or explicitly revoke it within budget. A passing, executed check remains even with
zero DUT score gain. Analysis done, items resolved and no reasonable remaining coverage direction
allows early stop. Budget exhaustion is separate from completion. A completion claim must bind
code and actual runner evidence; structural validation is not semantic approval. Hidden mutants
are never provided to the Agent and never govern continuation.

## Source extraction v2

Use the four original source bundles (103 records), not the frozen 13 summaries. A new collector
may add their four original specification files, explicitly recording 103 original + 4 supplement
records. Do not invent missing versatile baseline snapshots. Keep source discovery context
separate from transferable applicability, and preserve abstract strategy plus concrete cited
source evidence. Distinguish code presence, observed execution, passing golden and hypothesized
fault detection. Whole-attempt coverage changes are not isolated causal effects.

Prepare four independent, serial, no-tool K3 extraction requests, one per source. Maximum one
request per source, 15-minute per-call cap, no retry or LLM consolidation. Empty output is valid.
Store requests/responses, provenance and consumption; do not silently discard malformed output
or fabricate replacement items. Publication requires structural validation and an explicit
item-by-item semantic review of source support, history-as-policy leakage and target contamination.
Source evidence insufficiency remains a limitation. A source extraction does not authorize a
target evaluation. New source runs are not needed to implement this first step.

## Pilot preparation and freeze

Target-family choice is pending user clarification. The existing 103 records are FIFO sources;
the prepared UART/AES assets have no assigned transfer roles. Select three new independent
implementations by predeclared family/interface/configuration criteria, excluding all old source
and target implementations and derivatives with shared lineage. Do not choose by Memory benefit
or hidden mutant outcomes. Record exclusions and provenance. Existing prepared assets do not by
themselves establish independence or the intended source/target relation.

After cohort assets and v2 review are ready, freeze method, generic guidance, library, baseline
assets/configs, execution budget, draw order and entire evaluation mutant sets. Formal generation
is 3 targets x N/G/M x 3 repeats = 27 draws. No failed-draw replacement, interim best snapshot or
outcome-driven retuning. Seal all generation before independent whole-set evaluation.

For each baseline and final artifact, retain the kill set. Report new kills K_final minus
K_baseline and lost kills K_baseline minus K_final, alongside totals. Keep raw outcomes,
semantic checker acceptance and valid-final status separate. Selection, implementation and
execution are explanatory diagnostics. Invalid or missing final draws remain in denominators.
The pilot searches for cross-implementation signals; it does not establish stable rates.

Interpretation: M better than both N/G on multiple new targets without invalidity/regression
supports subsequent ablation/source scaling. Shared improvement with M approximately G supports
the workflow without establishing a source increment. More source adoption without detection
gain calls for overlap/opportunity analysis; it proves neither that adoption suffices nor that
mutants are inappropriate. No extra diagnostic groups are planned now.

## Implementation ownership and validation

1. Source module: extend opt-in v2 contract only; add separate preparation/build/publication
   components and tests. Never change frozen legacy extractor/runtime.
2. Workflow module: small ledger, evidence binding and stop-state logic with meaningful tests;
   integration must support zero work items and repair/budget distinctions without extra calls.
3. Root: protocol, independent generic-guide preparation, integration review and cohort decision.
   Read-only cohort audit may proceed independently. Do not launch the 27-run pilot before freeze.

Commands: focused `node --test` on new modules and impacted v2 tests; strict NodeNext `tsc`
`--noEmit --allowImportingTsExtensions --skipLibCheck`; focused ESLint/Prettier; `git diff --check`;
Git Bash `scripts/harness_check.sh`; read-only preparation of all four real source inputs and old
103-file digest verification. Use unit fakes and existing sealed source evidence for engineering
checks, not new old-target samples. No full build that overwrites frozen dist. Linux CI is not
available on this Windows host; record it as unrun and do not claim Linux/formal readiness.

## Progress

- Read-only source audit confirms 18+35+20+30 original records and four available original specs.
- Read-only workflow audit identifies old zero-turn/zero-edit constraints and an independent
  final-response ledger route that keeps existing read/write/edit permissions.
- No new model or RTL call has been made for this stage. Cohort and final method remain unfrozen.

The current collaboration service cannot create another fresh-context agent (thread limit), and
the available reviewers have seen historical source context. Do not label their guide authorship
source-blind. Prepare one additional fresh no-tool K3 author request with only the shared task and
general verification topics; no repository/source/target/evaluation content. Thus preparation is
at most five model requests: one generic G author and four source extractors. This is distinct
from the later 27 equal-budget target draws. Preserve the first response; no outcome-guided rewrite.
