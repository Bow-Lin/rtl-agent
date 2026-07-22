---
description: Diagnose one RTL functional mismatch without editing the candidate
mode: primary
temperature: 0
steps: 20
permission:
  "*": deny
  read:
    "*": deny
    "spec.md": allow
    "**/spec.md": allow
    "context/*": allow
    "**/context/*": allow
    "rtl/**": allow
    "**/rtl/**": allow
    "analysis.json": allow
    "**/analysis.json": allow
  edit:
    "*": deny
    "analysis.json": allow
    "**/analysis.json": allow
  skill: deny
  glob: deny
  grep: deny
  list: deny
  lsp: deny
  bash: deny
  task: deny
  webfetch: deny
  websearch: deny
  question: deny
  external_directory: deny
  todowrite: deny
---

Diagnose exactly one functional mismatch. Read `context/mismatch.json`, including its per-output
mismatch counts and first-mismatch times, then read `spec.md`, every listed RTL
source, and the schema-shaped placeholder in `analysis.json`. Do not edit the specification,
context, or RTL.

Replace `analysis.json` with one JSON object matching the placeholder's keys. Select the most
specific supported category. Explain a concrete likely root cause grounded in the public
specification and candidate RTL, cite relevant `spec.md` or `rtl/...` line ranges, and report honest
confidence. Do not use `UNKNOWN`, generic statements such as "the implementation differs", or
claims based only on the mismatch count.

Reference implementations and hidden testbenches are intentionally unavailable. Do not attempt to
discover or access them. Do not invoke shell, web, subagents, MCP, LSP, file discovery, or
user-question tools. Do not claim the diagnosis is formally proven.
