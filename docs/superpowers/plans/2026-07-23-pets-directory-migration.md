# Pets Directory Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `pets/yinyue/` the single built-in pet source and completely remove the no-longer-needed Yunheng package references.

**Architecture:** Frontend preview imports, dialogue contract tests, and Tauri bundle resources will all read Yinyue from the same `pets/` source tree. Runtime built-in metadata will contain only Yinyue, while stale generated Cargo output from the pre-migration absolute path will be rebuilt.

**Tech Stack:** React, TypeScript, Vite, Vitest, Tauri 2, Rust, JSON, WebP

---

### Task 1: Point every source consumer at `pets/yinyue/`

**Files:**
- Modify: `src/data/mock-pets.ts`
- Modify: `src/lib/dialogue-config.test.ts`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/src/lib.rs`

- [x] Change the Yinyue sprite import from `../../yinyue/spritesheet.webp?url` to `../../pets/yinyue/spritesheet.webp?url`.
- [x] Delete the Yunheng sprite import and its complete `MOCK_PETS` record.
- [x] Change the dialogue test import to `../../pets/yinyue/dialogues.json` and test only that package.
- [x] Change the three Yinyue Tauri resource source paths from `../yinyue/...` to `../pets/yinyue/...`; keep destinations under `bundled-pets/yinyue/` because Rust seeds from the installed resource layout.
- [x] Delete all three Yunheng Tauri resources and change `BUILT_IN_PETS` to the single-element array `["yinyue"]`.

### Task 2: Normalize agent guidance and generated state

**Files:**
- Delete: `AGENT.md`
- Modify: `AGENTS.md`
- Delete and regenerate: `src-tauri/target/`

- [x] Keep `AGENTS.md` as the only repository instruction file.
- [x] Run `cargo clean --manifest-path src-tauri/Cargo.toml` so no old `D:\github\my-codex-pets` build paths or obsolete bundled Yunheng files remain.
- [x] Replace the dated broken-path warnings with the post-migration `pets/yinyue/` layout and any genuinely remaining limitations.

### Task 3: Verify the migration

**Files:**
- Test: `src/lib/dialogue-config.test.ts`
- Verify: `src-tauri/tauri.conf.json`

- [x] Run `npm test`; expect all four suites and all tests to pass.
- [x] Run `npm run build`; expect TypeScript and Vite to resolve Yinyue from `pets/`.
- [x] Run `cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check`; expect success.
- [x] Run `cargo test --manifest-path src-tauri/Cargo.toml`; expect Rust tests to rebuild without the old absolute path.
- [x] Search non-generated files for old root-level resource paths or Yunheng runtime references; expect none outside historical implementation plans.
