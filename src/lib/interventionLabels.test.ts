import { describe, expect, it } from 'vitest';

import {
  getInterventionBadgeLabel,
  getInterventionDisplayLabel,
  getInterventionShortLabel,
  humanizeInterventionId,
} from './interventionLabels';

describe('interventionLabels', () => {
  it('returns authoritative full display labels for mapped interventions', () => {
    expect(getInterventionDisplayLabel('defibrillate')).toBe('Defibrillate (AED/Manual)');
    expect(getInterventionDisplayLabel('left_uterine_displacement')).toBe('Left Uterine Displacement (LUD)');
  });

  it('humanizes unmapped intervention ids for shared display fallbacks', () => {
    expect(humanizeInterventionId('epinephrine')).toBe('Epinephrine');
    expect(getInterventionDisplayLabel('generic_airway_support')).toBe('Generic Airway Support');
  });

  it('returns compact shared short labels for urgency surfaces', () => {
    expect(getInterventionShortLabel('oxygen_nrb')).toBe('O₂');
    expect(getInterventionShortLabel('unknown_intervention')).toBe('UNKNOW');
  });

  it('returns badge labels without relying on render-time string assembly', () => {
    expect(getInterventionBadgeLabel('cpr')).toBe('CPR');
    expect(getInterventionBadgeLabel('epinephrine')).toBe('EPINEPHRINE');
  });
});
