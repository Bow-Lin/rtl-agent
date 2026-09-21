# Session Log

## 2026-09-21 - Repair, verify and land ten scoped commits

User directed repair then submission. Read current state and commit-main, delegated three
independent code-review scopes, and repaired five confirmed P1/P2 issues before staging.
Extraction prompt v2.1 shares field-specific enums and declares top-level trajectory/union
references; generic prompt 1.1 declares matching 50-600 Unicode bounds. Original contract
sources match old preparation hashes in .rtl-agent/commit-review-20260921 snapshots; old
payloads and responses remain unchanged/rejected. I2C generator refuses an existing output
before loading data and publishes NOT_RUN for skipped validation. Three mock-based Python
tests confirm no deletion or fabricated compile pass. Final independent review is clear.

Validation: Vitest native serial 382 pass/2 skip; tools Node serial 148 pass; Python 3 pass;
all source/tests and tools TypeScript noEmit pass; isolated project build plus test typecheck
pass; repository ESLint and formatting pass; diff/harness pass. Initial sandbox parallel
Vitest had three process/timeout failures; confirmed no leftover matching test process,
then native serial run passed. Direct installed Node entry points were used after pnpm exec
could not resolve prettier. A temporary noEmit config's Windows glob separators were corrected
to logical slashes; no project configuration or business code was changed for that issue.

Only two newly submitted files received format-only changes (replay-versatile and ethmac
source-lock); originals retained and JSON equality checked. Prettier excludes local Claude
settings and the historical hash-bound common prompt. All 103 old runtime digests pass.
No full build touched original dist; build outputs live in an ignored isolated tree. No
model/provider request, new RTL experiment or Linux readiness claim was made.

Created commits 1-9: 8dfbcf02 Memory fix; 05364bca Kimi fix; df92082e multi-IP coverage;
6539802e I2C/FIFO tools; 3fb6e9da UART/AES; a39cad86 Memory v1/targets; 30a00b23 FIFO
diagnostics; 250bc034 v2/work-items/contract repairs; 00f6f544 common prompt. This records
the tenth docs/ignore checkpoint. Staged sets and newly introduced local import dependencies
were checked per group. Datasets, local settings, generated PNG and cache were not staged.
Verified exactly ten local commits, no staged/unstaged tracked changes and no tracked dataset,
local configuration, generated image or Python cache. `git push origin master` was rejected
by automatic approval review before process creation: user authorized local commits but not
the exact external transfer to https://github.com/Bow-Lin/rtl-agent.git. No push occurred and
no retry/workaround was attempted. Amend this final local documentation checkpoint to retain
the ten-commit grouping and accurate handoff. User then explicitly replied "授权推送到该仓库"
to the question naming all ten commits and https://github.com/Bow-Lin/rtl-agent.git. This
authorizes the normal push; final remote verification is recorded in delivery and the local
.rtl-agent/commit-review-20260921/push-result.json receipt after this checkpoint commit.

## 2026-09-21 - Requested ten commits blocked before staging

User approved ten-group commit plan. Applied commit-main review gate; master remains at
fca01312de8df27b64c125f31f8638671da5f7d9. No staging, commit, branch change or push.
Inspected current v2 model contract/parser and delegated independent enum review. Confirmed
two existing P2 findings: advertised oracle enum conflicts with parser; top-level trajectory
and nested-reference union requirements are absent from model instructions. Existing eight
verification-memory-v2 Node tests pass. Synthetic inline reproduction accepts valid control
and reproduces INVALID_CLAIM_KIND, MISSING_OBSERVATION and INCOMPLETE_PROVENANCE; no model,
RTL, network or evidence mutation. Full remaining review and commit validation not completed
because skill explicitly requires stop and user direction upon P1/P2. Only three handoff
records updated; source and frozen artifacts unchanged. Dataset exclusion remains in force.

## 2026-09-21 - Review pending commit boundaries

Read current state and inspected tracked diffs and new-file imports. Delegated independent
core/CLI and tool dependency grouping. Found separate Memory consolidation and Kimi signature
fixes, multi-IP coverage, mutation generation/replay, Memory extraction/target/diagnostic and
work-item layers. Proposed ten commits including an independent 90-to-two-line common-guidance
change and global repository records. Shared index/package changes need hunk-level staging;
tests and feature docs should accompany their feature. No new feature or correction adopted.
Only handoff records updated; no staging/commit/push or runtime test. This static grouping
review does not replace code review or isolated validation when actually making commits.

## 2026-09-21 - Clarify dataset runtime dependencies

User requests concrete dependency evidence and accepts missing-data failures. Inspected
family-replay.test.ts:111 publication audit and :121 patch/digest test. They read root
mutation/uart-aes-transfer-v1 manifests, golden sources, TB and patches at runtime;
auditFamilyPublication binds the publication root and validates hashes before replay.
Withdraw the earlier recommendation to change missing-data handling before submission.
Preserve existing failure behavior and the dataset ignore rule; no source/test edits.

## 2026-09-21 - Dataset submission scope

User excludes datasets from commits. Root mutation/ contains 558 untracked dataset assets
and no tracked files. Added /mutation/ to .gitignore without deleting or modifying assets.
Kept tools/mutation source, tests and preparation fixtures available for later code review;
some replay integration checks require the separately provisioned dataset. No business-code
change, staging, commit or push. Ignore/status, JSON, scoped diff and harness checks passed;
19 modified tracked files and 147 untracked files remain. Independent inspection identified
two family-replay.test.ts integration tests that need the excluded dataset. The initial
recommendation to change missing-data handling is superseded by the user's clarification
above. No runtime tests needed for ignore edits.

## 2026-09-21 - Git synchronization inspection

Checked status, branch tracking, diff statistics and live remote refs. Local master and
origin/master both point to fca01312de8df27b64c125f31f8638671da5f7d9, committed 2026-08-19.
Confirmed 18 modified tracked files, 705 untracked files and zero staged entries using
the user's global ignore rules. Untracked groups: mutation 558, tools 119, docs 13,
packages 8, apps 4, .pi 1, .claude 1 and one PNG. Cached ahead/behind is also 0/0.
Sandbox TLS credential/global-ignore access failed; authorized read-only commands outside
the sandbox succeeded. No staging, commit, pull, push, business-code edit or experiment.
Only three required handoff files updated; JSON, scoped diff and harness checks passed.

## 2026-09-21 - Model replacement discussion only

User reports K3 unavailable and requests discussion, not launch. Recovered required repository
state and applied experiment-planning/OpenAI Docs guidance. Read-only delegated review maps
Memory author/import/publication, G, target adapter/guard, native loop and provenance changes.
Read local codex exec help and official non-interactive documentation; no model request made.

Discussed retaining old source records and K3 results, a new version fixing the two known
contract defects, isolated author/target contexts, equal N/G/M executor/budget, independent
evaluation and honest transcript/usage limitations. Current chat has evaluation exposure and
cannot be called blind. Full Codex execution is a proposal; neither protocol nor cohort nor
launch is approved. Only the three handoff files are updated; no experiment code, Memory,
new source output, generated verification patch or RTL result was created.

## 2026-09-20 - UART/AES dynamic baseline and survivor audit completed

Read user attachment and required repository state; scope is frozen190 Icarus replay only,
plus preliminary survivor review. Native process identity audit idle before launch. Added
family-replay/process tests, preserving exact original family-process.ts and all old103 runtime
hashes after detecting its historical binding. Added current-process/token-owned shared serial
lock to an isolated version of the same process mechanism; native lock-drift/cleanup tests pass.

Initial v1 passed7 goldens but failed before first mutant compile due inherited Git autocrlf.
Retained failure/runtime and added real LF regression. Fresh v2 passed7 goldens and executed190
mutants with fixed TB/config/oracles:165 reviewed kills,25 survivors,0 infrastructure/unknown.
Reviewed valid-cycle/counter-watchdog semantics; four X-sensitive Icarus kills marked explicitly.
Published asset297 files, runtime snapshots and all per-mutant inputs remain byte-identical.

Two evaluator-only witnesses confirm UART16550 M021 short stop on legal queued00/ff and AES
Pipeline M011 spurious valid at55ns after reset release before inputs. UART pair completed first;
AES compile option-order failure preserved, then only AES pair completed in an exclusive recovery
root. Original AES TB and stimulus unchanged; UART witness separate. Neither alters baseline score.
All25 survivors have individual static findings/follow-up;23 validity unresolved, no equivalence
exclusions or adjusted score. Reports and hash-bound semantic audit saved; roles still unassigned.

22 focused Node tests, strict NodeNext typecheck, focused lint/format and real baseline/witness
integrations passed. Final publication/runtime/input/report-link, diff and harness checks pass.
No full build (protect old dist), model/Memory or target experiment. Linux CI/formal equivalence
not run on this Windows host; remaining risk is platform/evaluator portability and23 unconfirmed
mutants. Follow up with independent validity work and a prospectively fixed evaluator before
future controls; do not leak this evaluator diagnosis into Agent/Memory. Other task state preserved.

## 2026-09-20 - Resume evidence audit

Read required state and verification records, then reviewed code and reports with parallel
read-only architecture/metrics audits. Applied humanize-chinese-writing for the Chinese resume.
User explicitly confirmed no manual-hour records and chose verified outcomes instead. Draft
exp_result/09.20-resume-evidence-and-copy.md emphasizes controlled execution, structured feedback,
source-grounded Memory experiments and independent defect detection. Verified400 prepared
single-site mutant candidates across I2C/FIFO/UART/AES and fixed-I2C16/30->25/30 raw kills,
9 added/0 lost. Do not retain unsupported unified12/360/>95% claims or assert Memory transfer gains.
Only the draft and three handoff files changed in this session; existing work remains intact.
No model/RTL run or production-readiness claim. Handoff JSON parsed, all7 evidence links exist,
scoped git diff --check passed, and Git Bash --login scripts/harness_check.sh passed. Business
tests and Linux CI were not run for this documentation-only task; no runtime behavior changed.

## 2026-09-19 - Five preparation calls completed; source v2 remains unpublished

Executed the user-authorized G1 + source4 batch. G and versatile completed in the original
process; versatile's strict gate rejection stopped it. Added only an isolated recovery plan,
entry and seven offline tests; strict type/lint/format, real preflight and independent review
passed. The recovery ran only the original uncalled eth/ufifo/openhmc requests, once each,
and completed at 10:55:29.490Z. All five responses are normal and complete. No provider
retry, replacement, consolidation, target call or RTL execution occurred. Actual SDK requests
include the declared cwd suffix; recovery changes that suffix, not the registered prompts.

G's 253-character original passed source-isolation/generic-content review and is frozen.
Four source responses contain 14 diagnostic drafts, all rejected by the original gate;
no source Memory library was published. Review distinguishes model shape/fence errors from
two open P2 contract defects: unstated top-level reference aggregation/trajectory requirements
and the prompt's invalid 'not-added (oracle only)' enum. ETH has valid JSON and useful
failure/repair evidence; its direct rejection cannot be called model JSON noncompliance.
Source audits separately document overclaimed oracle execution, unsupported historical
intent/negative lessons, policy transfer and source-fact errors. No raw response was repaired.

Usage: 210535 total tokens, including provider cache accounting; reasoning is not added twice.
Provider duration sum 553247ms. Final 160 bound files pass integrity checks, including all
103 old runtime hashes. An independent reviewer confirmed the counts, usage, unchanged
artifacts and no publication. Both locks are absent; no active preparation process remains.
Report and metrics: exp_result/09.19-autonomous-work-items-preparation-results.md/.json.
Source-specific audits and exp_result/09.19-v2-prompt-contract-audit.md preserve evidence.
The completed five-call budget is exhausted. Future contract changes must use a new version;
target cohort/native integration and formal N/G/M experiment readiness remain pending.

## 2026-09-19 - Explicit five-call authorization and launch

User replied "启动" to the exact disclosed G1+source4 Kimi K3 preparation/data-transfer question.
Updated authorization state and launched the unchanged frozen command; preflight reverified
payloads/runtime and old103 hashes. ProcessPID19192/session98440, serializationlocks10:31:32Z.
G completed in11660ms,1request/1response/no tools,868tokens; real request containsone usermessage
andfixedgeneric system only. Source versatile started next. Review agents separately inspected
source raw evidence without target/mutant inputs, and G actualrequest/prose review is underway.
No target/RTL run, new source generation, retry, fallback or prompt change authorized inthisbatch.

## 2026-09-19 - Autonomous work-item engineering prepared; external source batch awaiting approval

Read new user recommendation; closed old dpretet/M010 diagnosis permanently. Planned same-flow
N/G/M pilot on3new independenttargets×3=27, with0–2 cumulative workitems and max3turns. Added
isolated ledger/evidence/loop/context-policy modules, no-edit analysis/review, pending/repair-aware
stop, exact-digest execution binding and distinct semantic uncertainty. Added new/lost kill-set
comparison with invalid/missing/timeout outcomes retained separately. Native target entry/profile,
cohort and formal methodfreeze remain pending; no new old-target samples or RTL execution.

Source v2 collector preserves103 raw records and adds4 originalspecs; strategy/discovery fields
separate, four serial no-tool K3 extraction requests, zero retry/consolidation, item-by-item review
beforepublication. Newsource manifest binds33files including actualrequest/response/transcript and
raw output; G call evidence binds7files. One isolated no-source G authorrequest gives5totalprep
calls. No actual output/library yet. ThreeP2s (historiccontext integrity, redirectedwriting,
provider evidence seal) fixedandreviewclosed;60tests acrossfull/changedmodules, strict type/lint/
format/diff/harness pass. Old103runtime hashesallunchanged. LinuxCIunrun onWindowshost.

Preparedlabel work-items-v2-20260919-prep1. Totalreceipt SHA b2b3a59d4e067987688725aa60bd57d1d86c3ae4218883ab433cf45ab89f7d9f;
sourceprep SHA db2511a4515510c0fcb991dc6f840ae8c66e6e9082b698d04a04f137cb07612e.
Automaticapproval rejected launch beforeprocess creation: userauthorizeddirection butnotexplicit
sourceRTL/trajectories/specs transmission toKimi externalservice. Exact5call/dataauthorization
questionaskedasync; no bypass orretry. model0/RTL0/bothrun-startedabsent/locksabsent. Launch only
afterexplicitapproval via prepared mainruncommand; no newpayload/code changes withoutnewpreflight.

Targetfamily questionalsopending. PublicFIFO preliminarycandidates PULPcc_fifo/OpenTitanprim_fifo_async/
Nyuzisync_fifo needrevision/dependencies/lineage/goldenchecks; sharedassertinfrastructure isnot
functionalindependenceproof. PULPcdcvariant deferredforadditionalspillcapacity. Candidate doc and
preparation reportretain boundaries; nohiddenmutantcontents consulted. No commits or deletions.

## 2026-09-19 - Directed Memory10 batch and final evidence review completed

User-authorized fixed3draw completes:5 Agentturns,3valid finals,allNO_MEANINGFUL_GAIN;
generation sealed04:27:57Z and independent6case replay done04:31:37Z. Primary3/3 correct
executed reset-effective checks; all3golden pass; M010 failure10/28/42ns. E3delaygate has
postrelease tail, so total8gatehits not all reset-active; fixedinitial42/56ns windows supported.
No retries/extra turns/best-intermediate fallback/model feedback from evaluation.3/3 applies
to designatedoriginalitem development diagnostic; no autonomous/stability/heldout claim.

Report exp_result/09.19-fifo-memory10-directed-results.md/.json. Process audit SHA
f758dbd7fb3e3b711d9bfeed16894d4eaafedf0951d71f8bbdc841d875a3f3ee; semantic audit SHA
4c26d6e505918b8f643c6a42c348b6205878075d0bf294c7e4e3b8eb072415f7.103runtime/prior97,
3manifests/27files,7reportinputdigests,11reportlinks,6rawreplays/counts/usage verified.
5turn/39exchanges/343200tokens.18tests/type/lint/format/preflight/review pass; finaldiff/harness
pass. Windows-only; LinuxCI notrun and native process/signal portability needs follow-up before
Linuxreadiness. GenerationPID9744/session4865 and evaluatorsession54796 exited0; no locks or
pendingexperiment. This supersedes all running/awaitingapproval checkpoints below.

## 2026-09-19 - Explicit directed batch authorization received

User replied "启动吧" after prior precise approval request naming3draw/max3, Kimi coding API K3
and targetRTL/TB/checker/feedback/instructions/Memory10. This is explicit batch/payload consent.
Recovered six state documents; original103runtime/reference input preflight passed. Retain
original batch label and protocol; no repeats or prompt changes. Launch/evaluation pending.

Launch accepted04:12:39Z, campaign PID9744/firstchild9404, session4865, E1 active.
Original plan digest336363695269d2e4136d658e5ad1f58f413277d504e3533085fdea49cee1a9a9.
Receipt10file and prior97runtime integrity independently pass; new103plan runtime bound.

Generation sealed04:27:57Z,3valid finals and5turns (E1:1/E2:2/E3:2), allNO_MEANINGFUL_GAIN.
Session4865 exit0, locks absent. Seal806ad719262d3831bfbc6ace08f0235a4715ae1b03363c6231b06abc7ef04587.
New evaluator preparation verifies103runtime,3final snapshots and frozen publication; final-only
golden/M0106case replay launched. Audit workers see evidence only, no feedback to generation.

Replay finished04:31:37Z, session54796 exit0;6compiles/simulations,all3golden pass and M010
checks fail10/28/42ns. Process audit frozen(f758dbd7fb3e3b711d9bfeed16894d4eaafedf0951d71f8bbdc841d875a3f3ee),
5turn/39exchanges/343200tokens; all103runtime and24native closures verified. Semantic review
confirmsfixedwindow checks; E3delay extends pastrelease so8hits not all active-reset. DraftMD
review passes; final semantic/combinedJSON and delivery checks pending. No active serialization lock.

## 2026-09-18 - Directed Memory10 diagnostic preparation

Launch checkpoint: automatic approval review REJECTED node tools/mutation/fifo-directed-campaign.ts
fifo-directed-memory10-20260918-v1 beforeprocesscreate. Reason explicit authorization missing for
this3sample batch and targetRTL/TB/checker/feedback/instructions/Memory10 to external Kimi K3.
Async user approval requested naming destination/content/budget. No campaign or condition dirs,
no active lock,0model/0RTL confirmed. Preparation complete:18tests/type/lint/format/preflight/
diff/harness, reviewerP2 processcleanup closed and rereview passed. Receipt
exp_result/09.18-fifo-directed-preflight.json. Await explicit reply; no retry/bypass.

Recovered six project-state documents and user request. Pause unchanged v1 expansion.
Parallel read-only objective/stop audit, isolated directed wrapper/entry and3-draw evaluator;
root plans campaign. Fixed3draw/max3 originalearlystop, no oldruntime change or targetanswer
injection. Original item ID consol-mid-reset-assert verified. ARS experiment workflow used
for evidence/interpretation boundaries; user experiment instruction and existing provider
authorization govern implementation and execution, no new consent round inferred from skill.
Prelaunch validation and independent review pending; no model/RTL launched at this checkpoint.

Prelaunch update:18 focused tests,explicit NodeNext/ESLint/Prettier,real-data preflight,
git diff --check and harness pass.103 runtime digests include prior97 unchanged. Native idle
inspection empty. Review found terminal execution could hide unconfirmed RTL/Agent teardown;
newqueue now audits all process JSON plus Agent turn outcome/timeout/count, preserving ownership
and stopping on uncertainty. Ordinary generated compile failures with confirmed closure remain
failed draws. Final review follows. Objective/stop audit MD/JSON saved with concrete code/trace refs.

## 2026-09-18 - Fixed-v1 usage study and independent review completed

All12 generations sealed02:41:05Z,25 Agentturns,11 available finals and A3 invalid generation.
Independent final-only22 cases finished02:52:08Z;11 golden passes,2 M010 kills,9 survivors.
Manual semantic+execution review primary A0/3 B0/3 C1/3 D0/3. C3 final checks actualFULL13/
EMPTY8 branches, golden185reads, M010 failure10ns; D1 post-release75ns raw kill not qualifying.
No observed Memory increment or established stable generic-check effect.97runtime hashes and
all baselines/config/spec equal; fullMemory12/12, genericprompt13/13 actual provider exposure.
25provider passes,24topology passes+1A3 rejection,35scope passes,1,577,998tokens including A3.
Recovery kept raw A3 infra label and corrected it via sidecar, no resampling/fallback; original
pendingD3/B3 only. No model calls during evaluation, no v1/v2/oldscore/UART-AES changes.
AB/CD/process audits frozen and bound into final reportJSON; all required work now complete.
Final git diff --check and scripts/harness_check.sh passed; independent report review passed.
Rechecked97 runtime hashes,6 input digests,11 final manifests,22 replays and15 report links.
Both serialization locks absent. Windows-only; LinuxCI not
available here, Linux process/signal behavior remains follow-up before production claims.
Report exp_result/09.18-fifo-memory-usage-2x2-results.md and .json. This completion supersedes
all running/interrupted usage-study checkpoints below; they remain historical evidence.

## 2026-09-18 - Fixed-v1 usage study registered

02:21Z interruption checkpoint:9 completed-valid generation samples, A-R3 stopped by
TARGET_EXTRA_DUT_INSTANCE on secondturn; both provider calls complete.10 attempted,2 pending.
Original queue wrongly categorizes noexecution as infrastructure; preserve raw and add reviewed
generation-failed sidecar. Stale lock22220 retained, native read-only process audit idle. Recover
only D-R3/B-R3 with original frozen runtime, no A-R3 resampling or earlier snapshot fallback.
Protocol/evaluator unchanged. See docs/fifo-memory-usage-recovery.md. C-R3 repaired one intermediate
golden failure within3turn budget; this is distinct from A-R3 boundary rejection.

Launch checkpoint: campaign fifo-usage-v1-20260918-0931, PID22220, started01:30:33Z.
All29 focused tests/typecheck/lint/format/diff/harness pass; independent review found
and closed two process-boundary issues. Twelve serial generation only; evaluation
must wait for complete seal. Runtime/protocol/Memory hashes now locked. Active A-R1.

Recovered six required state documents and latest user attachment; existing bounded
diagnostics remain complete. Registered A/B/C/D3each protocol, unchanged frozen13,
same max3 budget and final-only independent evaluation after generation. Implemented
opt-in generic workflow spec addendum;5 focused tests, typecheck and lint pass.
Parallel queue/evaluator implementation and read-only review in progress. No model
or RTL execution started in this checkpoint; no related active native process found.


## 2026-09-18 - Reset mechanism, adoption audit and opt-in v2 extraction

Executed user's pasted three-action plan in docs/fifo-memory-mechanism-diagnostic.md. New
diagnose-fifo-reset tool copied hash-bound baseline into exclusive reset-window-20260918-v1,
added only one reset-active value check, and ran golden/M010 serially under recordedProcess.
Golden PASS161, checks70ns/6888ns; mutant fails at70ns with both resets asserted and full1.
Original baseline golden/M010 passed;29 retained hashes unchanged. Known mutant, no blind claim.
Scoped review identified untrusted historical compile argv; replaced with fixed arguments and
exact profile equality. Reviewer confirms fixed; actual arguments match prior successful runs.

Independent adoption audit recorded24 snapshots/24 coverage.dat/168 C++ and216 hashes:
Memory1 implementation produces same new bins as off;Memory9 mostly preexists,45 X-check
failure paths removed;Memory10 active-reset window absent in dpretet, AXIS R2 off implements
synchronous active reset. No invalid AXIS ready-before-valid requirement found in actual code.
Report/JSON retain direct versus inferred execution distinctions and links; external protocol/
simulator references corroborate, while actual5.050 generated C++ controls local findings.

Separate v2 extraction contract +7 new tests and doc: scene/oracle/window/authority, negative
lessons and observed vs hypothetical effects; no v1/default/catalog changes. Combined15 tests,
focused NodeNext typecheck/ESLint/format pass. Real source prepare18/35/20/30 records,103 total,
all fixed source paths,0 model calls,0 catalogs. Final JSON/29 hashes/actual compile-profile
equality/idle markers/format/git diff --check/harness all passed. UART/AES state preserved.
No Linux CI/formal acceptance; no new repeated campaign or changes to raw target scores.

## 2026-09-18 - Verbatim Memory and FULL_AND_EMPTY evidence delivered

Read frozen13 items and actual dpretet R2 off/frozen replay checker/TB/DUT/M010 artifacts.
Generated a verbatim evidence document preserving all fields, provenance IDs and baseline plus
both final checker bodies. Verified item digest65a5c8f2... against manifest and all52 semantic
fields unchanged; copied checker digests recorded. Independent static review confirms M010
reset-value0->1 is caught at75ns before NBA, while baseline reset check runs at140ns.
No model/RTL execution or original evidence/score mutation. Reframed next research around
source validity, target applicability, baseline gap, causal gain and stable Agent enactment.
Do not infer generic async flag mutual exclusion or Memory-specific causality from this kill.
Validation passed: source hash/verbatim extraction, static log/code cross-check, state JSON,
git diff --check and Git Bash --login scripts/harness_check.sh.

## 2026-09-18 - FIFO completed target results inspected and reported

Read current harness state and actual recovery artifacts; completed8/8 at21:15:07+08 on09-17,
no lock/failure file and prior15408 process absent. Separate read-only agent rederived all744
replay process-pair verdicts,24 goldens,720 mutants and720 patch/hash audits with no mismatch.
Main audit verified17 provider/17 topology/24 scope records, actual Memory exposure and frozen
hashes, same paired baselines/config; aggregated first/final coverage, kills and provider usage.
Off/frozen tie on every paired score and killed set; dpretet R2 gains M010 in both modes.
Intermediate axis R2 off reset assertion failed golden and was repaired in budget; excluded
from mutant kills. No new model/RTL execution. New report/JSON preserve raw non-authoritative
and pending-review status; do not claim general Memory ineffectiveness or causal speedup.
Updated completion checkpoint supersedes stale FIFO running state while retaining UART/AES.
Validation passed: artifact assertions, independent evidence audit, JSON/paired score and set
consistency, preserved UART/AES state, git diff --check and Git Bash --login harness check.

## 2026-09-17 - UART/AES final validation and publication

FIFO completion and idle identity checks allowed serial resumption. UART16550-v4 and
TinyAES-v2 prepared30 each; golden coverage passed for UART16550v4, TinyAESv2 and AESpipelinev1.
All seven final roots now have passing Icarus/Verilator goldens and190 dual frontend checks.
Bound190 site reviews to patch hashes, applied all190 patches in isolated Git scratch and
verified deterministic reconstructed contents plus unchanged originals. Published exclusive
mutation/uart-aes-transfer-v1 with manifests last; audit-published reports7/190/hash pass.
Existing AES baseline referenced and entry hashes verified; roles unassigned, no model/Memory
or kill replay. OSDVU10/30 is the disclosed operator/scope shortfall; no padding.

Native Windows process tests confirm owned parent/descendant timeout cleanup; prior restricted
taskkill failure retained. Final parent-directory guard regression brings focused total to13 pass.
Host C++ -O0 profile preserves RTL/config/instrumentation; UART16550 raw coverage digest agrees
with prior completed profile. Report/README/plan/decisions/error journal updated. Final focused
typecheck/lint/format and diff/harness pass; heartbeat uart-aes updated to PAUSED and read back. Linux CI/formal Gate
not run on this Windows host; risk is unverified platform/production execution, follow-up is
Linux CI before any formal acceptance. Old diagnostics and other task records preserved.

## 2026-09-17 21:35 +08 - UART/AES serial preparation resumed

Read8-condition FIFO completion, absent active lock and empty related-process audit. Archived own
pause with evidence. Added family-process.ts/test: directly persisted logs, exclusive ownership
marker, FIFO/pause watch, bounded owned-tree termination and fail-closed pause. Initial restricted
timeout test could not confirm taskkill; native Windows retry12/12 passed, both descendants gone.
Typecheck/lint pass. UART16550-v4 30 frontends and coverage pass; TinyAES-v2 30 frontends pass,
patches/TB unchanged from v1, coverage running. New compiler -O0 profile recorded; no DUT edits.
Remaining AESpipeline, final static review binding, actual patch audit, publish/audit and docs.

## 2026-09-17 16:34 +08 - UART/AES heartbeat idle check

Required context read; read-only CIM process identity audit confirms Tiny AES make15168,
make4560/g++11972/cc1plus3408 are absent and no family-preparation process is active.
FIFO campaign15408 remains live, dpretet-r1-off completed; dpretet-r1-frozen replay15140
owns current Verilator20184 and compiler descendants. Preserve pause/automation; no RTL work
or process mutations. Default CIM lacked permission; scoped read-only escalation succeeded.
Only UART/AES handoff/check evidence updated. FIFO queue/evidence unchanged.

20:57 +08 recheck: FIFO15408/replay20920 active, axis-r2-off;7/8 complete;
Tiny AES residuals absent. Pause/heartbeat unchanged; no RTL launch or process mutation.


## 2026-09-17 - Authorized FIFO cache cleanup completed

User requested deletion of the listed2736 compiler cache files (144285181 bytes). Validated
exact11 allowed roots, names, sizes, uniqueness and no reparse points before individual native
PowerShell deletion. All2736 paths are absent; all1740 retained files in affected roots plus
frozen Memory passed before/after SHA256 verification. Independent read-only review confirmed
all7 fixed topology/coverage regression inputs retained and active campaign excluded.
No source, evidence directory, active FIFO, UART/AES file or process was changed by cleanup.
Original inventory preserved; result receipt .rtl-agent/cleanup-audits/fifo-failure-20260917-deletion.json;
human report exp_result/09.17-fifo-cleanup-inventory.md. Guard environment failures occurred
before deletion and resolved through Git Bash --login; details in docs/error-journal.md.
Validation passed: exact absence,1740 retained hashes, receipt/state JSON, git diff --check,
and Git Bash --login scripts/harness_check.sh. FIFO parent PID15408 still alive after cleanup.

## 2026-09-17 - UART/AES serial pause and authorized heartbeat

User chose to wait for FIFO, then explicitly authorized a 30-minute continuation heartbeat.
Automation `uart-aes` created ACTIVE after approval (initial pre-authorization attempt rejected).
It waits for actual FIFO queue/process idle plus residual Tiny AES process exit, completes local
validation and FIFO-shaped publication, reports then disables itself; unchanged waits stay quiet.
Dataset Node/Verilator parents stopped; descendant make/g++/cc1plus taskkill returned Access denied.
Do not claim complete cleanup. Persistent pause marker blocks subsequent CLI probe/prepare/coverage.
No FIFO processes changed. TinyAES-v1 interrupted evidence retained; no later RTL jobs launched.
Seven Icarus golden probes passed;160 final frontend mutants, UART16550-v4 final30 still pending;
OSDVU10 retained without padding. Four final coverage roots plus diagnostic UART16550-v3 complete.
No publication/model/Memory/kill/transfer results. New tools and generated fixtures are uncommitted.
Resume plan and precise status: docs/uart-aes-dataset-preparation.md and
exp_result/09.17-uart-aes-preparation-progress.md. Windows evidence only, Linux/formal pending.
Post-pause validation: Node tests9/9, explicit NodeNext noEmit, focused ESLint,
git diff --check and Git Bash scripts/harness_check.sh all pass. No RTL jobs in these checks.

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


## 2026-09-17 10:01 +08 - Implemented and launched real K3 Memory pipeline

Added verification-memory.ts, verification-memory-run.ts and verification-memory.test.ts;
package command verification:memory, documentation docs/verification-memory.md. Fixed four-source
collector preserves prose, allowed TB edits, golden/coverage and verified asset snapshots. No
mutation/target/report inputs. Separate no-tools sessions with returned k3 identity enforcement;
four extractions then pooled consolidation, evidence validation and manifest-last publication.
No fixed item count or Codex-written Memory input. Independent store and build lock.
8 tests/typecheck/lint/build/dry prepare/diff/harness pass, Windows only. Real integration running
PID12500, output .rtl-agent/verification-memory/k3-build-20260917-100104; stdout/stderr under
.rtl-agent/automation-logs with same basename. First stage extract-versatile observed, no manifest
yet. Semantic correctness still requires review, selector not integrated. No new experiments.
Prelaunch guard initially refused while ESLint was finishing; after exit0 rechecked idle and
launched exactly once. No model retry or duplicate build. Next audit live build without overlap.

## 2026-09-17 - Coverage-only Memory semantic curation

Validation: 7 transcript SHA matches, state JSON parses, git diff --check and harness check pass.
Documentation-only; no code/build changes or new Linux evidence.

Read seven source response narratives without the lossy paragraph blacklist; checked four result
files and 32 coverage process records (one expected eth failed simulation, 31 exit0, no timeout).
Created exp_result/09.17-fifo-coverage-memory-candidates.md with six merged strategy candidates,
source/attempt references, observed outcomes and limitations. Current assistant curated this draft;
no separate Kimi summarizer call, executable snapshot, selector integration or experiment launch.
User deferred dual coverage/kill-goal experiments; old stopping rules and original evidence intact.
No active long process. Next: review candidate evidence and implement isolated publication workflow.

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

## 2026-09-15 18:46 +08 - fourth source started

Ufifo replay93 process pairs/90 hashes audited,all30 killed all3 stages,no errors/timeouts,
duration sum1601835ms. Report exp_result/09.15-ufifo-mutation-replay.md; no detection gain.
OpenHMC source adapter fixed DWIDTH8/ENTRIES8, source seed and legal-operation checker.
Focused10 tests,typecheck,lint,build pass. Linux CI not run; Windows non-authoritative.
No prior long process. Hidden PID13840 runs project-coverage --project openhmc --agent pi
--iterations 3 through apps/rtl-core-loop/dist/index.js. Logs automation-logs/
openhmc-source-20260915-184524 stdout/stderr under .rtl-agent. No Memory or mutant changes.
Next audit completed source then fixed30 replay. Initial handoff patch write failed transiently;
disk has292GB free; retry preserves existing content. All older active PIDs historical.

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

## 2026-09-14 18:42 +08 - Integrate eth_fifo independent source

- Startup PID8040 alive; unique fifo-source-eth-20260914-184217 stdout/stderr logs.
  JSON/diff/harness pass. Await actual run evidence, no coverage or kill outcome claimed yet.

- No related long process. New eth-fifo project lock validates3 raw source digests, width32/depth8
  wrapper retains eth_fifo module unchanged except existing provider LF normalization.
- Seed TB derived from existing source golden, preserving status/data/reset/clear/legal-operation
  checks; added count-range checker and wrapper wiring. No target/evaluator mutant input.
- Added provider fixture test; focused provider/CLI10 tests, pnpm typecheck/build and focused
  ESLint pass. Existing successful Versatile source not rerun; no Memory construction.
- Launched independent source pi/max3 with baseline golden gate and immutable attempt snapshots.
  Full Linux CI/repo suite not run; real Windows integration now pending.

## 2026-09-14 12:37 +08 - Versatile three-version replay complete

- No active long task.064026 summary complete;93 compile/sim pairs,90 mutant DUT hashes
  independently checked.3 golden pass,12/22/22 kills out of30, no timeout/invalid/not-run.
- Ten baseline survivors now killed, no losses, first/final identical verdicts. Process sum
 1686191ms. Report includes survivor lists (human review pending), operator/module counts,
 raw scores40/73.33/73.33%, coverage57.95/93.66/100 and limits. No adjusted score or Memory claim.
- Recovered-first golden passes.063916 infrastructure diagnostic retained excluded.
- Next remaining source fixture/replay integration and independent source runs; do not
 re-run successful Versatile or expose mutation report to Agent/Experience. No Memory writes.

## 2026-09-14 06:39 +08 - Fixed30 source replay implementation and launch

- Update06:40: first launch exited after baseline golden pass; apply failed git ENOENT,
  not a mutant result. Preserved/excluded063916. Verified Get-Command git absolute executable,
  switched Windows path; fresh064026 output/PID11628. No original assets deleted or changed.

- Added replay-versatile.ts, replay-verdict.ts and classifier test. Fixed inputs, exclusive output,
  locked manifest/patch/mutated DUT digest, golden prerequisite per stage, fixed executable/argv,
  shell:false, isolated workspaces. Compile timeout stops runner for descendant inspection.
- Baseline TB bytes checked against original run baseline manifest; recovered-first hashes
  checked against recovery manifest. Final DUT hash locked. No Agent/Memory calls.
- Node classifier test passes six outcome assertions; explicit NodeNext typecheck and focused
  eslint pass. Real Windows integration launched PID5332; no full repo tests/Linux claim.
- Output .rtl-agent/fifo-replays/versatile-20260914-063916; unique logs under automation-logs.
  Next check golden and all90 mutant evidence; no kill score claimed before completion.

## 2026-09-14 00:40 +08 - Implement capture and recover missing first assets

- No long processes. project-coverage-experiment now captures evaluator-only immutable baseline
  and usable Agent attempt RTL snapshots with byte digests, outside Agent workspace.
- Extended test verifies baseline persistence, distinct edited snapshot/hash, overwrite rejection
  and invalid attempt rejection. Focused vitest4/4, pnpm typecheck/build, focused eslint passed.
- Added fixed-run recovery script, no arbitrary tool execution. Initial assumption edit arguments
  were flat failed closed before output; inspected actual edits array and corrected parser.
  Recovery succeeded: two attempt2 files; exact attempt3 edits reproduce final bytes/hash.
  Output .rtl-agent/fifo-transfer-recovery/versatile-first-v1 with transcript hashes.
- Recovery script explicit typecheck/lint, JSON/diff/harness pass. No Linux CI or full repo
  suite rerun; snapshot behavior is portable but production Linux readiness not claimed.
- No model calls, original assets/Memory untouched. Golden recovery replay and mutation scores
  remain pending; next implementation is fixed30 replay and remaining source adapters.

## 2026-09-13 18:34 +08 - Source coverage audit and scheduling correction

- PID10040 exited; run_20260913-135221-083 scores57.95/93.66/100, twoAgent turns,
  PENDING_HUMAN_REVIEW. Nine process checks exit0/no timeout; DUT sha intact.
  Transcripts267164 tokens/cost0.6997416, no errorMessage. Mutation and Memory not completed.
- Found absent per-attempt TB snapshots in existing runner; preserve final and transcripts,
  add evidence capture before more source runs, investigate intermediate reconstruction.
- Used OpenAI Docs scheduled-task guidance and automation tool to update same heartbeat to
  current authorized4+2 priority, same6h schedule/target. No duplicate automation created.
- Report records Windows/coverage-only boundary. Next replay/snapshot/fixture implementation;
  old RTL timeout protocol question remains separate. Original assets untouched.

## 2026-09-13 - User authorized FIFO4+2 execution

- Launched hidden PID10040 first source Versatile at13:52+08, project-coverage/pi/iterations3;
  unique fifo-transfer-source-versatile-20260913-135217 stdout/stderr under automation-logs.
  JSON/diff/harness checks passed. No implementation completion or coverage result yet claimed.

- No relevant long processes. Sources independent/no Memory, consolidated only afterwards.
- Wrote protocol and staged implementation plan; max3 iterations, two paired target rounds,
  mutation evaluation-only. Existing seeded-TB runner semantics disclosed, not blank generation.
- First supported source Versatile can run without code changes. Other fixtures and verification
  Memory adapter still require implementation. Old RTL timeout batch preserved, queue paused.

## 2026-09-13 12:33 +08 - Quiet waiting checkpoint

- Read handoff and required guidance in order; no related long process found.
- Timeout classification question remains unanswered. No retry, score change or next split.
- Recorded latest user FIFO4+2 task-definition discussion separately from frozen3+3 assets;
  no learning/Memory Build authorization inferred, budget/repeats/feedback remain outstanding.
- No experimental or Memory content changed; unchanged waiting state does not warrant notification.


## 2026-09-13 06:32 +08 - Real candidate timeout; no blind retry

- No prior experiment process. Arithmetic b-20260912-001 INVALID with24 compile19 pass4
  mismatch1 verification-invalid timeout. Full RAM result SIMULATION_TIMEOUT,30922ms,
  empty stdout/stderr, repair0. All24 main transcripts109 exchanges show no Provider errors.
  Tokens392926,cost1.2665436,start16:33:14.692Z/end17:24:45.404Z Sep12,duration3090710ms.
- Candidate rtl/Prob030_simple_implementation_RAM/dut.sv has reg[2:0] i in i<8 reset loop;
  loop counter wraps forever. Existing verilog-eval-simulation.ts maps timeout to INVALID.
- Preserve original batch; no retry/RTL fix/classification override. Request user protocol
  decision to count candidate timeout as failure while retaining full24 evidence. Queue paused,
  no active PID; earlier active_run fields are historical and overridden by latest_execution_override.
- Selector24 outputs3 empty37 IDs; counts in state. Memory/FIFO180 unchanged.


## 2026-09-13 00:32 +08 - Reconcile stale handoff; VE timing completed

- Startup confirmed Batch b-20260912-001 full24/arithmetic/r5/repair0/frozen mem-v0003;
  PID10180 alive, case1/24 running. JSON parse/diff check/harness passed.

- No prior experiment processes. Older active PID11208 was stale; actual Chip assignment
  and aggregate evidence already published in exp_result/09.12-d0-r2-chipbench-condition.md.
  Chip R2 complete58/89. Store switch already recorded there; current active VE/archive Chip
  both successfully loadSnapshot-validated against locked digests; no new switch this wake.
- VE timing b-20260911-002 summary/profile/full29 case IDs/r5/repair0/frozen/log match:
  27 compile14 pass13 mismatch2 compile-not-run0 timeout/invalid;29 main transcripts132
  exchanges531358 tokens,cost1.8594516,no Provider errors. Started2026-09-11T16:29:21.051Z,
  completed17:30:53.953Z,3692901ms. Selector29 outputs1 empty58 selected IDs, counts in state.
- Started hidden PID10180 full24 VE arithmetic with unique d0-r2-frozen-ve-arithmetic-20260913-003243
  stdout/stderr logs. Next validate then VE state-machine/assignment. No new excluded Batch,
  no FIFO/model guidance/selector/Memory content changes. Windows evidence only.


## 2026-09-12 - FIFO replacement request: verify existing completed delivery

- Consulted current preparation report and published six-IP manifest, then upstream author repositories.
- node tools/mutation/audit-fifo-publication.ts exited0:6 IPs,180 patchApplyChecks,
  allSourceTbManifestHashes pass, mutatedGoldenFiles0.
- No redownload, regeneration, model call or Memory mutation. Preparation remains complete,
  with30 static-reviewed candidates per IP; kill replay and non-equivalence confirmation pending.
- Updated handoff only; independent frozen-Memory execution state not audited or advanced here.


## 2026-09-11 18:29 +08 - State-machine4/6 validated; assignment launched

- No related old process. b-20260910-001 summary/profile/6 case IDs/repair0/r5/frozen match.
 6 compile,4 pass,2 mismatch,0 not-run/timeout/invalid; 05:47:49.397Z to06:03:18.825Z on Sep10,
 929428ms,6 transcripts31 exchanges149381 tokens,cost0.4335558,no provider error.
- Selector6/6 nonempty,12 IDs:memory000001=5,000002=6,000006=1. Snapshot13-item digest valid.
- Started one hidden assignment full30, PID11208, same frozen/repair0. Unique logs
 d0-r2-frozen-chip-assignment-20260911-182922 stdout/stderr. No mutation/Memory/guidance edits.
- Next validate assignment, aggregate full89 ChipBench R2, then VE timing after store validation.
- Startup confirmed b-20260911-001 profile30/assignment/r5/frozen mem-v0008, PID11208 alive.

## 2026-09-10 13:47 +08 - Arithmetic18/24 validated; state-machine launched

- No old process; full24 IDs/r5/repair0/frozen profile and per-case evidence checked.
  b-20260909-001:24 compile,18 pass,6 mismatch,0 not-run/timeout;3271385ms,
 24 transcripts113 exchanges413848 tokens,cost1.3537776. Selector24,21 nonempty,3 empty.
- Three engine-overloaded429 exchanges in run_ef811861-4ed1-498b-b214-eaeae4ffa8eb recovered
  by existing retries (final stop); no intervention,403 or missing result. Preserve evidence.
- Verified locked snapshot13 items/digest; hidden PID19288 Batch b-20260910-001 started,
  full6 state-machine profile r5/frozen verified. Unique d0-r2-frozen-chip-state-20260910-134731
  stdout/stderr logs. Next assignment; no FIFO, model-guidance or Memory content changes.

## 2026-09-10 07:45 +08 - Resume D0-R2 frozen ChipBench arithmetic

- Session Briefing: FIFO180 prep complete; no previous experiment process. Rechecked timing
  b-20260908-004 completed29/r5/repair0/frozen15 passes. Snapshot load verifies13-item digest.
- Started one hidden node debug-evaluate full arithmetic24-case command, PID17116; unique
  d0-r2-frozen-chip-arithmetic-20260910-074519 stdout/stderr under automation-logs.
- Startup pi --version descendant observed; initial Batch/profile not yet published, not an
  error or completion. Next wake verifies active progress/completion before any new command.
- No store switch, guidance/selector/model edit, FIFO replay or Memory Build.
- Follow-up: Batch b-20260909-001 uses UTC date;24-case arithmetic r5/frozen profile and
  locked digest verified, first case running. Initial missing local-date filename was only
  a premature path assumption, not a runner failure.

## 2026-09-09 / 2026-09-10 handoff - Six FIFO replacement and180 preparation complete

- User authorized replacing two unavailable targets. S1/S2/S3 unchanged; new T2 dpretet async_fifo
  commit38c22208d3948833f275b917c920e02b1cdadf56 and T3 axis_fifo commit48ff7a7e2ef782cf778d47910cf85835c64b1bce.
  GitHub author repositories, MIT; consumed sources/dependencies and license files bundled.
- Published mutation/fifo-transfer-v2, six manifests, source/TB locks and180 single-site patches.
  Added enable/reset/transfer rules and multi-file support. Reviewed live parameter branches;
  rejected obvious modulo-pointer/flag/data-path duplicate variants without kill/coverage input.
- Golden Icarus+Verilator six passes; mutant Icarus compile180 and Verilator lint180 passes;
  source hashes, patch determinism and goldens immutable. Suite hidden PID13836 completed,
  six stdout completion records, empty stderr. No remaining FIFO process.
- dpretet initial FULL_FLAGS failure came from invalid almost-full assumption copied from
  another IP. Corrected test, not DUT; diagnostic retained excluded. Older100 and pre-review
  candidate sets superseded, not added to denominator. No model/Memory write/kill replay.
- Tests6/6, explicit tool typecheck, focused ESLint, build passed. Windows evidence only;
  Linux/formal equivalence/CDC validation unrun. Report exp_result/09.09-six-fifo-180-prepared.md.
- Final publication audit:180 git apply --check operations and all manifest/source/TB hashes
  passed; diff check, JSON parsing and harness passed. Full repository tests not rerun; scope
  uses focused unit plus actual six-golden/180-frontend integration evidence.
- Used OpenAI Docs skill for in-place automation update, preserved6h/thread/settings; new
  completion override prevents old download retries. Next original frozen condition is
  D0-R2 ChipBench arithmetic; FIFO learning protocol not automatically started.

## 2026-09-09 19:46 +08 - Four local golden baselines now validated

- Versatile v2 completed22213ms,19/24 line,17/18 branch,295/408 toggle. Successful compile/sim
  and raw digest6471e14748e63652c4e47da9b06159120318d0508015fab1bb98a69843cab687 verified;
  22-mutant determinism/source audit passed. No process remains; handoff active_run cleared.
- Together with openHMC completion, all four local golden baselines have Verilator evidence.
  Count remains100 compile-valid candidates, no kill replay. Diff/harness checks passed.
  Next two source/dependency acquisitions and intended-backend mutant compile checks; no Memory.

## 2026-09-09 19:44 +08 - openHMC coverage launched

- Completion update: openHMC compile/sim exit0,161 reads,6/6 line,22/22 branch,317/354 toggle,
  22579ms. Raw hash and30-mutant audit verified. Then launched Versatile v2 hidden PID2936,
  unique versatile-coverage-20260909-1945.*.log files; strictly sequential, no model.

- Session Briefing: no existing repository long process;100 candidates retained.
- Normal hidden launch via the existing tool succeeded without privilege override. PID524,
  Verilator child14212, fifo-coverage.ts target/openhmc-v1; unique logs under fifo-transfer-audit
  openhmc-coverage-20260909-1944.*.log. No other long command started.
- Completion awaits compile/simulation/raw coverage validation. Next is new Versatile coverage;
  original Memory/frozen queue and all mutation selection remain unchanged.

## 2026-09-09 - User resumes continuous local FIFO preparation

- Session Briefing: no repository long process; priority six-FIFO stage remains active.
- Added reusable portable TypeScript candidate generation, isolated compiler evidence, native
  coverage and deterministic audit tools. Four golden fixtures passed Icarus. Published100
  compile-valid candidates: eth18/ufifo30/Versatile22/openHMC30; no mutant simulation or kill.
- Golden Verilator eth FIFO PID17136 and ufifo PID10440 both finished successfully, with native
  line/branch/toggle counts in preparation report. Coverage path/CRLF parser fixed and tested.
- Original Versatile empty-data checker failed Icarus; preserved as excluded v1. New standalone
  transfer-only data checker plus repeated wrap transfers passed as v2; original assets untouched.
- Next hidden openHMC launch request rejected by tool policy before execution. No bypass,
  duplicate launch, model request, guidance edit or Memory update. ogfx download still times out;
  Generic Gray original generic_dpram dependency remains unmaterialized.
- Four unit tests and standalone strict TS check passed. 100 candidate/patch/compiler/source
  audits passed; report exp_result/09.09-six-fifo-preparation-progress.md lists exact evidence,
  exclusions, limits and next steps. Six-IP readiness is not claimed.
- Focused ESLint, repository build, diff check, JSON parsing and harness check also passed.

## 2026-09-09 13:43 +08 - Bounded ogfx acquisition fails transport

- Session Briefing: no repository long process. Source acquisition attempted without model
  calls. PowerShell returned unexpected EOF; curl alternative timed out at 20 seconds with
  zero bytes. No validated source lock or dataset was published; no repeated full experiment.
- WBUART32 tree remains clean and ufifo hash is
  43a9a03d00db96bd6e8a956663b01654a5cf0308456eca8c6f4c95787ef46f9d.
- Next: continue local-member fixture preparation and retry original ogfx acquisition later.
  Frozen queue unchanged; no new mutants or coverage evidence. No user action required.

## 2026-09-09 - Heartbeat locates original ogfx source

- Session Briefing: no repository Generation/Debug/coverage/mutation/compiler process found;
  existing eth_fifo smoke retained, full six-FIFO preparation still pending.
- Read-only source recovery found official WebSVN rev221 ogfx_reg_fifo at the Altera DE0 Nano
  SoC openGFX430 path. Raw ocsvn endpoint returned HTTP200, text/plain, 6894 bytes within the
  bounded request. No source file was rewritten, no model/Memory/experiment command started.
- Next: pin original bytes and supporting includes with provenance, audit its standalone
  contract and implement golden fixture. Discovery alone is not dataset or mutant completion.

## 2026-09-09 - Replace defective S2 with unchanged ethmac/eth_fifo

- Final validation: git diff --check and scripts/harness_check.sh passed; both JSON files
  parsed; all three source hashes matched the lock, and reusable/compiled TB hashes matched.
  Updated existing frozen-memory-v2 automation in place (ACTIVE, every six hours), clearing
  the obsolete replacement-decision wait while preserving serial execution and quiet polling.
- Session Briefing: no active long process; user authorized replacement. Chose standalone
  eth_fifo, Igor Mohor, LGPL-2.1-or-later, not a Generic FIFOs variant. Cloned clean source
  commit dd26899086edf3b797d2775ef9502d204a9a8149 and locked the three consumed source files.
- Independent legal-operation scoreboard passed Icarus and Windows Verilator 5.050: 279
  count/flag checks and 165 reads, fill/drain, repeated wraps, simultaneous read/write,
  reset and clear. Verilator hidden compile PID 19012 completed; simulation exited 0.
- Recorded caller constraint: no read-empty/write-full; occupancy is not protected by those
  flags. Do not misclassify this documented experimental contract as a golden bug.
- Added reusable TB and source lock under tools/mutation/fixtures and replacement report
  exp_result/09.09-eth-fifo-replacement.md. No DUT modification, Memory or mutants generated.
- Updated source membership and resolved the user-decision wait. Preserve old failed source
  as excluded diagnostic. Continue full preparation, including missing ogfx source, before
  resuming remaining frozen-Memory conditions. Full coverage/mutation readiness not claimed.

## 2026-09-09 - FIFO preparation audit exposes an upstream golden defect

- Session Briefing: no experiment process remains. D0-R2 b-20260908-004 validly completed all
  29 r5 timing Cases with locked mem-v0008 and repair 0: 27 compile, 15 pass, 12 mismatch,
  two MAX_ATTEMPTS (Prob021/022), zero Provider error/timeout/invalid. 29 transcripts, 128
  exchanges, 476061 tokens, $1.615443, 3354083 ms. Selector 28 nonempty/1 empty, 39 IDs.
- Entered authorized priority preparation instead of starting the next frozen-Memory condition.
  Cloned four clean source trees into isolated source/target paths; fetched openMSP430 mirror
  without checkout, whose tree lacks the chosen ogfx module. Existing I2C/FIFO assets preserved.
- Found unsliced 5-bit pointers indexing a 16-entry array in upstream synchronous_reset_fifo.
  A bounded Icarus diagnostic against untouched DUT compiled (exit 0), then failed on transfer
  17 (exit 1): expected 0x50, actual xx, with only legal alternating writes/reads.
- No original DUT fix, substitution, model inference, mutation generation, or verification Memory
  was attempted. Report: exp_result/09.09-fifo-transfer-preparation-audit.md. Group readiness is
  blocked on user choice of replacement or corrected fork; do not mask by avoiding wraparound.
- Remaining controls/golden/Verilator/mutation tests are pending, not passed. No Linux or CDC
  signoff claim. Frozen queue resumes at D0-R2 ChipBench arithmetic after priority preparation.
- Handoff JSON parse, scoped diff check and harness check passed. Updated the existing six-hour
  heartbeat to wait quietly for the grouping decision; it must not rerun the defective golden.

## 2026-09-08 - Authorize six-FIFO source/target preparation

- User approved dataset preparation and I2C-standard mutation generation for the proposed
  three source / three target FIFO grouping. Recorded scope and validation plan in current-task.
- Session Briefing: D0-R2 timing b-20260908-004 / PID 6464 remains active; all preparation that
  writes source assets, builds code, or runs Verilator waits for its exit and evidence validation.
- Read I2C manifest/selection/summary and generator policy: seed 42, 30 compile-valid single-site
  patches, operator/module quotas, no coverage/kill-conditioned selection. FIFO quotas must be
  semantic adaptations; do not silently pad shortfalls or label heuristic equivalence proven.
- Read-only remote preflight obtained HEADs for synchronous_reset_fifo, ufifo, generic_fifos
  and author-owned unihd-cag/openhmc. Anonymous GitHub API returned rate-limit 403; git ls-remote
  succeeds. freecores/openhmc does not exist; use the verified author repository instead.
- No new datasets/mutants generated yet. Preserve I2C and existing FIFO baseline bytes, keep
  target evidence out of source Memory, and do not start model refinement during preparation.
- Updated frozen-memory-v2 in place, preserving its active six-hour schedule and current thread.
  It will perform this preparation at the next idle checkpoint after validating b-20260908-004,
  then resume frozen-Memory conditions. JSON parse, scoped diff and harness checks passed.

## 2026-09-08 19:47 +08:00 - D0-R1 complete; D0-R2 started

- Session Briefing: G complete; D0-R1 all three conditions complete; I2C mutation and three
  project baselines retained. Process scan found no repository long job before launch.
- Validated b-20260908-003 against summary, profile, 29 unique functional records, final run
  outcomes, stdout completion, Provider transcripts and selector outputs. Timing: 27 compile,
  12 pass, 15 mismatch, two MAX_ATTEMPTS (Prob021/022), zero timeout/invalid/Provider error.
  Main-Agent: 29 transcripts, 132 exchanges, 543910 tokens, $1.9167396; 4048506 ms from
  05:45:57.702Z to 06:53:26.208Z. Selector: 28 nonempty, one empty, 39 IDs across 29 outputs.
- D0-R1 ChipBench totals 55/89 (off 63/89, VE 59/89). Paired off-to-ChipBench transitions:
  four gains and twelve regressions. Do not claim positive Memory effect from this round.
- Revalidated both stores using the runtime read-only loadSnapshot API, including content
  digests. No Memory switch, update, or Experience creation. A guessed top-level profile path
  was absent; corrected the read to _internal/evidence/evaluation-profile.json, without writes.
- Started exactly one hidden Node command at 19:46:21+08:00: debug-evaluate --dataset chipbench
  --profile chipbench-debug-kimi-v1 --agent pi --split debug-zero-shot-timing
  --functional-repair-iterations 0 --memory-mode frozen --memory-snapshot mem-v0008.
  Batch b-20260908-004, PID 6464; logs automation-logs/d0-r2-frozen-chip-timing-20260908-194621.*.log
  under .rtl-agent. Running profile confirms complete 29-Case r5/repair-zero/locked Memory identity.
- Next checkpoint: monitor without overlap, validate after exit, then start D0-R2 ChipBench
  arithmetic. No fixtures, business logic, guidance, selector, or source datasets changed.
- Handoff validation: session-state JSON parsed, scoped git diff --check passed, and Git Bash
  scripts/harness_check.sh passed. Active stderr subsequently advanced to Case 2/29.

## 2026-09-07 - Seventh non-inference quota checkpoint remains blocked

- Re-read all required records in order. At `2026-09-07T13:39:47+08:00`, found zero related
  experiment processes, zero new Batches, zero new automation logs, and no user or external
  quota-reset/purchased-capacity signal.
- Active ChipBench `mem-v0008` remains unchanged at 13 manifest entries, 13 catalog entries, 13
  item files, and the locked digest.
- Made no Provider inference call and did not start a canary, full arithmetic retry, timing,
  reanalysis, coverage, or mutation command. The queue remains paused.

## 2026-09-07 - Sixth non-inference quota checkpoint remains blocked

- Re-read all required records in order. At `2026-09-07T07:39:22+08:00`, found zero related
  experiment processes, zero new Batches, zero new automation logs, and no user or external
  quota-reset/purchased-capacity signal.
- Active ChipBench `mem-v0008` remains unchanged at 13 manifest entries, 13 catalog entries, 13
  item files, and the locked digest.
- Made no Provider inference call and did not start a canary, full arithmetic retry, timing,
  reanalysis, coverage, or mutation command. The queue remains paused.

## 2026-09-07 - Fifth non-inference quota checkpoint remains blocked

- Re-read all required records in order. At `2026-09-07T01:38:47+08:00`, found zero related
  experiment processes, zero new Batches, zero new automation logs, and no user or external
  quota-reset/purchased-capacity signal.
- Active ChipBench `mem-v0008` remains unchanged at 13 manifest entries, 13 catalog entries, 13
  item files, and the locked digest.
- Made no Provider inference call and did not start a canary, full arithmetic retry, timing,
  reanalysis, coverage, or mutation command. The queue remains paused.

## 2026-09-06 - Fourth non-inference quota checkpoint remains blocked

- Re-read all required records in order. At `2026-09-06T19:38:10+08:00`, found zero related
  experiment processes, zero new Batches, zero new automation logs, and no user or external
  quota-reset/purchased-capacity signal.
- Active ChipBench `mem-v0008` remains unchanged at 13 manifest entries, 13 catalog entries, 13
  item files, and the locked digest.
- Made no Provider inference call and did not start a canary, full arithmetic retry, timing,
  reanalysis, coverage, or mutation command. The queue remains paused.

## 2026-09-06 - Third non-inference quota checkpoint remains blocked

- Re-read all required records in order. At `2026-09-06T13:36:37+08:00`, found zero related
  experiment processes, zero new Batches, zero new automation logs, and no user or external
  quota-reset/purchased-capacity signal.
- Active ChipBench `mem-v0008` remains unchanged at 13 manifest entries, 13 catalog entries, 13
  item files, and the locked digest.
- Made no Provider inference call and did not start a canary, full arithmetic retry, timing,
  reanalysis, coverage, or mutation command. The queue remains paused.

## 2026-09-06 - Second non-inference quota checkpoint remains blocked

- Re-read all required records in order. At `2026-09-06T07:36:57+08:00`, found zero related
  experiment processes, zero new Batches, zero new automation logs, and no user or external
  quota-reset/purchased-capacity signal since the preceding checkpoint.
- Revalidated active ChipBench `mem-v0008` at 13 manifest entries, 13 catalog entries, 13 item
  files, and the locked digest. No Memory content or store mapping changed.
- The first read-only check used bare `false` instead of PowerShell `$false` while assembling its
  output object. It failed before emitting results and made no runtime change; the corrected command
  produced the evidence above. Recorded the diagnostic error in `docs/error-journal.md`.
- Kept the queue paused and made no Kimi inference call. No canary, full arithmetic retry, timing,
  reanalysis, or mutation command was started.

## 2026-09-06 - Non-inference quota checkpoint remains blocked

- Re-read all required handoff and verification records in order and confirmed the queue remains
  paused after failed recovery canary `b-20260905-001`.
- At `2026-09-06T01:36:32+08:00`, found zero related Generation, Debug, coverage, mutation,
  Node/Corepack/pnpm, or Verilator processes. Since the preceding checkpoint, there are zero new
  Batches, zero new automation logs, and no repository quota-reset, purchased-capacity, or recovery
  marker.
- The latest real Provider evidence remains the canary's zero-token Kimi weekly-quota HTTP 403.
  Per the recorded guard, made no inference call and did not start another canary, full arithmetic
  retry, timing, reanalysis, or mutation command. The next checkpoint remains non-inference unless
  independent recovery evidence appears.

## 2026-09-05 - Recovery canary confirms Kimi quota remains exhausted

- Re-read all required handoff and verification records in order, then confirmed there was no
  related Generation, Debug, coverage, mutation, Node/Corepack/pnpm, or Verilator process.
- Revalidated active ChipBench `mem-v0008` at 13 manifest entries, 13 catalog entries, 13 item
  files, and the locked digest. Started exactly one excluded recovery canary for the first target
  censored in the prior Batch: arithmetic
  `Prob019_implement_full_subtractor_using_three_to_eight_decoder`, repair zero, frozen
  `mem-v0008`.
- Canary Batch `b-20260905-001` completed in 00:00:11.625 with the correct one-Case r5 profile,
  locked arithmetic baseline, and locked Memory digest, but its only main-Agent exchange returned
  the same zero-token Kimi weekly-quota HTTP 403. The downstream result is `NO_RTL_CHANGE`, compile
  0, pass 0, and functional not-run 1.
- Marked the canary permanently excluded and retained the quota block. No full arithmetic retry,
  timing, reanalysis, or mutation command was started. Later checkpoints must remain non-inference
  until a credible quota-reset or purchased-capacity signal exists.

## 2026-09-05 - Exclude quota-censored frozen-ChipBench arithmetic and pause

- Found no remaining process for D0-R1 frozen ChipBench arithmetic Batch `b-20260904-004` and
  inspected its summary, r5 profile, Batch result, all 24 valid Case records, functional evidence,
  main-Agent transcripts, Selector directories, mismatch-analysis artifacts, and launch logs.
- The profile itself is correctly bound to all 24 arithmetic Cases, repair zero, locked
  `mem-v0008`, its locked digest, and baseline manifest
  `sha256:eb5d564b58a1300dc53833ab431ffd459fa8c8cc6af3a76194c7d80c92551704`.
- The result is nevertheless invalid for the experiment: Cases 13-24 each contain a zero-token Kimi
  weekly-quota HTTP 403 and were recorded downstream as `NO_RTL_CHANGE` / not-run. A thirteenth
  identical 403 hit mismatch schema repair, causing the `MISMATCH_ANALYSIS_FAILED` warning and
  leaving placeholder analysis values.
- The excluded partial summary is compile 12, pass 7, mismatch 5, not-run 12, zero
  verification-invalid, 63 exchanges, 159,939 tokens, $0.489189, and 00:14:59.420. It cannot be
  spliced with a later run or counted as the complete condition.
- Did not run the suggested `reanalyze` command because it would make another model call without
  repairing the censored 12 main-Agent Cases. Did not start timing, mutation work, a canary, or a
  full retry. The queue is paused until a later six-hour check runs one excluded real arithmetic
  target-Case canary and obtains credible non-quota recovery evidence.

## 2026-09-05 - Complete frozen-ChipBench state-machine and start arithmetic

- Found no related process and validated D0-R1 frozen ChipBench state-machine Batch
  `b-20260904-003` using its summary, profile, Batch result, all 6 valid Case/run records,
  functional results, Provider transcripts, and Selector outputs. It matches r5 state-machine,
  repair zero, locked `mem-v0008`, and the locked baseline digest.
- The Batch compiled 6/6 and passed 4/6; the remaining two Cases are functional mismatches, with
  zero not-run, timeout, Provider, quota, or verification-invalid failures. Its 6 transcripts
  contain 30 exchanges, 127,786 tokens, and $0.3329724 cost over 00:07:56.961.
- Selector evidence is complete and non-empty for all 6 Cases, with 12 IDs: `memory-000001` 5,
  `memory-000002` 5, and `memory-000006` 2.
- Revalidated active ChipBench `mem-v0008` at 13 items and its locked digest, found no related
  process, and started D0-R1 frozen ChipBench arithmetic as hidden PID `9584`, Batch
  `b-20260904-004`, at `2026-09-05T07:32:38+08:00`.
- The running profile contains all 24 r5 arithmetic Cases, repair zero, locked `mem-v0008`, and
  baseline manifest `sha256:eb5d564b58a1300dc53833ab431ffd459fa8c8cc6af3a76194c7d80c92551704`.
  Logs are `.rtl-agent/automation-logs/d0-r1-frozen-chip-arithmetic-20260905-073237.stdout.log` and
  matching stderr. At `2026-09-05T07:33:44+08:00`, the Selector was active for Case 1/24. No other
  experiment or mutation command was started.

## 2026-09-05 - Complete frozen-ChipBench assignment and start state-machine

- Found no related process and validated D0-R1 frozen ChipBench assignment Batch `b-20260904-002`
  using its summary, profile, Batch result, all 30 valid Case/run records, functional results,
  Provider transcripts, and Selector outputs. It matches r5 assignment, repair zero, locked
  `mem-v0008`, and the locked assignment baseline digest.
- Batch `b-20260904-002` compiled 30/30 and passed 20/30; the other 10 Cases are functional
  mismatches, with zero not-run, timeout, Provider, quota, or verification-invalid failures. Its 30
  transcripts contain 133 exchanges, 483,233 tokens, and $1.5410166 cost over 00:42:57.991.
- Selector evidence is complete: 30 outputs, 29 non-empty, one empty, 46 selected IDs, and no
  missing output. `memory-000001` was selected 17 times; eight other items account for the remaining
  29 references.
- Revalidated active ChipBench `mem-v0008` at 13 items and the locked digest, found no related
  experiment process, and started D0-R1 frozen ChipBench state-machine as hidden PID `9220`, Batch
  `b-20260904-003`, at `2026-09-05T01:31:19+08:00`.
- The running profile contains all 6 r5 state-machine Cases, repair zero, locked `mem-v0008`, and
  baseline manifest `sha256:3e5a6ace82af63693b94899f1a50bcf66e1157f48efd19cf2b48118fea4c580e`.
  Logs are `.rtl-agent/automation-logs/d0-r1-frozen-chip-state-machine-20260905-013118.stdout.log`
  and matching stderr. At `2026-09-05T01:31:35+08:00`, the Selector was active for Case 1/6. No
  other experiment or mutation command was started.

## 2026-09-04 - Complete frozen-VE condition and start frozen-ChipBench assignment

- Found no related process and validated replacement timing Batch `b-20260904-001` using its
  summary, profile, Batch result, all 29 valid Case/run records, functional results, Provider
  transcripts, and Selector outputs. It matches r5 timing, repair zero, locked `mem-v0003`, and the
  locked timing baseline digest.
- The replacement compiled 27, passed 14, mismatched 13, and had two valid `MAX_ATTEMPTS` not-runs,
  with zero timeout, Provider, quota, or verification-invalid failures. Its 29 transcripts contain
  130 exchanges, 510,373 tokens, and $1.6660446 cost over 00:57:50.789. All 29 Selector outputs are
  non-empty and contain 62 selected IDs.
- Aggregated D0-R1 frozen VerilogEval across four valid Batches at 59/89 pass, 87 compile successes,
  28 mismatches, two not-runs, and zero timeout. Against D0-R1 off, the paired transitions are 4
  failure-to-pass, 8 pass-to-failure, 55 pass-to-pass, and 22 failure-to-failure. The frozen VE
  condition therefore loses four passes while adding 289,697 Agent tokens and $0.4352118 cost.
- Revalidated both locked manifests and reversibly moved active VerilogEval `.rtl-agent/memory` to
  `.rtl-agent/memory-ve`, then moved ChipBench `.rtl-agent/memory-chip` to the active path. After
  the switch, active `mem-v0008` remains 13 items with its locked digest and archived `mem-v0003`
  remains 9 items with its locked digest. No content was overwritten or deleted.
- The first launch guard after switching safely refused to start because its broad command-line
  pattern matched the inspecting PowerShell process itself. No experiment process or Batch was
  created. A corrected check limited candidates to actual `node`, `cmd`, `corepack`, and `pnpm`
  processes and confirmed a zero conflict count.
- Started D0-R1 frozen ChipBench assignment as hidden PID `6820`, Batch `b-20260904-002`, using all
  30 r5 assignment Cases, repair zero, and locked `mem-v0008`. Its running profile and assignment
  baseline digest are correct. Logs are
  `.rtl-agent/automation-logs/d0-r1-frozen-chip-assignment-20260904-193203.stdout.log` and matching
  stderr; at `2026-09-04T19:33:20+08:00` it was processing Case 1/30. No mutation work started.

## 2026-09-04 - Complete D0-R1 frozen VE arithmetic and start timing

- Re-read all required records in order and found no related experiment process. D0-R1 frozen
  VerilogEval arithmetic Batch `b-20260903-003` had sealed with summary, profile, Batch result, all
  24 final results, all 24 functional Case records, and all 24 Selector outputs.
- Validated all 24 unique r5 arithmetic Cases, seeded functional Debug, repair zero, frozen
  `mem-v0003`, locked digest
  `sha256:eacafc24a17c87646e55add966c375e7b1c2fca7fd69a5bda2467da1b8252319`, and arithmetic baseline
  manifest `sha256:eb5d564b58a1300dc53833ab431ffd459fa8c8cc6af3a76194c7d80c92551704`.
- Batch `b-20260903-003` compiled 24/24 and passed 18/24; the other 6 Cases are functional
  mismatches. It has zero not-run, timeout, Provider, quota, or verification-invalid failures,
  completed post-processing, disabled publication, and ran for 00:32:27.452.
- Its 24 main-Agent transcripts contain 106 exchanges, 370,231 tokens, and $1.1547450 recorded
  cost. Selector evidence contains 24 outputs: 20 non-empty, 4 empty, 41 selected IDs, and no
  failed/missing output.
- Revalidated active `mem-v0003` through the repository Memory loader at 9 catalog entries, 9 item
  files, and the locked digest. No Memory content changed.
- Started D0-R1 frozen VerilogEval timing as hidden PID `19452`, Batch `b-20260903-004`, at
  `2026-09-04T07:26:13+08:00`. Its profile validates all 29 unique r5 timing Cases, repair zero,
  frozen `mem-v0003`, locked digest, and timing baseline manifest
  `sha256:1f4303f62a02cf87d1005fdf9575c0c108a314068da70a7aef2836e09943555b`.
  Logs are `.rtl-agent/automation-logs/d0-r1-frozen-ve-timing-20260904-072613.stdout.log` and
  matching stderr. At `2026-09-04T07:27:50+08:00`, the process tree remained healthy on Case 2/29
  with one final result sealed; no second command was started.

## 2026-09-04 - Complete D0-R1 frozen VE state-machine and start arithmetic

- Re-read all required project records in order and found no related experiment process. D0-R1
  frozen VerilogEval state-machine Batch `b-20260903-002` had sealed with summary, profile, Batch
  result, all 6 final results, and all 6 functional Case records.
- Validated all 6 unique r5 state-machine Cases, seeded functional Debug, repair zero, frozen
  `mem-v0003`, locked snapshot digest
  `sha256:eacafc24a17c87646e55add966c375e7b1c2fca7fd69a5bda2467da1b8252319`, and state-machine
  baseline manifest `sha256:3e5a6ace82af63693b94899f1a50bcf66e1157f48efd19cf2b48118fea4c580e`.
- Batch `b-20260903-002` compiled 6/6 and passed 4/6; the other 2 Cases are functional mismatches.
  It has zero not-run, timeout, Provider, quota, or verification-invalid failures, completed
  post-processing, disabled publication, and ran for 00:12:02.601.
- Its 6 main-Agent transcripts contain 28 exchanges, 126,334 tokens, and $0.4160844 recorded cost.
  Selector evidence contains 6/6 completed non-empty outputs and 16 IDs: `memory-000004` 6,
  `memory-000002` 5, `memory-000008` 4, and `memory-000007` 1.
- Revalidated the active VerilogEval store through `FilesystemMemoryStore.loadSnapshot`: snapshot
  `mem-v0003`, 9 catalog entries, 9 item files, and the locked digest. No Memory content changed.
- Started D0-R1 frozen VerilogEval arithmetic as hidden PID `9344`, Batch `b-20260903-003`, at
  `2026-09-04T01:27:00+08:00`. Its profile validates all 24 r5 arithmetic Cases, repair zero,
  frozen `mem-v0003`, locked digest, and arithmetic baseline manifest
  `sha256:eb5d564b58a1300dc53833ab431ffd459fa8c8cc6af3a76194c7d80c92551704`.
  Logs are `.rtl-agent/automation-logs/d0-r1-frozen-ve-arithmetic-20260904-012700.stdout.log` and
  matching stderr. At `2026-09-04T01:29:36+08:00`, the process tree remained healthy on Case 2/24
  with one final result sealed; no second command was started.

## 2026-09-03 - Queue deterministic mutation replay after frozen Memory campaign

- Confirmed the repository already contains frozen `i2c-mutants-v1` inputs: seed 42, 30 patch
  files, manifest, selection record, and summary. No end-to-end `mutation:run` command or published
  mutation-score evidence exists yet.
- Updated heartbeat automation `frozen-memory-v2` without changing its six-hour schedule. The
  automation must finish every frozen-Memory condition and its Case-paired report before beginning
  any mutation work.
- Recorded the sequencing and evidence boundary as a stable decision in `docs/decisions.md`.
- Added a final strictly serial phase: implement and validate a deterministic TypeScript/Node
  `mutation:run` runner, then replay the same 30 frozen mutants against the 78.16% baseline,
  `run_20260804-154957-029` at 93.99%, and `run_20260805-091253-770` at 100%.
- The mutation generator must not be rerun. The runner may not call a model, change the golden DUT,
  mutate the retained verification assets, or count apply/compile/infrastructure failures as
  killed mutants. Each suite must first pass the golden DUT.
- Required reporting includes raw and adjusted mutation score, per-mutant transitions, survivor
  review status, operator/module breakdown, timeout/not-run, runtime, and the relationship between
  structural coverage and fault detection. The conclusion is limited to the same I2C DUT.
- The phase is intentionally deferred: implementing it now would change control-plane/build output
  while the frozen-Memory campaign is still active, and executing it concurrently would compete for
  local build/Verilator resources. No experiment process was started or disturbed during this task
  update.

## 2026-09-03 - Complete D0-R1 frozen VE assignment and start state-machine

- Re-read all required project records in order and found no related experiment process. D0-R1
  frozen VerilogEval assignment Batch `b-20260903-001` had sealed with summary, profile, Batch
  result, all 30 final results, and 30 valid Case-validation records.
- Validated all 30 unique r5 assignment Cases, seeded functional Debug, repair zero, frozen
  `mem-v0003`, locked snapshot digest
  `sha256:eacafc24a17c87646e55add966c375e7b1c2fca7fd69a5bda2467da1b8252319`, and assignment baseline
  manifest `sha256:53155540d4d3286c45d9f0e4eeaa0e08455b3536cc71730e9a7e6c817ea1e3bf`.
- Batch `b-20260903-001` compiled 30/30 and passed 23/30; the other 7 Cases are functional
  mismatches. It has zero not-run, timeout, or verification-invalid failures and ran for
  00:58:40.338. Its 30 main-Agent transcripts contain 133 exchanges, 469,878 tokens, and
  $1.5121524 recorded cost.
- Diagnosed one zero-token `Connection error` on the first main-Agent exchange for
  `Prob033_traffic_lights`. The same bounded Case retried automatically, subsequently completed,
  and produced `COMPILE_PASSED`; this is a recovered transient Provider error, not a censored Case
  or reason to rerun the Batch.
- Selector evidence is complete: 30 attempts, 30 outputs, 29 non-empty, 1 empty, and 58 selected
  IDs. Counts are `memory-000002` 21, `memory-000007` 16, `memory-000001` 9,
  `memory-000004` 7, `memory-000008` 4, and `memory-000003` 1.
- Started D0-R1 frozen VerilogEval state-machine as hidden PID `6944`, Batch `b-20260903-002`, at
  `2026-09-03T19:27:03+08:00`. Its running profile validates all 6 r5 state-machine Cases, repair
  zero, frozen `mem-v0003` with the locked digest, and baseline manifest
  `sha256:3e5a6ace82af63693b94899f1a50bcf66e1157f48efd19cf2b48118fea4c580e`.
  Logs are `.rtl-agent/automation-logs/d0-r1-frozen-ve-state-machine-20260903-192703.stdout.log` and
  matching stderr. At `2026-09-03T19:29:26+08:00`, the original process tree remained healthy
  while processing Case 2/6, with one final result sealed. No second command was started.
- Parsed `session-state.json`, passed scoped `git diff --check`, and passed
  `scripts/harness_check.sh` through Git Bash after updating the three handoff files.

## 2026-09-03 - Complete D0-R1 off, switch to VerilogEval Memory, and start frozen assignment

- Re-read all required project records in order and found no related experiment process. D0-R1
  Memory-off timing Batch `b-20260902-004` had sealed with summary, profile, Batch result, all 29
  final results, and 29 valid Case-validation records.
- Validated the timing identity: ChipBench dataset `c74fe7d28-r5`, split
  `debug-zero-shot-timing`, all 29 unique Cases, seeded functional Debug, repair zero, Memory off,
  and baseline manifest
  `sha256:1f4303f62a02cf87d1005fdf9575c0c108a314068da70a7aef2836e09943555b`.
- Batch `b-20260902-004` compiled 27, passed 14, mismatched 13, and did not run 2; both not-runs
  are `MAX_ATTEMPTS`. It has zero timeout, Provider, or verification-invalid failures and ran for
  00:34:50.635. Its 29 Provider transcripts contain 128 exchanges, 447,572 tokens, and $1.9584408
  recorded cost, with no Provider error.
- The complete valid D0-R1 Memory-off condition totals 63/89 passes, 87/89 compile successes, 24
  mismatches, and 2 not-runs, with zero timeout. Across four Batches it contains 397 Provider
  exchanges, 1,187,119 tokens, $4.3138146 cost, and 01:33:10.157 summed Batch duration.
- With no experiment process active, validated ChipBench `mem-v0008` in `.rtl-agent/memory` at 13
  manifest entries, catalog entries, and item files with locked digest
  `sha256:5229d4f09d557d77633280d70e9b40136db90dfa434ed98fd9763377ad886320`.
  Validated VerilogEval `mem-v0003` in `.rtl-agent/memory-ve` at 9 entries/files with locked digest
  `sha256:eacafc24a17c87646e55add966c375e7b1c2fca7fd69a5bda2467da1b8252319`.
- Switched stores reversibly at `2026-09-03T13:25:23+08:00`: renamed the active ChipBench store to
  `.rtl-agent/memory-chip`, then renamed `.rtl-agent/memory-ve` to `.rtl-agent/memory`. Post-switch
  validation reproduced both counts and digests. No directory was overwritten or deleted and no
  Memory content was changed.
- Started D0-R1 frozen VerilogEval assignment as hidden PID `6496`, Batch `b-20260903-001`, at
  `2026-09-03T13:25:44+08:00`. Its running profile validates all 30 r5 assignment Cases, repair
  zero, frozen `mem-v0003`, locked snapshot digest, and baseline manifest
  `sha256:53155540d4d3286c45d9f0e4eeaa0e08455b3536cc71730e9a7e6c817ea1e3bf`.
  Logs are `.rtl-agent/automation-logs/d0-r1-frozen-ve-assignment-20260903-132544.stdout.log` and
  matching stderr. At `2026-09-03T13:28:20+08:00`, the original process tree remained healthy
  while processing Case 2/30, with one final result sealed. No second command was started.
- Parsed `session-state.json`, passed scoped `git diff --check`, and passed
  `scripts/harness_check.sh` through Git Bash after updating the three handoff files.

## 2026-09-03 - Complete D0-R1 off arithmetic and start timing

- Re-read all required project records in order and found no related experiment process. D0-R1
  Memory-off arithmetic Batch `b-20260902-003` had sealed with summary, profile, Batch result, all
  24 final results, and 24 valid Case-validation records.
- Validated the complete arithmetic identity: ChipBench dataset `c74fe7d28-r5`, split
  `debug-zero-shot-arithmetic`, all 24 unique Cases, seeded functional Debug, repair zero, Memory
  off, and baseline manifest
  `sha256:eb5d564b58a1300dc53833ab431ffd459fa8c8cc6af3a76194c7d80c92551704`.
- Batch `b-20260902-003` compiled 24/24 and passed 20/24; the remaining 4 Cases are functional
  mismatches. It has zero not-run, timeout, Provider, or verification-invalid failures, completed
  post-processing, disabled publication, and ran for 00:19:56.440.
- Parsed 24 Provider transcripts containing 106 exchanges, 262,339 tokens, and $0.7700514 recorded
  cost, with no Provider error.
- Started D0-R1 Memory-off timing as hidden PID `10756`, Batch `b-20260902-004`, at
  `2026-09-03T07:24:16+08:00`. Its running profile validates all 29 r5 timing Cases, repair zero,
  Memory off, and baseline manifest
  `sha256:1f4303f62a02cf87d1005fdf9575c0c108a314068da70a7aef2836e09943555b`.
  Logs are `.rtl-agent/automation-logs/d0-r1-off-timing-20260903-072416.stdout.log` and matching
  stderr. At `2026-09-03T07:25:58+08:00`, the original process tree remained healthy while
  processing Case 2/29, with one final result sealed; no second command was started.
- Parsed `session-state.json`, passed scoped `git diff --check`, and passed
  `scripts/harness_check.sh` through Git Bash after updating the three handoff files.

## 2026-09-03 - Complete D0-R1 off state-machine and start arithmetic

- Re-read all required project records in order and found no related experiment process. D0-R1
  Memory-off state-machine Batch `b-20260902-002` had sealed with summary, profile, Batch result,
  all 6 final results, and 6 valid Case-validation records.
- Validated the complete state-machine identity: ChipBench dataset `c74fe7d28-r5`, split
  `debug-zero-shot-state-machine`, all 6 unique Cases, seeded functional Debug, repair zero, Memory
  off, and baseline manifest
  `sha256:3e5a6ace82af63693b94899f1a50bcf66e1157f48efd19cf2b48118fea4c580e`.
- Batch `b-20260902-002` compiled 6/6 and passed 5/6; the remaining Case is a functional mismatch.
  It has zero not-run, timeout, Provider, quota, or verification-invalid failures, completed
  post-processing, disabled publication, and ran for 00:10:19.951.
- Parsed 6 Provider transcripts containing 31 exchanges, 127,468 tokens, and $0.4332840 recorded
  cost, with no Provider or quota error.
- Started D0-R1 Memory-off arithmetic as hidden PID `17344`, Batch `b-20260902-003`, at
  `2026-09-03T01:23:23+08:00`. Its running profile validates all 24 r5 arithmetic Cases, repair
  zero, Memory off, and baseline manifest
  `sha256:eb5d564b58a1300dc53833ab431ffd459fa8c8cc6af3a76194c7d80c92551704`.
  Logs are `.rtl-agent/automation-logs/d0-r1-off-arithmetic-20260903-012323.stdout.log` and matching
  stderr. At `2026-09-03T01:25:10+08:00`, the original process tree remained healthy while
  processing Case 2/24, with one final result sealed; no second command was started.
- Parsed `session-state.json`, passed scoped `git diff --check`, and passed
  `scripts/harness_check.sh` through Git Bash after updating the three handoff files.

## 2026-09-02 - Complete D0-R1 off assignment and start state-machine

- Re-read all required project records in order and found no related experiment process. D0-R1
  Memory-off assignment Batch `b-20260902-001` had sealed with summary, profile, Batch result, all
  30 final results, and 30 valid Case-validation records.
- Validated the complete assignment identity: ChipBench dataset `c74fe7d28-r5`, split
  `debug-zero-shot-assignment`, all 30 unique Cases, seeded functional Debug, repair zero, Memory
  off, and baseline manifest
  `sha256:53155540d4d3286c45d9f0e4eeaa0e08455b3536cc71730e9a7e6c817ea1e3bf`.
- Batch `b-20260902-001` compiled 30/30 and passed 24/30; the other 6 are functional mismatches.
  It has zero not-run, timeout, Provider, quota, or verification-invalid failures, completed
  post-processing, disabled publication, and ran for 00:28:03.131.
- Parsed 30 Provider transcripts containing 132 exchanges, 349,740 tokens, and $1.1520384 recorded
  cost, with no Provider error.
- Started D0-R1 Memory-off state-machine as hidden PID `19000`, Batch `b-20260902-002`, at
  `2026-09-02T19:22:52+08:00`. Its running profile validates all 6 r5 state-machine Cases, repair
  zero, Memory off, and baseline manifest
  `sha256:3e5a6ace82af63693b94899f1a50bcf66e1157f48efd19cf2b48118fea4c580e`.
  Logs are `.rtl-agent/automation-logs/d0-r1-off-state-machine-20260902-192252.stdout.log` and
  matching stderr. At `2026-09-02T19:26:01+08:00`, the original process tree remained healthy
  while processing Case 2/6, with one final result sealed; no second command was started.
- Parsed `session-state.json`, passed scoped `git diff --check`, and passed
  `scripts/harness_check.sh` through Git Bash after updating the three handoff files.

## 2026-09-02 - Complete G-R2 off, close Generation rounds, and start D0-R1 off

- Re-read all required records in order and found no related experiment process. G-R2 Memory-off
  Batch `b-20260901-002` had sealed with summary, profile, batch result, 156 final results, and 156
  functional Case records.
- Validated the complete G-R2 off identity: all 156 unique VerilogEval spec-to-RTL Cases, repair
  zero, Memory off, 156 valid Case validations, completed post-processing, and disabled publication.
- Batch `b-20260901-002` compiled 139, passed 124, mismatched 15, and did not run 17; every not-run
  is `MAX_ATTEMPTS`. It has zero timeout, Provider, quota, or verification-invalid failures and ran
  for 01:03:45.301.
- Parsed 156 Agent transcripts containing 608 exchanges, 903,652 tokens, and $2.7569352 recorded
  cost, with no Provider error.
- The G-R2 off-to-frozen Case matrix is 8 failure-to-pass, 11 pass-to-failure, 113 pass-to-pass,
  and 24 failure-to-failure. Frozen reduced pass by 3 and compile by 4, increased not-run by 4,
  and added 113,994 Agent tokens and $0.3384348 cost.
- Generation does not meet the preregistered positive-effect rule: G-R1 frozen changed pass by +1,
  but G-R2 changed it by -3; G-R2 has more pass-to-failure than failure-to-pass, and not-runs rose
  in both rounds. This is an interim Generation conclusion; Debug remains separate.
- Started D0-R1 condition Memory off, assignment split, as hidden PID `3608` and Batch
  `b-20260902-001` at `2026-09-02T13:21:46+08:00`. The profile validates 30 assignment Cases,
  ChipBench dataset `c74fe7d28-r5`, repair zero, Memory off, and baseline manifest
  `sha256:53155540d4d3286c45d9f0e4eeaa0e08455b3536cc71730e9a7e6c817ea1e3bf`.
  Logs are `.rtl-agent/automation-logs/d0-r1-off-assignment-20260902-132146.stdout.log` and
  matching stderr. No second split or condition was started.

## 2026-09-02 - Complete G-R2 frozen replacement and start G-R2 Memory off

- Re-read the required project records in order and found no related experiment process. Active
  Batch `b-20260901-001` had sealed successfully with summary, profile, batch result, all 156 final
  results, and all 156 functional Case records.
- Validated the complete G-R2 frozen identity: VerilogEval spec-to-RTL `Prob001..Prob156`, 156
  unique Cases, repair zero, frozen `mem-v0008`, locked digest
  `sha256:5229d4f09d557d77633280d70e9b40136db90dfa434ed98fd9763377ad886320`,
  156 valid Case validations, completed post-processing, disabled publication, and no Experience
  store entry.
- Batch `b-20260901-001` compiled 135, passed 121 functional simulations, mismatched 14, and did
  not run 21; all not-runs are `MAX_ATTEMPTS`. It has zero timeout, policy, quota, Provider, or
  verification-invalid failures. Duration was 05:59:58.633.
- Parsed 156 main-Agent transcripts containing 577 exchanges, 1,017,646 tokens, and $3.09537
  recorded cost. No exchange contains a Provider error or quota marker.
- Selector evidence has 156 attempt directories but only 155 completed outputs: 72 non-empty and
  83 explicit empty selections, with 79 selected IDs (`memory-000012` 40, `memory-000010` 32,
  `memory-000007` 6, `memory-000005` 1). `Prob046_dff8p` has the selector inputs but no read audit,
  `selection.json`, or metadata, so the best-effort selector caught an unpersisted subprocess
  failure and injected no Memory. The Batch remains valid functional evidence; the report must
  disclose this one Selector failure separately from explicit empty selection.
- Started complete G-R2 Memory-off condition as hidden PID `17452`, Batch `b-20260901-002`, at
  `2026-09-02T07:23:34+08:00`. The running profile validates all 156 ordered Cases, repair zero,
  and Memory off. Logs are `.rtl-agent/automation-logs/g-r2-off-20260902-072334.stdout.log` and
  matching stderr. No other queue command was started.

## 2026-09-02 - Monitor G-R2 frozen replacement at Case 155/156

- Re-read the required task, state, log, verification, decision, and error records in order.
- The first read-only process predicate incorrectly returned zero rows because it required every
  command line to contain the absolute repository path; the root Corepack command relies on its
  working directory and the evaluator uses a relative `apps/rtl-core-loop/dist/index.js` path.
- A corrected token-based inventory immediately confirmed the original process tree remains alive:
  hidden PID `9004`, Corepack PID `1580`, evaluator PID `19112`, and the active Kimi Agent child.
  No process was started, stopped, or otherwise disturbed.
- Active Batch `b-20260901-001` has 154 final results and 154 functional Case records. Case 154
  sealed at `2026-09-02T01:16:08+08:00`; Case 155 selection completed and its Agent child was still
  writing the bounded RTL attempt at the `2026-09-02T01:19:35+08:00` checkpoint.
- No Batch summary or batch-result exists yet, so the condition remains in progress and no next
  queue command was started.

## 2026-09-01 - Quarantine invalid records, restore Provider access, and restart G-R2 frozen

- Re-read the required project records and confirmed that valid G-R1 Batches `b-20260827-002`
  and `b-20260827-003` remain complete evidence. No experiment process was active before cleanup.
- Moved excluded network Batch `b-20260825-001`, quota-censored Batch `b-20260828-001`, and only
  their matching launch logs out of the active stores into the recoverable quarantine
  `.rtl-agent/quarantine/frozen-memory-reset-20260901`. Nothing was deleted; valid G-R1 artifacts
  and logs were left in place.
- The old `frozen-memory` heartbeat had no remaining automation record. Created active heartbeat
  `Frozen Memory 迁移实验 v2` on a six-hour interval, attached to this session, with the queue
  resuming at G-R2 frozen and preserving completed G-R1 evidence.
- Revalidated active ChipBench `mem-v0008` at 13 manifest entries and item files with digest
  `sha256:5229d4f09d557d77633280d70e9b40136db90dfa434ed98fd9763377ad886320`;
  revalidated archived VerilogEval `mem-v0003` at nine entries/files with digest
  `sha256:eacafc24a17c87646e55add966c375e7b1c2fca7fd69a5bda2467da1b8252319`.
- Ran one real frozen `Prob001`, repair-zero recovery canary. Diagnostic Batch `b-20260901-001`
  completed 1/1 compile and functional pass with the locked digest and no Provider error, proving
  that the former Kimi weekly-quota block is no longer active. Moved this diagnostic Batch and its
  logs to the quarantine `diagnostics` directory and excluded it from experiment evidence.
- The first cleanup attempt correctly made no changes after its broad process predicate matched
  the cleanup PowerShell command itself. Narrowed the predicate to actual node/cmd/corepack/pnpm
  experiment processes, confirmed none existed, and then completed the move safely.
- Started the complete replacement G-R2 frozen condition at `2026-09-01T19:23:03+08:00`: hidden
  PID `9004`, active Batch `b-20260901-001`, all `Prob001..Prob156`, repair zero, frozen
  `mem-v0008`. Read-only profile validation confirmed 156 ordered Cases and the locked digest.
  Logs are `.rtl-agent/automation-logs/g-r2-frozen-mem-v0008-restart-20260901-192303.stdout.log`
  and matching stderr. The reused Batch ID is disambiguated by path: the one-Case canary is under
  quarantine; the running 156-Case experiment is under `.rtl-agent/batches`.
- Handoff validation passed: session-state JSON parsing and scoped `git diff --check` succeeded.
  The first `bash scripts/harness_check.sh` invocation failed because bare `bash` is absent from the
  PowerShell PATH; rerunning the same script with `C:\Program Files\Git\bin\bash.exe` passed.

## 2026-08-30 - Eighth non-inference quota check remains blocked

- Re-read all required records and made no Provider-backed call.
- At `2026-08-30T19:28:29+08:00`, found zero related processes, new Batches, or new logs; no reset
  timestamp or recovery marker is available.
- Kept the queue paused before the complete G-R2 frozen replacement and did not start G-R2 off.


## 2026-08-30 - Seventh non-inference quota check remains blocked

- Re-read all required records and made no Provider-backed call.
- At `2026-08-30T13:26:53+08:00`, found zero related processes, new Batches, or new logs; no reset
  timestamp or recovery marker is available.
- Kept the queue paused before the complete G-R2 frozen replacement and did not start G-R2 off.


## 2026-08-30 - Sixth non-inference quota check remains blocked

- Re-read all required records and made no Provider-backed call.
- At `2026-08-30T07:26:47+08:00`, found zero related processes, new Batches, or new logs; no reset
  timestamp or recovery marker is available.
- Kept the queue paused before the complete G-R2 frozen replacement and did not start G-R2 off.


## 2026-08-30 - Fifth non-inference quota check remains blocked

- Re-read all required records and made no Provider-backed call.
- At `2026-08-30T01:24:40+08:00`, found zero related processes, new Batches, or new logs; no reset
  timestamp or recovery marker is available.
- Kept the queue paused before the complete G-R2 frozen replacement and did not start G-R2 off.


## 2026-08-29 - Fourth non-inference quota check remains blocked

- Re-read all required records and made no Provider-backed call.
- At `2026-08-29T19:23:08+08:00`, found zero related processes, new Batches, or new logs; the
  retained zero-token 403 still exposes no reset timestamp or recovery marker.
- Kept the queue paused before the complete G-R2 frozen replacement and did not start G-R2 off.


## 2026-08-29 - Third non-inference quota check remains blocked

- Re-read all required records and made no Provider, Selector, Agent, canary, or probe call.
- At `2026-08-29T13:21:31+08:00`, found zero related processes, new Batches, or new logs since the
  prior checkpoint. The retained 403 still has no reset timestamp or recovery marker.
- Kept the queue paused before the full G-R2 frozen replacement and did not start G-R2 off.


## 2026-08-29 - Second non-inference quota check remains blocked

- Re-read all required project records and made no Provider, Selector, Agent, canary, or probe call.
- At `2026-08-29T07:19:52+08:00`, found no related experiment process, no Batch created since the
  prior checkpoint, and no new automation log.
- The retained Kimi weekly-limit 403 still contains no reset timestamp or recovery marker. With no
  credible recovery evidence, kept the queue paused before the full G-R2 frozen replacement and
  did not start G-R2 off.


## 2026-08-29 - Keep queue paused after non-inference quota check

- Re-read the required handoff, verification, decision, and error records. G-R1 remains valid and
  complete; excluded G-R2 frozen Batch `b-20260828-001` remains the newest Batch.
- Per the quota rule, made no Provider, Selector, Agent, canary, or probe call. Read-only inventory
  found no related experiment process, no new Batch, and no automation log newer than the excluded
  G-R2 run.
- Rechecked the persisted Kimi response. It says the weekly seven-day usage limit was reached and
  will reset when the current window ends, but contains no reset timestamp or recovery marker.
- No credible recovery evidence exists at `2026-08-29T01:19:57+08:00`; kept the queue paused before
  the required full G-R2 frozen replacement and did not start G-R2 off.


## 2026-08-28 - Exclude quota-censored G-R2 frozen and pause queue

- Found no related process and a sealed Batch `b-20260828-001`. Its profile records all 156
  VerilogEval spec-to-RTL Cases, repair zero, frozen `mem-v0008`, and the locked digest, but the
  condition is not valid experimental evidence.
- Parsed every final outcome and Provider transcript. Prob129 through Prob156 are 28 consecutive
  `POLICY_VIOLATION` / `NO_COMPILE_UNIT` outcomes whose only Provider exchange stopped with a
  zero-token Kimi HTTP 403: the account had reached its weekly seven-day usage limit. This is a
  Provider quota cutoff, not an RTL or selector result.
- The invalid Batch reports 120 compile passes, 105 functional passes, 15 mismatches, and 36
  not-runs (8 `MAX_ATTEMPTS`, 28 quota artifacts). Only the first 128 Cases have Selector evidence.
  These partial counts are recorded for diagnosis only and are excluded from G-R2.
- The final `MISMATCH_ANALYSIS_FAILED` warning is secondary: the bounded schema-repair turn left
  the placeholder diagnosis unchanged after quota exhaustion. It does not repair the missing 28
  target evaluations and is not a reason to accept the Batch.
- Did not start G-R2 off, run a canary, retry the full Batch, switch stores, or invoke any other
  Provider-backed command. The queue is paused until credible non-probe evidence shows the Kimi
  weekly quota has recovered; then G-R2 frozen must restart from Case 1.


## 2026-08-28 - Complete G-R1 frozen and start G-R2 frozen

- Found no related process and a sealed complete G-R1 frozen Batch `b-20260827-003`. Validated all
  156 unique VerilogEval spec-to-RTL Cases, 156 valid Case records, repair zero, frozen
  `mem-v0008`, and the locked snapshot digest.
- The frozen condition compiled 142, passed 132, mismatched 10, and did not run 14. All 14
  not-runs ended `MAX_ATTEMPTS`; there were no timeouts or verification-invalid Cases.
- Parsed 156 main-Agent Provider transcripts containing 581 successful exchanges, no Provider
  errors, 1,060,331 tokens, and $3.4658826. Batch duration was 06:20:51.590.
- Parsed all 156 initial-generation Selector attempts: 71 non-empty and 85 empty. The 77 selections
  used only the four eligible `initial_generation` items: `memory-000012` 41,
  `memory-000010` 30, `memory-000007` 4, and `memory-000005` 2.
- G-R1 paired transitions are 7 failure-to-pass, 6 pass-to-failure, 125 pass-to-pass, and 18
  failure-to-failure. Frozen changes aggregate pass by +1 but compile by -2 and not-run by +2;
  token use is +152,808 (+16.84%) and recorded cost is +$0.7013448 (+25.37%). This is not yet a
  positive Memory conclusion because the swapped-order round is outstanding and not-runs rose.
- Revalidated the active `mem-v0008` manifest at 13 items and locked digest, then started complete
  G-R2 condition 1 with frozen `mem-v0008`, repair zero, and all 156 Cases. Hidden PID `9164`,
  evaluator PID `14484`, and Batch `b-20260828-001` were alive; logs are
  `.rtl-agent/automation-logs/g-r2-frozen-mem-v0008-20260828-132227.stdout.log` and matching stderr.
- The first process-tree display incorrectly returned no rows because the read-only diagnostic used
  compact `Where-Object ProcessId-eq$id` syntax. An explicit script-block comparison immediately
  confirmed the full process tree. The experiment was never stopped, duplicated, or modified.


## 2026-08-28 - Monitor G-R1 frozen mem-v0008 at Case 148/156

- Re-read the required handoff and verification records and found the queue still at complete G-R1
  frozen `mem-v0008`, with valid Memory-off Batch `b-20260827-002` unchanged.
- Read-only process inventory found the original hidden command PID `608`, Corepack/Node children,
  evaluator PID `4752`, and a live frozen-Memory Selector child. No second evaluation or Debug
  command was running.
- Batch `b-20260827-003` remains active. At `2026-08-28T07:17:59+08:00`, stderr had reached
  `Prob148_2013_q2afsm (148/156)`; the active child was selecting from frozen Memory for that Case.
- No transport, quota, or store error was present in the observed log tail. Per the serial campaign
  rule, did not start, stop, retry, switch stores, or otherwise disturb any process, and did not
  treat the partial Batch as a result.

## 2026-08-28 - Complete G-R1 off and start frozen mem-v0008

- Found no active G-R1 off process and a sealed complete Batch `b-20260827-002`. Its profile and
  evidence record the full ordered VerilogEval `Prob001..Prob156` selection, Memory off, and zero
  functional-repair iterations.
- Validated all 156 unique selection entries, 156 functional Case records, and 156 final results.
  The Batch has 144 compile passes, 131 functional passes, 13 mismatches, 12 not-runs, and zero
  verification-invalid Cases; all 12 not-runs ended `MAX_ATTEMPTS`.
- Parsed all 156 Provider transcripts: 608 exchanges, all with nonzero usage, no Provider errors,
  no connection failures, and no quota failures. Persisted main-Agent usage totals 907,523 tokens
  and $2.7645378. Launch-to-final-stdout wall time was about 02:30:57.
- Revalidated active ChipBench `mem-v0008`: manifest count 13, catalog count 13, item-file count
  13, and locked digest
  `sha256:5229d4f09d557d77633280d70e9b40136db90dfa434ed98fd9763377ad886320`.
- Started complete G-R1 condition 2 with frozen `mem-v0008`, repair zero, and all 156 Cases through
  the authorized local boundary. Hidden PID `608` started at
  `2026-08-28T01:18:44+08:00`; logs are
  `.rtl-agent/automation-logs/g-r1-frozen-mem-v0008-20260828-011844.stdout.log` and matching
  stderr.
- Launch verification showed the expected package command and TypeScript build. No Memory write,
  Experience, Memory Build, snapshot publication, Debug run, or overlapping process was started.

## 2026-08-27 - Pass local Provider canary and restart complete G-R1 off

- The operator explicitly authorized commands in this project to execute directly on the local host
  without the restricted Codex sandbox.
- Ran diagnostic Batch `b-20260827-001` outside the sandbox with only VerilogEval `Prob001`,
  Memory off, and zero functional repairs. It completed with 1/1 compile pass, 1/1 functional pass,
  zero not-runs, and no Provider errors.
- The transcript contains four successful Kimi K3 exchanges totaling 4,593 tokens and $0.0093606.
  The Agent outcome is `RTL_CHANGED`, the workspace is compile-usable, and there are no violations.
  This proves current connectivity and usable inference quota but is excluded from accuracy results
  because it is a one-Case diagnostic.
- Restarted the complete G-R1 Memory-off `Prob001..Prob156` condition through the same approved
  local boundary. Hidden PID `14936` started at `2026-08-27T21:34:35+08:00`; stdout is
  `.rtl-agent/automation-logs/g-r1-off-retry-20260827-213435.stdout.log` with matching stderr.
- Verified the PID remained alive and the expected repair-zero, Memory-off package command was
  building. No frozen condition, Memory switch, Experience, Memory Build, or snapshot was started.
- Handoff validation passed: session-state JSON parsing, scoped `git diff --check`, and the Git
  Bash Harness check. A final log check showed `Prob001_zero (1/156)` in progress.

## 2026-08-27 - Exclude network-sandbox G-R1 Batch and pause for canary approval

- Found no active experiment process. The complete G-R1 Memory-off attempt had already sealed as
  Batch `b-20260825-001` after about 44 minutes with the correct VerilogEval 156-Case selection,
  Memory `off`, and zero functional repairs.
- Excluded the Batch from experimental evidence: it has 0 compile passes, 0 functional passes, and
  156 functional non-runs. All 156 Agent attempts ended `POLICY_VIOLATION` only because no RTL
  compile unit was created.
- Parsed all Provider evidence. The 156 transcripts contain exactly 624 exchanges, every exchange
  is `Connection error.`, every exchange reports zero tokens, and none contains the earlier Kimi
  billing-cycle `permission_error`. This is a transport boundary failure rather than an RTL,
  Memory, selector, or measured accuracy result.
- Root cause: the hidden background command inherited the current Codex workspace's restricted
  network sandbox. The fix is to run Provider-backed commands through an explicitly approved
  out-of-sandbox boundary.
- Requested approval for one real `Prob001` Memory-off, zero-repair diagnostic canary outside the
  sandbox. The request was aborted before the command ran, so it created no new Batch and provides
  no connectivity or quota evidence.
- Did not start G-R1 frozen, switch Memory stores, modify Memory, run `read_write`, or make another
  Provider call. The queue is paused at G-R1 off until a network-enabled canary succeeds; an HTTP
  403 canary would keep it paused for quota recovery.
- Handoff validation passed: session-state JSON parsing, scoped `git diff --check`, and the Git
  Bash Harness check. A final process/Batch check still found no experiment process or newer Batch.

## 2026-08-25 - Start cross-dataset frozen-Memory campaign

- Replaced the completed weekend campaign objective with the user-authorized cross-dataset plan:
  complete VerilogEval Generation for G-R1/G-R2, complete ChipBench r5 zero-shot Debug for
  D0-R1/D0-R2, and a separate repair-three D3 comparison. The queue never uses `read_write` and
  keeps Generation, direct Debug, and feedback-assisted Debug metrics separate.
- Verified the locked Memory identities before scheduling: ChipBench `mem-v0008` has 13 items and
  digest `sha256:5229d4f09d557d77633280d70e9b40136db90dfa434ed98fd9763377ad886320`;
  VerilogEval `mem-v0003` has nine items and digest
  `sha256:eacafc24a17c87646e55add966c375e7b1c2fca7fd69a5bda2467da1b8252319`.
- Confirmed that the runtime still hard-codes `.rtl-agent/memory`. The automation is required to
  switch the ChipBench and VerilogEval stores only while no experiment process is active, using
  reversible directory renames plus manifest validation and never overwriting or deleting a store.
- Created active heartbeat automation `frozen-memory`, attached to this session, with a six-hour
  interval. Its prompt contains the complete queue, validation rules, paired-order requirements,
  failure handling, session-reporting requirement, and final stopping condition.
- A `Win32_Process` command-line inventory was denied by the current sandbox. Replaced it with a
  successful `Get-Process` name check plus latest Batch and recent log/lock timestamps. No
  `node`, `corepack`, or `pnpm` process was present, and no active Batch had changed since August 22.
- Started G-R1 condition 1 as the complete VerilogEval `Prob001..Prob156` evaluation with Memory
  off and zero functional repairs. Hidden launch PID `14816` remained alive and its stdout showed
  the expected package command and TypeScript build. Logs are
  `.rtl-agent/automation-logs/g-r1-off-20260825-211352.stdout.log` and the matching stderr file.
- The previous Kimi billing-cycle 403 remains a known risk. If it censors this Batch, the Batch is
  invalid, must not be used as evidence, and later heartbeats must avoid blind full retries until
  credible quota recovery evidence exists.

## 2026-08-25 - Analyze campaign and quarantine invalid Batches

- Reconfirmed the campaign boundary: five valid Batches (`b-20260821-001` through
  `b-20260821-003`, plus `b-20260822-001` and `b-20260822-002`) support the report. The partial
  frozen-`mem-v0008` run, all-quota replacement, and four one-Case canaries do not support a Memory
  effect comparison.
- Validated all six cleanup targets as ordinary directories directly below `.rtl-agent/batches/`,
  with no reparse points or active experiment process. They occupied about 16.37 MiB.
- The execution policy rejected permanent recursive deletion before it ran. Moved the same six
  exact directories to `.rtl-agent/quarantine/weekend-invalid-batches-20260825/`, making the active
  Batch store clean while retaining a recoverable audit copy.
- Verified the five valid Batches, `mem-v0005` through `mem-v0008`, and all relevant Memory Build
  artifacts remain present. Updated the final report with the cleanup boundary.

## 2026-08-25 - Fourth automation deletion request also failed

- Another post-cutoff `chipbench` heartbeat arrived. Revalidated the handoff, final report, latest
  Batch timestamp, and active process list; no experiment or Provider call was started.
- Retried the required desktop automation deletion. The request stayed pending for about 57
  minutes and was terminated without a result.
- Read-only inspection confirms the persisted automation still has `status = "ACTIVE"` and the
  original `COUNT=12` recurrence. Manual deletion through the desktop UI remains necessary.

## 2026-08-25 - Stale post-cutoff heartbeat could not be deleted through the API

- The `chipbench` heartbeat fired again after the final report, so the assumed `COUNT=12`
  exhaustion did not suppress this invocation.
- Re-read the handoff state and latest Batch evidence, confirmed the final report is present, and
  confirmed there is no active experiment process. No experiment or Provider call was started.
- Retried deletion through the desktop automation API. The third request again remained pending
  until terminated, and no deletion confirmation was received. The persisted automation must be
  removed through a functioning desktop UI/API path.

## 2026-08-24 - Close weekend campaign and publish final report

- Reached the authorized 20:30 +08:00 cutoff with no active experiment process and made no further
  Provider call.
- Revalidated all eleven campaign Batch summaries and profiles, the `mem-v0005` through
  `mem-v0008` lineage, the valid R1 off/frozen-`mem-v0005` Case transition matrix, and the real
  HTTP 403 failure evidence in the censored Batch and four canaries.
- Aggregated exact persisted main-Agent usage: the five valid Batches recorded 7,934,082 tokens and
  $39.920849 over 21:12:38 of Batch time; all retained campaign attempts recorded 9,184,509 tokens
  and $46.037980 over 25:39:56. Auxiliary Selector/Summarizer/Analyzer/Consolidator usage is not
  persisted and remains outside this lower bound.
- Published `exp_result/chipbench/08.24-k3-pi-weekend-memory-campaign.md`. It concludes that the
  valid R1 comparison changes trajectories and adds one Pass, but increases not-runs; no claim is
  made for `mem-v0008` because its controlled condition and R2 were blocked by quota.
- Requested deletion of the completed `chipbench` heartbeat twice through the desktop automation
  API. Both requests remained pending until terminated; the persisted finite recurrence is
  `COUNT=12` and is exhausted by this final checkpoint, but API deletion was not confirmed.
- Closed the monitoring campaign without modifying code, common guidance, configuration, Memory
  snapshots, Git state, or prior evidence.

## 2026-08-24 - Final pre-cutoff quota canary still returns Kimi 403

- Confirmed no related experiment process was active before the final eligible quota check.
- Ran the fourth real `Prob000` frozen-`mem-v0008`, zero-repair canary through the normal
  Selector/Agent path. Batch `b-20260824-002` completed with 0 compile passes and one non-run.
- Verified its locked Memory digest and final `POLICY_VIOLATION`; the actual Provider transcript
  again contains the Kimi HTTP 403 billing-cycle usage-limit error.
- Did not launch a full R1 replacement. No more Provider calls will be made; the next checkpoint
  will publish the final report from completed and quota-censored evidence.

## 2026-08-24 - Third real one-Case quota canary still returns Kimi 403

- Confirmed no related `node`, `corepack`, or `pnpm` experiment process was active before probing.
- Ran one real `Prob000` ChipBench generation Case with frozen `mem-v0008`, zero repair, and the
  normal Selector/Agent path. Batch `b-20260824-001` completed with 0 compile passes and one
  functional non-run.
- Verified the Case identity, frozen snapshot digest, final `POLICY_VIOLATION`, and actual Provider
  transcript. The transcript contains the same Kimi HTTP 403 billing-cycle quota error.
- Did not start a full R1 replacement Batch. The campaign remains paused before R2, preserving the
  controlled sequence and remaining quota/time.

## 2026-08-24 - Second real one-Case quota canary still returns Kimi 403

- The ninth heartbeat found no active experiment and ran exactly one identical real canary:
  ChipBench `Prob000`, frozen `mem-v0008`, and zero functional repair.
- Canary Batch `b-20260823-003` completed with 0 compile passes and one non-run. Final outcome is
  `POLICY_VIOLATION`, and the actual Provider transcript again contains the Kimi HTTP 403
  billing-cycle usage-limit message.
- Did not launch a full R1 replacement or R2. Two pre-report checkpoints remain eligible for at
  most one canary each; the final cutoff checkpoint must make no Provider call.
- No code, common guidance, configuration, Memory snapshot, Git state, or prior evidence was
  changed.

## 2026-08-23 - Real one-Case quota canary still returns Kimi 403

- The eighth heartbeat found no active experiment and validated frozen `mem-v0008` unchanged.
- Ran exactly one real canary: ChipBench `Prob000`, frozen `mem-v0008`, and zero functional repair.
  It created Batch `b-20260823-002`, completed with 0 compile passes and one non-run, and did not
  publish Memory.
- Final outcome is `POLICY_VIOLATION`; the actual Agent provider transcript contains the same Kimi
  HTTP 403 billing-cycle usage-limit message. The canary therefore failed and is excluded from
  experimental comparisons.
- Did not launch R1 or R2. Remaining pre-deadline heartbeats may run at most one identical real
  canary each; the final heartbeat must stop Provider calls and report completed and censored work.
- No code, common guidance, configuration, Memory snapshot, Git state, or prior evidence was
  changed.

## 2026-08-23 - Reject all-quota replacement and require a real one-Case canary

- The seventh heartbeat found no live process and replacement Batch `b-20260823-001` completed in
  about four minutes with 0 compile passes, 0 functional passes, and 30 non-runs.
- Its frozen `mem-v0008` identity and 30 Case files are present, but every final outcome is
  `POLICY_VIOLATION` and every Case's provider transcript contains the same Kimi HTTP 403
  billing-cycle quota message. The Batch is excluded in full.
- The preceding `pi-agent-probe` success did not prove inference quota availability; it established
  local capability and identity only. Recorded this false-positive assumption in the Error
  Journal.
- Kept the campaign paused before R2 with no active process. At the next heartbeat, use exactly one
  real ChipBench Case with frozen `mem-v0008` and zero repair as the quota canary. Launch no full
  replacement unless that Case reaches a non-quota Agent/compile outcome.
- No code, common guidance, configuration, Memory snapshot, Git state, or prior evidence was
  changed.

## 2026-08-23 - Provider access recovered and R1 mem-v0008 replacement started

- The sixth heartbeat found no experiment process and the campaign still paused before R2.
- Ran exactly one minimal `pi-agent-probe`. It passed without a quota error and returned the same
  Pi 0.81.1, Kimi K3, isolation, tool-policy, extension, guidance, and experiment digests used by
  the campaign.
- Revalidated the frozen `mem-v0008` digest, then started a clean R1 condition 3 replacement as
  Batch `b-20260823-001` with five functional repairs and dedicated logs.
- Censored Batch `b-20260822-003` remains untouched and excluded. The replacement will be accepted
  only if all 30 Case evidence files are present and no Provider quota failure recurs.
- No R2 Batch, Memory publication, code, common guidance, configuration, Git operation, or prior
  evidence mutation occurred.

## 2026-08-23 - Pause campaign after Kimi billing-cycle quota exhaustion

- The fifth heartbeat found no live process and a sealed Batch `b-20260822-003` for R1 frozen
  `mem-v0008`. Its dataset, snapshot digest, 30 Case files, and five-repair identity are correct.
- The Batch aggregate is 18 compile passes, 14 functional passes, four mismatches, and 12 non-runs.
  Three non-runs are `MAX_ATTEMPTS`, three are `TIMEOUT`, and six consecutive late Cases are
  labeled `POLICY_VIOLATION`.
- Direct provider-transcript inspection proved all six late labels are the same external failure:
  Kimi HTTP 403 `permission_error` reporting that billing-cycle usage is exhausted. They affect
  `Prob028`, `Prob030`, `Prob031`, `Prob032`, `Prob033`, and `Prob034`; none reached RTL generation.
- The Batch's mismatch Analyzer warning occurred after quota exhaustion. A same-state reanalysis
  would be expected to fail and was not attempted.
- Classified `b-20260822-003` as a censored, invalid R1 comparison rather than treating 14/30 as a
  Memory effect. Paused before R2 with no active process. A future heartbeat may make one small
  capability probe; after access returns, R1 frozen `mem-v0008` must be rerun from scratch.
- No code, common guidance, configuration, Memory snapshot, Git state, or prior evidence was
  changed.

## 2026-08-22 - Complete R1 frozen mem-v0005 and start frozen mem-v0008

- The fourth six-hour heartbeat found no live comparison process and a sealed completed evaluation
  Batch `b-20260822-002` for R1 condition 2.
- The profile records the locked `self-contained` split, five functional repairs, and frozen
  `mem-v0005` at digest
  `sha256:708bf508968c623682cb41dcd9a9e357c44c5c6de9f8c61627223aadd18c34e4`. All 30 functional
  Case files are present. The result is 23 compile passes, 19 functional passes, four mismatches,
  and seven non-runs.
- Final run evidence identifies `Prob008`, `Prob012`, and `Prob013` as `MAX_ATTEMPTS`; `Prob003`,
  `Prob006`, `Prob007`, and `Prob033` are `TIMEOUT`.
- Validated final snapshot `mem-v0008` at digest
  `sha256:5229d4f09d557d77633280d70e9b40136db90dfa434ed98fd9763377ad886320`, then started R1
  condition 3 as evaluation Batch `b-20260822-003` with five functional repairs.
- No Memory publication, experiment code, common guidance, configuration, Git state, or prior
  evidence was changed.

## 2026-08-22 - Complete R1 Memory-off and start frozen mem-v0005

- The third six-hour heartbeat found no live comparison process and a sealed completed evaluation
  Batch `b-20260822-001` for R1 condition 1.
- The profile records the locked `self-contained` split, five functional repairs, Memory `off`,
  and no snapshot. All 30 functional Case files are present. The result is 26 compile passes, 18
  functional passes, eight mismatches, and four functional non-runs.
- Final run evidence identifies `Prob004` as `MAX_ATTEMPTS` and `Prob016`, `Prob017`, and
  `Prob033` as `TIMEOUT`.
- Validated frozen start snapshot `mem-v0005` at digest
  `sha256:708bf508968c623682cb41dcd9a9e357c44c5c6de9f8c61627223aadd18c34e4`, then started R1
  condition 2 as evaluation Batch `b-20260822-002` with five functional repairs.
- No Memory publication, experiment code, common guidance, configuration, Git state, or prior
  evidence was changed.

## 2026-08-22 - Freeze mem-v0008 and start R1 Memory-off generation

- The second six-hour heartbeat found no live G3 process and a sealed completed Batch
  `b-20260821-003`. It contains 30/30 functional Case evidence files and records `read_write`,
  input `mem-v0007`, the locked `self-contained` split, and five functional repairs.
- G3 produced 26 compile passes, 18 functional passes, eight mismatches, four functional non-runs,
  and 17 Experience files. Final run evidence identifies `Prob004` as `MAX_ATTEMPTS` and
  `Prob013`, `Prob017`, and `Prob033` as `TIMEOUT`.
- Explicit Memory Build from only `b-20260821-003` published `mem-v0008` from `mem-v0007`. The
  frozen snapshot contains 13 catalog entries, no missing item files, and digest
  `sha256:5229d4f09d557d77633280d70e9b40136db90dfa434ed98fd9763377ad886320`.
- Started comparison R1 condition 1 as evaluation Batch `b-20260822-001`, with Memory `off` and
  five functional repairs. The process tree is live and has dedicated monitoring logs.
- No experiment code, common guidance, configuration, Git state, or prior evidence was changed.

## 2026-08-22 - Advance weekend Memory growth from G2 to G3

- The first six-hour heartbeat found no live G2 process and a sealed completed Batch
  `b-20260821-002`. It contains 30/30 functional Case evidence files and records `read_write`,
  input snapshot `mem-v0006`, the locked ChipBench `self-contained` split, and five functional
  repair iterations.
- G2 produced 24 compile passes, 17 functional passes, seven mismatches, six functional non-runs,
  and 16 eligible Experience files.
- Explicit `memory-build --experience-batches b-20260821-002` published `mem-v0007` from
  `mem-v0006`. The snapshot has ten catalog entries, no missing Memory item files, and digest
  `sha256:491737b0f39f62e79f71ebd5e984c69f997fc02941bb703e70b5fcbfaa1deaae`.
- A read-only validation initially looked for nonexistent `items`/`memory` catalog properties and
  reported zero entries. Inspection showed the actual property is `entries`; the corrected check
  passed. No experiment artifact was changed by the failed diagnostic.
- Started growth Batch `b-20260821-003` from `mem-v0007` in `read_write` mode with the same
  provenance boundary and five functional repairs. The process tree is live and logs are isolated
  under `.rtl-agent/monitoring/weekend-20260821/`.
- No experiment code, common guidance, configuration, Git state, or existing evidence was changed.

## Entry: Land Coverage Assessment Handoff on Master

Commit `b0dd4e8` (`docs: record coverage experiment assessment`) was created directly on `master`
and pushed successfully to `origin/master`. No cherry-pick was required. The experimental minimal
common-guidance edit, local Claude settings, and workflow screenshot remain outside the commit and
were not pushed.

## Entry: Guarded Commit Review for Coverage Assessment Handoff

### Review

The `commit-main` review inspected the complete tracked diff and both untracked files. No P1/P2
finding blocks landing the reviewed handoff/audit documents.

The two-line experimental change to `config/agents/rtl-core-loop/common-guidance.md` would replace
the active v3 guidance and is explicitly excluded. Local `.claude/settings.local.json` and the
workflow screenshot are also excluded. The intended scope is limited to `current-task.md`,
`.harness/session-state.json`, `.harness/session-log.md`, and `docs/error-journal.md`.

### Verification

- Session-state JSON parse: passed.
- Targeted Prettier check over the four intended files: passed.
- `git diff --check`: passed.
- `scripts/harness_check.sh` through Git Bash: passed.

No model call, RTL compile, simulation, coverage run, or runtime artifact mutation occurred.

## Entry: Assess Verification Coverage Experiment Evidence

### Summary

Audited the implemented Verilator coverage loops, their documentation, the nine retained
VerilogEval result artifacts, and all six retained FreeCores I2C result artifacts. No model call,
RTL edit, compile, simulation, or new coverage run was performed.

### Findings

- The infrastructure measures DUT-only line/branch/toggle coverage, preserves typed denominators,
  emits structured uncovered targets, protects DUT digests, and supports bounded repair feedback
  for missing assets plus generated-source compile and confirmed simulation failures.
- The published I2C run raised the fixed baseline from 78.16% to 93.99%. A later unreported run
  reached 100% line/branch score and 87.03% toggle, but remains `PENDING_HUMAN_REVIEW`.
- The VerilogEval artifacts cover only four unique Cases and mainly represent implementation
  bring-up. The I2C artifacts are six evolving attempts on one fixture rather than controlled
  replications.
- Structural coverage gain is not yet backed by mutation score, independent oracle quality,
  repeated paired statistics, broad design coverage, or Linux authoritative evidence.

### Recommended Next Evidence

Predeclare a fixed-fixture, fixed-budget repeated comparison; use held-out mutants/faults and an
independent scoreboard as the primary verification-quality test; separately report line, branch,
toggle, regression, timeout, token, cost, and wall time; then extend to a predeclared multi-design
set and Linux execution.

### Validation and Limits

Read-only artifact inventory and JSON parsing reconciled nine VerilogEval results and six I2C
results. Documentation and retained results were inspected directly. The only source change was a
required error-journal entry for repeating a previously documented PowerShell diagnostic mistake.

## Entry: Plan the Next Reviewer-Grade RTL Agent Experiments

### Summary

Published `exp_result/next-experiment-plan.md` from the supplied research assessment and current
repository evidence. The plan narrows the paper question to whether frozen cross-task Memory
improves functional RTL repair under a fixed verification and compute budget.

### Priorities

- Treat the existing ChipBench 3-Case / 10-point gain as a positive signal, not isolated Memory
  causality.
- Make a fixed-initial-RTL A/B/C/D repair comparison the first experiment: no repair,
  feedback-only, retrieved frozen Memory, and shuffled Memory.
- Build Memory on a predeclared VerilogEval split, freeze it, and evaluate all 45 repository-locked
  ChipBench generation cases without online updates.
- Run at least three paired repetitions and report confidence intervals, McNemar comparisons,
  timeouts, regressions, wall time, and `ASR@R`.
- Complete Batch-level usage accounting for Agent, Selector, Summarizer, Analyzer, and Consolidator
  before claiming token or cost efficiency.
- Defer CVDP experiments until its Provider, profile, and functional-simulation adapter exist.

### Validation and Limits

- No model call, dataset rerun, compile, simulation, Memory Build, or runtime evidence rewrite was
  performed.
- The document preserves the local Windows/non-authoritative boundary and distinguishes the 45
  supported repository ChipBench cases from counts quoted for other dataset revisions.
- Markdown formatting, unwanted-marker scan, JSON parsing, `git diff --check`, and the explicit Git
  Bash Harness check passed.

## Entry: Freeze Memory V1 Contract

### Summary

Accepted the operator-defined Memory V1 design and recorded it in `docs/memory-v1.md`. The contract
uses one fixed snapshot per Batch, Case-level factual Experience, Batch-level consolidation, Pi-only
selection, Markdown Memory items, sequential snapshot IDs, and held-out `frozen` evaluation. It
explicitly excludes databases, embeddings, vector retrieval, confidence, failed-trajectory
learning, automatic skill promotion, and online test-set updates.

### Key Boundary

The requested real single-Case Pi regression must validate an Experience Record, but the repository
does not yet contain an Experience Summarizer. The next slice therefore implements only Experience
schema, eligibility, Pi summarization, and bounded failure evidence. The real repairable Build Set
Case follows that slice; Store, Selector, and Consolidator follow only after the regression passes.

The installed Pi 0.81.1 documentation confirms `before_agent_start` and `context`. Memory selection
will occur outside Pi, and one `Relevant RTL Memory` block will be injected through
`before_agent_start` for each bounded turn without modifying Pi core.

### Validation

- Documentation Prettier and repository format checks: passed.
- `git diff --check`: passed.
- Git Bash Harness check: passed.
- No Pi/model call, RTL generation, compile, simulation, Experience generation, consolidation, or
  snapshot publication occurred.

## Entry: Guarded Landing Review for Case-by-Case Functional Simulation

### Summary

Reviewed the complete 13-file change set on `master` before touching Git state. The implementation,
tests, removed wrappers, and handoff documentation all belong to the case-by-case functional-
simulation task. No P1/P2 finding remains, so the change set is ready for guarded commit and push.

### Validation

- `corepack pnpm install --frozen-lockfile`: passed
- focused batch, functional-simulation, and CLI suite: 4 files and 42 tests passed
- full repository: 39 files passed / 1 skipped; 307 tests passed / 2 skipped
- typecheck, build, lint, Prettier, and peer dependency checks: passed
- real Icarus integration: 2 files passed / 1 skipped; 7 tests passed / 1 skipped
- `git diff --check` and the explicit Git Bash Harness check: passed

No model-backed dataset batch, Linux formal Gate, or authoritative functional-verification run was
performed or claimed.

## Entry: Run Functional Simulation Case by Case

### Summary

Changed the normal VerilogEval and ChipBench lifecycle so each valid case completes its Agent turn,
candidate compile/repair, hidden-reference functional compile, and VVP simulation before the next
case's Agent turn starts. This is preparation for Memory V1; no Memory implementation or
simulation-mismatch repair turn was added.

### Implementation

- Added an optional awaited `onCaseComplete` boundary to the generic batch evaluator.
- Split functional simulation into a reusable single-case executor and a final batch aggregator.
- Persisted each outcome immediately below
  `_internal/evidence/functional-cases/<case-number>.json`.
- Removed the former batch-wide execution API and the ChipBench/VerilogEval forwarding wrappers.
- Removed four obsolete ignored `dist` outputs left behind by TypeScript's clean mode after their
  source module was deleted; the normal build then regenerated only current outputs.
- Kept `functional-simulation-result.json`, `summary.json`, candidate publication, hidden
  verification layout, and result classifications.
- Deferred a completion-callback exception until after the compile batch result is published;
  later completion callbacks are skipped while remaining compile-only case processing completes.

### Validation

- Focused batch, functional-simulation, and CLI suites: 4 files and 42 tests passed.
- Full repository: 39 files passed / 1 skipped; 307 tests passed / 2 skipped.
- Typecheck, build, lint, Prettier, and peer dependency checks: passed.
- Real Icarus integration: 2 files passed / 1 skipped; 7 tests passed / 1 skipped.
- Final `git diff --check` and the Git Bash Harness check: passed.

### Evidence Limits

- No model-backed dataset batch was run because it would consume model quota.
- Functional mismatch diagnosis remains post-batch and does not trigger an RTL repair turn.
- The result remains non-authoritative Windows benchmark evidence and does not establish Linux,
  formal-Gate, production, or CVDP readiness.

## Entry: Guarded Landing Review for Accumulated Core Loop Changes

### Summary

Re-reviewed the complete tracked and untracked change set on `master` before staging. The operator
confirmed that `config/agents/rtl-core-loop/common-guidance.md` is intentionally switchable
experiment configuration. This matches the existing 2026-08-04 decision: every run records the
actual guidance digest, so an experiment-time active revision does not need to remain aligned with
an inactive-candidate decision between runs. The earlier guidance-version P2 is therefore
dismissed. No other P1/P2 finding remains.

The duplicated common-guidance v4 decision entry is retained as a non-blocking P3 documentation
note. The reviewed scope includes split-scoped ChipBench functional evaluation, private locked
verification materialization, reusable functional simulation, structured Verilator simulation
repair feedback, coverage prompt updates, versioned guidance candidates, and accumulated
experiment documentation.

### Validation

- `corepack pnpm install --frozen-lockfile`: passed
- lint, typecheck, build, format, and peer dependency checks: passed
- full repository: 39 files passed / 1 skipped; 305 tests passed / 2 skipped
- real ChipBench `fixtures-check`: passed for 683 files and 223 cases across 11 splits
- real Icarus integration: 2 files passed / 1 skipped; 7 tests passed / 1 skipped
- fixed Icarus compile smoke: passed
- real Verilator coverage integration: passed
- `git diff --check`: passed
- explicit Git Bash Harness check: passed

The first attempt to select the real Verilator integration through the ordinary Vitest config
found no tests because that config intentionally excludes `*.integration.test.ts`. The corrected
command used `vitest.iverilog.config.ts` and passed. This was a validation-command selection error,
not an implementation failure.

A real model-backed `coverage --case` experiment was not repeated because it would consume model
quota and create new runtime evidence. Deterministic orchestration regressions plus the real
Verilator integration cover the changed execution boundary; no production Linux or formal-Gate
claim is made.

## Entry: Analyze ChipBench Self-Contained Common-Guidance v3

### Summary

Analyzed completed batch `b-20260807-001` and compared it case-by-case with pre-v1 guidance batch
`b-20260806-003`. Published
`exp_result/chipbench/08.07-k3-pi-common-guidance-v3-self-contained.md` without starting a new
model call or rerunning generation, compilation, simulation, or mismatch analysis.

### Paired Result

- Both batches selected all 30 `self-contained` cases with the same dataset, Pi/K3, isolation,
  tool policy, experiment configuration, and Icarus profile.
- V3 provenance is complete: the locked digest matches `common-guidance_v3.md`, and 30/30
  generation transcripts contain the v3 title.
- Raw functional accuracy stayed at 9/30. Candidate compile pass count fell from 30 to 28.
- Eight cases passed in both runs and 18 mismatched in both. `Prob025` improved to pass;
  `Prob030` regressed to mismatch; `Prob008` became a compile failure; `Prob034` timed out before
  compile.
- `Prob003` improved from 404 to one mismatch and `Prob017` from 1,542 to 80, but both remain
  strict case failures.
- On the same 28 simulated cases, baseline mismatch samples were 9,735/28,572 and v3 was
  8,360/28,572. This is a diagnostic micro-average, not case-level accuracy.

### Failure Analysis

- All 19 v3 mismatch cases have published analysis and metadata. Categories are 12
  `SEQUENTIAL_TIMING`, two `INITIALIZATION_SEMANTICS`, two `RESET_SEMANTICS`, two
  `SPEC_REFERENCE_AMBIGUITY`, and one `COUNTER_BOUNDARY`.
- `Prob008` used reserved Verilog primitive keyword `buf` as a register identifier, causing Icarus
  syntax errors.
- `Prob034` reached the 600-second Agent timeout with a changed but unusable workspace and did not
  compile.
- Earlier v3 batch `b-20260806-005` is excluded from accuracy comparison because it is `INVALID`:
  a roughly 180-minute policy-violation turn, a roughly 625-minute incomplete turn, and six later
  cases not executed.

### Validation and Limits

- Report Prettier and scoped diff checks: passed.
- Evidence assertions for summaries, sample totals, diagnosis counts, guidance digest, and all 30
  provider transcripts: passed.
- Final Harness check: passed using the explicit Git Bash executable.
- The result is one unseeded, non-authoritative Windows observation. It does not prove a stable v3
  effect, Linux readiness, formal-Gate success, or production safety.

### Diagnostic Failure

A read-only micro-metric command repeated the already documented PowerShell direct-`foreach`
pipeline parser failure before the collection-variable form passed. The recurrence is recorded in
`docs/error-journal.md`; no repository runtime or experiment evidence changed.

## Entry: Analyze VerilogEval Common-Guidance v4 Prob001–156

### Summary

Analyzed completed batch `b-20260806-004` without starting a model call or rerunning generation,
compilation, simulation, or diagnosis. Published
`exp_result/verilog-eval/08.06-k3-pi-common-guidance-v4-001-156.md`.

### Result

- The locked selection contains all 156 VerilogEval `spec-to-rtl` cases with no gaps or duplicates.
- 152 candidates compiled, 134 passed functional simulation, 18 mismatched, four did not compile,
  and none were verification-invalid.
- Against v3, 128 cases passed both runs, six mismatched both, six improved to pass, and 16
  regressed from pass. V4 therefore lost ten functional passes and 6.41 percentage points.
- The four compile failures all reproduce the Icarus enum implicit-cast class. Twelve additional
  regressions are functional errors across timing, bit ordering, priority, truth-table replay, and
  directional FSM inputs.
- Targeted v4 changes still have positive evidence: required initialization fixed `Prob074`, the
  packed function return fixed `Prob141`, and final-driver/Moore timing helped `Prob054` and
  `Prob146`.

### Diagnosis and Limits

- Thirteen of 18 mismatches have valid analysis metadata. `Prob122` retains a placeholder analysis
  without metadata; `Prob127`, `Prob137`, `Prob152`, and `Prob153` have no structured diagnosis.
- The report uses public Spec/candidate evidence and retained reference RTL only for bounded
  report-level explanations of those five cases. It does not rewrite runtime evidence or promote
  the findings into guidance.
- All 156 generation transcripts contain the v4 title, and the locked guidance digest matches
  `common-guidance_v4.md`.
- An exploratory paired exact McNemar comparison gives `p ≈ 0.0525`; one unseeded sample does not
  prove v4 is stably worse even though this run clearly declined.

### Validation

- Report and decision-log Prettier check: passed.
- Evidence assertions for counts, mismatch sample totals, guidance digest, and diagnosis artifact
  counts: passed.
- Scoped `git diff --check`: passed.
- Final Harness check: passed using the explicit Git Bash executable.

### Recommendation

Do not promote v4 from this run. Keep its targeted fixes, restore v3's explicit no-extra-pipeline
and distinct-input wording, make enum handling deterministic, and use repeated paired runs before a
default-guidance decision.

## Entry: Analyze ChipBench Self-Contained Pi/K3 Batch

### Summary

Analyzed completed batch `b-20260806-003` without starting a model call or rerunning generation,
compilation, simulation, or diagnosis. Published
`exp_result/chipbench/08.06-k3-pi-self-contained.md`.

### Result

- The locked `self-contained` selection contains all 30 cases with no gaps or duplicates.
- All 30 candidates passed candidate-only compile; 9 passed functional simulation and 21 produced
  mismatch. No case was not run or verification-invalid.
- Total sample evidence is 10,041 mismatches / 29,186 samples. This micro-average is diagnostic and
  does not replace the 9/30 case-level benchmark score.
- The batch took 41 minutes 24 seconds; median case generation time was 63 seconds.
- Functionally correct cases cluster in direct combinational logic, counters, RAM, and simple
  datapaths. Sequence detectors, waveform/frequency generators, streaming protocols, and
  application controllers failed primarily on cycle alignment and reference conventions.

### Diagnosis and Guidance Provenance

- Eighteen of 21 mismatches have published `analysis-metadata.json`; `Prob032` has a retained
  `analysis.json` without metadata, while `Prob033` and `Prob034` have no structured diagnosis.
- The report uses the retained internal reference only to give separate report-level explanations
  for `Prob033` and `Prob034`; it does not rewrite runtime evidence or promote those explanations
  into guidance.
- Among the 19 existing analyses, 11 are `SEQUENTIAL_TIMING`, four
  `SPEC_REFERENCE_AMBIGUITY`, two `RESET_SEMANTICS`, one `BIT_ORDERING`, and one
  `INTERFACE_PROTOCOL`.
- Capability evidence locks Pi `0.81.1`, `kimi-coding` / `k3`, and guidance digest
  `sha256:2bd7c4ec2049793cce8c62bab6dcb3baecb49416fb3cfd8f51693c8e3933842f`.
  Git history and provider transcripts confirm this is the pre-v1 common guidance, not current v4.

### Validation and Limits

- Prettier check for the report: passed.
- Report-only `git diff --check`: passed.
- PowerShell evidence assertions against the batch summary, functional result, and diagnosis file
  counts: passed.
- Final Harness check: passed using the explicit Git Bash executable because `bash` was not on the
  PowerShell `PATH`.
- The batch remains `PENDING_HUMAN_REVIEW`. It is a one-sample Windows direct-host,
  non-authoritative functional experiment and provides no v4, Linux, formal-Gate, or production
  readiness claim.

### Diagnostic Failure

The first Harness invocation did not run because `bash` was absent from `PATH`; the explicit
`C:\Program Files\Git\bin\bash.exe` invocation passed. The read-only Git Bash lookup also repeated
the already documented direct-`foreach` pipeline parser failure once before the corrected
collection-variable form passed. The recurrence is recorded in `docs/error-journal.md`; no runtime
or experiment evidence changed.

## Entry: Create Inactive Common-Guidance v4 Candidate

### Summary

Created `config/agents/rtl-core-loop/common-guidance_v4.md` from the full v1/v2/v3 comparison. The
candidate is 810 words, shorter than v3's 832 words, and does not replace active
`common-guidance.md`.

### Candidate Changes

- Restored the explicit Moore/Mealy definition removed between v2 and v3.
- Distinguished an explicitly required power-up value from invented initialization used to hide
  unspecified `X` behavior.
- Required each final output driver to implement its declared edge-N/N+1 cycle contract.
- Restored final one-hot equation replay against the transition table.
- Restricted functions to input arguments and packed return values for locked-compiler
  compatibility.
- Added no case identifiers, expected answers, reference-specific exceptions, or ambiguous
  hidden-behavior hints.

### Validation and Limits

- Candidate: 74 lines, 810 words, 5,822 bytes.
- SHA-256: `sha256:febc717af1ca539359333df83405cf49c1a3a552446a67653382305310f617b6`.
- Prettier, dataset-neutral token scan, active-guidance/v3 digest parity, and `git diff --check`
  passed.
- No model call or evaluation ran. V4 remains an inactive candidate pending paired v3/v4 evidence
  and explicit operator promotion.

## Entry: Analyze VerilogEval Common-Guidance v3 Prob001–156

### Summary

Analyzed completed batches `b-20260806-001` and `b-20260805-001` without starting a new model call
or verification run. Both locked guidance digests match `common-guidance_v3.md`, and their
continuous selections cover all 156 cases. In aggregate, 155 candidates compiled and 144 passed
functional simulation; eleven produced mismatch and one did not compile. Against the full v2
selection, compile pass count stayed at 155 while functional pass count improved from 141 to 144.

### Paired Result

- 137 cases passed in both runs and eight mismatched in both runs.
- Seven cases improved to functional pass; four regressed, for a net gain of three passes.
- The eleven v3 mismatches classify as four initialization, three sequential-timing, and one each
  of width/interface, bit-ordering, edge-history, and counter-boundary issues.
- `Prob141` is the only compile failure; its function uses a non-input argument rejected by Icarus.

### Output and Validation

- Added `exp_result/verilog-eval/08.05-08.06-k3-pi-common-guidance-v3-001-156.md`; the earlier
  incomplete `001-100` report was replaced.
- Parsed both summaries, profiles, capability locks, batch results, functional results, the compile
  failure, and all mismatch-analysis JSON evidence.
- Recomputed the guidance SHA-256 and confirmed it matches both capability locks.
- Performed a 156-case paired status comparison against `b-20260803-003`, `b-20260803-004`, and
  `b-20260804-001`.
- No business logic, runtime evidence, generated RTL, or existing batch artifact was modified.

## Entry: Pin VerilogEval v2 Through a Verified External Cache

### Summary

Selected NVlabs VerilogEval v2 `spec-to-rtl` as the real R04 dataset source without adding a submodule. Added a repository-owned Provider and TypeScript cache preparation boundary that pin the upstream commit, archive digest, extracted content manifest, 156-case catalog, MIT metadata, normalization identity, and Provider source digest. The real dataset prepared and validated successfully, but R04 remains `IN_PROGRESS`: no versioned evaluation profile, model batch, human review, or checkpoint recommendation was produced.

### Implementation

- Added `VerilogEvalFixtureProvider` for the pinned 156-case `spec-to-rtl` catalog.
- Normalized each public prompt to a blank-generation `spec.md` with top `TopModule`.
- Kept `*_ref.sv` and `*_test.sv` in the hidden cache; neither can enter an Agent run workspace.
- Added an exclusive atomic dataset preparation path under ignored `.rtl-agent/datasets/`, with optional `RTL_AGENT_VERILOG_EVAL_CACHE_ROOT`.
- Downloaded only the fixed codeload archive and extracted only `LICENSE` plus `dataset_spec-to-rtl/**`.
- Locked archive SHA-256 `sha256:179e0fa36027e93e78adeca687d27d9020f6655bde829ade9baf88aeb20d3fbd`.
- Locked the 472-file content manifest `sha256:bbd36573053121fc61e81f38a69b0b9a0f3e4075e18b663e3e4f720aebc10e42`.
- Locked Provider source digest `sha256:7f5e3e3433aa69deb2479bae31fc12d002b91b5b6ee5349905dcf3262001e28b`.
- Added `dataset-prepare`, root `core-loop:dataset:prepare`, cache-aware standalone Provider registration, and catalog-counting `fixtures-check`.
- Added deterministic synthetic archive, atomic reuse, tamper, selection, answer-leak, drift, lock-parity, and CLI tests.

### Validation

- `corepack pnpm typecheck`: passed.
- focused Provider/CLI tests: 2 files and 10 tests passed.
- Core Loop ordinary tests: 13 files passed / 1 skipped; 92 tests passed / 2 skipped.
- thin CLI tests: 1 file and 6 tests passed.
- full repository tests: 27 files passed / 1 skipped; 199 tests passed / 2 skipped.
- `corepack pnpm build`: passed.
- lint, format, frozen install, and peer checks: passed.
- real Icarus integration: 2 files and 6 tests passed.
- real `dataset-prepare`: passed and published the ignored cache.
- repeat `dataset-prepare`: reused the verified cache without downloading.
- real `fixtures-check`: passed and reported 156 `spec-to-rtl` cases.

### Validation Failure Repaired

The first package-scoped Core Loop run found that the new lock-parity test derived repository files from `process.cwd()`. pnpm changes cwd to `packages/core-loop`, so the test could not find the committed lock. The test now derives the repository root from `import.meta.url`, matching the established CLI/test path rule; the supported package and full-suite commands then passed.

### Evidence Limits and Next Step

- Cache preparation and Provider validation are dataset mechanics evidence, not product capability metrics.
- MIT metadata is recorded, but the final operator license-review disposition must still be explicit.
- Register a versioned evaluation profile with a predeclared selection, thresholds, locked Agent/compiler capabilities, and human-review rule before any real model batch.

## Entry: R04 Bounded Repair Loop Mechanics and Evaluation Boundary

### Summary

Implemented the reusable R04 mechanics without weakening or duplicating R01–R03. The Core Loop now performs locked all-case preflight, valid blank/seeded baseline classification, bounded Agent/compile attempts, structured compiler feedback, independent final recompile, strict completion evidence, batch metrics, and separate human-review adjustment. R04 remains `IN_PROGRESS`: no operator-selected, license-reviewed dataset Provider or versioned evaluation profile is registered, so no real batch, capability metric, or checkpoint recommendation was fabricated.

### Implementation

- Added strict evaluation profile, compiler/Agent capability lock, case-validation, run execution, batch input/result/review, metric, diagnostic-coverage, and checkpoint contracts with cross-field and digest validation.
- Added exclusive atomic JSON evidence publication, atomic context replacement, RTL before/after copies, append-only run states, conditional compile evidence, final RTL manifest validation, and last-write `final-result.json`.
- Added blank and seeded baseline rules: blank expects `NO_RTL_SOURCE` without compiler invocation; seeded repair requires an actual `COMPILE_ERROR`.
- Added a total-Agent-turn `maxAttempts` loop. Only R02 `RTL_CHANGED` reaches R03 preparation, and only R03 `COMPILE_ERROR` can start another Agent turn.
- Added explicit mappings for policy violation, no change, Agent process error/timeout, preparation failure, compiler timeout/tool error, capability drift, final-recompile inconsistency, and incomplete evidence/orchestration.
- Added all-fixtures-before-Agent batch preflight with Provider descriptor and implementation digest, expected case count/order, complete selected case refs, normalized fixture/run identities, and a self-validating batch manifest.
- Added overall and category metrics for raw/review-adjusted first attempt, within-max-attempts, and repair recovery; failure counts; medians; diagnostic coverage; invalid/not-executed cases; minimum denominators; and human-review-gated checkpoint assessment.
- Added a thin injected-dependency CLI for `run --profile --case` and `evaluate --profile`; standalone execution remains fail-closed until a repository/operator Provider and profile are registered.
- Added deterministic orchestration, batch, review, contract, and CLI tests plus a synthetic R04 integration that composes a fake Agent with the real fixed Icarus adapter.

### R02 Compatibility Hardening

- Kept the established fixed turn protocol but made effective isolation explicit with `autoupdate: false`, sharing/snapshot/formatter/LSP disabled, empty MCP/plugin/instructions, and existing deny-first permissions.
- Removed any fork/attach ambiguity from the locked argv tests.
- Reused R04's exclusive atomic evidence writer for `AgentTurnResult`.
- Official OpenCode `1.18.2` probe passed with:
  - model: `opencode/deepseek-v4-flash-free`
  - resolved config digest: `sha256:d5109770f13d6e9db609fe66bd161efcbf1cfba29ad269ed46c13cc710fc8d03`
  - resolved permission digest: `sha256:a208dd5b82acee15f30abadf90b64aca34edc8328a7470ceeb0c666706683814`
  - Agent digest: `sha256:df3b8e9b50c4a4288af26ae4c20ea8564f45fd830dbae36ebd0a6393f35eb40d`
  - Skill digest: `sha256:332d820382b10f5fcf90ae6d2f00d8a02e44385c7099dfbe1833137e75564655`
  - experiment digest: `sha256:5a98e3fdf4cedc9a4857c88bc22a2df3f9cdea4d8b1e007502ab1b92891cd310`
- The real allowed-edit and denied-write smoke tests both passed after this hardening.

### Validation

- `corepack pnpm install --frozen-lockfile`: passed.
- `corepack pnpm lint`, `typecheck`, `build`, `format:check`, and `peers check`: passed.
- focused R04 run/batch/CLI tests: 3 files and 27 tests passed.
- Core Loop ordinary tests: 12 files passed / 1 real-Agent-smoke file skipped; 88 tests passed / 2 skipped.
- thin CLI tests: 1 file and 5 tests passed.
- full repository tests: 26 files passed / 1 skipped; 194 tests passed / 2 skipped in three consecutive isolated runs after timeout hardening.
- real Icarus integration: 2 files and 6 tests passed, including seeded baseline, fake Agent repair, real compile, and independent real recompile.
- fixed CLI compile smoke: passed with expected `COMPILE_PASSED` and `COMPILE_ERROR` classifications.
- configured real OpenCode static probe: passed.
- configured real OpenCode live smoke: 1 file and 2 tests passed.
- unconfigured `core-loop:fixtures:check`: exited 2 with the required stable `DATASET_NOT_CONFIGURED` diagnostic.
- final `git diff --check` and Harness check: passed after the handoff update.

### Failure Found and Repaired

Running process-heavy package tests concurrently with typecheck and CLI tests caused unrelated five-second test timeouts and cleanup races. An isolated single-worker diagnostic passed, followed by successful documented package and full-suite runs. The fake late-child-write timing was moved outside the bounded shutdown window without changing production timeout semantics; the validation orchestration lesson is recorded in `docs/error-journal.md`.

A later isolated aggregate run still placed three unrelated filesystem/process-heavy tests just beyond Vitest's default five-second case timeout. The shared test harness now uses a finite 15-second case timeout while all production process deadlines remain unchanged. The full 194-test suite then passed three consecutive isolated runs.

### Windows Actions Format Repair

- The supplied `windows-latest` log failed only because Prettier saw CRLF in `eslint.config.mjs` and `prettier.config.mjs`; the Ubuntu job passed.
- `core.autocrlf=true` plus the missing `*.mjs` rule made the checkout platform-dependent. `.gitattributes` now forces LF for portable MJS configuration files.
- `git check-attr -a -- eslint.config.mjs prettier.config.mjs` reports `text: set` and `eol: lf`; local `corepack pnpm format:check` passes.
- GitHub CLI was unavailable on this host, so the historical run could not be queried directly. The supplied job log and the repository checkout attributes were sufficient to reproduce and correct the failure boundary.

### Evidence Limits and Next Step

- `docs/experiments/spec-to-rtl-core-loop-report.md` remains `NOT_EXECUTED` / `PENDING_REAL_BATCH`.
- Synthetic tests, real OpenCode smoke sessions, and the real-Icarus composition test are mechanics evidence only.
- No functional correctness, formal Gate, Linux readiness, dataset capability rate, or checkpoint recommendation is claimed.
- Resume by selecting and license-reviewing the real dataset/Provider, registering its locked evaluation profile, running the batch, completing the predeclared human review, and then recording exactly one checkpoint recommendation.

## Entry: R03 Fixed Non-Authoritative Compile Adapter

### Summary

Implemented R03 end to end. The Core Loop now prepares manifest-bound compile requests, rejects uncontrolled includes, probes and runs one fixed Icarus null-target profile, continuously drains bounded output, waits for confirmed close, detects workspace drift and returns strict non-authoritative compile-only results. The established R01/R02 behavior remains intact except for the two previously documented compatibility corrections.

### Implementation

- Added `CompilePreparationResult` with `READY`, `NO_RTL_SOURCE`, `UNSUPPORTED_INCLUDE_DIRECTIVE` and `SOURCE_POLICY_VIOLATION`.
- Added streaming include scanning, strict `.sv`/`.v` discovery, ordinal ordering and compiler-boundary filesystem revalidation.
- Added immutable `iverilog-systemverilog-2012-null-v1` mapping, exact-version capability probe, executable/profile digests and construction-time environment snapshot.
- Added fixed `-g2012 -tnull -s <top>` argv, `shell: false`, controlled cwd/environment, bounded Windows tree termination and close confirmation.
- Added raw-byte output accounting, streaming UTF-8 decoding, ANSI/control cleanup, logical path projection, host-path redaction and deterministic stderr-before-stdout issue parsing.
- Added status priority for version/spawn/internal/manifest/timeout/signal/design/unknown outcomes.
- Added thin CLI `compile-smoke` and independent non-skippable real-Icarus integration.

### R01 Compatibility Corrections

- `CompileResult.status === "TOOL_ERROR"` and `FinalResult.outcome === "TOOL_ERROR"` may use `toolVersion: null`; every other branch still requires a non-empty version.
- `CapturedOutput.originalByteLength` represents raw pipe bytes and no longer has to equal sanitized preview bytes when untruncated. Host-path rejection and preview limits remain strict.

### Locked Profile and Host Evidence

- host: Windows x64
- package: winget `Icarus.Verilog 12.2022.06.11`
- installer SHA-256: `a614057374dfaed5da0fe454cdeb410e54981fd85dbd28bd472f4ccb765deb84`
- executable: `C:\iverilog\bin\iverilog.exe`
- tool identity: `Icarus Verilog version 12.0 (devel) (s20150603-1539-g2693dd32b)`
- executable digest: `sha256:803b8844af2cc8ed70b5f08b07ffa749901280e81339617ca3e72cbbb852bd2b`
- profile digest: `sha256:a3d0eff6e8da8396e3e68398badfa6bf50614dff4181f8667a75f5477fd930b1`
- profile: `-g2012 -tnull -s`, one ordered compilation unit, includes forbidden
- limits: 30-second compile, 5-second probe, 500-millisecond termination grace, 64 KiB previews, 128 KiB retained capture, 100 issues, 2048-byte issue messages
- Windows environment: `ComSpec`, normalized `Path`, `SystemRoot`, `TEMP`, `TMP`

### Validation

- `corepack pnpm install --frozen-lockfile`: passed.
- `corepack pnpm lint`, `typecheck`, `build`, `format:check` and `peers check`: passed.
- Core Loop ordinary tests: 10 files passed / 1 real-Agent-smoke file skipped; 61 tests passed / 2 skipped.
- thin CLI tests: 1 file, 3 tests passed.
- full repository tests: 24 files passed / 1 skipped; 165 tests passed / 2 skipped.
- real Icarus integration: 1 file, 5 tests passed for valid multi-file, syntax error, missing top, blank source, elaboration error, null target and deterministic rerun.
- CLI compile smoke: returned `COMPILE_PASSED` and `COMPILE_ERROR`; the temporary run contained only spec and RTL inputs, with no VVP output.
- deterministic tests covered include boundaries, source policy, version/missing/spawn/signal/unknown failures, manifest drift, confirmed timeout, unconfirmed termination, continuous drain, UTF-8 chunking, status priority and path redaction.
- `git diff --check` and Harness check: passed after final handoff update.

### Failure Found and Repaired

The first minimal Windows environment passed `iverilog -V` but every real compile exited silently as `0xffffffff`. Controlled comparisons isolated `ComSpec` as required by this Windows build. It is now part of the frozen Windows allowlist, and all real integration cases pass.

### Known Limits and Next Step

- Windows tree termination is evidenced; real Linux Icarus execution and POSIX helper-tree termination were not run.
- Stable manifest scans are not an immutable snapshot. Every result remains `authoritative: false` and `claim: "COMPILE_ONLY"`.
- Synthetic mechanics inputs are not R04 evaluation evidence.
- R04 may compose R02 and R03 only after a reviewed dataset/provider and evaluation profile are selected, and may continue Agent repair only for `COMPILE_ERROR`.

## Entry: R03 Compile Adapter Specification Revision

### Summary

Revised R03 after review and froze it as a non-authoritative Icarus null-target compile/elaboration profile. The new specification binds compiler inputs, forbids uncontrolled includes, detects mutable-workspace drift, fixes process/output/status semantics and limits compatibility work to two proven R01 schema contradictions. R03 implementation remains `NOT_STARTED`.

### Files Created or Updated

- `docs/tasks/R03-fixed-non-authoritative-compile-adapter.md`
- `docs/tasks/R04-bounded-repair-loop-and-evaluation.md`
- `docs/tasks/R01-core-loop-contract-and-fixtures.md`
- `docs/task-breakdown.md`
- `docs/decisions.md`
- `docs/verification.md`
- `current-task.md`
- `.harness/session-state.json`
- `.harness/session-log.md`

### Main Decisions

- Use `iverilog-systemverilog-2012-null-v1` with fixed `-g2012 -tnull -s <top>` and no VVP output.
- Reject non-comment `` `include`` directives through an additive `CompilePreparationResult`; do not modify the existing Core Loop error envelope.
- Reuse the R01 baseline workspace manifest scope and require stable matching scans before and after compile.
- Continuously drain stdout/stderr, count raw bytes, wait for `close` and fail closed when termination cannot be confirmed.
- Allow `toolVersion: null` only for tool-error compile/final results, and remove the invalid equality requirement between raw output length and sanitized preview length.
- Preserve all other R01/R02 workspace, Agent, permission, process and evidence behavior.

### Validation

- Markdown code-fence balance: passed for all changed documents.
- Stale R03 profile/argv scan: only the explicitly documented R01 syntax-test placeholder remains.
- `git diff --check`: passed.
- `corepack pnpm format:check`: passed.
- `C:\Program Files\Git\bin\bash.exe scripts/harness_check.sh`: passed.

### Known Issues / Risks

- No production schema or adapter code was changed; the documented R01 compatibility patch is the first R03 implementation step.
- Real Icarus probe/integration/smoke was not run because R03 implementation remains `NOT_STARTED`.
- Stable manifest scans detect change but do not provide an immutable snapshot or authoritative Gate evidence.

### Next Steps

1. Implement and regression-test the narrow R01 schema compatibility patch.
2. Install/probe the real Icarus executable and freeze the exact profile mapping.
3. Implement preparation, include scanning, manifest validation and the bounded process adapter.

## Entry: Harness Initialization

### Summary

Initialized the Standard Project Harness structure for an otherwise empty repository.

### Files Created or Updated

- `AGENTS.md`
- `current-task.md`
- `docs/*`
- `.harness/*`
- `skills/*/SKILL.md`
- `scripts/*`

### Validation

- `bash scripts/harness_check.sh`: passed using Git for Windows Bash at `C:\Program Files\Git\bin\bash.exe` because `bash` was not on the PowerShell `PATH`.
- `scripts/safe_bash_guard.sh "git status --short"`: passed.
- `scripts/safe_bash_guard.sh "git reset --hard"`: blocked as expected.

### Known Issues / Risks

- The repository does not yet contain project-specific build, test, lint, simulation, or synthesis tooling.
- On this workstation, invoke the shell scripts through Git for Windows Bash unless `bash` is added to `PATH`.

### Next Steps

1. Run `/start` in the next agent session.
2. Define the first engineering task with `/plan`.
3. Add project validation commands to `docs/verification.md` when build, test, or RTL tooling exists.

## Entry: High-Level Design Review

### Summary

Reviewed the 20-page `OpenCode LangGraph RTL Agent High Level Design.pdf`. The proposed separation among OpenCode, LangGraph, and deterministic Checkers is sound, but the formal gate is not yet atomic with the mutable workspace.

### Files Created or Updated

- `02_output/opencode-langgraph-rtl-agent-high-level-design-review.md`
- `current-task.md`
- `.harness/session-state.json`
- `.harness/session-log.md`

### Review Result

- BLOCKER: 1 — `workflow_complete_stage` checks a mutable workspace and does not close the TOCTOU/crash-consistency boundary.
- MAJOR: 7 — source-of-truth ambiguity, incomplete Git/worktree boundary, unfrozen verification assets, undefined deterministic failure routing, insufficient runner reproducibility, overly broad debug permissions, and incomplete version constraints.
- Recommendation: approve Phase A only; close the blocker and core major findings before treating Phase B as a trusted quality gate.

### Validation

- PDF extraction: 20 pages read successfully with PyMuPDF.
- Official documentation checks: OpenCode MCP/permissions/agents, LangGraph persistence/interrupts/security advisory, and MCP Python SDK release status.
- Digest narration-marker scan: no unwanted markers or stale wikilinks found.
- `C:\Program Files\Git\bin\bash.exe scripts/harness_check.sh`: passed.
- `.harness/session-state.json` parse check: passed.

### Known Issues / Risks

- No RTL workflow implementation exists, so code-level validation was not possible.
- The intended threat model and Oracle ownership remain design questions.

### Next Steps

1. Document the trust/threat model.
2. Revise the design to use immutable gate snapshots and frozen verification manifests.
3. Encode state transitions, issue routing, concurrency, and crash recovery as executable tests.

## Entry: Final High-Level Design

### Summary

Produced a replacement implementation baseline for the RTL Agent. The design removes LangGraph, uses a TypeScript transactional workflow core, runs formal gates against immutable snapshots, freezes verification assets before RTL implementation, and keeps Python as an optional stateless EDA worker. Langfuse receives asynchronous OpenCode and workflow telemetry but is never an authoritative state source.

### Files Created or Updated

- `02_output/rtl-agent-final-high-level-design.md`
- `docs/architecture.md`
- `docs/decisions.md`
- `current-task.md`
- `.harness/session-state.json`
- `.harness/session-log.md`

### Main Decisions

- Remove LangGraph from the implementation baseline.
- Use SQLite initially and preserve a transaction/repository boundary for Postgres migration.
- Replace synchronous complete-stage calls with asynchronous snapshot-bound gate jobs and server-side automatic routing.
- Require a frozen verification manifest and re-approval after TB/Oracle/SVA or gate-profile changes.
- Use Langfuse for traces, scores, and experiments only; infrastructure health remains in conventional monitoring.

### Validation

- Final-HLD style-marker scan: passed with no matches.
- Markdown code-fence balance check: passed.
- `.harness/session-state.json` parse check: passed.
- Architecture decision presence check: passed.
- `C:\Program Files\Git\bin\bash.exe scripts/harness_check.sh`: passed.

### Known Issues / Risks

- No application code or package manifests exist, so the design has not been validated by a vertical implementation spike.
- Container/runtime selection and Langfuse deployment mode remain open deployment choices.

### Next Steps

1. Scaffold the TypeScript monorepo and pin stable SDK versions.
2. Implement the domain state machine, transition table, event log, and idempotency behavior.
3. Implement immutable snapshot creation and crash/concurrency tests before the first trusted gate.

## Entry: Final HLD Boundary Revision

### Summary

Revised the formal HLD using the accepted design recommendations. The Workflow Daemon now outlives OpenCode sessions, Agents cannot submit human review decisions, gate identity is split into content/input/run/result, Gate Workers return results through a single Command Executor, and Langfuse defaults to metadata-only. The formal HLD was moved from `02_output/` to `docs/`.

### Files Created, Moved, or Updated

- moved `02_output/rtl-agent-final-high-level-design.md` to `docs/rtl-agent-high-level-design.md`
- `docs/architecture.md`
- `docs/decisions.md`
- `current-task.md`
- `.harness/session-state.json`
- `.harness/session-log.md`

### Main Decisions

- Use a persistent loopback Remote MCP Workflow Daemon, with an optional stateless stdio proxy only as a fallback.
- Expose `workflow_request_review` to Agents; submit decisions only through a user CLI or authenticated interface.
- Use `snapshot_digest`, `gate_input_digest`, `gate_run_id`, and `gate_result_digest` for distinct identities.
- Store stale Worker results as `superseded` without routing the task.
- Use local SQLite WAL with one Command Executor, short transactions, and `synchronous=FULL` by default.
- Disable full-session OpenCode telemetry by default; Phase A/B use local structured logs and Phase D adds metadata-only Langfuse.

### Validation

- Revised-HLD style scan: passed.
- Stale-reference and obsolete-interface scan: passed after excluding the validation command itself from its search scope.
- Markdown code-fence balance: passed with 12 markers.
- Required architecture-boundary scan: passed.
- `.harness/session-state.json` parse check: passed.
- `C:\Program Files\Git\bin\bash.exe scripts/harness_check.sh`: passed.

### Known Issues / Risks

- No implementation exists to validate Remote MCP daemon startup, review CLI UX, or SQLite throughput.
- Multi-user review authentication and remote Worker deployment remain later-phase work.

### Next Steps

1. Scaffold the daemon and user CLI.
2. Implement the state machine, review boundary, and single database writer.
3. Implement SnapshotStore plus superseded-result crash and concurrency tests.

## Entry: Ordered Implementation Task Breakdown

### Summary

Converted the final HLD into an ordered implementation plan in `docs/task-breakdown.md`. The plan defines 40 tasks: 11 for the durable control plane, 11 for the trusted Compile Gate, 8 for the RTL verification loop, 5 for observability and hardening, and 5 trigger-based scale tasks.

### Files Created or Updated

- `docs/task-breakdown.md`
- `docs/architecture.md`
- `current-task.md`
- `.harness/session-state.json`
- `.harness/session-log.md`

### Planning Decisions

- Phase A and Phase B execute strictly in order.
- Contracts and the pure domain state machine precede SQLite, daemon, MCP, and EDA work.
- Human review is implemented before the first formal Gate.
- Snapshot and identity work precede queueing and Compile Runner work.
- Full CAS, generic Python plugins, full-session telemetry, and scale features remain outside Phase A/B.
- M1, M2, M3, and M4 define explicit capability claims and stopping points.

### Validation

- Task ID and ordering scan: passed with 40 unique sequential IDs.
- Task-reference validation: passed; every referenced task ID exists.
- Stale-reference scan: passed.
- Markdown code-fence balance: passed.
- `.harness/session-state.json` parse check: passed.
- `C:\Program Files\Git\bin\bash.exe scripts/harness_check.sh`: passed.

### Known Issues / Risks

- Package-level validation commands remain planned until A01 creates actual manifests and scripts.
- No effort estimates are included because team capacity and implementation constraints are not yet evidenced.

### Next Steps

1. Execute A01 only.
2. Record the real package commands in `docs/verification.md`.
3. Continue sequentially to A02 after A01 validation passes.

## Entry: Windows Development / Linux Runtime Constraints

### Summary

Added repository-wide portability rules for a Windows development host and Linux production/formal-Gate runtime. Logical paths use `/`, filesystem access uses `node:path`, business logic spawns executable/argv with `shell: false`, and non-Linux formal Gates return `LINUX_GATE_REQUIRED`. Added `.gitattributes` for enforceable line endings and binary classification.

### Files Created or Updated

- `AGENTS.md`
- `.gitattributes`
- `docs/coding-guidelines.md`
- `docs/verification.md`
- `docs/task-breakdown.md`
- `docs/decisions.md`
- `current-task.md`
- `.harness/session-state.json`
- `.harness/session-log.md`

### Main Constraints

- Manifest and protocol paths are relative POSIX-style logical paths.
- Host filesystem paths are created only at validated boundaries using `node:path`.
- Business logic cannot depend on Bash, PowerShell, cmd, pipelines, or shell strings.
- Control-plane and Preflight validation run on Windows and Linux.
- Formal EDA Gates may be Linux-only but must reject other hosts explicitly.
- Portable files use LF; Windows batch files use CRLF; waveform and database files are binary.

### Validation

- Representative `git check-attr`: passed for LF, CRLF, and binary files.
- Cross-platform constraint presence scan: passed.
- Forbidden shell-spawn example scan: passed.
- `.harness/session-state.json` parse check: passed.
- `C:\Program Files\Git\bin\bash.exe scripts/harness_check.sh`: passed.

### Known Issues / Risks

- CI and project package commands do not exist until A01.
- Existing untracked files were not bulk-normalized.

### Next Steps

1. Implement the CI matrix in A01.
2. Add logical-path utilities and tests in A02.
3. Add Linux-only Gate rejection tests in B07.

## Entry: A01-A05 Implementation Specifications

### Summary

Created one implementation-ready document for each of A01 through A05. The task breakdown remains the sole progress source and now links to the detailed specifications with status and evidence placeholders. No TypeScript workspace or business logic was implemented, so all five implementation tasks remain `NOT_STARTED`.

### Files Created or Updated

- `docs/tasks/A01-typescript-workspace.md`
- `docs/tasks/A02-contracts-and-errors.md`
- `docs/tasks/A03-domain-state-machine.md`
- `docs/tasks/A04-sqlite-storage.md`
- `docs/tasks/A05-command-executor.md`
- `docs/task-breakdown.md`
- `docs/decisions.md`
- `current-task.md`
- `.harness/session-state.json`
- `.harness/session-log.md`

### Implementation Decisions

- A01 uses Node.js 24 LTS, pnpm workspaces, native ESM, TypeScript strict/project references, ESLint, Prettier, and Vitest; exact tool versions are resolved and locked when A01 executes.
- A02 defines strict Zod contracts, logical POSIX paths, canonical JSON, command/event envelopes, stable errors, and idempotent command results.
- A03 keeps command decisions and event replay pure, with one state-version increment per successful command batch.
- A04 targets `better-sqlite3@12.10.0` subject to Windows/Linux compatibility tests; Node 24 `node:sqlite` was deferred while documented at release-candidate stability.
- A05 creates an `application` package for the single FIFO Command Executor so domain purity and storage adapter boundaries remain intact.

### Validation

- Five-file count, required-heading, and Markdown code-fence check: passed.
- Breakdown implementation-link target check: passed for all five documents.
- `git diff --check`: passed after removing Markdown trailing whitespace.
- `.harness/session-state.json` parse: passed.
- `C:\Program Files\Git\bin\bash.exe scripts/harness_check.sh`: passed.

The first two authoring-check attempts failed because the temporary PowerShell validation script used an unsupported `-Filter` character class and then joined a link target from the wrong base directory. Both checks were corrected; neither indicated a repository defect.

### Known Issues / Risks

- Exact non-MCP dependency patch versions remain intentionally unresolved until A01 creates the lockfile.
- `better-sqlite3` is a native dependency; A04 cannot complete without Windows/Linux install and runtime evidence.
- Linux CI cannot exist until A01 scaffolds it.

### Next Steps

1. Execute A01 using `docs/tasks/A01-typescript-workspace.md`.
2. Record the real package commands and Windows/Linux CI evidence.
3. Mark A01 `DONE` only after validation, then begin A02.

## Entry: Defer Linux Evidence for A01-A05

### Summary

Adjusted the first five implementation tasks so Windows validation evidence is sufficient for their current `DONE` decisions. Linux portability remains mandatory, Linux validation entry points remain in the design, and no production Linux readiness may be claimed until the deferred suite runs.

### Files Updated

- `AGENTS.md`
- `docs/tasks/A01-typescript-workspace.md`
- `docs/tasks/A02-contracts-and-errors.md`
- `docs/tasks/A03-domain-state-machine.md`
- `docs/tasks/A04-sqlite-storage.md`
- `docs/tasks/A05-command-executor.md`
- `docs/task-breakdown.md`
- `docs/verification.md`
- `docs/decisions.md`
- `current-task.md`
- `.harness/session-state.json`
- `.harness/session-log.md`

### Policy Result

- A01–A05 retain Windows/Linux-portable paths, shell-free process handling, LF policy, platform-neutral contracts, and future Linux CI entry points.
- Windows lint/typecheck/test/build and task-specific integration evidence are sufficient for current completion.
- A01 keeps a Windows/Linux CI matrix configuration, but a successful Linux job is not currently required.
- A04 may complete using Windows `better-sqlite3` install/runtime and file-backed SQLite evidence; Linux native-module and real mount behavior are deferred.
- B07 and B11 still require Linux formal Compile Gate evidence and explicit Windows `LINUX_GATE_REQUIRED` behavior.

### Validation

- Exactly one temporary platform-policy section exists in each A01–A05 document: passed.
- Stale A01/A04 Linux-blocking wording scan: passed.
- B07 `LINUX_GATE_REQUIRED` and B11 Linux Compile Gate evidence preservation checks: passed.
- Markdown code-fence checks for all five task documents: passed.
- `git diff --check`: passed.
- `.harness/session-state.json` parse: passed.
- `C:\Program Files\Git\bin\bash.exe scripts/harness_check.sh`: passed.

### Known Risks

- Windows-only evidence does not cover case sensitivity, symlink behavior, executable bits, Linux native modules, or Linux filesystem/mount semantics.
- These risks remain accepted only for A01–A05 development progress and must be closed before production Linux readiness.

### Next Steps

1. Execute A01 on Windows using the revised specification.
2. Record Windows evidence in `docs/task-breakdown.md` and the Session Log.
3. Add Linux execution evidence later before claiming production readiness or a trusted formal Gate.

## Entry: A01 TypeScript Workspace and Quality Baseline

### Summary

Executed A01 and created the minimal pnpm TypeScript monorepo without adding business logic. The workspace now contains two private apps, three library packages, strict TypeScript project references, separate no-emit test typechecking, Vitest, ESLint, Prettier, exact dependency versions, and a Windows/ advisory-Linux GitHub Actions matrix.

### Files Created or Updated

- root workspace: `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`
- runtime/tool policy: `.node-version`, `.gitignore`, `.prettierignore`
- TypeScript: `tsconfig.base.json`, `tsconfig.json`, `tsconfig.test.json`
- quality tools: `eslint.config.mjs`, `prettier.config.mjs`, `vitest.config.ts`
- CI: `.github/workflows/ci.yml`
- apps: `apps/workflow-daemon/**`, `apps/workflow-cli/**`
- libraries: `packages/contracts/**`, `packages/domain/**`, `packages/storage/**`
- documentation and handoff files

### Locked Baseline

- Node.js `24.15.0`
- Corepack `0.34.6`
- pnpm `11.13.0`
- TypeScript `6.0.3`
- ESLint `10.7.0`
- typescript-eslint `8.64.0`
- Prettier `3.9.5`
- Vitest `4.1.10`
- `@types/node` `24.13.3`
- `@modelcontextprotocol/sdk` `1.29.0`, owned by `workflow-daemon`

The initial registry resolution selected TypeScript `7.0.2`, which violated typescript-eslint's `<6.1.0` peer range. It was replaced with the latest compatible TypeScript `6.0.3`; `pnpm peers check` then passed.

### Validation

- Removed the verified workspace `node_modules` directory and restored it with `corepack pnpm install --frozen-lockfile`: passed.
- `corepack pnpm lint`: passed.
- `corepack pnpm typecheck`: passed for source project references and no-emit tests.
- `corepack pnpm test`: 1 file, 1 test passed.
- `corepack pnpm build`: passed.
- `corepack pnpm format:check`: passed.
- `corepack pnpm clean`: passed before the final rebuild.
- `corepack pnpm peers check`: no peer issues.
- Temporary TypeScript error caused `typecheck` to fail as expected, then was removed.
- Temporary wrong assertion caused Vitest to fail as expected, then was removed.
- Exact dependency, library/app manifest, test-output, shell-policy, Git attribute, and `git diff --check` structural checks: passed.
- `C:\Program Files\Git\bin\bash.exe scripts/harness_check.sh`: final result recorded after handoff update.

### Known Issues / Risks

- Linux GitHub Actions is configured as advisory and was not executed as A01 completion evidence.
- pnpm reports deprecated transitive `glob@10.5.0`; it is not a direct dependency and did not produce peer or validation failures.
- No production/Linux readiness claim is made from the Windows-only evidence.

### Next Steps

1. Execute A02 from `docs/tasks/A02-contracts-and-errors.md`.
2. Add Zod contracts and logical-path tests inside the existing package boundaries.
3. Preserve the unified commands and record A02 validation before starting A03.

## Entry: A02 Cross-Layer Contracts and Stable Errors

### Summary

Implemented schema version 1 in `@rtl-agent/contracts`. The package now owns strict Zod contracts for task, stage/status, actor, review, command, event, command result, and stable errors; branded identifiers and logical paths; canonical UTC millisecond timestamps; RFC 8785 JCS; and two-stage command/event boundary parsers. No command decision, event projection, storage, MCP, or filesystem behavior was added.

### Files Created or Updated

- `packages/contracts/src/{actor,command,error,event,identifiers,json,parse,paths,result,review,task,version}.ts`
- `packages/contracts/src/index.ts`
- `packages/contracts/test/*.test.ts`, `packages/contracts/test/fixtures.ts`
- `packages/contracts/package.json`, `pnpm-lock.yaml`, `tsconfig.test.json`
- `docs/tasks/A02-contracts-and-errors.md`
- `docs/tasks/A03-domain-state-machine.md`
- `docs/tasks/A04-sqlite-storage.md`
- `docs/tasks/A05-command-executor.md`
- `docs/rtl-agent-high-level-design.md`
- `docs/architecture.md`, `docs/decisions.md`, `docs/error-journal.md`, `docs/task-breakdown.md`
- `current-task.md`, `.harness/session-state.json`, `.harness/session-log.md`

### Contract Decisions

- Pinned `zod@4.4.3` as the contracts package's only runtime dependency.
- Canonical JSON follows RFC 8785 JCS: UTF-16 code-unit property ordering, ECMAScript primitive serialization, I-JSON values, no Unicode normalization, and UTF-8 hash input.
- `IsoTimestamp` is exactly `YYYY-MM-DDTHH:mm:ss.sssZ` and must round-trip through `toISOString()`.
- `LogicalPath` rejects traversal, host/absolute syntax, Windows reserved characters and device names, ambiguous spaces/dots, invalid Unicode, segments over 255 UTF-8 bytes, and paths over 1024 UTF-8 bytes.
- Review binding is a strict union by review type. Phase A Spec Approval uses `specDigest`; later reviews require snapshot plus gate/manifest identity.
- `VERIFICATION_CHALLENGE` remains an HLD-approved Stage.
- `CommandSuccess.events` remains the event-batch carrier and validates a single atomic batch; no second persisted EventBatch envelope was introduced.
- Error bodies are discriminated by code with fixed retryability, bounded messages/issues, and strict detail allowlists. `INTERNAL_ERROR` has a fixed public message and no details.
- `parseCommandEnvelope` and `parseEventEnvelope` classify unsupported versions and unknown discriminators before strict schema validation, then return stable bounded validation issues rather than raw Zod issues.

### Public API

All public schemas, inferred types, constants, `canonicalizeJsonJcs`/`canonicalizeJson`, `parseCommandEnvelope`, and `parseEventEnvelope` are exported through `packages/contracts/src/index.ts`. Internal plain-object, surrogate, UTF-8-length, and path-reason helpers are not re-exported.

### Validation

- `corepack pnpm install --frozen-lockfile`: passed; lockfile current and supply-chain policy passed.
- `corepack pnpm lint`: passed.
- `corepack pnpm typecheck`: passed for source projects and all test helpers/tests.
- `corepack pnpm --filter @rtl-agent/contracts --fail-if-no-match test`: 7 files, 70 tests passed.
- `corepack pnpm test`: 7 files, 70 tests passed.
- `corepack pnpm build`: passed; generated declarations preserve required code-specific error details.
- `corepack pnpm format:check`: passed.
- `corepack pnpm peers check`: no peer issues.
- Contracts dependency/API scan for Node FS/path/process/child process, MCP, and SQLite imports: no matches.
- `git diff --check`: passed.
- `C:\Program Files\Git\bin\bash.exe scripts/harness_check.sh`: passed before the final handoff update and rerun as the final handoff check.

### Failures Found and Repaired

- The original A02 `pnpm test --filter` command passed `--filter` to Vitest. The package-scoped command and script were corrected.
- Two package-script path attempts found no tests or resolved the config outside the repository. The stable root/filter form is recorded in `docs/error-journal.md`.
- The first JCS negative suite exposed a missed trailing high surrogate because `charCodeAt` returned `NaN`; the Unicode validator now rejects it.
- Stable issue mapping initially classified a missing literal as `INVALID_VALUE` because Zod uses that code for missing literals; mapping now checks field presence and returns `REQUIRED`.
- Generated declarations initially inferred error details as optional due to a conditional object spread; the helper was corrected and a compile-time regression test now requires details for `STATE_VERSION_CONFLICT`.
- The guarded commit review found that sparse arrays and arrays with extra/accessor properties collapsed to the same JCS text as ordinary arrays. Array serialization now requires dense indexed enumerable data properties and rejects named, symbol, accessor, and non-enumerable structure.

### Known Issues / Risks

- Linux execution remains deferred under the active A01–A05 evidence exception; no production Linux readiness claim is made.
- A09 must compute `specDigest` at the trusted bound-workspace boundary rather than accepting an Agent-provided digest as authoritative.
- Review-type-specific allowed-decision subsets remain later domain policy; A02 enforces only the stable enum, uniqueness, and 1–3 item capacity.

### Next Steps

1. Execute A03 using schema version 1 and the exported branded types.
2. Implement pure `decide`, `evolveBatch`, and replay with the existing atomic batch invariants.
3. Keep Spec Approval bound to `specDigest` and fail closed for the Phase B/C review variants not yet supported by A03.

## Entry: A03 Pure Domain State Machine

### Summary

Implemented the Phase A state machine in `@rtl-agent/domain`. The public API is pure and batch-only: `decide` emits a domain-local non-empty event batch, `evolveBatch` is the only projection entry point, and `replay` consumes ordered command batches. No database, filesystem, process, clock, random, MCP, network, or logging behavior was added.

### Files Created or Updated

- `packages/domain/src/{result,errors,state,transition-table,state-invariants,decide,evolve,replay}.ts`
- `packages/domain/src/index.ts`, `packages/domain/package.json`
- `packages/domain/test/*.test.ts`, `packages/domain/test/fixtures.ts`
- `docs/tasks/A03-domain-state-machine.md`
- `docs/tasks/A04-sqlite-storage.md`, `docs/tasks/A05-command-executor.md`
- `docs/architecture.md`, `docs/decisions.md`, `docs/task-breakdown.md`
- `current-task.md`, `.harness/session-state.json`, `.harness/session-log.md`

### Domain Decisions

- Kept A02 `EventEnvelope[]` as the wire batch carrier and used a domain-local tuple type; no persisted EventBatch envelope was added.
- Introduced `DomainState`, which pairs the task projection with the complete current pending review so `decide` remains pure after restart.
- Required the exact three-decision Spec Approval policy and an explicit actor matrix.
- Split intrinsic state invariants from previous/next transition invariants.
- Added internal integrity codes for invalid state, transition, batch, sequence, and decision context; these are not new A02 external error codes.
- Used version/index/task/command/event identity for ordering and integrity. Time is audit/context data with a non-regression check.
- Phase A permits exactly one event per command while retaining batch-aware APIs; unplanned multi-event sequences fail closed.

### Test Coverage

- Executable policy covered all 48 Stage × Status combinations for all three Phase A command discriminators.
- Covered all three review decisions, all three known-but-unsupported review types, actor-policy failures, exact allowed-decision policy, task/review/version binding mismatches, old/new expected versions, unknown runtime command/event values, and context ID/time failures.
- Covered empty/oversized/mixed/duplicate/gapped batches, unsupported multi-event sequences, cross-batch version/task/time continuity, full-stream duplicate command/event IDs, deterministic replay, deep-frozen input immutability, and state/transition invariant separation.

### Validation

- `corepack pnpm install --frozen-lockfile`: passed; workspace already current.
- `corepack pnpm lint`: passed.
- `corepack pnpm typecheck`: passed.
- `corepack pnpm --filter @rtl-agent/domain --fail-if-no-match test`: 6 files, 31 tests passed.
- `corepack pnpm test`: 13 files, 101 tests passed.
- `corepack pnpm build`: passed.
- `corepack pnpm format:check`: passed.
- `corepack pnpm peers check`: no peer issues.
- Domain dependency/side-effect scan: no matches.
- `git diff --check`: passed.
- `C:\Program Files\Git\bin\bash.exe scripts/harness_check.sh`: passed before the final handoff update and rerun after it.

### Failures Found and Repaired

- The first test typecheck assigned an unbranded numeric fixture to `StateVersion`; the corruption fixture now uses an explicit branded test cast.
- The first full format check found three unformatted test files; Prettier corrected them before the final validation run.

### Known Issues / Risks

- Linux execution remains deferred under the active A01–A05 evidence exception; no production Linux readiness claim is made.
- A04 must add request actor columns to the review projection and assemble task plus pending review into `DomainState` in one transaction.
- A05 must write review projection changes atomically and map internal DomainError integrity codes to a safe `INTERNAL_ERROR` response.
- Later multi-event commands must explicitly extend domain event-sequence policy.

### Next Steps

1. Execute A04 from the revised SQLite specification.
2. Persist enough task/review data to reconstruct `DomainState` after restart.
3. Read workflow events in command batches and prove strict A03 replay from stored rows.

## Entry: P01-P04 Spec-to-RTL Prototype Task Design

### Summary

Inserted a non-authoritative Prototype checkpoint after A03 and wrote implementation-ready specifications for P01 through P04. The new route tests Spec → RTL generation, fixed Icarus compile/elaboration, compiler-error feedback, bounded Agent repair, and batch evaluation before more durable control-plane work. A04 and the trusted HLD remain intact but are deferred until P04 and an explicit user decision.

### Files Created

- `docs/tasks/P01-prototype-contract-and-fixtures.md`
- `docs/tasks/P02-opencode-rtl-agent-protocol.md`
- `docs/tasks/P03-fixed-non-authoritative-compile-adapter.md`
- `docs/tasks/P04-bounded-repair-loop-and-evaluation.md`

### Files Updated

- `docs/task-breakdown.md`
- `docs/architecture.md`
- `docs/verification.md`
- `docs/decisions.md`
- `docs/tasks/A04-sqlite-storage.md`
- `current-task.md`
- `.harness/session-state.json`
- `.harness/session-log.md`

### Design Decisions

- Execute P01, then P02 and P03 independently or in parallel, then converge in P04.
- Materialize every canonical fixture into a fresh ignored run workspace; Agent writes are limited to `workspace/rtl/**` and checked again with before/after manifests.
- Use project-local OpenCode Agent/Skill configuration and `opencode run --format json` through fixed executable/argv with `shell: false`; lock the actual OpenCode/model version during P02.
- Use profile ID `iverilog-systemverilog-2012-v1`; lock the actual installed Icarus release during P03 rather than inventing an unverified version.
- Mark every Prototype result `authoritative: false` and `claim: "COMPILE_ONLY"`. Compile pass never means functional correctness or trusted Gate success.
- Limit P04 to three Agent attempts, continue only after `COMPILE_ERROR`, independently recompile every final pass, and evaluate at least six fixtures.
- P04 ends with `PROCEED_TO_FUNCTIONAL_VALIDATION`, `REFINE_PROTOTYPE_ONCE`, or `STOP_OR_RETHINK`, then waits for user direction.

### Validation

- Four-file required-heading scan: each document has all 8 required task-spec headings.
- Task ID scan: exactly P01, P02, P03, and P04, all unique.
- Breakdown link target check: all four implementation documents exist.
- Markdown code-fence check: each document has 12 fence markers and is balanced.
- `.harness/session-state.json` parse: passed.
- `corepack pnpm format:check`: passed.
- `git diff --check`: passed after removing one trailing-space pair from the updated breakdown status line.
- `C:\Program Files\Git\bin\bash.exe scripts/harness_check.sh`: passed; rerun after final handoff evidence update.

### Known Issues / Risks

- `opencode`, `iverilog`, and `verilator` were not found on the current host. P02/P03 must install/probe real tools and lock actual versions before they can be `DONE`.
- OpenCode CLI/config surfaces are version-sensitive; P02 requires a capability probe against current official interfaces.
- The Prototype reads a mutable per-run workspace and retains only local ignored evidence. It cannot replace immutable snapshot, review, job, Linux Gate, or result-ingestion work.
- Compile/elaboration success does not prove the RTL meets the specification. If P04 succeeds, fixed TB/simulation is the expected next capability decision.

### Next Steps

1. Execute P01 only from `docs/tasks/P01-prototype-contract-and-fixtures.md`.
2. After P01 validation, execute P02 and P03 using the shared Prototype contract.
3. Execute P04 only after both a real OpenCode turn and real Icarus compile evidence exist.

## Entry: Stable Spec-to-RTL Core Loop Naming

### Summary

Replaced the lifecycle-oriented Prototype/P01–P04 naming in all active planning and handoff documents. The capability now has a stable name intended to survive later fixed-TB, simulation, and repair improvements: Spec-to-RTL Core Loop with tasks R01–R04.

The preceding Session Log entry is preserved as historical evidence of the original authoring step, including its then-current filenames. Active documents and links now use only the stable names.

### Naming Result

- phase/capability: `Spec-to-RTL Core Loop`
- tasks: `R01` → (`R02` || `R03`) → `R04`
- application/package: `apps/rtl-core-loop`, `@rtl-agent/rtl-core-loop`
- OpenCode Agent/Skill: `rtl-core-loop`
- CLI: `rtl-agent run`, `rtl-agent evaluate`
- canonical fixtures: `core-loop/fixtures/**`
- local runs/evidence: `.rtl-agent/runs/**`
- result types: `RtlCompileStatus`, `RtlRunOutcome`, and other `Rtl*` names
- evaluation suite/report: `core-loop-v1`, `docs/experiments/spec-to-rtl-core-loop-report.md`

Non-authoritative behavior remains expressed by `authoritative: false` and `claim: "COMPILE_ONLY"`; it is not encoded in the capability name.

### Files Renamed

- `docs/tasks/P01-prototype-contract-and-fixtures.md` → `docs/tasks/R01-core-loop-contract-and-fixtures.md`
- `docs/tasks/P02-opencode-rtl-agent-protocol.md` → `docs/tasks/R02-opencode-rtl-agent-protocol.md`
- `docs/tasks/P03-fixed-non-authoritative-compile-adapter.md` → `docs/tasks/R03-fixed-non-authoritative-compile-adapter.md`
- `docs/tasks/P04-bounded-repair-loop-and-evaluation.md` → `docs/tasks/R04-bounded-repair-loop-and-evaluation.md`

### Files Updated

- `docs/task-breakdown.md`
- `docs/architecture.md`
- `docs/verification.md`
- `docs/decisions.md`
- `docs/tasks/A04-sqlite-storage.md`
- `current-task.md`
- `.harness/session-state.json`
- `.harness/session-log.md`

### Validation

- Active stale-name scan: passed; no lifecycle-oriented names or legacy task IDs remain outside historical Session Log entries.
- Old task-file absence and R01–R04 breakdown link targets: passed.
- Required-heading/code-fence check: all four documents have 8 required headings and 12 balanced fence markers.
- Task ID scan: exactly R01, R02, R03, and R04, all unique.
- Stable package/CLI/type/suite/report/run-path presence scan: passed.
- `.harness/session-state.json` parse: passed.
- `corepack pnpm format:check`: passed.
- `git diff --check`: passed.
- `C:\Program Files\Git\bin\bash.exe scripts/harness_check.sh`: passed; rerun after final evidence update.

### Next Steps

1. Execute R01 from `docs/tasks/R01-core-loop-contract-and-fixtures.md`.
2. Preserve the stable names when adding implementation files.
3. Express future trust upgrades through contracts/layers rather than renaming the Core Loop.

## Entry: Dataset-Backed Fixture Boundary

### Summary

Removed the requirement to design and commit concrete Core Loop fixtures during R01. Fixture now means the normalized internal representation produced from an external evaluation dataset. R01 reserves the location and provider/materialize contract; dataset selection, download, license review, adapter implementation, and concrete cases are deferred until evaluation preparation.

### Design Changes

- Added `FixtureProvider`, `DatasetDescriptor`, `DatasetSelection`, `FixtureCaseRef`, `NormalizedFixture`, and dataset provenance responsibilities to R01.
- Reserved `core-loop/fixtures/README.md`; R01 does not ship a fixture catalog or evaluation dataset.
- Required dataset ID/version/split/case ID/source digest/license reference and adapter version to participate in evaluation evidence.
- Required hidden tests/reference answers to remain outside the Agent workspace.
- R01–R03 mechanics tests use temporary generated inputs that are cleaned up and cannot count as evaluation evidence.
- R04 no longer hard-codes six fixtures, a 5/6 pass target, or a built-in suite. Dataset selection, case count, category coverage, sampling, and success thresholds must be declared in a versioned evaluation profile before the batch runs.
- Missing dataset/provider configuration fails closed rather than falling back to bundled samples or downloading a floating latest dataset.

### Files Updated

- `docs/tasks/R01-core-loop-contract-and-fixtures.md`
- `docs/tasks/R02-opencode-rtl-agent-protocol.md`
- `docs/tasks/R03-fixed-non-authoritative-compile-adapter.md`
- `docs/tasks/R04-bounded-repair-loop-and-evaluation.md`
- `docs/task-breakdown.md`
- `docs/architecture.md`
- `docs/verification.md`
- `docs/decisions.md`
- `current-task.md`
- `.harness/session-state.json`
- `.harness/session-log.md`

### Validation

- Concrete-fixture/count/threshold stale scan: passed; no active R01–R04 requirement still commits a fixed case set or repository-wide pass fraction.
- Dataset/provider/provenance/fail-closed presence scan: passed.
- R01–R04 required-heading and code-fence check: all four documents valid and balanced.
- `.harness/session-state.json` parse: passed.
- `corepack pnpm format:check`: passed.
- `git diff --check`: passed.
- `C:\Program Files\Git\bin\bash.exe scripts/harness_check.sh`: passed; rerun after final evidence update.

### Next Steps

1. Execute R01 without selecting or committing an evaluation dataset.
2. Use test-only temporary providers for R01–R03 mechanics validation.
3. Before R04, explicitly select and review a real dataset, adapter, split, sample policy, license, and evaluation thresholds.

## Entry: R01 Core Loop Contract, Staging, Runs, and Manifests

### Summary

Implemented R01 as a reusable private `@rtl-agent/core-loop` library with a thin `apps/rtl-core-loop` CLI. The library defines the complete R02/R03 handoff contract, validates dataset-backed Provider output in ephemeral staging, atomically publishes isolated runs, computes raw-byte/JCS manifests, and detects protected net writes. No concrete dataset, persistent fixture cache, Agent, compiler, repair loop, or formal workflow state integration was added.

### Files Created or Updated

- `packages/core-loop/**`: contracts, stable errors, catalog, Provider boundary, filesystem scanner, manifests, materializer, output capture, and 22 tests
- `apps/rtl-core-loop/**`: thin fixture-configuration CLI and one test
- `core-loop/fixtures/README.md`: reserved Provider location with no dataset content
- root workspace references, lockfile, `.rtl-agent/` ignore policy, lint/format ignores
- R01 task, architecture, verification, decisions, task breakdown, and handoff state

### Public API and Boundaries

- `NormalizedFixture` is separate from `CoreLoopRunProfile` and `CreateRunRequest`; blank generation and seeded repair are a strict discriminated union.
- Stable fixture identity is dataset ID/version/split/case ID. `fixtureId` is a display alias. Provenance additionally records optional dataset digest, required case digest, license, adapter version, and normalization version.
- R02 receives `AgentAttemptInput`; R03 receives `CompileRequest` and returns the four-way `CompileResult`. Results use `COMPILE_PASSED`, never bare `PASSED`, and repeat `authoritative: false` / `COMPILE_ONLY`.
- Captured output stores a sanitized UTF-8 byte-bounded preview, truncation flag, original byte length, and optional logical artifact path.
- Provider `materialize` writes candidate files only into a new Core Loop staging directory. Core Loop independently rejects symlink/junction/special/undeclared files, non-RTL starter content, invalid logical paths, and NFC/case-fold collisions before hashing and publication.
- No `.rtl-agent/fixture-cache` or CAS exists. Staging is removed after a run is published.
- `normalizedFixtureDigest`, baseline workspace manifest, and attempt/run manifest have distinct scopes. File digests cover raw bytes; manifest digests are SHA-256 of A02 JCS-canonical sorted `{path, byteLength, contentDigest}` entries.
- Write policy compares the complete run root and permits net file changes only below `workspace/rtl/**`. It does not detect transient write-and-restore behavior; R02 permissions remain required.

### Validation

- `corepack pnpm install --frozen-lockfile`: passed.
- `corepack pnpm lint`: passed.
- `corepack pnpm typecheck`: passed.
- `corepack pnpm --filter @rtl-agent/core-loop --fail-if-no-match test`: 4 files, 22 tests passed.
- `corepack pnpm --filter @rtl-agent/rtl-core-loop --fail-if-no-match test`: 1 file, 1 test passed.
- `corepack pnpm test`: 18 files, 124 tests passed.
- `corepack pnpm build`: passed.
- `corepack pnpm format:check`: passed.
- `corepack pnpm peers check`: no peer issues.
- `fixtures-check` with no configured Provider: stable `DATASET_NOT_CONFIGURED`, exit code 2 as expected.
- `git diff --check` and `scripts/harness_check.sh`: passed after the final handoff update.

### Failures Found and Repaired

- The first typecheck used a non-exported Zod discriminated-union option type and an overly narrow compile-time JCS input type. The final schema uses public Zod APIs and A02 runtime JCS validation.
- The first output-capture test did not actually cross its byte limit; the limit was corrected and the UTF-8 truncation path now executes.
- Lint rejected intentional control-character regular expressions and an unused test parameter; the sanitizer intent is now locally documented and the test interface simplified.
- The initial public types inherited one generic string brand from a helper. The helper now preserves distinct literal brands for fixture, dataset, profile, and adapter identifiers.

### Missing Linux Evidence / Risk

`wsl --list --verbose` reported no installed distribution, and neither Docker nor Podman is installed. Linux filesystem contract tests were therefore not run. Windows tests include a real junction rejection plus pure normalization/case-collision checks, but Linux case-sensitive duplicate-directory behavior remains unexecuted. Run the unified suite in Linux CI before claiming Linux readiness; this does not change the non-authoritative classification of Core Loop results.

### Next Steps

1. Implement R02 against `AgentAttemptInput`, `createCoreLoopRun`, captured output, and whole-run write-policy APIs.
2. Implement R03 independently against `CompileRequest`/`CompileResult` and lock the actual Icarus profile/tool version.
3. Select and review a real dataset adapter and evaluation profile only after R02/R03 smoke evidence, then execute R04.

## Entry: Align R02-R04 with the Implemented R01 Contract

### Summary

Resolved the guarded commit review findings in the three active downstream task documents. R02, R03, and R04 now use the exact R01 public field/status vocabulary and preserve the implemented library/thin-CLI boundary. No TypeScript implementation or task scope was changed.

### Documentation Changes

- R02 now writes strict `AgentAttemptInput`: `attempt`, `category`, `workspaceRtlRoot`, and optional `previousCompileResultPath`. Baseline/previous compiler feedback is a separate bounded, sanitized `CompileResult` file below `workspace/context/`.
- R02 places reusable OpenCode adapter/probe behavior in `packages/core-loop`; `apps/rtl-core-loop` only parses CLI commands and calls the public API. Agent stdout/stderr reuse R01 `CapturedOutput` semantics.
- R03 now accepts strict non-empty `CompileRequest`, uses `attempt: 0` for seeded baseline and `1..3` after Agent turns, and returns only the four R01 `CompileResult` variants with exact fields and exit-code rules.
- R03 issues use `kind/message` plus optional `path/line/column`; schema-external issue codes, cleanup fields, and a second source-manifest field were removed.
- Empty source discovery returns a separate `NO_RTL_SOURCE` preparation result and never constructs an invalid empty `CompileRequest`.
- R04 reads `CreateRunRequest.profile.maxAttempts` (1–3), uses `COMPILE_PASSED`, treats blank baseline as compiler-not-invoked evidence, and ends an Agent turn with no source as `AGENT_FAILED` without fabricating compiler evidence.
- R04 final evidence must pass `FinalResultSchema`; incomplete/aborted runs remain batch-level classifications rather than new final outcomes. CLI examples use the existing `rtl-core-loop` bin.

### Validation

- Exact stale terms removed from active R02–R04 documents: bare `PASSED`, old Agent input fields, fixture/evaluation max-attempt overrides, old manifest/output fields, cleanup result fields, and the old CLI bin.
- Required implemented terms present: `AgentAttemptInputSchema`, `previousCompileResultPath`, `CompileRequestSchema`, `COMPILE_PASSED`, `workspaceManifestDigest`, `CapturedOutput`, `CreateRunRequest.profile.maxAttempts`, and the package/app ownership boundary.
- Required task headings and balanced Markdown code fences: passed for all three documents.
- `git diff --check` and `scripts/harness_check.sh`: passed after the final handoff update.

## Entry: Resolve R01 Guarded Review Findings

### Summary

Fixed the three P2 findings from the guarded commit review without expanding R01 scope. An already published run remains successful if staging cleanup fails, captured output no longer depends on caller-provided path hints to remove host absolute paths, and manifest collision safety is enforced at the public schema boundary.

### Changes

- `createCoreLoopRun` now treats post-publication staging cleanup as best-effort and returns the stable `STAGING_CLEANUP_FAILED` warning while keeping the published run readable.
- `captureOutput` generically redacts Windows drive, UNC, and POSIX absolute paths; `CapturedOutputSchema` rejects residual host paths. HTTP(S) URLs remain intact.
- `FileManifestSchema` independently rejects logical paths that collide after NFC normalization and case folding, including hand-built manifests that bypass generator helpers.
- Added regression tests for cleanup failure after publication, redaction without hints, schema-boundary host-path rejection, URL preservation, and schema-boundary case/Unicode collisions.
- Updated the R01 task and architecture decision record with the hardened boundary semantics.

### Validation

- `corepack pnpm install --frozen-lockfile`: passed.
- `corepack pnpm lint`: passed.
- `corepack pnpm typecheck`: passed.
- `corepack pnpm --filter @rtl-agent/core-loop --fail-if-no-match test`: 4 files, 26 tests passed.
- `corepack pnpm --filter @rtl-agent/rtl-core-loop --fail-if-no-match test`: 1 file, 1 test passed.
- `corepack pnpm test`: 18 files, 128 tests passed.
- `corepack pnpm build`, `format:check`, and `peers check`: passed.
- Missing Provider diagnostic remained `DATASET_NOT_CONFIGURED` with exit code 2.
- `git diff --check` and `scripts/harness_check.sh`: passed after the final handoff update.

### Failure Repaired During Validation

The first generic Windows drive-path expression interpreted the tail of `https:/` as a drive path and redacted a normal URL. The rule now requires a valid token boundary before a drive prefix; regression coverage verifies that host paths are removed while `https://example.com/docs` is preserved.

## Entry: Close Final R01 Output Boundary Findings

### Summary

Resolved the two remaining P2 findings from the final guarded review and corrected stale R01 validation counts. Quoted POSIX paths and `file://` URLs can no longer bypass captured-output sanitization, and the public Schema now enforces its maximum in UTF-8 bytes.

### Changes

- Added explicit `file://` redaction and punctuation-aware POSIX path boundaries while preserving ordinary HTTP(S) URLs.
- Replaced the JavaScript string-length preview limit with a UTF-8 byte-length refinement.
- Added helper/Schema regression coverage for quoted POSIX paths, file URLs, HTTP(S), and multibyte previews over 1 MiB.
- Updated R01 task evidence to 27 Core Loop tests and 129 repository tests and recorded the sanitizer failure mode in the error journal.

### Validation

- `corepack pnpm install --frozen-lockfile`: passed.
- `corepack pnpm lint` and `typecheck`: passed.
- `corepack pnpm --filter @rtl-agent/core-loop --fail-if-no-match test`: 4 files, 27 tests passed.
- `corepack pnpm --filter @rtl-agent/rtl-core-loop --fail-if-no-match test`: 1 file, 1 test passed.
- `corepack pnpm test`: 18 files, 129 tests passed.
- `corepack pnpm build`, `format:check`, and `peers check`: passed.
- Final `git diff --check` and Harness: passed after the handoff update.

## Entry: Implement and Validate R02 Restricted OpenCode RTL Agent

### Summary

Implemented R02 as one compiler-independent OpenCode turn boundary. The adapter writes strict file-based context, runs a fixed repository Agent with a native executable and argv array, projects bounded process evidence, terminates complete process trees on timeout, and accepts a workspace for R03 only after stable manifest and RTL-policy checks. Official native OpenCode `1.18.2` passed the final static and live checks on Windows.

### Design and Implementation

- Revised the R02 task after review: kept the full bounded `CompileResult` as optional previous feedback, left baseline compile ownership to R04, added `rtlSourceFiles`, accepted `.sv/.v/.svh/.vh`, and required a native Windows `.exe`.
- Added the repository-owned `rtl-core-loop` Agent and Skill with deny-by-default tools, fixed temperature/steps, explicit read/edit suffix rules and no shell/web/task/compiler claims.
- Added strict `OpenCodeCapability`, projected event, workspace violation and `AgentTurnResult` contracts. Each result binds resolved config, resolved Agent permission, Agent, Skill and experiment digests.
- Added isolated config/environment construction, exact version/flag/Agent/config/DB probing, native executable checks and final permission-array validation.
- Added fixed `--pure run` argv, explicit model/variant handling, `shell: false`, bounded JSONL projection, sanitized stderr, cross-platform process-tree termination and a post-exit stability window.
- Added Agent input/source/previous-result validation, duplicate-attempt evidence refusal, whole-run before/after manifests, protected-path detection, extension/count/byte/compile-unit limits and exclusive logical evidence writing.
- Added the thin `agent-probe` CLI plus ordinary fake-native tests and explicit network/model smoke tests gated by `CORE_LOOP_REAL_AGENT_TEST=1`.

### Real OpenCode Findings Repaired

- OpenCode 1.18.2 emits `run --help` on stderr; the bounded probe now checks both channels for flags while parsing machine-readable commands from stdout only.
- Package-scoped pnpm changes cwd; CLI/test repository roots now derive from module location.
- `--dir` makes the run workspace the OpenCode project, so the isolated environment now fixes trusted `OPENCODE_CONFIG_DIR` to repository `.opencode` rather than relying on project discovery.
- Windows file-tool permissions match resolved absolute paths. Relative allow rules now have constrained `**/` workspace-suffix counterparts, while independent external-directory and whole-run manifest boundaries remain.
- OpenCode appends a narrow tool-output external-directory exception. The probe hashes and validates final parsed Agent rules and rejects every other unexpected allow/ask after the deny-all rule.
- OpenCode 1.18.2 reports tool status below `part.state.status`; event projection now records this stable status without retaining raw content or arguments.

### Locked Live Evidence

- installation: official native Windows x64 release executable, version `1.18.2`
- final test-only model: `opencode/deepseek-v4-flash-free`; no credential entry was configured
- resolved config digest: `sha256:fe6b3e25e59b50e9bcaf80a86c0d82e56efd22499d94e42697715758bf84558e`
- resolved Agent permission digest: `sha256:a208dd5b82acee15f30abadf90b64aca34edc8328a7470ceeb0c666706683814`
- Agent digest: `sha256:df3b8e9b50c4a4288af26ae4c20ea8564f45fd830dbae36ebd0a6393f35eb40d`
- Skill digest: `sha256:332d820382b10f5fcf90ae6d2f00d8a02e44385c7099dfbe1833137e75564655`
- experiment config digest: `sha256:f48d66d8bfb9eac5193e0e17bc9e319ba91798afbd2339b4228c11af4b274313`
- allowed smoke: generated test-only Blank Generation returned `RTL_CHANGED`
- negative smoke: a temporary test-only Agent actually called write, received projected `status:error`, and the denied target did not exist
- OpenCode DB: availability checked; OpenCode retains local sessions, but the DB host path and raw session/JSONL are not copied into shared evidence

The real inputs are generated mechanics fixtures, not a reviewed dataset and not evaluation evidence. The smoke makes no compile, simulation, functional-correctness or Linux-readiness claim.

### Validation

- `corepack pnpm install --frozen-lockfile`: passed.
- `corepack pnpm lint`, `typecheck`, `build`, `format:check` and `peers check`: passed.
- `corepack pnpm --filter @rtl-agent/core-loop --fail-if-no-match test`: 5 files passed / 1 real-smoke file skipped; 39 tests passed / 2 skipped.
- `corepack pnpm --filter @rtl-agent/rtl-core-loop --fail-if-no-match test`: 1 file, 2 tests passed.
- `corepack pnpm test`: 19 files passed / 1 real-smoke file skipped; 142 tests passed / 2 skipped.
- configured `corepack pnpm core-loop:agent:probe`: passed.
- configured `CORE_LOOP_REAL_AGENT_TEST=1 corepack pnpm core-loop:agent:smoke`: 1 file, 2 tests passed.
- final `git diff --check` and Harness: passed after the handoff-file update.

### Next Steps

1. Implement R03 independently with a repository-owned fixed Icarus profile.
2. Let R04 call `OpenCodeRtlAgentAdapter.runTurn(input, run)` and consume only `RTL_CHANGED` workspaces for compile.
3. Select a reviewed dataset/provider, evaluation profile and formal model before any R04 batch; do not count R02 smoke sessions as cases.

## Entry: Harden R02 Process-Tree Timeout Boundary

### Summary

Repaired the P2 found by guarded commit review. R02 no longer swallows process-tree termination failures or waits indefinitely for child closure. Confirmed shutdown retains `AGENT_TIMEOUT`; unconfirmed shutdown returns `AGENT_PROCESS_ERROR` and cannot become compile-eligible.

### Changes

- bounded Windows `taskkill`, the composed graceful/force sequence, and final child-close confirmation
- continued to forced tree kill when the Windows graceful attempt fails, while preserving fail-closed confirmation rules
- destroyed captured pipes and unrefed an unconfirmed child before returning
- added internal `terminationFailed` process evidence and stable sanitized stderr projection
- added deterministic tests for a terminator that never settles and a child that never closes
- widened the existing fake timeout test from 150ms to 500ms so capability-probe startup is not the behavior under test and remains earlier than the 700ms forbidden late write

### Validation

- `corepack pnpm lint`: passed.
- `corepack pnpm typecheck`: passed.
- `corepack pnpm --filter @rtl-agent/core-loop --fail-if-no-match test`: 6 files passed / 1 real-smoke file skipped; 41 tests passed / 2 skipped.
- `corepack pnpm --filter @rtl-agent/rtl-core-loop --fail-if-no-match test`: 1 file, 2 tests passed.
- `corepack pnpm test`: 20 files passed / 1 real-smoke file skipped; 144 tests passed / 2 skipped.
- `corepack pnpm build`, `format:check`, and `peers check`: passed.
- configured native OpenCode `1.18.2` capability probe: passed with unchanged capability digests.
- final `git diff --check` and Harness: passed after the handoff update.

### Known Limits

- The explicit network/model smoke was not rerun because this fix changes only the deterministic process boundary; the prior 2-test allowed/denied smoke evidence remains valid.
- Linux execution was not run on this Windows host; R02 still makes no Linux-readiness claim.

## Entry: Bind R02 Executable Prefix into Experiment Identity

### Summary

Resolved the two P2 findings from the second guarded commit review. Different non-empty executable prefix argv now produce different experiment digests, and the task breakdown reports the final post-fix validation counts.

### Changes

- snapshotted mutable prefix, environment and workspace-limit structures when constructing the adapter
- included ordered non-empty `executableArgumentsPrefix` values in the JCS experiment config digest
- preserved one normalized identity for omitted and empty prefixes because both produce the same actual argv
- added a probe-level regression test using different native launcher script paths and a post-construction source-array mutation
- synchronized R02 acceptance evidence in the task breakdown and handoff state

### Validation

- `corepack pnpm lint`: passed.
- `corepack pnpm typecheck`: passed.
- `corepack pnpm --filter @rtl-agent/core-loop --fail-if-no-match test`: 6 files passed / 1 real-smoke file skipped; 42 tests passed / 2 skipped.
- `corepack pnpm --filter @rtl-agent/rtl-core-loop --fail-if-no-match test`: 1 file, 2 tests passed.
- `corepack pnpm test`: 20 files passed / 1 real-smoke file skipped; 145 tests passed / 2 skipped.
- `corepack pnpm build`, `format:check`, and `peers check`: passed.
- configured native OpenCode `1.18.2` capability probe: passed with unchanged production digests.
- final `git diff --check` and Harness: passed after the handoff update.

### Known Limits

- The explicit network/model smoke was not rerun; the prior allowed/denied evidence is unchanged because production config has no executable prefix.
- Linux execution remains unavailable on this Windows host; no Linux-readiness claim is made.

## Entry: Add Pinned ChipBench Verilog-Generation Dataset

### Summary

Added ChipBench through the same no-submodule, fixed-archive, ignored-cache, repository-Provider
boundary used for VerilogEval. The current catalog exposes 45 generation cases across three
splits and intentionally excludes functional debugging data that does not satisfy the existing
compile-repair contract.

### Changes

- pinned ChipBench commit `74fe7d283225ae030ef59326a06111c9d372b48e`
- locked archive digest `sha256:03dc173f64ee2e7f0860222850a6c71db9714a3f529038cbb7cdb75807ae6d68`
- locked 140-file extracted manifest
  `sha256:c26eef34412cf4817d4b851049418825e7e31af900f77a2949488d1e1a5f294e`
- added a Provider for 9 `cpu-ip`, 6 `not-self-contained`, and 30 `self-contained`
  `BLANK_GENERATION` cases
- derived the catalog from complete filename triplets because upstream `problems.txt` is
  incomplete in two generation directories
- added allowlisted atomic preparation that extracts only `LICENSE` and `Verilog Gen/**`
- added explicit CLI/root commands using `--dataset chipbench`, while preserving VerilogEval as
  the no-flag default
- excluded Verilog Debugging, Ref Model Gen, Tool_Box, scripts, and all upstream execution
  harnesses

### Validation

- `corepack pnpm lint`, `typecheck`, `build`, `format:check`, and `peers check`: passed.
- `corepack pnpm test`: 28 files passed / 1 skipped; 204 tests passed / 2 skipped.
- initial real ChipBench preparation: passed with `reused: false`.
- second real ChipBench preparation: passed with `reused: true`.
- ChipBench fixture check: 9 + 6 + 30 = 45 cases and the locked descriptor passed.
- existing VerilogEval fixture check: 156 cases passed without regression.
- no real model batch, simulation, functional-correctness, formal-Gate, or Linux-readiness claim
  was made.

### Next Steps

1. Choose the pinned dataset selection for the real R04 profile.
2. Record the final license-review disposition and predeclare the profile thresholds/review rule.
3. Run the batch only after the profile is registered; Provider/cache checks are not capability
   metrics.

## Entry: Extend ChipBench with Prompted Functional Debugging

### Summary

Extended the pinned ChipBench Provider from 45 generation cases to 223 total cases by adding all
178 zero-shot and one-shot debugging prompts. Added a distinct
`PROMPTED_FUNCTIONAL_REPAIR` category so functional bugs are not mislabeled as seeded compile
errors or ordinary blank generation.

### Changes

- advanced the ChipBench cache version to `c74fe7d28-r2` and adapter to `v2.0.0`
- locked the 683-file generation/debugging manifest
  `sha256:e30a2947718f958f25ef63b1bad981c24e8837563d4dcbddeb0bf116547aa5c9`
- added 8 debugging splits: arithmetic 24, assignment 30, state-machine 6, and timing 29 for
  each of zero-shot and one-shot
- retained 45 generation cases across the existing 3 splits
- added prompt-only materialization, baseline validation, Agent input, run evidence, and a
  separate metrics slice for `PROMPTED_FUNCTIONAL_REPAIR`
- continued to keep reference RTL and testbenches outside Agent workspaces
- continued to exclude Ref Model Gen, Tool_Box, scripts, Docker, Make, and Python execution
- renamed the committed metadata to `core-loop/fixtures/chipbench.lock.json`

### Evidence Boundary

Prompted functional-repair cases have no independent starter RTL; the buggy module is embedded in
the prompt. Their expected baseline is therefore `NO_RTL_SOURCE`. R03 can prove only that an Agent
output compiles. A compile pass is not evidence that the timing, assignment, arithmetic, or
state-machine bug was functionally repaired.

### Validation

- `corepack pnpm lint`, `typecheck`, `build`, `format:check`, and `peers check`: passed.
- Core Loop: 14 files passed / 1 skipped; 97 tests passed / 2 skipped.
- CLI: 1 file and 7 tests passed.
- full repository: 28 files passed / 1 skipped; 205 tests passed / 2 skipped.
- real ChipBench preparation: initial `reused: false`, repeat `reused: true`.
- real ChipBench fixture discovery: 223 cases across 11 locked splits.
- existing VerilogEval fixture discovery: 156 cases passed without regression.
- commit-guard aggregate test initially hit the documented fake process-tree scheduling race;
  the affected 18-test file passed with one worker and the independent aggregate rerun then passed
  all 205 tests.
- no model batch, functional simulation, formal Gate, or Linux-readiness claim was made.
## Entry: Configure the Restricted Agent for Kimi Code

### Summary

Connected the existing R02 OpenCode boundary to Kimi Code through its official OpenAI-compatible
API. Root local environment files now supply the credential and host-specific OpenCode settings to
the direct CLI without committing or serializing the key.

### Changes

- added the `kimi-code` custom provider at `https://api.kimi.com/coding/v1`
- locked the local model to `kimi-code/kimi-for-coding`
- retained the existing official native Windows OpenCode `1.18.2` capability lock
- added allowlisted `.env` and `.env.local` loading at the direct CLI boundary
- mapped the existing legacy `kimi` variable to `KIMI_CODE_API_KEY` in memory
- passed the secret through the child environment while storing only
  `{env:KIMI_CODE_API_KEY}` in inline configuration
- added fail-closed missing-key and no-secret-serialization tests
- ignored both local environment files; `.env.local` contains only host/model settings and `.env`
  retains the operator-owned key

### Validation

- targeted typecheck and 21 environment/Agent adapter tests: passed
- native OpenCode static probe: passed for version `1.18.2` and
  `kimi-code/kimi-for-coding`
- one explicit live Kimi blank-generation turn: passed with `RTL_CHANGED` and a compile-eligible
  workspace in 58.61 seconds
- the separate denied-write live smoke was intentionally skipped for this single-turn check
- full regression: format, lint, typecheck, build, and Harness passed; 29 test files passed /
  1 skipped and 208 tests passed / 2 skipped
- no raw model output, key value, dataset metric, functional-correctness, formal-Gate, or
  Linux-readiness claim was retained

## Entry: Remove the Legacy Kimi Credential Alias

Removed the lowercase `kimi` compatibility mapping after the operator renamed the local variable.
Repository environment loading now accepts only `KIMI_CODE_API_KEY`; a regression test proves that
a lowercase `kimi` value is ignored and does not enter the child environment. Format, lint,
typecheck, build, 208 ordinary tests, static Kimi/OpenCode probe, diff check, and Harness check
passed; no additional live model turn was executed.

## Entry: Add a Direct Kimi Code Connection Test

Added root `test_connection.ts`. The script reads only `KIMI_CODE_API_KEY` from ignored `.env`,
sends a bounded request to the official Kimi Coding OpenAI-compatible chat-completions endpoint,
sanitizes API errors, never prints the credential, and succeeds only when the HTTP request is
accepted and the response contains a non-empty final answer.

Validation passed with Prettier, ESLint, TypeScript, and one live request returning
`model: kimi-for-coding`, `answer: KIMI_SUBSCRIPTION_OK`.

### Follow-up

An operator run returned HTTP 200 with an empty final `content`. The original 64-token completion
cap was too small for a thinking-enabled coding model and could exhaust the final-answer budget.
Raised the cap to 512 and added safe `finishReason`/`completionTokens` output. An attempted explicit
temperature was rejected by the model and removed; the API default is used. The final live rerun
passed with `finishReason: stop`, 36 completion tokens, and the exact expected marker.
## Entry: Add Selectable VerilogEval Kimi Profiles

### Summary

Added the generic `verilog-eval-kimi-v1` direct profile with two mutually exclusive selection
forms: inclusive `--begin/--end` ranges and comma-separated `--cases` lists. Every request resolves
to complete case IDs and a concrete derived profile before any model turn.

### Selection and Identity

- full case IDs and case-insensitive unambiguous prefixes such as `prob001` are accepted
- ranges follow pinned Provider order and include both endpoints
- explicit lists are canonicalized to pinned Provider order
- missing, ambiguous, duplicate, reversed, partial, and mixed selectors fail closed
- the derived profile ID incorporates the base profile/capability content and resolved case IDs
- the selection count, ordered case digest, Agent capability, compiler capability, and complete
  resolved profile are locked before execution
- direct use without an explicit selector is rejected to prevent an accidental 156-case batch
- v1 uses one Agent attempt per case and remains non-authoritative `COMPILE_ONLY`

### Validation

- real static profile construction: 156-case base, `Prob001..Prob010` expanded to the expected 10
  cases, and unordered `Prob010,Prob001,Prob005` canonicalized to `Prob001,Prob005,Prob010`
- real OpenCode `1.18.2` / `kimi-code/kimi-for-coding` and Icarus 12.0 capabilities locked during
  static construction
- production CLI reversed-range check returned stable `EVALUATION_PROFILE_INVALID` with exit 2
  before any model turn
- CLI/profile-selection package: 3 files and 18 tests passed
- full repository: 30 files passed / 1 skipped; 218 tests passed / 2 skipped
- format, lint, typecheck, build, peer dependency, diff, and Harness checks passed
- no real VerilogEval model batch was executed and no subscription quota was intentionally consumed
  by a model turn

## Entry: Add In-Command VerilogEval Functional Simulation and Clean Batch Layout

Kept `evaluate` as the complete workflow and added the post-generation VerilogEval steps: only an
independently compile-passed candidate is combined with the locked hidden reference/testbench,
compiled with Icarus, run with `vvp`, and classified from one bounded mismatch summary. Reference
and testbench files remain outside Agent workspaces and user-facing RTL output. Strict run results
remain `COMPILE_ONLY`; the new aggregate is explicitly non-authoritative
`FUNCTIONAL_SIMULATION`, not a formal Gate.

New batches use atomically allocated `b-YYYYMMDD-NNN` IDs. Generated RTL is published under
`rtl/<case-id>/`, a concise `summary.json` is stored at the root, and evidence/runs/staging/private
verification inputs live under `_internal/`. Legacy UUID batch IDs remain schema-compatible.

Validation passed with build, ESLint, and the complete ordinary suite (31 files passed / 1 skipped;
220 tests passed / 2 skipped). A no-model real Icarus/vvp run reused the two existing Kimi-generated
candidates: Prob001 reported 0 mismatches in 20 samples and Prob002 reported 0 in 100 samples.

## Entry: Classify Source-Bound Icarus Errors as Repairable Compile Errors

Diagnosed batch `b-20260721-004`: Prob071 produced a normal candidate RTL error (`pos is not a
valid l-value`), but the narrow diagnostic phrase allowlist mislabeled it as
`IVERILOG_UNCLASSIFIED_FAILURE`. Because `TOOL_ERROR` is infrastructure-invalid, the batch stopped
and marked Prob071 plus Prob072–Prob100 as functional not-run.

The parser now treats any error safely bound to a current workspace RTL source as a design error,
while unbound tool/configuration messages and internal compiler failures remain fail-closed. Added
parser and adapter coverage for the exact l-value form, a real-Icarus implicit-wire regression, and
a two-case batch regression proving an exhausted ordinary compile error does not prevent the next
case from running.

Validation passed with build, lint, format, 22 targeted parser/adapter/batch tests, 7 real-Icarus
integration tests, and the full ordinary suite (31 files passed / 1 skipped; 222 tests passed /
2 skipped). The first aggregate run hit the already documented host-contention failure when an
unrelated five-case batch test took 15.228 seconds against its 15-second limit; the isolated
supported aggregate rerun passed all assertions.

## Entry: Feed Common Compile and Logic Issues Into Every RTL Prompt

Added `.opencode/skills/rtl-core-loop/common-issues.md` with reusable Compile, Logic, Safety, and
self-check guidance derived from observed VerilogEval failure classes. It covers procedural-net
assignments, Icarus enum ternary casts, combinational coverage, single-driver discipline, FSM/reset
structure, priority, edges, counters, widths, and prohibited external side effects without
including any case-specific reference answer or hidden testbench behavior.

The OpenCode adapter now reads and bounds the UTF-8 guide before every turn and appends its full
content directly to the fixed prompt, so loading the optional skill is not required. Added
`guidanceFileDigest` to capability and turn evidence; profile locking and per-turn capability checks
therefore detect guidance changes. Prompt guidance is not treated as a replacement for the still
missing OS sandbox around untrusted `vvp` execution.

Validation passed with `npm run build`, `npm run lint`, `npm run format:check`, and the full ordinary
suite (31 files passed / 1 skipped; 223 tests passed / 2 skipped). Deterministic adapter tests verify
the guide is present in the actual OpenCode prompt argv and that changing only the guide changes its
locked digest. No live model request was made.

## Entry: Separate Automatic Observations From Explicit Prompt Guidance

Renamed the versioned prompt input to
`.opencode/skills/rtl-core-loop/common-guidance.md`. Generation and repair turns still receive its
complete digest-locked content, but no evaluation code writes it. Updating prompt guidance now
requires an explicit operator request to review and promote items from observed evidence.

Every completed dataset evaluation atomically and idempotently appends a batch section to ignored
runtime knowledge at `.rtl-agent/knowledge/observed-issues.md`. It records structured compile
diagnostics, functional outcomes, infrastructure failures, and not-run counts. Each nonzero
VerilogEval mismatch starts an additional restricted `rtl-mismatch-analyzer` model turn with only
the public specification, candidate RTL, and mismatch totals. The analyzer must return a concrete
root-cause category, explanation, candidate/spec line citations, confidence, and limitations.
Generic, malformed, missing, or protected-input-mutating diagnoses fail with
`MISMATCH_ANALYSIS_FAILED`; `LOGIC_MISMATCH_UNKNOWN` is never recorded. Hidden reference and
testbench assets are not copied into the diagnosis workspace. Each mismatch therefore consumes one
additional model request, and its diagnosis remains a hypothesis rather than formal proof.

Validation passed with build, ESLint, Prettier, 37 focused tests, and the full ordinary suite
(33 files passed / 1 skipped; 229 tests passed / 2 skipped). Tests cover idempotent journaling,
compile and logic sections, rejection without a concrete analyzer, rejection of generic diagnoses,
protected spec mutation, CLI-created runtime journals, and unchanged generation-prompt injection.
No live Kimi request was made.

### Follow-up: Keep Detailed Diagnosis Private and Journal Only the Conclusion

Extended functional parsing to extract the existing testbench's per-public-output mismatch counts
and first-mismatch times. The restricted diagnosis Agent now receives these structured observations
alongside the public specification, candidate RTL, and total mismatch count. Full diagnosis JSON,
line citations, confidence, limitations, Agent digest, and resolved permission digest remain under
`_internal/mismatch-analysis/<run-id>/`.

The generated `observed-issues.md` now emits exactly one mismatch conclusion per affected case:
category, confidence, and the concrete root-cause sentence. It no longer copies detailed line
evidence, limitations, mismatch ratios, testbench hints, or model analysis into the journal. Build,
ESLint, Prettier, focused simulation/analyzer/journal tests, and the full ordinary suite passed
(33 files passed / 1 skipped; 229 tests passed / 2 skipped). No live model request was made.

## Entry: Record the Complete VerilogEval Kimi Run

Created `exp_result/verilog-eval/07.21-baseline.md` from the six local batch evidence trees. The report uses
each Prob001–Prob156 case exactly once: Prob041–Prob070 comes from interrupted batch
`b-20260721-004`, while its not-run Prob071–Prob100 segment is replaced by completed rerun
`b-20260721-005`.

The raw unique-case result is 119 functional passes, 21 compile-passed mismatches, 14 model-side
generation/compile failures, one not-executed case, and one dataset verification-interface error.
Prob040 was never executed after the historical Prob039 classifier stop. Prob099 is excluded from
ordinary model outcomes because its testbench expects `Y2/Y4` while the public specification,
reference, and candidate all expose `Y1/Y3`. The report also records adjusted rates, range-level
performance, the 12 enum-cast failures, mismatch severity, case lists, runtime, and evidence limits.
No model request or batch mutation was performed for the report.

## Entry: Separate Logic Mismatches From Verification Invalidity

Corrected the functional aggregate so `functionalFailed` counts only completed simulations with a
nonzero mismatch total. Verification compile errors, simulation process errors, timeouts, and
unparseable output now increment `verificationInvalid`; any such outcome makes the functional
result and CLI `INVALID`/`ok: false`. Candidate generation or candidate-only compile failures remain
`functionalNotRun`.

Schema-version-1 evidence remains readable: `outputMismatches` is optional and a missing
`verificationInvalid` defaults to zero, while all new evidence writes both values. The operator
explicitly accepted direct host execution of local `vvp` images, so no sandbox change was made; the
risk remains excluded from production and formal-Gate claims. Targeted functional simulation tests
passed, including the verification-compile-error and historical-evidence regressions. No model
request was made.

## Entry: Expand Functional Not-Run Outcomes Per Case

The automatic observed-issue journal now retains the aggregate `functionalNotRun` count and adds a
`Not Run Details` entry for every affected selected case. Entries use the stable final outcome or
case-validation status, map Agent output without a compile-ready source to `NO_COMPILE_UNIT`, and
include the latest structured compiler error when available. Selected cases with no run result are
recorded as `NOT_EXECUTED` unless preflight provides a more specific status. This changes runtime
reporting only; evaluation counts, prompt guidance, and hidden verification boundaries are
unchanged.

The guarded review found and corrected two misleading edge cases. A valid baseline with no run
result now says the batch stopped before functional simulation instead of reusing the successful
baseline-validation message. Historical compiler errors are now used only for `MAX_ATTEMPTS`, so a
later timeout or tool failure retains its actual final stage reason. Six focused observed-issues
tests, typecheck, ESLint, and the full ordinary suite (33 files passed / 1 skipped; 233 tests passed
/ 2 skipped) passed. The first full-suite attempt encountered two unrelated Windows scheduling and
cleanup races; both affected files passed in isolation and the complete suite then passed. No model
or dataset evaluation request was made. Prettier, diff check, and Harness check also passed after
the final documentation update.

The guarded commit review found no P1/P2 and confirmed that all eight modified files belong to the
same per-case not-run reporting change. Typecheck, ESLint, the full ordinary suite (33 files passed
/ 1 skipped; 233 tests passed / 2 skipped), build, Prettier, diff check, and Harness check passed
before staging. No live model or dataset request was made.

The follow-up guarded commit review found no remaining P1/P2. Typecheck, ESLint, the full ordinary
suite (33 files passed / 1 skipped; 230 tests passed / 2 skipped), build, Prettier, diff check, and
Harness check all passed before landing the reviewed work on `master`.

Validation passed with typecheck, ESLint, build, Prettier, diff check, Harness check, 19 focused
simulation/journal/analyzer/CLI tests, and the full ordinary suite (33 files passed / 1 skipped;
230 tests passed / 2 skipped).

## Entry: Reject Empty Kimi Connection Answers

Resolved the guarded commit review finding in `test_connection.ts`. HTTP acceptance and usable
answer validation are now reported independently as `httpOk` and `answerOk`; aggregate `ok` is true
only when both are true. A 2xx response with missing or empty final content now prints `ok: false`
and exits nonzero. Typecheck, ESLint, Prettier, diff check, and Harness check passed. No live Kimi
request was made.

## Entry: Recover Mismatch Diagnosis Without Repeating a Batch

### Summary

Diagnosed the `MISMATCH_ANALYSIS_FAILED` returned after the real Prob021–Prob050 run. Batch
`b-20260723-002` had already completed 30 cases with 29 compile passes, 28 functional passes, one
mismatch, and one functional not-run. Only the post-batch `Prob034_dff8` diagnosis was invalid: its
content was concrete, but it used an undisclosed category, string evidence entries, and lowercase
confidence because the Agent-visible placeholder did not expose the runtime Schema.

### Changes

- materialized the exact allowed category/confidence enums, evidence-object shape, and size
  constraints into each private diagnosis workspace
- added `INITIALIZATION_SEMANTICS` and `SPEC_REFERENCE_AMBIGUITY`
- retained strict validation and allowed exactly one correction turn supplied with bounded Zod
  issue paths/messages
- allowed an incomplete diagnosis workspace to resume only when its public spec, mismatch context,
  and candidate RTL still exactly match the evaluated run
- made diagnosis/journal failure a warning that cannot replace an already published evaluation
  status
- added `reanalyze --batch <batch-id>` to validate and reuse existing batch evidence without
  regenerating candidates or rerunning simulation
- kept model-authored diagnoses non-authoritative; they never rewrite raw functional outcomes

### Real Recovery Evidence

After build, `node .\apps\rtl-core-loop\dist\index.js reanalyze --batch b-20260723-002` succeeded.
It made one Kimi diagnosis turn for the existing `Prob034_dff8` mismatch, returned
`INITIALIZATION_SEMANTICS` / `MEDIUM`, wrote strict analysis metadata, and appended the concise
conclusion to the ignored observed-issues journal. No RTL generation, candidate compile, or
functional simulation was repeated.

### Validation

- targeted analyzer/observed-issues/CLI regression: 3 files, 22 tests passed
- real Kimi existing-batch reanalysis: passed with `ANALYSIS_COMPLETED`
- full repository: 33 files passed / 1 skipped; 236 tests passed / 2 skipped
- typecheck, ESLint, build, Prettier, diff check, and Harness check passed

The first final typecheck found that the cross-evidence lookup Map inferred the branded batch
`RunId` key while historical functional evidence exposes a compatible plain string. The Map now
declares the filesystem evidence boundary as string-keyed; runtime identity comparisons remain
unchanged, and the final typecheck passed.

## Entry: Add a Parallel Pi Coding Agent Adapter Without Disturbing the Active Dataset

### Safety Boundary

Detected the active OpenCode evaluation process for `Prob071`–`Prob100` and treated its loaded
`dist`, OpenCode Agent/Skill, environment, runtime tree, and profile digest as immutable. Prepared
the Pi source, policy extension, deterministic tests, and documentation without building or
installing Pi. Waited through all 30 Agent turns and mismatch-diagnosis post-processing; only after
the dataset process exited was `dist` rebuilt.

### Changes

- retained the legacy OpenCode capability and turn-evidence shapes and introduced backend-neutral
  unions with a distinct Pi branch
- added `PiRtlAgentAdapter`, isolated environment construction, exact version/flag probing, and
  operator-owned executable/entrypoint configuration
- added one-shot JSON/ephemeral Pi execution with offline startup, no sessions, no project trust,
  and no discovered extensions, skills, templates, themes, or context files
- allowed only `read`, `write`, and `edit`; added a digest-locked extension that blocks reads
  outside `spec.md`, `context/**`, and `rtl/**` and blocks writes outside supported RTL files
- kept the existing post-turn manifest/write policy as a second boundary
- added `pi-agent-probe` and the distinct `verilog-eval-kimi-pi-v1` profile while leaving
  `verilog-eval-kimi-v1` fixed to OpenCode
- accepted Pi's official `KIMI_API_KEY` and safely mapped the existing `KIMI_CODE_API_KEY`
- installed pinned Pi `0.81.1` only in ignored `.rtl-agent/tools/pi-0.81.1`

### Validation

- source-level Pi adapter/policy tests: 1 file, 4 tests passed
- OpenCode adapter/orchestrator/batch regressions: 3 files, 45 tests passed
- build, typecheck, ESLint, Prettier, and diff check passed
- full repository: 34 files passed / 1 skipped; 241 tests passed / 2 skipped
- real `pi-agent-probe`: passed for Pi `0.81.1`, `kimi-coding/kimi-for-coding`, locked tools,
  isolation flags, extension digest, guidance digest, and experiment digest
- real Pi batch `b-20260723-005`: `COMPLETED`, one compile pass, one functional pass, zero
  mismatches/not-run/verification-invalid cases, and completed post-processing

Pi remains non-authoritative and is not a general OS sandbox. Enabling `bash`, third-party
extensions, or broader paths requires a separate security decision. R04 remains `IN_PROGRESS`
pending the acceptance-qualified evidence selection, human review, report, and checkpoint decision.

### Follow-up: Lock One Shared Pi Configuration Without Changing OpenCode

Kept `.rtl-agent/pi-config` as the single operator-owned Pi configuration directory. Added a
non-auth semantic configuration digest to Pi capability/turn evidence and a private full-directory
digest to the adapter lifecycle. The first probe establishes both locks; subsequent probes and
turns fail closed if model/provider/settings or credential state changes. Authentication content is
never serialized. This follow-up changes no `.opencode/**` file, OpenCode environment variable,
OpenCode capability shape, profile identity, permission rule, or prompt guidance.

Three new regressions prove semantic model configuration drift, credential drift, and configuration
changes during a Pi turn all fail with `PI_AGENT_CAPABILITY_MISMATCH`, while capability JSON does
not contain the credential. The Pi suite passes 7 tests. OpenCode-focused regressions pass 45 tests,
and the final repository run passes 34 files / 1 skipped and 244 tests / 2 skipped. Lint, typecheck,
build, format, `git diff --check`, harness validation, and a real Pi 0.81.1 probe also pass.

## Entry: Summarize the 2026-07-23 VerilogEval Prob001–Prob156 Run

### Outcome

Created `exp_result/verilog-eval/07.23-kimi-opencode-001-156.md` from the immutable evidence of
OpenCode batches `b-20260723-001`, `002`, `003`, `004`, and `006`. Excluded the duplicate Pi
Prob001 smoke batch from the aggregate. The five selected batches contain 156 unique case IDs:
135 functional passes, 16 genuine mismatches, four cases without a compile-eligible candidate, and
one verification-interface-invalid case. The raw end-to-end pass rate is 86.54%; valid completed
simulations pass at 89.40%.

The report separates three `NO_COMPILE_UNIT` outcomes, one Agent process/termination failure, and
the known Prob099 testbench interface defect from model logic mismatches. It lists mismatch ratios
and affected outputs for all 16 cases. Ten have schema-valid restricted diagnoses; six remain
explicitly unclassified because their diagnosis evidence is incomplete.

### Validation

- read-only aggregation assertions: 156 unique cases, exact `135/16/4/1` outcome partition
- calculated rates: 86.54% raw, 87.10% excluding verification-invalid, 89.40% conditional on a
  valid completed simulation, and 97.44% candidate compile pass
- focused Prettier check for the new Markdown report: passed

## Entry: Add Explicit Evaluation Backend Selection and Case Progress

### Outcome

Added `--agent opencode|pi` to `evaluate`. The generic `verilog-eval-kimi-v1` CLI entry retains its
OpenCode identity for `--agent opencode` and resolves to the existing
`verilog-eval-kimi-pi-v1` evidence profile for `--agent pi`. Legacy explicit Pi profile commands
remain compatible. Unsupported backend values and profile/capability conflicts fail before an
Agent turn.

Added a non-evidentiary batch progress callback at the actual validated-run execution boundary.
Immediately before each case enters the Agent/compile loop, the CLI writes
`正在处理 <case-id>... (<current>/<total>)` to stderr. The final stdout remains one JSON object and
now includes `agentBackend`. Progress callback failures are isolated from evaluation outcomes.

### Validation

- CLI/profile/batch focused regression: 3 files, 31 tests passed
- full repository: 34 files passed / 1 skipped; 246 tests passed / 2 skipped
- typecheck, lint, build, format, `git diff --check`, and harness check: passed
- built CLI rejects an unsupported backend with stable `EVALUATION_PROFILE_INVALID` before any
  model request

## Entry: Add a Standalone Pi Provider Connectivity Diagnostic

### Outcome

Added root `test_pi_connection.ts` with `--prompt` and `--prompt-file` inputs plus optional custom
system prompt and timeout. It loads the ignored repository environment and shared Pi configuration,
defaults to the pinned Pi `0.81.1` runtime, and honors explicit `RTL_AGENT_PI_*` overrides. The
diagnostic runs with tools, sessions, project context, and discovered resources disabled.

Added `config/pi/provider-connection-test-extension.mjs` as a diagnostic-only observer. It records
the fully assembled Agent input, every actual `before_provider_request` payload, provider HTTP
status, and complete Pi-parsed Assistant message. It does not capture headers, does not modify the
payload, uses a fresh OS temporary file with restrictive requested permissions, and deletes the
capture after printing. None of the Pi RTL adapter, OpenCode configuration, evaluation profiles,
or dataset flow changed.

### Real Connection Evidence

`node test_pi_connection.ts --prompt "仅回复 PI_OK" --timeout-ms 120000` completed with one provider
request, HTTP 200, one Assistant response containing `PI_OK`, token/usage metadata, and final
`ok: true`. The missing-input invocation failed before any network request and printed exact usage.

### Validation

- full repository: 34 files passed / 1 skipped; 246 tests passed / 2 skipped
- lint, typecheck, build, Prettier, diff check, and Harness check passed
- no dataset evaluation or OpenCode request was made

### Follow-up: Simplify the Pi Diagnostic to One File

Replaced the process wrapper, temporary capture protocol, option parser, and separate observer
extension with a single Pi SDK script. The command is now
`node test_pi_connection.ts "custom prompt"`. It creates an in-memory session with tools and
resource discovery disabled, observes `before_provider_request` directly, and prints that payload
plus the final Assistant message. No capture file or repository extension is created.

The simplified real check returned `PI_OK` and printed one actual provider payload and one complete
Assistant response. Full validation passed: 34 test files passed / 1 skipped, 246 tests passed / 2
skipped, plus ESLint, typecheck, Prettier, diff check, and Harness check.

## Entry: Make Pi a First-Class Repository Backend Layout

### Outcome

Moved repository-owned Pi resources from `config/pi` to `.pi/`, parallel to `.opencode/`.
`.pi/capability.json` now declares the exact `read,write,edit` tool set and
`.pi/extensions/rtl-core-loop-policy.mjs` retains the existing workspace path enforcement.
Automatic Pi extension, skill, template, theme, and context discovery remains disabled; the
adapter loads reviewed resources explicitly. The extension additionally requires an adapter-only
activation flag, so ordinary manual Pi project discovery does not register the Core Loop policy.

Moved the shared RTL checklist out of `.opencode` to
`config/agents/rtl-core-loop/common-guidance.md`. OpenCode and Pi continue injecting the same
content and lock the same `guidanceFileDigest`. `.pi/skills/` is reserved for future Pi-only
skills; no duplicate RTL Skill was introduced.

Renamed the ignored local state directory from `.rtl-agent/pi-config` to
`.rtl-agent/pi-state`. The existing `auth.json` and `models-store.json` were moved in place. The
pinned package remains below `.rtl-agent/tools/pi-0.81.1`.

### Capability Enforcement

The Pi adapter strictly parses the bounded `.pi/capability.json`, combines it with the fixed path
policy in `toolPolicyDigest`, uses its tools for the actual `--tools` argv, and rejects invalid or
mid-turn capability drift with `PI_AGENT_CAPABILITY_MISMATCH`. Regressions cover invalid tool
configuration, project capability mutation during a running turn, and inactive policy behavior
during ordinary manual Pi discovery.

### Validation

- focused Pi/OpenCode/guidance regressions: 3 files and 37 tests passed
- real Pi `0.81.1` probe passed with the new capability, extension, guidance, and state paths
- real Pi SDK connection returned `PI_OK` after the local-state rename
- real OpenCode `1.18.2` probe passed with the backend-neutral guidance digest
- full repository: 34 files passed / 1 skipped; 249 tests passed / 2 skipped
- lint, typecheck, build, Prettier, diff check, and Harness check passed

## Entry: Capture Pi Provider Prompts During Dataset Evaluation

### Outcome

Pi-backed evaluation turns now observe the actual final payload at
`before_provider_request` and retain every request in order below
`_internal/runs/<run-id>/evidence/attempts/<attempt>/provider-request-payloads.json`. The hook
returns `undefined`, so it never changes the provider request. Captures contain no HTTP headers or
credentials, remain below ignored batch `_internal`, and are never copied into `summary.json`,
generated RTL, or the observed-issues journal.

The digest-locked Pi policy creates an exclusive, permission-restricted temporary JSONL capture
outside the Agent workspace. It now checks the 64-request and 8-MiB limits before writing and before
the corresponding provider call. The adapter validates sequence and JSON shape after the process
closes, then exclusively publishes the internal JSON artifact. Missing or malformed capture fails
closed with `PI_AGENT_CAPABILITY_MISMATCH`; a process that never spawns records an empty request
list. Temporary-directory removal uses three bounded retries. Final failure emits
`PROVIDER_CAPTURE_CLEANUP_FAILED` to stderr and adds `localWarnings` to the Pi turn evidence without
changing the Agent/RTL outcome or retaining the host path in evidence.

Added `core-loop:evaluate:pi` as a root build-and-run command. Local ignored `.env.local` now
contains the existing host's Pi executable, entrypoint, version, provider, and model settings; the
credential continues to come only from ignored `.env`.

### Validation

- focused Pi adapter/policy tests: 1 file, 13 tests passed
- full repository: 34 files passed / 1 skipped; 252 tests passed / 2 skipped
- lint, typecheck, and build: passed
- real Pi `0.81.1` capability probe: passed with the changed extension digest
- `corepack pnpm core-loop:evaluate:pi --cases NotARealCase`: reached the built CLI and returned the
  expected pre-turn `DATASET_CASE_NOT_FOUND`, proving argument forwarding without making a model
  request
- Prettier, `git diff --check`, and Harness check: passed

No live dataset/model request was made during validation. The first real selected Pi evaluation
will create the new provider-payload artifact. These payloads can contain proprietary
specifications and complete model context and must be reviewed before sharing.

The guarded `commit-main` review then found two P2 issues before any Git mutation: limits were
checked only after temporary capture, and cleanup failure was silently ignored. Both are now
repaired. Direct extension tests prove count and byte overflow are rejected before another line is
written. A cleanup helper passes `maxRetries: 3` / `retryDelay: 100` to recursive `fs.rm`, reports a
stable warning after final failure, and returns a non-fatal status that becomes Pi
`localWarnings`. The focused Pi suite increased to 13 tests and the full repository to 252 tests.

The final guarded landing review found no remaining P1/P2. Its first aggregate validation hit the
repository's documented Windows fake process-tree termination race: one unrelated OpenCode timeout
test returned `AGENT_PROCESS_ERROR` instead of `AGENT_TIMEOUT`. The affected 21-test file passed
with one worker, and the independent aggregate rerun then passed all 252 tests. Lint, typecheck,
build, the real Pi probe, Prettier, diff check, and Harness check also passed before staging.

## Entry: Replace Pi Provider Request Capture with Provider Transcripts

### Outcome

Pi-backed evaluation turns now publish
`_internal/runs/<run-id>/evidence/attempts/<attempt>/provider-transcript.json` instead of the
request-only `provider-request-payloads.json`. Each exchange records the provider request payload
observed at `before_provider_request` and the finalized parsed Assistant message observed at
`message_end`. If Pi exits or fails before the final Assistant message for a request, that exchange
is retained with `response: null`.

The transcript keeps the existing 64-request and combined 8-MiB bounds with no truncation. Request
overflow is still rejected before the provider call. Response overflow is rejected after Pi exposes
the parsed Assistant message and before the response line is appended. Pairing now tolerates lower
level provider retries by allowing earlier requests to remain response-null and attaching the final
Assistant response to the latest provider request.

The artifact remains ignored internal diagnostic evidence. It contains Pi's parsed request and
Assistant message objects, including stop reason, usage, tool calls, and provider error fields when
available, but not HTTP headers, credentials, raw streaming bytes, public summaries, generated RTL,
or authoritative workflow state.

### Validation

- focused Pi adapter/policy tests: 1 file, 16 tests passed
- `corepack pnpm typecheck`: passed
- `corepack pnpm lint`: passed
- `corepack pnpm build`: passed
- full repository: 34 files passed / 1 skipped; 255 tests passed / 2 skipped
- real `corepack pnpm core-loop:evaluate:pi --cases Prob101`: completed batch `b-20260727-002` and
  produced one `provider-transcript.json` exchange with both request and Assistant response

The real Prob101 run did not generate RTL because the transcript captured a Kimi provider response
with `stopReason: "error"` and a `403` usage-limit message. The run therefore ended as
`POLICY_VIOLATION` / `NO_COMPILE_UNIT`, with `functionalNotRun: 1`. This validates the new
diagnostic path but does not complete R04's acceptance batch or human-review requirement.

## Entry: Make VerilogEval Kimi Model Selection Environment-Driven

### Outcome

The VerilogEval Kimi profile templates no longer require the concrete model
`kimi-for-coding`. They now require only the intended Kimi backend family: OpenCode capabilities
must report `kimi-code/<model>`, while Pi capabilities must report provider `kimi-coding`. The
selected model is taken from the probed backend capability and remains locked into the resolved
profile evidence and digest.

This means K3 is selected by local environment configuration instead of a source-level profile:
OpenCode uses `RTL_AGENT_OPENCODE_MODEL=kimi-code/k3`; Pi uses
`RTL_AGENT_PI_PROVIDER=kimi-coding` plus `RTL_AGENT_PI_MODEL=k3`. Non-Kimi OpenCode and Pi providers
still fail profile construction before any Agent turn.

### Validation

- focused VerilogEval profile/CLI/environment tests: 3 files, 18 tests passed
- `corepack pnpm lint`: passed
- `corepack pnpm typecheck`: passed
- `corepack pnpm build`: passed
- `corepack pnpm format:check`: passed
- `git diff --check`: passed
- Harness check: passed

- full repository: 35 files passed / 1 skipped; 258 tests passed / 2 skipped

No live model request was made for this change. The behavior is covered by deterministic capability
stubs, and actual model choice remains visible in the resolved Agent capability for real batches.

### Guarded Landing Review

The `commit-main` review found no remaining P1/P2 after the operator confirmed that the deleted
`test_async.js` example should not be committed and its stale handoff references were removed.

Submission validation passed: frozen install, lint, typecheck, build, format, peer dependency check,
Pi `0.81.1` static probe, `git diff --check`, and Harness check. The first aggregate test run hit the
documented Windows fake process-tree termination race in `agent-adapter.test.ts`; the affected file
then passed 21/21 with `--maxWorkers=1`, and an independent aggregate rerun passed 35 files / 1
skipped and 258 tests / 2 skipped. An initial diagnostic retry included the removed Vitest 4 option
`--minWorkers` and did not start tests; the supported `--maxWorkers=1` command supplied the focused
evidence.

## Entry: Install Local Verilator Coverage Tooling

### Outcome

Installed MSYS2 `20260611`, UCRT64 Verilator `5.050-1`, GCC `16.1.0-5`, GNU Make `4.4.1`,
and native UCRT64 Python `3.14.6`. The fixed Windows executable is
`C:\msys64\ucrt64\bin\verilator_bin.exe`; it requires
`VERILATOR_ROOT=C:\msys64\ucrt64\share\verilator` and PATH entries for
`C:\msys64\ucrt64\bin` and `C:\msys64\usr\bin`. Coverage post-processing uses the native
`C:\msys64\ucrt64\bin\verilator_coverage_bin_dbg.exe` supplied by the same package.

The current GCC 16 package emits a new-ABI `C4` `std::__cxx11::basic_string` constructor reference
that the packaged libstdc++ import library does not provide when compiling Verilator runtime
sources. Passing `-CFLAGS -D_GLIBCXX_USE_CXX11_ABI=0` keeps all generated/runtime objects on the
packaged legacy ABI and makes the fixed toolchain link successfully. This flag is part of the
validated local invocation and must not be silently omitted.

### Validation

- `verilator_bin.exe --version`: passed, `Verilator 5.050`.
- synthetic `--binary --coverage --timing` compile: passed with the GCC ABI compatibility flag.
- generated `sim.exe`: passed and reached `$finish` at 12 ps.
- `coverage.dat`: produced with nonzero line, toggle, branch, and expression counters.
- native coverage summary with `--annotate-min 1`: line 100%, toggle 90%, branch 100%, expression
  100%; LCOV `coverage.info` and annotated source were also produced.
- smoke sources and generated artifacts remain ignored under `.rtl-agent/verilator-smoke/`.

No project business logic, compiler profile, formal Gate, or Linux-readiness claim changed. This is
reproducible Windows host tooling evidence only; a formal coverage Gate remains Linux-only.

## Entry: Implement Minimal Verification Agent and Verilator Coverage Loop

### Outcome

Implemented an independent `coverage --case <id> [--agent opencode|pi]` experiment. Its dedicated
VerilogEval Provider view materializes the prompt and reference RTL only, normalizes the dataset's
`RefModule` to `TopModule`, and does not materialize or invoke the upstream TB. The Agent generates
`rtl/tb.sv` and `rtl/checker.sv`; the orchestrator enforces an unchanged DUT digest, minimum TB/
checker/assertion structure, fixed Verilator execution, DUT-only LCOV parsing, structured uncovered
targets, at most two supplementation rounds, coverage/no-target/no-gain/max-round stops, and four
mandatory human-review rules.

The first real run exposed the VerilogEval module-name convention and was retained as failed evidence
under `run_bb447beb-3ad1-46cb-aae7-b059b247a701`. After Provider normalization, real run
`run_4558ac19-8ca5-4aa5-9ccc-c119627d14da` completed two Agent + Verilator rounds and stopped for
human review. Its aggregate `--coverage` LCOV also exposed an unsatisfiable constant-output toggle
target, so the final MVP uses `--coverage-line`. The final line-only runner passed a real Verilator
integration; no additional model call was needed for that tool-semantic correction.

### Validation

- focused coverage/provider/Agent tests: passed
- real Windows Verilator line-coverage integration: passed
- real OpenCode Agent + Verilator two-round run: completed, non-authoritative, human review required
- `corepack pnpm typecheck`: passed
- `corepack pnpm build`: passed
- full repository tests: 36 files passed / 1 skipped; 260 tests passed / 2 skipped
- scoped ESLint and Prettier checks for all touched implementation/docs files: passed
- `git diff --check`: passed
- repository-wide lint/format commands remain blocked only by pre-existing untracked `.tmp/`
  midyear-PPT artifacts; those user-owned files were not modified or deleted

## Entry: Accept Short Coverage Case Selectors

### Outcome

The coverage CLI now reuses the existing evaluation selector semantics. `--case` accepts an exact
case ID or a case-insensitive unique prefix, so `Prob001` and `prob001` resolve to
`Prob001_zero`. Missing or ambiguous prefixes fail before constructing an Agent adapter or making a
model call. Both `--agent opencode` and `--agent pi` use the same resolution path.

### Validation

- focused profile-selection tests: 1 file, 8 tests passed
- `corepack pnpm typecheck`: passed
- scoped ESLint and Prettier checks: passed

## Entry: Repair Default Windows Verilator Launch for Pi Coverage Runs

### Outcome

Diagnosed failed coverage run `run_e3b8f3cf-1d68-4d38-a373-351b8eb0583e`. Pi successfully resolved
`Prob101` to `Prob101_circuit4`, preserved the DUT, and generated a complete TB plus checker. The
first Verilator failure was environmental: the default executable did not receive its matching
`VERILATOR_ROOT` or UCRT64/MSYS PATH. After supplying those values, Verilator exposed a non-fatal
`TIMESCALEMOD` warning because generated verification files had a timescale and the dataset DUT did
not.

The default Windows path now automatically supplies the verified MSYS2 root/PATH and retains the
GCC ABI flag. The fixed Verilator argv also includes `-Wno-fatal`, so warnings remain in evidence but
do not replace actual errors. Explicit executable overrides remain responsible for their own
environment.

The existing Prob101 DUT/TB/checker were reused without another Pi call. They compiled, simulated
all 16 input combinations, printed `All tests passed.`, produced `coverage.dat`, and converted to
LCOV successfully under `evidence/coverage/environment-recheck-2`.

### Validation

- focused environment/selector/coverage tests: 3 files, 14 tests passed
- real Verilator integration with deliberate DUT/TB timescale mismatch: passed
- existing Prob101 generated assets: real compile, simulation, coverage data, and LCOV passed
- `corepack pnpm typecheck`: passed
- `corepack pnpm build`: passed
- scoped ESLint, Prettier, and `git diff --check`: passed

## Entry: Make Missing Coverage Self-Repairing and Reject Empty DUT Scores

### Outcome

The verification experiment now feeds missing TB/checker/assertion/`$fatal` requirements back to the
selected Agent for a bounded repair attempt instead of failing before coverage. These attempts are
separate from coverage rounds. If the three-turn Agent budget ends after valid coverage, the result
stops as `MAX_AGENT_ATTEMPTS` and requires human review.

Real Pi run `run_1e59e739-92ba-43d5-8aa8-f03cb1cf2edb` generated a complete exhaustive Prob101 TB and
assertion checker and completed Verilator, then exposed a false empty-denominator score: the
continuous-assignment DUT had no line points and was shown as 100%. The runner now instruments line
and toggle coverage, splits raw records by their preserved Verilator type, converts only line records
to LCOV, and uses explicitly typed toggle targets only when no DUT line point exists. A report with
neither DUT line nor toggle points fails instead of reporting 100%.

### Validation

- focused coverage/Agent/Pi tests: 3 files, 40 tests passed before typed-toggle addition; updated
  focused coverage tests: 4 tests passed
- full repository tests before typed-toggle addition: 36 files passed / 1 skipped; 265 tests passed /
  2 skipped
- real Pi + Verilator Prob101 run completed with valid TB/checker/assertion and coverage artifacts
- real Verilator continuous-assignment integration passed with a positive typed toggle denominator
- final full repository validation: 36 files passed / 1 skipped; 266 tests passed / 2 skipped
- typecheck, build, repository lint/format, `git diff --check`, and Harness check passed

## Entry: Feed Verilator Compile Errors Back to the Verification Agent

### Outcome

The coverage experiment now distinguishes repairable generated-source compilation failures from
terminal Verilator failures. A normal nonzero compile result with `%Error` records bound to
`rtl/tb.sv` or `rtl/checker.sv` becomes bounded structured feedback at
`context/verilator-compile-feedback-attempt-<n>.json`. The next Agent turn may repair only generated
verification assets; the DUT digest remains enforced and the failed compile does not consume a
coverage round. Each Agent attempt uses a distinct `round-<n>-attempt-<n>` build directory.

DUT-bound diagnostics, spawn/signal/timeout/termination failures, simulation failures, missing
coverage data, and report conversion failures remain terminal. Common guidance now explicitly
forbids `checker` as an instance name because it is a SystemVerilog keyword.

### Real Evidence

- retained Prob131 failure `run_70f67eaf-722e-4a9a-9bbb-aa74e1383338` was recompiled with the new
  real runner; its five `%Error` records were parsed as bounded repairable `rtl/tb.sv` issues
- fresh Pi run `run_4f1fc7c8-6ce3-4345-aa87-a6681c1ade99` avoided the keyword error, completed two
  Verilator rounds, and reached toggle coverage 6/6 (100%) with human review still required

### Validation

- focused coverage/contracts/OpenCode/Pi tests: 4 files, 56 tests passed
- real Windows Verilator coverage integration: passed
- full repository: 36 files passed / 1 skipped; 268 tests passed / 2 skipped
- lint, typecheck, format, and `git diff --check`: passed before final build/Harness validation

## Entry: Use Case/Time Directories for Coverage Runs

### Outcome

New coverage experiments are published under
`.rtl-agent/coverage-runs/<case-id>/run_<YYYYMMDD-HHmmss-SSS>/`. The local timestamp is readable and
lexically sortable. A same-case, same-millisecond collision receives `-001`, `-002`, and so on.
Unsafe case IDs are converted to a portable readable stem with a digest suffix. The established UUID
`runId` remains unchanged inside contracts and evidence, and historical UUID directories are not
migrated.

The CLI now reports the actual relative run directory instead of reconstructing an obsolete UUID
path. Core publication validates every custom directory name as one portable path segment and keeps
atomic no-overwrite behavior during pre-existing and concurrent collisions.

### Validation

- focused coverage/materialization tests: 2 files and 16 tests passed
- full repository: 36 files passed / 1 skipped; 270 tests passed / 2 skipped
- lint, typecheck, build, format, `git diff --check`, and Harness check: passed
- real Windows Verilator coverage integration: passed in 34 seconds
- the first integration invocation used the ordinary Vitest config and was excluded; the first run
  with the correct integration config then reached the test's old 30-second outer timeout while the
  Runner remained active. The integration-only deadline now allows 150 seconds, exceeding the
  Runner's bounded 120-second process timeout, and the isolated rerun passed.

## Entry: Consolidate the Pi VerilogEval 001–156 Experiment

### Outcome

Added `exp_result/verilog-eval/07.24-07.29-kimi-pi-001-156.md` from existing ignored runtime
evidence. The report uses four non-overlapping main batches: `b-20260724-001`,
`b-20260724-002`, `b-20260729-001`, and `b-20260729-002`. The interrupted
`b-20260728-001` Prob101–Prob120 run is documented but excluded because the 2026-07-29 rerun
replaced the full range.

The selected evidence covers Prob001–Prob156 exactly once with no gaps or duplicates. Aggregate
results are 150 candidate compile passes, 126 functional passes, 23 genuine mismatches, six
functional not-run outcomes, and one verification-interface invalid result. The report also records
all mismatch ratios, five compiler failures, one Agent timeout, the persistent Prob099 fixture
invalidity, and a case-aligned comparison with the 2026-07-23 OpenCode run. No model call, RTL
generation, simulation, or business-logic change was made.

### Validation

- read-only reconciliation of selection, summary, batch-result, and functional-simulation evidence:
  156 records, 156 unique cases, Prob001–Prob156 continuous
- aggregate counts revalidated as compile 150, functional pass 126, mismatch 23, not run 6, and
  verification invalid 1
- `corepack pnpm exec prettier --check exp_result/verilog-eval/07.24-07.29-kimi-pi-001-156.md --ignore-unknown`: passed
- final Prettier check over the report and handoff files: passed
- `.harness/session-state.json` parse, `git diff --check`, and `scripts/harness_check.sh`: passed

## Entry: Consolidate the Pi/K3 VerilogEval 001–156 Experiment

### Outcome

Added `exp_result/verilog-eval/07.29-07.30-k3-pi-001-156.md` from existing ignored runtime
evidence. The report uses three continuous, non-overlapping Pi/K3 batches:
`b-20260729-003`, `b-20260729-004`, and `b-20260730-001`. Their selection records cover
Prob001–Prob156 exactly once with no gaps or duplicates, and their capability evidence shares the
same Pi version, K3 model, policy, guidance, and experiment-config digests.

Aggregate results are 148 candidate compile passes, 131 functional passes, 16 genuine mismatches,
eight candidate compile failures, and one verification-interface invalid result. All eight compile
failures are Icarus explicit-cast errors in enum/state assignments. The report records each mismatch
ratio, the persistent Prob099 fixture invalidity, the missing Pi mismatch-analyzer post-processing,
and a case-aligned comparison with the prior Pi/`kimi-for-coding` full-dataset run. No model call,
RTL generation, simulation, or business-logic change was made.

### Validation

- read-only reconciliation of selection, capability, summary, batch-result, run, and functional
  evidence: 156 records, 156 unique cases, Prob001–Prob156 continuous
- aggregate counts revalidated as compile 148, functional pass 131, mismatch 16, not run 8, and
  verification invalid 1
- `corepack pnpm exec prettier --check exp_result/verilog-eval/07.29-07.30-k3-pi-001-156.md --ignore-unknown`:
  passed
- final Prettier check over the report and handoff files: passed
- `.harness/session-state.json` parse, `git diff --check`, and `scripts/harness_check.sh`: passed

## Entry: Start the rtl-core-loop Application-Layer Refactor

### Outcome

Reduced `apps/rtl-core-loop/src/index.ts` from 885 to 623 lines without changing CLI behavior.
Shared named-option parsing and stable JSON error rendering now live in dedicated utilities.
Coverage execution and existing-batch mismatch reanalysis now have independent command handlers
that use the public `@rtl-agent/core-loop` boundary. The entry point remains responsible for
dependency construction, dispatch, process startup, and compatibility exports.

The existing `runRtlCoreLoopCli` signature, dependency injection seams, exit codes, JSON output,
and `updateObservedIssuesBestEffort` export remain intact. No Provider, profile, Agent, compiler,
evidence, functional-result, or coverage-result contract changed. Evaluation orchestration remains
in the entry point for a later bounded extraction.

### Files

- `apps/rtl-core-loop/src/cli-arguments.ts`
- `apps/rtl-core-loop/src/cli-error.ts`
- `apps/rtl-core-loop/src/coverage-command.ts`
- `apps/rtl-core-loop/src/reanalysis-command.ts`
- `apps/rtl-core-loop/src/index.ts`
- `docs/decisions.md`
- `current-task.md`
- `.harness/session-state.json`
- `.harness/session-log.md`

### Validation

- focused application tests: 4 files, 29 tests passed
- full repository: 36 files passed / 1 skipped; 270 tests passed / 2 skipped
- lint, typecheck, build, format, and `git diff --check`: passed
- Harness check: passed after the final handoff update

## Entry: Decouple Mismatch Diagnosis From the Generation Backend

### Outcome

Added `--analyzer opencode|pi` to `evaluate`, `run`, and `reanalyze`. New evaluations default to
the resolved profile backend, so Pi/K3 mismatches now construct a Pi diagnosis path automatically.
An explicit analyzer can differ from the generation backend. Historical reanalysis validates the
persisted `agent-capability.json` against the batch manifest and defaults to that recorded backend.

Added `PiMismatchAnalyzer` behind the existing backend-neutral `MismatchAnalyzer` interface. Both
backends share request validation, public workspace preparation, at-most-two-turn schema repair,
protected-input manifests, and analysis evidence. Pi loads a separate
`.pi/extensions/rtl-mismatch-analyzer-policy.mjs` with only `read,edit`; only `analysis.json` may be
edited. The existing Pi RTL generation extension and capability policy were not broadened.

### Files

- `.pi/extensions/rtl-mismatch-analyzer-policy.mjs`
- `apps/rtl-core-loop/src/mismatch-analyzer-selection.ts`
- `apps/rtl-core-loop/src/index.ts`
- `apps/rtl-core-loop/src/reanalysis-command.ts`
- `apps/rtl-core-loop/test/cli.test.ts`
- `packages/core-loop/src/mismatch-analyzer.ts`
- `packages/core-loop/src/pi-agent-adapter.ts`
- `packages/core-loop/test/mismatch-analyzer.test.ts`
- `packages/core-loop/test/pi-agent-adapter.test.ts`
- `docs/verification.md`
- `docs/decisions.md`
- `current-task.md`
- `.harness/session-state.json`
- `.harness/session-log.md`

### Validation

- focused mismatch/Pi/CLI/journal tests: 4 files, 44 tests passed
- lint, typecheck, and build: passed
- first full repository run: 35 files passed / 1 skipped, 272 tests passed / 2 skipped, with one
  known Windows fake process-tree capability-probe race
- isolated affected OpenCode adapter test: 1 file, 21 tests passed with one worker
- independent full repository rerun: 36 files passed / 1 skipped; 273 tests passed / 2 skipped
- format, diff, JSON, and Harness checks: passed after the final handoff update

## Entry: Guarded Commit Review and Accepted Stable Diagnosis Semantics

### Outcome

Reviewed the complete uncommitted scope before staging. The review identified that an explicit
`--analyzer` selection is not used after valid analysis metadata already exists. The operator
accepted this as intended current behavior: each batch/run keeps its first successful diagnosis as
the stable result and later reanalysis reuses it. Updated the decision, verification, task, and
handoff documentation so the CLI contract no longer implies that an accepted diagnosis is replaced.

No production logic changed for this clarification. R04 remains in progress and still requires the
final license disposition and predeclared human review.

### Validation

- `corepack pnpm install --frozen-lockfile`: passed
- `corepack pnpm lint`: passed
- `corepack pnpm typecheck`: passed
- first `corepack pnpm test`: known Windows fake process-tree race reproduced; 272 passed, two
  skipped, one failed
- isolated `agent-adapter.test.ts` with one worker: 21 passed
- independent `corepack pnpm test` rerun: 36 files passed / one skipped; 273 tests passed / two
  skipped
- `corepack pnpm build`: passed
- `corepack pnpm format:check`: passed
- `corepack pnpm peers check`: passed
- Pi `0.81.1` capability probe with K3 configuration: passed
- final JSON parse, `git diff --check`, and Harness check: passed

## Entry: Mark R04 Complete by Operator Acceptance

### Outcome

The operator reviewed the R04 status and explicitly directed that the task be marked complete.
Accepted the existing Pi/K3 full-dataset evidence as the checkpoint result: 156 continuous unique
cases, 148 candidate compile passes, 131 functional passes, 16 functional mismatches, eight
candidate compile failures, and one verification-interface invalid case. The raw end-to-end
functional pass rate is 83.97%.

Updated the canonical task breakdown, current task, checkpoint report, decision record, and session
state. The report records `PROCEED_TO_FUNCTIONAL_VALIDATION` as the single checkpoint recommendation
and preserves the non-authoritative Windows, direct-host-vvp, no-Linux, and no-formal-Gate
limitations. No model call, RTL generation, simulation, or production code change was made. Per the
checkpoint stop rule, A04 remains `NOT_STARTED` and no later work starts automatically.

### Validation

- Markdown format check: passed
- `.harness/session-state.json` parse: passed
- `git diff --check`: passed
- Harness check: passed

## Entry: Implement R05 Spec Understanding Markdown Contract

### Outcome

Implemented the first Spec Understanding module as a contracted Markdown boundary rather than a
duplicate JSON fact model. Added fixed templates for common `SPEC_FACTS`, implementation-oriented
`RTL_GENERATION`, and immutable-DUT-aware `VERIFICATION_PLANNING`. The verification template keeps
DUT observations separate from Spec requirements and provides shared checkpoints for later
assertion, checker, and testbench generation.

The deterministic Checker validates a strict five-field scalar frontmatter, Spec/DUT digests,
mandatory task sections, stable requirement IDs, logical `spec.md` source lines, confidence,
complete requirement mappings, artifact size, and host-path safety. Empty templates cannot become
valid by changing only `DRAFT` to `READY`. Unknown requirements, duplicate IDs, missing mappings,
and identity drift fail with stable issue codes. No model call, compiler, simulation, dataset access,
or production workflow mutation was added.

### Files

- `packages/core-loop/src/spec-understanding.ts`
- `packages/core-loop/src/index.ts`
- `packages/core-loop/test/spec-understanding.test.ts`
- `docs/spec-understanding.md`
- `docs/tasks/R05-spec-understanding-markdown-contract.md`
- `docs/task-breakdown.md`
- `docs/decisions.md`
- `docs/error-journal.md`
- `docs/verification.md`
- `current-task.md`
- `.harness/session-state.json`
- `.harness/session-log.md`

### Validation

- focused Spec Understanding suite: 8/8 passed
- lint and typecheck: passed
- first two standard aggregate runs: 280 passed / two skipped, with the same unrelated documented
  Windows fake process-tree timeout-classification race
- isolated affected Agent adapter file: 21/21 passed
- full repository with one worker: 37 files passed / one skipped; 281 tests passed / two skipped
- final standard full repository run: 37 files passed / one skipped; 281 tests passed / two skipped
- build, format, peer dependency, diff, JSON, and Harness checks: passed

## Entry: Scope Spec Understanding Entries to Their Required Sections

### Outcome

Repaired the P2 found during guarded R05 review. The Checker now indexes each line by its enclosing
second-level Markdown section before validating structured entries. Spec Facts `REQ-*` bullets are
accepted only in the designated requirement-bearing sections; RTL `IMP-*` rows only in
`Requirement Implementation Map`; and verification `CHK-*` rows only in
`Verification Checkpoints`. A misplaced entry emits `ENTRY_OUTSIDE_SECTION`, is excluded from
extracted/mapped IDs, and cannot hide missing or unmapped requirements.

Added regressions that move a valid requirement into `Ambiguities` and move complete RTL and
verification mapping tables into their input-description sections. No model, compiler, simulation,
dataset, or workflow integration was invoked.

### Validation

- focused Spec Understanding suite: 10/10 passed
- lint: passed
- typecheck: passed after explicitly normalizing a strict indexed lookup's possible `undefined` to
  the existing no-section `null` case
- first standard full run reproduced documented Windows process/scheduling races in unrelated Agent
  adapter and batch tests; 281 passed / 2 skipped / 2 failed
- isolated batch/Agent diagnostic: batch file passed; the Agent race persisted when both files ran
  together
- isolated Agent adapter file: 21/21 passed
- full repository with one worker: 37 files passed / one skipped; 283 tests passed / two skipped
- build and format: passed
- a second standard concurrent full run reproduced the same documented host contention and one
  additional unrelated compiler-adapter 15-second timeout; 280 passed / 2 skipped / 3 failed
- isolated compiler adapter: 9/9 passed
- peer dependency, JSON, diff, and Harness checks: passed
- final format, JSON, diff, and Harness checks were rerun after the handoff update

## Entry: Remove Spec Understanding Markdown Format Checking

### Outcome

The operator chose to let the model generate Spec Understanding Markdown on a best-effort basis
without checking the completed document's format. Removed the line-oriented Markdown Checker,
requirement/mapping extraction, issue/result API, and seven format-oriented tests. Kept three
task-specific templates plus trusted caller validation for the task kind, Spec digest, and the DUT
manifest digest required by verification planning.

Updated the R05 design, task breakdown, verification guidance, decision record, error journal, and
handoff state. The template headings and frontmatter are now explicitly prompt guidance rather than
an acceptance grammar. Model invocation, semantic review, and downstream RTL/assertion/checker/TB
generation remain outside R05.

### Validation

- focused Spec Understanding template suite: 3/3 passed
- lint and typecheck: passed
- full repository with one worker: 37 files passed / one skipped; 276 tests passed / two skipped
- build, format, and peer dependency checks: passed
- final JSON, diff, and Harness checks: passed after this handoff update

## Entry: Create Common Guidance v1 From Completed K3 Mismatch Analyses

### Outcome

Reviewed all 16 functional mismatches from Pi/K3 batches `b-20260729-003`,
`b-20260729-004`, and `b-20260730-001`. Every mismatch has a complete Pi/K3 diagnosis with at
least one cited evidence item and a concrete root cause. The recurring categories were four
initialization/reset-semantic cases, three sequential-timing cases, two FSM-transition cases, two
width/signedness cases, two Spec/reference ambiguities, and one each for bit ordering, counter
boundary, and another localized Spec violation.

Created `config/agents/rtl-core-loop/common-guidance_v1.md` as a complete but inactive candidate.
It preserves the existing rules and adds concrete pre-coding methods: an exact port ledger,
edge-relative cycle table, Moore/Mealy classification, FSM transition/output table, storage/reset
inventory, threshold tracing, and full truth-table/Karnaugh-map verification. Case IDs, hidden
reference behavior, and inferred expected values were not promoted. In particular, analyses
involving unspecified startup, don't-care, or invalid-input behavior were recorded as ambiguity
rather than turned into rules that overfit the benchmark.

The active `common-guidance.md` and the adapter's fixed guidance path are unchanged. Current
OpenCode/Pi capability and experiment identities therefore remain unchanged; v1 requires a later
explicit activation decision.

### Files

- `config/agents/rtl-core-loop/common-guidance_v1.md`
- `docs/decisions.md`
- `current-task.md`
- `.harness/session-state.json`
- `.harness/session-log.md`

### Validation

- K3 mismatch evidence reconciliation: 16 mismatches and 16 complete Pi/K3 analyses passed
- scoped Prettier check: passed
- `git diff --check`: passed
- `.harness/session-state.json` parse: passed
- Harness check: passed

## Entry: Consolidate the Pi/K3 Common-Guidance v1 VerilogEval Experiment

### Outcome

Explicitly activated the reviewed v1 candidate by preserving the original guidance as
`config/agents/rtl-core-loop/common-guidance_v0.md` and copying v1 to the adapter's active
`config/agents/rtl-core-loop/common-guidance.md` path. This intentionally changed the recorded
Agent capability and evaluation-profile identity before the v1 batches ran.

Added `exp_result/verilog-eval/07.31-08.03-k3-pi-common-guidance-v1-001-156.md` from
existing ignored runtime evidence. The report uses three continuous, non-overlapping v1 batches:
`b-20260803-002`, `b-20260731-002`, and `b-20260803-001`. Their selections cover
Prob001–Prob156 exactly once, their Agent and compiler capability evidence is consistent, and all
156 provider transcripts contain the v1 guidance title and `Before Coding` section.

Aggregate results are 146 candidate compile passes, 130 functional passes, 15 functional
mismatches, 10 candidate compile failures, and one verification-interface invalid result. All 10
compile failures are the recurring Icarus explicit-cast error. All 15 mismatches have restricted
Pi/K3 diagnoses; the report labels those root causes as model hypotheses rather than hidden-Oracle
facts.

The case-aligned comparison with the original-guidance K3 run found 120 both-pass cases, 10
improvements, 11 regressions, and 15 both-nonpass cases. Raw end-to-end pass rate moved from 83.97%
to 83.33%, while conditional pass rate among valid simulations moved from 89.12% to 89.66%. The
report also records same-guidance rerun variability, the 57.2% increase in first provider-request
size, and the test-set-informed/single-sample boundary. No model call, RTL generation, simulation,
or production logic change was made.

### Files

- `config/agents/rtl-core-loop/common-guidance_v0.md`
- `config/agents/rtl-core-loop/common-guidance.md`
- `exp_result/verilog-eval/07.31-08.03-k3-pi-common-guidance-v1-001-156.md`
- `current-task.md`
- `.harness/session-state.json`
- `.harness/session-log.md`

### Validation

- evidence assertions: 156 continuous unique cases; totals 146/130/15/10/1; one Agent and compiler
  capability; 156/156 v1 transcripts
- report Prettier check: passed
- `.harness/session-state.json` parse: passed
- `git diff --check`: passed
- Harness check: passed

## Entry: Create a Shorter Common Guidance v2 Candidate

### Outcome

Created `config/agents/rtl-core-loop/common-guidance_v2.md` from the original-guidance and v1
Pi/K3 full-dataset reports and their compile/mismatch analyses. The original run passed 131/156 and
v1 passed 130/156; v1 reduced functional mismatches from 16 to 15 but increased recurring Icarus
enum/state compile failures from 8 to 10. The case-aligned comparison contained 10 improvements and
11 regressions.

v2 retains the guidance areas aligned with observed improvements: cycle alignment, Moore/Mealy
classification, exact ranges and widths, directional FSM inputs, and counter boundaries. It makes
tables, ledgers, and cycle sketches conditional instead of mandatory, requires the smallest
specification-faithful structure, and prohibits unrequested pipeline stages, state, reset, and
defensive protocol behavior. It also strengthens controls for the observed regressions: use
Icarus-compatible `logic`/`localparam logic` FSM encodings, compare one-hot equations with their
transition table, trace shift direction explicitly, avoid reset assumptions, and prefer direct
`case` logic over uncertain Boolean simplification.

The candidate is 98 lines and 915 words, versus v1's 123 lines and 1,188 words. It contains no case
IDs, hidden-reference behavior, inferred expected outputs, or dataset-specific answers. The active
`common-guidance.md` remains on v1, so creating v2 caused no further capability or experiment
identity change. No additional model call, RTL generation, compile, or simulation was run.

### Files

- `config/agents/rtl-core-loop/common-guidance_v2.md`
- `docs/decisions.md`
- `current-task.md`
- `.harness/session-state.json`
- `.harness/session-log.md`

### Validation

- v2 content assertions passed, including required concepts, no case IDs, shorter content than v1,
  and unchanged active-guidance SHA-256
- scoped Prettier check: passed
- `.harness/session-state.json` parse: passed
- `git diff --check`: passed
- Harness check: passed

## Entry: Reconcile Common Guidance v1 Activation Before Commit

### Outcome

The guarded commit review found that the active `common-guidance.md` contained v1 while the handoff
text still described it as unchanged. The operator confirmed that the latest full-dataset
experiment explicitly ran on v1. Updated the decision and handoff records to preserve the actual
sequence: create inactive v1, activate v1 with a new recorded capability identity, run the three
v1 batches, then create inactive v2 without changing active v1.

Preserved the original guidance as `common-guidance_v0.md`. Normalized the committed active v1 file
to repository-required LF and documented that its digest differs from the historical CRLF bytes
used by the Windows experiment. Future runs must probe their actual guidance digest.

### Validation

- v0 text equals the original active guidance from `HEAD`
- active guidance bytes equal the versioned LF v1 file
- all three v1 batches retain the recorded historical CRLF guidance digest
- scoped Prettier check: passed
- `.harness/session-state.json` parse: passed
- `git diff --check`: passed
- Harness check: passed

## Entry: Add an Independent FreeCores I2C Coverage Command

### Outcome

Added `core-loop:i2c-coverage` without changing the existing `core-loop:coverage` command. The new
Provider locks seven FreeCores source files, normalizes the legacy multi-file DUT and regression
bench, and measures the baseline before any Agent action. At most two Agent turns may modify only
`rtl/tb.sv` and `rtl/checker.sv`; DUT and support-model changes are rejected by explicit Agent path
permissions and post-turn digest comparison.

The normalized baseline completed a real Windows Verilator round at 78.16% aggregate coverage:
81.04% line (359/443), 71.43% branch (20/28), and 74.73% toggle (553/740). No real Agent refinement
run was performed. The result claim remains non-authoritative and requires semantic human review.

The latest completed full-dataset VerilogEval guidance experiment is explicitly retained as v1.
The I2C flow is separate. The user-owned active-guidance v2 worktree edit was not modified for this
task and must remain outside the I2C commit.

### Validation

- `corepack pnpm lint`: passed
- `corepack pnpm typecheck`: passed
- `corepack pnpm build`: passed
- `corepack pnpm format:check`: passed
- focused CLI/contracts/I2C/legacy-coverage/Pi tests: 56 passed
- real normalized I2C Verilator baseline round: passed at 78.16%
- full Agent adapter test: one unrelated stale v1-guidance text assertion fails against the
  user-owned active v2 worktree edit

## Entry: Repair Prob099 During VerilogEval Dataset Preparation

### Outcome

Added lock-declared preparation patches to the VerilogEval archive pipeline. Each patch validates a
portable logical path, source SHA-256, exact literal-replacement counts, and result SHA-256 before
the repaired dataset is checked against its complete content manifest and atomically published.
The upstream commit, archive URL, and archive SHA remain unchanged.

The production patch changes 27 `Y2` tokens to `Y1` and 27 `Y4` tokens to `Y3` only in
`Prob099_m2014_q6c_test.sv`. The repaired dataset is versioned as
`v2-c498220d-prob099fix1`; its 472-file manifest digest is
`sha256:403633924c1491de25b7cc896cedd1500594930ef0c00a174adc1040d476d210`.
Synthetic tests prove cold preparation, exact output, valid-cache reuse, and rejection of a wrong
patch source digest.

Real preparation downloaded and verified the pinned archive, applied the patch, and published the
new dataset with `reused: false`. A second run returned `reused: true`, and `fixtures-check`
reported all 156 cases. The prepared Prob099 testbench has the locked result digest, contains 27
`Y1`, 27 `Y3`, and no `Y2`/`Y4`. Historical Pi/K3 candidate `b-20260731-002` then compiled and
simulated with Icarus/vvp against the repaired reference/testbench, producing 0 mismatches in 200
samples. No model call or historical batch mutation occurred.

### Files

- `apps/rtl-core-loop/test/cli.test.ts`
- `core-loop/fixtures/verilog-eval-v2.lock.json`
- `packages/core-loop/src/verilog-eval-lock.ts`
- `packages/core-loop/src/verilog-eval-prepare.ts`
- `packages/core-loop/test/verilog-eval-provider.test.ts`
- `docs/verification.md`
- `docs/decisions.md`
- `docs/error-journal.md`
- `current-task.md`
- `.harness/session-state.json`
- `.harness/session-log.md`

### Validation

- focused VerilogEval Provider/CLI suite: 19 passed
- real dataset preparation: first run `reused: false`, second run `reused: true`
- real fixture check: 156 cases, repaired dataset descriptor and manifest passed
- real Prob099 Icarus/vvp: 0 mismatches in 200 samples
- `corepack pnpm typecheck`: passed
- `corepack pnpm lint`: passed
- `corepack pnpm build`: passed
- full ordinary suite: 280 passed / 2 skipped; one unrelated active-guidance v2 assertion failed
- real repaired-dataset SHA/content/manifest assertions: passed
- scoped Prettier and session-state JSON checks: passed
- `git diff --check`: passed
- Harness check: passed

## Entry: Make Active RTL Guidance Operator-Selectable

### Outcome

Removed v1-specific heading and recommendation assertions from the OpenCode adapter regression.
The test now compares the generated prompt with the normalized contents of the currently selected
`common-guidance.md`, while the existing capability-digest and mid-turn drift checks remain in
place. Operators may therefore switch guidance revisions without editing source tests or weakening
the experiment identity.

The process-tree timeout regression exposed a Windows scheduling race during the aggregate suite:
its 250 ms termination-confirmation allowance was shorter than the production default and could
classify an otherwise timed-out run as a termination failure under load. The test-only allowance is
now 1 second; its required `AGENT_TIMEOUT`, unusable workspace, and no-late-child-write assertions
are unchanged.

### Validation

- focused OpenCode adapter suite: 21 passed
- `corepack pnpm test`: 281 passed / 2 skipped
- `corepack pnpm typecheck`: passed
- `corepack pnpm lint`: passed
- `corepack pnpm build`: passed
- `corepack pnpm format:check`: passed
- `corepack pnpm core-loop:fixtures:check`: 156 cases passed
- `git diff --check` and session-state JSON parse: passed
- equivalent Windows Harness check: passed; `bash` is unavailable in the current PowerShell host

## Entry: Consolidate the Pi/K3 Common-Guidance v2 VerilogEval Experiment

### Outcome

Added `exp_result/verilog-eval/08.03-08.04-k3-pi-common-guidance-v2-001-156.md` from existing
ignored runtime evidence. The report uses three continuous, non-overlapping Pi/K3 batches:
`b-20260803-003`, `b-20260803-004`, and `b-20260804-001`. Their selections cover Prob001–Prob156
exactly once; their Agent/compiler capabilities, repaired dataset identity, and v2 guidance digest
are consistent. All 156 generation transcripts contain the v2 guidance title.

Aggregate results are 155 candidate compile passes, 141 functional passes, 14 genuine mismatches,
one candidate compile failure, and zero verification-invalid cases. All mismatches have complete
restricted Pi/K3 diagnoses. The report compares v2 with original guidance and v1, separates the
Prob099 dataset-repair gain, and records that v2 remains a single unseeded, test-set-informed
Windows experiment rather than causal or formal-Gate evidence. No model call, RTL generation,
compile, or simulation was performed for this report.

### Validation

- evidence reconciliation: 156 records, 156 unique continuous cases, totals 155/141/14/1/0
- capability reconciliation: one Agent capability, one compiler capability, one dataset descriptor
- transcript check: 156/156 contain `RTL Generation Common Guidance v2`
- mismatch analysis check: 14/14 strict analysis artifacts present
- report Prettier check: passed
- `.harness/session-state.json` parse, `git diff --check`, and Harness check: passed

## Entry: Separate Coverage Improvement Guidance from RTL Generation Guidance

### Outcome

Added `config/agents/rtl-core-loop/coverage-guidance.md` and a fixed
`coverage-improvement` adapter profile. The new prompt treats coverage as an incremental edit to
existing verification assets: consume one feedback artifact, target one coherent behavior cluster,
read only the necessary protected RTL, preserve existing checks, and add bounded legal-interface
stimulus. It explicitly rejects exhaustive DUT reading, from-scratch rewrites, hierarchical
backdoors, and assertion weakening.

Both OpenCode and Pi load the selected guidance during probe and turn preparation. The content
digest remains in capability/turn evidence and the explicit coverage profile participates in the
experiment configuration digest. Leaving the profile unset preserves generation's existing
implicit configuration identity and continues to select active Common Guidance v2.

Both `coverage` and `i2c-coverage` select the new profile internally without changing command-line
syntax. Adapter regressions inspect the actual fake-provider prompt and prove it contains Coverage
Guidance v1 and excludes Generation Common Guidance v2.

### Validation

- focused OpenCode/Pi/I2C suite: 3 files, 43 tests passed
- full ordinary suite: 38 files passed / 1 skipped; 283 tests passed / 2 skipped
- `corepack pnpm typecheck`: passed
- `corepack pnpm lint`: passed
- `corepack pnpm build`: passed
- `corepack pnpm format:check`: passed
- `git diff --check`: passed

No real model call was made after this prompt change. A future I2C run remains non-authoritative and
must verify the new transcript/digest plus human-review the resulting verification assets and
coverage gain.

## Entry: Report the First Successful I2C Coverage Guidance v1 Run

### Outcome

Added `exp_result/i2c/08.04-k3-pi-coverage-guidance-v1.md` from existing runtime evidence. The
report reconciles run `run_20260804-154957-029`, its 78.16% normalized baseline, the exact Coverage
Guidance v1 transcript/digest, the TB-only Agent edit, and the final 93.99% weighted score. It also
compares the same fixture with the preceding Common Guidance v2 timeout run.

The report records that one Pi/K3 turn added bounded Wishbone synchronous-reset and debug/readback
stimulus, preserved every protected DUT/model and the checker, cleared 54 of 92 uncovered targets,
and reached the threshold after round 2. Human review accepts the run as a non-authoritative
coverage-refinement experiment while retaining the important limits: toggle coverage is 76.35%, 38
line targets remain, debug/readback accesses lack expected-value assertions, and a single unseeded
Windows comparison does not prove guidance causality or production readiness.

### Validation

- report Prettier check: passed
- report-to-evidence reconciliation: passed for run identity, guidance digest, baseline/final
  coverage, gain, stop reason, and uncovered-target counts
- no model call, RTL edit, compile, simulation, or new coverage run was performed for the report

## Entry: Make I2C Coverage Iterations Configurable

### Outcome

Added `--iterations <1-10>` to `core-loop:i2c-coverage`, defaulting to two Agent refinement turns.
The baseline Verilator measurement remains coverage round one and does not consume an Agent turn.
Added optional `--coverage-threshold <0-100>` and removed the implicit 90% threshold from new
invocations. Omitting the flag now records `coverageThreshold: null` and permits later iterations
after crossing 90 when the other early-stop rules allow.

The result evidence now records `maxAgentIterations` and the nullable threshold, and budget
exhaustion reports `MAX_ITERATIONS`. Historical schema-v1 I2C results without these fields parse as
the former two-turn, 90% setup. Shared attempt and feedback schemas now represent the baseline plus
ten Agent turns, while ordinary generation and VerilogEval coverage retain their existing
operational limits.

### Validation

- focused contracts/I2C/CLI suite: 3 files, 41 tests passed
- full ordinary suite: 38 files passed / 1 skipped; 293 tests passed / 2 skipped
- `corepack pnpm typecheck`: passed
- `corepack pnpm lint`: passed
- `corepack pnpm build`: passed
- `corepack pnpm format:check`: passed
- `git diff --check`: passed

No real Agent call, RTL edit, compile, simulation, or coverage experiment was performed for this
command-control change.

## Entry: Diagnose the Four-Iteration I2C Run Failure

### Outcome

Inspected run `run_20260804-163925-750`. The command parsed `--iterations 4` correctly, stored a
null score threshold, and completed the baseline Verilator round at 78.16%. Its first Pi/K3 Agent
turn timed out after 602,290 ms with `AGENT_TIMEOUT`, no RTL edit, and identical before/after
manifest digests. The experiment therefore stopped immediately with `AGENT_FAILED`; the remaining
three refinement opportunities and coverage round two were never reached.

The provider transcript contains eight completed responses spent reading and analyzing the
feedback, verification assets, DUT regions, and Wishbone model. The ninth response did not complete
before the fixed ten-minute deadline. The Pi event summary reports 317,000,961 original bytes and
truncation, versus 59,569,757 bytes for the earlier successful Coverage Guidance v1 turn. This
supports a stream/latency problem but does not conclusively identify whether the final stall was
inside Pi or at the provider.

### Validation

- supplied terminal result reconciled with persisted experiment evidence
- baseline compile, simulation, and coverage processes confirmed successful and not timed out
- attempt-2 result and all nine retained provider exchanges inspected
- current run compared with the earlier timeout and successful I2C coverage runs
- no implementation, RTL, runtime evidence, model call, compile, simulation, or new run performed

## Entry: Diagnose the Twenty-Minute I2C Run's Simulation Failure

### Outcome

Inspected run `run_20260804-170019-107`. The twenty-minute environment override worked: Pi/K3
completed attempt 2 in 615,239 ms, returned `RTL_CHANGED`, and modified only `rtl/tb.sv`. The
baseline remained 78.16%, and the round-two Verilator compile passed in 28,601 ms.

The generated TB asserted that the undocumented CR debug mirror must read `8'h00`. Simulation
instead returned `8'h40`, the preceding STOP command value, and the generated `$fatal` at
`tb.sv:481` aborted after 476 ms. No round-two coverage data was produced. The result therefore
reported `VERILATOR_FAILED`, one Agent attempt, and one completed coverage round.

The four-iteration option is a maximum budget, not a guarantee that four turns run. Current I2C
orchestration can issue repair turns for missing verification assets and Verilator compile errors,
but treats a nonzero simulation exit as terminal. The remaining three turns could not repair the
bad assertion.

### Validation

- terminal output reconciled with persisted experiment and Agent evidence
- Agent timeout override, completion, mutable-only edit, and event evidence confirmed
- round-two compile success and simulation `$fatal` confirmed
- generated TB diff and DUT CR readback/update logic inspected
- no source/RTL/runtime-evidence edit, model call, compile, simulation, or new run performed

## Entry: Record the Actual I2C Iteration Budget in Run Evidence

### Outcome

Repaired the P2 found by the guarded `commit-main` review. Configurable I2C runs no longer retain a
fixed `profile.maxAttempts: 3` when the operator selects four through ten iterations. The selected
`maxAgentIterations` now becomes the Core Loop run profile's `maxAttempts`, so the materialized run
identity and I2C experiment result describe the same execution budget.

The shared run-profile contract can represent 1–10 attempts. This is representational capacity for
the I2C workflow only; ordinary generation and VerilogEval coverage still construct profiles capped
at three and their orchestration limits are unchanged.

### Validation

- focused contracts/I2C/CLI suite: 3 files and 42 tests passed
- contract regression accepts profile attempt budget 10 and rejects 11
- I2C regression proves `--iterations 4` is persisted as `run.request.profile.maxAttempts: 4`
- frozen install, lint, typecheck, build, format, and peer dependency checks passed
- full repository: 38 files passed / 1 skipped; 294 tests passed / 2 skipped
- the first format check found only the changed contract file; Prettier formatted it and the full
  format check then passed
- no model call, RTL edit, simulation, coverage run, or persisted runtime-evidence mutation occurred

## Entry: Route Confirmed Coverage Simulation Failures to the Next Agent Turn

### Outcome

Implemented structured Verilator simulation feedback for both the dedicated I2C experiment and the
existing VerilogEval coverage orchestrator. A confirmed nonzero exit, signal, or timeout now writes
`context/verilator-simulation-feedback-attempt-<n>.json` with bounded sanitized stdout/stderr,
process metadata, and a strict outcome contract. If another Agent iteration remains, its input
contains `verilatorSimulationFeedbackPath` and orchestration retries the same coverage round after
the mutable verification assets are edited.

The repair boundary is fail-closed: spawn errors, failed process-tree termination, and unconfirmed
close are not sent to the Agent. A failed simulation consumes an Agent attempt but does not count as
a completed coverage round. The final failed attempt still persists its diagnostic before returning
`VERILATOR_FAILED`. OpenCode and Pi prompts plus Coverage Guidance v1 now prioritize repairing the
concrete runtime failure and prohibit guessed expectations for undocumented mirrors.

This directly addresses I2C run `run_20260804-170019-107`, where a generated testbench guessed that
the CR mirror must be `8'h00`, observed `8'h40`, and stopped with unused Agent iterations.

### Validation

- frozen pnpm install passed
- lint, typecheck, build, format, peer-dependency check, and `git diff --check` passed
- focused contracts/coverage/I2C/OpenCode/Pi suite: 5 files and 72 tests passed
- full repository: 38 files passed / 1 skipped; 299 tests passed / 2 skipped
- regressions prove I2C and generic orchestration pass the feedback path to the next attempt, retry
  the same round, and succeed after repair
- regression proves unconfirmed termination remains terminal and does not create Agent feedback
- Bash was unavailable on the Windows host, so `scripts/harness_check.sh` could not run; the same
  required-file existence and session-state JSON checks were performed in PowerShell
- no real Agent call, RTL edit, Verilator execution, coverage run, or persisted runtime-evidence
  mutation was performed

## Entry: Create Inactive Common Guidance v3 Candidate

### Outcome

Added `config/agents/rtl-core-loop/common-guidance_v3.md` without changing the active
`common-guidance.md`. The candidate retains v2's dataset-neutral constraints while making five
remaining error classes more explicit: procedural output legality, edge-N cycle ownership,
history-state holds, truth-table label/index replay, and counter threshold semantics. It contains no
case identifiers or dataset-specific expected behavior and is 832 words versus v2's 915.

### Validation

- active `common-guidance.md` and `common-guidance_v2.md` retain the same SHA-256 digest
- v3 content assertions confirmed all intended contracts and no `ProbNNN` identifiers
- targeted Prettier check and whitespace validation passed
- no Agent call, evaluation run, activity switch, runtime artifact, or business-code change occurred

## Entry: Enable Split-Scoped ChipBench Functional Evaluation

### Outcome

Completed the missing ChipBench execution path. The standalone CLI now accepts
`evaluate --dataset chipbench --split <split>`, selects the verified ChipBench cache, and creates a
Kimi OpenCode or Pi profile bound to exactly one of the 11 locked splits. Omitting range/case
selectors runs the complete split; selectors remain split-local because case IDs repeat across
splits. Root and app package scripts expose the Pi/K3 command directly.

The ChipBench Provider now records the locked reference/testbench paths and digests but continues to
materialize only the prompt for Agent work. After a candidate passes the ordinary compile Gate, a
verification-only method revalidates and copies those hidden assets into the internal batch tree.
The VerilogEval functional implementation was generalized behind a strict `reference.sv`,
`testbench.sv`, and top-`tb` contract, and a ChipBench wrapper reuses its fixed Icarus/VVP process,
timeout, sanitization, mismatch parser, evidence, and result schema. Hidden assets are never copied
to published candidate RTL.

The provider implementation digest was advanced to
`sha256:794a527715816ca7a5f11d8d1b781f75f10ec31effd6f7cd3421f9e558db5dd4`; the pinned archive and
683-file content manifest are unchanged. Existing VerilogEval tests and commands remain compatible.

### Validation

- frozen pnpm install, lint, typecheck, build, format, and peer dependency checks passed
- focused ChipBench Provider/simulation, VerilogEval simulation, profile, and CLI suite: 5 files and
  39 tests passed
- full repository: 39 files passed / 1 skipped; 305 tests passed / 2 skipped
- real ChipBench prepare published `c74fe7d28-r2` with 223 cases; real fixtures-check validated all
  683 files and the exact 9/24/30/6/29/24/30/6/29/6/30 split counts
- real Icarus compile smoke passed with Icarus 12.0
- real Pi capability probe passed for Pi 0.81.1, provider `kimi-coding`, and model `k3`; no model
  turn was started
- provider source digest parity passed; built CLI rejected an invalid ChipBench split with the
  stable `EVALUATION_PROFILE_INVALID` diagnostic
- no real Agent generation, paid model evaluation, ChipBench VVP batch, Linux execution, or human
  review was performed

### Next Boundary

Run `corepack pnpm core-loop:evaluate:chipbench:pi --split self-contained --cases Prob000`, inspect
the published candidate and internal functional result, then decide whether to run the remaining 29
self-contained cases. Keep generation, zero-shot debugging, and one-shot debugging reports
separate.

## 2026-08-10 - Add bounded per-case functional mismatch repair

- Moved functional validation inside run finalization so repaired RTL is compiled and simulated
  before `final-rtl-manifest.json` and `final-result.json` are written.
- Added `--functional-repair-iterations <0-10>` to `run` and `evaluate`, defaulting to 3; zero
  disables repair and the selected value is included in evaluation identity and functional output.
- Added public structured functional feedback, Agent input validation, OpenCode/Pi instructions,
  fixed repair-turn accounting, attempt-scoped simulation evidence, and hidden-asset reuse.
- Preserved the first successful compile attempt for compile-only metrics while retaining total
  repair turns and the final functional repair count separately.
- Focused tests passed: 5 files / 72 tests. Full suite passed: 39 files / 1 skipped and 314 tests /
  2 skipped. Frozen install, typecheck, build, lint, formatting, peer checks, real Icarus integration,
  `git diff --check`, and the Git Bash Harness check also passed.
- No model-backed dataset batch, production Linux Gate, or authoritative evaluation was run.

## 2026-08-10 - Guarded landing review for functional mismatch repair

- Reviewed the complete tracked and untracked change set before staging; no unresolved P1/P2
  finding remains within the operator-confirmed VerilogEval/ChipBench scope.
- The operator explicitly deferred CVDP support. A repository Provider, evaluation profile, and
  functional-simulation adapter are recorded as a later TODO.
- Fresh validation passed: frozen install, 72 focused tests, 314 ordinary tests, lint, typecheck,
  build, formatting, peer checks, real Icarus integration, `git diff --check`, and the Git Bash
  Harness check.
- No model-backed batch, production Linux Gate, or authoritative functional evaluation was run.

## 2026-08-10 - Implement Memory V1 Experience milestone

### Outcome

Implemented the first frozen Memory V1 slice without adding long-term storage. The new
backend-neutral Experience contract distinguishes ordinary first-functional-pass observations from
`simulation_debug`, while a deterministic classifier—not Pi—decides whether sealed Run,
Attempt-compile, final-recompile, and functional evidence form a successful repair trajectory.
Infrastructure-invalid, compile-failed, exhausted, and final-failed paths are excluded.

Added a Pi-only Experience Summarizer with a dedicated read/edit-only extension. Its isolated
workspace contains only the public spec, abstract functional facts, and initial/final candidate RTL;
only `summary.json` is mutable. The output is strictly rebound to provenance, Experience kind,
language, tool, and any caller-supplied circuit type. It receives one bounded schema-repair turn,
records CREATED/SKIPPED/FAILED Case evidence, adds no confidence field, and never changes the Case
compile or functional result. Semantic rejection now names the missing confirmation fact and a
bounded explanation. Prompt and request identities are preserved in metadata and combined into one
full SHA-256 workspace directory, preventing overwrites without creating overlong Windows paths.

### Real Regression

- Fixed an empty pre-Store snapshot sentinel with zero selectable Memory and repair budget 3.
- Ran real Pi 0.81.1 / `kimi-coding` / `k3` Case-by-Case evaluations. First-pass cases remained
  ordinary observations, and ambiguous initialization/spec-reference repairs were rejected.
- Batch `b-20260810-006`, Run `run_7e3ca297-f99b-42c9-8763-3b3675ff5c81`, Case
  `Prob155_lemmings4` produced the required closed loop: Attempt 1 compile/final-recompile passed,
  functional simulation had 114/1003 mismatches, one Pi repair ran, Attempt 2 compile/final-
  recompile passed, and functional simulation had 0/1003 mismatches.
- Pi produced a current-schema-valid CREATED `simulation_debug` Experience abstracting counter
  cycle alignment, inclusive landing threshold, and saturation against long-duration wraparound.
  It remained isolated in ignored Batch evidence; no Memory snapshot or Experience Pool changed.
- A later stochastic replay falsely claimed the present RTL evidence was absent. The new audited
  rejection exposed the precise failure. Required-read enforcement is the next task before
  automatic Case End wiring; unbounded model retries are not an accepted workaround.

### Validation

- focused Experience suite: 9 tests passed;
- root lint and typecheck passed;
- full repository: 40 files passed / 1 skipped; 323 tests passed / 2 skipped;
- root format check and `git diff --check` passed;
- real Pi/Icarus evaluation evidence passed as described above and remains non-authoritative;
- Store, Selector, Consolidator, mode CLI wiring, snapshot publication, production Linux Gate, and
  CVDP support were not implemented.

## 2026-08-10 - Harden Experience terminal eligibility

### Outcome

Fixed the guarded-landing P2 in `classifyExperienceEligibility`. An earlier functional pass can no
longer become Experience when a later Agent attempt makes the sealed Run end unsuccessfully, and
an eligible pass must match `run.attemptCount` with a terminal `COMPILE_PASSED` outcome. Added
status-specific landed-fact checks so contradictory `PASSED` or `MISMATCH` counts/exit codes fail
closed as `TRAJECTORY_INVALID`. Existing repair-compile-failure classification remains unchanged.

### Validation

- focused Experience suite: 11 tests passed;
- root lint and typecheck passed;
- full repository: 40 files passed / 1 skipped; 325 tests passed / 2 skipped;
- root format check and `git diff --check` passed;
- Git Bash Harness check passed using its explicit installed path because `bash` is not on the
  PowerShell PATH.

The first focused Vitest invocation used a package-relative path that the root Vitest include did
not match; rerunning with the repository-relative path passed. No test failure occurred.

## 2026-08-10 - Bind Experience evidence to the sealed Run ID

### Outcome

Removed caller-supplied `runId` from the best-effort Experience request. The boundary now parses the
sealed Run once, injects `run.runId` into the Summarizer request, and uses that same validated ID for
the Case-result evidence directory. A regression supplies an extra traversal-shaped caller field
from plain JavaScript data and proves that it is ignored in favor of the sealed Run ID.

The directly exported Pi Summarizer request now requires branded `RunId`, reparses it at runtime
before any workspace/source path or request digest is constructed, and uses only the normalized
request afterward. A direct-call regression proves a traversal-shaped runtime value is rejected
before Pi or filesystem work starts.

The operator explicitly retained the fixed-dataset assumption and declined an additional
`datasetVersion` equality check as unnecessary for the current evaluation scope.

### Validation

- focused Experience suite: 12 tests passed;
- root typecheck and lint passed;
- full repository: 40 files passed / 1 skipped; 326 tests passed / 2 skipped;
- formatting was mechanically corrected with the repository Prettier after the first format check
  identified the changed function layout; final format, `git diff --check`, and Harness checks
  passed.

## 2026-08-10 - Complete Memory V1 implementation path

### Outcome

Added execution-audited required reads to the Pi Experience Summarizer. CREATED and REJECTED output
is accepted only after Pi read the exact spec, Experience input, schema, summary, and at least one
listed initial/final RTL file.

Implemented `off`, `read_write`, and `frozen` evaluation identity plus automatic Case End Experience.
Active modes require Pi. Frozen runs bind an explicit validated snapshot and keep Experience inside
Batch evidence. Read-write runs require an explicit build-split allowlist, copy only CREATED
Experience into the Batch pool after Case sealing, and consolidate only after the complete Batch.

Implemented the filesystem Store with empty `mem-v0001`, sequential IDs, catalog/provenance/content
validation, canonical SHA-256 verification, parent/latest checks, staging validation, and atomic
publication without overwrite. Implemented deterministic metadata filtering plus an isolated Pi
Selector, max three, strict snapshot ID binding, and fail-open zero selection. The selected Markdown
is injected once per turn through `before_agent_start` as advisory `Relevant RTL Memory`. Selector
acceptance requires audited reads of the spec, filtered catalog, and repair feedback when present.

Implemented ADD/MERGE/REINFORCE/REJECT/CONFLICT consolidation. Every eligible Experience must be
handled exactly once, ADD is capped at five, conflicts never overwrite, partial Batches fail, and no
snapshot is published until the fully derived snapshot validates. Consolidator acceptance also
requires audited reads of the parent snapshot, Experience set, and output schema.

### Real Trial

Batch `b-20260810-007` completed the Case and three functional rounds, then exceeded the desktop
command's 10-minute outer budget during Experience summarization. The audit showed guessed evidence
filenames and no initial read of `context/experience-input.json`; the prompt now requires that file
first and prohibits guessed paths. The outer timeout left the evaluation Node/Pi children alive, so
their exact PIDs, command lines, and parent-child relationship were verified before stopping only that
tree. No Batch result, Experience Pool file, consolidation result, or `mem-v0002` was published;
`mem-v0001` remained the sole snapshot.

### Validation

- focused Experience, Memory, consolidation, Pi policy, Batch, adapter, and CLI suites passed;
- final full repository: 43 files passed / 1 skipped, 343 tests passed / 2 skipped;
- final lint, typecheck, build, format, peer dependency, diff, and Harness checks all passed;
- the real trial is non-authoritative and is negative interruption evidence, not a positive
  Selector/Consolidator publication regression.

## 2026-08-10 - Verify the complete Memory V1 publication and consumption loop

### Outcome

Repaired the real Consolidator integration by naming its exact three input files and applying the
same exact-path protocol to Selector. Both Pi policies now allow only their declared inputs and one
output; directory and read-audit access remain denied. Expanded the Consolidator output guide with
strict operation shapes, exact top-level fields, Experience accounting, and the six required Memory
headings.

The first positive publication produced a structurally valid item with a free-form `design` stage.
A frozen replay exposed that the item could not pass the runtime `initial_generation` filter. The
draft schema and prompt now share one canonical stage namespace: `initial_generation`,
`functional_simulation`, `unknown`, or null. Empty/unknown Memory metadata acts as a deterministic-
filter wildcard, while a regression rejects other noncanonical ADD/MERGE output.

### Real Evidence

- `b-20260810-009`: Case and Experience completed; Consolidator audited all three exact reads and
  published `mem-v0002` from empty `mem-v0001`.
- `b-20260810-011`: Consolidator MERGE-normalized the item to `initial_generation`, preserved
  deduplicated provenance, and atomically published one-item `mem-v0003`.
- `b-20260810-012`: frozen `mem-v0003` Selector audited `spec.md` and
  `context/selection-input.json`, returned `memory-000001`, and attempt evidence bound
  `context/relevant-rtl-memory.md`. Provider transcript captured the injected advisory block and its
  spec/real-feedback precedence statement. Compile and functional simulation passed.

All real runs remain `authoritative: false`; they prove the local Memory orchestration loop, not
Linux Gate readiness or aggregate capability improvement.

### Validation

- focused Memory/Consolidator/Pi policy suite: 3 files and 16 tests passed;
- full repository: 43 files passed / 1 skipped, 344 tests passed / 2 skipped;
- typecheck and build passed after the final stage-contract change;
- frozen install, final lint, typecheck, build, format, and peer dependency checks passed;
- final diff and Harness checks ran after this handoff refresh.

## 2026-08-12 - Analyze full VerilogEval Memory-build Batch

### Outcome

Analyzed completed Batch `b-20260811-004` and published
`exp_result/verilog-eval/08.11-k3-pi-memory-v1-full-build.md` without starting a model call or
rerunning generation, compilation, simulation, or diagnosis. The Batch covered all 156 VerilogEval
`spec-to-rtl` Cases, fixed the empty `mem-v0001` for every Case, and published five-item
`mem-v0002` only after complete Batch execution.

The report distinguishes Memory-build evidence from efficacy evidence. All 178 Agent attempts had
no `relevantMemoryPath`, because the fixed source catalog was empty. The run therefore validates
snapshot isolation, Experience generation, consolidation, and publication, but cannot attribute its
150 functional passes or 11 repair recoveries to Memory.

### Memory Funnel

- 150 Cases were Experience-eligible; 128 produced CREATED Experience, 22 ended
  `SUMMARIZER_FAILED`, and six unsuccessful trajectories were skipped.
- Fifty-six first Summarizer turns were invalid; one bounded correction recovered 34, leaving 22
  failures. Forensic schema comparison classified the final failures as seven disallowed
  first-pass rejections, six missing nullable fields, two overlong circuit types, and seven
  first-pass records carrying non-null debug claims.
- The pool contained 117 `design_observation` and 11 `simulation_debug` records. Consolidation
  rejected all 117 first-pass observations, retained ten repair records in five ADD operations,
  and rejected one construct-specific dual-edge repair.
- All 128 Experience indexes were handled exactly once with no duplicate or omission. The
  Consolidator audited its three exact input reads and published `mem-v0002` with the expected
  parent, source Batch, item count, and canonical digest.

### Validation

- Report-specific PowerShell evidence assertions passed for summary counts, Experience
  statuses/kinds, consolidation accounting, and snapshot lineage.
- Report Prettier check passed.
- Report-scoped `git diff --check` passed.
- Final repository `git diff --check` and the explicit Git Bash Harness check passed.

### Evidence Limits

The result is non-authoritative Windows/local evidence. It does not show that Memory improves first
generation or repair performance. Every new item is scoped to `functional_simulation`, so a paired,
non-overlapping `frozen mem-v0002` versus `off` held-out experiment is required for an efficacy claim.

## 2026-08-12 - Add repair-depth result comparison to Memory report

### Outcome

Extended `exp_result/verilog-eval/08.11-k3-pi-memory-v1-full-build.md` with a mutually exclusive
first-success comparison across all 156 Cases and a terminal-evidence table for every unsuccessful
Case. No model call, generation, compilation, simulation, diagnosis, or Memory publication was run.

### Results

- 139 Cases passed on the first candidate.
- 11 Cases first passed after one repair.
- Zero Cases first passed after two repairs, and zero first passed after three repairs.
- Six Cases remained unsuccessful: three exhausted three repair turns with a mismatch, two failed
  initial compilation without entering repair, and one consumed two repair turns before the second
  repair Agent attempt timed out.
- Corrected the initial-result breakdown from the earlier 14-mismatch/three-nonsimulated wording to
  15 initial mismatches and two initial compile failures.

### Validation

- Reconstructed repair depth from Case summaries, attempt-scoped Agent results, compile evidence,
  and functional-simulation results.
- Asserted that the mutually exclusive buckets sum to all 156 Cases and that the six unsuccessful
  Case identifiers match the Batch summary.
- Prettier passed for the report and updated handoff documents; session-state JSON parsing and
  `git diff --check` passed.
- The explicit Git Bash `scripts/harness_check.sh` check passed.

### Evidence Limits

The comparison describes outcomes inside the Memory-build run. Because its fixed source snapshot
was empty and no attempt received selected Memory, it does not measure a Memory-versus-control
effect.

## 2026-08-12 - Complete guarded Memory V1 landing review

### Outcome

Completed the guarded review of the full Memory V1 implementation. The operator accepted exclusion
of the ignored full-run report from the commit and chose a strict canonical stage contract instead
of permanent compatibility for the experimental `design` label.

Snapshot catalog entries and Consolidator ADD/MERGE drafts now accept only
`initial_generation`, `functional_simulation`, `unknown`, or `null`. Invalid draft metadata fails
with the stable `MEMORY_STORE_INVALID` code and cannot publish a new snapshot. Batch consolidation
failure now emits `MEMORY_CONSOLIDATION_FAILED` instead of being mislabeled as an Experience
summarization failure.

### Review Decisions

- `b-20260810-011` remains the one-time migration from the experimental `design` label; it does not
  establish an ongoing compatibility requirement.
- The existing Consolidator instruction about normalizing a noncanonical item remains only to
  preserve the validated V1 prompt identity. The snapshot schema prevents such an item from
  reaching consolidation.
- No P1 or P2 finding remains in the reviewed commit scope.

### Validation

- Focused Memory, Consolidator, and CLI tests passed: 3 files and 46 tests.
- Frozen install, lint, typecheck, build, format, and peer dependency checks passed.
- The first aggregate test invocation hit the documented Windows process-tree capability-probe
  race. The affected 24-test file passed with `--maxWorkers=1`; the subsequent clean aggregate run
  passed 43 files with 1 skipped and 345 tests with 2 skipped.
- Final diff and Harness checks were scheduled after this handoff refresh.

## 2026-08-12 - Diagnose b-20260812-001 invalid Memory run

### Outcome

Diagnosed the completed `b-20260812-001` evidence without starting a model call or rerunning any
Case. The initiating failure was Case 92, `Prob092_gatesv100`, not Memory consolidation. The Run
entered `AGENT_RUNNING` and became infrastructure-level `INCOMPLETE` after 32.356 seconds, before
`context/agent-input.json`, Agent-result evidence, provider transcript, RTL, compile evidence, or
functional simulation existed.

The Pi adapter runs bounded `--version` and `--help` capability probes before it writes the Agent
input, with a 30-second cap per probe. The evidence and timing therefore identify a transient Pi
capability-probe failure or timeout before the model request. The generic incomplete-run evidence
does not retain which individual probe failed. A current read-only check found `--version` healthy
at 3.741 seconds with the locked `0.81.1` result and `--help` healthy at 4.151 seconds.

### Downstream Effects

- Cases 1-91 passed functional simulation.
- The evaluator stopped at the incomplete Case 92, leaving Cases 93-156 unexecuted. One failed plus
  64 skipped Cases yields the reported `functionalNotRun: 65`.
- The Batch status became `INVALID`; complete-Batch Memory consolidation therefore did not invoke
  Pi and wrote the fail-closed `CONSOLIDATION_FAILED` result. No `pi/` consolidation workspace and
  no next Memory snapshot exist for this Batch.

No runtime evidence or business logic was changed. No model call, compile, simulation, Experience
generation, consolidation, or snapshot publication occurred during the diagnosis.
## 2026-08-12 - Offline Memory Build from selected Experience Batches

- Revised the recovery design after operator feedback: no evaluation Batch resume protocol.
- Removed the evaluator's global stop conditions so an infrastructure-invalid Case no longer blocks
  later valid Cases; the Batch remains invalid and metrics preserve the failed Case.
- Cached the successful Pi capability result per adapter lifecycle while preserving per-turn drift
  validation.
- Added deterministic, path-safe loading of one or more explicitly selected
  `.rtl-agent/memory/experiences/<batch-id>` directories, canonical Experience de-duplication, and a
  source-file manifest.
- Added `memory-build --experience-batches <batch-id,...>`, separate Memory Build evidence under
  `.rtl-agent/memory/builds/<build-id>`, and atomic publication through the existing Consolidator and
  Memory Store boundary.
- Read-only real-data validation loaded all 76 retained Experience files from `b-20260812-001`; no Pi
  Consolidator call and no snapshot publication occurred.
- Validation: typecheck, lint, build, format, and `git diff --check` passed; focused tests passed 68/68;
  full Vitest passed 350 tests with 2 skipped across 45 passing files and 1 skipped file.

## 2026-08-12 - Disable automatic evaluation Memory publication

- Removed Batch-End Memory Consolidator construction and invocation from `run` and `evaluate`.
- Kept `read_write` fixed-snapshot selection, Case-End Experience summarization, and Experience Pool
  persistence unchanged.
- Added `publication: DEFERRED_TO_MEMORY_BUILD` to read-write evaluation output; inactive modes report
  `DISABLED`.
- Added a CLI regression with an injected Consolidator that throws if called. Evaluation completed,
  the Consolidator was never called, and the Memory Store remained at `mem-v0001`.
- Updated the Memory contract and decision log so only explicit `memory-build` may publish a snapshot.
- Validation: 55 focused tests passed; full Vitest passed 351 tests with 2 skipped across 45
  passing files and 1 skipped file. Lint, typecheck, build, format, peer dependency,
  `git diff --check`, and Harness checks passed.
## 2026-08-13 - Raise descriptive Memory metadata limit

- Diagnosed `b-20260813-001` without rerunning Pi: all 130 Experience indexes were handled exactly
  once, but operation 3 returned a 135-character `circuit_type` against the 128-character schema.
- Raised the shared non-null `circuit_type`, `failure_type`, `language`, and `tool` limit to 1024 in
  Experience, Memory catalog, and Consolidator draft schemas.
- Added the exact 1024-character constraint to the Consolidator system prompt and generated
  `output-schema.json` so Pi sees the real acceptance contract before writing output.
- Added regressions proving the observed 135-character value is preserved and a runaway
  1025-character value remains rejected.
- Full validation passed: 45 test files passed and 1 skipped; 353 tests passed and 2 skipped. Lint,
  typecheck, build, format, peer dependency, diff, and Harness checks passed.
- No Pi/model call, Case rerun, failed-build rewrite, or snapshot publication occurred.

## 2026-08-13 - Report b-20260812-001 and b-20260812-002 as a derived full set

- Published `exp_result/verilog-eval/08.12-k3-pi-memory-v1-001-156.md` from existing runtime
  evidence without calling Pi, rerunning a Case, or publishing Memory.
- Preserved the native result boundary: `b-20260812-001` remains `INVALID` after the Prob092
  infrastructure interruption; the report combines only its complete Prob001-Prob091 results with
  `b-20260812-002` Prob092-Prob156 as a derived, non-atomic full-set view.
- The derived set contains 156 unique consecutive Cases. All final functional simulations passed:
  138 on the first candidate and 18 after repair, with repair-depth histogram `0:138, 1:13, 2:3,
  3:2`.
- Reconstructed all 18 repair trajectories. They consumed 25 repair turns; 24 injected selected
  Memory. The one empty selection was Prob062 attempt 2.
- Audited 130 CREATED Experiences: 114 design observations and 16 simulation-debug records. Two
  repaired Cases were safely skipped because public evidence could not confirm the root cause.
- Confirmed offline Build `b-20260813-001` loaded 130 unique Experiences with no duplicates and
  handled every index exactly once before the historical 135-versus-128 metadata validation
  failure.
- Explicitly limited the interpretation: `mem-v0002` was built from the same VerilogEval Case set,
  and at least five repaired Cases selected Memory containing their own historical evidence, so the
  run demonstrates closed-loop operation rather than held-out efficacy.
- Report assertions passed for Case continuity, functional outcomes, repair and Memory-turn counts,
  Experience kinds/statuses, consolidation index coverage, and the 135-character failing value.

## 2026-08-13 - Guard Experience manifest provenance during landing review

- The commit-main review found one P2: the offline loader scanned each Experience source to capture
  its digest, then read it again for parsing without verifying that the bytes were unchanged.
- The loader now hashes the bytes it actually parses and rejects a source that changed after the
  scan, preventing a Memory Build manifest from binding an Experience to stale provenance.
- Extended the deterministic loader regression to verify every manifest source digest against its
  retained file bytes. No P1 finding was identified.
- Post-fix focused validation passed 76/76 tests. Frozen install, lint, typecheck, the full 353-test
  suite (2 skipped), build, format, peer dependency, `git diff --check`, and Harness checks passed.

## 2026-08-13 - Report ChipBench self-contained frozen Memory run

- Published `exp_result/chipbench/08.13-k3-pi-frozen-mem-v0003-self-contained.md` from existing
  `b-20260813-001` evidence without invoking Pi, rerunning RTL, compiling, simulating, diagnosing,
  building Memory, or publishing a snapshot.
- Confirmed 30/30 initial candidates compiled; initial functional pass was 10/30. Feedback-plus-
  `mem-v0003` repair recovered nine of 20 mismatches, producing a final 19/30 functional pass rate.
- Reconstructed all 70 Agent turns and 63 functional simulations. Four repair turns timed out at
  about 602 seconds, and all three compile failures belonged to `Prob005`; these five Cases had no
  final functional result even though their initial candidates were simulatable.
- Audited 38 non-empty Selector results and 93 Memory references across 40 Memory-bound repair
  turns. The report does not attribute repair uplift to Memory alone because every repair also
  received functional mismatch feedback.
- Audited 15 CREATED, two FAILED, and 13 SKIPPED Case-End Experience results. Frozen mode retained
  them inside Batch evidence and did not publish an Experience Pool or run consolidation.
- Report-specific assertions and Prettier validation passed. The evidence remains local Windows,
  non-authoritative, and pending the predeclared human review.

## 2026-08-14 - Report ChipBench minimal-guidance empty-Memory run

- Published
  `exp_result/chipbench/08.13-k3-pi-minimal-guidance-empty-memory-self-contained.md` from existing
  `b-20260813-002` evidence without invoking Pi, rerunning RTL, compiling, simulating, diagnosing,
  building Memory, consolidating, or publishing a snapshot.
- Preserved the exact configuration boundary: the profile records `read_write` with empty
  `mem-v0001`, while 66/66 attempt inputs have no `relevantMemoryPath` and no Memory block was
  injected. The guidance file contains only a heading and `you are an expert RTL engineer.`, so the
  report calls it minimal guidance rather than a literally absent field.
- Confirmed 29/30 initial candidates compiled and 10/30 passed. Feedback-only repair recovered six
  of 19 mismatches, all in the first repair round; the final result was 16 passes, six mismatches,
  and eight cases without a final simulation.
- Reconstructed 66 Agent turns and 58 functional simulations. Six repair turns timed out at about
  602 seconds, one initial candidate failed enum-cast compilation, and one final repair used reserved
  keyword `buf` and regressed to a compile error.
- Audited 15 CREATED, one FAILED, and 14 SKIPPED Experience results. All 15 CREATED records were
  persisted to the Batch Experience Pool, but evaluation did not run consolidation or publish a
  snapshot.
- Compared the run with `b-20260813-001` only as a two-variable, unseeded paired observation. The
  new run had three fewer final passes and three more final-simulation gaps; the evidence cannot
  separate Memory, guidance, and sampling effects.

## 2026-08-14 - Consolidate VerilogEval and ChipBench experiment records

- Published `exp_result/rtl-agent-experiment-summary.md` as one concise overview of the existing
  VerilogEval and ChipBench reports; no detailed report or Batch evidence was removed or rewritten.
- Compressed the VerilogEval progression from the 119/156 baseline through Pi/K3, common-guidance
  v1-v4, feedback-only repair, Memory V1 build, and the derived 156/156 closed-loop replay.
- Compressed the ChipBench progression from the 9/30 baseline through guidance v3 and the two repair
  configurations. The overview records that v3 plus `mem-v0003` reached 19/30 versus 16/30 with
  minimal guidance and empty Memory, a 3-Case / 10-point positive combination signal.
- Preserved the attribution limits: runs are unseeded, the ChipBench comparison changes both
  guidance and Memory, and the VerilogEval Memory replay overlaps the Memory build set.
- Source-figure assertions passed for all ten VerilogEval reports and both ChipBench repair reports.
  No model call, RTL generation, compile, simulation, diagnosis, Memory Build, consolidation, or
  snapshot publication was performed.

## 2026-08-14 - Explicit ChipBench seeded Debug and reusable baseline

- Added command-selected `debug-baseline-prepare` and `debug-evaluate` flows for ChipBench zero-shot
  Debug splits. The ordinary generation/evaluate path remains prompt-only.
- Added seeded Debug Provider materialization that extracts the target `TopModule` after the locked
  prompt marker and writes it to `rtl/dut.sv` before the first Agent turn.
- Added `SEEDED_FUNCTIONAL_REPAIR`, profile task mode `SEEDED_FUNCTIONAL_DEBUG`, and Agent task kind
  `FUNCTIONAL_DEBUG`; both OpenCode and Pi prompts now describe repair of existing RTL.
- Added an atomic content-addressed baseline cache. Its identity binds the locked dataset, selected
  split and case order, Provider source digest, compiler capability, VVP executable digest, and
  runner version. Each starter must compile, simulate, and produce a positive mismatch.
- Debug evaluation requires an exact manifest and per-Case starter digest match. It does not compile
  or simulate the original buggy RTL again inside the Batch.
- Debug v1 rejects active Memory modes and defaults to zero additional functional feedback-repair
  iterations. No Memory or Experience semantics were inferred from the generation workflow.
- Added deterministic Provider, baseline, orchestration, profile, and CLI regressions. Focused
  validation passed 75 tests and TypeScript typecheck passed.
- Real local verification prepared all 30 `debug-zero-shot-assignment` Cases successfully with
  manifest `sha256:c19159fe6a9d84d625fda6991a5cf27b15dafca918ff359451345b296e544897`.
  The immediate second invocation returned `reused: true` with the same digest.
- No Pi/model call, Debug evaluation Batch, Memory selection, Experience generation, consolidation,
  or snapshot publication occurred.

## 2026-08-14 - Report the prompt-only assignment Debug baseline

- Published `exp_result/chipbench/08.14-k3-pi-debug-zero-shot-assignment-baseline.md` from sealed
  Batch `b-20260814-001` without invoking Pi, rerunning RTL, compiling, simulating, or rewriting
  runtime evidence.
- Confirmed that the ordinary `core-loop:evaluate:chipbench:pi` command used the prompt-only v2
  profile, two-line minimal guidance, Memory off, and zero functional repair iterations. All 30
  candidates compiled and ran functional simulation; 19 passed and 11 remained mismatches.
- Corrected the metric boundary: native Core Loop `rawFirstAttempt: 30/30` is the compile-oriented
  Agent success metric, while the strict functional baseline is 19/30 = 63.33%.
- Audited 30 Agent turns, 30 attempt inputs, 30 provider transcripts, 140 usage-bearing exchanges,
  and 11 accepted mismatch analyses. Candidate generation recorded 320,585 provider total tokens
  and $1.173879 provider-reported cost; Analyzer token/cost was not persisted and is excluded.
- Paired the ordinary Batch with the separately prepared seeded starter manifest. The 30 buggy
  starters had 18,564/29,235 mismatches; prompt-only candidates had 6,284/29,235, with 19 passes,
  six partial improvements, one unchanged mismatch, and four regressions.
- Kept the two experiment identities separate. `b-20260814-001` is the prompt-only historical
  baseline and did not consume the new seeded starter cache; the first
  `core-loop:debug:chipbench:pi` model Batch remains pending.
- Final implementation validation passed frozen install, lint, typecheck, build, peer dependency,
  diff, JSON, Provider-digest, and Harness checks. Full Vitest passed 358 tests with two skipped.
  All task files pass Prettier; the whole-repository format command remains nonzero only for the
  preserved preexisting `.claude/settings.local.json` and minimal `common-guidance.md` user edits.
- Final review added a fail-closed guard that rejects prompt-only fixture materialization whenever a
  seeded Debug baseline is supplied. All 16 focused orchestration tests and the final typecheck
  passed after this guard.
- The guarded `commit-main` review reported two baseline-provenance P2 notes: the public cache API
  does not independently bind the supplied Icarus executable to the probed capability digest, and
  the manifest loader does not recompute `identityDigest` from its own fields. The operator
  explicitly classified both as over-design and accepted them as non-blocking for this landing.
- Commit-main verification passed frozen install, lint, typecheck, build, peer dependency, targeted
  Prettier, and Harness checks. Full Vitest passed 359 tests with two skipped.

## 2026-08-17 - Show per-Case progress for seeded Debug

- Extended the existing CLI `onCaseStart` progress callback from `evaluate` to `debug-evaluate`.
- Debug runs now emit `正在处理 <case-id>... (<current>/<total>)` to stderr before each valid Case,
  while the final machine-readable JSON remains on stdout.
- The change does not alter model inputs, Batch evidence, baseline reuse, Memory mode, or functional
  evaluation behavior.
- Commit-main validation passed the 33-test CLI suite, TypeScript typecheck, lint, build, targeted
  Prettier, diff, and Harness checks. No Pi/model evaluation was started.

## 2026-08-17 - Report the first seeded assignment Debug Batch

- Published `exp_result/chipbench/08.17-k3-pi-seeded-debug-zero-shot-assignment.md` from sealed
  Batch `b-20260817-001` without rerunning the model, compilation, simulation, baseline preparation,
  Memory, consolidation, or snapshot publication.
- Confirmed the intended experiment identity: `SEEDED_FUNCTIONAL_DEBUG`, cached starter manifest
  `sha256:c19159fe6a9d84d625fda6991a5cf27b15dafca918ff359451345b296e544897`,
  Pi/K3, minimal guidance, Memory off, one Agent attempt, and zero feedback-repair iterations.
- All 30 Agent outputs changed RTL, compiled, and ran functional simulation. Twenty passed and ten
  remained mismatches; there were no timeouts, policy violations, or verification-invalid cases.
- Relative to the 30 buggy starters, the run produced 20 full repairs, six partial improvements,
  and four regressions. Total mismatch samples fell from 18,564/29,235 to 4,793/29,235, a 74.18%
  reduction.
- Compared with the earlier prompt-only Batch `b-20260814-001`, seeded Debug gained one functional
  pass and reduced mismatches by 1,491, but used 97,868 more provider total tokens. The report keeps
  this as an observational comparison because task representation and uncontrolled model sampling
  both differ.
- Audited 30 provider transcripts and 139 usage-bearing exchanges: 418,453 provider total tokens
  and $1.393244 provider-reported cost. Ten mismatch Analyzer calls did not persist usage and are
  excluded.
- The report passed targeted Prettier validation; handoff state now records the Batch as completed
  and reported.

## 2026-08-17 - Diagnose the timing baseline preparation failure

- Audited all 89 pinned zero-shot Debug prompts. Arithmetic (24), assignment (30), and state-machine
  (6) use the TopModule-qualified target marker. Timing mixes 14 qualified markers with 15 shorter
  `code below has bug` markers; no prompt lacks both observed forms.
- Extended the extractor to accept exactly those two marker variants while preserving the fenced
  `TopModule` requirement and fail-closed behavior for unknown text. Updated the Provider source
  digest in both lock representations and added positive and negative regressions.
- Added public Case/status details to baseline validation errors. Focused Provider/baseline tests,
  typecheck, lint, and build passed.
- Re-ran the real timing baseline without any model call. Extraction succeeded, but preparation
  stopped at `Prob013_least_common_multiple` with `SIMULATION_COMPILE_ERROR`, compile exit 2. The
  starter declares `mcd_out` as `output wire` and assigns it in an `always` block.
- The current reusable baseline intentionally accepts only compiled positive-mismatch starters.
  Supporting all 29 timing Cases therefore requires an explicit mixed functional-debug/compile-debug
  protocol; no Case was excluded and no dataset RTL was normalized or repaired.
- Discovered existing completed operator Batches while refreshing state: state-machine
  `b-20260817-002` passed 4/6, and arithmetic `b-20260817-003` passed 17/24. Their detailed reports
  remain pending.

## 2026-08-17 - Normalize and prepare the full timing functional baseline

- Kept seeded Debug functional-only at the operator's direction. Added ChipBench preparation-patch
  support using the established path, source digest, literal occurrence count, result digest, and
  atomic publication pattern.
- Normalized three timing starters without changing reference/testbench assets: `Prob013` retains an
  extra registered `mcd_out`, `Prob016` retains an extra registered `clk_out7`, and `Prob022` now
  updates its write pointer on the wrong clock edge instead of looping indefinitely in zero time.
- Published dataset identity `c74fe7d28-r5`, adapter `v2.3.0`, normalization
  `prompt-only-v5-timing-starter-normalization-v1`, and content manifest
  `sha256:faaadfbe3d459eba8f87e98c9040902278c7baca99997a7d6ae0012299d2291c`.
- Added deterministic positive preparation/reuse coverage and a source-digest mismatch rejection.
  The focused seven-test Provider suite and TypeScript typecheck passed.
- Real dataset preparation and the 223-Case fixture check passed. The resulting normalized files
  match every locked result digest.
- The complete 29-Case timing baseline prepared successfully: every starter compiled, completed
  simulation, and produced a positive mismatch, totaling 7,368 mismatches. The manifest is
  `sha256:1f4303f62a02cf87d1005fdf9575c0c108a314068da70a7aef2836e09943555b`;
  an immediate repeat returned `reused: true`.
- No Pi/K3 Debug Batch, Memory operation, Experience generation, consolidation, or snapshot
  publication was started.
- Final validation passed the full 361-test suite with two skipped, lint, typecheck, build, peer
  dependency, targeted formatting, diff, JSON, lock-digest, and Harness checks.

## 2026-08-17 - Report all four seeded zero-shot Debug splits

- Audited sealed Batches `b-20260817-001` through `b-20260817-004` and their exact cached starter
  manifests without rerunning Pi/K3, compilation, simulation, baseline preparation, Memory,
  Experience, consolidation, or snapshot publication.
- Published `exp_result/chipbench/08.17-k3-pi-seeded-debug-zero-shot-all-splits.md` as the concise
  combined report for assignment, state-machine, arithmetic, and timing.
- The strict cross-version observation is 55/89 functional passes: 20/30 assignment, 4/6
  state-machine, 17/24 arithmetic, and 14/29 timing. There are also 16 partial improvements, two
  unchanged mismatches, 13 regressions, and three timing candidates that did not reach functional
  simulation.
- On the 86 runnable paired Cases, mismatch count fell from 32,016/71,369 to 10,802/71,369, a
  66.26% reduction. The report keeps case-level pass rate as the primary metric because micro
  mismatch totals are sample-weighted.
- Identified the three timing non-runs directly from Batch evidence: `Prob021` and `Prob022` omitted
  `dual_port_RAM` and failed candidate compilation; `Prob034` timed out during the Agent attempt.
- Aggregated 406 usage-bearing main Agent exchanges: 1,191,502 provider total tokens,
  $4.029632 provider-reported cost, and 02:07:16 total Batch wall time. The 31 mismatch Analyzer
  calls lack persisted usage and remain excluded.
- Preserved the provenance boundary: the first three Batches use dataset `c74fe7d28-r2`, while
  timing uses normalized `c74fe7d28-r5`; `55/89` is explicitly labeled a cross-version observation.

## 2026-08-17 - Inspect Memory stores for the next frozen Debug experiment

- Confirmed `.rtl-agent/memory-ve` is the archived VerilogEval store. Its published `mem-v0003`
  contains nine Memory items derived from VerilogEval `spec-to-rtl` Experience.
- Confirmed the active `.rtl-agent/memory` is the later ChipBench store. It contains self-contained
  ChipBench Experience from `b-20260813-002`, but only an empty `mem-v0001` snapshot.
- The runtime hard-codes `.rtl-agent/memory`, so the proposed short-term switch is logically correct:
  archive the current store as `memory-chip`, then restore `memory-ve` as `memory`.
- No directory was moved or renamed during inspection. Seeded Debug currently rejects frozen Memory
  and the package command hard-codes Memory off, so implementation must precede the switch.
- Frozen mode already prevents Experience persistence and snapshot publication, but still invokes
  the Experience summarizer. The clean read-only comparison should suppress that unused call while
  retaining selector-driven Memory injection.
- One read-only snapshot-summary diagnostic repeated the documented PowerShell direct-`foreach`
  pipeline parser error. It was corrected with an intermediate `$rows` collection and recorded in
  `docs/error-journal.md`; no repository or Memory data was changed by the failed command.

## 2026-08-17 - Enable frozen Memory for seeded Debug

- Seeded `debug-evaluate` now accepts Memory `off` or an explicit `frozen` snapshot and continues to
  reject `read_write`. Omitting Memory flags still defaults to `off`.
- Removed the package script's hard-coded `--memory-mode off`, allowing callers to append
  `--memory-mode frozen --memory-snapshot <id>` without changing the default behavior.
- The first seeded Debug turn now queries `functional_simulation` / `output_mismatch` Memory and is
  labeled as functional repair for selection. Ordinary generation still begins with
  `initial_generation`; this separation has direct regression coverage.
- Frozen seeded Debug skips Experience summarization, persistence, Memory Build input, and snapshot
  publication while retaining selector-driven Memory read and prompt injection.
- Kept the seeded Debug feedback-repair default at zero. The existing
  `--functional-repair-iterations <0-10>` flag remains the explicit override, so repair depth can be
  tested separately without changing the default.
- The operator completed the store switch during implementation. Active `.rtl-agent/memory` is the
  VerilogEval store with `mem-v0003`; `.rtl-agent/memory-chip` archives the ChipBench store. A
  read-only load found all nine items eligible for the intended functional Debug query.
- Validation passed the 36-test CLI suite, full Vitest suite (364 passed, two skipped), typecheck,
  lint, build, peer dependency, targeted Prettier, diff, and Harness checks. No model-backed Debug
  Batch, RTL compilation, simulation, Experience write, or Memory publication was started.

## 2026-08-17 - Refresh the assignment baseline for the current identity

- The first frozen assignment Debug attempt stopped before any model call with
  `DEBUG_BASELINE_INVALID`.
- Diagnosed the exact identity mismatch: the available assignment cache used dataset
  `c74fe7d28-r2` and Provider digest `sha256:e1af69c...`, while the current lock uses dataset
  `c74fe7d28-r5` and Provider digest `sha256:49399b...` after timing normalization and target-marker
  extraction changes. Memory mode and `mem-v0003` were not involved in the failure.
- Re-ran `debug-baseline-prepare` for all 30 assignment Cases. It completed without a model call and
  published manifest `sha256:53155540d4d3286c45d9f0e4eeaa0e08455b3536cc71730e9a7e6c817ea1e3bf`.
- An immediate second prepare returned `reused: true` with the same manifest, proving the current
  frozen Debug command can now resolve the baseline cache.

## 2026-08-17 - Guarded landing review for frozen seeded Debug

- Reviewed every tracked modification plus the untracked `.claude` settings and workflow image
  before staging. No P1/P2 finding blocks landing.
- Scoped the commit to ChipBench timing normalization, frozen Memory support for seeded Debug,
  tests, command/docs updates, and project handoff records.
- Explicitly excluded `.claude/settings.local.json`, the untracked workflow PNG, and the user's
  minimal `common-guidance.md` experiment change. The ignored `exp_result/` reports remain local
  artifacts and were not force-added.
- Commit-main verification passed frozen install, the full Vitest suite (364 passed, two skipped),
  typecheck, lint, build, peer dependency checks, ChipBench `r5` dataset reuse, and the complete
  223-Case fixture check. Final targeted formatting, diff, and Harness checks remain the last gate
  before staging.

## 2026-08-19 - Analyze all frozen-Memory seeded Debug splits

- Audited sealed frozen `mem-v0003` Batches `b-20260817-005`, `b-20260818-001`,
  `b-20260818-002`, and `b-20260818-003` without rerunning Pi/K3, compilation, or simulation.
- Frozen Memory passed 53/89 Cases: 20/30 assignment, 3/6 state-machine, 17/24 arithmetic, and
  13/29 timing. The available Memory-off comparison passed 55/89.
- On 86 runnable paired Cases, frozen final mismatch count was 10,935 versus 10,802 for Memory-off.
  Sixteen Cases flipped pass/fail status: seven improved to pass and nine regressed from pass.
- The strict same-r5 timing comparison fell from 14 to 13 passes while mismatch count improved from
  4,737 to 4,355. The first three split comparisons remain observational because Off uses r2 and
  frozen uses r5, even though starter mismatch totals are unchanged.
- All 89 selector calls produced selection evidence; 85 selected at least one Memory and injected
  179 references. `memory-000002` and `memory-000007` dominated retrieval. No corresponding
  Experience directory or new snapshot was created.
- Main Agent transcripts recorded 1,615,691 provider tokens and $5.187995 cost. Selector calls add
  about 47:19 cumulative latency, but their provider token/cost usage is not persisted.
- Published `exp_result/chipbench/08.19-k3-pi-frozen-memory-seeded-debug-zero-shot-all-splits.md`
  with result tables, outcome transitions, retrieval analysis, cost accounting, provenance limits,
  and recommended strict controls.
## 2026-08-19 - Isolated Memory forbidden-vocabulary failures

- Diagnosed explicit build `b-20260819-001`: all 15 ChipBench Experiences loaded and Pi returned
  three `ADD` operations plus one `REJECT`, but generic wording `observed by the testbench` caused
  the strict Memory validator to fail the complete consolidation.
- Added a bounded Consolidation-only rewrite from passive generic testbench-observation wording to
  equivalent simulation wording. The Memory Store validator remains unchanged in effect for raw
  snapshot content and all non-allowlisted uses.
- Changed residual forbidden content in one `ADD`/`MERGE` into a local `REJECT` with unchanged
  Experience indexes, allowing independent safe operations to continue. Structural, accounting,
  target, format, and size failures remain Batch-fatal.
- Added positive repair and unsafe-sibling-isolation regressions. Offline replay of the sealed
  failed inputs yielded three clean items and `ADD, ADD, ADD, REJECT` without a model call or real
  snapshot publication.
- Validation: focused Memory tests passed (19/19); serialized repository tests passed (366 passed,
  2 skipped); `corepack pnpm typecheck`, `lint`, and `build` passed. An earlier concurrent full run
  hit the documented Windows process-tree probe race; the serialized rerun passed. The package-
  filtered test command also exposed its pre-existing cwd-sensitive relative Pi entrypoint test.

## 2026-08-21 - Repair and complete the mem-v0004 ChipBench generation run

- Diagnosed sealed Batch `b-20260820-002`: 23 of its 28 functional non-runs were downstream
  `NO_COMPILE_UNIT` labels caused by Kimi HTTP 400 rejection of a carried encrypted reasoning
  signature as invalid Base64URL. Two Cases passed, two made no RTL change, and three exhausted
  compile attempts.
- Added Kimi-only, unpadded Base64URL normalization for `thinking.signature` content at the final
  provider request boundary. Recorded the mode in Pi isolation identity and captured the normalized
  actual payload. Other Providers and task modes are unaffected.
- Added direct extension and adapter regressions. Focused tests passed 22/22; serialized full tests
  passed 367 with two skipped; typecheck, lint, build, and the real Pi capability probe passed.
- Re-ran the exact operator command from `mem-v0004`, `read_write`, with the self-contained Memory
  provenance boundary and five functional-repair iterations. Batch `b-20260820-003` completed all
  30 Cases: 24 compiled, 18 functionally passed, six retained mismatches, and six did not reach
  functional simulation. No Base64URL reasoning error recurred.
- The six real non-runs were four Agent timeouts (`Prob003`, `Prob007`, `Prob015`, `Prob033`) and
  two exhausted compile attempts (`Prob004`, `Prob012`). They did not block later Cases.
- The Batch persisted 15 eligible Experience files. Explicit Memory Build
  `memory-build/b-20260820-003` published `mem-v0005` from `mem-v0004`, with eight Memory entries
  and snapshot digest `sha256:708bf508968c623682cb41dcd9a9e357c44c5c6de9f8c61627223aadd18c34e4`.
- During read-only diagnostics, the documented PowerShell direct-`foreach` pipeline mistake recurred
  twice, and one `$file:` interpolation lacked braces. Corrected forms were used; no experiment
  artifact changed.
## 2026-09-04 - Exclude invalid frozen-VE timing and start complete replacement

- The original D0-R1 frozen VerilogEval timing process exited after all 29 Cases, but Batch
  `b-20260903-004` sealed `INVALID`: compile 28, pass 13, mismatch 14, not-run 1, and one
  verification-invalid result. It is excluded rather than treated as a completed condition.
- Traced the invalid result to `Prob022_synchronous_FIFO`. The model explicitly copied the
  prompt-provided `dual_port_RAM` module into `dut.sv`; compile-only passed, while the functional
  simulator also loaded `reference.sv` and Icarus returned exit code 2 for the duplicate module.
  `Prob021_asynchronous_FIFO` separately failed candidate compilation and accounts for the ordinary
  not-run. All 29 Case-validation records and Agent runs were otherwise valid, and there was no
  Provider/quota evidence.
- Compared the same Case in valid Memory-off Batch `b-20260902-004`: that candidate did not define
  `dual_port_RAM` and ended as an ordinary compile failure. The invalid frozen result is therefore
  candidate-specific assembly behavior, not a changed fixture or frozen Memory identity.
- One read-only PowerShell diagnostic initially omitted spaces around `Join-Path` arguments and
  failed during path construction. Reissued it with explicit variables and arguments; no process,
  Batch, Memory, or experiment artifact was modified.
- Confirmed no related process was active and revalidated active VerilogEval `mem-v0003` (9 items,
  locked digest) plus archived ChipBench `mem-v0008` (13 items, locked digest). No store switch was
  needed.
- Started the complete 29-Case timing replacement as hidden PID `17316`, Batch `b-20260904-001`,
  using repair zero and frozen VerilogEval `mem-v0003`. The running profile matches r5, the locked
  Memory digest, and timing baseline digest
  `sha256:1f4303f62a02cf87d1005fdf9575c0c108a314068da70a7aef2836e09943555b`.
- Logs are `.rtl-agent/automation-logs/d0-r1-frozen-ve-timing-retry-20260904-133031.stdout.log` and
  matching stderr. At `2026-09-04T13:32:24+08:00`, the process tree was alive on Case 2/29 with one
  final result sealed. No other experiment or mutation command was started.

## 2026-09-07 - Prioritize deterministic mutation while Kimi quota is exhausted

- The user explicitly overrode the prior post-campaign gate and requested the verification mutation
  experiment now. Updated heartbeat automation `frozen-memory-v2` in place: mutation runs first
  without model calls; the frozen-Memory queue remains paused at D0-R1 frozen ChipBench arithmetic
  and resumes only after mutation completion plus credible quota recovery.
- Confirmed no Generation, Debug, I2C coverage, mutation, or Verilator process was active. Audited
  `mutation/manifest.json`, `mutation/selection.json`, and `M001..M030.patch` as
  `i2c-mutants-v1`, seed 42, 30 ordered patches, aggregate digest
  `sha256:db47177ad9347e9187d1d8d88929abd684d4f5b5ab63a5752b2b51537db32924`. No mutation input was
  changed and `generate_i2c_mutants.py` was not run.
- Established the baseline asset as `run_20260804-151037-229` at 78.16%. Its full RTL/support
  workspace matches the common baseline manifest. The 93.99% and 100% assets preserve all DUT,
  checker, and model digests; their only support change is the expected `rtl/tb.sv`.
- Added `apps/rtl-core-loop/src/mutation-command.ts`, its focused test, CLI routing, and root/app
  `mutation:run` scripts. The runner copies each source asset into isolated workspaces, applies
  one fixed patch using Git with `shell:false`, compiles/simulates using fixed Verilator argv,
  gates each suite on golden success, and writes per-stage/process/outcome evidence. Compile-invalid,
  timeout, apply failure, and infrastructure failure remain separate from killed.
- Validation passed focused tests (5/5), mutation plus CLI tests (40/40), typecheck, lint, and build.
  The initial launch stopped before Verilator because the input audit compared a tab-indented M002
  diff line too strictly. Corrected only the runner matcher to remove the unified-diff marker and
  surrounding indentation before exact comparison; added a regression test and repeated all
  focused validation successfully.
- Moved the empty failed diagnostic recoverably to
  `.rtl-agent/quarantine/mutation-runner-diagnostics-20260907/mutation_20260907T062053232Z-input-audit-failed`.
  It is excluded from all mutation results.
- Restarted the full three-suite replay as hidden PID `3676` at
  `2026-09-07T14:23:30+08:00`. Active run directory:
  `.rtl-agent/mutation-runs/i2c-master/mutation_20260907T062331231Z`. Logs:
  `.rtl-agent/automation-logs/mutation-full-20260907-142330.stdout.log` and matching stderr.
  At `2026-09-07T14:26:49+08:00`, the baseline golden gate had passed, M001..M005 were all
  persisted as survived, and Verilator was compiling M006. No second long command was started.

## 2026-09-07 - Complete deterministic I2C mutation replay and report

- At the `2026-09-07T19:39:06+08:00` heartbeat, no Generation, Debug, I2C coverage, mutation, or
  Verilator process remained active. The hidden mutation process had exited normally and persisted
  `COMPLETED` at `.rtl-agent/mutation-runs/i2c-master/mutation_20260907T062331231Z`.
- Validated all three suites rather than relying on stdout: three golden compile/simulation gates
  passed; all 90 patches applied; all 90 mutants compiled and simulated; every KILLED outcome had
  simulation exit 1 and every SURVIVED outcome had exit 0. There were zero timeout,
  compile-invalid, apply-failed, not-run, or infrastructure-error results.
- Rehashed all 32 locked mutation inputs and all 24 source-asset files after the run. Every digest
  matched `input-audit.json`; the fixed input-set digest remains
  `sha256:db47177ad9347e9187d1d8d88929abd684d4f5b5ab63a5752b2b51537db32924`.
- Results: baseline 78.16% killed 16/30 (53.33%); enhanced 93.99% killed 16/30 (53.33%);
  enhanced 100% killed 25/30 (83.33%). Baseline-to-100 has nine survive-to-kill and zero
  kill-to-survive transitions. Adjusted scores remain null pending human/formal survivor review.
- Published `exp_result/i2c/09.07-deterministic-mutation-replay.md`, including operator/module
  breakouts, survivor lists, transition IDs, runtime, evidence paths, and the non-authoritative
  Windows/same-DUT boundary. Added the reproducible runner validation procedure to
  `docs/verification.md` and recorded the raw-versus-adjusted reporting rule in
  `docs/decisions.md`.
- The first read-only post-run audit command failed before execution because an embedded JavaScript
  template literal conflicted with the outer command wrapper. Its next attempt assumed the wrong
  persisted filename (`result.json` instead of `mutation-result.json`) and then the wrong source
  asset root (run root instead of `workspace`). Corrected the diagnostic to the runner's actual
  schema and paths; these were read-only diagnostic mistakes and no experiment input or result was
  modified.
- Frozen-Memory remains paused before the complete D0-R1 frozen ChipBench arithmetic retry. No
  Provider canary or full model-backed command was started; the next heartbeat returns to
  non-inference quota recovery checks.
- Final handoff validation parsed `.harness/session-state.json`, passed
  `scripts/harness_check.sh` through the fixed Git Bash executable, and found no actual repository
  Generation, Debug, I2C coverage, mutation-run, or Verilator process. The first harness invocation
  used bare `bash`, which was absent from PowerShell `PATH`; rerunning
  `C:\Program Files\Git\bin\bash.exe` passed. A broad process-text filter also matched another
  read-only Codex PowerShell command merely reading mutation evidence; the strict executable/argv
  filter correctly classified it as non-experiment work and left it untouched.

## 2026-09-07 - Prepare FIFO, AES, and Scalable Arbiter coverage environments

- Confirmed no repository Generation, Debug, I2C coverage, mutation, or Verilator long process was
  active. Kept frozen-Memory paused because the most recent real Kimi canary remains a weekly-quota
  HTTP 403.
- Cloned and pinned clean FreeCores source trees under `.rtl-agent/datasets`: Versatile FIFO at
  `3c0ea00773805b3f697583fb2d1e330d6bfe4220`, AES high-throughput/low-area at
  `cf0bb8d68a8f6f3b32818cff0942d89bd4d16233`, and Scalable Arbiter at
  `8808ce3ee762b1fd38a50a87f7acdc5e130f6101`. Locked every consumed source byte count and digest;
  post-run Git status was clean for all three trees.
- Added a generic `project-coverage` provider/experiment/CLI with `--iterations 0` baseline-only
  operation, protected DUT paths, bounded seeded golden testbenches/checkers, fixed Verilator argv,
  isolated evidence directories, and no Agent construction when baseline-only.
- The first FIFO materialization failed because fixture tags were unsorted; sorted them before
  schema validation. The first Arbiter golden simulation failed because the checker incorrectly
  compared a registered multi-cycle grant with the instantaneous request. Removed that invalid
  assumption while retaining one-hot, select, enable, bounded expected-grant, and timeout checks.
- A width-8 `arbiter` diagnostic then passed but exposed no line/branch headroom. Switched the final
  fixture to the same project's 16-requester two-level `arbiter_x2` and enabled an opt-in project
  score that includes toggle coverage. Existing I2C scoring remains unchanged. Failed and
  pre-final-score runs are excluded in the report.
- Final real Windows Verilator 5.050 baseline-only runs all passed golden compile/simulation:
  FIFO `run_1382f16a-b8ef-472c-adc3-30f0a57b3261` scored 57.95 (line 75.76, branch 50.00,
  toggle 33.58); AES `run_d9f37be0-533a-44f0-85ce-0889a1291493` scored 75.50 (line 84.45,
  branch 37.50, toggle 85.90); Arbiter `run_2c9bf564-71d9-4ade-8dd2-0b417d21d9f6` scored 91.38
  (line 100, no branch points, toggle 71.28). No model was called.
- Focused provider/experiment/CLI tests passed 9/9 and full TypeScript typecheck passed. Published
  `docs/project-coverage-experiments.md` and
  `exp_result/09.07-multi-ip-coverage-baselines.md`. Agent refinements remain queued behind
  credible quota recovery plus one successful excluded real-target canary, and must not overlap
  frozen-Memory work.

## 2026-09-08 - Finalize multi-IP preparation validation and heartbeat queue

- Fixed the only full-lint finding by leaving the already initialized null baseline unchanged in
  the caught golden failure path; the persisted compiler/simulation process evidence remains the
  detailed failure source. Added a direct regression for the toggle-inclusive score and its
  absent-branch weight redistribution.
- Final validation passed: project provider/experiment/CLI tests 10/10; full repository tests 381
  passed and 2 skipped; typecheck, lint, build, scoped Prettier check, `git diff --check`, JSON parse,
  and Git Bash harness check all passed. The three final real baseline runs were not rerun because
  the post-baseline change was only an extracted and directly tested score helper plus a lint
  comment, not fixture or execution behavior.
- A strict process scan found no repository Generation, Debug, I2C coverage, project coverage,
  mutation, or Verilator long process.
- Updated heartbeat `frozen-memory-v2` in place, retained its six-hour interval, and renamed it
  `Frozen Memory 与多 IP 覆盖率实验`. It now records mutation and multi-IP preparation as complete,
  keeps the latest Kimi 403 canary gate, resumes frozen-Memory first after recovery, and queues
  counterbalanced FIFO/AES/Arbiter Agent coverage afterward without resource overlap.

## 2026-09-08 - Post-preparation quota checkpoint remains blocked

- Re-read the required handoff and verification documents in repository order and formed the
  briefing from persisted state rather than chat history.
- A strict process scan found no repository Generation, Debug, I2C coverage, project coverage,
  mutation, or Verilator long process. The newest active Batch remains the excluded Kimi 403
  canary `b-20260905-001`; no Batch or automation log indicates a Provider reset or recovery.
- Kept the frozen-Memory and multi-IP Agent queues paused. No canary, model call, Memory-store
  switch, coverage run, or other long command was started.

## 2026-09-08 - Provider recovered and D0-R1 arithmetic resumed

- Re-read the required handoff and verification records in order and found no repository long
  process. The user then supplied a credible Kimi quota-recovery signal.
- The first launch preflight intentionally stopped before process creation because it assumed
  `catalog.items` and JSON item files. The actual locked V1 layout uses `catalog.entries` and 13
  Markdown item files. Rechecked the real layout, manifest count, catalog count, item count, and
  locked digest; no Memory file was changed.
- Started one excluded real target canary for
  `Prob019_implement_full_subtractor_using_three_to_eight_decoder`, r5 arithmetic, repair zero,
  frozen `mem-v0008`. Batch `b-20260908-001` completed 1/1 compile and functional pass. Its real
  transcript contains nonzero token usage and no quota, 403, connection, or transport marker.
- Marked the canary excluded from accuracy evidence, then started the complete replacement
  arithmetic condition at `2026-09-08T12:29:00+08:00` as hidden PID `1724`, Batch
  `b-20260908-002`. Its profile contains all 24 ordered r5 Cases, repair zero, frozen
  `mem-v0008`, locked Memory digest, and locked arithmetic baseline digest. Logs are
  `.rtl-agent/automation-logs/d0-r1-frozen-chip-arithmetic-recovery-20260908-122900.*.log`.
- Assessed concurrency explicitly: read-only audits may overlap, but a second model-backed or
  Verilator-writing experiment will not. The queues share Kimi quota and repository evidence
  stores, and the frozen-Memory design relies on serial order; overlapping long writes would make
  quota, timing, and order effects harder to attribute.

## 2026-09-08 - Arithmetic replacement validated; D0-R1 timing started

- PID `1724` exited normally and Batch `b-20260908-002` sealed `COMPLETED`. Its profile and
  selection contain all 24 ordered `c74fe7d28-r5` arithmetic Cases, repair zero, frozen
  `mem-v0008`, locked Memory digest, and locked arithmetic baseline digest.
- All 24 Cases compiled; 19 passed and 5 were functional mismatches. There were zero not-run,
  timeout, Provider error, or verification-invalid results. The five mismatches are Prob001,
  Prob006, Prob007, Prob009, and Prob013.
- The 24 main-Agent transcripts contain 106 exchanges, 356,418 tokens, and $0.9943428 recorded
  cost over 00:40:53.911. Selector evidence has 24 outputs: 21 non-empty, 3 empty, and 30 selected
  IDs. Concentration is memory-000001 12, memory-000003 5, memory-000002 3, memory-000009 3,
  memory-000006 2, memory-000011 2, and one each for memory-000004/000008/000013.
- Revalidated active ChipBench `mem-v0008` at 13 manifest/catalog/item entries with the locked
  digest, confirmed no repository long process, then started complete D0-R1 frozen ChipBench
  timing as hidden PID `18528`, Batch `b-20260908-003`, at `2026-09-08T13:45:51+08:00`. Its
  profile has all 29 r5 timing Cases, repair zero, frozen `mem-v0008`, locked Memory digest, and
  locked timing baseline digest. Logs are
  `.rtl-agent/automation-logs/d0-r1-frozen-chip-timing-20260908-134551.*.log`.
