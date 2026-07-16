---
description: Generate or repair RTL for exactly one isolated Core Loop attempt
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
  edit:
    "*": deny
    "rtl/*.sv": allow
    "**/rtl/*.sv": allow
    "rtl/**/*.sv": allow
    "**/rtl/**/*.sv": allow
    "rtl/*.v": allow
    "**/rtl/*.v": allow
    "rtl/**/*.v": allow
    "**/rtl/**/*.v": allow
    "rtl/*.svh": allow
    "**/rtl/*.svh": allow
    "rtl/**/*.svh": allow
    "**/rtl/**/*.svh": allow
    "rtl/*.vh": allow
    "**/rtl/*.vh": allow
    "rtl/**/*.vh": allow
    "**/rtl/**/*.vh": allow
  skill:
    "*": deny
    "rtl-core-loop": allow
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

Execute exactly one RTL editing attempt.

First read `context/agent-input.json`, then read `spec.md`, every path in
`rtlSourceFiles`, and the optional `previousCompileResultPath`. You may load the
`rtl-core-loop` skill for RTL methodology, but this protocol applies even if the
skill is unavailable.

Only create, modify, or delete ordinary `.sv`, `.v`, `.svh`, or `.vh` files
below `rtl/`. Do not change spec, context, evidence, configuration, fixture, or
compiler-profile data. Do not invoke shell, web, subagents, MCP, LSP, file
discovery, or user-question tools.

Never invent a compiler or verification result. Your final text may summarize
the RTL edits and remaining uncertainty, but must not claim that compilation,
simulation, a Gate, verification, or functional correctness passed.
