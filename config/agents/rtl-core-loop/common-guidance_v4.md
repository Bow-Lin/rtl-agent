# RTL Generation Common Guidance v4

The specification is the source of truth. Implement the smallest synthesizable design that matches
it. Do not add latency, state, reset behavior, initialization, or defensive behavior unless
required.

## Specification and Interface Contract

- Preserve the exact `TopModule` name, port order, directions, signedness, widths, index ranges, and
  clock/reset edges. Treat the provided module signature as binding unless the specification
  explicitly replaces it.
- Resolve observable input meaning, bit mapping, priority, state, reset, initialization, and cycle
  timing. Implement an explicitly required initial or power-up value even when no reset port
  exists. Otherwise leave startup values, impossible inputs, and explicit don't-care cells
  unspecified; never invent initialization to suppress `X` values or guess hidden behavior.
- Choose direct structure when sufficient. Add an FSM, history register, counter, table, or helper
  only when it clarifies required behavior without changing interface or timing.

## Hard Compile and Driver Rules

- Classify every output before coding. A procedural output must be `logic` (`reg` in Verilog), never
  `wire`; a continuously driven output must not also be assigned procedurally. Give every signal one
  driver.
- Use nonblocking assignments in sequential logic and blocking assignments in combinational logic.
  Give combinational outputs and next-state signals complete assignments, normally with an
  intentional default before conditional overrides.
- Prefer explicitly sized `logic` plus `localparam logic` FSM encodings. If an enum is necessary,
  assign only exact enum literals and avoid expressions requiring an implicit enum cast.
- Keep functions compatible with the locked compiler: use input arguments only and return multiple
  results as one explicitly sized packed value, not function `output` or `inout` arguments.
- Size constants and expressions deliberately. Check signedness, carry width, shift and
  concatenation width, and intentional destination truncation.
- Generate synthesizable design RTL only: no testbench modules, delays, force/release, or
  unsupported tricks. Required power-up state does not permit unrelated simulation-only behavior.

## Sequential Cycle and State Contract

- For every sequential output or pulse, state what edge N samples, whether pre-edge or updated state
  determines the result, and whether it is visible in cycle N or N+1. Inspect the final driver
  against that contract. An N+1 result must come from registered state or equivalent next-cycle
  structure, not combinational dependence on current input.
- Classify state-derived outputs as Moore or Mealy when timing depends on it. A Moore output depends
  only on registered state; a Mealy output may also depend on current inputs. Do not replace a
  required Moore output with a smaller same-cycle Mealy expression.
- Nonblocking-assignment right-hand sides use pre-edge values. Check every register dependency
  against the cycle contract so results are neither early nor delayed.
- Match reset edge, polarity, synchronicity, priority, and values exactly. Reset only specified or
  implied storage; do not use reset to replace a separately required initial state or define
  otherwise unspecified startup behavior.
- Keep FSM state, next-state logic, and outputs consistent. Validate simultaneous inputs, no-event
  behavior, recovery paths, directional events, and absorbing states. A history state must normally
  self-loop when no semantic event occurs. Verify one-hot equations against the final transition
  table.
- Do not merge distinct inputs unless their effects match in every affected state. For edge
  detection, identify the history sample, transition, pulse cycle, and specified reset effect.
- Define whether a stored count means completed cycles, cycles including the current edge, or the
  next index. Verify initial/reset value, enable/hold, rollover/saturation, entry-cycle treatment,
  and threshold-1, threshold, and threshold+1.

## Combinational Logic and Bit Mapping

- Preserve bit meaning, not only width. Map old bits to new bits before selecting shifts,
  part-selects, or concatenations. Check order, index bases, bounds, one-hot encodings, and every
  referenced input bit.
- For a truth table or Karnaugh map, use a direct `case` when simplification is uncertain. Map
  Gray-code labels to binary input indices, then replay final RTL against every specified cell.
  Exclude don't-care cells unless the specification assigns them behavior.
- Preserve priority and complete no-match behavior. Plans, tables, and comments are not proof; final
  RTL must match every transition, output, hold, and truth-table rule.

## Verification Asset Mode

- For `VERIFICATION_ASSET_GENERATION`, keep `rtl/dut.sv` unchanged. Put module `tb` in `rtl/tb.sv`
  and `tb_checker` in `rtl/checker.sv`; do not textually include either file.
- Derive expected behavior only from `spec.md`, instantiate `TopModule`, include a meaningful check,
  use `$fatal` for failure, bound loops, and call `$finish` only on success.
- Repair listed verification compile issues without changing the DUT or weakening checks.

## Safety

- Never emit `$system`, file I/O, VPI/DPI loading, external calls, or filesystem/network side
  effects. Do not read or create references, waveforms, scripts, or files outside `rtl/`.
- Do not claim compilation or functional verification; the external evaluator performs them.

## Final Self-Check

Inspect final RTL, not just the plan. Recheck the exact interface, drivers, compiler-safe helpers,
state encoding, Moore/Mealy and cycle contracts, required versus invented initialization, history
hold, truth-table replay, bit mapping, widths, counter boundaries, assignments, and synthesis.
