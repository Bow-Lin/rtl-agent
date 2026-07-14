# Architecture Notes

## Repository Type

Planned RTL engineering workflow service. The implementation has not started; the accepted high-level design is documented in `docs/rtl-agent-high-level-design.md`.

## Main Directories

- `.harness/`: durable task and session state.
- `docs/`: stable project knowledge and verification guidance.
- `scripts/`: harness checks and shell-command safety guard.
- `skills/`: repeatable agent workflows.

No business-code directories have been implemented yet. The planned structure separates a TypeScript workflow control plane, immutable snapshot/checker packages, and optional Python EDA workers.

## Entry Points

No application, package, CLI, simulation, synthesis, test, or build entry points exist yet. The planned first entry point is `apps/workflow-mcp/src/main.ts`.

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
