# SimNurse App Repository Guide

This document describes the current repository layout and where to make changes.

## Top-Level Layout

```text
simnurse-app/
├── src/            application code
├── tests/          Playwright browser and layout audits
├── docs/           repository documentation
├── public/         static assets served by Vite
├── db/             legacy reference artifacts, not runtime storage
├── dist/           production build output
├── package.json    scripts and dependencies
├── vite.config.ts  Vite and Vitest config
└── playwright.config.ts
```

## `src/`

```text
src/
├── App.tsx
├── main.tsx
├── index.css
├── data/
├── hooks/
├── lib/
├── types/
└── components/
```

### `src/App.tsx`

Primary orchestrator for the app. It:

- starts a scenario run
- generates a per-run session id
- wires `useScenarioEngine` into the UI
- persists engine events into Dexie
- drives library, live scenario, and debrief rendering

### `src/types/scenario.ts`

Source of truth for the scenario DSL and event contracts. Important types include:

- `PatientState`
- `Scenario`
- `Condition`
- `ScheduledStateChange`
- `EngineEvent`
- `SessionLogEvent`

### `src/data/`

- `seedScenarios.ts`: production scenario definitions
- `dummyScenario.ts`: minimal scenario fixture for development and tests

Scenario data now includes explicit `pulsePresent` state, comparator-based conditions, and optional scheduled state changes.

### `src/hooks/`

- `useScenarioEngine.ts`: reducer-based simulation engine and event emitter

This is the main place to debug timing, intervention application, or win/loss logic.

### `src/lib/`

- `db.ts`: Dexie setup for local scenario storage and session logs

The running app uses IndexedDB through Dexie. It does not use the SQL under `db/`.

### `src/components/`

Key UI modules:

- `LibraryScreen.tsx`: scenario picker
- `PatientView.tsx`: bedside scene and narrative cues
- `ActionsScreen.tsx`: searchable action catalog
- `ProcedureGuide.tsx`: step review and confirmation flow
- `StatusDashboard.tsx`: telemetry and vital unlock UI
- `EvaluationSummary.tsx`: debrief screen
- `BottomNav.tsx`, `Header.tsx`, `MiniMonitor.tsx`: shared app chrome
- `IncorrectActionWidget.tsx`: blocked-action feedback
- `OnboardingTour.tsx`: first-run guidance
- `Toast.tsx` and `toast-context.ts`: transient notifications

Component and hook tests live beside their implementation in `src/**/*.test.ts(x)`.

## `tests/`

`tests/layout-audit.spec.ts` contains Playwright layout and screenshot checks across breakpoints and browser/device projects.

Useful scripts:

```bash
npm run test:e2e
npm run test:e2e:chromium
npm run test:e2e:update-snapshots
```

## Runtime Data Flow

1. Dexie seeds scenarios from `src/data/seedScenarios.ts`, the canonical source of truth for protocol sequencing and debrief rationale authoring.
2. The learner selects a scenario in `LibraryScreen`.
3. `App.tsx` starts `useScenarioEngine` with a cloned scenario definition.
4. The engine emits typed lifecycle events.
5. `App.tsx` stores those events in Dexie and updates the visible UI.
6. `EvaluationSummary` rebuilds the run timeline from the stored session logs.

## Where To Change Common Behavior

- Add or edit a scenario: `src/data/seedScenarios.ts`
- Validate canonical scenario authoring invariants: `src/data/seedScenarios.test.ts`
- Change the simulation engine: `src/hooks/useScenarioEngine.ts`
- Change debrief logic: `src/App.tsx` and `src/components/EvaluationSummary.tsx`
- Change persistence behavior: `src/lib/db.ts`
- Update layout or navigation chrome: `src/components/Header.tsx` and `src/components/BottomNav.tsx`

Protocol sequencing and rationale ownership stay in `src/data/seedScenarios.ts`. Do not create or maintain duplicate scenario-reference markdown; tests should assert the canonical scenario data directly.

## Legacy Artifact

`db/schema.sql` is kept only as a legacy reference. It is not used by the current browser application and should not be treated as the persistence source of truth.
