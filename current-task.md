# Current Task

## Goal

Execute A02 by implementing strict cross-layer contracts, canonical serialization, and stable boundary errors in `@rtl-agent/contracts`.

## Current Status

Completed. Schema version 1 contracts, branded identifiers, portable logical paths, RFC 8785 JCS, typed review/error variants, atomic command event-batch validation, and stable command/event boundary parsers are implemented. All required Windows validation passed.

## Scope

Completed:

- pinned `zod@4.4.3` in the contracts runtime package
- implemented task, stage, status, actor, review, command, event, result, and error schemas
- implemented canonical UTC millisecond timestamps and branded identifiers
- implemented portable logical paths with Windows reserved-name and UTF-8 byte constraints
- implemented RFC 8785 JCS without Node, filesystem, MCP, storage, or process dependencies
- implemented strict code-specific error details and stable validation issues
- implemented two-stage command/event parsing for stable version and discriminator errors
- added public-API-only positive, negative, round-trip, capacity, and batch-invariant tests
- synchronized A02 decisions and directly affected A03–A05 task documentation

Not performed:

- command → event or event → state business logic; belongs to A03
- persistence, hashing, ID/time generation, MCP, review authentication, or Gate behavior
- Linux execution evidence; deferred under the active A01–A05 policy

## Relevant Files

- `packages/contracts/src/**`
- `packages/contracts/test/**`
- `packages/contracts/package.json`
- `pnpm-lock.yaml`
- `tsconfig.test.json`
- `docs/tasks/A02-contracts-and-errors.md`
- `docs/tasks/A03-domain-state-machine.md`
- `docs/decisions.md`

## Plan

1. Recover A01 state and reconcile the A02 review with approved architecture decisions.
2. Pin Zod and implement all version 1 schemas and branded primitives.
3. Implement RFC 8785 JCS, logical paths, stable parsers, and typed errors.
4. Add public boundary and batch-invariant tests.
5. Run Windows validation, repair failures, and record the A02 handoff.

## Validation Commands

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm --filter @rtl-agent/contracts --fail-if-no-match test
corepack pnpm test
corepack pnpm build
corepack pnpm format:check
corepack pnpm peers check
rg -n "node:(fs|path|process|child_process)|@modelcontextprotocol|sqlite|better-sqlite3" packages/contracts/src packages/contracts/test
git diff --check
& 'C:\Program Files\Git\bin\bash.exe' scripts/harness_check.sh
```

The dependency scan is successful only when it returns no matches.

## Acceptance Criteria

- Schema version 1 and all A02 public contracts strict-parse and round-trip.
- Unknown versions/discriminators and invalid identifiers/paths receive stable classifications.
- JCS matches RFC 8785 ordering and primitive boundary samples.
- Error details and retryability are fixed by error code.
- Command results validate one internally consistent event batch.
- Contracts have no Node, MCP, SQLite, filesystem, process, or network dependency.
- All required Windows commands and harness checks pass.

## Risks

- Linux execution remains unverified under the temporary A01–A05 evidence exception.
- Phase A Spec Approval depends on A09 computing `specDigest` at the trusted workspace boundary.
- Review-type-specific decision subsets beyond the stable enum remain domain policy for later tasks.

## Next 3 Steps

1. Begin A03 from `docs/tasks/A03-domain-state-machine.md` using schema version 1.
2. Implement `decide`, `evolveBatch`, replay, and Phase A invariants without I/O.
3. Preserve `specDigest` binding and the command-result batch invariants in A03 tests.

## Last Updated

2026-07-15T11:30:01+08:00
