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
