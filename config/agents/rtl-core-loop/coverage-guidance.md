# RTL Verification Coverage Improvement Guidance v1

This task starts from an existing DUT and existing verification assets. Improve DUT coverage with
the smallest focused change to the mutable testbench or checker files. Do not regenerate the DUT or
replace the verification environment from scratch.

## Start From Runtime Feedback

- Read `context/agent-input.json`, then read exactly the one feedback file named by
  `coverageFeedbackPath`, `verificationFeedbackPath`, or `verilatorCompileFeedbackPath`.
- Treat coverage targets as observations, not as a requirement to cover every listed line in one
  turn. Select one coherent behavior cluster that can be reached with focused stimulus.
- Read the existing mutable verification files before inspecting protected RTL. Inspect only the
  smallest DUT region needed to understand the selected target; do not exhaustively reread every
  protected source file.
- Make a concrete verification-asset edit once the selected behavior and interface are understood.
  Spend the bounded turn implementing and checking that edit, not cataloging all remaining targets.

## Preserve the Baseline

- Keep every `protectedRtlPaths` file byte-for-byte unchanged. Only write files listed in
  `mutableRtlPaths`.
- Extend the existing testbench and checker. Preserve working clocks, resets, bus models, protocol
  wiring, termination, and regression scenarios unless structured feedback identifies a defect.
- Do not weaken, delete, bypass, or make existing assertions unreachable to obtain coverage.
- A checker change is appropriate only when it adds a valid assertion or repairs a reported
  checker/compile issue. Pure stimulus coverage improvements should normally change only the
  testbench.

## Add Reachable, Bounded Stimulus

- Drive behavior through public DUT interfaces and the existing verification models. Do not use
  hierarchical force, internal signal pokes, or implementation-specific backdoors.
- For protocol or bus designs, add a short valid transaction sequence for the chosen behavior,
  including required setup, handshakes, waits, and bounded timeouts.
- Prefer one new scenario with clear intent over broad random activity. Keep all loops and waits
  bounded, and ensure both success and failure paths terminate.
- Respect cycle timing and nonblocking assignment semantics. Sample responses only when the
  interface contract makes them valid.

## Checker and Safety Rules

- Keep module `tb` in `rtl/tb.sv` and checker/assertions in `rtl/checker.sv` when those are the
  mutable assets. Use checker module name `tb_checker` and a non-keyword instance name such as
  `u_checker`.
- Preserve at least one meaningful assertion and use `$fatal` for assertion failures. Call
  `$finish` only after the bounded successful path.
- Never emit `$system`, file I/O tasks, VPI/DPI loading, external process calls, or filesystem and
  network side effects.
- Do not claim compilation, regression success, or coverage gain. The external Verilator runner
  measures the resulting assets.

## Final Self-Check

Before finishing, confirm that protected RTL is untouched, existing checks remain effective, the
new stimulus reaches the selected behavior through legal interfaces, waits are bounded, checker
timing is valid, and the edit is smaller than rebuilding the verification environment.
