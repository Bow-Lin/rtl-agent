# Verification Guide

## Purpose

This file defines how agents should verify changes before declaring work complete.

## Baseline Harness Check

Always available:

```bash
bash scripts/harness_check.sh
```

## Project-Specific Validation

No project-specific validation commands are currently evidenced by repository files. When application, RTL, build, test, lint, simulation, or synthesis configuration is added, inspect it and document only commands that the repository actually supports.

When A01 establishes project commands, control-plane lint, typecheck, unit tests, manifest/path tests, and Preflight tests must run on both Windows and Linux. Formal compile/simulation/coverage Gate evidence is produced on Linux; a non-Linux formal-Gate invocation must be tested to return `LINUX_GATE_REQUIRED` rather than a downgraded success.

## Change-Type Validation Matrix

| Change Type | Required Validation |
|---|---|
| Documentation only | `bash scripts/harness_check.sh` |
| Harness files | `bash scripts/harness_check.sh` |
| Code logic | Project tests plus relevant lint/typecheck |
| API/interface | Tests plus affected integration checks |
| RTL logic | Lint plus simulation if available |
| Build/deployment | Build command plus smoke check |
| Cross-platform control plane | Windows checks plus Linux CI checks |
| Formal RTL Gate | Linux execution plus non-Linux rejection test |

## If Validation Cannot Be Run

Record in `.harness/session-log.md`:

- command not run
- reason
- risk
- recommended follow-up

Do not claim full completion without validation evidence.
