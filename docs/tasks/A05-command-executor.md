# A05 — 实现单一 Command Executor

## 任务索引

- 权威进度：以 `docs/task-breakdown.md` 为准
- 进入条件：A04 已完成且 migration/storage 集成测试通过
- 前置任务：A04 已完成且 migration/storage 集成测试通过
- 后续任务：A06、A07、A09
- 进度与验收证据登记位置：`docs/task-breakdown.md`、`.harness/session-log.md`

## 目标

实现 Workflow Daemon 内唯一的领域写入入口。Command Executor 串行接收 command，并在一个同步短事务中完成幂等检查、版本检查、纯 domain 决策、task projection、event、outbox 和 command result。事务提交后返回的结果必须能在进程崩溃或客户端重试后重放。

## 当前平台验收策略

- Executor、FIFO queue、hash、transaction orchestration 和错误处理不得依赖 Windows shell 或宿主路径语义，保证未来可在 Linux daemon 中运行。
- 当前 A05 的完成证据只要求 Windows 上的 lint、typecheck、SQLite integration、并发、rollback、restart、failure-injection 测试和 build 通过；不要求 Linux 执行结果。
- 暂缓 Linux 证据不允许放宽同步短事务、无外部副作用、CAS 或幂等原子性要求。
- 没有 Linux 证据时不能声称 Command Executor 已完成生产 Linux runtime 验证。

## 代码归属

新增 `@rtl-agent/application` package 承载 application service。Command Executor 不放入纯 `domain`，也不塞进 SQLite `storage` adapter：

```text
contracts <- domain
    ^          ^
    +----------+
         application -> storage
                ^
                |
       workflow-daemon / CLI / tests
```

该 package 在 A05 创建；A01 无需提前创建空壳。A05 结束时更新根 project references 和 workspace build。

## 范围

### 必须实现

- 单实例、FIFO 串行的 Command Executor。
- command parse、idempotency scope/material/digest。
- expected state version 检查。
- 调用 A03 `decide`，写 task projection、events、outbox、idempotency result。
- start insert 和 existing task CAS update。
- 同 key 同 payload replay、同 key 不同 payload conflict。
- 并发、rollback、restart、failure injection 集成测试。

### 非目标

- 不实现 daemon lifecycle、MCP transport、HTTP、CLI 或 logging；属于 A06–A10。
- 不执行 snapshot、文件扫描、compile、simulation、网络或 Langfuse export。
- 不实现 outbox dispatcher；A05 只原子登记 outbox row。
- 不实现 SQLite 多进程写入或 Postgres。
- 不实现自动 retry 无限循环。可重试 storage error 由后续 service policy 处理。

## 文件结构

```text
packages/application/
  package.json
  tsconfig.json
  src/
    index.ts
    command-executor.ts
    command-queue.ts
    command-result.ts
    idempotency.ts
    execution-context.ts
    projection-writer.ts
    outbox-mapper.ts
    errors.ts
  test/
    command-executor.test.ts
    idempotency.test.ts
    concurrency.test.ts
    rollback.test.ts
    restart.test.ts
    fixtures.ts
```

集成测试使用 A04 真实 file-backed SQLite adapter，不用 mock DB 证明事务语义。纯 idempotency material/outbox mapper 可用单元测试。

## 公共 API

```ts
interface CommandExecutor {
  execute(input: unknown): Promise<CommandResult>;
}

type CommandResult = CommandSuccess | ErrorEnvelope;

type CommandSuccess = {
  schemaVersion: 1;
  ok: true;
  taskId: TaskId;
  stateVersion: StateVersion;
  events: readonly EventEnvelope[];
};
```

失败结果直接使用 A02 `ErrorEnvelope`。A02 实现时必须把 success/failure result schema 一并放入 contracts；A05 不创建第二套 wire type。

Executor composition dependencies：

- A02 command/result parsers 与 canonical JSON。
- A03 `decide`。
- A04 transaction manager 和 repositories。
- 一个显式 `ExecutionContextFactory`，在 transaction 外生成 `occurredAt`、event IDs、outbox IDs。

`ExecutionContextFactory` 的生产实现可以用 `Date`/`crypto.randomUUID`，domain 仍然纯；测试使用固定序列实现。

## 幂等语义

### Scope

- `START_WORKFLOW`：`workspace:<workspaceId>`。
- 其他 task command：`task:<taskId>`。

Scope 是数据库内部稳定文本，不暴露给 Agent。不同 scope 可重用相同 key；同一 task 内不可把同一 key 用于不同 command。

### Payload material

计算 digest 前 canonicalize：

```text
schemaVersion
expectedStateVersion
actor
command
```

明确排除：`commandId`、`idempotencyKey`、`correlationId`、`requestedAt`。这些字段可能因传输重试改变，不属于业务意图。Actor 必须进入 digest，避免不同身份复用 key。

```text
payload_digest = SHA256(UTF8(canonicalizeJson(material)))
```

### Existing key 行为

| 情况 | 行为 |
|---|---|
| scope/key 不存在 | 正常执行 |
| 存在且 command type/digest 相同 | parse 已保存 `response_json` 并原样返回，不再调用 domain/写 event/outbox |
| 存在但 command type 或 digest 不同 | 返回 `IDEMPOTENCY_CONFLICT`，不改变原记录 |
| 已保存 response 无法通过 schema parse | fail closed 为 storage corruption，不重新执行 command |

对通过 contract parse 的 command，确定性领域拒绝也保存为 idempotency response，例如 `STATE_VERSION_CONFLICT`、`INVALID_TRANSITION`。validation 无法解析出可靠 scope/key 时不写 idempotency。SQLite I/O、进程中断等基础设施失败不保存结果，允许同一 key 重试。

## 单写者与 transaction 规则

- 一个 daemon process 只构造一个 Command Executor 和一个写 connection。
- `execute` 可异步排队，但 transaction callback 必须同步且不返回 Promise。
- FIFO queue 只序列化写 command；未来只读 query 不必进入此 queue。
- repository 写方法不向其他 app service 暴露；composition root 只把 executor 暴露给修改型用例。
- SQLite 使用 `BEGIN IMMEDIATE`。transaction 内禁止 `await`、文件、子进程、网络、sleep、Langfuse 或大 payload 计算。
- command parse、canonical JSON/hash、IDs/time 生成在入队前或 transaction 前完成；domain decide 是纯且有界，可在 transaction 中执行。

队列实现必须处理 rejection 后继续消费，不能让一个失败 Promise 永久断开链。关闭行为属于 A07，但 A05 可暴露 `drain()` 供后续使用。

## 执行流程

```text
1. Parse input as CommandEnvelope
2. Derive scope + canonical material + SHA-256 digest
3. Create bounded execution context (IDs/time)
4. Enqueue in the single FIFO writer
5. BEGIN IMMEDIATE
6. Read idempotency record
   6a. same digest -> return stored response, COMMIT read transaction
   6b. different digest -> return IDEMPOTENCY_CONFLICT
7. Load current task projection
8. Check expectedStateVersion
9. Call domain.decide(current, command, context)
   9a. deterministic domain failure -> store failure response, COMMIT
10. Persist next task using insert/CAS
11. Append all events in eventIndex order
12. Insert one outbox row per domain event
13. Store canonical CommandResult in idempotency_keys
14. COMMIT
15. Return the exact committed result
```

任何第 10–13 步错误都 rollback 整个 transaction；不能返回成功，也不能留下 task/event/outbox/idempotency 的部分组合。

## Projection 与 CAS

### Start

使用 task primary key insert。重复 task ID 的非幂等请求映射为 `TASK_ALREADY_EXISTS`，不能用 `INSERT OR REPLACE`。

### Existing task

```sql
UPDATE tasks
SET current_stage = ?,
    status = ?,
    state_version = ?,
    pending_review_id = ?,
    updated_at = ?
WHERE task_id = ? AND state_version = ?;
```

affected rows 必须恰好为 1；0 表示 `STATE_VERSION_CONFLICT`，>1 是 invariant/storage error。禁止无 version 条件 update。

虽然 FIFO 单写者使进程内 CAS 冲突少见，CAS 仍是数据库边界的防御，且为未来 Postgres/多实例迁移保留语义。

## Event 与 Outbox

- event payload 使用 A02 canonical JSON；数据库列中的 type/version 与 payload 解析结果必须一致。
- 同一 command 的 event 按 `eventIndex` 插入。
- outbox topic 首版固定 `workflow.domain-event.v1`。
- outbox payload 是最小版本化通知，包含 event ID、task ID、command ID、correlation ID 和 event type；不要复制规格、源码或任意 command payload。
- outbox ID 由 execution context 提供；一 event 对应一 outbox row。
- A05 不读取/发送 outbox。

## 错误与返回

- Contract parse 失败：`VALIDATION_ERROR`，无 DB 写入。
- Idempotency mismatch：`IDEMPOTENCY_CONFLICT`。
- expected version mismatch/CAS 0 rows：`STATE_VERSION_CONFLICT`。
- domain failure：使用 domain 的稳定 code。
- SQLite constraint/lock/disk error：映射为内部 storage error；外部 message 不含 SQL、DB path 或 stack。
- transaction commit 是否成功不确定时不得盲目重跑新 key；原 key 重试会查询 idempotency row并确定结果。

A05 不添加日志，但错误对象应保留安全的 cause 分类，供 A06 记录。

## 实现步骤

1. 在 A02 补齐 `CommandSuccess`/`CommandResult` schema（若 A02 已按本文实现则跳过），不复制类型。
2. 创建 application package、project references 和依赖边界检查。
3. 实现纯 idempotency scope/material/digest helpers，并做 golden tests。
4. 实现不会因 rejection 断链的 FIFO queue。
5. 实现 execution context interface 与固定测试 factory。
6. 实现 projection/outbox mapping 纯函数。
7. 实现 transaction 内 command flow，先覆盖 start，再覆盖 request/decision review transition。
8. 添加真实 SQLite rollback、concurrency 和 restart tests。
9. 添加 failure injection seam，仅允许测试替换 repository step；生产 API 不暴露任意 hook。
10. 更新 `docs/verification.md` 和 dependency graph 说明。

## 测试要求

### Idempotency

- same scope/key + same material 顺序/字段 insertion 不同：返回第一次结果，无新 event/outbox/version。
- same scope/key + different command、actor、expected version 或 payload：`IDEMPOTENCY_CONFLICT`。
- retry 使用不同 commandId/correlationId/requestedAt 但相同 material：返回已保存的原 result，包括原 event IDs。
- 进程关闭、重开 DB 和新建 executor 后重试：仍返回原 result。
- 坏 response JSON：fail closed，不重新执行。

### 并发与版本

- 20 个不同 key、同 task、同 expected version 并发提交：恰好 1 个状态变更成功，version 只加 1，其余返回 version conflict。
- 20 个相同 key/相同 payload 并发提交：结果相同，只有一组 event/outbox。
- 两个不同 task command 按 FIFO 可依次成功；不要求 A05 并行写。
- queue 中一个 command 抛基础设施错误后，后续 command 仍会执行。

### Atomicity

分别在 task write、event append、outbox insert、idempotency insert 前后注入异常；每次检查 DB 要么保持旧状态，要么包含完整新组合，没有部分提交。

- domain rejection 不改变 task/event/outbox，但其 failure response 可幂等重放。
- CAS 失败不追加 event/outbox。
- event unique constraint 失败会回滚 task update。
- idempotency insert 失败会回滚 task/event/outbox。

### Transaction boundary

- 用测试 instrumentation 断言 transaction callback 同步完成。
- 静态扫描 application transaction path 不含 `await`、`fetch`、`spawn`、filesystem API。
- 大型/恶意 payload 在 A02 parse 限制处被拒绝，避免在 transaction 中处理无限数据。

## 验证命令

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test --filter @rtl-agent/application
corepack pnpm test --filter @rtl-agent/storage
corepack pnpm test
corepack pnpm build
rg -n "await|fetch\(|node:fs|child_process|spawn\(|exec\(" packages/application/src packages/storage/src
rg -n "UPDATE tasks" packages
& 'C:\Program Files\Git\bin\bash.exe' scripts/harness_check.sh
```

人工确认每个 `UPDATE tasks` 都带 expected version 条件，且 application transaction 路径没有外部副作用。

## 完成定义

- 所有领域写入口统一经过一个 FIFO Command Executor。
- task、events、outbox 和 idempotency result 在同一短事务内原子提交。
- 同 key 同 material 可跨重启重放；不同 material 稳定冲突。
- 并发测试证明只发生一次有效推进；CAS 防御存在。
- failure injection 证明不存在部分提交。
- 事务内无 await、文件、网络、子进程或 telemetry。
- breakdown 中 A05 标记 `DONE` 并登记证据后，A06/A07/A09 才可开始。

## 实现交接内容

Session Log 记录 application public API、idempotency material golden digest、并发测试计数、每个 failure injection 结果、DB 重启重放证据、统一命令结果和 A06/A07/A09 的可用扩展点。任何绕过 executor 的写 repository 调用都必须在进入下一任务前删除。
