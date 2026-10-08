# Auto-Discover Built-In Pets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every valid `pets/<id>/` package automatically available as a built-in pet in browser preview, Tauri development, and packaged applications.

**Architecture:** Vite discovers package files with eager `import.meta.glob` calls and constructs browser records from each `pet.json`. Tauri bundles the required files with resource globs; Rust discovers packaged directories at startup, copies them into application data, and keeps the discovered IDs in runtime state for built-in protection and fallback selection.

**Tech Stack:** React, TypeScript, Vite, Vitest, Tauri 2, Rust

---

### Task 1: Lock browser discovery behavior

**Files:**
- Modify: `src/lib/dialogue-config.test.ts`
- Create: `src/data/pet-catalog.ts`
- Delete: `src/data/bundled-pets.ts`

- [x] Add a test that expects both `songyu` and `yinyue` to be discovered from `pets/`.
- [x] Replace explicit imports and the handwritten array with eager Vite globs for `pet.json`, `spritesheet.webp`, and optional `dialogues.json`.
- [x] Validate manifest IDs against directory names and initialize missing dialogue groups as empty arrays.
- [x] Run `npm test -- --run src/lib/dialogue-config.test.ts` and confirm the discovery test passes.

### Task 2: Make Tauri resources directory-driven

**Files:**
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/src/lib.rs`

- [x] Replace per-pet resource mappings with list globs for `../pets/*/pet.json`, `../pets/*/dialogues.json`, and `../pets/*/spritesheet.webp`.
- [x] Replace `BUILT_IN_PETS` and `built_in_details` with resource-directory discovery based on validated `pet.json` files.
- [x] Return discovered IDs from startup seeding and store them in `AppState`.
- [x] Use the runtime set for built-in status, uninstall protection, and deterministic active-pet fallback.
- [x] Add a Rust test that scans the repository `pets/` directory and finds both current packages.

### Task 3: Remove the default pet hardcode

**Files:**
- Modify: `src/data/pet-catalog.ts`
- Modify: `src-tauri/src/lib.rs`

- [x] Derive the browser default active pet from the first sorted discovered package.
- [x] Initialize Rust preferences without a fixed ID and select the first discovered built-in when stored state has no valid active pet.
- [x] Preserve valid existing active-pet choices for backward compatibility.

### Task 4: Update the contributor contract and verify

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/dialogues-json.md`

- [x] State that `pets/<id>/` is the sole built-in pet registration mechanism.
- [x] Remove instructions requiring manual synchronization of frontend, Rust, and resource lists.
- [x] Run `npm test`, `npm run build`, `cargo fmt --check`, and `cargo test`.
- [x] Run `npm run tauri:dev` and confirm both Songyu and Yinyue appear.
- [x] Run `npm run tauri:build` because bundle resource configuration changed, and confirm MSI generation.
