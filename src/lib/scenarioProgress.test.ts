import { describe, expect, it } from 'vitest';
import { calculateScenarioProgress } from './scenarioProgress';
import type { Scenario } from '../types/scenario';

const progressScenario: Scenario = {
  scenario_id: 'scenario_progress',
  title: 'Scenario progress test',
  initial_state: {
    hr: 120,
    bp: '160/90',
    spo2: 88,
    rr: 24,
    rhythm: 'SVT',
    pulsePresent: true,
    glucose: 100,
  },
  baseline_progressions: [],
  interventions: {},
  expected_sequence: ['step_one', 'step_two'],
  success_conditions: [
    { vital: 'rhythm', equals: 'Sinus' },
    { vital: 'spo2', min: 96 },
    { elapsedSecGte: 120 },
    { vital: 'bp', max: 120, durationSec: 30 },
  ],
  failure_conditions: [],
};

describe('calculateScenarioProgress', () => {
  it('starts at zero when neither protocol nor outcome objectives are met', () => {
    const progress = calculateScenarioProgress(
      progressScenario,
      progressScenario.initial_state,
      0,
      0,
      {},
    );

    expect(progress.protocolScore).toBe(0);
    expect(progress.outcomeScore).toBe(0);
    expect(progress.totalScore).toBe(0);
  });

  it('advances protocol progress only when sequenceIndex advances', () => {
    const progress = calculateScenarioProgress(
      progressScenario,
      progressScenario.initial_state,
      0,
      1,
      {},
    );

    expect(progress.protocolScore).toBe(50);
    expect(progress.totalScore).toBe(25);
  });

  it('scores equality, numeric thresholds, elapsed time, and held durations together', () => {
    const state = {
      ...progressScenario.initial_state,
      rhythm: 'Sinus' as const,
      spo2: 92,
      bp: '118/80',
    };

    const progress = calculateScenarioProgress(
      progressScenario,
      state,
      60,
      1,
      { 'success-3': 45 },
    );

    expect(progress.protocolScore).toBe(50);
    expect(progress.outcomeScore).toBe(63);
    expect(progress.totalScore).toBe(56);
  });

  it('starts outcome progress above zero when the initial state already satisfies some objectives', () => {
    const scenario: Scenario = {
      ...progressScenario,
      initial_state: {
        ...progressScenario.initial_state,
        rhythm: 'Sinus',
        hr: 90,
      },
      success_conditions: [
        { vital: 'rhythm', equals: 'Sinus' },
        { vital: 'hr', min: 60, max: 100 },
      ],
    };

    const progress = calculateScenarioProgress(
      scenario,
      scenario.initial_state,
      0,
      0,
      {},
    );

    expect(progress.outcomeScore).toBe(100);
    expect(progress.totalScore).toBe(50);
  });

  it('reassigns the full weight to outcome when a scenario has no expected sequence', () => {
    const scenario: Scenario = {
      ...progressScenario,
      expected_sequence: undefined,
      success_conditions: [{ elapsedSecGte: 120 }],
    };

    const progress = calculateScenarioProgress(
      scenario,
      scenario.initial_state,
      60,
      0,
      {},
    );

    expect(progress.protocolScore).toBe(0);
    expect(progress.outcomeScore).toBe(50);
    expect(progress.totalScore).toBe(50);
  });
});
