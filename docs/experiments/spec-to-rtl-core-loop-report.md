# Spec-to-RTL Core Loop Evaluation Report

## Status

`COMPLETED` — On 2026-07-30 the operator accepted the implemented R04 mechanics and the existing
locked full-dataset runs as sufficient checkpoint evidence and directed that R04 be marked `DONE`.
This is an explicit operator acceptance of the available local Windows evidence, including its
limitations; it does not convert the evidence into a formal RTL Gate or Linux-readiness claim.

## Accepted Inputs and Evidence

- dataset: NVlabs VerilogEval v2 `spec-to-rtl`, pinned at commit
  `c498220d0a52248f8e3fdffe279075215bde2da6`
- license disposition: pinned MIT license metadata accepted by the operator for this checkpoint
- selection: all 156 ordered cases, `Prob001`–`Prob156`
- accepted primary summary: `exp_result/verilog-eval/07.29-07.30-k3-pi-001-156.md`
- batches: `b-20260729-003`, `b-20260729-004`, and `b-20260730-001`
- Agent: Pi Coding Agent `0.81.1`, provider/model `kimi-coding` / `k3`
- profile: the capability-bound `verilog-eval-kimi-pi-v1` segmented profiles recorded by the
  three batches
- compiler: fixed Icarus Verilog 12.0 SystemVerilog-2012 candidate compilation
- functional evidence: locked reference/testbench compilation followed by local host `vvp`
- provenance, ordered selections, capability identities, manifests, and digests remain in the
  ignored batch evidence referenced by the accepted aggregate report

The three batches used the same Pi capability, isolation policy, tool policy, common guidance, and
experiment configuration identities. Their selections contain 156 unique, continuous cases with no
gap or duplicate.

## Results

| Metric | Result |
| --- | ---: |
| Candidate compile passed | 148/156 = 94.87% |
| End-to-end functional passed | 131/156 = 83.97% |
| Functional mismatch | 16/156 = 10.26% |
| Candidate compile failed / functional not run | 8/156 = 5.13% |
| Verification-interface invalid | 1/156 = 0.64% |
| Pass rate excluding the invalid fixture | 131/155 = 84.52% |

The eight candidate compile failures are concentrated in SystemVerilog enum/state assignments that
Icarus reports as requiring explicit casts. `Prob099_m2014_q6c` is kept separate because its locked
testbench connects ports absent from both the public/reference interface and the candidate. It is
not counted as a model mismatch.

## Human and Operator Review

The operator accepted the existing full-dataset report, recorded mechanics evidence, failure
taxonomy, and stated limitations as sufficient to close the R04 checkpoint. No new model call,
generation run, simulation, or separate predeclared per-case review sample was performed for this
closure. This is a documented deviation from the earlier plan to require a newly declared
acceptance profile and review sample before changing the task status.

## Limitations

- Evidence was produced locally on Windows and is non-authoritative.
- Direct host `vvp` execution is accepted only for this benchmark checkpoint.
- The accepted segmented profile allowed one Agent attempt per case, so it does not measure repair
  recovery after compiler feedback across all 156 cases.
- Compilation and the observed testbench traces do not prove general RTL correctness.
- No Linux production Gate, sandbox Gate, immutable-snapshot Gate, or formal acceptance ran.
- The separate Verilator coverage-Agent experiment remains non-authoritative and requires semantic
  review; it is not used to upgrade this checkpoint claim.

## Checkpoint Recommendation

`PROCEED_TO_FUNCTIONAL_VALIDATION`

The observed 83.97% end-to-end functional pass rate and 94.87% candidate compile rate provide a
positive product-capability signal, while the mismatch and compiler-failure clusters identify
specific follow-up work. Per the Core Loop stop rule, this recommendation does not automatically
start A04 or any later milestone; the repository now waits for explicit operator direction.
