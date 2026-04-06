import { describe, expect, it } from 'vitest';
import type { Scenario, SessionLogEvent } from './types/scenario';
import * as AppModule from './App';
import { seedScenarios } from './data/seedScenarios';

type BuildActionFeedbackFn = (logs: SessionLogEvent[], scenario: Scenario | null) => Array<{
  expectedActionLabel?: string;
  expectedActionRationale?: string;
}>;

const buildActionFeedback = (AppModule as { buildActionFeedback?: BuildActionFeedbackFn }).buildActionFeedback;

const testScenario: Scenario = {
  scenario_id: 'debrief_feedback_protocol_metadata',
  title: 'Debrief feedback protocol metadata',
  initial_state: {
    hr: 80,
    bp: '120/80',
    spo2: 98,
    rr: 16,
    rhythm: 'Sinus',
    pulsePresent: true,
  },
  baseline_progressions: [],
  interventions: {
    cpr: {
      rationale: 'High-quality compressions maintain perfusion while the next protocol step is pending.',
    },
    atropine_0_5mg: {
      rationale: 'Atropine is an appropriate pharmacologic next step for symptomatic bradycardia after IV access.',
    },
    transcutaneous_pacing: {
      rationale: 'Transcutaneous pacing is a valid parallel next step when atropine may be ineffective.',
    },
    distractor: {},
  },
  expected_sequence: ['cpr', 'atropine_0_5mg', 'transcutaneous_pacing'],
  success_conditions: [],
  failure_conditions: [],
};

function makeInterventionLog(
  id: number,
  details: Extract<SessionLogEvent, { event_type: 'intervention' }>['details'],
  scenario: Scenario = testScenario,
): SessionLogEvent {
  return {
    id,
    session_id: 'session-1',
    scenario_id: scenario.scenario_id,
    timestamp: 1_000 + id,
    sim_time_sec: id * 3,
    event_type: 'intervention',
    details,
  };
}

function getSeedScenario(scenarioId: string): Scenario {
  const scenario = seedScenarios.find((item) => item.scenario_id === scenarioId);
  expect(scenario, `Missing seeded scenario: ${scenarioId}`).toBeDefined();
  return scenario!;
}

describe('buildActionFeedback', () => {
  it('prefers authoritative state-aware metadata over the raw protocol-next list', () => {
    expect(buildActionFeedback).toBeTypeOf('function');

    const feedback = buildActionFeedback!([
      makeInterventionLog(1, {
        intervention_id: 'distractor',
        rejected: true,
        rejection_category: 'sequence_deviation',
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol.',
        attempt_context: {
          available_intervention_ids: ['atropine_0_5mg'],
          state_aware_available_intervention_ids: ['cpr'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
        },
      }),
    ], testScenario);

    expect(feedback[0]).toMatchObject({
      expectedActionLabel: 'CPR (High-Quality)',
      expectedActionRationale: 'High-quality compressions maintain perfusion while the next protocol step is pending.',
    });
  });

  it('suppresses expected-step guidance when the authoritative state-aware list is empty', () => {
    expect(buildActionFeedback).toBeTypeOf('function');

    const feedback = buildActionFeedback!([
      makeInterventionLog(1, {
        intervention_id: 'distractor',
        rejected: true,
        rejection_category: 'sequence_deviation',
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol.',
        attempt_context: {
          available_intervention_ids: ['cpr'],
          state_aware_available_intervention_ids: [],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
        },
      }),
    ], testScenario);

    expect(feedback[0]?.expectedActionLabel).toBeUndefined();
    expect(feedback[0]?.expectedActionRationale).toBeUndefined();
  });

  it('does not invent a single expected action when persisted metadata shows multiple valid next steps', () => {
    expect(buildActionFeedback).toBeTypeOf('function');

    const feedback = buildActionFeedback!([
      makeInterventionLog(1, {
        intervention_id: 'distractor',
        rejected: true,
        rejection_category: 'sequence_deviation',
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol.',
        attempt_context: {
          available_intervention_ids: ['atropine_0_5mg', 'transcutaneous_pacing'],
          active_route_id: 'primary',
          activated_route_ids: ['primary', 'pacing_optional_branch'],
        },
      }),
    ], testScenario);

    expect(feedback[0]?.expectedActionLabel).toBeUndefined();
    expect(feedback[0]?.expectedActionRationale).toBeUndefined();
  });

  it('keeps adult_pea_hypoxia debrief guidance neutral when rescue_breathing unlocks parallel airway and IV next steps', () => {
    expect(buildActionFeedback).toBeTypeOf('function');

    const adultPeaHypoxia = getSeedScenario('adult_pea_hypoxia');
    const feedback = buildActionFeedback!([
      makeInterventionLog(1, {
        intervention_id: 'cpr',
        rejected: true,
        rejection_category: 'sequence_deviation',
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol.',
        attempt_context: {
          available_intervention_ids: ['establish_iv', 'intubation'],
          state_aware_available_intervention_ids: ['establish_iv', 'intubation'],
          active_route_id: 'primary',
          activated_route_ids: ['primary', 'advanced_airway_optional_branch'],
        },
      }, adultPeaHypoxia),
    ], adultPeaHypoxia);

    expect(feedback[0]?.expectedActionLabel).toBeUndefined();
    expect(feedback[0]?.expectedActionRationale).toBeUndefined();
  });

  it('keeps anaphylactic_shock debrief guidance neutral when oxygen unlocks parallel airway and IV next steps', () => {
    expect(buildActionFeedback).toBeTypeOf('function');

    const anaphylacticShock = getSeedScenario('anaphylactic_shock');
    const feedback = buildActionFeedback!([
      makeInterventionLog(1, {
        intervention_id: 'epinephrine_im_0_5mg',
        rejected: true,
        rejection_category: 'sequence_deviation',
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol.',
        attempt_context: {
          available_intervention_ids: ['establish_iv', 'intubation'],
          state_aware_available_intervention_ids: ['establish_iv', 'intubation'],
          active_route_id: 'primary',
          activated_route_ids: ['primary', 'airway_escalation_optional_branch'],
        },
      }, anaphylacticShock),
    ], anaphylacticShock);

    expect(feedback[0]?.expectedActionLabel).toBeUndefined();
    expect(feedback[0]?.expectedActionRationale).toBeUndefined();
  });

  it('keeps adult_pea_hypovolemia debrief guidance neutral when IV unlocks parallel fluid and epinephrine next steps', () => {
    expect(buildActionFeedback).toBeTypeOf('function');

    const adultPeaHypovolemia = getSeedScenario('adult_pea_hypovolemia');
    const feedback = buildActionFeedback!([
      makeInterventionLog(1, {
        intervention_id: 'cpr',
        rejected: true,
        rejection_category: 'sequence_deviation',
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol.',
        attempt_context: {
          available_intervention_ids: ['normal_saline_bolus', 'epinephrine_1mg'],
          state_aware_available_intervention_ids: ['normal_saline_bolus', 'epinephrine_1mg'],
          active_route_id: 'primary',
          activated_route_ids: ['primary', 'epinephrine_optional_branch'],
        },
      }, adultPeaHypovolemia),
    ], adultPeaHypovolemia);

    expect(feedback[0]?.expectedActionLabel).toBeUndefined();
    expect(feedback[0]?.expectedActionRationale).toBeUndefined();
  });

  it('uses structured primary-route metadata for adult_vfib_arrest_witnessed single-next-step guidance', () => {
    expect(buildActionFeedback).toBeTypeOf('function');

    const adultVfib = getSeedScenario('adult_vfib_arrest_witnessed');
    const feedback = buildActionFeedback!([
      makeInterventionLog(1, {
        intervention_id: 'amiodarone_300mg',
        rejected: true,
        rejection_category: 'sequence_deviation',
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol. The next expected step is: Cpr.',
        attempt_context: {
          available_intervention_ids: ['cpr'],
          state_aware_available_intervention_ids: ['cpr'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
        },
      }, adultVfib),
    ], adultVfib);

    expect(feedback[0]).toMatchObject({
      expectedActionLabel: 'CPR (High-Quality)',
      expectedActionRationale: adultVfib.interventions.cpr.rationale,
    });
  });

  it('uses structured primary-route metadata for bls_adult_cardiac_arrest_bystander single-next-step guidance', () => {
    expect(buildActionFeedback).toBeTypeOf('function');

    const bystanderScenario = getSeedScenario('bls_adult_cardiac_arrest_bystander');
    const feedback = buildActionFeedback!([
      makeInterventionLog(1, {
        intervention_id: 'aed_attach',
        rejected: true,
        rejection_category: 'sequence_deviation',
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol. The next expected step is: CPR 30:2.',
        attempt_context: {
          available_intervention_ids: ['cpr_30_2'],
          state_aware_available_intervention_ids: ['cpr_30_2'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
        },
      }, bystanderScenario),
    ], bystanderScenario);

    expect(feedback[0]).toMatchObject({
      expectedActionLabel: 'CPR 30:2',
      expectedActionRationale: bystanderScenario.interventions.cpr_30_2.rationale,
    });
  });

  it('uses structured primary-route metadata for bls_adult_two_rescuer_cpr single-next-step guidance', () => {
    expect(buildActionFeedback).toBeTypeOf('function');

    const twoRescuerScenario = getSeedScenario('bls_adult_two_rescuer_cpr');
    const feedback = buildActionFeedback!([
      makeInterventionLog(1, {
        intervention_id: 'bag_valve_mask',
        rejected: true,
        rejection_category: 'sequence_deviation',
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol. The next expected step is: Attach AED Pads.',
        attempt_context: {
          available_intervention_ids: ['aed_attach'],
          state_aware_available_intervention_ids: ['aed_attach'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
        },
      }, twoRescuerScenario),
    ], twoRescuerScenario);

    expect(feedback[0]).toMatchObject({
      expectedActionLabel: 'Attach AED Pads',
      expectedActionRationale: twoRescuerScenario.interventions.aed_attach.rationale,
    });
  });

  it('uses structured primary-route metadata for pals_comprehensive single-next-step guidance', () => {
    expect(buildActionFeedback).toBeTypeOf('function');

    const palsScenario = getSeedScenario('pals_comprehensive');
    const feedback = buildActionFeedback!([
      makeInterventionLog(1, {
        intervention_id: 'amiodarone_peds_5mgkg',
        rejected: true,
        rejection_category: 'sequence_deviation',
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol. The next expected step is: Defibrillate Peds.',
        attempt_context: {
          available_intervention_ids: ['defibrillate_peds'],
          state_aware_available_intervention_ids: ['defibrillate_peds'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
        },
      }, palsScenario),
    ], palsScenario);

    expect(feedback[0]).toMatchObject({
      expectedActionLabel: 'Defibrillate — Pediatric (2–4 J/kg)',
      expectedActionRationale: palsScenario.interventions.defibrillate_peds.rationale,
    });
  });

  it('uses structured primary-route metadata for adult_respiratory_arrest_opioid single-next-step guidance', () => {
    expect(buildActionFeedback).toBeTypeOf('function');

    const opioidScenario = getSeedScenario('adult_respiratory_arrest_opioid');
    const feedback = buildActionFeedback!([
      makeInterventionLog(1, {
        intervention_id: 'naloxone_intranasal_repeat',
        rejected: true,
        rejection_category: 'sequence_deviation',
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol. The next expected step is: Naloxone 4mg Intranasal.',
        attempt_context: {
          available_intervention_ids: ['naloxone_intranasal_4mg'],
          state_aware_available_intervention_ids: ['naloxone_intranasal_4mg'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
        },
      }, opioidScenario),
    ], opioidScenario);

    expect(feedback[0]).toMatchObject({
      expectedActionLabel: 'Naloxone 4mg Intranasal',
      expectedActionRationale: opioidScenario.interventions.naloxone_intranasal_4mg.rationale,
    });
  });

  it('uses structured primary-route metadata for adult_stroke_cva single-next-step guidance', () => {
    expect(buildActionFeedback).toBeTypeOf('function');

    const adultStrokeScenario = getSeedScenario('adult_stroke_cva');
    const feedback = buildActionFeedback!([
      makeInterventionLog(1, {
        intervention_id: 'alteplase',
        rejected: true,
        rejection_category: 'sequence_deviation',
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol. The next expected step is: Labetalol 10mg IV.',
        attempt_context: {
          available_intervention_ids: ['labetalol_10mg'],
          state_aware_available_intervention_ids: ['labetalol_10mg'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
        },
      }, adultStrokeScenario),
    ], adultStrokeScenario);

    expect(feedback[0]).toMatchObject({
      expectedActionLabel: 'Labetalol 10mg IV',
      expectedActionRationale: adultStrokeScenario.interventions.labetalol_10mg.rationale,
    });
  });

  it('uses structured primary-route metadata for pediatric_respiratory_arrest_asthma single-next-step guidance', () => {
    expect(buildActionFeedback).toBeTypeOf('function');

    const asthmaScenario = getSeedScenario('pediatric_respiratory_arrest_asthma');
    const feedback = buildActionFeedback!([
      makeInterventionLog(1, {
        intervention_id: 'intubation',
        rejected: true,
        rejection_category: 'sequence_deviation',
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol. The next expected step is: Albuterol Nebulizer.',
        attempt_context: {
          available_intervention_ids: ['albuterol_nebulizer'],
          state_aware_available_intervention_ids: ['albuterol_nebulizer'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
        },
      }, asthmaScenario),
    ], asthmaScenario);

    expect(feedback[0]).toMatchObject({
      expectedActionLabel: 'Albuterol Nebulizer (2.5mg)',
      expectedActionRationale: asthmaScenario.interventions.albuterol_nebulizer.rationale,
    });
  });

  it('uses structured primary-route metadata for acs_stemi single-next-step guidance', () => {
    expect(buildActionFeedback).toBeTypeOf('function');

    const acsStemiScenario = getSeedScenario('acs_stemi');
    const feedback = buildActionFeedback!([
      makeInterventionLog(1, {
        intervention_id: 'activate_cath_lab',
        rejected: true,
        rejection_category: 'sequence_deviation',
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol. The next expected step is: Heparin Bolus IV (UFH).',
        attempt_context: {
          available_intervention_ids: ['heparin_bolus'],
          state_aware_available_intervention_ids: ['heparin_bolus'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
        },
      }, acsStemiScenario),
    ], acsStemiScenario);

    expect(feedback[0]).toMatchObject({
      expectedActionLabel: 'Heparin Bolus IV (UFH)',
      expectedActionRationale: acsStemiScenario.interventions.heparin_bolus.rationale,
    });
  });

  it('uses structured primary-route metadata for bls_adult_choking_unresponsive single-next-step guidance', () => {
    expect(buildActionFeedback).toBeTypeOf('function');

    const adultChokingUnresponsiveScenario = getSeedScenario('bls_adult_choking_unresponsive');
    const feedback = buildActionFeedback!([
      makeInterventionLog(1, {
        intervention_id: 'rescue_breathing',
        rejected: true,
        rejection_category: 'sequence_deviation',
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol. The next expected step is: Look In Mouth Before Breath.',
        attempt_context: {
          available_intervention_ids: ['look_in_mouth_before_breath'],
          state_aware_available_intervention_ids: ['look_in_mouth_before_breath'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
        },
      }, adultChokingUnresponsiveScenario),
    ], adultChokingUnresponsiveScenario);

    expect(feedback[0]).toMatchObject({
      expectedActionLabel: 'Look In Mouth Before Breath',
      expectedActionRationale: adultChokingUnresponsiveScenario.interventions.look_in_mouth_before_breath.rationale,
    });
  });

  it('uses structured primary-route metadata for bls_drowning_submersion single-next-step guidance', () => {
    expect(buildActionFeedback).toBeTypeOf('function');

    const drowningSubmersionScenario = getSeedScenario('bls_drowning_submersion');
    const feedback = buildActionFeedback!([
      makeInterventionLog(1, {
        intervention_id: 'aed_attach',
        rejected: true,
        rejection_category: 'sequence_deviation',
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol. The next expected step is: Dry Chest Before AED.',
        attempt_context: {
          available_intervention_ids: ['dry_chest_before_aed'],
          state_aware_available_intervention_ids: ['dry_chest_before_aed'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
        },
      }, drowningSubmersionScenario),
    ], drowningSubmersionScenario);

    expect(feedback[0]).toMatchObject({
      expectedActionLabel: 'Dry Chest Before AED',
      expectedActionRationale: drowningSubmersionScenario.interventions.dry_chest_before_aed.rationale,
    });
  });

  it('uses structured primary-route metadata for bls_adult_aed_public_access single-next-step guidance', () => {
    expect(buildActionFeedback).toBeTypeOf('function');

    const publicAedScenario = getSeedScenario('bls_adult_aed_public_access');
    const feedback = buildActionFeedback!([
      makeInterventionLog(1, {
        intervention_id: 'aed_attach_pads',
        rejected: true,
        rejection_category: 'sequence_deviation',
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol. The next expected step is: Power On AED.',
        attempt_context: {
          available_intervention_ids: ['aed_power_on'],
          state_aware_available_intervention_ids: ['aed_power_on'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
        },
      }, publicAedScenario),
    ], publicAedScenario);

    expect(feedback[0]).toMatchObject({
      expectedActionLabel: 'Power On AED',
      expectedActionRationale: publicAedScenario.interventions.aed_power_on.rationale,
    });
  });

  it('uses structured primary-route metadata for bls_child_cardiac_arrest single-next-step guidance', () => {
    expect(buildActionFeedback).toBeTypeOf('function');

    const childArrestScenario = getSeedScenario('bls_child_cardiac_arrest');
    const feedback = buildActionFeedback!([
      makeInterventionLog(1, {
        intervention_id: 'aed_attach',
        rejected: true,
        rejection_category: 'sequence_deviation',
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol. The next expected step is: Check Carotid Pulse.',
        attempt_context: {
          available_intervention_ids: ['check_carotid_pulse'],
          state_aware_available_intervention_ids: ['check_carotid_pulse'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
        },
      }, childArrestScenario),
    ], childArrestScenario);

    expect(feedback[0]).toMatchObject({
      expectedActionLabel: 'Check Carotid Pulse',
      expectedActionRationale: childArrestScenario.interventions.check_carotid_pulse.rationale,
    });
  });

  it('uses structured primary-route metadata for bls_child_two_rescuer_cpr single-next-step guidance', () => {
    expect(buildActionFeedback).toBeTypeOf('function');

    const childTwoRescuerScenario = getSeedScenario('bls_child_two_rescuer_cpr');
    const feedback = buildActionFeedback!([
      makeInterventionLog(1, {
        intervention_id: 'bag_valve_mask_child',
        rejected: true,
        rejection_category: 'sequence_deviation',
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol. The next expected step is: Attach AED Pads.',
        attempt_context: {
          available_intervention_ids: ['aed_attach'],
          state_aware_available_intervention_ids: ['aed_attach'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
        },
      }, childTwoRescuerScenario),
    ], childTwoRescuerScenario);

    expect(feedback[0]).toMatchObject({
      expectedActionLabel: 'Attach AED Pads',
      expectedActionRationale: childTwoRescuerScenario.interventions.aed_attach.rationale,
    });
  });

  it('uses structured primary-route metadata for bls_infant_cardiac_arrest single-next-step guidance', () => {
    expect(buildActionFeedback).toBeTypeOf('function');

    const infantSingleRescuerScenario = getSeedScenario('bls_infant_cardiac_arrest');
    const feedback = buildActionFeedback!([
      makeInterventionLog(1, {
        intervention_id: 'call_911',
        rejected: true,
        rejection_category: 'sequence_deviation',
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol. The next expected step is: Check Brachial Pulse.',
        attempt_context: {
          available_intervention_ids: ['check_brachial_pulse'],
          state_aware_available_intervention_ids: ['check_brachial_pulse'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
        },
      }, infantSingleRescuerScenario),
    ], infantSingleRescuerScenario);

    expect(feedback[0]).toMatchObject({
      expectedActionLabel: 'Check Brachial Pulse',
      expectedActionRationale: infantSingleRescuerScenario.interventions.check_brachial_pulse.rationale,
    });
  });

  it('uses structured primary-route metadata for bls_infant_two_rescuer_cpr single-next-step guidance', () => {
    expect(buildActionFeedback).toBeTypeOf('function');

    const infantTwoRescuerScenario = getSeedScenario('bls_infant_two_rescuer_cpr');
    const feedback = buildActionFeedback!([
      makeInterventionLog(1, {
        intervention_id: 'bag_valve_mask_infant',
        rejected: true,
        rejection_category: 'sequence_deviation',
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol. The next expected step is: Check Brachial Pulse.',
        attempt_context: {
          available_intervention_ids: ['check_brachial_pulse'],
          state_aware_available_intervention_ids: ['check_brachial_pulse'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
        },
      }, infantTwoRescuerScenario),
    ], infantTwoRescuerScenario);

    expect(feedback[0]).toMatchObject({
      expectedActionLabel: 'Check Brachial Pulse',
      expectedActionRationale: infantTwoRescuerScenario.interventions.check_brachial_pulse.rationale,
    });
  });

  it('falls back to legacy expected-sequence replay when structured protocol metadata is absent', () => {
    expect(buildActionFeedback).toBeTypeOf('function');

    const feedback = buildActionFeedback!([
      makeInterventionLog(1, {
        intervention_id: 'distractor',
        rejected: true,
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol. The next expected step is: Cpr.',
      }),
    ], testScenario);

    expect(feedback[0]).toMatchObject({
      expectedActionLabel: 'CPR (High-Quality)',
      expectedActionRationale: 'High-quality compressions maintain perfusion while the next protocol step is pending.',
    });
  });
});
