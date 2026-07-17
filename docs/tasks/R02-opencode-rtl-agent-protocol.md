# R02 — 接入受限 OpenCode RTL Agent 协议

## 任务索引

- 权威进度：以 `docs/task-breakdown.md` 为准
- 进入条件：R01 已完成并提供可物化 run workspace
- 前置任务：R01
- 可并行任务：R03
- 汇合任务：R04
- 进度与验收证据登记位置：`docs/task-breakdown.md`、`.harness/session-log.md`

## 目标

实现一次受控的 OpenCode Agent turn：orchestrator 写入严格输入，OpenCode 在一个 R01 run workspace 中读取 spec、当前 RTL 和可选编译结果，只能修改允许的 RTL 文件；退出后由 adapter 根据进程事实和前后 manifest 判定结果，不相信 Agent 自述。

R02 只回答：“这次 Agent turn 是否在受控范围内产生了可交给 R03 检查的 RTL 变化？”它不运行编译器、不循环修复、不判断 RTL 功能或编译是否通过。

## 官方接口基线与锁定策略

截至 2026-07-16，R02 依赖下列 OpenCode 官方接口：

- project-local Markdown Agent：`.opencode/agents/*.md`
- project-local Skill：`.opencode/skills/<name>/SKILL.md`
- 非交互调用：`opencode run`
- 全局 `--pure`，以及 `run` 的 `--agent`、`--model`、`--variant`、`--format json`、`--dir`、`--title`
- `opencode debug config`、`opencode agent list`、`opencode db path`
- 按工具和输入 pattern 配置的 `allow | ask | deny` permission

参考：[Config](https://opencode.ai/docs/config/)、[CLI](https://opencode.ai/docs/cli/)、[Agents](https://opencode.ai/docs/agents/)、[Agent Skills](https://opencode.ai/docs/skills/)、[Permissions](https://opencode.ai/docs/permissions/)。

OpenCode 配置是 merge 而非 replace；`--pure` 只禁用外部 plugin，不能自动清空全局 MCP、instructions 或其他非冲突配置。R02 因此同时采用：

1. `--pure`。
2. runtime inline config 显式设置 `autoupdate: false`、`share: disabled`、`snapshot: false`、`formatter: false`、`lsp: false`、空 plugin/MCP/instructions 和 deny-only permission，并配合禁用自动更新、自动分享、默认 plugin、Claude 兼容 prompt/skill、LSP 下载的固定环境变量。
3. 不继承调用者提供的 `OPENCODE_CONFIG`、`OPENCODE_CONFIG_DIR` 或 `OPENCODE_PERMISSION` override。
4. `opencode debug config` 后的 allowlist 检查；上述 isolation 值未实际生效，或存在 active MCP、外部 plugin、额外 instructions、非 deny-only permission 时 fail closed。
5. 只保存 resolved config 的 JCS digest，不保存可能含 credential 的原始配置。

R02 锁定并记录：OpenCode version、安装方式、原生 executable 类型、provider/model 标识、可选 variant、Agent temperature/steps、Agent/Skill digest、resolved config digest、timeout/output/event/file limits。固定 provider/model 只表示固定请求标识，不宣称服务商模型权重不可变。

## 范围

### 必须实现

- `.opencode/agents/rtl-core-loop.md` primary Agent。
- `.opencode/skills/rtl-core-loop/SKILL.md`，只包含 RTL 方法，不承担安全协议。
- `packages/core-loop` 中的 R02 contracts、capability probe、OpenCode adapter、进程树终止、event projection、RTL postcondition 和 evidence writer。
- `apps/rtl-core-loop` 中的薄 `agent-probe` CLI；配置来自 operator-owned environment，CLI 不接收自由 executable/argv。
- 每个 turn 覆盖写 `workspace/context/agent-input.json`。
- fixed executable + argv、`shell: false`、timeout、stderr/output/event 上限。
- turn 前后 whole-run manifest；越界、非法扩展名、特殊文件、碰撞或资源超限使 workspace 不可交给 R03。
- fake native executable 的确定性集成测试。
- 安装并配置真实 OpenCode 后，由显式 smoke command 执行一次 test-only turn；真实 smoke 不进入普通 `pnpm test`。

### 非目标

- 不向 Agent 暴露 compiler、shell、MCP、review、git、web 工具、subagent、question 或任意自定义 runner tool。
- “不暴露网络”仅指不给 Agent `webfetch/websearch` 等网络工具；OpenCode 仍访问配置的模型 Provider。
- 不使用 session continuation；每个 attempt 是新 session，动态状态全部来自文件。
- 不启动常驻 OpenCode server，不接正式 Workflow Daemon。
- 不默认保存 raw JSONL、reasoning、完整 prompt、完整 Assistant 文本、tool arguments 或文件内容。
- 不实现 repair loop、批量评测、阈值或独立 compile；属于 R04/R03。

## Agent、Skill 与 Permission

### Agent

`.opencode/agents/rtl-core-loop.md` 固定 `mode: primary`、`temperature: 0`、`steps: 20`。Agent prompt 自身必须包含基础协议，即使 Skill 未加载也成立：

- 读取 `context/agent-input.json`，再按 `rtlSourceFiles` 读取当前 RTL，并读取 `spec.md` 和可选 previous result。
- 只创建、修改或删除 `rtl/**` 下 `.sv/.v/.svh/.vh` 普通文件。
- 不改 spec、context、OpenCode 配置、fixture、compiler profile 或 evidence。
- 不调用 shell、web、subagent、MCP、LSP、glob、grep、list 或 question。
- 不伪造编译结果；只描述本轮 RTL 编辑和不确定性，不能宣称 Gate、验证、编译或功能已经通过。

### Skill

Skill 是按需加载的 RTL 方法说明，只包括：

- 从端口、组合/时序语义和 top module 约束开始。
- 小范围修复结构化 compiler issue，不重写无关模块。
- 组合逻辑完整赋值；时序逻辑明确 clock/reset edge 与 reset value。
- 不通过删除端口、改 top、屏蔽源、改 spec 或空模块规避错误。
- 不生成 testbench、compiler command、shell script、binary 或 vendor project。

Skill frontmatter 必须包含与目录一致的 `name: rtl-core-loop` 和有效 `description`。

### Permission

Agent permission 使用真正的工具级 deny-by-default；catch-all 在前，具体 allow 在后：

```yaml
permission:
  "*": deny
  read:
    "*": deny
    "spec.md": allow
    "**/spec.md": allow
    "context/*": allow
    "**/context/*": allow
    "rtl/**": allow
    "**/rtl/**": allow
  edit:
    "*": deny
    "rtl/*.sv": allow
    "**/rtl/*.sv": allow
    "rtl/**/*.sv": allow
    "**/rtl/**/*.sv": allow
    "rtl/*.v": allow
    "**/rtl/*.v": allow
    "rtl/**/*.v": allow
    "**/rtl/**/*.v": allow
    "rtl/*.svh": allow
    "**/rtl/*.svh": allow
    "rtl/**/*.svh": allow
    "**/rtl/**/*.svh": allow
    "rtl/*.vh": allow
    "**/rtl/*.vh": allow
    "rtl/**/*.vh": allow
    "**/rtl/**/*.vh": allow
  skill:
    "*": deny
    "rtl-core-loop": allow
  glob: deny
  grep: deny
  list: deny
  lsp: deny
  bash: deny
  task: deny
  webfetch: deny
  websearch: deny
  question: deny
  external_directory: deny
  todowrite: deny
```

OpenCode permission 是第一层控制。R01/R02 manifest、文件类型和配额检查是第二层事实边界；任一失败都优先产生 `POLICY_VIOLATION`。

OpenCode 1.18.2 在 Windows 上会先把 read/edit/write 的相对路径解析为绝对 workspace 路径再匹配 permission，因此每个相对 allow 都有一个对应的 `**/` workspace-suffix 形式。任意 workspace 外路径仍需单独通过 `external_directory`；capability probe 解析最终 Agent rules，只允许上述 read/edit/skill allow 与 OpenCode 自有 tool-output 目录例外，其他 catch-all 后的 allow/ask 一律拒绝。

## Agent Input Contract

每轮由 adapter 覆盖写 `workspace/context/agent-input.json`。文件必须通过扩展后的 R01 `AgentAttemptInputSchema`：

```json
{
  "schemaVersion": 1,
  "runId": "run_123e4567-e89b-42d3-a456-426614174000",
  "attempt": 1,
  "category": "SEEDED_COMPILE_REPAIR",
  "specPath": "spec.md",
  "workspaceRtlRoot": "rtl",
  "rtlSourceFiles": ["rtl/dut_top.sv", "rtl/helper.svh"],
  "topModule": "dut_top",
  "previousCompileResultPath": "context/previous-compile-result.json"
}
```

`rtlSourceFiles` 必须稳定排序、无 NFC/case-fold collision、与 turn 前真实 RTL 文件集合完全一致，并只含 `.sv/.v/.svh/.vh`。它替代 glob/grep/list discovery；Blank Generation 第一次 turn 可以为空。

R02 首版继续使用完整、严格、有界、脱敏的 `CompileResult`，不增加重复的 `CompileFeedback` schema。若 `previousCompileResultPath` 存在，文件必须位于 `context/`、通过 `CompileResultSchema`、属于同一 run，且 result attempt 小于当前 attempt。是否在 seeded 第一次 turn 前执行 baseline compile 完全由 R04 决定，R02 不规定“必须”或“可以”。

Agent 不接受 compiler executable、argv、timeout、include path、model 或 max-attempt override。Prompt argv 只有固定短消息，动态内容全部通过文件传递。

## OpenCode Experiment Config 与 Capability Probe

operator-owned `OpenCodeExperimentConfig` 至少固定：

```ts
interface OpenCodeExperimentConfig {
  executable: string;
  executableArgumentsPrefix?: readonly string[];
  expectedOpenCodeVersion: string;
  repositoryRoot: string;
  providerModel: string;
  variant?: string;
  timeoutMs: number;
  terminationGraceMs: number;
  stabilityWindowMs: number;
  stderrLimitBytes: number;
  maximumEvents: number;
  maximumEventLineBytes: number;
  workspaceLimits: {
    maximumFiles: number;
    maximumFileBytes: number;
    maximumTotalBytes: number;
  };
}
```

Windows production config 只接受普通、非 symlink 的原生 `.exe`；拒绝 `.cmd/.bat`，禁止 `cmd /c`、PowerShell launcher 和 `shell: true`。Linux/macOS 要求普通、可执行、非 symlink 文件。`executableArgumentsPrefix` 只用于 operator-owned native launcher 参数和 deterministic fake tests，不来自 Agent、fixture、spec 或 CLI free-form input。

adapter 构造时必须快照 operator config 的 prefix、environment 和嵌套 limits，避免外部对象后续变更导致 digest 与实际执行分离。非空 `executableArgumentsPrefix` 必须作为有序 argv 数组进入 experiment config digest；空数组与省略 prefix 规范化为相同的实际调用语义。共享 evidence 只保存 digest，不保存 launcher 参数或宿主路径。

Static probe 顺序：

1. executable 类型/平台检查。
2. `--version` 精确匹配。
3. `run --help` 包含所需 flags，且 adapter 永不传 `--auto`、`--thinking`、`--continue`、`--session`、`--fork` 或 `--attach`。
4. 在 repository root 执行 `agent list` 并发现 `rtl-core-loop`。
5. 执行 `debug config`，解析 JSON、验证 autoupdate/share/snapshot/formatter/LSP isolation 与 active MCP/plugin/instructions allowlist，只持久化 digest。
6. 解析最终 Agent permission rules，并计算 resolved config、resolved Agent permission、Agent、Skill 和完整 experiment config digest。

Live smoke 是显式的真实 model turn，不由 `--help` 或 mock 替代。它需要 native OpenCode、认证和 operator model config；缺一项时 R02 可以实现但不能标记完整 `DONE`。

## OpenCode Adapter

公开接口：

```ts
interface RtlAgentAdapter {
  probe(): Promise<OpenCodeCapability>;
  runTurn(input: AgentAttemptInput, run: CoreLoopRun): Promise<AgentTurnResult>;
}
```

真实 argv 固定为：

```text
opencode
  --pure
  run
  --agent rtl-core-loop
  --model <provider/model>
  [--variant <variant>]
  --format json
  --dir <run-workspace-host-path>
  --title <bounded-title>
  <fixed-short-message>
```

规则：

- executable、prefix、model、variant 和 limits 只来自 operator config。
- 每个 argv 独立传给 `spawn`；`shell: false`、Windows `windowsHide: true`。
- runtime environment 删除调用者的 OpenCode config override，将可信 `OPENCODE_CONFIG_DIR` 固定到 repository-owned `.opencode`，再加入固定 isolation variables 和 inline config；run workspace 不需要复制 Agent/Skill。
- 每个 attempt 新 session；不传 continuation/session ID，不使用 `--auto` 或 `--thinking`。
- exit 0 只代表 OpenCode 进程正常结束。
- stdout JSON event 流在内存中投影为稳定摘要，只记录 category、tool name、status、byte length 和 truncation；不持久化 raw line。
- stderr 使用 R01 `CapturedOutput` 做 ANSI/control/path sanitization 和 UTF-8 byte truncation。
- `opencode db path` 属于 capability/smoke 留存证据；不得在共享结果 JSON 中保存宿主路径。

## Timeout、文件策略与 Turn Outcome

Timeout 后必须先终止完整进程树，再生成 after manifest：

```text
timeout
→ process group/tree graceful termination
→ grace period
→ force kill tree
→ wait all pipes close
→ workspace stability window
→ after manifest twice并确认 digest 稳定
```

Windows 使用固定 `taskkill.exe /PID <pid> /T`，必要时加 `/F`；Linux/macOS 使用独立 process group。二者都不向 Agent 开放 shell。

after policy 除 R01 whole-run net-change 外，还要求：

- `rtl/**` 只含普通文件和目录；禁止 symlink/junction/special file/collision。
- 只允许 `.sv/.v/.svh/.vh`。
- 至少保留一个 `.sv` 或 `.v` compile unit。
- 文件数、单文件 bytes、RTL 总 bytes 不超过 operator-locked limits。

`AgentTurnOutcome`：

```text
RTL_CHANGED
NO_RTL_CHANGE
AGENT_PROCESS_ERROR
AGENT_TIMEOUT
POLICY_VIOLATION
```

判定优先级：

1. after workspace 无法安全扫描、发生越界/非法文件/资源超限：`POLICY_VIOLATION`。
2. spawn、终止树未确认、进程/稳定性失败或非零 exit：`AGENT_PROCESS_ERROR`。
3. timeout 且进程树已确认终止：`AGENT_TIMEOUT`。
4. 正常 exit 且无 RTL 净变化：`NO_RTL_CHANGE`。
5. 正常 exit、合法 RTL 变化且 workspace 稳定：`RTL_CHANGED`。

只有 `RTL_CHANGED` 的 `workspaceUsableForCompile` 为 `true`。异常退出前即使写过 RTL，也不交给 R03。Agent final text 永远不能覆盖 outcome。

## 敏感数据与 Evidence

默认 evidence 只保存严格 `AgentTurnResult`：进程事实、before/after digest、policy violation、event summary、sanitized stderr、OpenCode/model identity、resolved config/permission/Agent/Skill/experiment digests 和 logical evidence path。

默认不保存：raw JSONL、reasoning、完整 Assistant text、prompt、tool arguments/results、文件内容、resolved config 或 OpenCode DB host path。显式 debug raw artifact 属于后续可选能力，必须默认关闭、设置容量/敏感标签/删除周期，并排除在可分享实验结果之外。

OpenCode 自身可能保留 session。真实 smoke 前必须执行 `opencode db path`，在本地留存说明中登记其存在；若无法验证隔离数据目录，就不能声称 Core Loop 只保留有界事件。

## 实现步骤

1. 按本任务修订 R01 `AgentAttemptInputSchema`，加入 `rtlSourceFiles`。
2. 创建 Agent 与 Skill，固定 prompt 和 permission。
3. 实现 experiment config validation、isolated environment 和 static capability probe。
4. 实现 bounded event projection、stderr capture、native process spawn 和跨平台 tree termination。
5. 写入 agent input，验证 previous result、source list、manifest、扩展名和配额。
6. 实现稳定 `AgentTurnResult` 与 logical evidence writer。
7. 用 native fake executable 覆盖 probe、argv、成功、无变化、进程错误、timeout/tree kill、oversized output 和 policy violation。
8. 增加薄 `agent-probe` CLI 与独立真实 smoke 入口/说明。
9. 在 native OpenCode 可用时执行真实 test-only smoke；否则记录缺失证据，不把 R02 标记完整 `DONE`。

## 测试要求

- missing/non-native executable、version/flags/Agent/config mismatch 返回稳定 capability error。
- argv snapshot 证明 `--pure` 位于 `run` 前、model/variant 显式、无 `--auto`/thinking/continuation/session/fork/attach、无 shell string。
- isolation environment 删除外部 OpenCode overrides并设置固定禁用变量；effective config 必须保持 autoupdate/share/snapshot/formatter/LSP、MCP/plugin/instructions 与 permission lock。
- `rtlSourceFiles` 与真实文件不一致、previous result 无效或跨 run 时 fail closed。
- fake exit 0 + 合法 RTL 修改返回 `RTL_CHANGED`；无变化返回 `NO_RTL_CHANGE`。
- 非零 exit、spawn failure、timeout 分别返回稳定 outcome，且异常 workspace 不可编译。
- fake child process 在 timeout 后不能继续改 workspace或保留句柄；终止命令卡住或强杀后不触发 `close` 时必须在硬截止内返回 `AGENT_PROCESS_ERROR`。
- spec/context/evidence 修改、非法扩展、symlink/collision、无 compile unit、文件数/大小超限返回 `POLICY_VIOLATION`。
- stdout raw JSON 文本不进入 evidence；event 变化只产生稳定摘要，不影响 outcome。
- 普通测试不调用网络/model；真实 smoke 只在显式环境开关下执行。
- permission 负向证据只有在实际工具调用被拒绝时成立，不能把“模型没有尝试”记为通过。

## 验证命令

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm --filter @rtl-agent/core-loop --fail-if-no-match test
corepack pnpm --filter @rtl-agent/rtl-core-loop --fail-if-no-match test
corepack pnpm test
corepack pnpm build
corepack pnpm format:check
corepack pnpm peers check
corepack pnpm core-loop:agent:probe
git diff --check
& 'C:\Program Files\Git\bin\bash.exe' scripts/harness_check.sh
```

真实 smoke 使用单独命令和 `CORE_LOOP_REAL_AGENT_TEST=1`，不进入普通 `pnpm test`。未配置 native OpenCode 时，`agent-probe` 必须返回稳定 `OPENCODE_NOT_CONFIGURED` 非零诊断。

## 完成定义

- 文档、Agent、Skill、contracts、adapter、probe、evidence 和 deterministic tests 已实现。
- adapter 固定 native executable/argv，隔离并指纹化有效配置，不依赖 shell。
- Agent 只能产生受控 RTL change；越界、无变化、进程失败、timeout 和 policy failure 都有结构化 outcome。
- raw reasoning/JSONL 不默认持久化，OpenCode session store 风险有记录。
- 没有运行 compiler 或实现 repair loop。
- 固定版本的 native OpenCode/model 完成 capability probe、真实 test-only smoke 和实际 permission deny 证据后，R02 才能在 breakdown 标记 `DONE`。

## 实现交接内容

Session Log 记录：OpenCode 安装方式/version、provider/model、native executable 检查、Agent/Skill/config digest、verified flags、permission deny 证据、timeout/output/event/file limits、OpenCode DB 留存说明、deterministic test 结果、真实 smoke 结果或缺失原因，以及 R04 调用 adapter 的方法。不得把 smoke input 登记为评测数据。
