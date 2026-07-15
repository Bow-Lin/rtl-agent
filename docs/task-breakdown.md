# RTL Agent Implementation Task Breakdown

状态：Ordered implementation plan  
依据：`docs/rtl-agent-high-level-design.md`  
原则：任务按依赖顺序执行；一个任务只有在验收条件满足后才进入下一项

## 1. 执行规则

Phase A 和 Phase B 构成第一条可信纵向闭环，必须严格按顺序执行。Phase C 在 Compile Gate 稳定后增加验证环境；Phase D 处理观测与执行隔离；Phase E 只有触发条件出现后才启动。

每个任务应形成一个小型、可审查的变更集。任务内可以包含代码、测试和必要文档，但不能顺带实现后续任务。发现 HLD 与实现冲突时，先更新 `docs/decisions.md`，再继续编码。

当前仓库尚无包管理和测试脚本。A01 必须建立并验证以下统一命令；后续任务默认使用它们：

```text
<pm> lint
<pm> typecheck
<pm> test
<pm> build
```

文中的“专项测试”必须接入 `<pm> test`，不能成为开发者本地才能运行的孤立脚本。

任务状态只在本文维护，详细实现文档不作为进度事实来源。状态枚举为：`NOT_STARTED`、`IN_PROGRESS`、`BLOCKED`、`DONE`。只有代码、测试、统一验证命令和 Session Log 证据均满足任务验收时，才能标记 `DONE`。

## 2. Phase A：状态机、常驻服务与审核边界

### A01 — 建立 TypeScript Workspace 与质量基线

**状态**：`NOT_STARTED`；可执行，当前序列中的第一项。

**实现文档**：[A01 — TypeScript Workspace](tasks/A01-typescript-workspace.md)

**验收证据**：尚无。

**目标**：创建最小 monorepo，选定并记录 Node.js LTS、包管理器、锁文件、TypeScript strict、格式化、lint、Vitest 和 build 方式。

**交付物**：workspace manifest、lockfile、共享 tsconfig、`apps/workflow-daemon`、`apps/workflow-cli`、`packages/domain`、`packages/contracts`、`packages/storage`、空测试样例、Windows/Linux CI matrix 和 CI-ready scripts。

**验收**：四条统一命令均能在 Windows 和 Linux 的干净 checkout 中成功；没有业务逻辑；依赖固定到具体版本；`@modelcontextprotocol/sdk` 初始锁定 v1.29.0；Git checkout 后的换行符合 `.gitattributes`。

### A02 — 定义跨层 Contract 与稳定错误模型

**状态**：`NOT_STARTED`；等待 A01。

**实现文档**：[A02 — Contracts and Errors](tasks/A02-contracts-and-errors.md)

**验收证据**：尚无。

**依赖**：A01。

**目标**：建立 task、stage、status、command、event、review、ID、state version、idempotency key 和错误码的 Zod schema 与 TypeScript 类型。

**交付物**：版本化 contracts、canonical JSON 规则、schema parse/serialize 测试、错误响应 envelope。

**验收**：非法 enum、缺失字段、未知 schema version 和非规范 ID 被拒绝；JSON round-trip 保持语义；domain 不依赖 MCP、SQLite 或 Node process API。

### A03 — 实现纯领域状态机

**状态**：`NOT_STARTED`；等待 A02。

**实现文档**：[A03 — Domain State Machine](tasks/A03-domain-state-machine.md)

**验收证据**：尚无。

**依赖**：A02。

**目标**：用纯函数实现 Phase A 的 stage/status、command → event、event → state 和 transition table。

**交付物**：domain reducer、合法转换表、非法转换错误、state-version 更新规则、表驱动单元测试。

**验收**：所有转换分支有测试；未知事件和非法转换 fail closed；相同初始状态与事件序列产生相同结果；测试不访问数据库和文件系统。

### A04 — 建立 SQLite Schema 与 Migration 框架

**状态**：`NOT_STARTED`；等待 A03。

**实现文档**：[A04 — SQLite Storage](tasks/A04-sqlite-storage.md)

**验收证据**：尚无。

**依赖**：A03。

**目标**：实现 `tasks`、`stage_attempts`、`reviews`、`workflow_events`、`idempotency_keys` 和 `outbox` 的首版 schema 与 migration runner。

**交付物**：migration、repository interface、SQLite adapter、启动 PRAGMA 检查。

**验收**：启用 WAL、foreign keys、busy timeout 和 `synchronous=FULL`；数据库路径必须是本机文件系统；空库可升级；重复 migration 无副作用；外键和唯一约束测试通过。

### A05 — 实现单一 Command Executor

**状态**：`NOT_STARTED`；等待 A04。

**实现文档**：[A05 — Command Executor](tasks/A05-command-executor.md)

**验收证据**：尚无。

**依赖**：A04。

**目标**：所有领域写入统一经过 Command Executor，在一个短事务中完成读版本、执行 reducer、写 projection、追加 event、登记 outbox 和幂等结果。

**交付物**：Command Executor、transaction abstraction、compare-and-swap、idempotency conflict 处理。

**验收**：相同 key/相同 payload 返回原结果；相同 key/不同 payload 返回 `IDEMPOTENCY_CONFLICT`；并发修改只能有一个成功；事务内没有文件、网络或长时间操作。

### A06 — 建立本地结构化日志与 Correlation

**依赖**：A05。

**目标**：记录 command received、state transition、review created/completed、workflow paused 和错误事件，并实现字段 allowlist。

**交付物**：结构化 logger、correlation-id middleware、敏感字段过滤测试。

**验收**：日志包含 task/state/stage/attempt/correlation 信息；不记录规格、源码、reasoning、secret 或完整 command payload；日志失败不改变事务结果。

### A07 — 实现 Workflow Daemon 生命周期

**依赖**：A05、A06。

**目标**：创建独立常驻进程，提供 single-instance lock、配置加载、health/readiness、优雅关闭和本地访问 token。

**交付物**：daemon entry point、lifecycle manager、PID/lock 策略、启动诊断。

**验收**：重复启动被安全拒绝；只监听 `127.0.0.1`；关闭时停止接收新 command 并完成/释放现有短事务；Daemon 重启后可从 SQLite 恢复任务。

### A08 — 接入 Loopback Remote MCP

**依赖**：A07。

**目标**：实现 MCP adapter，并暴露 `workflow_start`、`workflow_status`、`workflow_get_stage`。

**交付物**：MCP transport、tool schema、domain error 映射、token 校验、tool discovery 测试。

**验收**：MCP 层不包含领域规则；非法 workspace/state version 返回稳定错误；OpenCode 连接断开不会终止 Daemon；重新连接后可读取原任务。

### A09 — 实现 Review Domain Service

**依赖**：A05、A08。

**目标**：实现 `workflow_request_review`，生成 review ID、一次性 nonce、有限 decision enum，并绑定 task/state/snapshot 或 manifest digest。

**交付物**：review repository、request command、review event、幂等和冲突规则。

**验收**：Agent 只能创建 review；不存在 submit-review MCP Tool；过期 state version、错误 nonce、非法 decision 和重复冲突决定都被拒绝。

### A10 — 实现用户 Review CLI

**依赖**：A09。

**目标**：实现 `rtl-workflow review`，从用户通道读取 pending review、展示绑定内容并提交真实决定。

**交付物**：CLI list/show/decide、TTY confirmation、OS user 审计字段、非交互测试接口。

**验收**：CLI 显示 review type、stage、digest、summary 和 allowed decisions；相同决定幂等；冲突决定失败；Agent MCP credentials 不能调用 CLI 内部 decision endpoint。

### A11 — Phase A 恢复与边界验收

**依赖**：A01–A10。

**目标**：建立 Phase A integration suite，证明状态、daemon 生命周期和审核边界成立。

**交付物**：进程重启、OpenCode/MCP 断连、并发 command、重复 review、数据库锁等待和损坏配置测试。

**验收**：OpenCode 退出不影响任务；Daemon 重启恢复；只有用户 CLI 能批准；所有统一验证命令通过；Phase A 验收证据写入 session log。

## 3. Phase B：不可变 Compile Gate

### B01 — 定义最小 Compile Workflow Contract

**依赖**：A11。

**目标**：定义 SPEC_FREEZE → RTL_IMPLEMENTATION → COMPILE → COMPLETED 的 Stage Contract、gate profile、artifact rule 和 issue code。

**交付物**：版本化 stage/gate 配置 schema、fixture 配置、配置一致性测试。

**验收**：mutable/immutable paths、required artifacts、toolchain 和 timeout 均由服务端配置决定；Agent 请求中不存在选择正式 target/seed/tool 参数的字段。

### B02 — 实现 Workspace Manifest Scanner

**依赖**：B01。

**目标**：规范化扫描 tracked、untracked、声明的 ignored 文件、mode、symlink、submodule 和锁文件。

**交付物**：canonical path scanner、manifest schema、稳定排序与哈希测试。

**验收**：相同内容产生相同 manifest；路径逃逸、特殊文件、未声明 submodule 和越界 symlink 被拒绝；Git Diff 仅作为展示数据。

### B03 — 实现本地 Immutable SnapshotStore

**依赖**：B02。

**目标**：使用 staging、完整校验、原子 rename 和发布后只读目录建立首版 SnapshotStore。

**交付物**：publish/get/verify、orphan 回收、故障注入点。

**验收**：半成品 snapshot 不可见；相同 digest 内容一致；发布后修改被检测；在复制和 rename 各阶段杀进程后可以恢复或回收；不实现全局 CAS 去重。

### B04 — 实现四层 Gate Identity

**依赖**：B01、B03。

**目标**：分别计算 `snapshot_digest`、`gate_input_digest`、`gate_run_id` 和 `gate_result_digest`。

**交付物**：canonical digest library、identity schemas、cache-policy contract。

**验收**：只改变 gate profile 不改变 snapshot digest；任一工具链/seed/resource 配置变化都会改变 gate input；每次执行拥有独立 run ID；结果 artifact 变化会改变 result digest。

### B05 — 实现 Artifact、Schema 与 Path Policy Checker

**依赖**：B03、B04。

**目标**：在不可变 snapshot 上实现低成本前置 Checker，并输出稳定 issue code。

**交付物**：checker interface、artifact/schema/path implementations、结果聚合规则。

**验收**：Checker 不读取可变 workspace；forbidden path、缺失 artifact 和 schema failure 可复现；后续 Checker 的 skip reason 被记录。

### B06 — 实现 Gate Job、Outbox 与 Lease

**依赖**：A05、B04。

**目标**：扩展 `snapshots`、`gate_runs` 和 job outbox，实现 pending/leased/running/终态及 lease recovery。

**交付物**：migration、job dispatcher、lease renewal/expiry、重复消费保护。

**验收**：同一 job 并发领取只有一个成功；Worker 崩溃后 lease 可恢复；重复消费不重复推进；数据库事务中不运行 Checker。

### B07 — 实现固定 Compile Runner

**依赖**：B05、B06。

**目标**：选择 Verilator 或 Icarus 作为首个固定 adapter，用 executable + argv 执行服务端 profile。

**交付物**：runner adapter、timeout/process-tree termination、日志摘要、result manifest。

**验收**：不接受 shell string；Agent 不能覆盖 executable/argv/timeout；Linux 上的成功、编译错误、超时、进程崩溃和日志截断均产生结构化结果；Windows 调用正式 Runner 返回 `LINUX_GATE_REQUIRED`，不能伪装成 Preflight 或成功 Gate。

### B08 — 实现 Result Ingestion 与 Superseded 语义

**依赖**：B06、B07。

**目标**：Worker 通过 Daemon Command Executor 提交结果，验证 task/stage/attempt/snapshot/gate input/status 后事务性路由。

**交付物**：result command、gate result event、自动转换、superseded/cancelled/infra_error 处理。

**验收**：过期结果只存审计记录；任务取消、阶段重开或新 snapshot 出现后旧结果不能推进；重复结果幂等；Worker 无数据库写权限。

### B09 — 暴露 Gate MCP Tools

**依赖**：B03、B08。

**目标**：实现 `workflow_preflight`、`workflow_request_gate` 和 `workflow_gate_status`。

**交付物**：MCP schemas、异步状态响应、结构化 issue 返回。

**验收**：preflight 始终标记非权威且不改变状态；request gate 只接受当前 Stage Contract；长时间 compile 不占用 MCP 连接；status 可在重连后继续查询。

### B10 — 接入 OpenCode 配置与 RTL Engineer 协议

**依赖**：B09。

**目标**：建立 OpenCode Remote MCP 配置、rtl-engineer Prompt 和最小 Skills，只包含当前纵向闭环所需控制规则。

**交付物**：`opencode.jsonc`、Agent Prompt、spec/implementation/failure-triage Skills、权限规则。

**验收**：Agent 看不到 review decision、管理操作和任意 runner 工具；不能写 workflow DB/snapshot/result store；只有 `workflow_status=completed` 才能声明完成。

### B11 — Phase B 对抗、并发与崩溃验收

**依赖**：B01–B10。

**目标**：用最小 RTL fixture 证明可信 Compile Gate。

**交付物**：端到端测试、symlink/untracked/ignored/submodule 测试、Gate 运行期间修改 workspace、双重 request、Worker/Daemon kill-point 测试。

**验收**：正式结果始终绑定不可变 snapshot；竞态只产生一个有效推进；旧结果 superseded；服务重启后任务继续；Windows 完成控制平面和 Preflight 验证，Linux CI 产生正式 Compile Gate 证据；Phase B 所有统一验证命令和 harness 通过。

## 4. Phase C：验证环境、冻结与修复闭环

### C01 — 扩展完整阶段与验证数据模型

**依赖**：B11。

定义 VERIFICATION_PLAN、VERIFICATION_ENV、VERIFICATION_REVIEW、VERIFY_AND_REPAIR、VERIFICATION_CHALLENGE 和 REGRESSION_REVIEW，以及 verification manifest、test point、Oracle、SVA、coverage policy schema。验收要求是迁移兼容既有 Phase B task，所有新增转换有表驱动测试。

### C02 — 实现验证资产 Checker

**依赖**：C01。

实现 verification plan 完整性、checkpoint-to-test 映射、TB/Oracle/SVA artifact 与 schema Checker。验收要求是缺失测试、无主 checkpoint 和非法 Oracle 配置拥有稳定 issue code。

### C03 — 实现固定 Simulation Runner

**依赖**：C02。

先使用项目明确需要的固定仿真入口，实现 smoke/full regression、seed policy、失败用例和首失败周期解析。只有 fixture 确实需要 cocotb/pytest/reference model 时才添加一个固定 Python Adapter；不得设计通用插件系统。

### C04 — 实现 Verification Freeze

**依赖**：C02、C03。

生成 verification manifest digest，通过用户 Review CLI 审批，并在 RTL/repair Gate 中强制校验。验收要求是 TB/Oracle/SVA/profile 的任何变化都会撤销 approval 和旧结果。

### C05 — 实现确定性 Failure Routing

**依赖**：C04。

建立 issue code owner、优先级、默认阶段和 unknown fail-closed 规则。验收要求是多 issue 顺序稳定，Agent 不能提交 failure category 或目标阶段。

### C06 — 实现 Verification Challenge

**依赖**：C05。

允许 Agent 提交结构化证据请求重开 Oracle/TB/spec，由用户 CLI 批准或拒绝。验收要求是批准会撤销相应下游 approval，拒绝后任务继续 RTL 修复，重复 decision 幂等。

### C07 — 实现 Coverage 与最终审核

**依赖**：C05、C06。

实现 coverage gate、coverage gap triage、最终 regression review 和 completed 转换。验收要求是 Agent 无法调整 threshold，任务只在最终用户审核事务成功后 completed。

### C08 — Phase C 端到端 RTL 修复验收

**依赖**：C01–C07。

使用至少一个会经历编译失败、仿真失败、RTL 修复和最终通过的 fixture，并增加一次 Verification Challenge 场景。验收要求是 verification freeze 始终有效，修改测试不能伪造通过，回归身份可复现。

## 5. Phase D：脱敏观测与执行硬化

### D01 — 实现 Gate Sandbox

**依赖**：C08。

以容器或独立 OS 用户运行 Gate，限制网络、环境变量、CPU、内存、时间和输出。验收要求是 Runner 无法写 workspace、DB 或 snapshot store，进程树可完全终止。

### D02 — 定义 Telemetry Schema 与 Redaction

**依赖**：C08。

实现 `disabled | metadata_only | full_session_self_hosted` 配置和 metadata allowlist。验收要求是默认 metadata-only，敏感 fixture、prompt、reasoning、源码和日志正文不会进入 payload。

### D03 — 实现 Langfuse Metadata Exporter

**依赖**：D02。

通过 telemetry outbox 异步发送 task/stage/gate/issue/duration/repair metadata 和 scores。验收要求是 Langfuse 超时、拒绝或长期不可用不影响工作流，并能进入 dead letter。

### D04 — 增加必要基础设施指标

**依赖**：D01、D03。

记录 daemon health、queue depth、lease expiry、SQLite busy、disk usage 和 Worker termination 指标，不引入完整 Dashboard。验收要求是指标采集失败不影响业务路径。

### D05 — Phase D 隐私、故障与资源验收

**依赖**：D01–D04。

执行网络禁用、secret 注入、超大日志、Langfuse outage、磁盘不足、Worker 泄漏和 telemetry dead-letter 测试。验收要求是敏感数据不外发、状态不依赖观测系统、资源限制可执行。

## 6. Phase E：按触发条件启动的规模化 Backlog

这些任务不属于第一版顺序计划。只有对应触发条件出现后，才按 E01 → E05 的顺序执行。

### E01 — Postgres Storage Adapter

触发条件：多进程写入、远程 Worker 或 SQLite 单写吞吐成为实测瓶颈。保持 repository/transaction contract 不变，并完成 SQLite → Postgres migration rehearsal。

### E02 — 远程 Queue 与 Worker

触发条件：Gate 需要跨机器执行或本机资源不足。引入认证 job queue、artifact transfer、lease fencing 和远程 sandbox。

### E03 — 多用户认证与 Review RBAC

触发条件：出现第二个真实用户或共享服务部署。实现 task/workspace tenant、reviewer role、audit identity 和权限测试。

### E04 — 管理 API 与运维界面

触发条件：CLI 无法满足任务检索、dead-letter 修复和审核工作量。管理 API 不得暴露 force complete 或跳过 Gate 的普通权限路径。

### E05 — 跨任务 CAS 与结果复用

触发条件：snapshot 存储或重复 Gate 成本成为实测问题。实现全局去重、引用计数、垃圾回收、cache trust policy 和租户隔离。

## 7. 里程碑与停止条件

| 里程碑 | 包含任务 | 可以声称的能力 |
|---|---|---|
| M1 — Durable Control Plane | A01–A11 | 状态机、常驻 Daemon、真实人工审核可恢复 |
| M2 — Trusted Compile Gate | B01–B11 | OpenCode 可在不可变 snapshot 上完成可信编译闭环 |
| M3 — RTL Verification Loop | C01–C08 | 验证冻结、仿真、修复、challenge 和最终审核闭环 |
| M4 — Hardened Observable System | D01–D05 | 执行隔离、脱敏 Langfuse 和基础设施观测 |

若任一任务缺少可重复验证证据、引入未计划的跨层写入、让 Agent 获得审核决定权，或让正式 Gate 读取可变 workspace，应停止进入下一任务并先修正设计或实现。
