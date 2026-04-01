import type { Condition, Scenario } from '../types/scenario';

const arrestSuccess = (durationSec: number): Condition[] => [
  { vital: 'pulsePresent', equals: true, durationSec },
  { vital: 'rhythm', equals: 'Sinus', durationSec },
];

// Source of truth note: scenario `expected_sequence` ordering and intervention `rationale`
// entries in this file are canonical for runtime behavior and test coverage, including all
// BLS protocol flows. External markdown mirrors are optional and must not be required.

export const seedScenarios: Scenario[] = [
  // Scenario 1 — adult_vfib_arrest_witnessed
  // Changes: expected_sequence reordered (defibrillate first), vfib_to_asystole.atSec 180→420, failure elapsedSecGte 600→1200
  {
    scenario_id: 'adult_vfib_arrest_witnessed',
    title: 'Adult VFib Arrest (Witnessed)',
    patient: { name: 'James Harlow', age: '58yo', gender: 'M' },
    meta: { difficulty: 'Advanced', domain: 'Cardiac', estimatedDurationSec: 900, protocol: 'ACLS', completionPolicy: 'strict_sequence_required' },
    conclusion: 'Patient achieved ROSC following successful defibrillation and CPR. Transferred to ICU for post-arrest care and targeted temperature management.',
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
    expected_sequence: ['defibrillate', 'cpr', 'establish_iv', 'epinephrine_1mg', 'amiodarone_300mg'],
    interventions: {
      cpr: {
        duration_sec: 120,
        priority: 10,
        state_overrides: { bp: '60/20', spo2: 85 },
        rationale: 'High-quality chest compressions at 100–120/min and 2–2.4 inch depth maintain coronary and cerebral perfusion pressure during cardiac arrest, sustaining myocardial viability until defibrillation or ROSC.',
      },
      establish_iv: {
        duration_sec: 60,
        priority: 80,
        rationale: 'IV/IO access is the prerequisite for all pharmacological interventions in cardiac arrest; peripheral IV or intraosseous access must be established before epinephrine or antiarrhythmic drug administration per AHA 2020 ACLS guidelines.',
      },
      defibrillate: {
        duration_sec: 10,
        priority: 100,
        requires_rhythm: ['VFib', 'VTach'],
        rationale: 'Early defibrillation is the only definitive treatment for shockable rhythms (VFib/pVT); each minute of delay reduces survival by 7–10% per the AHA 2020 Chain of Survival guidelines.',
      },
      epinephrine_1mg: {
        duration_sec: 240,
        priority: 5,
        rationale: 'Epinephrine 1 mg IV/IO every 3–5 minutes increases coronary and cerebral perfusion pressure via alpha-1 vasoconstriction, improving the likelihood of ROSC in non-shockable and refractory arrest per AHA 2020 ACLS guidelines.',
      },
      amiodarone_300mg: {
        duration_sec: 600,
        priority: 6,
        success_chance: 1,
        success_state: { rhythm: 'Sinus', hr: 110, bp: '90/50', spo2: 96, rr: 14, pulsePresent: true },
        rationale: 'Amiodarone 300 mg IV/IO is the first-line antiarrhythmic for shock-refractory VFib/pVT; it stabilises the myocardium and reduces recurrence of ventricular fibrillation after defibrillation per AHA 2020 ACLS guidelines.',
      },
      rescue_breathing: {
        duration_sec: 60,
        priority: 8,
        state_overrides: { spo2: 95 },
      },
    },
    success_conditions: arrestSuccess(30),
    failure_conditions: [
      { vital: 'pulsePresent', equals: false, durationSec: 600 },
      { elapsedSecGte: 1200 },
    ],
  },

  // Scenario 2 — adult_asystole_unwitnessed
  // Changes: epinephrine_1mg.success_chance 0.2→0.08, defibrillate intervention removed (contraindicated)
  {
    scenario_id: 'adult_asystole_unwitnessed',
    title: 'Adult Asystole (Unwitnessed)',
    patient: { name: 'Martin Cross', age: '72yo', gender: 'M' },
    meta: { difficulty: 'Advanced', domain: 'Cardiac', estimatedDurationSec: 1200, protocol: 'ACLS' },
    conclusion: 'Patient achieved ROSC following sustained CPR and epinephrine administration. Prognosis remains guarded given prolonged unwitnessed arrest. ICU admission required.',
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
    expected_sequence: ['cpr', 'establish_iv', 'epinephrine_1mg'],
    interventions: {
      cpr: {
        duration_sec: 120,
        priority: 10,
        state_overrides: { bp: '50/15' },
        rationale: 'High-quality chest compressions at 100–120/min maintain coronary and cerebral perfusion pressure during arrest, and are the cornerstone of resuscitation while reversible causes are sought per AHA 2020 guidelines.',
      },
      establish_iv: {
        duration_sec: 60,
        priority: 80,
        rationale: 'IV/IO access is the prerequisite for all pharmacological interventions in cardiac arrest; peripheral IV or intraosseous access must be established before epinephrine or antiarrhythmic drug administration per AHA 2020 ACLS guidelines.',
      },
      epinephrine_1mg: {
        duration_sec: 240,
        priority: 50,
        success_chance: 0.08,
        success_state: { rhythm: 'Sinus', hr: 65, bp: '80/40', rr: 8, pulsePresent: true },
        rationale: 'Epinephrine 1 mg IV/IO every 3–5 minutes is the recommended vasopressor for asystole; it increases aortic diastolic pressure and coronary perfusion pressure, improving the likelihood of ROSC per AHA 2020 ACLS guidelines.',
      },
    },
    success_conditions: arrestSuccess(60),
    failure_conditions: [
      { vital: 'pulsePresent', equals: false, durationSec: 600 },
      { elapsedSecGte: 900 },
    ],
  },

  // Scenario 3 — adult_pulseless_vtach
  // Changes: expected_sequence reordered (defibrillate first), epinephrine_1mg added, failure elapsedSecGte 480→1200
  {
    scenario_id: 'adult_pulseless_vtach',
    title: 'Adult Pulseless VTach (Ischemic)',
    patient: { name: 'Derek Patel', age: '64yo', gender: 'M' },
    meta: { difficulty: 'Advanced', domain: 'Cardiac', estimatedDurationSec: 900, protocol: 'ACLS', completionPolicy: 'strict_sequence_required' },
    conclusion: 'Pulseless VTach terminated with defibrillation; ROSC achieved. Patient transferred to cardiac ICU for monitoring and investigation of ischemic cause.',
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
    expected_sequence: ['defibrillate', 'cpr', 'establish_iv', 'epinephrine_1mg', 'amiodarone_300mg'],
    interventions: {
      cpr: {
        duration_sec: 120,
        priority: 10,
        state_overrides: { bp: '70/30' },
        rationale: 'High-quality chest compressions at 100–120/min maintain coronary and cerebral perfusion pressure during arrest, sustaining myocardial viability until defibrillation is successful per AHA 2020 guidelines.',
      },
      establish_iv: {
        duration_sec: 60,
        priority: 80,
        rationale: 'IV/IO access is the prerequisite for all pharmacological interventions in cardiac arrest; peripheral IV or intraosseous access must be established before epinephrine or antiarrhythmic drug administration per AHA 2020 ACLS guidelines.',
      },
      defibrillate: {
        duration_sec: 10,
        priority: 100,
        requires_rhythm: ['VFib', 'VTach'],
        rationale: 'Early defibrillation is the only definitive treatment for shockable rhythms (VFib/pVT); each minute of delay reduces survival by 7–10% per the AHA 2020 Chain of Survival guidelines.',
      },
      epinephrine_1mg: {
        duration_sec: 240,
        priority: 5,
        rationale: 'Epinephrine 1 mg IV/IO every 3–5 minutes increases coronary and cerebral perfusion pressure via alpha-1 vasoconstriction, improving the likelihood of ROSC in refractory arrest per AHA 2020 ACLS guidelines.',
      },
      amiodarone_300mg: {
        duration_sec: 600,
        priority: 6,
        success_chance: 1,
        success_state: { rhythm: 'Sinus', hr: 95, bp: '120/80', spo2: 94, rr: 14, pulsePresent: true },
        rationale: 'Amiodarone 300 mg IV/IO is the first-line antiarrhythmic for shock-refractory VFib/pVT; it stabilises the myocardium and reduces recurrence of ventricular fibrillation after defibrillation per AHA 2020 ACLS guidelines.',
      },
    },
    success_conditions: arrestSuccess(30),
    failure_conditions: [
      { vital: 'pulsePresent', equals: false, durationSec: 600 },
      { elapsedSecGte: 1200 },
    ],
  },

  // Scenario 4 — adult_pea_hypovolemia
  // Changes: expected_sequence updated, establish_iv loses success_chance/success_state, normal_saline_bolus added
  {
    scenario_id: 'adult_pea_hypovolemia',
    title: 'Adult PEA (Hypovolemia)',
    patient: { name: 'Sandra Kim', age: '41yo', gender: 'F' },
    meta: { difficulty: 'Advanced', domain: 'Cardiac', estimatedDurationSec: 1200, protocol: 'ACLS' },
    conclusion: 'PEA arrest resolved with aggressive IV fluid resuscitation addressing hypovolemic cause. ROSC confirmed; patient admitted for haemorrhage workup and volume monitoring.',
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
        rationale: 'CPR maintains marginal cardiac output during PEA arrest; compressions are the bridge to treating the underlying reversible cause (hypovolaemia) per AHA 2020 ACLS guidelines.',
      },
      epinephrine_1mg: {
        duration_sec: 240,
        priority: 5,
        success_chance: 0.05,
        rationale: 'Epinephrine 1 mg IV/IO every 3–5 minutes increases coronary perfusion pressure via alpha-1 vasoconstriction; it is indicated in PEA in conjunction with addressing the reversible cause per AHA 2020 guidelines.',
      },
      establish_iv: {
        duration_sec: 300,
        priority: 80,
        rationale: 'IV/IO access is the prerequisite for all drug and fluid administration; rapid vascular access must be established before definitive pharmacological treatment of hypovolaemic PEA can begin.',
      },
      normal_saline_bolus: {
        duration_sec: 300,
        priority: 90,
        success_chance: 0.65,
        success_state: { rhythm: 'Sinus', hr: 120, bp: '85/40', rr: 16, spo2: 92, pulsePresent: true },
        rationale: 'Rapid IV fluid bolus (500 mL NS) is the definitive treatment for hypovolaemic PEA; restoring preload and cardiac output is the only intervention likely to achieve ROSC in this context per AHA 2020 guidelines.',
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
    conclusion: 'Hypoxic PEA arrest reversed following airway management and oxygenation. ROSC achieved; patient intubated and transferred to ICU for post-drowning monitoring.',
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
    expected_sequence: ['cpr', 'rescue_breathing', 'intubation', 'establish_iv', 'epinephrine_1mg'],
    interventions: {
      cpr: {
        duration_sec: 120,
        priority: 10,
        state_overrides: { bp: '60/20' },
        rationale: 'CPR maintains marginal perfusion during hypoxic PEA arrest; compressions combined with oxygenation are the primary interventions as hypoxia is the underlying cause per AHA 2020 ACLS guidelines.',
      },
      establish_iv: {
        duration_sec: 60,
        priority: 80,
        rationale: 'IV/IO access is the prerequisite for all pharmacological interventions in cardiac arrest; peripheral IV or intraosseous access must be established before epinephrine or antiarrhythmic drug administration per AHA 2020 ACLS guidelines.',
      },
      epinephrine_1mg: {
        duration_sec: 240,
        priority: 5,
        success_chance: 0.1,
        rationale: 'Epinephrine 1 mg IV/IO every 3–5 minutes increases coronary perfusion pressure and is indicated alongside airway management in hypoxic PEA when oxygenation alone has not restored circulation per AHA 2020 guidelines.',
      },
      rescue_breathing: {
        duration_sec: 120,
        priority: 80,
        success_chance: 0.45,
        success_state: { rhythm: 'Sinus', hr: 100, bp: '100/60', spo2: 96, rr: 10, pulsePresent: true },
        rationale: 'Rescue breathing directly addresses the hypoxic cause of PEA arrest; restoring oxygenation to the myocardium can restore organised electrical activity and ROSC without further interventions per AHA 2020 drowning/hypoxia guidelines.',
      },
      intubation: {
        duration_sec: 150,
        priority: 100,
        success_chance: 0.9,
        success_state: { rhythm: 'Sinus', hr: 95, bp: '105/65', spo2: 99, rr: 12, pulsePresent: true },
        rationale: 'Advanced airway management (endotracheal intubation) secures the airway and provides consistent high-flow oxygen delivery, which is essential for treating hypoxic cardiac arrest and preventing re-arrest per AHA 2020 guidelines.',
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
    conclusion: 'Opioid-induced respiratory depression reversed with naloxone. Patient regained spontaneous breathing and was placed in recovery position pending EMS arrival.',
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
        rationale: 'Confirming unresponsiveness with absent or inadequate breathing in a suspected opioid overdose is the entry point for the AHA 2020 opioid emergency algorithm before any intervention is attempted.',
      },
      sternal_rub_stimulation: {
        duration_sec: 10,
        priority: 95,
        success_chance: 0.1,
        success_state: {},
        rationale: 'Noxious stimulation tests the depth of CNS depression; a response may indicate partial opioid effect where less aggressive reversal is needed, guiding the urgency of naloxone administration per AHA 2020 opioid guidelines.',
      },
      call_911: {
        duration_sec: 15,
        priority: 190,
        success_chance: 1,
        rationale: 'Early EMS activation ensures IV naloxone, advanced airway management, and cardiac monitoring are en route in case of full cardiac arrest from opioid-induced respiratory failure per AHA 2020 guidelines.',
      },
      rescue_breathing: {
        duration_sec: 60,
        priority: 80,
        state_overrides: { spo2: 88 },
        rationale: 'Rescue breathing is the immediate temporising intervention in opioid-induced apnoea; assisted ventilations improve oxygenation while naloxone is obtained and takes effect, but they do not by themselves reverse the underlying opioid toxidrome per AHA 2020 guidelines.',
      },
      naloxone_intranasal_4mg: {
        duration_sec: 180,
        priority: 100,
        success_chance: 1,
        success_state: { rr: 8, spo2: 90, hr: 68, pulsePresent: true },
        rationale: '4 mg intranasal naloxone is the AHA 2023 updated first-line dose; the first dose may produce only a partial respiratory response in high-potency or long-acting opioid exposure, so ventilatory support must continue while reassessment occurs.',
      },
      naloxone_intranasal_repeat: {
        duration_sec: 120,
        priority: 55,
        success_chance: 1,
        success_state: { rr: 14, spo2: 96, hr: 82, pulsePresent: true },
        rationale: 'Repeat naloxone dosing every 2–4 minutes is required when the first dose yields only partial improvement; the repeat dose completes reversal of opioid-induced respiratory depression while rescue breathing continues between doses.',
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
  // Changes: expected_sequence updated, atropine_1mg→atropine_0_5mg with success_chance 0.8→0.6, transcutaneous_pacing added,
  //   route-based pilot added with optional pacing branch activated after IV access
  // Medical accuracy fix: added establish_iv between oxygen_nrb and atropine_0_5mg — atropine is an
  //   IV drug; AHA 2020 ACLS bradycardia algorithm requires IV/IO access before any pharmacological intervention
  {
    scenario_id: 'adult_unstable_bradycardia',
    title: 'Adult Unstable Bradycardia',
    patient: { name: 'Walter Burns', age: '67yo', gender: 'M' },
    meta: { difficulty: 'Intermediate', domain: 'Cardiac', estimatedDurationSec: 600, protocol: 'ACLS' },
    conclusion: 'Symptomatic bradycardia stabilized with ACLS therapy. Cardiology consulted for ongoing rhythm management and consideration of permanent pacemaker implantation if clinically indicated.',
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
    expected_sequence: ['oxygen_nrb', 'establish_iv', 'atropine_0_5mg', 'transcutaneous_pacing'],
    protocol: {
      primary: {
        steps: ['oxygen_nrb', 'establish_iv', 'atropine_0_5mg'],
      },
      branches: [
        {
          route_id: 'pacing_optional_branch',
          activation: { after_intervention: 'establish_iv' },
          required: false,
          steps: ['transcutaneous_pacing'],
        },
      ],
    },
    interventions: {
      establish_iv: {
        duration_sec: 60,
        priority: 80,
        rationale: 'IV/IO access is required before any pharmacological intervention in symptomatic bradycardia; atropine, dopamine, and epinephrine are all IV drugs per AHA 2020 ACLS bradycardia algorithm — access must precede drug administration.',
      },
      atropine_0_5mg: {
        duration_sec: 300,
        priority: 90,
        success_chance: 0.6,
        success_state: { hr: 75, bp: '110/65', rhythm: 'Sinus', pulsePresent: true },
        rationale: 'Atropine 0.5 mg IV is the first-line pharmacological treatment for symptomatic bradycardia; it blocks vagal tone at the SA and AV nodes, increasing heart rate and improving haemodynamics per AHA 2020 ACLS guidelines.',
      },
      oxygen_nrb: {
        duration_sec: 600,
        priority: 10,
        state_overrides: { spo2: 99 },
        rationale: 'Supplemental oxygen via non-rebreather mask corrects hypoxaemia that can worsen bradycardia and haemodynamic instability; maintaining SpO₂ ≥94% is the initial supportive step per AHA 2020 ACLS guidelines.',
      },
      transcutaneous_pacing: {
        duration_sec: 120,
        priority: 95,
        success_chance: 0.9,
        success_state: { hr: 72, bp: '105/65', rhythm: 'Sinus', pulsePresent: true },
        rationale: 'Transcutaneous pacing is the definitive treatment for atropine-refractory symptomatic bradycardia; it delivers electrical impulses to the myocardium externally, restoring an adequate heart rate per AHA 2020 ACLS guidelines.',
      },
    },
    success_conditions: [
      { vital: 'hr', min: 60, max: 100, durationSec: 30 },
      { vital: 'rhythm', equals: 'Sinus', durationSec: 30 },
    ],
    failure_conditions: [{ vital: 'hr', max: 0, durationSec: 1 }],
  },

  // Scenario 8 — adult_svt
  // Changes: title updated to 'Adult Stable Tachycardia (SVT)', initial_state bp '85/50'→'110/72',
  //          establish_iv added before adenosine to reflect rapid IV push delivery requirements
  {
    scenario_id: 'adult_svt',
    title: 'Adult Stable Tachycardia (SVT)',
    patient: { name: 'Priya Sharma', age: '38yo', gender: 'F' },
    meta: { difficulty: 'Intermediate', domain: 'Cardiac', estimatedDurationSec: 600, protocol: 'ACLS' },
    conclusion: 'SVT successfully terminated and sinus rhythm restored. Patient monitored for recurrence; electrophysiology referral recommended for recurrent SVT.',
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
    expected_sequence: ['vagal_maneuver', 'establish_iv', 'adenosine_6mg', 'synchronized_cardioversion'],
    protocol: {
      primary: {
        steps: ['vagal_maneuver', 'establish_iv', 'adenosine_6mg'],
      },
      branches: [
        {
          route_id: 'post_adenosine_optional_branch',
          activation: { after_intervention: 'adenosine_6mg' },
          required: false,
          steps: ['synchronized_cardioversion'],
        },
      ],
    },
    interventions: {
      vagal_maneuver: {
        duration_sec: 30,
        priority: 10,
        success_chance: 0.25,
        success_state: { hr: 90, rhythm: 'Sinus', bp: '120/80', pulsePresent: true },
        rationale: 'Vagal manoeuvres (Valsalva or carotid sinus massage) increase vagal tone at the AV node, potentially terminating SVT; they are the first-line non-pharmacological intervention for stable SVT per AHA 2020 ACLS guidelines.',
      },
      establish_iv: {
        duration_sec: 60,
        priority: 80,
        rationale: 'Adenosine must be administered as a rapid IV push followed by an immediate saline flush, so vascular access must be established before pharmacologic treatment of stable SVT per AHA 2020 ACLS tachycardia guidance.',
      },
      adenosine_6mg: {
        duration_sec: 120,
        priority: 50,
        success_chance: 0.85,
        success_state: { hr: 85, rhythm: 'Sinus', bp: '125/80', pulsePresent: true },
        rationale: 'Adenosine 6 mg rapid IV push transiently blocks AV node conduction, terminating reentrant SVT in 85–95% of cases; it must be administered rapidly followed by a saline flush per AHA 2020 ACLS guidelines.',
      },
      synchronized_cardioversion: {
        duration_sec: 10,
        priority: 100,
        requires_rhythm: ['SVT', 'VTach'],
        success_chance: 0.95,
        success_state: { hr: 80, rhythm: 'Sinus', bp: '130/80', pulsePresent: true },
        rationale: 'Synchronized cardioversion delivers a shock timed to the R wave, terminating reentrant tachycardias by simultaneously depolarising the circuit; it is indicated for adenosine-refractory SVT per AHA 2020 ACLS guidelines.',
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
  // Medical accuracy fix: added establish_iv between synchronized_cardioversion and amiodarone_150mg_stable —
  //   amiodarone 150 mg is an IV infusion; IV access must be established before drug administration per AHA 2020 ACLS
  {
    scenario_id: 'adult_vtach_pulse',
    title: 'Adult Unstable Tachycardia (VTach with Pulse)',
    patient: { name: 'Frank Donovan', age: '55yo', gender: 'M' },
    meta: { difficulty: 'Advanced', domain: 'Cardiac', estimatedDurationSec: 600, protocol: 'ACLS' },
    conclusion: 'Unstable VTach with pulse converted to sinus rhythm via synchronized cardioversion. Patient admitted to CCU for antiarrhythmic therapy and ischemic evaluation.',
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
    expected_sequence: ['synchronized_cardioversion', 'establish_iv', 'amiodarone_150mg_stable'],
    protocol: {
      primary: {
        steps: ['synchronized_cardioversion'],
      },
      branches: [
        {
          route_id: 'post_cardioversion_optional_branch',
          activation: { after_intervention: 'synchronized_cardioversion' },
          required: false,
          steps: ['establish_iv', 'amiodarone_150mg_stable'],
        },
      ],
    },
    interventions: {
      establish_iv: {
        duration_sec: 60,
        priority: 80,
        rationale: 'IV/IO access is required before amiodarone administration; post-cardioversion antiarrhythmic therapy is delivered intravenously and cannot proceed without established access per AHA 2020 ACLS unstable tachycardia algorithm.',
      },
      amiodarone_150mg_stable: {
        duration_sec: 600,
        priority: 50,
        success_chance: 0.6,
        success_state: { hr: 95, rhythm: 'Sinus', bp: '110/70', pulsePresent: true },
        rationale: 'Amiodarone 150 mg IV over 10 minutes is the antiarrhythmic of choice for haemodynamically stable VTach; it prolongs refractoriness and slows conduction, reducing recurrence after cardioversion per AHA 2020 ACLS guidelines.',
      },
      synchronized_cardioversion: {
        duration_sec: 10,
        priority: 100,
        requires_rhythm: ['VTach', 'SVT'],
        success_chance: 0.9,
        success_state: { hr: 85, rhythm: 'Sinus', bp: '120/75', pulsePresent: true },
        rationale: 'Synchronized cardioversion is the immediate treatment for unstable VTach with a pulse; it delivers a shock timed to the R wave to avoid triggering VFib, terminating the reentrant circuit per AHA 2020 ACLS guidelines.',
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
    conclusion: 'Maternal ROSC achieved. Perimortem Cesarean Delivery performed to relieve aortocaval compression and improve maternal resuscitation outcome. Obstetric and neonatal teams activated.',
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
    expected_sequence: ['left_uterine_displacement', 'cpr', 'defibrillate', 'establish_iv', 'epinephrine_1mg'],
    protocol: {
      primary: {
        steps: ['left_uterine_displacement', 'cpr', 'defibrillate', 'establish_iv', 'epinephrine_1mg'],
      },
      rescues: [
        {
          route_id: 'pmcd_rescue',
          activation: { after_state_change: 'pmcd_window_open' },
          steps: ['perimortem_csection'],
        },
      ],
    },
    interventions: {
      left_uterine_displacement: {
        duration_sec: 30,
        priority: 200,
        state_overrides: { bp: '60/25' },
        rationale: 'Manual left uterine displacement (LUD) relieves aortocaval compression by the gravid uterus, which impairs venous return and cardiac output during CPR in pregnancy per AHA/ACOG cardiac arrest in pregnancy guidelines.',
      },
      cpr: {
        duration_sec: 120,
        priority: 10,
        state_overrides: { bp: '50/20' },
        rationale: 'High-quality chest compressions maintain coronary and cerebral perfusion during maternal cardiac arrest; standard hand position applies, and LUD must be maintained throughout CPR per AHA 2020 guidelines.',
      },
      defibrillate: {
        duration_sec: 10,
        priority: 100,
        requires_rhythm: ['VFib', 'VTach'],
        rationale: 'Defibrillation is not contraindicated in pregnancy; it is the only definitive treatment for VFib and must not be delayed — fetal risk from the shock is negligible compared to the risk of untreated maternal VFib.',
      },
      establish_iv: {
        duration_sec: 60,
        priority: 80,
        rationale: 'IV/IO access is the prerequisite for all pharmacological interventions in cardiac arrest; peripheral IV or intraosseous access must be established before epinephrine or antiarrhythmic drug administration per AHA 2020 ACLS guidelines.',
      },
      epinephrine_1mg: {
        duration_sec: 240,
        priority: 5,
        success_chance: 0.1,
        rationale: 'Epinephrine 1 mg IV/IO is administered per standard ACLS protocol in maternal cardiac arrest; standard ACLS algorithms apply and resuscitative drugs should not be withheld due to pregnancy per AHA 2020 guidelines.',
      },
      perimortem_csection: {
        duration_sec: 300,
        priority: 150,
        success_chance: 0.7,
        success_state: { rhythm: 'Sinus', hr: 108, bp: '95/60', spo2: 94, rr: 14, pulsePresent: true },
        rationale: 'Perimortem Caesarean delivery within 5 minutes of arrest onset relieves aortocaval compression definitively and may improve maternal ROSC; it is indicated when CPR/defibrillation has not achieved ROSC per ACOG/AHA guidelines.',
      },
    },
    success_conditions: arrestSuccess(60),
    failure_conditions: [
      { vital: 'pulsePresent', equals: false, durationSec: 600 },
      { elapsedSecGte: 600 },
    ],
  },

  // Scenario 11 — anaphylactic_shock
  // Changes: epinephrine_im → epinephrine_im_0_5mg everywhere
  // Medical accuracy fix: added establish_iv and iv_fluid_bolus_anaphylaxis to expected_sequence —
  //   500–1000 mL IV NS bolus is mandatory for anaphylaxis with hypotension (BP=75/40) per AHA/ACAAI guidelines;
  //   IM epinephrine correctly remains first (no IV needed for IM route)
  {
    scenario_id: 'anaphylactic_shock',
    title: 'Anaphylactic Shock Progression',
    patient: { name: 'Nina Torres', age: '26yo', gender: 'F' },
    meta: { difficulty: 'Intermediate', domain: 'Emergency', estimatedDurationSec: 600, protocol: 'ACLS' },
    conclusion: 'Anaphylactic shock reversed with IM epinephrine and airway management. Patient stabilized and transferred to ED for observation and allergy follow-up.',
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
    expected_sequence: ['epinephrine_im_0_5mg', 'oxygen_nrb', 'establish_iv', 'iv_fluid_bolus_anaphylaxis', 'intubation'],
    interventions: {
      establish_iv: {
        duration_sec: 60,
        priority: 80,
        rationale: 'IV access is required for fluid resuscitation and for repeat epinephrine or vasopressor administration in anaphylaxis with haemodynamic compromise; IM epinephrine does not require IV access, so IV placement occurs after the initial IM dose per AHA/ACAAI guidelines.',
      },
      iv_fluid_bolus_anaphylaxis: {
        duration_sec: 300,
        priority: 75,
        success_chance: 1.0,
        state_overrides: { bp: '100/65' },
        rationale: '500–1000 mL IV normal saline bolus corrects anaphylaxis-induced distributive shock by restoring intravascular volume; all hypotensive anaphylaxis patients require aggressive IV fluid resuscitation as an adjunct to epinephrine per AHA/ACAAI anaphylaxis guidelines.',
      },
      epinephrine_im_0_5mg: {
        duration_sec: 1800,
        priority: 100,
        success_chance: 1,
        success_state: { bp: '110/70', spo2: 96, hr: 100, rr: 18, pulsePresent: true },
        rationale: 'Epinephrine 0.5 mg IM (1:1,000) into the anterolateral thigh is the first-line treatment for anaphylaxis; it reverses vasodilation, bronchospasm, and urticaria via alpha and beta adrenergic effects per AHA/ACAAI guidelines.',
      },
      oxygen_nrb: {
        duration_sec: 600,
        priority: 50,
        rate_modifiers: [{ vital: 'spo2', modifier: 2, interval_sec: 5 }],
        rationale: 'High-flow oxygen via non-rebreather mask corrects hypoxaemia caused by anaphylaxis-induced bronchospasm and vasodilation; maintaining SpO₂ ≥94% is essential while epinephrine takes effect.',
      },
      intubation: {
        duration_sec: 600,
        priority: 90,
        success_chance: 0.5,
        success_state: { spo2: 98, rr: 14, hr: 110, bp: '80/45', pulsePresent: true },
        rationale: 'Early endotracheal intubation secures the airway before progressive angioedema makes it impossible; airway management must occur before complete obstruction in severe anaphylaxis with stridor or laryngeal oedema.',
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
  //          ticagrelor_180mg/heparin_bolus/activate_cath_lab added, establish_iv added before heparin_bolus,
  //          success_conditions updated (spo2 condition removed, bp max 120→140)
  {
    scenario_id: 'acs_stemi',
    title: 'Acute Coronary Syndrome (STEMI)',
    patient: { name: 'Robert Chen', age: '62yo', gender: 'M' },
    meta: { difficulty: 'Advanced', domain: 'Cardiac', estimatedDurationSec: 1200, protocol: 'ACLS' },
    conclusion: 'STEMI managed with dual antiplatelet therapy and cath lab activation within target door-to-balloon time. Patient transferred for primary PCI.',
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
    expected_sequence: ['aspirin_324mg', 'ticagrelor_180mg', 'nitroglycerin_04mg', 'establish_iv', 'heparin_bolus', 'activate_cath_lab'],
    interventions: {
      aspirin_324mg: {
        duration_sec: 1800,
        priority: 50,
        success_chance: 1,
        success_state: { hr: 80, bp: '135/85', pulsePresent: true },
        rationale: 'Aspirin 324 mg chewed immediately inhibits thromboxane A2-mediated platelet aggregation, reducing infarct size and mortality; it is the highest-priority single drug in STEMI management per AHA 2020 STEMI guidelines.',
      },
      establish_iv: {
        duration_sec: 60,
        priority: 62,
        success_chance: 1,
        rationale: 'IV access is required before unfractionated heparin bolus administration and supports additional ACS medications, laboratory work, and rapid escalation during STEMI care; vascular access should be secured early in the reperfusion pathway per AHA 2020 ACS guidance.',
      },
      nitroglycerin_04mg: {
        duration_sec: 300,
        priority: 60,
        success_chance: 1,
        state_overrides: { bp: '115/75' },
        rationale: 'Sublingual nitroglycerin 0.4 mg relieves ischaemic chest pain via coronary vasodilation and preload reduction; it is given every 5 minutes up to 3 doses if pain persists, provided BP remains above 90 mmHg.',
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
        rationale: 'Ticagrelor 180 mg loading dose provides P2Y12 receptor inhibition as the preferred second antiplatelet agent in STEMI; dual antiplatelet therapy reduces stent thrombosis and recurrent MI per AHA 2020 STEMI guidelines.',
      },
      heparin_bolus: {
        duration_sec: 60,
        priority: 65,
        success_chance: 1,
        state_overrides: { bp: '138/88' },
        rationale: 'Unfractionated heparin IV bolus is given before primary PCI to prevent thrombus propagation and catheter thrombosis; anticoagulation is a mandatory adjunct to coronary intervention per AHA 2020 STEMI guidelines.',
      },
      activate_cath_lab: {
        duration_sec: 30,
        priority: 70,
        success_chance: 1,
        success_state: { hr: 78, bp: '130/82', pulsePresent: true },
        rationale: 'Primary PCI cath lab activation is the definitive treatment for STEMI; the goal is door-to-balloon time under 90 minutes as each 30-minute delay increases 1-year mortality by approximately 7.5% per AHA 2020 STEMI guidelines.',
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
    conclusion: 'Acute ischemic stroke managed within the thrombolysis window. Alteplase administered after hemorrhage exclusion; patient admitted to stroke unit for neurological monitoring.',
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
        rationale: 'Point-of-care blood glucose measurement excludes hypoglycaemia as a stroke mimic before IV thrombolysis; glucose <50 or >400 mg/dL can cause focal neurological deficits that may be reversible without alteplase.',
      },
      establish_iv: {
        duration_sec: 300,
        priority: 80,
        success_chance: 1,
        rationale: 'IV access is required for blood sampling, BP management, and alteplase infusion; peripheral IV placement must be secured before imaging and any pharmacological treatment in the acute stroke pathway.',
      },
      ct_brain_noncontrast: {
        duration_sec: 300,
        priority: 90,
        success_chance: 1,
        success_state: { pulsePresent: true },
        rationale: 'Non-contrast CT brain is mandatory before thrombolysis to exclude haemorrhagic stroke; alteplase is absolutely contraindicated in intracranial haemorrhage, and imaging must precede any fibrinolytic therapy per AHA 2020 stroke guidelines.',
      },
      labetalol_10mg: {
        duration_sec: 180,
        priority: 95,
        success_chance: 0.85,
        state_overrides: { bp: '175/100' },
        rationale: 'Labetalol 10 mg IV titrates BP to below 185/110 mmHg, which is required before alteplase; excessively elevated BP at the time of thrombolysis increases haemorrhagic transformation risk per AHA 2020 stroke guidelines.',
      },
      alteplase: {
        duration_sec: 3600,
        priority: 100,
        success_chance: 1,
        success_state: { bp: '140/90', pulsePresent: true },
        rationale: 'IV alteplase (rtPA) within the 3–4.5 hour thrombolysis window is the only approved pharmacological reperfusion therapy for acute ischaemic stroke; it dissolves the clot and restores cerebral blood flow per AHA 2020 stroke guidelines.',
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
  // Medical accuracy fix: added magnesium_sulfate_iv between methylprednisolone_iv and epinephrine_im_pediatric —
  //   IV MgSO4 25–75 mg/kg (max 2g) is a core PALS 2020 intervention for severe paediatric asthma
  //   unresponsive to bronchodilators, positioned before IM epinephrine in the escalation algorithm
  {
    scenario_id: 'pediatric_respiratory_arrest_asthma',
    title: 'Pediatric Resp. Arrest (Asthma)',
    patient: { name: 'Liam Park', age: '9yo', gender: 'M' },
    meta: { difficulty: 'Advanced', domain: 'Pediatric', estimatedDurationSec: 900, protocol: 'PALS' },
    conclusion: 'Paediatric severe asthma exacerbation managed with bronchodilators, steroids, and respiratory support. Patient stabilized and admitted to PICU for continued monitoring.',
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
    expected_sequence: ['high_flow_oxygen', 'albuterol_nebulizer', 'ipratropium_nebulizer', 'methylprednisolone_iv', 'magnesium_sulfate_iv', 'epinephrine_im_pediatric', 'rescue_breathing', 'intubation'],
    interventions: {
      magnesium_sulfate_iv: {
        duration_sec: 1200,
        priority: 77,
        success_chance: 0.55,
        success_state: { spo2: 90, rr: 30, hr: 135 },
        rationale: 'IV magnesium sulfate 25–75 mg/kg (max 2 g) over 20 minutes is a PALS 2020 recommended adjunct for severe asthma exacerbation unresponsive to initial bronchodilators; it relaxes bronchial smooth muscle via calcium antagonism and reduces the need for intubation.',
      },
      high_flow_oxygen: {
        duration_sec: 600,
        priority: 100,
        state_overrides: { spo2: 88 },
        rationale: 'High-flow oxygen (15 L/min via NRB mask) immediately corrects hypoxaemia in severe asthma; targeting SpO₂ ≥94% is the first priority while bronchodilators begin to take effect per PALS/GINA guidelines.',
      },
      albuterol_nebulizer: {
        duration_sec: 600,
        priority: 90,
        success_chance: 0.6,
        success_state: { spo2: 88, hr: 145, rr: 36, pulsePresent: true },
        rationale: 'Albuterol (salbutamol) nebuliser 2.5 mg is the first-line bronchodilator for acute asthma; beta-2 agonism relaxes bronchial smooth muscle, reducing airway resistance and work of breathing per PALS/GINA guidelines.',
      },
      ipratropium_nebulizer: {
        duration_sec: 600,
        priority: 85,
        success_chance: 0.5,
        success_state: { spo2: 90, hr: 140, rr: 32, pulsePresent: true },
        rationale: 'Ipratropium 0.5 mg nebulised in combination with albuterol provides additive bronchodilation via anticholinergic blockade; combination therapy reduces hospitalisation rates in severe paediatric asthma per PALS guidelines.',
      },
      methylprednisolone_iv: {
        duration_sec: 300,
        priority: 80,
        success_chance: 0.4,
        success_state: { spo2: 88, hr: 138, rr: 34, pulsePresent: true },
        rationale: 'Methylprednisolone 1 mg/kg IV reduces airway inflammation and speeds recovery from severe asthma exacerbation; systemic corticosteroids are a cornerstone of acute severe asthma management per PALS guidelines.',
      },
      rescue_breathing: {
        duration_sec: 60,
        priority: 80,
        success_chance: 0.8,
        success_state: { spo2: 94, hr: 120, rr: 24, pulsePresent: true },
        rationale: 'Rescue breathing with bag-valve-mask provides positive pressure ventilation to overcome severe bronchospasm-induced respiratory failure; it is a bridge intervention to intubation when SpO₂ cannot be maintained.',
      },
      intubation: {
        duration_sec: 600,
        priority: 100,
        success_chance: 0.9,
        success_state: { spo2: 99, hr: 110, rr: 20, pulsePresent: true },
        rationale: 'Endotracheal intubation with mechanical ventilation is the definitive airway intervention for respiratory failure unresponsive to pharmacological therapy; it must be performed before apnoea occurs in deteriorating paediatric asthma.',
      },
      epinephrine_im_pediatric: {
        duration_sec: 1800,
        priority: 90,
        success_chance: 0.8,
        success_state: { spo2: 92, hr: 130, rr: 30, pulsePresent: true },
        rationale: 'Epinephrine 0.01 mg/kg IM is indicated for severe or life-threatening bronchospasm unresponsive to beta-agonists; it provides rapid bronchodilation and reduces mucosal oedema via alpha and beta adrenergic effects per PALS guidelines.',
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
    meta: { difficulty: 'Advanced', domain: 'Pediatric', estimatedDurationSec: 900, protocol: 'PALS', completionPolicy: 'strict_sequence_required' },
    conclusion: 'Paediatric VFib arrest terminated with defibrillation and PALS medications. ROSC achieved; patient transferred to PICU for post-arrest care and neurological assessment.',
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
    expected_sequence: ['cpr', 'defibrillate_pediatric', 'establish_iv', 'epinephrine_peds_01mgkg', 'amiodarone_peds_5mgkg'],
    interventions: {
      cpr: {
        duration_sec: 120,
        priority: 10,
        state_overrides: { bp: '60/20' },
        rationale: 'High-quality chest compressions (~2 inches at 100–120/min) maintain coronary and cerebral perfusion during paediatric cardiac arrest, and are performed before defibrillation to prime the myocardium per PALS 2020 guidelines.',
      },
      establish_iv: {
        duration_sec: 60,
        priority: 80,
        rationale: 'IV/IO access is the prerequisite for all pharmacological interventions in paediatric cardiac arrest; peripheral IV or intraosseous access must be established before epinephrine or antiarrhythmic drug administration per PALS 2020 guidelines.',
      },
      defibrillate_pediatric: {
        duration_sec: 10,
        priority: 100,
        requires_rhythm: ['VFib', 'VTach'],
        rationale: 'Paediatric defibrillation at 2–4 J/kg using dose-attenuator pads is the only definitive treatment for shockable rhythms in children; weight-appropriate energy prevents myocardial injury while terminating VFib per PALS 2020 guidelines.',
      },
      epinephrine_peds_01mgkg: {
        duration_sec: 240,
        priority: 5,
        rationale: 'Epinephrine 0.01 mg/kg IV/IO every 3–5 minutes increases coronary perfusion pressure via alpha-1 vasoconstriction; it is the recommended vasopressor in paediatric pulseless arrest per PALS 2020 guidelines.',
      },
      amiodarone_peds_5mgkg: {
        duration_sec: 600,
        priority: 6,
        success_chance: 1,
        success_state: { rhythm: 'Sinus', hr: 115, bp: '85/50', spo2: 97, rr: 18, pulsePresent: true },
        rationale: 'Amiodarone 5 mg/kg IV/IO is the first-line antiarrhythmic for shock-refractory paediatric VFib/pVT; it prolongs action potential duration and reduces recurrence of ventricular fibrillation after defibrillation per PALS 2020 guidelines.',
      },
    },
    success_conditions: arrestSuccess(30),
    failure_conditions: [
      { vital: 'pulsePresent', equals: false, durationSec: 600 },
      { elapsedSecGte: 600 },
    ],
  },

  // BLS Scenario 1 — bls_adult_cardiac_arrest_bystander
  // High-quality adult CPR (single rescuer): 30:2, 2–2.4 in compressions, 100–120/min
  // BLS audit: added check_carotid_pulse (X3), open_airway_head_tilt_chin_lift (X5), resume_cpr_post_shock (X4)
  // Medical accuracy fix: removed check_carotid_pulse from expected_sequence — AHA 2020 BLS guidelines explicitly
  //   state lay rescuers should NOT attempt a pulse check; check_carotid_pulse remains in interventions as an
  //   optional/distractor step but is not required in the lay-rescuer bystander algorithm
  {
    scenario_id: 'bls_adult_cardiac_arrest_bystander',
    title: 'Adult Cardiac Arrest — Bystander CPR',
    patient: { name: 'George Marsh', age: '54yo', gender: 'M' },
    meta: { difficulty: 'Beginner', domain: 'Cardiac', estimatedDurationSec: 600, protocol: 'BLS', completionPolicy: 'strict_sequence_required' },
    conclusion: 'Bystander CPR and AED use achieved ROSC before EMS arrival. Timely high-quality CPR and early defibrillation were the key factors in survival.',
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
    expected_sequence: ['check_responsiveness', 'call_911', 'cpr_30_2', 'open_airway_head_tilt_chin_lift', 'rescue_breathing', 'aed_attach', 'resume_cpr_post_shock'],
    interventions: {
      check_responsiveness: {
        duration_sec: 10,
        priority: 200,
        success_chance: 1,
        success_state: { pulsePresent: false },
        rationale: 'Confirming unresponsiveness is the mandatory first step in the adult BLS algorithm; it triggers EMS activation and prevents unnecessary interventions on conscious patients per AHA 2020 BLS guidelines.',
      },
      call_911: {
        duration_sec: 15,
        priority: 190,
        success_chance: 1,
        rationale: 'Early EMS activation ensures a defibrillator and advanced life support are en route; for adult witnessed collapse, call before starting CPR because shockable rhythms need defibrillation as the priority per AHA 2020 BLS guidelines.',
      },
      check_carotid_pulse: {
        duration_sec: 10,
        priority: 90,
        success_chance: 1,
        success_state: {},
        rationale: 'A carotid pulse check is a healthcare-provider assessment and is not required in the lay-rescuer bystander flow; if attempted, it must be limited to ≤10 seconds so compressions and AED retrieval are not delayed per AHA 2020 BLS guidelines.',
      },
      cpr_30_2: {
        duration_sec: 120,
        priority: 100,
        state_overrides: { bp: '60/20', spo2: 80 },
        rationale: 'CPR 30:2 at 100–120/min with 2–2.4 inch depth maintains minimal coronary and cerebral perfusion pressure until defibrillation is available; minimising hands-off time is the single most important CPR quality metric per AHA 2020 BLS guidelines.',
      },
      open_airway_head_tilt_chin_lift: {
        duration_sec: 10,
        priority: 85,
        success_chance: 1,
        success_state: {},
        rationale: 'The head-tilt chin-lift manoeuvre displaces the tongue from the posterior pharynx, establishing a patent airway that enables effective rescue ventilation per AHA 2020 BLS guidelines.',
      },
      rescue_breathing: {
        duration_sec: 60,
        priority: 80,
        state_overrides: { spo2: 90 },
        rationale: 'Rescue breaths (1 breath per 30:2 cycle, visible chest rise) deliver oxygen to the lungs during CPR, sustaining arterial oxygen saturation and reducing secondary hypoxic organ injury per AHA 2020 BLS guidelines.',
      },
      aed_attach: {
        duration_sec: 30,
        priority: 150,
        rationale: 'AED attachment and defibrillation is the only definitive treatment for shockable rhythms; each minute without defibrillation reduces survival 7–10%, making early defibrillation the highest priority after confirming arrest per AHA 2020 BLS guidelines.',
      },
      resume_cpr_post_shock: {
        duration_sec: 120,
        priority: 70,
        success_chance: 1,
        success_state: { rhythm: 'Sinus', hr: 80, bp: '100/60', spo2: 94, rr: 12, pulsePresent: true },
        rationale: 'Immediately resuming compressions after shock delivery maintains coronary perfusion pressure during the peri-shock period; the heart requires several cycles before generating effective mechanical output after defibrillation per AHA 2020 BLS guidelines.',
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
    meta: { difficulty: 'Intermediate', domain: 'Cardiac', estimatedDurationSec: 720, protocol: 'BLS', completionPolicy: 'strict_sequence_required' },
    conclusion: 'Two-rescuer CPR with coordinated role switching and AED use achieved ROSC. Effective teamwork and minimal compression interruptions were critical to outcome.',
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
        rationale: 'Scene safety and confirmation of unresponsiveness must precede all interventions; in two-rescuer response, simultaneous assessment allows faster role assignment and EMS activation per AHA 2020 BLS guidelines.',
      },
      call_911: {
        duration_sec: 15,
        priority: 190,
        success_chance: 1,
        rationale: 'With two rescuers, the second rescuer calls 911 immediately while the first begins CPR, eliminating the lone-rescuer CPR-before-call delay and ensuring defibrillation resources are en route per AHA 2020 BLS guidelines.',
      },
      check_carotid_pulse: {
        duration_sec: 10,
        priority: 90,
        success_chance: 1,
        success_state: {},
        rationale: 'A pulse check limited to ≤10 seconds confirms pulseless cardiac arrest; in two-rescuer CPR, this is performed simultaneously with airway positioning to minimise time to first compression per AHA 2020 BLS guidelines.',
      },
      cpr_30_2: {
        duration_sec: 120,
        priority: 100,
        state_overrides: { bp: '65/25', spo2: 82 },
        rationale: 'High-quality CPR at 30:2 (100–120/min, 2–2.4 inch depth) maintains perfusion pressure during VFib; compressions must begin within 10 seconds of confirming pulselessness per AHA 2020 BLS guidelines.',
      },
      open_airway_head_tilt_chin_lift: {
        duration_sec: 10,
        priority: 85,
        success_chance: 1,
        success_state: {},
        rationale: 'Airway positioning is the prerequisite for effective bag-valve-mask ventilation in two-rescuer CPR; the head-tilt chin-lift is performed by the second rescuer while the first continues compressions per AHA 2020 BLS guidelines.',
      },
      bag_valve_mask: {
        duration_sec: 60,
        priority: 90,
        state_overrides: { spo2: 92 },
        rationale: 'BVM ventilation delivers higher tidal volumes and supplemental oxygen compared to mouth-to-mouth; two rescuers allow one to maintain the mask seal while the other compresses, improving ventilation quality per AHA 2020 BLS guidelines.',
      },
      switch_compressor_roles: {
        duration_sec: 10,
        priority: 85,
        success_chance: 1,
        state_overrides: { bp: '70/30' },
        rationale: 'Role switching every 2 minutes prevents compressor fatigue that causes compression depth to degrade significantly; maintaining compression quality is critical for myocardial perfusion per AHA 2020 BLS guidelines.',
      },
      aed_attach: {
        duration_sec: 30,
        priority: 150,
        requires_rhythm: ['VFib', 'VTach'],
        rationale: 'AED application and defibrillation is the definitive treatment for VFib; pads must be placed and rhythm analysed at the earliest opportunity while compressions continue until immediately before the shock per AHA 2020 BLS guidelines.',
      },
      resume_cpr_post_shock: {
        duration_sec: 120,
        priority: 70,
        success_chance: 1,
        success_state: { rhythm: 'Sinus', hr: 88, bp: '105/65', spo2: 95, rr: 14, pulsePresent: true },
        rationale: 'Post-shock CPR bridges the peri-shock period during which the stunned myocardium requires mechanical support; compressions must restart within 10 seconds of shock delivery per AHA 2020 BLS guidelines.',
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
  // BLS audit: standardized public-access lay-rescuer flow to match the bystander scenario —
  //   no required pulse check before CPR/AED use; check_carotid_pulse remains only as an optional distractor step
  {
    scenario_id: 'bls_adult_aed_public_access',
    title: 'Adult Cardiac Arrest — Public AED',
    patient: { name: 'Howard Bell', age: '49yo', gender: 'M' },
    meta: { difficulty: 'Beginner', domain: 'Cardiac', estimatedDurationSec: 480, protocol: 'BLS', completionPolicy: 'strict_sequence_required' },
    conclusion: 'Public AED use with prompt bystander activation achieved ROSC. Early defibrillation within minutes of collapse is the strongest determinant of survival from shockable rhythms.',
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
    expected_sequence: ['check_responsiveness', 'call_911', 'cpr_30_2', 'aed_power_on', 'aed_attach_pads', 'aed_analyze', 'aed_shock', 'resume_cpr_post_shock'],
    interventions: {
      check_responsiveness: {
        duration_sec: 10,
        priority: 210,
        success_chance: 1,
        success_state: {},
        rationale: 'Establishing unresponsiveness confirms the need to activate the emergency response system and prevents unnecessary defibrillation in a conscious patient; this is the AHA-mandated first step in the public-access defibrillation sequence.',
      },
      call_911: {
        duration_sec: 15,
        priority: 205,
        success_chance: 1,
        rationale: 'Activating EMS before AED setup ensures advanced support is en route while the PAD sequence is completed; bystander 911 calls allow dispatchers to provide real-time CPR coaching per AHA 2020 BLS guidelines.',
      },
      check_carotid_pulse: {
        duration_sec: 10,
        priority: 90,
        success_chance: 1,
        success_state: {},
        rationale: 'A carotid pulse check is not part of the lay-rescuer public-access AED sequence; it remains only as an optional healthcare-provider assessment, and any attempt must stay within ≤10 seconds so CPR and AED setup are not delayed per AHA 2020 BLS guidelines.',
      },
      cpr_30_2: {
        duration_sec: 120,
        priority: 80,
        state_overrides: { bp: '60/20', spo2: 78 },
        rationale: 'Compressions maintain coronary perfusion pressure and increase likelihood of successful defibrillation by sustaining myocardial viability; CPR must continue until the AED is ready to analyse per AHA 2020 BLS guidelines.',
      },
      aed_power_on: {
        duration_sec: 10,
        priority: 200,
        success_chance: 1,
        rationale: 'Powering on the AED initiates audio/visual guidance that directs lay rescuers through the complete PAD sequence without prior training; the AED voice prompt system is designed for first-responder use per AHA 2020 BLS guidelines.',
      },
      aed_attach_pads: {
        duration_sec: 20,
        priority: 195,
        success_chance: 1,
        rationale: 'Pad placement per AED diagram (right clavicle/left lateral chest) establishes the shock vector and enables rhythm acquisition; correct placement is required for accurate analysis and effective defibrillation per AHA 2020 BLS guidelines.',
      },
      aed_analyze: {
        duration_sec: 15,
        priority: 190,
        requires_rhythm: ['VFib', 'VTach'],
        success_chance: 1,
        rationale: 'Rhythm analysis during a "hands-off" period accurately detects shockable rhythms (VFib/VTach) using signal processing algorithms; no one should touch the patient during analysis to prevent motion artefact per AHA 2020 BLS guidelines.',
      },
      aed_shock: {
        duration_sec: 5,
        priority: 185,
        requires_rhythm: ['VFib', 'VTach'],
        rationale: 'AED shock delivery terminates VFib by simultaneously depolarising the myocardium, allowing the sinus node to recapture rhythm; shocking as early as possible is the single most effective intervention for witnessed VFib per AHA 2020 BLS guidelines.',
      },
      resume_cpr_post_shock: {
        duration_sec: 120,
        priority: 100,
        success_chance: 1,
        success_state: { rhythm: 'Sinus', hr: 82, bp: '108/68', spo2: 96, rr: 12, pulsePresent: true },
        state_overrides: { bp: '68/28', spo2: 84 },
        rationale: 'Compressions should restart within 10 seconds of shock delivery to support a post-shock heart that may not immediately generate adequate cardiac output; immediate CPR prevents re-arrest per AHA 2020 BLS guidelines.',
      },
    },
    success_conditions: arrestSuccess(30),
    failure_conditions: [{ elapsedSecGte: 480 }],
  },

  // BLS Scenario 4 — bls_child_cardiac_arrest
  // High-quality child CPR (1–8 yrs): ~2 in compressions, 100–120/min, 30:2 single rescuer
  // BLS audit: added check_carotid_pulse (X3), resume_cpr_post_shock (X4),
  //   fixed message (removed "1 breath per 3–5 sec"), fixed aed_attach label for pediatric pads
  // Medical accuracy fix: title updated to "(Witnessed)" to justify call_911 before CPR —
  //   AHA 2020 states call_911 FIRST for witnessed child collapse; lone-rescuer UNWITNESSED child
  //   arrest follows the same CPR-before-911 sequence as infants; scheduled message updated to clarify
  {
    scenario_id: 'bls_child_cardiac_arrest',
    title: 'Pediatric Cardiac Arrest — Child CPR (Witnessed)',
    patient: { name: 'Tyler Morris', age: '6yo', gender: 'M' },
    meta: { difficulty: 'Intermediate', domain: 'Pediatric', estimatedDurationSec: 600, protocol: 'BLS', completionPolicy: 'strict_sequence_required' },
    conclusion: 'Paediatric cardiac arrest resolved following high-quality CPR and AED defibrillation. Child admitted to PICU; early intervention by bystander rescuer improved neurological outcome.',
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
        message: 'This is a witnessed child arrest — 911 was called first (correct for witnessed collapse). Pediatric arrests are usually hypoxic. Push hard (~2 inches), push fast (100–120/min), give 1 breath per 30:2 cycle.',
      },
    ],
    expected_sequence: ['check_responsiveness', 'call_911', 'check_carotid_pulse', 'cpr_30_2_child', 'rescue_breathing_child', 'aed_attach', 'resume_cpr_post_shock'],
    interventions: {
      check_responsiveness: {
        duration_sec: 10,
        priority: 200,
        success_chance: 1,
        success_state: { pulsePresent: false },
        rationale: 'Confirming unresponsiveness and absent/abnormal breathing in a child triggers the paediatric BLS algorithm and EMS activation; in a witnessed child arrest, call 911 first unlike the lone-rescuer infant protocol per AHA 2020 BLS guidelines.',
      },
      call_911: {
        duration_sec: 15,
        priority: 190,
        success_chance: 1,
        rationale: 'In a witnessed child collapse, call 911 immediately before starting CPR; early EMS activation ensures defibrillation resources and PALS-trained personnel are en route per AHA 2020 BLS paediatric guidelines.',
      },
      check_carotid_pulse: {
        duration_sec: 10,
        priority: 90,
        success_chance: 1,
        success_state: {},
        rationale: 'Healthcare providers perform a carotid pulse check in children ≥1 year; pulselessness confirmed within ≤10 seconds mandates immediate CPR initiation per AHA 2020 BLS paediatric guidelines.',
      },
      cpr_30_2_child: {
        duration_sec: 120,
        priority: 100,
        state_overrides: { bp: '50/15', spo2: 76 },
        rationale: 'Single-rescuer child CPR uses 30:2 ratio with ~2 inch compressions at 100–120/min; the compression-to-ventilation balance addresses the predominantly hypoxic aetiology of paediatric arrest per AHA 2020 BLS guidelines.',
      },
      rescue_breathing_child: {
        duration_sec: 60,
        priority: 90,
        state_overrides: { spo2: 88 },
        rationale: 'Oxygenation is critical in hypoxic paediatric arrest; rescue breaths are sized for the child\'s smaller tidal volume (visible chest rise ~500 mL) and must be delivered without excessive force to avoid gastric insufflation per AHA 2020 BLS guidelines.',
      },
      // Use pediatric dose-attenuator pads if available (patient <8 yr / <25 kg)
      aed_attach: {
        duration_sec: 30,
        priority: 150,
        rationale: 'AED with paediatric dose-attenuator pads delivers 2–4 J/kg for patients under 8 years or under 25 kg; defibrillation addresses any shockable rhythm while weight-appropriate energy prevents myocardial injury per AHA 2020 BLS paediatric guidelines.',
      },
      resume_cpr_post_shock: {
        duration_sec: 120,
        priority: 70,
        success_chance: 1,
        success_state: { rhythm: 'Sinus', hr: 115, bp: '90/55', spo2: 96, rr: 22, pulsePresent: true },
        rationale: 'Resuming compressions within 10 seconds of shock maintains perfusion in the post-shock period before ROSC can be confirmed; the paediatric myocardium requires mechanical support after cardioversion per AHA 2020 BLS guidelines.',
      },
    },
    success_conditions: [
      { vital: 'pulsePresent', equals: true, durationSec: 30 },
      { vital: 'spo2', min: 94, durationSec: 30 },
    ],
    failure_conditions: [
      { vital: 'pulsePresent', equals: false, durationSec: 300 },
      { elapsedSecGte: 600 },
    ],
  },

  // BLS Scenario 5 — bls_child_two_rescuer_cpr
  // Two-rescuer child CPR: 15:2 ratio, switch roles, bag-valve-mask
  // BLS audit: added check_carotid_pulse (X3), resume_cpr_post_shock (X4),
  //   fixed aed_attach label for pediatric dose-attenuator pads
  // Medical accuracy fix: added check_responsiveness (X1) and call_911 (X2) to the start of
  //   expected_sequence — AHA 2020 BLS two-rescuer child algorithm requires assessment and EMS
  //   activation BEFORE compressions begin (unlike lone-rescuer infant protocol)
  {
    scenario_id: 'bls_child_two_rescuer_cpr',
    title: 'Pediatric Cardiac Arrest — Two-Rescuer Child',
    patient: { name: 'Avery Johnson', age: '4yo', gender: 'F' },
    meta: { difficulty: 'Intermediate', domain: 'Pediatric', estimatedDurationSec: 600, protocol: 'BLS', completionPolicy: 'strict_sequence_required' },
    conclusion: 'Two-rescuer paediatric CPR with 15:2 ratio and BVM ventilation achieved ROSC. Role switching every 2 minutes maintained compression quality throughout the resuscitation.',
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
    expected_sequence: ['check_responsiveness', 'call_911', 'check_carotid_pulse', 'cpr_15_2_child', 'bag_valve_mask_child', 'switch_compressor_roles', 'aed_attach', 'resume_cpr_post_shock'],
    interventions: {
      check_responsiveness: {
        duration_sec: 10,
        priority: 200,
        success_chance: 1,
        success_state: { pulsePresent: false },
        rationale: 'Confirming unresponsiveness is the mandatory first step in the two-rescuer paediatric BLS algorithm; while Rescuer 1 assesses the child, Rescuer 2 activates EMS simultaneously, enabling a faster combined response than a single rescuer per AHA 2020 BLS guidelines.',
      },
      call_911: {
        duration_sec: 15,
        priority: 190,
        success_chance: 1,
        rationale: 'In two-rescuer paediatric BLS, Rescuer 2 immediately calls 911 while Rescuer 1 assesses responsiveness; the second-rescuer advantage allows simultaneous EMS activation and patient assessment, unlike the lone-rescuer infant protocol per AHA 2020 BLS guidelines.',
      },
      check_carotid_pulse: {
        duration_sec: 10,
        priority: 90,
        success_chance: 1,
        success_state: {},
        rationale: 'Healthcare providers perform a carotid pulse check within ≤10 seconds before starting child CPR; confirming pulselessness early directs the team into the 15:2 two-rescuer paediatric arrest algorithm without delaying compressions per AHA 2020 BLS guidelines.',
      },
      cpr_15_2_child: {
        duration_sec: 120,
        priority: 100,
        state_overrides: { bp: '52/18', spo2: 78 },
        rationale: 'The 15:2 ratio in two-rescuer child CPR provides more frequent ventilations per minute than 30:2, addressing the predominantly hypoxic aetiology of paediatric arrest; this ratio applies only with two rescuers per AHA 2020 BLS guidelines.',
      },
      bag_valve_mask_child: {
        duration_sec: 60,
        priority: 90,
        state_overrides: { spo2: 90 },
        rationale: 'Child BVM with supplemental oxygen provides superior oxygenation compared to mouth-to-mouth; the two-rescuer configuration allows simultaneous mask seal and bag compression, improving tidal volume delivery per AHA 2020 BLS guidelines.',
      },
      switch_compressor_roles: {
        duration_sec: 10,
        priority: 85,
        success_chance: 1,
        state_overrides: { bp: '55/20' },
        rationale: 'Rotating the compressor every 2 minutes prevents fatigue-related degradation of compression depth and rate; maintaining CPR quality throughout the resuscitation is the most critical CPR quality metric per AHA 2020 BLS guidelines.',
      },
      // Use pediatric dose-attenuator pads if available (patient <8 yr / <25 kg)
      aed_attach: {
        duration_sec: 30,
        priority: 150,
        rationale: 'Defibrillation treats shockable rhythms; paediatric attenuator pads reduce delivered energy to 2–4 J/kg for appropriate weight-based dosing in small children, preventing myocardial injury per AHA 2020 BLS paediatric guidelines.',
      },
      resume_cpr_post_shock: {
        duration_sec: 120,
        priority: 70,
        success_chance: 1,
        success_state: { rhythm: 'Sinus', hr: 118, bp: '92/58', spo2: 97, rr: 24, pulsePresent: true },
        rationale: 'Post-shock CPR is mandatory per AHA guidelines; compressions support a stunned paediatric myocardium that requires time to generate effective mechanical output after defibrillation per AHA 2020 BLS guidelines.',
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
    conclusion: 'Infant cardiac arrest reversed following CPR and rescue breathing per lone-rescuer protocol. CPR was initiated before calling 911 per AHA guidelines for paediatric lone-rescuer scenarios.',
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
        message: 'Infant CPR: use the 2-finger technique just below the nipple line. Compress 1.5 inches at 100–120/min and continue 30:2 cycles until you leave to call 911 after about 2 minutes.',
      },
    ],
    expected_sequence: ['check_responsiveness', 'check_brachial_pulse', 'open_airway_head_tilt_chin_lift', 'cpr_30_2_infant_2finger', 'rescue_breathing_infant', 'call_911'],
    interventions: {
      check_responsiveness: {
        duration_sec: 10,
        priority: 200,
        success_chance: 1,
        success_state: {},
        rationale: 'Confirming unresponsiveness in an infant (tap foot, call name) is the entry criterion for the infant BLS algorithm; assessment triggers the decision to begin CPR before calling 911 in the lone-rescuer infant protocol per AHA 2020 BLS guidelines.',
      },
      check_brachial_pulse: {
        duration_sec: 10,
        priority: 90,
        success_chance: 1,
        success_state: {},
        rationale: 'The brachial artery (medial upper arm) is the AHA-preferred pulse check site for infants, as the short infant neck makes carotid palpation unreliable; confirmed pulselessness within ≤10 seconds triggers the 30:2 CPR sequence.',
      },
      open_airway_head_tilt_chin_lift: {
        duration_sec: 10,
        priority: 85,
        success_chance: 1,
        success_state: {},
        rationale: 'For infants, the head-tilt is performed to a neutral "sniffing" position — hyperextension can collapse the compliant infant trachea; airway positioning must precede rescue breathing per AHA 2020 BLS infant guidelines.',
      },
      cpr_30_2_infant_2finger: {
        duration_sec: 120,
        priority: 100,
        state_overrides: { bp: '40/15', spo2: 72 },
        rationale: 'The 2-finger technique (two fingers on the lower sternum, just below the nipple line) delivers appropriate 1.5-inch compression depth without chest wall trauma; this technique is used by lone rescuers per AHA 2020 BLS infant guidelines.',
      },
      rescue_breathing_infant: {
        duration_sec: 60,
        priority: 90,
        success_chance: 0.6,
        success_state: { rhythm: 'Sinus', hr: 125, bp: '70/40', spo2: 96, rr: 30, pulsePresent: true },
        rationale: 'Mouth-to-mouth-and-nose infant rescue breathing (small puffs producing visible chest rise) restores oxygenation; covering both mouth and nose creates a seal and delivers appropriate tidal volumes for the infant\'s smaller lung capacity per AHA 2020 BLS guidelines.',
      },
      call_911: {
        duration_sec: 15,
        priority: 190,
        success_chance: 1,
        rationale: 'AHA 2020 lone-rescuer infant protocol: perform 5 cycles (~2 min) of CPR BEFORE calling 911, prioritising oxygenation over EMS activation; the hypoxic aetiology means immediate CPR is more beneficial than early EMS contact.',
      },
    },
    success_conditions: [
      { vital: 'pulsePresent', equals: true, durationSec: 20 },
      { vital: 'spo2', min: 94, durationSec: 20 },
    ],
    failure_conditions: [
      { vital: 'pulsePresent', equals: false, durationSec: 300 },
      { elapsedSecGte: 480 },
    ],
  },

  // BLS Scenario 7 — bls_infant_two_rescuer_cpr
  // Two-rescuer infant CPR: 15:2, 2-thumb encircling technique, coordinated ventilations
  // BLS audit: added check_responsiveness (X1), call_911 (X2 — after check_responsiveness, second rescuer calls),
  //   check_brachial_pulse (X3)
  {
    scenario_id: 'bls_infant_two_rescuer_cpr',
    title: 'Infant Cardiac Arrest — Two-Rescuer',
    patient: { name: 'Baby Noah', age: '2mo', gender: 'M' },
    meta: { difficulty: 'Advanced', domain: 'Pediatric', estimatedDurationSec: 480, protocol: 'BLS' },
    conclusion: 'Two-rescuer infant CPR using the 2-thumb encircling technique achieved ROSC. Superior compression force of this technique contributed to effective coronary perfusion pressure.',
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
        message: 'Two-rescuer infant CPR: use the 2-thumb encircling technique for superior compression force. Ratio is 15:2 with coordinated ventilations during each compression cycle.',
      },
    ],
    expected_sequence: ['check_responsiveness', 'call_911', 'check_brachial_pulse', 'cpr_15_2_infant_2thumb', 'bag_valve_mask_infant', 'switch_compressor_roles'],
    interventions: {
      check_responsiveness: {
        duration_sec: 10,
        priority: 200,
        success_chance: 1,
        success_state: {},
        rationale: 'Initial responsiveness check triggers the infant cardiac arrest algorithm and role assignment; with two rescuers, assessment and role delineation happen simultaneously to minimise time to first compression per AHA 2020 BLS guidelines.',
      },
      call_911: {
        duration_sec: 15,
        priority: 190,
        success_chance: 1,
        rationale: 'With two rescuers, the second rescuer calls 911 immediately while the first begins CPR, eliminating the lone-rescuer 2-minute CPR-before-call delay; simultaneous activation ensures ALS resources are en route per AHA 2020 BLS guidelines.',
      },
      check_brachial_pulse: {
        duration_sec: 10,
        priority: 90,
        success_chance: 1,
        success_state: {},
        rationale: 'Brachial pulse check confirms pulseless cardiac arrest in the infant, initiating the 15:2 two-rescuer sequence; brachial is the preferred site over carotid due to the difficulty of palpating the carotid in short infant necks per AHA 2020 BLS guidelines.',
      },
      cpr_15_2_infant_2thumb: {
        duration_sec: 120,
        priority: 100,
        state_overrides: { bp: '42/18', spo2: 74 },
        rationale: 'The 2-thumb encircling technique with 15:2 ratio generates greater compression depth and force than the 2-finger method; it allows the second rescuer to manage ventilation at a higher frequency, addressing the hypoxic aetiology per AHA 2020 BLS guidelines.',
      },
      bag_valve_mask_infant: {
        duration_sec: 60,
        priority: 90,
        success_chance: 0.7,
        success_state: { rhythm: 'Sinus', hr: 130, bp: '72/42', spo2: 97, rr: 32, pulsePresent: true },
        rationale: 'Neonatal/infant BVM with supplemental oxygen provides controlled tidal volumes (6–8 mL/kg), avoiding barotrauma risk of unsupported rescue breaths; two rescuers allow continuous compressions with interposed ventilations per AHA 2020 BLS guidelines.',
      },
      switch_compressor_roles: {
        duration_sec: 10,
        priority: 85,
        success_chance: 1,
        state_overrides: { bp: '44/20' },
        rationale: 'Rotating the compressing rescuer every 2 minutes maintains compression depth above the 1.5-inch threshold; compressor fatigue accumulates rapidly in the encircling technique and degrades CPR quality without role switching per AHA 2020 BLS guidelines.',
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
    failure_conditions: [
      { vital: 'pulsePresent', equals: false, durationSec: 300 },
      { elapsedSecGte: 480 },
    ],
  },

  // BLS Scenario 8 — bls_adult_choking_responsive
  // Responsive adult choking: 5 back blows + 5 abdominal thrusts (Heimlich), repeat until dislodged or unresponsive
  {
    scenario_id: 'bls_adult_choking_responsive',
    title: 'Adult Foreign Body Airway Obstruction — Responsive',
    patient: { name: 'Diana Cole', age: '45yo', gender: 'F' },
    meta: { difficulty: 'Beginner', domain: 'Emergency', estimatedDurationSec: 300, protocol: 'BLS' },
    conclusion: 'Foreign body airway obstruction cleared with back blows and abdominal thrusts. Patient\'s airway was restored and SpO₂ returned to normal. EMS advised to evaluate for rib or visceral injury.',
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
        rationale: 'Confirming a complete obstruction before intervening prevents unnecessary maneuvers; AHA BLS guidelines specify acting only when the patient cannot speak, cough, or breathe.',
      },
      back_blows_5: {
        duration_sec: 15,
        priority: 100,
        success_chance: 0.3,
        success_state: { spo2: 96, rr: 16, hr: 95, pulsePresent: true },
        rationale: 'Five firm back blows between the shoulder blades deliver percussive force to dislodge the foreign body; AHA 2020 BLS guidelines recommend alternating back blows with abdominal thrusts.',
      },
      abdominal_thrusts_heimlich_5: {
        duration_sec: 15,
        priority: 100,
        success_chance: 0.5,
        success_state: { spo2: 97, rr: 14, hr: 90, pulsePresent: true },
        rationale: 'Five upward abdominal thrusts (Heimlich maneuver) compress the diaphragm, increasing intrathoracic pressure to expel the obstruction; AHA 2020 recommends alternating with back blows until cleared.',
      },
      call_911: {
        duration_sec: 15,
        priority: 90,
        success_chance: 1,
        rationale: 'Activating EMS ensures advanced airway management is available if the obstruction cannot be cleared; AHA BLS guidelines advise calling 911 early in any severe airway obstruction emergency.',
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
    conclusion: 'Unresponsive choking victim resuscitated via CPR compressions which expelled the obstruction. Airway cleared and spontaneous circulation restored. Transferred to hospital for post-arrest evaluation.',
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
        rationale: 'Activating EMS immediately ensures advanced airway support is en route; AHA 2020 BLS guidelines emphasize early EMS activation for any unresponsive victim.',
      },
      lower_to_ground: {
        duration_sec: 10,
        priority: 190,
        success_chance: 1,
        rationale: 'Safely lowering the patient to a firm, flat surface is required before beginning CPR; controlled positioning prevents injury and enables effective chest compressions.',
      },
      cpr_30_2: {
        duration_sec: 120,
        priority: 100,
        state_overrides: { bp: '55/18', spo2: 72 },
        rationale: 'Chest compressions in an unresponsive choking victim can generate sufficient intrathoracic pressure to dislodge the foreign body; AHA 2020 BLS guidelines recommend standard CPR 30:2 when the victim is unresponsive.',
      },
      look_in_mouth_before_breath: {
        duration_sec: 5,
        priority: 95,
        success_chance: 0.35,
        success_state: { rr: 12, spo2: 88, pulsePresent: false },
        rationale: 'Before each rescue breath, inspect the mouth for a visible object; AHA BLS guidelines state to remove an object only if clearly visible — blind finger sweeps risk pushing the obstruction deeper.',
      },
      rescue_breathing: {
        duration_sec: 60,
        priority: 90,
        success_chance: 0.6,
        success_state: { rhythm: 'Sinus', hr: 78, bp: '100/62', spo2: 95, rr: 14, pulsePresent: true },
        rationale: 'Once the obstruction is cleared or partially dislodged, rescue breaths deliver oxygen to the hypoxic patient; 1 breath every 5–6 seconds supports adequate ventilation until spontaneous breathing resumes.',
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
    conclusion: 'Infant airway obstruction cleared with back slaps and chest thrusts. SpO₂ and respiratory rate normalized. Remember: abdominal thrusts are contraindicated in infants.',
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
        rationale: 'Supporting the infant face-down along your forearm with the head lower than the chest uses gravity to assist dislodgement; AHA 2020 BLS guidelines specify this positioning before back slaps.',
      },
      back_slaps_infant_5: {
        duration_sec: 15,
        priority: 100,
        success_chance: 0.35,
        success_state: { spo2: 95, rr: 28, hr: 140, pulsePresent: true },
        rationale: 'Five firm back slaps between the infant\'s shoulder blades generate percussive force to dislodge the foreign body; AHA 2020 BLS guidelines recommend alternating with chest thrusts for infant FBAO.',
      },
      chest_thrusts_infant_5: {
        duration_sec: 15,
        priority: 100,
        success_chance: 0.5,
        success_state: { spo2: 96, rr: 30, hr: 138, pulsePresent: true },
        rationale: 'Five chest thrusts (two fingers on the lower sternum) compress the chest to expel the obstruction; AHA 2020 BLS guidelines require chest thrusts — NOT abdominal thrusts — for infants under 1 year.',
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
        rationale: 'Activating EMS ensures advanced airway support is available if the obstruction cannot be manually cleared; AHA BLS guidelines recommend calling 911 early for any infant with complete airway obstruction.',
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
    conclusion: 'Opioid overdose reversed with intranasal naloxone and rescue breathing. Patient placed in recovery position. Counselled on naloxone carry and harm reduction strategies.',
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
        rationale: 'Checking responsiveness identifies the severity of opioid depression and determines urgency of intervention; AHA 2020 opioid emergency guidelines begin with assessing level of consciousness.',
      },
      sternal_rub_stimulation: {
        duration_sec: 10,
        priority: 95,
        success_chance: 0.1,
        success_state: {},
        rationale: 'A sternal rub provides a painful stimulus to assess for any residual responsiveness; it may briefly arouse a patient with partial opioid effect before committing to rescue breathing or naloxone.',
      },
      rescue_breathing: {
        duration_sec: 60,
        priority: 100,
        state_overrides: { spo2: 88, rr: 8 },
        rationale: 'Opioid overdose primarily causes respiratory depression; rescue breathing at 1 breath every 5–6 seconds corrects hypoxia while naloxone takes effect, per AHA 2020 opioid emergency response guidelines.',
      },
      call_911: {
        duration_sec: 15,
        priority: 190,
        success_chance: 1,
        rationale: 'Activating EMS ensures advanced care is en route; AHA 2020 guidelines emphasize early EMS activation since naloxone duration may be shorter than the opioid\'s effect, requiring repeat dosing.',
      },
      naloxone_intranasal_4mg: {
        duration_sec: 180,
        priority: 150,
        success_chance: 0.85,
        success_state: { rr: 14, spo2: 96, hr: 88, rhythm: 'Sinus', bp: '110/68', pulsePresent: true },
        rationale: 'Intranasal naloxone 4 mg is the preferred first-line opioid reversal agent for BLS providers; AHA 2020 guidelines recommend administration as soon as opioid overdose is suspected.',
      },
      naloxone_im_repeat: {
        duration_sec: 120,
        priority: 140,
        success_chance: 0.9,
        success_state: { rr: 16, spo2: 97, hr: 90, rhythm: 'Sinus', bp: '112/70', pulsePresent: true },
        rationale: 'A repeat naloxone dose every 2–4 minutes is indicated if the patient does not respond; AHA 2020 guidelines state naloxone may need to be re-administered as fentanyl and long-acting opioids outlast a single dose.',
      },
      recovery_position: {
        duration_sec: 20,
        priority: 80,
        success_chance: 1,
        state_overrides: { spo2: 90 },
        rationale: 'Placing a responsive patient in the lateral recovery position prevents aspiration if vomiting occurs; AHA 2020 opioid guidelines recommend recovery position for patients who regain consciousness but remain sedated.',
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
    conclusion: 'Drowning victim resuscitated with ventilation-first BLS protocol. Rescue breathing before compressions addressed the hypoxic aetiology. Patient admitted for secondary drowning observation.',
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
        rationale: 'Removing the patient from the water is the prerequisite for any resuscitation; AHA 2020 BLS drowning guidelines state that rescue breaths should begin as soon as the victim is safely accessible.',
      },
      check_responsiveness: {
        duration_sec: 10,
        priority: 200,
        success_chance: 1,
        success_state: {},
        rationale: 'Confirming unresponsiveness guides the resuscitation sequence; AHA 2020 BLS guidelines require responsiveness check before initiating rescue breathing or CPR.',
      },
      call_911: {
        duration_sec: 15,
        priority: 200,
        success_chance: 1,
        rationale: 'Activating EMS immediately ensures advanced life support is en route; AHA 2020 drowning guidelines emphasize early dispatch as drowning victims may require prolonged resuscitation.',
      },
      open_airway_head_tilt_chin_lift: {
        duration_sec: 10,
        priority: 195,
        success_chance: 1,
        rationale: 'Opening the airway with head-tilt chin-lift relieves anatomical obstruction caused by muscle relaxation; AHA 2020 BLS guidelines specify this maneuver before rescue breaths in a drowning victim.',
      },
      initial_rescue_breaths_5: {
        duration_sec: 30,
        priority: 190,
        state_overrides: { spo2: 70 },
        rationale: 'Five initial rescue breaths are the priority in drowning because cardiac arrest is hypoxic in origin; AHA 2020 drowning guidelines recommend ventilation-first resuscitation before beginning chest compressions.',
      },
      cpr_30_2: {
        duration_sec: 120,
        priority: 100,
        state_overrides: { bp: '55/18', spo2: 78 },
        rationale: 'Standard 30:2 CPR provides circulatory support once the airway has been ventilated; AHA 2020 BLS guidelines continue CPR after initial rescue breaths if the patient remains pulseless.',
      },
      rescue_breathing: {
        duration_sec: 60,
        priority: 120,
        state_overrides: { spo2: 88 },
        rationale: 'Ongoing rescue breathing at 1 breath every 5–6 seconds (10–12/min) maintains oxygenation in the apnoeic patient; AHA 2020 guidelines prioritise ventilation throughout drowning resuscitation.',
      },
      dry_chest_before_aed: {
        duration_sec: 10,
        priority: 45,
        success_chance: 1,
        success_state: {},
        rationale: 'Drying the chest ensures good electrode contact and prevents arcing during defibrillation; AHA 2020 BLS guidelines require removing water from the chest before attaching AED pads.',
      },
      aed_attach: {
        duration_sec: 30,
        priority: 80,
        success_chance: 0.5,
        success_state: { rhythm: 'Sinus', hr: 75, bp: '100/60', spo2: 95, rr: 14, pulsePresent: true },
        rationale: 'Attaching the AED allows rhythm analysis and defibrillation of shockable rhythms; AHA 2020 guidelines recommend AED use as soon as available after the ventilation-priority phase of drowning BLS.',
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
