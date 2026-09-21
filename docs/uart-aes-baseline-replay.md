# UART/AES frozen-TB baseline replay (2026-09-20)

## Authorized scope

Run all 190 published mutants using the existing frozen golden TB and Icarus only. Preserve
mutation/uart-aes-transfer-v1 byte-for-byte, including parameters, reference answers and patches.
Keep OSDVU at 10. Results and diagnostic audits live in new exclusive directories. No model,
Memory, Agent integration, source/target freeze, new IP or baseline-TB improvement in this task.
The suggested UART 2-source/2-target split is a later decision, not this run's assignment.

## Implementation and validation plan

1. Revalidate the published manifest tree and all consumed bytes; inspect fixed TB contracts,
   valid-output sampling and bounded transaction checks. Confirm no active RTL/model process.
2. Reuse family-process.ts's fixed-executable argv-only execution and live process mechanism.
   Its source is hash-bound by old FIFO runs, so retain it byte-identically and derive the scoped
   family-replay-process.ts version with only a narrow owned-FIFO-lock token option. This replay claims the existing shared serial
   lock for its whole duration; a missing/replaced token must stop execution. Other callers still
   reject any FIFO lock. Never alter the frozen FIFO experiment runtime or results.
3. Add an isolated Icarus replay entry and conservative raw-verdict parser. Freeze the runtime,
   publication inventory, tool identity, compile/simulation timeouts and ordered 190-case queue
   before execution. Compile and run all seven goldens first, then each mutant in a fresh copied
   workspace with actual patch application and source/TB digest checks before and after execution.
4. Persist separate compile/simulation durations, exit/signal/error/cleanup records and assertion
   messages. Compiler errors, runtime failures, wall-clock timeout and cleanup failure are never
   kills. A boundary failure stops the queue with remaining cases explicitly not-run.
5. Audit raw TB failures against the unchanged checker and legal interface timing before accepting
   functional kills. Preserve unknown failures as unresolved. Review every survivor's source site
   and likely activation/observation gap. Independent diagnostic witnesses, if needed, use separate
   evaluator-only files/results and never replace this frozen baseline or enter Agent context.
6. Deliver per-IP counts, raw/accepted failure distinctions, evidence links, survivor hypotheses,
   unresolved validity and saturation assessment. Do not claim equivalence without proof or remove
   unresolved mutants. Preserve previous errors and do not select a better replay attempt.

## Verdict and interpretation

Execution v1 stopped before the first mutant compile: Git inherited core.autocrlf and rewrote
the patched file to CRLF. The byte-digest guard correctly rejected it; all seven goldens passed
but zero mutant simulations ran. Preserve its failure, applied bytes and archived runtime.
Execution v2 pins core.autocrlf=false for patch application, tests this against a true setting,
and snapshots runtime bytes before launch. This repairs host materialization only; published
assets and the frozen TB remain unchanged. The complete baseline uses the fresh v2 result root.

A passing golden is a prerequisite. The raw parser accepts a survivor only after a normal exit
and the exact IP pass marker, without a fatal/error. A fatal tied to a real frozen TB line is a
candidate functional failure, not an automatic kill. Independent semantic review checks legal
inputs, valid output windows, transaction completion and oracle correctness. GLOBAL_TIMEOUT is
unresolved until its functional meaning is established; host timeouts are infrastructure events.
All 190 stay in the accounting. Raw score uses accepted kills plus normal survivors; unresolved
and infrastructure counts remain visible, with no adjusted equivalence denominator.

Current TB is the proposed default initial TB for later experiments. Its role cannot be switched
after observing Memory effects. Baseline inspection is evaluator-only; future feedback and held-out
sets must be prospectively separated before any kill-guided Agent iteration.

## Checks

- Focused Node tests: frozen artifact integrity, raw outcome classification, patch reconstruction,
  command configuration and shared serial ownership, plus existing process/path/mutation tests.
- Strict NodeNext typecheck, focused ESLint/Prettier; no full build that rewrites frozen dist.
- Real seven golden + 190 mutant Icarus compile/simulation pairs with persisted evidence.
- Final publication/runtime digest recheck, git diff --check and Git Bash harness check.
- Windows local evidence only. Linux CI/formal Gate and formal equivalence are not run; verify
  platform behavior separately before production acceptance. No mixed-simulator mutation score.

## Method references

[MCY methodology](https://yosyshq.readthedocs.io/projects/mcy/en/latest/methodology.html) distinguishes
functional differences from changes on irrelevant output cycles. [Equivalence setup](https://yosyshq.readthedocs.io/projects/mcy/en/latest/eqsetup.html)
requires valid-cycle comparisons and warns about overconstraints. [Verilator runtime guidance](https://verilator.org/guide/latest/simulating.html)
distinguishes structural coverage from functional checking and discusses host build optimization.
This run uses Icarus; previous Verilator coverage remains a separate baseline descriptor.
