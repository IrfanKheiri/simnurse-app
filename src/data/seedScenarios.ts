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
    meta: { difficulty: 'Advanced', domain: 'Cardiac', estimatedDurationSec: 900 },
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
    meta: { difficulty: 'Advanced', domain: 'Cardiac', estimatedDurationSec: 1200 },
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
    meta: { difficulty: 'Advanced', domain: 'Cardiac', estimatedDurationSec: 900 },
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
    meta: { difficulty: 'Advanced', domain: 'Cardiac', estimatedDurationSec: 1200 },
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
    meta: { difficulty: 'Advanced', domain: 'Cardiac', estimatedDurationSec: 1200 },
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
  {
    scenario_id: 'adult_respiratory_arrest_opioid',
    title: 'Adult Resp. Arrest (Opioid Overdose)',
    patient: { name: 'Carla Webb', age: '34yo', gender: 'F' },
    meta: { difficulty: 'Intermediate', domain: 'Respiratory', estimatedDurationSec: 600 },
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
    expected_sequence: ['rescue_breathing', 'naloxone_2mg'],
    interventions: {
      rescue_breathing: {
        duration_sec: 60,
        priority: 80,
        state_overrides: { spo2: 98 },
      },
      naloxone_2mg: {
        duration_sec: 1800,
        priority: 100,
        success_chance: 1,
        success_state: { rr: 14, spo2: 96, hr: 80, pulsePresent: true },
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
    meta: { difficulty: 'Intermediate', domain: 'Cardiac', estimatedDurationSec: 600 },
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
    meta: { difficulty: 'Intermediate', domain: 'Cardiac', estimatedDurationSec: 600 },
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
    meta: { difficulty: 'Advanced', domain: 'Cardiac', estimatedDurationSec: 600 },
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
    meta: { difficulty: 'Advanced', domain: 'Obstetric', estimatedDurationSec: 900 },
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
    meta: { difficulty: 'Intermediate', domain: 'Emergency', estimatedDurationSec: 600 },
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
    meta: { difficulty: 'Advanced', domain: 'Cardiac', estimatedDurationSec: 1200 },
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
    meta: { difficulty: 'Intermediate', domain: 'Neurological', estimatedDurationSec: 900 },
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
    meta: { difficulty: 'Advanced', domain: 'Pediatric', estimatedDurationSec: 900 },
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
    meta: { difficulty: 'Advanced', domain: 'Pediatric', estimatedDurationSec: 900 },
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
];
