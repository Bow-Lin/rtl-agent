# R03 — 实现固定的非权威 Compile Adapter

## 任务索引

- 权威进度：以 `docs/task-breakdown.md` 为准
- 进入条件：R01 已完成并提供 fixture/run contract
- 前置任务：R01
- 可并行任务：R02
- 汇合任务：R04
- 进度与验收证据登记位置：`docs/task-breakdown.md`、`.harness/session-log.md`

## 目标

使用一个 repository-owned、固定参数的 Icarus Verilog profile，对 run workspace 的 SystemVerilog RTL 执行语法解析与 top elaboration，并输出有界、结构化、明确 `authoritative: false` 的结果。

R03 的结果只回答“这组源文件能否被当前固定 compiler profile 编译/elaborate”。它不回答 RTL 是否满足 spec，不运行 testbench，也不是 Phase B 的正式 Compile Gate。

## Adapter 选择

Core Loop v1 选用 Icarus Verilog，profile ID 固定为：

```text
iverilog-systemverilog-2012-v1
```

原因：

- CLI 小、启动快，适合短小 fixture 的编译反馈实验。
- 官方文档提供跨 Windows/Linux 一致的参数形式。
- `-g2012` 明确启用 IEEE 1800-2012 SystemVerilog，`-s <top>` 明确选择 elaboration root。

参考：[Icarus Verilog Command Line Flags](https://steveicarus.github.io/iverilog/usage/command_line_flags.html)、[Getting Started](https://steveicarus.github.io/iverilog/usage/getting_started.html)。

R03 实施时必须安装并锁定一个实际 Icarus Verilog release，记录 executable resolution、`iverilog -V` 原始版本摘要和当前 host。文档不预填一个尚未验证的版本号。如果当前环境无法安装/运行 Icarus Verilog，R03 标记 `BLOCKED`；不得静默改用 Verilator、在线编译器或 mock 作为完成证据。以后更换工具需要新的 profile ID 与 `docs/decisions.md` 记录。

## 范围

### 必须实现

- `packages/core-loop` 中的 compiler profile、source discovery、process adapter、diagnostic parser 和 compile result writer；`apps/rtl-core-loop` 只增加薄 CLI 命令解析和调用。
- 固定 `iverilog` executable + argv、`shell: false`。
- `.sv`/`.v` 源文件的受控递归发现、logical-path 排序和 top module elaboration。
- compile timeout、bounded stdout/stderr、best-effort termination 和临时输出清理。
- 将 Icarus diagnostics 映射为稳定 Core Loop issue，无法解析时保留有界 fallback issue。
- 实际 compiler version probe 与版本漂移拒绝。
- fake compiler 单元测试和使用临时生成 RTL 的真实 Icarus 集成测试；不依赖 repository evaluation case。
- 向 R02/R04 提供只读结构化 feedback。

### 非目标

- 不运行 `vvp`，不执行 testbench、仿真、coverage、SVA 或 synthesis。
- 不实现多 compiler fallback 或让 Agent/fixture选择 executable/argv。
- 不实现 immutable snapshot、job queue、lease、sandbox、result ingestion 或 Linux authoritative Gate；属于 B02–B11。
- 不保证生产级 process-tree/sandbox isolation。timeout/termination 的平台限制必须记录，不能包装成正式 Gate 能力。
- 不把 warning 当作功能错误，也不通过自定义 warning suppression 掩盖 compiler error。

## 固定 Profile

首版 argv 由 adapter 按以下顺序构造：

```text
iverilog
  -g2012
  -s <validated-top-module>
  -o <orchestrator-owned-temporary-output>
  <sorted-source-host-path-1>
  <sorted-source-host-path-2>
  ...
```

规则：

- `-g2012`、`-s`、`-o` 和顺序由 profile 常量定义。
- `<top>` 来自已校验的 R01 normalized fixture，不能含 flag prefix、空白或任意表达式。
- source list 只来自 `workspace/rtl/**` 下普通 `.sv`/`.v` 文件；使用 R01 logical-path policy 与 case-collision 检查。
- source 路径稳定排序后逐项放入 argv；不使用 shell glob、response/command file、pipeline 或字符串拼接。
- 临时 output 位于 orchestrator-owned temp/evidence 路径，不位于 Agent 可写 root。compile 完成后删除；删除失败写入独立 adapter evidence/log，不扩展严格的 `CompileResult`，也不把 compile error 改写成 success。
- Core Loop v1 不接受 `-D`、`-I`、library directory、parameter override、filelist 或额外用户 flags。需要这些能力时新增版本化 profile，不向 run request 开任意 argv 入口。
- executable 来自 operator config 并在启动时解析/锁定；fixture、spec 和 Agent input 不能覆盖。

R01 `CompileRequestSchema.sourceFiles` 要求至少一个 `.sv`/`.v` 文件。source discovery 没有发现文件时，不得构造空 `CompileRequest`；R03 的 request-builder 返回稳定的 `NO_RTL_SOURCE` 准备结果，由 R04 保存为“compiler not invoked”证据。实际 compiler adapter 只接收通过 `CompileRequestSchema` 的请求。如果 top 无法 elaborate，则保留有界 Icarus message，并以 `CompileIssue.kind = "ERROR"` 返回；路径和位置只有在证据充分时填写。

baseline 使用 `attempt: 0`，Agent 编辑后的 compile 使用 `attempt: 1..3`。`compilerProfileId` 必须与锁定的 repository-owned profile 相等，`sourceFiles` 必须排序、去重并通过 R01 collision/extension policy，`workspaceManifestDigest` 绑定调用时的 workspace manifest。

## Compile Result

R03 必须原样返回 R01 `CompileResultSchema`，不能增加 cleanup 字段、自定义 issue code 或第二个 manifest 字段：

```text
schemaVersion: 1
status: COMPILE_PASSED | COMPILE_ERROR | TIMEOUT | TOOL_ERROR
authoritative: false
claim: COMPILE_ONLY
runId
attempt: 0..3
compilerProfileId
toolVersion
topModule
workspaceManifestDigest
exitCode: number | null
durationMs
issues[]
stdout/stderr: preview + truncated + originalByteLength + optional artifactPath
```

Issue 严格使用 R01 `CompileIssueSchema`：

```json
{
  "kind": "ERROR",
  "path": "rtl/counter.sv",
  "line": 12,
  "column": 7,
  "message": "bounded compiler message"
}
```

`kind` 只有 `ERROR | WARNING | NOTE`；`path`、`line`、`column` 缺少可靠证据时直接省略，不能写 `null` 或猜测。稳定分类文本可以放在 bounded `message` 中，但 R03 不得临时给严格 schema 增加 `code`、`severity` 或 `file` 字段。输出截断由 `CapturedOutput.truncated` 表达。

`TIMEOUT` 与 `TOOL_ERROR` 不是 RTL compile error，R04 默认不得把它们反馈给 Agent 反复改 RTL：

- `COMPILE_ERROR`：compiler 正常启动并返回设计错误，可进入 repair。
- `TIMEOUT`：超过固定 timeout；停止 run，等待 operator 检查。
- `TOOL_ERROR`：executable missing/version mismatch/spawn failure/异常退出或 adapter internal failure；停止 run。
- `COMPILE_PASSED`：exit code 0 且没有 adapter-level failure，只表示 compile/elaboration pass。

各分支的 `exitCode` 必须符合判别联合：`COMPILE_PASSED` 固定为 `0`，`COMPILE_ERROR` 为非零整数，`TIMEOUT` 为 `null`，`TOOL_ERROR` 为整数或 `null`。

## Diagnostic 解析与脱敏

- 首先保存有界 raw stdout/stderr，再做 best-effort parse；parser 失败不能丢失原始摘要。
- 将位于 run workspace 内的宿主路径转换为 logical path，例如 `rtl/counter.sv`。
- workspace 外路径不得写入 result；替换为固定 `<tool-path>` 或删除 path 部分。
- 去除 ANSI control sequence 和不可打印控制字符，统一换行后再截断。
- 单条 message、issue 数、stdout/stderr 和总 result 都采用 R01 上限。
- diagnostic 排序保持 compiler 原始顺序；`kind/path/line/column/message` 只能由 adapter 从工具输出提取，不能接受 Agent 提交或重分类。
- parser 只提取明确的 path/line/column/kind；不确定时把有界原文放入 `message`，不猜测位置或添加 schema 外字段。

## Process 与平台边界

- 使用 Node `child_process.spawn(executable, argv, { shell: false })`。
- environment 采用最小 allowlist；不得把整个开发机环境记录进证据。
- compile timeout 默认 30 秒，operator config 可在 5–120 秒范围固定；fixture/Agent/run request 不得覆盖。
- stdout/stderr 必须边读边限流，不能在内存中无界累积。
- timeout 后终止 compiler，并记录 termination 尝试/结果。Core Loop 只承诺当前已验证 host 上不会继续等待；生产级跨平台 process-tree termination 留给 B07。
- R03 可在当前 Windows host 形成非权威 Core Loop 证据。它不触发 `LINUX_GATE_REQUIRED`，也不能被正式 workflow 当成 Gate success。
- 同一 final RTL 在 declared profile/version 下立即重跑应得到相同 pass/fail classification；duration 和日志顺序细节不作为确定性保证。

## 实现步骤

1. 安装 Icarus Verilog，记录 executable、version 和 host smoke。
2. 实现固定 profile/version probe；版本不匹配 fail closed。
3. 实现 source discovery、extension/path/case validation 和稳定排序。
4. 实现 argv builder，单元测试其无 shell、无自由 flags。
5. 实现 bounded process runner、timeout、独立 cleanup evidence 和严格 `CompileResultSchema` mapping。
6. 实现 Icarus diagnostic parser与 path normalization。
7. 用 fake executable覆盖 pass/error/timeout/spawn failure/oversized output。
8. 用 test-only provider 临时生成 blank、valid、syntax error、missing top 和多文件输入，并用真实 compiler 验证后清理。
9. 更新 `docs/verification.md`，加入 compiler probe和 Core Loop compile专项命令。

## 测试要求

- missing executable、version mismatch 和 spawn error 返回 `TOOL_ERROR`。
- 空 rtl root 返回 `NO_RTL_SOURCE` request-preparation result，不构造空 `CompileRequest` 且不 spawn。
- source 只接受普通 `.sv`/`.v`；symlink、case collision、越界或非法 extension被拒绝。
- argv 顺序固定，含 `-g2012`、validated `-s`、orchestrator-owned `-o` 和排序 source；没有 shell string。
- fake compiler exit 0/1、timeout、signal、超大 stdout/stderr 对应正确 status和 truncation。
- diagnostics 中 workspace host path变为 logical path，外部 host path不泄漏。
- 真实 Icarus 对临时 valid input 返回 `COMPILE_PASSED`，对 syntax error/missing top 返回 `COMPILE_ERROR`。
- 临时多文件输入证明 top elaboration 与 source 排序可用，不构成评测样例。
- `COMPILE_PASSED` result 始终含 `authoritative: false` 和 `claim: "COMPILE_ONLY"`。
- 对 final RTL 连续重跑两次，classification 和 `workspaceManifestDigest` 一致。

## 验证命令

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm --filter @rtl-agent/core-loop --fail-if-no-match test
corepack pnpm --filter @rtl-agent/rtl-core-loop --fail-if-no-match test
corepack pnpm test
corepack pnpm build
corepack pnpm format:check
iverilog -V
git diff --check
& 'C:\Program Files\Git\bin\bash.exe' scripts/harness_check.sh
```

真实 compile smoke 由 R03 实现的 Core Loop CLI 与 test-only provider 执行，并在 Session Log 记录实际命令入口、profile/version和每类结果。

## 完成定义

- 固定版本 Icarus Verilog 在当前 host 通过真实 pass/error/elaboration集成测试。
- executable、argv、timeout、source discovery和profile不接受 Agent/fixture自由覆盖。
- compile feedback有界、logical-path化、结构化，并区分设计错误和工具故障。
- 每个结果明确非权威且仅 compile-only；不执行仿真或推进正式 state。
- breakdown 中 R03 标记 `DONE` 并登记 tool/version、临时真实编译、timeout 和重跑证据。

## 实现交接内容

Session Log 记录 Icarus executable/version、固定 argv profile、timeout/output limits、当前 host termination限制、diagnostic覆盖率、test-only compile结果和 R04 应仅对 `COMPILE_ERROR` 继续修复的规则。不得把临时输入当成评测集。
