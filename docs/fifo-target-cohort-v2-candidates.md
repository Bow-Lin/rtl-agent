# New FIFO cohort: eligibility and public candidate review

Origin: academic-research-suite / experiment preparation. Date: 2026-09-19.
Version: draft-1. Status: public-asset pre-review only; no cohort or revision is frozen.

The family choice was asked asynchronously. This document prepares the same-family FIFO option;
it does not assign UART/AES roles or authorize the formal 27-draw pilot. No mutation contents,
mutation outcomes or Memory-winning target criteria are used in this candidate review.

## Eligibility before generation

- Three separately developed FIFO implementations, excluding all four original sources
  (versatile_fifo, ethmac/eth_fifo, ZipCPU/wbuart32/ufifo, openHMC) and two previous targets
  (dpretet/async_fifo and alexforencich/verilog-axis/axis_fifo), their copies and functional
  derivatives. Different parameters or wrapper names are not independent implementations.
- Obtain original public RTL, dependency closure, declared license, exact commit and file hashes.
  Authorship is a clue, not proof of independence. Review functional code and history; separately
  record shared infrastructure, standard algorithms and assertion macros.
- Fixed width8 and public end-to-end capacity8, one DUT, supported healthy configuration. Prefer
  a cohort containing both single-clock and dual-clock behavior and differing public interfaces.
  Do not alter a DUT to make it meet these criteria. Record exclusion reasons before outcome data.
- Derive legal transactions, expected data/flags, latency, reset and clear behavior from public
  authority. Do not promise behavior for inputs the upstream contract forbids. Hold configuration,
  sources, simulator macros, synchronizer model and stimulus seeds fixed across N/G/M.
- Golden health and bounded seed TB/checker must pass before inclusion. Test compile/assertion
  activation and actual check execution separately: presence of upstream assertion macros is not
  execution evidence. Use the same preparation standards for every candidate, without selecting
  on source-strategy applicability or hidden mutant detectability.

## Candidates requiring further preparation

| Candidate | Proposed fixed configuration | Public evidence and outstanding work |
| --- | --- | --- |
| PULP common_cells `cc_fifo` | DataWidth8, Depth8, FallThrough0 | [Official RTL](https://raw.githubusercontent.com/pulp-platform/common_cells/master/src/cc_fifo.sv) declares SHL-0.51; synchronous push/pop with reset and clear/flush. Resolve `cc_pkg.sv`, `assertions.svh`, `registers.svh` and included deprecated register macros. Upstream assertions prohibit full push / empty pop: do not turn implementation gating into a permissive public contract. |
| OpenTitan `prim_fifo_async` | Width8, Depth8; explicitly freeze output-zero parameters | [Official RTL](https://raw.githubusercontent.com/lowRISC/opentitan/master/hw/ip/prim/rtl/prim_fifo_async.sv) declares Apache-2.0; dual-clock ready/valid. Resolve generic two-flop/flop implementations and assertion include chain. Define public dual-domain reset requirements; synchronized per-domain depth is not instantaneous global occupancy. Freeze `SIMULATION`/CDC-random-delay choices. |
| NyuziProcessor `sync_fifo` | WIDTH8, SIZE8; explicit almost thresholds; ordinary RTL memory branch | [Official RTL](https://raw.githubusercontent.com/jbush001/NyuziProcessor/master/hardware/core/sync_fifo.sv) declares Apache-2.0; enqueue/dequeue, reset and flush. Resolve `defines.svh` and `config.svh`; preserve restrictions on enqueue at full even with simultaneous dequeue. No `VENDOR_ALTERA` or `MEMORY_COMPILER` branch substitution. |

These are candidates, not selected or validated targets. Exact revisions, license/lineage audit,
dependency closure, public contracts, golden preparation and native-loop integration remain open.
PULP assertion infrastructure acknowledges lowRISC origin; this must be disclosed separately from
functional FIFO code independence. The old `fifo_v3` name is a compatibility wrapper around the
new `cc_fifo` and cannot supply another target.

PULP [`cc_cdc_fifo_gray`](https://raw.githubusercontent.com/pulp-platform/common_cells/master/src/cc_cdc_fifo_gray.sv)
was considered but is deferred under the capacity8 criterion: the LogDepth3 main array feeds an
additional A/B spill buffer. Static inspection suggests total capacity10, not8. This inference has
not been tested and must not be silently ignored. OpenTitan
[`prim_fifo_sync`](https://raw.githubusercontent.com/lowRISC/opentitan/master/hw/ip/prim/rtl/prim_fifo_sync.sv)
is a possible synchronous reserve, but selecting it instead of async would lose the dual-clock
stratum and requires a prospective design decision.

OpenTitan's current [`prim_assert.sv`](https://raw.githubusercontent.com/lowRISC/opentitan/master/hw/ip/prim/rtl/prim_assert.sv)
uses empty assertion macros under `VERILATOR`; those macros must not be counted as active checks.
The new native compiler profile still needs explicit assertion-enable and generated-check smoke
evidence before the target workflow is frozen.
