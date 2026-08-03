# RTL Generation Common Guidance v1

Apply this checklist to every generated or repaired module. The task specification remains the
source of truth. This guide contains reusable RTL methods derived from recurring failure patterns;
it does not contain case-specific answers or hidden verification behavior.

## Before Coding

- Copy the complete interface into a port ledger before writing logic: module name, port name,
  direction, signedness, width, and exact declared index range. Preserve unusual ranges such as
  `[N:1]`; if a range is intentionally changed, update every dependent bit-select consistently.
- Classify each output as combinational, registered, Moore-state-derived, or Mealy
  state-and-input-derived. Do not start coding until phrases such as "in the same cycle", "after
  the edge", and "in the following cycle" have an explicit meaning.
- For sequential behavior, sketch a short cycle table with the input/current state before the
  active edge, values sampled at the edge, next state after the edge, and the cycle in which each
  output must be visible.
- For an FSM, derive a current-state/input/next-state/output table first. Keep directional inputs as
  directional actions unless the specification explicitly defines them as a generic toggle.
- Inventory every register, history bit, counter, table entry, and state variable. Record its exact
  reset or initial value, update condition, hold behavior, and update priority. Do not assume that a
  multi-bit state or saturating counter resets to all zeros.
- For a truth table or Karnaugh map, transcribe every specified cell in the stated row/column and
  Gray-code order before simplifying it. Check the final expression against every specified row and
  keep don't-care or invalid inputs separate from required behavior.

## Compile

- Preserve the exact `TopModule` name, port names, directions, widths, index ranges, and clock/reset
  edges from the specification.
- Declare a signal as `logic` (or Verilog `reg`) when it is assigned in `always_comb` or
  `always_ff`. A plain output net is not a valid procedural assignment target.
- Avoid ternary expressions that assign directly to an enum variable. Icarus may require an
  explicit enum cast. Prefer `if/else` or `case` assignments using enum literals, or use explicit
  `localparam logic` state encodings.
- Give combinational outputs and next-state signals complete assignments on every path. Use a
  default assignment before `case`/`if` logic when appropriate.
- Keep each signal under one driver. Do not drive the same value from both a continuous assignment
  and a procedural block, or from multiple procedural blocks.
- Check the width and signedness of every port, intermediate, concatenation, arithmetic result, and
  shift. The destination width must accommodate the complete expression unless truncation is
  explicitly intended; size constants and extensions deliberately.
- In normal RTL mode, generate synthesizable design RTL only: no testbench modules, delays,
  force/release, or simulation-only initialization.

## Verification Asset Mode

- When `taskKind` is `VERIFICATION_ASSET_GENERATION`, keep `rtl/dut.sv` byte-for-byte unchanged.
- Put the top-level testbench in `rtl/tb.sv` with module name `tb`, and checker/assertions in
  `rtl/checker.sv`. Name the checker module `tb_checker` because `checker` is a SystemVerilog
  keyword. Do not use `checker` as an instance name either; prefer `u_checker`. Do not include
  either file textually from another source file.
- Instantiate `TopModule`, derive expected behavior from `spec.md`, make failures terminate the
  simulation with `$fatal`, include at least one meaningful assertion, bound all loops, and call
  `$finish` only on the successful bounded path.
- If verification-asset feedback is present, repair every listed missing requirement before
  finishing the turn.
- If Verilator compile feedback is present, repair every listed issue in the generated TB/checker
  without modifying the DUT or weakening checks.
- If coverage feedback is present, preserve existing checks and add focused stimulus for listed
  uncovered DUT lines or branches.

## Sequential Timing and State

- Distinguish combinational behavior from registered behavior. Use `always_comb` for pure logic and
  `always_ff` for state updated on a specified clock/reset edge.
- Decide explicitly whether a pulse or result belongs to the sampling cycle or the following cycle.
  If the specification says an output occurs after an event is sampled, do not replace the required
  registered delay with a combinational expression of the current input.
- Remember that every right-hand side in one nonblocking-assignment block reads pre-edge values.
  When one register depends on another, confirm whether the required result uses the old value or
  the value being captured at the same edge.
- For FSMs, separate current state, next-state logic, and outputs. A Moore output depends only on
  registered state; a Mealy output may also depend on current inputs. Do not implement a required
  Moore machine as a smaller Mealy machine merely because its Boolean behavior looks similar.
- Match synchronous versus asynchronous reset semantics exactly, including edge, polarity,
  priority, state, and every nonzero encoded reset value. If the specification defines no reset or
  power-on value, do not invent one merely to hide four-state `X` behavior.
- Verify every FSM transition row, including simultaneous inputs, no-input behavior, directional
  events, recovery states, and absorbing terminal states. Do not collapse different input meanings
  into `a || b` unless all affected current states truly have the same transition.
- For edge detection, remember the previous sampled input in a register and compare it with the
  current input. Separately decide whether the pulse is visible in the detection cycle or one
  registered cycle later.
- For counters and timers, define whether the entry cycle counts as cycle 0 or cycle 1. Check the
  values immediately below, at, and above every threshold, plus enable, hold, rollover, landing, and
  terminal behavior.
- Preserve required priority. For priority encoders and overlapping sequential conditions, order
  branches from highest to lowest priority and define the no-match result.
- In sequential logic, use nonblocking assignments. In combinational logic, use blocking
  assignments unless the specification requires a different construct.

## Combinational Logic and Bit Mapping

- Check bit ordering, concatenation order, part-select bounds, one-hot encodings, and truth-table
  rows carefully. Confirm that every referenced bit exists in the declared range and that no input
  bit is accidentally omitted.
- Re-evaluate a simplified Boolean expression against the original truth table or Karnaugh map,
  including cells eliminated during grouping. Comments must be checked against the source table;
  do not trust a copied or simplified comment as evidence.
- Preserve required priority and define complete no-match behavior for muxes, encoders, `case`
  statements, and overlapping conditions.
- Treat explicitly declared don't-care or impossible inputs as outside the required equivalence
  set. Implement deterministic safe behavior where appropriate, but do not infer a hidden reference
  choice or let those inputs change the logic required for specified cases.

## Safety

- Never emit `$system`, file I/O tasks, VPI/DPI loading, external process calls, or
  filesystem/network side effects.
- Do not read or create reference implementations, waveforms, scripts, or files outside `rtl/`.
- Do not claim compilation or functional verification. The external evaluator performs those
  steps.

## Final Self-Check

Before finishing the turn:

1. Re-read the specification and compare every port against the port ledger.
2. Recheck expression widths, vector index bases, bit ordering, and all specified truth-table rows.
3. Walk at least one reset/startup trace and one normal trace through the cycle table.
4. Exercise every FSM transition class and the boundary values around every counter threshold.
5. Confirm assignment coverage, update priority, hold behavior, and synthesizability.
