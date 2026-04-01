# Speed Up Long-Running Interventions

**Date:** 2026-03-31  
**Status:** Planned  
**Related:** UX improvement, ISSUE-XX (to be created)

---

## 1. Reason for Implementation

### Problem
The simulator runs interventions at 1:1 real time. Long-running interventions (60s–3600s) create "dead air" where the learner has nothing to do but wait. This is particularly problematic for:
- `amiodarone_300mg` (600s / 10 min)
- `epinephrine_1mg` (240s / 4 min)
- `alteplase` (3600s / 60 min)

A learner waiting 10 minutes for a drug to infuse is not engaged in meaningful learning — they're staring at a countdown.

### Why This Approach
Instead of:
- Reducing all durations globally (breaks short-action pacing)
- Fast-forwarding to complete instantly (loses duration-based success conditions)

We implement incremental speedup:
- Press to reduce time until the shortest long intervention has 5s left
- The intervention continues to expire naturally (success_state still applies correctly)
- The learner can press repeatedly to gradually accelerate through long waits

This preserves clinical model accuracy while giving learners control over pacing.

---

## 2. Explanation

### How It Works

1. **Identify eligible interventions** — filter `activeInterventions` where `remaining_sec > 10`
2. **Find shortest** — sort eligible by remaining time, pick the minimum
3. **Calculate delta** — `delta = shortest_remaining_sec - 5`
4. **Advance elapsedSec** — increase `elapsedSec` by delta
5. **Natural expiry** — intervention continues; when timer reaches 0, engine applies success_state normally

### Example Flow

```
Initial:
├─ Epinephrine: 120s remaining
├─ Amiodarone: 60s remaining  ← shortest > 10s
└─ Defibrillate: 8s remaining  ← ignored (< 10s)

User clicks speedup:
├─ Amiodarone: 60s → 5s (delta: 55s)
├─ Epinephrine: 120s → 65s (reduced proportionally)
└─ Defibrillate: 8s (unchanged)

User clicks again later:
├─ Epinephrine: 65s → 5s (delta: 60s)
└─ Amiodarone: 5s → will expire naturally
```

### Design Decisions

| Decision | Rationale |
|----------|-----------|
| Threshold: > 10s | Preserve short-action pacing (10s, 15s, 30s interventions remain unaffected) |
| Target: 5s remaining | Gives learner a visible "almost done" window |
| Reduce time only, don't expire early | Preserves success_state application at natural expiry; simpler implementation |
| Hide button if all ≤ 10s | Clean UX — nothing to speed up |
| Ignore interventions with no duration_sec | These are instantaneous/one-shot actions, not timers |

---

## 3. Implementation Details

### 3.1 Type Definitions

**File:** `src/types/scenario.ts`

```typescript
// Add to EngineEvent union
export type EngineEvent =
  | // ... existing
  | {
      event_type: 'speedup';
      scenario_id: string;
      session_id: string;
      timestamp: number;
      details: {
        target_remaining_sec: number;
        shortest_remaining_sec_before: number;
        delta_seconds: number;
      };
    };
```

### 3.2 Engine Logic

**File:** `src/hooks/useScenarioEngine.ts`

**Add to EngineAction type:**
```typescript
type EngineAction =
  | { type: 'speedup_time'; targetRemainingSec: number }
  | // ... existing
```

**Add reducer handler (in tick handler or separate case):**
```typescript
// In the reducer, handle 'speedup_time':
case 'speedup_time': {
  const targetRemainingSec = action.targetRemainingSec;
  
  // Find eligible interventions (remaining > 10s, has duration_sec)
  const eligible = state.activeInterventions.filter(intervention => {
    if (intervention.duration_sec === undefined) return false;
    const remaining = intervention.duration_sec - (state.elapsedSec - intervention.start_time);
    return remaining > 10;
  });
  
  if (eligible.length === 0) return state; // Nothing to speed up
  
  // Find shortest
  const sorted = [...eligible].sort((a, b) => {
    const remainingA = a.duration_sec! - (state.elapsedSec - a.start_time);
    const remainingB = b.duration_sec! - (state.elapsedSec - b.start_time);
    return remainingA - remainingB;
  });
  const shortest = sorted[0];
  const shortestRemaining = shortest.duration_sec! - (state.elapsedSec - shortest.start_time);
  
  // Calculate delta to reach target
  const delta = shortestRemaining - targetRemainingSec;
  if (delta <= 0) return state; // Already at or below target
  
  // Advance elapsedSec — this automatically reduces all remaining times
  const nextElapsedSec = state.elapsedSec + delta;
  
  // Emit speedup event
  const speedupEvent: EngineEvent = {
    event_type: 'speedup',
    scenario_id: state.scenario?.scenario_id ?? '',
    session_id: state.sessionId,
    timestamp: Date.now(),
    details: {
      target_remaining_sec: targetRemainingSec,
      shortest_remaining_sec_before: shortestRemaining,
      delta_seconds: delta,
    },
  };
  
  return {
    ...state,
    elapsedSec: nextElapsedSec,
    eventQueue: [...state.eventQueue, speedupEvent],
  };
}
```

### 3.3 Hook Exports

**File:** `src/hooks/useScenarioEngine.ts`

```typescript
// In the hook's returned object:
const {
  // ... existing
  speedupTime: (targetRemainingSec: number) => dispatch({ type: 'speedup_time', targetRemainingSec }),
  canSpeedup: activeInterventions.some(i => {
    if (i.duration_sec === undefined) return false;
    const remaining = i.duration_sec - (elapsedSec - i.start_time);
    return remaining > 10;
  }),
} = useScenarioEngine(scenario);
```

### 3.4 Header UI

**File:** `src/components/Header.tsx`

**Add to intervention-timers section (around line 418):**

```tsx
{/* Speedup button - appears when any intervention > 10s remaining */}
{(() => {
  const hasLongRunning = interventionTimerItems.some(item => item.remainingSec > 10);
  if (!hasLongRunning) return null;
  
  const shortestRemaining = Math.min(
    ...interventionTimerItems
      .filter(item => item.remainingSec > 10)
      .map(item => item.remainingSec)
  );
  
  return (
    <button
      type="button"
      onClick={() => speedupTime(5)}
      className="mt-2 text-[10px] text-cyan-300 hover:text-white underline decoration-cyan-300/50 hover:decoration-white transition-colors"
      title="Speed up time until the shortest long intervention has 5s remaining"
    >
      ▶ Speed up ({Math.round(shortestRemaining)}s → 5s)
    </button>
  );
})()}
```

**Note:** `speedupTime` and `canSpeedup` must be passed into Header via props from App.tsx.

### 3.5 Integration with App.tsx

**File:** `src/App.tsx`

Pass speedup functions to Header:

```tsx
<Header
  // ... existing props
  onSpeedupTime={(targetRemainingSec) => speedupTime(targetRemainingSec)}
  canSpeedup={canSpeedup}
/>
```

---

## 4. Edge Cases

| Case | Handling |
|------|----------|
| No active interventions > 10s | Button hidden |
| Only one long intervention | Works normally |
| User clicks when shortest is 8s | Button hidden (≤ 10s) |
| Intervention with no duration_sec | Ignored in calculation |
| Clicking doesn't change state (already at target) | Guard in reducer returns unchanged state |

---

## 5. Trade-offs

| Gain | Loss |
|------|------|
| Learner controls pacing | Multiple clicks needed for very long interventions |
| Preserves clinical model fidelity | Duration-based success conditions may satisfy earlier |
| Simple implementation (just advance elapsedSec) | — |
| Short actions (< 10s) unaffected | — |

---

## 6. Testing

### Unit Tests

```typescript
// In useScenarioEngine.test.ts

it('speedup reduces time to target and emits event', () => {
  // Setup scenario with 60s intervention
  // Advance time so intervention has 30s remaining
  // Call speedupTime(5)
  // Expect elapsedSec increased by 25
  // Expect speedup event in eventQueue
});

it('speedup is no-op when no interventions > 10s', () => {
  // All active interventions have < 10s remaining
  // Call speedupTime(5)
  // Expect state unchanged
});

it('speedup ignores interventions without duration_sec', () => {
  // One intervention has duration, one doesn't
  // Call speedupTime(5)
  // Expect only the one with duration considered
});
```

### Manual Test

1. Start a scenario with known long interventions (e.g., `adult_vfib_arrest_witnessed` → amiodarone)
2. Observe intervention timer in Header
3. Click "Speed up" button
4. Verify time reduces, other timers also reduce proportionally
5. Verify intervention eventually expires naturally and applies success_state

---

## 7. Files to Modify

| File | Changes |
|------|---------|
| `src/types/scenario.ts` | Add `SpeedupEvent` to `EngineEvent` union |
| `src/hooks/useScenarioEngine.ts` | Add `speedup_time` action + reducer handler; expose `speedupTime` and `canSpeedup` |
| `src/components/Header.tsx` | Add speedup button UI in intervention-timers section |
| `src/App.tsx` | Pass speedup props to Header |
| `src/hooks/useScenarioEngine.test.ts` | Add unit tests |

---

## 8. Estimated Effort

- Types: ~10 lines
- Engine logic: ~40 lines
- Hook exports: ~8 lines
- Header UI: ~20 lines
- App integration: ~5 lines
- Tests: ~30 lines

**Total: ~110 lines across 5 files**