# R02 — 接入受限 OpenCode RTL Agent 协议

## 任务索引

- 权威进度：以 `docs/task-breakdown.md` 为准
- 进入条件：R01 已完成并提供可物化 run workspace
- 前置任务：R01
- 可并行任务：R03
- 汇合任务：R04
- 进度与验收证据登记位置：`docs/task-breakdown.md`、`.harness/session-log.md`

## 目标

建立一次受控的 OpenCode Agent turn：orchestrator 准备结构化输入，OpenCode 在指定 run workspace 中读取 spec/当前 RTL/上一轮编译反馈，只能修改 `rtl/**`，退出后由 orchestrator 依据文件变化而不是 Agent 自述判断结果。

R02 只证明“能稳定调用 Agent 并获得受限 RTL 编辑”。它不运行编译器、不循环修复，也不允许 Agent 自己宣布实验通过。

## 官方接口基线与锁定策略

截至 2026-07-15，OpenCode 官方文档提供：

- project-local Markdown Agent：`.opencode/agents/*.md`
- project-local Skill：`.opencode/skills/<name>/SKILL.md`
- 非交互调用：`opencode run`
- `--agent`、`--dir`、`--format json` 等参数
- 按工具和路径配置的 `allow | ask | deny` permission

参考：[OpenCode CLI](https://opencode.ai/docs/cli/)、[Agents](https://opencode.ai/docs/agents/)、[Agent Skills](https://opencode.ai/docs/skills/)、[Permissions](https://opencode.ai/docs/permissions/)。

这些接口仍可能变化，因此 R02 的第一步是 capability probe，不是假设全局环境已经安装：

1. 解析固定配置中的 OpenCode executable，执行 `--version`。
2. 验证 `run --help` 包含任务使用的稳定参数。
3. 验证 `agent list` 能发现 repository-local `rtl-core-loop` Agent。
4. 运行一个不改文件的 smoke turn，确认认证、provider/model 和 JSON event 输出可用。
5. 在 `docs/decisions.md` 与 Session Log 记录实际版本、安装方式、model 标识和已验证 CLI surface。

R02 完成后，Core Loop 配置必须固定 OpenCode 版本和 model 标识。升级属于显式实验变量，不能在一次评测批次中漂移。如果 executable、认证或所需 CLI 参数不可用，R02 标记 `BLOCKED`，不能以 mock Agent 代替完成证据。

## 范围

### 必须实现

- `.opencode/agents/rtl-core-loop.md` primary Agent。
- `.opencode/skills/rtl-core-loop/SKILL.md`，说明 Spec → SystemVerilog、读取反馈、只改 RTL 和完成表述规则。
- repository-local OpenCode 配置与 fail-closed permissions。
- `packages/core-loop` 中的 OpenCode adapter、capability probe 和 Agent turn result；`apps/rtl-core-loop` 只增加薄 CLI 命令解析和调用，不承载可复用 adapter 逻辑。
- 每个 turn 的结构化 `context/agent-input.json`。
- 固定 executable + argv、`shell: false`、timeout、stdout/stderr/JSONL 上限。
- turn 前后 workspace manifest 对比；越界变化停止 run。
- fake-executable adapter tests 与一次基于 test-only normalized input 的真实 OpenCode smoke turn；该输入不进入评测集。

### 非目标

- 不向 Agent 暴露 compiler、shell、MCP、review、git、网络、subagent 或任意自定义 runner tool。
- 不解析 Agent 自述来判定 compile pass；R03/R04 只信固定编译器结果。
- 不使用 OpenCode session continuation 维持修复状态；每个 attempt 是新 session，完整上下文由文件提供。
- 不启动常驻 OpenCode server，不接入正式 Workflow Daemon。
- 不记录或上传 reasoning；本地仅保留完成排错所需的有界事件/输出。
- 不实现 repair loop、批量评测或阈值判断；属于 R04。

## Agent 与 Skill 配置

### Agent

`.opencode/agents/rtl-core-loop.md` 使用 `mode: primary`。Prompt 必须明确：

- 首先读取 `context/agent-input.json`、`spec.md` 和当前 `rtl/**`。
- 需要时加载 `rtl-core-loop` Skill。
- 只创建、修改或删除 `rtl/**` 下的 `.sv`/`.v` 文件。
- 不改 spec、context、OpenCode 配置、fixture、编译 profile 或 evidence。
- 不调用 shell、网络、subagent、MCP 或用户 question。
- 不伪造编译结果；只报告本轮做了哪些 RTL 编辑和仍存在的不确定性。
- 即使认为 RTL 正确，也只能说“Agent turn complete”，不能说 Gate/验证/功能已经通过。

### Skill

Skill 只包含原型所需的 RTL 行为约束：

- 从明确端口和时序语义开始，保持 top module 名称精确一致。
- 优先小改动；修复轮次针对结构化 compiler issues，不重写无关模块。
- 组合逻辑避免不完整赋值；时序逻辑明确 clock/reset edge 与 reset value。
- 不通过删除端口、改 top、屏蔽源文件、改 spec 或加入空模块规避错误。
- 不生成 testbench、compiler command、shell script、binary 或 vendor-specific project file。

Skill frontmatter 的 `name` 必须与目录 `rtl-core-loop` 一致，并满足 OpenCode 的命名规则。

### Permission

配置采用 deny-by-default。实现时至少验证下列有效策略：

```text
read: 仅 workspace 内 spec.md、context/**、rtl/**
edit: 先 deny *，再 allow rtl/**
glob/grep/list: 仅 workspace 内 allow
skill: 仅 allow rtl-core-loop
bash/task/webfetch/websearch/question/external_directory: deny
```

OpenCode permission 是第一层控制，不是唯一安全边界。orchestrator 必须在 turn 后用 R01 manifest 再检查实际文件变化；两者任一发现越界即 `POLICY_VIOLATION`。

## Agent Input Contract

每轮由 orchestrator 覆盖写入 `workspace/context/agent-input.json`。文件内容必须通过 R01 `AgentAttemptInputSchema`，不得增加一套相似但不兼容的输入结构：

```json
{
  "schemaVersion": 1,
  "runId": "run_123e4567-e89b-42d3-a456-426614174000",
  "attempt": 1,
  "category": "SEEDED_COMPILE_REPAIR",
  "specPath": "spec.md",
  "workspaceRtlRoot": "rtl",
  "topModule": "dut_top",
  "previousCompileResultPath": "context/previous-compile-result.json"
}
```

`BLANK_GENERATION` 的第一次 attempt 省略 `previousCompileResultPath`，并且不创建 previous-result 文件。`SEEDED_COMPILE_REPAIR` 的第一次 attempt 可以引用 baseline `CompileResult`；后续 repair attempt 引用上一轮结果。orchestrator 把相应的、通过 `CompileResultSchema` 的完整有界脱敏结果复制为 `workspace/context/previous-compile-result.json`，再通过 `previousCompileResultPath` 指向它。Agent 读取其中的 status、`issues[].kind/path/line/column/message`、stdout/stderr preview 和 compiler profile/version；反馈文件不得包含宿主绝对路径、环境变量、secret 或无限日志。fixture display ID、claim 或 write-root 声明不属于 `AgentAttemptInput`，不得塞进该 JSON；write root 由 permission 与 R01 postcondition 定义。

Agent 不接受自由形式的 compiler executable、argv、timeout、include path 或 max-attempt override。Prompt argv 使用固定短消息，例如“读取 `context/agent-input.json` 并执行 rtl-core-loop 协议”；完整动态内容通过文件传递，避免 Windows command-line 长度与 quoting 问题。

## OpenCode Adapter

adapter 建议接口：

```ts
interface RtlAgentAdapter {
  probe(): Promise<OpenCodeCapability>;
  runTurn(input: AgentAttemptInput, workspace: BoundRunWorkspace): Promise<AgentTurnResult>;
}
```

真实调用等价于以下 argv 结构，但必须通过 `spawn(executable, argv, { shell: false })` 实现：

```text
opencode run
  --agent rtl-core-loop
  --format json
  --dir <run-workspace-host-path>
  --title <bounded-core-loop-title>
  <fixed-short-message>
```

规则：

- executable 来自 operator-owned Core Loop config，不来自 fixture、spec、Agent 或 CLI free-form 参数。
- argv 每项独立传入；禁止拼 shell string，禁止 `cmd /c`、PowerShell、Bash 或 pipeline。
- 每个 attempt 新建 session，不传 `--continue` 或上一 session ID。完整状态来自当前 workspace 与 agent-input。
- `--format json` 输出作为有界诊断事件保存。除非锁定版本并有 schema test，不依赖内部 event shape 决定业务 outcome。
- process exit 0 只代表 Agent turn 正常结束，不代表 RTL 编译或正确。
- adapter 记录实际 OpenCode/model version、duration、exitCode、timeout、输出截断与 session ID（若可稳定提取）。stdout/stderr 必须复用 R01 `captureOutput`/`CapturedOutput` 语义：sanitized `preview`、`truncated`、`originalByteLength` 和可选 logical `artifactPath`；有界 JSONL 作为 evidence artifact 保存，不能在结果 JSON 中写宿主绝对路径。
- 默认 turn timeout 建议 10 分钟，允许 operator config 在 1–20 分钟固定选择；run request/Agent 不得覆盖。

## 文件变化与 Turn Outcome

`AgentTurnResult` 至少区分：

```text
COMPLETED
PROCESS_ERROR
TIMEOUT
POLICY_VIOLATION
NO_RTL_CHANGE
```

判定顺序：

1. 生成 turn 前 manifest。
2. 调用 OpenCode。
3. 无论退出状态如何，都生成 turn 后 manifest并检查越界变化。
4. 发生越界变化优先返回 `POLICY_VIOLATION`，保存证据并停止使用该 workspace。
5. 没有越界时再区分 timeout/process error。
6. 正常退出但 `rtl/**` digest 未变化时返回 `NO_RTL_CHANGE`。
7. 有合法 RTL 变化时返回 `COMPLETED`，交给 R03 编译。

Agent 的 final text 只作诊断材料，不能覆盖上述 outcome。

## 实现步骤

1. 完成真实 OpenCode capability probe并记录锁定版本/model。
2. 创建 Agent、Skill 与 repository-local permission 配置。
3. 实现严格的 `AgentAttemptInputSchema` writer、previous compile result copy 和固定短 prompt。
4. 在 `packages/core-loop` 实现 `RtlAgentAdapter`、bounded output collector、timeout 和稳定 result；CLI 只调用公开 API。
5. 接入 R01 前后 manifest及 allowed-write policy。
6. 用 fake executable 覆盖 exit、timeout、oversized output 和 argv 测试。
7. 用真实 OpenCode 执行一个由 test-only provider 临时物化的 smoke turn，结束后删除输入内容。
8. 负向验证 Agent 尝试修改 spec、执行 shell、访问 external directory 时被拒绝或被 postcondition 捕获。

## 测试要求

- capability probe 对 missing executable、unsupported flags、Agent 未发现和未认证返回可诊断错误。
- argv snapshot 证明没有 shell string，动态路径/标题/消息各自为独立参数。
- Agent input 严格通过 R01 schema；第一次省略 previous-result path，后续 path 指向通过 `CompileResultSchema` 的有界脱敏文件。
- fake process 的非零退出、timeout、stdout/stderr 超限都产生稳定结果并保留截断标志。
- 正常退出但无 RTL diff 返回 `NO_RTL_CHANGE`。
- 修改 `rtl/**` 返回 `COMPLETED`；任何其他 workspace 变化返回 `POLICY_VIOLATION`。
- OpenCode JSON event 格式变化不会误判 compile pass。
- 真实 smoke turn 能发现 Agent/Skill，至少一次合法创建或修改 `.sv` 文件；不得把该临时输入计入评测结果。
- bash、task、web、external directory 和非 RTL edit 的 permission 负向检查通过。

## 验证命令

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm --filter @rtl-agent/core-loop --fail-if-no-match test
corepack pnpm --filter @rtl-agent/rtl-core-loop --fail-if-no-match test
corepack pnpm test
corepack pnpm build
corepack pnpm format:check
opencode --version
opencode agent list
git diff --check
& 'C:\Program Files\Git\bin\bash.exe' scripts/harness_check.sh
```

真实 OpenCode smoke command 由实现时提供的 Core Loop CLI 和 test-only provider 调用，不能要求开发者手工拼接 prompt 或 argv。

## 完成定义

- 固定版本的 OpenCode/model 在当前环境完成 capability probe 和 test-only 真实 smoke turn。
- Agent/Skill 可发现，Agent 只能对 run workspace 的 `rtl/**` 产生合法编辑。
- adapter 不依赖 shell，不以 Agent 文本或 OpenCode exit 0 判断编译成功。
- 越界写、无变化、进程失败和 timeout 都有结构化、可测试 outcome。
- 没有运行编译器或实现 repair loop。
- breakdown 中 R02 标记 `DONE` 并登记版本、model、真实 smoke 与负向 permission 证据。

## 实现交接内容

Session Log 记录 OpenCode 安装方式/version、provider/model、已验证 CLI flags、Agent/Skill 路径、permission 负向证据、turn timeout/output limits、test-only smoke 结果和 R04 调用 adapter 的方法。不得把 smoke input 登记为评测数据。
