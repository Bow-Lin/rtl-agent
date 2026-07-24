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

## 2026-07-16 - Freeze R03 as a Null-Target, Input-Bound Compile Profile

### Context

The first R03 specification described syntax parsing and top elaboration but used Icarus's default VVP code-generation target with `-o`. It limited command-line sources to `.sv`/`.v` without preventing `` `include`` from reading unbound files, trusted a request manifest across mutable compiler execution, and did not fully define process/output/status races. Two implemented R01 schema rules also could not represent declared R03 failures honestly: every `TOOL_ERROR` required a non-empty `toolVersion`, including missing-executable failures, and untruncated captured output required sanitized preview bytes to equal raw tool bytes even though redaction can change length.

### Decision

Use `iverilog-systemverilog-2012-null-v1` with fixed `-g2012 -tnull -s <top>` argv. The profile freezes exact Icarus identity, source ordering, forbidden-include policy, one-compilation-unit behavior, absolute executable, controlled cwd/environment, timeout and output limits. Preparation conservatively rejects non-comment `` `include`` directives and revalidates every source at the filesystem boundary. R03 adds its own strict `CompilePreparationResult` instead of expanding the implemented R01 error envelope. Compile execution requires stable matching manifests before spawn and stable unchanged manifests after `close`; any drift is a non-repairable `TOOL_ERROR`, not snapshot evidence.

Continuously drain stdout/stderr, count raw bytes, sanitize only bounded previews, wait for `close`, and use a single-finalize process state machine. Only explicit syntax/elaboration/root-module diagnostics are repairable `COMPILE_ERROR`; timeout, signal, internal/helper failure, unknown non-zero failure, version failure and unconfirmed termination stop the loop.

Before implementing the adapter, make only two backward-compatible R01 contract corrections: allow `toolVersion: null` for `CompileResult.status === "TOOL_ERROR"` and `FinalResult.outcome === "TOOL_ERROR"`, and define `CapturedOutput.originalByteLength` as raw pipe bytes without requiring equality to sanitized preview length. Existing valid results remain valid, host-path rejection remains strict, and R02 behavior must not change.

### Alternatives Considered

- Keep default VVP generation: rejected because R03 claims elaboration-only behavior and does not consume the generated program.
- Support controlled headers in v1: deferred because safe include resolution, dependency binding and search semantics require a separate profile.
- Treat request validation as sufficient filesystem validation: rejected because files can change after request construction.
- Classify every non-zero exit as repairable: rejected because compiler crashes, helper failures and unknown tool faults must not drive Agent RTL edits.
- Redesign all R01/R02 contracts: rejected because the established workspace, manifest, attempt, status and evidence boundaries remain sound; only the two proven representational contradictions are changed.

### Consequences

R03 remains a non-authoritative mutable-workspace experiment and cannot satisfy B07/B11. Its implementation begins with narrow contract regression tests, then adds the profile and adapter. R04 may invoke R03 only after the R02 turn has fully exited and passed postconditions, and may continue Agent repair only for `COMPILE_ERROR`.

## 2026-07-16 - Bind R02 to Resolved OpenCode Capabilities and Filesystem Evidence

### Context

OpenCode config is merged, `--pure` only disables external plugins, `run --help` is emitted on stderr in 1.18.2, `--dir` changes project discovery to the run workspace, and Windows file permissions are matched after paths become absolute. OpenCode also appends a narrow external-directory exception for its own tool-output storage. Checking only the executable version, Agent filename, process exit code, or model text would therefore not prove the effective turn boundary.

### Decision

Use the official native OpenCode executable with a fixed argv array and `shell: false`. Remove caller-owned OpenCode config overrides, set trusted `OPENCODE_CONFIG_DIR` to the repository `.opencode`, apply inline deny-only config and fixed disable variables, and run a static probe before every turn. The probe checks the exact version, flags from stdout/stderr, parsed resolved config, parsed final Agent permission rules, repository Agent/Skill bytes, and OpenCode DB availability. It rejects any post-catch-all allow/ask except the declared spec/context/RTL/Skill rules and OpenCode's narrow tool-output exception. Snapshot mutable operator config structures when constructing the adapter. Any non-empty executable argument prefix participates in the experiment digest as an ordered argv array; only the digest is persisted.

Give Windows read/edit rules both relative and `**/` workspace-suffix forms because OpenCode resolves tool paths before permission matching. Keep the independent whole-run manifest, extension, compile-unit and quota checks as the final fact boundary. Persist only projected event category/tool/status, sanitized bounded stderr and capability digests; do not persist raw JSONL, tool inputs, model text, resolved config, or the OpenCode DB host path. A turn is compile-eligible only when it exits normally, changes RTL, remains stable, and passes every postcondition.

### Consequences

R02 remains independent of compiler and repair-loop policy. Capability drift fails before a model turn. OpenCode's internal session database remains an explicitly documented local retention surface. Test-only real smoke must separately prove an allowed RTL generation and an actual denied write; those calls and generated inputs are mechanics evidence, not dataset evaluation or functional-correctness evidence.

## 2026-07-16 - Require Confirmed Bounded Process-Tree Termination in R02

### Context

The first R02 process runner started tree termination after a timeout but swallowed termination errors and then waited indefinitely for the child `close` event. A failed or hung OS termination command could therefore block the turn forever or leave a child process able to mutate the workspace after timeout.

### Decision

Bound each Windows `taskkill` invocation, the complete graceful/forced termination sequence, and the final child-close confirmation. Destroy captured pipes and unref the child when closure cannot be confirmed so the control plane can return. Preserve `AGENT_TIMEOUT` only when tree shutdown is confirmed; map an unconfirmed termination to `AGENT_PROCESS_ERROR` while retaining `timedOut: true` and a stable sanitized stderr diagnostic.

On Windows, a failed non-force attempt does not prevent `/T /F` escalation. A later force failure is accepted only when a prior tree-targeted termination succeeded and the child is already confirmed closed. POSIX continues to target the detached process group and treats only `ESRCH` as an already-absent group.

### Consequences

Every R02 process call now has a finite post-timeout bound. An unconfirmed workspace is never compile-eligible, normal confirmed timeouts retain their existing outcome, and deterministic tests cover both a terminator that never settles and a child that never closes after a nominal termination.

## 2026-07-17 - Bind R03 to the Verified Windows Icarus Build and Minimal Environment

### Context

The repository profile needed a real executable and exact release identity before R03 could be accepted. The Windows package's version probe worked with only the compiler directory on `Path`, but compile invocations exited silently with `0xffffffff` until `ComSpec` was present. This made the effective environment part of the compiler behavior rather than an incidental host detail.

### Decision

Bind `iverilog-systemverilog-2012-null-v1` to winget package `Icarus.Verilog 12.2022.06.11` and normalized identity `Icarus Verilog version 12.0 (devel) (s20150603-1539-g2693dd32b)`. The validated Windows executable is `C:\iverilog\bin\iverilog.exe`; the adapter stores only its digest in capability evidence and accepts an operator-owned absolute executable path, never a fixture or Agent override.

Freeze `-g2012 -tnull -s <top>`, ECMAScript UTF-16 ordinal source order, forbidden includes, one ordered compilation unit, a 30-second compile timeout, a 5-second probe timeout, 500-millisecond termination grace, 64 KiB per-stream previews, 128 KiB retained capture, 100 issues and 2048-byte issue messages. Snapshot the controlled environment at adapter construction. Windows uses only `ComSpec`, normalized `Path`, `SystemRoot`, `TEMP` and `TMP`; POSIX retains the portable `PATH`/`TMPDIR` entry point but has no real R03 acceptance evidence yet.

### Alternatives Considered

- Inherit the complete host environment: rejected because it would make compiler behavior and evidence depend on unrelated mutable host state.
- Omit `ComSpec`: rejected by real compile evidence; this build fails silently before producing diagnostics.
- Use Icarus V13 source or an unverified alternative Windows build: deferred because the available installed build passed the required fixed-profile evidence and profile changes require a new identity.
- Treat Windows smoke as a formal Compile Gate: rejected because R03 still reads a mutable workspace and has no Linux sandbox, immutable snapshot or authoritative ingestion.

### Consequences

R03 can be marked `DONE` for the non-authoritative Core Loop checkpoint. Profile semantic changes require a new profile ID or version. Windows process-tree termination, valid/error/elaboration/null-target behavior and deterministic reruns are evidenced; POSIX helper-tree termination and Linux compiler execution remain unverified and cannot support B07/B11 or production-readiness claims.

## 2026-07-17 - Compose R04 from Existing Strict Adapter Outcomes

### Context

The first R04 specification predated the final R02/R03 implementations. It referred to a nonexistent R02 `COMPLETED` outcome, required raw Agent JSONL that R02 intentionally does not retain, treated conditional compiler results as unconditional evidence, and did not define final-recompile failure, invalid fixture, infrastructure-failure, or metric-denominator semantics. A review also proposed reimplementing Agent workspace/process priority in R04 even though R02 already enforces that boundary.

### Decision

R04 consumes `AgentTurnResult` and `CompileResult` as strict facts and does not repeat R02 workspace/process policy or R03 compiler classification. Only `AgentTurnResult.outcome === "RTL_CHANGED"` is compile-eligible, and only `CompileResult.status === "COMPILE_ERROR"` can start another Agent turn. R04 persists the projected Agent result and never raw JSONL, reasoning, full Assistant text, or tool arguments/results.

Split batch execution into preflight and evaluation. Before the first Agent turn, probe and lock effective Agent/compiler capabilities, resolve the ordered selection, materialize every selected fixture into a batch-owned run workspace, lock normalized fixture digests, and validate every baseline. Invalid fixtures receive a batch-level case validation record and no `FinalResult`; valid cases are evaluated without returning to the Provider.

Every compiler invocation has unconditional preparation evidence and a conditional compile result. A first compile pass enters a distinct final-recompile step that rebuilds the request and checks the same manifest, profile, tool identity, and second pass. Nondeterministic pass/error classification or manifest/preparation drift is a tool failure, not an additional repair attempt.

`maxAttempts` is the total number of Agent turns, including the first generation/edit; baseline is attempt zero and the maximum number of repair turns is `maxAttempts - 1`. `FinalResult.attemptCount` is the number of Agent turns started. A strict `FinalResult` is written last only when all required evidence is durable and a trustworthy final RTL manifest can be computed. Evidence failure, an unscannable final workspace, or process interruption leaves the run incomplete and is classified only in batch evidence.

Capability metrics include every preflight-valid case that starts formal Agent evaluation unless independent infrastructure invalidity is proven. Policy violation, no change, Agent failure, Agent timeout, and post-Agent compile timeout remain evaluation failures. Raw compiler-confirmed metrics remain separate from review-accepted checkpoint metrics, and Blank Generation and Seeded Compile Repair are reported separately. Metric names use `within-max-attempts` unless a profile explicitly fixes three turns.

Harden the existing R02 effective-config probe narrowly by explicitly disabling and validating snapshot, formatter, and LSP behavior together with the already locked autoupdate, sharing, MCP, plugins, instructions, and deny-only permissions. R04 binds the probed digests; it does not parse OpenCode configuration itself.

### Alternatives Considered

- Add invalid fixture and aborted outcomes to R01 `FinalResult`: rejected because those are batch/preflight or incomplete-execution facts, not completed compile-repair results.
- Reimplement R02 manifests and process-outcome priority in R04: rejected because it would create two conflicting policy authorities.
- Persist raw OpenCode JSONL for debugging: rejected because it contradicts the established R02 privacy boundary.
- Exclude every timeout or Agent failure from capability denominators: rejected because it would bias product-level success rates upward.

### Consequences

R04 adds batch-owned local evidence and metrics but remains non-durable, mutable-workspace, compile-only, and non-authoritative. Mechanics implementation and synthetic tests can complete before a real dataset exists, but R04 cannot be marked `DONE` or emit a checkpoint recommendation until an operator-selected, license-reviewed Provider and versioned evaluation profile run a real locked batch plus human review.

## 2026-07-20 - Use VerilogEval Through a Pinned External Cache and Repository Provider

### Context

R04 required an operator-selected real dataset and repository-owned `FixtureProvider`. NVlabs VerilogEval v2 contains a suitable 156-case `spec-to-rtl` split, but its repository also contains its own Make/Python generation and simulation harness. Adding the complete repository as a submodule would couple ordinary checkout and CI behavior to nested Git state, while invoking its harness would bypass the established R02 Agent and R03 fixed compile boundaries.

### Decision

Use NVlabs VerilogEval v2 commit `c498220d0a52248f8e3fdffe279075215bde2da6` without a submodule. Pin the codeload archive SHA-256, extracted 472-file manifest digest, ordered case count, MIT license reference, adapter normalization identity, and Provider source digest in repository metadata.

A TypeScript preparation command downloads the fixed archive, extracts only `LICENSE` and `dataset_spec-to-rtl/**`, validates the locked content, and atomically publishes it below ignored `.rtl-agent/datasets/` or an operator-configured cache root. `VerilogEvalFixtureProvider` reads only that verified cache and materializes only each public prompt as `spec.md`; reference implementations and testbenches remain outside Agent workspaces. The upstream Makefile, model scripts, Python dependencies, compiler flags, and VVP simulation are not executed.

### Alternatives Considered

- Git submodule: rejected as the default because nested Git initialization and submodule state would become an unnecessary operational dependency. It also does not provide the normalized Provider boundary needed by R04.
- Vendor the dataset files into the repository: rejected because it duplicates third-party content and makes upstream provenance/update review less explicit.
- Run the upstream VerilogEval harness directly: rejected because its shell/Make/Python/model and simulation semantics conflict with the locked R02/R03 execution contracts.

### Consequences

Ordinary repository clones remain small and contain no third-party benchmark payload. Dataset preparation is explicit, content-addressed, reusable offline after download, and fails closed on archive/cache drift without overwriting invalid content. The selected split supplies only `BLANK_GENERATION` cases; it does not by itself provide a `SEEDED_COMPILE_REPAIR` denominator. R04 remains incomplete until the final license-review disposition, versioned evaluation profile, real batch, and human review are recorded.

## 2026-07-20 - Admit Only ChipBench Verilog Generation into the Current Core Loop

### Context

ChipBench combines Verilog generation, debugging, reference-model generation, tools, and its own Docker/Make/Python execution harness. Its eight debugging splits describe timing, assignment, arithmetic, and state-machine bugs; these are generally functional defects that may still compile. The checked-in `problems.txt` files are also incomplete for two generation directories even though complete prompt/reference/testbench triplets are present.

### Decision

Pin commit `74fe7d283225ae030ef59326a06111c9d372b48e` and its codeload archive. Extract only `LICENSE` and `Verilog Gen/**` into an ignored cache, validate the complete 140-file manifest, and derive the deterministic catalog from complete filename triplets rather than the incomplete upstream `problems.txt` subsets. Expose 9 `cpu-ip`, 6 `not-self-contained`, and 30 `self-contained` cases as `BLANK_GENERATION`; materialize only the prompt and keep reference RTL and testbenches outside Agent workspaces.

Do not extract or execute Verilog Debugging, Ref Model Gen, Tool_Box, scripts, Docker, Make, or Python content. Do not classify functional debugging data as `SEEDED_COMPILE_REPAIR`; a future functional-simulation category and Gate would require a separate decision and profile.

### Consequences

ChipBench adds 45 generation cases without a submodule or upstream runtime dependency. CLI selection is explicit through `--dataset chipbench`, while existing no-flag commands remain compatible with VerilogEval. This is Provider/cache mechanics evidence only and does not complete R04 or establish functional correctness.

## 2026-07-20 - Add ChipBench Debugging as Prompted Functional Repair

### Context

The operator subsequently selected ChipBench Debugging as part of the dataset. Its eight splits contain 178 complete prompt/reference/testbench triplets: zero-shot and one-shot variants for arithmetic, assignment, state-machine, and timing bugs. Each prompt embeds the buggy `TopModule`; there is no separate starter-RTL workspace. These bugs commonly compile before and after editing, so neither the blank-generation nor seeded compile-error category describes them accurately.

### Decision

Supersede the earlier generation-only scope. Extend the same pinned ChipBench archive/cache to extract `Verilog Debugging/**` alongside `Verilog Gen/**`, lock the resulting 683-file manifest, and expose 223 total cases. Introduce `PROMPTED_FUNCTIONAL_REPAIR` as a prompt-only fixture category with a `NO_RTL_SOURCE` baseline and a separate metrics slice. Materialize only the prompt; keep references and testbenches private.

R04 may report only non-authoritative `COMPILE_ONLY` outcomes for this category. A compile pass must never be described as a functional repair or testbench pass. Upstream simulation, Docker, Make, Python, Ref Model Gen, Tool_Box, and scripts remain outside the execution boundary.

### Consequences

ChipBench now supplies 45 generation and 178 prompted-debugging cases without a submodule. The adapter identity advances to `v2.0.0`, dataset cache version to `c74fe7d28-r2`, and the committed lock becomes `core-loop/fixtures/chipbench.lock.json`. Functional correctness still requires a future Linux simulation Gate or another explicitly designed functional-validation profile.
## 2026-07-20 - Connect the Restricted OpenCode Agent to Kimi Code

### Context

The operator provided a Kimi Code subscription API key in the repository-root `.env` file. R02
previously accepted only an externally configured OpenCode provider/model and had no repository CLI
boundary for loading local credentials. Provider credentials must not enter the inline OpenCode
configuration, capability digests, shared evidence, or version control.

### Decision

Configure a custom OpenCode provider named `kimi-code` with the official OpenAI-compatible base URL
`https://api.kimi.com/coding/v1`, the `@ai-sdk/openai-compatible` adapter, and the model IDs
`kimi-for-coding`, `kimi-for-coding-highspeed`, and `k3`. The locked local model is
`kimi-code/kimi-for-coding`.

The direct `rtl-core-loop` CLI loads only an explicit allowlist of Agent settings from root `.env`
and `.env.local`; inherited process variables retain precedence. The only accepted credential name
is `KIMI_CODE_API_KEY`. OpenCode receives the key only through its child environment, while inline
configuration contains the literal `{env:KIMI_CODE_API_KEY}` reference. The provider declaration,
but never the key value, participates in the experiment digest.

Keep the native OpenCode executable/version/model in ignored `.env.local`. The local Windows
installation remains OpenCode `1.18.2`, matching the existing R02 lock. Other hosts must supply
their own native executable path; no Windows path is committed to manifests or shared evidence.

### Consequences

The repository CLI can probe and run the existing restricted Agent with Kimi Code without changing
its deny-by-default tool boundary or retaining raw model content. Missing Kimi credentials fail
closed with `OPENCODE_NOT_CONFIGURED`. The local credential and host executable settings remain
untracked. Kimi live smoke remains mechanics evidence only and does not supply R04 dataset,
functional-correctness, formal-Gate, or Linux-readiness evidence.
## 2026-07-20 - Derive VerilogEval Kimi Profiles from Explicit Case Selectors

### Context

A profile named for a fixed first-ten selection would make routine generation unnecessarily rigid.
Allowing arbitrary CLI ranges without resolving them into the profile, however, would weaken R04:
the denominator and ordered case identity must be fixed before the first model turn.

### Decision

Register `verilog-eval-kimi-v1` as a generic local profile template. Require direct invocations to
provide exactly one selection form:

- inclusive range: `--begin <case> --end <case>`
- explicit list: `--cases <case,...>`

Selectors accept full case IDs or case-insensitive unambiguous prefixes such as `prob001`. Range
order follows the pinned Provider catalog, not numeric or ad hoc string sorting. Explicit lists are
deduplicated and canonicalized into the same Provider order. Missing, ambiguous, duplicate,
reversed, partially specified, and mixed selections fail before any model turn.

Resolve the selection into full case IDs, count, and ordered selection digest. Derive a concrete
profile ID from the base profile plus resolved case IDs, so capability or profile drift also changes
the derived identity. The complete resolved `EvaluationProfile` is written as batch evidence before
execution.

The v1 template probes and locks the current restricted
`kimi-code/kimi-for-coding` Agent and fixed Icarus capability, uses one Agent attempt per case, and
retains non-authoritative `COMPILE_ONLY` semantics with review required for confirmed passes.
Invoking the generic direct profile without an explicit selector is rejected to prevent an
accidental 156-case batch.

### Consequences

Operators can choose repeatable continuous or sparse subsets without creating a new source-level
profile for each range. The base CLI name remains stable while every resolved batch has a distinct
profile identity and digest. Selection flexibility does not imply functional verification or a
checkpoint result; no real dataset batch is executed merely by resolving the profile.

## 2026-07-21 - Complete VerilogEval Functional Simulation Inside `evaluate`

### Context

The initial Core Loop stopped after candidate elaboration and stored user-facing RTL inside UUID
run directories alongside several evidence trees. That did not exercise VerilogEval's locked
reference/testbench or provide a convenient output directory for generated modules.

### Decision

Keep `evaluate` as the complete operator workflow. After an independently confirmed candidate
compile pass, copy the candidate into a private verification sandbox, materialize the pinned
VerilogEval reference/testbench there, compile all three with Icarus, run `vvp`, and parse the
dataset's final mismatch summary. Require normal compile/simulation exits, exactly one summary, a
positive sample count, and zero mismatches for `PASSED`.

Do not expose reference/testbench files to the Agent. Preserve each run's strict
`authoritative: false` / `COMPILE_ONLY` evidence, and add a separate non-authoritative
`FUNCTIONAL_SIMULATION` batch result. This benchmark result is not a formal RTL Gate and does not
establish Linux production readiness.

Allocate new batches as atomic daily sequences (`b-YYYYMMDD-NNN`), while accepting legacy UUID
identities for historical evidence. Publish only `summary.json` and generated sources under
`rtl/<case-id>/`; place evidence, runs, staging, and verification inputs below `_internal/`. Print
the concise summary at the CLI and retain full details internally.

### Consequences

One `evaluate` invocation now performs generation, candidate compile, hidden verification compile,
simulation, and mismatch classification. Operators can inspect generated modules without navigating
run UUIDs, while forensic evidence remains available but visually separated. A standalone
`verify` command remains intentionally deferred.

## 2026-07-22 - Inject Versioned Common Guidance Into Every RTL Turn

### Context

Completed VerilogEval batches exposed repeated, generalizable failure patterns: procedural
assignment to nets, enum-valued ternary expressions rejected by Icarus, incomplete FSM discipline,
cycle-boundary mistakes, priority errors, and missing compile units. Keeping these observations
only in batch evidence does not help later model turns, while adding case-specific reference
behavior would leak evaluation answers.

### Decision

Maintain a repository-owned `.opencode/skills/rtl-core-loop/common-guidance.md` organized into
Compile, Logic, Safety, and final self-check sections. Include only reusable RTL methodology; do not
include case IDs, reference implementations, hidden testbench behavior, or expected outputs.

The OpenCode adapter reads the bounded UTF-8 file before every turn and appends its complete content
to the fixed invocation prompt. Record `guidanceFileDigest` in the probed Agent capability and each
turn result. Evaluation profiles therefore lock the exact guidance version, and capability drift
fails before candidate compilation.

### Consequences

Every generation and repair turn receives the same explicit checklist even if the optional skill
tool is not loaded. Updating the guide intentionally changes the Agent capability/profile identity.
Prompt guidance reduces recurring errors but is not an enforcement or sandbox boundary; the
separate untrusted-vvp execution finding remains unresolved.

## 2026-07-22 - Separate Automatic Observations From Explicit Guidance Promotion

### Context

The prompt checklist mixed directly observed failures with general RTL advice. Automatically
rewriting that prompt after every batch would make guidance noisy, mutate profile identity without
human intent, and allow a single case-specific observation to affect later generation. Conversely,
recording a nonzero mismatch as an unknown logic error provides no actionable knowledge.

### Decision

Rename the versioned prompt input to
`.opencode/skills/rtl-core-loop/common-guidance.md`. It remains digest-locked and may change only
after an operator explicitly asks the Agent to review `observed-issues.md` and update the guidance.
No dataset evaluation path writes this file.

After every dataset evaluation, atomically append one idempotent batch section to ignored runtime
knowledge at `.rtl-agent/knowledge/observed-issues.md`. Record structured compiler observations,
functional outcomes, infrastructure failures, and not-run counts. A VerilogEval mismatch requires
a separate restricted diagnosis Agent turn. That turn receives only the public specification,
candidate RTL, case identity, and mismatch totals; hidden reference/testbench assets are neither
materialized nor readable in its workspace. Require a concrete category, root-cause hypothesis,
candidate RTL citation, confidence, and limitations. Reject generic or malformed diagnoses with
`MISMATCH_ANALYSIS_FAILED`; do not write `LOGIC_MISMATCH_UNKNOWN`.

For every functional not-run case, publish a concise per-case detail using the stable run outcome
or case-validation status. Use the latest structured compiler message only when the final outcome
is `MAX_ATTEMPTS`; a later timeout or infrastructure failure must retain its own final stage reason
even if an earlier candidate failed to compile. Represent an Agent result with no compile-ready
source as `NO_COMPILE_UNIT`; represent selected cases with no run result as `NOT_EXECUTED` unless a
more specific validation status exists. Keep the aggregate `functionalNotRun` count for
machine-readable summaries. Do not reuse a successful `VALID` baseline-validation message as the
cause of a later not-executed outcome.

Parse the existing bounded testbench hints into public output-port mismatch counts and first
mismatch times and include those structured observations in the private diagnosis input. Retain the
complete analysis only below `_internal/mismatch-analysis/<run-id>/`. Publish exactly one concise
category/confidence/root-cause conclusion for the case in `observed-issues.md`; do not copy detailed
evidence, limitations, model output, reference signals, or testbench contents into the journal.

### Consequences

Observed evidence accumulates automatically without dirtying the Git worktree, while prompt changes
remain deliberate and reproducible. Each mismatch consumes one additional model request and the
diagnosis is an evidence-grounded hypothesis rather than formal proof. Guidance promotion affects
only subsequent profiles/batches because the existing guidance digest remains locked for the
entire active batch.

## 2026-07-22 - Separate Functional Mismatches From Verification Invalidity

### Context

The first full VerilogEval run exposed a combined candidate/reference/testbench compile failure for
Prob099. The evaluator counted that verification-interface failure as `functionalFailed` and kept
the batch `COMPLETED`, making the concise result indistinguishable from a genuine simulated logic
mismatch. Historical schema-version-1 evidence also predates per-output mismatch details.

### Decision

Reserve `functionalFailed` for cases whose simulation completed normally and reported a nonzero
mismatch total. Count verification compile errors, simulation process failures, timeouts, and
unparseable output in `verificationInvalid`. Any nonzero `verificationInvalid` makes the functional
result and CLI status `INVALID`; candidate-only compile failures remain `functionalNotRun`.

Keep schema version 1 readable by making per-case `outputMismatches` optional and defaulting a
missing aggregate `verificationInvalid` to zero. New evidence always writes both fields. The
operator explicitly accepts direct host execution of local `vvp` images for this
non-authoritative benchmark workflow, so no sandbox change is made. This acceptance does not apply
to a formal RTL Gate or establish production/Linux readiness.

### Consequences

Concise summaries no longer inflate model logic failures with broken verification infrastructure,
and downstream readers can distinguish retry/fix-the-fixture work from RTL quality. Old evidence
remains parseable, while local simulation retains the documented host-execution risk.

## 2026-07-23 - Keep Mismatch Diagnosis Recoverable and Non-Authoritative

### Context

Batch `b-20260723-002` completed all 30 selected evaluations, but its only mismatch diagnosis used
an unsupported category, string evidence entries, and lowercase confidence. The diagnosis content
was concrete, while the Agent-visible placeholder did not expose the allowed enums or evidence
object shape. The post-processing exception then made the CLI return `ok: false` even though the
published batch summary was `COMPLETED`.

### Decision

Provide the diagnosis Agent with an exact machine-readable contract containing every allowed
category, confidence value, evidence field, and length constraint. Add explicit
`INITIALIZATION_SEMANTICS` and `SPEC_REFERENCE_AMBIGUITY` categories. If the first response is not
valid JSON or fails the strict Schema, publish bounded validation issues inside the private
diagnosis workspace and permit exactly one correction turn. Protected specification, mismatch
context, and RTL manifests must remain unchanged across both turns.

Treat diagnosis and observed-issue journaling as recoverable post-processing. A failure returns a
`MISMATCH_ANALYSIS_FAILED` warning with `reanalyze --batch <batch-id>` while preserving the already
published compile/functional status and normal completed exit code. The reanalysis command reads
and validates existing batch evidence and never regenerates candidate RTL. Model-authored diagnosis
categories remain hypotheses and never rewrite raw simulation outcomes.

### Consequences

Strict evidence remains fail-closed, but formatting variance no longer discards completed benchmark
work or forces an expensive full-range rerun. A malformed response may consume one additional model
turn. Initial-state and likely public-spec/reference ambiguity can be represented honestly without
claiming access to hidden assets or automatically reclassifying the functional result.

## 2026-07-23 - Add Pi as a Parallel, Explicitly Locked Agent Backend

### Context

An OpenCode-backed VerilogEval batch was already running when a Pi Coding Agent adapter was
requested. Rebuilding `dist`, changing the active OpenCode Agent/Skill, or reusing the existing
profile identity for a different harness could invalidate or confuse the in-flight experiment.
Pi also exposes `bash` by default and does not provide a general built-in filesystem sandbox.

### Decision

Keep the existing `verilog-eval-kimi-v1` profile and legacy OpenCode capability/evidence schemas
unchanged. Add Pi capability and turn-evidence variants to a backend-neutral union, and expose Pi
only through `pi-agent-probe` and the separate `verilog-eval-kimi-pi-v1` profile.

Run Pi in one-shot JSON mode with an ephemeral session, isolated configuration, no discovered
extensions/skills/templates/context files, no project trust, and offline startup/update behavior.
Allow only `read`, `write`, and `edit`. Load one digest-locked repository extension that blocks
reads outside public attempt inputs and blocks writes outside supported RTL files. Retain the
existing post-turn workspace manifest enforcement as defense in depth. Accept the existing
`KIMI_CODE_API_KEY` by mapping it to Pi's official `KIMI_API_KEY` environment name without placing
credentials on argv or in capability evidence.

Use one operator-owned shared Pi configuration directory at `.rtl-agent/pi-config`, not a
per-turn directory. At the first probe, lock a semantic digest of that directory into the Pi
capability and retain a private full-state digest in the adapter instance. Every later probe and
turn must observe the same state for that adapter/batch lifecycle. `auth.json` content is excluded
from public capability evidence but included in the private drift check; model/provider/settings
configuration participates in the public semantic digest. A later batch may deliberately start
from a changed shared configuration and will receive a different resolved capability digest.

Do not install Pi, rebuild `dist`, change the active OpenCode configuration, or switch a running
batch. Source and deterministic test changes may be prepared concurrently; live Pi probe and
evaluation begin only after the active dataset process exits.

### Consequences

Historical OpenCode evidence remains readable and the in-flight batch retains its original process,
profile digest, prompts, and artifacts. Pi/OpenCode comparisons cannot accidentally share a profile
ID. Pi integration adds a second schema branch and adapter-specific evidence, while its lack of a
general sandbox remains explicit: enabling `bash`, arbitrary extensions, or unbounded paths requires
a separate security decision.

## 2026-07-24 - Select the Evaluation Agent Explicitly and Keep Progress off stdout

### Context

The VerilogEval CLI exposed OpenCode and Pi through different profile IDs, which made backend
selection an implicit side effect of profile naming. Long-running evaluations also emitted no
case-level progress while stdout was reserved for the final machine-readable JSON result.

### Decision

Add `--agent opencode|pi` to `evaluate`. Treat `verilog-eval-kimi-v1` as the generic operator-facing
entry point: `--agent opencode` retains its OpenCode profile identity, while `--agent pi` resolves
to the existing distinct `verilog-eval-kimi-pi-v1` evidence profile. Preserve the explicit Pi
profile ID for backward compatibility and reject any backend/profile capability conflict before an
Agent turn.

Report each case immediately before it enters the Agent/compile loop as
`正在处理 <case-id>... (<current>/<total>)`. Write progress to stderr and keep the final JSON as the
only stdout line. Treat progress callbacks as non-evidentiary observability: a display failure must
not change the evaluation result.

### Consequences

Operators can switch generation harnesses without memorizing backend-specific profile IDs, while
the persisted capability/profile identity remains unambiguous. Existing stdout JSON consumers
remain compatible, but wrappers that treat any stderr output as fatal must distinguish progress
text from the structured JSON error emitted on command failure.

## 2026-07-24 - Keep Full Pi Provider Inspection Outside Evaluation Evidence

### Context

The operator needs a small diagnostic that accepts arbitrary text and proves both Pi connectivity
and the exact request Pi prepares for Kimi. The regular Pi adapter deliberately excludes raw
prompts, event streams, reasoning, and provider payloads from formal Core Loop evidence. Adding
unconditional capture to that adapter would increase exposure of dataset prompts and could affect
an active evaluation.

### Decision

Provide root `test_pi_connection.ts` as one explicit standalone SDK diagnostic. Use the pinned Pi
package and shared `.rtl-agent/pi-state`, disable tools and resource discovery, register one
in-memory `before_provider_request` observer, send the command-line text, and print the captured
payload plus final Assistant message. Do not create a separate extension or capture file.

Never capture headers or credentials. Treat the printed result as sensitive operator diagnostics,
not R04 evidence. Keep the existing Pi RTL extension, Pi adapter, OpenCode configuration,
evaluation profiles, and `evaluate` command unchanged.

### Consequences

An operator can test custom prompt text and inspect the actual provider payload without running a
dataset case. The diagnostic prints Pi's parsed Assistant response; Pi's SDK hook does not expose
the raw streamed HTTP response body. Full output may contain system prompts, reasoning, thinking
signatures, usage, and proprietary input, so it must not be committed or shared without review.

## 2026-07-24 - Separate Backend Project Configuration From Pi Local State

### Context

Pi had become a first-class parallel backend, but its repository resources were split between
`config/pi` and `.opencode`, while its ignored local directory was named `.rtl-agent/pi-config`.
The two `config` names obscured the boundary between reviewed project behavior and mutable local
state. Pi also consumed common guidance from an OpenCode-owned directory.

### Decision

Use `.pi/` for repository-owned Pi resources, parallel to `.opencode/`. Move the locked path-policy
extension to `.pi/extensions/rtl-core-loop-policy.mjs` and declare the exact enabled tool list in
`.pi/capability.json`. Parse that file strictly, combine its semantic content with the path policy
in `toolPolicyDigest`, and fail closed if it is invalid or changes before or during a turn.
Continue disabling Pi resource discovery and load the reviewed extension explicitly.
Require the adapter-only `RTL_AGENT_PI_POLICY_REQUIRED=1` activation flag before the extension
registers its handler. This prevents ordinary manual Pi project discovery from failing or
unexpectedly acquiring the Core Loop policy, while adapter turns still fail closed if their
workspace root is absent or invalid.

Reserve `.pi/skills/` for Pi-only skills, but do not create a duplicate RTL Skill. Move the shared
RTL checklist to `config/agents/rtl-core-loop/common-guidance.md`; both adapters inject and
digest-lock that same file. A future Pi-native skill must be explicitly loaded and included in
capability identity.

Rename ignored `.rtl-agent/pi-config` to `.rtl-agent/pi-state`. Keep only authentication and
mutable model state there. Retain the pinned Pi package below `.rtl-agent/tools/pi-0.81.1`.

### Consequences

Backend-specific project behavior is now discoverable under `.opencode/` and `.pi/`, while shared
behavior has no backend ownership. Local secrets and mutable Pi state remain ignored and cannot be
mistaken for versioned policy. The extension path, shared-guidance path, and tool-policy digest
change the resolved Pi/OpenCode capability identity as expected, without changing the allowed
tools or workspace access.

## 2026-07-24 - Retain Pi Provider Request Payloads as Internal Attempt Evidence

### Context

The Pi evaluation path previously excluded raw prompts and provider payloads from Core Loop
evidence. The operator needs to run dataset cases through Pi and inspect what Pi actually sends to
the configured provider. Recording only the CLI system/user arguments would miss provider-specific
serialization and later requests produced after tool calls.

### Decision

During bounded Pi adapter turns, extend the existing digest-locked policy extension with a
`before_provider_request` observer. The observer never replaces the payload and never receives or
captures HTTP headers or credentials. It writes an ordered, size-bounded temporary JSONL capture
outside the Agent run workspace. After the Pi process closes, the adapter validates the capture,
exclusively publishes all request payloads to
`_internal/runs/<run-id>/evidence/attempts/<attempt>/provider-request-payloads.json`.
The extension enforces the 64-request and 8-MiB limits before writing each payload; an over-limit
request is not sent because doing so would create provider activity without the required record.
Temporary-directory removal uses three bounded retries. Final cleanup failure emits the stable
local warning `PROVIDER_CAPTURE_CLEANUP_FAILED` and adds `localWarnings` to the Pi turn result
without changing its Agent/RTL outcome or serializing the host temporary path.

Keep the artifact below ignored batch `_internal`; do not copy it into `summary.json`, public
generated RTL, the observed-issues journal, or authoritative workflow state. A missing or malformed
capture fails closed as `PI_AGENT_CAPABILITY_MISMATCH`. A process that never spawns records an
empty request list because no provider request could have occurred.

Add a root `core-loop:evaluate:pi` script that builds the workspace and invokes the existing generic
VerilogEval profile with `--agent pi`; callers still must provide an explicit range or case list.

### Alternatives Considered

- Store only the fixed CLI prompt arguments: rejected because they are not the final serialized
  provider payload and omit follow-up requests.
- Print payloads only to the terminal: rejected because long-running batch output is not durable or
  associated with a specific run/attempt.
- Store payloads in public batch summaries: rejected because they can contain complete proprietary
  specifications and model context.

### Consequences

Each tool-using Pi turn may retain multiple complete request payloads and therefore increases local
evidence size and sensitivity. The 64-request/8-MiB capture bounds prevent unbounded retention.
Changing the extension changes the locked Pi capability/profile digest. OpenCode retention policy
is unchanged, and the new artifacts remain non-authoritative diagnostic evidence. A rare cleanup
warning requires local operator follow-up but does not invalidate already completed model work.
