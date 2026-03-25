# SimNurse — Implementation Reference

> Loaded when working in `src/`. Root `CLAUDE.md` is also in context — do not duplicate its content.

---

## 1. Architecture

**Three layers** (strictly hierarchical, no cycles):
- **Data layer** — Dexie/IndexedDB (`src/lib/db.ts`) seeded from `src/data/seedScenarios.ts`
- **Engine layer** — `src/hooks/useScenarioEngine.ts`: deterministic reducer + 3s tick interval + event flushing
- **Presentation layer** — React components in `src/components/`; orchestrated by `src/App.tsx`

Data flow: `DSL data → Dexie → App.tsx → engine hook → component tree`. Engine emits events back via callback; App.tsx persists them to Dexie. No circular dependencies.

**View structure** (two booleans in App.tsx: `activeScenario`, `showSummary`):

| View | Condition | Key Components |
|------|-----------|----------------|
| Library | `!activeScenario && !showSummary` | LibraryScreen, HelpPanel, WalkthroughEngine |
| Live Scenario | `activeScenario && !showSummary` | Header, BottomNav, PatientView / ActionsScreen / StatusDashboard |
| Debrief | `showSummary === true` | EvaluationSummary, HelpPanel, WalkthroughEngine |

Views are mutually exclusive. No client-side router. Back button does nothing.

**State tiers:**
- **Engine state** — `useReducer` in `useScenarioEngine.ts`; returns `state`, `status`, `elapsedSec`, `activeInterventions`, `sequenceIndex`, `successHoldStarts`, `failureHoldStarts`
- **App state** — multiple `useState` in `App.tsx`: `activeScenario`, `sessionId`, `activeTab`, `showSummary`, `scenarioOutcome`, `evalActions`, `evalActionsLoading`, `unlocked`, `rejectionCount`, `cheatModeEnabled`, `cheatVisible`, `incorrectActionMessage`, `correctActionMessage`
- **Component-local** — ephemeral UI state per component
- **Persistent** — Dexie/IndexedDB (scenarios + session logs) and localStorage (preferences)

---

## 2. Data Models

All types defined in `src/types/scenario.ts` — read that file as the authoritative source. Below are non-obvious semantics NOT visible in the types alone.

**Critical semantics:**
- `PatientState.bp` is a **STRING** `"120/80"` — parse with `parseBP()` for any numeric comparison (see root CLAUDE.md §4). Note: `parseBP()` is not exported from `useScenarioEngine.ts`. Each call site handles the split locally — follow the pattern in the nearest existing file (`Header.tsx`, `PatientView.tsx`, etc.).
- `ActiveIntervention.start_time` is **elapsed simulation seconds** — NOT wall-clock milliseconds
- `BaselineProgression` vs `RateModifier` — structurally identical; semantic difference: baseline progressions run always; rate modifiers run only while their parent intervention is in `activeInterventions`
- `ScheduledStateChange.id` tracks whether already applied (prevents double-firing); must be unique within a scenario
- `Condition`: fields on `success_conditions` are **conjunctive** (ALL must be true); fields on `failure_conditions` are **disjunctive** (ANY one triggers failure)
- `InterventionDefinition.state_overrides` — display-only; applied to `displayState`, never to `baseState`; never used for condition evaluation

**DB tables** (`src/lib/db.ts`, database name: `SimNurseDB`, current schema: **v5**):
- `scenarios` — primary key `&scenario_id`; secondary index `title`; populated on creation and every version upgrade; dev mode auto-reseeds on `db.on('ready')`
- `sessionLogs` — primary key `++id`; indexes: `session_id`, `scenario_id`, `timestamp`, `event_type`

**Schema versioning** — when adding a new field to `Scenario`:
1. Add to `src/types/scenario.ts`
2. Add to scenarios in `src/data/seedScenarios.ts`
3. Increment version in `src/lib/db.ts` + upgrade callback calling `reseedScenarios()`
4. Dev mode auto-reseeds immediately — no manual IndexedDB clear needed

---

## 3. Clinical Anomalies

Non-obvious protocol rules in `src/data/seedScenarios.ts`. All other scenario details are derivable from that file directly.

- **`bls_infant_cardiac_arrest`** — `call_911` is LAST (AHA 2020 lone-rescuer: CPR before EMS). Do not reorder.
- **`bls_infant_two_rescuer_cpr`** — `call_911` is SECOND (two rescuers allow immediate EMS). Different from lone-rescuer.
- **`bls_drowning_submersion`** — `initial_rescue_breaths_5` comes BEFORE compressions (ventilation-first). Also requires `dry_chest_before_aed` before defibrillation.
- **`bls_infant_choking`** — `abdominal_thrusts_heimlich_5` is a **distractor** with `priority: 1, success_chance: 0.0`. Teaches Heimlich contraindication in infants. Do not fix the 0% success rate.
- **`pregnant_vfib_arrest`** — adds `left_uterine_displacement` (priority 200) and `perimortem_csection` (priority 150, 70% success). Scheduled message at T+300s per AHA/ACOG.
- **`acs_stemi`** — scheduled deterioration to VFib at T+300s if treatment sequence not started. All medications have 100% success chance.
- **Expected sequence arrays** — intervention IDs must exactly match keys in the `interventions` record. Typos silently break sequence evaluation.

---

## 4. Engine, Scoring & Help System

### Engine Reducer (`src/hooks/useScenarioEngine.ts`)

**Tick action** (fires every 3s via `setInterval`):
1. Guard: if `status !== 'running'`, return unchanged (handles stale ticks after terminal state)
2. Advance `elapsedSec += 3`
3. Expire interventions whose `start_time + duration_sec <= elapsedSec`
4. Apply scheduled state changes at or before new elapsed time; emit `StateChangeEvent` for each
5. Apply timed modifiers (baseline progressions + active intervention rate modifiers) with catch-up logic
6. If `!pulsePresent`: force `hr = 0`, `bp = '0/0'`, apply `spo2 -= 3`
7. Clamp vitals: HR [0,300], SpO2 [0,100], RR [0,60], temp [25,45], etco2 [0,80], glucose [0,500]
8. Build `displayState` by applying `state_overrides` from active interventions sorted by priority (highest wins)
9. Check failure conditions against `baseState` (never `displayState`)
10. Check success conditions against `baseState`
11. Return updated state + `eventQueue`

**`apply_intervention` guards** (evaluated in order — order matters):
1. Status guard: `status !== 'running'` → reject
2. Existence guard: ID not in `scenario.interventions` → reject
3. Sequence guard: not at current `sequenceIndex` position → reject with expected action name
4. Rhythm guard: `requires_rhythm` set and current rhythm not in list → reject
5. Duplicate guard (permanent): no `duration_sec` + already in `activeInterventions` → reject
6. Cooldown guard (timed): `duration_sec` set + still running → reject with remaining time

If all guards pass: increment `sequenceIndex`, add to `activeInterventions`, roll `success_chance` (if defined) and apply `success_state` to `baseState`, emit `InterventionEvent`.

**Exponential SpO2 decay**: `resolveDecayModifier()` doubles the modifier when `decayType === 'exponential'` AND current SpO2 < 90.

**E2E freeze**: when `localStorage.simnurse_e2e_freeze_engine === 'true'`, tick dispatch is skipped — enables deterministic E2E tests.

### Scoring (`src/lib/scenarioProgress.ts`)

Called during live scenario (progress bar) and after completion (debrief).

1. Weight assignment: both sequences → 50/50; sequence only → 100/0; conditions only → 0/100
2. Protocol score: `(sequenceIndex / expected_sequence.length) * 100`
3. Outcome score: average of individual condition scores (equality → 0 or 100; range → linear interp toward boundary; duration → % of hold time elapsed)
4. Elapsed bonus: `min(10, floor(elapsed / 10) * 0.5)` — 0.5pts per 10s, capped at 10
5. Total: `min(100, round(rawScore + elapsedBonus))`

**Post-scenario formula** (App.tsx `useMemo`):
```
correctActions   = evalActions.filter(a => a.isCorrect).length
sequenceErrors   = evalActions.filter(a => !a.isCorrect && !a.isDuplicate).length
missedSteps      = outcome === 'failed' ? max(0, expected_sequence.length - correctActions) : 0
score            = correctActions / (correctActions + sequenceErrors + missedSteps) * 100
```
Failed scenarios penalize unexecuted required steps. Manually ended scenarios do not.

### Help System (`src/hooks/useHelpSystem.ts`)

**localStorage keys:**
- `simnurse_completed_walkthroughs` — JSON array of completed tour IDs
- `simnurse_help_feedback` — feedback entries (capped at 200; oldest 50 dropped at limit)
- `simnurse_help_migration_v2` — prevents duplicate migration run
- `simnurse_onboarding_complete` — legacy key (backward compat only)
- `simnurse_welcome_dismissed` — welcome banner dismissal
- `suppressedProcedures` — JSON object of suppressed ProcedureGuide IDs
- `simnurse_inspection_hint_dismissed` — written by StatusDashboard; cleared by `resetAll()`

**Behavioral rules:**
- Opening help panel pauses (does not skip) walkthrough; starting walkthrough closes panel
- Auto-start: 2000ms debounced timer on context change; checks `!wasWalkthroughCompleted`, `!skippedThisSessionRef`, `!panelOpenRef.current` (ref, not stale closure — critical)
- Skip = in-memory only (session); Complete = writes to localStorage (persists across sessions)
- Auto-skip: if `targetId` DOM element not found within 300ms, step auto-advances; on last step with missing target, tour is skipped (not completed)

**Context → walkthrough mapping:** `library` → `library-tour`, `preview_modal` → `preview-tour`, `patient` → `patient-tour`, `actions` → `actions-tour`, `status` → `status-tour`, `debrief` → `debrief-tour`

### Urgency Strip (`App.tsx computeUrgencyItems()`)

- Failure hold pill: show when remaining time ≤ 50% of `durationSec` or ≤ elapsed + 12s (whichever is larger)
- Time-cutoff pill: show when within 25% of `elapsedSecGte` (minimum 120s window)
- Intervention countdown pill: critical if < 10s, medium if < 30s, low otherwise
- Sort: failure pills before intervention pills; within group by remaining time ascending

---

## 5. Data Flow (Condensed)

**Starting a scenario**: Library card → preview modal → "Begin" calls `startScenarioRun()` (`structuredClone` scenario, generate `sessionId`, reset `unlocked`/`rejectionCount`/`activeTab`/`evalActionsLoading`/`incorrectActionMessage`/`showSummary`/`scenarioOutcome`, set `activeScenario`) → engine dispatches `reset` → first tick at T+3s.

**Applying an intervention**: Actions tab → `handleActionClick` → ProcedureGuide modal (unless suppressed in localStorage) → "Confirm" → `applyIntervention(id)` → engine guard sequence → accepted: add to `activeInterventions`, increment `sequenceIndex`, optionally apply `success_state` → emit `InterventionEvent` → App.tsx flushes → show `CorrectActionWidget` or `IncorrectActionWidget`, persist to Dexie.

**3-second tick**: `setInterval` → `dispatch({ type: 'tick' })` → reducer computes new state atomically (§4) → React re-renders Header, PatientView, StatusDashboard, ContextualOverlay → if terminal condition met, `status` transitions and `CompletionEvent` emits.

**Session end → debrief**: `CompletionEvent` → App.tsx sets `scenarioOutcome`, `showSummary = true` → `EvaluationSummary` mounts with `actionsLoading={true}` (spinner in gauge) → effect fetches session logs from Dexie → `buildActionFeedback()` two-pass replay → sets `evalActions`, `evalActionsLoading = false` → score `useMemo` computes → gauge and timeline render.

**Walkthrough lifecycle**: context change → 2s debounce → `startWalkthrough(id)` → WalkthroughEngine renders spotlight → 100ms target rect timeout (waits for DOM after tab switch) → 300ms auto-skip check → user navigates → "Got it" on last step → ID written to localStorage, overlay unmounts.

---

## 6. Conventions & Patterns

### File Naming
- React components: PascalCase (`ActionsScreen.tsx`)
- Non-component TypeScript: camelCase (`useScenarioEngine.ts`, `db.ts`)
- Test files: same name + `.test` suffix (`useScenarioEngine.test.ts`)
- E2E tests: kebab-case + `.spec.ts` (`help-system.spec.ts`)

### TypeScript
- All `import type` for type-only imports (`verbatimModuleSyntax` enforced)
- Discriminated unions preferred over polymorphism
- No `any` — use `unknown` when type is genuinely uncertain
- Non-null assertion `!` only when element presence is guaranteed by component lifecycle

### Styling
- All styling via Tailwind CSS — no CSS modules, no styled-components, no Sass
- Plain CSS only in `src/index.css` (global resets and keyframe animations: `.scrollbar-none`, `.glass-morphism`, `.tab-enter`, `.vital-reveal`, `.shake`)
- `clsx` for conditional classes; wrap in `tailwind-merge` when Tailwind conflicts possible
- Pattern: `twMerge(clsx('base', { 'conditional': isTrue }))`
- Mobile-first, max-width 440px container; body has `pb-24` for bottom nav; all interactive elements `min-height: 44px`

**Custom medical color tokens** (`tailwind.config.js`):
- `medical-500` (#43919e), `medical-950` (#1a2e35) — app chrome
- `vital-hr` (#ff4b4b), `vital-spo2` (#00e5ff), `vital-bp` (#ffca28), `vital-rr` (#4ade80), `vital-temp` (#fb923c)
- `vital-rhythm-sinus` (#10b981), `vital-rhythm-bradycardia` (#34d399), `vital-rhythm-svt` (#f59e0b), `vital-rhythm-vtach` (#f97316), `vital-rhythm-vfib` (#ef4444), `vital-rhythm-asystole` (#6b7280), `vital-rhythm-pea` (#a78bfa)

> **R-12**: `ECGWaveform.tsx` `RHYTHM_COLOUR` constants must match these hex values. Manual sync required — no automatic verification. Update both locations if changing a rhythm colour.

### Dev/Build Configuration
- `server.host: '0.0.0.0'` in `vite.config.ts` — dev server accessible from other LAN devices
- Playwright CI: `retries: 2`, `workers: 1` (serial); local: `retries: 0`, `workers: auto`; `reuseExistingServer: !process.env.CI`
- Visual regression tolerance: 2% pixel ratio, 20% pixel threshold; cross-browser: 5%
- 9 test projects: mobile-320, mobile-375, tablet-768, desktop-1024, desktop-1920 (Chromium), iphone-14-pro-max, ipad-pro, firefox, webkit

### Portal Z-Index Hierarchy
```
z-50      Header (sticky)
z-[100]   ProcedureGuide
z-[200]   HelpPanel
z-[999]   WalkthroughEngine, IncorrectActionWidget, CorrectActionWidget
z-[9999]  CheatOverlay
```
All modals/overlays use `createPortal(content, document.body)`.

### Focus Trap Pattern
Standard implementation across `CorrectActionWidget`, `IncorrectActionWidget`, `ProcedureGuide`:
```typescript
const handleModalKeyDown = (e: React.KeyboardEvent) => {
  const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  if (!focusable?.length) return
  const first = focusable[0], last = focusable[focusable.length - 1]
  if (e.key === 'Tab') {
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }
  if (e.key === 'Escape') onClose()
}
```
Add `onKeyDown={handleModalKeyDown}` and `ref={modalRef}` to the modal root div.

### Reducer Pattern
- Reducer is a pure function — no side effects
- Effects (timers, callbacks) in `useEffect` hooks reacting to state changes
- Events accumulate in `state.eventQueue`; flushed by a separate `useEffect`
- Actions carry all needed data (`tick` carries scenario; `apply_intervention` carries random roll)

### Icons
All icons from `lucide-react` only. Do not add other icon libraries.

---

## 7. Testing Patterns

### Unit Tests (Vitest + @testing-library/react)
- Co-located with source in `src/`
- Use `renderHook` for hook isolation; wrap mutations in `act()`
- Fake timers: `vi.useFakeTimers()` before test; `vi.useRealTimers()` in `afterEach`
- Pre-seed localStorage before rendering to suppress walkthrough auto-start:
  ```typescript
  localStorage.setItem('simnurse_completed_walkthroughs',
    JSON.stringify(['library-tour','patient-tour','actions-tour','status-tour','debrief-tour','preview-tour']))
  ```
- Do NOT `import '@testing-library/jest-dom'` directly — see root CLAUDE.md §5

### E2E Tests (Playwright, `tests/` directory)
- Freeze engine for deterministic tests:
  ```typescript
  await page.addInitScript(() =>
    localStorage.setItem('simnurse_e2e_freeze_engine', 'true'))
  ```
- Suppress walkthroughs via same pre-seed above (in `addInitScript`)
- Wait for IndexedDB seeding: `page.waitForSelector()` with 15s timeout
- Visual baselines: `tests/snapshots/`; update with `npm run test:e2e:update-snapshots`

**E2E sub-commands:**
```bash
npm run test:e2e:ui              # Interactive Playwright UI (best for debugging)
npm run test:e2e:headed          # Visible browser window
npm run test:e2e:report          # Open last HTML report
npm run test:e2e:chromium        # Desktop Chromium 1024px
npm run test:e2e:firefox         # Desktop Firefox 1280px
npm run test:e2e:webkit          # Desktop WebKit/Safari 1280px
npm run test:e2e:mobile          # iPhone 14 Pro Max emulation
npm run test:e2e:ipad            # iPad Pro emulation
npm run test:e2e:breakpoints     # All 5 viewport widths (320–1920px)
```

All 8 test files pass (65 tests). No known pre-existing failures.

---

## 8. Checklists

### Adding a New Scenario
1. Add scenario object to `src/data/seedScenarios.ts` (follow DSL pattern; intervention IDs must be unique within scenario)
2. If new intervention IDs appear in urgency strips or cheat overlay, update `INTERVENTION_SHORT_LABELS` in `App.tsx` and `CHEAT_LABELS` in `CheatOverlay.tsx`
3. Run `npm run dev` — Dexie auto-reseeds in dev
4. If adding new `Scenario` fields: increment Dexie version in `src/lib/db.ts` + upgrade callback

### Adding a New Component
1. Create file in `src/components/` using PascalCase
2. Define all props via TypeScript interface at top of file
3. Use `clsx` + `tailwind-merge` for conditional Tailwind classes
4. Use `lucide-react` for all icons
5. If modal/overlay: `createPortal(content, document.body)` + z-index from hierarchy above
6. If modal: add keyboard focus trap using standard pattern in §6
7. Add JSDoc comments for non-obvious props
8. Write tests in `ComponentName.test.tsx` co-located with component

### Modifying the Scenario Engine
1. Read `src/types/scenario.ts` first
2. New DSL fields go in `src/types/scenario.ts` first
3. If field needs persistence: add to `seedScenarios.ts` + bump Dexie schema version
4. Engine logic changes go in reducer in `useScenarioEngine.ts`
5. Run `npm run test` — 6 unit tests cover core scenarios
6. Scoring changes: `npx vitest run src/lib/scenarioProgress.test.ts`
