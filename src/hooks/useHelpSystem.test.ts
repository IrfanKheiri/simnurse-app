import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useHelpSystem } from './useHelpSystem';
import { HELP_CONTENT } from '../data/helpContent';
import type { AppContext } from '../data/helpContent';

const COMPLETED_KEY = 'simnurse_completed_walkthroughs';
const FEEDBACK_KEY = 'simnurse_help_feedback';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function renderLibraryHook() {
  return renderHook(() => useHelpSystem('library' as AppContext));
}

function markCompleted(id: string) {
  const existing: string[] = JSON.parse(
    localStorage.getItem(COMPLETED_KEY) ?? '[]'
  );
  if (!existing.includes(id)) existing.push(id);
  localStorage.setItem(COMPLETED_KEY, JSON.stringify(existing));
}

// ─────────────────────────────────────────────────────────────────────────────
// Walkthrough Navigation
// ─────────────────────────────────────────────────────────────────────────────

describe('walkthrough navigation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('startWalkthrough sets walkthroughActive true and stepIndex 0', () => {
    const { result } = renderLibraryHook();

    act(() => {
      result.current.startWalkthrough();
    });

    expect(result.current.walkthroughActive).toBe(true);
    expect(result.current.walkthroughStepIndex).toBe(0);
  });

  it('nextStep increments stepIndex', () => {
    const { result } = renderLibraryHook();

    act(() => {
      result.current.startWalkthrough();
    });
    act(() => {
      result.current.nextStep();
    });

    expect(result.current.walkthroughStepIndex).toBe(1);
  });

  it('nextStep is a no-op at last step', () => {
    const { result } = renderLibraryHook();
    const content = HELP_CONTENT['library'];
    const lastIndex = content.steps.length - 1;

    act(() => {
      result.current.startWalkthrough();
    });

    // Advance to the last step
    for (let i = 0; i < lastIndex; i++) {
      act(() => {
        result.current.nextStep();
      });
    }

    expect(result.current.walkthroughStepIndex).toBe(lastIndex);

    // One more nextStep should be a no-op
    act(() => {
      result.current.nextStep();
    });

    expect(result.current.walkthroughStepIndex).toBe(lastIndex);
  });

  it('prevStep decrements stepIndex', () => {
    const { result } = renderLibraryHook();

    act(() => {
      result.current.startWalkthrough();
    });
    act(() => {
      result.current.nextStep();
    });
    act(() => {
      result.current.prevStep();
    });

    expect(result.current.walkthroughStepIndex).toBe(0);
  });

  it('prevStep is a no-op at index 0', () => {
    const { result } = renderLibraryHook();

    act(() => {
      result.current.startWalkthrough();
    });
    // index is already 0
    act(() => {
      result.current.prevStep();
    });

    expect(result.current.walkthroughStepIndex).toBe(0);
  });

  it('skipWalkthrough sets walkthroughActive false and resets to step 0', () => {
    const { result } = renderLibraryHook();

    act(() => {
      result.current.startWalkthrough();
    });
    act(() => {
      result.current.nextStep();
    });
    expect(result.current.walkthroughStepIndex).toBe(1);

    act(() => {
      result.current.skipWalkthrough();
    });

    expect(result.current.walkthroughActive).toBe(false);
    expect(result.current.walkthroughStepIndex).toBe(0);
  });

  it('skipWalkthrough does NOT write to localStorage', () => {
    const { result } = renderLibraryHook();

    act(() => {
      result.current.startWalkthrough();
    });
    act(() => {
      result.current.skipWalkthrough();
    });

    const raw = localStorage.getItem(COMPLETED_KEY);
    // Either null (key never set) or an array that does NOT contain library-tour.
    // We pre-marked it in beforeEach — verify it is NOT present after skip.
    // Reset to empty first so the test is pristine.
    localStorage.removeItem(COMPLETED_KEY);

    // Render fresh hook and skip
    const { result: result2 } = renderLibraryHook();
    act(() => {
      result2.current.startWalkthrough();
    });
    act(() => {
      result2.current.skipWalkthrough();
    });

    const rawAfterSkip = localStorage.getItem(COMPLETED_KEY);
    if (rawAfterSkip !== null) {
      const arr: string[] = JSON.parse(rawAfterSkip);
      expect(arr).not.toContain('library-tour');
    } else {
      // null is also acceptable — key was never written
      expect(rawAfterSkip).toBeNull();
    }
    // Suppress unused-variable lint for first `raw` snapshot
    void raw;
  });

  it('completeWalkthrough sets walkthroughActive false and writes to localStorage', () => {
    const { result } = renderLibraryHook();

    act(() => {
      result.current.startWalkthrough();
    });
    act(() => {
      result.current.completeWalkthrough();
    });

    expect(result.current.walkthroughActive).toBe(false);
    expect(result.current.wasWalkthroughCompleted('library-tour')).toBe(true);

    const raw = localStorage.getItem(COMPLETED_KEY);
    expect(raw).not.toBeNull();
    const arr: string[] = JSON.parse(raw!);
    expect(arr).toContain('library-tour');
  });

  it('startWalkthrough always starts even if already completed', () => {
    markCompleted('library-tour');
    const { result } = renderLibraryHook();

    act(() => {
      result.current.startWalkthrough();
    });

    expect(result.current.walkthroughActive).toBe(true);
    expect(result.current.walkthroughStepIndex).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Panel Mutual Exclusion
// ─────────────────────────────────────────────────────────────────────────────

describe('panel mutual exclusion', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('openPanel sets panelOpen true and pauses walkthrough', () => {
    const { result } = renderLibraryHook();

    act(() => {
      result.current.startWalkthrough();
    });
    act(() => {
      result.current.nextStep();
    });
    expect(result.current.walkthroughStepIndex).toBe(1);

    act(() => {
      result.current.openPanel();
    });

    expect(result.current.panelOpen).toBe(true);
    expect(result.current.walkthroughActive).toBe(false);
    // Step index is preserved (not reset)
    expect(result.current.walkthroughStepIndex).toBe(1);
  });

  it('openPanel does NOT write to localStorage', () => {
    const { result } = renderLibraryHook();

    act(() => {
      result.current.startWalkthrough();
    });
    // Clear completed key to start fresh for this check
    localStorage.removeItem(COMPLETED_KEY);

    act(() => {
      result.current.openPanel();
    });

    const raw = localStorage.getItem(COMPLETED_KEY);
    if (raw !== null) {
      const arr: string[] = JSON.parse(raw);
      expect(arr).not.toContain('library-tour');
    } else {
      expect(raw).toBeNull();
    }
  });

  it('closePanel sets panelOpen false', () => {
    const { result } = renderLibraryHook();

    act(() => {
      result.current.openPanel();
    });
    expect(result.current.panelOpen).toBe(true);

    act(() => {
      result.current.closePanel();
    });

    expect(result.current.panelOpen).toBe(false);
  });

  it('startWalkthrough closes panel', () => {
    const { result } = renderLibraryHook();

    act(() => {
      result.current.openPanel();
    });
    expect(result.current.panelOpen).toBe(true);

    act(() => {
      result.current.startWalkthrough();
    });

    expect(result.current.panelOpen).toBe(false);
    expect(result.current.walkthroughActive).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Feedback
// ─────────────────────────────────────────────────────────────────────────────

describe('feedback', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('submitFeedback appends entry to localStorage', () => {
    const { result } = renderLibraryHook();

    act(() => {
      result.current.submitFeedback('lib-tip-1', 'up');
    });

    const raw = localStorage.getItem(FEEDBACK_KEY);
    expect(raw).not.toBeNull();
    const entries = JSON.parse(raw!);
    expect(entries).toHaveLength(1);
    expect(entries[0].topicId).toBe('lib-tip-1');
    expect(entries[0].rating).toBe('up');
    expect(entries[0].context).toBe('library');
  });

  it('submitFeedback with comment stores comment', () => {
    const { result } = renderLibraryHook();

    act(() => {
      result.current.submitFeedback('lib-tip-1', 'down', 'needs clarification');
    });

    const raw = localStorage.getItem(FEEDBACK_KEY);
    const entries = JSON.parse(raw!);
    expect(entries[0].comment).toBe('needs clarification');
  });

  it('submitFeedback caps entries at 200 and drops oldest 50', () => {
    // Pre-populate 200 entries
    const existing = Array.from({ length: 200 }, (_, i) => ({
      topicId: `tip-${i}`,
      context: 'library' as AppContext,
      rating: 'up' as const,
      timestamp: Date.now() - (200 - i) * 1000,
    }));
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(existing));

    const { result } = renderLibraryHook();

    act(() => {
      result.current.submitFeedback('test-tip', 'up');
    });

    const raw = localStorage.getItem(FEEDBACK_KEY);
    const entries: Array<{ topicId: string }> = JSON.parse(raw!);

    // 200 - 50 = 150, then + 1 new entry = 151
    expect(entries).toHaveLength(151);

    // The first 50 original entries (tip-0 … tip-49) must be gone
    const tipIds = entries.map((e) => e.topicId);
    for (let i = 0; i < 50; i++) {
      expect(tipIds).not.toContain(`tip-${i}`);
    }

    // The new entry is at the end
    expect(tipIds[tipIds.length - 1]).toBe('test-tip');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

describe('context', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('wasWalkthroughCompleted returns false initially', () => {
    localStorage.removeItem(COMPLETED_KEY);
    const { result } = renderLibraryHook();

    // No walkthroughs completed yet
    expect(result.current.wasWalkthroughCompleted('library-tour')).toBe(false);
  });

  it('wasWalkthroughCompleted returns true after completeWalkthrough', () => {
    // Mark fresh for this test
    localStorage.removeItem(COMPLETED_KEY);
    const { result } = renderLibraryHook();

    act(() => {
      result.current.startWalkthrough();
    });
    act(() => {
      result.current.completeWalkthrough();
    });

    expect(result.current.wasWalkthroughCompleted('library-tour')).toBe(true);
  });

  it('content changes when context changes', () => {
    const { result, rerender } = renderHook(
      ({ ctx }: { ctx: AppContext }) => useHelpSystem(ctx),
      { initialProps: { ctx: 'library' as AppContext } }
    );

    const libraryWalkthroughId = result.current.content.walkthroughId;
    expect(libraryWalkthroughId).toBe('library-tour');

    rerender({ ctx: 'patient' as AppContext });

    expect(result.current.content.walkthroughId).toBe('patient-tour');
    expect(result.current.content.walkthroughId).not.toBe(libraryWalkthroughId);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Manual startup only (fake timers)
// ─────────────────────────────────────────────────────────────────────────────

describe('manual startup only (fake timers)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('does not auto-start after 2000ms on first context visit', () => {
    const { result } = renderLibraryHook();

    expect(result.current.walkthroughActive).toBe(false);

    act(() => {
      vi.advanceTimersByTime(2100);
    });

    expect(result.current.walkthroughActive).toBe(false);
  });

  it('still allows manual start after the debounce window passes', () => {
    const { result } = renderLibraryHook();

    act(() => {
      vi.advanceTimersByTime(2100);
    });

    act(() => {
      result.current.startWalkthrough();
    });

    expect(result.current.walkthroughActive).toBe(true);
    expect(result.current.walkthroughId).toBe('library-tour');
    expect(result.current.walkthroughStepIndex).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// localStorage Migration
// ─────────────────────────────────────────────────────────────────────────────

describe('localStorage migration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('migrates simnurse_onboarding_complete to new key on mount', () => {
    // Set legacy key BEFORE render
    localStorage.setItem('simnurse_onboarding_complete', 'true');
    // Clear the new key so migration has something to do
    localStorage.removeItem(COMPLETED_KEY);

    const { result } = renderLibraryHook();

    // After mount, library-tour should be in completed list
    expect(result.current.wasWalkthroughCompleted('library-tour')).toBe(true);

    // Legacy key must NOT be removed — other code may still reference it
    expect(localStorage.getItem('simnurse_onboarding_complete')).toBe('true');
  });
});
