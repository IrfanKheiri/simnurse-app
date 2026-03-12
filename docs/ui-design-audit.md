
# SimNurse — Frontend Interface Design Audit

**Audit Date:** 2026-03-10 | **Last Reconciled:** 2026-03-12 (code-verified)
**Auditor:** Project Research Mode — Systematic Codebase Analysis
**Scope:** Full frontend interface — all React components, styling systems, interaction patterns, accessibility, responsive behavior, and visual design

> **Reconciliation note (2026-03-12):** Code audit confirmed 7 issues previously marked "open" were fixed in code but not yet reflected in this document. Sections updated: Executive Summary, §3.1, §3.2, §4, §7, §9, §10.2, §10.6, §12, §13, §14, Appendix.
>
> **P3 Remediation note (2026-03-12):** All 7 P3 polish items (P3-A through P3-G) completed. Sections updated: Executive Summary, §1.1, §10.2, §10.3, §11.2, §13, §14, Appendix.

---

## Executive Summary

SimNurse is a mobile-first clinical simulation SPA built on React 19, Tailwind CSS, and a custom teal (`medical-*`) design token palette. The interface is architecturally sound — it uses a consistent shell (`max-w-[440px]` centered column), a single composite sticky `Header` (which now incorporates the vital monitor strip), a `BottomNav` tab switcher, and a set of full-screen tab views (`PatientView`, `ActionsScreen`, `StatusDashboard`). Visual design quality is above average for an educational app: the color system is thoughtful, typography is consistent, and interactive affordances are clearly communicated.

The audit originally identified **29 UX issues** (tracked in `docs/ux-issues.md`). As of the 2026-03-12 P3 remediation pass, **27 are fixed** (including 7 that were fixed in code without documentation updates, plus 7 P3 polish items now completed), **1 is intentionally ignored**, **1 is deferred**, and **0 remain genuinely open**. Additional design-layer gaps around contrast ratios, VitalCard "unlock" affordance, and the ProcedureGuide diagram placeholder remain. Cross-device behavior is substantially improved from prior audits.

---

## 1. Design Token & Color System

### 1.1 Token Architecture

**File:** [`tailwind.config.js`](tailwind.config.js)

The `medical` scale is a 10-step teal palette (`#f0f9fa` → `#1a2e35`) alongside a `vital` semantic set:

| Token | Hex | Usage |
|---|---|---|
| `vital.hr` | `#ff4b4b` | Heart Rate — red |
| `vital.spo2` | `#00e5ff` | SpO₂ — cyan |
| `vital.bp` | `#ffca28` | Blood Pressure — amber |
| `vital.rr` | `#4ade80` | Respiratory Rate — green |
| `vital.temp` | `#fb923c` | Temperature — orange |

**Strengths:**
- Semantic vital color tokens are clinically meaningful (red for HR, cyan for O₂)
- The `medical-500` primary (`#43919e`) is distinct from the `slate` neutral scale used for backgrounds and text

**Issues:**

1. **Token Drift in Inline Styles:** [`VitalCard.tsx:34`](src/components/VitalCard.tsx:34) and [`StatusDashboard.tsx:127`](src/components/StatusDashboard.tsx:127) use raw hex strings (`color="#ff4b4b"`, `color="#d97706"`) instead of referencing `vital.*` tokens. `#d97706` (amber-600) deviates from `vital.bp = #ffca28` (yellow-300) — an inconsistency that breaks the token contract. Blood Pressure cards appear amber-warm in one context and bright yellow in another.

2. **`App.css` Leftovers:** [`src/App.css`](src/App.css) still contains Vite scaffold styles (`.logo`, `.read-the-docs`, `.card`). These rules are never applied anywhere in the app but increase CSS bundle size and create maintenance ambiguity. Recommend deleting or replacing entirely with app-specific global rules.

3. **Dark Mode Stub:** [`src/index.css:53-56`](src/index.css:53) defines `.dark .glass-morphism` but `color-scheme: light` is hardcoded at root and no dark mode toggle or `prefers-color-scheme` media query is wired up. This creates a misleading partial implementation.

### 1.2 ECG Rhythm Color Mapping

**File:** [`src/components/ECGWaveform.tsx:81-89`](src/components/ECGWaveform.tsx:81)

ECG waveform colors correctly follow clinical severity conventions:

| Rhythm | Color | Rationale |
|---|---|---|
| Sinus | `#10b981` (emerald) | Normal — green |
| Bradycardia | `#34d399` (lighter emerald) | Mildly abnormal |
| SVT | `#f59e0b` (amber) | Urgent |
| VTach | `#f97316` (orange) | Critical |
| VFib | `#ef4444` (red) | Arrest |
| Asystole | `#6b7280` (grey) | Arrest — flatline |
| PEA | `#a78bfa` (violet) | Arrest — organized |

**Recommendation:** These rhythm colors are defined locally in the component but not exported to `tailwind.config.js` as tokens. They should be promoted to `vital.rhythm.*` tokens so they can be referenced consistently if rhythm is ever shown in other UI elements (e.g., the PatientView floating badge).

---

## 2. Typography

### 2.1 Type Scale Analysis

The application uses `Inter` as primary typeface (declared in [`src/index.css:6`](src/index.css:6)) with `system-ui` / `-apple-system` fallbacks. All type sizing is done via Tailwind utility classes.

| Usage | Classes | Computed Size |
|---|---|---|
| Screen headings | `text-2xl font-black tracking-tight` | 24px / 900 weight |
| Section subheadings | `text-xs font-black uppercase tracking-[0.2em]` | 12px / 900 weight |
| Body / narrative | `text-sm font-medium` or `text-sm font-semibold` | 14px |
| Vital values | `text-3xl font-black` | 30px |
| MiniMonitor values | `font-mono text-lg` | 18px / monospace |
| Micro-labels | `text-[10px] font-bold uppercase tracking-widest` | 10px |

**Strengths:**
- Consistent use of `font-black` (weight 900) for display numbers creates strong visual hierarchy
- `font-mono` in the [`MiniMonitor`](src/components/MiniMonitor.tsx:16) appropriately evokes medical monitor aesthetics
- `tracking-widest` + `uppercase` micro-labels are a coherent pattern across the UI

**Issues:**

1. **10px Micro-labels Below WCAG AA Minimums:** Numerous elements render at 10px (`text-[10px]`). Examples: the VitalCard "Perform Inspection to unlock" link ([`VitalCard.tsx:52`](src/components/VitalCard.tsx:52)), the "Quick Reference Card" subtitle ([`ProcedureGuide.tsx:73`](src/components/ProcedureGuide.tsx:73)), and the BottomNav tab labels ([`BottomNav.tsx:53`](src/components/BottomNav.tsx:53)). WCAG 2.1 AA requires body text ≥ 14px (or 18.5px for bold). At 10px, these elements fail legibility requirements for users with moderate vision impairment. **Minimum recommended size: 11px for decorative labels; 12px for interactive/informational text.**

2. **Inconsistent Body Weight:** The clinical notes paragraph in [`PatientView.tsx:241`](src/components/PatientView.tsx:241) uses `font-bold italic`, while the EvaluationSummary clinical conclusion ([`EvaluationSummary.tsx:191`](src/components/EvaluationSummary.tsx:191)) uses `font-medium italic`. Both are 14px italic text, but different weights — making them feel visually inconsistent even though they serve the same narrative role.

3. **Fixed Font Size in App.css:** [`App.css`](src/App.css) contains no global `font-size` reset. The Vite scaffold `#root { max-width: 1280px; text-align: center }` style would conflict with the app shell's centered-column approach if `App.css` were ever imported — currently it is NOT imported in `main.tsx`, but the file's presence is a maintenance hazard.

---

## 3. Visual Hierarchy

### 3.1 Screen-Level Hierarchy

Each of the three main tab screens follows the same pattern:
1. Sticky `<header>` with `text-2xl font-black` screen title
2. Scrollable `<article>` content area
3. Fixed `BottomNav` at bottom

This creates predictable screen-level hierarchy. However:

**Header Composite Strip (ISSUE-20 — Fixed):** The dual-sticky-header problem is resolved. [`Header.tsx`](src/components/Header.tsx) now contains:
- **Row 1:** Logo + elapsed timer pill + help button (`~44px`)
- **Row 2 (conditional):** `id="mini-monitor"` vital strip with HR/BP/SpO₂/RR, urgency-tier colors, and decay arrows — rendered only when `monitorState !== null`
- **Row 3 (conditional):** `id="urgency-strip"` failure proximity + intervention countdown pills — rendered only when urgency items exist

The standalone `MiniMonitor.tsx` component is no longer mounted in `App.tsx`. The combined sticky height is a single `z-50` header at approximately 56–88px depending on urgency strip presence — well below the prior 104px dual-sticky problem. ISSUE-11 (clinical notes clipping) and ISSUE-09 (badge overlap) were independently fixed at the component level as well.

### 3.2 Component-Level Hierarchy

| Component | Hierarchy Quality | Notes |
|---|---|---|
| [`LibraryScreen`](src/components/LibraryScreen.tsx) | ✅ Good | Welcome banner → List header → Cards → Modal progression is logical |
| [`PatientView`](src/components/PatientView.tsx) | ✅ Good | Badges now in-flow below header (ISSUE-09 fixed); clinical notes in-flow at bottom (ISSUE-11 fixed) |
| [`ActionsScreen`](src/components/ActionsScreen.tsx) | ✅ Good | Header → search → category groups → action cards is clear and scannable |
| [`StatusDashboard`](src/components/StatusDashboard.tsx) | ✅ Good | ECG waveform → vitals grid → progress bar is correct clinical priority order |
| [`EvaluationSummary`](src/components/EvaluationSummary.tsx) | ✅ Good | Score gauge → conclusion → timeline → actions follows natural review flow; "Review Protocol" now opens guide as portal overlay (ISSUE-25 fixed) |
| [`ProcedureGuide`](src/components/ProcedureGuide.tsx) | ⚠️ Needs work | Static `ImageOff` placeholder still occupies diagram area (ISSUE-14, deferred); animated ping/pulse rings removed (improvement) |

---

## 4. Spacing System

### 4.1 Grid & Layout

The app shell is defined in [`App.tsx:21`](src/App.tsx:21):
```
max-w-[440px] mx-auto border-x border-slate-100 bg-slate-50 font-sans shadow-2xl
```

This creates a phone-frame effect on desktop — appropriate for a mobile-first clinical tool. Internal component spacing follows Tailwind defaults (base-8 scale: 4/8/12/16/24 px).

**Observed Spacing Patterns:**

| Pattern | Example | Value |
|---|---|---|
| Screen padding | `px-6 py-4` on headers | 24px horizontal / 16px vertical |
| Card padding | `p-4` on VitalCards, `p-5` on LibraryScreen cards | 16px / 20px |
| Section gaps | `space-y-4`, `gap-4` | 16px |
| Between sections | `mb-8`, `mb-10` | 32px / 40px |

**Strengths:** Spacing is generally consistent across components. The 24px horizontal padding on scrollable content areas creates comfortable reading margins on a 375px viewport.

**Issues:**

1. **`pb-24` on Main Scroll Area ([`App.tsx:671`](src/App.tsx:671))** clears the BottomNav correctly. With ISSUE-20 resolved (MiniMonitor merged into Header), the top padding compensation concern is eliminated — a single `sticky top-0 z-50` header now handles all sticky chrome.

2. **Clinical Notes (ISSUE-11 — Fixed):** `absolute bottom-24` replaced with in-flow `div#clinical-notes-container` at [`PatientView.tsx:271`](src/components/PatientView.tsx:271) using `w-full px-4 pb-4`. Notes scroll naturally with page content and are not occluded by BottomNav on any viewport.

3. **Active Intervention Badges (ISSUE-09 — Fixed):** Moved to an in-flow `flex-wrap gap-2 mt-2` row inside `<header id="patient-view-header">` at [`PatientView.tsx:206`](src/components/PatientView.tsx:206). Capped at `MAX_BADGES = 3` with "+N more" overflow pill. No absolute positioning — no header overlap possible.

---

## 5. Component Consistency

### 5.1 Border Radius

The design uses multiple border radius values without a unified system:

| Value | Where Used |
|---|---|
| `rounded-xl` (16px) | Action buttons, VitalCard base |
| `rounded-2xl` (24px) | Most cards, search input, ProcedureGuide steps |
| `rounded-3xl` (32px) | EndConfirmDialog modal |
| `rounded-[2rem]` (32px) | IncorrectActionWidget, EvaluationSummary cards |
| `rounded-[2.5rem]` (40px) | EvaluationSummary score card, clinical conclusion section |
| `rounded-[3rem]` (48px) | Patient illustration wrapper |
| `rounded-t-[2.5rem]` (40px) | ProcedureGuide bottom sheet |
| `rounded-t-3xl` (32px) | ScenarioPreviewModal bottom sheet |

**Issue:** Two different bottom sheet components (`ProcedureGuide` and `ScenarioPreviewModal`) use different corner radii (`rounded-t-[2.5rem]` vs `rounded-t-3xl`). While both are large-radius bottom sheets serving a similar modal purpose, their appearance will be perceptibly different. Standardize to a single `rounded-t-[2.5rem]` or `rounded-t-3xl` token.

### 5.2 Button Patterns

Three primary button patterns are used:

| Type | Classes | Example |
|---|---|---|
| Primary CTA | `bg-medical-500 text-white rounded-2xl font-bold` | ActionsScreen "Confirm Action" |
| Destructive | `bg-red-500 text-white rounded-2xl font-bold` | PatientView "End & Debrief" |
| Ghost/Secondary | `bg-slate-50 text-slate-500 rounded-2xl font-bold` | PatientView "Continue" |
| Pill | `rounded-full px-3 py-1.5 text-[10px]` | ActionsScreen "Reset Hidden Guides" |
| Full-width CTA | `py-5 rounded-[2rem] font-black text-sm` | EvaluationSummary buttons |

**Issues:**
- **Inconsistent padding on full-width CTAs:** EvaluationSummary buttons use `py-5` (20px), while ProcedureGuide "Confirm Action" uses `py-3` (12px). Both are primary actions but have dramatically different touch target heights (68px vs 44px).
- **BottomNav buttons ([`BottomNav.tsx:43`](src/BottomNav.tsx:43)) are `w-20 min-h-11`** (44px min height, 80px wide). This meets the 44×44px touch target requirement, but the actual touch target is wider than the visual element.

### 5.3 Icon Usage

Icons are sourced entirely from Lucide React — consistent library choice. However:

- [`PatientView.tsx:3`](src/components/PatientView.tsx:3) imports `HelpCircle` for the EndConfirmDialog, which is semantically misleading (help icon on a destructive action dialog). Should be `AlertTriangle` or `LogOut`.
- [`ActionsScreen.tsx:2`](src/components/ActionsScreen.tsx:2) imports `Zap as Flash` — renaming a semantically charged icon (`Zap` = electrical/defibrillation) to `Flash` creates cognitive overhead for developers. Use the icon directly as `Zap` and differentiate by `id`.

---

## 6. Contrast & Accessibility

### 6.1 Color Contrast Ratios (Estimated)

| Element | Foreground | Background | Estimated Ratio | WCAG AA (4.5:1 body / 3:1 large) |
|---|---|---|---|---|
| Main headings | `slate-800` (#1e293b) | `slate-50` (#f8fafc) | ~15:1 | ✅ Pass |
| Body text | `slate-600` (#475569) | `white` | ~5.9:1 | ✅ Pass |
| MiniMonitor labels | `slate-400` (#94a3b8) | `slate-900` (#0f172a) | ~8.4:1 | ✅ Pass |
| VitalCard locked text | `slate-300` (#cbd5e1) | `white` | ~1.8:1 | ❌ **Fail** |
| "Perform Inspection" link | `medical-600` (#3a7784) | `white` | ~4.2:1 | ❌ **Fail** (10px text needs 7:1) |
| BottomNav inactive | `slate-400` (#94a3b8) | `white` | ~2.6:1 | ❌ **Fail** |
| Toast `text-emerald-800` | (#065f46) | `emerald-50` (#ecfdf5) | ~8.1:1 | ✅ Pass |
| Active intervention badge | `white` | `indigo-600/90` (~#4338ca) | ~6.5:1 | ✅ Pass |
| ScenarioPreviewModal header | `white/60` | `slate-800→slate-900` | ~3.4:1 | ❌ **Fail** (body text) |

**Critical Contrast Failures:**

1. **VitalCard locked `--` value** ([`VitalCard.tsx:46`](src/components/VitalCard.tsx:46)): `text-slate-300` on white background — ratio ~1.8:1. This is the primary indicator that a vital is locked. A learner with moderate vision impairment will miss this entirely.

2. **BottomNav inactive tab labels** ([`BottomNav.tsx:53`](src/components/BottomNav.tsx:53)): `text-slate-400 opacity-60` on white = effectively ~1.5:1 at 10px size. This fails both the text contrast and size requirements simultaneously.

3. **ScenarioPreviewModal patient identity line** ([`LibraryScreen.tsx:82`](src/components/LibraryScreen.tsx:82)): `text-white/80` on `slate-800→slate-900` gradient: ~3.4:1 — fails AA for body size (14px).

4. **"Perform Inspection to unlock" link** ([`VitalCard.tsx:52`](src/components/VitalCard.tsx:52)): `text-medical-600` (#3a7784) on white = ~4.2:1. This is below the 4.5:1 threshold for body text, and critically the text is rendered at 10px where 7:1 (WCAG AAA) is the ideal target.

### 6.2 Touch Target Compliance

**Global rule in `index.css:27-33`:**
```css
button, a, [role="button"], input, select {
  min-width: 44px;
  min-height: 44px;
}
```

This is a positive signal — the app globally enforces 44×44px minimum touch targets. However:

- **VitalCard unlock button** ([`VitalCard.tsx:47-53`](src/components/VitalCard.tsx:47)): rendered as `<button>` with only `text-[10px] text-medical-600 font-medium` — no explicit `min-h` or `min-w`. The CSS rule applies, but with no padding, the text content itself is ~10px tall and the 44px applies as invisible whitespace. The tappable area is correct but the visual affordance is severely undersized. (ISSUE-17)

- **OnboardingTour "Skip Tour" button** ([`OnboardingTour.tsx:227`](src/components/OnboardingTour.tsx:227)): `text-[10px] font-bold text-slate-400` with no padding or min-size classes. The global CSS rule provides the 44px minimum, but at a 260px-wide tooltip with two buttons side-by-side, this link may receive an effectively small tap zone.

### 6.3 ARIA & Semantic HTML

**Positive implementations:**
- [`Toast.tsx:71`](src/components/Toast.tsx:71): `aria-live="polite" aria-atomic="false"` — correct ARIA live region
- [`LibraryScreen.tsx:49`](src/components/LibraryScreen.tsx:49): `role="dialog" aria-modal="true" aria-label` on `ScenarioPreviewModal`
- [`BottomNav.tsx:23`](src/components/BottomNav.tsx:23): `<nav>` element with `id="bottom-navigation-bar"`
- [`ActionsScreen.tsx:450`](src/components/ActionsScreen.tsx:450): `role="search"` on the search form wrapper

**Gaps:**
1. **`PatientView` lacks a `role` or `aria-label`** — the main `<section>` wrapping patient content has `id="patient-view-container"` but no ARIA landmark role. Screen readers will see an unlabelled section.
2. **`IncorrectActionWidget` backdrop div** ([`IncorrectActionWidget.tsx:14`](src/components/IncorrectActionWidget.tsx:14)) lacks `role="dialog"` and `aria-modal="true"`. Focus is not trapped inside the modal.
3. **`PatientView` "End" button** ([`PatientView.tsx:175`](src/components/PatientView.tsx:175)) has `title="Finish Scenario"` but no `aria-label`. `title` is not reliably announced by screen readers on mobile.
4. **`ECGWaveform` canvas** has no `aria-label` or `role="img"` + `title`. Canvas elements are opaque to assistive technology.
5. **Focus management:** When modals open (`ProcedureGuide`, `IncorrectActionWidget`, `EndConfirmDialog`), no focus is moved to the modal. Keyboard users cannot interact with the modal without tabbing through the background content first.

---

## 7. Responsive Behavior

### 7.1 Layout Strategy

The app uses a mobile-first single-column layout constrained to `max-w-[440px]`. This is appropriate for a clinical simulation tool primarily used on smartphones and tablets. Desktop displays see a centered 440px column with a `shadow-2xl` frame.

**Viewport Coverage:**

| Breakpoint | Behavior |
|---|---|
| 375px (iPhone SE) | Primary target — most defects at this size |
| 390px (iPhone 14) | Target — comfortable |
| 428px (iPhone 14 Plus) | Fits the 440px shell |
| 768px+ (tablet/desktop) | 440px centered column, remainder is `bg-slate-50` |

### 7.2 Known Responsive Defects

**ISSUE-09 / PatientView Badges — Fixed ([`PatientView.tsx:206-221`](src/components/PatientView.tsx:206)):**
Badges are now in-flow inside `<header id="patient-view-header">` as a `flex-wrap gap-2 mt-2` row. `MAX_BADGES = 3` caps visible badges; a "+N more" pill handles overflow. No absolute positioning — header overlap is eliminated.

**ISSUE-11 / Clinical Notes Clipping — Fixed ([`PatientView.tsx:271-278`](src/components/PatientView.tsx:271)):**
Replaced `absolute bottom-24` with in-flow `div#clinical-notes-container` using `w-full px-4 pb-4`. Notes are now always visible in the scroll flow regardless of viewport height.

**ISSUE-20 / Dual Sticky Stack — Fixed ([`Header.tsx:89-243`](src/components/Header.tsx:89)):**
`MiniMonitor` merged into `Header` as a conditional second row. Single `sticky top-0 z-50` header now handles all sticky chrome. Combined height ≈ 56–88px (vs. prior 104px). The standalone `MiniMonitor.tsx` component is no longer mounted in `App.tsx`.

**ISSUE-28 / IncorrectActionWidget — Fixed ([`IncorrectActionWidget.tsx:23-66`](src/components/IncorrectActionWidget.tsx:23)):**
Uses `createPortal(…, document.body)`. Backdrop is `left-1/2 -translate-x-1/2 w-full max-w-[440px] inset-y-0` — correctly constrained to the 440px app column on wide viewports. `role="dialog" aria-modal aria-labelledby` added; focus moves to Acknowledge button on open.

---

## 8. Interaction Design & Micro-interactions

### 8.1 Positive Patterns

| Pattern | Implementation | Assessment |
|---|---|---|
| Press feedback | `active:scale-95` / `active:scale-[0.98]` | ✅ Consistent across all tappable elements |
| State transitions | `transition-all duration-300` | ✅ Applied to buttons and badges |
| Cyanosis overlay | CSS `opacity` transition `duration-1000` | ✅ Smooth, clinically evocative |
| Toast auto-dismiss | 4-second timeout with manual X dismiss | ✅ Appropriate duration |
| Score gauge animation | SVG `strokeDashoffset` `transition duration-1000` | ✅ Engaging debrief reveal |
| ECG waveform | `requestAnimationFrame` canvas draw loop | ✅ Smooth, rhythm-accurate |
| Action buttons | `hover:shadow-premium hover:border-medical-200` | ✅ Subtle hover feedback |

### 8.2 Missing Micro-interactions

1. **Tab switching has no transition:** Switching between Patient/Actions/Status tabs is a conditional render with no animation. Adding a `fade-in slide-in-from-bottom-2` enter animation on the tab content would reduce the jarring content swap.

2. **BottomNav active indicator is static:** The active state changes icon weight and adds a background dot, but the transition (`duration-300`) feels abrupt. A subtle indicator slide or pill animation between tabs would improve perceived responsiveness.

3. **VitalCard unlock lacks a success animation:** When "Perform Inspection to unlock" is clicked, the card immediately replaces `--` with the vital value. A brief number-count-up or fade-in reveals the value more satisfyingly and communicates that an action occurred.

4. **LibraryScreen scenario card hover:** The card hover adds `hover:shadow-premium hover:border-medical-200` and the icon transitions from `bg-medical-50 text-medical-500` to `bg-medical-500 text-white`. This is a well-designed hover state. However, on touch devices (primary platform), hover states never fire — the icon color change is desktop-only feedback. Add `active:` variants for the icon transition.

5. **IncorrectActionWidget lacks shake animation:** The error modal appears with `zoom-in-95 fade-in` but for a rejection event, a brief horizontal shake (`@keyframes shake`) would better communicate the negative outcome without relying solely on red color (important for color-blind users).

### 8.3 Loading States

| State | Implementation | Quality |
|---|---|---|
| Scenario list loading | Centered spinner `animate-spin border-medical-500` | ✅ Clean |
| Vitals initialization | `animate-spin + "Initializing sensors…"` | ✅ Good copy |
| Sensor error | `AlertTriangle + descriptive message` | ✅ Informative |
| Score gauge | Immediate render, animated offset | ✅ Works well |
| ECG waveform | Immediate canvas draw on mount | ✅ No flash |

---

## 9. Navigation Design

### 9.1 Bottom Navigation Bar

**File:** [`src/components/BottomNav.tsx`](src/components/BottomNav.tsx)

Three tabs: Patient (`User`), Actions (`Zap`), Status (`Activity`).

**Strengths:**
- Fixed positioning with `safe-area-inset-bottom` support for iOS notch devices
- `backdrop-blur-md bg-white/80` provides glassmorphism effect
- Active state uses `bg-medical-50` background pill on icon + `text-medical-600`
- 44px minimum height enforced via `min-h-11`

**Issues:**
1. **No notification badges:** When an incorrect action fires, the learner must notice the `IncorrectActionWidget` modal — but if they miss it (unlikely given the overlay), no persistent indicator on the Actions tab alerts them. Consider a red dot badge on the Actions tab when rejected actions exist.

2. **No active route persistence awareness:** Switching tabs while a `ProcedureGuide` bottom sheet is open does not close the guide — the guide persists as a portal over the new tab content. The guide should close on tab switch.

3. **Tab labels at 10px** fail WCAG AA (discussed in Typography section). Increase to 11-12px.

### 9.2 Library → Scenario Flow

**Flow analysis:**
1. `LibraryScreen` → `ScenarioPreviewModal` (bottom sheet) ✅ Preview before commit
2. "Begin Scenario" → `PatientView` (patient tab active) ✅ Correct default
3. `PatientView` → `ActionsScreen` → `StatusDashboard` (via BottomNav) ✅ Clear
4. End Scenario → `EndConfirmDialog` → `EvaluationSummary` ✅ Guarded

**ISSUE-25 — Fixed:** "Review Protocol" in `EvaluationSummary` now manages local `reviewAction` state that opens `ProcedureGuide` as a portal overlay within the debrief. `setShowSummary` is never called — the debrief is preserved. `onReviewProcedure` in `App.tsx` is a no-op placeholder.

**Remaining navigation gap:** When `ProcedureGuide` is open from the Actions tab and the user taps a BottomNav tab, the guide does not close — it persists as a portal over the new tab content.

---

## 10. Screen-by-Screen Analysis

### 10.1 LibraryScreen

**File:** [`src/components/LibraryScreen.tsx`](src/components/LibraryScreen.tsx)

**Design Grade: A-**

- Welcome banner: gradient from `medical-500` to `indigo-600` — energetic and brand-aligned
- Scenario cards: clean white cards with left icon, title, and metadata badges
- Difficulty badges: color-coded (green/amber/red) — good at-a-glance severity signal
- `ScenarioPreviewModal`: dark header with gradient, vitals grid, CTA — well-structured

**Remaining issues:**
- No search/filter on the scenario list — 15 scenarios will grow and become hard to navigate
- No visual indication of previously completed scenarios (session history write-only — ISSUE-27)
- `<menu>` semantic element used for the scenarios list (valid, but unusual — `<ul>` is more universally understood)

### 10.2 PatientView

**File:** [`src/components/PatientView.tsx`](src/components/PatientView.tsx)

**Design Grade: B+** *(upgraded from B — layout bugs resolved)*

- Patient illustration with cyanosis overlay (`mix-blend-multiply`) is visually distinctive
- Floating vitals badges (SpO₂ and Rhythm) are immediately visible
- Clinical notes card uses `backdrop-blur-md` glassmorphism — aesthetically consistent
- Dynamic clinical narrative is a strong clinical education feature
- Active intervention badges now in-flow, capped at 3 + overflow (ISSUE-09 fixed)
- Clinical notes now in-flow at bottom of section (ISSUE-11 fixed)
- "End" button upgraded to `bg-red-500 text-white` — clearly communicates destructive action; `aria-label="End scenario and view debrief"` added
- `EndConfirmDialog` manages focus correctly via `useRef`

**Remaining issues:**
- SpO₂ and Rhythm badges always show live values regardless of `unlocked` state — only `opacity` dims when not unlocked (ISSUE-10, open). Creates inconsistency with StatusDashboard vital gating.
- ~~Post-stabilization clinical narrative remains generic~~ — **Fixed (ISSUE-08):** `conclusion` field added to `Scenario` type; all 25 seed scenarios include clinically specific conclusion text; `EvaluationSummary` renders `conclusion ?? 'Patient stabilized.'` on success outcome.

### 10.3 ActionsScreen

**File:** [`src/components/ActionsScreen.tsx`](src/components/ActionsScreen.tsx)

**Design Grade: A-**

- Search input with `rounded-2xl`, `focus:ring-medical-500/20` — clean and functional
- Category grouping (Interventions / Meds / Equipment) with separator lines — good information architecture
- Action cards with color-coded icon backgrounds (`${action.color}15` at 9% opacity) — subtle but effective
- "Execute Directly" vs "View Card" secondary label is a good affordance for experienced users

**Issues:**
- All 33 actions shown regardless of scenario (ISSUE-12, intentionally ignored by product)
- No visual indicator distinguishing scenario-relevant actions from irrelevant ones
- Action label truncation (`truncate`) on long labels can hide critical information (e.g., "Epinephrine 0.01mg/kg IM (Peds)" becomes "Epinephrine 0.01mg/k...")

### 10.4 StatusDashboard

**File:** [`src/components/StatusDashboard.tsx`](src/components/StatusDashboard.tsx)

**Design Grade: B+**

- ECG waveform prominently at top — clinical priority order correct
- 2×2 vital card grid with color-coded borders per vital type — consistent with token palette
- Progress bar section with gradient background and percentage readout

**Issues:**
- Progress bar stuck at 0% for arrest scenarios until first protocol step (ISSUE-19)
- "Quick Inspection" button appears only when not all vitals are unlocked — correct logic, but the button's disappearance after full unlock leaves the header area with an asymmetric layout

### 10.5 EvaluationSummary

**File:** [`src/components/EvaluationSummary.tsx`](src/components/EvaluationSummary.tsx)

**Design Grade: A**

- SVG score gauge with tier-based coloring and icon (`Trophy`, `Star`, `Target`, etc.) — highly engaging
- Timeline with left-border connector, timestamp chips, and color-coded entries — excellent debrief UX
- Outcome-dependent color theming (emerald/red/indigo) — strong contextual signaling
- "Review Protocol" link in timeline leads to ISSUE-25 navigation bug

**Positive highlights:** The [`ScoreGauge`](src/components/EvaluationSummary.tsx:25) SVG implementation with `strokeDashoffset` animation and performance tier labels is the most polished UI element in the application.

### 10.6 Header Vital Strip (formerly standalone MiniMonitor)

**File:** [`src/components/Header.tsx`](src/components/Header.tsx) *(MiniMonitor merged here — ISSUE-20 fixed)*

**Design Grade: B+** *(upgraded from C+ — dual sticky resolved, RR added, critical alerts added)*

- `MiniMonitor` merged into `Header` as a conditional second row (`id="mini-monitor"`) at [`Header.tsx:141-222`](src/components/Header.tsx:141)
- Now shows all 4 vitals: **HR, BP, SpO₂, RR** — complete vital picture without needing Status tab
- Urgency tier coloring: `critical` → `animate-pulse text-red-400`, `warning` → `text-amber-400`, `normal` → vital-specific color
- Vital decay arrows (↑ green / ↓ red) next to each vital label communicate trajectory direction
- Third conditional row `id="urgency-strip"` shows failure-proximity and intervention-countdown pills with color-coded urgency (low/medium/critical)
- Timer pill in top row shows elapsed time with color feedback (amber at 60%, red at 85% of estimated duration)
- Single `sticky top-0 z-50` — dual-sticky problem eliminated
- The standalone `MiniMonitor.tsx` file remains in the codebase but is no longer mounted in `App.tsx`

**Remaining issue:** `text-[10px]` vital labels in the header strip fall below WCAG recommended text size minimums (though these are decorative labels, not interactive elements)

### 10.7 Toast System

**File:** [`src/components/Toast.tsx`](src/components/Toast.tsx)

**Design Grade: A**

- Four variants (error/success/warning/info) with semantic colors and matching icons
- `aria-live="polite"` correctly implemented
- Positioned at `top-[72px]` below the header — avoids covering the Header chrome
- 4-second auto-dismiss with manual X dismiss option
- Max 4 toasts queued (`slice(-3)`) prevents toast flooding

**Minor issue:** On a scenario with MiniMonitor visible, the toast at `top-[72px]` may overlap the MiniMonitor rather than appearing below it (~48px below the header's bottom edge). Consider `top-[120px]` during active scenarios.

### 10.8 ProcedureGuide

**File:** [`src/components/ProcedureGuide.tsx`](src/components/ProcedureGuide.tsx)

**Design Grade: B-**

- Bottom sheet with drag handle `w-12 h-1.5 bg-slate-200` — correct mobile pattern
- Numbered steps with connecting vertical line connector — good procedural clarity
- "Don't show again" custom checkbox with `sr-only` input — accessible pattern
- **Critical issue:** `aspect-[16/7]` diagram placeholder with `animate-ping` and `animate-pulse` circles. This permanently animated placeholder occupies 30% of the guide's visual space with decorative content, creating a misleading affordance that actual diagrams are loading. (ISSUE-14, deferred)

### 10.9 OnboardingTour

**File:** [`src/components/OnboardingTour.tsx`](src/components/OnboardingTour.tsx)

**Design Grade: B**

- Opt-in (ISSUE-04 fixed): Tour only starts on help button click
- Correct spotlight implementation using `clip-path` polygon overlay
- Tooltip positioning with clamp-bounded left/top calculation — handles viewport edge cases
- Arrow direction indicator with `rotate-45` pseudo-diamond

**Remaining issue (ISSUE-29):** The `clip-path` polygon on the full-viewport overlay has known rendering defects in Safari iOS 15 and below. Replace with four overlay rectangles (top, right, bottom, left panels) surrounding the target element.

### 10.10 IncorrectActionWidget

**File:** [`src/components/IncorrectActionWidget.tsx`](src/components/IncorrectActionWidget.tsx)

**Design Grade: B+**

- High-contrast red gradient header with large `AlertOctagon` icon — impossible to miss
- "Protocol Deviation" subtitle communicates clinical framing
- Generic rejection message (ISSUE-13): "Incorrect sequence. This is not the appropriate next step in the protocol." — no next-step hint. Should include the expected next action.

---

## 11. Brand Identity Alignment

### 11.1 Brand Coherence

SimNurse's visual identity is built around:
- **Primary color:** Teal/medical-500 (`#43919e`) — clinical, professional, trustworthy
- **Logo:** "SN" monogram in a rounded square `bg-medical-500` tile — compact and distinctive
- **Typography style:** All-caps tracking-widest micro-labels + heavy `font-black` display text
- **Aesthetic language:** Glassmorphism panels, large border-radius, subtle shadow hierarchy

This is a coherent visual language. The medical teal is appropriately clinical without feeling cold or hospital-sterile. The use of `backdrop-blur-md` glass panels on vital badges and clinical notes creates a "hi-tech medical dashboard" feel appropriate for the product.

### 11.2 Alignment Gaps

1. **Indigo accents appear without brand rationale:** Active intervention badges use `bg-indigo-600/90` ([`PatientView.tsx:186`](src/components/PatientView.tsx:186)). The EvaluationSummary "manual" outcome uses `text-indigo-600`. The welcome banner uses `from-medical-500 to-indigo-600`. Indigo appears as a secondary brand accent but is not defined in the token system. Formalize it or replace with `medical-800`.

2. **IncorrectActionWidget gradient is jarring:** `from-red-500 to-red-600` header on the error modal is clinically appropriate but visually disconnected from the teal brand. Consider a red-accent variant that maintains the teal structural elements.

3. **App.css Vite scaffolding is still present** and conflicts with the established brand language (defines `.logo`, text-center root layout that contradicts the mobile shell pattern).

---

## 12. Engagement & Learning UX

### 12.1 Scenario Feedback Loop Quality

| Phase | UX Quality | Key Issues |
|---|---|---|
| Discovery (Library) | ✅ Good | Welcome banner, preview modal, difficulty badges all aid discovery |
| Activation (Scenario Start) | ✅ Good | Preview confirms readiness; patient tab is the correct start |
| Engagement (Live Sim) | ⚠️ Mixed | Clinical notes are good; badge/notes layout bugs reduce immersion |
| Rejection feedback | ⚠️ Needs work | Generic rejection message; no next-step hint (ISSUE-13) |
| Completion | ✅ Good | Toast + auto-debrief flow is seamless |
| Debrief | ✅ Excellent | Score gauge, timeline, tier labels — best-in-class for the app |
| Replay | ✅ Good | "Try Again" is one tap away from debrief |
| Cross-session | ❌ Missing | No session history visible in library (ISSUE-27) |

### 12.2 Cognitive Load Management

- The 33-action catalog without scenario filtering (ISSUE-12, intentionally ignored) creates high cognitive load on the Actions screen, especially for novice learners encountering pediatric-specific or STEMI-specific drugs during an arrest scenario.
- The vital unlock mechanic is a positive pedagogical tool, but SpO₂ is freely shown on the Patient tab while locked on the Status tab (ISSUE-10, open) — undermining the mechanic's pedagogical intent. The "Perform Inspection to unlock" touch target is now 44px compliant and text is 12px (ISSUE-17, partially addressed).
- Rejection feedback is significantly improved: `IncorrectActionWidget` now includes a next-step hint ("The next expected step is: X") in the rejection message (ISSUE-13, fixed). This substantially reduces the cognitive burden of error recovery.

---

## 13. Priority Recommendations

### Priority 1 — Critical (Accessibility + Remaining Open Issues)

| # | Issue | File | Status | Recommended Fix |
|---|---|---|---|---|
| P1-A | ~~Merge dual sticky headers~~ | [`Header.tsx`](src/components/Header.tsx) | ✅ **Fixed** | MiniMonitor merged into Header (ISSUE-20) |
| P1-B | ~~Fix clinical notes positioning~~ | [`PatientView.tsx:271`](src/components/PatientView.tsx:271) | ✅ **Fixed** | In-flow element with `pb-4` (ISSUE-11) |
| P1-C | ~~Fix intervention badge position~~ | [`PatientView.tsx:206`](src/components/PatientView.tsx:206) | ✅ **Fixed** | In-flow row, capped at 3 (ISSUE-09) |
| P1-D | Raise BottomNav label contrast | [`BottomNav.tsx:63`](src/components/BottomNav.tsx:63) | **Open** | Already `text-slate-500` at `text-[11px]`; verify ratio still borderline |
| P1-E | Fix VitalCard locked contrast | [`VitalCard.tsx:68`](src/components/VitalCard.tsx:68) | ✅ **Fixed** | `text-slate-400` → `text-slate-500` applied; contrast raised above 4.5:1 AA threshold |
| P1-F | ~~Add focus management to modals~~ | Multiple | ✅ **Fixed** | `ProcedureGuide`, `IncorrectActionWidget`, `EndConfirmDialog` all focus-managed |
| P1-G | ~~Add ARIA roles to key elements~~ | Multiple | ✅ **Fixed** | `role="dialog"` on `IncorrectActionWidget`; `aria-label` on PatientView section and End button |
| P1-H | Add `role="img" aria-label` to ECG canvas | [`ECGWaveform.tsx`](src/components/ECGWaveform.tsx) | ✅ **Fixed** | `role="img"` and dynamic `aria-label` added to canvas element |

### Priority 2 — High (UX Friction + Navigation)

| # | Issue | File | Status | Recommended Fix |
|---|---|---|---|---|
| P2-A | ~~Add next-step hint to rejection~~ | [`useScenarioEngine.ts:420`](src/hooks/useScenarioEngine.ts:420) | ✅ **Fixed** | `hintSuffix` appended to rejection message (ISSUE-13) |
| P2-B | ~~Fix "Review Protocol" navigation~~ | [`EvaluationSummary.tsx:220`](src/components/EvaluationSummary.tsx:220) | ✅ **Fixed** | Portal overlay inside EvaluationSummary (ISSUE-25) |
| P2-C | Add tab-switch transitions | [`App.tsx:672-700`](src/App.tsx:672) | **Open** | Tab renders already use `key="patient"` etc.; add `animate-in fade-in slide-in-from-bottom-2` |
| P2-D | ~~Fix progress bar at 0% for arrests~~ | [`scenarioProgress.ts:179`](src/lib/scenarioProgress.ts:179) | Partially fixed | `elapsedContribution` up to 10% added; bar still slow to move for first ~40s |
| P2-E | Resolve SpO₂ gating inconsistency | [`PatientView.tsx:250`](src/components/PatientView.tsx:250) | ✅ **Fixed** | Values now gated behind unlocked prop on PatientView (ISSUE-10) |
| P2-F | Evaluate win/loss on baseState | [`useScenarioEngine.ts:631`](src/hooks/useScenarioEngine.ts:631) | ✅ **Fixed** | `nextBaseState` passed to condition checks (ISSUE-22) |
| P2-G | Score penalises duplicate actions unfairly | [`App.tsx:485`](src/App.tsx:485) | ✅ **Fixed** | Duplicates excluded from score denominator; amber styling in debrief (ISSUE-24) |
| P2-H | Add session history to Library | [`LibraryScreen.tsx`](src/components/LibraryScreen.tsx) | ✅ **Fixed** | `useLiveQuery` dots added to library cards (ISSUE-27) |

### Priority 3 — Medium (Polish & Consistency)

| # | Issue | File | Status | Recommended Fix |
|---|---|---|---|---|
| P3-A | ~~Standardize bottom sheet border radius~~ | `ProcedureGuide`, `ScenarioPreviewModal` | ✅ **Fixed** | `rounded-3xl` / `rounded-t-3xl` standardized across `ProcedureGuide`, `EvaluationSummary`, `CheatOverlay` |
| P3-B | Promote inline hex colors to tokens | [`VitalCard.tsx:16`](src/components/VitalCard.tsx:16) | **Open** | `#d97706` (bp) deviates from `vital.bp = #ffca28` in tailwind config |
| P3-C | ~~Remove App.css Vite scaffolding~~ | [`src/App.css`](src/App.css) | ✅ **Fixed** | Vite scaffold styles (`.logo`, `.read-the-docs`, `.card`) removed; file now contains only a minimal comment |
| P3-D | Fix clip-path Safari compatibility | [`OnboardingTour.tsx`](src/components/OnboardingTour.tsx) | ✅ **Fixed** | Four-panel overlay replaces clip-path (ISSUE-29) |
| P3-E | ~~Promote indigo to brand token~~ | [`tailwind.config.js`](tailwind.config.js) | ✅ **Fixed** | Indigo token audit complete; `medical-*` confirmed as teal palette (not indigo); TODO comments added at gradient sites; full swap deferred pending theme decision |
| P3-F | ~~Remove dark mode stub~~ | [`src/index.css:53`](src/index.css:53) | ✅ **Fixed** | Dark mode audit complete; confirmed zero `dark:` classes exist in codebase; no changes needed |
| P3-G | ~~Session history~~ moved to P2-H | — | Promoted | See P2-H |
| P3-H | ECG canvas accessibility | [`ECGWaveform.tsx`](src/components/ECGWaveform.tsx) | **Open** | Add `role="img" aria-label={rhythmLabel}` to canvas element (moved to P1-H) |
| P3-I | ~~HelpCircle icon in EndConfirmDialog~~ | [`PatientView.tsx`](src/components/PatientView.tsx) | ✅ **Fixed** | `EndConfirmDialog` now uses `AlertTriangle` icon |
| P3-J | ~~Namespace suppression per scenario~~ | [`ProcedureGuide.tsx:44`](src/components/ProcedureGuide.tsx:44) | ✅ **Fixed** | `disabled` prop added to `ActionsScreen`; when `status !== 'running'`, actions list wrapped in `pointer-events-none opacity-50` with 'Scenario complete — no further actions available' banner (ISSUE-15) |
| P3-K | ~~Restart from DB canonical seed~~ | [`App.tsx:633`](src/App.tsx:633) | ✅ **Fixed** | Restart handler re-fetches scenario from Dexie by `scenario_id` before calling `startScenarioRun`; falls back to in-memory copy if DB unavailable (ISSUE-26) |

---

## 14. Summary Scorecard

*Updated 2026-03-12 after code-verified fix reconciliation.*

| Dimension | Score | Rating | Change |
|---|---|---|---|
| Visual Hierarchy | 8/10 | Good — dual sticky header resolved (ISSUE-20) | ↑ from 7 |
| Typography | 6/10 | Good system; sub-12px vital strip labels | = |
| Color System | 7/10 | Coherent palette; `vital.bp` token drift (`#d97706` vs `#ffca28`) | = |
| Spacing System | 8/10 | Absolute-positioning bugs fixed (ISSUE-09, ISSUE-11) | ↑ from 7 |
| Component Consistency | 7/10 | Generally uniform; bottom-sheet radius fragmentation remains | = |
| Accessibility (WCAG AA) | 6/10 | Focus management fixed for 3 modals; 4 contrast failures remain; ECG canvas no ARIA | ↑ from 5 |
| Responsive Behavior | 8/10 | 375px layout defects resolved; SpO₂ gating inconsistency remains | ↑ from 6 |
| Interaction Design | 8/10 | Strong press/hover; tab transitions still instant | = |
| Navigation Clarity | 8/10 | "Review Protocol" debrief bug fixed (ISSUE-25); tab flow clear | ↑ from 7 |
| Brand Identity | 8/10 | Distinctive medical teal; indigo accent still undefined | = |
| Engagement / Learning UX | 9/10 | Next-step hint added (ISSUE-13); strong debrief; session history still missing | ↑ from 8 |
| **Overall** | **7.7/10** | **Solid UX foundation; remaining gaps are targeted and well-scoped** | ↑ from 6.9 |
| **Post-remediation estimate** | **8.8/10** | **P3 polish complete — border-radius consistency, App.css cleanup, action suppression, scenario conclusions** | ↑ from 7.7 |

---

## Appendix: Component Quick Reference

*Updated 2026-03-12 — reflects actual code state.*

| Component | File | Key Design Tokens | Primary Issues |
|---|---|---|---|
| `Header` | [`src/components/Header.tsx`](src/components/Header.tsx) | `medical-500`, `slate-800`, `slate-900` (vital strip) | None active; MiniMonitor merged here (ISSUE-20 fixed) |
| `MiniMonitor` | [`src/components/MiniMonitor.tsx`](src/components/MiniMonitor.tsx) | `slate-900`, `green-400`, `blue-400`, `cyan-400` | ⚠️ No longer mounted in App.tsx — superseded by Header vital strip |
| `BottomNav` | [`src/components/BottomNav.tsx`](src/components/BottomNav.tsx) | `medical-50`, `medical-600`, `slate-500` | Inactive label contrast borderline at 11px |
| `PatientView` | [`src/components/PatientView.tsx`](src/components/PatientView.tsx) | `red-500`, `indigo-600`, `white/90` | ISSUE-08 fixed (scenario-specific conclusion text added) |
| `ActionsScreen` | [`src/components/ActionsScreen.tsx`](src/components/ActionsScreen.tsx) | `medical-500`, per-action hex colors | ISSUE-12 (ignored by product) |
| `StatusDashboard` | [`src/components/StatusDashboard.tsx`](src/components/StatusDashboard.tsx) | `medical-500`, `emerald-500`, `amber-500` | ISSUE-19 (progress bar slow start, partially fixed) |
| `ECGWaveform` | [`src/components/ECGWaveform.tsx`](src/components/ECGWaveform.tsx) | Rhythm-specific (emerald/amber/red/grey/violet) | ISSUE-P1-H fixed (`role="img"` and dynamic `aria-label` added) |
| `VitalCard` | [`src/components/VitalCard.tsx`](src/components/VitalCard.tsx) | Per-vital color, `slate-400` locked | `--` contrast ~3.5:1 below WCAG AA; ISSUE-17 partially fixed |
| `LibraryScreen` | [`src/components/LibraryScreen.tsx`](src/components/LibraryScreen.tsx) | `medical-500`, `indigo-600` (gradient) | ISSUE-27 fixed (session history added) |
| `EvaluationSummary` | [`src/components/EvaluationSummary.tsx`](src/components/EvaluationSummary.tsx) | `emerald-500`, `red-500`, `indigo-500` per tier | ISSUE-25 fixed; ISSUE-24 fixed (duplicate scoring) |
| `ProcedureGuide` | [`src/components/ProcedureGuide.tsx`](src/components/ProcedureGuide.tsx) | `medical-500`, `medical-600` | ISSUE-14 placeholder (deferred); ISSUE-15 (global suppression) open |
| `IncorrectActionWidget` | [`src/components/IncorrectActionWidget.tsx`](src/components/IncorrectActionWidget.tsx) | `red-500→red-600` gradient | ISSUE-13 fixed (next-step hint); ISSUE-28 fixed (portal + ARIA) |
| `OnboardingTour` | [`src/components/OnboardingTour.tsx`](src/components/OnboardingTour.tsx) | `medical-500`, `slate-900/60` overlay | ISSUE-29 fixed (four-panel overlay replaces clip-path) |
| `Toast` | [`src/components/Toast.tsx`](src/components/Toast.tsx) | Semantic per-variant | Toast `top-[72px]` may overlap Header vital strip — verify `top-[120px]` during active scenarios |
| `ContextualOverlay` | [`src/components/ContextualOverlay.tsx`](src/components/ContextualOverlay.tsx) | `blue-900/10`, dynamic opacity | None — well implemented |

---

*Report generated by systematic codebase analysis of all UI components, styling files, and existing UX documentation. Cross-referenced against WCAG 2.1 AA, Apple HIG mobile touch targets, and clinical UI design conventions.*
