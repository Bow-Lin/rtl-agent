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
