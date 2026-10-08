# Development Guidelines Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish repository-specific development guidance for the migrated pet player workspace.

**Architecture:** Keep one authoritative root `AGENTS.md` so automated workers and developers share the same rules, with the requested singular `AGENT.md` as a compatibility entry point. Derive commands, boundaries, contracts, and migration warnings from the checked-in configuration, source, tests, and observed command results.

**Tech Stack:** Markdown, React, TypeScript, Vite, Vitest, Tauri 2, Rust

---

### Task 1: Inspect the migrated workspace

**Files:**
- Read: `package.json`
- Read: `vite.config.ts`
- Read: `src/**`
- Read: `src-tauri/**` excluding generated output
- Read: `pets/**`
- Read: `docs/**`

- [x] Map source directories and runtime boundaries.
- [x] Run `npm test`, `npm run build`, `cargo test`, and `cargo fmt --all -- --check` and record the observed baseline.
- [x] Identify migrated absolute paths, stale resource paths, generated output, and missing Git metadata.

### Task 2: Write repository guidance

**Files:**
- Create: `AGENTS.md`
- Create: `AGENT.md`

- [x] Document project purpose, architecture, directory ownership, and supported commands.
- [x] Document TypeScript/React, Tauri/Rust, pet package, testing, encoding, and generated-file rules.
- [x] Separate durable development rules from the dated migration baseline.
- [x] Point `AGENT.md` to the authoritative standard filename without duplicating rules.

### Task 3: Verify the guidance

**Files:**
- Verify: `AGENTS.md`
- Verify: `AGENT.md`

- [x] Check that every referenced path and npm script exists.
- [x] Check that the recorded command failures match fresh command output.
- [x] Scan for placeholders and contradictory instructions.
