# Multi-IP Verification Coverage Fixtures

## Scope

This local, non-authoritative Windows experiment extends the existing I2C verification-coverage
flow to three different RTL structures. It never modifies the upstream DUT and permits an Agent to
edit only `rtl/tb.sv` and `rtl/checker.sv`.

| Project ID | Verification dimension | Locked upstream revision | Fixture |
|---|---|---|---|
| `versatile-fifo` | storage and asynchronous clock-domain behavior | `freecores/versatile_fifo@3c0ea00773805b3f697583fb2d1e330d6bfe4220` | dual-clock, dual-direction 8-bit FIFO |
| `aes-highthroughput-lowarea` | cryptographic datapath and key schedule | `freecores/aes_highthroughput_lowarea@cf0bb8d68a8f6f3b32818cff0942d89bd4d16233` | AES-128 NIST known-answer encryption |
| `scalable-arbiter` | registered fairness/control hierarchy | `freecores/scalable_arbiter@8808ce3ee762b1fd38a50a87f7acdc5e130f6101` | 16-requester two-level `arbiter_x2` |

The exact consumed-file byte counts and SHA-256 digests are code-locked in
`packages/core-loop/src/project-coverage-lock.ts`. Source trees are expected under
`.rtl-agent/datasets/<source-directory>` and are not copied into the Git repository. The fixture
provider refuses a source tree whose consumed bytes do not match its lock.

## Coverage metric

The pre-existing I2C runner keeps its original line/branch scoring behavior. The new
`project-coverage` command enables a cross-structure score that includes toggle coverage:

- with branch points: `0.5 * line + 0.2 * branch + 0.3 * toggle`;
- without branch points: `0.7 * line + 0.3 * toggle`.

This avoids treating highly structural RTL, such as the scalable arbiter, as complete merely
because its few instrumented executable lines were reached. Raw line, branch, and toggle metrics
remain separately persisted and should always accompany the combined score.

## Reproduction

Baseline-only runs call no model:

```powershell
corepack pnpm core-loop:project-coverage --project versatile-fifo --iterations 0
corepack pnpm core-loop:project-coverage --project aes-highthroughput-lowarea --iterations 0
corepack pnpm core-loop:project-coverage --project scalable-arbiter --iterations 0
```

After Provider quota recovery is proven with the existing real-target canary policy, an Agent
refinement uses an explicit iteration budget, for example:

```powershell
corepack pnpm core-loop:project-coverage `
  --project versatile-fifo `
  --agent pi `
  --iterations 3
```

Run projects serially. Do not overlap them with frozen-Memory evaluation, I2C coverage, mutation,
or another Verilator experiment.

## Evidence boundary

Every run first requires its seeded golden testbench/checker to compile and simulate successfully.
Results remain `PENDING_HUMAN_REVIEW`, are Windows-only, and do not establish production Linux Gate
readiness. Structural coverage is not a bug-detection metric; mutation or another independent fault
oracle is still required before making a verification-effectiveness claim across IPs.
