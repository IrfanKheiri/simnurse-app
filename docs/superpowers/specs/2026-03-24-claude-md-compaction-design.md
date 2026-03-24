# CLAUDE.md Compaction Design — SimNurse

**Date:** 2026-03-24
**Status:** Approved
**Goal:** Reduce CLAUDE.md from 1,128 lines / 76KB to ~600 lines across a 2-file hierarchy without losing any non-derivable information or nuance.

---

## Problem

The root `CLAUDE.md` is 1,128 lines and loads into context on every Claude Code message. Large portions restate what the source files already say (type definitions, directory trees, component hierarchies, code snippets). This wastes context tokens and risks truncation.

---

## Approach: 2-Level Hierarchy (Role-Based Split)

Split into two files:

- `CLAUDE.md` (root) — loads on **every** message; contains only what is useful regardless of task type
- `src/CLAUDE.md` — loads only when Claude navigates into `src/`; contains implementation detail

### Core Principle

> Root earns its context tokens on every task — including non-coding tasks. `src/CLAUDE.md` loads exactly when writing or debugging code.

**Both files load together** when Claude navigates into `src/`. Content must therefore not be duplicated across the two files — anything in root is already in context when `src/CLAUDE.md` loads.

---

## Root `CLAUDE.md` (~180 lines)

### Sections

**1. What It Is**
3-paragraph condensed overview: nursing simulation SPA, three competency levels (BLS/ACLS/PALS), 26 scenarios, fully client-side. No external services. Production path: `/simnurse-app/`.

**2. Tech Stack**
Condensed table: framework, language, build tool, DB/persistence, testing. ~8 rows. Points to `package.json` for full version list.

**3. Commands**
One-liner per command: `dev`, `build`, `test`, `test:e2e`, `lint`, `preview`. No sub-variants (those go in `src/CLAUDE.md`).

**4. Critical Gotchas** *(new consolidated section)*
Non-obvious facts that bite before reading source:
- `bp` is a **string** `"120/80"` — never two numbers; always parse with `parseBP()` for numeric operations
- **Two-state design**: engine holds `baseState` (used for win/loss evaluation) and `displayState` (rendered); never conflate — visual overrides must not falsely trigger conditions
- **Infant lone-rescuer CPR**: `call_911` is LAST in expected sequence (AHA 2020); two-rescuer: `call_911` is SECOND
- **Drowning protocol**: ventilation-first — 5 rescue breaths BEFORE compressions (opposite of standard arrest)
- **Heimlich is a distractor** in `bls_infant_choking` (`success_chance: 0.0`) — teaches that Heimlich is contraindicated in infants
- **`suppressedProcedures` localStorage key must NOT be cleared on scenario start** (ISSUE-05) — persists user's guide suppression preferences across scenarios
- **WalkthroughEngine spotlight is fully interactive**; backdrop tap does NOT dismiss — only "Skip Tour" button or Escape

**5. Configuration Quirks**
- `vite.config.ts` imports from `vitest/config` NOT `vite` — do not change
- `base: '/simnurse-app/'` affects all asset URLs in production builds
- `tsconfig.app.json`: `verbatimModuleSyntax` requires `import type` for type-only imports; `erasableSyntaxOnly` enforced
- `test-setup.ts`: uses `expect.extend(matchers)` pattern (not direct `import '@testing-library/jest-dom'`) — Vitest 4 quirk; do not change
- **Cheat mode**: activated by a file named `.cheat_mode` served at `${BASE_URL}.cheat_mode`; app checks via HEAD request on load — soft mechanism, no server enforcement. `server.host: '0.0.0.0'` and `playwright.config.ts` CI/tolerance details go in `src/CLAUDE.md`.

**6. Known Issues & Technical Debt**
Current §10 content kept nearly verbatim — almost entirely non-derivable context. Minor trim: remove cross-references only meaningful alongside §7.

**7. No Auth**
One sentence: SimNurse has no authentication, accounts, or protected routes — entirely local to the browser.

---

## `src/CLAUDE.md` (~420 lines)

### Sections

**1. Architecture**
- Three conceptual layers: data / engine / presentation (1 paragraph)
- View structure table: Library / Live Scenario / Debrief — conditions and component lists
- State management tiers: engine state, app state, component-local state, persistent state — condensed to bullets
- *Removed*: directory tree (use Glob), component hierarchy ASCII art (read App.tsx)

**2. Data Models**
- Points to `src/types/scenario.ts` as authoritative source for all type definitions
- Keeps: `PatientState` field list with bp-string warning reinforced, `InterventionDefinition` key fields, `Condition` conjunctive vs disjunctive logic, `Scenario` root fields, DB table definitions, schema versioning rules
- *Removed*: verbatim type definitions that duplicate `scenario.ts`

**3. Clinical Anomalies (scenario authoring)**
Replaces ~150 lines of per-scenario prose with ~10 bullets covering only non-obvious protocol rules:
- Infant lone-rescuer CPR sequence (call_911 last)
- Infant two-rescuer CPR sequence (call_911 second)
- Drowning ventilation-first protocol
- Heimlich distractor with `success_chance: 0.0`
- Perimortem C-section scenario (`pregnant_vfib_arrest`)
- ACS-STEMI scheduled VFib deterioration if untreated
Points to `src/data/seedScenarios.ts` for full definitions.

**4. Engine, Scoring & Help System**
- Engine tick action sequence (numbered steps, condensed) — kept
- `apply_intervention` guard order (kept — non-obvious order matters for correctness)
- Two-state design rationale — kept
- Scoring algorithm (5 steps) — kept (non-derivable logic)
- Help system: localStorage keys, mutual exclusion rules, auto-start debounce — kept
- Urgency strip computation — condensed to key rules

**5. Data Flow (condensed walkthroughs)**
5 walkthroughs compressed from ~200 lines to ~50 lines total. Each becomes: trigger → key side-effect → what's non-obvious. Code snippets that restate source files are removed.

**6. Conventions & Patterns**
- File naming conventions — kept
- TypeScript patterns (discriminated unions, no `any`, `import type`) — kept
- Styling architecture: custom Tailwind tokens (medical-*, vital-*, vital-rhythm-* with hex values), class composition pattern — **rhythm hex values explicitly retained** alongside R-12 duplication warning (ECGWaveform RHYTHM_COLOUR constants must match tailwind.config.js tokens; manual sync required)
- `server.host: '0.0.0.0'` dev server config and `playwright.config.ts` CI/tolerance details (retries, workers, reuseExistingServer, 2%/20% visual regression tolerances) — placed here, not in root
- Portal z-index hierarchy (header → ProcedureGuide → HelpPanel → WalkthroughEngine → modals → CheatOverlay) — kept
- Focus trap pattern (standard across CorrectActionWidget, IncorrectActionWidget, ProcedureGuide) — kept
- Icon usage: lucide-react only — one line

**7. Testing Patterns**
- Unit test patterns: fake timers cleanup, localStorage pre-seeding for walkthroughs — kept
- E2E patterns: engine freeze flag, generous timeouts, IndexedDB async seeding — kept
- Stale mock fix instructions for 3 files — kept
- E2E test project sub-commands listed here (not in root)

**8. Checklists**
- New scenario checklist (5 steps) — kept
- New component checklist (8 steps including focus trap) — kept
- Engine modification checklist — kept

---

## What Is Deleted

| Deleted content | Reason | Where to find it instead |
|----------------|--------|--------------------------|
| Directory tree (`simnurse-app/` ASCII tree) | Glob is faster | `Glob("**/*")` |
| Component hierarchy ASCII art | Derivable | Read `src/App.tsx` |
| Full type definitions (verbatim copies of scenario.ts) | Derivable | `src/types/scenario.ts` |
| All 26 per-scenario prose descriptions | Derivable | `src/data/seedScenarios.ts` |
| Data access code snippets | Derivable | Read `src/App.tsx`, `LibraryScreen.tsx` |
| Step-by-step walkthrough code | Derivable | Read `useHelpSystem.ts`, `WalkthroughEngine.tsx` |
| Full E2E sub-command list (in root) | Low-frequency | Moved to `src/CLAUDE.md` |
| §6 Auth (full section) | One sentence suffices | N/A |

---

## Success Criteria

- Root `CLAUDE.md`: ≤ 200 lines
- `src/CLAUDE.md`: ≤ 500 lines
- All entries in the "Critical Gotchas" section preserved
- All ISSUE-XX, R-XX, and technical debt entries preserved
- No clinical protocol anomalies lost
- Build passes after changes (`npm run build`)
