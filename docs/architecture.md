# Architecture Notes

## Repository Type

RTL engineering workflow service under ordered implementation. A01 established the TypeScript workspace and A02 implemented the version 1 cross-layer contract package. The accepted system design remains in `docs/rtl-agent-high-level-design.md`.

## Main Directories

- `.harness/`: durable task and session state.
- `docs/`: stable project knowledge and verification guidance.
- `scripts/`: harness checks and shell-command safety guard.
- `apps/workflow-daemon`, `apps/workflow-cli`: buildable application shells; runtime behavior remains unimplemented.
- `packages/contracts`: implemented Zod schema version 1, JCS, logical paths, and stable boundary parsers/errors.
- `packages/domain`, `packages/storage`: buildable package shells awaiting A03/A04 logic.

## Entry Points

Root pnpm scripts provide install, lint, source/test typecheck, Vitest, build, and format checks. `@rtl-agent/contracts` exports its public API only through `packages/contracts/src/index.ts`; command and event inputs use `parseCommandEnvelope` and `parseEventEnvelope`. Application entry files remain stubs.

## Data / Control Flow

OpenCode calls a loopback Remote MCP endpoint hosted by an independent TypeScript Workflow Daemon. Formal gate requests produce immutable snapshots and asynchronous jobs. Gate Workers run deterministic Checkers and controlled EDA adapters, then return structured results to the Daemon's single Command Executor. Langfuse receives metadata-only telemetry by default and never acts as a workflow state source.

## Notes for Future Agents

- Use `docs/rtl-agent-high-level-design.md` as the implementation baseline.
- Use `docs/task-breakdown.md` for the ordered implementation sequence and task acceptance criteria.
- Do not reintroduce LangGraph without a new decision record showing a requirement for dynamic graph execution that the transactional state machine cannot meet.
- Preserve the separation between authoritative database state, immutable artifacts, and non-authoritative Langfuse telemetry.
- Inspect relevant files before editing.
- Update this document when real project entry points and directory responsibilities become available.
- Record stable architecture decisions in `docs/decisions.md`.
