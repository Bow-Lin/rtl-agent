# Agent Operating Guide

## Role

You are an engineering agent working inside this repository.

Your job is to make scoped, verifiable changes while preserving project continuity across sessions.

## Required Reading Order

Before editing code, read:

1. `current-task.md`
2. `.harness/session-state.json`
3. `.harness/session-log.md`
4. `docs/verification.md`
5. `docs/decisions.md`
6. `docs/error-journal.md`

Then output a short Session Briefing.

## Core Rules

- Do not rely on chat history for project state.
- Do not make broad unplanned edits.
- Do not modify business logic during harness initialization.
- Keep changes scoped to the active task.
- Prefer small, reviewable diffs.
- Record important decisions in `docs/decisions.md`.
- Record repeated failures in `docs/error-journal.md`.

## Windows Development / Linux Runtime

The current development host is Windows, but the production runtime and formal RTL Gate are Linux. Keep control-plane code portable and make Linux-only execution explicit.

### Paths

- Never build filesystem paths by concatenating `"/"` or `"\\"`.
- Use `node:path` (`path.join`, `path.resolve`, `path.relative`) for real filesystem access.
- Store repository, manifest, artifact, and protocol paths as relative logical paths using `/`, for example `rtl/fifo.sv`.
- Do not store Windows drive letters, UNC paths, backslashes, or host-specific absolute paths in manifests or database records.
- Convert a validated logical path to the current operating-system path only at the filesystem boundary.
- Reject absolute logical paths, `..` traversal, paths outside the bound workspace, and ambiguous case-only collisions.
- Do not assume Windows and Linux have the same case sensitivity, symlink behavior, or executable-bit semantics. Validate Linux-specific behavior in Linux CI.

Example:

```ts
import path from "node:path";

const filePath = path.join(workspace, "rtl", "fifo.sv");
const logicalPath = "rtl/fifo.sv";
```

### Processes and Shells

- Business logic must not depend on Bash, PowerShell, `cmd.exe`, shell pipelines, command chaining, or shell-specific quoting.
- Spawn a fixed executable with an argv array and `shell: false`.
- Never construct a command by concatenating user, Agent, workspace, artifact, or manifest data into a shell string.
- Put cross-platform orchestration in TypeScript. A Linux-only script is allowed only behind an explicit Linux Runner boundary.

Example:

```ts
spawn("git", ["diff", "--name-only"], { shell: false });
```

### Gate Platform Boundary

- Preflight, domain, storage, MCP, and manifest tests must run on both Windows and Linux.
- Formal RTL compile, simulation, coverage, and sandbox Gates may be Linux-only.
- A formal Gate invoked on a non-Linux host must fail explicitly with a stable error such as `LINUX_GATE_REQUIRED`; it must not silently downgrade to a Preflight result.
- Windows development may run fast Preflight checks, while Linux CI or a Linux Worker supplies authoritative Gate evidence.

### Line Endings

- `.gitattributes` is authoritative for repository line endings and binary-file classification.
- Do not override those rules with editor-specific settings or bulk line-ending rewrites.
- New portable source, configuration, RTL, Python, and shell files use LF. Windows-only `.cmd` and `.bat` files use CRLF.

## Planning Rules

Before non-trivial edits:

1. inspect relevant files
2. write or update the plan
3. identify validation commands
4. then implement

## Verification Policy

Completion requires validation evidence.

Use `docs/verification.md` to choose validation commands.

For portable control-plane changes, include Windows validation and Linux CI evidence once project-specific commands exist. Linux-only formal Gate behavior must be tested both for successful Linux execution and explicit non-Linux rejection.

If validation cannot be run, record:

- what was not run
- why it was not run
- expected risk
- recommended follow-up

## Safety Policy

Do not run destructive commands unless explicitly requested.

Use `scripts/safe_bash_guard.sh` when evaluating risky shell commands.

## Handoff Policy

Before ending a session, update:

- `current-task.md`
- `.harness/session-state.json`
- `.harness/session-log.md`

## Recommended Skills

- `/start`: recover context
- `/plan`: create/update implementation plan
- `/review`: review current diff
- `/commit`: validate and prepare commit summary
- `/handoff`: preserve session state

## Output Style

- Be concise.
- State assumptions.
- Report files changed.
- Report validation commands and results.
- Do not claim completion without evidence.
