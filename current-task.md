# Current Task

## Goal

Execute A03 by implementing the pure Phase A domain state machine in `@rtl-agent/domain`.

## Current Status

Completed. The package now provides deterministic `decide`, batch-only projection and replay, a self-contained pending-review aggregate, executable actor/transition policy, separate state/transition invariants, and fail-closed internal integrity errors. All required Windows validation passed.

## Scope

Completed:

- implemented `Result`, `DomainError`, `DomainState`, `PendingReviewState`, `DecisionContext`, and domain-local `EventBatch`
- implemented executable Stage × Status × Command transition policy and actor matrix
- implemented `START_WORKFLOW`, Phase A `REQUEST_REVIEW`, and `RECORD_REVIEW_DECISION`
- required the exact safe Spec Approval decision set
- implemented strict context ID/time validation and one version increment per command batch
- implemented batch validation, projection, ordered replay, and full-stream duplicate detection
- separated intrinsic state invariants from previous/next transition invariants
- kept A02 EventEnvelope arrays and A04 per-event persistence rather than adding a second batch wire contract
- updated A04/A05 specifications for aggregate reconstruction, request actor persistence, review projection writes, monotonic context, and internal-error mapping
- added public-API tests for transition coverage, decisions, bindings, actors, batch corruption, replay, determinism, and immutability

Not performed:

- repository, SQLite transaction, CAS, idempotency, or Command Executor behavior; belongs to A04/A05
- review nonce/authentication or CLI behavior; belongs to A09/A10
- Phase B/C review transitions, snapshots, gates, or routing
- Linux execution evidence; deferred under the active A01–A05 policy

## Relevant Files

- `packages/domain/src/**`
- `packages/domain/test/**`
- `packages/domain/package.json`
- `docs/tasks/A03-domain-state-machine.md`
- `docs/tasks/A04-sqlite-storage.md`
- `docs/tasks/A05-command-executor.md`
- `docs/decisions.md`

## Plan

1. Reconcile the A03 review with approved A02 batch and platform decisions.
2. Define the domain aggregate, errors, executable policies, and invariant layers.
3. Implement pure decide, evolveBatch, and replay through one projection path.
4. Add exhaustive policy, corruption, determinism, and immutability tests.
5. Run Windows validation and record the A04 handoff.

## Validation Commands

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm --filter @rtl-agent/domain --fail-if-no-match test
corepack pnpm test
corepack pnpm build
corepack pnpm format:check
corepack pnpm peers check
rg -n "node:(fs|path|process|child_process|crypto)|@modelcontextprotocol|sqlite|better-sqlite3|Date\.now|new Date|Math\.random|randomUUID|process\." packages/domain/src
git diff --check
& 'C:\Program Files\Git\bin\bash.exe' scripts/harness_check.sh
```

The dependency/side-effect scan is successful only when it returns no matches.

## Acceptance Criteria

- every Phase A Stage × Status × Command branch is covered by executable policy tests
- `decide` generates events and obtains next state only through `evolveBatch`
- pending review identity, binding, actor, allowed decisions, and request time survive projection/replay
- batch and full-stream version/index/task/command/event identity failures fail closed
- equal inputs produce equal outputs without mutation or implicit time/random/I/O
- all required Windows commands and harness checks pass

## Risks

- Linux execution remains unverified under the temporary A01–A05 evidence exception
- A04 must persist requested actor fields and assemble task plus pending review atomically
- Phase A supports one event per command; later multi-event commands must explicitly extend domain event-sequence policy
- A09 must still compute `specDigest` at the trusted workspace boundary

## Next 3 Steps

1. Begin A04 from `docs/tasks/A04-sqlite-storage.md`.
2. Persist task and review projections so they reconstruct A03 `DomainState` without hidden repository queries.
3. Return ordered event rows in command batches suitable for strict A03 replay.

## Last Updated

2026-07-15T15:02:46+08:00
