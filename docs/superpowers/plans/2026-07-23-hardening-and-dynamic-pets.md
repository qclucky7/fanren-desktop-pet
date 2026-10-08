# Dynamic Pet and Persistence Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove remaining pet-list hardcodes and close the identified path, persistence, fallback, resource-contract, and error-handling defects.

**Architecture:** Centralize all Rust pet-ID-to-directory resolution behind a validated boundary and replace direct state writes with durable temporary-file replacement plus corrupt-state backup. Keep `pet.json` authoritative for sprite paths by discovering all package WebP files, normalize browser storage before use, and make tests derive expected IDs from the directory rather than maintaining a parallel list.

**Tech Stack:** React, TypeScript, Vite, Vitest, Tauri 2, Rust

---

### Task 1: Secure backend paths and state writes

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/Cargo.toml`

- [x] Add tests proving `..`, absolute paths, and malformed IDs are rejected before resolving an installed pet directory.
- [x] Add a single `installed_pet_dir(data_dir, id)` helper and use it in activate, save-dialogue, reset-dialogue, uninstall, preference validation, and stale-state cleanup.
- [x] Add a test proving corrupt state is renamed to a recoverable `.broken-*.json` file.
- [x] Write state to a unique temporary file, flush it, and replace `player-state.json` with platform-appropriate replace semantics.
- [x] Remove startup `unwrap_or_default`; recover corrupt state only after preserving the original file.

### Task 2: Make package discovery fully manifest-driven

**Files:**
- Modify: `src/data/pet-catalog.ts`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/lib/dialogue-config.test.ts`

- [x] Discover `pets/**/*.webp` and resolve the exact `spritesheetPath` from each manifest.
- [x] Bundle `pets/**/*.json` and `pets/**/*.webp` so optional dialogue files can all be absent.
- [x] Propagate invalid dialogue-file errors instead of materializing empty user state.
- [x] Replace fixed `["songyu", "yinyue"]` assertions with directory-derived discovery equivalence.

### Task 3: Normalize browser and settings state

**Files:**
- Modify: `src/lib/player-api.ts`
- Modify: `src/components/settings/SettingsApp.tsx`
- Modify: `src/components/pet/PetStage.tsx`
- Modify: `src/lib/dialogue-config.test.ts`

- [x] Add safe JSON parsing and runtime validation for preferences and dialogue groups.
- [x] Repair missing active-pet IDs to the first discovered pet and remove stale dialogue keys.
- [x] Make settings refresh retain a selection only when it still exists.
- [x] Show initial settings load failures and clean up late async subscriptions.
- [x] Catch drag-position update failures to avoid unhandled promise rejections.

### Task 4: Align docs and verify release paths

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/dialogues-json.md`
- Modify: `pets/songyu/README.md`
- Modify: `pets/yinyue/README.md`

- [x] Document manifest-driven WebP paths and invalid-dialogue error behavior.
- [x] Correct repository-root installation commands to use `pets/<id>/`.
- [x] Run `npm test`, `npm run build`, `cargo fmt --check`, and `cargo test`.
- [x] Run `npm run tauri:dev` and confirm automatic discovery.
- [x] Run `npm run tauri:build` and confirm the MSI includes both current packages.
