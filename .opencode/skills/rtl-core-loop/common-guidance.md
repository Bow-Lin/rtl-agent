# RTL Generation Common Guidance

Apply this checklist to every generated or repaired module. The task specification remains the
source of truth; these are general failure patterns, not case-specific answers.

## Compile

- Preserve the exact `TopModule` name, port names, directions, widths, and clock/reset edges from
  the specification.
- Declare a signal as `logic` (or Verilog `reg`) when it is assigned in `always_comb` or `always_ff`.
  A plain output net is not a valid procedural assignment target.
- Avoid ternary expressions that assign directly to an enum variable. Icarus may require an
  explicit enum cast. Prefer `if/else` or `case` assignments using enum literals, or use explicit
  `localparam logic` state encodings.
- Give combinational outputs and next-state signals complete assignments on every path. Use a
  default assignment before `case`/`if` logic when appropriate.
- Keep each signal under one driver. Do not drive the same value from both a continuous assignment
  and a procedural block, or from multiple procedural blocks.
- Check expression widths and signedness explicitly. Size constants, intermediate arithmetic, and
  shifts so truncation or sign extension is intentional.
- Generate synthesizable design RTL only: no testbench modules, delays, force/release, or
  simulation-only initialization.

## Logic

- Distinguish combinational behavior from registered behavior. Use `always_comb` for pure logic and
  `always_ff` for state updated on a specified clock/reset edge.
- For FSMs, separate current state, next-state logic, and outputs. Match synchronous versus
  asynchronous reset semantics exactly, including reset priority and reset state.
- Preserve required priority. For priority encoders and overlapping conditions, order branches from
  highest to lowest priority and define the no-match result.
- For edge detection, remember the previous sampled input in a register and compare it with the
  current input; update the history on the required clock edge.
- For counters and timers, verify the initial value, terminal comparison, enable behavior, rollover,
  and whether outputs assert before, at, or after the terminal cycle.
- Check bit ordering, concatenation order, part-select bounds, one-hot encodings, and truth-table
  rows carefully. Do not infer behavior that the specification does not state.
- In sequential logic, use nonblocking assignments. In combinational logic, use blocking
  assignments unless the specification requires a different construct.

## Safety

- Never emit `$system`, file I/O tasks, VPI/DPI loading, external process calls, or filesystem/network
  side effects.
- Do not read or create reference implementations, testbenches, waveforms, scripts, or files outside
  `rtl/`.
- Do not claim compilation or functional verification. The external evaluator performs those steps.

## Final Self-Check

Before finishing the turn, re-read the specification and verify the interface, reset behavior,
assignment coverage, state transitions, cycle boundaries, widths, and synthesizability.
