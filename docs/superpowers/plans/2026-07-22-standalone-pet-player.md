# Standalone Codex Pet Player Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Tauri desktop pet player that reuses Codex v2 pet packages, adds configurable local random dialogue, and manages pets from a React + shadcn/ui settings window.

**Architecture:** A Rust Tauri backend owns installation, validation, persistence, tray actions, and the transparent desktop window. A React frontend has two entry views selected by query string: the transparent pet renderer and the settings window. Pet packages remain compatible with Codex because the required `pet.json` and `spritesheet.webp` files are not modified; player-only dialogue is stored in a sidecar file.

**Tech Stack:** Tauri 2, Rust, React, TypeScript, Vite, Tailwind CSS, shadcn/ui primitives, Vitest.

---

## File map

- `package.json`: frontend scripts and dependencies.
- `src-tauri/src/lib.rs`: Tauri commands, tray, windows, and application setup.
- `src-tauri/src/pets.rs`: v2 package validation and install/uninstall/list operations.
- `src-tauri/src/preferences.rs`: settings and dialogue persistence.
- `src/lib/pet-contract.ts`: Codex v2 rows, frame counts, and timings.
- `src/lib/dialogue-scheduler.ts`: deterministic random dialogue selection and timers.
- `src/components/pet/PetStage.tsx`: transparent sprite renderer and bubble.
- `src/components/settings/SettingsApp.tsx`: pet cards, activation, installation, removal, and dialogue settings.
- `src/components/ui/*`: shadcn/ui components used by settings.
- `src/lib/*.test.ts`: contract and dialogue unit tests.

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`
- Create: `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `src-tauri/src/main.rs`

- [ ] Create the Vite React and Tauri 2 manifests with `dev`, `test`, `build`, `tauri`, and `tauri:build` scripts.
- [ ] Install npm and Cargo dependencies.
- [ ] Run `npm run build`; expect a successful empty application build.

### Task 2: Codex v2 contract and sprite playback

**Files:**
- Create: `src/lib/pet-contract.ts`
- Create: `src/lib/pet-contract.test.ts`
- Create: `src/components/pet/SpriteCanvas.tsx`

- [ ] Test that all standard rows return the required frame count and that direction index 15 maps to row 10 column 7.
- [ ] Define the 8×11 atlas, 192×208 cells, row mappings, and official per-frame durations.
- [ ] Draw only the selected source rectangle to a transparent canvas and loop with each frame's duration.
- [ ] Run `npm test`; expect the contract tests to pass.

### Task 3: Dialogue scheduler

**Files:**
- Create: `src/lib/dialogue-scheduler.ts`
- Create: `src/lib/dialogue-scheduler.test.ts`
- Create: `src/components/pet/SpeechBubble.tsx`

- [ ] Test empty dialogue handling, non-repeating selection, and min/max delay normalization.
- [ ] Implement local weighted random selection without network or AI calls.
- [ ] Schedule dialogue between configurable minimum and maximum intervals; clicking the pet triggers an immediate line.
- [ ] Couple speech to the `waving` row and return to `idle` after one animation cycle.

### Task 4: Native pet storage

**Files:**
- Create: `src-tauri/src/models.rs`
- Create: `src-tauri/src/pets.rs`
- Create: `src-tauri/src/preferences.rs`

- [ ] Validate UTF-8 JSON, kebab-case directory/id equality, `spriteVersionNumber: 2`, relative `spritesheetPath`, and a 1536×2288 WebP atlas.
- [ ] Copy an installed package into the application data `pets/<id>` directory and optionally import `dialogues.json`.
- [ ] Seed `yinyue` and `yunheng` once using compile-time bundled bytes.
- [ ] Persist active pet, visibility, dialogue interval, display duration, scale, and per-pet dialogue lines atomically.
- [ ] Ensure uninstall only removes the selected application-data pet directory after resolving and checking that it is inside the player pet root.

### Task 5: Tauri commands, windows, and tray

**Files:**
- Create: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/main.rs`
- Create: `src-tauri/capabilities/default.json`

- [ ] Expose `list_pets`, `install_pet`, `uninstall_pet`, `set_active_pet`, `get_preferences`, `update_preferences`, and `save_dialogues` commands.
- [ ] Configure a transparent, undecorated, always-on-top pet window and a hidden settings window.
- [ ] Add tray actions in this order: show pet, hide pet, pet settings, quit.
- [ ] Hide windows on close and keep the tray process alive; quit only from the tray command.
- [ ] Emit state-change events so both React windows refresh after native operations.

### Task 6: React + shadcn/ui settings window

**Files:**
- Create: `src/components/ui/button.tsx`, `card.tsx`, `dialog.tsx`, `input.tsx`, `label.tsx`, `slider.tsx`, `switch.tsx`, `textarea.tsx`, `badge.tsx`
- Create: `src/components/settings/SettingsApp.tsx`
- Create: `src/components/settings/PetCard.tsx`
- Create: `src/styles.css`

- [ ] Use a restrained dark desktop-tool aesthetic with warm ivory text and electric lime activation accents.
- [ ] Display each pet's actual idle frame, name, description, active state, and install source.
- [ ] Activate a pet by selecting its card and pressing the primary action.
- [ ] Install from a native directory picker and confirm removal with a shadcn AlertDialog.
- [ ] Edit one dialogue per line plus interval, duration, scale, and dialogue enabled state.
- [ ] Keep keyboard focus, labels, disabled states, and reduced-motion support accessible.

### Task 7: Packaging and verification

**Files:**
- Create: `src-tauri/icons/app-icon.svg` and generated platform icons.
- Modify: `README.md`

- [ ] Run `npm test`; expect all frontend unit tests to pass.
- [ ] Run `cargo test --manifest-path src-tauri/Cargo.toml`; expect package validation tests to pass.
- [ ] Run `npm run build`; expect TypeScript and Vite production builds to pass.
- [ ] Launch `npm run tauri dev` and inspect both windows, tray actions, active pet switching, random dialogue, installation, and removal.
- [ ] Run `npm run tauri build`; expect a Windows installer under `src-tauri/target/release/bundle`.
- [ ] Document development, package format, installation, dialogue configuration, and build commands without changing existing pet release files.

## Self-review

- All requested features map to Tasks 2–7.
- Codex compatibility is preserved by treating player dialogue as an optional sidecar.
- Destructive scope is limited to the player's resolved application-data pet directory.
- The MVP is local-only and contains no AI, account, or network integration.
