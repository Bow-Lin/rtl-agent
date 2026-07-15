# Verification Guide

## Purpose

This file defines how agents should verify changes before declaring work complete.

## Baseline Harness Check

Always available:

```bash
bash scripts/harness_check.sh
```

## Project-Specific Validation

A01 established the following repository-supported commands. Run them from the repository root using the Corepack-pinned pnpm version:

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm format:check
corepack pnpm peers check
```

`typecheck` uses TypeScript project references for source projects and a separate no-emit test project. Source `dist` output may be produced during typecheck; test files must not be emitted to `dist`. `clean` is available through `corepack pnpm clean` when a clean build is specifically required.

A01–A05 currently use Windows lint, typecheck, unit, storage, integration, and build evidence as their completion gate. Their implementation must remain portable and retain future Linux CI entry points, but a successful Linux result is temporarily deferred and does not block `DONE`. The A01 GitHub Actions Linux job is advisory. Before claiming production Linux readiness, the deferred Linux control-plane suite must pass. Formal compile/simulation/coverage Gate evidence is still produced on Linux; a non-Linux formal-Gate invocation must be tested to return `LINUX_GATE_REQUIRED` rather than a downgraded success.

## Change-Type Validation Matrix

| Change Type | Required Validation |
|---|---|
| Documentation only | `bash scripts/harness_check.sh` |
| Harness files | `bash scripts/harness_check.sh` |
| Code logic | Project tests plus relevant lint/typecheck |
| API/interface | Tests plus affected integration checks |
| RTL logic | Lint plus simulation if available |
| Build/deployment | Build command plus smoke check |
| A01–A05 portable control plane | Windows checks required; Linux execution evidence temporarily deferred |
| Production Linux readiness / later portable milestones | Windows checks plus Linux CI checks |
| Formal RTL Gate | Linux execution plus non-Linux rejection test |

## If Validation Cannot Be Run

Record in `.harness/session-log.md`:

- command not run
- reason
- risk
- recommended follow-up

Do not claim full completion without validation evidence.
