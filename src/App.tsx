import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ActiveIntervention, AdjustableVital, Condition, CompletionEvent, EngineEvent, ManualEndEvent, Scenario, SessionEvent, SessionLogEvent } from './types/scenario';
import CheatOverlay from './components/CheatOverlay';
import ActionsScreen from './components/ActionsScreen';
import BottomNav from './components/BottomNav';
import ContextualOverlay from './components/ContextualOverlay';
import EvaluationSummary, { type ActionFeedback } from './components/EvaluationSummary';
import Header from './components/Header';
import CorrectActionWidget from './components/CorrectActionWidget';
import IncorrectActionWidget from './components/IncorrectActionWidget';
import LibraryScreen from './components/LibraryScreen';
import OnboardingTour from './components/OnboardingTour';
import PatientView from './components/PatientView';
import StatusDashboard from './components/StatusDashboard';
import { ToastProvider } from './components/Toast';
import { useToast } from './components/toast-context';
import { useScenarioEngine } from './hooks/useScenarioEngine';
import { db } from './lib/db';
import { calculateScenarioProgress } from './lib/scenarioProgress';

const APP_SHELL_CLASS =
  'relative flex flex-col min-h-screen w-full max-w-[440px] box-border mx-auto border-x border-slate-100 bg-slate-50 font-sans shadow-2xl';

function cloneScenario(scenario: Scenario): Scenario {
  return structuredClone(scenario);
}

function createSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatTimestamp(simTimeSec: number): string {
  const mins = Math.floor(simTimeSec / 60)
    .toString()
    .padStart(2, '0');
  const secs = (simTimeSec % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

const INTERVENTION_LABELS: Record<string, string> = {
  cpr: 'CPR (High-Quality)',
  defibrillate: 'Defibrillate (AED/Manual)',
  defibrillate_pediatric: 'Defibrillate — Pediatric (2 J/kg)',
  synchronized_cardioversion: 'Synchronized Cardioversion',
  vagal_maneuver: 'Vagal Maneuver',
  rescue_breathing: 'Rescue Breathing (BVM)',
  intubation: 'Advanced Airway (Intubation)',
  oxygen_nrb: 'Oxygen via NRB Mask',
  high_flow_oxygen: 'High-Flow Oxygen (15 L/min)',
  albuterol_nebulizer: 'Albuterol Nebulizer (2.5mg)',
  ipratropium_nebulizer: 'Ipratropium Nebulizer (0.5mg)',
  epinephrine_1mg: 'Epinephrine 1mg IV/IO',
  epinephrine_im_0_5mg: 'Epinephrine 0.5mg IM (1:1,000)',
  epinephrine_im_pediatric: 'Epinephrine 0.01mg/kg IM (Peds)',
  epinephrine_peds_01mgkg: 'Epinephrine 0.01mg/kg IV/IO (Peds)',
  amiodarone_300mg: 'Amiodarone 300mg IV/IO',
  amiodarone_150mg_stable: 'Amiodarone 150mg IV (Stable VTach)',
  amiodarone_peds_5mgkg: 'Amiodarone 5mg/kg IV/IO (Peds)',
  adenosine_6mg: 'Adenosine 6mg Rapid IVP',
  atropine_0_5mg: 'Atropine 0.5mg IV',
  naloxone_2mg: 'Naloxone 2mg IN/IV',
  aspirin_324mg: 'Aspirin 324mg PO',
  ticagrelor_180mg: 'Ticagrelor 180mg PO (Loading)',
  nitroglycerin_04mg: 'Nitroglycerin 0.4mg SL',
  heparin_bolus: 'Heparin Bolus IV (UFH)',
  methylprednisolone_iv: 'Methylprednisolone 1mg/kg IV',
  alteplase: 'Alteplase (rtPA) IV Infusion',
  labetalol_10mg: 'Labetalol 10mg IV',
  normal_saline_bolus: 'Normal Saline Bolus (500mL IV)',
  establish_iv: 'Establish IV/IO Access',
  check_glucose: 'Check Blood Glucose',
  pulse_check: 'Pulse / Rhythm Check',
  transcutaneous_pacing: 'Transcutaneous Pacing (TCP)',
  ct_brain_noncontrast: 'CT Brain (Non-Contrast)',
  activate_cath_lab: 'Activate Cath Lab / PCI Consult',
  left_uterine_displacement: 'Left Uterine Displacement (LUD)',
  perimortem_csection: 'Perimortem Cesarean Delivery (PMCD)',
};

// ─── Cyclic interventions — must be reapplied when they expire ───────────────
// Drugs and one-shot procedures are excluded (their expiry is not actionable).
const CYCLIC_INTERVENTIONS = new Set([
  'cpr',
  'cpr_30_2',
  'cpr_30_2_child',
  'cpr_30_2_infant_2finger',
  'cpr_15_2_child',
  'cpr_15_2_infant_2thumb',
  'resume_cpr_post_shock',
  'rescue_breathing',
  'rescue_breathing_child',
  'rescue_breathing_infant',
  'bag_valve_mask',
  'bag_valve_mask_child',
  'bag_valve_mask_infant',
  'transcutaneous_pacing',
]);

// ─── UrgencyStrip types & helpers ──────────────────────────────────────────

export type UrgencyLevel = 'low' | 'medium' | 'critical';

export interface UrgencyItem {
  key: string;
  type: 'failure' | 'intervention';
  label: string;
  remainingSec: number;
  urgency: UrgencyLevel;
}

const INTERVENTION_SHORT_LABELS: Record<string, string> = {
  cpr: 'CPR',
  cpr_30_2: 'CPR',
  cpr_30_2_child: 'CPR',
  cpr_30_2_infant_2finger: 'CPR',
  cpr_15_2_child: 'CPR',
  cpr_15_2_infant_2thumb: 'CPR',
  defibrillate: 'Defib',
  defibrillate_pediatric: 'Defib',
  aed_attach: 'AED',
  aed_shock: 'Shock',
  synchronized_cardioversion: 'Cardio',
  rescue_breathing: 'RB',
  rescue_breathing_child: 'RB',
  rescue_breathing_infant: 'RB',
  intubation: 'Intub',
  oxygen_nrb: 'O₂',
  high_flow_oxygen: 'O₂',
  bag_valve_mask: 'BVM',
  bag_valve_mask_child: 'BVM',
  bag_valve_mask_infant: 'BVM',
  epinephrine_1mg: 'Epi',
  epinephrine_im_0_5mg: 'Epi',
  epinephrine_im_pediatric: 'Epi',
  epinephrine_peds_01mgkg: 'Epi',
  amiodarone_300mg: 'Amio',
  amiodarone_150mg_stable: 'Amio',
  amiodarone_peds_5mgkg: 'Amio',
  adenosine_6mg: 'Adeno',
  atropine_0_5mg: 'Atrop',
  naloxone_intranasal_4mg: 'Narcan',
  naloxone_intranasal_repeat: 'Narcan',
  naloxone_im_repeat: 'Narcan',
  aspirin_324mg: 'ASA',
  ticagrelor_180mg: 'Tica',
  nitroglycerin_04mg: 'NTG',
  heparin_bolus: 'Hep',
  methylprednisolone_iv: 'MP',
  alteplase: 'tPA',
  labetalol_10mg: 'Label',
  normal_saline_bolus: 'NS',
  establish_iv: 'IV',
  transcutaneous_pacing: 'TCP',
  left_uterine_displacement: 'LUD',
  perimortem_csection: 'PMCD',
  recovery_position: 'Recov',
};

function getInterventionShortLabel(id: string): string {
  return INTERVENTION_SHORT_LABELS[id] ?? id.slice(0, 6).toUpperCase();
}

function getInterventionUrgency(remainingSec: number): UrgencyLevel {
  if (remainingSec < 10) return 'critical';
  if (remainingSec < 30) return 'medium';
  return 'low';
}

function getFailureConditionLabel(condition: Condition, remainingSec: number): string {
  const secs = Math.ceil(remainingSec);
  if (condition.elapsedSecGte !== undefined && !condition.vital) {
    return `⏱ ~${secs}s left`;
  }
  if (condition.vital) {
    const vitalName = condition.vital === 'pulsePresent' ? 'Pulse' : condition.vital.toUpperCase();
    return `⚠ ${vitalName} ~${secs}s`;
  }
  return `⚠ ~${secs}s`;
}

function computeUrgencyItems(
  activeScenario: Scenario | null,
  failureHoldStarts: Record<string, number>,
  elapsedSec: number,
  activeInterventions: ActiveIntervention[],
): UrgencyItem[] {
  const items: UrgencyItem[] = [];

  if (!activeScenario) return items;

  // ── Failure proximity pills ──────────────────────────────────────────────
  for (const [index, condition] of activeScenario.failure_conditions.entries()) {
    // Hold-based vital condition
    if (condition.durationSec !== undefined && condition.durationSec > 3) {
      const holdKey = `failure-${index}`;
      const holdStart = failureHoldStarts[holdKey];
      if (holdStart !== undefined) {
        const holdElapsed = elapsedSec - holdStart;
        const warnThreshold = Math.max(condition.durationSec / 2, condition.durationSec - 12);
        if (holdElapsed >= warnThreshold) {
          const remainingSec = condition.durationSec - holdElapsed;
          if (remainingSec > 0) {
            items.push({
              key: `fail-hold-${index}`,
              type: 'failure',
              label: getFailureConditionLabel(condition, remainingSec),
              remainingSec,
              urgency: remainingSec < 10 ? 'critical' : 'medium',
            });
          }
        }
      }
    }

    // Elapsed-time cutoff condition
    if (condition.elapsedSecGte !== undefined && !condition.vital) {
      const warnFrom = condition.elapsedSecGte - 60;
      if (elapsedSec >= warnFrom) {
        const remainingSec = condition.elapsedSecGte - elapsedSec;
        if (remainingSec > 0) {
          items.push({
            key: `fail-elapsed-${index}`,
            type: 'failure',
            label: getFailureConditionLabel(condition, remainingSec),
            remainingSec,
            urgency: remainingSec < 15 ? 'critical' : 'medium',
          });
        }
      }
    }
  }

  // ── Intervention countdown pills (timed only) ────────────────────────────
  for (const intervention of activeInterventions) {
    if (intervention.duration_sec === undefined) continue;
    const remainingSec = intervention.duration_sec - (elapsedSec - intervention.start_time);
    if (remainingSec <= 0) continue;
    items.push({
      key: `iv-${intervention.id}`,
      type: 'intervention',
      label: getInterventionShortLabel(intervention.id),
      remainingSec,
      urgency: getInterventionUrgency(remainingSec),
    });
  }

  // Sort: failure pills first, then by remaining time ascending
  items.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'failure' ? -1 : 1;
    return a.remainingSec - b.remainingSec;
  });

  return items;
}

function computeVitalDecayRates(
  activeScenario: Scenario | null,
  activeInterventions: ActiveIntervention[],
): Partial<Record<AdjustableVital, number>> {
  if (!activeScenario) return {};

  const rates: Partial<Record<AdjustableVital, number>> = {};

  // Baseline progressions
  for (const prog of activeScenario.baseline_progressions) {
    const perSec = prog.modifier / prog.interval_sec;
    rates[prog.vital] = (rates[prog.vital] ?? 0) + perSec;
  }

  // Active intervention rate_modifiers
  for (const intervention of activeInterventions) {
    const definition = activeScenario.interventions[intervention.id];
    if (!definition?.rate_modifiers) continue;
    for (const rm of definition.rate_modifiers) {
      const perSec = rm.modifier / rm.interval_sec;
      rates[rm.vital] = (rates[rm.vital] ?? 0) + perSec;
    }
  }

  return rates;
}

// ─── End UrgencyStrip helpers ───────────────────────────────────────────────

function prettifyInterventionId(interventionId: string): string {
  return INTERVENTION_LABELS[interventionId] ??
    interventionId.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function isInterventionLog(log: SessionLogEvent): log is Extract<SessionLogEvent, { event_type: 'intervention' }> {
  return log.event_type === 'intervention';
}

function buildActionFeedback(
  logs: SessionLogEvent[],
  scenario: Scenario | null,
): ActionFeedback[] {
  const interventionLogs = logs.filter(isInterventionLog);
  const sequence = scenario?.expected_sequence ?? [];

  // Replay pass: compute expected action at each rejected step
  let seqPos = 0;
  const expectedMap = new Map<string, { label: string; rationale: string | undefined }>();

  for (const log of interventionLogs) {
    const logId = log.id?.toString() ?? `${log.session_id}-${log.timestamp}`;
    const isDuplicateMsg =
      log.details.rejected === true &&
      typeof log.details.message === 'string' &&
      log.details.message.startsWith('Already');

    if (!log.details.rejected) {
      // Accepted — advance seqPos if this action matched the expected step
      if (seqPos < sequence.length && sequence[seqPos] === log.details.intervention_id) {
        seqPos++;
      }
    } else if (!isDuplicateMsg) {
      // Any non-duplicate rejection — record what should have been done at this sequence position
      if (seqPos < sequence.length) {
        const expectedId = sequence[seqPos];
        const expectedDef = scenario?.interventions[expectedId];
        expectedMap.set(logId, {
          label: prettifyInterventionId(expectedId),
          rationale: expectedDef?.rationale,
        });
      }
      // seqPos does NOT advance on rejection
    }
  }

  // Map pass: construct ActionFeedback array
  return interventionLogs.map((log) => {
    const logId = log.id?.toString() ?? `${log.session_id}-${log.timestamp}`;
    const isDuplicate =
      log.details.rejected === true &&
      typeof log.details.message === 'string' &&
      log.details.message.startsWith('Already');

    const expected = expectedMap.get(logId);

    return {
      id: logId,
      name: prettifyInterventionId(log.details.intervention_id),
      isCorrect: !log.details.rejected,
      comment: log.details.message,
      timestamp: formatTimestamp(log.sim_time_sec),
      reviewId: log.details.rejected && !isDuplicate ? log.details.intervention_id : undefined,
      ...(isDuplicate ? { isDuplicate: true } : {}),
      ...(expected ? {
        expectedActionLabel: expected.label,
        ...(expected.rationale ? { expectedActionRationale: expected.rationale } : {}),
      } : {}),
    };
  });
}

function buildSessionLogEvent(
  event: SessionEvent,
  session_id: string,
  scenario_id: string,
  sim_time_sec: number,
): SessionLogEvent {
  const base = {
    session_id,
    scenario_id,
    timestamp: Date.now(),
    sim_time_sec,
  };

  switch (event.type) {
    case 'start':
      return { ...base, event_type: 'start', details: { message: event.message, snapshot: event.snapshot } };
    case 'intervention':
      return {
        ...base,
        event_type: 'intervention',
        details: {
          intervention_id: event.intervention_id,
          message: event.message,
          rejected: event.rejected,
        },
      };
    case 'state_change':
      return { ...base, event_type: 'state_change', details: { message: event.message, changes: event.changes } };
    case 'completion':
      return { ...base, event_type: 'completion', details: { message: event.message, outcome: event.outcome } };
    case 'manual_end':
      return { ...base, event_type: 'manual_end', details: { message: event.message } };
  }
}

function AppInner({ onScenarioActiveChange }: { onScenarioActiveChange: (active: boolean) => void }) {
  const { showToast } = useToast();
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('patient');
  const [reviewActionId, setReviewActionId] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [tourKey, setTourKey] = useState(0);
  const [incorrectActionMessage, setIncorrectActionMessage] = useState<string | null>(null);
  const [correctActionMessage, setCorrectActionMessage] = useState<string | null>(null);
  const [scenarioOutcome, setScenarioOutcome] = useState<'success' | 'failed' | 'manual'>('manual');
  const [evalActions, setEvalActions] = useState<ActionFeedback[]>([]);
  // R-15: Track rejected actions for the BottomNav badge
  const [rejectionCount, setRejectionCount] = useState(0);
  const [unlocked, setUnlocked] = useState<Record<'hr' | 'spo2' | 'bp' | 'rr', boolean>>({
    hr: false,
    spo2: false,
    bp: false,
    rr: false,
  });

  // ── Cheat mode ──────────────────────────────────────────────────────────────
  const [cheatModeEnabled, setCheatModeEnabled] = useState(false);
  const [cheatVisible, setCheatVisible] = useState(false);

  useEffect(() => {
    void fetch(`${import.meta.env.BASE_URL}.cheat_mode`, { method: 'HEAD' }).then((res) => {
      if (res.ok) setCheatModeEnabled(true);
    }).catch(() => {/* file absent or network error — stay disabled */});
  }, []);

  const activeScenarioRef = useRef<Scenario | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const elapsedRef = useRef(0);

  useEffect(() => {
    activeScenarioRef.current = activeScenario;
  }, [activeScenario]);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const persistEvent = useCallback(
    async (event: SessionEvent, simTimeSec: number) => {
      const currentScenario = activeScenarioRef.current;
      const currentSessionId = sessionIdRef.current;

      if (!currentScenario || !currentSessionId) {
        return;
      }

      const payload = buildSessionLogEvent(event, currentSessionId, currentScenario.scenario_id, simTimeSec);

      await db.sessionLogs.add(payload);
    },
    [],
  );

  const startScenarioRun = useCallback((scenario: Scenario) => {
    setUnlocked({ hr: false, spo2: false, bp: false, rr: false });
    setRejectionCount(0);
    // FIX (ISSUE-05): Do NOT clear suppressedProcedures here. Learners who have
    // suppressed procedure guides should retain that preference across scenario runs.
    // They can reset manually via the "Reset Hidden Guides" button in ActionsScreen.
    setSessionId(createSessionId());
    setActiveScenario(cloneScenario(scenario));
    setActiveTab('patient');
    setReviewActionId(null);
    setShowSummary(false);
    setScenarioOutcome('manual');
    setEvalActions([]);
    setIncorrectActionMessage(null);
    onScenarioActiveChange(true);
  }, [onScenarioActiveChange]);

  const handleEngineEvent = useCallback(
    async (event: EngineEvent) => {
      await persistEvent(event, elapsedRef.current);

      if (event.type === 'intervention' && event.rejected) {
        setIncorrectActionMessage(event.message);
        // R-15: increment rejection badge counter
        setRejectionCount(prev => prev + 1);
        return;
      }

      if (event.type === 'intervention' && !event.rejected) {
        setCorrectActionMessage(event.message);
        return;
      }

      if (event.type === 'completion') {
        const completionEvent = event as CompletionEvent;
        setScenarioOutcome(completionEvent.outcome);

        if (completionEvent.outcome === 'success') {
          showToast('Patient stabilized.', 'success');
        } else {
          showToast('Scenario failed. Review the debrief.', 'error');
        }

        setShowSummary(true);
      }
    },
    [persistEvent, showToast],
  );

  const { state: vitals, status, elapsedSec, applyIntervention, activeInterventions, sequenceIndex, successHoldStarts, failureHoldStarts } = useScenarioEngine(
    activeScenario,
    handleEngineEvent,
  );

  useEffect(() => {
    elapsedRef.current = elapsedSec;
  }, [elapsedSec]);

  useEffect(() => {
    if (!showSummary || !sessionId) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const logs = await db.sessionLogs.where('session_id').equals(sessionId).sortBy('timestamp');
      if (!cancelled) {
        setEvalActions(buildActionFeedback(logs, activeScenario));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, showSummary]);

  const score = useMemo(() => {
    const correctActions = evalActions.filter((a) => a.isCorrect).length;
    const sequenceErrors = evalActions.filter((a) => !a.isCorrect && !a.isDuplicate).length;
    const totalScoredActions = correctActions + sequenceErrors;
    if (totalScoredActions === 0) return 0;
    return Math.round((correctActions / totalScoredActions) * 100);
  }, [evalActions]);

  const scenarioProgressPct = useMemo(() => (
    calculateScenarioProgress(activeScenario, vitals, elapsedSec, sequenceIndex, successHoldStarts).totalScore
  ), [activeScenario, vitals, elapsedSec, sequenceIndex, successHoldStarts]);

  const urgencyItems = useMemo(
    () => computeUrgencyItems(activeScenario, failureHoldStarts, elapsedSec, activeInterventions),
    [activeScenario, failureHoldStarts, elapsedSec, activeInterventions],
  );

  const vitalDecayRates = useMemo(
    () => computeVitalDecayRates(activeScenario, activeInterventions),
    [activeScenario, activeInterventions],
  );

  const timerPct = useMemo(() => {
    const estimated = activeScenario?.meta?.estimatedDurationSec;
    if (!estimated || estimated <= 0) return null;
    return Math.min(elapsedSec / estimated, 1);
  }, [activeScenario, elapsedSec]);

  // Expired-action toast: fires only for cyclic interventions that need reapplication.
  // Drugs and procedures are silent on expiry — the countdown pill disappearing is sufficient.
  const prevInterventionsRef = useRef<ActiveIntervention[]>([]);
  useEffect(() => {
    const prev = prevInterventionsRef.current;
    const prevTimed = prev.filter((iv) => iv.duration_sec !== undefined);
    const currentIds = new Set(activeInterventions.map((iv) => iv.id));
    for (const iv of prevTimed) {
      if (!currentIds.has(iv.id) && CYCLIC_INTERVENTIONS.has(iv.id)) {
        showToast(`${getInterventionShortLabel(iv.id)} — reapply now`, 'warning');
      }
    }
    prevInterventionsRef.current = activeInterventions;
  }, [activeInterventions, showToast]);

  // Cheat mode key listener — 'c' toggles the overlay when scenario is active
  useEffect(() => {
    if (!cheatModeEnabled) return;
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (e.key === 'c' || e.key === 'C') {
        if (activeScenario && !showSummary) {
          setCheatVisible((v) => !v);
        }
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cheatModeEnabled, activeScenario, showSummary]);

  // Cheat mode 3-finger downswipe — mobile trigger
  const swipeTouchStartY = useRef<number | null>(null);
  useEffect(() => {
    if (!cheatModeEnabled) return;

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length >= 3) {
        // Record average Y of all active touches
        let sum = 0;
        for (let i = 0; i < e.touches.length; i++) sum += e.touches[i].clientY;
        swipeTouchStartY.current = sum / e.touches.length;
      } else {
        swipeTouchStartY.current = null;
      }
    }

    function onTouchEnd(e: TouchEvent) {
      if (swipeTouchStartY.current === null) return;
      // changedTouches gives us the fingers that just lifted
      let sum = 0;
      for (let i = 0; i < e.changedTouches.length; i++) sum += e.changedTouches[i].clientY;
      const endY = sum / e.changedTouches.length;
      const deltaY = endY - swipeTouchStartY.current;
      swipeTouchStartY.current = null;
      // Downswipe threshold: 60px
      if (deltaY > 60 && activeScenario && !showSummary) {
        setCheatVisible((v) => !v);
      }
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [cheatModeEnabled, activeScenario, showSummary]);

  const clinicalConclusion = useMemo(() => {
    const correctActions = evalActions.filter((action) => action.isCorrect).length;
    const rejectedActions = evalActions.length - correctActions;

    if (evalActions.length === 0) {
      return scenarioOutcome === 'manual'
        ? 'The scenario was ended manually before any interventions were recorded.'
        : 'No interventions were recorded during this scenario.';
    }

    if (scenarioOutcome === 'success') {
      return `The patient was stabilized after ${evalActions.length} interventions. ${correctActions} intervention(s) were clinically appropriate.${rejectedActions > 0 ? ` ${rejectedActions} intervention(s) were rejected and should be reviewed.` : ''}`;
    }

    if (scenarioOutcome === 'failed') {
      return `The patient deteriorated despite ${evalActions.length} recorded interventions. ${correctActions} intervention(s) were appropriate.${rejectedActions > 0 ? ` ${rejectedActions} intervention(s) were rejected and likely delayed recovery.` : ''}`;
    }

    return `The scenario ended manually after ${evalActions.length} recorded interventions. ${correctActions} intervention(s) were appropriate. Review the sequence before attempting the case again.`;
  }, [evalActions, scenarioOutcome]);

  const handleHelpClick = useCallback(() => {
    localStorage.removeItem('simnurse_onboarding_complete');
    localStorage.removeItem('simnurse_welcome_dismissed');
    setTourKey((previousValue) => previousValue + 1);
  }, []);

  const handleManualFinish = useCallback(async () => {
    const manualEndEvent: ManualEndEvent = {
      type: 'manual_end',
      message: 'Scenario ended manually by the learner.',
    };

    await persistEvent(manualEndEvent, elapsedRef.current);
    setScenarioOutcome(status === 'success' || status === 'failed' ? status : 'manual');
    setShowSummary(true);
  }, [persistEvent, status]);

  if (!activeScenario) {
    return (
      <div id="app-shell" className={APP_SHELL_CLASS}>
        <Header onHelpClick={handleHelpClick} />
        <LibraryScreen key={tourKey} onSelectScenario={startScenarioRun} />
      </div>
    );
  }

  if (showSummary) {
    return (
      <div id="app-shell" className={APP_SHELL_CLASS}>
        <EvaluationSummary
          score={score}
          actions={evalActions}
          clinicalConclusion={clinicalConclusion}
          outcome={scenarioOutcome}
          conclusion={activeScenario?.conclusion}
          onRestart={async () => {
            // P3-C (ISSUE-26): Re-fetch from Dexie to guarantee a clean seed copy,
            // avoiding any state mutation that may have occurred during the run.
            const fresh = await db.scenarios.get(activeScenario!.scenario_id);
            startScenarioRun(fresh ?? activeScenario!);
          }}
          onReturnToLibrary={() => {
            setActiveScenario(null);
            setSessionId(null);
            setShowSummary(false);
            setEvalActions([]);
            setScenarioOutcome('manual');
            setActiveTab('patient');
            onScenarioActiveChange(false);
          }}
          onReviewProcedure={(_actionId) => {
            // Review is now handled inside EvaluationSummary via ProcedureGuide portal
          }}
        />
      </div>
    );
  }

  return (
    <div id="app-shell" className={APP_SHELL_CLASS}>
      <Header
        onHelpClick={handleHelpClick}
        monitorState={vitals}
        unlocked={unlocked}
        urgencyItems={urgencyItems}
        vitalDecayRates={vitalDecayRates}
        timerPct={timerPct}
        elapsedSec={elapsedSec}
      />
      {vitals && <ContextualOverlay spo2={vitals.spo2} />}
      <IncorrectActionWidget message={incorrectActionMessage} onClose={() => setIncorrectActionMessage(null)} />
      {correctActionMessage && (
        <CorrectActionWidget
          message={correctActionMessage}
          onDismiss={() => setCorrectActionMessage(null)}
        />
      )}

      <main className="flex-1 overflow-y-auto pb-24">
        {activeTab === 'patient' && (
          <div key="patient" className="tab-enter h-full">
            {/* R-2: pass unlocked so badge opacity reflects vitals-unlock state */}
            <PatientView onFinish={() => void handleManualFinish()} vitals={vitals} activeInterventions={activeInterventions} unlocked={unlocked.spo2 || unlocked.hr} />
          </div>
        )}
        {activeTab === 'actions' && (
          <div key="actions" className="tab-enter h-full">
            <ActionsScreen
              applyIntervention={applyIntervention}
              initialActionIdToReview={reviewActionId}
              onReviewActionHandled={() => setReviewActionId(null)}
              activeInterventions={activeInterventions}
              elapsedSec={elapsedSec}
              disabled={status !== 'running'}
            />
          </div>
        )}
        {activeTab === 'status' && (
          <div key="status" className="tab-enter h-full">
            <StatusDashboard
              vitals={vitals}
              unlocked={unlocked}
              setUnlocked={setUnlocked}
              scenarioProgressPct={scenarioProgressPct}
              isLoading={vitals === null}
              patient={activeScenario.patient}
            />
          </div>
        )}
      </main>

      {/* R-15: pass rejectionCount; reset to 0 when user visits Actions tab */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'actions') setRejectionCount(0);
          setActiveTab(tab);
        }}
        rejectionCount={rejectionCount}
      />
      <OnboardingTour key={tourKey} activeTab={activeTab} setActiveTab={setActiveTab} scenarioActive={!!activeScenario} />
      {cheatModeEnabled && cheatVisible && (
        <CheatOverlay
          scenario={activeScenario}
          sequenceIndex={sequenceIndex}
          onClose={() => setCheatVisible(false)}
        />
      )}
    </div>
  );
}

function App() {
  const [scenarioActive, setScenarioActive] = useState(false);
  return (
    <ToastProvider scenarioActive={scenarioActive}>
      <AppInner onScenarioActiveChange={setScenarioActive} />
    </ToastProvider>
  );
}

export default App;
