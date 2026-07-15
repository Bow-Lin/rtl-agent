# Current Task

## Goal

Execute A01 by creating the TypeScript monorepo and quality baseline after incorporating the approved A01 review changes.

## Current Status

Completed. The pnpm TypeScript workspace, five source projects, source/test typechecking, quality tools, exact dependency lock, and advisory Linux CI entry point are implemented. All required Windows validation passed; no business logic was added.

## Scope

Allowed:

- revise `docs/tasks/A01-typescript-workspace.md`
- create the root pnpm workspace, lockfile, TypeScript project references, two apps, and three library packages
- install exact quality-tool dependencies and `@modelcontextprotocol/sdk@1.29.0` in the daemon package
- add ESLint, Prettier, Vitest, source/test typechecking, ignore files, and Windows/Linux CI configuration
- update verification, decisions, task progress, and harness handoff

Not performed:

- implement A02 contracts or Zod schemas
- implement domain state transitions, SQLite, daemon lifecycle, MCP transport, CLI behavior, Gate, Runner, or Langfuse
- require Linux execution evidence for A01 completion
- modify or discard unrelated existing documentation changes

## Relevant Files

- `docs/tasks/A01-typescript-workspace.md`
- `docs/task-breakdown.md`
- `docs/verification.md`
- `package.json`
- `pnpm-workspace.yaml`
- `tsconfig*.json`
- `apps/*`
- `packages/*`
- `.github/workflows/ci.yml`

## Plan

1. Revise A01 for current Vitest, exact Node/pnpm, dependency ownership, ignore policy, and test typechecking.
2. Create the workspace manifests, project references, source stubs, and package-resolution smoke coverage.
3. Install and lock exact tool/runtime dependencies.
4. Add lint, formatting, test, build, and CI configuration.
5. Run all Windows validation commands and repair failures without adding business logic.
6. Record evidence, mark A01 complete only if acceptance passes, and update harness state.

## Validation Commands

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm format:check
git check-attr text eol -- package.json pnpm-lock.yaml apps/workflow-daemon/src/index.ts
git diff --check
Get-Content .harness/session-state.json -Raw | ConvertFrom-Json
& 'C:\Program Files\Git\bin\bash.exe' scripts/harness_check.sh
```

## Acceptance Criteria

- Five projects build through TypeScript project references and package exports.
- Tests are discovered by Vitest and typechecked separately from source build output.
- Root tool dependencies and daemon MCP dependency are precisely pinned in `pnpm-lock.yaml`.
- Unified commands pass on Windows using Node `24.15.0` and pnpm `11.13.0`.
- CI contains Windows and advisory Linux jobs using `.node-version`.
- No A02+ business logic is introduced.
- Linux execution evidence is recorded as deferred under the current policy.

## Risks

- Linux CI is configured but not executed as A01 completion evidence.
- Package-manager installation may change exact resolved tool versions; the lockfile and Session Log are authoritative.
- Existing uncommitted documentation changes must remain intact.

## Next 3 Steps

1. Begin A02 from `docs/tasks/A02-contracts-and-errors.md`.
2. Add strict Zod contracts and logical-path tests without changing the A01 package boundaries.
3. Run the unified commands and record A02 evidence before starting A03.

## Last Updated

2026-07-15T11:30:00+08:00
