---
name: start
description: Recover project context at the beginning of a new agent session.
---

# Start Skill

## Goal

Recover project context before making changes.

## Trigger

Use when starting a new session or before beginning work in this repository.

## Rules

- Do not edit code during `/start`.
- Read required files first.
- Output a Session Briefing.
- If files are missing, report them and recommend running `bash scripts/harness_check.sh`.

## Steps

1. Read `AGENTS.md`.
2. Read `current-task.md`.
3. Read `.harness/session-state.json`.
4. Read `.harness/session-log.md`.
5. Read `docs/verification.md`.
6. Read `docs/decisions.md`.
7. Read `docs/error-journal.md`.
8. Output Session Briefing.

## Output Format

```text
Session Briefing

Current Goal:
Current Status:
Current Phase:
Next 3 Steps:
Relevant Files:
Validation Commands:
Known Risks:
Questions / Blockers:
```

## Completion Criteria

- Session context is summarized.
- No code was modified.
- Next action is clear.
