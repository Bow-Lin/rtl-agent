# Error Journal

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
