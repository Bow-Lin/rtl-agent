# R04 — 实现有限修复循环与 Core Loop 评测

## 任务索引

- 权威进度：以 `docs/task-breakdown.md` 为准
- 进入条件：R02 与 R03 已完成真实 smoke/integration 证据；执行真实 batch 前已选定、审查并锁定一个 dataset adapter 与 evaluation profile
- 前置任务：R01、R02、R03
- 后续决策：继续优化 Core Loop、增加固定 TB/仿真，或恢复 A04 正式可信路线
- 进度与验收证据登记位置：`docs/task-breakdown.md`、`.harness/session-log.md`

## 目标

把 R01 的 fixture、R02 的受限 Agent turn 和 R03 的固定 compile adapter 串成一个有限循环：

```text
materialize fixture
  → baseline compile
  → Agent edit
  → fixed compile
  → structured compiler feedback
  → Agent repair（最多 maxAttempts - 1 次）
  → final result + batch metrics
```

R04 的交付重点不是“做出一个小型正式工作流”，而是用可重复证据回答产品假设：Agent 是否能从 spec 生成可编译 RTL，首次失败后是否能利用真实 compiler diagnostics 收敛，失败主要出在哪里。

## 范围

### 必须实现

- `packages/core-loop` 中的单 fixture/batch orchestration、evaluation profile、evidence writer 和指标逻辑；`apps/rtl-core-loop` 只提供薄 CLI 命令解析与调用。
- baseline compile、最多 3 次 Agent edit/compile attempt 和固定停止条件。
- 每轮完整 agent input、RTL before/after、workspace manifest、Agent process result 和 compile result证据。
- compile feedback写回下一轮 `context/agent-input.json`。
- run final result、batch summary、指标计算和人工审查清单。
- 对 operator-selected dataset selection 执行一次锁定 batch 评测；样本数和 split 由预先登记的 evaluation profile 决定。
- final pass 的独立 recompile确认。
- 输出 `docs/experiments/spec-to-rtl-core-loop-report.md`，记录数据、失败分类、限制和下一步建议。
- 在 `docs/decisions.md` 记录 Core Loop checkpoint结论；不自动修改正式 workflow state。

### 非目标

- 不加入 SQLite、Command Executor、daemon、MCP、review、snapshot、lease、outbox或正式 Gate。
- 不运行 testbench、仿真、reference model、coverage或 formal property。
- 不让 Agent修改 compiler profile、评测脚本、spec、fixture或证据。
- 不无限重试，不在失败时自动换模型、换 compiler、放宽 permission或增加 max attempts。
- 不从 compile pass推导 spec符合性或 RTL功能正确。
- 不在 R04 完成后自动开始 A04；必须先由用户根据报告选择路线。

## CLI 与配置

建议提供两个明确入口：

```text
rtl-core-loop run --profile <evaluation-profile-id> --case <case-id>
rtl-core-loop evaluate --profile <evaluation-profile-id>
```

允许的用户输入只有 repository-known evaluation profile/case ID和可选结果展示格式。以下变量属于 operator-owned锁定配置，不允许从 normalized fixture、spec、Agent或普通 run flags覆盖：

- OpenCode executable/version/provider/model
- Icarus executable/version/profile/timeout
- Agent turn timeout
- evaluation profile 引用的 `CoreLoopRunProfile.maxAttempts`（R01 schema 已限制为 1–3）
- output/issue limits
- permission配置
- dataset provider/adapter version、dataset ID/version/split、case selection、样本数与顺序

如需对比模型或参数，创建新的命名 evaluation profile和独立 batch ID，不在同一 batch中途变更。

## Batch Preflight 与单 Run 状态机

R04 分成 `BATCH_PREFLIGHT` 和 `RUN_EVALUATION`。在第一个 Agent turn 前，preflight 必须：

1. 验证 evaluation profile、dataset descriptor、selection 和 Provider/adapter identity。
2. probe 并锁定 R02 effective capability 与 R03 compiler capability。
3. 按固定顺序列出并物化全部 selected cases 到 batch-owned run roots。
4. 在 batch input manifest 中保存完整 ordered case refs、物化成功项的 normalized fixture digests，并锁定 ordered case IDs 与 manifest digest。
5. 对全部物化成功的 case 执行 blank/seeded baseline validation。

preflight 结束后不再访问 Provider。无效 case 写 batch-level `case-validation-result.json`，不执行 Agent，也不产生 `FinalResult`。物化失败的 case 不创建 run；已物化但 baseline 无效的 run 只保留 preflight evidence，不成为完成的 evaluation run。

R04 只在 `packages/core-loop` 内部使用一个小型显式状态，不复用或修改 A03 正式 `DomainState`：

```text
MATERIALIZING
BASELINE_PREPARING
BASELINE_COMPILING
AGENT_RUNNING
AGENT_VALIDATING
COMPILE_PREPARING
COMPILING
FINAL_RECOMPILING
COMPLETED
```

`COMPILE_PASSED | MAX_ATTEMPTS | AGENT_FAILED | TOOL_ERROR | TIMEOUT | POLICY_VIOLATION | NO_RTL_CHANGE` 是 final outcome，不与执行状态混用。状态以只追加、带 sequence 的本地 evidence JSON 保存。它不是 durable workflow，不要求 crash resume；进程中断或缺少必需 evidence 的 run 使用独立 `INCOMPLETE` execution result，由 batch 计入 infrastructure-invalid，并把受全局终止影响的后续 case 计为 not-executed；不能继续追加到旧 run。

## 执行算法

### 1. Preflight 物化与 baseline

1. 通过 R01 `FixtureProvider` 一次性解析全部 dataset cases 并校验锁定 evaluation profile/provenance。
2. R01 materialize 全部 normalized fixtures、batch-owned run workspaces 和 evidence 目录；全部成功或失败状态都在第一个 Agent turn 前确定。
3. 写入 immutable-for-Agent 的 run request、normalized fixture metadata、dataset provenance 和 baseline manifest。
4. 每个 fixture 使用 `attempt: 0` 调用 R03 request-builder并保存 `compile-preparation.json`；只有 `CompilePreparationResult.status === "READY"` 才取出严格 `CompileRequest` 并调用 compiler、保存 `compile-result.json`。blank fixture 没有 source file，预期得到 `NO_RTL_SOURCE`，不构造空请求也不启动 compiler。
5. baseline 只用于描述起点，不占用 Agent attempt。`compile-result.json` 是 compiler 实际启动后的条件必需证据，不能用伪造结果占位。

对于 `BLANK_GENERATION` 和 `PROMPTED_FUNCTIONAL_REPAIR`，`NO_RTL_SOURCE` preparation result 是预期起点，不是 `CompileResult`，也不算工具故障；后者的 buggy RTL 位于 prompt 中，当前 compile pass 不证明功能修复。对于 `SEEDED_COMPILE_REPAIR`，任何 preparation failure 都说明 case normalization 或 batch 输入无效；若 compiler 返回 `COMPILE_PASSED`，同样说明 case normalization 无效，而不是 Agent 成功。有效 seeded baseline 必须为 `COMPILE_ERROR`；baseline 的 `TIMEOUT`/`TOOL_ERROR` 使 batch/run 基础设施无效。

### 2. Agent/compile attempts

执行 `CreateRunRequest.profile.maxAttempts` 指定的 Agent turn 总数；该值来自锁定的 `CoreLoopRunProfile`，R01 schema 已限制为 1–3。第一次生成/编辑是 attempt 1，后续 repair 最多 `maxAttempts - 1` 次，baseline attempt 0 不计入。`FinalResult.attemptCount` 是已启动 Agent turn 的数量；即使某 turn timeout/error 也计数。`NormalizedFixture` 不含 `maxAttempts`，evaluation profile 只能引用完整 run profile，不能另设覆盖值。

1. 写严格的 `AgentAttemptInput` 到 `context/agent-input.json`。blank fixture 的第一次 attempt 省略 `previousCompileResultPath`；seeded fixture 的第一次 attempt 引用 baseline `CompileResult`，后续 attempt 引用上一轮结果。被引用结果的有界脱敏副本写入 `context/previous-compile-result.json`。
2. 保存 attempt开始前 workspace manifest与 `rtl-before/**` 副本。
3. 通过 R02 启动一个全新 OpenCode session。
4. 保存严格 `AgentTurnResult`、turn 后 manifest 与 `rtl-after/**` 副本；不持久化 raw JSONL、reasoning、完整 Assistant text 或 tool arguments/results。
5. 穷举 R02 outcome：`POLICY_VIOLATION`、`NO_RTL_CHANGE`、`AGENT_PROCESS_ERROR`、`AGENT_TIMEOUT` 立即按停止表结束；只有 `RTL_CHANGED` 进入 compile preparation。R02 已拥有 workspace/process priority，R04 不重新解释原始 process evidence。
6. 用 R03 request-builder 发现 source 并保存严格 `CompilePreparationResult`。只有 `READY` 才取出 `CompileRequest` 并调用 compiler。Agent turn 后的 `NO_RTL_SOURCE` 结束为 `AGENT_FAILED`；`UNSUPPORTED_INCLUDE_DIRECTIVE` 或 `SOURCE_POLICY_VIOLATION` 结束为 `POLICY_VIOLATION`。所有 preparation failure 都保存 compiler-not-invoked evidence，不伪造 `CompileRequest` 或 `CompileResult`；request 建立后的 manifest mismatch 由 compile adapter 返回 `TOOL_ERROR`。
7. 首次 `COMPILE_PASSED` 时进入 `FINAL_RECOMPILING`：重新执行 preparation、构造新的 `CompileRequest`、确认 profile/tool/version/top/manifest identity 未漂移，再调用 compiler。只有第二次也为 `COMPILE_PASSED` 才结束为 `COMPILE_PASSED`。第二次 `COMPILE_ERROR`、preparation failure 或 manifest/identity mismatch 均结束为 `TOOL_ERROR`；第二次 `TIMEOUT`/`TOOL_ERROR` 保持对应终态，不增加 Agent attempt。
8. `COMPILE_ERROR` 且仍有attempt时，把结构化结果反馈给下一轮。
9. `COMPILE_ERROR` 且已达上限时结束为 `MAX_ATTEMPTS`。
10. `TIMEOUT`/`TOOL_ERROR` 立即结束，不让Agent通过改RTL“修复”基础设施。

每轮都是新 Agent session，避免依赖 OpenCode session resume 语义。上下文完整来自当前 workspace、spec 和 `previousCompileResultPath` 指向的只读反馈文件。

## 停止条件

| 观察结果 | Final outcome | 是否继续 Agent |
|---|---|---|
| compile pass 且独立 recompile pass | `COMPILE_PASSED` | 否 |
| 已达到 `maxAttempts` 上限仍 compile error | `MAX_ATTEMPTS` | 否 |
| Agent process error | `AGENT_FAILED` | 否 |
| Agent 或 compiler timeout | `TIMEOUT` | 否 |
| compiler/tool adapter error或version漂移 | `TOOL_ERROR` | 否 |
| Agent turn 后没有 `.sv`/`.v` source | `AGENT_FAILED` | 否 |
| Agent turn 后出现 include 或 source policy violation | `POLICY_VIOLATION` | 否，workspace作废 |
| 非 `rtl/**` 变化 | `POLICY_VIOLATION` | 否，workspace作废 |
| Agent正常退出但RTL digest未变化 | `NO_RTL_CHANGE` | 否 |
| compile error且还有attempt | 仍在运行 | 是 |

不允许“再试一次看看”、自动增加token/timeout、切换model/compiler或忽略 policy violation。

`final-result.json` 必须严格通过 R01 `FinalResultSchema`，包含 `runId`、fixture display/structured identity、normalized fixture digest、profile/compiler identity、锁定 tool version、attempt count、可信 final RTL manifest digest 和 canonical start/completion time。所有 outcome 都重复 `authoritative: false` 与 `claim: "COMPILE_ONLY"`；不能增加 `ABORTED`、人工审查分类或 batch 状态作为 `FinalResult.outcome`。

`final-result.json` 是 run completion marker，必须在全部分支必需 evidence 成功提交后最后写入。若 evidence writer 失败、final workspace 无法安全扫描、进程中断或 final result 自身写入失败，run 保持 incomplete，由 batch 报告单独分类；不能为使 schema 通过而把 last-known manifest 冒充 final workspace，也不能用 `TOOL_ERROR` 伪装 evidence-incomplete run。

## Evidence Layout

每个 run 至少保存：

```text
evidence/
  run-request.json
  fixture.json
  dataset-provenance.json
  baseline-manifest.json
  states/
    0001.json
  baseline/
    compile-preparation.json
    compile-result.json           # 仅 READY 且 compiler 实际启动后存在
  attempts/
    1/
      agent-input.json
      previous-compile-result.json  # 存在 baseline/上一轮 CompileResult 时
      workspace-before-manifest.json
      rtl-before/**
      agent-turn-result.json
      workspace-after-manifest.json
      rtl-after/**
      compile/
        preparation.json
        result.json               # 仅 READY 且 compiler 实际启动后存在
      final-recompile/
        preparation.json          # 仅首次 compile pass 后存在
        result.json               # 仅 READY 且 compiler 实际启动后存在
    2/**
    3/**
  final-rtl-manifest.json
  final-result.json
```

这些证据位于 `.rtl-agent/` 并被 gitignore。它们用于本地实验复盘，不是 immutable snapshot或审计级记录。正式报告只提交汇总、dataset/selection/normalized fixture/batch digest、工具/model版本和必要的脱敏错误分类，不提交完整prompt、spec、RTL、reference answer、hidden tests或reasoning。

JSON evidence 使用同目录临时文件、完整写入后 exclusive atomic publication；run/batch 目录禁止覆盖旧 ID。`final-result.json` 最后写。若 output 因上限截断，证据明确记录。证据完整性根据实际分支的 expected file set 验证；缺少任一分支必需文件的 run 不作为完成 run，应记为 harness/infrastructure-invalid 并单独报告。

## Batch Evaluation

R04 不内置任何具体 case 清单。执行前创建一个版本化 evaluation profile，引用已审查的 `FixtureProvider` 与 dataset selection，并预先锁定：

- evaluation profile digest
- provider/adapter ID、version 与 repository/operator-locked implementation digest
- dataset ID/version/source digest/license reference
- split、selection rule、预期 case count 与 ordered case IDs digest
- 期望的 OpenCode/version/provider/model 与 Agent/Skill/effective config/permission/experiment digests
- 期望的 Icarus executable digest/version/profile digest
- `CoreLoopRunProfile`（含 maxAttempts、compiler profile 与 output/issue limits）和 timeouts
- checkpoint thresholds 与人工抽样规则

preflight 实际 probe/materialization 后另记录每个 normalized fixture content digest、ordered case IDs digest、batch input manifest digest 和 batch 开始/结束时间。probe 结果必须与 profile 期望值严格匹配；每个 Agent turn 的 capability digests 也必须与 preflight lock 一致。

按 evaluation profile 固定顺序执行 cases；首版可串行，避免并发引入rate limit、workspace和日志交叉影响。某个run失败不阻止后续case，除非发现全局 `TOOL_ERROR`、dataset/provider/version漂移或配置损坏；此时batch终止并标记invalid。

未配置 dataset/provider 时，CLI 必须返回 `DATASET_NOT_CONFIGURED` 或等价稳定诊断。不得回退到仓库内置样例、临时 smoke input 或自动下载的最新数据集。

## 指标

报告至少包含：

| 指标 | 定义 |
|---|---|
| raw first-attempt compile rate | attempt 1 compile pass且独立recompile确认的evaluation-valid case比例 |
| raw within-max-attempts compile rate | 在profile的`maxAttempts`内最终pass且独立recompile确认的evaluation-valid case比例 |
| repair recovery rate | 第一次Agent后compile fail的case中，后续attempt恢复pass的比例 |
| review-accepted repair recovery rate | repair recovery中未被预登记人工检查拒绝的比例 |
| review-accepted first-attempt rate | raw first-attempt中通过预登记人工检查的比例 |
| review-accepted within-max-attempts rate | raw within-max-attempts中通过预登记人工检查的比例 |
| median attempts to pass | pass case所需Agent turn中位数 |
| median wall time | 每个有效run总时长中位数 |
| policy violation count | 越界写run数量 |
| no-change count | Agent正常退出但RTL未变化数量 |
| Agent/process/timeout count | Agent失败、Agent timeout与post-Agent compile timeout数量，仍属于evaluation failure |
| infrastructure-invalid count | capability/dataset/baseline tool/evidence/orchestrator失败数量 |
| diagnostic path/line/path+line coverage | Agent attempt compiler issues中对应字段成功提取的分子/分母 |

通过 preflight 并开始正式 Agent evaluation 的 case 都进入能力指标分母，除非之后有独立于 Agent 输出的基础设施无效证据。`POLICY_VIOLATION`、`NO_RTL_CHANGE`、`AGENT_FAILED`、Agent timeout 和 post-Agent compile timeout 都是 evaluation failure，不能从分母移除。baseline tool failure、capability/provider/dataset drift、evidence failure和 orchestrator crash 是 infrastructure-invalid，不进入能力分母；全局终止后尚未运行的 case 记为 not-executed。

所有比例同时报告分子/分母，不能只给百分比。指标分别报告 `BLANK_GENERATION`、`PROMPTED_FUNCTIONAL_REPAIR`、`SEEDED_COMPILE_REPAIR` 和 overall；若 `maxAttempts` 不是 3，不得把指标命名为 within-3。`PROMPTED_FUNCTIONAL_REPAIR` 的 pass 仍然只是 compile pass，不能解释为功能修复。人工拒绝不改写原始 R03 result，只影响对应 first-attempt、within-max-attempts、repair-recovery 的 review-accepted/checkpoint numerator。人工复核样本未完成时不能发布最终 review artifact。对样本量小和非确定性作显式说明。

## Checkpoint 判定

Core Loop 进入下一能力层的判定规则必须在 evaluation profile 中随 dataset selection 一起预先登记，不能看完结果后调整。至少包括：

1. 有效 case 的最低数量、split 和类别覆盖；理由应来自所选数据集，而不是在 Core Loop contract 中硬编码统一样本数。
2. first-attempt、within-max-attempts 和 repair recovery 的目标值及最小分母；样本不足时只能报告 inconclusive。
3. 若第一次 Agent 后存在 compile fail case，repair recovery 必须报告实际分子/分母；若没有此类 case，标记 `N/A`，不能虚构 100%。
4. 0 次 policy violation，0 次 compiler profile/spec/normalized fixture/dataset source 修改。
5. 所有 final pass 都通过独立 recompile，profile/version、`workspaceManifestDigest` 与 final RTL manifest identity 一致。
6. 所有有效 run 证据和 dataset provenance 完整，tool/timeout failure 单独解释。
7. 人工快速检查抽样规则预先登记，pass case 没有通过改 top、删接口、空实现或明显违背 spec 来规避 compile 错误。

这些阈值只决定“基本生成/编译修复能力值得继续投资”，不决定 RTL功能正确或正式系统可信。

Checkpoint输出三选一建议：

- `PROCEED_TO_FUNCTIONAL_VALIDATION`：基本loop有效，下一步优先增加固定TB/仿真能力，再恢复必要可信边界。
- `REFINE_CORE_LOOP_ONCE`：失败集中在一个可验证的prompt/protocol/diagnostic问题，允许一个有明确假设的R02/R03修订批次。
- `STOP_OR_RETHINK`：能力信号弱、越界或基础设施不稳定，不继续堆正式控制平面来掩盖核心问题。

无论结论为何，恢复A04或新增功能验证任务都需要用户明确决定。

## 人工审查清单

对每个 final pass快速检查：

- top module名、端口名/方向/宽度与spec一致。
- clock/reset edge和reset值没有明显相反。
- 没有删除功能、用常量/空模块逃避compile错误的明显迹象。
- 没有新增非RTL文件、compiler directive绕过或修改评测资产。
- report明确说明未运行TB/仿真，人工检查也不是功能证明。

人工发现明显规避时，该 run 在报告中标记 `COMPILE_PASS_BUT_REVIEW_REJECTED`，不能计入 checkpoint pass numerator；原始 R03 compile result 仍保持 `COMPILE_PASSED`，不要篡改工具证据。

## 实现步骤

1. 在 `packages/core-loop` 定义 Core Loop run state、严格 `FinalResult` 组装和 evidence writer；薄 CLI 不持有 orchestration 规则。
2. 实现baseline compile和attempt loop，所有分支显式停止。
3. 接入R02/R03 adapter，确保只有 `COMPILE_ERROR` 进入下一repair。
4. 实现RTL before/after副本、manifest与final recompile。
5. 实现 single-run 和 batch CLI、evaluation profile/dataset selection lock 与指标汇总。
6. 使用fake adapters穷举停止条件和off-by-one attempt测试。
7. 在用户选定并审查评测数据集后，通过其 provider 执行真实 OpenCode + Icarus 锁定 batch；R04 不自带 case 清单。
8. 完成人工审查与 `docs/experiments/spec-to-rtl-core-loop-report.md`。
9. 在 `docs/decisions.md` 登记三选一checkpoint建议，等待用户选择。

## 测试要求

- baseline compile总是在第一次Agent turn前运行并保存。
- max attempts 无 off-by-one，严格读取 `CreateRunRequest.profile.maxAttempts` 且永不超过 3；normalized fixture 和 CLI flag 都不能覆盖。
- 每个 attempt 使用新 session，并收到严格 `AgentAttemptInput` 与 path 引用的 previous compile result。
- 只有 `COMPILE_ERROR` 会触发下一轮；timeout/tool error/policy/no-change立即停止。
- Agent exit 0不产生pass；必须由R03 pass + 独立recompile确认。
- 越界写优先于process outcome，污染workspace不再编译。
- evidence-complete且final workspace可安全扫描的终态写严格final result；evidence失败、unscannable或中断run保持incomplete且不混入有效batch。
- batch 固定 dataset/provider/selection/evaluation profile/model/compiler，检测中途 version 或 config digest 漂移。
- 未配置 provider/dataset 时 fail closed；test-only smoke input 不得进入 batch。
- metric分子/分母和N/A语义正确；invalid run不悄悄当compile failure。
- fake adapter 覆盖 0、1、2、3 轮 `COMPILE_PASSED`、持续 fail、Agent error、timeout、tool error、policy violation 和 no-change。
- 真实 batch 使用预先锁定的 external dataset selection 并生成报告；case count 与成功阈值来自 evaluation profile。

## 验证命令

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm --filter @rtl-agent/core-loop --fail-if-no-match test
corepack pnpm --filter @rtl-agent/rtl-core-loop --fail-if-no-match test
corepack pnpm test
corepack pnpm build
corepack pnpm format:check
corepack pnpm peers check
git diff --check
& 'C:\Program Files\Git\bin\bash.exe' scripts/harness_check.sh
```

真实评测命令由实现时固定，例如：

```powershell
corepack pnpm --filter @rtl-agent/rtl-core-loop exec rtl-core-loop evaluate --profile <evaluation-profile-id>
```

如果最终bin/script名称不同，必须在 `docs/verification.md` 记录唯一受支持入口，不能依赖手工逐步操作。

## 完成定义

- 单run有限循环和所有停止分支通过自动测试。
- 用户选定的 dataset/provider/evaluation profile 已锁定，真实 OpenCode + Icarus batch 已执行且 provenance/证据完整。
- final pass全部由fixed compile和独立recompile确认，0越界写。
- 报告同时给出成功、失败、样本限制和人工审查结果，不宣称功能正确。
- `docs/decisions.md` 有明确的 `PROCEED_TO_FUNCTIONAL_VALIDATION | REFINE_CORE_LOOP_ONCE | STOP_OR_RETHINK` 建议。
- breakdown中R04标记 `DONE` 后暂停，等待用户选择下一任务。

## 实现交接内容

Session Log 记录 dataset/provider/version/implementation digest/license reference、selection/evaluation profile digest、case 分子分母、first/within-max-attempts/recovery指标、attempt/time统计、policy/no-change/tool failure、OpenCode/model/Icarus版本、人工审查拒绝项、报告路径和下一步建议。不得仅记录一个总成功率。

2026-07-20 已选择并接入 NVlabs VerilogEval v2 `spec-to-rtl`：固定 commit、archive/content/Provider digests、156-case catalog 与 MIT reference 均记录在 `core-loop/fixtures/verilog-eval-v2.lock.json`。数据通过 TypeScript preparation 写入 ignored cache，不使用 submodule；Provider 只物化 prompt，隐藏 reference/testbench。该接入已通过真实 archive prepare、156-case discovery、全仓测试和真实 Icarus 回归，但仍不构成真实 batch 指标。下一步必须先登记最终 license-review disposition 和 versioned EvaluationProfile。

2026-07-20 以相同的固定 archive/cache/Provider 边界接入 ChipBench commit `74fe7d283225ae030ef59326a06111c9d372b48e`。三个 `Verilog Gen` split 提供 45 个 `BLANK_GENERATION` case；八个 `Verilog Debugging` split 提供 178 个 `PROMPTED_FUNCTIONAL_REPAIR` case。调试 case 的 buggy RTL 位于 prompt 内，没有独立 starter baseline；其 timing/assignment/arithmetic/state-machine 功能是否修复不能由 R03 compile pass 证明。Ref Model Gen、Tool_Box 和上游执行脚本仍不提取、不执行。锁元数据位于 `core-loop/fixtures/chipbench.lock.json`。
