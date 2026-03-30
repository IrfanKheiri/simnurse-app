import { describe, it, expect } from 'vitest';
import { seedScenarios } from './seedScenarios';
import { INTERVENTION_SHORT_LABELS } from '../App';
import { CHEAT_LABELS } from '../components/CheatOverlay';

const allInterventionIds = [
  ...new Set(seedScenarios.flatMap(s => Object.keys(s.interventions))),
].sort();

const blsScenarios = seedScenarios.filter(scenario => scenario.meta?.protocol === 'BLS');
const aclsScenarios = seedScenarios.filter(scenario => scenario.meta?.protocol === 'ACLS');

const isTerminalRoscState = (
  successState?: { pulsePresent?: boolean; rhythm?: string },
) => successState?.pulsePresent === true && successState?.rhythm === 'Sinus';

function getScenario(scenarioId: string) {
  const scenario = seedScenarios.find((item) => item.scenario_id === scenarioId);
  expect(scenario, `Missing scenario: ${scenarioId}`).toBeDefined();
  return scenario!;
}

function getExpectedSequence(scenarioId: string, protocol: 'BLS' | 'ACLS' | 'PALS' = 'BLS') {
  const scenario = getScenario(scenarioId);

  expect(scenario.meta?.protocol, `${scenarioId} should be authored as a ${protocol} scenario`).toBe(protocol);
  expect(
    scenario.expected_sequence,
    `${scenarioId} should define expected_sequence directly in seedScenarios.ts`,
  ).toBeDefined();

  return scenario.expected_sequence ?? [];
}

function assertOrderedSteps(
  scenarioId: string,
  orderedStepIds: string[],
  protocol: 'BLS' | 'ACLS' | 'PALS' = 'BLS',
) {
  const expectedSequence = getExpectedSequence(scenarioId, protocol);
  const stepIndexes = orderedStepIds.map((stepId) => {
    const index = expectedSequence.indexOf(stepId);

    expect(index, `${scenarioId} should include ${stepId} in expected_sequence`).toBeGreaterThanOrEqual(0);

    return index;
  });

  for (let index = 1; index < stepIndexes.length; index += 1) {
    expect(
      stepIndexes[index],
      `${scenarioId} should order ${orderedStepIds[index - 1]} before ${orderedStepIds[index]}`,
    ).toBeGreaterThan(stepIndexes[index - 1]!);
  }
}

describe('label map completeness', () => {
  it('INTERVENTION_SHORT_LABELS covers all scenario intervention IDs', () => {
    const missing = allInterventionIds.filter(id => !(id in INTERVENTION_SHORT_LABELS));
    expect(
      missing,
      `Missing from INTERVENTION_SHORT_LABELS: ${missing.join(', ')}`,
    ).toHaveLength(0);
  });

  it('CHEAT_LABELS covers all scenario intervention IDs', () => {
    const missing = allInterventionIds.filter(id => !(id in CHEAT_LABELS));
    expect(
      missing,
      `Missing from CHEAT_LABELS: ${missing.join(', ')}`,
    ).toHaveLength(0);
  });
});

describe('shockable arrest teaching flow authoring', () => {
  const terminalSteps = {
    adult_vfib_arrest_witnessed: 'amiodarone_300mg',
    adult_pulseless_vtach: 'amiodarone_300mg',
    pediatric_pulseless_vfib: 'amiodarone_peds_5mgkg',
    bls_adult_cardiac_arrest_bystander: 'resume_cpr_post_shock',
    bls_adult_two_rescuer_cpr: 'resume_cpr_post_shock',
    bls_adult_aed_public_access: 'resume_cpr_post_shock',
    bls_child_cardiac_arrest: 'resume_cpr_post_shock',
    bls_child_two_rescuer_cpr: 'resume_cpr_post_shock',
  } as const;

  it('keeps full ROSC off pre-terminal expected steps', () => {
    for (const [scenarioId, terminalStep] of Object.entries(terminalSteps)) {
      const scenario = getScenario(scenarioId);
      const expectedSequence = scenario.expected_sequence ?? [];

      expect(
        expectedSequence.at(-1),
        `${scenarioId} should end its teaching sequence on ${terminalStep}`,
      ).toBe(terminalStep);

      for (const interventionId of expectedSequence.slice(0, -1)) {
        expect(
          isTerminalRoscState(scenario.interventions[interventionId]?.success_state),
          `${scenarioId}:${interventionId} should not encode full ROSC before the terminal teaching step`,
        ).toBe(false);
      }

      expect(
        isTerminalRoscState(scenario.interventions[terminalStep]?.success_state),
        `${scenarioId}:${terminalStep} should encode terminal ROSC`,
      ).toBe(true);
    }
  });

  it('treats PMCD as a conditional rescue step in pregnant_vfib_arrest', () => {
    const scenario = getScenario('pregnant_vfib_arrest');

    expect(scenario.expected_sequence).not.toContain('perimortem_csection');
    expect(isTerminalRoscState(scenario.interventions.defibrillate.success_state)).toBe(false);
    expect(isTerminalRoscState(scenario.interventions.perimortem_csection.success_state)).toBe(true);
  });
});

describe('BLS source-of-truth authoring', () => {
  it('defines every BLS expected_sequence directly against authored interventions', () => {
    const issues = blsScenarios.flatMap((scenario) => {
      const expectedSequence = scenario.expected_sequence ?? [];
      const duplicateSteps = [...new Set(
        expectedSequence.filter((stepId, index) => expectedSequence.indexOf(stepId) !== index),
      )];
      const missingInterventions = expectedSequence.filter(
        stepId => !(stepId in scenario.interventions),
      );

      return [
        ...(expectedSequence.length === 0 ? [`${scenario.scenario_id}: missing expected_sequence`] : []),
        ...missingInterventions.map(
          stepId => `${scenario.scenario_id}: expected_sequence references missing intervention ${stepId}`,
        ),
        ...duplicateSteps.map(
          stepId => `${scenario.scenario_id}: expected_sequence repeats step ${stepId}`,
        ),
      ];
    });

    expect(
      issues,
      `BLS source-of-truth authoring issues:\n${issues.join('\n')}`,
    ).toHaveLength(0);
  });

  it('stores rationale text directly on every required BLS step', () => {
    const missingRationales = blsScenarios.flatMap((scenario) =>
      (scenario.expected_sequence ?? [])
        .filter((stepId) => !scenario.interventions[stepId]?.rationale?.trim())
        .map((stepId) => `${scenario.scenario_id}:${stepId}`),
    );

    expect(
      missingRationales,
      `BLS expected_sequence steps missing authored rationale in seedScenarios.ts:\n${missingRationales.join('\n')}`,
    ).toHaveLength(0);
  });

  it('preserves special-case BLS sequencing rules directly in seedScenarios.ts', () => {
    expect(getExpectedSequence('bls_adult_cardiac_arrest_bystander')).not.toContain('check_carotid_pulse');
    assertOrderedSteps('bls_adult_cardiac_arrest_bystander', [
      'check_responsiveness',
      'call_911',
      'cpr_30_2',
      'aed_attach',
      'resume_cpr_post_shock',
    ]);

    expect(getExpectedSequence('bls_adult_aed_public_access')).not.toContain('check_carotid_pulse');
    assertOrderedSteps('bls_adult_aed_public_access', [
      'check_responsiveness',
      'call_911',
      'cpr_30_2',
      'aed_power_on',
      'aed_attach_pads',
      'aed_analyze',
      'aed_shock',
      'resume_cpr_post_shock',
    ]);

    assertOrderedSteps('bls_adult_two_rescuer_cpr', [
      'check_responsiveness',
      'call_911',
      'check_carotid_pulse',
      'cpr_30_2',
      'switch_compressor_roles',
      'aed_attach',
      'resume_cpr_post_shock',
    ]);

    assertOrderedSteps('bls_child_cardiac_arrest', [
      'check_responsiveness',
      'call_911',
      'check_carotid_pulse',
      'cpr_30_2_child',
      'rescue_breathing_child',
      'aed_attach',
      'resume_cpr_post_shock',
    ]);

    assertOrderedSteps('bls_child_two_rescuer_cpr', [
      'check_responsiveness',
      'call_911',
      'check_carotid_pulse',
      'cpr_15_2_child',
      'bag_valve_mask_child',
      'switch_compressor_roles',
      'aed_attach',
      'resume_cpr_post_shock',
    ]);

    const infantSingleRescuerSequence = getExpectedSequence('bls_infant_cardiac_arrest');
    expect(
      infantSingleRescuerSequence.at(-1),
      'bls_infant_cardiac_arrest should keep call_911 after the lone-rescuer CPR sequence',
    ).toBe('call_911');
    assertOrderedSteps('bls_infant_cardiac_arrest', [
      'check_responsiveness',
      'check_brachial_pulse',
      'open_airway_head_tilt_chin_lift',
      'cpr_30_2_infant_2finger',
      'rescue_breathing_infant',
      'call_911',
    ]);

    assertOrderedSteps('bls_infant_two_rescuer_cpr', [
      'check_responsiveness',
      'call_911',
      'check_brachial_pulse',
      'cpr_15_2_infant_2thumb',
      'bag_valve_mask_infant',
      'switch_compressor_roles',
    ]);

    const infantChoking = getScenario('bls_infant_choking');
    expect(infantChoking.expected_sequence).not.toContain('abdominal_thrusts_heimlich_5');
    expect(infantChoking.interventions.abdominal_thrusts_heimlich_5?.success_chance).toBe(0);

    assertOrderedSteps('adult_respiratory_arrest_opioid', [
      'check_responsiveness',
      'sternal_rub_stimulation',
      'call_911',
      'rescue_breathing',
      'naloxone_intranasal_4mg',
      'naloxone_intranasal_repeat',
    ]);

    assertOrderedSteps('bls_opioid_overdose_naloxone', [
      'check_responsiveness',
      'sternal_rub_stimulation',
      'call_911',
      'rescue_breathing',
      'naloxone_intranasal_4mg',
      'naloxone_im_repeat',
      'recovery_position',
    ]);

    assertOrderedSteps('bls_drowning_submersion', [
      'remove_from_water',
      'check_responsiveness',
      'call_911',
      'open_airway_head_tilt_chin_lift',
      'initial_rescue_breaths_5',
      'cpr_30_2',
      'rescue_breathing',
      'dry_chest_before_aed',
      'aed_attach',
    ]);
  });
});

describe('ACLS source-of-truth authoring', () => {
  it('defines every ACLS expected_sequence directly against authored interventions', () => {
    const issues = aclsScenarios.flatMap((scenario) => {
      const expectedSequence = scenario.expected_sequence ?? [];
      const duplicateSteps = [...new Set(
        expectedSequence.filter((stepId, index) => expectedSequence.indexOf(stepId) !== index),
      )];
      const missingInterventions = expectedSequence.filter(
        stepId => !(stepId in scenario.interventions),
      );

      return [
        ...(expectedSequence.length === 0 ? [`${scenario.scenario_id}: missing expected_sequence`] : []),
        ...missingInterventions.map(
          stepId => `${scenario.scenario_id}: expected_sequence references missing intervention ${stepId}`,
        ),
        ...duplicateSteps.map(
          stepId => `${scenario.scenario_id}: expected_sequence repeats step ${stepId}`,
        ),
      ];
    });

    expect(
      issues,
      `ACLS source-of-truth authoring issues:\n${issues.join('\n')}`,
    ).toHaveLength(0);
  });

  it('stores rationale text directly on every required ACLS step', () => {
    const missingRationales = aclsScenarios.flatMap((scenario) =>
      (scenario.expected_sequence ?? [])
        .filter((stepId) => !scenario.interventions[stepId]?.rationale?.trim())
        .map((stepId) => `${scenario.scenario_id}:${stepId}`),
    );

    expect(
      missingRationales,
      `ACLS expected_sequence steps missing authored rationale in seedScenarios.ts:\n${missingRationales.join('\n')}`,
    ).toHaveLength(0);
  });

  it('preserves special-case ACLS sequencing rules directly in seedScenarios.ts', () => {
    assertOrderedSteps('adult_vfib_arrest_witnessed', [
      'defibrillate',
      'cpr',
      'establish_iv',
      'epinephrine_1mg',
      'amiodarone_300mg',
    ], 'ACLS');

    const adultAsystole = getScenario('adult_asystole_unwitnessed');
    expect(getExpectedSequence('adult_asystole_unwitnessed', 'ACLS')).not.toContain('defibrillate');
    expect(adultAsystole.interventions).not.toHaveProperty('defibrillate');
    assertOrderedSteps('adult_asystole_unwitnessed', ['cpr', 'establish_iv', 'epinephrine_1mg'], 'ACLS');

    assertOrderedSteps('adult_pulseless_vtach', [
      'defibrillate',
      'cpr',
      'establish_iv',
      'epinephrine_1mg',
      'amiodarone_300mg',
    ], 'ACLS');

    assertOrderedSteps('adult_pea_hypovolemia', [
      'cpr',
      'establish_iv',
      'normal_saline_bolus',
      'epinephrine_1mg',
    ], 'ACLS');

    const peaHypoxia = getScenario('adult_pea_hypoxia');
    expect(getExpectedSequence('adult_pea_hypoxia', 'ACLS')).not.toContain('defibrillate');
    expect(peaHypoxia.interventions).not.toHaveProperty('defibrillate');
    assertOrderedSteps('adult_pea_hypoxia', [
      'cpr',
      'rescue_breathing',
      'intubation',
      'establish_iv',
      'epinephrine_1mg',
    ], 'ACLS');

    assertOrderedSteps('adult_unstable_bradycardia', [
      'oxygen_nrb',
      'establish_iv',
      'atropine_0_5mg',
      'transcutaneous_pacing',
    ], 'ACLS');

    assertOrderedSteps('adult_svt', [
      'vagal_maneuver',
      'establish_iv',
      'adenosine_6mg',
      'synchronized_cardioversion',
    ], 'ACLS');

    assertOrderedSteps('adult_vtach_pulse', [
      'synchronized_cardioversion',
      'establish_iv',
      'amiodarone_150mg_stable',
    ], 'ACLS');

    const pregnantVfib = getScenario('pregnant_vfib_arrest');
    expect(getExpectedSequence('pregnant_vfib_arrest', 'ACLS')).not.toContain('perimortem_csection');
    assertOrderedSteps('pregnant_vfib_arrest', [
      'left_uterine_displacement',
      'cpr',
      'defibrillate',
      'establish_iv',
      'epinephrine_1mg',
    ], 'ACLS');
    expect(
      pregnantVfib.scheduledStateChanges?.find(change => change.id === 'pmcd_window_open')?.atSec,
    ).toBe(300);

    assertOrderedSteps('anaphylactic_shock', [
      'epinephrine_im_0_5mg',
      'oxygen_nrb',
      'establish_iv',
      'iv_fluid_bolus_anaphylaxis',
      'intubation',
    ], 'ACLS');

    expect(getExpectedSequence('acs_stemi', 'ACLS')).not.toContain('oxygen_nrb');
    assertOrderedSteps('acs_stemi', [
      'aspirin_324mg',
      'ticagrelor_180mg',
      'nitroglycerin_04mg',
      'establish_iv',
      'heparin_bolus',
      'activate_cath_lab',
    ], 'ACLS');
    expect(
      getScenario('acs_stemi').scheduledStateChanges?.find(change => change.id === 'stemi_to_vfib')?.atSec,
    ).toBe(300);

    assertOrderedSteps('adult_stroke_cva', [
      'check_glucose',
      'establish_iv',
      'ct_brain_noncontrast',
      'labetalol_10mg',
      'alteplase',
    ], 'ACLS');
  });
});

describe('opioid respiratory arrest teaching flow authoring', () => {
  it('keeps full recovery off the first naloxone step in adult_respiratory_arrest_opioid', () => {
    const scenario = getScenario('adult_respiratory_arrest_opioid');
    const firstDose = scenario.interventions.naloxone_intranasal_4mg.success_state ?? {};
    const repeatDose = scenario.interventions.naloxone_intranasal_repeat.success_state ?? {};

    const meetsRespiratoryRecovery = (state: { rr?: number; spo2?: number }) => (
      (state.rr ?? 0) >= 12 && (state.rr ?? 0) <= 20 && (state.spo2 ?? 0) >= 94
    );

    expect(
      meetsRespiratoryRecovery(firstDose),
      'adult_respiratory_arrest_opioid:naloxone_intranasal_4mg should not fully satisfy respiratory recovery before the repeat dose step',
    ).toBe(false);
    expect(
      meetsRespiratoryRecovery(repeatDose),
      'adult_respiratory_arrest_opioid:naloxone_intranasal_repeat should encode the terminal respiratory recovery state',
    ).toBe(true);
  });
});
