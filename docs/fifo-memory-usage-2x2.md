# Fixed-v1 Memory usage mechanism diagnostic

Protocol registered 2026-09-18 before any new generation. This is development diagnosis
on the already studied dpretet target and known M010, not held-out transfer validation.

## Scope and factors

| Group | Memory | Workflow | Independent runs |
| --- | --- | --- | --- |
| A | off | current | 3 |
| B | original frozen13 | current | 3 |
| C | off | generic implementation check | 3 |
| D | original frozen13 | same generic implementation check | 3 |

Fixed order: R1 A B C D; R2 D C B A; R3 C A D B. Order is a scheduling choice;
each run starts fresh with identical original RTL/TB/checker and ephemeral model sessions.
Do not use historical controls in these denominators. Keep original Chinese Memory bytes,
select-all-v1, kimi-coding/k3, coverage-improvement guidance, permissions, topology and
provider guards, max3 Agent attempts, and existing early-stop rule unchanged. A run may
stop before3 under the same rule. Check work consumes the existing budget; no extra turn.
No v2 extraction, new IP, source ablation, or full30/multiple-stage replay in this task.

## Exact intervention

C/D append this identical block to the otherwise byte-identical workspace spec before the
first Agent turn. This is a workflow instruction, not a DUT specification change. Preserve
the original spec digest, append-only relation, added-block digest and resulting spec digest.
A/B specs stay unchanged. Record actual provider requests containing the complete added
block (including later requests after the spec read), not merely the local file's existence.

```text
## 检查实现核对

对准备采用的验证策略，确认其适用条件、检查内容、采样窗口和判错依据，并对应到实际代码。
对声称已经完成的关键检查，提供能够证明其执行的证据。
基线已有的行为应明确标记，不重复声称新增；不适用或尚未执行的策略应说明状态，不能声称已完成。
```

The generic addition contains no target answer, special signal value, timestamp, mutant,
patch, demand to implement all items, or extra tools. Existing runner instructions already
prohibit unverified compilation/simulation claims. Evidence can be pending if no execution
is available. Missing evidence is an adoption status, not an infrastructure failure.

## Generation and sealing

Run all12 serially before any independent mutant evaluation. Use exclusive new directories
and the shared FIFO active lock. Snapshot original Memory, runtime/tool/guidance digests and
all conditions in plan.json; audit identical baseline and configuration across completed runs.
Final means the last attempted version (attempt = agentAttempts+1, or0 for no Agent attempt),
not the best scoring intermediate. If unavailable, preserve null and the failure; do not fall
back. Seal selected snapshot paths and manifest digests in generation-complete.json before
starting the evaluator. Never return mutant results to generation or select by them.

Preserve every attempted sample and failure. Provider/network failure stops the queue for
recovery without automatic resampling or silently replacing a draw. Other program outcomes
remain separately labeled. Boundary-integrity failure stops for review. No extra sample is
authorized merely because a sample's behavior was poor.

## Independent evaluation and primary rubric

Only final golden and M010 raw replay per available sample, with fixed Verilator settings.
Original frozen target/suite/mutant bytes remain unchanged. Evaluate even a golden-failing
sample's raw mutant outcome but do not give accepted kill/primary success from it.

Primary success requires all three:

1. Code checks the appropriate output values while both asynchronous resets are effective,
   after required output update/settling and before release, according to target contract.
   No specific70ns timestamp or exact code organization is required.
2. The actual relevant check executes. Link runtime observation/counter or deterministic
   scheduling plus generated executable checker and successful run evidence. Agent prose,
   code presence alone and removed/constant-folded checks do not establish execution.
3. The unmodified final golden passes, and the check's semantics are valid for this DUT.

Record semantic review and evidence manually; regex is a locator, not a correctness judge.
If needed, separate observational instrumentation must preserve original raw replay and
original checker/stimulus; never add the missing assertion during evaluation. If adequate
evidence cannot be obtained, status is unconfirmed, not infrastructure failure.

Per sample separate generation/program failure, semantic error, absent check, execution
unconfirmed, executed correct check, golden outcome, raw M010 outcome, and accepted primary
success. A post-release global FULL_AND_EMPTY kill is raw evidence only and cannot satisfy
the reset-effective-window criterion. Unsupported generic CDC assertions remain flagged.
Fixed denominator3/group includes unavailable/failed samples, with reasons displayed.

## Interpretation

Primary comparison D vs C: incremental Memory signal under identical checking instructions.
Also report B vs A, C vs A, and D vs B descriptively. If C/D improve and tie, attribute the
signal to generic checking, not Memory. If D still fails, inspect applicability judgment,
priority and code conversion before varying Memory extraction or item count. Three repeats
are diagnostic and cannot establish stable effectiveness. Designer knowledge of this DUT
and M010 makes this development work even though generation sees no evaluator artifacts.

## Implementation and validation plan

1. Add opt-in wrapper/CLI flag and serial queue; no core-loop or frozen-catalog edit.
2. Focused Node tests for isolation, tamper rejection, unchanged default, and evaluator seal.
3. NodeNext noEmit, ESLint, Prettier, git diff --check and harness check for changed files.
4. Run12 new generations; audit equal inputs and actual Memory/intervention exposure.
5. Seal all final outputs; independently replay24 final cases, review implementation/evidence,
   publish per-sample report with D/C interpretation and explicit limitations.

Windows native Verilator evidence only; no production Linux/formal readiness claim.
