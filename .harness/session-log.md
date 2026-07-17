# Session Log

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
