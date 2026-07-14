---
name: plan
description: Convert a user request into a scoped engineering plan and update harness state.
---

# Plan Skill

## Goal

Turn a request into a concrete, scoped, verifiable plan.

## Trigger

Use before non-trivial implementation, multi-file changes, refactors, or uncertain tasks.

## Rules

- Inspect relevant files before planning.
- Keep the plan scoped.
- Include validation commands.
- Update `current-task.md` and `.harness/session-state.json`.

## Steps

1. Restate the user request.
2. Inspect relevant files.
3. Identify scope and non-scope.
4. Create implementation plan.
5. Identify validation commands.
6. Update harness state.

## Output Format

```text
Plan

Goal:
Scope:
Non-Scope:
Files Likely Affected:
Steps:
Validation:
Risks:
```

## Completion Criteria

- Plan is written.
- Validation path is identified.
- Harness state is updated.
