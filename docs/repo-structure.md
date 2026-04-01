# SimNurse App Repository Guide

This document describes the current repository layout and where to make changes.

## Top-Level Layout

```text
simnurse-app/
├── src/                application code
├── tests/              Playwright browser and layout audits
├── docs/               repository documentation
├── plans/              working plans and implementation notes
├── public/             static assets served by Vite
├── db/                 legacy reference artifacts, not runtime storage
├── scripts/            one-off repository utilities
├── package.json        scripts and dependencies
├── vite.config.ts      Vite and Vitest config
└── playwright.config.ts
```

Generated folders such as `playwright-report/` and `test-results/` are outputs, not authoring surfaces.

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
- assembles debrief feedback from current-session logs
- drives library, live scenario, and debrief rendering

### `src/types/scenario.ts`

Source of truth for the scenario DSL and event contracts. Important types include:

- `PatientState`
- `Scenario`
- `ScenarioCompletionPolicy`
- `ScenarioProtocol`, `ScenarioProtocolPrimaryRoute`, `ScenarioProtocolSecondaryRoute`
- `Condition`
- `ScheduledStateChange`
- `InterventionEvent`
- `SessionLogEvent`

`Scenario.expected_sequence` remains the legacy sequencing surface. `Scenario.protocol` is the current route-aware authoring surface for primary, branch, and rescue routes.

### `src/data/`

- `seedScenarios.ts`: production scenario definitions and canonical intervention rationale
- `seedScenarios.test.ts`: canonical scenario invariants and coverage for seeded content
- `helpContent.ts`: help, walkthrough, and inline guidance content

Seed data now includes explicit `pulsePresent` state, comparator-based conditions, optional scheduled state changes, and route-aware protocol pilots such as `adult_unstable_bradycardia`, `adult_svt`, `adult_vtach_pulse`, and `pregnant_vfib_arrest`.

### `src/hooks/`

- `useScenarioEngine.ts`: reducer-based simulation engine and event emitter
- `useHelpSystem.ts`: context-aware help orchestration
- `useInlineHelpPopover.ts`: positioning and visibility for inline help panels

`useScenarioEngine.ts` is the main place to debug timing, route activation, intervention validation, strict completion policy, or outcome logic.

### `src/lib/`

- `db.ts`: Dexie setup for local scenario storage and session logs
- `debriefFeedback.ts`: rejection taxonomy and expected-guidance eligibility
- `debriefScoring.ts`: debrief scoring and omission logic
- `scenarioProgress.ts`: live progress calculation
- `interventionLabels.ts`: human-readable intervention labels
- `urgencyContent.ts`: urgency strip content derivation

The running app uses IndexedDB through Dexie. It does not use the SQL under `db/`.

### `src/components/`

Key UI modules:

- `LibraryScreen.tsx`: scenario picker and preview modal
- `PatientView.tsx`: bedside scene, narrative cues, active interventions, and manual end flow
- `ActionsScreen.tsx`: searchable action catalog and procedure launch point
- `ProcedureGuide.tsx`: step review and confirmation flow
- `StatusDashboard.tsx`: telemetry, progress, and vital unlock UI
- `EvaluationSummary.tsx`: debrief screen and in-place review overlay
- `Header.tsx`, `BottomNav.tsx`: shared app chrome
- `HelpPanel.tsx`, `WalkthroughEngine.tsx`: guided help surfaces
- `CorrectActionWidget.tsx`, `IncorrectActionWidget.tsx`, `ContextualOverlay.tsx`, `CheatOverlay.tsx`: live feedback overlays
- `Toast.tsx` and `toast-context.ts`: transient notifications

The vital strip is rendered inside `Header.tsx`. The runtime app no longer relies on a standalone mounted `MiniMonitor` component.

Component and hook tests live beside their implementation in `src/**/*.test.ts(x)`.

## `tests/`

`tests/layout-audit.spec.ts` contains Playwright layout and screenshot checks across breakpoints and browser or device projects.

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
4. The engine emits typed lifecycle events, including route-aware intervention metadata when protocol sequencing is active.
5. `App.tsx` stores those events in Dexie and updates the visible UI.
6. Debrief feedback is rebuilt from current-session logs. It prefers structured protocol metadata and only falls back to legacy `expected_sequence` replay when older logs do not contain that metadata.
7. Debrief scoring uses runtime `completedRequiredSteps` and `requiredStepCount` for strict incomplete runs.

## Where To Change Common Behavior

- Add or edit a scenario, intervention rationale, or route definition: `src/data/seedScenarios.ts`
- Validate canonical scenario authoring invariants: `src/data/seedScenarios.test.ts`
- Change protocol normalization, route activation, or completion rules: `src/hooks/useScenarioEngine.ts`
- Change debrief feedback classification or expected-step extraction: `src/App.tsx` and `src/lib/debriefFeedback.ts`
- Change debrief scoring or omission handling: `src/lib/debriefScoring.ts`
- Change debrief UI or review overlays: `src/components/EvaluationSummary.tsx`
- Change persistence behavior: `src/lib/db.ts`
- Update layout or navigation chrome: `src/components/Header.tsx` and `src/components/BottomNav.tsx`

Protocol sequencing and rationale ownership stay in `src/data/seedScenarios.ts`. Do not create or maintain duplicate scenario-reference markdown; tests should assert the canonical scenario data directly.

## Legacy Artifact

`db/schema.sql` is kept only as a legacy reference. It is not used by the current browser application and should not be treated as the persistence source of truth.
