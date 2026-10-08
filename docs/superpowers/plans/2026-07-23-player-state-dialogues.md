# Player State Dialogues Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `player-state.json` the only runtime dialogue source, importing a pet package's optional dialogue file exactly once and initializing missing files as empty groups.

**Architecture:** When pets are listed or installed, materialize any missing state entry from a valid package `dialogues.json`; otherwise materialize `{ idle: [], drag: [], touch: [] }`. Once an entry exists, resolve it without consulting package changes, preserving user edits and legacy single-pool migration. Browser preview mirrors this behavior through `localStorage`.

**Tech Stack:** React/TypeScript/Vite, Rust, Tauri 2, JSON, Vitest.

---

### Task 1: Rust state materialization

**Files:**
- Modify: `src-tauri/src/lib.rs`

- [ ] Add tests proving a missing state entry imports package groups, a missing package file creates three empty groups, and an existing grouped state entry wins over changed package content.
- [ ] Replace hard-coded `system_default_dialogues()` with `DialogueGroups::default()`.
- [ ] Make `list_pets` insert missing dialogue entries and persist `player-state.json` once after enumeration.
- [ ] Make `install_pet` insert the imported or empty groups into state after a successful copy.
- [ ] Preserve legacy arrays by migrating `idle` from state and using the initially imported `drag` and `touch` values.
- [ ] Run Rust formatting and tests.

### Task 2: Browser state parity

**Files:**
- Rename: `src/data/mock-pets.ts` to `src/data/bundled-pets.ts`
- Modify: `src/lib/player-api.ts`
- Modify: `src/lib/dialogue-config.test.ts`

- [ ] Rename `MOCK_PETS` to `BUNDLED_PETS` and remove `SYSTEM_DEFAULT_DIALOGUES`.
- [ ] On first browser read, materialize each bundled pet's package groups in `localStorage`.
- [ ] For legacy arrays, preserve `idle` and take `drag`/`touch` from the initial package groups.
- [ ] Add Vitest coverage for package import and persisted-state priority.
- [ ] Run `npm test` and `npm run build`.

### Task 3: Contract and runtime verification

**Files:**
- Modify: `docs/dialogues-json.md`

- [ ] Document one-time import, empty initialization, state priority, and the absence of global defaults.
- [ ] Run `cargo fmt --check`, `cargo test`, and `npm run build`.
- [ ] Run `npm run tauri:dev`, confirm a missing package file produces an empty state entry, then stop the process and confirm port 1420 is released.

Because this migrated workspace has no `.git`, the plan omits worktree and commit steps and executes inline.
