# Verification Guide

## Purpose

This file defines how agents should verify changes before declaring work complete.

## Baseline Harness Check

Always available:

```bash
bash scripts/harness_check.sh
```

## Project-Specific Validation

A01 established the following repository-supported commands. Run them from the repository root using the Corepack-pinned pnpm version:

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm format:check
corepack pnpm peers check
```

`typecheck` uses TypeScript project references for source projects and a separate no-emit test project. Source `dist` output may be produced during typecheck; test files must not be emitted to `dist`. `clean` is available through `corepack pnpm clean` when a clean build is specifically required.

The shared Vitest configuration uses a finite 15-second per-test timeout because the aggregate suite contains concurrent filesystem and bounded-process cases that can exceed Vitest's five-second default under host scheduling contention. This changes only the test harness; production Agent/compiler process deadlines remain independently bounded. Run process-heavy package and aggregate suites without competing validation jobs.

Portable `.mjs` configuration files are fixed to LF in `.gitattributes`. If the Windows and Linux format jobs disagree, verify the checkout classification with:

```powershell
git check-attr -a -- eslint.config.mjs prettier.config.mjs
```

Both files must report `text: set` and `eol: lf`.

A01–A05 currently use Windows lint, typecheck, unit, storage, integration, and build evidence as their completion gate. Their implementation must remain portable and retain future Linux CI entry points, but a successful Linux result is temporarily deferred and does not block `DONE`. The A01 GitHub Actions Linux job is advisory. Before claiming production Linux readiness, the deferred Linux control-plane suite must pass. Formal compile/simulation/coverage Gate evidence is still produced on Linux; a non-Linux formal-Gate invocation must be tested to return `LINUX_GATE_REQUIRED` rather than a downgraded success.

R01–R04 form a separate Core Loop checkpoint. Its fixed local Icarus compile may run on the current Windows host, but every result must be marked `authoritative: false` and `claim: "COMPILE_ONLY"`. This evidence may support a product-direction decision only; it does not satisfy B07/B11, prove Linux readiness, or establish RTL functional correctness. R01 contract tests and R02/R03 smoke tests use temporary generated inputs and do not count as evaluation evidence. A real R04 batch requires an operator-selected, version/license-reviewed dataset provider and a predeclared evaluation profile. Task-specific OpenCode and Icarus commands are added when R02/R03 lock actual installed versions.

R01-specific checks are:

```powershell
corepack pnpm --filter @rtl-agent/core-loop --fail-if-no-match test
corepack pnpm --filter @rtl-agent/rtl-core-loop --fail-if-no-match test
corepack pnpm core-loop:fixtures:check
```

The first two commands use only temporary synthetic mechanics inputs. Prepare the selected pinned VerilogEval dataset once with:

```powershell
corepack pnpm core-loop:dataset:prepare
corepack pnpm core-loop:fixtures:check
```

The preparation command downloads the fixed commit archive, checks its transport SHA-256, extracts only `LICENSE` and `dataset_spec-to-rtl/**`, validates the 472-file content manifest, and atomically publishes it below ignored `.rtl-agent/datasets/`. `fixtures-check` must then report the locked descriptor and 156 cases. Set `RTL_AGENT_VERILOG_EVAL_CACHE_ROOT` to an operator-owned absolute cache root when the repository-local ignored cache is unsuitable. If no cache/Provider is configured, the library/CLI injection boundary still fails closed with `DATASET_NOT_CONFIGURED`; an existing invalid cache fails with `DATASET_PROVENANCE_INVALID` and is never overwritten. R01 filesystem contract tests should run on Windows and Linux because case sensitivity and symlink behavior differ. If Linux execution is unavailable, record the missing command/evidence and do not claim Linux readiness.

Prepare and validate the pinned ChipBench dataset with:

```powershell
corepack pnpm core-loop:dataset:prepare:chipbench
corepack pnpm core-loop:fixtures:check:chipbench
```

The command extracts only `LICENSE`, `Verilog Gen/**`, and `Verilog Debugging/**`, validates the 683-file manifest, and must report 45 generation cases plus 178 debugging cases across 11 splits. Set `RTL_AGENT_CHIPBENCH_CACHE_ROOT` for an external cache. Debugging cases are `PROMPTED_FUNCTIONAL_REPAIR`: their buggy RTL is contained in the prompt, and the current result remains non-authoritative `COMPILE_ONLY` evidence rather than functional-repair proof. Reference-model, toolbox, script, Docker, Make, and Python paths are excluded and never executed.

R02-specific static and live checks are:

```powershell
$env:RTL_AGENT_OPENCODE_EXECUTABLE = '<absolute-native-opencode-executable>'
$env:RTL_AGENT_OPENCODE_VERSION = '<locked-version>'
$env:RTL_AGENT_OPENCODE_MODEL = '<provider/model>'
corepack pnpm core-loop:agent:probe

$env:CORE_LOOP_REAL_AGENT_TEST = '1'
corepack pnpm core-loop:agent:smoke
```

For Kimi Code, set `KIMI_CODE_API_KEY` and use
`RTL_AGENT_OPENCODE_MODEL=kimi-code/kimi-for-coding`. The direct `rtl-core-loop` CLI also reads
these values from ignored root `.env` and `.env.local` files. A legacy root `kimi=<key>` entry is
not accepted. Only the explicit Agent configuration allowlist is loaded, shell variables take
precedence, and the key value is never serialized into the OpenCode inline configuration or
capability digest. Vitest-based live smoke still requires the variables in the calling process
environment.

Windows requires a regular native `.exe`; `.cmd`/`.bat` launchers and shell mediation are rejected. `agent-probe` must verify exact version, required flags, effective `autoupdate: false`, disabled sharing/snapshot/formatter/LSP, empty MCP/plugin/instructions, deny-only resolved global config, bounded resolved Agent permissions, repository Agent/Skill digests, and the experiment config digest. The explicit smoke uses only generated test data: one allowed Blank Generation turn must return `RTL_CHANGED`, and one test-only Agent must actually receive a denied write result without creating the target. Neither smoke is evaluation evidence. Ordinary `pnpm test` skips both network/model calls. OpenCode may retain its own session DB; shared Core Loop evidence stores neither its host path nor raw JSONL.

The generic VerilogEval/Kimi profile requires an explicit selection. Continuous ranges include both
endpoints:

```powershell
corepack pnpm build
node .\apps\rtl-core-loop\dist\index.js evaluate `
  --profile verilog-eval-kimi-v1 `
  --begin Prob001 `
  --end Prob010
```

Sparse selection uses a quoted comma-separated value:

```powershell
node .\apps\rtl-core-loop\dist\index.js evaluate `
  --profile verilog-eval-kimi-v1 `
  --cases "Prob001,Prob005,Prob010"
```

Selectors are case-insensitive and may be full IDs or unambiguous prefixes. Range and list modes
are mutually exclusive. The resolved case list is canonicalized to pinned Provider order and bound
into the derived profile before any model turn. The v1 profile uses one Agent attempt per case.
Every Agent turn also receives the complete versioned checklist from
`.opencode/skills/rtl-core-loop/common-guidance.md`. Its SHA-256 is stored as
`guidanceFileDigest` in the Agent capability and turn evidence, so changing the checklist changes
the resolved profile identity and mid-run drift fails closed. The guide contains only general
Compile/Logic/Safety advice and must not contain case-specific answers or hidden verification data.
After the batch result is published, `evaluate` atomically updates the ignored runtime journal at
`.rtl-agent/knowledge/observed-issues.md`. Compile diagnostics are taken from structured run
observations. Each nonzero mismatch requires an additional restricted diagnosis turn supplied only
with the public `spec.md`, candidate `rtl/`, and mismatch totals. The structured diagnosis must name
a concrete root-cause category, cite at least one candidate RTL line, and state confidence and
limitations. The input also includes per-public-output mismatch counts and first-mismatch times
parsed from the bounded simulation stdout. Complete structured analysis and capability metadata stay
under `_internal/mismatch-analysis/<run-id>/`; the runtime journal publishes only one concise
category/confidence/root-cause conclusion per mismatched case. A missing, generic, malformed, or input-mutating diagnosis fails with
`MISMATCH_ANALYSIS_FAILED` instead of recording an unknown cause. These diagnosis turns consume
additional model quota. The journal workflow never writes `common-guidance.md`; promotion into
prompt guidance requires an explicit operator request and applies only to later batches.
Every `functionalNotRun` case is also listed under `Not Run Details` in selected-case order. The
entry uses the stable run outcome or preflight status, maps a missing compile unit to
`NO_COMPILE_UNIT`, and includes the latest structured compile-error message for `MAX_ATTEMPTS` when
available. Historical compile errors do not replace the final reason for a later timeout, policy,
Agent, or tool outcome; those entries retain their own failure stage. Cases that never produced a
run result are recorded as `NOT_EXECUTED` or with their concrete validation status instead of being
represented only by the aggregate count. A successful `VALID` baseline message is never reused as
a not-run cause; if the batch stops before a run result exists, the journal states that functional
simulation was not reached before the batch stopped.
The same `evaluate` invocation then completes the VerilogEval functional path after a candidate
passes the fixed compile check: it materializes the locked reference and testbench into a private
verification directory, compiles candidate + reference + testbench with `iverilog -g2012 -s tb`,
runs the image with `vvp`, and requires one parseable
`Mismatches: <n> in <samples> samples` line. A functional pass requires a normal process exit,
positive sample count, and zero mismatches. `functionalFailed` counts only successfully executed
simulations with a nonzero mismatch total. Verification compile errors, process errors, timeouts,
and malformed simulation output are counted separately as `verificationInvalid`; any such outcome
makes the functional batch `INVALID` and the CLI returns `ok: false`. Candidate generation or
candidate-only compile failures remain `functionalNotRun`.

New results use short daily IDs such as `b-20260721-001` and are written as:

```text
.rtl-agent/batches/<batch-id>/
  summary.json
  rtl/<case-id>/*.sv
  _internal/evidence/
  _internal/runs/
  _internal/verification/
```

Only candidate RTL is published under `rtl/`. Reference/testbench sources stay under
`_internal/verification/` and never enter the Agent workspace. The terminal prints a concise
summary; full records remain in `_internal/evidence/`. Existing UUID batches remain readable.
These commands make real Kimi calls and consume subscription quota; the post-generation
Icarus/vvp phase does not call the model. Set `RTL_AGENT_VVP_EXECUTABLE` only when `vvp` is not
next to the configured Icarus executable. For this local, non-authoritative benchmark workflow,
the operator explicitly permits generated simulation images to run directly on the host. This is
not an OS sandbox, formal Gate evidence, or a production Linux safety claim.

R03 provides independent real-Icarus entry points. Set the absolute native executable when it is not at the repository profile's host default:

```powershell
$env:RTL_AGENT_IVERILOG_EXECUTABLE = 'C:\iverilog\bin\iverilog.exe'
corepack pnpm --filter @rtl-agent/core-loop test:integration:iverilog
corepack pnpm --filter @rtl-agent/rtl-core-loop compile:smoke
```

Both commands are non-skippable and fail when the executable or exact version is unavailable. The integration command validates the exact `iverilog-systemverilog-2012-null-v1` profile, including `-tnull`, valid/error/missing-top/elaboration cases and rerun classification. It also runs a synthetic R04 composition case through seeded baseline, fake Agent edit, real compile, and independent real recompile. Ordinary deterministic tests cover include rejection, manifest drift, version failure, bounded draining, timeout and unconfirmed termination. The CLI smoke and synthetic R04 integration use only temporary mechanics inputs and never count as evaluation evidence.

R04 ordinary tests cover branch-dependent preparation/result evidence, all strict R02 outcomes, max-attempt bounds, final-recompile inconsistency, capability drift, evidence failure, all-fixtures-before-Agent batch preflight, batch-manifest self-validation, denominator inclusion, category metrics, diagnostic coverage, human-review adjustment (including repair recovery), Provider implementation digest, and thin CLI dispatch. A real evaluation additionally requires:

- a repository/operator-registered `FixtureProvider`
- a reviewed evaluation profile locking dataset descriptor/license, Provider implementation digest, expected count/ordered case IDs digest, Agent/compiler capabilities, thresholds, and human review plan
- `rtl-core-loop evaluate --profile <evaluation-profile-id>` through an application registration that supplies that Provider/profile/digest

The standalone bin intentionally has no built-in dataset/profile and must fail closed. A successful real batch writes under `.rtl-agent/batches/**`; the committed report at `docs/experiments/spec-to-rtl-core-loop-report.md` remains pending until those operator inputs exist. Synthetic mechanics results cannot populate that report's capability metrics or checkpoint recommendation.

## Change-Type Validation Matrix

| Change Type | Required Validation |
|---|---|
| Documentation only | `bash scripts/harness_check.sh` |
| Harness files | `bash scripts/harness_check.sh` |
| Code logic | Project tests plus relevant lint/typecheck |
| API/interface | Tests plus affected integration checks |
| RTL logic | Lint plus simulation if available |
| Build/deployment | Build command plus smoke check |
| A01–A05 portable control plane | Windows checks required; Linux execution evidence temporarily deferred |
| Production Linux readiness / later portable milestones | Windows checks plus Linux CI checks |
| Formal RTL Gate | Linux execution plus non-Linux rejection test |
| R01–R04 Core Loop | Unified checks plus task-specific real OpenCode/Icarus smoke or batch evidence; results remain non-authoritative |

## If Validation Cannot Be Run

Record in `.harness/session-log.md`:

- command not run
- reason
- risk
- recommended follow-up

Do not claim full completion without validation evidence.
