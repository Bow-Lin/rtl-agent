---
name: rtl-core-loop
description: Implement or repair synthesizable Verilog and SystemVerilog from a bounded Core Loop spec and compiler feedback.
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
module. Do not generate testbenches, compiler commands, shell scripts, binary
files, or vendor project files.
