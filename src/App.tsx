import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import type { CompletionEvent, EngineEvent, ManualEndEvent, Scenario, SessionEvent, SessionLogEvent } from './types/scenario';

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

function prettifyInterventionId(interventionId: string): string {
  return INTERVENTION_LABELS[interventionId] ??
    interventionId.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function isInterventionLog(log: SessionLogEvent): log is Extract<SessionLogEvent, { event_type: 'intervention' }> {
  return log.event_type === 'intervention';
}

function buildActionFeedback(logs: SessionLogEvent[]): ActionFeedback[] {
  return logs.filter(isInterventionLog).map((log) => ({
    id: log.id?.toString() ?? `${log.session_id}-${log.timestamp}`,
    name: prettifyInterventionId(log.details.intervention_id),
    isCorrect: !log.details.rejected,
    comment: log.details.message,
    timestamp: formatTimestamp(log.sim_time_sec),
    reviewId: log.details.rejected ? log.details.intervention_id : undefined,
  }));
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

  const { state: vitals, status, elapsedSec, applyIntervention, activeInterventions, sequenceIndex, successHoldStarts } = useScenarioEngine(
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
        setEvalActions(buildActionFeedback(logs));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, showSummary]);

  const score = useMemo(() => {
    if (evalActions.length === 0) {
      return 0;
    }

    const correctActions = evalActions.filter((action) => action.isCorrect).length;
    return Math.round((correctActions / evalActions.length) * 100);
  }, [evalActions]);

  const scenarioProgressPct = useMemo(() => (
    calculateScenarioProgress(activeScenario, vitals, elapsedSec, sequenceIndex, successHoldStarts).totalScore
  ), [activeScenario, vitals, elapsedSec, sequenceIndex, successHoldStarts]);

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
          onRestart={() => startScenarioRun(activeScenario)}
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
      <Header onHelpClick={handleHelpClick} monitorState={vitals} unlocked={unlocked} />
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
