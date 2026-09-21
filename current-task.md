# Current Task

## 2026-09-21 - Reviewed repairs landed in ten scoped commits

User-authorized review/repair and ten-group local landing are complete. This final
documentation/ignore checkpoint is the tenth commit. Master started at fca0131.
Commits 1-9: 8dfbcf02, 05364bca, df92082e, 6539802e, 3fb6e9da, a39cad86, 30a00b23,
250bc034, 00f6f544. Shared CLI/package changes were staged per feature, and static import
ordering was checked. Review has zero remaining confirmed P1/P2 after five repairs:
v2 enum/provenance contracts, generic-guide length contract, I2C destructive overwrite and
skipped-validation PASS labels. Original contract/generator sources are archived locally;
historical payloads/results and all 103 previously bound runtime files remain unchanged.

Native Windows validation: repository Vitest 382 passed/2 skipped; tools Node 148 passed;
Python 3 passed; source/tests/tools no-emit types, isolated full build/test typecheck, lint,
format, diff and harness passed. Initial sandbox parallel Vitest had three process/timeout
failures; native serial rerun passed. Original dist was preserved. No Linux CI, model or
new RTL experiment was run, and no production Linux readiness is claimed.

Dataset mutation/ stays ignored; missing data still errors as requested. Local Claude
settings, root generated PNG and Python cache are excluded from commits. Ten commits,
an empty index and no tracked worktree changes were verified before remote synchronization.
Automatic approval review rejected `git push origin master` before process creation: the
local commits were authorized, but external transfer to https://github.com/Bow-Lin/rtl-agent.git
requires explicit destination-specific approval. That rejected attempt made no remote change.
User subsequently explicitly authorized pushing the ten commits to that exact repository.
Proceed with the authorized normal push; final result is recorded in delivery and the local
`.rtl-agent/commit-review-20260921/push-result.json` receipt after this checkpoint commit.
Prior experiment status remains historical evidence; no new experiment is authorized.

## 2026-09-21 - Authorized contract repair and ten-commit landing

User authorizes fixing the two review findings, then committing the agreed ten groups.
Plan: preserve the original v2 contract bytes and frozen evidence; introduce an explicit
v2.1 prompt revision with field-specific shared execution enums and declared evidence rules;
add regression tests for every advertised enum and top-level provenance failures. Do not
normalize historical responses, republish failures, run models or change missing-data behavior.
Review all remaining changes in parallel, then validate focused/all offline tests, lint,
no-emit TypeScript and scoped format/diff/harness before selective staging and ten commits.
Use isolated build output if a full build is needed; preserve original dist/runtime hashes.
Exclude mutation datasets, Python cache, local Claude settings and the root generated PNG.
Shared CLI/package changes are staged per feature; tests/docs accompany their implementation.

## 2026-09-21 - Ten-commit landing paused at review gate

User authorizes the proposed ten-commit sequence. Loaded commit-main skill and checked
current master/status before Git mutations. Two previously documented P2 defects remain
in the new verification-memory-v2.ts: prompt advertises 'not-added (oracle only)' but parser
accepts only 'not-added'; top-level evidenceIds must include trajectory and every nested
reference although the model-facing contract never states those requirements.
Eight existing Node tests pass; a read-only synthetic reproduction confirms valid control
acceptance and INVALID_CLAIM_KIND, MISSING_OBSERVATION, INCOMPLETE_PROVENANCE failures.
Independent review confirms enum defect and batch-abort consequence. Skill requires stopping
on any P1/P2 before staging/commit; no Git state changed and no source repaired. Remaining
change review, per-commit validation and all ten commits are pending user direction.
Preserve frozen historical evidence, dataset exclusion and accepted missing-data failures.

## 2026-09-21 - Commit grouping review (proposal only)

User asks whether pending changes are one concern and should be split. Static diff/import
review identifies independent fixes and multiple feature/tool layers. Proposed order:
Memory consolidation fix; Kimi signature fix; multi-IP coverage; I2C/FIFO mutation tools;
UART/AES tools; verification Memory v1 and frozen targets; FIFO diagnostics; Memory v2
and autonomous work items; common-guidance behavior change; global records/ignore rules.
Keep tests and feature docs with their implementation; split shared CLI/package hunks.
The guidance shrinks from 90 lines to two and deserves its own explicit commit scope.
This is a grouping recommendation, not per-commit validation or authorization to commit.
No source edits, staging, commit or push. Preserve dataset exclusion and missing-data errors.

## 2026-09-21 - Exclude local datasets from Git synchronization

User says dataset content does not need committing. Add root /mutation/ to .gitignore,
excluding its 558 currently untracked dataset files while preserving all local bytes.
Keep tools/mutation source, tests and preparation fixtures eligible for later review;
no staging, commit or push is requested. Existing exp_result and runtime ignores remain.
Ignore/status checks, handoff JSON, scoped diff and harness passed: 19 modified tracked
files and 147 untracked files remain. Two family-replay.test.ts integration tests read
the excluded dataset. User explicitly accepts missing-data errors and requests no change
to that behavior. Dataset provisioning is a run prerequisite, not a code-submission blocker.

## 2026-09-21 - Git synchronization status checked

Live origin/master and local master both resolve to fca01312de8df27b64c125f31f8638671da5f7d9
(2026-08-19). No committed ahead/behind difference. Before this checkpoint, Git reports
18 modified tracked files, 705 untracked files and no staged entries. Changes remain
uncommitted; user requested inspection only. No staging, commit, pull or push performed.
Only the three required handoff files are updated by this inspection; prior task state remains.

## 2026-09-21 - Discuss replacing unavailable K3; no execution authorized

User asks whether Codex-generated content can replace K3 and what must change, explicitly
requesting discussion before any start. Read-only review distinguishes replacing only the
Memory author from replacing both author and target Agent. These are options, not an adopted
protocol or launch authorization. No replacement Memory, patches, model experiment or RTL run.

Current conversation contains evaluator findings and is unsuitable as a blinded experimental
author/target context. A future study needs restricted fresh inputs/workspaces, actual author
and executor provenance, a new experiment identity, and equal N/G/M conditions. Preserve the
old source evidence and frozen K3 results. Two extraction-contract defects remain to be fixed
in a new version; existing v2 publication is hardcoded to K3/Pi transcripts. A new Codex artifact
or execution adapter must not fabricate those records. Native work-item integration is still
pending. Codex CLI help and official docs confirm structured-output/event interfaces only;
authentication/model access and actual execution have not been tested. No design choice adopted.

## 2026-09-20 - UART/AES baseline completed and reviewed

User-scoped Icarus frozen-TB baseline complete in uart-aes-baseline-20260920-v2:7 goldens,
190 mutant pairs,165 functional kills/25 survivors/0 infrastructure/0 unknown execution outcomes.
Four kills are explicitly X-sensitive Icarus cases. Independent evaluator-only witnesses confirm
uart16550/M021 and aes-pipeline/M011 have legal observable differences; both remain baseline
survived. Other23 survivor validity stays unresolved. AES Core/Tiny AES each30/30 saturated.

Publication297 files, replay workspace/runtime hashes and prior FIFO103 runtime files unchanged.
Original family-process.ts retained; scoped replay copy adds shared-lock ownership. Baseline v1
CRLF apply failure and AES witness option-order failure retained; only complete baseline v2 is scored.
22 focused tests plus strict type/lint/format, publication/audit/diff/harness checks pass at delivery.
Reports exp_result/09.20-uart-aes-kill-baseline.md/.json and09.20-uart-aes-survivor-audit.md.
No model/Memory/source-target freeze/Agent integration; no Linux Gate/formal equivalence claim.
Other tasks and extraction-contract issues remain unchanged. Further experiment design is separate.

## 2026-09-20 - UART/AES frozen-TB baseline replay authorized

Active scope: docs/uart-aes-baseline-replay.md. Run all 190 published mutants under Icarus,
then review functional failure semantics and survivors. Keep published DUT/config/TB/oracles/
mutants unchanged; exclusive result roots, no models/Memory/new IP/role freeze. Confirmed no
active related process via native read-only CIM. Implement conservative evidence and reuse
family-process with owned shared serial lock; test/typecheck/lint before real execution.
Do not count infrastructure timeout or an unaudited assertion as a kill. Old work-item extraction
contract issues and target integration remain pending and are outside this task.

## 2026-09-20 - Resume evidence audit and wording

Reviewed implemented Agent boundaries, feedback loop, Memory controls and published metrics for
resume wording. User confirms no manual-effort records and accepts verified results instead of
invented person-hours. Draft: exp_result/09.20-resume-evidence-and-copy.md. Supported asset count
is 400 single-site mutant candidates (I2C30 + FIFO180 + UART/AES190), not proven independent bugs
or 400 completed detection experiments. Fixed-I2C raw score is16/30->25/30 (+30 percentage points,
9 new/0 lost). No unified evidence found for12 modules/360 mutants/>95% mean line coverage.
No code/model/RTL changes. Prior experiment status and pending extraction-contract work below
remain unchanged. Handoff JSON, seven evidence links, scoped diff check and Git Bash harness pass.

## 2026-09-19 - Five-call preparation completed; source library not published

User explicitly authorized the fixed G1 + source4 Kimi K3 batch with "启动". All five
single-request calls completed normally; the recovery ended at 2026-09-19T10:55:29.490Z.
No active PID or serialization lock remains. Usage: 210535 total tokens; no retry or RTL run.
G passed source-isolation/content review and is frozen verbatim (253 Unicode code points).
Four source responses contain 14 raw drafts; all are rejected by the original frozen gate.
No source Memory library was published and no N/G/M target draw was started.

Source review separates real content problems from two open P2 extraction-contract defects:
unstated item-level reference aggregation/trajectory rules and the invalid model-facing enum
'not-added (oracle only)'. Do not label every rejection as bad model JSON or infer transfer
failure from gate acceptance 0/4. Preserve all raw drafts, failed markers, prompts and runtime.
Do not repair, normalize, republish selected fixed drafts or repeat any of these five calls.

The isolated recovery executed only the original uncalled eth/ufifo/openhmc requests; the
SDK cwd suffix was the disclosed payload metadata change. Seven offline recovery tests,
strict type/lint/format, real preflight and independent review passed. Final 160 bound-file
checks passed, including all 103 old runtime files. Recovery-entry review has zero open
P1/P2 findings; the two extraction-contract findings remain open for a future version.

Report: exp_result/09.19-autonomous-work-items-preparation-results.md; matching JSON records
all five calls and usage. Four source audits and a separate prompt-contract audit preserve
source evidence and the distinction between code, aggregate counters and oracle execution.
Next work must prospectively reconcile the extraction contract offline before any new batch;
new-target cohort, native workflow integration and formal method freeze remain pending.
Historical authorization-pending/running entries below are superseded by this checkpoint.

## 2026-09-19 - Autonomous work-item workflow and source v2 preparation in progress

Active plan: docs/autonomous-verification-work-items-plan.md. User closes old dpretet/M010
diagnosis; next comparison is common-workflow N/no Memory, G/generic guide and M/source v2 on
three new independent targets, three draws per group (27). Cohort scope question is pending;
current source evidence is FIFO-only and no three unused FIFO targets are ready to launch.

New isolated work-item parser/evidence-binding/three-turn loop and context policy are implemented
for engineering tests. They support zero items, review-only no-edit, pending-check continuation,
golden repair and no best-intermediate fallback. Native target entry, new cohort and complete
compiler/semantic gates remain pending; do not claim the formal method is frozen.

Prepare a bounded batch of one no-tool source-isolated G author call and four no-tool source-v2
extractions. Inputs are original103 records plus4 original specs, never13 summaries/target answers.
No retries/LLM merge; candidates and G require explicit evidence review before freezing. New
5-call preparation runtime and payloads are frozen in work-items-v2-20260919-prep1; review P1/P2
remaining0. Automatic approval review rejected launch before process creation because explicit
authorization for source RTL/trajectory/specification transmission to Kimi is missing. The exact
five-call/data-transfer question is pending; do not retry or bypass until approval. No model/RTL
call, run-started marker or active lock exists. Old103 runtime remains hash-verified.
Source preparation is separate from the future27 target draws. New result helper reports both
new and lost detection sets and does not turn timeout/invalid/missing artifacts into survivors.
Report exp_result/09.19-autonomous-work-items-preparation.md; public new-FIFO candidates in
docs/fifo-target-cohort-v2-candidates.md are unvalidated and not a frozen cohort.60 focused tests
across combined/changed-module runs plus type/lint/format/diff/harness pass. Windows only.
After explicit approval, run node tools/mutation/verification-method-prepare-run.ts run
work-items-v2-20260919-prep1; it rechecks all payload/runtime hashes and serial locks itself.
Review actual G/source outputs before any publication. Do not interpret prepared107 records as
107 experiences or the unit-tested workflow components as completed native target integration.

## 2026-09-19 - Directed Memory10 diagnostic completed

User explicitly approved prepared3draw/Kimi K3/payload batch with "启动吧". Original label
fifo-directed-memory10-20260918-v1 ran04:12:39Z–04:27:57Z;3valid final snapshots,5 Agentturns
(1,2,2), allNO_MEANINGFUL_GAIN. Independent final-only6compile/simulation pairs finished
04:31:37Z,all3golden pass andM010 killed at10/28/42ns. Correct reset-effective behavior,
actual execution and golden primary3/3. E1 full13/empty8; E2 TBjointcheck2; E3gate8total,
but only fixed-schedule42/56ns initialwindows asserted as reset-effective; delayedtail extends
past release and requires revalidation for otherTB schedules. No extra prompts/reruns/fallback.

OriginalMemory10 usable under explicitdesignation is supported; autonomous selection, solecause
of oldfailure, stable successrate and held-out transfer are not established. Single-item/context/
priority changes are jointinterventions. E1coverage96.79unchanged while newcheck killsM010.
Stop thisbatch and no more dpretet/M010 prompt tuning. Off/Memory futureprotocol must keep
same tasks/permissions/budget and use untuned target implementations for transfer evaluation.

Reports exp_result/09.19-fifo-memory10-directed-results.md and.json; semantic/process audit
JSONs frozen.5turns/39provider exchanges/343200tokens includingcache; reportedcost is notbill.
103runtime hashes (prior97unchanged),3finalmanifests/27assetfiles,7reportinputdigests verified;
5provider/5topology/8scope audits pass;24generation native processclosures confirmed;6replay
compile/simclosures confirmed; locks absent and no active experiment.18focusedtests/type/lint/
format/preflight/review pass; finaldiff/harness and reportconsistency pass. Windows/Verilator5.050;
LinuxCI notrun, process/signal portability still requires Linuxevidence before readiness claims.
Prior2x2/v1/v2/UART-AES unchanged. No required work remains for this fixeddiagnostic.

## 2026-09-18 - Objective/stop audit complete; directed Memory10 launch awaiting approval (historical)

Pause expansion of unchanged full-v1/generic-check conditions. Audit actual task objective,
DUT-only coverage score, checker-only changes and NO_MEANINGFUL_GAIN boundaries without
model calls. Then one predeclared batch of3 fresh directed Memory10 draws, same baseline/K3/
permissions/max3/early stop, final-only evaluation after all3. Original item untouched;
no C3 code, sampling answer, absolute time or M010 in generation context. New isolated files
only; old97 runtime/protocol/results and UART/AES remain unchanged. No new run launched yet.
Plan docs/fifo-memory10-directed-diagnostic.md.18 focused tests/type/lint/format/preflight and
harness pass,103 runtime hashes include prior97 unchanged. Review native/Agent process cleanup
gap fixed with explicit close/timeout/error audit before advancing; independent re-review passed.
Objective/stop audit complete:coverage closure prioritized; zero-gain checker preserved and
golden tested, but NO_MEANINGFUL_GAIN ends whole sample; no active native experiment found.
This is designated-work-item development diagnosis,
not autonomous selection or blind-transfer evidence. Stop tuning this case after this batch.

Launch of fifo-directed-memory10-20260918-v1 was rejected by automatic approval review before
process creation: reviewer requires explicit authorization for this3draw batch and repository/
Memory payload to Kimi coding API. User asked through async approval question. No campaign or
sample output exists, no active lock,0 model calls/0 newRTL. Do not retry or bypass pending
authorization. All unaffected audit/preparation complete. Ready receipt:
exp_result/09.18-fifo-directed-preflight.json. Launch same validated command after authorization;
recheck immutable code/protocol/prior97 hashes and idle state, do not change prompt or resample.

## 2026-09-18 - Fixed-v1 usage mechanism 2x2 diagnostic completed

Campaign fifo-usage-v1-20260918-0931 sealed12 terminal samples at02:41:05Z after25 Agent
turns.11 valid finals plus A3 generated-extra-DUT failure; final-only independent evaluation
finished02:52:08Z with22 compile/simulation pairs,11 golden passes,2 raw M010 kills/9 survivors.
Correct reset-effective implementation+execution+golden primary: A0/3, B0/3, C1/3, D0/3.
C3 negedge checks execute FULL13/EMPTY8 times in final generation counters, golden185reads,
M010 FULL_IN_RESET at10ns. D1 raw kill75ns is post-release FULL_AND_EMPTY, not primary success.
All other available finals lack required window. No observed Memory increment; one C success
does not establish stable generic-check gain or Memory harm. Known-target development only.

Original frozen13/spec/core runtime/v2/prior scores/UART-AES unchanged.97 frozen runtime hashes,
12 identical baselines/config/spec,12/12 frozen Memory turns and13/13 generic-check exposures
verified.25 provider passes,24 topology passes+1 failure,35 scope passes.1,577,998 totalTokens
includes failed A3. A3 both provider turns complete; original queue mislabels noexecution as
infrastructure; preserve raw and explicit recovery-sidecar correction to generation-failed.
No rerun/no fallback; only original pending D3/B3 resumed after idle inspection. Original
plan/runtime remain hash-locked. Both FIFO/family locks absent; no active experiment remains.

Report: exp_result/09.18-fifo-memory-usage-2x2-results.md and .json; supporting AB/CD/process
audit JSON files contain per-sample code, counters, transcripts and digest-bound raw evidence.
Protocol docs/fifo-memory-usage-2x2.md and recovery doc preserve predeclared rubric/deviation.
29 focused Node tests, NodeNext/type/lint/format and recovery real-data preflight passed;
independent code review issues resolved before launches. Final diff/harness/report audit passed;
97 frozen runtime hashes,6 input digests,11 final manifests and15 report links rechecked.
Windows Verilator5.050; Linux CI unavailable on this host, process/signal behavior
requires Linux follow-up before any Linux readiness claim. No new experiments/v2 calls pending.

## 2026-09-18 - Three bounded Memory diagnostic actions completed

Implemented isolated known-M010 reset-window diagnostic from hash-checked original baseline.
Two serial native Verilator5.050 cases: golden PASS161 reads with reset-active observations
at70ns/6888ns; M010 RESET_ACTIVE_FLAG_VALUE at70ns (resets0,full1,empty1). Baseline controls
both survived. Single TB check insertion only; no FULL_AND_EMPTY or changed stimulus. Original
29 frozen/evidence hashes preserved. This is post-hoc mechanism evidence, not blind transfer.
Root .rtl-agent/fifo-diagnostics/reset-window-20260918-v1; report
exp_result/09.18-fifo-reset-mechanism-diagnosis.md. New tool diagnose-fifo-reset.ts uses fixed
argv; scoped review issue fixed and rechecked. No process/lock left active.

Memory1/9/10 adoption audit covers24 snapshots,24 raw coverage files,168 C++ files; report/JSON
exp_result/09.18-fifo-memory-adoption-audit. Memory1 implemented in all4 frozen but off fills
same bins (dpretet36/axis18); architecture largely baseline;45 UNKNOWN paths compiled away.
Dpretet all12 snapshots lack reset-active flag checking; AXIS R2 off has synchronous active
reset checking. No invalid valid/ready mapping found. Preserve code/runtime evidence distinctions.

Added opt-in verification-memory-v2.ts/test and docs contract for scenario/oracle/window/
correctness authority, source observations vs hypotheses, negative lessons and current-policy
separation.15 combined Node tests/typecheck/lint/format pass; four real sources103 records
prepare successfully with0 target/replay paths. No new model call/catalog/default-v1 change.
Next needed: isolate source strategy evidence and test faithful Agent enactment on held-out
objects if authorized; existing diagnostics cannot establish general transfer or stability.
Windows-only; Linux/formal acceptance and semantic review remain separate. UART/AES unchanged.

## 2026-09-18 - Memory text and reset-oracle evidence review

User redirected research toward a checkable source-strategy -> target applicability -> baseline
gap -> verification gain -> stable Agent reproduction chain, instead of more off/frozen repeats.
Exported all13 frozen Memory items verbatim plus baseline/R2 off/frozen checker implementations
to exp_result/09.18-fifo-memory-and-full-empty-evidence.md; items digest matches frozen manifest,
all52 trigger/strategy/applicability/limitations fields verified verbatim. Snapshot unchanged.
Static code+existing logs identify a narrow M010 observation gap: mutation changes wfull reset
0->1, both final FULL_AND_EMPTY assertions catch it at75ns after reset release70ns, whereas
baseline RESET_FLAGS waits until140ns. Both baseline/first checkers only test known flag values.
This supports reset observation timing, not a new stimulus or Memory-specific causal benefit.
Generic cross-domain full/empty mutual exclusion remains a separate applicability question;
do not invalidate this concrete reset kill solely from a general CDC concern. No new simulation,
model call, asset edit or score change. Next research is strategy applicability/causal review.
Other completed FIFO and UART/AES checkpoints remain intact.

## 2026-09-18 - FIFO target recovery completed; paired results audited

Campaign fifo-target-recovery-20260917-153613 finished8/8 at2026-09-17T13:15:07.022Z
(21:15+08), lock absent and original PID15408 gone. Off/frozen quality endpoints tie:
dpretet R1 baseline/first/final kills12/12/12, R2 12/12/13 (M010 added); axis all26/26/26.
Coverage both modes dpretet96.79->99.01, axis80.80->81.75, first=final in every run.
Audited17 provider/17 topology/24 scope records; identical paired baselines/config and
unchanged frozen13 Memory/suite; actual frozen requests contain full Memory. Independent
replay audit verifies744 compile/simulation pairs,24 golden passes,720 mutant verdicts,
720 patch applications/digest audits, no invalid/timeout/not-run. Axis R2 off had one
intermediate golden RESET_TVALID_HIGH failure repaired within3-call budget; endpoints valid.
Token totals off1097482/frozen1422047 (+29.6%). No observed paired quality benefit;
only2 repetitions per condition, Windows/non-authoritative, semantic/equivalence review pending.
Report and structured evidence: exp_result/09.18-fifo-target-recovery-results.md and .json.
No new experiments or process actions. Supersedes historical FIFO running checkpoints;
UART/AES publication state remains intact. Next optional work is semantic/cause review.

## 2026-09-17 - UART/AES dataset published; preparation complete

Seven new implementations are accepted at mutation/uart-aes-transfer-v1: 190 mutants,
OSDVU10 and the other six30 each. All seven Icarus/Verilator goldens and190 dual frontend
checks pass; static review is patch-bound, actual190 patch applications/reconstruction pass,
and audit-published reports7 IPs/190/hash pass. Existing AES baseline entry hashes verified;
FIFO assets/results unchanged. Sources/targets remain unassigned; no model/Memory/kill replay.

Final roots: uart16550-v4, wbuart32-v3, osdvu-v1, uart2bus-uart-v1, aes-core-v1,
tiny-aes-v2, aes-pipeline-v1. Native Windows13 focused tests, typecheck/lint/format and final diff/harness pass. No Linux CI/formal readiness. Preparation process
logs/ownership/pause guards replace only this tool's old synchronous wrapper. Old diagnostics
and pause/resume evidence retained. See bundle README and exp_result/09.17-uart-aes-preparation-progress.md.
Heartbeat uart-aes is PAUSED after successful publication and final checks. This supersedes only earlier UART/AES
waiting/running checkpoints; other tasks' records remain unchanged.

## 2026-09-17 21:35 +08 - UART/AES serial validation resumed

FIFO complete.json lists8 conditions, campaign lock absent and read-only process audit is idle.
Prior pause archived under .rtl-agent/family-pause-history/20260917-2135-pause.json with resume
evidence. New preparation-only process runner persists live logs/ownership, checks FIFO/pause
before and during each command, terminates only owned trees and retains pause/lock on failures.
Native Windows12 tests pass, focused typecheck/lint pass. Restricted test first could not confirm
taskkill; native rerun passed and failed scratch evidence retained. No old process bypass.
UART16550-v4 golden+30 frontend+coverage passed (same raw coverage digest as v3); TinyAES-v2
golden+30 frontends passed with identical patches/TB to v1; v2 coverage is currently running.
Next complete TinyAES, AESpipeline, static-review digest binding, real patch audit, exclusive
publication and final verification. C++ profile -O0 avoids prior optimizer stall; RTL unchanged.
This replaces only UART/AES waiting state; no FIFO assets/results or model experiment changed.

## 2026-09-17 16:34 +08 - UART/AES idle check; FIFO still running

Read-only process identity audit confirms old Tiny AES descendants have exited. FIFO campaign
PID15408 remains active; first off condition completed and dpretet-r1-frozen is in replay
(child15140 and its Verilator/compiler descendants). Keep preparation pause marker and heartbeat
active; no RTL job, model call or publication started. This supersedes only the residual-process
uncertainty in the earlier UART/AES checkpoint. Resume when the whole FIFO queue is idle.

20:57 +08 recheck: FIFO15408/replay20920 active, axis-r2-off;7/8 complete;
Tiny AES residuals absent. Pause/heartbeat unchanged; no RTL launch or process mutation.


## 2026-09-17 - Authorized FIFO cache cleanup completed

User approved deleting the previously listed files. Removed exactly2736 generated compiler
cache files,144285181 bytes (137.60 MiB), without removing any parent directories. All listed
paths are absent; all1740 retained files in affected roots plus frozen Memory have unchanged
SHA256 hashes. Seven fixed regression dependencies remain intact. Active recovery and UART/AES
roots are excluded; no process actions or new experiments. FIFO execution state remains below.
Original inventory preserved; receipt .rtl-agent/cleanup-audits/fifo-failure-20260917-deletion.json;
report exp_result/09.17-fifo-cleanup-inventory.md updated. JSON, git diff --check and harness passed.
This supersedes only the earlier cleanup-inventory no-deletion checkpoint.

## 2026-09-17 - UART/AES paused; idle continuation authorized

User explicitly requires serial RTL execution with FIFO and authorized a 30-minute heartbeat.
Automation `uart-aes` is ACTIVE in this thread: wait for FIFO and residual Tiny AES compiler
processes to exit, then complete local preparation/audit/publication and disable itself.
The initial unapproved automation attempt was rejected; creation succeeded after user consent.
No more RTL jobs launched after the pause. Own Node19648/Verilator20220 stopped; Windows denied
termination of descendant make15168 (start15:42:01), make4560/g++11972/cc1plus3408 (15:44:36).
Verify identities/natural exit, never touch FIFO or infer process identity from PID alone.

All7 Icarus probes pass. Six final configs have160 frontend-checked mutants; UART16550-v4
final30 pending (v3's30 excluded diagnostics). OSDVU10/30, expected total190 pending acceptance.
Four final roots have complete coverage; UART16550-v3 has diagnostic coverage. TinyAES-v1
coverage interrupted, AESpipeline pending. No publication, model calls, Memory or kill replay.
Pause marker .rtl-agent/family-preparation.pause.json blocks new CLI RTL jobs. Fix bounded
process/evidence handling before large resumed builds. Follow docs/uart-aes-dataset-preparation.md
and exp_result/09.17-uart-aes-preparation-progress.md for final roots, commands and audit steps.
This checkpoint supersedes only earlier UART/AES progress; other tasks/FIFO state stay intact.

## 2026-09-17 - Cleanup inventory only, no deletion

User asked to list useless files from failed experiments. Inventoried fixed old target failure
roots, two documented failed source replays, and optional baseline/smoke validation caches.
2736 generated compiler files total144285181 bytes (137.60 MiB) are rebuildable candidates.
Retain provider/process/result logs, all TB/checker snapshots, coverage.dat/coverage.info,
patches/manifests and Memory; old off snapshots/raw coverage are regression-test dependencies.
Current recovery campaign PID15408 alive and first off condition entered replay (96.79->99.01);
all active campaign roots excluded from inventory. No experimental files deleted or moved.
Report exp_result/09.17-fifo-cleanup-inventory.md; exact candidate file list in
.rtl-agent/cleanup-audits/fifo-failure-20260917.json. Verified2736 unique paths/sizes and
absence of active paths/evidence extensions. Documentation/JSON/diff/harness validation only.

## 2026-09-17 - UART/AES seven-IP preparation in progress

User authorized first batch UART4/AES3 with 30 mutants per new implementation as a target,
reporting shortfalls without padding; roles stay unassigned. Existing AES/FIFO are reused.
Seven isolated public source checkouts are pinned; seven Icarus golden probes pass.
New family preparation/publication tools and fixtures live under tools/mutation, with plan
in docs/uart-aes-dataset-preparation.md. Native toolchain typecheck/lint and nine tests pass.
Static review excludes dormant, overwritten-reset and duplicate sites. Six have30 candidates;
OSDVU10 under unchanged FIFO lexical operators. Not published yet. Serial Verilator coverage
is active via the current task's foreground command (UART4 and aes-core complete at checkpoint,
tiny-aes then aes-pipeline pending). Final uart16550-v4 preparation/coverage still required;
prior uart16550-v1/v2/v3 and wbuart32-v1/v2 remain excluded diagnostics. Do not overlap RTL jobs.
No model calls, Memory changes, FIFO recovery actions or source/target experiments in this task.
Next finish validations, patch audit, static-review digest binding and exclusive publication.


## 2026-09-17 15:36 +08 - Recovery campaign running

User confirmed the disclosed K3 payload/destination by replying "继续恢复". Automatic approval
accepted the scoped launch. Hidden PID15408 owns fifo-target-recovery-20260917-153613,
superseding fifo-target-20260917-1120 diagnostics. Current first condition dpretet R1 off.
Queue8: dpretet off/frozen/frozen/off, axis off/frozen/frozen/off; max3 iterations and
fixed30 baseline/first/final replay per condition. Do not overlap or restart.

Root .rtl-agent/fifo-target-campaigns/fifo-target-recovery-20260917-153613; main logs
.rtl-agent/automation-logs/fifo-target-recovery-20260917-153613.stdout.log and .stderr.log.
active.lock binds PID15408. Plan locks same13-item Chinese Memory and original suite hashes;
boundaryVersion target-recovery-v2. Provider completion/topology/raw-domain guards enabled.

Read-back confirms live parent process, plan and coverage-start log; no launch stderr.
No code changes or model reruns during this launch turn. Reuse previously passed18 Node/10
Vitest tests, typecheck/build/lint and2 guarded golden baselines. Diff/harness/handoff checks
pass. No comparative result yet; Windows-only non-authoritative evidence. Next inspect
progress/failure, complete provider audits and replay outcomes; preserve all failures.
This checkpoint supersedes earlier active-PID and launch-blocked entries.

## 2026-09-17 - User confirmed disclosed K3 payload; resume launch

After the explicit confirmation request naming target RTL, TB/checker, experiment feedback,
instructions and frozen13 Memory sent to Kimi coding API (https://api.kimi.com/coding, K3),
user replied "继续恢复". This confirms that disclosed external payload/destination and
8-condition serial recovery scope. Prior launch rejection was not executed; no active lock.
Existing validated guards and golden evidence remain current. Launch a fresh replacement label
with supersedes fifo-target-20260917-1120, no old artifact changes or silent trial retry.

## 2026-09-17 - Recovery ready; automatic approval blocked launch

Implemented target provider completion, seeded sole-DUT topology and full raw coverage-domain
guards; both conditions share explicit fixed-instance guidance.18 Node tests,10 focused Vitest,
full typecheck/build, tools typecheck/lint and diff/harness pass. Both guarded golden baselines
unchanged dpretet96.79/axis80.80; original seed hashes and Memory manifest unchanged. Review
found missing-domain failure could bypass audit; fixed with failed scope audit and regression.

K3 no-tools ACK network probe passed at07:08:48Z outside default restricted network; default
sandbox probe failed Connection error. Proposed hidden serial replacement8 launch was REJECTED
by automatic approval review, not executed: repeated external K3 requests carry repository-derived
context; reviewer requires explicit payload/destination authorization. No workaround or retry.
No active campaign or new PID. Await explicit permission for model input (target spec/public DUT
RTL/TB/checker/golden coverage feedback/guidance and frozen13 Memory) to https://api.kimi.com/coding.
Reviewable preflight: exp_result/09.17-target-recovery-preflight.md. Old artifacts untouched.
Upon approval launch new target-campaign label with supersedes fifo-target-20260917-1120.
Windows only; Linux CI/formal readiness not claimed.

## 2026-09-17 - Authorized controlled target recovery plan

User asked to continue after connection failure. Preserve prior campaign as diagnostic: off
final changed DUT configuration; frozen provider turns incomplete. Run a fresh explicit
replacement campaign with the same 8 conditions, K3/Chinese13/max3 and score/stop rules.
Before launch: target-only fixed topology guard locks seeded TB prefix through sole DUT
instance, rejects extra DUT/raw modules/defparam/macros; coverage denominator must remain
constant. Add target provider completion audit rejecting errors even after edits. Strengthen
identical off/frozen spec constraints, test prior failure regressions, typecheck/lint/build,
model-free golden baselines, then one isolated K3 connection canary. Serial hidden launch
only after positive connection evidence and no active prior campaign. No silent retry or
changes to frozen Memory, original DUT or mutants. Linux readiness remains unclaimed.

## 2026-09-17 - Target status audit: connection failure and off configuration drift

Campaign fifo-target-20260917-1120 stopped at 12:02:11 +08; failure.json confirms
CAMPAIGN_STOP_AGENT_FAILED. PID18392 no longer present via Get-Process, active.lock absent.
Win32_Process command-line inventory denied by current sandbox; no escalation attempted.
Frozen dpretet R1 attempt3 has four provider Connection error responses, zero generated
content; no RTL change/violations/timeout. This is connection infrastructure failure, consistent
with user-reported possible network outage, not a Memory quality failure. Frozen attempt2
passed golden and reached99.01 from96.79, but its provider turn also ended in four
Connection errors after successful edits. Thus measured snapshot exists, not a cleanly completed
model turn. All13 Memory items reached actual provider request.

Off R1 executed fully: 93 compile/simulation records and90 digest-audit records; all3 goldens
passed, baseline/first/final kills12/12/13, gained M004 only. But final TB added second
TopModule FALLTHROUGH FALSE (attempt3 line16), changing fixed target config and coverage
denominator (toggle486->780, line7->8); final score95.08 is not comparable. Final13/30 is
diagnostic/out-of-protocol, not accepted fixed-configuration evidence. First score99.01.
Remaining conditions not completed; axis not started. Do not claim1 valid finished comparison.
No restart/model call/snapshot changes during status audit. Next enforce instance/parameter
boundary and distinguish provider errors from no-edit outcomes before controlled continuation;
preserve existing artifacts and record any replacement trial explicitly, no silent retry.
Validation: parsed campaign/results/provider records and replay counts; handoff JSON/diff/harness.

## 2026-09-17 - FIFO target campaign launched (current active process)

PID18392 owns serial campaign fifo-target-20260917-1120; first child PID17860 runs
dpretet R1 off. Queue: dpretet off/frozen/frozen/off, then axis off/frozen/frozen/off;
each max3 Agent attempts followed by fixed30 baseline/first/final replay. Two independent
repetitions per condition; no seed-control claim or cross-run state reuse.
Frozen Chinese K3 13-item snapshot unchanged, select-all-v1 advisory injection; review stays
PENDING_HUMAN_REVIEW. Per-attempt selection/digest and provider-request exposure audit.
Campaign root .rtl-agent/fifo-target-campaigns/fifo-target-20260917-1120; main logs
.rtl-agent/automation-logs/fifo-target-20260917-1120.stdout.log and .stderr.log.
Exclusive .rtl-agent/fifo-target-campaigns/active.lock. Do not overlap or restart.

Implemented target provider locks/assets, frozen adapter, coverage child, serial campaign and
generalized target replay. Validation: 3 Node tests,10 focused provider/CLI Vitest tests,
full pnpm typecheck/build, focused tools NodeNext/ESLint, diff/harness pass. Both actual golden
baselines passed (dpretet96.79; axis80.80). Isolated diagnostic replay smoke: both goldens
pass; dpretet M001 survived, axis M001 killed, patch/digest checks passed. Smokes excluded.
Windows evidence only; no Linux CI/formal readiness. Initial build/test fixture schema errors
were corrected before successful validation and model launch. No source/old Memory changes.
Next inspect campaign progress/failure and actual provider evidence; preserve failures, never
automatically retry. No comparative result claimed yet. This supersedes earlier active PIDs.

## 2026-09-17 - Implement and launch target repetitions

Plan: add locked dpretet/axis providers using published golden source and seeded TB; preserve
DUT module bytes via parameter-compatible TopModule alias in seeded TB only. Add bounded
verification-specific select-all frozen adapter using existing injection transport, with
manifest/item digest locks and exclusive per-attempt evidence. All 13 items included verbatim;
no additional selector inference or target-derived updates. Off remains unwrapped.
Implement serial 8-run campaign with per-condition baseline/first/final mutation replay and
fail-closed infrastructure handling. Validate focused tests, typecheck/lint/build, two golden
baselines and digest checks before model launch. Original review status stays pending.
Windows evidence only, not formal Linux readiness.

## 2026-09-17 - Target execution authorized; pre-experiment questions

User authorized entering target experiments and first asked about Memory language and execution
plan. Existing protocol confirmed: dpretet/axis, two paired rounds each, R1 off/frozen and
R2 frozen/off, max3 iterations, identical seed assets/config, frozen30 evaluation-only mutants.
Plan: retain original Chinese snapshot to avoid language confound; lock digest and record pending
review status without claiming human approval. Implement/test verification Selector and target
fixtures/replay before serial launch. Enforce runner stop rules and target interface contracts
over advisory Memory; preserve selection/injection evidence, no target Memory writes.
No target run launched yet: selector integration and target adapters remain prerequisites.
Report coverage, golden, first/final raw mutation kills, cost/time and failures; Windows evidence
is non-authoritative. Language effect on K3 RTL verification is unmeasured.
Validation: protocol/code inspection, handoff JSON, diff and harness checks.

## 2026-09-17 - Displayed all 13 K3 Memory items

Read the complete frozen items.json and pipeline contract. Presented a concise Chinese
rendering of each item to the user with source families and applicability caveats.
Initial content review flags: saturation-stop wording must not override runner stopping rules
or pre-accept residual bins; selfchecking flags require domain latency and IP contract checks;
Gray-code quadrant and full-replace sequences are implementation-specific. These are preliminary
content concerns, not a completed source-trajectory semantic audit. Snapshot remains immutable
and PENDING_HUMAN_REVIEW; selector/targets not started. No model calls or code edits.
Validation: items JSON read successfully; handoff JSON/diff/harness checks.

## 2026-09-17 - FIFO session takeover after previous session stalled

Recovered from repository state and persisted artifacts. K3 build k3-build-20260917-100104
finished at 10:08 +08 with 13 frozen Memory items, PENDING_HUMAN_REVIEW.
Rechecked item count, items digest and all four Experience digests; publication log agrees.
No active FIFO build/replay process observed. Historical running PID12500 is superseded.
Next review semantic grounding of the 13 items, then selector integration before targets.
No experiment restarted, no model call, no business logic changes. This session owns continuation.
Validation: artifact JSON/count/digests pass; documentation handoff only.

## 2026-09-17 - Whole IP transfer dataset scope clarified

User means the entire IP knowledge-transfer dataset, not only FIFO. Inventory distinguishes
RTL Generation/Debug benchmarks (VerilogEval/ChipBench) from verification IP assets:
I2C x1, FIFO x6, AES x1, Arbiter x1 (9 implementations, 4 functional families).
I2C has coverage/mutation replay; FIFO has 4+2 transfer protocol and K3 snapshot; AES/Arbiter
have golden coverage baselines only. No unified cross-family source/target split is established.
Discussion only; no new experiment or protocol change. Continue overall dataset design discussion.


## 2026-09-17 - Dataset structure discussion and publication observation

Read-only artifact inspection found K3 build k3-build-20260917-100104 published at
2026-09-17T02:08:22.520Z: 13 items, PENDING_HUMAN_REVIEW, selectorIntegrated=false.
Parsed manifest/items and verified item count and SHA-256. Full semantic/provenance review
not performed. Current protocol is four sources/two targets; frozen preparation retains
historical three/three labels. No experiment launched or modified. Next review snapshot
and integrate selector before target comparisons. This supersedes the build-running checkpoint.


## 2026-09-17 10:01 +08 - K3 verification Memory build running

Implemented verification:memory prepare/build using tools/mutation/verification-memory*.ts.
Four source collectors (103 evidence records) -> independent K3 extraction -> K3 consolidation
-> schema/reference checks -> manifest-last isolated frozen snapshot; no fixed item count.
Codex six-item draft excluded. Real provider/model configured kimi-coding/k3, no fallback/tools.
Build PID12500: node tools/mutation/verification-memory-run.ts build k3-build-20260917-100104.
Output .rtl-agent/verification-memory/k3-build-20260917-100104; logs
.rtl-agent/automation-logs/k3-build-20260917-100104.stdout.log and .stderr.log.
Last observed stage extract-versatile; no published snapshot yet. Do not overlap/restart.
Validation: 8 Node tests, focused NodeNext typecheck, ESLint, pnpm build, four-source dry prepare,
git diff --check and harness pass on Windows. Linux CI not run; semantic grounding needs review.
Next inspect process and stage transcripts/Experience/manifest; failed builds are diagnostics,
never substitute Codex summaries. No new source/target experiments or stopping-rule changes.
This checkpoint supersedes all historical PID/phase entries. User requested implementation,
not target evaluation; selector remains separate future integration.

## 2026-09-17 - Implement K3 verification Memory pipeline

Authorized: project-owned K3 per-source extraction, pooled consolidation, evidence validation
and isolated snapshot publication. Do not use assistant-curated six-item draft as model input.
Plan: fixed-source full response/write-edit trajectories plus golden/coverage evidence and TB
snapshots; no-tools isolated Pi sessions; four extractions then one consolidation, schema and
reference validation, immutable audit artifacts and atomic manifest-last publication. Record
configured and returned model, prompts, payload, usage/cost/time. Reject non-k3 responses.
Validate synthetic tests, source dry preparation, focused typecheck/lint/build and harness.
No source/target experiments or stopping-rule changes. Existing RTL Memory untouched.

## 2026-09-17 - Six coverage-only Memory review candidates organized

Delivered exp_result/09.17-fifo-coverage-memory-candidates.md. Read seven original response
Validation: seven transcript SHA-256 matches; state JSON parses; git diff --check and
scripts/harness_check.sh pass. Documentation-only change; no model/compiler tests rerun.
narratives; audited four result files and 32 process records (eth first simulation exit1,
others exit0, no timeout). Six generalized strategies with provenance, conditions and caveats.
Assistant curation only, NOT separate Kimi summarizer/consolidator output or executable snapshot.
No long process, no new experiments, no stopping-rule changes; targets not started. Future
dual coverage/kill-goal source experiment explicitly deferred. Next review evidence and implement
isolated reproducible verification Memory publication/selector before any target evaluation.

## 2026-09-17 - source-only Memory curation scope and plan

User requests organizing existing coverage-only source experience first. Do NOT start the
new dual coverage/kill-goal experiments or targets. Preserve old stopping rules and evidence.
Plan: read all seven source response narratives without keyword deletion; verify source
result/process evidence; consolidate generalized strategies into a reviewable Markdown
Memory candidate with evidence references, applicability and limitations. This session's
assistant performs semantic curation; no separate Kimi Summarizer call is implied. Do not
publish an executable frozen snapshot or claim selector integration. Validate references,
transcript hashes, process outcomes, diff whitespace and harness. No active long process.

## 2026-09-16 12:49 +08 - trajectory filter implemented; review found low utility

No experiment process. Added verification-trajectory.ts/test.ts: fixed4 source7 attempts,
response text only (never request/tool args/results/thinking), explicit paragraph exclusion
for oracle/scoreboard/mutation/target/code, evidence/paragraph SHA and unverified-claim labels.
Generated .rtl-agent/verification-memory-inputs/four-source-narratives-v1.json exclusively.
6 combined boundary tests,explicit typecheck,ESLint,build pass; Windows only.
Manual inspection of24 retained paragraphs found most boilerplate: coarse paragraph exclusion
discarded useful strategy context. NOT approved for model submission or consolidation.
No Experience/model call/Memory snapshot created. Do not pretend this draft is useful Memory.
Next refine narrative extraction granularity and review concrete source-only strategy evidence,
add actual per-attempt golden feedback projection, then verification-specific summarizer/
consolidator/selector. Old RTL validators/Memory and targets unchanged; no active PID.

## 2026-09-16 12:45 +08 - verification trajectory input plan

No active process. Implement source-only narrative export from fixed4 source transcripts,
response text only, never request/tool arguments/results/thinking. Fail closed on oversized
input; discard paragraphs containing scoreboard/oracle/patch/mutant/target/code material and
retain paragraph/transcript digests with explicit unverified Agent-claim labels. Bind actual
golden process exit per attempt separately. Unit-test injection/target/code exclusion and
materialize exclusive four-source narrative bundle. Not Memory; next constrained model
summarizer/consolidator with evidence-bound output and frozen target-only selector integration.

## 2026-09-16 06:49 +08 - four sources complete; Memory input boundary started

Session Briefing: no long experiment process. openHMC replay93 pairs/90 hashes audited,
22/30 all3 stages,0 gained/lost,8 survivors pending human review;1560126ms summed time.
Report exp_result/09.16-openhmc-mutation-replay.md. All4 source runs/replays finished.
Implemented tools/mutation/verification-source-input.ts plus3 rejection/projection tests.
Fixed4 source result paths/digests, target/path tricks rejected; scalar projection excludes
raw transcript/RTL/mutation/oracle. Materialized exclusive
.rtl-agent/verification-memory-inputs/four-source-metrics-v1.json. This is METRICS AUDIT ONLY,
not extracted Experience, consolidated Memory or snapshot. No model call this checkpoint.
Node tests3/3, explicit typecheck, ESLint,build pass; Linux CI not run.
Next implement verification-specific source trajectory sanitization/summarizer/consolidator,
then selector and target fixtures; preserve old RTL Experience validators and snapshots.
No active PID; all earlier active PID entries historical. Targets still wait for actual frozen
source-only verification snapshot. Source evaluator reports never enter Experience.

## 2026-09-16 06:45 +08 - Memory input boundary implementation plan

No active process. openHMC93 process pairs/90 hashes audited22/30 all stages,zero gain/loss.
Implement separate source-only input metrics audit: fixed4 runs, targets rejected, scalar
projection strips raw transcript/RTL/mutation/oracle, exclusive output and provenance digest.
Validate unit rejection tests, explicit typecheck/lint/build. This is not extracted Experience
or Memory. Next verification-specific summarizer/consolidator/selector; do not weaken old
RTL Experience validator which rejects testbench. Targets wait for frozen verified snapshot.

## 2026-09-16 00:45 +08 - openHMC replay active

Session Briefing: source finished96.87->99.75,2 attempts,NO_MEANINGFUL_GAIN;9 process exits0.
111615 tokens,cost0.2422056,no Provider errors; snapshots0/2/3 retained.
Report exp_result/09.16-openhmc-source-coverage.md. Added fixed replay-openhmc.ts with
published raw path/snapshot normalization and mutant digest guard. Verdict unit test,
explicit tool NodeNext typecheck, ESLint, build pass. Linux CI not run.
No prior long process. Hidden PID6720 runs node tools/mutation/replay-openhmc.ts
.rtl-agent/fifo-replays/openhmc-20260916-004432.
Logs .rtl-agent/automation-logs/openhmc-replay-20260916-004432.stdout.log and .stderr.log.
Integration running; do not overlap any model/Verilator task. Next audit3 goldens/90 mutants,
report final source, implement isolated verification Experience/consolidation/selector.
Four source model runs done, final replay pending. Memory not built, targets not started.
Old RTL timeout decision still pending, original180/old snapshots unchanged.
This active PID supersedes older active entries.

## 2026-09-16 00:43 +08 - openHMC replay plan

No active process. Audit source snapshots0/2/3 and golden coverage process evidence.
Adapt fixed ufifo replay to published openHMC source path, preserve30 and raw/normalized
digest checks. Validate verdict tests/typecheck/lint/build, launch isolated serial replay.
Only after final source replay audit implement source-only verification Memory consolidation.

## 2026-09-15 18:46 +08 - openHMC source running

Session Briefing: ufifo replay audited93 process pairs/90 hashes,30/30 all3 stages,
no gains/losses/timeouts. Report exp_result/09.15-ufifo-mutation-replay.md.
OpenHMC adapter tests10/typecheck/lint/build pass; hidden PID13840 running
node apps/rtl-core-loop/dist/index.js project-coverage --project openhmc --agent pi --iterations 3.
Logs .rtl-agent/automation-logs/openhmc-source-20260915-184524.stdout.log and .stderr.log.
Independent Memory off, golden-gated. No concurrent experiment; next audit then openHMC replay.
Old RTL paused, Memory/180 mutants unchanged. Prior active PIDs historical.

## 2026-09-15 18:43 +08 - openHMC source plan

No long process. Ufifo replay complete30/30 all3 stages, no gain; audit93 process pairs and
90 mutated hashes, report saturation honestly. Add openHMC lock/wrapper/source seed TB,
fixed DWIDTH8/ENTRIES8 independent max3 Memory-off. Validate provider/CLI tests,
typecheck/lint/build then baseline-gated source run. Original180 mutants/old Memory immutable.

## 2026-09-15 12:44 +08 - ufifo coverage done, replay active

Session Briefing: no prior long process. Ufifo97.01->97.48,one Agent attempt,existing
NO_MEANINGFUL_GAIN stop; first/final both snapshot2. All6 process exits0,62080 tokens,
cost0.1428312,no Provider errors. Report exp_result/09.15-ufifo-source-coverage.md.
Added fixed replay-ufifo.ts using raw published rtl/ufifo.v, snapshot digest/normalized
source equality,3 separately gated stage replays of frozen30, no model or Memory.
Verdict unit test, explicit NodeNext typecheck, focused lint/build pass. Linux CI not run.
Hidden PID11804 runs node tools/mutation/replay-ufifo.ts .rtl-agent/fifo-replays/ufifo-20260915-124354.
Logs .rtl-agent/automation-logs/ufifo-replay-20260915-124354.stdout.log and .stderr.log.
Integration in progress; do not overlap any experiment. Next audit90 outcomes and report;
then implement openHMC source adapter/run. Old RTL pause/Memory/180 mutants unchanged.
All older active PIDs are historical. No kill gain or target transfer result claimed.

## 2026-09-15 12:42 +08 - ufifo replay plan

No active process. Ufifo source complete97.01->97.48,one Agent attempt,NO_MEANINGFUL_GAIN.
All6 compile/sim/coverage process records exit0. First/final both snapshot2, not two improvements.
Adapt fixed eth replay to ufifo raw rtl/ufifo.v and snapshots0/2/2; keep frozen30 unchanged.
Validate verdict tests, explicit tool typecheck/lint/build, then launch serial hidden replay.
Memory and openHMC/target stages remain pending; do not change early stop to chase gain.

## 2026-09-15 06:44 +08 - eth complete; ufifo source launched

Session Briefing: no old experiment process. Eth63 compile/sim pairs audited, baseline26/30,
final27/30, gain M008 only,0 loss; first golden-invalid and30 not-run by gating.
60 applied digests checked,1073079ms compile/sim sum,0 timeouts/process errors.
Report exp_result/09.15-eth-fifo-source-replay.md; no Memory-effect claim.
Added ufifo source lock (12859 bytes,published43a9a03d digest), fixed RX/BW8/LGFLEN4 wrapper,
source golden seed TB and count checker; source independent Memory off/max3.
Focused provider/CLI10 tests,typecheck,lint,build pass; Linux CI not run (Windows boundary).
Immediate post-build launch guard detected a process and correctly refused to start; next
read-only process check found none, then launched hidden PID7312:
node apps/rtl-core-loop/dist/index.js project-coverage --project ufifo --agent pi --iterations 3.
Logs .rtl-agent/automation-logs/ufifo-source-20260915-064347.stdout.log / .stderr.log.
No other long run permitted. Next audit ufifo completion then fixed30 snapshot replay, openHMC.
Two sources coverage/replay finished (eth first invalid disclosed); Memory/targets not begun.

## 2026-09-15 06:41 +08 - Next source adapter plan

No active process. Eth replay sealed baseline26/30 final27/30, first golden-invalid.
Audit persisted process/digest evidence and publish report. Then add ufifo fixed lock,
unchanged DUT wrapper and existing source seed TB, source independent Memory off/max3.
Validate focused provider/CLI tests, typecheck/lint/build and real golden before Agent.
No published mutants or old Memory changes. Do not expose replay evidence to model.

## 2026-09-15 00:46 +08 - eth_fifo replay active

Session Briefing: eth coverage complete86.38->100,2 Agent attempts,203556 tokens,
cost0.527547,zero Provider errors. Attempt2 compile passes but golden simulation DATA_FAIL
index8; attempt3 repairs and golden passes. No Memory used/built.
Implemented fixed replay-eth.ts and configurable success marker regression; unit, explicit
NodeNext typecheck, focused ESLint and build pass. Raw source/snapshot LF equality audited.
First replay eth-20260915-004354/PID11456 stopped before M001 simulation: Git normalized
line endings. Retained excluded diagnostic. Fixed dual hash/raw candidate and normalized
byte equality audit without altering publication. Restart after no processes confirmed:
hidden PID9364, node tools/mutation/replay-eth.ts .rtl-agent/fifo-replays/eth-20260915-004604.
Logs .rtl-agent/automation-logs/eth-replay-20260915-004604.stdout.log and .stderr.log.
Baseline/first/final independent golden gates; invalid first excludes30 mutant runs, never
counts golden failure as killed. Integration running; no final score yet. Linux CI not run;
Windows-only non-authoritative evidence. Next audit replay then ufifo/openHMC adapters and
independent source runs. All prior active PIDs historical; old RTL queue remains paused.

## 2026-09-15 - eth_fifo replay implementation plan

Session Briefing: no long process; eth coverage finished86.38->100 with2 Agent attempts.
Audit baseline/attempt2/attempt3 snapshots and original source normalization. Implement fixed
eth replay using published raw files/patches, wrapper and snapshot TB/checker, preserve failed
first golden as invalid (not killed), continue other stages. Verify verdict unit tests, explicit
tool typecheck/lint/build, then launch hidden serial replay and audit persisted results.
No Memory build, model or published mutant changes. Historical PID8040 ended.

## 2026-09-14 18:42 +08 - eth_fifo source adapter implemented

Active hidden PID8040; node apps/rtl-core-loop/dist/index.js project-coverage --project
eth-fifo --agent pi --iterations 3. Logs .rtl-agent/automation-logs/fifo-source-eth-20260914-184217.stdout.log
and .stderr.log. This active source supersedes all historical replay PIDs below.

Session Briefing: no prior long process. Added eth-fifo project source lock (3 raw files),
fixed TopModule wrapper preserving original module, seeded TB from prepared legal-operation
scoreboard with count-range checker. No mutant feedback/source Memory supplied. Focused
provider/CLI10 tests, typecheck/lint/build pass. Source launch uses iterations3, baseline
golden gating, per-attempt snapshots; details in latest state. Next verify run before any
other model/Verilator task, then adapt replay and continue ufifo/openHMC.


## 2026-09-14 12:37 +08 - Versatile source replay complete and audited

Session Briefing: no experiment processes.064026 replay complete3 goldens+90 mutants,
93 compile/sim pairs and90 mutated DUT hashes audited. Baseline12/30, first22/30, final22/30;
10 gained kills,0 losses,0 timeout/compile-invalid/not-run. All goldens pass. Survivor8 pending
human review, no adjusted score. Report exp_result/09.14-versatile-mutation-replay.md.
No active replay PID; historical11628 ended. Versatile source coverage+replay complete;
source Experience not yet built. Next implement eth_fifo/ufifo/openHMC fixture adapters and
replay support, then independent max3-turn source runs. Memory only after all4 sources.
No rerun of successful Versatile needed. Do not feed evaluator kill report into Experience.


## 2026-09-14 06:39 +08 - Versatile three-stage mutation replay launched

Update06:40: PID5332 exited before first mutant (git ENOENT). Excluded diagnostic output
versatile-20260914-063916 retained. Resolved installed Git C:/Program Files/Git/cmd/git.exe;
fixed Windows executable and relaunched fresh root versatile-20260914-064026, hidden PID11628.
Active logs .rtl-agent/automation-logs/versatile-replay-20260914-064026.stdout.log / .stderr.log.
Only this new PID is active; below old launch is historical.

Session Briefing: no previous processes. Implemented fixed-source model-free replay with
manifest/patch/DUT hashes, isolated per-mutant workspaces and golden gating each stage.
baseline/first/final each30 fixed mutants; assertion failures only killed, timeout and
infrastructure/compile-invalid separate. Unit/typecheck/lint passed. Runtime integration in progress.
Hidden PID5332 runs node tools/mutation/replay-versatile.ts
.rtl-agent/fifo-replays/versatile-20260914-063916. Logs automation-logs/versatile-replay-20260914-063916
stdout/stderr under .rtl-agent. Do not launch another experiment while running. Next audit
all93 golden/mutant results and classify gaps before source fixture/Memory work. No scores yet.


## 2026-09-14 00:40 +08 - Snapshot capture implemented; first assets recovered

Session Briefing: no long processes. Added evaluator-only exclusive attempt snapshots to
project-coverage: baseline0 and usable/protected-checked Agent turns, including RTL bytes and
digest manifest. No prompts/score/Memory changes. Tests4/4,typecheck,focused lint/build pass.
Recovered Versatile first TB/checker at .rtl-agent/fifo-transfer-recovery/versatile-first-v1:
complete attempt2 writes plus exact attempt3 edits reproduce final workspace bytes. No model
rerun, no change to original run. Recovery manifest records transcript/file hashes; golden
simulation replay still pending. Next implement fixed30 FIFO mutation baseline/first/final
replay and remaining source fixture adapters; do not claim kill results or Memory completion.


## 2026-09-13 18:34 +08 - Versatile coverage finished; replay evidence work next

Session Briefing: no related long process. Source run_20260913-135221-083 completed coverage
57.95->93.66->100 with2 Agent turns/max3, pending human review. All9 compile/sim/coverage
processes exit0; DUT hash intact. Main transcripts267164 tokens/cost0.6997416, no errorMessage.
Report exp_result/09.13-fifo-source-versatile-coverage.md. No kill replay or Memory built.
Next implement per-attempt TB/checker evidence snapshots (existing runner lacks them), investigate
exact first-turn reconstruction from transcript, then FIFO mutation replay and remaining adapters.
Do not replace first assets with final or rerun completed source blindly. Current automation
updated in place to prioritize authorized4+2 protocol; same6h schedule. Old RTL queue stays paused.


## 2026-09-13 - Active: authorized FIFO verification transfer 4+2

First source launched hidden PID10040 at13:52+08: node apps/rtl-core-loop/dist/index.js
project-coverage --project versatile-fifo --agent pi --iterations 3.
Logs .rtl-agent/automation-logs/fifo-transfer-source-versatile-20260913-135217.stdout.log
and .stderr.log. Do not launch other model/Verilator work while it runs.

User explicitly authorized starting; each source independent, consolidate only after all four.
Protocol docs/fifo-verification-transfer-protocol.md fixes max3 iterations, evaluation-only mutation,
two target off/frozen swapped rounds and seeded-TB (not blank generation) interpretation.
Priority now FIFO source Versatile coverage, then adapters/replay/remaining sources, isolated
verification Memory and targets. Old RTL queue remains paused for timeout decision, not cancelled.
No active process at initial check. Existing runner supports first source; remaining adapters and
Memory integration require implementation/testing. Do not auto-resume old RTL queue over this task.


## 2026-09-13 12:33 +08 - Quiet checkpoint; protocol decisions outstanding

Session Briefing: no related long process. Candidate-timeout classification remains awaiting
user decision; no retry or next split launched. User's latest FIFO discussion requests a
four-source/two-target verification Memory experiment: Versatile/eth_fifo/ufifo/openHMC
as sources, dpretet/axis as targets. This is task-definition discussion, not authorization
to start Memory Build. Budget/repeats/mutation-feedback protocol still unconfirmed. Published
3+3 preparation manifests stay immutable; any future4+2 experiment needs a separate protocol.
No new result or failure. Preserve all evidence and wait without repeated notifications.


## 2026-09-13 06:32 +08 - Paused for candidate-timeout classification decision

Session Briefing: no experiment processes. b-20260912-001 ended INVALID: full24,
24 compile19 pass4 mismatch1 SIMULATION_TIMEOUT (RAM), repair0/frozen VE. No Provider errors.
RAM dut.sv declares reg[2:0] i and for(i=0;i<8;i=i+1): counter wraps, reset never finishes.
This is a candidate defect, not quota/infrastructure recovery. Existing summary classifies
all SIMULATION_TIMEOUT as verificationInvalid. Preserve batch pending protocol decision;
do not blindly rerun/select away this failure, modify RTL/harness, or advance next split.
Ask user whether to retain full batch with candidate timeout counted as failure (19/24).
No active PID. FIFO180/Memory unchanged. Details in session-state and error-journal.


## 2026-09-13 00:32 +08 - VE timing verified; arithmetic launched

Session Briefing: no prior experimental processes. Reconciled stale handoff against actual
evidence: ChipBench D0-R2 complete58/89 (report exp_result/09.12-d0-r2-chipbench-condition.md).
VE timing b-20260911-002 complete29/r5/repair0/frozen mem-v0003:27 compile,14 pass,
13 mismatch,2 compile-related not-run,0 timeout/invalid/provider error. Full case IDs match.
29 transcripts132 exchanges531358 tokens,cost1.8594516,3692901ms; selector28 nonempty/1 empty.
Active store VE mem-v0003 and archive memory-chip mem-v0008 both load/digest verified.
Launched hidden PID10180 Batch b-20260912-001 full24 VE arithmetic; command/logs in session-state. Next verify
completion, then VE state-machine and assignment, then R2 off four splits and D3.
FIFO180 unchanged. Older active entries below are historical; no completed split rerun.


## 2026-09-12 - User-requested FIFO replacement delivery rechecked

Session Briefing: the six-FIFO preparation is already published; do not regenerate it.
Rechecked upstream dpretet/async_fifo and alexforencich/verilog-axis availability and local
publication: six IPs,180 patch apply checks and all source/TB/manifest hashes pass.
All six retain30 static-reviewed mutants. Detailed evidence and limitations remain in
exp_result/09.09-six-fifo-180-prepared.md. Non-equivalence review and kill replay are pending;
this checkpoint changes no experimental assets and does not advance the frozen-Memory queue.


## Heartbeat 2026-09-11 18:29 +08 - State-machine complete; assignment launched

Session Briefing: no old process. b-20260910-001 full6/r5/frozen/repair0 verified:
6 compile,4 pass,2 mismatch,0 not-run/timeout/provider error.31 exchanges149381 tokens,
cost0.4335558,929428ms. Selector6 nonempty,12 IDs (memory1:5,memory2:6,memory6:1).
Locked mem-v0008 loaded/digest verified. Hidden PID11208 runs full30 assignment, repair0,
frozen mem-v0008; Batch b-20260911-001 profile verified30/r5/frozen. Command recorded in session-state. Logs
.rtl-agent/automation-logs/d0-r2-frozen-chip-assignment-20260911-182922.stdout.log / .stderr.log.
Next validate assignment and aggregate89 ChipBench condition, then VE timing (reversible store
switch only after process exit). FIFO180 untouched. Older active entries are historical.

## Heartbeat 2026-09-10 13:47 +08 - Arithmetic complete; state-machine running

Session Briefing: b-20260909-001 full24/r5/frozen/repair0 verified:24 compile,18 pass,
6 mismatch,0 not-run/timeout;413848 tokens,cost1.3537776,3271385ms. Three429 overload errors
recovered automatically; no403/censoring. Selector24,21 nonempty,3 empty. No prior process.
Launched PID19288 Batch b-20260910-001, profile verified full6 state-machine/r5/frozen mem-v0008.
Command: node apps/rtl-core-loop/dist/index.js debug-evaluate --dataset chipbench --profile chipbench-debug-kimi-v1 --agent pi --split debug-zero-shot-state-machine --functional-repair-iterations 0 --memory-mode frozen --memory-snapshot mem-v0008
Logs .rtl-agent/automation-logs/d0-r2-frozen-chip-state-20260910-134731.stdout.log / .stderr.log.
Next verify completion then assignment. Old active entries historical; FIFO180 unchanged.

## Heartbeat 2026-09-10 07:45 +08 - Frozen queue resumed

No prior experiment process. Rechecked completed b-20260908-004 summary/profile/log at
29 cases,15 passes,r5,repair0,frozen mem-v0008. Loaded and verified13-item locked snapshot.
Launched full D0-R2 ChipBench arithmetic, hidden PID17116, command:
node apps/rtl-core-loop/dist/index.js debug-evaluate --dataset chipbench --profile chipbench-debug-kimi-v1 --agent pi --split debug-zero-shot-arithmetic --functional-repair-iterations 0 --memory-mode frozen --memory-snapshot mem-v0008
Logs .rtl-agent/automation-logs/d0-r2-frozen-chip-arithmetic-20260910-074519.stdout.log and
.stderr.log. Batch b-20260909-001 (UTC date), profile verified24/r5/frozen digest; case1/24. Do not launch
another task while PID/process descendants run. Next validate24-case completion, then state-machine.
FIFO180 remain frozen; no mutant replay/Memory Build initiated.

## Latest completed stage: six FIFO / 180 mutants (2026-09-09, final handoff 2026-09-10)

Session Briefing: user-authorized replacements downloaded and validated. Source group remains
Versatile / eth_fifo / ufifo; target group is now openHMC / dpretet async_fifo / axis_fifo.
All six have30 static-reviewed single-site mutants, Icarus golden+compile and Verilator
golden+coverage+30-mutant lint evidence. Published mutation/fifo-transfer-v2/manifest.json;
report exp_result/09.09-six-fifo-180-prepared.md is authoritative over all older checkpoints.
PID13836 suite verifier finished; no active FIFO process. No model calls or Memory writes.
Old100 and intermediate runs retained but excluded. Do not retry Generic Gray/ogfx downloads,
regenerate final180 or confuse preparation with kill replay/non-equivalence proof.
Frozen-memory-v2 updated in place, same6h schedule. Next: original D0-R2 ChipBench arithmetic
full split, then state-machine/assignment, VE4/off4, D3, respecting process and Memory locks.
FIFO learning/target-transfer protocol still needs explicit budget/oracle-isolation decisions;
this preparation stage did not authorize automatic Memory Build. Target TB/oracle stays evaluator-only.

## Active user-authorized replacement and six-by-thirty plan (2026-09-09)

User authorizes replacing Generic Gray and ogfx with two downloadable alternatives and requests
30 non-padding mutants per all six IPs. Selected dpretet async_fifo and verilog-axis axis_fifo;
olofk FWFT candidate excluded for weaker wrapper-license evidence. Verify ancestry/dependencies, locked
source hashes and independent goldens before final adoption. Existing three sources/openHMC
unchanged. Expand the preparation policy using reviewed enable/reset/data/boundary mutations,
multi-module candidate support and explicit fault rationale; never use kill outcomes to select.
Publish a NEW six-suite version (retain prior100 as superseded), validate Icarus and Verilator
golden/coverage plus per-mutant frontend checks, unique single-site patches and deterministic
regeneration, tests/typecheck/lint/build/harness. No model, Memory or original-DUT edits.

## Final checkpoint: four local golden Verilator baselines validated (2026-09-09 19:46 +08)

openHMC and Versatile v2 both finished normally and passed raw-digest/process/candidate audits.
Versatile: line19/24,branch17/18,toggle295/408,22213ms. No active long process. All four local
members now have golden Icarus+Verilator evidence;100 candidate mutants remain unchanged and
unreplayed. Next resolve Generic Gray support and ogfx source, then per-mutant Verilator checks
and final contract/operator review. Older active PID entries below are historical.

## Latest heartbeat: 2026-09-09 19:44 +08

Update: openHMC finished and validated (161 reads, line6/6, branch22/22,toggle317/354,
22579ms; raw digest and30 candidate audit match). Sequentially launched Versatile v2 coverage
PID2936 with logs .rtl-agent/fifo-transfer-audit/versatile-coverage-20260909-1945.*.log.
That is now the only active long task; the openHMC PID below is historical.

Session Briefing: 100 compile-valid candidates retained; no prior long process found.
The normal hidden openHMC coverage launch succeeded this checkpoint (no permission override).
PID524, child Verilator14212; command: node tools/mutation/fifo-coverage.ts
.rtl-agent/fifo-prepared/target/openhmc-v1. Logs:
.rtl-agent/fifo-transfer-audit/openhmc-coverage-20260909-1944.stdout.log and .stderr.log.
Do not start any other long task while it runs. After exit, validate coverage-summary.json,
golden/verilator compile.json, simulation.json and raw coverage; then new Versatile fixture.
No mutation regeneration, model calls or Memory updates in this heartbeat.

## Latest execution result: four FIFO mutation candidate sets (2026-09-09)

Completed actual local work: eth_fifo18, ufifo30, Versatile22, openHMC30 =100 isolated
single-site patches with Icarus golden/compile evidence and deterministic hash audit. No mutant
simulation/kill score. eth_fifo and ufifo Verilator baseline compile/sim passed. Six-IP
preparation is NOT complete; report exp_result/09.09-six-fifo-preparation-progress.md is authoritative
for this checkpoint. No active long process at handoff. OpenHMC launch request was rejected by
tool policy before process creation; do not bypass. Next allowed launch should complete openHMC
and new Versatile TB coverage. Generic Gray needs original generic_dpram support; ogfx download
still times out. Continue independent local work rather than treating network as a global stop.
Preserve excluded versatile-fifo-v1 diagnostic (old checker tests uninitialized empty data);
new source result is versatile-fifo-v2. No original DUT/checker/guidance/Memory edits.

## Active execution plan: finish local FIFO members continuously (2026-09-09)

User explicitly resumed six-FIFO preparation. No experiment process is active. Do not treat
an ogfx network failure as a global stop. Work sequentially on local members: lock consumed
files, independent golden fixtures, baseline coverage, deterministic single-site mutants and
per-mutant compile evidence. Use a reusable TypeScript preparation control plane with bounded
shell:false processes and isolated output, fixed seed42 and FIFO operator quotas. Validate
focused tests, explicit tool typecheck/lint, existing build/harness, real golden and mutant
compiles, determinism and source immutability. Keep target results separate from source assets;
do not start model learning or update Memory. Retry ogfx independently using pinned upstream.

## Latest checkpoint: 2026-09-09 13:43 +08

Session Briefing: no active repository experiment/compiler; six-FIFO preparation continues.
Original ogfx raw-source acquisition failed this checkpoint (PowerShell transport EOF; bounded
curl alternative timed out after 20 seconds with zero bytes). No validated ogfx source was
published. Keep revision-221 endpoint as candidate, not a completed source lock. Retry at a
later checkpoint; other local FIFO preparation can proceed without that download. WBUART32
checkout remains clean; ufifo SHA256 43a9a03d00db96bd6e8a956663b01654a5cf0308456eca8c6f4c95787ef46f9d.
No model, Memory, coverage or mutation run was launched; D0-R2 arithmetic remains queued.

## Heartbeat source-discovery checkpoint (2026-09-09)

Session Briefing: no repository experiment/compiler process is active; replacement eth_fifo
smoke is preserved, six-FIFO preparation remains in progress, next frozen condition unchanged.
Located ogfx_reg_fifo in the original OpenCores SVN at revision 221 under
trunk/fpga/altera_de0_nano_soc/rtl/verilog/opengfx430/ogfx_reg_fifo.v. A bounded raw-source HTTP
check returned 200, text/plain, 6894 bytes. The missing-mirror issue has a viable upstream route;
download/pin its exact bytes and support files next, then audit and build the golden fixture.
This discovery is not a completed dataset or mutation result. No long job or model was started.

## Current status: replacement approved and validated (2026-09-09)

S2 is now OpenCores ethmac/eth_fifo (Igor Mohor), pinned at
dd26899086edf3b797d2775ef9502d204a9a8149. Unchanged upstream DUT and support files are locked in
tools/mutation/fixtures/ethmac-source-lock.json. The reusable independent golden smoke TB passed
Icarus and Windows Verilator: 279 flag/count checks and 165 reads, multiple wraps, fill/drain,
concurrent legal operations, reset and clear. Report: exp_result/09.09-eth-fifo-replacement.md.
The earlier grouping-decision blocker is resolved. No active long process, new Memory or mutants.
Continue complete six-FIFO preparation before D0-R2 ChipBench arithmetic; do not wait again for
the already-granted replacement approval. The missing ogfx SVN source still needs resolution.
Keep synchronous_reset_fifo and its failure evidence excluded and recoverable, not deleted.
The existing six-hour automation now uses eth_fifo and no longer waits for the replacement
decision. Final diff/harness/JSON/source-hash/TB-hash checks passed.

## Replacement implementation plan (2026-09-09)

User authorized replacing the defective source member. Audit OpenCores ethmac/eth_fifo
(Igor Mohor) as S2, retaining the other five members. Pin source and support hashes, preserve
unmodified RTL, and exercise reset/clear, fill/drain, status flags, concurrent read/write,
and repeated pointer wraps with an independent queue scoreboard. Check Icarus first and the
existing Windows Verilator toolchain next. Record the exact legal-operation contract (no read
empty/write full); this is replacement readiness, not full six-IP preparation or mutation result.
Then update grouping and the existing automation to clear the obsolete user-decision wait.

## Latest checkpoint: 2026-09-09 FIFO preparation needs a grouping decision

No active long experiment. D0-R2 timing b-20260908-004 completed validly: 29 r5 Cases,
repair 0, locked frozen mem-v0008; 27 compile, 15 pass, 12 mismatch, two MAX_ATTEMPTS,
zero Provider errors/timeout/verification-invalid. Main-Agent: 29 transcripts, 128 exchanges,
476061 tokens, $1.615443, 3354083 ms (2026-09-08T11:46:26.619Z to 12:42:20.704Z).
Selector: 29 outputs, 28 nonempty, one empty, 39 selected IDs. The next frozen-Memory split
remains D0-R2 ChipBench arithmetic; it has NOT started while the priority preparation runs.

Four new FIFO source trees cloned with clean status and audited hashes. The openMSP430 mirror
was fetched without checkout but lacks the selected ogfx module. Most importantly, default
synchronous_reset_fifo golden fails legal transfer 17: 5-bit pointer indexes memory[0:15].
Icarus compile passed; a bounded alternating-write/read diagnostic returned xx instead of 0x50.
No DUT fix, replacement, model call, Memory build or mutant generation was performed.
See `exp_result/09.09-fifo-transfer-preparation-audit.md` for source locks, exact diagnostic,
limitations and next steps. Ask the user to replace this member or authorize a corrected fork.
Do not repeatedly rerun the known defect or silently mark the six datasets ready.

## Authorized next idle stage: six-FIFO dataset and mutation preparation (2026-09-08)

User approved the proposed source/target grouping and requested I2C-standard local datasets
and mutation suites. This supersedes the earlier candidate-only status, but does not authorize
changing membership silently when provenance or standalone integration fails.

- Sources: existing Versatile FIFO; ethmac/eth_fifo; WBUART32 ufifo.
- Targets: Generic FIFOs (select dual-clock implementation); openGFX430 ogfx_reg_fifo from
  OpenCores openMSP430; openHMC asynchronous FIFO (subject to standalone/provenance audit).
- First wait for active b-20260908-004 / PID 6464 to exit and validate its complete evidence.
  Before launching another frozen-Memory condition, perform this preparation stage serially.
  Do not terminate the active job or modify its compiled code/guidance/Memory dependencies.
- Inspect source licenses, authors and copy relationships; pin commits and consumed-file hashes.
  Existing Versatile FIFO source/fixture and all I2C assets must remain unchanged.
- Add isolated source/target datasets, explicit DUT/interface/clock/reset specifications,
  deterministic bounded golden TB/checkers and locked support manifests. Require golden compile,
  simulation and baseline coverage. Do not start model refinement or build verification Memory yet.
- Follow I2C mutation methodology: deterministic seed 42; target 30 single-site compile-valid
  mutants per IP; explicit operator/module quotas; candidate and replacement evidence, dedup,
  original/mutated location metadata, versioned manifests and patches. Never select using coverage
  or kill scores. Adapt operator quotas to FIFO semantics, not I2C protocol names. If fewer than
  30 meaningful distinct sites exist, report the shortage instead of padding or changing the DUT.
- Separate source and target artifact roots and prohibit target TB/mutation results entering
  source Memory. Freeze target mutation access policy before model experiments; preparation is
  not evidence of effective generated TBs. Compilation failures/timeout/not-run are not kills;
  equivalence is unproven until reviewed. Windows evidence is non-authoritative, not CDC signoff.
- Prefer scoped portable TypeScript orchestration and existing project/mutation infrastructure;
  fixed executable/argv, shell:false, node:path, isolated workspaces, no original DUT edits.
- Validate focused tests, typecheck, lint, build, golden simulations, per-mutant compilation,
  deterministic regeneration/digest equality, source immutability, and harness checks. Publish
  a preparation report with each IP's readiness and remaining review items; then resume the
  frozen-Memory queue without changing its condition order.

Read-only source preflight found these remote HEADs (not yet downloaded or locked datasets):
synchronous_reset_fifo 88cad31ca0a18b7c24a8995176b54a6461e8898e;
ZipCPU/wbuart32 f43a6b83c3a70fb2ac0696a45c5545b233fb860b;
freecores/generic_fifos 9d38c603aafd8f912ac3ae73a314d33987cd5c90;
unihd-cag/openhmc 0cf58e2f60c79aa64d35650b6e30e4d5c13e4a78.
GitHub anonymous API was rate-limited; git ls-remote works. openHMC is in the author repository,
not freecores/openhmc. No new dataset, patch or simulation result has been produced yet.

## Latest checkpoint: 2026-09-08 19:47 +08:00

Session Briefing: G is complete. D0-R1 is now complete for all three conditions; D0-R2
ChipBench timing is running as Batch `b-20260908-004`, hidden PID `6464`.
The older status paragraphs below are historical. No other long experiment was started.

Validated D0-R1 timing `b-20260908-003`: all 29 unique r5 Cases, repair 0, frozen
locked `mem-v0008`; 27 compile, 12 pass, 15 mismatch, 2 MAX_ATTEMPTS (Prob021/022),
0 timeout/Provider error/verification-invalid. Its 29 transcripts contain 132 exchanges,
543,910 tokens and $1.9167396 recorded main-Agent cost. Batch duration is 4,048,506 ms,
from 2026-09-08T05:45:57.702Z to 06:53:26.208Z. Selector: 29 outputs, 28 nonempty,
1 empty, 39 selected IDs; detailed concentration is in session-state latest_checkpoint.

D0-R1 totals: off 63/89, frozen VE 59/89, frozen ChipBench 55/89. ChipBench vs off
has 4 failure-to-pass and 12 pass-to-failure transitions; no positive effect is established.
Both Memory stores passed content/digest validation through FilesystemMemoryStore; no switch.

Active command: `node apps/rtl-core-loop/dist/index.js debug-evaluate --dataset chipbench
--profile chipbench-debug-kimi-v1 --agent pi --split debug-zero-shot-timing
--functional-repair-iterations 0 --memory-mode frozen --memory-snapshot mem-v0008`.
Started 2026-09-08T19:46:21+08:00. Logs:
`.rtl-agent/automation-logs/d0-r2-frozen-chip-timing-20260908-194621.*.log`.
Running profile verified: 29 Cases, r5, repair 0, locked frozen mem-v0008.
Next: validate this Batch after exit, then D0-R2 ChipBench arithmetic/state-machine/assignment,
VE and off conditions, D3, and the independent report. Preserve all existing exclusions.
The new six-FIFO grouping discussion is a candidate proposal, not authorization to alter this queue.

## Active extension: multi-IP verification coverage fixtures (2026-09-07)

Prepare three additional OpenCores/FreeCores verification targets, strictly serial with all
existing long experiments:

1. Versatile FIFO for storage and CDC behavior.
2. AES high-throughput/low-area for cryptographic datapath behavior.
3. Scalable Arbiter for fairness and control behavior.

The preparation must pin an exact source revision, license/reference, consumed-file manifest and
digest; preserve the upstream DUT; provide a deterministic bounded golden testbench/checker; and
pass local Windows Verilator compile, simulation, and baseline coverage before any Agent turn.
Expose one generic project-coverage command rather than three independent runner copies, while
keeping the existing I2C command and evidence readable. Model-backed coverage runs remain blocked
until a real target canary proves Kimi quota recovery. Baseline-only preparation and coverage use
no model and may proceed during the quota pause.

Validation plan: focused provider/CLI/orchestration tests, typecheck, lint, build, format, real
golden Verilator runs for all three fixtures, then full repository tests as host time permits.

## Goal

Run the authorized cross-dataset frozen-Memory campaign with a six-hour heartbeat. Use complete
source datasets only for Memory and complete target datasets only for evaluation, keep Generation
and Debug conclusions separate, and never update Memory during target evaluation.

## Experiment Queue

1. G-R1: VerilogEval `Prob001..Prob156`, repair 0, Memory `off` then frozen ChipBench
   `mem-v0008`.
2. G-R2: the same complete 156 Cases, frozen `mem-v0008` then Memory `off`.
3. D0-R1: all four ChipBench zero-shot Debug r5 splits, repair 0, conditions `off`, frozen
   VerilogEval `mem-v0003`, then frozen ChipBench `mem-v0008`; split order assignment,
   state-machine, arithmetic, timing.
4. D0-R2: the same 89 Cases, conditions frozen `mem-v0008`, frozen `mem-v0003`, then `off`;
   split order timing, arithmetic, state-machine, assignment.
5. D3: all 89 Debug Cases with repair 3, frozen VerilogEval `mem-v0003` then `off`; report first
   repair pass and final pass separately from D0.
6. While Kimi quota is unavailable, complete the deterministic `mutation:run` runner and replay
   the locked `i2c-mutants-v1` suite against the existing 78.16% baseline, 93.99% run, and 100%
   run; publish its separate mutation-score report before resuming Provider-backed work.
7. After quota recovery, finish the remaining frozen-Memory conditions and publish a Case-paired
   report with selector, token, cost, elapsed-time, transition, timeout, and not-run evidence.

## Current Status

The multi-IP local preparation is complete. Exact FreeCores revisions for Versatile FIFO, AES
high-throughput/low-area, and Scalable Arbiter are present under `.rtl-agent/datasets`, their
consumed bytes are locked in code, and all three final baseline-only fixtures passed golden
Verilator compile/simulation without a model call. Final toggle-aware combined scores are FIFO
57.95, AES 75.50, and 16-requester `arbiter_x2` 91.38. The reproducible preparation report is
`exp_result/09.07-multi-ip-coverage-baselines.md`. Model-backed refinements remain queued behind
completion of the resumed frozen-Memory campaign. The user supplied a credible quota-recovery
signal on 2026-09-08, and excluded canary `b-20260908-001` completed its real target Case with
nonzero-token Provider exchanges and no quota or transport error.

Generation rounds G-R1 and G-R2 are valid and complete. D0-R1 Memory-off and frozen VerilogEval are
valid and complete across all 89 Cases. D0-R1 frozen ChipBench assignment and state-machine are
valid. Its earlier arithmetic Batch was censored by the exhausted Kimi weekly quota and remains
excluded. After the successful recovery canary, complete 24-Case arithmetic replacement Batch
`b-20260908-002` completed normally: 24/24 compiled, 19 passed, 5 mismatched, zero not-run,
timeout, Provider error, or verification-invalid Case. It used 106 Provider exchanges, 356,418
tokens, $0.9943428, and 00:40:53.911. Selector evidence is complete for 24 Cases: 21 non-empty,
3 empty, and 30 selected IDs. The next complete timing split started as Batch `b-20260908-003`,
hidden PID `18528`, at `2026-09-08T13:45:51+08:00`.

The user moved deterministic verification mutation ahead of the remaining Provider-backed work
while Kimi quota is exhausted. The mutation replay is now complete; it did not overlap Generation,
Debug, I2C coverage, or another mutation process. The existing 30 patches remained frozen and the
generator was not rerun. Frozen-Memory remains paused before the complete D0-R1 frozen ChipBench
arithmetic retry.

- Valid G-R1 Memory-off Batch `b-20260827-002` contains all 156 unique VerilogEval Cases with
  repair zero: 144 compiled, 131 functional passes, 13 mismatches, 12 not-runs, and zero
  verification-invalid Cases. All 12 not-runs are `MAX_ATTEMPTS`.
- Its 156 Provider transcripts contain 608 successful exchanges, no transport/quota errors,
  907,523 recorded tokens, and $2.7645378 recorded cost. Wall time from launch to final stdout was
  about 02:30:57.
- Diagnostic Batch `b-20260827-001` remains excluded from accuracy evidence. Network-sandbox Batch
  `b-20260825-001` remains excluded as 156 transport failures and has been moved to the recoverable
  quarantine at `.rtl-agent/quarantine/frozen-memory-reset-20260901`.
- Active ChipBench Memory `mem-v0008` was revalidated at 13 catalog entries, 13 item files, and
  digest `sha256:5229d4f09d557d77633280d70e9b40136db90dfa434ed98fd9763377ad886320`.
- Valid G-R1 frozen Batch `b-20260827-003` contains all 156 unique Cases, repair zero, and the
  locked `mem-v0008` digest. It compiled 142, passed 132, mismatched 10, and did not run 14; all
  not-runs are `MAX_ATTEMPTS`, with zero timeouts or verification-invalid Cases.
- Compared with G-R1 off, frozen has +1 pass, -2 compile successes, -3 mismatches, and +2 not-runs.
  Case transitions are 7 failure-to-pass, 6 pass-to-failure, 125 pass-to-pass, and 18
  failure-to-failure. This is a one-round slight net gain, not yet a positive Memory conclusion.
- Frozen main-Agent evidence contains 156 Provider transcripts, 581 successful exchanges, no
  Provider errors, 1,060,331 tokens, and $3.4658826. The Batch duration is 06:20:51.590.
- The initial-generation Selector ran for all 156 Cases: 71 non-empty and 85 empty selections.
  Its 77 selected IDs were limited to the four `initial_generation` entries: `memory-000012` 41,
  `memory-000010` 30, `memory-000007` 4, and `memory-000005` 2.
- G-R2 frozen Batch `b-20260828-001` is excluded. Although its selection/profile contain all 156
  Cases, repair zero, and the locked `mem-v0008` digest, Prob129 through Prob156 each received a
  real Kimi HTTP 403 weekly-usage-limit response with zero tokens. The downstream 28
  `POLICY_VIOLATION` / `NO_COMPILE_UNIT` outcomes are quota artifacts, not RTL failures.
- The excluded Batch reports 105 passes, 15 mismatches, and 36 not-runs (8 `MAX_ATTEMPTS`, 28
  quota-induced `POLICY_VIOLATION`). It has only 128 Selector attempts and a
  `MISMATCH_ANALYSIS_FAILED` post-processing warning because the quota failure left the diagnosis
  template unrepaired. None of these partial aggregate numbers are experimental results.
- The excluded quota-censored Batch and its launch logs have been moved to the same recoverable
  quarantine. No files were deleted, and the valid G-R1 Batches remain in the active Batch store.
- Eight non-inference checkpoints through `2026-08-30T19:28:29+08:00` found no related process,
  new Batch, new automation log, reset timestamp, or recovery marker.
- On `2026-09-01`, diagnostic frozen Batch `b-20260901-001` ran exactly `Prob001` with repair zero,
  compiled and passed 1/1, and bound the locked `mem-v0008` digest without a Provider error. It is
  excluded from accuracy evidence and stored under the quarantine `diagnostics` directory.
- The complete replacement G-R2 frozen condition started at `2026-09-01T19:23:03+08:00` as hidden
  PID `9004`. Its active Batch is `b-20260901-001`, its selection contains all 156 Cases, repair is
  zero, and its profile binds frozen `mem-v0008` with the locked digest. Stdout/stderr are
  `.rtl-agent/automation-logs/g-r2-frozen-mem-v0008-restart-20260901-192303.*.log`. The original
  process tree remained alive through its last monitored checkpoint and later sealed normally.
- Replacement G-R2 frozen Batch `b-20260901-001` completed all 156 Cases with the locked profile,
  repair zero, frozen `mem-v0008`, and no Provider/quota errors. It compiled 135, passed 121,
  mismatched 14, and did not run 21; all not-runs are `MAX_ATTEMPTS`, with zero timeout or
  verification-invalid Cases. Duration was 05:59:58.633; 156 Agent transcripts contain 577
  exchanges, 1,017,646 tokens, and $3.09537 recorded cost.
- The frozen Selector created 156 attempt directories and 155 valid outputs: 72 non-empty and 83
  explicit empty selections, with 79 total selected IDs. `Prob046_dff8p` has only the selector
  input files and no read audit/output/metadata, so best-effort selection fell back to no injected
  Memory. This is recorded as one Selector failure rather than hidden inside the empty count.
- Complete G-R2 Memory-off Batch `b-20260901-002` started at
  `2026-09-02T07:23:34+08:00` as hidden PID `17452`. Its running profile contains all 156 ordered
  VerilogEval Cases, repair zero, and Memory mode `off`; logs are
  `.rtl-agent/automation-logs/g-r2-off-20260902-072334.*.log`. At
  `2026-09-02T07:26:02+08:00`, it remained healthy at Prob006 (6/156).
- G-R2 Memory-off Batch `b-20260901-002` later completed all 156 Cases: 139 compiled, 124 passed,
  15 mismatched, and 17 did not run; all not-runs are `MAX_ATTEMPTS`, with zero timeout, Provider,
  quota, or verification-invalid failures. Duration was 01:03:45.301; 156 Agent transcripts contain
  608 exchanges, 903,652 tokens, and $2.7569352 recorded cost.
- Comparing G-R2 off to frozen yields 8 failure-to-pass, 11 pass-to-failure, 113 pass-to-pass, and
  24 failure-to-failure transitions. Frozen changed compile by -4, pass by -3, mismatch by -1,
  and not-run by +4 while adding 113,994 Agent tokens and $0.3384348 recorded cost.
- G-R1 had a +1 frozen pass delta, whereas G-R2 had -3. The swapped-order rounds are not
  directionally consistent, failure-to-pass does not exceed pass-to-failure in G-R2, and not-runs
  increased in both rounds. The preregistered positive Generation Memory claim is therefore not
  supported.
- D0-R1 Memory-off assignment Batch `b-20260902-001` started at
  `2026-09-02T13:21:46+08:00` as hidden PID `3608`. Its profile validates all 30 assignment Cases,
  dataset `c74fe7d28-r5`, repair zero, Memory off, and baseline manifest
  `sha256:53155540d4d3286c45d9f0e4eeaa0e08455b3536cc71730e9a7e6c817ea1e3bf`.
  Logs are `.rtl-agent/automation-logs/d0-r1-off-assignment-20260902-132146.*.log`. At
  `2026-09-02T13:24:28+08:00`, it remained healthy at Prob003 (3/30).
- D0-R1 Memory-off assignment Batch `b-20260902-001` later sealed normally with all 30 r5 Cases,
  repair zero, Memory off, and the locked assignment baseline digest. It compiled 30/30 and passed
  24/30; the remaining 6 are functional mismatches, with zero not-run, timeout, Provider/quota, or
  verification-invalid failures. Duration was 00:28:03.131; 30 Provider transcripts contain 132
  exchanges, 349,740 tokens, and $1.1520384 recorded cost.
- D0-R1 Memory-off state-machine Batch `b-20260902-002` started at
  `2026-09-02T19:22:52+08:00` as hidden PID `19000`. Its running profile validates all 6 r5
  state-machine Cases, repair zero, Memory off, and baseline manifest
  `sha256:3e5a6ace82af63693b94899f1a50bcf66e1157f48efd19cf2b48118fea4c580e`.
  Logs are `.rtl-agent/automation-logs/d0-r1-off-state-machine-20260902-192252.*.log`; at
  `2026-09-02T19:26:01+08:00` it remained healthy while processing Case 2/6. No other split or
  condition was started.
- D0-R1 Memory-off state-machine Batch `b-20260902-002` later sealed normally with all 6 r5 Cases,
  repair zero, Memory off, and the locked state-machine baseline digest. It compiled 6/6 and passed
  5/6; the remaining Case is a functional mismatch, with zero not-run, timeout, Provider/quota, or
  verification-invalid failures. Duration was 00:10:19.951; 6 Provider transcripts contain 31
  exchanges, 127,468 tokens, and $0.4332840 recorded cost.
- D0-R1 Memory-off arithmetic Batch `b-20260902-003` started at
  `2026-09-03T01:23:23+08:00` as hidden PID `17344`. Its running profile validates all 24 r5
  arithmetic Cases, repair zero, Memory off, and baseline manifest
  `sha256:eb5d564b58a1300dc53833ab431ffd459fa8c8cc6af3a76194c7d80c92551704`.
  Logs are `.rtl-agent/automation-logs/d0-r1-off-arithmetic-20260903-012323.*.log`; at
  `2026-09-03T01:25:10+08:00` it remained healthy while processing Case 2/24, with one final result
  sealed. No other split or condition was started.
- D0-R1 Memory-off arithmetic Batch `b-20260902-003` later sealed normally with all 24 r5 Cases,
  repair zero, Memory off, and the locked arithmetic baseline digest. It compiled 24/24 and passed
  20/24; the remaining 4 are functional mismatches, with zero not-run, timeout, Provider, or
  verification-invalid failures. Duration was 00:19:56.440; 24 Provider transcripts contain 106
  exchanges, 262,339 tokens, and $0.7700514 recorded cost.
- D0-R1 Memory-off timing Batch `b-20260902-004` started at `2026-09-03T07:24:16+08:00` as hidden
  PID `10756`. Its running profile validates all 29 r5 timing Cases, repair zero, Memory off, and
  baseline manifest `sha256:1f4303f62a02cf87d1005fdf9575c0c108a314068da70a7aef2836e09943555b`.
  Logs are `.rtl-agent/automation-logs/d0-r1-off-timing-20260903-072416.*.log`. At
  `2026-09-03T07:25:58+08:00`, it remained healthy while processing Case 2/29, with one final
  result sealed. No other split or condition was started.
- D0-R1 Memory-off timing Batch `b-20260902-004` later sealed normally with all 29 r5 Cases,
  repair zero, Memory off, and the locked timing baseline digest. It compiled 27, passed 14,
  mismatched 13, and did not run 2; both not-runs are `MAX_ATTEMPTS`. There were zero timeout,
  Provider, or verification-invalid failures. Duration was 00:34:50.635; 29 Provider transcripts
  contain 128 exchanges, 447,572 tokens, and $1.9584408 recorded cost.
- The complete D0-R1 Memory-off condition therefore totals 63/89 functional passes, 87/89 compile
  successes, 24 mismatches, and 2 not-runs, with zero timeout. Its four Batches contain 397
  Provider exchanges, 1,187,119 tokens, and $4.3138146 cost over 01:33:10.157 summed Batch time.
- With no experiment process active, both stores were validated and switched reversibly at
  `2026-09-03T13:25:23+08:00`: active `.rtl-agent/memory` is now VerilogEval `mem-v0003` with 9
  items and locked digest; ChipBench `mem-v0008` is intact under `.rtl-agent/memory-chip` with 13
  items and locked digest. No Memory content was changed.
- D0-R1 frozen VerilogEval assignment Batch `b-20260903-001` started at
  `2026-09-03T13:25:44+08:00` as hidden PID `6496`. Its running profile validates all 30 r5
  assignment Cases, repair zero, frozen `mem-v0003`, locked digest
  `sha256:eacafc24a17c87646e55add966c375e7b1c2fca7fd69a5bda2467da1b8252319`, and assignment baseline
  manifest `sha256:53155540d4d3286c45d9f0e4eeaa0e08455b3536cc71730e9a7e6c817ea1e3bf`.
  Logs are `.rtl-agent/automation-logs/d0-r1-frozen-ve-assignment-20260903-132544.*.log`. At
  `2026-09-03T13:28:20+08:00`, it remained healthy while processing Case 2/30, with one final
  result sealed.
- D0-R1 frozen VerilogEval assignment Batch `b-20260903-001` later sealed normally with all 30 r5
  Cases, repair zero, locked `mem-v0003`, and the assignment baseline digest. It compiled 30/30
  and passed 23/30; the remaining 7 are functional mismatches, with zero not-run, timeout, or
  verification-invalid failures. Duration was 00:58:40.338; 30 main-Agent transcripts contain 133
  exchanges, 469,878 tokens, and $1.5121524 recorded cost.
- `Prob033_traffic_lights` had one zero-token `Connection error` on its first main-Agent exchange;
  the same bounded Case retried automatically, then completed with `COMPILE_PASSED`. This recovered
  transient is recorded as one Provider error and did not censor or invalidate the Case.
- Assignment Selector evidence is complete for all 30 Cases: 29 non-empty, 1 empty, 58 selected
  IDs total, and no missing output. Concentration is `memory-000002` 21, `memory-000007` 16,
  `memory-000001` 9, `memory-000004` 7, `memory-000008` 4, and `memory-000003` 1.
- D0-R1 frozen VerilogEval state-machine Batch `b-20260903-002` started at
  `2026-09-03T19:27:03+08:00` as hidden PID `6944`. Its profile validates all 6 r5 Cases, repair
  zero, frozen `mem-v0003` with its locked digest, and state-machine baseline manifest
  `sha256:3e5a6ace82af63693b94899f1a50bcf66e1157f48efd19cf2b48118fea4c580e`.
  Logs are `.rtl-agent/automation-logs/d0-r1-frozen-ve-state-machine-20260903-192703.*.log`. At
  `2026-09-03T19:29:26+08:00`, it remained healthy while processing Case 2/6, with one final result
  sealed.
- Batch `b-20260903-002` later sealed normally with all 6 r5 Cases, repair zero, locked
  `mem-v0003`, and the state-machine baseline digest. It compiled 6/6 and passed 4/6; the other 2
  Cases are functional mismatches, with zero not-run, timeout, Provider, or verification-invalid
  failures. Duration was 00:12:02.601; 6 main-Agent transcripts contain 28 exchanges, 126,334
  tokens, and $0.4160844 recorded cost.
- State-machine Selector evidence is complete: 6 attempts, all 6 non-empty, no missing output, and
  16 selected IDs. Counts are `memory-000004` 6, `memory-000002` 5, `memory-000008` 4, and
  `memory-000007` 1.
- D0-R1 frozen VerilogEval arithmetic Batch `b-20260903-003` started at
  `2026-09-04T01:27:00+08:00` as hidden PID `9344`. Its running profile validates all 24 r5
  arithmetic Cases, repair zero, frozen `mem-v0003` with the locked digest, and arithmetic baseline
  manifest `sha256:eb5d564b58a1300dc53833ab431ffd459fa8c8cc6af3a76194c7d80c92551704`.
  Logs are `.rtl-agent/automation-logs/d0-r1-frozen-ve-arithmetic-20260904-012700.*.log`. At
  `2026-09-04T01:29:36+08:00`, the process tree remained healthy on Case 2/24 with one final result
  sealed; no second command was started.
- Batch `b-20260903-003` later sealed normally with all 24 unique r5 Cases, repair zero, locked
  `mem-v0003`, and the arithmetic baseline digest. It compiled 24/24 and passed 18/24; the other 6
  Cases are functional mismatches, with zero not-run, timeout, Provider, or verification-invalid
  failures. Duration was 00:32:27.452; 24 main-Agent transcripts contain 106 exchanges, 370,231
  tokens, and $1.1547450 recorded cost.
- Arithmetic Selector evidence is complete: 24 attempts and outputs, 20 non-empty, 4 empty, no
  missing output, and 41 selected IDs. Counts are `memory-000002` 16, `memory-000007` 11,
  `memory-000001` 9, `memory-000003` 2, `memory-000004` 2, and `memory-000009` 1.
- D0-R1 frozen VerilogEval timing Batch `b-20260903-004` started at
  `2026-09-04T07:26:13+08:00` as hidden PID `19452`. Its running profile validates all 29 unique r5
  timing Cases, repair zero, frozen `mem-v0003` with the locked digest, and timing baseline manifest
  `sha256:1f4303f62a02cf87d1005fdf9575c0c108a314068da70a7aef2836e09943555b`.
  Logs are `.rtl-agent/automation-logs/d0-r1-frozen-ve-timing-20260904-072613.*.log`. At
  `2026-09-04T07:27:50+08:00`, the process tree remained healthy on Case 2/29 with one final result
  sealed; no second command was started.
- Batch `b-20260903-004` finished all 29 Cases but is excluded from experiment evidence because its
  summary is `INVALID`: compile 28, pass 13, mismatch 14, not-run 1, verification-invalid 1. The
  invalid Case is `Prob022_synchronous_FIFO`. Its candidate deliberately copied the prompt-provided
  `dual_port_RAM` into `dut.sv`; compile-only therefore passed, but full simulation also loaded the
  support definition from `reference.sv`, and Icarus rejected the duplicate module. This was not a
  Provider/quota failure and no harness, selector, Memory, or benchmark content was changed.
- With no related process active, both locked Memory manifests were revalidated. Active
  `.rtl-agent/memory` remains VerilogEval `mem-v0003` with 9 items and digest
  `sha256:eacafc24a17c87646e55add966c375e7b1c2fca7fd69a5bda2467da1b8252319`; archived
  `.rtl-agent/memory-chip` still contains ChipBench `mem-v0008` with 13 items and its locked digest.
- A complete replacement timing split, Batch `b-20260904-001`, started at
  `2026-09-04T13:30:31+08:00` as hidden PID `17316`. Its running profile validates all 29 unique r5
  timing Cases, repair zero, frozen `mem-v0003` with the locked digest, and baseline manifest
  `sha256:1f4303f62a02cf87d1005fdf9575c0c108a314068da70a7aef2836e09943555b`. Logs are
  `.rtl-agent/automation-logs/d0-r1-frozen-ve-timing-retry-20260904-133031.*.log`; at
  `2026-09-04T13:32:24+08:00` it was processing Case 2/29 with one final result sealed.
- Replacement Batch `b-20260904-001` later sealed normally with all 29 unique r5 timing Cases,
  repair zero, locked `mem-v0003`, and the timing baseline digest. It compiled 27, passed 14,
  mismatched 13, and did not run 2; both not-runs are valid `MAX_ATTEMPTS`, with zero timeout,
  Provider, or verification-invalid failures. Duration was 00:57:50.789; 29 transcripts contain
  130 exchanges, 510,373 tokens, and $1.6660446 recorded cost.
- Timing Selector evidence is complete: 29 attempts, all non-empty, no missing output, and 62
  selected IDs. Counts are `memory-000002` 25, `memory-000007` 14, `memory-000001` 13,
  `memory-000004` 6, and `memory-000008` 4.
- D0-R1 frozen VerilogEval is therefore valid across 89 Cases: compile 87, pass 59, mismatch 28,
  not-run 2, timeout 0. Relative to Memory off it has 4 failure-to-pass, 8 pass-to-failure, 55
  pass-to-pass, and 22 failure-to-failure transitions, for a net loss of 4 passes. Its four Batches
  contain 397 exchanges, 1,476,816 tokens, and $4.7490264 cost over 02:41:01.180 summed time.
- With no related process active, the stores were reversibly switched at
  `2026-09-04T19:31:18+08:00`. Active `.rtl-agent/memory` is now ChipBench `mem-v0008`, 13 items,
  with its locked digest; VerilogEval `mem-v0003`, 9 items, is intact at
  `.rtl-agent/memory-ve`. Both manifests passed before and after the switch.
- D0-R1 frozen ChipBench assignment Batch `b-20260904-002` started at
  `2026-09-04T19:32:03+08:00` as hidden PID `6820`. Its running profile validates all 30 r5 Cases,
  repair zero, frozen `mem-v0008` with the locked digest, and assignment baseline manifest
  `sha256:53155540d4d3286c45d9f0e4eeaa0e08455b3536cc71730e9a7e6c817ea1e3bf`. Logs are
  `.rtl-agent/automation-logs/d0-r1-frozen-chip-assignment-20260904-193203.*.log`; at
  `2026-09-04T19:33:20+08:00` it was processing Case 1/30.
- Batch `b-20260904-002` later sealed normally with all 30 unique r5 assignment Cases, repair zero,
  locked `mem-v0008`, and the assignment baseline digest. It compiled 30/30 and passed 20/30; the
  other 10 are functional mismatches, with zero not-run, timeout, Provider, or
  verification-invalid failures. Duration was 00:42:57.991; 30 transcripts contain 133 exchanges,
  483,233 tokens, and $1.5410166 recorded cost.
- Assignment Selector evidence is complete: 30 attempts, 29 non-empty, 1 empty, no missing output,
  and 46 selected IDs. `memory-000001` dominates with 17 selections; the remaining selections are
  spread across eight other ChipBench Memory entries.
- D0-R1 frozen ChipBench state-machine Batch `b-20260904-003` started at
  `2026-09-05T01:31:19+08:00` as hidden PID `9220`. Its running profile validates all 6 unique r5
  Cases, repair zero, frozen `mem-v0008` with the locked digest, and state-machine baseline manifest
  `sha256:3e5a6ace82af63693b94899f1a50bcf66e1157f48efd19cf2b48118fea4c580e`. Logs are
  `.rtl-agent/automation-logs/d0-r1-frozen-chip-state-machine-20260905-013118.*.log`; at
  `2026-09-05T01:31:35+08:00` the Selector was active for Case 1/6.
- Batch `b-20260904-003` later sealed normally with all 6 unique r5 state-machine Cases, repair
  zero, locked `mem-v0008`, and the state-machine baseline digest. It compiled 6/6 and passed 4/6;
  the other 2 are functional mismatches, with zero not-run, timeout, Provider, or
  verification-invalid failures. Duration was 00:07:56.961; 6 transcripts contain 30 exchanges,
  127,786 tokens, and $0.3329724 recorded cost.
- State-machine Selector evidence is complete: all 6 attempts are non-empty with 12 selected IDs,
  comprising `memory-000001` 5, `memory-000002` 5, and `memory-000006` 2.
- D0-R1 frozen ChipBench arithmetic Batch `b-20260904-004` started at
  `2026-09-05T07:32:38+08:00` as hidden PID `9584`. Its running profile validates all 24 unique r5
  Cases, repair zero, frozen `mem-v0008` with the locked digest, and arithmetic baseline manifest
  `sha256:eb5d564b58a1300dc53833ab431ffd459fa8c8cc6af3a76194c7d80c92551704`. Logs are
  `.rtl-agent/automation-logs/d0-r1-frozen-chip-arithmetic-20260905-073237.*.log`; at
  `2026-09-05T07:33:44+08:00` the Selector was active for Case 1/24.
- Batch `b-20260904-004` stopped normally at the process level after 24 Cases, but it is excluded
  from experiment evidence. The first 12 Cases reached the Agent path; from Case 13 onward the 12
  main-Agent calls returned zero-token Kimi HTTP 403 weekly-quota errors and became
  `NO_RTL_CHANGE` / functional not-run. A thirteenth 403 censored mismatch post-processing, leaving
  the schema template invalid and producing `MISMATCH_ANALYSIS_FAILED`.
- The censored summary reports compile 12, pass 7, mismatch 5, and not-run 12 over
  00:14:59.420, but these are partial/quota-contaminated diagnostics and must not enter the 24-Case
  condition or any comparison. It used 63 exchanges, 159,939 tokens, and $0.489189 before quota
  exhaustion. No harness, selector, Memory, benchmark, or RTL source was changed.
- No timing or mutation command was started. The next six-hour check may run exactly one real
  arithmetic target Case as an excluded recovery canary; only a successful non-quota Agent result
  permits a complete 24-Case arithmetic replacement from Case 1.
- At `2026-09-05T19:35:48+08:00`, diagnostic Batch `b-20260905-001` ran exactly the first censored
  target, `Prob019_implement_full_subtractor_using_three_to_eight_decoder`, with r5 arithmetic,
  repair zero, frozen `mem-v0008`, the locked Memory digest, and the locked arithmetic baseline.
  Its single main-Agent exchange returned the same zero-token weekly-quota HTTP 403, producing
  `NO_RTL_CHANGE`, 0 compile, and 1 functional not-run in 00:00:11.625.
- The canary is excluded from experimental evidence and proves that quota had not recovered at
  this checkpoint. No full retry, timing, reanalysis, or mutation command was launched afterward.
- The `2026-09-06T01:36:32+08:00` non-inference checkpoint found zero related processes, zero new
  Batches, zero new automation logs, and no quota-reset, billing-capacity, or recovery marker. The
  last real transcript remains the weekly-limit 403, so no canary or full experiment was started.
- The `2026-09-06T07:36:57+08:00` non-inference checkpoint again found zero related processes,
  zero new Batches/logs, and no external recovery signal. Active `mem-v0008` remains intact at 13
  manifest/catalog/items and the locked digest. The queue remains paused without a model call.
- The `2026-09-06T13:36:37+08:00` non-inference checkpoint found the same stable state: zero
  related processes, zero new Batches/logs, no external recovery signal, and intact active
  `mem-v0008`. No canary or experiment command was started.
- The `2026-09-06T19:38:10+08:00` non-inference checkpoint again found zero related processes,
  zero new Batches/logs, no external recovery signal, and the same locked `mem-v0008` identity.
  No Provider or experiment command was run.
- The `2026-09-07T01:38:47+08:00` non-inference checkpoint found no change: zero related
  processes, zero new Batches/logs, no external recovery signal, and intact `mem-v0008`. No
  Provider or experiment command was run.
- The `2026-09-07T07:39:22+08:00` non-inference checkpoint again found zero related processes,
  zero new Batches/logs, no external recovery signal, and intact `mem-v0008`. No Provider or
  experiment command was run.
- The `2026-09-07T13:39:47+08:00` non-inference checkpoint again found zero related processes,
  zero new Batches/logs, no external recovery signal, and intact `mem-v0008`. No Provider or
  experiment command was run.
- On `2026-09-07`, the user explicitly changed the queue order because Kimi quota remains
  exhausted: deterministic verification mutation replay now runs before the remaining
  frozen-Memory conditions. The heartbeat automation was updated in place and remains six-hourly;
  mutation and Provider-backed work are still strictly serial.
- Audited the locked mutation inputs without changing them. `mutation/manifest.json`,
  `mutation/selection.json`, and `M001..M030.patch` resolve to version `i2c-mutants-v1`, seed
  42, 30 ordered patches, and aggregate digest
  `sha256:db47177ad9347e9187d1d8d88929abd684d4f5b5ab63a5752b2b51537db32924`.
- Identified the immutable 78.16% baseline asset as
  `run_20260804-151037-229`: its workspace remains byte-identical to the common baseline
  manifest. The 93.99% and 100% assets retain the same four DUT files, checker, and two support
  models; only `rtl/tb.sv` differs, with locked digests recorded by the runner.
- Implemented the deterministic `mutation:run` / `mutation-run` CLI using isolated copied
  workspaces, `node:path`, fixed executable/argv process calls with `shell:false`, a golden gate,
  and per-mutant apply/compile/simulation/outcome evidence. It never calls a model and never writes
  the source assets or golden DUT.
- Validation passed five focused mutation tests, the 40-test mutation+CLI set, full typecheck,
  lint, and build. The first launch stopped during read-only input audit because the runner compared
  a tab-indented diff line too strictly. The control-plane matcher was corrected to compare exact
  changed-line content after removing the diff marker and surrounding indentation; the diagnostic
  run was moved recoverably to
  `.rtl-agent/quarantine/mutation-runner-diagnostics-20260907/mutation_20260907T062053232Z-input-audit-failed`.
- The complete three-suite replay restarted at `2026-09-07T14:23:30+08:00` as hidden PID
  `3676`. Its run directory is
  `.rtl-agent/mutation-runs/i2c-master/mutation_20260907T062331231Z`; stdout/stderr are
  `.rtl-agent/automation-logs/mutation-full-20260907-142330.*.log`. At
  `2026-09-07T14:26:49+08:00`, the baseline golden gate had passed, M001..M005 were all recorded
  as survived, and Verilator was compiling M006. No other long experiment was active.
- The replay completed at `2026-09-07T15:13:14.566+08:00`. All three golden compile/simulation
  gates passed; 90/90 patches applied, 90/90 mutants compiled and simulated, with zero timeout,
  compile-invalid, apply failure, or infrastructure failure. Post-run integrity audit matched all
  32 locked mutation inputs and all 24 source-asset files to their recorded digests.
- Raw mutation scores are 53.33% (16/30) for both the 78.16% baseline and 93.99% asset, and
  83.33% (25/30) for the 100% asset. Baseline-to-100 has nine survive-to-kill transitions and zero
  kill-to-survive transitions. Adjusted scores remain unset pending human/formal survivor review.
- Published the independent report at
  `exp_result/i2c/09.07-deterministic-mutation-replay.md`. The result is same-I2C-DUT,
  non-authoritative Windows evidence and is not a cross-IP claim.
- Heartbeat automation `Frozen Memory 迁移实验 v2` is active with a six-hour interval and resumes
  from the first incomplete queue item rather than rerunning valid G-R1.

## Locked Memory Identities

- ChipBench Generation: `mem-v0008`, 13 items,
  `sha256:5229d4f09d557d77633280d70e9b40136db90dfa434ed98fd9763377ad886320`.
- VerilogEval spec-to-RTL: `mem-v0003`, 9 items,
  `sha256:eacafc24a17c87646e55add966c375e7b1c2fca7fd69a5bda2467da1b8252319`.
- Runtime reads only `.rtl-agent/memory`; store switches must be reversible, occur only with no
  related process, and validate both manifests before and after the switch.

## Next Steps

1. Monitor active D0-R2 frozen ChipBench timing Batch `b-20260908-004` / PID `6464` without
   starting or disturbing another long experiment.
2. Validate all 29 Cases, the locked r5/memory profile, failure classes, Provider transcripts,
   selector evidence, tokens, cost, and elapsed time after it exits.
3. Continue the remaining frozen-Memory queue strictly serially, then publish its independent
   Case-paired report.
4. After the Provider gate and without overlapping frozen-Memory work, run counterbalanced,
   repeated Agent coverage refinements for FIFO, AES, and Scalable Arbiter using the finalized
   `project-coverage` fixtures and an equal explicit iteration budget.

Concurrency was reassessed after the user's recovery signal. Read-only audits may overlap the
active run, but no second model-backed or Verilator-writing experiment will overlap it: all queued
conditions share Kimi quota and repository evidence stores, and overlapping them would obscure
order and resource effects.

## Constraints

- Do not use `read_write`, run Memory Build, publish Experience, or create a snapshot.
- Do not change common guidance, selector behavior, dataset scope, baseline identity r5, or the
  Generation/Debug metric boundary.
- Run one command at a time and do not use Case subsets as experimental evidence.
- Provider-backed project commands run directly on the authorized local host, outside the restricted
  Codex sandbox; deterministic read-only checks may remain sandboxed.
- A harness-only fix requires validation and a complete rerun of any affected paired round.

## Evidence Boundary

All results are non-authoritative Windows functional-simulation evidence. Positive Memory claims
require directionally consistent swapped-order rounds, more failure-to-pass than pass-to-failure
transitions, no material timeout/not-run increase, no same-Case leakage, and proportionate cost.

## Last Updated

2026-09-08T19:47:00+08:00
