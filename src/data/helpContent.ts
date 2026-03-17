/*  */export type AppContext =
  | 'library'
  | 'preview_modal'
  | 'patient'
  | 'actions'
  | 'status'
  | 'debrief';

export interface HelpTip {
  id: string;
  heading: string;
  body: string;
}

export interface WalkthroughStep {
  id: string;
  targetId: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  /**
   * Scenario-run tab to switch to before rendering this step.
   * Only valid for patient/actions/status contexts.
   * MUST NEVER be set on preview_modal steps.
   */
  tab?: 'patient' | 'actions' | 'status';
}

export interface ContextHelpContent {
  context: AppContext;
  walkthroughId: string;
  walkthroughTitle: string;
  steps: WalkthroughStep[];
  contextTips: HelpTip[];    // context-specific tips shown first in HelpPanel
  quickTips: HelpTip[];      // existing global tips — shown second, collapsed by default
}

export const GLOBAL_QUICK_TIPS: HelpTip[] = [
  {
    id: 'global-tip-1',
    heading: 'Urgency Pill Colors',
    body: 'The urgency strip in the header uses color-coded pills to communicate how urgently you must act:\n\n🔴 RED (pulsing) = CRITICAL — you have ~10 seconds or less. This fires when a failure condition is imminent (e.g. CPR timer has expired, patient is deteriorating rapidly, or a scheduled state change is about to kill the patient). If you see red, stop reading — act immediately.\n\n🟡 AMBER = WARNING — you have roughly 10–30 seconds. An intervention timer is counting down or a failure window is opening. Start planning your next action now.\n\n⚫ GREY = LOW URGENCY — no immediate danger. A passive countdown or reminder (e.g. a scheduled medication recheck). You have time to think, but don\'t ignore it.\n\nPills appear in priority order: failure-proximity conditions first, active intervention countdowns after. If multiple pills show red simultaneously, address the top one first.',
  },
  {
    id: 'global-tip-2',
    heading: 'Timing Windows',
    body: "Each intervention has a time window defined by the scenario's urgency conditions. Acting too late (after a failure timer expires) ends the scenario regardless of the intervention being otherwise correct. The urgency strip tells you how long you have.",
  },
  {
    id: 'global-tip-3',
    heading: 'Sequence Matters',
    body: 'Most scenarios have an expected intervention sequence (e.g. CPR → Rhythm Check → Defibrillate). Out-of-sequence actions are rejected and logged in the debrief.',
  },
  {
    id: 'global-tip-4',
    heading: 'Reading Timing Feedback',
    body: 'In the debrief, each action row shows the elapsed time (T+mm:ss) when it was applied. Compare timestamps to identify delays — e.g. CPR starting at T+01:30 instead of T+00:10 is a significant response-time gap, even if the action itself was correct.',
  },
  {
    id: 'global-tip-5',
    heading: 'Score Interpretation',
    body: 'Your score reflects the ratio of correct to total interventions: Expert ≥95%, Proficient ≥88%, Competent ≥80%, Developing ≥60%, Novice <60%. Lower scores indicate out-of-sequence or missed interventions — not speed.',
  },
  {
    id: 'global-tip-6',
    heading: 'Repeating for Mastery',
    body: 'You can replay any scenario as many times as you like. Each run generates a fresh session log. Aim for ≥88% Proficient on all scenarios before moving to the next difficulty tier.',
  },
];

export const HELP_CONTENT: Record<AppContext, ContextHelpContent> = {
  library: {
    context: 'library',
    walkthroughId: 'library-tour',
    walkthroughTitle: 'Library Tour',
    steps: [
      {
        id: 'library-step-1',
        targetId: 'scenario-list',
        title: 'Welcome to SimNurse',
        content:
          'This app simulates real clinical emergencies. Each card in this list represents a clinical case. Tap any card to preview the patient before starting.',
        position: 'top',
      },
      {
        id: 'library-step-2',
        targetId: 'scenario-list',
        title: 'Choose a Case',
        content:
          'Tap any scenario card to preview patient details, initial vitals, and difficulty before starting.',
        position: 'top',
      },
      {
        id: 'library-step-3',
        targetId: 'scenario-difficulty-badge',
        title: 'Difficulty Levels',
        content:
          'Beginner cases guide you through standard protocols. Intermediate and Advanced cases require faster, more precise decision-making.',
        position: 'bottom',
      },
      {
        id: 'library-step-4',
        targetId: 'scenario-search',
        title: 'Search & Filter',
        content:
          'Use the search bar or difficulty filters to find specific cases. Great for focused practice.',
        position: 'bottom',
      },
      {
        id: 'library-step-5',
        targetId: 'scenario-list',
        title: 'Ready to begin?',
        content:
          'Tap a case card to preview it. Review the initial vitals and presenting rhythm, then hit Begin Scenario.',
        position: 'top',
      },
    ],
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
    quickTips: GLOBAL_QUICK_TIPS,
  },

  preview_modal: {
    context: 'preview_modal',
    walkthroughId: 'preview-tour',
    walkthroughTitle: 'Case Preview Tour',
    steps: [
      {
        id: 'preview-step-1',
        targetId: 'preview-modal-header',
        title: 'Case Overview',
        content:
          "The header shows the patient's name, age, gender, and the clinical scenario title.",
        position: 'top',
      },
      {
        id: 'preview-step-2',
        targetId: 'preview-vitals-grid',
        title: 'Initial Vitals',
        content:
          "These are the patient's vitals at T=0. Note which are critically abnormal — these are your first clues.",
        position: 'top',
      },
      {
        id: 'preview-step-3',
        targetId: 'preview-meta-badges',
        title: 'Case Metadata',
        content:
          'Protocol (BLS/ACLS/PALS), domain, difficulty, and estimated duration are shown here. Advanced cases have stricter time windows.',
        position: 'top',
      },
      {
        id: 'preview-step-4',
        targetId: 'begin-scenario-btn',
        title: 'Begin the Case',
        content:
          'When ready, tap Begin Scenario. The clock starts immediately — your interventions must be fast and in the correct order.',
        position: 'top',
      },
    ],
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
    quickTips: GLOBAL_QUICK_TIPS,
  },

  patient: {
    context: 'patient',
    walkthroughId: 'patient-tour',
    walkthroughTitle: 'Patient Screen Tour',
    steps: [
      {
        id: 'patient-step-1',
        targetId: 'urgency-strip',
        title: 'Urgency Alerts',
        content:
          'Red pills = critical timers (act now). Amber = approaching deadline. These track both intervention countdowns and failure-proximity warnings.',
        position: 'bottom',
        tab: 'patient',
      },
      {
        id: 'patient-step-2',
        targetId: 'patient-illustration',
        title: 'Patient Presentation',
        content:
          "The illustration reflects the patient's current state. Read the narrative text below it for clinical clues like breathing, skin colour, and responsiveness.",
        position: 'bottom',
        tab: 'patient',
      },
      {
        id: 'patient-step-3',
        targetId: 'patient-narrative',
        title: 'Clinical Narrative',
        content:
          'New state-change events appear here as the scenario progresses. Watch for changes in consciousness, skin colour, and breathing.',
        position: 'top',
        tab: 'patient',
      },
      {
        id: 'patient-step-4',
        targetId: 'bottom-nav-actions',
        title: 'Actions Tab',
        content:
          'Switch here to apply interventions — medications, procedures, and equipment. Tap an action to confirm it via the Procedure Guide.',
        position: 'top',
        tab: 'patient',
      },
      {
        id: 'patient-step-5',
        targetId: 'bottom-nav-status',
        title: 'Status Tab',
        content:
          'Monitor patient vitals and ECG here. Unlock additional vital metrics by performing a physical inspection action first.',
        position: 'top',
        tab: 'patient',
      },
      {
        id: 'patient-step-6',
        targetId: 'finish-case-btn',
        title: 'Ending the Case',
        content:
          'Use this button to end the scenario manually and review your debrief. The scenario also ends automatically on success or failure.',
        position: 'top',
        tab: 'patient',
      },
    ],
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
    quickTips: GLOBAL_QUICK_TIPS,
  },

  actions: {
    context: 'actions',
    walkthroughId: 'actions-tour',
    walkthroughTitle: 'Actions Screen Tour',
    steps: [
      {
        id: 'actions-step-1',
        targetId: 'actions-search',
        title: 'Search Interventions',
        content:
          'Type any drug name, procedure, or keyword. Results filter in real-time across all categories.',
        position: 'bottom',
        tab: 'actions',
      },
      {
        id: 'actions-step-2',
        targetId: 'actions-categories',
        title: 'Category Chips',
        content:
          'Filter by Interventions, Medications, or Equipment. Tap a chip to narrow the action list.',
        position: 'bottom',
        tab: 'actions',
      },
      {
        id: 'actions-step-3',
        targetId: 'action-card-first',
        title: 'Applying an Action',
        content:
          'Tap any action card. A Procedure Guide appears with step-by-step instructions. Tap Confirm Action to apply it to the patient.',
        position: 'top',
        tab: 'actions',
      },
      {
        id: 'actions-step-4',
        targetId: 'actions-category-meds',
        title: 'Medications',
        content:
          'Medications have specific dosing and delivery routes. The Procedure Guide shows the clinical steps. Rejected medications appear in the debrief.',
        position: 'top',
        tab: 'actions',
      },
      {
        id: 'actions-step-5',
        targetId: 'bottom-nav-actions',
        title: 'Rejection Badge',
        content:
          'A red badge appears on this tab when an action is rejected. Switch here to review rejected interventions and understand what the correct next step should have been.',
        position: 'top',
        tab: 'actions',
      },
      {
        id: 'actions-step-6',
        targetId: 'actions-search',
        title: 'Reset Hidden Guides',
        content:
          "If you dismissed Procedure Guide cards with 'Don't show again', use the Reset Hidden Guides button to restore them.",
        position: 'bottom',
        tab: 'actions',
      },
    ],
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
        body: 'A red dot appears on this tab when an action is rejected. It clears when you visit the Actions tab. Review all rejected actions in the debrief timeline for protocol guidance.',
      },
    ],
    quickTips: GLOBAL_QUICK_TIPS,
  },

  status: {
    context: 'status',
    walkthroughId: 'status-tour',
    walkthroughTitle: 'Status Screen Tour',
    steps: [
      {
        id: 'status-step-1',
        targetId: 'vitals-container',
        title: 'Vital Signs Grid',
        content:
          "All monitored vitals appear here. Locked vitals show '--' until you perform a physical assessment via the Actions tab.",
        position: 'top',
        tab: 'status',
      },
      {
        id: 'status-step-2',
        targetId: 'vitals-container',
        title: 'Unlocking Vitals',
        content:
          "Tap 'Unlock' next to a vital to perform the relevant assessment. Tap 'Quick Inspection' in the header to unlock all vitals at once.",
        position: 'top',
        tab: 'status',
      },
      {
        id: 'status-step-3',
        targetId: 'ecg-waveform',
        title: 'ECG Waveform',
        content:
          "The live ECG reflects the patient's current rhythm. VFib shows chaotic waveform; Asystole is flat-line. Use this to confirm rhythm before defibrillation.",
        position: 'top',
        tab: 'status',
      },
      {
        id: 'status-step-4',
        targetId: 'progress-bar',
        title: 'Scenario Progress',
        content:
          'This bar tracks how close the patient is to the success condition — not just time elapsed. Completing the correct intervention sequence advances it faster.',
        position: 'bottom',
        tab: 'status',
      },
      {
        id: 'status-step-5',
        targetId: 'app-header',
        title: 'Scenario Clock',
        content:
          'The timer pill in the header shows elapsed time. Some scenarios have a hard time cutoff — if it expires, the scenario fails automatically.',
        position: 'bottom',
        tab: 'status',
      },
    ],
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
    quickTips: GLOBAL_QUICK_TIPS,
  },

  debrief: {
    context: 'debrief',
    walkthroughId: 'debrief-tour',
    walkthroughTitle: 'Debrief Tour',
    steps: [
      {
        id: 'debrief-step-1',
        targetId: 'score-gauge',
        title: 'Performance Score',
        content:
          'Your score reflects the ratio of correct to total interventions. Expert (≥95%), Proficient (≥88%), Competent (≥80%), Developing (≥60%), Novice (<60%).',
        position: 'bottom',
      },
      {
        id: 'debrief-step-2',
        targetId: 'action-timeline',
        title: 'Intervention Timeline',
        content:
          'Each intervention is listed in order with a ✓ (correct) or ✗ (incorrect) marker. Incorrect entries show what should have been done instead and cite the clinical rationale.',
        position: 'top',
      },
      {
        id: 'debrief-step-3',
        targetId: 'clinical-conclusion',
        title: 'Clinical Conclusion',
        content:
          'This narrative summarises the outcome: patient stabilised or deteriorated, number of appropriate vs rejected interventions, and learning focus for the next attempt.',
        position: 'top',
      },
      {
        id: 'debrief-step-4',
        targetId: 'debrief-cta-row',
        title: "What's Next",
        content:
          'Restart to attempt the same case immediately, or return to the Library to choose a new scenario. Your session log is preserved regardless of which you choose.',
        position: 'top',
      },
    ],
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
    quickTips: GLOBAL_QUICK_TIPS,
  },
};
