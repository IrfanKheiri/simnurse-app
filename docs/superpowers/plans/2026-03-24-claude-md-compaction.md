# CLAUDE.md Compaction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 1,128-line monolithic `CLAUDE.md` with a 2-file hierarchy (`CLAUDE.md` root + `src/CLAUDE.md`) totalling ~600 lines, preserving all non-derivable information.

**Architecture:** Root `CLAUDE.md` loads on every Claude Code message and contains only cross-cutting gotchas, commands, config quirks, and known issues. `src/CLAUDE.md` loads when navigating into `src/` and contains all implementation detail. Both files load together when working in `src/` — no content is duplicated between them.

**Tech Stack:** Markdown only. No code changes. Verify with `npm run build` at the end to confirm no regressions.

**Spec:** `docs/superpowers/specs/2026-03-24-claude-md-compaction-design.md`

---

### Task 1: Overwrite root `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Write the new root CLAUDE.md**

Write the following content to `CLAUDE.md` (complete replacement):

```markdown
# CLAUDE.md — SimNurse

## 1. What It Is

SimNurse is a fully client-side SPA for training nursing students, paramedics, and clinical learners in emergency resuscitation protocols. The learner manages a deteriorating simulated patient, applying interventions in the correct sequence before the patient reaches the failure threshold. After each session, a scored debrief shows what was done vs. what the protocol required.

Three competency levels: BLS (Basic Life Support), ACLS (Advanced Cardiac Life Support), PALS (Pediatric Advanced Life Support). 26 scenarios from beginner bystander AED to advanced obstetric cardiac arrest. Every intervention includes an AHA-cited rationale in the debrief.

No backend. No API calls. Fully offline after first load. All data in IndexedDB (Dexie) and localStorage. Production path: `/simnurse-app/`.

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| UI framework | React 19 |
| Language | TypeScript ~5.9 (strict) |
| Build tool | Vite 7 |
| DB / persistence | Dexie 4 (IndexedDB ORM) |
| Unit tests | Vitest 4 + @testing-library/react |
| E2E tests | Playwright 1.58 |
| Styling | Tailwind CSS 3 |
| Icons | lucide-react |

See `package.json` for full version list.

---

## 3. Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server at http://localhost:5173
npm run build        # TypeScript check + Vite production bundle → dist/
npm run test         # Unit tests (one-time pass)
npm run test:e2e     # E2E tests, headless, all 9 projects
npm run lint         # ESLint on all source files
npm run preview      # Preview production build locally
```

---

## 4. Critical Gotchas

Non-obvious facts that cause bugs before you've read the source:

- **`bp` is a STRING `"120/80"`** — never two numbers. Always parse with `parseBP()` for numeric operations. Most common source of confusion in the codebase.
- **Two-state design**: the engine holds `baseState` (used for win/loss evaluation) and `displayState` (rendered). Visual overrides from active interventions apply to `displayState` only — never conflate them, or visual overrides will falsely trigger success/failure conditions.
- **Infant lone-rescuer CPR**: `call_911` is LAST in expected sequence (AHA 2020 — CPR before EMS activation for lone rescuers). Two-rescuer: `call_911` is SECOND. Do not reorder these.
- **Drowning protocol**: ventilation-first — `initial_rescue_breaths_5` (5 breaths) BEFORE compressions. Opposite of standard cardiac arrest sequence.
- **Heimlich is a DISTRACTOR** in `bls_infant_choking` (`success_chance: 0.0`) — teaches that Heimlich is contraindicated in infants. Do not "fix" the 0% success rate.
- **`suppressedProcedures` localStorage key must NOT be cleared on scenario start** (ISSUE-05) — persists the user's ProcedureGuide suppression preferences across scenarios. See the explicit comment in `startScenarioRun()`.
- **WalkthroughEngine spotlight is fully interactive**; backdrop tap does NOT dismiss — only "Skip Tour" button or Escape key.

---

## 5. Configuration Quirks

- **`vite.config.ts`** imports from `vitest/config` NOT `vite` — required for the `test` config key. Do not change this import.
- **`base: '/simnurse-app/'`** — all asset URLs are prefixed with this in production. Change only if deploying from domain root.
- **`tsconfig.app.json`**: `verbatimModuleSyntax: true` requires `import type` for all type-only imports; `erasableSyntaxOnly: true` enforced.
- **`test-setup.ts`**: uses `expect.extend(matchers)` pattern — NOT `import '@testing-library/jest-dom'` directly. Vitest 4 quirk: globals aren't available at module load time. Do not change this pattern.
- **Cheat mode**: activated by a file named `.cheat_mode` served at `${BASE_URL}.cheat_mode`; app checks via a HEAD request on load. Soft mechanism — no server enforcement. Enables the instructor overlay.

---

## 6. Known Issues & Technical Debt

### Documented Issues (ISSUE-XX)

**ISSUE-02** — `meta` field added in DB v5; pre-v5 scenarios needed backfilling.

**ISSUE-04** — OnboardingTour had a bug where it auto-started on the library screen. Fixed with `scenarioActive` prop guard. WalkthroughEngine has equivalent auto-skip for missing DOM targets.

**ISSUE-05** — `suppressedProcedures` localStorage key must NOT be cleared on scenario start. ActionsScreen's `initialActionIdToReview` effect unsuppresses the reviewed action specifically.

**ISSUE-08** — `conclusion` field (post-stabilization narrative) added to `Scenario` type; shown in EvaluationSummary on success (P3-A).

**ISSUE-15** — ActionsScreen `disabled` prop shows completion banner and disables actions when scenario ends while on Actions tab (P3-B).

**ISSUE-16** — StatusDashboard passes live `rhythm` and `pulsePresent` to ECGWaveform to prevent stale rhythm display after state changes.

**ISSUE-18** — `PatientDemographics` (`patient` field) added in DB v4; StatusDashboard displays patient name/age/gender when provided.

**ISSUE-20** — MiniMonitor merged into Header (FIX L23). `MiniMonitor.tsx` still exists but is not rendered.

**ISSUE-21** — Stale ticks can fire after status transition if React cleanup is delayed. The `status !== 'running'` guard at the top of the tick reducer case is authoritative.

**ISSUE-22** — `buildDisplayState` uses `baseState` for condition evaluation. Explicitly prevents visual overrides from triggering success conditions.

**ISSUE-23** — In `apply_intervention`, success chance roll is checked before applying `success_state` mutations.

**ISSUE-27** — LibraryScreen shows last 3 run outcomes as coloured dots on scenario cards (P3-G).

### Requirement References (R-XX)

**R-2** — `unlocked` state tracks revealed vitals; passed to PatientView (badge opacity) and StatusDashboard (VitalCard display).

**R-4** — ProcedureGuide and EvaluationSummary clean up the guide on unmount to avoid portal memory leaks.

**R-5** — ProcedureGuide shows static placeholder "See AHA guidelines for illustrated technique" with BookOpen icon.

**R-12** — ECGWaveform `RHYTHM_COLOUR` constants mirror the `vital-rhythm-*` Tailwind tokens. **If you change either, update the other.** Manual sync — no automatic verification.

**R-13** — LibraryScreen search is case-insensitive across title, domain, and difficulty.

**R-14** — MiniMonitor `isCritical()` thresholds: HR ≤ 30 or = 0, SpO2 < 85, BP systolic < 70.

**R-15** — BottomNav Actions tab shows a numbered red pill badge when `rejectionCount > 0`, capped at "9+". Count resets to 0 when Actions tab is visited.

**R-16** — ActionsScreen action card labels use `line-clamp-2`.

### Known Technical Debt

**CheatOverlay `CHEAT_LABELS`** — manually maintained map of intervention ID → short label. Must be updated when intervention IDs are added or renamed in `seedScenarios.ts`. No compile-time verification.

**OnboardingTour.tsx is superseded** — `WalkthroughEngine.tsx` is current. New development uses WalkthroughEngine.

**Score thresholds duplicated** — 95%/88%/80%/60% tiers appear in `helpContent.ts` (tip body) AND `EvaluationSummary.tsx` (ScoreGauge). Update both if thresholds change.

**ECGWaveform RHYTHM_COLOUR duplicated** — hex strings must match `vital-rhythm-*` tokens in `tailwind.config.js`. No automatic synchronisation. (See R-12.)

**`tmp_audit_actions.ts` and `tmp_screenshot_audit.py`** — temporary scripts in project root; not part of build or tests. Review for removal.

**Stale test mocks (3 files)** — pre-existing failures, not regressions:
1. `LibraryScreen.test.tsx` — mock needs a `sessionLogs` table entry
2. `ActionsScreen.test.tsx` — tests need `activeInterventions={[]}` and `elapsedSec={0}` props
3. `StatusDashboard.test.tsx` — `getByText(/Quick Inspection/i)` needs `getByRole('button', { name: /Quick Inspection/i })`

**Elapsed time bonus edge case** — when a scenario has only outcome conditions, elapsed bonus may not apply. Unit test expects 50%, not 53%. Test is authoritative.

**`INTERVENTION_SHORT_LABELS`** — urgency strip label map in `App.tsx`; manually maintained like `CHEAT_LABELS`.

---

## 7. No Auth

SimNurse has no authentication, accounts, or protected routes — entirely local to the browser.
```

- [ ] **Step 2: Verify root CLAUDE.md line count**

Run:
```bash
wc -l CLAUDE.md
```
Expected: ≤ 200 lines

- [ ] **Step 3: Commit root CLAUDE.md**

```bash
git add CLAUDE.md
git commit -m "docs: compact root CLAUDE.md to ~150 lines (remove derivable content)"
```

---

### Task 2: Create `src/CLAUDE.md`

**Files:**
- Create: `src/CLAUDE.md`

- [ ] **Step 1: Create src/CLAUDE.md**

Write the following content to `src/CLAUDE.md` (new file):

````markdown
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
- `PatientState.bp` is a **STRING** `"120/80"` — parse with `parseBP()` for any numeric comparison (see root CLAUDE.md §4)
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
- **`adult_pea_hypoxia`** — treatment is oxygenation (rescue_breathing 45%, intubation 90%), NOT defibrillation.
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

**Starting a scenario**: Library card → preview modal → "Begin" calls `startScenarioRun()` (`structuredClone` scenario, generate `sessionId`, reset `unlocked`/`rejectionCount`/`activeTab`, set `activeScenario`) → engine dispatches `reset` → first tick at T+3s.

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

### Stale Mock Fixes Needed (pre-existing, not regressions)
1. **`LibraryScreen.test.tsx`** — add `sessionLogs` table entry to Dexie mock
2. **`ActionsScreen.test.tsx`** — add `activeInterventions={[]}` and `elapsedSec={0}` props to render calls
3. **`StatusDashboard.test.tsx`** — change `getByText(/Quick Inspection/i)` to `getByRole('button', { name: /Quick Inspection/i })`

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
````

- [ ] **Step 2: Verify src/CLAUDE.md line count**

Run:
```bash
wc -l src/CLAUDE.md
```
Expected: ≤ 500 lines

- [ ] **Step 3: Commit src/CLAUDE.md**

```bash
git add src/CLAUDE.md
git commit -m "docs: create src/CLAUDE.md with implementation detail (engine, scoring, conventions, testing)"
```

---

### Task 3: Verify and finalise

**Files:**
- No file changes — verification only

- [ ] **Step 1: Run build to confirm no regressions**

Run:
```bash
npm run build
```
Expected: build completes successfully (TypeScript check passes + Vite bundle succeeds). Pre-existing chunk size warning is acceptable.

- [ ] **Step 2: Spot-check key content is present**

Verify the following are findable in the two files:

```bash
# Critical gotchas in root
grep -n "parseBP" CLAUDE.md
grep -n "baseState" CLAUDE.md
grep -n "call_911" CLAUDE.md
grep -n "ventilation-first" CLAUDE.md
grep -n "suppressedProcedures" CLAUDE.md
grep -n "cheat_mode" CLAUDE.md

# Implementation detail in src/
grep -n "RHYTHM_COLOUR" src/CLAUDE.md
grep -n "panelOpenRef" src/CLAUDE.md
grep -n "sequenceIndex" src/CLAUDE.md
grep -n "evalActionsLoading" src/CLAUDE.md
```
Expected: all 10 patterns return at least one match.

- [ ] **Step 3: Verify combined line count**

Run:
```bash
wc -l CLAUDE.md src/CLAUDE.md
```
Expected: root ≤ 200 lines, `src/CLAUDE.md` ≤ 500 lines, combined ≤ 700 lines (vs original 1,128).

- [ ] **Step 4: Final commit**

```bash
git add CLAUDE.md src/CLAUDE.md
git status
```
If both files show clean (no staged changes — they were committed in Tasks 1 and 2), no additional commit needed. If any uncommitted changes remain, commit them:
```bash
git commit -m "docs: finalise CLAUDE.md hierarchy compaction"
```
