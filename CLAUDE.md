# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Dev server at localhost:5173
npm run build        # TypeScript check + Vite production build (output: dist/)
npm run lint         # ESLint check
npm run test         # Vitest unit/component tests (jsdom)
npm run test:e2e     # Playwright E2E tests (headless, all projects)
npm run preview      # Preview production build locally

# Run a single unit test file
npx vitest run src/path/to/file.test.ts

# E2E variants
npm run test:e2e:ui            # Interactive Playwright UI
npm run test:e2e:headed        # Visible browser
npm run test:e2e:chromium      # Chromium only
npm run test:e2e:firefox       # Firefox only
npm run test:e2e:webkit        # WebKit only
npm run test:e2e:mobile        # iPhone 14 Pro Max emulation
npm run test:e2e:ipad          # iPad Pro emulation
npm run test:e2e:breakpoints   # All viewport widths (320–1920px)
npm run test:e2e:update-snapshots  # Refresh visual regression baseline
npm run test:e2e:report        # Open last Playwright HTML report
```

## Architecture

SimNurse is a **fully client-side** React 19 / TypeScript SPA — no backend, no API calls. All state persists in IndexedDB via Dexie.

### Core Data Flow

```
seedScenarios.ts  ──►  db.ts (Dexie/IndexedDB)
                            │
                            ▼
App.tsx  ──►  useScenarioEngine.ts  ──►  Components
             (reducer + 3s timer)
```

1. **`src/data/seedScenarios.ts`** — The scenario DSL. Defines all clinical cases as data: initial `PatientState`, vital progressions, intervention definitions (with appropriateness ratings), expected action sequences, and success/failure conditions.

2. **`src/types/scenario.ts`** — The type backbone. All DSL types (`Scenario`, `PatientState`, `Condition`, `InterventionDefinition`, `EngineEvent`, `SessionLogEvent`) live here. Read this before modifying the engine or DSL.

3. **`src/lib/db.ts`** — Dexie setup with two tables: `scenarios` (seeded from DSL) and `sessionLogs` (timestamped event log per run). Schema is at v5; increment on structural changes.

4. **`src/hooks/useScenarioEngine.ts`** — The simulation heart. A reducer-based engine that ticks every 3 seconds, applying vital progression, evaluating interventions, and emitting `EngineEvent`s. Returns engine state and dispatch functions consumed by `App.tsx`.

5. **`src/lib/scenarioProgress.ts`** — Scoring utility. Evaluates a completed session's `SessionLogEvent[]` against the scenario definition to produce protocol, outcome, and total scores shown in debrief.

6. **`src/hooks/useHelpSystem.ts`** + **`src/data/helpContent.ts`** — Context-aware help subsystem. `helpContent.ts` is the help topic registry keyed by `AppContext`; `useHelpSystem.ts` manages walkthrough state, per-topic feedback, and the `OnboardingTour`/`WalkthroughEngine` lifecycle.

7. **`src/App.tsx`** — The orchestrator (≈800 lines). Manages three views (library, live scenario, debrief), session lifecycle, urgency strip computation, and cheat mode (triggered by `c` key or 3-finger downswipe).

### View Structure

- **Library view** — Scenario selection
- **Live scenario view** — Three tabs: `PatientView` (bedside), `ActionsScreen` (searchable interventions), `StatusDashboard` (vitals/ECG)
- **Debrief view** — `EvaluationSummary` with scoring derived from `sessionLogs`

### Styling Conventions

Tailwind CSS with a custom medical theme. Key custom tokens in `tailwind.config.js`:
- `medical-*` — teal-based app chrome colors
- `vital-hr`, `vital-spo2`, `vital-bp`, `vital-rr`, `vital-temp` — per-vital display colors

Use `clsx` + `tailwind-merge` for conditional class composition (both are installed).

### Testing

- **Unit tests** (`src/**/*.test.{ts,tsx}`) — Vitest + jsdom + @testing-library/react. Setup in `src/test-setup.ts`.
- **E2E tests** (`tests/**/*.spec.ts`) — Playwright with visual regression (2% max pixel diff). Snapshots in `tests/snapshots/`. Nine test projects covering 5 breakpoints, 2 devices, and 3 browsers.

Visual regression baselines must be updated with `test:e2e:update-snapshots` when intentional UI changes are made.

### Key Constraints

- **No backend** — never add server-side code or external API calls
- **IndexedDB only** — all persistence goes through Dexie (`src/lib/db.ts`)
- **Exception**: help walkthrough completion and user feedback use `localStorage` (keys `simnurse_completed_walkthroughs`, `simnurse_help_feedback`) — intentional, not a bug
- **Vite base path** is `/simnurse-app/` — relevant for asset paths and routing
