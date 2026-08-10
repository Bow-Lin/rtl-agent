# RTL Generation Common Guidance v3

The task specification is the source of truth. Implement the smallest synthesizable design that
matches it. Do not add latency, pipeline stages, state, reset behavior, initialization, or
defensive protocol behavior unless required.

## Specification and Interface Contract

- Preserve the exact `TopModule` name, port order, directions, signedness, widths, declared index
  ranges, and clock/reset edges. Treat the provided module signature as binding; do not revise it
  from prose unless the specification explicitly replaces the declaration.
- Resolve facts that affect observable behavior: input meaning, bit mapping, priority, state, reset,
  and cycle timing. Leave unspecified startup values, impossible inputs, and explicit don't-care
  cells unspecified; do not guess hidden reference behavior.
- Choose direct structure when it is sufficient. Use an FSM, history register, counter, or table
  only when the specified behavior actually requires one.

## Hard Compile and Driver Rules

- Classify every output before coding. An output assigned in `always_comb` or `always_ff` must be
  `logic` (`reg` in Verilog), never `wire`. An output driven by `assign` must not also be assigned
  procedurally. Give every signal exactly one driver.
- Use nonblocking assignments in sequential logic and blocking assignments in combinational logic.
  Give combinational outputs and next-state signals complete assignments, normally with an
  intentional default before conditional or `case` overrides.
- For FSM state, prefer explicitly sized `logic` plus `localparam logic` encodings. If an enum is
  necessary, assign only exact enum literals; avoid ternary, arithmetic, logic-vector, or mixed-type
  expressions whose result requires an implicit enum cast.
- Size constants and intermediate expressions deliberately. Check signedness, arithmetic carry
  width, shift result width, concatenation width, and intentional truncation at the destination.
- Generate synthesizable design RTL only in normal RTL mode: no testbench modules, delays,
  force/release, simulation-only initialization, or unsupported language tricks.

## Sequential Cycle and State Contract

- For every sequential output or pulse, write a one-sentence cycle contract: the event sampled at
  edge N, whether pre-edge or updated state determines the result, and whether it is visible in
  cycle N or N+1. Do not assert in the sampling state when behavior is required after acceptance or
  after entering a later phase.
- Remember that right-hand sides in a nonblocking-assignment block use pre-edge values. Check each
  register dependency against the cycle contract so results are neither early nor delayed.
- Match reset edge, polarity, synchronicity, priority, and values exactly. Reset only the storage
  named or implied by the specification; never add a reset or initialization merely to suppress
  unspecified `X` values.
- Keep FSM state, next-state logic, and outputs consistent. Validate simultaneous inputs, no-event
  behavior, recovery paths, directional events, and absorbing states. A state representing history
  must normally self-loop when no semantic event occurs; do not reconstruct it only from the
  current input band.
- Do not merge distinct inputs into a generic toggle or combined condition unless their effects are
  identical in every affected state. For edge detection, explicitly identify the history sample,
  detected transition, pulse cycle, and any specified reset effect on history.
- Define what each stored count means: completed cycles before the edge, cycles including the edge,
  or the next index. Verify reset/initial value, enable/hold, rollover or saturation, entry-cycle
  treatment, and behavior at threshold-1, threshold, and threshold+1.

## Combinational Logic and Bit Mapping

- Preserve bit meaning, not only vector width. Map old bits to new bits before selecting `<<`, `>>`,
  part-selects, or concatenations. Check order, declared index bases, bounds, one-hot encodings, and
  every referenced input bit.
- For a truth table or Karnaugh map, use a direct `case` when simplification is uncertain. If labels
  such as Gray-code row or column order are given, map each label to its binary input index before
  coding. Replay the final RTL or expression against every specified cell; exclude don't-care cells
  unless the specification assigns them behavior.
- Preserve specified priority and define complete no-match behavior for muxes, encoders, `case`
  statements, and overlapping conditions. Analysis notes, tables, and comments are not proof: the
  final executable RTL must still match every transition, output, hold, and truth-table rule.

## Verification Asset Mode

- When `taskKind` is `VERIFICATION_ASSET_GENERATION`, keep `rtl/dut.sv` byte-for-byte unchanged.
  Put module `tb` in `rtl/tb.sv` and module `tb_checker` in `rtl/checker.sv`; do not textually include
  either file from another source file.
- Derive expected behavior only from `spec.md`, instantiate `TopModule`, include a meaningful check,
  terminate failures with `$fatal`, bound all loops, and call `$finish` only on a successful path.
- Repair listed verification compile issues without changing the DUT or weakening checks.

## Safety

- Never emit `$system`, file I/O tasks, VPI/DPI loading, external process calls, or filesystem or
  network side effects.
- Do not read or create reference implementations, waveforms, scripts, or files outside `rtl/`.
- Do not claim compilation or functional verification; the external evaluator performs them.

## Final Self-Check

Re-read the specification and inspect the final RTL, not just the plan. Check the exact interface,
driver legality, state encoding, cycle contract, reset scope, state-history hold behavior, truth
table replay, bit mapping, expression widths, counter boundaries, complete assignments, and
synthesizability.
