# SimNurse Application Architecture

SimNurse is a client-side React SPA that runs a timed clinical simulation entirely in the browser. There is no runtime backend. Scenario definitions, live engine state, and learner session logs are all driven from local code and browser storage.

## System Overview

- Framework: React 19 with function components and hooks.
- Tooling: Vite, TypeScript, Tailwind CSS, Vitest, and Playwright.
- Persistence: Dexie on top of IndexedDB for seeded scenarios and per-run session logs.
- Runtime model: one selected scenario feeds a reducer-driven simulation engine that emits typed lifecycle events back to the app shell.

## Runtime Flow

1. `App.tsx` loads seeded scenarios from Dexie and renders the library screen.
2. Selecting a scenario clones the scenario data, generates a new `sessionId`, and starts `useScenarioEngine`.
3. The engine advances every 3 seconds, applies baseline progression, active intervention effects, and scheduled state changes, then evaluates success and failure conditions.
4. Engine events are persisted to Dexie as typed session log records.
5. The UI renders the current patient state across the patient, actions, and status tabs.
6. When the learner ends the case or the engine completes it, the debrief is assembled from the stored session events for that run only.

## Core Modules

### `src/App.tsx`

`App.tsx` is the application orchestrator. It owns:

- scenario selection and reset
- per-run session identity
- unlocked vital visibility state
- debrief visibility and scoring inputs
- persistence of engine events into Dexie
- routing between library, live scenario, and debrief views

### `src/hooks/useScenarioEngine.ts`

`useScenarioEngine` is the simulation engine. It uses a reducer instead of a closure-heavy interval so each tick reads current state deterministically. On each tick it:

- increments elapsed time
- applies baseline numeric decay or improvement
- applies repeating intervention rate modifiers
- expires timed interventions
- applies one-shot scheduled state changes
- derives the display state from the base state plus active overrides
- evaluates typed comparator-based success and failure conditions
- emits typed engine events

The engine no longer infers arrest solely from rhythm. `pulsePresent` is part of `PatientState`, so pulseless scenarios such as PEA are represented explicitly.

### `src/data/seedScenarios.ts`

This file is the scenario DSL for the app. Each scenario defines:

- initial patient state
- baseline vital progression
- optional scheduled state changes for timed non-numeric transitions
- available interventions and their effects
- expected intervention sequence
- success and failure conditions using explicit comparators and hold durations

### `src/lib/db.ts`

Dexie stores two tables:

- `scenarios`: seeded from `seedScenarios.ts`
- `sessionLogs`: typed event records for each learner run

Schema upgrades reseed scenarios and clear obsolete session logs so the local store stays compatible with the current simulation model.

## Event Model

The engine emits typed events instead of anonymous payloads:

- `start`
- `intervention`
- `state_change`
- `completion`

`App.tsx` adds `manual_end` when a learner stops the case manually. Those event types are also the source of truth for debrief scoring and the review timeline.

## UI Composition

The live simulation UI is split into three tabs:

- `PatientView`: bedside presentation, narrative clues, end-case action
- `ActionsScreen`: searchable intervention catalog and procedure review flow
- `StatusDashboard`: monitor-style telemetry, vital unlocks, and ECG display

Shared chrome is provided by `Header`, `MiniMonitor`, `BottomNav`, `OnboardingTour`, `ToastProvider`, and `IncorrectActionWidget`.

## Testing Strategy

- Unit and component tests live under `src/**/*.test.ts(x)` and run through Vitest.
- Browser and layout regression tests live under `tests/**/*.spec.ts` and run through Playwright.
- Build type-checking excludes test files so shipping code and test harnesses can evolve independently.

## Non-Goals

- No production backend or server-side rendering.
- No server database integration.
- No source of truth in `db/schema.sql`; the running app uses Dexie and IndexedDB only.
