# Session Log

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
