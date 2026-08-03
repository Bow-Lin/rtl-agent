# I2C Baseline Coverage Agent Experiment

The FreeCores I2C flow is intentionally separate from the single-case VerilogEval coverage flow.
Run it with:

```powershell
corepack pnpm core-loop:i2c-coverage --agent pi
```

Use `--agent opencode` to select OpenCode. The existing
`corepack pnpm core-loop:coverage --case <id>` command is unchanged.

## Baseline input

By default, the command reads the existing source tree below `.rtl-agent/datasets/freecores-i2c/`
and consumes these exact locked files:

- `rtl/verilog/i2c_master_bit_ctrl.v`
- `rtl/verilog/i2c_master_byte_ctrl.v`
- `rtl/verilog/i2c_master_defines.v`
- `rtl/verilog/i2c_master_top.v`
- `bench/verilog/i2c_slave_model.v`
- `bench/verilog/tst_bench_top.v`
- `bench/verilog/wb_master_model.v`

Set `RTL_AGENT_I2C_BASELINE_ROOT` to override that root. The Provider checks byte lengths and
SHA-256 digests for all seven consumed files; unrelated files in the source tree are ignored. It
then normalizes the legacy source
into a portable logical-path workspace, renames the DUT top to `TopModule`, and adapts the legacy
open-drain bus model for the locked Verilator runner.

## Bounded flow

Round one always compiles, simulates, and measures the unchanged normalized baseline before any
Agent turn. If the score is below 90%, structured uncovered line/branch/toggle feedback is written
to `workspace/context/coverage-round-1.json`. The Agent may then take at most two turns. Only
`rtl/tb.sv` and `rtl/checker.sv` are mutable; all DUT and helper-model files are protected both by
the Agent input contract and by a post-turn digest comparison.

The run stops at 90%, no uncovered targets, less than 0.5 percentage-point gain, two successful
coverage rounds after the baseline, exhausted Agent turns, or any policy/tool failure. Evidence is
written below `.rtl-agent/i2c-coverage-runs/i2c-master/run_<timestamp>/`.

The final claim is `I2C_COVERAGE_EXPERIMENT`. It reports baseline coverage, final coverage, and
gain, but remains non-authoritative and requires semantic human review of the checker and residual
targets.

## Current validation boundary

The normalized I2C baseline under the v1 experiment profile has completed a real Windows Verilator
round at 78.16% aggregate
coverage: 81.04% line (359/443), 71.43% branch (20/28), and 74.73% toggle (553/740). This validates
the baseline ingestion and measurement path; it is not evidence that an Agent has improved the
coverage or that the checker is functionally complete.

Separately, the latest completed full VerilogEval guidance experiment ran on common-guidance v1.
The I2C result must not be compared as though it were another single VerilogEval case: it starts
from a real multi-file controller plus its legacy regression bench, measures the baseline first,
and limits the Agent to verification assets rather than generated DUT logic.
