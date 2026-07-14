---
name: commit
description: Prepare a validated commit summary without committing unless explicitly requested.
---

# Commit Skill

## Goal

Prepare changes for commit after validation.

## Trigger

Use when the implementation is complete and ready for final validation.

## Rules

- Do not run `git commit` unless the user explicitly asks.
- Inspect diff before preparing commit message.
- Run or confirm validation commands.
- Update `.harness/session-log.md`.

## Steps

1. Run `git status --short`.
2. Inspect diff summary.
3. Run relevant validation commands.
4. Update session log with validation result.
5. Generate commit message.

## Output Format

```text
Commit Preparation

Files Changed:
Validation Commands:
Validation Result:
Commit Message:
Risks / Notes:
```

## Completion Criteria

- Diff is reviewed.
- Validation result is recorded.
- Commit message is ready.
