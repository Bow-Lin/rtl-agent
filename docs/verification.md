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

The first two commands use only temporary synthetic mechanics inputs. Until an operator configures a reviewed Provider, `core-loop:fixtures:check` must exit non-zero with `DATASET_NOT_CONFIGURED`; that diagnostic is the expected result, not a failed fallback. R01 filesystem contract tests should run on Windows and Linux because case sensitivity and symlink behavior differ. If Linux execution is unavailable, record the missing command/evidence and do not claim Linux readiness.

R02-specific static and live checks are:

```powershell
$env:RTL_AGENT_OPENCODE_EXECUTABLE = '<absolute-native-opencode-executable>'
$env:RTL_AGENT_OPENCODE_VERSION = '<locked-version>'
$env:RTL_AGENT_OPENCODE_MODEL = '<provider/model>'
corepack pnpm core-loop:agent:probe

$env:CORE_LOOP_REAL_AGENT_TEST = '1'
corepack pnpm core-loop:agent:smoke
```

Windows requires a regular native `.exe`; `.cmd`/`.bat` launchers and shell mediation are rejected. `agent-probe` must verify exact version, required flags, effective `autoupdate: false`, disabled sharing/snapshot/formatter/LSP, empty MCP/plugin/instructions, deny-only resolved global config, bounded resolved Agent permissions, repository Agent/Skill digests, and the experiment config digest. The explicit smoke uses only generated test data: one allowed Blank Generation turn must return `RTL_CHANGED`, and one test-only Agent must actually receive a denied write result without creating the target. Neither smoke is evaluation evidence. Ordinary `pnpm test` skips both network/model calls. OpenCode may retain its own session DB; shared Core Loop evidence stores neither its host path nor raw JSONL.

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
