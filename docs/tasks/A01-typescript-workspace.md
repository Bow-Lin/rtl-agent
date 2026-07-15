# A01 — 建立 TypeScript Workspace 与质量基线

## 任务索引

- 权威进度：以 `docs/task-breakdown.md` 为准
- 进入条件：无，可直接执行
- 前置任务：无
- 后续任务：A02
- 进度与验收证据登记位置：`docs/task-breakdown.md`、`.harness/session-log.md`

## 目标

建立一个没有业务逻辑的 TypeScript monorepo，使后续任务共享同一套包边界、编译模型和可移植验证命令。A01 只搭骨架，不提前定义领域 schema、状态转换或数据库表。

## 当前平台验收策略

- 实现仍必须遵守 Windows 开发、Linux 运行的路径、进程、换行和依赖可移植性约束。
- 当前 A01 的完成证据只要求 Windows 本地验证通过；暂不要求 Linux runner、Linux CI 成功结果或 Linux 截图/日志。
- Windows/Linux CI matrix 仍作为未来验证入口保留，但 Linux job 是否执行、跳过或尚未配置为 required check，不影响当前 A01 的 `DONE` 判定。
- 没有 Linux 证据时只能声称“A01 在 Windows 开发环境通过”，不能声称已经具备生产 Linux readiness。

## 已确定的技术基线

1. 使用 Node.js `24.15.0`；`.node-version` 和 CI 固定到该完整版本，`engines.node` 保持 `>=24 <25`。Node 补丁升级作为独立维护变更。
2. 使用 pnpm workspace，固定 Corepack 当前已解析并验证的 pnpm `11.13.0`，完整版本写入根 `package.json#packageManager`。
3. 使用原生 ESM，所有包的 `package.json` 包含 `"type": "module"`。
4. 使用 TypeScript strict 与 project references；`tsc -b` 是正式 typecheck/build 基础。
5. 使用 ESLint flat config、typescript-eslint、Prettier 和 Vitest 4；单一根配置为 `vitest.config.ts`，暂不启用多项目模式。
6. registry 依赖通过 `--save-exact` 固定版本；内部依赖使用 `workspace:*`。`@modelcontextprotocol/sdk` 精确为 `1.29.0`，归属 `workflow-daemon` runtime dependencies。
7. 不使用 Turbo、Nx、Bun 或自定义 Bash orchestration。A01 的规模不需要额外任务编排层。

Node 24 当前为 LTS，官方建议生产应用使用 LTS 版本；TypeScript project references 原生支持包依赖排序和 `tsc -b` 构建。[Node.js releases](https://nodejs.org/en/about/previous-releases)；[TypeScript project references](https://www.typescriptlang.org/docs/handbook/project-references)

## 范围

### 必须实现

- 根 workspace、lockfile、共享 TypeScript/ESLint/Prettier/Vitest 配置。
- 两个 app：`workflow-daemon`、`workflow-cli`。
- 三个 package：`contracts`、`domain`、`storage`。
- 每个项目可独立编译，并通过显式 project reference 表达依赖方向。
- 面向 Windows/Linux 的 CI matrix 配置；当前只要求 Windows 执行证据。
- 根级统一命令：`lint`、`typecheck`、`test`、`build`、`format:check`。
- 一个不包含业务行为的 smoke test，用来证明 Vitest 会发现测试。
- 一个不产生运行行为的 type-only package-resolution smoke，用于验证 workspace dependency、library exports、NodeNext 和 project references。
- 独立的测试 TypeScript 配置；测试必须纳入 `typecheck`，但不得被编译到 library/app `dist`。
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
.gitignore
tsconfig.base.json
tsconfig.json
tsconfig.test.json
eslint.config.mjs
prettier.config.mjs
.prettierignore
vitest.config.ts
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

不要创建空目录占位文件；每个 `src/index.ts` 只导出一个可被编译的 package version 常量或 type-only package-resolution smoke，且不得表示未来业务 API。

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
- `contracts`、`domain`、`storage` 作为 library package 定义 `exports`、`types` 和 `files`；`workflow-daemon`、`workflow-cli` 是 private app，不伪装成 library，也不提前添加 CLI `bin`。
- `@modelcontextprotocol/sdk@1.29.0` 只属于 `@rtl-agent/workflow-daemon`；根 package 不把 runtime SDK 声明成 devDependency。

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
| `pnpm typecheck` | 用一次 `tsc -b` 调用检查 source project references 和独立 test project；source 可产生 `dist`，test 设置 `noEmit` |
| `pnpm test` | `vitest run`，失败时返回非零码 |
| `pnpm build` | `tsc -b` 构建 source project references，输出到各项目 `dist/`，不编译 test |
| `pnpm clean` | `tsc -b --clean` 清理 TypeScript project outputs，不依赖 shell 删除命令 |
| `pnpm format:check` | Prettier 检查，不自动修改文件 |

`typecheck` 与 `build` 都允许生成 source `dist`，这是 project references 的正常行为；测试项目单独 `noEmit`。不能对 composite source projects 强行加入不兼容的全局 `--noEmit`。

## 跨平台约束

- package scripts 只能调用跨平台 Node CLI，不写 `rm -rf`、环境变量前缀、管道或 Bash 条件语句。
- clean 使用 TypeScript 自带的 `tsc -b --clean`，不写 `rm -rf`、PowerShell 或自定义 shell 删除逻辑。
- 代码和配置不得拼接 `/` 或 `\\` 形成宿主文件路径。
- CI 不执行正式 EDA Gate，只验证 control plane 工具链。
- `.gitattributes` 已存在，不重写全仓换行；新增文件应验证 LF 属性。
- CI 配置使用 `windows-latest` 和 `ubuntu-latest`，两者设计为执行相同的 install/lint/typecheck/test/build/format 检查；当前验收只要求 Windows 结果，Linux 结果为后续补充证据。

## 实现步骤

1. 检查本机 Node/pnpm/Corepack 状态，确认 Node `24.15.0`、Corepack `0.34.6`、pnpm `11.13.0`；不由初始化脚本静默升级全局 Corepack 或 Node。
2. 创建根 `package.json` 和 `pnpm-workspace.yaml`；使用 `corepack pnpm add -DwE` 安装根工具依赖，`@types/node` 限定 Node 24 major。
3. 使用 `corepack pnpm --filter @rtl-agent/workflow-daemon add -E @modelcontextprotocol/sdk@1.29.0` 安装 daemon runtime 依赖，但不导入或调用它。
4. 生成并提交 `pnpm-lock.yaml`，确保没有第二种 lockfile。
5. 创建共享 tsconfig、根 references 和五个子项目配置。
6. 创建 ESM package manifests；只为三个 library 定义 `exports`、`types`、`files`，app 只声明 private runtime package 信息。
7. 添加 ESLint global ignores、`.prettierignore`、`vitest.config.ts`、runtime smoke test 和 type-only package-resolution smoke。
8. 添加根统一 scripts，并在 Windows 本地运行全部命令。
9. 添加 Windows/Linux CI matrix，安装使用 `pnpm install --frozen-lockfile`；静态检查 Linux job 配置，但不要求本任务拿到其运行结果。
10. 更新 `docs/verification.md`；明确 A01–A05 当前使用 Windows 证据，Linux 执行证据后补。

## 验证命令

最低验证命令：

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm format:check
corepack pnpm clean
git check-attr text eol -- package.json pnpm-lock.yaml apps/workflow-daemon/src/index.ts
git status --short
& 'C:\Program Files\Git\bin\bash.exe' scripts/harness_check.sh
```

补充结构检查：

- 删除 `node_modules` 后 frozen install 可以恢复。
- `rg -n "bash|powershell|cmd.exe|shell:\s*true|rm -rf" package.json pnpm-workspace.yaml apps packages .github` 无业务脚本命中。
- `pnpm-lock.yaml` 中 MCP SDK 解析版本为 `1.29.0`。
- `.node-version`、CI 和实际 Windows 验证版本一致；`packageManager` 精确为 `pnpm@11.13.0`。
- type-only app imports 通过包名解析三个 library；测试中的故意类型错误能让 `typecheck` 失败。
- 临时引入一个 TypeScript 类型错误时 `typecheck` 必须失败，验证后撤销该临时改动。
- 临时破坏 smoke test 时 `test` 必须失败，验证后撤销。

## 完成定义

- 目录、包边界、统一命令和 CI matrix 均存在。
- Windows 本地统一命令验证通过；Linux CI 成功结果不是当前完成条件。
- 所有依赖和 package manager 版本已锁定，仓库只有 `pnpm-lock.yaml`。
- library/app manifest 职责正确，MCP SDK 位于 daemon runtime dependencies。
- source 和 test 都经过 TypeScript 检查，测试不进入 `dist`。
- 没有领域、存储、MCP 或 daemon 业务逻辑。
- `docs/verification.md` 与真实 scripts 一致。
- 在 `docs/task-breakdown.md` 将 A01 状态改为 `DONE`，填写证据后，才能开始 A02。

## 常见失败与处理

| 失败 | 处理 |
|---|---|
| Windows 安装原生依赖失败 | A01 不应有 SQLite 原生依赖；查明是否提前引入了 A04 内容 |
| Corepack 签名或 shim 失败 | 停止并记录环境缺口，给出显式升级/启用命令；不得让项目初始化脚本静默修改全局环境 |
| `tsc -b` 找不到内部包 | 修正 project references、package exports 和 workspace dependency，不使用源码相对路径绕过 |
| ESM import 扩展名错误 | 统一 NodeNext 规则；源代码相对 import 使用运行时可解析的 `.js` 扩展名 |
| CI 与本地脚本不同 | 删除 CI 私有命令，CI 只调用根统一 scripts |
| 格式化导致全仓噪声 | 只格式化 A01 新增文件，不批量重排现有设计文档 |

## 实现交接内容

结束 A01 时，Session Log 至少记录：Node/Corepack/pnpm/TypeScript/Vitest/ESLint 的实际锁定版本、统一命令结果、source/test typecheck 证据、Windows 本地证据、Linux 验证按当前策略延期、变更文件、已知风险和 A02 的起点。
