# A04 — 建立 SQLite Schema 与 Migration 框架

## 任务索引

- 权威进度：以 `docs/task-breakdown.md` 为准
- 进入条件：A03 已完成且状态机测试通过
- 前置任务：A03 已完成且状态机测试通过
- 后续任务：A05
- 进度与验收证据登记位置：`docs/task-breakdown.md`、`.harness/session-log.md`

## 目标

在 `@rtl-agent/storage` 中建立首版 SQLite 持久化边界，包括迁移、启动检查、repository interface 和同步 adapter。A04 只提供可靠的数据访问能力，不在 repository 中实现领域转换或跨表 command 编排。

## Adapter 选择

首版使用 `better-sqlite3`，执行 A04 时将通过 Windows/Linux smoke test 的版本精确锁定；当前设计基线为 `12.10.0`。选择原因：

- API 同步，适合一个 Command Executor 在单连接上执行不跨 event-loop tick 的短事务。
- 支持完整 transaction，并提供 Node LTS 预编译包。
- 相比之下，Node 24.18 的 `node:sqlite` 官方稳定级别仍为 `1.2 - Release candidate`，暂不作为权威状态存储基线。

如果 `better-sqlite3@12.10.0` 在 A04 的 Windows/Linux CI 安装或运行失败，不得静默换库；先在 `docs/decisions.md` 记录新 adapter、兼容性证据和迁移成本。[better-sqlite3](https://github.com/WiseLibs/better-sqlite3)；[Node 24 SQLite API](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html)

## 范围

### 必须实现

- `schema_migrations`、`tasks`、`stage_attempts`、`reviews`、`workflow_events`、`idempotency_keys`、`outbox` 首版 schema。
- 有序、可校验、可重复执行的 migration runner。
- SQLite connection factory 和启动 PRAGMA 设置/读取验证。
- repository interfaces 与 SQLite adapter。
- transaction abstraction，但不实现 A05 Command Executor。
- 本机文件系统路径策略与明显网络路径拒绝。
- schema/constraint/migration/transaction 集成测试。

### 非目标

- 不实现 command orchestration、CAS retry 或 idempotency 语义；属于 A05。
- 不在 transaction 中运行 snapshot、文件扫描、EDA、网络或 telemetry。
- 不实现 snapshot/gate/run tables；属于 Phase B migration。
- 不实现 review nonce/认证/CLI；属于 A09/A10。
- 不引入 ORM、query builder 或第二个 SQLite library。

## 文件结构

```text
packages/storage/src/
  index.ts
  errors.ts
  database-path.ts
  sqlite-connection.ts
  migrations.ts
  transaction.ts
  repositories/
    task-repository.ts
    stage-attempt-repository.ts
    review-repository.ts
    event-repository.ts
    idempotency-repository.ts
    outbox-repository.ts
  sqlite/
    row-mappers.ts
    sqlite-task-repository.ts
    sqlite-stage-attempt-repository.ts
    sqlite-review-repository.ts
    sqlite-event-repository.ts
    sqlite-idempotency-repository.ts
    sqlite-outbox-repository.ts
  migrations/
    0001_initial.sql
packages/storage/test/
  migration.test.ts
  pragma.test.ts
  constraints.test.ts
  repositories.test.ts
  transaction.test.ts
  database-path.test.ts
```

SQL migration 作为 package asset 发布，build/package tests 必须证明运行时能找到它。不要依赖 `process.cwd()` 定位 migration。

## 数据库路径边界

- DB path 是 daemon deployment config，不进入 task/manifest/protocol/database record。
- 使用 `node:path` 和 `fs.realpath` 解析宿主路径；只在 storage composition root 处理宿主路径。
- 拒绝 SQLite URI、相对路径、Windows UNC/device path 和指向 symlink file 的 DB path。
- DB 父目录由调用方显式创建或由 connection factory 以受限权限创建；禁止从 task logical path 推导 DB path。
- Linux 启动检查读取 `/proc/self/mountinfo`（直接文件读取，不调用 shell），拒绝已知 `nfs`、`nfs4`、`cifs`、`smb3`、`sshfs`、`fuse.sshfs` mount type。
- Windows 至少拒绝 UNC/device path。Node 标准 API 无法可靠识别所有映射盘，因此部署文档必须要求本地固定盘；无法证明时启动失败或需要显式 operator acknowledgment，不能默认当作本地盘。

测试只验证可确定的路径规则，不伪造“所有网络盘都可检测”的结论。

## 启动 PRAGMA

每次打开写连接后设置并读回验证：

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
PRAGMA synchronous = FULL;
```

要求：

- `journal_mode` 返回 `wal`。
- `foreign_keys` 返回 `1`。
- `busy_timeout` 至少为 `5000`。
- `synchronous` 对应 FULL。
- 任一不匹配则关闭连接并返回稳定 storage startup error，不能降级继续。
- migration 前已启用 foreign keys；WAL 设置不放在 migration transaction 内。

## Migration 框架

`schema_migrations`：

```sql
CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  checksum TEXT NOT NULL,
  applied_at TEXT NOT NULL
) STRICT;
```

Runner 规则：

1. migration 文件命名 `NNNN_name.sql`，version 严格递增且不重复。
2. checksum 是原始 LF/UTF-8 文件字节的 SHA-256；已应用文件 checksum 变化时启动失败。
3. 每个未应用 migration 在独立 `BEGIN IMMEDIATE` transaction 中执行，并同时插入 migration row。
4. 已应用且 checksum 相同的 migration 跳过。
5. 不自动 down migration；失败后回滚该 migration，保留之前已成功版本。
6. migration SQL 不包含 shell、绝对路径或环境相关语句。
7. migration timestamp 由 runner 注入 prepared statement；不要在 schema 中依赖本地时区。

## 首版 Schema

下列为必须字段；实现可补充索引，但不能添加未计划的业务语义。

### `tasks`

```text
task_id TEXT PRIMARY KEY
schema_version INTEGER NOT NULL CHECK (schema_version = 1)
workspace_id TEXT NOT NULL
spec_path TEXT NOT NULL
current_stage TEXT NOT NULL
status TEXT NOT NULL
state_version INTEGER NOT NULL CHECK (state_version >= 1)
pending_review_id TEXT NULL
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
```

约束/索引：`workspace_id` 可重复；`task_id` 唯一；stage/status 使用 CHECK 列出 A02 enum；logical path 仍须在 row mapper 用 contract parse 验证，SQL CHECK 只做基本防御。

### `stage_attempts`

```text
stage_attempt_id TEXT PRIMARY KEY
task_id TEXT NOT NULL REFERENCES tasks(task_id) ON DELETE RESTRICT
stage TEXT NOT NULL
attempt_number INTEGER NOT NULL CHECK (attempt_number >= 1)
status TEXT NOT NULL
started_at TEXT NOT NULL
finished_at TEXT NULL
result_json TEXT NULL
UNIQUE(task_id, stage, attempt_number)
```

A04 提供表和 repository，不在 Phase A 自动创建 attempt；后续 stage/gate command 使用。

### `reviews`

```text
review_id TEXT PRIMARY KEY
task_id TEXT NOT NULL REFERENCES tasks(task_id) ON DELETE RESTRICT
review_type TEXT NOT NULL
status TEXT NOT NULL
requested_state_version INTEGER NOT NULL
allowed_decisions_json TEXT NOT NULL
binding_json TEXT NOT NULL
decision TEXT NULL
decision_actor_type TEXT NULL
decision_actor_id TEXT NULL
created_at TEXT NOT NULL
decided_at TEXT NULL
```

A09 可用后续 migration 添加 nonce digest/expiry。A04 不存 nonce placeholder，也不实现决定提交。

### `workflow_events`

```text
event_sequence INTEGER PRIMARY KEY AUTOINCREMENT
event_id TEXT NOT NULL UNIQUE
task_id TEXT NOT NULL REFERENCES tasks(task_id) ON DELETE RESTRICT
command_id TEXT NOT NULL
correlation_id TEXT NOT NULL
event_index INTEGER NOT NULL
event_type TEXT NOT NULL
schema_version INTEGER NOT NULL
state_version_before INTEGER NOT NULL
state_version_after INTEGER NOT NULL
payload_json TEXT NOT NULL
occurred_at TEXT NOT NULL
UNIQUE(command_id, event_index)
```

索引：`(task_id, event_sequence)`、`command_id`。

### `idempotency_keys`

```text
idempotency_scope TEXT NOT NULL
idempotency_key TEXT NOT NULL
command_type TEXT NOT NULL
payload_digest TEXT NOT NULL
response_json TEXT NOT NULL
created_at TEXT NOT NULL
PRIMARY KEY(idempotency_scope, idempotency_key)
```

scope 规则由 A05 定义；A04 只保证唯一性和完整读写。

### `outbox`

```text
outbox_id TEXT PRIMARY KEY
topic TEXT NOT NULL
aggregate_id TEXT NOT NULL
payload_json TEXT NOT NULL
status TEXT NOT NULL CHECK (status IN ('PENDING','DELIVERED','DEAD_LETTER'))
attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0)
available_at TEXT NOT NULL
created_at TEXT NOT NULL
delivered_at TEXT NULL
last_error_code TEXT NULL
```

索引：`(status, available_at)`。A04 不实现 dispatcher。

## Repository 与 transaction 边界

- interface 接受/返回 contract/domain 类型，不向上暴露 SQLite Row、Statement 或 Database handle。
- row mapper 对 DB 读出的 JSON 和 enum 再运行 A02 parse；坏数据返回 `STORAGE_CORRUPTION` 类内部错误，不能产生半合法 domain state。
- 所有写 repository 方法必须要求显式 `TransactionContext`；不得从全局连接自行开启 transaction。
- read-only 方法可接受 transaction context 或 read connection；A04 首版可统一使用同一连接。
- transaction callback 必须同步，TypeScript 类型禁止返回 Promise；运行时发现 thenable 立即回滚并报错。
- repository 不调用 domain `decide`，也不决定下一 stage。

建议接口：

```ts
interface TransactionManager {
  immediate<T>(work: (tx: TransactionContext) => T): T;
}
```

使用 `BEGIN IMMEDIATE` 取得写意图，异常自动 rollback。transaction 内禁止 `await`，也不 catch SQLite 错误后继续写。

## 实现步骤

1. 精确安装 `better-sqlite3` 及其类型；先在 Windows/Linux CI 加安装 + `:memory:` smoke test。
2. 实现 DB path validation 和 connection factory。
3. 实现 PRAGMA 配置、读回验证和连接关闭。
4. 实现 migration discovery、checksum、tracking table 和 transaction runner。
5. 编写 `0001_initial.sql`、约束和索引。
6. 定义 repository/transaction interfaces，再实现 SQLite adapter 与 row mappers。
7. 使用真实临时文件 DB 完成 integration tests；`:memory:` 仅用于快速单元测试，不能覆盖 WAL/path/migration 验收。
8. 验证 build 后 migration asset 可定位。
9. 更新 `docs/verification.md`，加入 storage 专项命令。

## 测试要求

- 空文件 DB 迁移到 version 1；重复运行无 row/schema 变化。
- 修改已应用 migration 的测试副本后 checksum mismatch 并拒绝启动。
- migration 中途 SQL 失败时该版本完整回滚。
- PRAGMA 设置与读回全部匹配；foreign key 实际拒绝孤儿 row。
- task/event/idempotency 唯一约束实际生效。
- transaction callback 抛错后无部分写入。
- async callback/thenable 被拒绝。
- row mapper 遇到未知 enum、schema version 或坏 JSON fail closed。
- Windows UNC、device path、相对 path 被拒绝；正常本地临时目录通过。
- Linux 已知网络 mount fixture 的 parser 测试通过；真实 CI 不要求挂载 NFS。
- 同一个 DB 关闭后重开，数据和 migration 状态可恢复。

## 验证命令

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test --filter @rtl-agent/storage
corepack pnpm test
corepack pnpm build
rg -n "BEGIN|COMMIT|ROLLBACK" packages/storage/src
rg -n "await|fetch\(|child_process|spawn\(" packages/storage/src
& 'C:\Program Files\Git\bin\bash.exe' scripts/harness_check.sh
```

人工检查 transaction 代码没有 async callback，且 SQL 事务只由 transaction adapter 管理。

## 完成定义

- Windows/Linux 都能安装、构建并运行选定 SQLite adapter。
- file-backed DB 的 WAL、foreign keys、timeout、FULL 设置有读回证据。
- migration 可重复、可校验、失败原子回滚。
- repository 不泄漏 SQLite 类型，不包含领域转换。
- 所有写 API 需要同步 transaction context，事务内无 I/O/网络/子进程/await。
- breakdown 中 A04 标记 `DONE` 并登记证据后，才开始 A05。

## 实现交接内容

Session Log 记录实际 `better-sqlite3`/SQLite 版本、Windows/Linux install 结果、migration checksum、PRAGMA 实际值、schema version、repository 公共 API、网络文件系统检测限制和 A05 的 transaction 使用方式。
