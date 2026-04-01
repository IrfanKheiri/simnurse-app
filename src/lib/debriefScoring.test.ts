import { describe, expect, it } from 'vitest';
import { deriveDebriefSummary } from './debriefScoring';
import { seedScenarios } from '../data/seedScenarios';

function getSeedScenario(scenarioId: string) {
  const scenario = seedScenarios.find((item) => item.scenario_id === scenarioId);
  expect(scenario, `Missing seeded scenario: ${scenarioId}`).toBeDefined();
  return scenario!;
}

describe('deriveDebriefSummary', () => {
  const strictScenario = {
    meta: { completionPolicy: 'strict_sequence_required' as const },
    expected_sequence: ['step_one', 'step_two', 'step_three', 'step_four'],
  };

  it('treats unchosen optional branches as neutral when runtime required steps are complete', () => {
    const summary = deriveDebriefSummary({
      actions: [
        { isCorrect: true },
        { isCorrect: true },
      ],
      outcome: 'failed',
      scenario: strictScenario,
      completedRequiredSteps: 2,
      requiredStepCount: 2,
    });

    expect(summary.remainingRequiredSteps).toBe(0);
    expect(summary.omissionCount).toBe(0);
    expect(summary.strictSequenceIncomplete).toBe(false);
    expect(summary.score).toBe(100);
    expect(summary.clinicalConclusion).toBe(
      'The patient deteriorated despite 2 recorded interventions. 2 intervention(s) were appropriate.',
    );
  });

  it('counts remaining activated required branch steps as omissions for strict incomplete failed runs', () => {
    const summary = deriveDebriefSummary({
      actions: [
        { isCorrect: true },
        { isCorrect: false },
        { isCorrect: false, isDuplicate: true },
      ],
      outcome: 'failed',
      scenario: strictScenario,
      completedRequiredSteps: 2,
      requiredStepCount: 3,
    });

    expect(summary.remainingRequiredSteps).toBe(1);
    expect(summary.omissionCount).toBe(1);
    expect(summary.score).toBe(33);
    expect(summary.clinicalConclusion).toContain(
      'The patient deteriorated before the full required sequence was completed',
    );
  });

  it('counts remaining required steps as omissions for strict incomplete manual runs', () => {
    const summary = deriveDebriefSummary({
      actions: [
        { isCorrect: true },
        { isCorrect: true },
      ],
      outcome: 'manual',
      scenario: strictScenario,
      completedRequiredSteps: 2,
      requiredStepCount: 4,
    });

    expect(summary.remainingRequiredSteps).toBe(2);
    expect(summary.omissionCount).toBe(2);
    expect(summary.score).toBe(50);
    expect(summary.clinicalConclusion).toContain(
      'The scenario was ended before the full required sequence was completed',
    );
  });

  it('keeps success scoring unchanged for strict scenarios', () => {
    const summary = deriveDebriefSummary({
      actions: [
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: false },
      ],
      outcome: 'success',
      scenario: strictScenario,
      completedRequiredSteps: 4,
      requiredStepCount: 4,
    });

    expect(summary.omissionCount).toBe(0);
    expect(summary.score).toBe(75);
    expect(summary.clinicalConclusion).toBe(
      'The patient was stabilized after 4 interventions. 3 intervention(s) were clinically appropriate. 1 intervention(s) were rejected and should be reviewed.',
    );
  });

  it('treats scenarios without strict policy or runtime required-step totals as legacy scoring', () => {
    const legacySummary = deriveDebriefSummary({
      actions: [{ isCorrect: true }],
      outcome: 'failed',
      scenario: { expected_sequence: ['step_one', 'step_two'] },
      completedRequiredSteps: 1,
      requiredStepCount: 0,
    });

    const missingSequenceSummary = deriveDebriefSummary({
      actions: [{ isCorrect: true }],
      outcome: 'failed',
      scenario: {
        meta: { completionPolicy: 'strict_sequence_required' },
        expected_sequence: [],
      },
      completedRequiredSteps: 0,
      requiredStepCount: 0,
    });

    const missingRuntimeTotalSummary = deriveDebriefSummary({
      actions: [{ isCorrect: true }],
      outcome: 'failed',
      scenario: {
        meta: { completionPolicy: 'strict_sequence_required' },
        expected_sequence: ['step_one', 'step_two'],
      },
      completedRequiredSteps: 1,
      requiredStepCount: 0,
    });

    expect(legacySummary.omissionCount).toBe(0);
    expect(legacySummary.score).toBe(100);
    expect(legacySummary.clinicalConclusion).toBe(
      'The patient deteriorated despite 1 recorded interventions. 1 intervention(s) were appropriate.',
    );

    expect(missingSequenceSummary.omissionCount).toBe(0);
    expect(missingSequenceSummary.score).toBe(100);
    expect(missingSequenceSummary.clinicalConclusion).toBe(
      'The patient deteriorated despite 1 recorded interventions. 1 intervention(s) were appropriate.',
    );

    expect(missingRuntimeTotalSummary.omissionCount).toBe(0);
    expect(missingRuntimeTotalSummary.score).toBe(100);
    expect(missingRuntimeTotalSummary.clinicalConclusion).toBe(
      'The patient deteriorated despite 1 recorded interventions. 1 intervention(s) were appropriate.',
    );
  });

  it('keeps duplicate or cooldown rejections out of the denominator', () => {
    const summary = deriveDebriefSummary({
      actions: [
        { isCorrect: true },
        { isCorrect: false, isDuplicate: true },
      ],
      outcome: 'manual',
      scenario: {
        meta: { completionPolicy: 'strict_sequence_required' },
        expected_sequence: ['step_one', 'step_two'],
      },
      completedRequiredSteps: 1,
      requiredStepCount: 2,
    });

    expect(summary.sequenceErrors).toBe(0);
    expect(summary.omissionCount).toBe(1);
    expect(summary.score).toBe(50);
  });

  it('counts remaining primary-route steps as omissions for strict adult_vfib_arrest_witnessed runs', () => {
    const adultVfib = getSeedScenario('adult_vfib_arrest_witnessed');

    const summary = deriveDebriefSummary({
      actions: [
        { isCorrect: true },
        { isCorrect: true },
      ],
      outcome: 'failed',
      scenario: adultVfib,
      completedRequiredSteps: 2,
      requiredStepCount: 5,
    });

    expect(summary.remainingRequiredSteps).toBe(3);
    expect(summary.omissionCount).toBe(3);
    expect(summary.strictSequenceIncomplete).toBe(true);
    expect(summary.score).toBe(40);
    expect(summary.clinicalConclusion).toContain(
      'The patient deteriorated before the full required sequence was completed',
    );
  });

  it('counts remaining primary-route steps as omissions for strict pediatric_pulseless_vfib runs', () => {
    const pediatricVfib = getSeedScenario('pediatric_pulseless_vfib');

    const summary = deriveDebriefSummary({
      actions: [
        { isCorrect: true },
        { isCorrect: true },
      ],
      outcome: 'failed',
      scenario: pediatricVfib,
      completedRequiredSteps: 2,
      requiredStepCount: 5,
    });

    expect(pediatricVfib.meta?.completionPolicy).toBe('strict_sequence_required');
    expect(summary.remainingRequiredSteps).toBe(3);
    expect(summary.omissionCount).toBe(3);
    expect(summary.strictSequenceIncomplete).toBe(true);
    expect(summary.score).toBe(40);
    expect(summary.clinicalConclusion).toContain(
      'The patient deteriorated before the full required sequence was completed',
    );
  });

  it('keeps legacy outcome-driven scoring for pediatric_respiratory_arrest_asthma primary-route migration', () => {
    const pediatricAsthma = getSeedScenario('pediatric_respiratory_arrest_asthma');

    const summary = deriveDebriefSummary({
      actions: [
        { isCorrect: true },
        { isCorrect: true },
      ],
      outcome: 'failed',
      scenario: pediatricAsthma,
      completedRequiredSteps: 2,
      requiredStepCount: 8,
    });

    expect(pediatricAsthma.meta?.completionPolicy ?? 'legacy_outcome_driven').toBe('legacy_outcome_driven');
    expect(summary.remainingRequiredSteps).toBe(0);
    expect(summary.omissionCount).toBe(0);
    expect(summary.strictSequenceIncomplete).toBe(false);
    expect(summary.score).toBe(100);
    expect(summary.clinicalConclusion).toBe(
      'The patient deteriorated despite 2 recorded interventions. 2 intervention(s) were appropriate.',
    );
  });

  it('counts remaining primary-route steps as omissions for strict Batch 2 and Batch 3 BLS runs', () => {
    const scenarios = [
      {
        scenarioId: 'bls_adult_cardiac_arrest_bystander',
        completedRequiredSteps: 2,
        requiredStepCount: 7,
        expectedRemainingRequiredSteps: 5,
        expectedScore: 29,
      },
      {
        scenarioId: 'bls_adult_two_rescuer_cpr',
        completedRequiredSteps: 4,
        requiredStepCount: 9,
        expectedRemainingRequiredSteps: 5,
        expectedScore: 44,
      },
      {
        scenarioId: 'bls_adult_aed_public_access',
        completedRequiredSteps: 3,
        requiredStepCount: 8,
        expectedRemainingRequiredSteps: 5,
        expectedScore: 38,
      },
      {
        scenarioId: 'bls_child_cardiac_arrest',
        completedRequiredSteps: 2,
        requiredStepCount: 7,
        expectedRemainingRequiredSteps: 5,
        expectedScore: 29,
      },
      {
        scenarioId: 'bls_child_two_rescuer_cpr',
        completedRequiredSteps: 3,
        requiredStepCount: 8,
        expectedRemainingRequiredSteps: 5,
        expectedScore: 38,
      },
    ] as const;

    for (const {
      scenarioId,
      completedRequiredSteps,
      requiredStepCount,
      expectedRemainingRequiredSteps,
      expectedScore,
    } of scenarios) {
      const scenario = getSeedScenario(scenarioId);
      const summary = deriveDebriefSummary({
        actions: Array.from({ length: completedRequiredSteps }, () => ({ isCorrect: true })),
        outcome: 'failed',
        scenario,
        completedRequiredSteps,
        requiredStepCount,
      });

      expect(scenario.meta?.completionPolicy).toBe('strict_sequence_required');
      expect(summary.remainingRequiredSteps).toBe(expectedRemainingRequiredSteps);
      expect(summary.omissionCount).toBe(expectedRemainingRequiredSteps);
      expect(summary.strictSequenceIncomplete).toBe(true);
      expect(summary.score).toBe(expectedScore);
      expect(summary.clinicalConclusion).toContain(
        'The patient deteriorated before the full required sequence was completed',
      );
    }
  });

  it('keeps adult_asystole_unwitnessed on legacy scoring despite primary-route required-step totals', () => {
    const adultAsystole = getSeedScenario('adult_asystole_unwitnessed');

    const summary = deriveDebriefSummary({
      actions: [
        { isCorrect: true },
        { isCorrect: true },
      ],
      outcome: 'failed',
      scenario: adultAsystole,
      completedRequiredSteps: 2,
      requiredStepCount: 3,
    });

    expect(adultAsystole.meta?.completionPolicy ?? 'legacy_outcome_driven').toBe('legacy_outcome_driven');
    expect(summary.remainingRequiredSteps).toBe(0);
    expect(summary.omissionCount).toBe(0);
    expect(summary.strictSequenceIncomplete).toBe(false);
    expect(summary.score).toBe(100);
    expect(summary.clinicalConclusion).toBe(
      'The patient deteriorated despite 2 recorded interventions. 2 intervention(s) were appropriate.',
    );
  });

  it('keeps adult_respiratory_arrest_opioid on legacy scoring despite primary-route required-step totals', () => {
    const adultRespiratoryArrestOpioid = getSeedScenario('adult_respiratory_arrest_opioid');

    const summary = deriveDebriefSummary({
      actions: Array.from({ length: 5 }, () => ({ isCorrect: true })),
      outcome: 'failed',
      scenario: adultRespiratoryArrestOpioid,
      completedRequiredSteps: 5,
      requiredStepCount: 6,
    });

    expect(adultRespiratoryArrestOpioid.meta?.completionPolicy ?? 'legacy_outcome_driven').toBe('legacy_outcome_driven');
    expect(summary.remainingRequiredSteps).toBe(0);
    expect(summary.omissionCount).toBe(0);
    expect(summary.strictSequenceIncomplete).toBe(false);
    expect(summary.score).toBe(100);
    expect(summary.clinicalConclusion).toBe(
      'The patient deteriorated despite 5 recorded interventions. 5 intervention(s) were appropriate.',
    );
  });

  it('keeps adult_stroke_cva on legacy scoring despite primary-route required-step totals', () => {
    const adultStroke = getSeedScenario('adult_stroke_cva');

    const summary = deriveDebriefSummary({
      actions: Array.from({ length: 4 }, () => ({ isCorrect: true })),
      outcome: 'failed',
      scenario: adultStroke,
      completedRequiredSteps: 4,
      requiredStepCount: 5,
    });

    expect(adultStroke.meta?.completionPolicy ?? 'legacy_outcome_driven').toBe('legacy_outcome_driven');
    expect(summary.remainingRequiredSteps).toBe(0);
    expect(summary.omissionCount).toBe(0);
    expect(summary.strictSequenceIncomplete).toBe(false);
    expect(summary.score).toBe(100);
    expect(summary.clinicalConclusion).toBe(
      'The patient deteriorated despite 4 recorded interventions. 4 intervention(s) were appropriate.',
    );
  });

  it('keeps acs_stemi on legacy scoring despite primary-route required-step totals', () => {
    const acsStemi = getSeedScenario('acs_stemi');

    const summary = deriveDebriefSummary({
      actions: Array.from({ length: 5 }, () => ({ isCorrect: true })),
      outcome: 'failed',
      scenario: acsStemi,
      completedRequiredSteps: 5,
      requiredStepCount: 6,
    });

    expect(acsStemi.meta?.completionPolicy ?? 'legacy_outcome_driven').toBe('legacy_outcome_driven');
    expect(summary.remainingRequiredSteps).toBe(0);
    expect(summary.omissionCount).toBe(0);
    expect(summary.strictSequenceIncomplete).toBe(false);
    expect(summary.score).toBe(100);
    expect(summary.clinicalConclusion).toBe(
      'The patient deteriorated despite 5 recorded interventions. 5 intervention(s) were appropriate.',
    );
  });

  it('keeps bls_adult_choking_unresponsive on legacy scoring despite primary-route required-step totals', () => {
    const adultChokingUnresponsive = getSeedScenario('bls_adult_choking_unresponsive');

    const summary = deriveDebriefSummary({
      actions: Array.from({ length: 4 }, () => ({ isCorrect: true })),
      outcome: 'failed',
      scenario: adultChokingUnresponsive,
      completedRequiredSteps: 4,
      requiredStepCount: 5,
    });

    expect(adultChokingUnresponsive.meta?.completionPolicy ?? 'legacy_outcome_driven').toBe('legacy_outcome_driven');
    expect(summary.remainingRequiredSteps).toBe(0);
    expect(summary.omissionCount).toBe(0);
    expect(summary.strictSequenceIncomplete).toBe(false);
    expect(summary.score).toBe(100);
    expect(summary.clinicalConclusion).toBe(
      'The patient deteriorated despite 4 recorded interventions. 4 intervention(s) were appropriate.',
    );
  });

  it('keeps bls_drowning_submersion on legacy scoring despite primary-route required-step totals', () => {
    const drowningSubmersion = getSeedScenario('bls_drowning_submersion');

    const summary = deriveDebriefSummary({
      actions: Array.from({ length: 8 }, () => ({ isCorrect: true })),
      outcome: 'failed',
      scenario: drowningSubmersion,
      completedRequiredSteps: 8,
      requiredStepCount: 9,
    });

    expect(drowningSubmersion.meta?.completionPolicy ?? 'legacy_outcome_driven').toBe('legacy_outcome_driven');
    expect(summary.remainingRequiredSteps).toBe(0);
    expect(summary.omissionCount).toBe(0);
    expect(summary.strictSequenceIncomplete).toBe(false);
    expect(summary.score).toBe(100);
    expect(summary.clinicalConclusion).toBe(
      'The patient deteriorated despite 8 recorded interventions. 8 intervention(s) were appropriate.',
    );
  });

  it('keeps Batch 4 infant BLS scenarios on legacy scoring despite primary-route required-step totals', () => {
    const scenarios = [
      {
        scenarioId: 'bls_infant_cardiac_arrest',
        completedRequiredSteps: 5,
        requiredStepCount: 6,
      },
      {
        scenarioId: 'bls_infant_two_rescuer_cpr',
        completedRequiredSteps: 5,
        requiredStepCount: 6,
      },
    ] as const;

    for (const { scenarioId, completedRequiredSteps, requiredStepCount } of scenarios) {
      const scenario = getSeedScenario(scenarioId);
      const summary = deriveDebriefSummary({
        actions: Array.from({ length: completedRequiredSteps }, () => ({ isCorrect: true })),
        outcome: 'failed',
        scenario,
        completedRequiredSteps,
        requiredStepCount,
      });

      expect(scenario.meta?.completionPolicy ?? 'legacy_outcome_driven').toBe('legacy_outcome_driven');
      expect(summary.remainingRequiredSteps).toBe(0);
      expect(summary.omissionCount).toBe(0);
      expect(summary.strictSequenceIncomplete).toBe(false);
      expect(summary.score).toBe(100);
      expect(summary.clinicalConclusion).toBe(
        `The patient deteriorated despite ${completedRequiredSteps} recorded interventions. ${completedRequiredSteps} intervention(s) were appropriate.`,
      );
    }
  });

  it('keeps the unchosen optional intubation branch scoring-neutral for adult_pea_hypoxia', () => {
    const adultPeaHypoxia = getSeedScenario('adult_pea_hypoxia');

    const summary = deriveDebriefSummary({
      actions: [
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: true },
      ],
      outcome: 'failed',
      scenario: adultPeaHypoxia,
      completedRequiredSteps: 4,
      requiredStepCount: 4,
    });

    expect(adultPeaHypoxia.expected_sequence).toEqual([
      'cpr',
      'rescue_breathing',
      'intubation',
      'establish_iv',
      'epinephrine_1mg',
    ]);
    expect(summary.remainingRequiredSteps).toBe(0);
    expect(summary.omissionCount).toBe(0);
    expect(summary.strictSequenceIncomplete).toBe(false);
    expect(summary.score).toBe(100);
    expect(summary.clinicalConclusion).toBe(
      'The patient deteriorated despite 4 recorded interventions. 4 intervention(s) were appropriate.',
    );
  });

  it('keeps the unchosen optional intubation branch scoring-neutral for anaphylactic_shock', () => {
    const anaphylacticShock = getSeedScenario('anaphylactic_shock');

    const summary = deriveDebriefSummary({
      actions: [
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: true },
      ],
      outcome: 'failed',
      scenario: anaphylacticShock,
      completedRequiredSteps: 4,
      requiredStepCount: 4,
    });

    expect(anaphylacticShock.expected_sequence).toEqual([
      'epinephrine_im_0_5mg',
      'oxygen_nrb',
      'establish_iv',
      'iv_fluid_bolus_anaphylaxis',
      'intubation',
    ]);
    expect(summary.remainingRequiredSteps).toBe(0);
    expect(summary.omissionCount).toBe(0);
    expect(summary.strictSequenceIncomplete).toBe(false);
    expect(summary.score).toBe(100);
    expect(summary.clinicalConclusion).toBe(
      'The patient deteriorated despite 4 recorded interventions. 4 intervention(s) were appropriate.',
    );
  });

  it('keeps the unchosen optional epinephrine branch scoring-neutral for adult_pea_hypovolemia', () => {
    const adultPeaHypovolemia = getSeedScenario('adult_pea_hypovolemia');

    const summary = deriveDebriefSummary({
      actions: [
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: true },
      ],
      outcome: 'failed',
      scenario: adultPeaHypovolemia,
      completedRequiredSteps: 3,
      requiredStepCount: 3,
    });

    expect(adultPeaHypovolemia.expected_sequence).toEqual([
      'cpr',
      'establish_iv',
      'normal_saline_bolus',
      'epinephrine_1mg',
    ]);
    expect(summary.remainingRequiredSteps).toBe(0);
    expect(summary.omissionCount).toBe(0);
    expect(summary.strictSequenceIncomplete).toBe(false);
    expect(summary.score).toBe(100);
    expect(summary.clinicalConclusion).toBe(
      'The patient deteriorated despite 3 recorded interventions. 3 intervention(s) were appropriate.',
    );
  });
});
