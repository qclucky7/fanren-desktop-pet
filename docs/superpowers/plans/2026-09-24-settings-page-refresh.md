# Settings Page Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 统一宠物页和设置页的页面骨架，增加克制的页面切换过渡，并重做设置内容布局。

**Architecture:** `SettingsApp` 继续只管理页面状态，通过共享的页面容器动画完成切换；`GeneralSettingsPage` 只编排开机自启与宠物目录两个设置项。视觉规则集中在现有 `settings.css` 与 `settings-general.css`，不引入新组件库或动画依赖。

**Tech Stack:** React、TypeScript、shadcn/ui、CSS animations、Vitest。

---

### Task 1: 统一页面切换反馈

**Files:**
- Modify: `src/styles/settings.css`
- Test: `tests/settings-layout.test.ts`

- [ ] 为当前显示的 `.settings-page-view` 增加 160ms 的透明度与轻微位移动画。
- [ ] 在 `prefers-reduced-motion` 下禁用动画。
- [ ] 增加样式断言，确保切换反馈和无动画偏好不会回归。

### Task 2: 重构设置页内容

**Files:**
- Modify: `src/components/settings/GeneralSettingsPage.tsx`
- Modify: `src/styles/settings-general.css`
- Test: `src/components/settings/GeneralSettingsPage.test.tsx`

- [ ] 让设置页与宠物页使用相同的外边距、标题字号和说明文字层级。
- [ ] 将两个功能整理为一个紧凑的“常规”设置组，减少图标底色和冗长说明。
- [ ] 删除“所有设置均保存在本机……”及浏览器预览说明，同时移除不再使用的运行时判断。
- [ ] 保留开机自启与打开目录的现有行为测试，并增加冗余说明已移除的断言。

### Task 3: 验证

**Files:**
- Verify: `src/components/settings/SettingsApp.tsx`

- [ ] 运行 `npm test`，预期全部测试通过。
- [ ] 运行 `npm run build`，预期 TypeScript 与 Vite 构建通过。
- [ ] 运行 `npm run tauri:dev`，确认桌面窗口正常启动并释放 1420 端口。
