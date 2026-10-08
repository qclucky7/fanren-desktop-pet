# Restore One Dialogue Group Implementation Plan

> **For Codex:** Implement this plan task by task and verify both browser and Tauri persistence paths.

**Goal:** Let a user restore idle, drag, or touch dialogue text independently from the selected pet package's `dialogues.json`.

**Architecture:** Add one shared dialogue-group replacement operation to the browser API and Rust backend. The operation reads the package dialogue source at reset time, replaces only the requested group in `player-state.json` or browser local storage, and returns the resulting groups. The settings UI updates only the requested draft field so unsaved edits in other fields are preserved.

**Tech Stack:** React, TypeScript, Vitest, Tauri 2, Rust

---

### Task 1: Specify the reset behavior

**Files:**
- Modify: `src/lib/dialogue-config.test.ts`
- Modify: `src-tauri/src/lib.rs`

1. Add a browser test proving the selected group returns to package content.
2. Assert the other customized groups remain unchanged.
3. Add a Rust unit test for the same group-level replacement behavior, including an empty package fallback.

### Task 2: Add persistence APIs

**Files:**
- Modify: `src/lib/player-api.ts`
- Modify: `src-tauri/src/lib.rs`

1. Add a `resetDialogueGroup(id, kind)` browser/Tauri API.
2. In Tauri, read the installed pet's optional `dialogues.json`, default missing or invalid data to empty groups, and replace only `kind`.
3. Persist the grouped dialogue value, emit the existing state-change event, and return the complete resulting groups.
4. Mirror the behavior in browser local storage using bundled pet dialogue data as the package source.

### Task 3: Add the settings interaction

**Files:**
- Modify: `src/components/settings/SettingsApp.tsx`

1. Add a compact “恢复默认” control to each dialogue editor.
2. Persist the reset immediately.
3. Update only the reset draft field, preserving unsaved edits in the other fields.
4. Reuse the existing busy state and status message.

### Task 4: Document and verify

**Files:**
- Modify: `docs/dialogues-json.md`

1. Document that restore-default is per group and reads the pet package source.
2. Run `npm test`, `npm run build`, `cargo fmt --check`, and `cargo test`.
3. Manually inspect the settings layout and reset interaction in a running application.
