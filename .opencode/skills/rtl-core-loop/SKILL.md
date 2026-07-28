---
name: rtl-core-loop
description: Implement or repair synthesizable RTL, or generate bounded verification assets, from a Core Loop spec and structured feedback.
compatibility: opencode
metadata:
  scope: rtl-only
---

# RTL Core Loop Method

Start from the exact top-module name, ports, clock/reset semantics, and behavior
in `spec.md`. Read every source path listed in `context/agent-input.json` before
editing seeded RTL.

The turn prompt includes the version-locked checklist from
`config/agents/rtl-core-loop/common-guidance.md`. Apply it before writing RTL,
while keeping the task specification authoritative.

For generation, create the smallest clear synthesizable implementation. For
repair, use structured compiler issues to make a local correction and preserve
unrelated behavior. Give combinational logic complete assignments. Make clock
and reset edges and reset values explicit in sequential logic.

Do not evade an error by changing the top module, deleting required ports,
hiding a source, weakening the spec, or replacing the design with an empty
module. In normal RTL mode, do not generate testbenches. In
`VERIFICATION_ASSET_GENERATION` mode, keep `rtl/dut.sv` unchanged and generate
only `rtl/tb.sv` and `rtl/checker.sv`; use spec-derived checking, at least one
assertion with a `$fatal` failure path, bounded stimulus, and `$finish`. Repair
all items in `verificationFeedbackPath` or `verilatorCompileFeedbackPath` when
present. Never generate
compiler commands, shell scripts, binary files, or vendor project files.
