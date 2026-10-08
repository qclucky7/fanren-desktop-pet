---
name: github-release
description: 为凡人修仙传桌宠准备并发布规范的 GitHub Release。用户说“发布”“发版”“升版本”“打 tag”“生成发布日志”“更新 CHANGELOG”或要求 GitHub Release 时必须使用；自动判断语义化版本、同步所有版本文件、维护 CHANGELOG 和中文 Release Notes、验证构建，并在确认后创建 tag 和发布 GitHub Release。
compatibility: 需要 Node.js、npm、Rust、Git；真正发布需要已配置的 GitHub 远端和可用的 gh CLI 或 GitHub 发布能力。
---

# GitHub Release

为本项目执行一致、可复查的版本发布。先准备本地发布内容，再执行不可逆的远端发布动作；不要把“生成发布说明”误解为已经公开发布。

## 触发意图

- 用户只说“发布”或“发版”时，默认执行完整流程。
- 用户说“准备发布”“生成发布日志”时，只执行准备和验证，不推送远端。
- 用户明确指定版本或 `major`、`minor`、`patch` 时使用指定值。
- 用户只询问发布机制时解释流程，不修改文件。

## 一、发布前检查

1. 阅读根目录 `AGENTS.md`、`CHANGELOG.md`、`package.json`、`src-tauri/tauri.conf.json` 和 `src-tauri/Cargo.toml`。
2. 确认 Git 仓库、当前分支、远端、工作区状态及最近 tag。没有 `.git` 时可以准备版本文件和说明，但不得声称已经创建 tag 或 GitHub Release。
3. 汇总上一个版本以来的实际变化：优先使用 Git commit、PR 和 diff；不能从历史确认的内容不要编造。
4. 检查是否存在会阻止发布的测试失败、缺少资源、无效配置或未说明的破坏性变化。

## 二、确定版本号

遵循 Semantic Versioning：

- `patch`：缺陷修复、文案、资源内容、小幅样式调整，不改变公开契约。
- `minor`：向后兼容的新功能、新宠物、新设置或明显的交互增强。
- `major`：持久化格式、宠物包契约或公开行为出现不兼容变化。

用户未指定时，根据本次最大级别的变化自动选择，并在执行前说明依据。使用：

```powershell
npm run release:version -- patch
npm run release:version -- minor
npm run release:version -- major
npm run release:version -- 1.2.3
```

该命令必须同步 `package.json`、`package-lock.json`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml` 和 `src-tauri/Cargo.lock`。先用 `--dry-run` 检查计算结果；不要分别手改版本号。

## 三、维护发布文档

1. 将 `CHANGELOG.md` 的 `[Unreleased]` 内容移动到新版本标题：`[x.y.z] - YYYY-MM-DD`，并重新保留空的 `[Unreleased]`。
2. 只使用实际存在的分类：`新增`、`改进`、`修复`、`移除`、`兼容性`。
3. 从 `release-notes/TEMPLATE.md` 创建 `release-notes/vx.y.z.md`。面向用户写作，避免内部文件名和实现术语堆砌。
4. Release Notes 至少说明：版本定位、主要亮点、功能变化、问题修复、安装方式、数据兼容性和实际完成的验证。
5. 下载文件按真实产物列出；当前仅正式支持 Windows NSIS，不要虚构 macOS 或 Linux 下载项。

## 四、验证

依次运行并记录真实结果：

```powershell
npm test
npm run build
cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri:build
```

确认安装程序位于 `release/<版本>/windows/`，文件名和版本正确。失败时停止发布，保留诊断信息；不要创建 tag。

## 五、发布边界

准备完成后向用户展示：目标版本、Release 标题、说明摘要、产物和验证结果。用户明确说“发布”或“发版”已经授权执行完整发布，不要重复询问；只说“准备发布”“生成日志”或意图含糊时不得创建 commit、tag、推送或公开 Release。

完整发布使用以下约定：

- 发布 commit：`chore(release): v<版本>`
- Git tag：`v<版本>`
- Release 标题：`凡人修仙传桌宠 v<版本>`
- tag 必须指向已经包含版本号、CHANGELOG 和 Release Notes 的提交。
- 推送 tag 后由 `.github/workflows/release.yml` 构建 Windows 安装程序并创建 GitHub Release。
- 工作流完成后检查 Release 页面、说明正文和安装包；失败或资产不完整时不要标记发布完成。

不要覆盖已经存在的远端 tag 或 Release。若同一版本需要修复，提升 patch 版本；只有用户明确要求且理解影响时才处理错误发布。

## 完成报告

报告以下信息：

- 新旧版本号及升级依据。
- CHANGELOG 与 Release Notes 路径。
- 实际执行的测试和打包结果。
- Git commit、tag、Release URL；未执行的项目明确标为“未发布”。
- 已知限制，例如当前只提供 Windows 安装包或尚未配置签名。
