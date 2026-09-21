# K3 source-only verification Memory pipeline

Run from the repository root, with Node24 and the existing pinned Pi0.81.1 installation:

```powershell
corepack pnpm verification:memory prepare unique-audit-name
corepack pnpm verification:memory build unique-build-name
```

`prepare` never calls a model. `build` performs four independent source calls followed by one
consolidation call, all using kimi-coding/k3. Output directories are exclusive under
`.rtl-agent/verification-memory/`; names cannot contain paths. The build lock prevents overlapping
Memory builders; operators must also check no Generation/Debug/coverage/replay job is active.
After a crash, inspect the recorded PID before manually removing a stale lock. No automatic retry.

Inputs are the four locked source runs in verification-source-input.ts. The collector retains
complete response prose and allowlisted TB/checker writes/edits, observed process/coverage feedback,
and per-attempt source asset snapshots (including DUT context). Thinking and repeated provider
request envelopes are excluded. No mutation replay, target evidence or assistant-curated report
is read. Historical Versatile has no captured baseline snapshot: full edits and the final workspace
are labeled as such, never presented as a captured baseline. Other snapshots are digest-verified.
Logical paths reject traversal and redirects. Oversized inputs fail rather than silently truncate.

Each stage uses an isolated in-memory Pi session, no tools, context files, skills or user extensions.
The configured and returned model must be k3, with no fallback. Credentials enter the runtime only;
prompts/payloads/responses, returned usage/cost, actual model and wall time are retained per call.
Responses must finish normally. A 15-minute deadline requests cancellation. Invalid output leaves
diagnostic evidence and failure.json; no manifest is published. No result is synthesized by Codex.

Experience fields: id, title, trigger, strategy, applicability, limitations, confidence, evidenceIds.
Extraction references must resolve within that source and include trajectory plus observed evidence.
Consolidation references resolve to Experiences, preserving provenance transitively. There is no fixed
item count. All four sources must contribute; losing an entire source fails validation. Snapshot
manifest is written last and binds item and Experience digests plus source-bundle digests.
Published status remains PENDING_HUMAN_REVIEW: reference existence is mechanically verified, but
semantic accuracy, numerical claims and causal interpretation still require review. It is dishonest
to equate schema/reference validation with proof of factual correctness.

This is a separate verification snapshot schema, not the old RTL Memory store. Selector integration
and target evaluation are not part of this command. No new experiments or stop-rule changes occur.
Future mutation-guided source experiences must be separately versioned.

Validation:

```powershell
node --test tools/mutation/verification-memory.test.ts tools/mutation/verification-source-input.test.ts
corepack pnpm exec tsc --ignoreConfig --noEmit --types node --target ES2023 --module NodeNext --moduleResolution NodeNext --allowImportingTsExtensions --strict --skipLibCheck tools/mutation/verification-memory.ts tools/mutation/verification-memory-run.ts tools/mutation/verification-memory.test.ts
corepack pnpm exec eslint tools/mutation/verification-memory.ts tools/mutation/verification-memory-run.ts tools/mutation/verification-memory.test.ts
corepack pnpm build
```

Synthetic model tests validate mechanics only. The real K3 build is separate integration evidence;
Windows validation does not establish Linux readiness or formal RTL Gate acceptance.
