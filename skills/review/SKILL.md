---
name: review
description: Review current changes for correctness, scope control, and validation readiness.
---

# Review Skill

## Goal

Review the current diff before completion or commit.

## Trigger

Use after implementation and before `/commit` or `/handoff`.

## Rules

- Review actual diff.
- Classify findings as BLOCKER, MAJOR, MINOR, or QUESTION.
- Check whether validation was run.
- Do not make unrelated changes.

## Steps

1. Inspect `git status --short`.
2. Inspect relevant diff.
3. Check against current task scope.
4. Check validation evidence.
5. Report findings.

## Output Format

```text
Review Result

BLOCKER:
MAJOR:
MINOR:
QUESTION:
Validation Status:
Recommended Fixes:
```

## Completion Criteria

- Findings are classified.
- Scope drift is identified.
- Validation gaps are identified.
