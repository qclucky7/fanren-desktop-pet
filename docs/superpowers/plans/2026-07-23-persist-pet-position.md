# Persist Pet Position Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Save the pet window's final drag position and restore it on the next application launch without allowing stale off-screen coordinates to strand the window.

**Architecture:** Store an optional physical `{x, y}` position beside preferences in `player-state.json`, preserving compatibility with files that predate the field. The frontend requests a save only after a real drag; startup restores the saved position when at least 48×48 physical pixels remain on any current monitor, otherwise it uses the existing work-area-aware bottom-right default.

**Tech Stack:** React, TypeScript, Tauri 2, Rust, Serde

---

### Task 1: Define and test persisted position behavior

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Test: `src-tauri/src/lib.rs`

- [x] Add a test proving a legacy state JSON without `petPosition` deserializes with `None`.
- [x] Add tests proving a saved window with at least 48×48 pixels on a monitor is restorable and a fully off-screen window is rejected.
- [x] Run the focused Cargo tests and confirm they fail before `StoredWindowPosition` and `window_position_is_visible` exist.

### Task 2: Persist drag completion

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/lib/player-api.ts`
- Modify: `src/components/pet/PetStage.tsx`

- [x] Add optional `pet_position` to `StoredState` with Serde's missing-field default.
- [x] Add and register `save_pet_window_position(x, y)`, which updates only the position while preserving preferences and dialogues.
- [x] Add `savePetWindowPosition()` to the Tauri API boundary; it reads `getCurrentWindow().outerPosition()` and invokes the command, while browser preview remains a no-op.
- [x] Call the API after a real drag ends, deferred to the next event-loop turn so the final asynchronous `setPosition` settles first; do not save ordinary clicks.

### Task 3: Restore a safe saved position

**Files:**
- Modify: `src-tauri/src/lib.rs`

- [x] Read the complete stored state once during setup and pass its optional position into `position_pet_window`.
- [x] Build physical rectangles from `available_monitors()` and restore the exact saved position when the window retains at least 48×48 visible pixels on any monitor.
- [x] Fall back to the current Windows work-area-aware bottom-right calculation when the position is missing or no longer visible.

### Task 4: Verify persistence

**Files:**
- Test: `src-tauri/src/lib.rs`

- [x] Run `cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check` and `cargo test --manifest-path src-tauri/Cargo.toml`.
- [x] Run `npm test` and `npm run build`.
- [ ] Restart the debug app, drag the pet, confirm `player-state.json` receives `petPosition`, then restart again and confirm the window origin matches the saved coordinates.
