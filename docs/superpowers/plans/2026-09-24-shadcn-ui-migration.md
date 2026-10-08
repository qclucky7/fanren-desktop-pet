# shadcn/ui Settings Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the settings interface around one neutral shadcn/ui design system, remove superseded UI libraries and unused packages, and eliminate avoidable startup blank time.

**Architecture:** Keep page-level business state and the browser/Tauri boundary unchanged. Replace Fluent controls with repository-owned shadcn components, use semantic neutral design tokens for automatic system light/dark appearance, and keep the compact master-detail layout. Paint an inline startup shell before React loads, stagger atlas decoding, and skip unchanged bundled-pet copies.

**Tech Stack:** React 19, TypeScript, Vite, shadcn/ui, Tailwind CSS, Radix primitives, Tauri 2, Rust, Vitest.

---

### Task 1: Lock down startup and dependency expectations

**Files:**
- Modify: `tests/startup-shell.test.ts`
- Create: `tests/ui-dependencies.test.ts`

- [ ] Write assertions that the HTML paints a system-aware loading shell, the React fallback is visible, Fluent is absent from dependencies, and every production dependency is imported by source or required by shadcn primitives.
- [ ] Run `npx vitest run tests/startup-shell.test.ts tests/ui-dependencies.test.ts`; startup assertions should pass and the Fluent dependency assertion should fail before migration.

### Task 2: Establish the shadcn design foundation

**Files:**
- Create: `components.json`
- Modify: `vite.config.ts`
- Modify: `src/styles.css`
- Create/replace: `src/components/ui/button.tsx`
- Create/replace: `src/components/ui/card.tsx`
- Create/replace: `src/components/ui/dialog.tsx`
- Create/replace: `src/components/ui/label.tsx`
- Create/replace: `src/components/ui/slider.tsx`
- Create/replace: `src/components/ui/switch.tsx`
- Create/replace: `src/components/ui/textarea.tsx`
- Create/replace: `src/components/ui/alert.tsx`
- Restore/modify: `src/lib/utils.ts`

- [ ] Configure one neutral token set with 6px base radius, system light/dark media handling, restrained shadows, and no colored navigation fill.
- [ ] Add only the primitives used by the application and expose stable local component APIs.
- [ ] Run `npm run build` to verify strict TypeScript and Tailwind compilation.

### Task 3: Migrate the settings feature components

**Files:**
- Modify: `src/components/settings/SettingsThemeProvider.tsx`
- Modify: `src/components/settings/SettingsApp.tsx`
- Modify: `src/components/settings/SettingsSidebar.tsx`
- Modify: `src/components/settings/GeneralSettingsPage.tsx`
- Modify: `src/components/settings/PetInspector.tsx`
- Modify: `src/components/settings/DialogueListEditor.tsx`
- Modify: `src/styles/settings.css`
- Modify: `src/styles/settings-general.css`

- [ ] Replace every Fluent import with local `@/components/ui/*` imports without changing component behavior or Chinese accessibility labels.
- [ ] Replace the confirmation dialog, switches, textareas, buttons, cards, alerts, and sliders; keep dialogue interval as a two-thumb range.
- [ ] Remove utility classes that do not correspond to the chosen semantic layout and keep every production source file under 500 lines.
- [ ] Run settings component tests and `npm test`.

### Task 4: Reduce startup resource work

**Files:**
- Modify: `src/components/pet/SpritePreview.tsx`
- Modify: `src/components/settings/PetCard.tsx`
- Modify: `src/components/settings/PetLibrary.tsx`
- Create: `src/components/pet/SpritePreview.test.tsx`
- Modify: `src-tauri/src/pets.rs`

- [ ] Add a fake-timer test proving deferred previews do not assign their atlas URL before the configured delay.
- [ ] Load the selected pet preview immediately and stagger the remaining large atlas decodes.
- [ ] Add Rust package-stamp tests and store source metadata in `.lingban-built-in` so unchanged built-in atlases are not copied on every start.
- [ ] Run targeted frontend tests and `cargo test --manifest-path src-tauri/Cargo.toml pets::tests`.

### Task 5: Remove unused libraries and verify the desktop application

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Delete: `src/components/settings/SettingsThemeProvider.test.tsx` only if it tests Fluent-specific markup rather than system-theme behavior
- Delete: obsolete UI component files not imported after migration

- [ ] Uninstall `@fluentui/react-components` and any direct package with no production/configuration import; keep packages required transitively by the generated shadcn components.
- [ ] Run `rg` audits for Fluent imports and orphaned local UI modules.
- [ ] Run `npm test`, `npm run build`, `cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check`, and `cargo test --manifest-path src-tauri/Cargo.toml`.
- [ ] Launch `npm run tauri:dev`, confirm startup reaches the settings window, then terminate it and confirm port 1420 is free.
