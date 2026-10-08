# 凡人修仙传桌宠开发规范

## 适用范围与优先级

本文件适用于仓库根目录及所有子目录。更深层目录若新增 `AGENTS.md`，以更深层规则为准。需求说明、用户指令和已有公开契约高于本文件；发现冲突时先说明，再做最小范围修改。

## 项目定位

这是一个本地优先的 Codex Pet v2 桌面播放器：

- React + TypeScript + Vite 负责设置页和透明宠物窗口。
- Tauri 2 + Rust 负责窗口、托盘、全局鼠标、宠物安装及本地持久化。
- 应用不依赖 AI、账号或网络服务；不要在没有明确需求时引入远程调用。
- 同一套前端必须同时支持浏览器预览和 Tauri 原生运行。

## 目录职责

- `src/main.tsx`：根据 `?view=pet` 在设置页与宠物窗口之间切换。
- `src/components/pet/`：精灵图渲染、动画、拖拽、视线与气泡交互。
- `src/components/settings/`：宠物管理和播放器设置。
- `src/components/ui/`：Radix/shadcn 风格的基础 UI；业务逻辑不要下沉到这里。
- `src/lib/pet-contract.ts`：Codex Pet v2 图集和动画契约的唯一前端来源。
- `src/lib/player-api.ts`：浏览器/Tauri 双运行时边界；组件不要直接散落 `invoke` 调用。
- `src/lib/*scheduler.ts`：可独立测试的随机选择和调度纯逻辑。
- `src-tauri/src/lib.rs`：仅负责 Tauri Builder、插件、命令注册和模块装配。
- `src-tauri/src/models.rs`：跨后端模块共享的序列化模型与领域 DTO。
- `src-tauri/src/state.rs`：`player-state.json` 持久化、恢复与播放器偏好设置。
- `src-tauri/src/pets.rs`：宠物发现、内置同步、安装与卸载。
- `src-tauri/src/dialogues.rs`：对话文件校验、初始化、保存与恢复。
- `src-tauri/src/windows.rs`：全局鼠标、窗口定位和宠物显示状态。
- `src-tauri/src/tray.rs`：托盘菜单、开机自启和设置窗口入口。
- `pets/<id>/`：内置或示例宠物包。
- `docs/`：面向维护者和宠物作者的契约说明。

`dist/`、`release/`、`node_modules/`、`src-tauri/target/`、`src-tauri/gen/schemas/`、`*.tsbuildinfo`、`vite.config.js` 和 `vite.config.d.ts` 都是生成物或本地依赖，不作为手工修改入口。

## 环境与常用命令

在仓库根目录使用 npm；锁文件存在时优先使用 `npm ci`。

```powershell
npm run dev          # 浏览器预览，固定 127.0.0.1:1420
npm test             # Vitest 单次运行
npm run test:watch   # Vitest 监听模式
npm run build        # TypeScript 项目构建 + Vite 生产构建
npm run tauri:dev    # 启动完整桌面应用
npm run tauri:build  # 按当前系统构建，并整理到 release/<版本>/<操作系统>/
```

Rust 工程声明的最低工具链为 Rust 1.77.2。后端修改至少执行：

```powershell
cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check
cargo test --manifest-path src-tauri/Cargo.toml
```

当前没有 ESLint/Prettier 脚本，不要声称已运行 lint。格式以相邻代码和 `cargo fmt` 为准。

## 工作方式

1. 修改前先阅读目标模块、相邻测试和相关配置，确认浏览器与 Tauri 两条路径是否都会受影响。
2. 保持改动聚焦；迁移遗留、重构和功能变更不要无关地混在一起。
3. 修复缺陷或改变纯逻辑时先补能复现行为的测试，再做最小实现。
4. 不手改生成物，不提交本地缓存、安装包或编译产物。
5. 完成后报告实际运行过的命令、结果和未验证项；基线故障必须明确标为基线故障。

源码、JSON 和 Markdown 统一使用 UTF-8。Windows PowerShell 读取中文文件时显式使用 `Get-Content -Encoding utf8`；看到乱码先核对读取编码，不要直接用乱码内容覆盖原文件。

## 组件化与文件边界（硬性要求）

以下要求适用于前端、后端、桌面客户端及后续新增的任何代码；不得以“功能可运行”为理由跳过：

- 所有功能必须按单一职责拆成组件或模块。一个文件不得同时承载三个及以上彼此独立的领域职责，例如状态持久化、资源安装、窗口控制和托盘生命周期不得集中在同一文件。
- `main.tsx`、`main.rs`、`lib.rs` 等入口文件只允许负责启动、依赖装配、路由或 handler 注册；领域模型、文件读写、业务规则和平台能力必须放入独立模块。
- React 页面组件只负责状态编排和子组件组合。可独立命名、复用或测试的页面区块必须提取为业务组件；纯计算逻辑必须放入 `src/lib/`，不得以内联函数持续堆积页面文件。
- Rust 按领域拆分模块，Tauri command 保持薄封装；状态存储、宠物包、对话、窗口能力、托盘能力分别维护，跨模块共享内容使用最小范围的 `pub(crate)`，禁止为省事全部公开。
- 单个生产源码文件不得超过 500 行，目标控制在 300 行以内。修改范围内已有文件超过 500 行时，必须先拆分或在同一任务中完成拆分；测试代码导致模块超限时，将测试移入对应的独立测试模块。
- 不得创建 `utils`、`helpers`、`common` 等无明确领域边界的大杂烩文件；共享代码应按真实职责命名，并放在最接近其使用者的位置。
- 新增功能前先确定所属模块；若现有模块职责不匹配，新增模块而不是继续向入口文件或大型组件追加代码。
- 重构拆分必须保持公开契约和持久化格式不变，并通过受影响层的完整测试；禁止一边拆文件一边夹带无关行为修改。

## TypeScript 与 React 约定

- TypeScript 保持 `strict`，不要用 `any`、无理由的非空断言或关闭类型检查来绕过错误。
- 内部源码优先使用 `@/` 别名；同一小目录内可使用相对导入。
- 共享领域类型放在 `src/lib/types.ts`，不要在组件中复制 Tauri 返回结构。
- 可计算、可注入随机源的逻辑放入纯函数；UI 组件只编排状态和副作用。
- 副作用必须清理定时器、事件监听和原生订阅。异步 effect 要处理组件卸载后的回写风险。
- 保留浏览器 fallback：原生能力通过 `isTauriRuntime()` 分支，浏览器数据继续使用 `localStorage` 和 `fanren-desktop-pet-state-changed`。
- 用户界面当前使用简体中文。新增可见文本、错误提示和无障碍名称保持中文且语义明确。
- 交互元素使用语义化 HTML，保留键盘操作、焦点状态、`aria-*` 和 `prefers-reduced-motion` 支持。
- 复用 `src/components/ui/` 与现有 CSS token；除非任务要求，不新增第二套组件库或全局样式体系。

## Tauri 与 Rust 约定

- 前后端边界统一使用 camelCase：Rust DTO 使用 `#[serde(rename_all = "camelCase")]`，命令参数变化必须同步更新 TypeScript 调用。
- 文件系统输入一律视为不可信：校验 ID、相对路径、文件存在性和目标目录边界后再复制或删除。
- 删除操作只能作用于应用数据目录下已解析确认的具体宠物目录；内置宠物不可卸载。
- 持久化结构变更必须考虑旧 `player-state.json` 的兼容或迁移，不能静默丢弃用户配置。
- `settings` 与 `pet` 是配置、权限和代码共同依赖的窗口 label；不要只改单处。
- `pet` 窗口保持透明、无边框、置顶和不显示在任务栏；设置窗口关闭时隐藏而不是退出进程。
- Windows 全局鼠标能力必须保留非 Windows 的明确错误分支，避免伪装成跨平台支持。
- 新增 Tauri command 时同步完成：命令实现、`generate_handler!` 注册、capability 权限（如需要）和前端封装。

## 宠物包契约

标准宠物目录至少包含：

```text
pets/<id>/
|-- pet.json
|-- spritesheet.webp
`-- dialogues.json     # 播放器可选扩展，不属于 Codex Pet v2 必需字段
```

- `id` 使用小写 kebab-case，且目录名、manifest ID 和应用数据目录名必须一致。
- `spriteVersionNumber` 固定为 `2`；`spritesheetPath` 必须是宠物目录内的相对路径，禁止绝对路径和 `..`。
- 内置宠物构建会根据 `pet.json` 的 `spritesheetPath` 从 `pets/<id>/` 下自动收集对应 WebP，不要求文件名固定为 `spritesheet.webp`；路径指向的文件必须存在。
- v2 图集固定为 1536×2288、8 列×11 行、单帧 192×208。行映射和帧时长只在 `pet-contract.ts` 中维护。
- `dialogues.json` 当前版本固定为 `1`，包含独立的 `idle`、`drag`、`touch` 字符串数组。三组内容首次导入后以用户状态为运行时来源；缺少整个文件时初始化三个空数组，存在的空数组表示禁用对应对话。
- `dialogues.json` 存在但无效时必须报错，不得降级成“文件缺失”，避免错误地向用户状态写入空数组。
- 修改宠物包时同时验证 manifest、对话 JSON 和图集引用；不要因为文案改动重编码二进制图集。
- `pets/<id>/` 是内置宠物的唯一注册来源。Vite 在浏览器预览与前端构建时自动扫描该目录，Tauri 通过资源通配符打包并在启动时由 Rust 自动发现；不要再维护平行的宠物 ID 清单。
- 新增内置宠物只需添加一个符合契约的 `pets/<id>/` 目录；删除目录后，下一次构建不再打包该宠物，应用启动时也会清理带内置标记的旧副本。

## 新宠物接入固定流程

当用户说明已经新增、迁入或准备接入宠物，或任务范围内出现新的 `pets/<id>/` 目录时，默认完整执行以下流程；用户不需要再单独要求生成对话：

1. 读取 `pet.json`，校验目录名、`id`、`spriteVersionNumber`、`spritesheetPath` 及图集文件。发现基础契约问题先修复或明确报告。
2. 若该宠物缺少 `dialogues.json`，主动依据 `displayName`、`description` 和可靠角色资料生成符合人设的简体中文对话；IP 角色资料不充分时先检索核实，禁止凭名称套用通用台词。用户明确要求不生成对话时才跳过。
3. 新对话默认使用 `version: 1`，包含 `idle` 12 条、`drag` 6 条、`touch` 10 条。各组文案应对应实际触发场景、彼此区分，并与已有宠物保持角色辨识度；不得把女性角色统一写成羞怯或恋爱依附人设。
4. 已存在的 `dialogues.json` 视为人工内容，新增宠物流程不得擅自覆盖；只有用户明确要求重写、补充或修复时才修改。
5. 校验 JSON 结构、非空字符串数组、manifest 和图集引用，运行 `npm test`、`npm run build` 及 Rust 资源发现测试。只有实际新增或移除宠物目录、改变打包资源时才执行 `npm run tauri:build`；仅新增或修改对话文案不重复打包安装器。
6. 完成报告固定说明对话数量、验证结果，以及“已有 `player-state.json` 的用户需在设置页恢复默认才会载入新文案”。

宠物名称和数量必须始终通过扫描 `pets/*/pet.json` 得出。不得在本文档、源码或测试中维护需要随每只宠物手工更新的当前宠物清单。

## 测试与完成标准

按改动范围选择验证，但不能跳过受影响层：

- 纯 TypeScript 逻辑：相关 Vitest + `npm test`。
- React/UI 或资源导入：`npm test` + `npm run build`；交互/布局变更再做浏览器或 Tauri 手测。
- Rust、Tauri command、存储或权限：`cargo fmt --check` + `cargo test` + `npm run build`。
- 窗口、托盘、透明度、拖拽、全局鼠标或打包资源：必须使用 `npm run tauri:dev` 手测。
- 安装器或 bundle 配置：执行 `npm run tauri:build`，确认 NSIS Setup EXE 和内置资源；不要把构建产物当源码修改。

## GitHub 发布

用户提出“发布”“发版”“升版本”“打 tag”“生成发布日志”或 GitHub Release 相关要求时，必须先完整读取并遵循 `.agents/skills/github-release/SKILL.md`。版本号、`CHANGELOG.md`、版本说明、测试、安装包、tag 和 GitHub Release 视为同一个发布流程，不得只完成其中一部分却声称发布成功。

测试应覆盖行为和边界，不依赖真实时间或不可控随机数；使用现有函数的可注入 random 参数。修复 bug 时测试名称要描述触发条件和预期结果。

## 迁移状态（2026-07-23）

当前目录是从其他位置复制来的工作副本。宠物资源目录迁移已经完成：

- 根目录没有 `.git`，因此无法使用 `git status`、历史或 diff 识别迁移前后变化。若这里应是正式仓库，先恢复正确的 Git 元数据和根 `.gitignore`。
- `pets/<id>/` 是唯一宠物源码布局；当前内置宠物由 `pets/*/pet.json` 动态发现，不在规范中维护名称清单。
- 前端浏览器预览、Rust 内置识别和 Tauri bundle resources 都自动扫描该目录，不创建根级宠物兼容副本，也不维护独立 ID 清单。
- 迁移前 Cargo/Tauri 缓存已清理并从当前目录重建；若工作区再次移动，可用 `cargo clean --manifest-path src-tauri/Cargo.toml` 清除生成物中的旧绝对路径，禁止修改业务代码去适配缓存路径。
- 当前基线验证：`npm test` 34 项通过，`npm run build` 通过，`cargo fmt --check` 通过，`cargo test` 24 项通过，Windows NSIS 安装程序构建通过。

新增或移除内置宠物时只修改 `pets/`，并按“新宠物接入固定流程”完成资源发现测试、前端构建和必要的 Tauri 打包验证。
