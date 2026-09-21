# Error Journal

## 2026-09-21 - Pre-commit contract and generator review repairs

The v2 prompt exposed an annotated enum rejected by its parser and omitted required
top-level provenance aggregation. Revision v2.1 declares both rules and shares literal
enum values with validation; new regressions exercise every advertised execution value
and distinguish missing trajectory from incomplete reference aggregation. The generic
guide had an undeclared 50-character lower bound; revision 1.1 declares both limits and
uses one Unicode code-point measure. Historical sources were archived against old receipt
hashes; historical requests/responses remain unchanged and cannot be reused as new runs.

The I2C generator recursively removed existing output and labeled skipped compilation
PASS. Review caught both without running generation against the retained datasets. It now
rejects existing output before loading inputs and uses exclusive publication; skipped
validation is NOT_RUN. Offline tests preserve an existing sentinel and mock compilation
to distinguish validated and unvalidated output. Never infer validation from generation.

## 2026-09-20 - Replay Git autocrlf and Icarus option ordering

Baseline v1 passed seven goldens then stopped before its first mutant compile: Git application
inherited core.autocrlf and rewrote uart_receiver.v to CRLF. The raw mutant digest mismatched;
LF-normalizing that diagnostic exactly matched the published expected digest. Preserve v1 and
its original runtime. Pin core.autocrlf=false only on each patch command; an actual patch test
with scratch core.autocrlf=true now passes. Complete replacement v2 runs all190 without asset edits.

The independent witness v1 completed UART golden/M021, then AES golden compilation interpreted
a trailing -s as a filename. Preserve its compile failure and original script. Put all Icarus
options before files, and complete only the previously unexecuted AES pair in a separate recovery
root with unchanged observer/TB/DUT. Do not rerun the successful UART witness or mix these setup
failures with baseline kills. Baseline runtime/source/TB hashes remain unchanged.

The shared process file was initially extended before noticing it was one of the old103 runtime
bindings. No old experiment was executed with that edit; exact original hash was restored and all
103 rechecked. Future edits must inspect existing runtime bindings before touching reusable helpers.

## 2026-09-19 - Completed batch exposes prompt/validator mismatch

All five authorized provider calls completed normally: G plus four source extractions.
There was no connection failure. Four source responses were rejected by the frozen gate;
14 raw drafts and all original failures remain intact, with no repair or replacement call.

Two extraction-contract P2 findings remain open for a future version. The prompt does not
state that item.evidenceIds must contain trajectory and cover every nested reference; these
hidden aggregation rules directly reject all three otherwise well-shaped eth items. The
prompt also offers the literal enum 'not-added (oracle only)' while the parser accepts only
'not-added'; ufifo uses the offered value twice and openhmc once. Do not attribute these
contract failures solely to model noncompliance. The generic MISSING_OBSERVATION error can
mean missing top-level trajectory, not missing observed-event evidence.

Other failures are distinct: versatile misplaces explicitly shown fields and repeats JSON
keys; ufifo/openhmc wrap their JSON in Markdown despite the only-JSON instruction. Source
review additionally finds unsupported oracle-execution claims and historical-policy leakage.
Those semantic problems would not be fixed by stripping fences or adding aggregate refs.

Preserve this frozen run. Before any future extraction, align the published contract and
validator offline, separate enum values from explanatory prose, expose required reference
rules and give errors precise field paths. Do not retune the gate to accept these samples.
Details: exp_result/09.19-v2-prompt-contract-audit.md and per-source extraction-audit.json files.

## 2026-09-19 - First v2 extraction violates schema and evidence levels

The authorized original G+four-source preparation stopped after G and versatile, both complete
single K3 responses. Versatile failed structural-and-reference-validation before any later source
call. All five raw items misplace simulatorSemantics, omit oracle.evidenceIds and repeat the
top-level evidenceIds key. Standard JSON.parse keeps only the last duplicate value; do not repair
the response silently or treat its parsed object as a faithful lossless representation. Even an
assumed field relocation leaves incomplete provenance and a missing trajectory reference.

Source-only review also finds observed-oracle claims supported only by aggregate PASS logs,
incorrect source line attribution, a narrated43 toggle count versus actual45TOGGLE+2LINE residuals,
and an interface-contract authority tag whose prose admits the expected-value authority is absent.
Raw output remains rejected/unpublished; no normalization or replacement model call. Original
response SHA6068335ef62ec17e82f847899c70e65bef68c1617ce9ba7f01bb6e31a6f35281;
diagnostic audit exp_result/09.19-versatile-v2-extraction-audit.json. Recover only the three original
unstarted requests under the same totalfive-call authorization; preserve original terminalfailure.

## 2026-09-19 - External v2 preparation requires specific data-transfer authorization

Automatic approval review rejected creation of the prepared five-call Kimi K3 batch before any
process/model request: user approved next-stage research direction but had not explicitly approved
transmitting original source RTL, trajectories, logs and specifications to that external service.
The earlier directed-three-draw approval covered a different concrete payload/batch and does not
resolve this rejection. Do not bypass with another transport or run partial calls indirectly.
Prepared input/runtime receipts remain ready; exact5call/data approval asked asynchronously.
No run-started markers or active locks exist; no model/RTL cost incurred by the rejected launch.
After approval, the same command must reverify immutable receipts and no-retry budget.

## 2026-09-18 - Usage study A-R3 repeated forbidden alternate DUT configuration

The fixed-v1 usage2x2 queue stopped after sample10 when A-R3's second provider-complete
turn added a second TopModule. TARGET_EXTRA_DUT_INSTANCE correctly rejected it before
compile/snapshot. Both provider audits PASSED; this is program/boundary failure, not network.
As in the earlier rejected target run, do not relax topology to reach excluded specialization
coverage. Missing execution.json made the outer queue's raw label infrastructure-failed;
retain raw evidence and add an explicit review reclassification for reporting. Native idle
inspection confirmed no residual experiment/compiler process. Recover only unstarted D-R3/B-R3
with unchanged frozen runtime/protocol; never rerun A-R3 or fall back to its earlier success.


## 2026-09-17 - UART/AES process recovery and final boundary regression

The interrupted Tiny AES descendants exited naturally before resumption. After FIFO finished,
replaced preparation's spawnSync wrapper with owned async execution and incrementally persisted
logs, exclusive marker, FIFO/pause monitoring and bounded tree termination. Restricted Windows
taskkill in the first isolated process test could not confirm cleanup; its scratch evidence was
retained. Native Windows tests then confirmed termination of the test's own parent/descendant.
Fresh Tiny AES v2 and AES Pipeline goldens passed with the documented C++ -O0 build profile;
the incomplete v1 remains excluded. No old denied process was bypassed or treated as successful.

Final review found the exact parent path produces path.relative == '..', which was not covered
by the prefix '..<separator>' guard. Added the explicit rejection and a pre-launch regression;
all 13 focused tests pass. This changes process input validation, not frozen RTL/TB/mutant bytes.

## 2026-09-17 - Cleanup shell guard required Git Bash login environment

Two cleanup attempts stopped before deleting any files because safe_bash_guard.sh could
not find tr in a non-login Git Bash environment; prepending the Windows tool path did not
resolve it. A direct Git Bash --login guard check passed. Use that login entry point for
the guard and harness checks. Actual file deletion stays in PowerShell with literal paths;
the guard only evaluates the described command. The pending receipt confirmed zero deletions
before retry, and exact candidate paths/sizes were revalidated on every attempt.

## 2026-09-17 - Interrupted Windows Verilator left compiler descendants

Tiny AES native coverage C++ compilation was still active when an independently started FIFO
recovery was detected. Scoped taskkill of the verified own Node process stopped Node19648 and
Verilator20220, but returned Access denied for make/g++/cc1plus descendants. A verified retry
against the remaining own make15168 also returned Access denied. No FIFO process was targeted.
spawnSync output persistence only after exit lost a complete compiler outcome when its parent
was interrupted. Preserve tiny-aes-v1 as incomplete; do not infer coverage success from objects.
Pause marker prevents new preparation CLI jobs. Before continuation confirm all descendants
have exited, improve bounded process ownership and incremental evidence, and use a new root.
Never bypass the denial or continue into another RTL job after unconfirmed process cleanup.


## 2026-09-17 - Target fixed configuration escaped through a second TB instance

Dpretet off R1 attempt3 added TopModule FALLTHROUGH FALSE alongside the fixed TRUE instance.
Protected DUT bytes remained intact, so existing guard accepted it; coverage denominator changed
and final mutation gains are out-of-protocol. Preserve as diagnostic; add instance/parameter
validation before controlled continuation. Also frozen attempt3 had four Connection error
provider responses but exit0/no edits, becoming generic AGENT_FAILED. Classify provider failure
from captured responses, never infer model refusal or Memory failure from unchanged RTL.

Recovery v2 implements target-only provider completion auditing (including errors after edits),
seeded-prefix/sole-instance guards and full raw DUT coverage-domain signatures. Both conditions
share the strengthened spec. Regression tests reject the observed drift and connection traces;
both unchanged seed baselines pass under the new guards. Old artifacts remain diagnostic.

## 2026-09-14 - Background replay cannot resolve bare Git

First source replay passed golden but spawnSync git returned ENOENT at M001 apply.
Verified installed C:/Program Files/Git/cmd/git.exe and used fixed Windows executable,
retaining portable git for Linux. Old063916 diagnostic excluded; fresh064026 replay launched.
Do not count apply/launch failures as killed or silently overwrite partial evidence.

## 2026-09-13 - Candidate RAM infinite reset loop classified verification-invalid

b-20260912-001 RAM uses reg[2:0] i with for(i=0;i<8;i=i+1). The 3-bit index wraps
and never reaches8, explaining SIMULATION_TIMEOUT at30922ms. No Provider error.
Current functional summary treats every simulation timeout as verification-invalid.
Do not retry to eliminate a genuine candidate failure or silently change score semantics.
Preserve evidence and obtain protocol decision; no harness or candidate change made.


## 2026-09-09 - Reusing another FIFO's almost-full assertion rejected a valid golden

dpretet-v2 golden failed FULL_FLAGS because the reusable smoke assumed full implies almost_full.
dpretet's look-ahead equality flag has different semantics. Removed that cross-IP implication
from its standalone TB, retained actual full/data/reset checks, reran from scratch with unchanged
DUT. Final reviewed-v2 passes Icarus and Verilator. Original diagnostic retained excluded.
Do not copy reset/empty/almost semantics across FIFO IPs without reviewing the locked contract.
The smoke does not claim exhaustive almost-flag or CDC verification.

## 2026-09-06 - Bare PowerShell boolean broke a read-only quota check

### Symptom

A non-inference checkpoint failed while constructing its summary object because it assigned
`userOrExternalRecoverySignal=false`.

### Root Cause

PowerShell boolean literals require the `$` prefix. The bare token was interpreted as a command,
repeating the broader pattern of overly terse diagnostic syntax already recorded in this journal.

### Fix and Prevention

Reissued the read-only check with `$false`; it confirmed zero related processes, new Batches, logs,
or recovery evidence. No experiment or Memory state changed. Use `$true` and `$false` explicitly in
all PowerShell diagnostics and avoid language-neutral literal assumptions.

## 2026-09-05 - Kimi weekly quota censored half of D0-R1 frozen ChipBench arithmetic

### Symptom

D0-R1 frozen ChipBench arithmetic Batch `b-20260904-004` was superficially sealed as
`COMPLETED`, but only 12/24 Cases compiled. Cases 13 through 24 ended as `NO_RTL_CHANGE` and
functional not-run; mismatch post-processing also emitted `MISMATCH_ANALYSIS_FAILED`.

### Root Cause

The 12 affected main-Agent transcripts each contain one zero-token HTTP 403 `permission_error`
stating that the Kimi weekly seven-day quota was exhausted. A thirteenth identical 403 occurred
during schema repair for mismatch analysis, leaving the placeholder diagnosis invalid. The harness
process completed cleanly, so its top-level completion status alone did not expose the censored
experimental condition.

### Fix and Prevention

Exclude the entire Batch rather than retaining the first 12 Cases, and do not start timing or a
full retry. At a later six-hour check, run exactly one real arithmetic target Case through the same
frozen `mem-v0008` Selector/Agent path as an excluded recovery canary. Only after that canary returns
a real non-quota Agent result may the full 24-Case arithmetic condition restart from Case 1. Always
inspect Provider transcripts when `NO_RTL_CHANGE` appears in a consecutive tail, even if the Batch
summary says `COMPLETED`.

The `2026-09-05T19:35:48+08:00` recovery canary, Batch `b-20260905-001`, exercised the first
censored target Case and received the same zero-token weekly-quota 403. It is excluded, no full
retry followed, and subsequent scheduled checks must remain non-inference until an independent
quota-reset or purchased-capacity signal exists.

## 2026-08-28 - Kimi weekly quota censored the final 28 G-R2 frozen Cases

### Symptom

G-R2 frozen Batch `b-20260828-001` completed with 28 consecutive `POLICY_VIOLATION` /
`NO_COMPILE_UNIT` outcomes from Prob129 through Prob156, only 128 Selector records, and a mismatch
analysis warning.

### Root Cause

Each affected main-Agent transcript contains one zero-token HTTP 403 `permission_error` stating
that the Kimi weekly seven-day usage limit was reached. The harness then classified the unchanged
blank workspace as `NO_COMPILE_UNIT`. The mismatch analyzer also left its schema template
unrepaired after quota exhaustion.

### Fix and Prevention

Exclude the entire Batch; do not splice its first 128 Cases into a full condition and do not start
the paired off run. During later six-hour checks, make no inference call until credible quota
recovery evidence exists; `pi-agent-probe` is not sufficient evidence. Once recovered, rerun G-R2
frozen from Case 1. Inspect Provider transcripts whenever a run suddenly emits fast consecutive
`NO_COMPILE_UNIT` policy failures.

## 2026-08-28 - Compact PowerShell comparison hid a live process tree

### Symptom

Immediately after starting G-R2 frozen, a read-only descendant inventory printed no process rows
even though the launch PID and the repository-wide command-line scan showed the experiment alive.

### Root Cause

The diagnostic reused compact syntax such as `Where-Object ProcessId-eq$id`. This is the same unsafe
PowerShell compression pattern already documented in this journal; parsing did not perform the
intended property comparison.

### Fix and Prevention

Reissued the inventory with explicit script blocks such as
`Where-Object { $_.ProcessId -eq $procId }`, which showed PID 9164, its Corepack/Node children, and
evaluator PID 14484. The error affected only diagnostic display and did not touch the experiment.
Do not use compact property-comparison syntax in future PowerShell checks.

## 2026-08-27 - Background experiment inherited a network-restricted sandbox

### Symptom

The first complete 156-Case G-R1 Memory-off run finished in about 44 minutes with zero compile
passes and 156 not-runs. Every Agent result was labeled `POLICY_VIOLATION` / `NO_COMPILE_UNIT`.

### Root Cause

The hidden background `corepack` process was started from a network-restricted Codex shell. All 156
Provider transcripts contain four `Connection error.` exchanges, for 624 failures and zero tokens.
No request reached a normal Kimi response, so the downstream workspace guard reported the missing
RTL rather than the transport cause.

### Fix

Exclude Batch `b-20260825-001` from experiment evidence and pause the queue. Provider-backed runs
must use an explicitly approved out-of-sandbox network boundary. Before repeating the full Batch,
run one real Case as a diagnostic canary and require a non-quota Agent/compile outcome.

On 2026-08-27, out-of-sandbox diagnostic Batch `b-20260827-001` passed compile and functional
simulation with four successful Provider exchanges. This confirmed the execution-boundary diagnosis,
and the complete G-R1 Memory-off condition was restarted through the approved local boundary.

### Prevention

Do not launch Provider-backed evaluation from the default network-restricted shell. Confirm the
execution boundary before a full Batch, keep canaries outside accuracy totals, and inspect Provider
transcripts whenever `NO_COMPILE_UNIT` occurs without a write attempt. Do not confuse this transport
failure with the separately observed HTTP 403 billing-cycle quota failure.

## 2026-08-23 - Pi capability probe was mistaken for a Provider quota probe

### Symptom

After a frozen-Memory Batch hit Kimi's billing-cycle usage limit, `pi-agent-probe` exited
successfully. A full 30-Case replacement was started, but it completed with 0 compile passes and 30
identical HTTP 403 quota failures.

### Root Cause

The capability probe establishes the configured Pi version, Provider/model identity, isolation,
tools, and configuration digests. Its successful result was incorrectly treated as evidence that
the Provider would accept normal Selector and Agent inference requests.

### Fix

Exclude the replacement Batch and keep the controlled sequence paused. Use one real evaluation
Case with the intended frozen snapshot and zero repair as the quota canary before any later full
Batch.

### Prevention

Do not use configuration or capability probes as billing/quota evidence. After a Provider quota
failure, require a bounded real-model canary that exercises the same Selector and Agent path; only
then launch a full evaluation Batch.

## 2026-08-17 - Timing baseline exposed three non-runnable functional-debug starters

### Symptom

After the timing marker parser was corrected, baseline preparation failed serially at `Prob013`
with a procedural assignment to an output wire, at `Prob016` with undeclared clock/reset names plus
a procedural output-wire assignment, and at `Prob022` with a simulation timeout.

### Root Cause

The timing mutations were not all runnable functional bugs. Two produced compile-invalid RTL. The
third changed a clocked pointer register to `always @(*)`, causing repeated zero-time pointer updates
instead of one bounded timing mismatch. The fail-fast baseline correctly prevented these Cases from
entering a functional-repair experiment.

### Fix

Added three path-, source-digest-, occurrence-, and result-digest-locked preparation patches. The
patches repair only the declaration/signal binding or non-terminating scheduling defect while
retaining an extra-edge or extra-register timing error. Dataset `c74fe7d28-r5` then prepared all 29
timing starters as positive functional mismatches.

### Prevention

Run the complete reusable starter baseline before any model-backed split. Keep Case-specific status,
mismatch, sample, and exit-code details in baseline errors. Any source-data normalization must be a
versioned preparation patch with deterministic provenance rather than a direct cache edit.

## 2026-08-14 - Report diagnostics repeated the PowerShell direct-foreach pipeline error

### Symptom

Two read-only ChipBench report diagnostics failed with `An empty pipe element is not allowed` when
a statement-style `foreach` result was sent directly into `Format-Table`.

### Root Cause

The commands repeated the exact PowerShell construction already prohibited by the 2026-08-06
prevention entry. Compacting the one-off evidence assertions hid the direct `foreach (...) { ... }
| Format-Table` boundary during review.

### Fix

Assigned each `foreach` result to a task-specific collection before formatting. The corrected
read-only diagnostics completed and did not change runtime evidence.

### Prevention

Apply the existing collection-variable rule mechanically to every PowerShell diagnostic. Do not
compress a statement-style `foreach` and a following pipeline onto one command segment.

This exact error recurred on 2026-08-17 while summarizing Memory snapshot JSON: a compact
`foreach (...) { ... } | Format-Table` was used despite the existing rule. The corrected command
assigned the rows to `$rows` first and completed successfully. Future diagnostics must use the
collection-variable form from the outset, including inside long one-line `exec` commands.

## 2026-08-13 - Valid Memory consolidation was rejected by a short metadata bound

### Symptom

Explicit Memory Build `b-20260813-001` returned `CONSOLIDATION_FAILED` after Pi had read all required
inputs and written eight operations covering all 130 Experience indexes exactly once.

### Root Cause

The third operation merged `memory-000003` with a 135-character `circuit_type`, while the shared
catalog and Consolidator draft schema allowed only 128 characters. The best-effort publication
boundary correctly preserved `mem-v0002` but collapsed the Zod detail into the stable generic failure.

### Fix

Raise descriptive Memory metadata to a shared 1024-character bound across Experience, catalog, and
Consolidator schemas. Expose the exact limit in the Pi system prompt and generated output contract,
and add regressions for the observed 135-character value and rejection at 1025.

### Prevention

Do not reuse identifier-sized limits for model-generated descriptive labels. Keep a high finite
resource bound, publish only schema-valid output, and test observed real-output boundary values.

Use this file to record repeated failures, non-obvious bugs, and lessons learned.

## Format

```markdown
## YYYY-MM-DD - Error Title

### Symptom

What went wrong?

### Root Cause

Why did it happen?

### Fix

How was it fixed?

### Prevention

How should future agents avoid repeating it?

### Related Files

- `path/to/file`
```

## Known Failure Modes

## 2026-07-30 - Spec-understanding format checking was premature

### Symptom

The initial R05 implementation accumulated a line-oriented Markdown parser, stable issue codes,
section ownership rules, and completeness checks before any production workflow consumed the
generated document as structured data. Review then found format-dependent bypass cases and the
documentation repeatedly drifted from the implementation.

### Root Cause

The design treated a model-facing analysis template as a deterministic interchange format without
a concrete machine consumer that required that contract. This added parser complexity and made
presentation choices part of task acceptance.

### Fix

Remove the generated-Markdown Checker and its result/issue API. Keep separate best-effort templates
and validate only the trusted task kind and Spec/DUT digests supplied before template creation.

### Prevention

Do not introduce a parser for model-authored Markdown until a specific downstream consumer needs a
defined structure. At that point, prefer an explicit versioned structured result over inferring a
database or protocol contract from presentation Markdown.

### Related Files

- `packages/core-loop/src/spec-understanding.ts`
- `packages/core-loop/test/spec-understanding.test.ts`
- `docs/spec-understanding.md`

## 2026-07-30 - Spec-understanding entries were not scoped to Markdown sections

### Symptom

Guarded review found that a required section could be empty while a syntactically valid `REQ-*`,
`IMP-*`, or `CHK-*` entry elsewhere in the artifact still satisfied extraction or mapping checks.

### Root Cause

The Checker validated that required second-level headings existed, but its requirement and mapping
parsers independently scanned every line in the document. It did not carry the enclosing section
identity into entry validation.

### Fix

Build one second-level-section index for the normalized Markdown and use it in all structural
checks. Accept Spec Facts requirements only in designated requirement-bearing sections, RTL
mappings only in `Requirement Implementation Map`, and verification mappings only in
`Verification Checkpoints`. Misplaced entries emit `ENTRY_OUTSIDE_SECTION` and do not contribute to
extracted IDs or mapping completeness.

This was an intermediate repair. The operator subsequently chose best-effort model output, so the
entire generated-Markdown Checker was removed; the preceding entry records the final disposition.

### Prevention

Every structured Markdown parser must test both a valid entry in the expected section and the same
entry moved to a plausible but invalid section. Heading-presence tests alone do not establish
section ownership.

### Related Files

- `packages/core-loop/src/spec-understanding.ts`
- `packages/core-loop/test/spec-understanding.test.ts`

## 2026-07-28 - Verilator integration test timed out before its process runner

### Symptom

The focused real Verilator coverage integration reached Vitest's explicit 30-second test deadline.
Cleanup then reported `EBUSY` because the still-running Verilator toolchain retained the temporary
workspace.

### Root Cause

`VerilatorCoverageRunner` has a bounded 120-second external-process timeout, but the integration
test's enclosing timeout was only 30 seconds. On a slower Windows build, Vitest could abort the
test before the runner completed or performed its own bounded termination.

### Fix

Raise only the real Verilator integration test deadline to 150 seconds, keeping it finite and longer
than the runner's process bound. Ordinary deterministic test timeouts remain unchanged.

### Prevention

An integration test that wraps a bounded external process must allow enough time for the process
timeout plus termination and cleanup. The test harness must not be the first timeout boundary.

### Related Files

- `packages/core-loop/test/verilator-coverage.integration.test.ts`
- `packages/core-loop/src/coverage-experiment.ts`

## 2026-07-23 - Hidden diagnosis Schema made a completed batch look failed

### Symptom

`evaluate --begin Prob021 --end Prob050` returned `MISMATCH_ANALYSIS_FAILED`, while its persisted
summary showed a completed 30-case batch. The model had written a concrete diagnosis for
`Prob034_dff8`, but used `INITIALIZATION`, string evidence entries, and lowercase `medium`.

### Root Cause

The runtime Schema required a fixed category enum, structured evidence objects, and uppercase
confidence. The Agent saw only placeholder keys with `REPLACE_ME` and an empty evidence array, so it
could not discover the actual output contract. Observed-issue generation was also awaited as though
it were part of evaluation, allowing a reporting failure to replace the CLI's completed result.

### Fix

Materialize an exact private Schema guide, provide structured validation issues, and allow one
bounded correction turn. Add initialization/spec-reference ambiguity categories. Keep post-processing
best-effort for `evaluate`, return a retry warning, and add `reanalyze --batch` to reuse validated
existing evidence without rerunning generation or simulation.

### Prevention

Any model-authored structured artifact must receive the complete allowed enums and nested field
shape, not just top-level placeholder keys. Optional analysis/reporting after a durable primary
result must have a separate status and a recovery command. Tests must cover schema repair,
persistent invalid output, protected-input mutation, existing-batch reanalysis, and warning-only
failure propagation.

### Related Files

- `.opencode/agents/rtl-mismatch-analyzer.md`
- `packages/core-loop/src/mismatch-analyzer.ts`
- `apps/rtl-core-loop/src/index.ts`
- `packages/core-loop/test/mismatch-analyzer.test.ts`
- `apps/rtl-core-loop/test/cli.test.ts`

## 2026-07-21 - Source-bound Icarus design errors were misclassified as tool failures

### Symptom

A 60-case VerilogEval batch stopped at `Prob071_always_casez`. Icarus reported that an output wire
was not a valid procedural assignment target, but the adapter returned
`IVERILOG_UNCLASSIFIED_FAILURE`. The batch correctly failed closed on that apparent infrastructure
error, leaving the failing case and all 29 later cases as functional not-run.

### Root Cause

The diagnostic parser recognized generic `error:` lines as error issues, but set `hasDesignError`
only for a short phrase allowlist such as `syntax error` and `unable to bind`. The valid Icarus
phrase `not a valid l-value` therefore had an error issue attached to the candidate source while
still failing the adapter's design-error classification check.

### Fix

Treat an error as a design error when it either matches the explicit design-error patterns or is
safely resolved to one of the current workspace's `.sv`/`.v` source files. Preserve fail-closed
behavior for unbound configuration/tool errors and for all detected internal compiler failures.
Add parser, adapter, real-Icarus, and multi-case batch continuation regressions.

### Prevention

Do not require an exhaustive English phrase list for compiler diagnostics that already carry a
validated candidate-source location. Every newly observed nonzero Icarus result should be tested at
the parser, adapter, and real executable boundaries, with a batch test for stop/continue semantics.

### Related Files

- `packages/core-loop/src/compiler-diagnostics.ts`
- `packages/core-loop/src/compiler-adapter.ts`
- `packages/core-loop/test/compiler-diagnostics.test.ts`
- `packages/core-loop/test/compiler-adapter.test.ts`
- `packages/core-loop/test/iverilog.integration.test.ts`
- `packages/core-loop/test/batch-evaluator.test.ts`

## 2026-07-15 - Package-scoped Vitest command resolved paths from the package directory

### Symptom

The first A02 package test script found no tests. Adding both a workspace root and the original relative config path then resolved the config outside the repository.

### Root Cause

`pnpm --filter <package> test` runs the script with the package as its working directory, while Vitest resolves `root`, `config`, include globs, and positional file filters at different stages. The root config's workspace-relative include pattern did not match when treated as package-relative.

### Fix

The contracts package script sets `--root ../..`, names `vitest.config.ts` relative to that root, and supplies `packages/contracts/test` as a positional filter.

### Prevention

For future package-scoped test scripts, first verify the actual working directory. Use `pnpm --filter <package> --fail-if-no-match test`, keep the full root test command as the authoritative aggregate check, and confirm both commands discover the intended tests.

### Related Files

- `packages/contracts/package.json`
- `vitest.config.ts`

## 2026-07-16 - Host-path sanitizer alternated between URL false positives and quoted-path false negatives

### Symptom

The first generic Windows drive rule redacted the tail of an HTTP URL. After preserving HTTP(S), a guarded review showed that quoted POSIX paths and `file://` paths still passed through unchanged.

### Root Cause

The sanitizer tried to infer every host path with broad expressions but did not define URL classes and path-token boundaries independently. The captured-output Schema reused that same incomplete detector, so it did not provide an independent fail-closed result.

### Fix

Preserve ordinary HTTP(S) URLs, explicitly redact `file://` URLs, accept punctuation and quotes as POSIX path boundaries, and add the same quoted/file cases to capture and Schema-boundary tests. The Schema also now applies its preview maximum using UTF-8 byte length rather than JavaScript string length.

### Prevention

Every path sanitizer change must test Windows drive, UNC, bare POSIX, quoted POSIX, `file://`, HTTP(S), and multibyte byte-limit cases at both the helper and public Schema boundaries.

### Related Files

- `packages/core-loop/src/sanitization.ts`
- `packages/core-loop/src/contracts.ts`
- `packages/core-loop/test/contracts.test.ts`

## 2026-07-16 - R02 assumed cwd and relative OpenCode permission paths were stable

### Symptom

Package-scoped tests and the first CLI probe looked for `.opencode` below a package directory. The first real turn then fell back to OpenCode's default Agent because `--dir` made the isolated run workspace the project root. After trusted Agent discovery was fixed, every read/write/edit still returned an error even for declared relative paths.

### Root Cause

`pnpm --filter` changes cwd, OpenCode `--dir` changes project-local config discovery, and OpenCode 1.18.2 on Windows resolves file-tool inputs to absolute workspace paths before permission matching. The probe also assumed help text was stdout although this version emits it on stderr.

### Fix

Derive the repository root from the CLI/test module location, fix trusted `OPENCODE_CONFIG_DIR` to repository `.opencode`, accept help from bounded stdout plus stderr, and pair relative read/edit allow rules with constrained `**/` workspace-suffix forms. Parse and digest the final `agent list` permission array instead of checking only the Agent name. Real smoke now proves both allowed RTL generation and an actually denied write with no resulting file.

### Prevention

Run every CLI test both from the repository root and through its package-scoped pnpm script. Treat cwd, `--dir`, config discovery, help channels and permission path normalization as probed tool behavior, not assumptions. Do not mark a permission test passed unless an actual tool result is denied and the filesystem postcondition agrees.

### Related Files

- `apps/rtl-core-loop/src/index.ts`
- `packages/core-loop/src/agent-adapter.ts`
- `packages/core-loop/src/opencode-process.ts`
- `.opencode/agents/rtl-core-loop.md`
- `packages/core-loop/test/agent-smoke.test.ts`

## 2026-07-16 - R02 timeout swallowed termination failures and waited forever

### Symptom

Guarded commit review found that a timed-out OpenCode process could hang forever if process-tree termination failed, because the error was discarded and the runner still awaited `close` without a deadline.

### Root Cause

Only the model turn had a timeout. Windows `taskkill`, the composed graceful/force sequence, and final close confirmation were not independently bounded. The first fix also treated a normal Windows escalation race as failure: non-force `taskkill` can fail for a console process even though the subsequent forced tree kill succeeds.

### Fix

Add hard deadlines around termination commands, the composed termination operation, and close confirmation. Continue from a failed graceful signal to forced tree termination, distinguish confirmed normal timeout from unconfirmed termination, and release pipe/process handles before returning an error for an unconfirmed child.

### Prevention

Every external-process timeout test must cover successful tree kill, a terminator that never settles, and a child that never closes after nominal termination. Do not swallow kill errors without a separate positive termination confirmation.

### Related Files

- `packages/core-loop/src/opencode-process.ts`
- `packages/core-loop/src/agent-adapter.ts`
- `packages/core-loop/test/opencode-process.test.ts`
- `packages/core-loop/test/agent-adapter.test.ts`

## 2026-07-16 - R02 experiment digest omitted executable prefix arguments

### Symptom

Guarded commit review found that two turns with different `executableArgumentsPrefix` values produced the same experiment digest even though their actual argv differed. The task breakdown also retained the test counts from before timeout hardening.

### Root Cause

The digest covered model, limits, isolation and Agent settings but omitted the operator-owned launcher prefix used by every probe and turn. Acceptance evidence was updated in the handoff files but not in the task breakdown, which is the project progress source.

### Fix

Snapshot the operator config at adapter construction, include every non-empty prefix argument in order in the JCS experiment digest, and add a probe-level drift/mutation regression test. Normalize omitted and empty prefixes to the same no-prefix behavior. Synchronize the task breakdown with the final test-file and test counts.

### Prevention

Every operator-controlled value that changes executable argv must either participate in the experiment identity or be explicitly documented as non-semantic. After adding tests during guarded fixes, update both handoff evidence and the task breakdown from the same final run.

### Related Files

- `packages/core-loop/src/agent-adapter.ts`
- `packages/core-loop/test/agent-adapter.test.ts`
- `docs/task-breakdown.md`

## 2026-07-17 - Windows Icarus compile silently required ComSpec

### Symptom

The exact-version probe passed under the first minimal environment, but every real compile exited as `0xffffffff` with empty stdout and stderr, including valid input.

### Root Cause

The installed Windows Icarus v12 build requires `ComSpec` during compile/helper orchestration. `Path`, `SystemRoot`, `TEMP` and `TMP` alone were sufficient for `iverilog -V` but not for `-g2012 -tnull` compilation.

### Fix

Add `ComSpec` to the frozen Windows environment allowlist and snapshot the resulting environment when constructing the adapter. A controlled comparison proved that adding `ComSpec` alone changed the silent failure into normal diagnostics, after which all five real integration cases passed.

### Prevention

Do not infer compile environment requirements from a successful version probe. Every new compiler build or profile must run both probe and real pass/error smoke with the exact controlled environment before its identity is accepted.

### Related Files

- `packages/core-loop/src/compiler-profile.ts`
- `packages/core-loop/src/compiler-adapter.ts`
- `packages/core-loop/test/iverilog.integration.test.ts`

## 2026-07-17 - Concurrent validation made bounded process tests exceed Vitest's case timeout

### Symptom

Running typecheck, CLI tests, and the package-wide Core Loop suite concurrently caused unrelated Agent, compiler, R04 run, and batch tests to exceed Vitest's five-second per-test limit. Timeout cleanup also raced an active evidence write and reported `ENOTEMPTY`.

### Root Cause

The package script intentionally discovers the whole Core Loop suite even when extra positional arguments are appended. Starting it beside two other CPU/process-heavy commands first exposed the issue, but a later isolated aggregate run proved that Vitest's own multi-file concurrency could also push unrelated filesystem/process-heavy cases just beyond its default five-second case timeout. This was validation contention rather than a failed behavioral assertion. A prior fake timeout fixture also placed its forbidden late write too close to the adapter's bounded shutdown window.

### Fix

Move the fake child write farther beyond the termination window while preserving production timeout semantics. Set the repository-wide Vitest case timeout to 15 seconds: still finite and below the bounded external-process failure windows, but no longer coupled to host scheduling around five seconds. Run process-heavy test suites independently; use a direct single-worker Vitest command only for focused diagnosis, then rerun the repository-supported package and full-suite commands without competing jobs.

### Prevention

Do not parallelize separate process-tree, real-tool, or full Vitest commands on this host. Keep the explicit finite test timeout in the shared Vitest config, treat a cluster of timeouts across unrelated tests as possible host contention, verify with an isolated run, and still finish with the documented package and aggregate commands.

### Related Files

- `packages/core-loop/test/agent-adapter.test.ts`
- `packages/core-loop/package.json`
- `vitest.config.ts`
- `docs/verification.md`

## 2026-07-17 - Windows Actions converted unclassified MJS configs to CRLF

### Symptom

GitHub Actions passed lint, typecheck, tests, and build on `windows-latest` but `prettier --check` rejected only `eslint.config.mjs` and `prettier.config.mjs`. The Ubuntu job passed.

### Root Cause

The repository and Windows checkout use `core.autocrlf=true`. `.gitattributes` fixed LF for TypeScript, JSON, YAML, Markdown, shell, Python, and RTL files but omitted `*.mjs`, so Actions could check out the two configuration modules with CRLF while Prettier expected LF.

### Fix

Add `*.mjs text eol=lf` to `.gitattributes`. This fixes the checkout boundary instead of rewriting files during CI or weakening Prettier.

### Prevention

Every portable source/config extension added to the repository must have an explicit LF rule. Use `git check-attr -a -- <file>` when a format check differs between Windows and Linux.

### Related Files

- `.gitattributes`
- `eslint.config.mjs`
- `prettier.config.mjs`
- `.github/workflows/ci.yml`

## 2026-07-22 - Verification infrastructure failures were counted as logic mismatches

### Symptom

The Prob099 combined verification compile failed because of a testbench/interface mismatch, but
the batch summary incremented `functionalFailed` and still reported `COMPLETED` and `ok: true`.

### Root Cause

The aggregate used `compilePassed - functionalPassed` for `functionalFailed`, which folded every
post-candidate-compile outcome into one bucket. The functional status was also copied from the
earlier candidate-only batch instead of considering verification-stage validity.

### Fix

Count only `MISMATCH` as `functionalFailed`, add `verificationInvalid` for verification compile,
process, timeout, and output failures, and derive the final CLI status from the functional result.
Keep historical schema-version-1 evidence readable when per-output mismatch details are absent.

### Prevention

Whenever a new verification outcome is introduced, map it explicitly to pass, mismatch, not-run,
or verification-invalid and test both the aggregate counts and final status.

### Related Files

- `packages/core-loop/src/verilog-eval-simulation.ts`
- `apps/rtl-core-loop/src/index.ts`
- `packages/core-loop/test/verilog-eval-simulation.test.ts`

## 2026-07-22 - Successful baseline text was reused as a not-executed reason

### Symptom

A selected case with a valid baseline but no run result could be journaled as `NOT_EXECUTED` while
its explanation said that the blank fixture had the expected compiler-not-invoked baseline.

### Root Cause

The not-run renderer correctly mapped validation status `VALID` to `NOT_EXECUTED`, but still reused
the validation message. That message explains successful preflight and does not explain why the
case never ran.

### Fix

When a valid case has no run result, emit the bounded reason that functional simulation was not
reached before the batch stopped. Preserve validation messages only for genuinely invalid
preflight statuses and add an exact regression for the valid-but-no-run branch.

### Prevention

Keep status and reason derivation coupled. A status remap must not retain explanatory text from the
source status unless that text still describes the mapped outcome.

### Related Files

- `packages/core-loop/src/observed-issues.ts`
- `packages/core-loop/test/observed-issues.test.ts`

## 2026-08-10 - Pi Experience summaries repeatedly chose an unauditable default rejection

### Symptom

Several real, deterministically eligible repair trajectories returned only
`ROOT_CAUSE_UNCONFIRMED`. One later replay claimed that no public RTL or verification facts were
available even though the isolated workspace contained both RTL snapshots and the structured
compile/simulation facts.

### Root Cause

The initial rejection schema required no explanation or indication of which confirmation fact was
missing. This made rejection the cheapest model output and left orchestration unable to distinguish
a genuine specification ambiguity from failure to inspect the listed evidence.

### Fix

Require every semantic rejection to name one of three missing facts and provide a bounded public-
evidence explanation. Clarify the positive confirmation rule and preserve every prompt/request
version in a digest-bound workspace. A real `Prob155_lemmings4` replay then produced a valid
CREATED Experience; a later false rejection became directly diagnosable rather than silently
accepted as an opaque decision.

### Prevention

Before automatic Case End wiring, require execution-level proof that Pi read `spec.md`, both
context files, and at least one initial and final RTL file. Do not solve stochastic rejection by
unbounded retries, and never promote a rejected trajectory to Experience outside the schema.

### Related Files

- `packages/core-loop/src/experience.ts`
- `packages/core-loop/test/experience.test.ts`
- `.pi/extensions/rtl-experience-summarizer-policy.mjs`

## 2026-08-04 - Real Pi I2C coverage turns can exhaust the fixed turn deadline before editing

### Symptom

Run `run_20260804-163925-750`, requested with `--iterations 4`, measured the 78.16% baseline and
then exited 3 with `status: FAILED` / `stopReason: AGENT_FAILED`. Only one Agent turn was attempted;
no later coverage round ran. This repeats the timeout class previously observed in
`run_20260804-151037-229`, although `run_20260804-154957-029` completed successfully with the same
Pi/K3 provider and current coverage-guidance digest.

### Root Cause

The first refinement turn reached the configured 600,000 ms deadline and was classified as
`AGENT_TIMEOUT` after 602,290 ms. Pi completed eight provider responses containing reads and design
analysis, then the ninth exchange did not produce a response before termination. The before/after
RTL manifest digests are identical, so neither `tb.sv` nor `checker.sv` changed. The retained event
summary reports 317,000,961 original bytes and truncation, compared with 59,569,757 bytes for the
successful turn; this indicates substantial Pi JSON-stream amplification but does not by itself
prove whether the final delay was local Pi processing or provider latency.

`--iterations` is a maximum refinement budget, not an automatic retry count for failed Agent
turns. The I2C orchestrator intentionally stops immediately when a turn does not return
`RTL_CHANGED` with a usable workspace.

### Resolution

No code or workspace repair was applied during diagnosis. The failed workspace and baseline
evidence remain intact. An operator may retry in a new run, or set
`RTL_AGENT_TURN_TIMEOUT_MS=1200000` before retrying when accepting a twenty-minute per-turn limit;
the adapter's validated maximum is 1,200,000 ms. A separate product change would be required to
retry failed turns or expose timeout/retry behavior as I2C CLI flags.

### Prevention

When evaluating configurable iteration budgets, distinguish successful refinement iterations from
provider/process failures. Inspect `agent-turn-result.json` before assuming Verilator or the new CLI
arguments failed, and monitor both wall-clock duration and original event-stream byte count for Pi
runs.

### Related Files

- `.rtl-agent/i2c-coverage-runs/i2c-master/run_20260804-163925-750/evidence/attempts/2/agent-turn-result.json`
- `.rtl-agent/i2c-coverage-runs/i2c-master/run_20260804-163925-750/evidence/attempts/2/provider-transcript.json`
- `packages/core-loop/src/i2c-coverage-experiment.ts`
- `packages/core-loop/src/pi-agent-adapter.ts`

## 2026-08-04 - Aggregate Windows load exceeded a test-only process termination allowance

### Symptom

The OpenCode adapter test file passed by itself, but the aggregate suite repeatedly classified its
process-tree timeout fixture as `AGENT_PROCESS_ERROR` with `timedOut: true` instead of the expected
`AGENT_TIMEOUT`.

### Root Cause

The test overrode the production 2-second termination grace with 250 ms. Under aggregate Windows
process load, tree termination could exceed that artificial allowance and set
`terminationFailed`, which intentionally takes precedence over the timeout outcome.

### Fix

Raise only the test fixture's termination-confirmation allowance to 1 second. Keep the 500 ms Agent
deadline, timeout outcome assertion, unusable-workspace assertion, and delayed child-write check.

### Prevention

Run process-heavy aggregate tests without competing validation jobs and avoid test-only process
grace periods that are substantially below realistic Windows scheduling latency. Do not change
production outcome precedence merely to hide an unconfirmed termination.

### Related Files

- `packages/core-loop/test/agent-adapter.test.ts`
- `docs/verification.md`

## 2026-08-03 - PowerShell quoting broke a repeated ripgrep regex search

### Symptom

Two repository searches failed with an unclosed-group regex even though the intended patterns were
simple source-code literals.

### Root Cause

PowerShell quoting removed characters from a compound `rg -e` expression containing escaped
parentheses and quotes before ripgrep parsed it.

### Fix

Reissued the lookup with fixed-string `rg -F` searches for the exact source fragments.

### Prevention

Use separate fixed-string patterns for source tokens under PowerShell unless regular-expression
semantics are necessary. Do not embed quoted code fragments inside a compound regex command.

## 2026-07-30 - Spec-understanding host-path regression fixture did not inject its target

### Symptom

The new negative Checker test failed twice because the expected `HOST_PATH_FORBIDDEN` issue was
absent, while the other intended validation issues were present.

### Root Cause

The first fixture used doubled backslashes rather than a real Windows path token. The second fixture
attempted to replace text that did not exist in the Markdown sample, so it still never inserted a
host path. The production sanitizer behaved correctly in a direct probe.

### Fix

Append an unambiguous `C:/secret/spec.md` token directly to the negative artifact and keep host-path
sanitizer behavior separate from unrelated chained fixture transformations.

### Prevention

For multi-error negative tests, construct or append each independent invalid token explicitly and
probe shared sanitizers directly before changing production code.

### Related Files

- `packages/core-loop/test/spec-understanding.test.ts`
- `packages/core-loop/src/spec-understanding.ts`

## 2026-07-28 - Zero DUT line points were reported as 100% coverage

### Symptom

Real Pi run `run_1e59e739-92ba-43d5-8aa8-f03cb1cf2edb` compiled and simulated Prob101 correctly, but
the result contained `line.found: 0`, `score: 100`, and no uncovered targets. LCOV contained only TB
line records because the DUT was a single continuous assignment.

### Root Cause

The percentage helper treated an empty denominator as complete. Line-only Verilator instrumentation
does not necessarily create a DUT point for a continuous assignment, so the empty set was not proof
of full coverage.

### Fix

Enable line and toggle instrumentation, preserve point types from raw `coverage.dat`, convert only
line records to LCOV, and use typed DUT toggle coverage only when the DUT has no line point. Fail
explicitly when neither type contains a DUT point.

### Prevention

Every coverage integration must assert a positive DUT denominator, not only a percentage. Keep a
continuous-assignment regression in the real Verilator integration suite.

## 2026-07-28 - Missing assertion prevented coverage from starting

### Symptom

Pi run `run_0d887b75-8790-40b8-a387-95d1bf649122` generated a bounded exhaustive TB and a comparison
checker, but the checker used `$display`/`$finish` without an assertion or `$fatal`. The orchestrator
stopped as `VERIFICATION_ASSETS_MISSING`, so `roundsCompleted` was zero and `finalCoverage` was null.

### Root Cause

Minimum asset validation was a terminal precondition even though its missing requirements were
mechanically identifiable and repairable by the same Agent.

### Fix

Write `context/verification-feedback-attempt-<n>.json` with stable missing-requirement codes and give
the Agent a bounded repair attempt before invoking Verilator. Asset repair does not consume a
coverage round; the total three-turn Agent budget still applies.

### Prevention

Keep a deterministic regression where attempt one omits `assert` and `$fatal`, attempt two consumes
the structured feedback, and coverage round one then executes.

## 2026-07-28 - Generated checker instance used a SystemVerilog keyword

### Symptom

Prob131 run `run_70f67eaf-722e-4a9a-9bbb-aa74e1383338` stopped before simulation with five Verilator
syntax errors. The generated TB declared `tb_checker checker (...)` and called `checker.check()`.

### Root Cause

`checker` is a SystemVerilog keyword. Static asset validation checked module/file/assertion shape but
did not compile syntax, and the coverage orchestrator treated every Verilator failure as terminal.

### Fix

The common guidance now forbids `checker` as both module and instance name. More importantly, normal
nonzero Verilator compile errors bound to generated TB/checker paths are parsed into
`context/verilator-compile-feedback-attempt-<n>.json` and receive a bounded Agent repair turn. Each
compile attempt has a distinct evidence directory and does not consume a coverage round.

### Prevention

Keep exact parsing coverage for the observed `%Error: rtl\\tb.sv:<line>:<column>:` form, a
deterministic compile-repair orchestration test, and a real Verilator recheck of the retained failed
assets. Never route DUT-bound or process/tool failures into the verification-asset Agent.

## 2026-07-28 - VerilogEval reference module name did not match the public spec

### Symptom

The first real coverage-Agent run generated a TB that instantiated `TopModule`, but Verilator could
only find `RefModule` in the materialized reference RTL.

### Root Cause

VerilogEval reference files consistently name their model `RefModule` because the upstream hidden
TB compares it with a candidate `TopModule`. The new experiment intentionally does not use that TB
and initially copied the reference without adapting this dataset convention.

### Fix

The coverage-only Provider validates exactly one `RefModule` declaration and deterministically
renames it to `TopModule` while materializing `rtl/dut.sv`. The original dataset digest and locked
source remain unchanged.

### Prevention

Treat dataset-facing module naming as Provider normalization, not Agent prompt behavior. Provider
tests now prove that the coverage fixture contains prompt + normalized DUT only.

## 2026-07-28 - Toggle coverage misclassified a constant output as an untested target

### Symptom

`Prob001_zero` simulated successfully for two rounds, but LCOV reported the DUT's constant output
line and two derived branches at zero hits.

### Root Cause

Verilator `--coverage` includes toggle coverage. Its LCOV writer represents the constant signal's
0→1 and 1→0 toggle points as `DA`/`BRDA`, which the MVP parser reasonably but incorrectly treated as
line/branch execution gaps. A correct constant output cannot satisfy those toggle targets.

### Fix

Keep line coverage as the primary supplementation signal. Preserve Verilator's raw point type before
LCOV conversion, and use explicitly typed toggle points only as a fallback when the DUT has no
instrumentable line points. A report with no DUT line or toggle points is invalid rather than 100%.

### Prevention

Do not combine heterogeneous Verilator coverage types without preserving their original type.
Validate constant-output, continuous-assignment, and branch-bearing circuits separately in
integration tests.

## 2026-07-28 - MSYS2 GCC 16 could not link Verilator runtime with the default C++ ABI

### Symptom

Verilator `5.050` successfully parsed the SystemVerilog smoke test and compiled generated C++, but
the final UCRT64 GCC `16.1.0` link repeatedly failed on the move constructor for
`std::__cxx11::basic_string`. Ordinary C++ string compilation still passed.

### Root Cause

The Verilator runtime objects referenced the GCC 16 new-ABI `C4` constructor symbol, while the
installed MSYS2 libstdc++ import/static libraries exposed the compatible `C1`/`C2` forms but not
that `C4` symbol. A separate early attempt also selected MSYS Python, which cannot consume the
native `C:/...` path emitted into the generated Makefile.

### Fix

Install native `mingw-w64-ucrt-x86_64-python`, keep `/ucrt64/bin` before `/usr/bin`, and pass
`-CFLAGS -D_GLIBCXX_USE_CXX11_ABI=0` to Verilator so every generated and runtime C++ object uses the
same packaged legacy ABI. The compile, simulation, coverage data, LCOV export, and summary then
passed.

### Prevention

Probe more than `--version`: every Windows Verilator profile must compile and run a timed
SystemVerilog test with the exact frozen environment and C++ flags, then prove coverage data can be
post-processed. Do not infer that the default ABI is usable from a successful parser/version probe.

### Related Files

- `.harness/session-log.md`
- `current-task.md`

## 2026-08-05 - A generated I2C assertion stopped the experiment without a repair turn

### Symptom

I2C coverage run `run_20260804-170019-107` completed its Agent turn and Verilator compile, then
failed simulation at `rtl/tb.sv:481`. The generated testbench required the CR debug mirror to equal
`8'h00`, but the DUT returned `8'h40`, the preceding STOP command. The result stopped at
`VERILATOR_FAILED` even though three configured Agent iterations remained.

### Root Cause

Coverage orchestration generated structured feedback for missing verification assets and
Verilator compile diagnostics only. A nonzero simulation exit was treated as terminal, so the
next Agent turn had no bounded artifact describing the failing assertion and could not repair the
mutable testbench.

### Fix

Convert confirmed simulation nonzero exits, signals, and timeouts into strict
`context/verilator-simulation-feedback-attempt-<n>.json` artifacts. The next available Agent turn
receives that path and retries the same coverage round. Persist the final diagnostic even when the
iteration budget is exhausted. Keep spawn errors and unconfirmed termination terminal.

### Prevention

Regression tests now prove both I2C and generic coverage orchestration preserve the round number,
pass the simulation feedback path to the next attempt, and complete after a repair. Contract and
adapter tests reject ambiguous feedback combinations and feedback from the wrong run or a
non-earlier attempt. Coverage guidance tells the Agent to repair the concrete runtime failure
before pursuing new targets and not to guess undocumented mirror values.

### Related Files

- `packages/core-loop/src/coverage-experiment.ts`
- `packages/core-loop/src/i2c-coverage-experiment.ts`
- `packages/core-loop/src/agent-adapter.ts`
- `config/agents/rtl-core-loop/coverage-guidance.md`

## 2026-07-22 - Historical compile error masked a later tool failure

### Symptom

A multi-attempt case could finish with `TOOL_ERROR` during final recompile but explain that outcome
with a compiler message from an earlier candidate that had already been superseded.

### Root Cause

The not-run reason renderer searched all compile observations for the latest `COMPILE_ERROR` before
switching on the final run outcome. That historical message therefore took precedence over every
later failure category.

### Fix

Consult structured compile errors only for the final `MAX_ATTEMPTS` outcome. Timeout, policy,
Agent, and tool failures now derive their reason from the final outcome and failure stage. Add a
regression covering compile error, later compile pass, and final-recompile tool failure.

### Prevention

Derive diagnostic text from the final outcome first. Use attempt history only as supporting detail
for outcomes whose meaning explicitly depends on that history.

### Related Files

- `packages/core-loop/src/observed-issues.ts`
- `packages/core-loop/test/observed-issues.test.ts`

## 2026-08-06 - PowerShell rejected a direct `foreach` result pipeline four times

### Symptom

Four read-only diagnostic commands failed with `An empty pipe element is not allowed` when a
PowerShell `foreach (...) { [pscustomobject]... } | Format-Table` expression was placed directly
before a pipeline.

### Root Cause

In this invocation form PowerShell did not parse the statement-style `foreach` as a pipeline
producer. The construction was reused while checking Icarus paths, while locating Git Bash, and
again while computing ChipBench paired micro metrics, despite the existing prevention note.

### Fix

Assign the `foreach` results to a task-specific collection variable first, then pipe that variable
to `Format-Table`. All corrected diagnostics completed normally.

### Prevention

For PowerShell diagnostic tables, use `$rows = foreach (...) { ... }; $rows | Format-Table` rather
than piping directly from the `foreach` statement. This affects diagnostics only; no repository or
runtime data was changed by either failed command.

## 2026-08-10 - Outer command timeout orphaned a real Pi regression

### Symptom

The first full `read_write` Memory trial exceeded the desktop shell command's 10-minute timeout
while the Experience Summarizer was active. The shell call returned exit 124, but the evaluation
Node process and its Pi child remained alive and could still write the ignored experiment Batch.

### Root Cause

The outer tool budget covered the whole Case, while the runtime has separate bounded Agent,
Summarizer, and Consolidator turns. Generation plus three functional rounds consumed most of the
outer budget before summarization began. The desktop timeout terminated its PowerShell boundary,
not the detached runtime process tree.

The read audit also showed that Pi guessed many plausible evidence filenames instead of first
reading `context/experience-input.json`, so it had not satisfied the new required-read contract
before the outer timeout.

### Fix

Resolve and inspect the exact process IDs and command lines, verify their parent-child relationship,
then stop only the two processes created by this trial. Confirm that only `mem-v0001` exists and
that no Batch result, Experience Pool file, consolidation result, or next snapshot was published.
Clarify the Summarizer prompt to require `context/experience-input.json` first, list every exact
mandatory read, and prohibit guessed filenames.

### Prevention

For future real Memory trials, set the outer orchestration budget above the sum of all possible
bounded Pi turns, or use a monitor that owns the detached process tree. After any desktop command
timeout, inspect and terminate only the verified experiment tree before making publication claims.
Required-read acceptance remains execution-audited rather than inferred from prompt text.

## 2026-08-10 - Restricted Consolidator could not discover vague context paths

### Symptom

Batch `b-20260810-008` completed its Case and created a valid Experience, but consolidation failed.
Pi wrote an invalid result explaining that its attempts to read context inputs had been denied; the
read audit was empty and no next snapshot was published.

### Root Cause

The turn said only to read all context files. The isolated Pi process had `read` and `write` but no
directory-enumeration tool, while the policy intentionally rejected reading the directory root.
The model therefore had no reliable way to discover the three input filenames.

### Fix and Prevention

List `context/snapshot.json`, `context/experiences.json`, and `context/output-schema.json` explicitly
in both system and turn instructions. Do the same for Selector, restrict policies to exact input
files, and retain execution-audited required reads. Policy tests now reject directory-root and audit-
file reads. Batch `b-20260810-009` read all three exact paths and published `mem-v0002`.

## 2026-08-10 - Consolidator and Selector used different stage vocabularies

### Symptom

The first frozen replay of `mem-v0002` passed its Case but created no Selector evidence and injected
no Memory. The catalog contained one item, yet deterministic filtering returned an empty set.

### Root Cause

The model-produced Memory stage was `design`, while initial-generation selection queried
`initial_generation`. The draft schema accepted arbitrary stage strings, so publication could create
a structurally valid but unreachable item.

### Fix and Prevention

Constrain snapshot catalogs and new ADD/MERGE stages to `initial_generation`,
`functional_simulation`, `unknown`, or null, document how Experience kinds map to them, and treat
null/`unknown` Memory metadata as filter wildcards. A regression rejects `design` before
publication. The experimental `b-20260810-011` migration normalized the old item into `mem-v0003`;
frozen Batch `b-20260810-012` then selected and injected it successfully. Current V1 stores do not
retain a compatibility path for that discarded experimental vocabulary.

## 2026-08-12 - PowerShell regex path filter emitted one error per file

### Symptom

A read-only diagnostic intended to count attempt-scoped `agent-input.json` files used
`-match '\evidence\attempts\'`. The trailing backslash made the regex invalid, so PowerShell emitted
the same parse error once for every pipeline item and returned a misleading zero count.

### Root Cause

The task only needed a literal path-segment test, but the diagnostic used regex syntax with an
unescaped terminal backslash.

### Fix and Prevention

Build the literal segment with `[IO.Path]::DirectorySeparatorChar` and use
`FullName.Contains(...)`. The corrected diagnostic found 178 attempt inputs, 22 with functional
feedback, and zero with `relevantMemoryPath`. Prefer fixed-string path checks over regex whenever no
pattern semantics are required.

## 2026-08-12 - Compact PowerShell syntax corrupted read-only result checks

### Symptom

A repair-depth diagnostic emitted repeated command-not-found errors for `Test-Path$p`. A later
compact pipeline also produced incorrect counts from expressions such as
`Where-Object status-eq'PASSED'`.

### Root Cause

Whitespace and explicit script blocks were removed while compressing the diagnostic. PowerShell
then parsed parameterized commands and property comparisons differently from the intended forms.

### Fix and Prevention

Use explicit forms such as `Test-Path -LiteralPath $path` and
`Where-Object { $_.status -eq 'PASSED' }`. Treat compact diagnostic syntax as unsafe when it can
change parsing, and validate aggregate counts against the 156-Case Batch total before reporting.

## 2026-08-19 - Repeated direct foreach pipeline in coverage inventory

### Symptom

A read-only inventory of coverage result files failed with `An empty pipe element is not allowed`
when a statement-style PowerShell `foreach (...) { ... }` block was piped directly to
`Format-Table`.

### Root Cause

The diagnostic repeated the exact PowerShell construction already documented on 2026-08-06
instead of assigning the loop results to a task-specific collection first.

### Fix and Prevention

Reissue the inventory as `$rows = foreach (...) { ... }; $rows | Format-Table`. For future
PowerShell diagnostics, do not place a statement-style `foreach` directly before a pipeline.
No experiment artifact or runtime state was changed by the failed read-only command.

## 2026-08-19 - One generic forbidden word invalidated a complete Memory Build

### Symptom

Memory Build `b-20260819-001` returned `CONSOLIDATION_FAILED` even though Pi produced a valid outer
schema, covered all 15 Experience indexes, and proposed three independent Memory additions.

### Root Cause

One draft said an output was `observed by the testbench`. The Memory Store's intentionally strict
validator treated every `testbench` occurrence as possible hidden verification leakage, and the
Batch-level catch converted that single content failure into an all-or-nothing build failure.

### Fix and Prevention

Apply only an allowlisted semantic-preserving rewrite for passive generic simulation wording before
content validation. If one `ADD` or `MERGE` still contains forbidden content, convert only that
operation to `REJECT`; do not publish it and do not block safe sibling operations. Keep all other
schema, provenance, target, section, and size failures fail-closed. Regression tests cover both the
safe rewrite and unsafe-operation isolation, and the saved failed build replays to three clean
Memory items without a model call.

## 2026-08-21 - Kimi reasoning signature failure masqueraded as RTL policy failure

### Symptom

ChipBench Batch `b-20260820-002` passed only two Cases and reported 28 functional non-runs.
Twenty-three Agent results said `POLICY_VIOLATION` / `NO_COMPILE_UNIT`, even though their turns had
only read the allowed input files and had not attempted an unsafe write.

### Root Cause

The third Kimi provider request rejected a prior `thinking.signature` with HTTP 400:
`malformed encrypted reasoning content: invalid base64url encoding`. The response signature used
standard Base64 characters such as `+` and `/`; the next request endpoint required Base64URL. Pi
therefore exited before writing RTL, and the downstream workspace guard reported the missing
compile unit as if it were a policy violation.

### Fix and Prevention

Normalize only Kimi thinking signatures to unpadded Base64URL in `before_provider_request`, record
the mode in Pi isolation identity, and regression-test both payload immutability and the captured
actual request. Batch `b-20260820-003` scheduled all 30 Cases and contained zero matching protocol
errors. When `NO_COMPILE_UNIT` occurs without an attempted write, inspect the provider transcript
before attributing it to policy enforcement.

## 2026-08-21 - Repeated PowerShell diagnostic parsing mistakes

### Symptom

Two read-only diagnostics again piped a statement-style `foreach` block directly into formatting
and failed with `An empty pipe element is not allowed`. A later diagnostic interpolated `$file:` in
a double-quoted string and failed because PowerShell parsed the colon as part of the variable
reference.

### Root Cause

The commands repeated the already documented direct-`foreach` pipeline pattern and omitted braces
around a variable immediately followed by punctuation.

### Fix and Prevention

Always assign statement-loop output first (`$rows = foreach (...) { ... }; $rows | ...`) and write
punctuated variables as `${file}:...`. These failures were read-only and did not change the running
Batch or experiment artifacts.

## 2026-09-04 - Compact `Join-Path` syntax broke a read-only diagnostic

### Symptom

A Batch-inspection command wrote `Join-Path$b` and adjacent path arguments without required
PowerShell whitespace, so PowerShell attempted to resolve a nonexistent command such as
`Join-Path$bsummary.json`.

### Root Cause

The diagnostic was compressed into punctuation-heavy one-line expressions instead of assigning
each path with normal PowerShell token separation. This repeats the broader pattern of avoidable
PowerShell parsing failures already recorded above.

### Fix and Prevention

Use explicit statements such as `$summaryPath = Join-Path $batch 'summary.json'` and pass the named
variables to `Get-Content -LiteralPath`. The corrected command located the invalid functional Case;
the failed command was read-only and changed no process, Batch, Memory, or experiment artifact.

## 2026-09-07 - Multi-IP fixture diagnostics exposed metadata and pipelined-checker assumptions

### Symptom

The first FIFO materialization failed before Verilator because the generated fixture tags were not
sorted. The first Scalable Arbiter golden simulation then failed because its checker asserted that
the registered grant must be a subset of the current request. A direct PowerShell statement-loop
pipeline used during source digest inspection also repeated the known `foreach` parsing mistake.

### Root Cause

Fixture metadata requires sorted unique tags. The arbiter is explicitly multi-cycle, so grant can
legitimately remain registered after the requesting testbench cycle changes; the assertion encoded
a combinational-interface assumption not guaranteed by the DUT. The diagnostic command again used
a statement-style `foreach` where PowerShell required an assigned result before piping.

### Fix and Prevention

Sort provider tags before schema validation. Check one-hot, select consistency, enable masking and
bounded expected grants, but do not compare a pipelined grant to the instantaneous request. The
corrected Arbiter fixture uses `arbiter_x2` and passed a fresh complete golden run. Treat the failed
and pre-final-score runs as diagnostics only. For PowerShell diagnostics, assign loop output to a
variable before piping; the failed read was non-mutating.

## 2026-09-08 - Recovery launch preflight assumed the wrong V1 snapshot field and item suffix

### Symptom

The first attempt to start the quota-recovery canary stopped at the Memory guard even though the
locked `mem-v0008` manifest was intact. No experiment process was created.

### Root Cause

The ad hoc guard checked `catalog.items` and `items/*.json`; the actual V1 snapshot schema stores
catalog records under `entries` and item bodies as `items/*.md`.

### Fix and Prevention

Inspect the physical snapshot first, then validate `manifest.memory_count`, `catalog.entries`, the
Markdown item count, and the locked manifest digest. The corrected guard found 13/13/13 and the
canary completed successfully. Future operational guards must follow the persisted V1 schema rather
than inferring file extensions.
