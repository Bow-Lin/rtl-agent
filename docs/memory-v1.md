# RTL Agent Memory V1 Contract

## 目标与边界

Memory V1 验证一个最小假设：从 Memory-build Batch 的成功 Case 轨迹中生成 Experience，
在 Batch 结束后把跨 Case 的共性合并为冻结 Memory，再用于新的 Case，是否能够改善 RTL
初次生成或 functional mismatch repair。

V1 只支持 Pi。Memory Store、Selector、Experience 和 Consolidator 的数据结构保持后端无关，
以后支持 OpenCode 时只增加 adapter。V1 不引入 SQLite、向量检索、embedding、confidence、
失败经验学习、自动 skill promotion 或在线 continual learning。

Memory 和 Experience 都不是正式 Gate 证据。当前 VerilogEval/ChipBench compile 与 functional
simulation 结果仍然是 `authoritative: false` 的本地实验结果。

## Batch 隔离模型

长期 Memory 只在 Batch 边界更新。Batch 开始时固定 snapshot `M_n`，Batch 内的所有 Case
始终从 `M_n` 读取：

```text
M_n
 ├─ Case 1 → E_1
 ├─ Case 2 → E_2
 ├─ ...
 └─ Case N → E_N
                ↓
         Batch Consolidation
                ↓
              M_n+1
```

Case 开始前，Selector 从 `M_n` 选择一次 Memory，辅助初次 RTL 生成。每次 functional
mismatch 后，Selector 根据同一个 `M_n` 和最新 mismatch feedback 重新选择，辅助下一次
repair。Case 结束时只生成 Experience Record，不修改 `M_n`，也不让该 Experience 进入当前
Case 或同一 Batch 的其他 Case。只有 Batch 全部 Case 结束后，Consolidator 才能读取本 Batch
的 Experience，并尝试发布 `M_n+1`。

Batch 内禁止读取 `M_n` 之后生成的任何 snapshot。Case A 的 Experience 不得影响 Case B；
一个 Case 新产生的信息也不得在该 Case 内重新作为 Memory 加载。

## 运行模式

Memory 模式是实验身份的一部分，只允许以下三个值：

| 模式 | Memory selection | Experience | Snapshot 更新 |
| --- | --- | --- | --- |
| `off` | 禁止 | 禁止 | 禁止 |
| `read_write` | 从 Batch 固定的 `M_n` 读取 | Case End 生成 | Batch End consolidation 后发布 `M_n+1` |
| `frozen` | 从显式指定的 snapshot 读取 | 可作为 Batch 内隔离证据生成 | 禁止 |

正式 held-out evaluation 默认使用 `frozen`。`frozen` 中生成的 Experience 只能留在当前
Batch evidence 下用于复盘，不能进入 Memory-build Experience Pool，也不能触发 consolidation。

运行身份至少记录：Memory mode、snapshot ID、snapshot SHA-256、Selector/Experience/
Consolidator prompt digest、Pi provider/model/capability identity、最大选择数以及允许产生
Memory 的 build split 配置。`off` 不绑定 snapshot。

## Experience Record

Experience Summarizer 在 Case 完成后总结已落盘的事实，不负责提出可复用规则，也不直接
写长期 Memory。Experience schema version 固定为 1，允许无法可靠判断的字段为空或
`unknown`，不为补标签增加分类模型。

最小结构为：

```yaml
schema_version: 1
source:
  dataset:
  split:
  case_id:
outcome:
circuit_type:
language:
tool:
failure:
  stage:
  failure_type:
  symptom:
diagnosis:
repair:
verification:
```

`dataset`、`split` 和 `case_id` 只表示 provenance，不构成 Memory scope。通用过滤字段使用
`stage`、`circuit_type`、`failure_type`、`language` 和 `tool`；Provider 无法可靠提供的字段
保持为空或 `unknown`。

First-try functional pass 可以生成普通 Experience，用于后续发现 `design_rule`、
`coding_idiom` 等共性，但不能生成 `simulation_debug` Experience。

`simulation_debug` 采用高 precision 准入规则，只有以下闭环可以进入 Memory-build
Experience Pool：

```text
functional mismatch
→ repair
→ compile passed
→ simulation passed
```

以下轨迹保留原始运行 evidence，但不生成可参与 consolidation 的 `simulation_debug`
Experience：

- mismatch 后耗尽 repair 次数；
- repair 后 compile fail；
- 最终 simulation 仍失败；
- simulation infrastructure invalid；
- harness、timeout 或 environment failure；
- 根因无法确认。

Experience Summarizer 失败不能改变 Case 的 compile/functional outcome。失败应写入有界状态
evidence，该 Case 不产生可用于 consolidation 的 Experience。

`simulation_debug` 的语义拒绝也必须可审计。`ROOT_CAUSE_UNCONFIRMED` 需要指出缺失的是
“初始缺陷未被公开 spec 否定”、“最终修复无法与缺陷关联”或“最终 compile/simulation 未
通过”中的哪一项，并附有界说明；不接受无解释的默认拒绝。

Summarizer workspace 同时绑定 prompt digest 和请求 digest。两个 digest 组合后再计算一个
完整 SHA-256 作为目录身份，metadata 仍分别记录原始 prompt/request digest。这样同一 Run
可以保留不同 prompt 版本的结果而不覆盖旧 evidence，也避免在 Windows 上嵌套两个完整
digest 导致路径过长。

## Memory 内容与禁止项

VerilogEval、ChipBench 和未来的 CVDP 共用一套 Memory schema。每条长期 Memory 是一个
Markdown 文件，正文只包含：

- Trigger；
- 问题模式；
- 诊断原则；
- 修复原则；
- 适用条件；
- 验证方法。

Memory 和 Experience 都不得保存或转述以下内容：

- 完整题目；
- hidden reference；
- testbench 或具体 testcase；
- golden RTL 或 case-specific solution；
- 没有必要保留的 signal/state 名字；
- 足以明显还原原 Case 答案的信息。

Memory 是参考经验，不是强约束。注入文本必须明确：当前 `spec.md`、真实 compiler feedback
和真实 simulation feedback 的优先级高于 Memory。

## Selector

Selector 先按 `stage`、`circuit_type`、`failure_type`、`language` 和 `tool` 做简单确定性
过滤，再让 Pi 从过滤后的 catalog 中选择。V1 不使用 embedding 或 vector retrieval。

Selector 最多返回 3 条 Memory，允许返回 0 条，不需要凑满。输出只包含当前 snapshot 中
存在的 Memory ID。解析失败、Pi 调用失败或没有合适结果时按 0 Memory 继续，不能阻塞
Case。

V1 的已知 `stage` 过滤值固定为 `initial_generation` 和 `functional_simulation`。Consolidator
对 first-pass `design_observation` 使用前者，对 `simulation_debug` 使用后者；确实无法确定或
一条规则同时适用两阶段时使用空值或 `unknown`。Memory 侧的空值和 `unknown` 在确定性过滤
中视为通配信息。Snapshot catalog 和 Consolidator 的新 ADD/MERGE 都不接受其他自由字符串，
避免写入侧标签与读取侧查询不在同一命名空间而使 Memory 永远无法命中。V1 不持续兼容早期
实验快照中的其他 stage。

初次生成和 mismatch repair 分别执行选择。Repair selection 使用最新 mismatch feedback，
但仍然只能读取 Batch 固定的 `M_n`。

编排器把选中的内容渲染成独立的 `Relevant RTL Memory` context block。对于当前 Pi
adapter，选择在 Pi 进程外完成，`before_agent_start` 只注入本次 bounded turn 的 block。
不使用 `context` hook 在每次 provider request 前重复注入，也不修改 Pi core。当前 Pi
0.81.1 的本地安装已确认支持这两个 extension event。

## Batch Memory Consolidator

Consolidator 在 `read_write` Batch 结束后读取 `M_n` 的 catalog/content 与本 Batch eligible
Experiences，输出以下操作：

| 操作 | 含义 |
| --- | --- |
| `ADD` | 新的、可泛化的长期 Memory |
| `MERGE` | 为已有 Memory 补充 trigger、scope 或 guidance |
| `REINFORCE` | 多个 Case 再次支持已有 Memory，只追加 Evidence |
| `REJECT` | 内容太具体、太弱、重复或无法泛化 |
| `CONFLICT` | 与已有 Memory 明显冲突；V1 记录冲突，不自动覆盖 |

Consolidator 根据 catalog 做语义判断，不使用固定字符串 dedup key。单个 Batch 默认最多
`ADD` 5 条新长期 Memory；`MERGE` 和 `REINFORCE` 不占此额度。

Consolidation 失败时不得发布半成品 snapshot，也不得修改 `M_n`。Batch 的原始评测结果
保持不变，但 Memory update 必须明确记录为失败，调用方不能宣称 Memory-build 成功。

## 文件布局与 Snapshot

Memory 使用现有忽略目录 `.rtl-agent/`，不引入数据库。V1 固定使用以下布局：

```text
.rtl-agent/memory/
├─ snapshots/
│  └─ mem-v0001/
│     ├─ manifest.json
│     ├─ catalog.json
│     └─ items/
│        └─ memory-000001.md
├─ experiences/
│  └─ <batch-id>/
│     └─ <case-number>.json
└─ consolidations/
   └─ <batch-id>/
      └─ result.json
```

Snapshot ID 使用单调顺序号 `mem-v0001`、`mem-v0002`。首个 Memory-build Batch 可以从空的
`mem-v0001` 开始。Memory item ID 使用 lineage 内单调编号，只提供稳定引用，不承担语义
去重。

`manifest.json` 至少记录：

```yaml
schema_version: 1
snapshot_id:
parent_snapshot:
source_batch:
memory_count:
sha256:
```

SHA-256 覆盖规范化 catalog 和全部 Memory item 内容，用于完整性检查与实验复现，不作为
snapshot ID。新 snapshot 先写入 staging 目录，全部 schema、引用和 digest 校验通过后再
原子发布；已有 snapshot 不得覆盖。

## 数据污染边界

正式协议固定为：

```text
Build Set
   ↓
Experience Pool
   ↓
Batch Consolidation
   ↓
Frozen Snapshot
   ↓
Held-out Evaluation
```

只有实验配置显式指定的 Memory-build split 可以为正式 evaluation 析出 snapshot。不同
split 是否允许读取由实验配置明确声明，不从 dataset 名称推断。允许
`VerilogEval-build → Memory → VerilogEval-heldout`，也允许
`VerilogEval-build → Memory → CVDP`。Dataset 只作为 provenance，因此跨数据集读取不需要
另一套 Memory 系统。

`VerilogEval-test Case 1 → 更新 Memory → VerilogEval-test Case 2` 不属于 V1 frozen
evaluation protocol。若以后研究 online continual learning，必须使用独立模式和实验身份。

## 实现与回归顺序

完整单 Case Pi 回归依赖 Experience Record，因此实现顺序固定为：

1. 实现后端无关的 Experience schema、eligibility 判定和 Pi Experience Summarizer；
2. 用空的固定 snapshot 运行一个明确属于 Memory-build scope 的真实 Case；
3. 验证 `initial RTL → mismatch → Pi feedback repair → compile pass → simulation pass`；
4. 验证 Experience 正确总结 failure、diagnosis、repair 和 verification；
5. 验证 Experience 在当前 Case 和同一 Batch 内不可见，snapshot 只在 Batch End 变化；
6. 回归通过后，再实现 Store、Selector 和 Batch Consolidator 的完整 V1 路径。

真实 Case 应从已有 evidence 中选择一个稳定 mismatch、规模小且预期可由公开 feedback
修复的 Build Set Case。该回归会产生模型调用和新的忽略目录 evidence，执行前记录所用
case、snapshot、Pi capability、prompt digest 和 repair budget。

## 当前实现入口

`run` 和 `evaluate` 已支持：

```text
--memory-mode <off|read_write|frozen>
--memory-snapshot <mem-vNNNN>
--memory-build-splits <dataset:split,...>
```

通用 CLI 为保持现有实验兼容性默认 `off`，不会根据 dataset 或 split 名称猜测 held-out
身份。正式 held-out 调用方必须显式传 `frozen` 和 snapshot；`read_write` 必须显式列出当前
build split。Memory V1 active mode 只接受 Pi profile。

实现层已包含 audited Experience/Selector/Consolidator read、Case End publication、filesystem
Store、确定性过滤、Pi Selector、单次 `before_agent_start` 注入、Batch Consolidator 和原子
snapshot publication。
单元/集成测试覆盖成功与失败边界。真实 `read_write` Batch `b-20260810-009` 从空的
`mem-v0001` 成功发布 `mem-v0002`；后续读取回放发现其模型生成的自由 stage `design` 与
查询 stage 不一致。收紧 stage 协议后，`b-20260810-011` 作为一次实验迁移通过 MERGE 发布
canonical `mem-v0003`。Frozen Batch `b-20260810-012` 固定读取 `mem-v0003`，Selector 审计确认读取
`spec.md` 和过滤后的 catalog，返回 `memory-000001`；attempt evidence 与 Provider transcript
确认该 Memory 作为独立 advisory context 注入，最终 compile 和 functional simulation 均
通过。所有这些本地回放均为 `authoritative: false`，只证明 Memory V1 编排闭环。
