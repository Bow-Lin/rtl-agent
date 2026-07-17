# R03 — 实现固定的非权威 Compile Adapter

## 任务索引

- 权威进度：以 `docs/task-breakdown.md` 为准
- 进入条件：R01 已完成并提供 fixture/run contract
- 前置任务：R01
- 可并行任务：R02（当前已完成；R03 仍不直接调用 R02）
- 汇合任务：R04
- 进度与验收证据登记位置：`docs/task-breakdown.md`、`.harness/session-log.md`

## 目标与能力边界

使用 repository-owned、固定参数的 Icarus Verilog profile，对 mutable run workspace 中一组明确绑定的 SystemVerilog/Verilog 源文件执行预处理、语法解析和 top elaboration，并返回有界、结构化、明确 `authoritative: false` 的结果。

R03 只回答：当前 workspace 中被 request 与 manifest 绑定的输入，是否被锁定版本的 Icarus profile 接受。它不执行 VVP code generation，不运行生成结果、testbench、仿真、coverage、SVA 或 synthesis，也不证明 RTL 满足 spec 或完整符合 IEEE 1800-2012。R03 不是 Phase B 的正式 Compile Gate；immutable snapshot、sandbox、job、lease 和 authoritative result ingestion 仍由 B02–B11 实现。

## R01 兼容性前置修订

R01 已实现的 workspace、logical path、manifest、attempt 和四分支 status 设计继续有效。R03 不重命名这些公共类型，也不改变 R02 已实现的 Agent turn 边界。实现 adapter 前只允许完成以下向后兼容的契约修订，因为现有 schema 无法诚实表达已经声明的 R03 行为：

1. `CompileResult.status === "TOOL_ERROR"` 时允许 `toolVersion: null`。成功 probe 后仍必须填写实际版本；版本不匹配时填写实际探测值；executable missing、probe spawn failure、probe timeout 或无法取得可信版本时填写 `null`。
2. `FinalResult.outcome === "TOOL_ERROR"` 时同样允许 `toolVersion: null`，否则 R04 无法汇总前述合法的工具故障。
3. `CapturedOutput.originalByteLength` 固定表示工具向对应 pipe 写出的原始字节数。ANSI 清理、控制字符移除和 host-path 脱敏可能改变 preview 的 UTF-8 长度，因此 schema 不再要求未截断时二者相等。`truncated` 表示 capture 或最终 sanitized preview 因上限丢失了内容。

这些修订只能放宽此前无法表示的失败或脱敏结果；已有合法 R01/R02 数据保持合法。必须补充 contract regression tests，证明非 `TOOL_ERROR` 结果仍要求非空 `toolVersion`，已有 captured output 仍可解析，且 host absolute path 拒绝规则不变。不得借此修改 R02 process、permission、manifest 或 evidence 逻辑。

## 固定 Profile

Core Loop v1 使用以下 profile ID：

```text
iverilog-systemverilog-2012-null-v1
```

固定 argv 按以下顺序构造：

```text
<resolved-absolute-iverilog-executable>
  -g2012
  -tnull
  -s <validated-top-module>
  <sorted-source-host-path-1>
  <sorted-source-host-path-2>
  ...
```

`-tnull` 明确禁止 code generation，因此没有 `-o`、临时 VVP output 或 output cleanup。`-g2012` 只选择 Icarus 的 IEEE 1800-2012 language generation；`COMPILE_ERROR` 只表示设计未被这个锁定 profile 接受，不能单独证明 RTL 违反 SystemVerilog 标准。

repository 中必须保存 profile ID 到完整语义的不可变映射，至少包括：

```text
executableProduct: Icarus Verilog
expectedVersion: Icarus Verilog version 12.0 (devel) (s20150603-1539-g2693dd32b)
argvPrefix: [-g2012, -tnull]
topSelection: [-s, validated-top-module]
sourceOrdering: ECMAScript UTF-16 ordinal (`<` comparator)
includePolicy: forbidden
compilationUnitPolicy: ordered sources in one Icarus compilation unit
environmentPolicy: win32 [ComSpec, Path, SystemRoot, TEMP, TMP]; POSIX [PATH, TMPDIR]
timeoutMs: 30000
```

实际 Icarus release/build identity、target、language/strict/extension/warning flags、source ordering、include policy、compilation-unit policy或环境语义发生变化时，必须使用新 profile ID 或提升 profile version，并在 `docs/decisions.md` 记录。实现时必须安装并锁定一个实际 release；如果当前 host 无法运行真实 Icarus，R03 标记 `BLOCKED`，不得以 fake compiler、Verilator 或在线编译器替代完成证据。

## Source Preparation 与输入绑定

request-builder 只发现 `workspace/rtl/**` 下的普通 `.sv`/`.v` 文件。它复用 R01 logical-path、workspace containment、symlink/special-file、NFC/case-fold collision 和 extension policy，不接受 shell glob、filelist、library directory、`-D`、`-I`、parameter override 或任意 caller flags。

source list 使用一个共享的、与 `CompileRequestSchema` 和 manifest 生成器一致的 ordinal comparator 排序，禁止 `localeCompare()`。当前 R01 若继续使用 ECMAScript 字符串 `<`，R03 就沿用并将其记录为 profile 语义；只有同时修改公共 comparator、schema 和生成器后才能改称 Unicode code-point ordering。文件顺序属于 compiler 语义，不只是输出稳定性处理。Core Loop v1 fixture 不得依赖跨文件 macro 状态或 compiler directive 传播；多文件 mechanics fixture 只验证 module instantiation 和 top elaboration。

### Include policy

Core Loop v1 禁止 `` `include``。source preparation 必须在 spawn 前对全部 source 执行保守的预处理指令扫描；发现任何非注释中的 `` `include`` 指令时返回稳定的 `UNSUPPORTED_INCLUDE_DIRECTIVE` preparation failure，不判断条件编译分支当前是否激活，也不调用 compiler。scanner 必须覆盖跨 chunk、字符串、行注释和块注释边界，不能用会把注释文本误判为指令的单行正则替代。

如以后支持 header，必须新增 profile，并同时实现受控相对解析、workspace containment、普通文件/symlink 检查、header manifest binding 和 include-search policy；不得在本任务中隐式扩大范围。

### Preparation result

R01 `CompileRequestSchema.sourceFiles` 至少包含一个 `.sv`/`.v` 文件。R03 新增独立的严格 `CompilePreparationResult` 判别联合，不修改或复用已经实现的 `CoreLoopErrorCodeSchema`：

```text
READY:
  schemaVersion: 1
  runId
  attempt: 0..3
  compilerProfileId
  compilerInvoked: false
  request: CompileRequest

NO_RTL_SOURCE | UNSUPPORTED_INCLUDE_DIRECTIVE | SOURCE_POLICY_VIOLATION:
  schemaVersion: 1
  runId
  attempt: 0..3
  compilerProfileId
  compilerInvoked: false
  message: bounded stable text
```

`READY` 只表示 request 已准备好，尚未调用 compiler。空 RTL root 返回 `NO_RTL_SOURCE`；include 返回 `UNSUPPORTED_INCLUDE_DIRECTIVE`；非法路径、碰撞、symlink、special file 或非法 extension 返回 `SOURCE_POLICY_VIOLATION`。所有 failure 都不构造 `CompileResult`，由 R04 保存为 compiler-not-invoked evidence。这个新增 union 是 R03 request-builder 的 additive API，不改变 R01/R02 已有 error envelope。

request-builder 为 `READY.request` 写入刚刚确认稳定的 workspace manifest digest。compile adapter 仍必须独立复查；request 建立后发生 digest mismatch 时构造 `TOOL_ERROR`，不能退回 preparation failure 或信任旧 request。

baseline 使用 `attempt: 0`，Agent 编辑后的 compile 使用 `attempt: 1..3`。`compilerProfileId` 必须等于上述 repository profile；fixture、spec、Agent 和 run request 均不能覆盖 executable、argv、environment、cwd、timeout 或 output limits。

### Mutable workspace 检测

R03 不把 mutable workspace 包装成 snapshot。manifest scope 固定复用 R01 baseline workspace scope：相对 run root 的 `workspace/spec.md` 与 `workspace/rtl/**`，不包含 `workspace/context/**` 或 evidence。每次执行必须按以下顺序验证：

1. spawn 前连续生成两个 scope 一致的 workspace manifest；两者必须稳定，并与 request 的 `workspaceManifestDigest` 相等；
2. 在 filesystem boundary 重新验证每个 source 的存在性、普通文件属性、extension、logical-path collision、workspace containment 和非 symlink 状态；
3. compiler `close` 后再次连续生成两个同 scope manifest；
4. 后两个 manifest 必须稳定并与 spawn 前 manifest 相等；否则返回 `TOOL_ERROR`，使用稳定无 host path 的 issue message `WORKSPACE_CHANGED_DURING_COMPILE`。

manifest 稳定检查仍不能提供原子输入视图，因此结果保持 non-authoritative。R04 必须保证 R02 Agent turn 已完全退出并通过其 postconditions 后才能调用 R03。

## Version Probe 与 Process Profile

adapter 构造时将 operator config 做不可变快照，将 executable 解析为当前 host 的绝对普通文件，并拒绝 shell wrapper。每次 compile 前重新执行固定版本 probe；只有 probe 成功、版本可解析且与 profile 的 `expectedVersion` 完全一致时才启动 compile。probe 本身使用独立 timeout、持续 drain 和 bounded output；原始多行版本摘要只进入有界 adapter evidence，`toolVersion` 保存规范化的实际 identity。

compile 和 probe 都使用显式 spawn options：

```ts
{
  shell: false,
  cwd: orchestratorOwnedWorkingDirectory,
  stdio: ["ignore", "pipe", "pipe"],
  env: controlledEnvironment,
  windowsHide: true,
  detached: false,
}
```

`cwd` 由 orchestrator 创建或绑定，不能继承 CLI 的任意当前目录。environment 采用经过真实 smoke 验证的最小固定 allowlist，不记录完整 host environment。Windows 只提供一个规范化的 `Path` 键；`SystemRoot`、`TEMP`、`TMP` 等仅在实际安装版本证明需要后加入并冻结到 profile 语义。后续 compile 直接 spawn 已解析的绝对 executable。

## Bounded Output Capture

stdout 和 stderr 分别持续 drain，不能在达到 preview 上限后暂停 stream、移除 listener 或停止读取。每个 stream：

1. 使用 `Buffer.length` 累计工具写出的原始 `originalByteLength`；
2. 只保留 capture 上限内的 bytes，超出部分继续读取但丢弃；
3. 使用 streaming UTF-8 decoder 处理 chunk 边界；
4. 在 `close` 后执行换行规范化、ANSI/control-character 清理、workspace path logical 化、workspace 外 host-path 脱敏和最终 UTF-8 byte truncation；
5. 对 stdout、stderr、单条 issue、issue 数量和整个 result 分别执行固定上限。

达到 issue 数上限后不再追加 issue，但仍继续 drain 两个 stream。每个 stream 内保持接收的字节和行顺序；stdout/stderr 不声明 compiler 写入时的全局顺序。issue 使用固定 stream precedence 形成确定性顺序，首版固定先解析 stderr、再解析 stdout。

## Diagnostic 与 Status 判定

parser 只从明确 diagnostic token 提取 `kind`、path、line 和 column。workspace 内 host path 转成 logical path；workspace 外 path 从 issue、stdout 和 stderr 中统一替换。缺少证据时省略 path/line/column，不能写 `null` 或猜测。

status 使用以下优先级，先匹配的结果获胜：

| 优先级 | 观察结果 | status |
|---:|---|---|
| 1 | request preparation 失败 | 不生成 `CompileResult`，compiler not invoked |
| 2 | version probe missing、spawn/timeout/parse failure 或 version mismatch | `TOOL_ERROR` |
| 3 | compile spawn 发出 `error` | `TOOL_ERROR` |
| 4 | 任何 termination/最终 `close` 未在硬期限内确认，或 adapter internal failure | `TOOL_ERROR` |
| 5 | request digest 不匹配，或 compile 前后 manifest 不稳定/不一致 | `TOOL_ERROR` |
| 6 | timeout 已触发，且 termination 与最终 `close` 均确认 | `TIMEOUT` |
| 7 | 非 timeout signal termination | `TOOL_ERROR` |
| 8 | exit 0，但 parser 产生明确 `ERROR` 或 adapter consistency failure | `TOOL_ERROR` |
| 9 | exit 0，且没有 `ERROR` 或 adapter failure | `COMPILE_PASSED` |
| 10 | 非零 exit，存在明确 syntax/elaboration/root-module diagnostic | `COMPILE_ERROR` |
| 11 | 非零 exit，只有明确 internal/helper/crash diagnostic 或无法可靠分类 | `TOOL_ERROR` |

`COMPILE_ERROR` 必须至少包含一个 `kind: "ERROR"` issue。只有 process outcome 已被可靠分类为设计错误、但位置或正文无法结构化解析时，adapter 才能生成无 path 的有界 fallback `ERROR`；未知非零退出不能仅靠 fallback 被降格为设计错误。warning 可以出现在 `COMPILE_PASSED.issues[]` 中。

timeout 由 timer 触发且进程关闭得到确认后，即使 kill 产生非零 exit 仍保持 `TIMEOUT`。非 timeout signal 的 `exitCode` 为 `null`。runner 必须使用一次性 finalize guard 处理 `error`、timeout、`exit` 和 `close` 的竞态；capture 和 result 以 `close` 为正常完成边界。timeout 后执行当前 host 已验证的 bounded termination，并对 termination 和最终 close confirmation 分别设置硬期限；无法确认关闭时返回 `TOOL_ERROR`，不能无限等待或继续声称普通 `TIMEOUT`。

## Compile Result

R03 返回经兼容修订后的 R01 `CompileResultSchema`，不增加 cleanup 字段、自定义 issue code、signal 字段或第二个 manifest 字段：

```text
schemaVersion: 1
status: COMPILE_PASSED | COMPILE_ERROR | TIMEOUT | TOOL_ERROR
authoritative: false
claim: COMPILE_ONLY
runId
attempt: 0..3
compilerProfileId
toolVersion: string | null  # 仅 TOOL_ERROR 可为 null
topModule
workspaceManifestDigest
exitCode: number | null
durationMs
issues[]
stdout/stderr: sanitized preview + truncated + raw originalByteLength + optional artifactPath
```

分支约束：

- `COMPILE_PASSED`：`exitCode: 0`，`toolVersion` 非空；
- `COMPILE_ERROR`：`exitCode` 为非零整数，`toolVersion` 非空；
- `TIMEOUT`：`exitCode: null`，`toolVersion` 非空；
- `TOOL_ERROR`：`exitCode` 为整数或 `null`，`toolVersion` 为实际版本或 `null`。

## 实现步骤

1. 完成并回归验证限定的 R01 schema 兼容修订，不改 R02 行为。
2. 安装真实 Icarus，记录绝对 executable、规范化版本、bounded probe 摘要和 host。
3. 冻结 `iverilog-systemverilog-2012-null-v1` profile 的 release、argv、ordering、include、env、cwd、timeout 和 limits。
4. 实现 source discovery、include scanner、stable manifest preparation 和 filesystem revalidation。
5. 实现 version probe、fixed argv builder 和 bounded process runner。
6. 实现持续 drain、timeout/termination/close 状态机和严格 result mapping。
7. 实现 diagnostic parser、path normalization、stream precedence 和 fallback policy。
8. 用 fake executable 覆盖确定性边界；用临时生成 RTL 执行独立、不可静默 skip 的真实 Icarus 验收。
9. 更新 `docs/verification.md`、task breakdown、decision 与 handoff evidence。

## 测试要求

### Contract 与 preparation

- 旧的合法 R01/R02 contract fixtures 继续通过；只有 `TOOL_ERROR` 允许 `toolVersion: null`。
- raw `originalByteLength` 与 sanitized preview 长度不同时 schema 可正确表达，host path 拒绝不放宽。
- 空 RTL root 返回 `NO_RTL_SOURCE`，include 返回 `UNSUPPORTED_INCLUDE_DIRECTIVE`，二者均不 spawn。
- 注释或字符串中的 `` `include`` 文本不误报；真实 directive、chunk boundary 和 block comment boundary 被覆盖。
- source 只接受普通 `.sv`/`.v`；symlink、case collision、越界、非法 extension 和 request 后文件替换被拒绝。
- source ordering 使用共享 comparator；相同 basename、不同目录能稳定映射 diagnostic。
- compile 期间 manifest 变化返回 `TOOL_ERROR` 和稳定 message。

### Process 与 parser

- argv 固定含 `-g2012 -tnull -s <top>` 和排序 source，不含 `-o`、shell string 或自由 flags。
- missing executable、probe spawn/timeout/oversized output、version mismatch 和 compile spawn error 返回 `TOOL_ERROR`。
- fake compiler 覆盖 exit 0、明确 design error、未知非零、internal error、非 timeout signal、timeout 与 termination 未确认。
- exit 0 + warning 返回 `COMPILE_PASSED`；exit 0 + 明确 ERROR 返回 `TOOL_ERROR`。
- timeout 触发且关闭确认后不被 kill exit code 改写；termination/close 未确认则为 `TOOL_ERROR`；正常 completion 等待 `close`。
- UTF-8 字符跨 chunk、ANSI、NUL、其他控制字符和 CRLF/LF 规范化有确定结果。
- Windows `C:\...` diagnostic 不把 drive colon 当作位置分隔符。
- workspace 外路径在 issue、stdout 和 stderr 中均不泄漏。
- stdout/stderr 超限后 fake compiler 仍正常退出，证明 runner 持续 drain。

### 真实 Icarus

- 临时 valid input 返回 `COMPILE_PASSED`；syntax error、missing top、blank source with declared top 和明确 elaboration error 返回 `COMPILE_ERROR`。
- 临时多文件输入验证固定 ordering、module instantiation 和 top elaboration，不依赖跨文件 macro/directive。
- `-tnull` 不产生 VVP output，测试过程不调用 `vvp`。
- 对同一 final RTL 立即连续重跑，classification、profile/version 和 `workspaceManifestDigest` 一致。

普通单元测试在未安装 Icarus 时可以运行，但真实验收必须有独立命令且不得自动 skip。建议实现以下稳定入口：

```powershell
corepack pnpm --filter @rtl-agent/core-loop test:integration:iverilog
corepack pnpm --filter @rtl-agent/rtl-core-loop compile:smoke
```

## 验证命令

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm --filter @rtl-agent/core-loop --fail-if-no-match test
corepack pnpm --filter @rtl-agent/rtl-core-loop --fail-if-no-match test
corepack pnpm --filter @rtl-agent/core-loop test:integration:iverilog
corepack pnpm --filter @rtl-agent/rtl-core-loop compile:smoke
corepack pnpm test
corepack pnpm build
corepack pnpm format:check
iverilog -V
git diff --check
& 'C:\Program Files\Git\bin\bash.exe' scripts/harness_check.sh
```

真实 compile smoke 只使用临时生成输入，不依赖 evaluation case，也不计入 R04 评测证据。Session Log 必须记录实际 executable、version、profile identity、host、pass/error/timeout/tool-error 结果和当前 host termination 限制。

## 完成定义

- 限定的 R01 schema 兼容修订通过 regression tests，R02 全部既有测试继续通过。
- 固定版本 Icarus 在当前 host 通过独立、不可 skip 的 pass/error/elaboration/null-target 验收。
- executable、argv、cwd、environment、timeout、source discovery 和 profile 均不能由 Agent、fixture 或 run request 覆盖。
- compiler 实际输入受 include policy、stable manifest 和 filesystem revalidation 约束；workspace 变化不会被绑定到旧 digest。
- process 状态机持续 drain 输出、等待 close、区分 design error 与 timeout/tool failure，并在 termination 无法确认时 fail closed。
- feedback 有界、logical-path 化且不泄漏 host path；每个结果明确 non-authoritative/compile-only。
- breakdown 中 R03 标记 `DONE` 并登记 profile/version、真实 smoke、timeout、manifest drift 和重跑证据。

## 参考资料

- [Icarus Verilog Command Line Flags](https://steveicarus.github.io/iverilog/usage/command_line_flags.html)
- [The null Code Generator (`-tnull`)](https://steveicarus.github.io/iverilog/targets/tgt-null.html)
- [Icarus Verilog Quirks](https://steveicarus.github.io/iverilog/usage/icarus_verilog_quirks.html)
- [Node.js `child_process`](https://nodejs.org/api/child_process.html)

## 实现交接内容

Session Log 记录 R01 compatibility patch、Icarus executable/version、完整 profile mapping、timeout/output limits、include policy、manifest scope、当前 host termination 限制、diagnostic 分类覆盖率、test-only compile 结果，以及 R04 只能对 `COMPILE_ERROR` 继续修复的规则。不得把临时 mechanics fixture 当成评测集，也不得把 Windows Core Loop 结果描述为 Linux authoritative Gate evidence。

实现于 2026-07-17 完成。Windows evidence 绑定 winget package `Icarus.Verilog 12.2022.06.11`、`C:\iverilog\bin\iverilog.exe`、上述 exact identity、`-g2012 -tnull -s`、30 秒 compile timeout、5 秒 probe timeout、500 毫秒 termination grace、每流 64 KiB preview、128 KiB retained capture、100 条 issue 和 2048-byte issue message。真实 integration 5/5、CLI smoke、165 项全仓测试及统一质量命令均通过；权威进度和 digest 以 `docs/task-breakdown.md` 与 Session Log 为准。
