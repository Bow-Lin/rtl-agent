# Verification Experience v2: scenario, oracle and observation window

## Contract revision v2.1 (2026-09-21)

New requests identify `contractRevision: verification-memory-v2.1`; the output data schema
remains version 2. Scenario and oracle execution enums are now separate and share their
definitions with the parser. Only `oracle.execution` accepts the literal `not-added`.
The request explicitly requires top-level `evidenceIds` to contain a trajectory reference
and every nested reference, with unique IDs in each array. Provenance errors name that field.

This revision applies to new preparations only. Existing prepared prompts fail the unchanged
exact-prompt comparison, and historical runtime hashes must not be rewritten to permit reuse.
The original contract source was preserved byte-for-byte before editing at
`.rtl-agent/commit-review-20260921/verification-memory-v2.original.ts`, with a hash receipt
matching the 2026-09-19 preparation. Old raw responses, failures and frozen payloads remain
unchanged and rejected; this repair does not republish them or authorize another model call.

The companion generic-guide prompt is revision 1.1 and now states its existing 50-character
minimum alongside the 600-character maximum. Both limits count Unicode code points after
trimming outer whitespace, while the retained response remains verbatim. Its original source
is also saved beside the original v2 contract, matching the old preparation receipt.

This is an **opt-in extraction contract**. The 2026-09-19 extension adds separate source-only
preparation, no-tool K3 extraction and reviewed publication entry points in
`verification-memory-v2-build.ts` / `verification-memory-v2-run.ts`. The existing v1 extractor,
default command, published 13-item snapshot and target scores remain unchanged. Importing the
contract or preparing inputs makes no model call, target run or mutation replay.

The extraction unit is a strategy candidate with a checkable claim: which source behavior changed,
what it checks, when it checks, and what authorizes the expected result. An experience can instead
record a coverage-only action, a negative attempt or a checker repair. These capabilities must not
be silently converted into demonstrated fault-detection gains.

## Contract

| Field | Required distinction |
| --- | --- |
| `transferableStrategy`, `sourceDiscovery` | Reusable action with concrete source references, separately from why the source investigation discovered it. The source coverage trigger is not the sole target applicability condition. |
| `preconditions`, `applicability` | Required implementation/interface mechanisms, exclusions and how a future adopter checks whether baseline already does the equivalent work. |
| `scenario` | Actual behavior plus evidenced baseline gap; execution observed, code present only, or unknown. |
| `oracle` | What is checked; no new check is a valid explicit outcome. A passing golden alone does not prove the check executed or can detect its claimed fault. |
| `oracle.correctnessBasis` | Cited specification, interface contract or explicitly approved golden behavior; otherwise unresolved. Implementation output or agent narration alone is not correctness authority. |
| `oracle.sampling` | Clock domain, event, reset phase, ordering relative to stimulus/register updates, request versus accepted transaction and reference-model update. Unknowns must be explicit. |
| `oracle.simulatorSemantics` | Whether the actual simulator can represent the phenomenon claimed by the check; tool-specific unknowns remain unresolved. |
| `observedSourceEffect` | Coverage change, golden pass/failure, scoreboard repair, no measured gain or unmeasured. Whole-attempt association does not prove the isolated edit caused the effect. |
| `hypothesizedFaultMechanism` | A possible fault mechanism and the independent validation still needed, always labeled unverified. |
| `negativeExperience` | Failed action, conditions, observed evidence and how to avoid repeating it; mandatory for a negative item. |
| `evidenceIds`, `limitations` | Full provenance and missing evidence, conflicting attempts, architecture/tool restrictions. |

The current source collector includes coverage trajectories and golden evidence, **not mutation
evaluation**. This version consequently has no observed mutation-gain outcome and accepts only
`causality: "not-established"`. A later isolated source assay needs a separately reviewed evidence
protocol before stronger causal labels are introduced. Do not invent such labels in prose either.

Flag checks must respect their own clock domains and synchronization delay; equality with an
instantaneous global occupancy model requires an explicit contract. Accepted transfers drive data
model updates, while an unaccepted request may legally remain asserted. Whether an X/Z check has
runtime meaning depends on the simulator's two-state/four-state support. Changing expected values
must cite correctness authority rather than merely matching the implementation under inspection.

An empty extraction is allowed when no supportable candidate exists; no fixed count or per-source
quota forces an experience into existence. The new builder concatenates four independently
extracted source collections without an LLM consolidation step. Publication requires an external
item-by-item semantic review; target selection is separate. A future consolidator must preserve each scenario/oracle/window
and its transitive references, keep conflicts and negative attempts, and report exclusions rather
than silently dropping evidence. It must not collapse uncertainty into an `observed` confidence tag.

## Input and current-task boundary

`prepareV2Extraction(repo, source)` invokes the existing fixed source collector and returns an
in-memory `{bundle, system, prompt}`. `v2ExtractionRequest(bundle)` is the lower-level contract
helper; production callers should use the collector rather than invent bundles. It checks the
locked source identifier and source-run path boundary, but does not re-read or authenticate supplied
data. The collector performs file/digest checks. Neither helper reads target, replay or analyst-report
directories. No target-specific bug, evaluation label or diagnostic result is in the system prompt.

All historical material is untrusted evidence. Current file permissions, protected scope and stop
policy belong to the task/harness shared by both experimental conditions. Historical restrictions
may explain source behavior; they cannot grant/restrict later file access or stop a later task.
Generic tool/workflow guidance should be reviewed into common guidance, separate from experimental
strategy injection. This proposal does not retroactively change the completed experiment.

For the eventual adoption interface, report applicable/skipped/uncertain and the evidence for the
baseline gap. Distinguish proposed code, implemented code, actual execution and demonstrated effect.
No target-specific finding from the current diagnostic should be fed back into these source inputs;
a Memory revision informed by a reviewed evaluation requires a fresh held-out confirmation object.

## Validation and limits

The 2026-09-19 preparation wrapper preserves the original 103 records and adds the four original
source `workspace/spec.md` files as explicitly labeled supplemental authority records (107 total).
It does not read the v1 summaries or target reports. Missing source baseline snapshots remain
missing. Extraction is four serial calls, one per source, each capped at 15 minutes, with SDK and
provider retries disabled. Raw requests/responses and failures are retained. Known contamination
and command filters are bounded checks, not a proof of semantic grounding. Every published item
needs digest-bound source-support, policy-separation, contamination and limitations assessments
with source evidence locators. A structurally valid candidate is not automatically approved.

`verification-method-prepare-run.ts prepare|run <label>` adds one independently authored generic
G guide with no source/target context before the four extractions, for a maximum of five calls.
The preparation receipt binds payloads, runtime files and the prior 103 immutable runtime hashes.
No target/RTL run is part of that command. The generic guide is also a pending-review artifact.
See `docs/autonomous-verification-work-items-plan.md` for the next pilot's boundaries.

`parseV2Extraction(response, bundle)` enforces the exact v2 fields and enums, source references,
trajectory provenance, process/feedback references for claimed execution, explicit oracle sampling
and authority fields, and negative-experience structure. All outputs remain
`reviewStatus: "PENDING_HUMAN_REVIEW"`. A reference validator cannot prove that cited prose/logs
support a claim, that a trace shows the specified event, that a specification is authoritative,
or that a check is sound. Review those semantics before publishing or executing a strategy.

The synthetic tests exercise these boundaries and neither generate research evidence nor call a
model/compiler. Run from the repository root:

```powershell
node --test tools/mutation/verification-memory-v2.test.ts tools/mutation/verification-memory.test.ts tools/mutation/verification-source-input.test.ts
corepack pnpm exec tsc --ignoreConfig --noEmit --types node --target ES2023 --module NodeNext --moduleResolution NodeNext --allowImportingTsExtensions --strict --skipLibCheck tools/mutation/verification-memory-v2.ts tools/mutation/verification-memory-v2.test.ts
corepack pnpm exec eslint tools/mutation/verification-memory-v2.ts tools/mutation/verification-memory-v2.test.ts
corepack pnpm exec prettier --check tools/mutation/verification-memory-v2.ts tools/mutation/verification-memory-v2.test.ts docs/verification-memory-v2.md
```

Windows results validate this opt-in local contract only. Linux CI, actual model adherence, semantic
grounding, source effectiveness and stable transfer execution remain unvalidated.

On 2026-09-18, native Windows validation passed all 15 combined Node tests (7 new v2 tests plus 8
legacy/source tests), focused NodeNext noEmit, ESLint and formatting. Read-only preparation also
consumed all four real source bundles, without storing prompt bodies or creating a catalog:

| Source | Evidence records | Prompt UTF-8 bytes |
| --- | ---: | ---: |
| versatile | 18 | 178832 |
| eth | 35 | 190026 |
| ufifo | 20 | 91374 |
| openhmc | 30 | 103431 |

All 103 evidence paths were within their exact locked source-run roots, with zero target/replay
paths. No model call or RTL execution occurred during this contract validation.
