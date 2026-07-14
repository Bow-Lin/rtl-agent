---
name: handoff
description: Preserve session state so the next agent session can resume without chat history.
---

# Handoff Skill

## Goal

Close the current session by writing durable state.

## Trigger

Use at the end of a session, after a major step, or before context may be lost.

## Rules

- Update state files.
- Record what changed.
- Record validation status.
- Record next steps.
- Record unresolved risks.
- Do not claim completion without validation evidence.

## Steps

1. Inspect `git status --short`.
2. Summarize completed work.
3. Summarize changed files.
4. Summarize validation commands and results.
5. Update `current-task.md`.
6. Update `.harness/session-state.json`.
7. Append to `.harness/session-log.md`.
8. Update `docs/decisions.md` or `docs/error-journal.md` if needed.

## Output Format

```text
Handoff Summary

Completed:
Changed Files:
Validation:
Known Issues:
Next 3 Steps:
Resume From:
```

## Completion Criteria

- State files are updated.
- Next session can resume from `/start`.
- Validation status is explicit.
