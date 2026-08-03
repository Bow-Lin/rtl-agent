# RTL Generation Common Guidance v2

Apply these rules to every generated or repaired module. The task specification is the source of
truth. Prefer the smallest synthesizable implementation that matches the stated behavior; do not
add latency, pipeline stages, state, reset behavior, or defensive protocol behavior unless the
specification requires it.

## Interpret Only What Matters

- Preserve the exact `TopModule` name, ports, directions, signedness, widths, declared index ranges,
  and clock/reset edges. Pay special attention to nonzero-based ranges such as `[N:1]`.
- Before coding sequential logic, resolve only the timing facts needed by the design: what is
  sampled at the active edge, which pre-edge values are used, and when each output becomes visible.
  Use a short cycle sketch when the wording is ambiguous; do not invent an extra registered delay.
- Classify state-derived outputs as Moore or Mealy when that distinction affects timing. A Moore
  output depends only on registered state; a Mealy output may also depend on current inputs.
- Treat unspecified startup values, impossible inputs, and explicit don't-care cases as
  unspecified. Do not add initialization or guess a hidden reference choice to make them
  deterministic unless the specification asks for it.
- Derive only the structure the specification needs. Use a table or ledger for a genuinely complex
  interface, FSM, truth table, or counter, but do not expand a simple assignment into a large design
  process.

## Compile-Safe RTL

- Use `logic` for signals assigned by `always_comb` or `always_ff`, give every signal one driver,
  and use nonblocking assignments in sequential logic and blocking assignments in combinational
  logic.
- For FSM state storage, prefer explicitly sized `logic` plus `localparam logic` state encodings.
  This avoids Icarus enum-cast failures. If an enum is necessary, assign only exact enum literals;
  do not assign ternary, arithmetic, plain logic-vector, or mixed-type expressions to it.
- Give combinational outputs and next-state values complete assignments. Set an intentional default
  before `case` or conditional logic, then override it on covered paths.
- Size constants and intermediate expressions deliberately. Check signedness, concatenation width,
  arithmetic carry width, shift result width, and intentional truncation at the destination.
- Generate synthesizable design RTL only in normal RTL mode: no testbench modules, delays,
  force/release, simulation-only initialization, or unsupported language tricks.

## Sequential Logic and FSMs

- Match reset edge, polarity, synchronicity, priority, and reset values exactly. Reset only the
  storage named or implied by the specified behavior; do not clear history or add a reset to hide
  `X` values when startup behavior is unspecified.
- Remember that right-hand sides in one nonblocking-assignment block use pre-edge values. Check
  dependencies between registers explicitly so a result is neither one cycle early nor one cycle
  late.
- Keep FSM state storage, next-state logic, and outputs consistent. For a complex FSM, compare the
  final RTL against every transition row, including simultaneous inputs, no-input behavior,
  recovery paths, directional events, and absorbing states.
- Do not collapse semantically different inputs into a generic toggle or `a || b` unless their
  effect is identical in every affected state.
- When implementing one-hot next-state equations, verify each equation against the transition table
  after simplification. A correct table does not compensate for an inconsistent Boolean equation.
- For edge detection, define which sampled value is history, which transition is detected, when the
  pulse is visible, and whether reset is allowed to alter that history.
- For counters and timers, check the initial or reset value, enable/hold behavior, rollover or
  saturation, and values immediately below, at, and above each threshold. Confirm whether the entry
  cycle is counted and whether an output asserts before, at, or after the terminal edge.

## Combinational Logic and Bit Mapping

- Preserve bit meaning, not just vector width. For shifts and serial data, write down which old bit
  moves to which destination bit and where the new bit enters before choosing `<<`, `>>`, or a
  concatenation.
- Check concatenation order, part-select bounds, declared index bases, one-hot encodings, and every
  referenced input bit. Do not silently omit or duplicate a bit.
- For a truth table or Karnaugh map, prefer a direct `case` implementation when simplification is
  uncertain. If you simplify, evaluate the final expression against every specified cell and the
  stated row/column ordering; do not rely on comments or visual grouping alone.
- Preserve specified priority and define complete no-match behavior for muxes, encoders, `case`
  statements, and overlapping conditions.

## Verification Asset Mode

- When `taskKind` is `VERIFICATION_ASSET_GENERATION`, keep `rtl/dut.sv` byte-for-byte unchanged.
- Put module `tb` in `rtl/tb.sv` and checker/assertions in `rtl/checker.sv`. Use module name
  `tb_checker` and an instance name such as `u_checker`; `checker` is a SystemVerilog keyword. Do
  not textually include either file from another source file.
- Instantiate `TopModule`, derive expected behavior only from `spec.md`, include at least one
  meaningful assertion, terminate failures with `$fatal`, bound all loops, and call `$finish` only
  on the successful bounded path.
- Repair every listed verification-asset or Verilator compile issue without modifying the DUT or
  weakening checks. For coverage feedback, preserve existing checks and add only focused stimulus
  for the listed uncovered DUT behavior.

## Safety

- Never emit `$system`, file I/O tasks, VPI/DPI loading, external process calls, or
  filesystem/network side effects.
- Do not read or create reference implementations, waveforms, scripts, or files outside `rtl/`.
- Do not claim compilation or functional verification. The external evaluator performs those
  steps.

## Final Self-Check

Before finishing, re-read the specification and check the exact interface, compile-safe state
encoding, cycle alignment, reset scope, transition/equation consistency, bit mapping, expression
widths, counter boundaries, complete assignments, single-driver discipline, and synthesizability.
