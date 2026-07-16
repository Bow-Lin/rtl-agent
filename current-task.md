# Current Task

## Goal

Complete R02 as one restricted OpenCode turn boundary that can generate or repair RTL inside an R01 run without compiling it or trusting Agent self-report.

## Current Status

Completed on Windows with official native OpenCode `1.18.2`. The locked final live-smoke model was `opencode/deepseek-v4-flash-free`; it is test-only and does not select the R04 evaluation model. Static capability probe, one allowed Blank Generation turn, and one actual denied-write probe all passed.

R02 now owns the repository Agent/Skill, strict turn/result contracts, trusted config isolation, resolved config and Agent-permission validation, fixed `shell: false` argv, process-tree timeout, bounded event/stderr projection, RTL file postconditions and per-attempt evidence. It does not invoke a compiler, continue sessions, implement repair policy, or claim functional correctness.

The guarded commit reviews found and repaired two evidence-boundary defects. Termination commands and the final child `close` wait now have hard deadlines; an unconfirmed tree termination returns `AGENT_PROCESS_ERROR`, while only a confirmed tree shutdown returns ordinary `AGENT_TIMEOUT`. Non-empty executable prefix arguments now participate in the experiment digest, so different actual argv cannot share that identity.

## Scope Completed

- extended `AgentAttemptInput` with sorted, collision-safe `rtlSourceFiles` and context-bound prior compile results
- added `.opencode/agents/rtl-core-loop.md` and `.opencode/skills/rtl-core-loop/SKILL.md`
- added strict `OpenCodeCapability` and `AgentTurnResult` contracts
- isolated caller config while loading the repository-owned `.opencode` directory
- validated native executable, exact version, required flags, resolved deny-only config and final Agent permission rules
- bound config, permission, Agent, Skill and experiment digests into every turn result
- snapshotted mutable operator config structures and bound ordered non-empty executable prefix arguments into the experiment digest
- used fixed argv, `shell: false`, bounded JSON event projection and sanitized stderr
- killed complete process trees on timeout and checked workspace stability before manifests
- bounded graceful/forced termination commands and final close confirmation without swallowing failures
- allowed only bounded `.sv/.v/.svh/.vh` content below RTL with at least one compile unit
- added `agent-probe` CLI and explicit gated real smoke command
- covered fake success/no-change/process-error/timeout/policy/config drift and real allowed/denied behavior

## Validation Evidence

- native OpenCode `1.18.2` capability probe: passed
- final real model: `opencode/deepseek-v4-flash-free`
- resolved config digest: `sha256:fe6b3e25e59b50e9bcaf80a86c0d82e56efd22499d94e42697715758bf84558e`
- resolved Agent permission digest: `sha256:a208dd5b82acee15f30abadf90b64aca34edc8328a7470ceeb0c666706683814`
- Agent digest: `sha256:df3b8e9b50c4a4288af26ae4c20ea8564f45fd830dbae36ebd0a6393f35eb40d`
- Skill digest: `sha256:332d820382b10f5fcf90ae6d2f00d8a02e44385c7099dfbe1833137e75564655`
- experiment digest: `sha256:f48d66d8bfb9eac5193e0e17bc9e319ba91798afbd2339b4228c11af4b274313`
- explicit real smoke: 2 tests passed (allowed `RTL_CHANGED`; actual denied write produced error and no file)
- deterministic validation after guarded fixes: 42 Core Loop tests passed / 2 real-smoke tests skipped; 145 repository tests passed / 2 skipped
- configured native OpenCode `1.18.2` capability probe passed again with unchanged digests
- full repository validation: see final session log entry

## Retention and Risk

- OpenCode retains its own local session database. R02 verifies that it exists but never stores its host path in shared evidence.
- Core Loop evidence does not persist raw JSONL, reasoning, full model text, tool arguments/results or resolved config.
- Real smoke uses generated test data and is not evaluation evidence.
- R02 does not establish Linux readiness or RTL functional correctness.

## Next 3 Steps

1. Implement R03 against `CompileRequest`/`CompileResult` with a fixed Icarus profile.
2. Keep R02 and R03 independent until R04 composes their public adapters.
3. Select and review a dataset/provider, evaluation profile and formal model only before R04 batch execution.

## Last Updated

2026-07-16T11:16:13+08:00
