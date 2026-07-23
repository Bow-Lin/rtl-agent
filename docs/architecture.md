# Architecture Notes

## Repository Type

RTL engineering workflow service under ordered implementation. A01 established the TypeScript workspace, A02 implemented the version 1 cross-layer contract package, and A03 implemented the pure Phase A domain state machine. Before continuing A04, the active plan inserts a R01–R04 non-authoritative Core Loop checkpoint to test whether an OpenCode Agent can produce compiling RTL and repair compiler errors. The accepted trusted-system design remains in `docs/rtl-agent-high-level-design.md`; the Core Loop does not replace it.

## Main Directories

- `.harness/`: durable task and session state.
- `docs/`: stable project knowledge and verification guidance.
- `scripts/`: harness checks and shell-command safety guard.
- `apps/workflow-daemon`, `apps/workflow-cli`: buildable application shells; runtime behavior remains unimplemented.
- `packages/contracts`: implemented Zod schema version 1, JCS, logical paths, and stable boundary parsers/errors.
- `packages/domain`: pure Phase A `decide`/`evolveBatch`/`replay`, executable transition policy, aggregate invariants, and internal integrity errors.
- `packages/storage`: buildable package shell awaiting A04 logic.
- `packages/core-loop` and `apps/rtl-core-loop`: implemented R01–R04 Core Loop contracts, restricted Agent/compile adapters, bounded repair evaluation, pinned VerilogEval and ChipBench generation/debugging Provider/cache preparation, manifests/write policy, metrics, evidence, recoverable mismatch reanalysis, and thin CLI. Exploratory real batches exist; the acceptance-qualified checkpoint profile, human review, and recommendation remain pending.

## Entry Points

Root pnpm scripts provide install, lint, source/test typecheck, Vitest, build, and format checks. `@rtl-agent/contracts` exports its public API only through `packages/contracts/src/index.ts`; command and event inputs use `parseCommandEnvelope` and `parseEventEnvelope`. `@rtl-agent/domain` exports its public pure API only through `packages/domain/src/index.ts`. `@rtl-agent/core-loop` exports the R01–R04 API through its package index. `apps/rtl-core-loop` provides dataset preparation/checking, Agent probe, compiler smoke, and injected-profile run/evaluate commands. Workflow application entry files remain stubs.

## Data / Control Flow

OpenCode calls a loopback Remote MCP endpoint hosted by an independent TypeScript Workflow Daemon. Formal gate requests produce immutable snapshots and asynchronous jobs. Gate Workers run deterministic Checkers and controlled EDA adapters, then return structured results to the Daemon's single Command Executor. Langfuse receives metadata-only telemetry by default and never acts as a workflow state source.

The Spec-to-RTL Core Loop is a continuing capability layer with a deliberately separate trust classification: an external evaluation dataset is normalized through a versioned `FixtureProvider` into ignored per-run workspaces, a profile-locked Agent backend may edit only `workspace/rtl/**`, and a fixed Icarus profile compiles the mutable copy. OpenCode remains the established backend; Pi is available only through a separate capability/evidence branch and profile identity. The repository reserves the fixture interface/location but does not ship concrete evaluation cases in R01. Core Loop evidence is initially `authoritative: false` / `COMPILE_ONLY`; it cannot update the formal domain state or support a functional-correctness claim.

## Notes for Future Agents

- Use `docs/rtl-agent-high-level-design.md` as the implementation baseline.
- Use `docs/task-breakdown.md` for the ordered implementation sequence and task acceptance criteria.
- R01–R03 are complete and R04 mechanics plus the VerilogEval and ChipBench Providers are implemented. ChipBench prompted functional-repair results remain compile-only and cannot establish bug repair without a future functional Gate. Do not begin A04 until the locked R04 batch, human review, checkpoint recommendation, and explicit user choice are complete.
- Do not reintroduce LangGraph without a new decision record showing a requirement for dynamic graph execution that the transactional state machine cannot meet.
- Preserve the separation between authoritative database state, immutable artifacts, and non-authoritative Langfuse telemetry.
- Inspect relevant files before editing.
- Update this document when real project entry points and directory responsibilities become available.
- Record stable architecture decisions in `docs/decisions.md`.
