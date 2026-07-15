# A03 — 实现纯领域状态机

## 任务索引

- 权威进度：以 `docs/task-breakdown.md` 为准
- 进入条件：A02 已完成且 contract 测试通过
- 前置任务：A02 已完成且 contract 测试通过
- 后续任务：A04
- 进度与验收证据登记位置：`docs/task-breakdown.md`、`.harness/session-log.md`

## 目标

在 `@rtl-agent/domain` 中实现 Phase A 的确定性状态转换。给定相同当前状态、command 和显式上下文，必须产生相同的下一状态与事件；给定相同初始状态和事件序列，必须还原相同投影。Domain 不读取数据库、文件系统、时钟、随机数、环境变量或网络。

## 当前平台验收策略

- Domain 必须保持无平台 API、无文件系统和无 shell 依赖，使同一状态机以后可在 Linux 运行。
- 当前 A03 的完成证据只要求 Windows 上的 lint、typecheck、完整表驱动测试和 build 通过；不要求 Linux 测试结果。
- 纯函数确定性和 exhaustive/fail-closed 覆盖不能因暂缓 Linux 验证而降低。
- 没有 Linux 证据时不能声称已经完成生产 Linux runtime 验证。

## 核心 API

建议公共 API：

```ts
type DecisionContext = {
  occurredAt: IsoTimestamp;
  eventIds: readonly EventId[];
};

type Decision = {
  previousState: TaskState | null;
  nextState: TaskState;
  events: readonly EventEnvelope[];
};

function decide(
  currentState: TaskState | null,
  command: CommandEnvelope,
  context: DecisionContext,
): Result<Decision, DomainError>;

function evolve(
  currentState: TaskState | null,
  event: EventEnvelope,
): Result<TaskState, DomainError>;

function replay(events: readonly EventEnvelope[]): Result<TaskState, DomainError>;
```

`Result` 使用项目内简单 discriminated union，不引入函数式框架。不要抛异常表达预期领域失败；真正的程序错误可以抛出并由上层转成 `INTERNAL_ERROR`。

## 范围

### 必须实现

- `START_WORKFLOW`、`REQUEST_REVIEW`、`RECORD_REVIEW_DECISION` 的 Phase A 规则。
- command → event 的 `decide`。
- event → state 的 `evolve` 和事件 replay。
- 显式 transition table 与表驱动测试。
- state version、event batch 和时间更新规则。
- 非法转换、未知事件、事件顺序错误的 fail-closed 行为。

### 非目标

- 不实现 repository、transaction、CAS 或 idempotency；属于 A04/A05。
- 不实现 nonce、review 持久化、用户身份认证或 CLI；属于 A09/A10。
- 不实现 gate、snapshot、issue routing 或 Phase B/C 转换。
- 不调用 Zod parse 取代领域语义检查。A02 保证形状，A03 保证状态含义。
- 不添加日志；属于 A06。

## 文件结构

```text
packages/domain/src/
  index.ts
  result.ts
  errors.ts
  state-invariants.ts
  transition-table.ts
  decide.ts
  evolve.ts
  replay.ts
packages/domain/test/
  transition-table.test.ts
  decide.test.ts
  evolve.test.ts
  replay.test.ts
  determinism.test.ts
  fixtures.ts
```

## State version 规则

1. 不存在的 task 被视为 version 0。
2. 每个成功 command 恰好把 version 加 1，不按 event 数量累加。
3. 同一 command 产生的所有 event 共享相同 `stateVersionBefore` 和 `stateVersionAfter`。
4. `eventIndex` 必须从 0 连续递增。
5. `updatedAt` 使用 command context 的 `occurredAt`；不得调用 `Date.now()`。
6. `createdAt` 只由 `WORKFLOW_STARTED` 设置，后续事件不得修改。
7. Command envelope 的 `expectedStateVersion` 必须等于当前 version；否则返回 `STATE_VERSION_CONFLICT`。
8. `evolve` 要求 event before version 与当前 state 一致，after version恰好为 before + 1；同批多个 event 的投影应用需要 batch-aware reducer。

由于一个 command 未来可能产生多个 event，内部应实现 `evolveBatch`：先校验整个 batch 的 task/command/version/index，再按顺序更新投影，最后只设置一次目标 version。不要逐事件把 version 加多次。

## Phase A transition table

### Command 转换

| 当前状态 | Command | 额外条件 | 下一状态 | Event | 结果 |
|---|---|---|---|---|---|
| task 不存在 | `START_WORKFLOW` | expected version = 0 | `SPEC_FREEZE / ACTIVE / v1` | `WORKFLOW_STARTED` | 允许 |
| task 已存在 | `START_WORKFLOW` | 任意 | 不变 | 无 | `TASK_ALREADY_EXISTS` |
| `SPEC_FREEZE / ACTIVE` | `REQUEST_REVIEW` | type=`SPEC_APPROVAL`，无 pending review | `SPEC_FREEZE / WAITING_REVIEW` | `REVIEW_REQUESTED` | 允许 |
| `SPEC_FREEZE / WAITING_REVIEW` | `RECORD_REVIEW_DECISION` | review ID 匹配，decision=`APPROVE` | `VERIFICATION_PLAN / ACTIVE` | `REVIEW_DECISION_RECORDED` | 允许 |
| `SPEC_FREEZE / WAITING_REVIEW` | `RECORD_REVIEW_DECISION` | review ID 匹配，decision=`REJECT` 或 `REQUEST_CHANGES` | `SPEC_FREEZE / ACTIVE` | `REVIEW_DECISION_RECORDED` | 允许 |
| 其他任意状态 | 上述修改 command | 不匹配合法项 | 不变 | 无 | `INVALID_TRANSITION` 或更具体错误 |

Phase A 只实现 Spec Approval 的领域路径。A02 已声明其他 review type 是为了稳定跨层 contract，但它们要到 Phase B/C 对应任务增加 transition；A03 对其 fail closed。

### Review binding 规则

- `REQUEST_REVIEW.taskId` 必须等于 task state ID。
- request 绑定的 `stateVersion` 必须等于 command 执行前 version。
- Phase A Spec Approval 不要求 snapshot/gate/verification digest；若调用方提供不适用的正式 Gate binding，拒绝而非忽略。
- 等待审核时 task 投影保存 `pendingReviewId`。
- 决定的 review ID 必须与 `pendingReviewId` 相同，否则返回 `REVIEW_BINDING_MISMATCH`。
- `RECORD_REVIEW_DECISION.actor.type` 必须是 `USER`。这只是 domain defense-in-depth；真正 Agent 无法访问提交接口由 A08–A10 保证。
- decision 后清除 `pendingReviewId`。

## Event evolve 规则

### `WORKFLOW_STARTED`

- 只允许从 null state 应用。
- 创建 `SPEC_FREEZE / ACTIVE` task。
- event payload 是 task 初始化字段的权威来源。

### `REVIEW_REQUESTED`

- 只允许从 `SPEC_FREEZE / ACTIVE` 应用。
- 设置 `WAITING_REVIEW` 和 `pendingReviewId`，stage 不变。

### `REVIEW_DECISION_RECORDED`

- 只允许从 `SPEC_FREEZE / WAITING_REVIEW` 应用。
- review ID 必须匹配 pending review。
- approve 进入 `VERIFICATION_PLAN / ACTIVE`。
- reject/request changes 回到 `SPEC_FREEZE / ACTIVE`。
- 清除 pending review。

未知 event type、task ID 改变、command ID 混批、eventIndex 缺口、版本跳跃或时间倒退均返回错误。时间相等允许，以支持同一 command batch。

## State invariant

实现一个纯函数 `validateStateInvariants(state)`，至少检查：

- version >= 1。
- `WAITING_REVIEW` 必须有 `pendingReviewId`。
- 非 `WAITING_REVIEW` 不得有 `pendingReviewId`。
- Phase A 中 `SPEC_FREEZE` 只允许 `ACTIVE` 或 `WAITING_REVIEW`。
- `VERIFICATION_PLAN` 在 A03 只允许 `ACTIVE`，且不接受进一步修改 command。
- createdAt <= updatedAt。
- task、workspace、spec path 初始化后不可被后续 event 改变。

每次 `decide` 输出和 `evolveBatch` 输出都执行 invariant 检查。不要只在测试中检查。

## 错误优先级

同一输入可能同时错误时按以下顺序返回，使测试和调用方稳定：

1. task identity / existence。
2. expected state version。
3. command 是否适用于 stage/status。
4. actor 和 review binding。
5. command 具体字段的领域语义。
6. 输出 invariant。

形状不合法的 command 不应进入 domain；若直接调用 domain 绕过 parse，函数可以接受已推导类型，不需重复 Zod parse。

## 实现步骤

1. 创建无副作用的 `Result` 与 `DomainError` 类型，并映射到 A02 ErrorCode。
2. 写 transition table fixture，先覆盖全部合法/非法组合。
3. 实现 state invariant，先用手工构造的非法状态测试。
4. 实现 `evolveBatch` 和单事件包装器，再实现 replay。
5. 实现 `decide`，只生成 contract event，不写 projection。
6. 在 `decide` 中用 `evolveBatch` 生成 next state，避免出现两套转换逻辑。
7. 添加 determinism、immutability 和 exhaustive tests。
8. 检查 domain import graph，保证无 I/O/API 依赖。

## 测试要求

### 表驱动覆盖

- 对 Stage × Status × Command type 组合逐项声明 allow/deny，不只测试 happy path。
- 三种 review decision 均有结果断言。
- 所有 A02 已知但 A03 暂未支持的 review type 均被拒绝。
- expected version 过旧、过新均失败且不产生 event。
- mismatched task/review/state binding 均失败。

### 确定性与纯度

- 同一输入深拷贝执行多次，Decision 完全深度相等。
- 输入 object 在执行后保持不变；可在测试中 deep-freeze。
- 不 mock clock、UUID、database 或 filesystem；所有非确定值由 context 传入。
- 对 event replay 多次得到同一 TaskState。

### Fail closed

- 用运行时 cast 构造未知 command/event，返回 `UNKNOWN_COMMAND`/`UNKNOWN_EVENT`。
- event index 缺口、重复、乱序失败。
- batch 中 taskId、commandId 或 version 混杂失败。
- 非法中间状态不返回部分投影。

## 验证命令

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test --filter @rtl-agent/domain
corepack pnpm test
corepack pnpm build
rg -n "node:(fs|path|process|child_process)|@modelcontextprotocol|sqlite|better-sqlite3|Date\.now|randomUUID" packages/domain
& 'C:\Program Files\Git\bin\bash.exe' scripts/harness_check.sh
```

源码中上述 dependency/API 扫描应无命中；测试名或说明文本命中需人工判断。

## 完成定义

- transition table 的所有 Phase A 分支有表驱动测试。
- `decide` 复用 `evolveBatch`，没有 command 路径与 replay 路径语义漂移。
- version、event batch、review binding 和 state invariant 明确且通过测试。
- domain 没有 DB、FS、MCP、process、clock 或 random 依赖。
- 未支持的 Phase B/C 转换 fail closed。
- breakdown 中 A03 标记 `DONE` 并登记证据后，才开始 A04。

## 实现交接内容

Session Log 记录公开 domain API、完整 transition coverage 统计、测试命令结果、任何新增错误码/不变量，以及 A04 需要持久化的 TaskState/Event 字段。如果转换规则需要改 HLD，先记录 `docs/decisions.md`，不得在代码中默默改变。
