# Tray Menu Behavior Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the settings tray action reliably restore its window and replace separate show/hide actions with one state-aware toggle.

**Architecture:** Keep visibility persistence in the existing `PlayerPreferences` path. A pure label/toggle helper defines menu behavior, while the Tauri callback owns the mutable `MenuItem` handle so its label changes immediately after a successful visibility update.

**Tech Stack:** Rust, Tauri 2, muda menu API

---

### Task 1: Specify visibility toggle behavior

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Test: `src-tauri/src/lib.rs`

- [x] Add a test asserting visible state maps to `隐藏宠物` and toggles to false.
- [x] Add a test asserting hidden state maps to `显示宠物` and toggles to true.
- [x] Run `cargo test --manifest-path src-tauri/Cargo.toml`; expect the new test to fail before the helper exists.

### Task 2: Implement the dynamic tray item

**Files:**
- Modify: `src-tauri/src/lib.rs`

- [x] Create one `toggle-pet-visibility` `MenuItem` whose initial text comes from persisted `initial.pet_visible`.
- [x] Remove the separate `show` and `hide` items from the menu.
- [x] On click, read the latest persisted visibility, invert it, persist it through `set_visible_from_tray`, show or hide the pet window, and call `MenuItem::set_text` with the action for the new state.
- [x] Keep the menu order as visibility toggle, pet settings, quit.

### Task 3: Restore the settings window reliably

**Files:**
- Modify: `src-tauri/src/lib.rs`

- [x] Add a `show_settings_window` helper that calls `show`, `unminimize`, and `set_focus` in that order for the `settings` webview window.
- [x] Route the tray `settings` event through the helper.
- [x] Preserve close-to-hide behavior so the process and tray remain alive.

### Task 4: Verify the fix

**Files:**
- Test: `src-tauri/src/lib.rs`

- [x] Run `cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check`; expect success.
- [x] Run `cargo test --manifest-path src-tauri/Cargo.toml`; expect all Rust tests to pass.
- [x] Run `npm test` and `npm run build`; expect frontend tests and production build to pass.
- [x] Run or rebuild the Tauri app before manual tray verification because an already-running binary does not pick up Rust changes.
