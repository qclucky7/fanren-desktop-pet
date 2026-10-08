# Tauri 后端模块化重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 1400 余行的 `src-tauri/src/lib.rs` 按领域拆分为可独立理解和测试的 Rust 模块，同时保持所有 Tauri command、持久化格式、窗口、托盘和宠物行为不变。

**Architecture:** `lib.rs` 只负责 Builder 与模块装配；共享序列化结构放入 `models.rs`；状态、对话、宠物、窗口、托盘分别形成领域模块。测试跟随被测模块放置，跨模块 API 只使用最小范围的 `pub(crate)`。

**Tech Stack:** Rust 2021、Tauri 2、serde、tauri-plugin-autostart、Cargo test。

---

## 文件结构

- `src-tauri/src/lib.rs`：模块声明、插件注册、setup、window event、handler 注册。
- `src-tauri/src/models.rs`：共享 DTO、持久化模型和常量。
- `src-tauri/src/state.rs`：状态路径、兼容读取、损坏恢复、原子写入、偏好设置 command。
- `src-tauri/src/dialogues.rs`：对话文件读取、迁移、恢复及对话 command。
- `src-tauri/src/pets.rs`：manifest 校验、宠物发现、内置同步、安装卸载和激活 command。
- `src-tauri/src/windows.rs`：全局鼠标、窗口定位、显示隐藏、位置保存 command。
- `src-tauri/src/tray.rs`：托盘构建、显示切换、设置窗口、开机自启。

### Task 1: 固化组件化硬性规范

**Files:**
- Modify: `AGENTS.md`

- [x] 明确入口文件只做装配，业务功能必须按领域拆分。
- [x] 明确一个文件不得混合三个以上独立职责。
- [x] 明确生产源码 500 行硬上限与修改超限文件时的拆分义务。
- [x] 明确 React、Rust 和跨模块可见性规则。

### Task 2: 提取共享模型与状态存储

**Files:**
- Create: `src-tauri/src/models.rs`
- Create: `src-tauri/src/state.rs`
- Modify: `src-tauri/src/lib.rs`

- [x] 将 serde DTO 和持久化结构原样迁入 `models.rs`，字段名及默认值不得变化。
- [x] 将 `player-state.json` 路径、恢复、原子替换和偏好归一化迁入 `state.rs`。
- [x] 将状态恢复、原子写入和偏好范围测试迁入 `state.rs` 的测试模块。
- [x] 运行 `cargo test --manifest-path src-tauri/Cargo.toml`，现有 21 项 Rust 测试全部通过。

### Task 3: 提取对话与宠物领域

**Files:**
- Create: `src-tauri/src/dialogues.rs`
- Create: `src-tauri/src/pets.rs`
- Modify: `src-tauri/src/lib.rs`

- [x] 将对话清洗、文件校验、首次物化、旧数组迁移和单组恢复迁入 `dialogues.rs`。
- [x] 将 manifest 安全校验、动态发现、内置同步、列表、安装、卸载和激活迁入 `pets.rs`。
- [x] 将对话与宠物测试分别迁入对应模块，不更改断言语义。
- [x] 运行 Rust 测试，数量与拆分前一致且全部通过。

### Task 4: 提取窗口与托盘领域

**Files:**
- Create: `src-tauri/src/windows.rs`
- Create: `src-tauri/src/tray.rs`
- Modify: `src-tauri/src/lib.rs`

- [x] 将 Windows FFI、鼠标读取、窗口位置计算、位置恢复和显示控制迁入 `windows.rs`。
- [x] 将托盘菜单、双击设置、宠物显示切换和 autostart 迁入 `tray.rs`。
- [x] 对外提供 `setup_tray`，由 `lib.rs` 传入初始可见状态并完成装配。
- [x] 将窗口与托盘纯逻辑测试迁入对应模块。

### Task 5: 收紧入口并完成验证

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Modify: `docs/superpowers/plans/2026-07-24-tauri-module-refactor.md`

- [x] `lib.rs` 仅保留模块声明、启动初始化、插件与 command 注册、关闭隐藏事件。
- [x] 检查所有生产 Rust 文件均不超过 500 行，且没有无领域含义的公共工具模块。
- [x] 执行 `cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check`。
- [x] 执行 `cargo test --manifest-path src-tauri/Cargo.toml`，21 项通过。
- [x] 执行 `npm test` 和 `npm run build`，前端 26 项通过且生产构建成功。
- [x] 执行 `npm run tauri:dev`，设置窗口、宠物窗口、托盘装配和全局鼠标路径均可启动。
- [x] 更新本计划复选框与实际验证结果；当前工作区没有 `.git`，不执行提交步骤。

## 自检

- 需求覆盖：规范更新、前后端通用组件化要求、Tauri 模块拆分和完整验证均有对应任务。
- 行为边界：不修改 command 名称、camelCase 参数、JSON 格式、资源目录、窗口 label 或托盘文案。
- 类型边界：共享 DTO 统一从 `models.rs` 引入；各领域 command 直接注册，不增加重复封装层。
