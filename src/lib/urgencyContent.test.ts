import { describe, expect, it } from 'vitest';

import { computeUrgencyItems, formatUrgencyItemAriaLabel, formatUrgencyItemTitle } from './urgencyContent';
import type { Scenario } from '../types/scenario';

const scenario: Scenario = {
  scenario_id: 'urgency-test',
  title: 'Urgency Test',
  initial_state: {
    hr: 90,
    bp: '120/80',
    spo2: 98,
    rr: 16,
    pulsePresent: true,
    rhythm: 'Sinus',
  },
  baseline_progressions: [],
  interventions: {
    cpr: { duration_sec: 30 },
  },
  success_conditions: [],
  failure_conditions: [{ elapsedSecGte: 200 }],
};

describe('urgencyContent', () => {
  it('computes shared urgency items with centralized labels and ordering', () => {
    const items = computeUrgencyItems(
      scenario,
      {},
      180,
      [{ id: 'cpr', start_time: 170, duration_sec: 30 }],
    );

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ type: 'failure', label: '⏱ ~20s left', urgency: 'medium' });
    expect(items[1]).toMatchObject({ type: 'intervention', label: 'CPR', urgency: 'medium' });
  });

  it('formats accessibility and title copy from shared urgency wording helpers', () => {
    const [item] = computeUrgencyItems(scenario, {}, 180, []);

    expect(formatUrgencyItemAriaLabel(item)).toBe('Alert: ⏱ ~20s left — 20 seconds remaining');
    expect(formatUrgencyItemTitle(item)).toBe('Failure risk: ⏱ ~20s left — 20s remaining');
  });
});
