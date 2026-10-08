# Event Dialogues Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make optional per-pet `dialogues.json` files provide independent idle, drag, and touch dialogue pools with system-default fallback.

**Architecture:** Keep Codex `pet.json` unchanged and place player-only dialogue metadata beside it. Tauri loads packaged defaults, migrates legacy saved arrays to grouped dialogue objects, and returns one normalized shape to React. Runtime events select from independent per-event pools.

**Tech Stack:** React, TypeScript, Vitest, Tauri 2, Rust, Serde

---

### Task 1: Shared dialogue contract

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/data/mock-pets.ts`
- Test: `src/lib/dialogue-scheduler.test.ts`

- [ ] Define `DialogueGroups` with `idle`, `drag`, and `touch` string arrays.
- [ ] Replace `PetRecord.dialogues: string[]` with the grouped contract.
- [ ] Add generic system defaults for pets without `dialogues.json`.
- [ ] Verify with `npm test` and expect all dialogue scheduler tests to pass.

### Task 2: Native loading and migration

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/lib/player-api.ts`

- [ ] Add matching Rust `DialogueGroups` and an untagged legacy/grouped stored value.
- [ ] Load and normalize optional `<pet>/dialogues.json`; use system defaults when absent or invalid.
- [ ] Let saved per-pet overrides win over packaged dialogue files.
- [ ] Copy a valid optional `dialogues.json` during installation.
- [ ] Change `save_dialogues` to accept the grouped object.
- [ ] Run `cargo check --manifest-path src-tauri/Cargo.toml` and expect success.

### Task 3: Event-specific runtime behavior

**Files:**
- Modify: `src/components/pet/PetStage.tsx`

- [ ] Maintain separate last-dialogue refs for `idle`, `drag`, and `touch`.
- [ ] Use `idle` for scheduled local dialogue, `drag` once when a drag begins, and `touch` for pointer entry/click.
- [ ] Preserve current animation rules: idle actions are `jumping/review`, touch is `jumping`, and drag uses directional running rows.
- [ ] Run `npm test` and `npm run build` and expect both to pass.

### Task 4: Configuration UI and pet packages

**Files:**
- Modify: `src/components/settings/SettingsApp.tsx`
- Create: `yinyue/dialogues.json`
- Create: `yunheng/dialogues.json`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `README.md`
- Modify: `yinyue/README.md`
- Modify: `yunheng/README.md`

- [ ] Show three compact textareas labelled 待机、拖拽、触摸; each line is one phrase.
- [ ] Bundle the two built-in files and seed them beside each pet atlas.
- [ ] Document that `dialogues.json` is optional and ignored by Codex Desktop itself.
- [ ] Validate both existing v2 atlases with `validate_atlas.py --require-v2`; dialogue-only changes must not alter binary spritesheets.

### Task 5: Release verification

**Files:**
- Output: `src-tauri/target/release/bundle/msi/灵伴桌面宠物_0.1.0_x64_zh-CN.msi`

- [ ] Run `npm test`, `npm run build`, and `cargo check --manifest-path src-tauri/Cargo.toml`.
- [ ] Run `npx tauri build --bundles msi` and confirm the MSI path exists.
