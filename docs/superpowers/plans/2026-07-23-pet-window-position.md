# Pet Window Position Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Place the pet window exactly 24 physical pixels from the primary monitor work area's right and bottom edges.

**Architecture:** Replace the fixed taskbar-height approximation with the Windows `SPI_GETWORKAREA` result, which already excludes the taskbar. Keep coordinate arithmetic in a pure helper so negative monitor origins and window dimensions can be unit tested; retain a monitor-bounds fallback for non-Windows builds or API failure.

**Tech Stack:** Rust, Tauri 2, Windows user32 FFI

---

### Task 1: Specify bottom-right coordinate calculation

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Test: `src-tauri/src/lib.rs`

- [x] Add a test where work area `(0, 0, 2560, 1552)`, window `320×360`, and margin `24` produce `(2216, 1168)`.
- [x] Add a test for a work area with a negative origin so secondary-style coordinates remain valid.
- [x] Run the focused Cargo test and confirm it fails before `bottom_right_position` exists.

### Task 2: Read the real Windows work area

**Files:**
- Modify: `src-tauri/src/lib.rs`

- [x] Add a C-compatible `WindowsRect` and declare `SystemParametersInfoW` beside the existing user32 cursor functions.
- [x] Call `SystemParametersInfoW(SPI_GETWORKAREA, ...)` and return `None` when Windows reports failure.
- [x] Keep Windows-specific types and calls behind `#[cfg(target_os = "windows")]`.

### Task 3: Position the pet window

**Files:**
- Modify: `src-tauri/src/lib.rs`

- [x] Use `window.outer_size()` so work-area and window dimensions are both physical pixels.
- [x] On Windows, calculate the position from the work area's right and bottom edges with a 24px margin.
- [x] Fall back to the primary monitor's full physical bounds and the same 24px margin when no work area is available.
- [x] Remove the fixed `64px` vertical subtraction.

### Task 4: Verify

**Files:**
- Test: `src-tauri/src/lib.rs`

- [x] Run `cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check` and `cargo test --manifest-path src-tauri/Cargo.toml`.
- [x] Run `npm test` and `npm run build`.
- [x] Restart the debug app and capture the pet window origin to confirm the new binary applies the corrected startup position.
