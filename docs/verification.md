# Verification Guide

## Commit preparation contract and generator regressions (2026-09-21)

Run the verification-memory-v2, verification-memory-v2-build and verification-generic-guidance
Node tests, plus `python -B -m unittest discover -s tools/mutation -p test_generate_i2c_mutants.py -v`.
The Python tests mock all source/RTL operations and verify preservation of an existing output.
Run all tool Node tests serially on native Windows when process termination requires it,
then repository Vitest, lint and no-emit source/test/tools TypeScript validation. Preserve
historically bound dist artifacts; use an isolated output tree for build verification.
New extraction preparations use contract v2.1; old payloads/hashes must never be rewritten.

## UART/AES Icarus baseline and survivor review (2026-09-20)

Plan: docs/uart-aes-baseline-replay.md. Run Node tests family-replay, family-replay-process,
family-preparation and fifo-candidates (22 tests), strict tools NodeNext noEmit, ESLint and
Prettier. Native Windows process tests exercise owned-tree cleanup and serial token drift.
Do not edit the original family-process.ts: historical FIFO runs also bind its source hash.
The replay-specific version retains that mechanism and adds owned serial token/PID support.

Preflight verifies all published bytes. Real acceptance requires seven fresh goldens plus all
190 fixed-patch Icarus compile/simulations, with separate timings, actual LF patch application,
workspace hashes and process cleanup. Raw TB fatal remains pending until valid-cycle/interface
review; host timeout, compile/runtime failure and unconfirmed cleanup never count as killed.
Independent diagnostic witnesses cannot replace a frozen TB or overwrite baseline outcomes.
Revalidate 297 publication files, replay inputs/runtime snapshots, old103 FIFO runtime hashes,
diff/harness and report links. Preserve every interrupted or failed diagnostic.
No full build, model call, Linux Gate or formal equivalence claim is part of this local baseline.

## Autonomous verification workflow and source v2 preparation (2026-09-19)

Plan: docs/autonomous-verification-work-items-plan.md. Run focused Node tests for
verification-work-items/loop, verification-workflow-context/policy, verification-memory-v2/build,
verification-generic-guidance and verification-kill-comparison, plus source/legacy extraction
regressions. Run strict NodeNext noEmit, focused ESLint/Prettier, diff/harness and real source
prepare-only verification of103 original +4 specs. Preserve all103 frozen prior runtime hashes;
do not run a full build that overwrites dist. Synthetic fixtures are engineering evidence only.
Real no-tool K3 preparation (one G author +four source extractions) is separate from target
generation, with raw payloads/responses retained and no retries/consolidation. Structural/reference
gates do not establish semantic correctness. Native target integration and cohort/golden/whole-set
evaluation remain separate gates. Windows evidence does not establish Linux readiness.

## Directed Memory10 development diagnostic (2026-09-18)

Protocol docs/fifo-memory10-directed-diagnostic.md. New wrapper/entry/campaign/evaluator only;
old97runtime remain locked. Run18 focused Node tests in verification-directed-memory,
fifo-directed-campaign and evaluate-fifo-directed, explicit strict NodeNext noEmit, ESLint,
Prettier, diff/harness, real-data campaign --preflight and independent review before launch.
Three final-only draws, no model retries or best-intermediate fallback; all generation must
seal before independent golden/M010. Preserve rawkills separately from semantic/execution
review, include failures in denominator3 and usage. Windows-only; no Linux readiness claim.

## Fixed-v1 usage2x2 diagnostic (2026-09-18)

Protocol: docs/fifo-memory-usage-2x2.md. Focused Node tests on the implementation-check
wrapper, campaign, evaluator and existing frozen/provider/topology boundaries; explicit
NodeNext noEmit, ESLint, Prettier, diff and harness. Confirm real provider request exposure,
equal baseline/configuration and frozen digests across12 new samples before sealing final
selections. Then run only final golden/M010 and review code+execution evidence separately
from raw kills. Do not infer semantic correctness from regex, model self-report or kill alone.
Windows evidence is non-authoritative for Linux/formal readiness.


## FIFO strategy mechanism diagnostic and Experience v2 (2026-09-18)

See docs/fifo-memory-mechanism-diagnostic.md and docs/verification-memory-v2.md. The isolated
reset diagnostic compiles/runs only baseline+new-oracle golden and known M010, checks reset-active
observations and preserves frozen hashes/raw scores. Existing baseline controls are hash-verified.
Run focused NodeNext noEmit/ESLint on diagnose-fifo-reset.ts and opt-in verification-memory-v2
module/tests, plus legacy/source/v2 Node tests. Actual source prepare smoke uses no model call.
Do not infer blind transfer, semantic validity or Linux readiness from this post-hoc Windows assay.

## UART/AES preparation (2026-09-17)

See docs/uart-aes-dataset-preparation.md for locked scope, serial resume procedure and CLI usage.
Run `node --test tools/mutation/fifo-candidates.test.ts tools/mutation/family-preparation.test.ts tools/mutation/family-process.test.ts`,
focused TypeScript NodeNext noEmit and ESLint on family-preparation, family-publication,
create-uart-aes-fixtures, family-process and their tests. The native process tests exercise
real owned parent/descendant termination; restricted Windows taskkill cannot supply that evidence.
RTL work waits for FIFO and residual
preparation compilers to be idle. Require seven golden Icarus/Verilator records, selected-mutant
Icarus compile/Verilator lint, digest-bound static review, actual patch application and publication
audits before acceptance. OSDVU shortfall is allowed; do not substitute mutants by kill outcomes.
No Linux CI/formal Gate or transfer-effect acceptance follows from Windows preparation alone.

## Target recovery guards (2026-09-17)

Run Node tests target-topology-guard, target-provider-guard, target-coverage-domain,
verification-frozen-adapter and replay-verdict under tools/mutation. Validate explicit tools
NodeNext typecheck, ESLint, full build/typecheck and focused project-coverage provider/CLI Vitest.
Both target baseline-only integrations must pass with scope audits before recovery launch;
model connection probe is separate and diagnostic only. Windows only is not Linux readiness.

## FIFO target integration (2026-09-17)

Run `node --test tools/mutation/verification-frozen-adapter.test.ts tools/mutation/replay-verdict.test.ts`,
focused project-coverage provider/CLI Vitest, `corepack pnpm typecheck`, focused tools NodeNext
typecheck and ESLint, build and harness. Run both target baseline-only golden integrations and
replay-target diagnostic smoke before campaign launch. Target evidence remains Windows-only
and non-authoritative; Linux CI and formal Gate readiness not established.

## K3 verification Memory pipeline (2026-09-17)

See docs/verification-memory.md for focused Node tests, explicit tools typecheck/lint, build,
prepare-only source audit and real-model integration separation. Publication requires valid
K3 responses and source-bound references; semantic correctness remains pending human review.

## Versatile source mutation replay (2026-09-14)

`node --test tools/mutation/replay-verdict.test.ts` covers conservative outcome classification.
Run explicit NodeNext noEmit and focused ESLint for replay tools. `replay-versatile.ts` accepts
only a new .rtl-agent/fifo-replays/<name> output, fixed baseline/first/final source assets and
frozen30 patches. Three golden gates and90 independent compile/simulations are integration
evidence. Timeout is not killed; compile timeout aborts for process-tree inspection. Linux
CI/full repository suite remain separate, not established by Windows replay.

## Verification asset evidence snapshots (2026-09-14)

Run focused project-coverage.test.ts with Vitest, pnpm typecheck/build, and ESLint on changed
files. Snapshot tests cover baseline bytes, edited-version separation, digest and exclusive
output rejection. Snapshots reside in run evidence/verification-assets/attempt-N, never Agent
workspace. Historical recovery script is exclusive-output, fixed-run, and validates exact
final-byte reconstruction; recovered first TB still requires independent golden replay.

## FIFO preparation v2 tools (2026-09-09)

`node --test tools/mutation/fifo-candidates.test.ts` validates deterministic single-site rules.
Run explicit `pnpm exec tsc --ignoreConfig --noEmit --types node --target ES2023 --module NodeNext
--moduleResolution NodeNext --allowImportingTsExtensions --strict --skipLibCheck` on the FIFO
tool files (including audit/verify/publish), focused ESLint, normal build and harness check.
`prepare-fifo.ts` requires a locked config and NEW output directory; `audit-fifo.ts` accepts
preparation roots. `verify-fifo-suite.ts` runs golden Verilator coverage and each mutant's
lint/elaboration serially. Its locked suite must point to fresh prepared roots for another run;
do not delete/overwrite existing validation evidence. `publish-fifo-suite.ts` publishes an
exclusive source/TB/patch/manifest bundle. Six real golden runs and180 frontend checks are
integration evidence, not mutant kill replay. Never format/rewrite frozen source/patch bytes.
Windows results remain non-authoritative; Linux CI, formal CDC and non-equivalence not claimed.

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

R05 Spec Understanding Markdown template checks are:

```powershell
corepack pnpm exec vitest run packages/core-loop/test/spec-understanding.test.ts --config vitest.config.ts --maxWorkers=1
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
```

The R05 focused suite is deterministic and makes no model, compiler, simulation, dataset, or
network call. It validates task-specific template selection and the trusted task/Spec/DUT inputs
used before generation. It deliberately does not parse or validate the model's completed Markdown
format, headings, traceability, completeness, or semantic correctness.

The first two commands use only temporary synthetic mechanics inputs. Prepare the selected pinned VerilogEval dataset once with:

```powershell
corepack pnpm core-loop:dataset:prepare
corepack pnpm core-loop:fixtures:check
```

The preparation command downloads the fixed commit archive, checks its transport SHA-256, and
extracts only `LICENSE` and `dataset_spec-to-rtl/**`. It then applies every preparation patch locked
by source digest, replacement count, and result digest. The current normalization changes the
Prob099 verification testbench identifiers from `Y2`/`Y4` to the public/reference interface names
`Y1`/`Y3`. Preparation validates the resulting 472-file content manifest and atomically publishes
it below ignored `.rtl-agent/datasets/`. `fixtures-check` must report dataset version
`v2-c498220d-prob099fix1` and 156 cases. Set `RTL_AGENT_VERILOG_EVAL_CACHE_ROOT` to an
operator-owned absolute cache root when the repository-local ignored cache is unsuitable. If no
cache/Provider is configured, the library/CLI injection boundary still fails closed with
`DATASET_NOT_CONFIGURED`; an existing invalid cache fails with `DATASET_PROVENANCE_INVALID` and is
never overwritten. R01 filesystem contract tests should run on Windows and Linux because case
sensitivity and symlink behavior differ. If Linux execution is unavailable, record the missing
command/evidence and do not claim Linux readiness.

Prepare and validate the pinned ChipBench dataset with:

```powershell
corepack pnpm core-loop:dataset:prepare:chipbench
corepack pnpm core-loop:fixtures:check:chipbench
```

The command extracts only `LICENSE`, `Verilog Gen/**`, and `Verilog Debugging/**`, applies the
digest-locked timing starter normalizations, validates dataset version `c74fe7d28-r5` and the
683-file manifest, and must report 45 generation cases plus 178 debugging cases across 11 splits.
The three preparation patches make `Prob013`, `Prob016`, and `Prob022` timing starters compilable and
simulation-bounded while preserving an observable functional timing error. Set
`RTL_AGENT_CHIPBENCH_CACHE_ROOT` for an external cache. Debugging cases are
`PROMPTED_FUNCTIONAL_REPAIR`: their buggy RTL is contained in the prompt. Reference-model, toolbox,
script, Docker, Make, and Python paths are excluded and never executed.

Run one complete ChipBench split with Pi/Kimi using:

```powershell
corepack pnpm core-loop:evaluate:chipbench:pi --split self-contained
```

An explicit range or sparse case list narrows the selected split; case prefixes are resolved only
inside that split, because ChipBench repeats identifiers such as `Prob001` across splits:

```powershell
corepack pnpm core-loop:evaluate:chipbench:pi `
  --split self-contained `
  --cases "Prob000,Prob001"
```

Supported generation splits are `self-contained` (30), `not-self-contained` (6), and `cpu-ip` (9).
The eight debugging splits use
`debug-(zero|one)-shot-(arithmetic|assignment|state-machine|timing)` with 24, 30, 6, and 29
cases respectively for each shot setting. Run each split as a separate batch; do not combine
zero-shot, one-shot, generation, and debugging results into one accuracy claim.

Zero-shot Debug uses an explicit task command and seeded buggy RTL. Prepare the private baseline
once for the selected split, then run any number of Debug batches against the same content-addressed
cache:

```powershell
corepack pnpm core-loop:debug-baseline:chipbench --split debug-zero-shot-assignment
corepack pnpm core-loop:debug:chipbench:pi --split debug-zero-shot-assignment

# Read one immutable snapshot without creating Debug Experience.
corepack pnpm core-loop:debug:chipbench:pi `
  --split debug-zero-shot-assignment `
  --memory-mode frozen `
  --memory-snapshot mem-v0003

# Optional separate protocol: allow up to three feedback-repair turns.
corepack pnpm core-loop:debug:chipbench:pi `
  --split debug-zero-shot-assignment `
  --functional-repair-iterations 3
```

`debug-baseline-prepare` extracts each prompt's target `TopModule`, compiles it with the locked
reference/testbench, and requires a successful simulation with at least one mismatch. The cache is
bound to the dataset and ordered cases, Provider implementation, compiler capability, VVP binary,
and Debug runner version. A repeated prepare returns `reused: true`; `debug-evaluate` refuses a
missing or stale cache instead of silently rerunning the baseline. The command, profile, fixture
category, and Agent input all record seeded functional Debug. Memory defaults to `off`; seeded Debug
also accepts explicit `frozen` mode plus `--memory-snapshot`, while `read_write` remains rejected.
Its initial repair turn queries `functional_simulation` / `output_mismatch` Memory because the
workspace already contains a baseline-proven buggy design. Frozen Debug may select and inject
Memory but does not summarize or persist Experience and cannot publish a snapshot.
`--functional-repair-iterations` may be set explicitly from 0 to 10 for a separate feedback-repair
experiment; omitting it keeps the Debug default at 0. The normal generation command and prompt-only
Provider remain unchanged.

After the normal candidate-only compile Gate, ChipBench functional evaluation privately
materializes the locked `_ref.sv` and `_test.sv`, compiles candidate/reference/testbench with
Icarus SystemVerilog 2012 using top `tb`, runs VVP under the fixed timeout boundary, and parses the
single `Mismatches: N in M samples` summary. Reference and testbench files remain below the batch's
internal verification tree and are never copied into the Agent workspace or published RTL output.
For the normal VerilogEval and ChipBench CLI, this functional step completes and writes
`_internal/evidence/functional-cases/<case-number>.json` before the next case's Agent turn starts;
on mismatch it may run bounded RTL regeneration, candidate compile, and the same functional
simulation again before sealing the case. `--functional-repair-iterations <0-10>` controls the
maximum extra Agent turns, defaults to 3, and accepts 0 to disable repair. Each simulated candidate
is retained below the run's attempt evidence; Agent feedback contains only bounded mismatch counts
and timing hints, never the hidden reference or testbench. The final batch aggregate keeps backward
compatible evidence and summary schemas. The resulting
`FUNCTIONAL_SIMULATION` evidence is non-authoritative. Configure
`RTL_AGENT_IVERILOG_EXECUTABLE` and optionally `RTL_AGENT_VVP_EXECUTABLE` when the tools are not on
`PATH`.

R02-specific static and live checks are:

```powershell
$env:RTL_AGENT_OPENCODE_EXECUTABLE = '<absolute-native-opencode-executable>'
$env:RTL_AGENT_OPENCODE_VERSION = '<locked-version>'
$env:RTL_AGENT_OPENCODE_MODEL = '<provider/model>'
corepack pnpm core-loop:agent:probe

$env:CORE_LOOP_REAL_AGENT_TEST = '1'
corepack pnpm core-loop:agent:smoke
```

For Kimi Code, set `KIMI_CODE_API_KEY` and use `RTL_AGENT_OPENCODE_MODEL=kimi-code/<model>`, for
example `kimi-code/kimi-for-coding` or `kimi-code/k3`. The direct `rtl-core-loop` CLI also reads
these values from ignored root `.env` and `.env.local` files. A legacy root `kimi=<key>` entry is
not accepted. Only the explicit Agent configuration allowlist is loaded, shell variables take
precedence, and the key value is never serialized into the OpenCode inline configuration or
capability digest. Vitest-based live smoke still requires the variables in the calling process
environment.

Windows requires a regular native `.exe`; `.cmd`/`.bat` launchers and shell mediation are rejected. `agent-probe` must verify exact version, required flags, effective `autoupdate: false`, disabled sharing/snapshot/formatter/LSP, empty MCP/plugin/instructions, deny-only resolved global config, bounded resolved Agent permissions, repository Agent/Skill digests, and the experiment config digest. The explicit smoke uses only generated test data: one allowed Blank Generation turn must return `RTL_CHANGED`, and one test-only Agent must actually receive a denied write result without creating the target. Neither smoke is evaluation evidence. Ordinary `pnpm test` skips both network/model calls. OpenCode may retain its own session DB; shared Core Loop evidence stores neither its host path nor raw JSONL.

The optional Pi backend is parallel to, and does not replace, the OpenCode backend. Configure the
current `@earendil-works/pi-coding-agent` CLI without using an npm-generated `.cmd` shim:

```powershell
$env:RTL_AGENT_PI_EXECUTABLE = (Get-Command node).Source
$env:RTL_AGENT_PI_ENTRYPOINT = '<absolute-path-to-pi-package>\dist\cli.js'
$env:RTL_AGENT_PI_VERSION = '<locked-version>'
$env:RTL_AGENT_PI_PROVIDER = 'kimi-coding'
$env:RTL_AGENT_PI_MODEL = '<model>' # for example 'kimi-for-coding' or 'k3'
$env:KIMI_API_KEY = '<key>' # KIMI_CODE_API_KEY is also accepted and mapped
node .\apps\rtl-core-loop\dist\index.js pi-agent-probe
```

`pi-agent-probe` locks the exact Pi version, JSON/ephemeral/offline flags, isolated configuration,
the explicit `read,write,edit` tool set, the repository path-policy extension, selected guidance,
and experiment configuration. The adapter disables discovered extensions, skills, prompt templates,
context files, project trust, sessions, telemetry, and startup update traffic. Its explicit
extension blocks reads outside `spec.md`, `context/**`, and `rtl/**`; writes and edits are restricted
to supported RTL files below `rtl/**`. The normal post-turn manifest policy remains a second
boundary. Pi itself has no general sandbox, so this bounded adapter must not enable `bash` or
third-party extensions.

All Pi invocations share `.rtl-agent/pi-state`. The adapter records its non-auth semantic file
state as `resolvedConfigDigest` and privately locks the complete file state, including
`auth.json`, for the lifetime of one adapter/batch. Configuration or credential drift during that
lifecycle fails with `PI_AGENT_CAPABILITY_MISMATCH`; credential contents never enter capability or
turn evidence.

Repository-owned Pi resources live under `.pi/`. The adapter reads the exact `read,write,edit`
allowlist from `.pi/capability.json` and explicitly loads
`.pi/extensions/rtl-core-loop-policy.mjs` while automatic resource discovery remains disabled.
The semantic capability plus the path policy participate in `toolPolicyDigest`; invalid or changed
capability configuration fails closed. The extension registers its policy only when the adapter
sets `RTL_AGENT_PI_POLICY_REQUIRED=1`; ordinary manual Pi project discovery therefore leaves it
inactive.

Use the standalone connectivity diagnostic when an operator needs to inspect a custom prompt
outside the dataset flow:

```powershell
corepack pnpm test:pi-connection -- "仅回复 PI_OK"
```

The single file uses Pi's SDK with the repository-pinned `0.81.1` runtime and shared
`.rtl-agent/pi-state`. It disables tools and resource discovery, observes
`before_provider_request` in memory, and prints the actual provider payload followed by Pi's
complete parsed Assistant message. The output can contain complete prompts, reasoning,
signatures, usage, and model responses; do not redirect it into committed evidence or share it
without review.

Windows evidence on 2026-07-23: the locked `0.81.1` probe passed, and
`evaluate --profile verilog-eval-kimi-pi-v1 --cases Prob001` produced
`b-20260723-005` with one compile pass, one functional pass, zero mismatches, zero not-run cases,
zero verification-invalid cases, and completed post-processing.

The generic VerilogEval/Kimi profile requires an explicit selection. Continuous ranges include both
endpoints:

```powershell
corepack pnpm build
node .\apps\rtl-core-loop\dist\index.js evaluate `
  --profile verilog-eval-kimi-v1 `
  --agent opencode `
  --begin Prob001 `
  --end Prob010
```

Sparse selection uses a quoted comma-separated value:

```powershell
node .\apps\rtl-core-loop\dist\index.js evaluate `
  --profile verilog-eval-kimi-v1 `
  --agent opencode `
  --cases "Prob001,Prob005,Prob010"
```

The equivalent Pi evaluation selects the backend explicitly while retaining the generic operator
profile at the CLI boundary:

```powershell
corepack pnpm core-loop:evaluate:pi `
  --begin Prob001 `
  --end Prob010
```

Sparse selection can be run as one build-and-evaluate command:

```powershell
corepack pnpm core-loop:evaluate:pi --cases Prob001
```

For every Pi attempt, the locked extension observes each actual `before_provider_request` payload
without modifying it and each finalized Assistant `message_end`. The adapter validates a bounded
temporary transcript and publishes it at:

```text
.rtl-agent/batches/<batch-id>/_internal/runs/<run-id>/evidence/attempts/<attempt>/provider-transcript.json
```

The file records provider/model identity and every exchange in order because one tool-using turn
can make multiple provider calls. Each exchange contains the final serialized request and Pi's
complete parsed Assistant response, including text/reasoning, tool calls, stop reason, and usage
when supplied by Pi. An interrupted final exchange retains `response: null`. It contains no
captured headers, credentials, or raw streamed HTTP bytes. Batch directories are ignored runtime
evidence; review transcripts before sharing or copying them elsewhere. The extension checks the
64-request and combined 8-MiB limits without silent truncation; request overflow is rejected before
the corresponding provider call, while an oversized response necessarily fails after receipt but
before persistence. Temporary-directory deletion retries three times; a final failure reports
`PROVIDER_CAPTURE_CLEANUP_FAILED` to stderr and in the Pi turn's `localWarnings` without changing
the Agent/RTL outcome.

`--agent` accepts only `opencode` or `pi`. The CLI resolves `--agent pi` to the distinct locked
`verilog-eval-kimi-pi-v1` evidence profile; the legacy explicit Pi profile ID remains accepted for
backward compatibility. An explicit backend that conflicts with a registered profile capability is
rejected before any Agent turn.

Selectors are case-insensitive and may be full IDs or unambiguous prefixes. Range and list modes
are mutually exclusive. The resolved case list is canonicalized to pinned Provider order and bound
into the derived profile before any model turn. The v1 profile uses one Agent attempt per case.
Immediately before each selected case enters the Agent/compile loop, `evaluate` writes
`正在处理 <case-id>... (<current>/<total>)` to stderr. The final machine-readable result remains the
only stdout line and includes `agentBackend`, so progress output does not corrupt JSON consumers.
Every generation Agent turn also receives the complete backend-neutral versioned checklist from
`config/agents/rtl-core-loop/common-guidance.md`. Coverage and I2C coverage turns instead use
`config/agents/rtl-core-loop/coverage-guidance.md`; the command syntax is unchanged. The selected
file's SHA-256 is stored as
`guidanceFileDigest` in the Agent capability and turn evidence, so changing the checklist changes
the resolved profile identity and mid-run drift fails closed. The explicit coverage profile also
participates in the experiment configuration digest. Each guide contains only general
Compile/Logic/Safety advice and must not contain case-specific answers or hidden verification data.

The dedicated I2C experiment accepts a bounded Agent-iteration budget and an optional score
threshold:

```powershell
# Run at most four Agent refinement turns; do not stop just because the score crosses 90.
corepack pnpm core-loop:i2c-coverage --agent pi --iterations 4

# Run at most four turns, but stop when the weighted line/branch score reaches 95.
corepack pnpm core-loop:i2c-coverage --agent pi --iterations 4 --coverage-threshold 95
```

`--iterations` accepts integers from 1 through 10 and defaults to 2. It counts Agent refinement
turns only; the unchanged baseline measurement is coverage round one and is not an Agent turn.
`--coverage-threshold` accepts 0 through 100. When omitted, no score threshold is active. Runs may
still end early when no uncovered targets remain, the measured gain is below the experiment's
minimum-gain rule, required verification assets remain invalid, the Agent fails, or a Verilator
failure exhausts the Agent budget or cannot be repaired safely. A confirmed Verilator simulation
nonzero exit, signal, or timeout is written to
`context/verilator-simulation-feedback-attempt-<n>.json`; when another Agent turn remains, that
turn receives the bounded stdout/stderr and retries the same coverage round after repairing the
mutable verification assets. Failed simulation attempts consume Agent iterations but do not count
as completed coverage rounds. Spawn failures and failures without confirmed process termination
remain terminal because they do not provide a trustworthy repair boundary. The same structured
simulation-repair behavior applies to the existing VerilogEval `coverage` orchestration without
changing its command syntax or three-attempt limit. The result evidence records
`maxAgentIterations` and a nullable `coverageThreshold` so the I2C invocation can be reconstructed.
The iteration and threshold options apply only to `i2c-coverage`; the existing generation and
VerilogEval `coverage` commands retain their current attempt limits and syntax.

After the batch result is published, `evaluate` atomically updates the ignored runtime journal at
`.rtl-agent/knowledge/observed-issues.md`. Compile diagnostics are taken from structured run
observations. Each nonzero mismatch requires an additional restricted diagnosis turn supplied only
with the public `spec.md`, candidate `rtl/`, and mismatch totals. The structured diagnosis must name
a concrete root-cause category, cite at least one candidate RTL line, and state confidence and
limitations. The input also includes per-public-output mismatch counts and first-mismatch times
parsed from the bounded simulation stdout. Complete structured analysis and capability metadata stay
under `_internal/mismatch-analysis/<run-id>/`; the runtime journal publishes only one concise
category/confidence/root-cause conclusion per mismatched case. A missing, generic, malformed, or
input-mutating diagnosis fails with `MISMATCH_ANALYSIS_FAILED` instead of recording an unknown
cause. The Agent receives the exact category/confidence enums and evidence-object contract. One
schema-invalid response receives one bounded correction turn with structured validation issues. A
diagnosis failure is post-processing: it produces a CLI warning and does not replace an already
published batch result. Retry only the existing batch diagnosis without regenerating candidates
with:

```powershell
node .\apps\rtl-core-loop\dist\index.js reanalyze --batch <batch-id> [--analyzer <opencode|pi>]
```

The retry revalidates persisted batch input/result/functional evidence and reuses the existing
public specification and candidate RTL. Without `--analyzer`, it validates
`agent-capability.json` against the batch manifest and uses that persisted generation backend.
`--analyzer` selects a diagnosis backend independently, so a Pi-generated batch may be analyzed by
OpenCode or a historical OpenCode batch may be analyzed by Pi. `evaluate` and `run` accept the same
optional flag and otherwise use their resolved profile backend. The Pi analyzer loads only
`.pi/extensions/rtl-mismatch-analyzer-policy.mjs`, enables `read,edit`, and permits edits only to
`analysis.json`; immutable manifests still reject any specification, context, or RTL change.
The first successful diagnosis for a batch/run is stable evidence. If valid analysis metadata
already exists, `reanalyze` reuses it and does not replace it with a different backend; select
`--analyzer` before that first successful diagnosis.
These diagnosis turns consume additional model quota. The journal workflow never writes
`common-guidance.md`; promotion into prompt guidance requires an explicit operator request and
applies only to later batches.
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

For deterministic I2C mutation replay, validate the control plane before running the fixed suite:

```powershell
corepack pnpm exec vitest run apps/rtl-core-loop/test/mutation-command.test.ts apps/rtl-core-loop/test/cli.test.ts
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
corepack pnpm mutation:run
```

The runner must audit the locked manifest, selection, and 30 patches; gate every verification asset
on a passing golden compile/simulation; use isolated workspaces; and persist apply, compile,
simulation, timeout, termination, and outcome evidence per mutant. Compile-invalid, apply failure,
timeout, infrastructure failure, and not-run are never counted as killed. Raw mutation score uses
only killed plus survived in its denominator. Adjusted score remains unset until equivalence or
unreachability is confirmed by human or formal review. A Windows replay is non-authoritative
same-DUT functional evidence and does not establish Linux Gate readiness or cross-IP generalization.

For Pi Provider request-compatibility changes, validate both the adapter environment and the final
extension hook. A focused regression must prove that the original payload is not mutated, the
captured actual request matches the transformed payload, and non-target Providers do not enable
the behavior. Run the real `pi-agent-probe` after build. If the failure was provider-specific and
intermittent, a completed real Batch with transcript search showing zero recurrences is required
before calling the operational issue fixed; this remains non-authoritative experiment evidence.

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
| Verilator coverage Agent experiment | Focused unit tests plus `RUN_VERILATOR_COVERAGE=1` integration and one real `coverage --case`; result remains non-authoritative and requires human review |
| I2C baseline coverage Agent experiment | Provider/contract/orchestration tests plus a real normalized I2C baseline Verilator round; a real Agent run remains non-authoritative and requires human review |
| Deterministic I2C mutation replay | Focused runner/CLI tests, typecheck, lint, build, three passing golden gates, and complete persisted replay of the locked mutant set; Windows evidence remains non-authoritative and same-DUT only |
| Multi-IP project coverage fixture | Project provider/CLI/orchestration tests, typecheck, lint, build, clean locked source trees, and one real baseline-only golden Verilator run per project; Agent refinement additionally requires a successful Provider canary and remains non-authoritative |

For the locked FIFO, AES, and Scalable Arbiter fixtures, run the deterministic preparation checks
and baseline coverage without a model:

```powershell
corepack pnpm exec vitest run packages/core-loop/test/project-coverage.test.ts apps/rtl-core-loop/test/project-coverage-command.test.ts --config vitest.config.ts
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
corepack pnpm core-loop:project-coverage --project versatile-fifo --iterations 0
corepack pnpm core-loop:project-coverage --project aes-highthroughput-lowarea --iterations 0
corepack pnpm core-loop:project-coverage --project scalable-arbiter --iterations 0
```

The final three commands must be serialized. They validate the locked source bytes, materialize an
isolated protected DUT plus bounded testbench/checker, require golden compile/simulation, and
persist line, branch, toggle, combined-score and process evidence. The cross-project command uses
toggle-inclusive scoring while preserving the legacy I2C default. A baseline-only run is readiness
evidence, not proof that Agent refinement is effective.

## If Validation Cannot Be Run

Record in `.harness/session-log.md`:

- command not run
- reason
- risk
- recommended follow-up

Do not claim full completion without validation evidence.
