# SimNurse Application Architecture

SimNurse is a client-side React SPA that runs a timed clinical simulation entirely in the browser. There is no runtime backend. Scenario definitions, live engine state, and learner session logs are all driven from local code and browser storage.

## System Overview

- Framework: React 19 with function components and hooks.
- Tooling: Vite, TypeScript, Tailwind CSS, Vitest, and Playwright.
- Persistence: Dexie on top of IndexedDB for seeded scenarios and per-run session logs.
- Authoring model: scenarios can define legacy `expected_sequence`, route-aware `protocol`, or both during migration.
- Runtime model: one selected scenario feeds a reducer-driven simulation engine that normalizes protocol routes, tracks required progress, and emits typed lifecycle events back to the app shell.

## Runtime Flow

1. `App.tsx` loads seeded scenarios from Dexie and renders the library screen.
2. Selecting a scenario clones the scenario data, generates a new `sessionId`, and starts `useScenarioEngine`.
3. `useScenarioEngine` normalizes route-aware protocol data when `scenario.protocol` exists, otherwise it falls back to `expected_sequence`.
4. Every 3 seconds the engine applies scheduled state changes, baseline progression, active intervention effects, route activation, and success or failure checks.
5. Accepted and rejected intervention events carry structured protocol metadata, including available next interventions and active route information.
6. `App.tsx` persists those events to Dexie as typed session log records and updates the live UI across the patient, actions, and status tabs.
7. Debrief reconstruction reads only the current session's logs. Expected-step guidance is metadata-first and falls back to legacy `expected_sequence` replay only for older logs that lack structured protocol metadata.
8. Strict incomplete scoring uses runtime required-step totals, not flat `expected_sequence` length.

## Core Modules

### `src/App.tsx`

`App.tsx` is the application orchestrator. It owns:

- scenario selection and reset
- per-run session identity
- unlocked vital visibility state
- persistence of engine events into Dexie
- incorrect and correct intervention widgets
- debrief visibility, feedback assembly, and scoring inputs
- routing between library, live scenario, and debrief views

### `src/hooks/useScenarioEngine.ts`

`useScenarioEngine` is the simulation engine. It uses a reducer instead of a closure-heavy interval so each tick reads current state deterministically. In addition to baseline physiology and intervention timing, it now handles:

- protocol normalization from legacy or route-aware authoring
- active, activated, and completed route tracking
- optional branch and rescue route activation
- state-aware available intervention derivation
- rescue-route locking before activation
- strict completion gating based on runtime required steps
- typed intervention events with route metadata for persistence and debrief

The engine does not infer arrest solely from rhythm. `pulsePresent` is part of `PatientState`, so pulseless scenarios such as PEA are represented explicitly.

### `src/data/seedScenarios.ts`

This file is the scenario DSL for the app and the canonical source of truth for sequencing and debrief rationale authoring. Each scenario defines:

- initial patient state
- baseline vital progression
- optional scheduled state changes for timed non-numeric transitions
- available interventions, their effects, and authored rationale
- legacy `expected_sequence` where still needed for compatibility
- optional route-aware `protocol` definitions with primary, branch, and rescue routes
- success and failure conditions using explicit comparators and hold durations

Seed data now includes route pilots and rescue or branch cases such as `pregnant_vfib_arrest`, `adult_unstable_bradycardia`, `adult_vtach_pulse`, and `adult_svt`.

Do not maintain duplicate scenario-reference markdown for protocol steps or rationales. When scenario authoring rules change, validate the canonical data directly in `src/data/seedScenarios.test.ts`.

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

`App.tsx` adds `manual_end` when a learner stops the case manually. `intervention` events can also include structured protocol context such as available intervention ids, state-aware available intervention ids, active route id, activated route ids, advanced route id, and required-step deltas. Those persisted event shapes are the source of truth for debrief feedback, scoring, and the review timeline.

## UI Composition

The live simulation UI is split into three tabs:

- `PatientView`: bedside presentation, narrative clues, active interventions, and end-case action
- `ActionsScreen`: searchable intervention catalog and procedure review flow
- `StatusDashboard`: monitor-style telemetry, progress, vital unlocks, and ECG display

Shared live UI is provided by `Header`, `BottomNav`, `HelpPanel`, `WalkthroughEngine`, `ContextualOverlay`, `CorrectActionWidget`, `IncorrectActionWidget`, `ToastProvider`, and `CheatOverlay`. The compact vital strip lives inside `Header`; the old standalone mounted `MiniMonitor` flow is no longer the runtime composition.

## Testing Strategy

- Unit and component tests live under `src/**/*.test.ts(x)` and run through Vitest.
- Browser and layout regression tests live under `tests/**/*.spec.ts` and run through Playwright.
- Build type-checking excludes test files so shipping code and test harnesses can evolve independently.

## Non-Goals

- No production backend or server-side rendering.
- No server database integration.
- No source of truth in `db/schema.sql`; the running app uses Dexie and IndexedDB only.
