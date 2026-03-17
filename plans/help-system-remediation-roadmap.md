# Help System — Remediation Roadmap

> **Source:** End-to-end usability evaluation (2026-03-17)
> **Code-verified:** All DOM target IDs and component implementations checked against live source
> **Scope:** 9 active recommendations (R-01, R-02, R-04 through R-10 + 3 new DOM ID fixes) across 4 waves
> **R-03 status:** ~~Withdrawn~~ — rejection badge confirmed implemented in [`BottomNav.tsx:56–61`](../src/components/BottomNav.tsx)

---

## Review History (Corrections Applied)

| # | Issue | Resolution |
|---|---|---|
| P1 | `WalkthroughEngine.tsx` row in File Change Index mixed Wave 1 + Wave 2 changes | Split into per-wave rows |
| P2 | PRE engine freeze guard listed as required work | **Closed** — `simnurse_e2e_freeze_engine` already implemented at [`useScenarioEngine.ts:714`](../src/hooks/useScenarioEngine.ts:714) |
| P3 | R-05 `confirmBtn` selector too broad | Tightened to `#end-scenario-confirm-btn` + fallback `"End & Debrief"` |
| P4 | R-08 code block used `text-slate-300` (1.6:1); recommendation said `text-slate-400` | Code block corrected to `text-slate-400`; enabled raised to `text-slate-600` |
| P5 | R-07 label said "Open / close" but implementation only opened | Implementation upgraded to toggle; label now accurate |
| P6 | No documentation of skip-notice vs auto-start banner co-occurrence | Comment added to R-01 Change 2 |
| **N-A** | **R-03 withdrawn — rejection badge IS implemented** | [`BottomNav.tsx:56`](../src/components/BottomNav.tsx) `rejectionCount` badge exists and is wired through [`App.tsx:412`](../src/App.tsx) |
| **N-B** | **`preview_modal` tour: 3 of 4 step targets missing DOM IDs** | Add IDs to `ScenarioPreviewModal` in `LibraryScreen.tsx`; no `helpContent.ts` targetId change needed |
| **N-C** | **`status-step-3` targets `#ecg-waveform` — wrapper has no `id`** | Add `id="ecg-waveform"` to `ECGWaveform.tsx` wrapper div |
| **N-D** | **`status-step-2` targets `#vitals-unlock-row` — element does not exist** | Change targetId in `helpContent.ts` to `vitals-container` (already present) |

---

## Overview

```
Wave 1 — P1 Critical (no external dependencies)
  R-01   helpContent.ts               — stable library-step-1 target
  N-B    LibraryScreen.tsx            — add IDs to ScenarioPreviewModal sections
  N-C    ECGWaveform.tsx              — add id="ecg-waveform" to wrapper
  N-D    helpContent.ts               — fix status-step-2 targetId
  R-01   WalkthroughEngine.tsx        — skippedCount state + skip notice
  R-02   HelpFeedback.tsx             — auto-submit countdown UX

Wave 2 — P2 High (light coupling)
  R-04   WalkthroughEngine.tsx + App.tsx   — guard redundant setActiveTab calls
  R-08   WalkthroughEngine.tsx             — Prev button contrast + aria-disabled
  R-05   PatientView.tsx                   — add id to confirm button
  R-05   tests/help-system.spec.ts         — un-skip debrief Playwright test

Wave 3 — P3 Medium (structural additions)
  R-06   helpContent.ts + HelpPanel.tsx    — context-specific tips
  R-07   useHelpSystem.ts + HelpPanel.tsx  — implement ?/H keyboard toggle
  R-09   WalkthroughEngine.tsx             — suppress repeated amber banner

Wave 4 — P4 Low (additive, no regression risk)
  R-10   HelpPanel.tsx                     — tip accordion inline filter
```

---

## Wave 1 — P1 Critical

### R-01 + N-D — Stable Tour Targets

#### R-01 Change 1 — `src/data/helpContent.ts`

`library-step-1` targets `#welcome-banner`, which is absent after the user dismisses the banner. Replace with the always-present `#scenario-list`:

```ts
// BEFORE
{
  id: 'library-step-1',
  targetId: 'welcome-banner',
  title: 'Welcome to SimNurse',
  content: 'This app simulates real clinical emergencies. Each scenario has a time-limited patient who needs your interventions.',
  position: 'bottom',
},

// AFTER
{
  id: 'library-step-1',
  targetId: 'scenario-list',
  title: 'Welcome to SimNurse',
  content: 'This app simulates real clinical emergencies. Each card in this list represents a clinical case. Tap any card to preview the patient before starting.',
  position: 'top',
},
```

#### N-D Change — `src/data/helpContent.ts`

`status-step-2` targets `#vitals-unlock-row` which does not exist. Change to `vitals-container` which is present at [`StatusDashboard.tsx:127`](../src/components/StatusDashboard.tsx):

```ts
// BEFORE
{
  id: 'status-step-2',
  targetId: 'vitals-unlock-row',
  title: 'Unlocking Vitals',
  ...
},

// AFTER
{
  id: 'status-step-2',
  targetId: 'vitals-container',
  title: 'Unlocking Vitals',
  content: "Tap 'Unlock' next to a vital to perform the relevant assessment. Tap 'Quick Inspection' in the header to unlock all vitals at once.",
  ...
},
```

---

### N-B — Add Missing IDs to `ScenarioPreviewModal` in `src/components/LibraryScreen.tsx`

Three of the four `preview_modal` tour steps target IDs that do not exist in the `ScenarioPreviewModal` JSX. Without these IDs, steps 1–3 will be silently auto-skipped, leaving only "Begin the Case" visible.

**Verified missing:** `preview-modal-header`, `preview-vitals-grid`, `preview-meta-badges`
**Verified present:** `begin-scenario-btn` ✅

Add `id` attributes to the three sections inside `ScenarioPreviewModal`:

```tsx
// 1. Header band div (line ~58) — add id:
<div id="preview-modal-header" className="relative bg-gradient-to-br from-slate-800 to-slate-900 px-6 pt-6 pb-5 text-white">

// 2. Meta badges div (line ~97) — add id:
{meta && (
  <div id="preview-meta-badges" className="flex flex-wrap items-center gap-2 mb-5">

// 3. Initial vitals grid div (line ~128) — add id:
<div id="preview-vitals-grid" className="grid grid-cols-2 gap-2">
```

---

### N-C — Add `id="ecg-waveform"` to `ECGWaveform.tsx`

`status-step-3` targets `#ecg-waveform`. The canvas element at [`ECGWaveform.tsx:224`](../src/components/ECGWaveform.tsx) has `role="img"` and `aria-label` but no `id`. The wrapper `<div>` also has no `id`. Add it to the outer wrapper:

```tsx
// BEFORE (line ~222–223)
return (
  <div className="w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-lg mb-6">

// AFTER
return (
  <div id="ecg-waveform" className="w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-lg mb-6">
```

---

### R-01 Change 2 — `src/components/WalkthroughEngine.tsx` (skippedCount)

When a step is auto-skipped (target not found), surface a visible inline notice at the next rendered step.

> **Co-occurrence note:** The amber auto-start banner renders only at `walkthroughStepIndex === 0` (and only on first visit — gated by R-09). The `skippedCount` notice renders at the first successfully-found target step. Since auto-skip advances the index before any step renders, both notices cannot appear in the same tooltip simultaneously. Do not add extra guards — co-occurrence is structurally impossible.

Add `skippedCount` state at the top of the component body:

```tsx
const [skippedCount, setSkippedCount] = useState(0);
```

In the missing-target auto-skip `useEffect` (line ~80), increment `skippedCount`:

```tsx
if (el === null) {
  setSkippedCount(prev => prev + 1);  // ← ADD
  if (isLastStep) {
    helpSystem.skipWalkthrough();
  } else {
    helpSystem.nextStep();
  }
}
```

Reset `skippedCount` to 0 when a step successfully finds its target — inside the tab-switch/target-rect resolution `useEffect`, after `setTargetRect(element.getBoundingClientRect())`:

```tsx
setSkippedCount(0);  // ← ADD after setTargetRect
```

In the tooltip JSX, between step content and navigation row:

```tsx
{skippedCount > 0 && (
  <div className="mb-3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
    <p className="text-[10px] text-slate-500 leading-snug">
      ↩ Skipped {skippedCount} step{skippedCount > 1 ? 's' : ''} — content not visible right now.
    </p>
  </div>
)}
```

---

### R-02 — Auto-Submit Countdown UX — Full `src/components/HelpFeedback.tsx` replacement

**Problem:** The 4-second auto-submit timer fires silently. Users who pause ≥4 seconds while composing a comment have feedback submitted without notice.

**Pattern:** "Undoable action" — show a shrinking progress bar, provide a Cancel button, auto-submit after delay.

```tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

interface HelpFeedbackProps {
  tipId: string;
  onSubmitFeedback: (topicId: string, rating: 'up' | 'down', comment?: string) => void;
}

type FeedbackState = 'idle' | 'rated' | 'submitted';

const AUTO_SUBMIT_MS = 4000;

const HelpFeedback: React.FC<HelpFeedbackProps> = ({ tipId, onSubmitFeedback }) => {
  const [state, setState] = useState<FeedbackState>('idle');
  const [rating, setRating] = useState<'up' | 'down' | null>(null);
  const [comment, setComment] = useState('');
  const [timerProgress, setTimerProgress] = useState(100);

  const timerStartRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const autoSubmitRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (autoSubmitRef.current !== null) { clearTimeout(autoSubmitRef.current); autoSubmitRef.current = null; }
    timerStartRef.current = null;
  }, []);

  const startTimer = useCallback(() => {
    clearTimers();
    setTimerProgress(100);
    timerStartRef.current = performance.now();

    // rAF-driven progress bar — transition-none on the bar is intentional:
    // CSS transition-width lags behind rAF updates and causes jitter at 60fps.
    const tick = (now: number) => {
      if (timerStartRef.current === null) return;
      const elapsed = now - timerStartRef.current;
      const remaining = Math.max(0, 100 - (elapsed / AUTO_SUBMIT_MS) * 100);
      setTimerProgress(remaining);
      if (elapsed < AUTO_SUBMIT_MS) { rafRef.current = requestAnimationFrame(tick); }
    };
    rafRef.current = requestAnimationFrame(tick);

    autoSubmitRef.current = setTimeout(() => {
      if (rating !== null) onSubmitFeedback(tipId, rating, undefined);
      setState('submitted');
    }, AUTO_SUBMIT_MS);
  }, [clearTimers, rating, tipId, onSubmitFeedback]);

  useEffect(() => {
    if (state === 'rated' && rating !== null) startTimer();
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, rating]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const handleRate = (chosen: 'up' | 'down') => {
    setRating(chosen);
    setComment('');
    setState('rated');
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComment(e.target.value);
    if (state === 'rated') startTimer();
  };

  const handleSubmit = () => {
    clearTimers();
    if (rating !== null) onSubmitFeedback(tipId, rating, comment.trim() || undefined);
    setState('submitted');
  };

  const handleCancel = () => {
    clearTimers();
    setTimerProgress(100);
    // Stay in rated state with timer paused — user can still manually submit
  };

  if (state === 'submitted') {
    return <p className="text-[10px] text-slate-400 mt-2">Thanks for your feedback! ✓</p>;
  }

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate-400">Was this helpful?</span>
        <button type="button" onClick={() => handleRate('up')} aria-label="Thumbs up"
          className={state === 'rated' && rating === 'up' ? 'text-emerald-500' : 'text-slate-400 hover:text-slate-600'}>
          <ThumbsUp size={14} />
        </button>
        <button type="button" onClick={() => handleRate('down')} aria-label="Thumbs down"
          className={state === 'rated' && rating === 'down' ? 'text-red-400' : 'text-slate-400 hover:text-slate-600'}>
          <ThumbsDown size={14} />
        </button>
        {state === 'rated' && (
          <button type="button" onClick={handleCancel}
            className="ml-auto text-[10px] text-slate-400 hover:text-slate-600 transition-colors">
            Cancel
          </button>
        )}
      </div>

      {/* Shrinking progress bar — rAF driven, transition-none intentional */}
      {state === 'rated' && (
        <div className="mt-1.5 h-0.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-amber-400 rounded-full transition-none" style={{ width: `${timerProgress}%` }} />
        </div>
      )}

      {state === 'rated' && (
        <div className="mt-2">
          <textarea value={comment} onChange={handleCommentChange}
            placeholder="Tell us more (optional) — submitting automatically…"
            maxLength={280} rows={3}
            className="w-full text-xs text-slate-600 placeholder-slate-400 border border-slate-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-medical-400"
          />
          <button type="button" onClick={handleSubmit}
            className="mt-1 bg-medical-500 text-white text-xs px-3 py-1 rounded-lg hover:bg-medical-600 transition-colors">
            Submit now
          </button>
        </div>
      )}
    </div>
  );
};

export default HelpFeedback;
```

> **Design notes:** "Submit now" disambiguates from auto-submit. Placeholder sets expectation inline. `handleCancel` stays in `rated` state (preserves rating selection). `transition-none` on bar prevents CSS lag vs rAF.

---

## Wave 2 — P2 High

### R-04 — Guard Redundant `setActiveTab()` in WalkthroughEngine

Every step in the actions and status tours has a `tab` field. `WalkthroughEngine` unconditionally calls `setActiveTab` on each step advance — even when already on the correct tab. This adds ~250ms latency per step.

#### Change 1 — `src/components/WalkthroughEngine.tsx`

Add `activeTab: string` to props:

```tsx
interface WalkthroughEngineProps {
    helpSystem: HelpSystemState & HelpSystemActions;
    setActiveTab: (tab: string) => void;
    activeTab: string;   // ← NEW
}
```

Guard the `setActiveTab` call:

```tsx
// BEFORE
if (currentStep.tab) {
    setActiveTab(currentStep.tab);
}

// AFTER
if (currentStep.tab && currentStep.tab !== activeTab) {
    setActiveTab(currentStep.tab);
}
```

#### Change 2 — `src/App.tsx`

```tsx
// BEFORE
<WalkthroughEngine helpSystem={helpSystem} setActiveTab={setActiveTab} />

// AFTER
<WalkthroughEngine helpSystem={helpSystem} setActiveTab={setActiveTab} activeTab={activeTab} />
```

---

### R-08 — Fix Disabled `Prev` Button Contrast + `aria-disabled`

**Change — `src/components/WalkthroughEngine.tsx`**

```tsx
// BEFORE
walkthroughStepIndex === 0
  ? 'border-slate-100 text-slate-200 cursor-not-allowed'
  : 'border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700 active:scale-95',

// AFTER — text-slate-400 (~2.6:1) for disabled; text-slate-600 for enabled
walkthroughStepIndex === 0
  ? 'border-slate-200 text-slate-400 cursor-not-allowed'
  : 'border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-800 active:scale-95',
```

Add `aria-disabled`:

```tsx
<button
    type="button"
    onClick={prevStep}
    disabled={walkthroughStepIndex === 0}
    aria-disabled={walkthroughStepIndex === 0}
    title="Previous step"
    className={cn(...)}
>
```

> If strict WCAG 3:1 non-text contrast is required, define a custom disabled token at approximately #9ca3af in `tailwind.config.js`.

---

### R-05 — Un-Skip Debrief Playwright Test

#### Change 1 — `src/components/PatientView.tsx`

Add `id="end-scenario-confirm-btn"` to the destructive confirm button in `EndConfirmDialog` (line ~139):

```tsx
// BEFORE
<button
    type="button"
    onClick={onConfirm}
    className="flex-[2] py-3 rounded-2xl text-sm font-bold text-white bg-red-500 ...">
  End &amp; Debrief
</button>

// AFTER
<button
    id="end-scenario-confirm-btn"
    type="button"
    onClick={onConfirm}
    className="flex-[2] py-3 rounded-2xl text-sm font-bold text-white bg-red-500 ...">
  End &amp; Debrief
</button>
```

#### Change 2 — `tests/help-system.spec.ts`

Add `reachDebrief` helper and replace `test.skip`:

```ts
/**
 * Navigate to the debrief screen by starting any scenario and immediately ending it manually.
 * simnurse_e2e_freeze_engine is already handled by useScenarioEngine.ts — no engine change needed.
 */
async function reachDebrief(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'simnurse_completed_walkthroughs',
      JSON.stringify(['library-tour', 'preview-tour', 'patient-tour', 'actions-tour', 'status-tour'])
    );
    window.localStorage.setItem('simnurse_e2e_freeze_engine', 'true');
  });
  await page.goto('/');
  await page.waitForSelector('[id^="scenario-btn-"]', { state: 'visible', timeout: 15_000 });

  // Open preview modal
  await page.locator('[id^="scenario-btn-"]').first().click();
  await page.waitForSelector('#begin-scenario-btn', { state: 'visible', timeout: 5_000 });
  await page.click('#begin-scenario-btn');

  // End scenario immediately
  await page.waitForSelector('#finish-case-btn', { state: 'visible', timeout: 5_000 });
  await page.click('#finish-case-btn');

  // Confirm — prefer stable id, fall back to button text
  const confirmBtn = page
    .locator('#end-scenario-confirm-btn')
    .or(page.getByRole('button', { name: /end.*debrief|end & debrief/i }).first());
  await confirmBtn.click();

  await page.waitForSelector('#score-gauge', { state: 'visible', timeout: 10_000 });
}

test('debrief ? button opens HelpPanel', async ({ page }) => {
  await reachDebrief(page);

  const helpBtn = page
    .locator('#help-btn')
    .or(page.getByRole('button', { name: /help/i }).first());

  await expect(helpBtn).toBeVisible({ timeout: 5_000 });
  await helpBtn.click();

  await expect(
    page.locator('text=Debrief Help').or(page.locator('text=Debrief'))
  ).toBeVisible({ timeout: 5_000 });
});
```

---

## Wave 3 — P3 Medium

### R-06 — Context-Specific Quick Tips

**Problem:** All 6 contexts use `GLOBAL_QUICK_TIPS` uniformly. Library and preview contexts display scenario-engine tips (timing, sequence, scores) that have no referent before a scenario starts.

#### Change 1 — `src/data/helpContent.ts`

Add `contextTips` to the `ContextHelpContent` interface:

```ts
export interface ContextHelpContent {
  context: AppContext;
  walkthroughId: string;
  walkthroughTitle: string;
  steps: WalkthroughStep[];
  contextTips: HelpTip[];    // ← NEW — context-specific, shown first
  quickTips: HelpTip[];      // global tips — shown second, collapsed by default
}
```

Add `contextTips` arrays to each context entry. Authored content below:

**`library`:**
```ts
contextTips: [
  {
    id: 'library-ctx-1',
    heading: 'Reading Scenario Cards',
    body: 'Each card shows: difficulty (green = Beginner, amber = Intermediate, red = Advanced), clinical domain, and estimated duration. Tap any card to preview the full patient and initial vitals before committing to a run.',
  },
  {
    id: 'library-ctx-2',
    heading: 'Using Difficulty Filters',
    body: 'Start with Beginner scenarios to learn the sequence-confirmation mechanic. Move to Intermediate only after achieving ≥80% Competent on at least 3 Beginner cases.',
  },
  {
    id: 'library-ctx-3',
    heading: 'Session History Dots',
    body: 'Under each scenario card, coloured dots show your last 3 runs: 🟢 = success, 🔴 = failed. Hover or long-press a dot to see the run outcome.',
  },
],
```

**`preview_modal`:**
```ts
contextTips: [
  {
    id: 'preview-ctx-1',
    heading: 'What to Look At Before Starting',
    body: 'Check the presenting rhythm and initial vitals. Critically abnormal values (e.g. HR = 0, SpO₂ = 72%) mean your first intervention must happen quickly. Note difficulty and duration — Advanced cases may have a hard time cutoff.',
  },
  {
    id: 'preview-ctx-2',
    heading: 'Pulseless vs Unstable',
    body: 'Scenarios marked "Pulseless" (VFib, PEA, Asystole) require immediate BLS/ACLS — CPR is almost always the first correct step. "Unstable" scenarios (SVT, Bradycardia) allow more deliberation before intervening.',
  },
],
```

**`patient`:**
```ts
contextTips: [
  {
    id: 'patient-ctx-1',
    heading: 'What the Illustration Shows',
    body: 'The patient illustration reflects physiological state: cyanotic tinge = low SpO₂, pallor = poor perfusion. SpO₂ and Rhythm badges show live values once vitals are unlocked via the Actions tab.',
  },
  {
    id: 'patient-ctx-2',
    heading: 'Clinical Narrative Updates',
    body: "The narrative text updates with each state change. Watch for changes in consciousness (e.g. 'becomes unresponsive'), breathing pattern, and skin colour — these are cues to escalate your response.",
  },
  {
    id: 'patient-ctx-3',
    heading: 'Ending the Case',
    body: "Tap the red End button to stop the scenario and view your debrief. The scenario also ends automatically on success or failure. Your session log is preserved either way.",
  },
],
```

**`actions`:**
```ts
contextTips: [
  {
    id: 'actions-ctx-1',
    heading: 'How to Apply an Action',
    body: "Tap any action card to open its Procedure Guide — a step-by-step checklist. Read the steps, then tap 'Confirm Action' to apply it. The engine evaluates whether the action is correct for the current sequence position.",
  },
  {
    id: 'actions-ctx-2',
    heading: 'Why Actions Get Rejected',
    body: 'Actions are rejected for two reasons: (1) Out-of-sequence — valid but not the next expected step. (2) Clinically inappropriate — no effect at the current patient state. The rejection modal tells you the correct next step.',
  },
  {
    id: 'actions-ctx-3',
    heading: 'Rejection Badge',
    body: "A red dot appears on this tab when an action is rejected. It clears when you visit the Actions tab. Review rejected actions in the debrief timeline for protocol guidance.",
  },
],
```

**`status`:**
```ts
contextTips: [
  {
    id: 'status-ctx-1',
    heading: 'Unlocking Vitals',
    body: "Vital cards showing '--' require a physical assessment to unlock. Go to the Actions tab and apply 'Physical Assessment' (or tap Quick Inspection in the Status tab header) — all vitals unlock simultaneously.",
  },
  {
    id: 'status-ctx-2',
    heading: 'Reading the ECG Waveform',
    body: 'Live ECG reflects current rhythm: chaotic = VFib (defibrillate), flat = Asystole (CPR + epinephrine), slow narrow = Bradycardia (atropine), fast narrow = SVT (vagal/adenosine), organised pulseless = PEA (CPR + treat cause).',
  },
  {
    id: 'status-ctx-3',
    heading: 'Progress Bar',
    body: 'The bar tracks proximity to the success condition — not just time elapsed. Completing the correct sequence advances it significantly. A flat bar for the first 20–40 seconds is normal for arrest scenarios.',
  },
],
```

**`debrief`:**
```ts
contextTips: [
  {
    id: 'debrief-ctx-1',
    heading: 'Reading Your Timeline',
    body: 'Each intervention is listed with a timestamp (T+mm:ss). Green = correct sequence. Red = incorrect. Amber = duplicate/cooldown (not penalised in score). Compare timestamps to identify response-time gaps.',
  },
  {
    id: 'debrief-ctx-2',
    heading: 'Review Protocol Links',
    body: "Each rejected action has a 'Review Protocol' link that opens the Procedure Guide overlay on top of the debrief — your debrief view is preserved.",
  },
  {
    id: 'debrief-ctx-3',
    heading: 'When to Move On',
    body: 'Aim for ≥88% (Proficient) before moving to the next difficulty tier. If consistently scoring Competent (80–88%), focus on response-time gaps — correct actions are there, but timing is slow.',
  },
],
```

#### Change 2 — `src/components/HelpPanel.tsx`

Add `GlobalTipsAccordion` sub-component (above the `HelpPanel` function). Add `filterText` state (see R-10 below — both go in the same pass). Replace the Quick Tips section:

```tsx
const GlobalTipsAccordion: React.FC<{
  tips: import('../data/helpContent').HelpTip[];
  expandedTipId: string | null;
  onToggle: (id: string) => void;
  submitFeedback: (topicId: string, rating: 'up' | 'down', comment?: string) => void;
  defaultCollapsed: boolean;
}> = ({ tips, expandedTipId, onToggle, submitFeedback, defaultCollapsed }) => {
  const [groupOpen, setGroupOpen] = useState(!defaultCollapsed);
  return (
    <div>
      <button type="button" onClick={() => setGroupOpen(g => !g)}
        className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 hover:text-slate-600 transition-colors">
        {groupOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        General Tips
      </button>
      {groupOpen && (
        <div className="rounded-2xl border border-slate-100 overflow-hidden">
          {tips.map((tip, index) => {
            const isExpanded = expandedTipId === tip.id;
            const isLast = index === tips.length - 1;
            return (
              <div key={tip.id} className={isLast ? '' : 'border-b border-slate-100'}>
                <button type="button" onClick={() => onToggle(tip.id)}
                  className="w-full flex justify-between items-center px-4 py-3 text-left hover:bg-slate-50 transition-colors">
                  <span className="text-sm font-semibold text-slate-700 leading-snug pr-2">{tip.heading}</span>
                  {isExpanded ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
                </button>
                <div className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'max-h-96' : 'max-h-0'}`}>
                  <div className="px-4 pb-4">
                    <p className="text-xs text-slate-500 leading-relaxed mb-2 whitespace-pre-line">{tip.body}</p>
                    <HelpFeedback tipId={tip.id} onSubmitFeedback={submitFeedback} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
```

Replace the existing Quick Tips section in the `HelpPanel` return JSX:

```tsx
{/* ── Section 3: Context tips + General Tips ── */}
<div className="mb-4">
  <div className="flex items-center gap-2 mb-3">
    <Lightbulb size={14} className="text-slate-500 shrink-0" />
    <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
      {content.contextTips.length > 0 ? 'This Screen' : 'Quick Tips'}
    </h3>
  </div>

  {/* Context-specific tips (primary) */}
  {filteredContextTips.length > 0 && (
    <div className="rounded-2xl border border-slate-100 overflow-hidden mb-3">
      {filteredContextTips.map((tip, index) => {
        const isExpanded = expandedTipId === tip.id;
        const isLast = index === filteredContextTips.length - 1;
        return (
          <div key={tip.id} className={isLast ? '' : 'border-b border-slate-100'}>
            <button type="button" onClick={() => handleTipToggle(tip.id)}
              className="w-full flex justify-between items-center px-4 py-3 text-left hover:bg-slate-50 transition-colors">
              <span className="text-sm font-semibold text-slate-700 leading-snug pr-2">{tip.heading}</span>
              {isExpanded ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
            </button>
            <div className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'max-h-96' : 'max-h-0'}`}>
              <div className="px-4 pb-4">
                <p className="text-xs text-slate-500 leading-relaxed mb-2 whitespace-pre-line">{tip.body}</p>
                <HelpFeedback tipId={tip.id} onSubmitFeedback={submitFeedback} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  )}

  {/* Global tips (secondary) */}
  <GlobalTipsAccordion
    tips={filteredGlobalTips}
    expandedTipId={expandedTipId}
    onToggle={handleTipToggle}
    submitFeedback={submitFeedback}
    defaultCollapsed={content.contextTips.length > 0}
  />

  {!hasFilterResults && filterText && (
    <p className="text-xs text-slate-400 text-center py-4">No tips match "{filterText}"</p>
  )}
</div>
```

---

### R-07 — `?`/`H` Keyboard Toggle

**Problem:** The shortcuts table documents `? / H` as "Open / close help panel" but no `keydown` listener exists.

#### Change 1 — `src/hooks/useHelpSystem.ts`

Add after the existing keyboard-related effects:

```ts
// Global keyboard shortcut: '?' or 'H'/'h' toggles the help panel
// Guards: walkthrough active (has own key handlers); focus in text field
useEffect(() => {
  const handleGlobalKeyDown = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const key = e.key;
    if ((key === '?' || key.toLowerCase() === 'h') && !walkthroughActiveRef.current) {
      e.preventDefault();
      if (panelOpenRef.current) {
        closePanel();
      } else {
        openPanel();
      }
    }
  };

  window.addEventListener('keydown', handleGlobalKeyDown);
  return () => window.removeEventListener('keydown', handleGlobalKeyDown);
}, [openPanel, closePanel]);
```

#### Change 2 — `src/components/HelpPanel.tsx`

The shortcut table entry is already accurate — no change needed if it reads:
```ts
{ key: '? / H', description: 'Open / close help panel' },
```

If it still reads `'Open this help panel'`, update to `'Open / close help panel'`.

---

### R-09 — Suppress Auto-Start Banner After First Completion

**Change — `src/components/WalkthroughEngine.tsx`**

```tsx
// BEFORE
{walkthroughStepIndex === 0 && (
  <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
    <p className="text-[10px] text-amber-700 leading-snug">
      ⚠️ Auto-started: this tour fires once per screen. Dismiss anytime.
    </p>
  </div>
)}

// AFTER — suppress for returning users who already completed this walkthrough
{walkthroughStepIndex === 0 &&
  !helpSystem.wasWalkthroughCompleted(helpSystem.walkthroughId ?? '') && (
  <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
    <p className="text-[10px] text-amber-700 leading-snug">
      ⚠️ Auto-started: this tour fires once per screen. Dismiss anytime.
    </p>
  </div>
)}
```

---

## Wave 4 — P4 Low

### R-10 — Inline Filter for HelpPanel Tip Accordion

Add to `src/components/HelpPanel.tsx` alongside R-06 changes (implement together):

**State:**
```tsx
const [filterText, setFilterText] = useState('');
```

**Reset on panel open:**
```tsx
useEffect(() => {
  if (helpSystem.panelOpen) {
    setExpandedTipId(null);
    setFilterText('');   // ← ADD
  }
}, [helpSystem.panelOpen, helpSystem.context]);
```

**Computed filtered sets** (place before the return statement):
```tsx
const totalTipCount = content.contextTips.length + content.quickTips.length;
const normalised = filterText.toLowerCase();

const filteredContextTips = normalised
  ? content.contextTips.filter(t =>
      t.heading.toLowerCase().includes(normalised) || t.body.toLowerCase().includes(normalised))
  : content.contextTips;

const filteredGlobalTips = normalised
  ? content.quickTips.filter(t =>
      t.heading.toLowerCase().includes(normalised) || t.body.toLowerCase().includes(normalised))
  : content.quickTips;

const hasFilterResults = filteredContextTips.length + filteredGlobalTips.length > 0;
```

**Filter input** (inside the tips section, before the accordion, shown when ≥8 total tips):
```tsx
{totalTipCount >= 8 && (
  <div className="mb-3">
    <input
      type="search"
      value={filterText}
      onChange={e => setFilterText(e.target.value)}
      placeholder="Filter tips…"
      className="w-full text-xs text-slate-600 placeholder-slate-400 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-medical-400 bg-slate-50"
    />
  </div>
)}
```

> `type="search"` provides a native clear (×) button on iOS/Chrome. No debounce needed at ≤12 tips.

---

## Full File Change Index (Code-Verified)

| Wave | File | Changes |
|---|---|---|
| 1 | [`src/data/helpContent.ts`](../src/data/helpContent.ts) | R-01: `library-step-1` targetId → `scenario-list`; N-D: `status-step-2` targetId → `vitals-container` |
| 1 | [`src/components/LibraryScreen.tsx`](../src/components/LibraryScreen.tsx) | N-B: add `id="preview-modal-header"`, `id="preview-vitals-grid"`, `id="preview-meta-badges"` to `ScenarioPreviewModal` |
| 1 | [`src/components/ECGWaveform.tsx`](../src/components/ECGWaveform.tsx) | N-C: add `id="ecg-waveform"` to wrapper div |
| 1 | [`src/components/WalkthroughEngine.tsx`](../src/components/WalkthroughEngine.tsx) | R-01: add `skippedCount` state + skip notice + reset on target found |
| 1 | [`src/components/HelpFeedback.tsx`](../src/components/HelpFeedback.tsx) | R-02: full replacement with rAF countdown + cancel button |
| 2 | [`src/components/WalkthroughEngine.tsx`](../src/components/WalkthroughEngine.tsx) | R-04: add `activeTab` prop + guard `setActiveTab`; R-08: `text-slate-400` + `aria-disabled` |
| 2 | [`src/App.tsx`](../src/App.tsx) | R-04: pass `activeTab` to `WalkthroughEngine` |
| 2 | [`src/components/PatientView.tsx`](../src/components/PatientView.tsx) | R-05: add `id="end-scenario-confirm-btn"` to `EndConfirmDialog` confirm button |
| 2 | [`tests/help-system.spec.ts`](../tests/help-system.spec.ts) | R-05: add `reachDebrief()` helper + replace `test.skip` |
| 3 | [`src/data/helpContent.ts`](../src/data/helpContent.ts) | R-06: add `contextTips` field to `ContextHelpContent` type + all 6 context arrays |
| 3 | [`src/components/HelpPanel.tsx`](../src/components/HelpPanel.tsx) | R-06: add `GlobalTipsAccordion` sub-component + split tip sections; R-10: `filterText` state + filter input + filtered tip sets |
| 3 | [`src/hooks/useHelpSystem.ts`](../src/hooks/useHelpSystem.ts) | R-07: add global `keydown` toggle listener for `?`/`H` |
| 3 | [`src/components/WalkthroughEngine.tsx`](../src/components/WalkthroughEngine.tsx) | R-09: gate auto-start banner behind `!wasWalkthroughCompleted` |

---

## Dependency Graph

```
helpContent.ts (R-01 targetId + N-D targetId)     → no component deps
LibraryScreen.tsx (N-B add IDs)                    → no deps
ECGWaveform.tsx (N-C add id)                       → no deps
WalkthroughEngine.tsx (R-01 skippedCount)          → Wave 1, no deps
HelpFeedback.tsx (R-02)                            → fully standalone

WalkthroughEngine.tsx (R-04 activeTab + R-08)      → App.tsx must pass activeTab (same Wave 2 pass)
App.tsx (R-04 activeTab prop)                      → depends on WalkthroughEngine accepting prop
PatientView.tsx (R-05 confirm id)                  → prerequisite for R-05 test selector
tests/help-system.spec.ts (R-05)                   → depends on PatientView confirm id

helpContent.ts (R-06 type + contextTips)           → HelpPanel must consume contextTips
HelpPanel.tsx (R-06 + R-10)                        → depends on R-06 type change (implement together)
useHelpSystem.ts (R-07 toggle)                     → standalone
WalkthroughEngine.tsx (R-09 banner gate)           → standalone
```

---

## Test Updates Required

| Rec | Test file | Change |
|---|---|---|
| R-01, N-B, N-C, N-D | None for unit tests — DOM ID changes are rendering; Playwright smoke tests already cover tour steps | Verify Playwright walkthrough tests don't timeout due to N-B/N-C/N-D fixes |
| R-02 | New `src/components/HelpFeedback.test.tsx` | See Vitest suite below |
| R-04 | None — rendering behavior | N/A |
| R-05 | `tests/help-system.spec.ts` | Un-skip is the change |
| R-06 | `tests/help-system.spec.ts` | Update feedback widget test to expand context tip (renders before global tips) |
| R-07 | `tests/help-system.spec.ts` | Add: press `h` → panel opens; press `h` again → closes |
| R-08 | None | Visual regression only |
| R-09 | None — rendering gate | N/A |
| R-10 | `tests/help-system.spec.ts` | Add: open panel → type in filter → verify reduced tip count |

---

## Vitest Suite — `src/components/HelpFeedback.test.tsx`

```ts
import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import HelpFeedback from './HelpFeedback';

describe('HelpFeedback', () => {
  const mockSubmit = vi.fn();

  beforeEach(() => { vi.useFakeTimers(); mockSubmit.mockClear(); });
  afterEach(() => { vi.useRealTimers(); });

  it('renders idle state with thumbs buttons', () => {
    render(<HelpFeedback tipId="t1" onSubmitFeedback={mockSubmit} />);
    expect(screen.getByLabelText(/thumbs up/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/thumbs down/i)).toBeInTheDocument();
  });

  it('rating reveals textarea and cancel button', () => {
    render(<HelpFeedback tipId="t1" onSubmitFeedback={mockSubmit} />);
    fireEvent.click(screen.getByLabelText(/thumbs up/i));
    expect(screen.getByPlaceholderText(/submitting automatically/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('auto-submits after 4 seconds without comment', () => {
    render(<HelpFeedback tipId="t1" onSubmitFeedback={mockSubmit} />);
    fireEvent.click(screen.getByLabelText(/thumbs up/i));
    act(() => { vi.advanceTimersByTime(4100); });
    expect(mockSubmit).toHaveBeenCalledWith('t1', 'up', undefined);
    expect(screen.getByText(/thanks for your feedback/i)).toBeInTheDocument();
  });

  it('cancel pauses auto-submit; textarea remains for manual submit', () => {
    render(<HelpFeedback tipId="t1" onSubmitFeedback={mockSubmit} />);
    fireEvent.click(screen.getByLabelText(/thumbs up/i));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(mockSubmit).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText(/submitting automatically/i)).toBeInTheDocument();
  });

  it('manual submit sends rating + comment immediately', () => {
    render(<HelpFeedback tipId="t1" onSubmitFeedback={mockSubmit} />);
    fireEvent.click(screen.getByLabelText(/thumbs down/i));
    fireEvent.change(screen.getByPlaceholderText(/submitting automatically/i), {
      target: { value: 'needs more detail' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit now/i }));
    expect(mockSubmit).toHaveBeenCalledWith('t1', 'down', 'needs more detail');
  });

  it('typing resets the auto-submit timer', () => {
    render(<HelpFeedback tipId="t1" onSubmitFeedback={mockSubmit} />);
    fireEvent.click(screen.getByLabelText(/thumbs up/i));
    act(() => { vi.advanceTimersByTime(3000); });
    expect(mockSubmit).not.toHaveBeenCalled();
    fireEvent.change(screen.getByPlaceholderText(/submitting automatically/i), { target: { value: 'a' } });
    act(() => { vi.advanceTimersByTime(3000); });
    expect(mockSubmit).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1100); });
    expect(mockSubmit).toHaveBeenCalledWith('t1', 'up', undefined);
  });
});
```

---

## Definition of Done

| Wave | Done when… |
|---|---|
| Wave 1 | (a) `library-step-1` targets `#scenario-list`; (b) `status-step-2` targets `vitals-container`; (c) `ScenarioPreviewModal` has IDs on header, vitals grid, meta badges; (d) `ECGWaveform` wrapper has `id="ecg-waveform"`; (e) `WalkthroughEngine` shows skip notice after auto-skip; (f) `HelpFeedback` shows amber progress bar + Cancel + "Submit now"; (g) all existing tests pass |
| Wave 2 | (a) `WalkthroughEngine` only calls `setActiveTab` when tab differs; (b) disabled Prev button uses `text-slate-400 border-slate-200` + `aria-disabled`; (c) `EndConfirmDialog` confirm button has `id="end-scenario-confirm-btn"`; (d) debrief Playwright test passes without `test.skip` |
| Wave 3 | (a) Each context shows 2–3 context tips under "This Screen"; (b) global tips collapsible under "General Tips" (collapsed by default); (c) `?`/`H` toggles panel open/close; (d) auto-start banner suppressed after first tour completion |
| Wave 4 | Filter input renders when totalTipCount ≥ 8; typing filters both tip sections; clear filter restores all; empty state shown when no match |
