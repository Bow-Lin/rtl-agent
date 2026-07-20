# R01 — 定义 Core Loop Contract、运行目录与 Fixture 接口

## 任务索引

- 权威进度：以 `docs/task-breakdown.md` 为准
- 进入条件：A03 已完成；Core Loop 检查点已获确认
- 前置任务：A03
- 可并行后续：R02、R03
- 汇合任务：R04
- 进度与验收证据登记位置：`docs/task-breakdown.md`、`.harness/session-log.md`

## 目标

建立一个刻意受限、明确非权威的 Spec → RTL 实验边界。R01 定义输入输出 schema、dataset-backed fixture 接口、每次运行的隔离目录和证据布局，使 R02 的 Agent 与 R03 的编译器可以围绕同一组规范化输入独立实现。

R01 不调用模型，也不调用 RTL 编译器。它只回答四个问题：Agent 读什么、能改什么、编译器编什么、实验留下什么证据。

## 设计原则

- Core Loop 验证“Agent 能否生成可编译 RTL、能否利用编译错误修复 RTL”，不建立正式可信边界。
- fixture 是评测数据集用例进入 Core Loop 后的规范化内部表示，不等于仓库内手写样例。
- normalized fixture 永远只读。每次 run 都物化到新的可变 workspace，不能让 Agent 修改 dataset source、fixture metadata 或 `core-loop/fixtures/**`。
- spec、fixture 配置、Agent 输入和编译 profile 都不是 Agent 可写资产。
- 所有路径进入 schema 时使用相对 POSIX logical path；宿主路径只在文件系统边界通过 `node:path` 生成。
- 运行结果必须携带 `authoritative: false` 和 `claim: "COMPILE_ONLY"`。禁止把 compile pass 表述为功能正确、验证通过或正式 Gate 通过。
- R01 contract 是 Core Loop 内部 contract，不扩展 A02 的正式 workflow/event/error schema。

## 范围

### 必须实现

- 新建私有库 `packages/core-loop`（`@rtl-agent/core-loop`），作为 Core Loop contract、fixture loader、manifest 和运行目录机制的所有者；`apps/rtl-core-loop` 保持为薄 CLI 边界。
- 用 Zod 定义并导出 schema version 1 的 fixture、run request、attempt context、compile result 和 final result。
- 建立 `core-loop/fixtures/` 预留位置、说明文件和 `FixtureProvider`/materialize 接口，但不提交具体评测用例。
- 定义 dataset provenance，包括 dataset ID/version/split/case ID、source digest 和 license/reference metadata。
- 实现 fixture 校验、运行目录物化和 workspace/evidence 路径解析。
- 实现 run workspace 的文件清单与 allowed-write postcondition 检查。
- 将 `.rtl-agent/` 加入 `.gitignore`，其中只存本地实验 workspace 和证据。
- 增加 schema、provider contract、路径、物化、重复运行隔离和越界写检测测试；测试数据在临时目录中生成。

### 非目标

- 不创建 OpenCode Agent、Skill 或模型调用；属于 R02。
- 不执行 Icarus Verilog、Verilator、仿真或 testbench；编译属于 R03，功能验证属于后续任务。
- 不实现自动 repair loop、汇总指标或继续/停止决策；属于 R04。
- 不写 SQLite、outbox、daemon、MCP、review、snapshot 或正式 Gate。
- 不把 Core Loop schema 放进 `@rtl-agent/contracts`，也不修改 A03 领域状态机。
- 不选择、下载、镜像或提交具体评测数据集；数据集选择、license 审查和 adapter 实现由后续评测准备决定。
- 不把测试代码中的临时 synthetic case 宣称为评测数据或能力证据。

## 计划文件结构

```text
packages/core-loop/
  package.json
  tsconfig.json
  src/
    contracts.ts
    errors.ts
    fixture-provider.ts
    catalog.ts
    filesystem.ts
    manifest.ts
    materialize.ts
    output.ts
    index.ts
  test/
    contracts.test.ts
    catalog.test.ts
    materialize.test.ts
    manifest-policy.test.ts
apps/rtl-core-loop/
  package.json
  tsconfig.json
  src/
    index.ts
  test/
    cli.test.ts
core-loop/fixtures/
  README.md
.rtl-agent/
  runs/
    <run-id>/
      workspace/
        spec.md
        context/
        rtl/
      evidence/
```

R01 将库和薄应用接入现有 pnpm workspace、TypeScript project references、Vitest 和统一验证命令。不要继续拆分更多 Core Loop package，也不要新增通用 framework 或第二套 build system。

## Fixture Contract

R01 把数据集来源、规范化 fixture、运行 profile 和创建 run 请求拆开。`fixtureId` 只是便于人阅读的别名；稳定身份是结构化的 `FixtureIdentity = datasetId + datasetVersion + split + caseId`。

规范化 fixture 使用 schema version 1。空白生成和带初始 RTL 的编译修复是判别联合，不能用可选 `starterRtlRoot` 混成一个宽松对象：

```json
{
  "schemaVersion": 1,
  "fixtureId": "case-0001",
  "provenance": {
    "identity": {
      "datasetId": "operator-selected-dataset",
      "datasetVersion": "pinned-version",
      "split": "evaluation",
      "caseId": "case-0001"
    },
    "datasetSourceDigest": "sha256:...",
    "caseSourceDigest": "sha256:...",
    "license": { "name": "operator-reviewed-license" },
    "adapter": {
      "adapterId": "dataset-adapter",
      "adapterVersion": "v1",
      "normalizationVersion": "v1"
    }
  },
  "category": "BLANK_GENERATION",
  "specPath": "spec.md",
  "workspaceRtlRoot": "rtl",
  "topModule": "dut_top",
  "tags": ["dataset-case"],
  "normalizedFixtureDigest": "sha256:..."
}
```

字段规则：

- `fixtureId`：小写 kebab-case，必须等于 provider 返回的稳定 case ID 映射，最长 64 字符。
- `provenance`：不可缺省；`datasetSourceDigest` 在数据集没有可验证的整体制品时可缺省，`caseSourceDigest`、adapter/version、normalization version 和 license metadata 必须存在。
- `category`：`BLANK_GENERATION | PROMPTED_FUNCTIONAL_REPAIR | SEEDED_COMPILE_REPAIR`。
- `BLANK_GENERATION` 与 prompt 内嵌 buggy RTL 的 `PROMPTED_FUNCTIONAL_REPAIR` 不含 starter RTL；`SEEDED_COMPILE_REPAIR` 必须含 `starterRtlRoot: "rtl"` 和 `starterRtlDigest`。Prompted functional repair 在当前阶段仍只有 compile-only 证据。
- `specPath`、`starterRtlRoot`、`workspaceRtlRoot`：复用 A02 `LogicalPath`，规范化后固定为 `spec.md` 与 `rtl`；不得绝对、遍历或包含宿主盘符。
- `topModule`：SystemVerilog identifier 的保守 ASCII 子集 `[A-Za-z_][A-Za-z0-9_$]*`，最长 128 字符。
- `tags`：稳定、去重、排序后的短字符串，只用于结果分组，不改变执行。
- `normalizedFixtureDigest`：包含结构化 provenance、规范化字段和规范化文件清单；不包含 run ID、时间、context 或 evidence。

`CoreLoopRunProfile` 单独持有 `profileId`、只做语法校验的 `compilerProfileId`、最多 3 次 attempt 及输出/issue 上限。`CreateRunRequest` 只组合 `FixtureCaseRef` 与 profile，不接受 run ID、任意 executable、argv、环境变量或 profile 覆盖。R03/R04 才负责确认 repository-owned compiler profile 实际存在。

规范化 fixture 不允许 executable、任意 argv、shell command、环境变量、绝对路径、模型 secret 或期望通过标记。外部数据集字段不能未经 allowlist 直接透传到 Agent input。

## Core Loop Result Contract

R01 先定义 R02–R04 共用的最小结果 vocabulary：

```text
RtlCompileStatus =
  COMPILE_PASSED | COMPILE_ERROR | TIMEOUT | TOOL_ERROR

RtlRunOutcome =
  COMPILE_PASSED | MAX_ATTEMPTS | AGENT_FAILED | TOOL_ERROR |
  TIMEOUT | POLICY_VIOLATION | NO_RTL_CHANGE
```

每个 compile result 至少包含：

```json
{
  "schemaVersion": 1,
  "authoritative": false,
  "claim": "COMPILE_ONLY",
  "status": "COMPILE_ERROR",
  "compilerProfileId": "iverilog-systemverilog-2012-v1",
  "toolVersion": "implementation-time pinned value",
  "topModule": "dut_top",
  "exitCode": 1,
  "durationMs": 123,
  "issues": [],
  "stdout": { "preview": "", "truncated": false, "originalByteLength": 0 },
  "stderr": { "preview": "", "truncated": false, "originalByteLength": 0 }
}
```

每个 final result 必须重复 `authoritative: false` 与 `claim: "COMPILE_ONLY"`，并记录 `fixtureId`、`runId`、`outcome`、attempt 数、最终 RTL manifest digest、profile/version 和开始/结束时间。时间用于实验记录，不参与结果身份或正式状态推进。

这里的 `iverilog-systemverilog-2012-v1` 只是 R01 用于证明 profile ID 语法和 handoff shape 的 test placeholder；R01 不声明 repository profile 存在。R03 冻结的实际 profile 是 `iverilog-systemverilog-2012-null-v1`。R03 实现前只会补充两项向后兼容的表达能力：`TOOL_ERROR` 可使用 `toolVersion: null`，以及 `originalByteLength` 表示脱敏前的 raw pipe bytes。其余 R01 workspace、manifest、attempt 和 status 边界保持不变。

R01 还完整定义 `AgentAttemptInput`、`CompileRequest`、四分支 `CompileResult` 和 `FinalResult`，使 R02/R03 可以只依赖 R01 公共 API 并行实现。stdout/stderr 使用 UTF-8 byte 截断，保存 sanitized preview、`truncated`、`originalByteLength` 和可选 logical artifact path；JSON 中不得出现宿主绝对路径。所有用户可见 message、日志和 issue 采用 profile 固定上限。

## Run 目录与隔离规则

run ID 由应用生成，不接受 Agent 或 fixture 提供。物化后的目录固定为：

```text
.rtl-agent/runs/<run-id>/
  workspace/
    spec.md
    context/agent-input.json
    rtl/**
  evidence/
    run-request.json
    fixture.json
    baseline-manifest.json
    attempts/**
    final-result.json
```

规则：

1. provider materialize 的 normalized fixture 通过校验后进入新 run workspace；目标目录已存在则失败，不能覆盖或续写。
2. `workspace/spec.md` 与 `workspace/context/**` 由 orchestrator 写入，对 Agent 只读。
3. Agent 唯一允许的写根是 `workspace/rtl/**`。
4. evidence 位于 workspace sibling；OpenCode 以 `workspace` 为 working directory，不能把 evidence 当作可写工作区。
5. 物化拒绝 symlink、junction、特殊文件、路径逃逸和 case-fold 后重复路径。首版只接受普通文件与目录。
6. 每个 Agent turn 前后生成 workspace manifest。任何 `rtl/**` 之外的新增、修改、删除都产生 `POLICY_VIOLATION`，该 run 立即停止。
7. manifest 至少记录 logical path、byte length 和 SHA-256；排序必须稳定。它是实验证据，不是 B02/B03 正式 manifest 或 immutable snapshot。
8. run 目录原子发布成功后，该 run 即视为创建成功；临时 staging 清理是 best-effort。清理失败通过稳定的 `STAGING_CLEANUP_FAILED` warning 返回，不能把已经发布的成功结果改写成失败。

首版清单与 digest 分三层：

- `normalizedFixtureDigest`：规范化来源、字段及文件内容身份。
- `baselineWorkspaceManifestDigest`：只覆盖稳定的 `workspace/spec.md` 与初始 `workspace/rtl/**`，排除 run ID、时间、context 和 evidence。
- attempt/run manifest：覆盖整个 run root，可包含动态 context/evidence，用于 Agent turn 前后净变化比较。

manifest digest 是按 logical path 排序的 `{path, byteLength, contentDigest}[]` 经 A02 RFC 8785 JCS 后的 SHA-256；单文件 digest 直接覆盖原始 bytes，不做换行或 Unicode 规范化。路径集合还要做 NFC + case-fold collision 检查，而且 `FileManifestSchema` 必须在所有解析入口独立执行该检查，不能只依赖 manifest 生成器。before/after manifest 只能发现净变化，无法发现“写入后恢复原内容”的瞬时行为；这个限制对非权威 Core Loop 可接受，R02 仍必须同时限制 Agent 权限。

## Dataset-backed Fixture 接口

R01 只定义数据集到 Core Loop 的窄接口，不实现具体数据集 adapter：

```ts
interface FixtureProvider {
  describe(): Promise<DatasetDescriptor>;
  listCases(selection: DatasetSelection): AsyncIterable<FixtureCaseRef>;
  materialize(
    caseRef: FixtureCaseRef,
    destination: HostDirectory,
  ): Promise<FixtureMaterialization>;
}
```

接口要求：

- `describe` 返回固定 dataset ID/version、source digest、license/reference 和可用 split，不执行隐式升级。
- `listCases` 返回稳定 case identity；顺序由明确 selection/profile 决定，不能依赖主机目录枚举顺序。
- `materialize` 只向 orchestrator 提供的全新 staging 目录写候选文件并返回声明性 `FixtureMaterialization`；Provider 不能自行声称内容已经规范化。
- Core Loop 在 Provider 返回后独立扫描 staging，拒绝 symlink/junction/特殊文件、未声明文件、非 RTL starter 文件和碰撞路径，然后计算并返回 `NormalizedFixture`。
- provider 不返回 executable、compiler flags、model prompt、secret 或宿主绝对路径。
- dataset 中的 spec、starter RTL、reference solution、testbench 和 metadata 必须分类。Agent 只获得明确 allowlist 的 spec/current RTL；reference answer 和 hidden tests 永远不进入 Agent workspace。
- 同一 dataset/version/split/case 在相同 adapter/normalization version 下产生相同 normalized fixture digest。
- dataset 变更、adapter 变更或 case normalization 变更都必须产生新的 digest/evaluation profile，不能覆盖旧批次含义。
- R01 不建立 `.rtl-agent/fixture-cache` 或任何持久 CAS；每次请求使用临时 staging，发布 run 后清理。

`core-loop/fixtures/README.md` 只说明 provider 接口、预留路径和禁止提交未审查数据集内容。它不是 fixture 清单。

## 实现步骤

1. 新建 `packages/core-loop` 私有库和薄 `apps/rtl-core-loop` 应用并接入 root references。
2. 定义 Core Loop schemas、常量上限和 parse API。
3. 实现 logical-path 到 host-path 的受控转换和 fixture loader。
4. 实现 run ID、独占目录创建、fixture materialization 和 manifest。
5. 实现 allowed-write diff/postcondition。
6. 使用 test-only 临时 provider 生成 schema/路径正负样例；不提交 canonical 评测 case。
7. 添加 `core-loop:fixtures:check`，未配置 provider 时输出稳定 `DATASET_NOT_CONFIGURED` 并以非零退出，绝不回退到内置样例。
8. 更新 `docs/verification.md`，记录 R01 专项命令和“未选择数据集”的预期诊断。

## 测试要求

- test-only provider 生成的 normalized fixture 通过 schema、provenance 与文件存在性校验，测试结束后不留下评测内容。
- 未配置 dataset/provider 时返回稳定 `DATASET_NOT_CONFIGURED` 或等价诊断，不静默使用内置样例。
- dataset/version/split/case/source digest 缺失或不一致时 fail closed。
- fixture ID/目录不一致、未知字段、绝对路径、`..`、反斜杠、非法 top、错误 category 被拒绝。
- 不存在 spec 或 starter root 时 fail closed；R01 只校验 compiler profile ID 语法，profile 存在性由 R03/R04 负责。
- 同一 fixture 两次 materialize 产生不同 run 目录但相同 baseline manifest digest。
- run 发布成功后的 staging 清理失败返回 `STAGING_CLEANUP_FAILED` warning，且已发布 run 仍可读取。
- 已存在 run ID、symlink/junction、case-only collision 和越界目标被拒绝。
- `FileManifestSchema` 本身拒绝 NFC 或 case-fold 后碰撞的 logical paths，不能通过手工构造 manifest 绕过。
- 修改 `rtl/**` 被允许；修改 spec/context、删除 workspace root 文件或新增越界文件产生 `POLICY_VIOLATION`。
- `captureOutput` 即使未收到调用方提供的 redaction hint，也会清理 Windows drive、UNC、quoted POSIX host path 和 `file://` host path；`CapturedOutputSchema` 在解析边界再次拒绝残留路径并按 UTF-8 bytes 强制 1 MiB 上限，同时不误伤普通 HTTP(S) URL。
- parse/serialize round-trip 保留语义，未知 schema version 被拒绝。

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

## 完成定义

- Core Loop 内部 contract、dataset-backed provider 接口、预留目录和运行边界已实现并通过临时数据测试。
- 仓库没有把具体评测数据集或手写评测用例作为 R01 交付物。
- normalized fixture 与 dataset source 不会被 run 修改，Agent 可写根可以通过前后 manifest 强制检查。
- 所有结果类型明确非权威、仅 compile-only，且不能推进正式 A03 state。
- R02 与 R03 可以只依赖 R01 公共 API 并行实现。
- Windows 与 Linux 都应执行文件系统 contract 测试；若本地没有 Linux runtime，R01 交接必须明确记录缺少的证据与 case sensitivity/symlink 风险，不能宣称 Linux 就绪。
- breakdown 中 R01 标记 `DONE` 并登记证据后，才开始 R02/R03。

## 实现交接内容

Session Log 记录 package 公共 API、provider/provenance contract、预留目录、test-only provider、run/evidence 目录、path/symlink 限制、manifest 算法、结果上限和 R02/R03 应调用的入口。不得登记虚构的评测数据集或 fixture 成绩。
