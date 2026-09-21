# UART / AES verification-transfer preparation

## Authorized scope (2026-09-17)

Prepare seven new implementations: freecores/uart16550, ZipCPU/wbuart32 (Wishbone),
freecores/osdvu (uart.v), freecores/uart2bus (UART core only), freecores/aes_core,
freecores/tiny_aes (128-bit), freecores/aes-128_pipelined_encryption.
Reuse existing aes_highthroughput_lowarea revision/baseline by reference. FIFO and
its running/recovery campaign remain separate. SPI/I2C/Arbiter additions are deferred.
No source/target assignment before preparation review; use role `unassigned`.
User confirmed 30 single-site mutants per new implementation as a target, with honest
shortfalls rather than padding. No model calls, Memory construction or kill-based selection.

## Plan

1. Download isolated upstream checkouts; lock revisions, consumed files and license evidence.
2. Inspect each top/interface, dependencies and upstream test vectors. Record ancestry risks.
3. Fix one configuration per implementation. AES scope is AES-128 block encryption.
   Respect UART-specific stop-bit and handshake semantics; uart2bus excludes bus bridge.
4. Author bounded deterministic golden TBs with independent expected results; protect DUT bytes.
5. Prepare exclusive diagnostic roots. Run Icarus golden compile/simulation, then Verilator
   golden simulation with native line/branch/toggle coverage. Serialize RTL jobs with existing work.
6. Review executable mutation ranges and fault rationale. Use seed 42, compile-only selection,
   deduplicate candidates and validate selected mutants with Icarus plus Verilator lint.
7. Audit source/TB/patch hashes, deterministic reconstruction and patch applicability. Publish
   per-family manifests and per-IP FIFO-shaped assets only for accepted preparations.
   Keep failed/incomplete candidates visible with reason; no silent substitution or DUT repair.
8. Document usage, limitations, unassigned roles, counts and Windows validation evidence.

## Asset contract

Each accepted IP publishes `manifest.json`, `selection.json`, `golden-source/`,
`golden-tb.sv`, `mutants/M*.patch`, `coverage-summary.json`, `frontend-summary.json`,
license/provenance evidence and an explicit interface/configuration specification.
Preparation evidence stays under `.rtl-agent/`; source checkouts stay under
`.rtl-agent/datasets/verification-transfer/`. Publication directories are exclusive.
Shared fields retain FIFO meanings; family and unassigned role are explicit additions.
Compilation does not prove non-equivalence. No mutation kill or transfer-effect claim.

## Validation

- Focused Node tests for shared preparation/path/determinism guards and existing candidate tests.
- Explicit NodeNext noEmit and focused ESLint for new TypeScript tools.
- Real golden checks and selected-mutant frontend checks described above, with fixed executable
  plus argv, shell:false, bounded execution and persisted process outcomes.
- Publication digest/patch audit, `git diff --check`, `scripts/harness_check.sh`.
- Linux CI/formal Gate is not available in this Windows preparation; record this limitation.

## Status

Published mutation/uart-aes-transfer-v1: seven implementations and 190 mutants.
All seven Icarus/Verilator goldens, all 190 Icarus compile/Verilator lint checks, deterministic
reconstruction and actual patch applications pass. Published manifest/source/TB/patch/artifact
hash audit returns 7 IPs, 190 mutants, pass. Existing AES baseline entries were hash-verified
without rerun. Final counts and coverage appear in exp_result/09.17-uart-aes-preparation-progress.md.

Accepted roots under .rtl-agent/family-prepared are uart16550-v4, wbuart32-v3, osdvu-v1,
uart2bus-uart-v1, aes-core-v1, tiny-aes-v2 and aes-pipeline-v1, fixed by suite.json.
Earlier UART16550 v1/v2/v3, WBUART32 v1/v2 and Tiny AES v1 remain excluded diagnostics.

## Serialization and recovery evidence

An independent FIFO recovery started while dataset coverage was already running. Preparation
paused; denied descendant termination and incomplete Tiny AES v1 evidence were retained.
The old descendants had exited by 16:34. At 21:28 FIFO complete.json listed all eight conditions,
its lock was absent and a read-only process identity audit found no related compiler workload.
The prior pause and resume evidence are archived in .rtl-agent/family-pause-history/.
Subsequent UART16550 v4, Tiny AES v2 and AES Pipeline validations ran serially to completion.
Overlapping historical wall times are not uncontended performance measurements.

family-process.ts now persists stdout/stderr as commands run, claims exclusive ownership,
checks FIFO/pause before and during commands and records boundary failure before terminating
only owned trees. Failed cleanup leaves a blocking marker. Native Windows process tests confirm
owned parent/descendant termination and rejection of a parent-directory workspace. Restricted
Windows taskkill initially could not confirm cleanup; that diagnostic remains retained.

Remaining golden builds used host C++ -O0, Windows libstdc++ ABI0, serial build and a 20-minute
compile boundary. RTL, parameters and coverage instrumentation stayed fixed; UART16550's raw
coverage digest matches the preceding completed profile. Tiny AES and AES Pipeline completed
in approximately 133 and 136 seconds. This is a compilation profile, not a performance result.

The user-authorized uart-aes heartbeat is stopped after the completed publication and report.

## Commands and use

All commands run from the repository root. `probe`, `prepare` and `coverage` refuse to run
while the pause marker exists. Output roots must be new; keep failures for diagnosis.
The fixture generator is a preparation-time authoring tool, not a command to rerun on frozen
published assets. Its checked-in configs/TBs lock the seven implementations and scope.

```powershell
node --test tools/mutation/fifo-candidates.test.ts tools/mutation/family-preparation.test.ts tools/mutation/family-process.test.ts
node tools/mutation/family-publication.ts audit-published mutation/uart-aes-transfer-v1
```

The completed preparation commands were `prepare <config> <new-preparation-root>` then
`coverage <preparation-root>` through family-preparation.ts, followed by family-publication.ts
`audit-prepared .rtl-agent/family-patch-audits/uart-aes-v1` and
`publish mutation/uart-aes-transfer-v1`. Those output roots now exist and must not be reused.
For a separately authorized rebuild, choose new roots and bind its suite/review/audit consistently;
the current publication tool's audit root is explicitly fixed to this reviewed v1 dataset.

`suite.json` identifies the accepted preparation roots; audit/publication must wait until every
listed root and its required review/coverage evidence is complete. Create missing parent
directories with native filesystem APIs, without deleting or replacing existing output roots.
Published per-IP layout follows FIFO: manifest, golden-source, golden-tb, mutants, selection,
frontend and coverage summaries. Family manifests group implementations; roles remain
`unassigned` and source/target arrays remain empty until a later experimental split is chosen.
The existing FIFO-specific experiment runner is not a UART/AES provider: model-loop integration
is a separate stage and is not claimed by this dataset preparation.

Upstream raw hashes are retained as `upstreamSourceHashes` and `upstreamMutatedDigest`.
Published `sourceHashes` and `mutatedDigest` bind LF-normalized files per `.gitattributes`.
Actual patch audit checks reconstruction against those normalized published bytes. This only
normalizes line endings and must not change RTL tokens. License/source notices and provenance
are retained. WBUART32 includes ufifo ancestry shared with the FIFO family; UART2BUS records
its c16 UART origin. Repository membership alone does not establish independent ancestry.

OSDVU's 10-mutant shortfall is relative to the unchanged FIFO lexical operators and reviewed
executable ranges, not a claim that no other meaningful fault can be constructed. No padding,
kill-based filtering, mutation simulation, transfer-effect result or formal non-equivalence
proof is part of this preparation. All current execution evidence is Windows-only.
