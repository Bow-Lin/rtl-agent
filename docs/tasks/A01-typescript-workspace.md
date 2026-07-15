# A01 — 建立 TypeScript Workspace 与质量基线

## 任务索引

- 权威进度：以 `docs/task-breakdown.md` 为准
- 进入条件：无，可直接执行
- 前置任务：无
- 后续任务：A02
- 进度与验收证据登记位置：`docs/task-breakdown.md`、`.harness/session-log.md`

## 目标

建立一个没有业务逻辑的 TypeScript monorepo，使后续任务共享同一套包边界、编译模型和 Windows/Linux 验证命令。A01 只搭骨架，不提前定义领域 schema、状态转换或数据库表。

## 已确定的技术基线

1. 使用 Node.js 24 LTS；`engines.node` 限定为 `>=24 <25`，CI 使用最新的 24.x 补丁版。
2. 使用 pnpm workspace。执行 A01 时用 Corepack 解析一个具体 pnpm 版本，并把完整版本写入根 `package.json#packageManager`。
3. 使用原生 ESM，所有包的 `package.json` 包含 `"type": "module"`。
4. 使用 TypeScript strict 与 project references；`tsc -b` 是正式 typecheck/build 基础。
5. 使用 ESLint flat config、typescript-eslint、Prettier 和 Vitest。
6. 所有依赖通过 `--save-exact` 固定版本；`@modelcontextprotocol/sdk` 必须精确为 `1.29.0`。
7. 不使用 Turbo、Nx、Bun 或自定义 Bash orchestration。A01 的规模不需要额外任务编排层。

Node 24 当前为 LTS，官方建议生产应用使用 LTS 版本；TypeScript project references 原生支持包依赖排序和 `tsc -b` 构建。[Node.js releases](https://nodejs.org/en/about/previous-releases)；[TypeScript project references](https://www.typescriptlang.org/docs/handbook/project-references)

## 范围

### 必须实现

- 根 workspace、lockfile、共享 TypeScript/ESLint/Prettier/Vitest 配置。
- 两个 app：`workflow-daemon`、`workflow-cli`。
- 三个 package：`contracts`、`domain`、`storage`。
- 每个项目可独立编译，并通过显式 project reference 表达依赖方向。
- Windows 与 Linux CI matrix。
- 根级统一命令：`lint`、`typecheck`、`test`、`build`、`format:check`。
- 一个不包含业务行为的 smoke test，用来证明 Vitest 会发现测试。
- 更新 `docs/verification.md`，登记仓库真实可执行的命令。

### 非目标

- 不定义 Zod schema、错误码或领域类型；这些属于 A02。
- 不实现状态机；这些属于 A03。
- 不安装 SQLite adapter；这些属于 A04。
- 不实现 daemon lifecycle、CLI 命令、MCP transport 或 OpenCode 配置。
- 不创建正式 Gate、Runner、Python worker 或 Langfuse 集成。

## 目标目录与文件

```text
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
tsconfig.base.json
tsconfig.json
eslint.config.mjs
prettier.config.mjs
vitest.workspace.ts
.node-version
.github/workflows/ci.yml
apps/
  workflow-daemon/
    package.json
    tsconfig.json
    src/index.ts
  workflow-cli/
    package.json
    tsconfig.json
    src/index.ts
packages/
  contracts/
    package.json
    tsconfig.json
    src/index.ts
    test/smoke.test.ts
  domain/
    package.json
    tsconfig.json
    src/index.ts
  storage/
    package.json
    tsconfig.json
    src/index.ts
```

不要创建空目录占位文件；每个 `src/index.ts` 只导出一个可被编译的 package version 常量或空类型，且不得表示未来业务 API。

## 包边界与依赖方向

```text
contracts   <- domain <- storage
     ^            ^         ^
     +------------+---------+
                  apps
```

- `contracts` 不依赖任何 workspace package。
- `domain` 只允许依赖 `contracts`。
- `storage` 可依赖 `contracts` 和 `domain`；A01 暂不添加 runtime import。
- apps 可依赖上述 packages；A01 暂不实现运行行为。
- package 名统一为 `@rtl-agent/<name>`，使用 workspace protocol 引用内部包。
- 禁止通过 `../../packages/.../src` 越过 package export 边界。

## 编译与代码规范

共享 `tsconfig.base.json` 至少包含：

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "useUnknownInCatchVariables": true,
    "noImplicitOverride": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true,
    "skipLibCheck": false
  }
}
```

每个子项目显式设置 `rootDir`、`outDir`、`tsBuildInfoFile`、`include` 和 `references`。根 `tsconfig.json` 使用空 `files` 加 project references，不把所有源码混成一个编译单元。

正式命令语义：

| 命令 | 必须执行的工作 |
|---|---|
| `pnpm lint` | ESLint 检查全部 app/package 的 TypeScript 与配置文件 |
| `pnpm typecheck` | `tsc -b --pretty false`，不产生可发布产物；若采用 `--noEmit` 与 composite 冲突，则使用单独 typecheck config |
| `pnpm test` | `vitest run`，失败时返回非零码 |
| `pnpm build` | 清理或隔离旧输出后执行 `tsc -b`，输出到各项目 `dist/` |
| `pnpm format:check` | Prettier 检查，不自动修改文件 |

如果 `typecheck` 与 `build` 共用 `tsc -b`，允许两者都产生 `dist`；必须在 README/verification 中写明，不能用会破坏 project reference 的参数硬凑“无输出”。

## 跨平台约束

- package scripts 只能调用跨平台 Node CLI，不写 `rm -rf`、环境变量前缀、管道或 Bash 条件语句。
- 如需 clean，写一个很小的 Node 脚本并使用 `node:path`、`fs.rm`；A01 也可暂不提供 clean。
- 代码和配置不得拼接 `/` 或 `\\` 形成宿主文件路径。
- CI 不执行正式 EDA Gate，只验证 control plane 工具链。
- `.gitattributes` 已存在，不重写全仓换行；新增文件应验证 LF 属性。
- Windows CI 使用 `windows-latest`，Linux CI 使用 `ubuntu-latest`，两者执行完全相同的 install/lint/typecheck/test/build/format 检查。

## 实现步骤

1. 检查本机 Node/pnpm/Corepack 状态；若版本不满足，不修改全局环境，记录缺口并使用 CI 验证。
2. 创建根 `package.json` 和 `pnpm-workspace.yaml`；使用 `pnpm add --save-dev --save-exact` 安装工具依赖。
3. 精确安装 `@modelcontextprotocol/sdk@1.29.0`，但不导入或调用它。
4. 生成并提交 `pnpm-lock.yaml`，确保没有第二种 lockfile。
5. 创建共享 tsconfig、根 references 和五个子项目配置。
6. 创建 ESM package manifests，定义 `exports`、`types`、`files` 和 workspace 依赖方向。
7. 添加 ESLint、Prettier、Vitest 配置和一个 smoke test。
8. 添加根统一 scripts，并在 Windows 本地运行全部命令。
9. 添加 Windows/Linux CI matrix，安装使用 `pnpm install --frozen-lockfile`。
10. 更新 `docs/verification.md`；记录本机未能执行的 Linux 结果应由 CI 提供。

## 验证命令

最低验证命令：

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm format:check
git check-attr text eol -- package.json pnpm-lock.yaml apps/workflow-daemon/src/index.ts
git status --short
& 'C:\Program Files\Git\bin\bash.exe' scripts/harness_check.sh
```

补充结构检查：

- 删除 `node_modules` 后 frozen install 可以恢复。
- `rg -n "bash|powershell|cmd.exe|shell:\s*true|rm -rf" package.json pnpm-workspace.yaml apps packages .github` 无业务脚本命中。
- `pnpm-lock.yaml` 中 MCP SDK 解析版本为 `1.29.0`。
- 临时引入一个 TypeScript 类型错误时 `typecheck` 必须失败，验证后撤销该临时改动。
- 临时破坏 smoke test 时 `test` 必须失败，验证后撤销。

## 完成定义

- 目录、包边界、统一命令和 CI matrix 均存在。
- Windows 本地验证通过；Linux CI 有成功证据，或明确记录为何暂时无法运行及风险。
- 所有依赖和 package manager 版本已锁定，仓库只有 `pnpm-lock.yaml`。
- 没有领域、存储、MCP 或 daemon 业务逻辑。
- `docs/verification.md` 与真实 scripts 一致。
- 在 `docs/task-breakdown.md` 将 A01 状态改为 `DONE`，填写证据后，才能开始 A02。

## 常见失败与处理

| 失败 | 处理 |
|---|---|
| Windows 安装原生依赖失败 | A01 不应有 SQLite 原生依赖；查明是否提前引入了 A04 内容 |
| `tsc -b` 找不到内部包 | 修正 project references、package exports 和 workspace dependency，不使用源码相对路径绕过 |
| ESM import 扩展名错误 | 统一 NodeNext 规则；源代码相对 import 使用运行时可解析的 `.js` 扩展名 |
| CI 与本地脚本不同 | 删除 CI 私有命令，CI 只调用根统一 scripts |
| 格式化导致全仓噪声 | 只格式化 A01 新增文件，不批量重排现有设计文档 |

## 实现交接内容

结束 A01 时，Session Log 至少记录：Node/pnpm/TypeScript/Vitest/ESLint 的实际锁定版本、五条命令结果、Windows 本地证据、Linux CI 链接或缺口、变更文件、已知风险和 A02 的起点。
