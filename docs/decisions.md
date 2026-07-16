# Decision Log

Use this file to record stable project decisions.

## Format

```markdown
## YYYY-MM-DD - Decision Title

### Context

What problem or constraint led to this decision?

### Decision

What was decided?

### Alternatives Considered

What alternatives were considered?

### Consequences

What tradeoffs or future implications does this create?
```

## Decisions

## 2026-07-14 - Use Standard Harness

### Context

The repository is currently empty except for the initialization runbook, so there is no evidence that it is a production, multi-agent, EDA, or RTL repository yet.

### Decision

Initialize the runbook's default Standard Harness and defer project-specific Full Harness additions until repository evidence requires them.

### Alternatives Considered

- Light Harness: rejected because the repository is intended to support repeated future engineering work.
- Full Harness: deferred because no production, CI, deployment, RTL, or destructive workflow exists yet.

### Consequences

The repository gets complete protocol, state, verification, safety, and workflow layers without installing hooks or speculative CI configuration.

## 2026-07-14 - Use a TypeScript Transactional Workflow Core

### Context

The original proposal used OpenCode, a Python MCP server, LangGraph, SQLiteSaver, and Python Checker/Runner adapters. Design review found that the central problem is a deterministic engineering workflow with durable state, immutable verification inputs, long-running gate jobs, human approvals, and crash consistency. LangGraph would add a second state model without solving the mutable-workspace gate boundary.

### Decision

Use a TypeScript Workflow Service with an explicit transactional state machine, SQLite initially and Postgres as the scale-up path. Remove LangGraph from the implementation baseline. Run formal gates against immutable content-addressed snapshots. Keep Python as an optional, stateless EDA Worker for cocotb, pytest, reference models, and waveform analysis.

Integrate Langfuse asynchronously for OpenCode and workflow observability. Database gate results remain authoritative; Langfuse traces and scores never participate in state transitions.

### Alternatives Considered

- Python plus LangGraph: rejected because the graph is deterministic and checkpoint state would duplicate the domain state model.
- All-Python transactional service: viable, but TypeScript provides a better fit for OpenCode's JS/TS SDK, MCP integration, discriminated-union state modeling, and the future scheduler/control plane.
- All-TypeScript including verification internals: rejected because important RTL verification tooling and existing project scripts may depend on Python.
- Distributed workflow engines such as Temporal: deferred because the first deployment is local and single-user.

### Consequences

The control plane has one authoritative transactional state model and can share types across MCP, storage, routing, and future OpenCode automation. The project must maintain a small versioned JSON boundary for optional Python Workers. Snapshot, outbox, crash-recovery, and concurrency behavior become first-class implementation work rather than being delegated to LangGraph.

## 2026-07-14 - Separate Daemon, Human Review, Gate Identity, and Telemetry Boundaries

### Context

The first TypeScript HLD still coupled the full Workflow Service to a local stdio MCP lifecycle, exposed review decisions as an Agent tool, mixed source content and gate configuration in one digest, enabled broad OpenCode telemetry, and did not make SQLite's single-writer boundary explicit.

### Decision

Run the Workflow Daemon independently from OpenCode and expose a loopback Remote MCP endpoint, with an optional stateless stdio proxy only as a compatibility fallback. Agents may request reviews but cannot submit decisions; local CLI or authenticated user interfaces own review decisions.

Represent gate identity as `snapshot_digest`, `gate_input_digest`, `gate_run_id`, and `gate_result_digest`. Route all SQLite writes through one Command Executor using short WAL transactions with `synchronous=FULL`; Workers never write authoritative state directly. Default Langfuse telemetry to metadata-only and keep the OpenCode full-session plugin disabled unless the user explicitly enables a validated self-hosted mode.

### Alternatives Considered

- Full Workflow Service as an OpenCode stdio child: rejected because long-running gates would inherit the client session lifecycle.
- Approval through an MCP tool with OpenCode `ask`: rejected as the primary boundary because tool permission does not establish reviewer identity.
- One digest for source and gate configuration: rejected because it prevents independent content identity and controlled result reuse.
- SQLite WAL with `synchronous=NORMAL`: deferred as a performance option because it can lose recent commits after an OS crash or power loss.
- Full OpenCode Langfuse plugin by default: rejected because RTL, specifications, prompts, reasoning, and tool payloads may contain sensitive IP.

### Consequences

The first implementation needs daemon lifecycle management, a user review CLI, a result-ingestion command path, and explicit gate identity schemas. The system gains durable long-running execution, a real human approval boundary, auditable result supersession, and a privacy-preserving default. Full CAS, generic Python plugins, and full-session telemetry remain deferred.

## 2026-07-14 - Develop on Windows and Run Formal Gates on Linux

### Context

Initial development occurs on Windows, while the production runtime and EDA toolchain are expected to run on Linux. Handwritten path separators, shell pipelines, platform-native absolute paths, case-sensitivity assumptions, and inconsistent line endings would make Windows-tested code unreliable on Linux.

### Decision

Keep the TypeScript control plane, manifests, protocol contracts, and Preflight behavior portable across Windows and Linux. Store manifest paths as relative logical paths using `/`, and use `node:path` only at filesystem boundaries. Spawn fixed executables with argv arrays and `shell: false`; business logic must not depend on Bash, PowerShell, or `cmd.exe`.

Formal RTL compile, simulation, coverage, and sandbox Gates may be Linux-only. Non-Linux invocation returns the stable `LINUX_GATE_REQUIRED` error and cannot be treated as authoritative success. Use `.gitattributes` to enforce LF for portable source/configuration/RTL files, CRLF for Windows batch files, and binary handling for waveforms and databases.

### Alternatives Considered

- Require all development inside Linux or WSL: deferred because the current host is Windows and the control plane should remain portable.
- Emulate the full formal Gate on Windows: rejected as a correctness requirement because EDA tools and sandbox semantics may differ.
- Use shell command strings for convenience: rejected because quoting, executable lookup, and injection behavior vary by shell and operating system.

### Consequences

Control-plane tests need a Windows/Linux CI matrix. Formal Gate tests run on Linux and include an explicit Windows rejection test. Manifest schemas cannot contain host-native absolute paths, and future code review must reject manual path concatenation and shell-dependent orchestration.

## 2026-07-14 - Use pnpm Project References and a Synchronous SQLite Adapter

### Context

The A01–A05 implementation specifications need concrete package, build, and SQLite choices so later agents do not invent incompatible foundations. The control plane is a small TypeScript monorepo with a single SQLite writer and short synchronous transactions. Node 24 is an LTS line, while its built-in `node:sqlite` API is still documented at release-candidate stability.

### Decision

Use Node.js 24 LTS, pnpm workspaces, native ESM, TypeScript strict mode, and TypeScript project references. Resolve and lock exact tool versions when A01 executes; keep `@modelcontextprotocol/sdk` fixed at `1.29.0`.

For A04, use a precisely pinned `better-sqlite3` adapter, initially targeting `12.10.0`, subject to successful installation and runtime tests on both Windows and Linux. Keep all transaction callbacks synchronous and route all writes through the A05 Command Executor. Add an `application` package in A05 for orchestration so neither the pure domain package nor the storage adapter owns command workflow rules.

### Alternatives Considered

- npm workspaces: viable, but pnpm gives explicit workspace protocol references and strict dependency boundaries.
- Nx, Turbo, or Bun: deferred because the initial five packages do not justify another orchestration/runtime layer.
- Node 24 `node:sqlite`: attractive because it removes a native dependency, but deferred until its documented stability and compatibility meet the project's authoritative-state requirement.
- Put Command Executor in `domain` or `storage`: rejected because it coordinates both layers and would violate either domain purity or adapter responsibility.

### Consequences

A01 must pin the package-manager and dependency versions and run the same commands on Windows and Linux. A04 must treat native module installation/runtime compatibility as an acceptance gate and must record any adapter replacement before implementation. A05 introduces `packages/application` and preserves a one-way dependency from application to domain and storage.

## 2026-07-15 - Temporarily Defer Linux Execution Evidence for A01-A05

### Context

Development is currently performed on Windows and there is not yet a required Linux validation environment. Requiring a successful Linux CI/runtime result would block the first five control-plane tasks before the project has established that environment, even though their implementations can still be designed for portability.

### Decision

For A01 through A05 only, Windows validation evidence is sufficient to mark the task `DONE`. Implementations must continue to obey logical-path, shell-free process, LF, platform-neutral contract, and Linux-runtime design constraints. A01 retains a future Windows/Linux CI matrix entry point, but a successful Linux job is advisory/deferred during this interval. A04 may select and validate the SQLite adapter using Windows install/runtime evidence; Linux native-module and real mount behavior are validated later.

This decision supersedes only the A01–A05 Linux evidence requirements in the 2026-07-14 platform and SQLite decisions. It does not relax B07/B11 formal Gate acceptance, non-Linux `LINUX_GATE_REQUIRED` behavior, or the evidence required before claiming production Linux readiness.

### Alternatives Considered

- Block A01 until Linux CI succeeds: rejected for the current development phase because the missing environment would prevent useful Windows implementation progress.
- Remove Linux CI and portability work entirely: rejected because that would create avoidable migration debt and violate the target runtime boundary.
- Treat all future tasks as Windows-only: rejected because authoritative RTL Gates and production runtime remain Linux responsibilities.

### Consequences

Task handoffs for A01–A05 record Windows results and note Linux validation as deferred by policy rather than as a task failure. Case sensitivity, symlink, executable-bit, native module, and Linux filesystem behavior remain unverified risk until Linux validation runs. No release or trusted Gate may claim Linux readiness from Windows-only evidence.

## 2026-07-15 - Pin the A01 Toolchain and Typecheck Tests Separately

### Context

A01 requires a reproducible Windows baseline and a future Linux CI entry point. During installation, the registry's latest TypeScript was `7.0.2`, while `typescript-eslint@8.64.0` declared support only for TypeScript versions below `6.1.0`. The workspace also needed to prove internal package exports resolve without compiling tests into production output.

### Decision

Pin `.node-version` and CI to the locally verified Node `24.15.0`, pin pnpm `11.13.0` in `packageManager`, and lock all registry dependencies to exact versions. Use TypeScript `6.0.3`, ESLint `10.7.0`, typescript-eslint `8.64.0`, Vitest `4.1.10`, Prettier `3.9.5`, and Node types `24.13.3`.

Use `vitest.config.ts` rather than the obsolete standalone workspace file. Keep source builds in composite TypeScript projects and add `tsconfig.test.json` as a no-emit test project in the same build-mode typecheck command. Validate internal `workspace:*` dependencies through type-only app imports. Install `@modelcontextprotocol/sdk@1.29.0` as a runtime dependency of `workflow-daemon`, not as a root development tool.

### Alternatives Considered

- Use the registry-latest TypeScript 7: rejected because it violated the installed typescript-eslint peer range.
- Let CI float to the latest Node 24 patch: rejected because local and CI evidence would no longer identify the same runtime.
- Leave tests to Vitest transformation only: rejected because A02 will immediately depend on compile-time contract test coverage.
- Put the MCP SDK in root devDependencies: rejected because it is a daemon runtime dependency.

### Consequences

Tool upgrades are explicit lockfile changes with compatibility checks. `typecheck` may produce source `dist` output, while tests remain no-emit. The Linux CI job uses the same `.node-version` but remains advisory under the temporary A01–A05 policy. Node `24.15.0` is the validated baseline; upgrading to a later patch is a separate maintenance change.

## 2026-07-15 - Use JCS and Typed Review/Error Boundaries in A02

### Context

The original A02 specification used Unicode code-point key ordering, a broad RFC 3339 timestamp, optional review digests, generic error details, and per-event version fields without a command-result batch invariant. Review found that these rules were either non-standard across languages or too permissive to enforce the intended protocol boundary.

### Decision

Use RFC 8785 JCS for canonical JSON and canonical UTC timestamps with exactly three millisecond digits. Logical paths enforce conservative Windows/Linux portable segment rules and UTF-8 byte limits. Error bodies are a code-discriminated union with fixed retryability and strict detail allowlists. Public command/event parsers classify unsupported versions and unknown discriminators before Zod shape validation and expose only stable validation issues.

Keep the existing `EventEnvelope[]` result rather than adding another persisted EventBatch envelope; validate the array as one atomic command batch and retain A03 `evolveBatch` plus A04 `event_sequence`. Keep `VERIFICATION_CHALLENGE` as the HLD-approved stage. Model review bindings by review type. Because Phase A predates SnapshotStore, Spec Approval binds a server-computed `specDigest`; later formal reviews bind snapshot and gate/manifest identities.

### Alternatives Considered

- Keep the custom Unicode code-point canonicalizer: rejected because it would not interoperate with RFC 8785 implementations for non-BMP keys.
- Add a separate EventBatch persistence contract: rejected because CommandSuccess already defines the atomic batch boundary and A03/A04 separately define replay and storage order.
- Keep optional review digests and validate combinations only in domain code: rejected because meaningless review bindings should fail at the cross-layer contract boundary.
- Require Linux evidence for A02 completion: rejected because it would contradict the active A01–A05 evidence exception; Linux CI remains advisory until that decision is superseded.

### Consequences

Zod is pinned at `4.4.3`. Hash inputs are cross-language JCS UTF-8 bytes. A03 can rely on canonical time, strict review variants, stable parse failures, and a validated command event batch. A09 must compute Spec Approval digests at the trusted workspace boundary. Production Linux compatibility is still not claimed from Windows-only A02 evidence.

## 2026-07-15 - Use a Batch-Only Domain API and Self-Contained Pending Review Aggregate in A03

### Context

The original A03 draft exposed a single-event reducer while also requiring one version increment per command batch. It passed only `TaskState.pendingReviewId` to `decide`, even though A02 defines allowed decisions and binding as review-instance data. That combination could not validate a review decision purely after a restart without querying hidden repository state.

### Decision

Expose `decide`, `evolveBatch`, and batch-oriented `replay`; do not expose a single-event reducer. Keep A02 `EventEnvelope[]` and A04 event rows as the cross-layer/persistence representation, with a domain-local non-empty `EventBatch` TypeScript view rather than a second wire envelope.

Use `DomainState` as the pure aggregate input: a `TaskState` projection plus the complete pending review when one exists. Phase A Spec Approval requires the exact `APPROVE | REJECT | REQUEST_CHANGES` set. Actor policy allows `USER | AGENT` to start, `AGENT | SYSTEM` to request review, and only `USER` to record a decision.

Separate intrinsic state invariants from previous/next transition invariants. Keep state/batch/sequence/context corruption as internal DomainError classifications and map them safely in A05 rather than expanding the A02 public error protocol. Treat time as audit/context data with a non-regression check, never as the event ordering key.

### Alternatives Considered

- Add a persisted EventBatch envelope: rejected because A02 already validates `CommandSuccess.events` atomically and A04 has command/index/version columns plus transaction atomicity.
- Put the complete review inside A02 `TaskState`: viable, but rejected for Phase A because A04 already has a separate reviews projection and can assemble `DomainState` transactionally without duplicating the full review in the tasks row.
- Derive allowed decisions only from review type: rejected because A02 deliberately models allowed decisions as review-instance data; A03 additionally enforces the safe Phase A policy set.
- Add corruption codes to A02 ErrorEnvelope: rejected because corrupted state or event streams are internal faults, not caller-controlled protocol branches.

### Consequences

A04 must persist request actor fields and assemble task plus pending review into `DomainState`. A05 must persist review projection changes atomically with task/events/outbox/idempotency, provide non-regressing context time, and map A03 integrity errors to a safe internal response. Later multi-event commands extend the domain batch handler explicitly without changing the A02 wire result.

## 2026-07-15 - Validate Spec-to-RTL Compile Repair Before More Control-Plane Work

### Context

A01–A03 established a portable TypeScript baseline, strict contracts, and a pure domain state machine. The ordered plan would next spend A04–B09 on persistence, daemon, review, snapshots, jobs, and Gate APIs before B10 first connects an RTL Agent. That sequence is appropriate for a trusted system, but it delays evidence for the most important product hypothesis: whether the Agent can generate useful RTL and improve it from real compiler diagnostics.

### Decision

Keep A01–A03 and the accepted trusted-system HLD, but defer A04 and insert R01–R04 as a Core Loop checkpoint:

1. R01 defines isolated run workspaces, non-authoritative contracts, and a dataset-backed normalized fixture/provider interface without committing concrete evaluation cases.
2. R02 connects a restricted, version-locked OpenCode RTL Agent that can edit only the run's `rtl/**`.
3. R03 implements one fixed Icarus Verilog compile/elaboration profile using executable plus argv and `shell: false`.
4. R04 runs a maximum-three-attempt compiler-feedback loop and produces a batch evaluation report.

Dataset source, normalized fixture metadata, spec, compiler profile, Agent context, and evidence remain outside the Agent write root. R01 reserves `core-loop/fixtures/` and a versioned provider/materialize contract; concrete cases come from a later operator-selected dataset after source/version/license review. Test-only synthetic inputs validate R01–R03 mechanics but never count as evaluation evidence. Every Core Loop result is `authoritative: false` and `claim: "COMPILE_ONLY"`; compile success does not establish functional correctness. R04 ends at an explicit user decision among functional validation, one focused Core Loop refinement, or stopping/rethinking. It does not automatically resume A04.

### Alternatives Considered

- Continue directly with A04–B10: deferred because it invests heavily in trust and durability before demonstrating the core Agent capability.
- Revert A01–A03 and build an unrelated script: rejected because the existing toolchain, contracts discipline, and pure state model remain useful and do not prevent a lightweight experiment.
- Implement simulation/testbench generation immediately: deferred until compile generation and repair show a measurable signal.
- Treat the Core Loop compiler as the first formal Gate: rejected because it reads a mutable per-run workspace, lacks immutable snapshots/review/job boundaries, and only checks compile/elaboration.

### Consequences

The next implementation task is R01, not A04. R02 and R03 may proceed in parallel after R01 and converge in R04. The Core Loop is the continuing base for later fixed-TB, simulation, and repair improvements, so its package, CLI, run directory, and result types use stable capability names rather than lifecycle labels. Dataset adapters remain replaceable at the `FixtureProvider` boundary; dataset identity, version, split, license reference, selection, adapter version, and normalized digest become part of evaluation evidence. Trusted workflow layers may wrap this base without renaming it. A04–B11 remain the authoritative-system backlog and must still implement persistence, review, immutable snapshots, Linux Gate evidence, and result ingestion before any trusted claim.

## 2026-07-15 - Keep R01 as One Core Library with Validated Ephemeral Staging

### Context

The initial R01 draft placed contracts and filesystem behavior directly in one application, allowed a Provider to return a supposedly normalized fixture, mixed compiler/attempt policy into the fixture, and left manifest identity and write-policy scope underspecified. Those choices would make R02 and R03 depend on ambiguous data and would trust dataset adapters at the wrong boundary.

### Decision

Create one private `@rtl-agent/core-loop` library and keep `apps/rtl-core-loop` as a thin CLI; do not split additional packages. Separate `NormalizedFixture`, `CoreLoopRunProfile`, and `CreateRunRequest`. Model blank generation and seeded compile repair as a discriminated union. Stable fixture identity is the structured dataset/version/split/case tuple; `fixtureId` is only a display alias.

Providers write candidate files only into a Core Loop-created temporary staging directory and return declarative materialization metadata. Core Loop independently rejects links, special or undeclared files, logical-path/case/Unicode collisions, validates provenance, hashes raw file bytes, and computes the normalized fixture. Publish each run once into a new directory and do not add a persistent fixture cache in R01. A successful atomic publication is definitive: subsequent staging cleanup is best-effort and reports the stable `STAGING_CLEANUP_FAILED` warning instead of rewriting the published run as failed.

Use three explicit identities: normalized fixture digest; baseline manifest over stable spec and initial RTL only; attempt/run manifest over the complete run root. Manifest digests are SHA-256 over A02 JCS-canonical sorted file entries. Agent-turn postconditions compare the complete run before/after and permit net changes only below `workspace/rtl/**`; this does not detect transient write-and-restore behavior, so R02 permissions remain a required companion control.

Define the full R02/R03 handoff now: Agent attempt input, compile request, four-way compile result (`COMPILE_PASSED | COMPILE_ERROR | TIMEOUT | TOOL_ERROR`), byte-bounded sanitized captured output, final result, and a small versioned Core Loop error vocabulary. Captured output applies generic drive/UNC/POSIX host-path redaction even without caller hints and rejects residual host paths at the schema boundary. File manifest parsing independently rejects NFC/case-fold collisions so hand-built inputs cannot bypass generator checks. R01 validates compiler profile ID syntax only; R03/R04 own repository profile existence and tool execution.

### Consequences

R02 and R03 can implement independently against `@rtl-agent/core-loop`. No host absolute path belongs in persisted fixture/result JSON, no concrete dataset or evaluation fixture ships in R01, and missing Provider configuration fails with `DATASET_NOT_CONFIGURED`. Windows and Linux filesystem contract evidence is expected when environments are available; Windows-only execution cannot establish Linux readiness.
