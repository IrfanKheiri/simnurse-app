import { useState, useCallback, useEffect, useRef } from 'react';
import { HELP_CONTENT, type AppContext, type ContextHelpContent } from '../data/helpContent';
import { db } from '../lib/db';

const COMPLETED_KEY = 'simnurse_completed_walkthroughs'; // JSON string[]
const FEEDBACK_KEY = 'simnurse_help_feedback';           // JSON FeedbackEntry[]

interface FeedbackEntry {
  topicId: string;
  context: AppContext;
  rating: 'up' | 'down';
  comment?: string;
  timestamp: number;
}

export interface HelpSystemState {
  context: AppContext;
  panelOpen: boolean;
  walkthroughActive: boolean;
  walkthroughId: string | null;
  walkthroughStepIndex: number;
  content: ContextHelpContent;
}

export interface HelpSystemActions {
  openPanel(): void;
  closePanel(): void;
  startWalkthrough(id?: string): void;
  resumeWalkthrough(): void;
  nextStep(): void;
  prevStep(): void;
  completeWalkthrough(): void;
  skipWalkthrough(): void;
  wasWalkthroughCompleted(id: string): boolean;
  submitFeedback(topicId: string, rating: 'up' | 'down', comment?: string): void;
  resetAll(): Promise<void>;
}

export function useHelpSystem(context: AppContext): HelpSystemState & HelpSystemActions {
  const [panelOpen, setPanelOpen] = useState(false);
  const [walkthroughActive, setWalkthroughActive] = useState(false);
  const [walkthroughId, setWalkthroughId] = useState<string | null>(null);
  const [walkthroughStepIndex, setWalkthroughStepIndex] = useState(0);

  // Refs that mirror state — used inside async callbacks to avoid stale closures
  const panelOpenRef = useRef(panelOpen);
  const walkthroughActiveRef = useRef(walkthroughActive);
  const walkthroughIdRef = useRef(walkthroughId);

  // content is derived synchronously — no state needed
  const content = HELP_CONTENT[context];

  const wasWalkthroughCompleted = useCallback((id: string): boolean => {
    try {
      const completed: string[] = JSON.parse(
        localStorage.getItem(COMPLETED_KEY) ?? '[]'
      );
      return completed.includes(id);
    } catch {
      return false;
    }
  }, []);

  // Internal: pause walkthrough without writing to localStorage.
  // Preserves walkthroughStepIndex so "Resume" can continue from where paused.
  const _pauseWalkthrough = useCallback(() => {
    setWalkthroughActive(false);
  }, []);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    // Does NOT affect walkthrough state
  }, []);

  const openPanel = useCallback(() => {
    // Mutual exclusion: pause (not skip) any active walkthrough
    _pauseWalkthrough();
    setPanelOpen(true);
  }, [_pauseWalkthrough]);

  const resumeWalkthrough = useCallback(() => {
    closePanel();
    setWalkthroughActive(true);
    // Does NOT reset walkthroughStepIndex — picks up where paused
  }, [closePanel]);

  const startWalkthrough = useCallback(
    (id?: string) => {
      const targetId = id ?? HELP_CONTENT[context].walkthroughId;
      // Mutual exclusion: pause any in-progress tour first
      _pauseWalkthrough();
      // Close panel (mutual exclusion)
      closePanel();
      setWalkthroughId(targetId);
      setWalkthroughStepIndex(0);
      setWalkthroughActive(true);
    },
    [context, _pauseWalkthrough, closePanel]
  );

  const nextStep = useCallback(() => {
    setWalkthroughStepIndex((prev) => {
      const lastIndex = HELP_CONTENT[context].steps.length - 1;
      if (prev < lastIndex) {
        return prev + 1;
      }
      // At last step: no-op (caller must use completeWalkthrough())
      return prev;
    });
  }, [context]);

  const prevStep = useCallback(() => {
    setWalkthroughStepIndex((prev) => {
      if (prev > 0) {
        return prev - 1;
      }
      // At index 0: no-op
      return prev;
    });
  }, []);

  const completeWalkthrough = useCallback(() => {
    setWalkthroughActive(false);
    if (walkthroughId !== null) {
      try {
        const completed: string[] = JSON.parse(
          localStorage.getItem(COMPLETED_KEY) ?? '[]'
        );
        if (!completed.includes(walkthroughId)) {
          completed.push(walkthroughId);
          localStorage.setItem(COMPLETED_KEY, JSON.stringify(completed));
        }
      } catch {
        // Silently fail if localStorage is unavailable
      }
    }
  }, [walkthroughId]);

  const skipWalkthrough = useCallback(() => {
    // "Not now" — does NOT write to localStorage (not the same as complete)
    setWalkthroughActive(false);
    setWalkthroughStepIndex(0);
  }, []);

  const resetAll = useCallback(async () => {
    const LS_KEYS = [
      'simnurse_completed_walkthroughs',
      'simnurse_help_feedback',
      'simnurse_help_migration_v2',
      'simnurse_onboarding_complete',
      'simnurse_welcome_dismissed',
      'suppressedProcedures',
    ];
    LS_KEYS.forEach((key) => localStorage.removeItem(key));
    try {
      await db.sessionLogs.clear();
    } catch {
      // Silently fail if Dexie is unavailable
    }
    window.location.reload();
  }, []);

  const submitFeedback = useCallback(
    (topicId: string, rating: 'up' | 'down', comment?: string) => {
      try {
        const existing: FeedbackEntry[] = JSON.parse(
          localStorage.getItem(FEEDBACK_KEY) ?? '[]'
        );
        const newEntry: FeedbackEntry = {
          topicId,
          context,
          rating,
          comment,
          timestamp: Date.now(),
        };
        // If entries >= 200: drop oldest 50 before appending (keep 150 + new = 151)
        const trimmed =
          existing.length >= 200 ? existing.slice(50) : existing;
        trimmed.push(newEntry);
        localStorage.setItem(FEEDBACK_KEY, JSON.stringify(trimmed));
      } catch {
        // Silently fail if localStorage is unavailable
      }
    },
    [context]
  );

  // Sync effects — keep refs current every render (no dep array = runs every render)
  useEffect(() => { panelOpenRef.current = panelOpen; });
  useEffect(() => { walkthroughActiveRef.current = walkthroughActive; });
  useEffect(() => { walkthroughIdRef.current = walkthroughId; });

  // One-time localStorage migration (empty deps — runs once on mount)
  useEffect(() => {
    if (localStorage.getItem('simnurse_onboarding_complete') === 'true') {
      try {
        const completed: string[] = JSON.parse(
          localStorage.getItem(COMPLETED_KEY) ?? '[]'
        );
        if (!completed.includes('library-tour')) {
          completed.push('library-tour');
          localStorage.setItem(COMPLETED_KEY, JSON.stringify(completed));
        }
        // Do NOT remove the legacy key — other code may still reference it
      } catch {
        // Silently fail
      }
    }

    // Migration v2 — clear tours that were incorrectly auto-completed
    // due to missing DOM target IDs (fixed in v1.1). Only runs once.
    const MIGRATION_V2_KEY = 'simnurse_help_migration_v2';
    if (!localStorage.getItem(MIGRATION_V2_KEY)) {
      try {
        const poisonedTours = ['patient-tour', 'actions-tour', 'status-tour', 'debrief-tour', 'preview-tour'];
        const completed: string[] = JSON.parse(
          localStorage.getItem(COMPLETED_KEY) ?? '[]'
        );
        const cleaned = completed.filter((id) => !poisonedTours.includes(id));
        localStorage.setItem(COMPLETED_KEY, JSON.stringify(cleaned));
        localStorage.setItem(MIGRATION_V2_KEY, 'true');
      } catch {
        // Silently fail
      }
    }
  }, []);

  // Context-change guard: pause active walkthrough if it belongs to a different context
  useEffect(() => {
    const newId = HELP_CONTENT[context].walkthroughId;
    if (walkthroughActiveRef.current && walkthroughIdRef.current !== newId) {
      _pauseWalkthrough();
    }
  }, [context, _pauseWalkthrough]);

  // Auto-start debounce: start walkthrough 2s after context change if not completed
  useEffect(() => {
    const id = HELP_CONTENT[context].walkthroughId;
    if (wasWalkthroughCompleted(id)) return;

    const timer = setTimeout(() => {
      // Guard: only start if panel is not open at fire time (read ref, not stale closure)
      if (!panelOpenRef.current) {
        startWalkthrough(id);
      }
    }, 2000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);

  return {
    // State
    context,
    panelOpen,
    walkthroughActive,
    walkthroughId,
    walkthroughStepIndex,
    content,
    // Actions
    openPanel,
    closePanel,
    startWalkthrough,
    resumeWalkthrough,
    nextStep,
    prevStep,
    completeWalkthrough,
    skipWalkthrough,
    wasWalkthroughCompleted,
    submitFeedback,
    resetAll,
  };
}
