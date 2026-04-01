import { describe, expect, it } from 'vitest';
import { deriveDebriefSummary } from './debriefScoring';

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
});
