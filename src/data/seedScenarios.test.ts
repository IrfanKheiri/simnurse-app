import { describe, it, expect } from 'vitest';
import { seedScenarios } from './seedScenarios';
import { INTERVENTION_SHORT_LABELS } from '../App';
import { CHEAT_LABELS } from '../components/CheatOverlay';

const allInterventionIds = [
  ...new Set(seedScenarios.flatMap(s => Object.keys(s.interventions))),
].sort();

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
