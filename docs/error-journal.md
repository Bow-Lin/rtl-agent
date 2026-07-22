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
