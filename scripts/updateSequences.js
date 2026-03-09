import fs from 'fs';

const seedsFile = 'd:\\Projects\\simnurse-app\\src\\data\\seedScenarios.ts';
let code = fs.readFileSync(seedsFile, 'utf8');

const sequences = {
  "adult_asystole_unwitnessed": ["cpr", "epinephrine_1mg"],
  "adult_pulseless_vtach": ["cpr", "defibrillate", "amiodarone_300mg"],
  "adult_pea_hypovolemia": ["cpr", "establish_iv", "epinephrine_1mg"],
  "adult_pea_hypoxia": ["cpr", "rescue_breathing", "intubation", "epinephrine_1mg"],
  "adult_respiratory_arrest_opioid": ["rescue_breathing", "naloxone_2mg"],
  "adult_unstable_bradycardia": ["oxygen_nrb", "atropine_1mg"],
  "adult_svt": ["vagal_maneuver", "adenosine_6mg", "synchronized_cardioversion"],
  "adult_vtach_pulse": ["amiodarone_300mg", "synchronized_cardioversion"],
  "pregnant_vfib_arrest": ["cpr", "defibrillate", "epinephrine_1mg"],
  "anaphylactic_shock": ["epinephrine_im", "oxygen_nrb", "intubation"],
  "acs_stemi": ["oxygen_nrb", "aspirin_324mg", "nitroglycerin_04mg"],
  "adult_stroke_cva": ["check_glucose", "establish_iv", "alteplase"],
  "pediatric_respiratory_arrest_asthma": ["rescue_breathing", "epinephrine_im", "intubation"],
  "pediatric_pulseless_vfib": ["cpr", "defibrillate", "epinephrine_1mg"]
};

for (const [scenarioId, seq] of Object.entries(sequences)) {
  const searchStr = `scenario_id: "${scenarioId}"`;
  const idx = code.indexOf(searchStr);
  if (idx !== -1) {
    const bpIndex = code.indexOf('baseline_progressions:', idx);
    const endIndex = code.indexOf(']', bpIndex) + 1;
    
    // Check if expected_sequence already exists nearby
    if (code.slice(endIndex, endIndex + 100).includes('expected_sequence')) {
        continue;
    }
    
    const seqStr = `\n    expected_sequence: [\n      ${seq.map(s => `"${s}"`).join(',\n      ')}\n    ],`;
    
    code = code.slice(0, endIndex) + seqStr + code.slice(endIndex);
  }
}

fs.writeFileSync(seedsFile, code);
console.log('Seed scenarios updated with expected_sequence');
