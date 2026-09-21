# 指定原文 Memory10 后执行：有限开发诊断

## Material Passport

- Origin Skill: academic-research-suite / experiment-agent
- Origin Mode: run (existing user research design; repository implementation)
- Origin Date: 2026-09-18
- Verification Status: UNVERIFIED (pre-execution protocol)
- Version Label: directed_memory10_v1

## 问题与范围

先审计已有任务、结构覆盖评分及 NO_MEANINGFUL_GAIN 的边界，再回答：当实验者把
原 v1 第 10 条明确指定为当前工作项，Agent 能否自行判断适用性、映射并正确实现？
停止原固定 v1 全量注入加通用核对的扩展。本协议是新开发诊断，不改 A/B/C/D 结果。
dpretet/M010 已用于设计调优；指定策略及只保留一条同时改变了任务优先级和上下文，
因此不能将差异单独归因于自主选择，不能当作端到端迁移或独立 target 的收益。

## 固定输入与干预

- 冻结 k3-build-20260917-100104 的原始 items.json 与 manifest.json。
- 按 ID `consol-mid-reset-assert` 选原列表第 10 条，保留所有字段和字符串原文。
  不重新抽取、不改写 source 的触发、策略、适用条件、限制或证据。
- 只注入此项，保留当前 target 契约和 runner 规则优先的说明。其余 12 条不注入。
- 在原始 spec 后追加一个固定工作项：判断此策略对当前 DUT、固定配置及初始验证环境
  的适用性并落实；baseline 已有或不适用需要代码依据；必要新增需完成 target 映射、
  实现及执行证据核对。此追加内容在首个 Agent turn 前生成，全程不变。
- 同一工作项也放在 Memory context 的原 advisory 之后、原条目之前，确保首请求直接
  包含指定工作要求。两处文字完全相同，记为这一整体干预，不声称只改变注入位置。
- 同一工作项也放在 Memory context 的原 advisory 之后、原条目之前，确保首请求直接
  包含指定工作要求。两处文字完全相同，记为这一整体干预，不声称只改变注入位置。
- 除原 Memory 自带内容外，不提供 target 答案；不提供 C3 代码、下降沿采样答案、
  具体检查时刻、M010 信息或之前实验的成功/失败轨迹。评价端信息不可进入生成上下文。
- 独立入口和适配器，不修改旧 97 个冻结运行文件，不更改核心提示、能力边界、评分或停止。

## 预算与选择

一次固定批次 E1/E2/E3，各从原相同 dpretet baseline 重新开始，串行运行。
三次仅用于检查重复发生的实现路径，不作成功率精确估计、显著性或稳定性证明。
同 Kimi coding K3 配置、权限、固定 DUT 和最多 3 个 Agent turn，保留原提前停止规则。
指定指令消耗原预算，不追加纠错调用。首轮实际 request 应完整包含唯一 Memory 和工作项；
若工作项放在 spec，也需审计真实 read 返回内容；记录未读但不静默重跑。
不根据中间结果改提示，不挑最好版本，不补做失败样本。最后尝试无合规快照时保留失败。
全部三次 terminal 后封存最终选择，才做独立 golden/M010。生成结束后不再给 Agent 反馈。

## 判定与失败边界

首要指标沿用原语义契约：在复位有效、输出已按 DUT 契约更新且复位尚未释放的窗口，
实际检查 full/empty 的合法复位值；有代码、执行证据且 golden 通过。
不限定检查在某个绝对时刻或使用某种边沿，不按断言数量或 Agent 自述计分。
M010 raw kill 单列，释放后的全局 FULL_AND_EMPTY 不等于正确落实此策略。
缺少执行证据为未确认；必要检查缺失、错误适用性判断、语义/采样错误、替代性质、
违规生成、provider/基础设施故障分别记录，失败消耗保留，不混成一个错误类别。
不添加评价专用缺失断言；若需额外观测，先记录未确认，不能静默改写最终资产。

普通 terminal 生成失败计入固定分母；provider/进程/边界异常暂停队列，先保留原始证据
和进程所有权以便检查，不自动重试。未完成进程清理时不得启动后续 RTL。
现有每次 provider/compile/simulation deadline 继续生效，记录 PID、实时日志与终态。

## 实施与验证顺序

1. 只读审计 spec、实际 Pi 提示、coverage score、无增益保留、停止语义及 Memory11/12。
2. 新增单策略 wrapper、独立 target CLI、三次固定队列、仅三次 seal 的独立评价入口。
3. Node 聚焦测试检查原文保真、上下文隔离、输入/权限不变、末次选择与封存前禁评价；
   显式 NodeNext noEmit、ESLint、Prettier、git diff --check、harness_check。
4. 预先绑定旧 97 文件、冻结 Memory、suite、baseline/spec/config 哈希，新输出路径必须不存在。
5. 真实生成三次后审计 provider 原始请求、turn/工具执行、权限与 coverage domain；封存。
6. 独立串行回放最终 golden/M010，审查语义、采样调度与实际执行，报告分母 3 和消耗。

预计入口：`node tools/mutation/fifo-directed-campaign.ts <label>`；评价入口：
`node tools/mutation/evaluate-fifo-directed.ts <label>`，工作目录为仓库根。
产物：`.rtl-agent/fifo-directed-campaigns/<label>`、对应 fifo-target-runs、
`.rtl-agent/fifo-directed-evaluations/<label>` 与 exp_result 的审计/结果报告。
这是 Windows 非权威实验；不建立 Linux/formal Gate 就绪，Linux 行为验证仍需单独完成。

本批标签固定为 `fifo-directed-memory10-20260918-v1`。生成与评价分别使用上述入口和此标签。
指定工作项逐字文本由 `tools/mutation/verification-directed-memory.ts` 的
`DIRECTED_WORK_ITEM` 导出，内容、选中条目及 103 个运行文件摘要写入启动前 plan。
验证命令采用本地已锁定依赖：`node --test` 三个新 `.test.ts`；
`node node_modules/typescript/bin/tsc --ignoreConfig --noEmit --types node --target ES2023 --module NodeNext --moduleResolution NodeNext --allowImportingTsExtensions --strict --skipLibCheck`
加七个新 TS 文件；ESLint/Prettier 的本地 CLI；`bash --login scripts/harness_check.sh`。

本批标签固定为 `fifo-directed-memory10-20260918-v1`。生成与评价分别使用上述入口和此标签。
指定工作项逐字文本由 `tools/mutation/verification-directed-memory.ts` 的
`DIRECTED_WORK_ITEM` 导出，内容、选中条目及 103 个运行文件摘要写入启动前 plan。
验证命令采用本地已锁定依赖：`node --test` 三个新 `.test.ts`；
`node node_modules/typescript/bin/tsc --ignoreConfig --noEmit --types node --target ES2023 --module NodeNext --moduleResolution NodeNext --allowImportingTsExtensions --strict --skipLibCheck`
加七个新 TS 文件；ESLint/Prettier 的本地 CLI；`bash --login scripts/harness_check.sh`。

## 停止点与解释

只完成这一固定批次和证据审查，随后停止围绕 M010 改提示。
多次成功仅支持“明确指定动作后的原文具备可用性”；失败则按映射、窗口、替代性质、
误判已有等可见证据分类，不推断隐藏思考。不能断言原先失败只由选择导致。
未来系统可将结构覆盖探索与检查缺口发现设为独立工作项，但本轮不同时修改核心闭环。
新的使用机制必须另行冻结，对 off/Memory 同等任务权限预算，并在未参与调优的 target 评价。
