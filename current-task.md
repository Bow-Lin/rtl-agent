# Current Task

## Goal

Complete R01 as the reusable, non-authoritative foundation for Spec → RTL → compile/repair experiments, without selecting a dataset or implementing an Agent/compiler.

## Current Status

Completed on Windows. `@rtl-agent/core-loop` now owns the version 1 Core Loop contracts, pinned dataset provenance, Provider catalog/staging validation, normalized fixture identity, atomic run publication, JCS file manifests, whole-run net-write policy, output sanitization, and stable errors. `apps/rtl-core-loop` is a thin CLI and fails closed with `DATASET_NOT_CONFIGURED` until a reviewed Provider is configured.

R01 does not establish Linux readiness. This host has no WSL distribution, Docker, or Podman, so Linux filesystem contract execution remains follow-up evidence.

The guarded commit review found that the R02–R04 task documents still described pre-R01 field names, result statuses, attempt ownership, and app-level adapter placement. Those documents are now aligned to the implemented R01 API: reusable adapters/orchestration stay in `packages/core-loop`, the app remains a thin CLI, R02 writes strict `AgentAttemptInput`, R03 consumes strict `CompileRequest` and returns strict `CompileResult`, and R04 reads `CreateRunRequest.profile.maxAttempts` with `COMPILE_PASSED` as the success outcome.

A follow-up guarded review found three R01 boundary defects. They are resolved: successful atomic run publication is no longer changed into a failure by staging cleanup errors and instead returns `STAGING_CLEANUP_FAILED`; captured output now removes drive, UNC, and POSIX host paths without relying on caller hints and rejects residual paths at the schema boundary; and `FileManifestSchema` itself rejects NFC/case-fold path collisions.

The final guarded review also found that quoted POSIX paths and `file://` URLs bypassed sanitization, and that the Schema's preview maximum counted JavaScript string units instead of UTF-8 bytes. Both are fixed with boundary regression tests; ordinary HTTP(S) URLs remain unchanged.

## Scope Completed

- added `packages/core-loop` and wired it into pnpm/TypeScript/Vitest
- added full `NormalizedFixture`, run profile/request, Agent input, compile request/result, final result, captured output, manifest, and error schemas
- separated `BLANK_GENERATION` from `SEEDED_COMPILE_REPAIR`
- implemented structured dataset/case/adapter/normalization provenance and deterministic case listing checks
- made Provider output untrusted staging input; rejected links, special/undeclared files, non-RTL starter files, traversal and case/Unicode collisions
- computed raw-byte file digests and RFC 8785 JCS manifest/fixture digests
- atomically published fresh `.rtl-agent/runs/<run-id>` workspaces and evidence without a persistent fixture cache
- enforced the post-turn net-change rule across the whole run root, allowing only `workspace/rtl/**`
- added UTF-8 byte truncation and host-path redaction for captured output
- made post-publication staging cleanup best-effort with a stable warning while preserving the published run
- enforced generic host-path rejection in `CapturedOutputSchema` and collision rejection in `FileManifestSchema`
- reserved `core-loop/fixtures/` without dataset content and ignored local `.rtl-agent/` output
- added a thin fixture-check CLI with stable missing-provider behavior

## Not Performed

- no concrete dataset, adapter, canonical fixture, reference answer, hidden test, or evaluation result
- no OpenCode Agent/model call; belongs to R02
- no Icarus/Verilator compile; belongs to R03
- no repair loop, batch metrics, simulation, testbench, or functional-correctness claim
- no A03 state update, SQLite, daemon, MCP, snapshot, review, or formal Gate work
- no Linux test execution because no Linux runtime/container is available locally

## Public R01 Boundaries

- library: `@rtl-agent/core-loop`
- Provider: `describe`, deterministic `listCases`, staging-only `materialize`
- run entry: `createCoreLoopRun`
- manifests: `createBaselineWorkspaceManifest`, `createAttemptRunManifest`
- write policy: `checkAllowedRunChanges` / `assertAllowedRunChanges`
- output: `captureOutput`
- fixture diagnostic: `corepack pnpm core-loop:fixtures:check` (expected exit 2 until configured)

## Validation Evidence

- `corepack pnpm install --frozen-lockfile`: passed
- `corepack pnpm lint`: passed
- `corepack pnpm typecheck`: passed
- `corepack pnpm --filter @rtl-agent/core-loop --fail-if-no-match test`: 4 files, 27 tests passed
- `corepack pnpm --filter @rtl-agent/rtl-core-loop --fail-if-no-match test`: 1 file, 1 test passed
- `corepack pnpm test`: 18 files, 129 tests passed
- `corepack pnpm build`: passed
- `corepack pnpm format:check`: passed
- `corepack pnpm peers check`: passed
- missing Provider diagnostic: `DATASET_NOT_CONFIGURED`, exit 2 as expected
- R02–R04 stale-contract/required-term/heading/code-fence scan: passed
- final `git diff --check` and Harness: passed after the handoff update

## Risks

- Linux case-sensitive filesystem and Linux symlink behavior have not executed on this host; run the unified suite in Linux CI before claiming Linux readiness.
- a `STAGING_CLEANUP_FAILED` warning means the run is valid but temporary staging may require operator cleanup.
- before/after manifests detect net changes only; R02 must pair them with Agent permission restrictions.
- `compilerProfileId` is syntax-validated only; R03 must define and lock the actual repository-owned profile/tool version.
- compile-only results remain non-authoritative and do not prove RTL functionality.

## Next 3 Steps

1. Implement R02 against `AgentAttemptInput` and the run/write-policy API.
2. Implement R03 independently against `CompileRequest`/`CompileResult` and lock a real Icarus version.
3. Select/review a real dataset and evaluation profile only after R02 and R03 smoke evidence, then execute R04.

## Last Updated

2026-07-16T08:31:18+08:00
