# A02 — 定义跨层 Contract 与稳定错误模型

## 任务索引

- 权威进度：以 `docs/task-breakdown.md` 为准
- 进入条件：A01 已完成且统一命令全部通过
- 前置任务：A01 已完成且统一命令全部通过
- 后续任务：A03
- 进度与验收证据登记位置：`docs/task-breakdown.md`、`.harness/session-log.md`

## 目标

在 `@rtl-agent/contracts` 中建立所有跨层数据的唯一运行时定义。Zod schema 是输入验证入口，TypeScript 类型从 schema 推导，不再维护一套手写平行类型。A02 只定义数据形状、规范化和错误协议，不实现状态转换。

## 当前平台验收策略

- Contract、logical path 和 canonical JSON 的设计仍必须同时考虑 Windows 与未来 Linux 运行语义。
- 当前 A02 的完成证据只要求在 Windows 上执行本文件列出的 lint、typecheck、test 和 build；不要求 Linux 执行结果。
- 与大小写、symlink 或 Linux 文件系统有关的补充验证可以后置，但 contract 不得因此接受反斜杠、盘符、绝对逻辑路径或 `..` traversal。
- 没有 Linux 证据时不能声称 contracts 已完成生产 Linux 兼容性认证。

## 设计原则

- Contract 是 MCP、CLI、domain、storage 和未来 worker 之间的版本化 JSON 边界。
- 未知 schema version、未知字段和非规范值一律拒绝，不能静默补默认值后继续。
- JSON contract 不包含 `Date`、`BigInt`、`Map`、class instance、Buffer 或宿主绝对路径。
- IDs、logical paths、timestamps、digests 和 idempotency keys 在进入 domain 前已完成格式校验。
- 错误使用稳定 code；message 面向人，可调整，不可作为调用方分支依据。
- `contracts` 不依赖 MCP、SQLite、Node process、文件系统或网络 API。

## 范围

### 必须实现

- schema version、ID、logical path、digest、timestamp、state version、idempotency key。
- task、stage、status、review、command envelope、command payload、event envelope、event payload。
- error code、error envelope 和安全 details。
- canonical JSON 编码规则及 SHA-256 输入字节定义；A02 不负责持久化。
- parse/serialize/round-trip/negative tests。

### 非目标

- 不实现 command → event 或 event → state；属于 A03。
- 不生成 UUID、当前时间或 hash；这些值由应用边界提供。
- 不定义 SQLite row 类型；属于 A04 adapter 内部。
- 不实现 MCP tool schema；A08 从这些 domain contracts 派生或组合。
- 不实现 review nonce、身份验证或提交决定接口；属于 A09/A10。

## 文件结构

```text
packages/contracts/src/
  index.ts
  json.ts
  version.ts
  identifiers.ts
  paths.ts
  task.ts
  review.ts
  command.ts
  event.ts
  error.ts
packages/contracts/test/
  identifiers.test.ts
  paths.test.ts
  command-roundtrip.test.ts
  event-roundtrip.test.ts
  canonical-json.test.ts
  error.test.ts
```

只从 `src/index.ts` 暴露公共 contract。测试不得导入内部文件验证一个未公开的 API。

## 规范类型

### 基础值

| 类型 | 规则 |
|---|---|
| `SchemaVersion` | 当前只接受整数 `1` |
| `TaskId` | `task_` + 小写 UUID v4 文本 |
| `CommandId` | `cmd_` + 小写 UUID v4 文本 |
| `EventId` | `evt_` + 小写 UUID v4 文本 |
| `ReviewId` | `review_` + 小写 UUID v4 文本 |
| `WorkspaceId` | `ws_` + 小写 UUID v4 文本；实际宿主目录由 daemon 配置映射，不入 DB contract |
| `CorrelationId` | `corr_` + 小写 UUID v4 文本 |
| `IdempotencyKey` | 1–128 个 ASCII 字符，仅允许字母、数字、`.`、`_`、`:`、`-` |
| `StateVersion` | 安全整数，最小为 0；未创建任务使用 0，首个成功 command 后为 1 |
| `IsoTimestamp` | canonical UTC millisecond：`YYYY-MM-DDTHH:mm:ss.sssZ`；大写 `T/Z`、固定三位毫秒、不接受 offset/闰秒，且 `toISOString()` round-trip 完全相等 |
| `Sha256Digest` | `sha256:` + 64 个小写十六进制字符 |
| `LogicalPath` | workspace-relative POSIX path；除原有 traversal/absolute 规则外，拒绝 Windows 保留字符、ASCII control、首尾歧义空格、尾部点、设备名、未配对 surrogate；总长最多 1024 UTF-8 bytes，segment 最多 255 UTF-8 bytes |

Zod 输出使用 brand，避免把任意 string 传给要求特定 ID/path 的函数。生成器不放在 contracts 包；测试 fixture 可以提供显式常量。

### 阶段与状态

先定义 HLD 已批准的稳定全集，A03 只实现 Phase A 子集：

```text
Stage =
  SPEC_FREEZE
  VERIFICATION_PLAN
  VERIFICATION_ENV
  VERIFICATION_REVIEW
  RTL_IMPLEMENTATION
  VERIFY_AND_REPAIR
  VERIFICATION_CHALLENGE
  REGRESSION_REVIEW

TaskStatus =
  ACTIVE
  WAITING_REVIEW
  GATE_RUNNING
  PAUSED
  COMPLETED
  CANCELLED
```

终态用 `TaskStatus` 表示，不添加伪 stage `COMPLETED`。Stage contract 的扩展仍需新的 schema version 或向后兼容的明确决策。

### Review

首版 contract 定义：

- `ReviewType`: `SPEC_APPROVAL | VERIFICATION_APPROVAL | VERIFICATION_CHALLENGE | REGRESSION_APPROVAL`
- `ReviewStatus`: `PENDING | DECIDED | EXPIRED | CANCELLED`
- `ReviewDecision`: `APPROVE | REJECT | REQUEST_CHANGES`
- `ReviewBinding` 按 `ReviewType` 建立 strict discriminated union，不能使用一组任意组合的 optional digest：
  - `SPEC_APPROVAL`：`taskId`、`reviewId`、`stateVersion`、`specDigest`
  - `VERIFICATION_APPROVAL`：上述 identity 加 `snapshotDigest`、`verificationManifestDigest`
  - `VERIFICATION_CHALLENGE`：上述 identity 加 `snapshotDigest`、`gateInputDigest`
  - `REGRESSION_APPROVAL`：上述 identity 加 `snapshotDigest`、`gateInputDigest`

Phase A 尚未创建通用 SnapshotStore，因此 Spec Approval 绑定服务端计算的 spec bytes digest；这不是正式 snapshot 身份。A09 必须从已绑定 workspace 读取并计算 digest，不能信任 Agent 自报。其余 review 类型在对应 Phase B/C 功能实现前只稳定 contract 形状，A03 对其转换 fail closed。

允许的 decision 列表是 review 实例数据，必须有 1–3 个不重复值，不允许调用方提交 schema 未声明的自由文本决定。

## Command contract

统一 envelope：

```ts
type CommandEnvelope = {
  schemaVersion: 1;
  commandId: CommandId;
  idempotencyKey: IdempotencyKey;
  correlationId: CorrelationId;
  expectedStateVersion: StateVersion;
  requestedAt: IsoTimestamp;
  actor:
    | { type: "AGENT"; id: ConstrainedActorId }
    | { type: "USER"; id: ConstrainedUserId }
    | { type: "SYSTEM"; id: "workflow-daemon" };
  command: Command;
};
```

A02 必须定义的 Phase A command union：

| `type` | 核心字段 | 说明 |
|---|---|---|
| `START_WORKFLOW` | `taskId`, `workspaceId`, `specPath` | `expectedStateVersion` 必须为 0，由 A03 校验语义 |
| `REQUEST_REVIEW` | `taskId`, `reviewId`, `reviewType`, `allowedDecisions`, bindings | Agent 或系统创建审核请求 |
| `RECORD_REVIEW_DECISION` | `taskId`, `reviewId`, `decision` | 只定义内部 command；不得因此成为 Agent MCP Tool |

所有 object schema 使用 strict 模式。Command union 以 `type` 为 discriminator；正式边界 parser 将未知 command type 稳定映射为 `UNKNOWN_COMMAND`。

`actor.id` 最长 128 字符并使用类型对应的 ASCII allowlist。`requestedAt` 是调用边界提供的元数据，不是状态排序、超时或审计的权威时间；A03 继续只使用显式 `DecisionContext.occurredAt` 更新状态时间。

### Command result

跨层 result 同样在 contracts 包定义，供 A05、MCP 和 CLI 共用：

```ts
type CommandSuccess = {
  schemaVersion: 1;
  ok: true;
  taskId: TaskId;
  stateVersion: StateVersion;
  events: readonly EventEnvelope[];
};

type CommandResult = CommandSuccess | ErrorEnvelope;
```

`ok` 是 discriminator。Success 必须能 canonical serialize 并从 idempotency record strict parse；不能把 application class instance 或 SQLite row 当作结果。

`events` 必须包含 1–100 个事件，并作为一个原子 command batch 校验：task、command、correlation、before/after version 和 `occurredAt` 一致，`eventIndex` 从 0 连续递增，`eventId` 不重复，result `stateVersion` 等于 batch target version。A02 不增加另一层持久化 `EventBatch` envelope；A03 的 `evolveBatch` 负责原子 replay，A04 的 `event_sequence` 负责数据库全局顺序。

## Event contract

统一 envelope：

```ts
type EventEnvelope = {
  schemaVersion: 1;
  eventId: EventId;
  taskId: TaskId;
  commandId: CommandId;
  correlationId: CorrelationId;
  eventIndex: number;
  occurredAt: IsoTimestamp;
  stateVersionBefore: StateVersion;
  stateVersionAfter: StateVersion;
  event: DomainEvent;
};
```

A02 必须定义的 Phase A event union：

- `WORKFLOW_STARTED`
- `REVIEW_REQUESTED`
- `REVIEW_DECISION_RECORDED`

`eventIndex` 从 0 开始，只表示同一 command 产生的事件顺序；数据库全局/任务序号由 A04 负责。一个成功 command 无论产生几个 event，`stateVersionAfter = stateVersionBefore + 1`，同批 event 使用相同 before/after。

## Task state contract

首版 `TaskState` 至少包含：

```text
schemaVersion, taskId, workspaceId, specPath,
currentStage, status, stateVersion,
pendingReviewId?, createdAt, updatedAt
```

约束：

- `workspaceId` 是逻辑绑定，不保存 `D:\...` 或 `/home/...`。
- `specPath` 是 `LogicalPath`，例如 `spec/design.md`。
- `pendingReviewId` 只有 `WAITING_REVIEW` 时允许存在；该跨字段语义由 A03 校验，不塞进通用 parse 逻辑。

## Canonical JSON

实现纯函数 `canonicalizeJsonJcs(value): string`，并保留 `canonicalizeJson` alias。输出严格遵循 RFC 8785 JSON Canonicalization Scheme：

1. 输入必须是 I-JSON 兼容值：null、boolean、有限 IEEE 754 number、有效 Unicode string、array、plain object。
2. object key 按未转义字符串的 UTF-16 code unit 字典序排列，并递归处理 object；array 保持元素顺序但递归 canonicalize 其中 object。
3. primitive 使用 ECMAScript JSON serialization；`-0` 输出 `0`。
4. 不执行 Unicode normalization；不同 normalization form 保持不同。
5. 拒绝 `NaN`、Infinity、undefined、BigInt、symbol key、accessor/non-enumerable property、循环引用、非 plain object 和未配对 surrogate。
6. 输出不含空格、换行或 BOM；后续 hash 调用方必须将返回文本编码为无 BOM UTF-8 bytes。

该函数产生后续 idempotency payload digest 的唯一输入。不要把 object insertion order 或 pretty-printed JSON 用于身份计算。

## 错误模型

首版稳定 code：

```text
VALIDATION_ERROR
UNSUPPORTED_SCHEMA_VERSION
INVALID_IDENTIFIER
INVALID_LOGICAL_PATH
TASK_NOT_FOUND
TASK_ALREADY_EXISTS
STATE_VERSION_CONFLICT
INVALID_TRANSITION
UNKNOWN_COMMAND
UNKNOWN_EVENT
IDEMPOTENCY_CONFLICT
REVIEW_NOT_FOUND
REVIEW_ALREADY_DECIDED
REVIEW_BINDING_MISMATCH
INTERNAL_ERROR
```

Error envelope：

```ts
type ErrorEnvelope = {
  schemaVersion: 1;
  ok: false;
  error: {
    code: ErrorCode;
    message: string;
    retryable: CodeSpecificLiteral;
    correlationId: CorrelationId;
    details?: CodeSpecificStrictDetails;
  };
};
```

- `error` 内部按 `code` 使用 discriminated union；每个 code 固定 `retryable` literal 和 strict details schema，不能用通用 `JsonObject` 绕过 allowlist。
- `message` 为 1–1024 字符；validation issues 最多 50 个，path 最多 32 段，单个字符串段最多 256 字符。
- `details` 不放 stack、SQL、绝对路径、源码、完整 command 或 secret；`INTERNAL_ERROR` 不允许 details，外部 message 固定使用泛化文本。
- Zod issue 转为稳定的字段路径/issue kind，不能把依赖库完整错误直接当外部协议。
- `INTERNAL_ERROR` 的外部 message 固定为泛化文本；内部诊断留给 A06 日志。

## 实现步骤

1. 在 contracts 包安装并精确锁定 `zod@4.4.3`；不得在 domain 再安装另一套 schema 库。
2. 实现 JSON value 与基础 branded schema。
3. 实现 logical path schema；使用纯字符串规则验证逻辑路径，不调用 `path.normalize` 把非法输入“修好”。
4. 实现 stage/status/review schemas。
5. 实现 discriminated command/event unions 和 envelopes。
6. 实现 TaskState 与 ErrorEnvelope。
7. 实现 CommandSuccess/CommandResult、command batch invariant 和 RFC 8785 JCS，并导出最小公共 API。
8. 实现 `parseCommandEnvelope(input)` 和 `parseEventEnvelope(input)`：先检查 plain object、schema version 和 command/event discriminator，再 strict parse；把 Zod issue 映射为稳定 `ValidationIssue`，不得直接暴露原始 issue。
9. 为每类正例、边界值、非法值和 round-trip 添加表驱动测试。
10. 检查包依赖图，确保 contracts 没有 Node/MCP/storage import。

## 测试要求

- 每种 ID：合法、错误 prefix、大写 UUID、非 v4、额外空白。
- LogicalPath：`rtl/fifo.sv` 通过；`/rtl/fifo.sv`、`rtl\\fifo.sv`、`rtl/../secret`、`./rtl`、`rtl//fifo.sv`、盘符、UNC、空路径失败。
- timestamp：UTC `Z` 通过，带本地 offset、非法日期、非 canonical 小数秒按选定规则失败。
- 每个 enum 未知值失败。
- 每个 command/event parse 后 serialize 再 parse 保持深度相等。
- strict object 对额外字段失败。
- canonical JSON 对不同 key 插入顺序产生完全相同字节；array 顺序不同则结果不同。
- canonical JSON 使用 RFC 8785 官方 UTF-16 排序和 primitive 样例，覆盖 emoji、`-0`、指数、控制字符与 Unicode normalization。
- canonical JSON 非法输入 fail closed。
- ErrorEnvelope 不接受未知 error code、错误 retryability 或 code allowlist 外 details。
- `schemaVersion: 2` 稳定映射为 `UNSUPPORTED_SCHEMA_VERSION`；未知 command/event discriminator 分别映射为 `UNKNOWN_COMMAND`/`UNKNOWN_EVENT`。

## 验证命令

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm --filter @rtl-agent/contracts --fail-if-no-match test
corepack pnpm test
corepack pnpm build
rg -n "node:(fs|path|process|child_process)|@modelcontextprotocol|sqlite|better-sqlite3" packages/contracts
& 'C:\Program Files\Git\bin\bash.exe' scripts/harness_check.sh
```

最后一个 `rg` 应无源码命中；测试描述中的文本命中需要人工判断。

## 完成定义

- 所有 contract 只有一个 Zod 运行时定义，TS 类型由其推导。
- strict parse、版本拒绝、logical path、canonical JSON 和 error envelope 测试通过。
- contracts 包无 MCP、SQLite、process、FS 或网络依赖。
- A03 不需要从聊天记录猜 ID、版本或 state-version 规则。
- 在 breakdown 将 A02 标记 `DONE` 并登记验证证据后，才开始 A03。

## 实现交接内容

Session Log 记录实际 Zod 版本、导出的公共 API、任何与本文不同的 contract 决策、验证命令结果和 A03 可以依赖的 schema version。正式边界调用方必须使用公开 parse helper；raw schema 只用于组合和可信内部值构造。任何字段或枚举调整先写入 `docs/decisions.md`。
