import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import CheatOverlay from './CheatOverlay';
import type { Scenario } from '../types/scenario';
import { seedScenarios } from '../data/seedScenarios';

function getSeedScenario(scenarioId: string): Scenario {
  const scenario = seedScenarios.find((item) => item.scenario_id === scenarioId);
  expect(scenario, `Missing seeded scenario: ${scenarioId}`).toBeDefined();
  return scenario!;
}

const legacyScenario: Scenario = {
  scenario_id: 'legacy_cheat_overlay',
  title: 'Legacy Cheat Overlay',
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
    cpr: {},
    rescue_breathing: {},
  },
  expected_sequence: ['cpr', 'rescue_breathing'],
  success_conditions: [],
  failure_conditions: [],
};

describe('CheatOverlay', () => {
  it('renders legacy flat-sequence guidance from expected_sequence', () => {
    render(
      <CheatOverlay
        scenario={legacyScenario}
        sequenceIndex={0}
        requiredStepCount={2}
        availableInterventionIds={[]}
        stateAwareAvailableInterventionIds={[]}
        activeRouteId={null}
        routeStates={[]}
        acceptedInterventionIds={[]}
        onClose={vi.fn()}
      />,
    );

    const teachingCard = screen.getByText('Step 1 of 2 — Do this now').closest('div');

    expect(teachingCard?.textContent).toContain('CPR (High-Quality)');
    expect(screen.getByText('Full sequence')).toBeTruthy();
  });

  it('shows route-aware valid next actions and explicit optional-branch context', () => {
    const scenario = getSeedScenario('adult_pea_hypoxia');

    render(
      <CheatOverlay
        scenario={scenario}
        sequenceIndex={2}
        requiredStepCount={4}
        availableInterventionIds={['establish_iv', 'intubation']}
        stateAwareAvailableInterventionIds={['establish_iv', 'intubation']}
        activeRouteId="primary"
        routeStates={[
          {
            routeId: 'primary',
            kind: 'primary',
            isActivated: true,
            isCompleted: false,
            isRequired: true,
            nextInterventionId: 'establish_iv',
          },
          {
            routeId: 'advanced_airway_optional_branch',
            kind: 'branch',
            isActivated: true,
            isCompleted: false,
            isRequired: false,
            nextInterventionId: 'intubation',
          },
        ]}
        acceptedInterventionIds={['cpr', 'rescue_breathing']}
        onClose={vi.fn()}
      />,
    );

    const validNextActions = within(screen.getByRole('list', { name: 'Currently valid next actions' }));

    expect(screen.getByText('Currently valid next actions')).toBeTruthy();
    expect(screen.getByText('Optional branch active')).toBeTruthy();
    expect(validNextActions.getByText('Establish IV/IO Access')).toBeTruthy();
    expect(validNextActions.getByText('Advanced Airway (Intubation)')).toBeTruthy();
    expect(screen.getAllByText('Advanced Airway Optional Branch')).toHaveLength(2);
    expect(screen.getByText('Step 3 of 5 — Teaching spine')).toBeTruthy();
  });

  it('advances the teaching spine with accepted optional-branch actions instead of relying on required-step progress alone', () => {
    const scenario = getSeedScenario('adult_pea_hypoxia');

    render(
      <CheatOverlay
        scenario={scenario}
        sequenceIndex={2}
        requiredStepCount={4}
        availableInterventionIds={['establish_iv']}
        stateAwareAvailableInterventionIds={['establish_iv']}
        activeRouteId="primary"
        routeStates={[
          {
            routeId: 'primary',
            kind: 'primary',
            isActivated: true,
            isCompleted: false,
            isRequired: true,
            nextInterventionId: 'establish_iv',
          },
          {
            routeId: 'advanced_airway_optional_branch',
            kind: 'branch',
            isActivated: true,
            isCompleted: true,
            isRequired: false,
            nextInterventionId: null,
          },
        ]}
        acceptedInterventionIds={['cpr', 'rescue_breathing', 'intubation']}
        onClose={vi.fn()}
      />,
    );

    const currentTeachingCard = screen.getByText('Step 4 of 5 — Teaching spine').closest('div');
    expect(currentTeachingCard?.textContent).toContain('Establish IV/IO Access');
    expect(screen.getByText('Advanced Airway (Intubation)')).toBeTruthy();
  });

  it('shows required protocol completion state separately from the teaching spine', () => {
    const scenario = getSeedScenario('adult_pea_hypoxia');

    render(
      <CheatOverlay
        scenario={scenario}
        sequenceIndex={4}
        requiredStepCount={4}
        availableInterventionIds={[]}
        stateAwareAvailableInterventionIds={[]}
        activeRouteId={null}
        routeStates={[
          {
            routeId: 'primary',
            kind: 'primary',
            isActivated: true,
            isCompleted: true,
            isRequired: true,
            nextInterventionId: null,
          },
          {
            routeId: 'advanced_airway_optional_branch',
            kind: 'branch',
            isActivated: true,
            isCompleted: true,
            isRequired: false,
            nextInterventionId: null,
          },
        ]}
        acceptedInterventionIds={['cpr', 'rescue_breathing', 'intubation', 'establish_iv', 'epinephrine_1mg']}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('✓ Required protocol complete — awaiting success conditions')).toBeTruthy();
    const teachingSpinePanel = screen.getByText('Teaching spine').closest('div');
    expect(within(teachingSpinePanel!).getByText('✓ Teaching spine complete')).toBeTruthy();
  });
});
