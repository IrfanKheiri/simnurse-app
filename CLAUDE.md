# CLAUDE.md — SimNurse

## 1. What It Is

SimNurse is a fully client-side SPA for training nursing students, paramedics, and clinical learners in emergency resuscitation protocols. The learner manages a deteriorating simulated patient, applying interventions in the correct sequence before the patient reaches the failure threshold. After each session, a scored debrief shows what was done vs. what the protocol required.

Three competency levels: BLS (Basic Life Support), ACLS (Advanced Cardiac Life Support), PALS (Pediatric Advanced Life Support). The seeded scenario catalogue in `src/data/seedScenarios.ts` spans beginner bystander AED through advanced obstetric cardiac arrest. `src/data/seedScenarios.ts` is the canonical source of truth for protocol sequencing and rationale authoring; duplicate scenario-reference markdown must not be maintained. Every intervention includes an AHA-cited rationale in the debrief.

No backend. No API calls. Fully offline after first load. All data in IndexedDB (Dexie) and localStorage. Production path: `/simnurse-app/`.

---

## 2. Tech Stack

| Layer | Technology |
|-------|------------|
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
- **Protocol source of truth**: author `expected_sequence`, intervention rationale, and other protocol-sequencing rules only in `src/data/seedScenarios.ts`. Validate source-of-truth invariants directly in `src/data/seedScenarios.test.ts`, and do not create or maintain duplicate scenario-reference markdown.
- **`suppressedProcedures` localStorage key must NOT be cleared on scenario start** (ISSUE-05) — persists the user's ProcedureGuide suppression preferences across scenarios. See the explicit comment in `startScenarioRun()`.
- **WalkthroughEngine spotlight is fully interactive**; backdrop tap does NOT dismiss — only "Skip Tour" button or Escape key.

---

## 5. Configuration Quirks

- **`vite.config.ts`** imports from `vitest/config` NOT `vite` — required for the `test` config key. Do not change this import.
- **`base: '/simnurse-app/'`** — all asset URLs are prefixed with this in production. Change only if deploying from domain root.
- **`tsconfig.app.json`**: `verbatimModuleSyntax: true` requires `import type` for all type-only imports; `erasableSyntaxOnly: true` enforced.
- **`test-setup.ts`**: uses `expect.extend(matchers)` pattern — NOT `import '@testing-library/jest-dom'` directly. Vitest 4 quirk: globals aren't available at module load time. Do not change this pattern.
- **Cheat mode**: activated by a file named `.cheat_mode` served at `${import.meta.env.BASE_URL}.cheat_mode`; app checks via a HEAD request on load. Soft mechanism — no server enforcement. Enables the instructor overlay.

---

## 6. Known Issues & Technical Debt

### Documented Issues (ISSUE-XX)

**ISSUE-02** — `meta` field added in DB v5; pre-v5 scenarios needed backfilling.

**ISSUE-04** — OnboardingTour had a bug where it auto-started on the library screen. Fixed with `scenarioActive` prop guard. WalkthroughEngine has equivalent auto-skip for missing DOM targets.

**ISSUE-05** — See §4 Critical Gotchas. Additionally: ActionsScreen's `initialActionIdToReview` effect unsuppresses the reviewed action specifically.

**ISSUE-08** — `conclusion` field (post-stabilization narrative) added to `Scenario` type; shown in EvaluationSummary on success (P3-A).

**ISSUE-15** — ActionsScreen `disabled` prop shows completion banner and disables actions when scenario ends while on Actions tab (P3-B).

**ISSUE-16** — StatusDashboard passes live `rhythm` and `pulsePresent` to ECGWaveform to prevent stale rhythm display after state changes.

**ISSUE-18** — `PatientDemographics` (`patient` field) added in DB v4; StatusDashboard displays patient name/age/gender when provided.

**ISSUE-20** — MiniMonitor merged into Header (FIX L23). `MiniMonitor.tsx` deleted.

**ISSUE-21** — Stale post-completion ticks are handled by the `status !== 'running'` guard in the reducer; no external cleanup needed.

**ISSUE-23** — In `apply_intervention`, success chance roll is checked before applying `success_state` mutations.

**ISSUE-27** — LibraryScreen shows last 3 run outcomes as coloured dots on scenario cards (P3-G).

### Requirement References (R-XX)

**R-2** — `unlocked` state tracks revealed vitals; passed to PatientView (badge opacity) and StatusDashboard (VitalCard display).

**R-4** — ProcedureGuide and EvaluationSummary clean up the guide on unmount to avoid portal memory leaks.

**R-5** — ProcedureGuide shows static placeholder "See AHA guidelines for illustrated technique" with BookOpen icon.

**R-12** — ECGWaveform `RHYTHM_COLOUR` constants mirror the `vital-rhythm-*` Tailwind tokens. **If you change either, update the other.** Manual sync — no automatic verification.

**R-13** — LibraryScreen search is case-insensitive across title, domain, and difficulty.

**R-14** — MiniMonitor `isCritical()` thresholds: HR ≤ 30, SpO2 < 85, BP systolic < 70.

**R-15** — BottomNav Actions tab shows a numbered red pill badge when `rejectionCount > 0`, capped at "9+". Count resets to 0 when Actions tab is visited.

**R-16** — ActionsScreen action card labels use `line-clamp-2`.

### Known Technical Debt

**CheatOverlay `CHEAT_LABELS` and `INTERVENTION_SHORT_LABELS`** — label maps in `CheatOverlay.tsx` and `App.tsx`. Both are exported; `src/data/seedScenarios.test.ts` asserts completeness against `seedScenarios` at test time.

**ECGWaveform RHYTHM_COLOUR** — see R-12. `RHYTHM_COLOUR` is exported; `src/components/ECGWaveform.test.ts` asserts sync with `tailwind.config.js` at test time.

---

## 7. No Auth

SimNurse has no authentication, accounts, or protected routes — entirely local to the browser.
