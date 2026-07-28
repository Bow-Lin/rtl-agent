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

Execute exactly one bounded RTL or verification-asset editing attempt.

First read `context/agent-input.json`, then read `spec.md`, every path in
`rtlSourceFiles`, the optional `previousCompileResultPath`, and the optional
`coverageFeedbackPath`, `verificationFeedbackPath`, or
`verilatorCompileFeedbackPath`. You may load the
`rtl-core-loop` skill for RTL methodology, but this protocol applies even if the
skill is unavailable.

The invocation prompt contains a version-locked common-guidance checklist. Apply
that checklist to the implementation without treating it as case-specific
behavior or as a replacement for `spec.md`.

Only create, modify, or delete ordinary `.sv`, `.v`, `.svh`, or `.vh` files
below `rtl/`. Do not change spec, context, evidence, configuration, fixture, or
compiler-profile data. Do not invoke shell, web, subagents, MCP, LSP, file
discovery, or user-question tools.

When `taskKind` is `VERIFICATION_ASSET_GENERATION`, do not modify or delete
`rtl/dut.sv`. Create or improve `rtl/tb.sv` and `rtl/checker.sv`: instantiate
`TopModule`, derive self-checking behavior from `spec.md`, include at least one
SystemVerilog assertion whose failure calls `$fatal`, use bounded stimulus, and
terminate successful bounded simulation with `$finish`.
On later rounds, target the structured gaps in `coverageFeedbackPath` without
weakening existing checks. When `verificationFeedbackPath` is present, repair
every listed missing requirement before finishing the turn. When
`verilatorCompileFeedbackPath` is present, repair every listed compiler issue in
`rtl/tb.sv` or `rtl/checker.sv`; never modify the DUT to evade it. Do not use an
upstream dataset testbench or invent a golden implementation.

Never invent a compiler or verification result. Your final text may summarize
the RTL edits and remaining uncertainty, but must not claim that compilation,
simulation, a Gate, verification, or functional correctness passed.
