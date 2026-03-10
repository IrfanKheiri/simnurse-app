import type { Condition, Scenario } from '../types/scenario';

const arrestSuccess = (durationSec: number): Condition[] => [
  { vital: 'pulsePresent', equals: true, durationSec },
  { vital: 'rhythm', equals: 'Sinus', durationSec },
];

export const seedScenarios: Scenario[] = [
  // Scenario 1 — adult_vfib_arrest_witnessed
  // Changes: expected_sequence reordered (defibrillate first), vfib_to_asystole.atSec 180→420, failure elapsedSecGte 600→1200
  {
    scenario_id: 'adult_vfib_arrest_witnessed',
    title: 'Adult VFib Arrest (Witnessed)',
    patient: { name: 'James Harlow', age: '58yo', gender: 'M' },
    meta: { difficulty: 'Advanced', domain: 'Cardiac', estimatedDurationSec: 900, protocol: 'ACLS' },
    initial_state: {
      hr: 0,
      bp: '0/0',
      spo2: 0,
      rhythm: 'VFib',
      rr: 0,
      pulsePresent: false,
      glucose: 105,
    },
    baseline_progressions: [],
    scheduledStateChanges: [
      {
        id: 'vfib_to_asystole',
        atSec: 420,
        changes: { rhythm: 'Asystole' },
        message: 'Untreated ventricular fibrillation deteriorated to asystole.',
      },
    ],
    expected_sequence: ['defibrillate', 'cpr', 'epinephrine_1mg', 'amiodarone_300mg'],
    interventions: {
      cpr: {
        duration_sec: 120,
        priority: 10,
        state_overrides: { bp: '60/20', spo2: 85 },
      },
      defibrillate: {
        duration_sec: 10,
        priority: 100,
        requires_rhythm: ['VFib', 'VTach'],
        success_chance: 0.6,
        success_state: { rhythm: 'Sinus', hr: 85, bp: '110/70', spo2: 92, rr: 12, pulsePresent: true },
      },
      epinephrine_1mg: {
        duration_sec: 240,
        priority: 5,
        success_chance: 0.1,
        success_state: { rhythm: 'Sinus', hr: 110, bp: '90/50', rr: 10, pulsePresent: true },
      },
      amiodarone_300mg: {
        duration_sec: 600,
        priority: 6,
        success_chance: 0.4,
      },
      rescue_breathing: {
        duration_sec: 60,
        priority: 8,
        state_overrides: { spo2: 95 },
      },
    },
    success_conditions: arrestSuccess(30),
    failure_conditions: [{ elapsedSecGte: 1200 }],
  },

  // Scenario 2 — adult_asystole_unwitnessed
  // Changes: epinephrine_1mg.success_chance 0.2→0.08, defibrillate intervention removed (contraindicated)
  {
    scenario_id: 'adult_asystole_unwitnessed',
    title: 'Adult Asystole (Unwitnessed)',
    patient: { name: 'Martin Cross', age: '72yo', gender: 'M' },
    meta: { difficulty: 'Advanced', domain: 'Cardiac', estimatedDurationSec: 1200, protocol: 'ACLS' },
    initial_state: {
      hr: 0,
      bp: '0/0',
      spo2: 0,
      rhythm: 'Asystole',
      rr: 0,
      pulsePresent: false,
      glucose: 90,
    },
    baseline_progressions: [],
    expected_sequence: ['cpr', 'epinephrine_1mg'],
    interventions: {
      cpr: {
        duration_sec: 120,
        priority: 10,
        state_overrides: { bp: '50/15' },
      },
      epinephrine_1mg: {
        duration_sec: 240,
        priority: 50,
        success_chance: 0.08,
        success_state: { rhythm: 'Sinus', hr: 65, bp: '80/40', rr: 8, pulsePresent: true },
      },
    },
    success_conditions: arrestSuccess(60),
    failure_conditions: [{ elapsedSecGte: 900 }],
  },

  // Scenario 3 — adult_pulseless_vtach
  // Changes: expected_sequence reordered (defibrillate first), epinephrine_1mg added, failure elapsedSecGte 480→1200
  {
    scenario_id: 'adult_pulseless_vtach',
    title: 'Adult Pulseless VTach (Ischemic)',
    patient: { name: 'Derek Patel', age: '64yo', gender: 'M' },
    meta: { difficulty: 'Advanced', domain: 'Cardiac', estimatedDurationSec: 900, protocol: 'ACLS' },
    initial_state: {
      hr: 0,
      bp: '0/0',
      spo2: 0,
      rhythm: 'VTach',
      rr: 0,
      pulsePresent: false,
      glucose: 120,
    },
    baseline_progressions: [],
    expected_sequence: ['defibrillate', 'cpr', 'epinephrine_1mg', 'amiodarone_300mg'],
    interventions: {
      cpr: {
        duration_sec: 120,
        priority: 10,
        state_overrides: { bp: '70/30' },
      },
      defibrillate: {
        duration_sec: 10,
        priority: 100,
        requires_rhythm: ['VFib', 'VTach'],
        success_chance: 0.75,
        success_state: { rhythm: 'Sinus', hr: 95, bp: '120/80', rr: 14, spo2: 94, pulsePresent: true },
      },
      epinephrine_1mg: {
        duration_sec: 240,
        priority: 5,
        success_chance: 0.1,
        success_state: { rhythm: 'Sinus', hr: 110, bp: '90/50', rr: 10, pulsePresent: true },
      },
      amiodarone_300mg: {
        duration_sec: 600,
        priority: 6,
        success_chance: 0.3,
      },
    },
    success_conditions: arrestSuccess(30),
    failure_conditions: [{ elapsedSecGte: 1200 }],
  },

  // Scenario 4 — adult_pea_hypovolemia
  // Changes: expected_sequence updated, establish_iv loses success_chance/success_state, normal_saline_bolus added
  {
    scenario_id: 'adult_pea_hypovolemia',
    title: 'Adult PEA (Hypovolemia)',
    patient: { name: 'Sandra Kim', age: '41yo', gender: 'F' },
    meta: { difficulty: 'Advanced', domain: 'Cardiac', estimatedDurationSec: 1200, protocol: 'ACLS' },
    initial_state: {
      hr: 0,
      bp: '0/0',
      spo2: 0,
      rhythm: 'PEA',
      rr: 0,
      pulsePresent: false,
      glucose: 85,
    },
    baseline_progressions: [],
    expected_sequence: ['cpr', 'establish_iv', 'normal_saline_bolus', 'epinephrine_1mg'],
    interventions: {
      cpr: {
        duration_sec: 120,
        priority: 10,
        state_overrides: { bp: '40/10' },
      },
      epinephrine_1mg: {
        duration_sec: 240,
        priority: 5,
        success_chance: 0.05,
      },
      establish_iv: {
        duration_sec: 300,
        priority: 80,
      },
      normal_saline_bolus: {
        duration_sec: 300,
        priority: 90,
        success_chance: 0.65,
        success_state: { rhythm: 'Sinus', hr: 120, bp: '85/40', rr: 16, spo2: 92, pulsePresent: true },
      },
    },
    success_conditions: [
      { vital: 'pulsePresent', equals: true, durationSec: 10 },
      { vital: 'hr', min: 100, max: 130, durationSec: 10 },
    ],
    failure_conditions: [{ elapsedSecGte: 480 }],
  },

  // Scenario 5 — adult_pea_hypoxia
  // Changes: rescue_breathing.success_chance 0.8→0.45, intubation.duration_sec 600→150
  {
    scenario_id: 'adult_pea_hypoxia',
    title: 'Adult PEA (Hypoxia/Drowning)',
    patient: { name: 'Tom Briggs', age: '29yo', gender: 'M' },
    meta: { difficulty: 'Advanced', domain: 'Cardiac', estimatedDurationSec: 1200, protocol: 'ACLS' },
    initial_state: {
      hr: 0,
      bp: '0/0',
      spo2: 0,
      rhythm: 'PEA',
      rr: 0,
      pulsePresent: false,
      glucose: 110,
    },
    baseline_progressions: [],
    expected_sequence: ['cpr', 'rescue_breathing', 'intubation', 'epinephrine_1mg'],
    interventions: {
      cpr: {
        duration_sec: 120,
        priority: 10,
        state_overrides: { bp: '60/20' },
      },
      epinephrine_1mg: {
        duration_sec: 240,
        priority: 5,
        success_chance: 0.1,
      },
      rescue_breathing: {
        duration_sec: 120,
        priority: 80,
        success_chance: 0.45,
        success_state: { rhythm: 'Sinus', hr: 100, bp: '100/60', spo2: 96, rr: 10, pulsePresent: true },
      },
      intubation: {
        duration_sec: 150,
        priority: 100,
        success_chance: 0.9,
        success_state: { rhythm: 'Sinus', hr: 95, bp: '105/65', spo2: 99, rr: 12, pulsePresent: true },
      },
    },
    success_conditions: [
      { vital: 'pulsePresent', equals: true, durationSec: 30 },
      { vital: 'spo2', min: 94, durationSec: 30 },
    ],
    failure_conditions: [{ elapsedSecGte: 480 }],
  },

  // Scenario 6 — adult_respiratory_arrest_opioid
  // Changes: failure_conditions replaced with spo2 max 60 / pulsePresent false conditions
  // BLS audit: renamed naloxone_2mg → naloxone_intranasal_4mg (4 mg IN per AHA 2023),
  //   added check_responsiveness, sternal_rub_stimulation, call_911, naloxone_intranasal_repeat, cpr_30_2
  {
    scenario_id: 'adult_respiratory_arrest_opioid',
    title: 'Adult Resp. Arrest (Opioid Overdose)',
    patient: { name: 'Carla Webb', age: '34yo', gender: 'F' },
    meta: { difficulty: 'Intermediate', domain: 'Respiratory', estimatedDurationSec: 600, protocol: 'BLS' },
    initial_state: {
      hr: 55,
      bp: '100/60',
      spo2: 75,
      rhythm: 'Sinus',
      rr: 0,
      pulsePresent: true,
      glucose: 95,
    },
    baseline_progressions: [
      { vital: 'spo2', modifier: -2, interval_sec: 10, decay_type: 'linear' },
      { vital: 'hr', modifier: -1, interval_sec: 30 },
    ],
    expected_sequence: ['check_responsiveness', 'sternal_rub_stimulation', 'call_911', 'rescue_breathing', 'naloxone_intranasal_4mg', 'naloxone_intranasal_repeat'],
    interventions: {
      check_responsiveness: {
        duration_sec: 10,
        priority: 200,
        success_chance: 1,
        success_state: {},
      },
      sternal_rub_stimulation: {
        duration_sec: 10,
        priority: 95,
        success_chance: 0.1,
        success_state: {},
      },
      call_911: {
        duration_sec: 15,
        priority: 190,
        success_chance: 1,
      },
      rescue_breathing: {
        duration_sec: 60,
        priority: 80,
        state_overrides: { spo2: 98 },
      },
      naloxone_intranasal_4mg: {
        duration_sec: 1800,
        priority: 100,
        success_chance: 1,
        success_state: { rr: 14, spo2: 96, hr: 80, pulsePresent: true },
      },
      naloxone_intranasal_repeat: {
        duration_sec: 120,
        priority: 55,
        success_chance: 0.8,
        success_state: { rr: 10, spo2: 88, hr: 85 },
      },
      cpr_30_2: {
        duration_sec: 120,
        priority: 50,
        state_overrides: { bp: '55/18', spo2: 78 },
      },
    },
    success_conditions: [
      { vital: 'rr', min: 12, max: 20, durationSec: 30 },
      { vital: 'spo2', min: 94, durationSec: 30 },
    ],
    failure_conditions: [
      { vital: 'spo2', max: 60, durationSec: 30 },
      { vital: 'pulsePresent', equals: false, durationSec: 1 },
    ],
  },

  // Scenario 7 — adult_unstable_bradycardia
  // Changes: expected_sequence updated, atropine_1mg→atropine_0_5mg with success_chance 0.8→0.6, transcutaneous_pacing added
  {
    scenario_id: 'adult_unstable_bradycardia',
    title: 'Adult Unstable Bradycardia',
    patient: { name: 'Walter Burns', age: '67yo', gender: 'M' },
    meta: { difficulty: 'Intermediate', domain: 'Cardiac', estimatedDurationSec: 600, protocol: 'ACLS' },
    initial_state: {
      hr: 35,
      bp: '70/40',
      spo2: 90,
      rhythm: 'Bradycardia',
      rr: 14,
      pulsePresent: true,
      glucose: 120,
    },
    baseline_progressions: [{ vital: 'bp', modifier: -1, interval_sec: 60 }],
    expected_sequence: ['oxygen_nrb', 'atropine_0_5mg', 'transcutaneous_pacing'],
    interventions: {
      atropine_0_5mg: {
        duration_sec: 300,
        priority: 90,
        success_chance: 0.6,
        success_state: { hr: 75, bp: '110/65', rhythm: 'Sinus', pulsePresent: true },
      },
      oxygen_nrb: {
        duration_sec: 600,
        priority: 10,
        state_overrides: { spo2: 99 },
      },
      transcutaneous_pacing: {
        duration_sec: 120,
        priority: 95,
        success_chance: 0.9,
        success_state: { hr: 72, bp: '105/65', rhythm: 'Sinus', pulsePresent: true },
      },
    },
    success_conditions: [
      { vital: 'hr', min: 60, max: 100, durationSec: 30 },
      { vital: 'rhythm', equals: 'Sinus', durationSec: 30 },
    ],
    failure_conditions: [{ vital: 'hr', max: 0, durationSec: 1 }],
  },

  // Scenario 8 — adult_svt
  // Changes: title updated to 'Adult Stable Tachycardia (SVT)', initial_state bp '85/50'→'110/72'
  {
    scenario_id: 'adult_svt',
    title: 'Adult Stable Tachycardia (SVT)',
    patient: { name: 'Priya Sharma', age: '38yo', gender: 'F' },
    meta: { difficulty: 'Intermediate', domain: 'Cardiac', estimatedDurationSec: 600, protocol: 'ACLS' },
    initial_state: {
      hr: 185,
      bp: '110/72',
      spo2: 94,
      rhythm: 'SVT',
      rr: 22,
      pulsePresent: true,
      glucose: 110,
    },
    baseline_progressions: [],
    expected_sequence: ['vagal_maneuver', 'adenosine_6mg', 'synchronized_cardioversion'],
    interventions: {
      vagal_maneuver: {
        duration_sec: 30,
        priority: 10,
        success_chance: 0.25,
        success_state: { hr: 90, rhythm: 'Sinus', bp: '120/80', pulsePresent: true },
      },
      adenosine_6mg: {
        duration_sec: 120,
        priority: 50,
        success_chance: 0.85,
        success_state: { hr: 85, rhythm: 'Sinus', bp: '125/80', pulsePresent: true },
      },
      synchronized_cardioversion: {
        duration_sec: 10,
        priority: 100,
        requires_rhythm: ['SVT', 'VTach'],
        success_chance: 0.95,
        success_state: { hr: 80, rhythm: 'Sinus', bp: '130/80', pulsePresent: true },
      },
    },
    success_conditions: [
      { vital: 'rhythm', equals: 'Sinus', durationSec: 15 },
      { vital: 'hr', min: 60, max: 100, durationSec: 15 },
    ],
    failure_conditions: [{ elapsedSecGte: 600 }],
  },

  // Scenario 9 — adult_vtach_pulse
  // Changes: expected_sequence reordered (cardioversion first), amiodarone_300mg→amiodarone_150mg_stable
  {
    scenario_id: 'adult_vtach_pulse',
    title: 'Adult Unstable Tachycardia (VTach with Pulse)',
    patient: { name: 'Frank Donovan', age: '55yo', gender: 'M' },
    meta: { difficulty: 'Advanced', domain: 'Cardiac', estimatedDurationSec: 600, protocol: 'ACLS' },
    initial_state: {
      hr: 170,
      bp: '80/50',
      spo2: 92,
      rhythm: 'VTach',
      rr: 22,
      pulsePresent: true,
      glucose: 125,
    },
    baseline_progressions: [{ vital: 'bp', modifier: -1, interval_sec: 20, decay_type: 'linear' }],
    expected_sequence: ['synchronized_cardioversion', 'amiodarone_150mg_stable'],
    interventions: {
      amiodarone_150mg_stable: {
        duration_sec: 600,
        priority: 50,
        success_chance: 0.6,
        success_state: { hr: 95, rhythm: 'Sinus', bp: '110/70', pulsePresent: true },
      },
      synchronized_cardioversion: {
        duration_sec: 10,
        priority: 100,
        requires_rhythm: ['VTach', 'SVT'],
        success_chance: 0.9,
        success_state: { hr: 85, rhythm: 'Sinus', bp: '120/75', pulsePresent: true },
      },
    },
    success_conditions: [
      { vital: 'rhythm', equals: 'Sinus', durationSec: 30 },
      { vital: 'hr', min: 60, max: 100, durationSec: 30 },
    ],
    failure_conditions: [{ elapsedSecGte: 600 }],
  },

  // Scenario 10 — pregnant_vfib_arrest
  // Changes: expected_sequence updated, left_uterine_displacement & perimortem_csection added, scheduledStateChanges added
  {
    scenario_id: 'pregnant_vfib_arrest',
    title: 'Pregnant VFib Arrest',
    patient: { name: 'Rachel Osei', age: '31yo', gender: 'F' },
    meta: { difficulty: 'Advanced', domain: 'Obstetric', estimatedDurationSec: 900, protocol: 'ACLS' },
    initial_state: {
      hr: 0,
      bp: '0/0',
      spo2: 0,
      rhythm: 'VFib',
      rr: 0,
      pulsePresent: false,
      glucose: 100,
    },
    baseline_progressions: [],
    scheduledStateChanges: [
      {
        id: 'pmcd_window_open',
        atSec: 300,
        changes: {},
        message: 'Five minutes have elapsed without ROSC. Perimortem Cesarean Delivery (PMCD) should be initiated immediately to improve maternal resuscitation outcome (ACOG/AHA).',
      },
    ],
    expected_sequence: ['left_uterine_displacement', 'cpr', 'defibrillate', 'epinephrine_1mg', 'perimortem_csection'],
    interventions: {
      left_uterine_displacement: {
        duration_sec: 30,
        priority: 200,
        state_overrides: { bp: '60/25' },
      },
      cpr: {
        duration_sec: 120,
        priority: 10,
        state_overrides: { bp: '50/20' },
      },
      defibrillate: {
        duration_sec: 10,
        priority: 100,
        requires_rhythm: ['VFib', 'VTach'],
        success_chance: 0.6,
        success_state: { rhythm: 'Sinus', hr: 110, bp: '100/60', spo2: 94, rr: 14, pulsePresent: true },
      },
      epinephrine_1mg: {
        duration_sec: 240,
        priority: 5,
        success_chance: 0.1,
      },
      perimortem_csection: {
        duration_sec: 300,
        priority: 150,
        success_chance: 0.7,
        success_state: { rhythm: 'Sinus', hr: 108, bp: '95/60', spo2: 94, rr: 14, pulsePresent: true },
      },
    },
    success_conditions: arrestSuccess(60),
    failure_conditions: [{ elapsedSecGte: 600 }],
  },

  // Scenario 11 — anaphylactic_shock
  // Changes: epinephrine_im → epinephrine_im_0_5mg everywhere
  {
    scenario_id: 'anaphylactic_shock',
    title: 'Anaphylactic Shock Progression',
    patient: { name: 'Nina Torres', age: '26yo', gender: 'F' },
    meta: { difficulty: 'Intermediate', domain: 'Emergency', estimatedDurationSec: 600, protocol: 'ACLS' },
    initial_state: {
      hr: 125,
      bp: '75/40',
      spo2: 88,
      rhythm: 'Sinus',
      rr: 32,
      pulsePresent: true,
      glucose: 105,
    },
    baseline_progressions: [
      { vital: 'spo2', modifier: -1, interval_sec: 15 },
      { vital: 'bp', modifier: -1, interval_sec: 20 },
    ],
    expected_sequence: ['epinephrine_im_0_5mg', 'oxygen_nrb', 'intubation'],
    interventions: {
      epinephrine_im_0_5mg: {
        duration_sec: 1800,
        priority: 100,
        success_chance: 1,
        success_state: { bp: '110/70', spo2: 96, hr: 100, rr: 18, pulsePresent: true },
      },
      oxygen_nrb: {
        duration_sec: 600,
        priority: 50,
        rate_modifiers: [{ vital: 'spo2', modifier: 2, interval_sec: 5 }],
      },
      intubation: {
        duration_sec: 600,
        priority: 90,
        success_chance: 0.5,
        success_state: { spo2: 98, rr: 14, hr: 110, bp: '80/45', pulsePresent: true },
      },
    },
    success_conditions: [
      { vital: 'bp', min: 100, durationSec: 30 },
      { vital: 'spo2', min: 95, durationSec: 30 },
    ],
    failure_conditions: [
      { vital: 'spo2', max: 60, durationSec: 30 },
      { vital: 'pulsePresent', equals: false, durationSec: 1 },
    ],
  },

  // Scenario 12 — acs_stemi
  // Changes: expected_sequence updated (O2 removed, ticagrelor/heparin/cath_lab added), oxygen_nrb.spo2 100→94,
  //          ticagrelor_180mg/heparin_bolus/activate_cath_lab added, success_conditions updated (spo2 condition removed, bp max 120→140)
  {
    scenario_id: 'acs_stemi',
    title: 'Acute Coronary Syndrome (STEMI)',
    patient: { name: 'Robert Chen', age: '62yo', gender: 'M' },
    meta: { difficulty: 'Advanced', domain: 'Cardiac', estimatedDurationSec: 1200, protocol: 'ACLS' },
    initial_state: {
      hr: 85,
      bp: '140/90',
      spo2: 92,
      rhythm: 'Sinus',
      rr: 18,
      pulsePresent: true,
      glucose: 115,
    },
    baseline_progressions: [],
    scheduledStateChanges: [
      {
        id: 'stemi_to_vfib',
        atSec: 300,
        changes: { rhythm: 'VFib', pulsePresent: false, hr: 0, bp: '0/0', spo2: 75, rr: 0 },
        message: 'Untreated STEMI deteriorated into ventricular fibrillation.',
      },
    ],
    expected_sequence: ['aspirin_324mg', 'ticagrelor_180mg', 'nitroglycerin_04mg', 'heparin_bolus', 'activate_cath_lab'],
    interventions: {
      aspirin_324mg: {
        duration_sec: 1800,
        priority: 50,
        success_chance: 1,
        success_state: { hr: 80, bp: '135/85', pulsePresent: true },
      },
      nitroglycerin_04mg: {
        duration_sec: 300,
        priority: 60,
        success_chance: 1,
        state_overrides: { bp: '115/75' },
      },
      oxygen_nrb: {
        duration_sec: 600,
        priority: 10,
        state_overrides: { spo2: 94 },
      },
      ticagrelor_180mg: {
        duration_sec: 1800,
        priority: 55,
        success_chance: 1,
        success_state: { hr: 80, bp: '135/85', pulsePresent: true },
      },
      heparin_bolus: {
        duration_sec: 60,
        priority: 65,
        success_chance: 1,
        state_overrides: { bp: '138/88' },
      },
      activate_cath_lab: {
        duration_sec: 30,
        priority: 70,
        success_chance: 1,
        success_state: { hr: 78, bp: '130/82', pulsePresent: true },
      },
    },
    success_conditions: [
      { elapsedSecGte: 120 },
      { vital: 'bp', max: 140, durationSec: 30 },
    ],
    failure_conditions: [{ vital: 'pulsePresent', equals: false, durationSec: 1 }],
  },

  // Scenario 13 — adult_stroke_cva
  // Changes: expected_sequence updated, ct_brain_noncontrast & labetalol_10mg added,
  //          alteplase.duration_sec 1800→3600, success_conditions bp max 145→180
  {
    scenario_id: 'adult_stroke_cva',
    title: 'Adult Stroke (CVA)',
    patient: { name: 'Eleanor Vance', age: '74yo', gender: 'F' },
    meta: { difficulty: 'Intermediate', domain: 'Neurological', estimatedDurationSec: 900, protocol: 'ACLS' },
    initial_state: {
      hr: 75,
      bp: '185/105',
      spo2: 97,
      rhythm: 'Sinus',
      rr: 14,
      pulsePresent: true,
      glucose: 110,
    },
    baseline_progressions: [],
    expected_sequence: ['check_glucose', 'establish_iv', 'ct_brain_noncontrast', 'labetalol_10mg', 'alteplase'],
    interventions: {
      check_glucose: {
        duration_sec: 10,
        priority: 100,
        success_chance: 1,
        success_state: { glucose: 110, pulsePresent: true },
      },
      establish_iv: {
        duration_sec: 300,
        priority: 80,
        success_chance: 1,
      },
      ct_brain_noncontrast: {
        duration_sec: 300,
        priority: 90,
        success_chance: 1,
        success_state: { pulsePresent: true },
      },
      labetalol_10mg: {
        duration_sec: 180,
        priority: 95,
        success_chance: 0.85,
        state_overrides: { bp: '175/100' },
      },
      alteplase: {
        duration_sec: 3600,
        priority: 100,
        success_chance: 1,
        success_state: { bp: '140/90', pulsePresent: true },
      },
    },
    success_conditions: [
      { elapsedSecGte: 180 },
      { vital: 'bp', max: 180, durationSec: 30 },
    ],
    failure_conditions: [{ elapsedSecGte: 900 }],
  },

  // Scenario 14 — pediatric_respiratory_arrest_asthma
  // Changes: expected_sequence updated, epinephrine_im→epinephrine_im_pediatric,
  //          high_flow_oxygen/albuterol_nebulizer/ipratropium_nebulizer/methylprednisolone_iv added,
  //          failure_conditions updated (spo2 max 65 added)
  {
    scenario_id: 'pediatric_respiratory_arrest_asthma',
    title: 'Pediatric Resp. Arrest (Asthma)',
    patient: { name: 'Liam Park', age: '9yo', gender: 'M' },
    meta: { difficulty: 'Advanced', domain: 'Pediatric', estimatedDurationSec: 900, protocol: 'PALS' },
    initial_state: {
      hr: 160,
      bp: '90/60',
      spo2: 70,
      rhythm: 'Sinus',
      rr: 45,
      pulsePresent: true,
      glucose: 90,
    },
    baseline_progressions: [
      { vital: 'spo2', modifier: -1, interval_sec: 10 },
      { vital: 'hr', modifier: -2, interval_sec: 20 },
    ],
    expected_sequence: ['high_flow_oxygen', 'albuterol_nebulizer', 'ipratropium_nebulizer', 'methylprednisolone_iv', 'epinephrine_im_pediatric', 'rescue_breathing', 'intubation'],
    interventions: {
      high_flow_oxygen: {
        duration_sec: 600,
        priority: 100,
        state_overrides: { spo2: 88 },
      },
      albuterol_nebulizer: {
        duration_sec: 600,
        priority: 90,
        success_chance: 0.6,
        success_state: { spo2: 88, hr: 145, rr: 36, pulsePresent: true },
      },
      ipratropium_nebulizer: {
        duration_sec: 600,
        priority: 85,
        success_chance: 0.5,
        success_state: { spo2: 90, hr: 140, rr: 32, pulsePresent: true },
      },
      methylprednisolone_iv: {
        duration_sec: 300,
        priority: 80,
        success_chance: 0.4,
        success_state: { spo2: 88, hr: 138, rr: 34, pulsePresent: true },
      },
      rescue_breathing: {
        duration_sec: 60,
        priority: 80,
        success_chance: 0.8,
        success_state: { spo2: 94, hr: 120, rr: 24, pulsePresent: true },
      },
      intubation: {
        duration_sec: 600,
        priority: 100,
        success_chance: 0.9,
        success_state: { spo2: 99, hr: 110, rr: 20, pulsePresent: true },
      },
      epinephrine_im_pediatric: {
        duration_sec: 1800,
        priority: 90,
        success_chance: 0.8,
        success_state: { spo2: 92, hr: 130, rr: 30, pulsePresent: true },
      },
    },
    success_conditions: [
      { vital: 'spo2', min: 90, durationSec: 30 },
      { vital: 'rr', min: 18, max: 30, durationSec: 30 },
    ],
    failure_conditions: [
      { vital: 'hr', max: 0, durationSec: 1 },
      { vital: 'spo2', max: 65, durationSec: 30 },
    ],
  },

  // Scenario 15 — pediatric_pulseless_vfib
  // Changes: expected_sequence updated, defibrillate & epinephrine_1mg removed,
  //          defibrillate_pediatric/epinephrine_peds_01mgkg/amiodarone_peds_5mgkg added
  {
    scenario_id: 'pediatric_pulseless_vfib',
    title: 'Pediatric Pulseless Arrest (VFib)',
    patient: { name: 'Sophie Grant', age: '7yo', gender: 'F' },
    meta: { difficulty: 'Advanced', domain: 'Pediatric', estimatedDurationSec: 900, protocol: 'PALS' },
    initial_state: {
      hr: 0,
      bp: '0/0',
      spo2: 0,
      rhythm: 'VFib',
      rr: 0,
      pulsePresent: false,
      glucose: 100,
    },
    baseline_progressions: [],
    expected_sequence: ['cpr', 'defibrillate_pediatric', 'epinephrine_peds_01mgkg', 'amiodarone_peds_5mgkg'],
    interventions: {
      cpr: {
        duration_sec: 120,
        priority: 10,
        state_overrides: { bp: '60/20' },
      },
      defibrillate_pediatric: {
        duration_sec: 10,
        priority: 100,
        requires_rhythm: ['VFib', 'VTach'],
        success_chance: 0.8,
        success_state: { rhythm: 'Sinus', hr: 120, bp: '95/60', spo2: 98, rr: 20, pulsePresent: true },
      },
      epinephrine_peds_01mgkg: {
        duration_sec: 240,
        priority: 5,
        success_chance: 0.2,
        success_state: { rhythm: 'Sinus', hr: 115, bp: '85/50', rr: 18, pulsePresent: true },
      },
      amiodarone_peds_5mgkg: {
        duration_sec: 600,
        priority: 6,
        success_chance: 0.4,
      },
    },
    success_conditions: arrestSuccess(30),
    failure_conditions: [{ elapsedSecGte: 600 }],
  },

  // BLS Scenario 1 — bls_adult_cardiac_arrest_bystander
  // High-quality adult CPR (single rescuer): 30:2, 2–2.4 in compressions, 100–120/min
  // BLS audit: added check_carotid_pulse (X3), open_airway_head_tilt_chin_lift (X5), resume_cpr_post_shock (X4)
  {
    scenario_id: 'bls_adult_cardiac_arrest_bystander',
    title: 'Adult Cardiac Arrest — Bystander CPR',
    patient: { name: 'George Marsh', age: '54yo', gender: 'M' },
    meta: { difficulty: 'Beginner', domain: 'Cardiac', estimatedDurationSec: 600, protocol: 'BLS' },
    initial_state: {
      hr: 0,
      bp: '0/0',
      spo2: 0,
      rhythm: 'Asystole',
      rr: 0,
      pulsePresent: false,
      glucose: 108,
    },
    baseline_progressions: [],
    scheduledStateChanges: [
      {
        id: 'bystander_delay_deterioration',
        atSec: 300,
        changes: { glucose: 80 },
        message: 'Three minutes without CPR. Brain injury risk increases. Begin compressions immediately — push hard (2–2.4 in), push fast (100–120/min).',
      },
    ],
    expected_sequence: ['check_responsiveness', 'call_911', 'check_carotid_pulse', 'cpr_30_2', 'open_airway_head_tilt_chin_lift', 'rescue_breathing', 'aed_attach', 'resume_cpr_post_shock'],
    interventions: {
      check_responsiveness: {
        duration_sec: 10,
        priority: 200,
        success_chance: 1,
        success_state: { pulsePresent: false },
      },
      call_911: {
        duration_sec: 15,
        priority: 190,
        success_chance: 1,
      },
      check_carotid_pulse: {
        duration_sec: 10,
        priority: 90,
        success_chance: 1,
        success_state: {},
      },
      cpr_30_2: {
        duration_sec: 120,
        priority: 100,
        state_overrides: { bp: '60/20', spo2: 80 },
      },
      open_airway_head_tilt_chin_lift: {
        duration_sec: 10,
        priority: 85,
        success_chance: 1,
        success_state: {},
      },
      rescue_breathing: {
        duration_sec: 60,
        priority: 80,
        state_overrides: { spo2: 90 },
      },
      aed_attach: {
        duration_sec: 30,
        priority: 150,
        success_chance: 0.55,
        success_state: { rhythm: 'Sinus', hr: 80, bp: '100/60', spo2: 94, rr: 12, pulsePresent: true },
      },
      resume_cpr_post_shock: {
        duration_sec: 120,
        priority: 70,
        success_chance: 1,
        success_state: {},
      },
    },
    success_conditions: arrestSuccess(30),
    failure_conditions: [{ elapsedSecGte: 600 }],
  },

  // BLS Scenario 2 — bls_adult_two_rescuer_cpr
  // Two-rescuer adult CPR: 30:2, role switching every 2 min, bag-valve-mask ventilation
  // BLS audit: added check_responsiveness (X1), call_911 (X2), check_carotid_pulse (X3),
  //   open_airway_head_tilt_chin_lift (X5), resume_cpr_post_shock (X4)
  {
    scenario_id: 'bls_adult_two_rescuer_cpr',
    title: 'Adult Cardiac Arrest — Two-Rescuer CPR',
    patient: { name: 'Patricia Lane', age: '62yo', gender: 'F' },
    meta: { difficulty: 'Intermediate', domain: 'Cardiac', estimatedDurationSec: 720, protocol: 'BLS' },
    initial_state: {
      hr: 0,
      bp: '0/0',
      spo2: 0,
      rhythm: 'VFib',
      rr: 0,
      pulsePresent: false,
      glucose: 100,
    },
    baseline_progressions: [],
    scheduledStateChanges: [
      {
        id: 'two_rescuer_vfib_deterioration',
        atSec: 420,
        changes: { rhythm: 'Asystole' },
        message: 'VFib deteriorated to asystole without defibrillation. Switch compressor roles every 2 minutes to maintain high-quality CPR.',
      },
    ],
    expected_sequence: ['check_responsiveness', 'call_911', 'check_carotid_pulse', 'cpr_30_2', 'open_airway_head_tilt_chin_lift', 'bag_valve_mask', 'switch_compressor_roles', 'aed_attach', 'resume_cpr_post_shock'],
    interventions: {
      check_responsiveness: {
        duration_sec: 10,
        priority: 200,
        success_chance: 1,
        success_state: {},
      },
      call_911: {
        duration_sec: 15,
        priority: 190,
        success_chance: 1,
      },
      check_carotid_pulse: {
        duration_sec: 10,
        priority: 90,
        success_chance: 1,
        success_state: {},
      },
      cpr_30_2: {
        duration_sec: 120,
        priority: 100,
        state_overrides: { bp: '65/25', spo2: 82 },
      },
      open_airway_head_tilt_chin_lift: {
        duration_sec: 10,
        priority: 85,
        success_chance: 1,
        success_state: {},
      },
      bag_valve_mask: {
        duration_sec: 60,
        priority: 90,
        state_overrides: { spo2: 92 },
      },
      switch_compressor_roles: {
        duration_sec: 10,
        priority: 85,
        success_chance: 1,
        state_overrides: { bp: '70/30' },
      },
      aed_attach: {
        duration_sec: 30,
        priority: 150,
        requires_rhythm: ['VFib', 'VTach'],
        success_chance: 0.7,
        success_state: { rhythm: 'Sinus', hr: 88, bp: '105/65', spo2: 95, rr: 14, pulsePresent: true },
      },
      resume_cpr_post_shock: {
        duration_sec: 120,
        priority: 70,
        success_chance: 1,
        success_state: {},
      },
      rescue_breathing: {
        duration_sec: 60,
        priority: 70,
        state_overrides: { spo2: 88 },
      },
    },
    success_conditions: arrestSuccess(30),
    failure_conditions: [{ elapsedSecGte: 720 }],
  },

  // BLS Scenario 3 — bls_adult_aed_public_access
  // AED use (public access defibrillation): power on → attach pads → analyze → shock → resume CPR
  // BLS audit: added check_responsiveness (X1), call_911 (X2), check_carotid_pulse (X3) to sequence and actions
  {
    scenario_id: 'bls_adult_aed_public_access',
    title: 'Adult Cardiac Arrest — Public AED',
    patient: { name: 'Howard Bell', age: '49yo', gender: 'M' },
    meta: { difficulty: 'Beginner', domain: 'Cardiac', estimatedDurationSec: 480, protocol: 'BLS' },
    initial_state: {
      hr: 0,
      bp: '0/0',
      spo2: 0,
      rhythm: 'VFib',
      rr: 0,
      pulsePresent: false,
      glucose: 115,
    },
    baseline_progressions: [],
    scheduledStateChanges: [
      {
        id: 'aed_delay_vfib_coarsening',
        atSec: 240,
        changes: {},
        message: 'Every minute without defibrillation reduces survival 7–10%. Deliver the AED shock immediately and resume CPR right after.',
      },
    ],
    expected_sequence: ['check_responsiveness', 'call_911', 'check_carotid_pulse', 'cpr_30_2', 'aed_power_on', 'aed_attach_pads', 'aed_analyze', 'aed_shock', 'resume_cpr_post_shock'],
    interventions: {
      check_responsiveness: {
        duration_sec: 10,
        priority: 210,
        success_chance: 1,
        success_state: {},
      },
      call_911: {
        duration_sec: 15,
        priority: 205,
        success_chance: 1,
      },
      check_carotid_pulse: {
        duration_sec: 10,
        priority: 90,
        success_chance: 1,
        success_state: {},
      },
      cpr_30_2: {
        duration_sec: 120,
        priority: 80,
        state_overrides: { bp: '60/20', spo2: 78 },
      },
      aed_power_on: {
        duration_sec: 10,
        priority: 200,
        success_chance: 1,
      },
      aed_attach_pads: {
        duration_sec: 20,
        priority: 195,
        success_chance: 1,
      },
      aed_analyze: {
        duration_sec: 15,
        priority: 190,
        requires_rhythm: ['VFib', 'VTach'],
        success_chance: 1,
      },
      aed_shock: {
        duration_sec: 5,
        priority: 185,
        requires_rhythm: ['VFib', 'VTach'],
        success_chance: 0.75,
        success_state: { rhythm: 'Sinus', hr: 82, bp: '108/68', spo2: 96, rr: 12, pulsePresent: true },
      },
      resume_cpr_post_shock: {
        duration_sec: 120,
        priority: 100,
        state_overrides: { bp: '68/28', spo2: 84 },
      },
    },
    success_conditions: arrestSuccess(30),
    failure_conditions: [{ elapsedSecGte: 480 }],
  },

  // BLS Scenario 4 — bls_child_cardiac_arrest
  // High-quality child CPR (1–8 yrs): ~2 in compressions, 100–120/min, 30:2 single rescuer
  // BLS audit: added check_carotid_pulse (X3), resume_cpr_post_shock (X4),
  //   fixed message (removed "1 breath per 3–5 sec"), fixed aed_attach label for pediatric pads
  {
    scenario_id: 'bls_child_cardiac_arrest',
    title: 'Pediatric Cardiac Arrest — Child CPR',
    patient: { name: 'Tyler Morris', age: '6yo', gender: 'M' },
    meta: { difficulty: 'Intermediate', domain: 'Pediatric', estimatedDurationSec: 600, protocol: 'BLS' },
    initial_state: {
      hr: 0,
      bp: '0/0',
      spo2: 0,
      rhythm: 'Asystole',
      rr: 0,
      pulsePresent: false,
      glucose: 90,
    },
    baseline_progressions: [],
    scheduledStateChanges: [
      {
        id: 'child_arrest_hypoxic_cause',
        atSec: 60,
        changes: {},
        message: 'Pediatric arrests are usually hypoxic. Give 1 breath per 30:2 cycle — push hard (~2 inches), push fast (100–120/min).',
      },
    ],
    expected_sequence: ['check_responsiveness', 'call_911', 'check_carotid_pulse', 'cpr_30_2_child', 'rescue_breathing_child', 'aed_attach', 'resume_cpr_post_shock'],
    interventions: {
      check_responsiveness: {
        duration_sec: 10,
        priority: 200,
        success_chance: 1,
        success_state: { pulsePresent: false },
      },
      call_911: {
        duration_sec: 15,
        priority: 190,
        success_chance: 1,
      },
      check_carotid_pulse: {
        duration_sec: 10,
        priority: 90,
        success_chance: 1,
        success_state: {},
      },
      cpr_30_2_child: {
        duration_sec: 120,
        priority: 100,
        state_overrides: { bp: '50/15', spo2: 76 },
      },
      rescue_breathing_child: {
        duration_sec: 60,
        priority: 90,
        state_overrides: { spo2: 88 },
      },
      // Use pediatric dose-attenuator pads if available (patient <8 yr / <25 kg)
      aed_attach: {
        duration_sec: 30,
        priority: 150,
        success_chance: 0.65,
        success_state: { rhythm: 'Sinus', hr: 115, bp: '90/55', spo2: 96, rr: 22, pulsePresent: true },
      },
      resume_cpr_post_shock: {
        duration_sec: 120,
        priority: 70,
        success_chance: 1,
        success_state: {},
      },
    },
    success_conditions: [
      { vital: 'pulsePresent', equals: true, durationSec: 30 },
      { vital: 'spo2', min: 94, durationSec: 30 },
    ],
    failure_conditions: [{ elapsedSecGte: 600 }],
  },

  // BLS Scenario 5 — bls_child_two_rescuer_cpr
  // Two-rescuer child CPR: 15:2 ratio, switch roles, bag-valve-mask
  // BLS audit: added check_carotid_pulse (X3), resume_cpr_post_shock (X4),
  //   fixed aed_attach label for pediatric dose-attenuator pads
  {
    scenario_id: 'bls_child_two_rescuer_cpr',
    title: 'Pediatric Cardiac Arrest — Two-Rescuer Child',
    patient: { name: 'Avery Johnson', age: '4yo', gender: 'F' },
    meta: { difficulty: 'Intermediate', domain: 'Pediatric', estimatedDurationSec: 600, protocol: 'BLS' },
    initial_state: {
      hr: 0,
      bp: '0/0',
      spo2: 0,
      rhythm: 'Asystole',
      rr: 0,
      pulsePresent: false,
      glucose: 85,
    },
    baseline_progressions: [],
    scheduledStateChanges: [
      {
        id: 'child_two_rescuer_ratio_reminder',
        atSec: 120,
        changes: {},
        message: 'Two-rescuer child CPR uses a 15:2 compression-to-ventilation ratio. Switch compressor every 2 minutes to prevent fatigue.',
      },
    ],
    expected_sequence: ['cpr_15_2_child', 'check_carotid_pulse', 'bag_valve_mask_child', 'switch_compressor_roles', 'aed_attach', 'resume_cpr_post_shock'],
    interventions: {
      check_carotid_pulse: {
        duration_sec: 10,
        priority: 90,
        success_chance: 1,
        success_state: {},
      },
      cpr_15_2_child: {
        duration_sec: 120,
        priority: 100,
        state_overrides: { bp: '52/18', spo2: 78 },
      },
      bag_valve_mask_child: {
        duration_sec: 60,
        priority: 90,
        state_overrides: { spo2: 90 },
      },
      switch_compressor_roles: {
        duration_sec: 10,
        priority: 85,
        success_chance: 1,
        state_overrides: { bp: '55/20' },
      },
      // Use pediatric dose-attenuator pads if available (patient <8 yr / <25 kg)
      aed_attach: {
        duration_sec: 30,
        priority: 150,
        success_chance: 0.7,
        success_state: { rhythm: 'Sinus', hr: 118, bp: '92/58', spo2: 97, rr: 24, pulsePresent: true },
      },
      resume_cpr_post_shock: {
        duration_sec: 120,
        priority: 70,
        success_chance: 1,
        success_state: {},
      },
      rescue_breathing_child: {
        duration_sec: 60,
        priority: 80,
        state_overrides: { spo2: 86 },
      },
    },
    success_conditions: [
      { vital: 'pulsePresent', equals: true, durationSec: 30 },
      { vital: 'spo2', min: 94, durationSec: 30 },
    ],
    failure_conditions: [{ elapsedSecGte: 600 }],
  },

  // BLS Scenario 6 — bls_infant_cardiac_arrest
  // High-quality infant CPR (single rescuer): ~1.5 in, 100–120/min, 30:2, 2-finger technique
  // BLS audit (CRITICAL): AHA lone-rescuer infant protocol — 2 min CPR BEFORE calling 911
  //   Reordered: check_responsiveness → check_brachial_pulse → open_airway → cpr → rescue_breathing → call_911
  //   Fixed message: "lower half of sternum" → "just below the nipple line"
  {
    scenario_id: 'bls_infant_cardiac_arrest',
    title: 'Infant Cardiac Arrest — Single Rescuer',
    patient: { name: 'Baby Emma', age: '4mo', gender: 'F' },
    meta: { difficulty: 'Intermediate', domain: 'Pediatric', estimatedDurationSec: 480, protocol: 'BLS' },
    initial_state: {
      hr: 0,
      bp: '0/0',
      spo2: 0,
      rhythm: 'Asystole',
      rr: 0,
      pulsePresent: false,
      glucose: 70,
    },
    baseline_progressions: [],
    scheduledStateChanges: [
      {
        id: 'infant_arrest_technique_reminder',
        atSec: 60,
        changes: {},
        message: 'Infant CPR: use 2-finger technique just below the nipple line. Compress 1.5 inches at 100–120/min. Deliver 1 breath every 3–5 seconds.',
      },
    ],
    expected_sequence: ['check_responsiveness', 'check_brachial_pulse', 'open_airway_head_tilt_chin_lift', 'cpr_30_2_infant_2finger', 'rescue_breathing_infant', 'call_911'],
    interventions: {
      check_responsiveness: {
        duration_sec: 10,
        priority: 200,
        success_chance: 1,
        success_state: {},
      },
      check_brachial_pulse: {
        duration_sec: 10,
        priority: 90,
        success_chance: 1,
        success_state: {},
      },
      open_airway_head_tilt_chin_lift: {
        duration_sec: 10,
        priority: 85,
        success_chance: 1,
        success_state: {},
      },
      cpr_30_2_infant_2finger: {
        duration_sec: 120,
        priority: 100,
        state_overrides: { bp: '40/15', spo2: 72 },
      },
      rescue_breathing_infant: {
        duration_sec: 60,
        priority: 90,
        success_chance: 0.6,
        success_state: { rhythm: 'Sinus', hr: 125, bp: '70/40', spo2: 96, rr: 30, pulsePresent: true },
      },
      call_911: {
        duration_sec: 15,
        priority: 190,
        success_chance: 1,
      },
    },
    success_conditions: [
      { vital: 'pulsePresent', equals: true, durationSec: 20 },
      { vital: 'spo2', min: 94, durationSec: 20 },
    ],
    failure_conditions: [{ elapsedSecGte: 480 }],
  },

  // BLS Scenario 7 — bls_infant_two_rescuer_cpr
  // Two-rescuer infant CPR: 15:2, 2-thumb encircling technique, 1 breath per 3–5 sec
  // BLS audit: added check_responsiveness (X1), call_911 (X2 — after check_responsiveness, second rescuer calls),
  //   check_brachial_pulse (X3)
  {
    scenario_id: 'bls_infant_two_rescuer_cpr',
    title: 'Infant Cardiac Arrest — Two-Rescuer',
    patient: { name: 'Baby Noah', age: '2mo', gender: 'M' },
    meta: { difficulty: 'Advanced', domain: 'Pediatric', estimatedDurationSec: 480, protocol: 'BLS' },
    initial_state: {
      hr: 0,
      bp: '0/0',
      spo2: 0,
      rhythm: 'Asystole',
      rr: 0,
      pulsePresent: false,
      glucose: 65,
    },
    baseline_progressions: [],
    scheduledStateChanges: [
      {
        id: 'infant_two_rescuer_technique_reminder',
        atSec: 90,
        changes: {},
        message: 'Two-rescuer infant CPR: use the 2-thumb encircling technique for superior compression force. Ratio is 15:2. Ventilate every 3–5 seconds.',
      },
    ],
    expected_sequence: ['check_responsiveness', 'call_911', 'check_brachial_pulse', 'cpr_15_2_infant_2thumb', 'bag_valve_mask_infant', 'switch_compressor_roles'],
    interventions: {
      check_responsiveness: {
        duration_sec: 10,
        priority: 200,
        success_chance: 1,
        success_state: {},
      },
      call_911: {
        duration_sec: 15,
        priority: 190,
        success_chance: 1,
      },
      check_brachial_pulse: {
        duration_sec: 10,
        priority: 90,
        success_chance: 1,
        success_state: {},
      },
      cpr_15_2_infant_2thumb: {
        duration_sec: 120,
        priority: 100,
        state_overrides: { bp: '42/18', spo2: 74 },
      },
      bag_valve_mask_infant: {
        duration_sec: 60,
        priority: 90,
        success_chance: 0.7,
        success_state: { rhythm: 'Sinus', hr: 130, bp: '72/42', spo2: 97, rr: 32, pulsePresent: true },
      },
      switch_compressor_roles: {
        duration_sec: 10,
        priority: 85,
        success_chance: 1,
        state_overrides: { bp: '44/20' },
      },
      rescue_breathing_infant: {
        duration_sec: 60,
        priority: 80,
        state_overrides: { spo2: 80 },
      },
    },
    success_conditions: [
      { vital: 'pulsePresent', equals: true, durationSec: 20 },
      { vital: 'spo2', min: 94, durationSec: 20 },
    ],
    failure_conditions: [{ elapsedSecGte: 480 }],
  },

  // BLS Scenario 8 — bls_adult_choking_responsive
  // Responsive adult choking: 5 back blows + 5 abdominal thrusts (Heimlich), repeat until dislodged or unresponsive
  {
    scenario_id: 'bls_adult_choking_responsive',
    title: 'Adult Foreign Body Airway Obstruction — Responsive',
    patient: { name: 'Diana Cole', age: '45yo', gender: 'F' },
    meta: { difficulty: 'Beginner', domain: 'Emergency', estimatedDurationSec: 300, protocol: 'BLS' },
    initial_state: {
      hr: 120,
      bp: '140/88',
      spo2: 82,
      rhythm: 'Sinus',
      rr: 0,
      pulsePresent: true,
      glucose: 100,
    },
    baseline_progressions: [
      { vital: 'spo2', modifier: -3, interval_sec: 10, decay_type: 'linear' },
      { vital: 'hr', modifier: 2, interval_sec: 15 },
    ],
    scheduledStateChanges: [
      {
        id: 'choking_unresponsive_transition',
        atSec: 180,
        changes: { hr: 0, bp: '0/0', spo2: 0, rhythm: 'Asystole', rr: 0, pulsePresent: false },
        message: 'Patient became unresponsive from hypoxia. Gently lower to the ground and begin CPR — each compression attempt may dislodge the obstruction.',
      },
    ],
    expected_sequence: ['ask_if_choking', 'back_blows_5', 'abdominal_thrusts_heimlich_5', 'call_911'],
    interventions: {
      ask_if_choking: {
        duration_sec: 5,
        priority: 200,
        success_chance: 1,
      },
      back_blows_5: {
        duration_sec: 15,
        priority: 100,
        success_chance: 0.3,
        success_state: { spo2: 96, rr: 16, hr: 95, pulsePresent: true },
      },
      abdominal_thrusts_heimlich_5: {
        duration_sec: 15,
        priority: 100,
        success_chance: 0.5,
        success_state: { spo2: 97, rr: 14, hr: 90, pulsePresent: true },
      },
      call_911: {
        duration_sec: 15,
        priority: 90,
        success_chance: 1,
      },
    },
    success_conditions: [
      { vital: 'spo2', min: 94, durationSec: 15 },
      { vital: 'rr', min: 10, durationSec: 15 },
    ],
    failure_conditions: [
      { vital: 'spo2', max: 60, durationSec: 20 },
      { vital: 'pulsePresent', equals: false, durationSec: 1 },
    ],
  },

  // BLS Scenario 9 — bls_adult_choking_unresponsive
  // Unresponsive adult choking → lower to ground → CPR (each compression may dislodge object), look in mouth before ventilating
  {
    scenario_id: 'bls_adult_choking_unresponsive',
    title: 'Adult Foreign Body Airway Obstruction — Unresponsive',
    patient: { name: 'Marcus Webb', age: '38yo', gender: 'M' },
    meta: { difficulty: 'Intermediate', domain: 'Emergency', estimatedDurationSec: 420, protocol: 'BLS' },
    initial_state: {
      hr: 0,
      bp: '0/0',
      spo2: 0,
      rhythm: 'Asystole',
      rr: 0,
      pulsePresent: false,
      glucose: 105,
    },
    baseline_progressions: [],
    scheduledStateChanges: [
      {
        id: 'obstruction_cpr_reminder',
        atSec: 60,
        changes: {},
        message: 'Do NOT perform blind finger sweeps. Look in the mouth before each rescue breath; remove the object only if visible. Each compression may help expel the obstruction.',
      },
    ],
    expected_sequence: ['call_911', 'lower_to_ground', 'cpr_30_2', 'look_in_mouth_before_breath', 'rescue_breathing'],
    interventions: {
      call_911: {
        duration_sec: 15,
        priority: 200,
        success_chance: 1,
      },
      lower_to_ground: {
        duration_sec: 10,
        priority: 190,
        success_chance: 1,
      },
      cpr_30_2: {
        duration_sec: 120,
        priority: 100,
        state_overrides: { bp: '55/18', spo2: 72 },
      },
      look_in_mouth_before_breath: {
        duration_sec: 5,
        priority: 95,
        success_chance: 0.35,
        success_state: { rr: 12, spo2: 88, pulsePresent: false },
      },
      rescue_breathing: {
        duration_sec: 60,
        priority: 90,
        success_chance: 0.6,
        success_state: { rhythm: 'Sinus', hr: 78, bp: '100/62', spo2: 95, rr: 14, pulsePresent: true },
      },
    },
    success_conditions: [
      { vital: 'pulsePresent', equals: true, durationSec: 20 },
      { vital: 'spo2', min: 94, durationSec: 20 },
    ],
    failure_conditions: [{ elapsedSecGte: 420 }],
  },

  // BLS Scenario 10 — bls_infant_choking
  // Infant choking: 5 back slaps + 5 chest thrusts (NOT abdominal thrusts), repeat until dislodged or unresponsive
  {
    scenario_id: 'bls_infant_choking',
    title: 'Infant Foreign Body Airway Obstruction',
    patient: { name: 'Baby Lily', age: '8mo', gender: 'F' },
    meta: { difficulty: 'Beginner', domain: 'Pediatric', estimatedDurationSec: 300, protocol: 'BLS' },
    initial_state: {
      hr: 170,
      bp: '70/40',
      spo2: 78,
      rhythm: 'Sinus',
      rr: 0,
      pulsePresent: true,
      glucose: 75,
    },
    baseline_progressions: [
      { vital: 'spo2', modifier: -4, interval_sec: 10, decay_type: 'linear' },
      { vital: 'hr', modifier: 3, interval_sec: 15 },
    ],
    scheduledStateChanges: [
      {
        id: 'infant_choking_unresponsive',
        atSec: 150,
        changes: { hr: 0, bp: '0/0', spo2: 0, rhythm: 'Asystole', rr: 0, pulsePresent: false },
        message: 'Infant became unresponsive. Begin infant CPR immediately — support head/neck, 30:2 compressions to breaths. Check mouth for visible object before each ventilation.',
      },
    ],
    expected_sequence: ['position_infant_face_down', 'back_slaps_infant_5', 'chest_thrusts_infant_5', 'call_911'],
    interventions: {
      position_infant_face_down: {
        duration_sec: 10,
        priority: 200,
        success_chance: 1,
      },
      back_slaps_infant_5: {
        duration_sec: 15,
        priority: 100,
        success_chance: 0.35,
        success_state: { spo2: 95, rr: 28, hr: 140, pulsePresent: true },
      },
      chest_thrusts_infant_5: {
        duration_sec: 15,
        priority: 100,
        success_chance: 0.5,
        success_state: { spo2: 96, rr: 30, hr: 138, pulsePresent: true },
      },
      abdominal_thrusts_heimlich_5: {
        // Distractor: WRONG technique for infants — abdominal thrusts are contraindicated
        duration_sec: 15,
        priority: 1,
        success_chance: 0,
      },
      call_911: {
        duration_sec: 15,
        priority: 90,
        success_chance: 1,
      },
    },
    success_conditions: [
      { vital: 'spo2', min: 94, durationSec: 15 },
      { vital: 'rr', min: 20, durationSec: 15 },
    ],
    failure_conditions: [
      { vital: 'spo2', max: 55, durationSec: 20 },
      { vital: 'pulsePresent', equals: false, durationSec: 1 },
    ],
  },

  // BLS Scenario 11 — bls_opioid_overdose_naloxone
  // Opioid emergency: rescue breathing while waiting for naloxone; naloxone intranasal 4mg or IM 0.4–2mg; repeat q2–4 min
  // BLS audit: added check_responsiveness (X1), sternal_rub_stimulation, moved call_911 before rescue_breathing,
  //   added naloxone_im_repeat to expected_sequence
  {
    scenario_id: 'bls_opioid_overdose_naloxone',
    title: 'Opioid Overdose — Naloxone & Rescue Breathing',
    patient: { name: 'Kevin Shaw', age: '31yo', gender: 'M' },
    meta: { difficulty: 'Intermediate', domain: 'Emergency', estimatedDurationSec: 600, protocol: 'BLS' },
    initial_state: {
      hr: 48,
      bp: '88/54',
      spo2: 72,
      rhythm: 'Bradycardia',
      rr: 2,
      pulsePresent: true,
      glucose: 98,
    },
    baseline_progressions: [
      { vital: 'spo2', modifier: -2, interval_sec: 10, decay_type: 'linear' },
      { vital: 'hr', modifier: -1, interval_sec: 30 },
      { vital: 'rr', modifier: -1, interval_sec: 20 },
    ],
    scheduledStateChanges: [
      {
        id: 'opioid_cardiac_arrest',
        atSec: 300,
        changes: { hr: 0, bp: '0/0', spo2: 0, rhythm: 'Asystole', rr: 0, pulsePresent: false },
        message: 'Opioid-induced respiratory failure progressed to cardiac arrest. Begin CPR. Naloxone is still indicated — administer 4 mg intranasal or 0.4 mg IM; repeat every 2–4 minutes.',
      },
    ],
    expected_sequence: ['check_responsiveness', 'sternal_rub_stimulation', 'call_911', 'rescue_breathing', 'naloxone_intranasal_4mg', 'naloxone_im_repeat', 'recovery_position'],
    interventions: {
      check_responsiveness: {
        duration_sec: 10,
        priority: 200,
        success_chance: 1,
        success_state: {},
      },
      sternal_rub_stimulation: {
        duration_sec: 10,
        priority: 95,
        success_chance: 0.1,
        success_state: {},
      },
      rescue_breathing: {
        duration_sec: 60,
        priority: 100,
        state_overrides: { spo2: 88, rr: 8 },
      },
      call_911: {
        duration_sec: 15,
        priority: 190,
        success_chance: 1,
      },
      naloxone_intranasal_4mg: {
        duration_sec: 180,
        priority: 150,
        success_chance: 0.85,
        success_state: { rr: 14, spo2: 96, hr: 88, rhythm: 'Sinus', bp: '110/68', pulsePresent: true },
      },
      naloxone_im_repeat: {
        duration_sec: 120,
        priority: 140,
        success_chance: 0.9,
        success_state: { rr: 16, spo2: 97, hr: 90, rhythm: 'Sinus', bp: '112/70', pulsePresent: true },
      },
      recovery_position: {
        duration_sec: 20,
        priority: 80,
        success_chance: 1,
        state_overrides: { spo2: 90 },
      },
      cpr_30_2: {
        duration_sec: 120,
        priority: 50,
        state_overrides: { bp: '55/18', spo2: 78 },
      },
    },
    success_conditions: [
      { vital: 'rr', min: 12, max: 20, durationSec: 30 },
      { vital: 'spo2', min: 94, durationSec: 30 },
    ],
    failure_conditions: [
      { vital: 'spo2', max: 55, durationSec: 30 },
      { vital: 'pulsePresent', equals: false, durationSec: 1 },
    ],
  },

  // BLS Scenario 12 — bls_drowning_submersion
  // Submersion victim: rescue breathing is the priority (hypoxic arrest); AED after 5 initial rescue breaths
  // BLS audit: added remove_from_water (first step), check_responsiveness (X1), dry_chest_before_aed (before aed_attach),
  //   fixed ventilation-rate message from "1 breath every 6 seconds" → "1 breath every 5–6 seconds (10–12 breaths/min)"
  {
    scenario_id: 'bls_drowning_submersion',
    title: 'Drowning — Submersion Rescue BLS',
    patient: { name: 'Amber Nguyen', age: '22yo', gender: 'F' },
    meta: { difficulty: 'Intermediate', domain: 'Emergency', estimatedDurationSec: 600, protocol: 'BLS' },
    initial_state: {
      hr: 0,
      bp: '0/0',
      spo2: 0,
      rhythm: 'Asystole',
      rr: 0,
      pulsePresent: false,
      glucose: 95,
    },
    baseline_progressions: [],
    scheduledStateChanges: [
      {
        id: 'drowning_hypoxic_arrest_note',
        atSec: 30,
        changes: {},
        message: 'Drowning causes hypoxic cardiac arrest. Start with 5 rescue breaths before compressions. Ventilation is the priority — 1 breath every 5–6 seconds (10–12 breaths/min) once airway is secured.',
      },
    ],
    expected_sequence: ['remove_from_water', 'check_responsiveness', 'call_911', 'open_airway_head_tilt_chin_lift', 'initial_rescue_breaths_5', 'cpr_30_2', 'rescue_breathing', 'dry_chest_before_aed', 'aed_attach'],
    interventions: {
      remove_from_water: {
        duration_sec: 15,
        priority: 110,
        success_chance: 1,
        success_state: {},
      },
      check_responsiveness: {
        duration_sec: 10,
        priority: 200,
        success_chance: 1,
        success_state: {},
      },
      call_911: {
        duration_sec: 15,
        priority: 200,
        success_chance: 1,
      },
      open_airway_head_tilt_chin_lift: {
        duration_sec: 10,
        priority: 195,
        success_chance: 1,
      },
      initial_rescue_breaths_5: {
        duration_sec: 30,
        priority: 190,
        state_overrides: { spo2: 70 },
      },
      cpr_30_2: {
        duration_sec: 120,
        priority: 100,
        state_overrides: { bp: '55/18', spo2: 78 },
      },
      rescue_breathing: {
        duration_sec: 60,
        priority: 120,
        state_overrides: { spo2: 88 },
      },
      dry_chest_before_aed: {
        duration_sec: 10,
        priority: 45,
        success_chance: 1,
        success_state: {},
      },
      aed_attach: {
        duration_sec: 30,
        priority: 80,
        success_chance: 0.5,
        success_state: { rhythm: 'Sinus', hr: 75, bp: '100/60', spo2: 95, rr: 14, pulsePresent: true },
      },
      bag_valve_mask: {
        duration_sec: 60,
        priority: 110,
        success_chance: 0.65,
        success_state: { rhythm: 'Sinus', hr: 72, bp: '98/58', spo2: 96, rr: 12, pulsePresent: true },
      },
    },
    success_conditions: [
      { vital: 'pulsePresent', equals: true, durationSec: 30 },
      { vital: 'spo2', min: 94, durationSec: 30 },
    ],
    failure_conditions: [{ elapsedSecGte: 600 }],
  },
];
