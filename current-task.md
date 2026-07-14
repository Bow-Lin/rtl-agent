# Current Task

## Goal

Add repository-wide constraints for developing on Windows while targeting Linux, covering paths, process spawning, formal Gate behavior, line endings, and cross-platform validation.

## Current Status

Cross-platform development constraints added. `AGENTS.md` now defines logical-path, shell-free process, Linux Gate, and line-ending rules; `.gitattributes` enforces the repository policy.

## Scope

Allowed:

- update Agent and coding constraints
- create `.gitattributes`
- align validation guidance and existing task acceptance criteria
- record the stable platform decision and update harness state

Not performed:

- TypeScript, Runner, CI, or EDA implementation
- installation of Bash, WSL, Node.js, or Linux tooling
- bulk normalization of existing files

## Relevant Files

- `AGENTS.md`
- `.gitattributes`
- `docs/coding-guidelines.md`
- `docs/verification.md`
- `docs/task-breakdown.md`
- `docs/decisions.md`

## Plan

1. Inspect current Agent and coding rules.
2. Add logical-path and shell-free process constraints.
3. Define the Windows Preflight/Linux formal-Gate boundary.
4. Add line-ending attributes and stable decision records.
5. Validate Git attributes, references, JSON, and harness state.

## Validation Commands

```powershell
git check-attr text eol -- sample.ts sample.cmd sample.vcd sample.db
rg -n "node:path|shell: false|LINUX_GATE_REQUIRED|logical path|\.gitattributes" AGENTS.md docs
Get-Content .harness/session-state.json -Raw | ConvertFrom-Json
& 'C:\Program Files\Git\bin\bash.exe' scripts/harness_check.sh
```

## Acceptance Criteria

- Agents cannot handwrite filesystem separators or persist host-native manifest paths.
- Business logic cannot depend on Bash, PowerShell, cmd, pipelines, or shell strings.
- Portable control-plane and Preflight tests are required on Windows and Linux.
- Formal EDA Gates may be Linux-only and reject non-Linux hosts with `LINUX_GATE_REQUIRED`.
- `.gitattributes` enforces LF, CRLF, and binary classifications as specified.
- No bulk line-ending rewrite is performed.
- Harness validation passes.

## Risks

- Windows/Linux CI does not exist until A01 scaffolds it.
- Case-collision, symlink, and executable-bit behavior still require Linux tests.
- Existing untracked files are not normalized until they are added and checked out through Git attributes.

## Next 3 Steps

1. Execute A01 with a Windows/Linux CI matrix.
2. Add reusable logical-path conversion and validation utilities in A02.
3. Verify `LINUX_GATE_REQUIRED` behavior when the formal Runner is implemented in B07.

## Last Updated

2026-07-14T17:12:05+08:00
