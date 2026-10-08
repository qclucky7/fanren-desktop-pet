# Settings Sidebar and System Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent left navigation with “宠物” and “设置” pages, and expose autostart plus the local pet directory from the settings page.

**Architecture:** `SettingsApp` becomes a shell-level page router. Pet management moves into focused library/inspector components, while native system options live in a separate settings page and call typed functions in `player-api.ts`. Rust keeps autostart state synchronized with the existing tray checkbox and opens only the app-owned pet directory through a dedicated command.

**Tech Stack:** React, TypeScript, Radix/shadcn components, CSS, Tauri 2, Rust, `tauri-plugin-autostart`, `tauri-plugin-opener`, Vitest, Cargo tests.

---

### Task 1: Define the native settings boundary

**Files:**
- Modify: `src/lib/player-api.ts`
- Modify: `src-tauri/src/tray.rs`
- Modify: `src-tauri/src/pets.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/Cargo.toml`

- [ ] Add `getAutostartEnabled()`, `setAutostartEnabled(enabled)`, and `openPetDirectory()` wrappers in `player-api.ts`; browser preview uses a localStorage autostart fallback and returns a clear error for opening a native folder.
- [ ] Add thin Tauri autostart commands that use the existing plugin and update the same `CheckMenuItem` used by the tray.
- [ ] Make `setup_tray` return focused tray control state so UI commands and tray events share one authoritative checkbox.
- [ ] Add an `open_pet_directory` command that creates and opens `AppState.data_dir/pets`, using `tauri-plugin-opener` rather than shell command strings.
- [ ] Initialize the opener plugin and register all three commands in `generate_handler!`.
- [ ] Add Rust tests for autostart state transitions and the exact application-owned pets path.

### Task 2: Split the settings interface into focused components

**Files:**
- Modify: `src/components/settings/SettingsApp.tsx`
- Create: `src/components/settings/SettingsSidebar.tsx`
- Create: `src/components/settings/PetManagementPage.tsx`
- Create: `src/components/settings/PetLibrary.tsx`
- Create: `src/components/settings/PetInspector.tsx`
- Create: `src/components/settings/GeneralSettingsPage.tsx`

- [ ] Reduce `SettingsApp` to active-page state, status presentation, sidebar composition, and page selection.
- [ ] Build an accessible sidebar with semantic buttons, `aria-current`, “宠物” and “设置” labels, matching icons, keyboard focus states, and the existing brand mark.
- [ ] Move pet loading, selection, dialogue drafts, persistence, restore, and uninstall orchestration into `PetManagementPage` without changing existing behavior.
- [ ] Extract the scrollable pet card collection and pet inspector into dedicated components.
- [ ] Build `GeneralSettingsPage` with a section header, an autostart switch that saves immediately, and an “打开宠物目录” button with busy/error/success feedback.

### Task 3: Rework and split the settings styles

**Files:**
- Modify: `src/styles.css`
- Create: `src/styles/settings.css`
- Modify: `src/main.tsx`
- Modify: `tests/settings-layout.test.ts`

- [ ] Move all settings-window styles into `settings.css`, leaving shared base and pet-window rules in `styles.css` so neither production stylesheet exceeds 500 lines.
- [ ] Create a fixed-width soft navigation rail, flexible content stage, selected navigation pill, and warm card treatment consistent with the current coral/cream palette.
- [ ] Keep both pet-list and inspector Radix scroll areas constrained with `min-height: 0`, preserve 820×620 support, and add a compact-height adjustment.
- [ ] Update the CSS regression test to read `settings.css` and assert the navigation/content and long-list shrink boundaries.

### Task 4: Test and visually verify both pages

**Files:**
- Create: `src/components/settings/SettingsSidebar.test.tsx`
- Create: `src/components/settings/GeneralSettingsPage.test.tsx`

- [ ] Test that navigation exposes exactly “宠物” and “设置”, applies `aria-current`, and changes the selected page.
- [ ] Test that the settings page loads the autostart state, persists switch changes, disables duplicate actions while busy, and reports folder-open errors.
- [ ] Run `npm test`; expect all Vitest suites to pass.
- [ ] Run `npm run build`; expect TypeScript and Vite production build to pass.
- [ ] Run `cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check` and `cargo test --manifest-path src-tauri/Cargo.toml`; expect all Rust checks to pass.
- [ ] Run `npm run tauri:dev` and manually verify navigation, autostart/tray synchronization, folder opening, scroll behavior, focus states, and the 820×620 minimum window.

The repository has no `.git`, so worktree and commit steps are intentionally omitted; validation results must be reported explicitly.
