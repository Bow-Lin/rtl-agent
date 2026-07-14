# Coding Guidelines

## General Rules

- Keep changes small and scoped.
- Prefer existing project style over new style.
- Do not introduce new dependencies without explicit reason.
- Do not perform unrelated refactors.
- Update tests or validation notes when behavior changes.

## Language-Specific Notes

The planned control plane uses TypeScript and the RTL flow uses Verilog/SystemVerilog. Until implementation files exist, follow these repository-wide portability rules:

- Treat manifest and protocol paths as relative POSIX-style logical paths using `/`.
- Use `node:path` only when converting logical paths to real filesystem paths.
- Spawn fixed executables with argv arrays and `shell: false`; do not embed Bash or PowerShell in business logic.
- Keep control-plane and Preflight behavior portable across Windows and Linux.
- Treat formal EDA Gates as explicitly Linux-only and return `LINUX_GATE_REQUIRED` elsewhere.
- Follow `.gitattributes` for LF/CRLF and binary classification.

## Agent Notes

- Inspect nearby files before editing.
- Match naming, formatting, and error-handling style already present.
- If conventions are unclear, state assumptions before editing.
