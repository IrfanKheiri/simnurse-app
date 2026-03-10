
# SimNurse — Frontend Interface Design Audit

**Audit Date:** 2026-03-10  
**Auditor:** Project Research Mode — Systematic Codebase Analysis  
**Scope:** Full frontend interface — all React components, styling systems, interaction patterns, accessibility, responsive behavior, and visual design

---

## Executive Summary

SimNurse is a mobile-first clinical simulation SPA built on React 19, Tailwind CSS, and a custom teal (`medical-*`) design token palette. The interface is architecturally sound — it uses a consistent shell (`max-w-[440px]` centered column), a persistent `Header` + `MiniMonitor` sticky stack, a `BottomNav` tab switcher, and a set of full-screen tab views (`PatientView`, `ActionsScreen`, `StatusDashboard`). Visual design quality is above average for an educational app: the color system is thoughtful, typography is consistent, and interactive affordances are clearly communicated.

However, the audit identifies **28 active UX issues** (tracked in `docs/ux-issues.md`), of which **13 remain open**, and surfaces additional design-layer gaps not captured in that log — particularly around contrast ratios, spacing system discipline, the MiniMonitor sticky stack height problem, the VitalCard "unlock" affordance, and the ProcedureGuide diagram placeholder. Cross-device behavior has several measurable defects on 375px viewports that require specific remediation.

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

**Header Duplication Issue:** During an active scenario, the layout stacks:
- [`Header`](src/components/Header.tsx) — `sticky top-0 z-50` (~56px)
- [`MiniMonitor`](src/components/MiniMonitor.tsx) — `sticky top-0 z-40` (~48px)
- Per-screen `<header>` inside the scrollable area

The first two are simultaneously sticky, consuming **~104px** before any content begins. On a 667px tall viewport (iPhone SE), this leaves only 507px for the tab content, then an additional 56px is consumed by `BottomNav`, leaving just **451px of usable content height**. This directly causes the clinical notes clipping bug (ISSUE-11) and worsens the active intervention badge overlap (ISSUE-09).

**Recommendation:** Merge `MiniMonitor` into the `Header` as a collapsible secondary row that is only rendered during `activeScenario !== null`. Target combined sticky height ≤ 68px.

### 3.2 Component-Level Hierarchy

| Component | Hierarchy Quality | Notes |
|---|---|---|
| [`LibraryScreen`](src/components/LibraryScreen.tsx) | ✅ Good | Welcome banner → List header → Cards → Modal progression is logical |
| [`PatientView`](src/components/PatientView.tsx) | ⚠️ Needs work | Floating badges `absolute top-4 left-4` overlap the "Patient View" heading (ISSUE-09) |
| [`ActionsScreen`](src/components/ActionsScreen.tsx) | ✅ Good | Header → search → category groups → action cards is clear and scannable |
| [`StatusDashboard`](src/components/StatusDashboard.tsx) | ✅ Good | ECG waveform → vitals grid → progress bar is correct clinical priority order |
| [`EvaluationSummary`](src/components/EvaluationSummary.tsx) | ✅ Good | Score gauge → conclusion → timeline → actions follows natural review flow |
| [`ProcedureGuide`](src/components/ProcedureGuide.tsx) | ⚠️ Needs work | Permanent diagram placeholder breaks hierarchy; creates false content expectation |

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

1. **`pb-24` on Main Scroll Area ([`App.tsx:346`](src/App.tsx:346))** clears the BottomNav, but when MiniMonitor is also sticky, the top padding is not compensated. Content near the top of the scroll area can be obscured without scroll.

2. **Clinical Notes Absolute Positioning ([`PatientView.tsx:239`](src/components/PatientView.tsx:239)):** `absolute bottom-24` places the notes card at a fixed offset from the bottom. On viewports shorter than 700px, this card overlaps or is hidden behind the BottomNav — a hard layout bug (ISSUE-11). The element should be in-flow within the `<article>` with `pb-24` padding instead.

3. **Active Intervention Badges ([`PatientView.tsx:184`](src/components/PatientView.tsx:184)):** `absolute top-4 left-4 z-20` will collide with the `<header>` that begins at `p-6` (24px). When 3+ interventions are active, the badge stack overflows into the heading area. Recommend: move to in-flow position below the header.

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

**ISSUE-09 / PatientView Badges ([`PatientView.tsx:184`](src/components/PatientView.tsx:184)):**
`absolute top-4 left-4` stacks over the `<header>` which begins at `p-6`. When 3+ interventions are active, badges extend to y=100px+ from the section top, covering the "Patient View" title and status text.

**ISSUE-11 / Clinical Notes Clipping ([`PatientView.tsx:239`](src/components/PatientView.tsx:239)):**
`absolute bottom-24` on a 667px screen: clinical notes top edge = 667 - 96 (bottom-24) - ~80 (card height) = ~491px from top. With the Header (56px) + MiniMonitor (48px) consuming 104px from the top and BottomNav (56px) from the bottom, the usable viewport is 507px. The notes card occupies the last 96-176px of that space — but since the patient illustration area uses `flex-1`, the notes card overlaps the illustration and may render partially behind BottomNav.

**ISSUE-20 / Dual Sticky Stack ([`App.tsx:341-342`](src/App.tsx:341)):**
`Header` (`z-50`) + `MiniMonitor` (`z-40`) both declare `sticky top-0`. On a 375px screen this consumes ~104px, leaving only 451px between headers and BottomNav. **Recommended fix:** Integrate MiniMonitor as a collapsible row inside Header — render only during `activeScenario !== null`. Target combined height ≤ 64px.

**ISSUE-28 / IncorrectActionWidget ([`IncorrectActionWidget.tsx:14`](src/components/IncorrectActionWidget.tsx:14)):**
`fixed inset-0` inside `#app-shell` (440px constrained). On wide viewports, the inset-0 fixed overlay escapes the 440px column, causing the backdrop to cover the full viewport while the modal remains centered in the column. Use `createPortal` with explicit 440px width constraint (already in place — portal renders to `document.body`). The fix is complete for portal rendering, but the overlay `bg-slate-900/60` will still span the full viewport width. Constrain with `left-1/2 -translate-x-1/2 max-w-[440px]` on the backdrop.

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

**Navigation Gap — ISSUE-25:** "Review Protocol" in `EvaluationSummary` calls `setShowSummary(false)` and navigates to the Actions tab. After the guide closes, the user is stranded in the live scenario view with no route back to the debrief. The debrief is destroyed. **Fix:** Open `ProcedureGuide` as a modal layer on top of `EvaluationSummary` via a portal, without modifying `showSummary`.

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

**Design Grade: B**

- Patient illustration with cyanosis overlay (`mix-blend-multiply`) is visually distinctive
- Floating vitals badges (SpO₂ and Rhythm) are immediately visible
- Clinical notes card uses `backdrop-blur-md` glassmorphism — aesthetically consistent
- Dynamic clinical narrative is a strong clinical education feature

**Critical issues:**
- `absolute bottom-24` clinical notes positioning (ISSUE-11)
- `absolute top-4 left-4` intervention badges overlap header (ISSUE-09)
- SpO₂ and Rhythm freely visible without unlock (inconsistency with StatusDashboard, ISSUE-10)
- "End" button uses `p-3 bg-red-50 text-red-600` — reads as a mild button, not the critical destructive action it is

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

### 10.6 MiniMonitor

**File:** [`src/components/MiniMonitor.tsx`](src/components/MiniMonitor.tsx)

**Design Grade: C+**

- Dark `bg-slate-900` bar with monospace green/blue/cyan readings — appropriate clinical monitor aesthetics
- Only shows HR, BP, SpO₂ (no RR) — omits one of the four lockable vitals without explanation
- Uses `sticky top-0 z-40` — conflicts with `Header`'s `z-50` creating the dual-sticky problem
- No label for Respiratory Rate — learner must navigate to Status tab to see RR even after unlocking all vitals
- No critical alert animation for life-threatening vital values (e.g., HR 0, SpO₂ 70%)

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

- The 33-action catalog without scenario filtering (ISSUE-12) creates high cognitive load on the Actions screen, especially for novice learners encountering pediatric-specific or STEMI-specific drugs during an arrest scenario.
- The vital unlock mechanic is a positive pedagogical tool (forces assessment before data access), but the 10px "Perform Inspection to unlock" text and absent explanation create friction for new users (ISSUE-17).

---

## 13. Priority Recommendations

### Priority 1 — Critical (Accessibility + Layout Bugs)

| # | Issue | File | Recommended Fix |
|---|---|---|---|
| P1-A | Merge dual sticky headers | [`App.tsx:341`](src/App.tsx:341), [`MiniMonitor.tsx`](src/components/MiniMonitor.tsx) | Integrate MiniMonitor as collapsible row inside Header; target ≤ 64px combined |
| P1-B | Fix clinical notes positioning | [`PatientView.tsx:239`](src/components/PatientView.tsx:239) | Replace `absolute bottom-24` with in-flow element and `pb-24` on parent |
| P1-C | Fix intervention badge position | [`PatientView.tsx:184`](src/components/PatientView.tsx:184) | Move to in-flow row below `<header>`, cap at 3 with "+N" overflow |
| P1-D | Raise BottomNav label contrast | [`BottomNav.tsx:53`](src/components/BottomNav.tsx:53) | `text-slate-500` inactive (was `text-slate-400 opacity-60`), `text-[11px]` minimum |
| P1-E | Fix VitalCard locked contrast | [`VitalCard.tsx:46`](src/components/VitalCard.tsx:46) | Use `text-slate-400` (ratio ~3.5:1) for `--` placeholder; add border or icon |
| P1-F | Add focus trap to modals | All modal components | Implement focus trap on `ProcedureGuide`, `IncorrectActionWidget`, `EndConfirmDialog` |
| P1-G | Add ARIA roles to key elements | Multiple components | `role="dialog"` on IncorrectActionWidget; `aria-label` on ECG canvas; `aria-label` on PatientView section |

### Priority 2 — High (UX Friction + Navigation)

| # | Issue | File | Recommended Fix |
|---|---|---|---|
| P2-A | Add next-step hint to rejection | [`IncorrectActionWidget.tsx`](src/components/IncorrectActionWidget.tsx) | Include `expectedActionId` in rejection message from engine |
| P2-B | Fix "Review Protocol" navigation | [`App.tsx:329`](src/App.tsx:329), [`EvaluationSummary.tsx`](src/components/EvaluationSummary.tsx) | Open ProcedureGuide as portal overlay on debrief; do not destroy summary |
| P2-C | Add tab-switch transitions | [`App.tsx:347-368`](src/App.tsx:347) | `animate-in fade-in slide-in-from-bottom-2` on tab content mount |
| P2-D | Fix progress bar at 0% for arrests | [`scenarioProgress.ts`](src/lib/scenarioProgress.ts) | Add elapsed-time micro-contribution (e.g., 0.5% per 10 seconds) |
| P2-E | Vital unlock affordance | [`VitalCard.tsx:52`](src/components/VitalCard.tsx:52) | Increase to `text-xs` (12px), add visible instructional banner on first view |
| P2-F | VitalCard unlock animation | [`VitalCard.tsx`](src/components/VitalCard.tsx) | Add `animate-in fade-in zoom-in-95` on value reveal |
| P2-G | Toast position during MiniMonitor | [`Toast.tsx:73`](src/components/Toast.tsx:73) | Increase `top-[72px]` to `top-[120px]` when MiniMonitor is active |

### Priority 3 — Medium (Polish & Consistency)

| # | Issue | File | Recommended Fix |
|---|---|---|---|
| P3-A | Standardize bottom sheet border radius | `ProcedureGuide`, `ScenarioPreviewModal` | Use `rounded-t-[2.5rem]` consistently |
| P3-B | Promote inline hex colors to tokens | `VitalCard.tsx`, `StatusDashboard.tsx` | Use `vital.hr`, `vital.bp` etc from Tailwind config |
| P3-C | Remove App.css Vite scaffolding | [`src/App.css`](src/App.css) | Delete `.logo`, `.read-the-docs`, `.card` rules |
| P3-D | Fix clip-path Safari compatibility | [`OnboardingTour.tsx:198`](src/components/OnboardingTour.tsx:198) | Replace with four-panel overlay approach |
| P3-E | Promote indigo to brand token | [`tailwind.config.js`](tailwind.config.js) | Add `accent: { indigo: '#4f46e5' }` or replace with `medical-900` |
| P3-F | Remove dark mode stub | [`src/index.css:53`](src/index.css:53) | Remove `.dark .glass-morphism` or fully implement dark mode toggle |
| P3-G | Add session history to Library | [`LibraryScreen.tsx`](src/components/LibraryScreen.tsx) | Use `useLiveQuery` to show last 3 run scores per card (ISSUE-27) |
| P3-H | ECG canvas accessibility | [`ECGWaveform.tsx:221`](src/components/ECGWaveform.tsx:221) | Add `role="img" aria-label={label}` to canvas element |
| P3-I | HelpCircle icon semantics | [`PatientView.tsx:113`](src/components/PatientView.tsx:113) | Replace with `AlertTriangle` in EndConfirmDialog |

---

## 14. Summary Scorecard

| Dimension | Score | Rating |
|---|---|---|
| Visual Hierarchy | 7/10 | Good — dual sticky header is the main deficit |
| Typography | 6/10 | Good system; 10px micro-labels fail accessibility |
| Color System | 7/10 | Coherent palette; token drift and inline hex issues |
| Spacing System | 7/10 | Consistent; two critical absolute-positioning bugs |
| Component Consistency | 7/10 | Generally uniform; border-radius fragmentation |
| Accessibility (WCAG AA) | 5/10 | Several contrast failures; missing ARIA roles; no focus traps |
| Responsive Behavior | 6/10 | Mobile-first approach is correct; 375px defects are critical |
| Interaction Design | 8/10 | Strong press/hover patterns; missing tab transitions |
| Navigation Clarity | 7/10 | Tab flow is clear; debrief-protocol nav bug is critical |
| Brand Identity | 8/10 | Distinctive medical teal identity; indigo accent undefined |
| Engagement / Learning UX | 8/10 | Strong debrief; vital unlock mechanic; cross-session history missing |
| **Overall** | **6.9/10** | **Good foundation with targeted accessibility and layout remediation needed** |

---

## Appendix: Component Quick Reference

| Component | File | Key Design Tokens | Primary Issues |
|---|---|---|---|
| `Header` | [`src/components/Header.tsx`](src/components/Header.tsx) | `medical-500`, `slate-800` | None active |
| `MiniMonitor` | [`src/components/MiniMonitor.tsx`](src/components/MiniMonitor.tsx) | `slate-900`, `green-400`, `blue-400`, `cyan-400` | ISSUE-20 dual sticky |
| `BottomNav` | [`src/components/BottomNav.tsx`](src/components/BottomNav.tsx) | `medical-50`, `medical-600`, `slate-400` | Contrast failure on inactive labels |
| `PatientView` | [`src/components/PatientView.tsx`](src/components/PatientView.tsx) | `red-500`, `indigo-600`, `white/90` | ISSUE-09, ISSUE-11 |
| `ActionsScreen` | [`src/components/ActionsScreen.tsx`](src/components/ActionsScreen.tsx) | `medical-500`, per-action hex colors | ISSUE-12 (ignored) |
| `StatusDashboard` | [`src/components/StatusDashboard.tsx`](src/components/StatusDashboard.tsx) | `medical-500`, `emerald-500`, `amber-500` | ISSUE-19 |
| `ECGWaveform` | [`src/components/ECGWaveform.tsx`](src/components/ECGWaveform.tsx) | Rhythm-specific (emerald/amber/red/grey/violet) | No ARIA; ISSUE-16 fixed |
| `VitalCard` | [`src/components/VitalCard.tsx`](src/components/VitalCard.tsx) | Per-vital color, `slate-300` locked | Contrast failure; ISSUE-17 |
| `LibraryScreen` | [`src/components/LibraryScreen.tsx`](src/components/LibraryScreen.tsx) | `medical-500`, `indigo-600` (gradient) | ISSUE-27 |
| `EvaluationSummary` | [`src/components/EvaluationSummary.tsx`](src/components/EvaluationSummary.tsx) | `emerald-500`, `red-500`, `indigo-500` per tier | ISSUE-25 |
| `ProcedureGuide` | [`src/components/ProcedureGuide.tsx`](src/components/ProcedureGuide.tsx) | `medical-500`, `medical-600` | ISSUE-14 placeholder |
| `IncorrectActionWidget` | [`src/components/IncorrectActionWidget.tsx`](src/components/IncorrectActionWidget.tsx) | `red-500→red-600` gradient | ISSUE-13, ISSUE-28 |
| `OnboardingTour` | [`src/components/OnboardingTour.tsx`](src/components/OnboardingTour.tsx) | `medical-500`, `slate-900/60` overlay | ISSUE-29 Safari clip-path |
| `Toast` | [`src/components/Toast.tsx`](src/components/Toast.tsx) | Semantic per-variant | Toast position during MiniMonitor |
| `ContextualOverlay` | [`src/components/ContextualOverlay.tsx`](src/components/ContextualOverlay.tsx) | `blue-900/10`, dynamic opacity | None — well implemented |

---

*Report generated by systematic codebase analysis of all UI components, styling files, and existing UX documentation. Cross-referenced against WCAG 2.1 AA, Apple HIG mobile touch targets, and clinical UI design conventions.*
