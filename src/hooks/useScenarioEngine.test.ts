import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useScenarioEngine } from './useScenarioEngine';
import type { EngineEvent, Scenario } from '../types/scenario';
import { seedScenarios } from '../data/seedScenarios';

const mockScenario: Scenario = {
  scenario_id: 'test_engine',
  title: 'Test engine math',
  initial_state: {
    hr: 80,
    bp: '120/80',
    spo2: 98,
    rr: 16,
    rhythm: 'Sinus',
    pulsePresent: true,
    glucose: 100,
  },
  baseline_progressions: [
    { vital: 'hr', modifier: 5, interval_sec: 10 },
    { vital: 'bp', modifier: -2, interval_sec: 10 },
  ],
  interventions: {
    cpr: {
      duration_sec: 10,
      state_overrides: { bp: '80/30' },
    },
    instant_success: {
      duration_sec: 5,
      success_chance: 1,
      success_state: { hr: 60, bp: '110/70', rhythm: 'Sinus', pulsePresent: true },
    },
  },
  success_conditions: [{ vital: 'hr', equals: 60, durationSec: 5 }],
  failure_conditions: [{ vital: 'rhythm', equals: 'Asystole', durationSec: 1 }],
};

const scheduledFailureScenario: Scenario = {
  scenario_id: 'scheduled_failure',
  title: 'Scheduled rhythm change',
  initial_state: {
    hr: 90,
    bp: '118/76',
    spo2: 96,
    rr: 16,
    rhythm: 'Sinus',
    pulsePresent: true,
  },
  baseline_progressions: [],
  scheduledStateChanges: [
    {
      id: 'collapse',
      atSec: 6,
      changes: { rhythm: 'VFib', pulsePresent: false, hr: 0, bp: '0/0', spo2: 82, rr: 0 },
      message: 'The patient deteriorated into ventricular fibrillation.',
    },
  ],
  interventions: {},
  success_conditions: [{ vital: 'pulsePresent', equals: true, durationSec: 30 }],
  failure_conditions: [{ vital: 'pulsePresent', equals: false, durationSec: 1 }],
};

const sequencedSuccessScenarioBase: Scenario = {
  scenario_id: 'sequenced_success',
  title: 'Sequenced success timing',
  initial_state: {
    hr: 80,
    bp: '120/80',
    spo2: 98,
    rr: 16,
    rhythm: 'Sinus',
    pulsePresent: false,
  },
  baseline_progressions: [],
  expected_sequence: ['step_one', 'step_two'],
  interventions: {
    step_one: {
      duration_sec: 10,
      success_chance: 1,
      success_state: { hr: 72, bp: '118/76', spo2: 98, rr: 14, rhythm: 'Sinus', pulsePresent: true },
    },
    step_two: {
      duration_sec: 10,
      success_chance: 1,
      success_state: {},
    },
  },
  success_conditions: [{ vital: 'pulsePresent', equals: true, durationSec: 6 }],
  failure_conditions: [],
};

const strictSequencedSuccessScenario: Scenario = {
  ...sequencedSuccessScenarioBase,
  scenario_id: 'strict_sequenced_success',
  meta: {
    difficulty: 'Beginner',
    domain: 'Cardiac',
    estimatedDurationSec: 120,
    protocol: 'BLS',
    completionPolicy: 'strict_sequence_required',
  },
};

const routeAwareScenario: Scenario = {
  scenario_id: 'route_protocol_test',
  title: 'Route protocol infrastructure',
  meta: {
    difficulty: 'Intermediate',
    domain: 'Emergency',
    estimatedDurationSec: 120,
    protocol: 'BLS',
    completionPolicy: 'strict_sequence_required',
  },
  initial_state: {
    hr: 88,
    bp: '118/76',
    spo2: 94,
    rr: 18,
    rhythm: 'Sinus',
    pulsePresent: true,
  },
  baseline_progressions: [],
  interventions: {
    assess: {},
    primary_treat: {},
    branch_treat: {},
    rescue_breathing: {},
    distractor: {},
  },
  protocol: {
    primary: {
      steps: ['assess', 'primary_treat'],
    },
    branches: [
      {
        route_id: 'required_branch',
        activation: { after_intervention: 'assess' },
        steps: ['branch_treat'],
      },
    ],
    rescues: [
      {
        route_id: 'rescue_airway',
        activation: { after_intervention: 'assess' },
        steps: ['rescue_breathing'],
      },
    ],
  },
  success_conditions: [{ elapsedSecGte: 6 }],
  failure_conditions: [],
};

const implicitSecondaryRouteScenario: Scenario = {
  scenario_id: 'implicit_secondary_route',
  title: 'Secondary route requires explicit activation',
  initial_state: {
    hr: 92,
    bp: '118/76',
    spo2: 96,
    rr: 18,
    rhythm: 'Sinus',
    pulsePresent: true,
  },
  baseline_progressions: [],
  interventions: {
    assess: {},
    primary_treat: {},
    branch_treat: {},
  },
  protocol: {
    primary: {
      steps: ['assess', 'primary_treat'],
    },
    branches: [
      {
        route_id: 'inactive_branch_without_activation',
        required: false,
        steps: ['branch_treat'],
      },
    ],
  },
  success_conditions: [{ elapsedSecGte: 6 }],
  failure_conditions: [],
};

const dualTriggerActivationScenario: Scenario = {
  scenario_id: 'dual_trigger_activation_route',
  title: 'Secondary route accepts either supported activation trigger',
  initial_state: {
    hr: 92,
    bp: '118/76',
    spo2: 96,
    rr: 18,
    rhythm: 'Sinus',
    pulsePresent: true,
  },
  baseline_progressions: [],
  scheduledStateChanges: [
    {
      id: 'late_branch_unlock',
      atSec: 300,
      changes: {},
      message: 'The delayed branch unlock window has opened.',
    },
  ],
  interventions: {
    assess: {},
    primary_treat: {},
    branch_treat: {},
  },
  protocol: {
    primary: {
      steps: ['assess', 'primary_treat'],
    },
    branches: [
      {
        route_id: 'dual_trigger_branch',
        activation: {
          after_intervention: 'assess',
          after_state_change: 'late_branch_unlock',
        },
        required: false,
        steps: ['branch_treat'],
      },
    ],
  },
  success_conditions: [{ elapsedSecGte: 6 }],
  failure_conditions: [],
};

const stateAwareGuidanceScenario: Scenario = {
  scenario_id: 'state_aware_guidance',
  title: 'State-aware next action guidance',
  initial_state: {
    hr: 185,
    bp: '110/72',
    spo2: 94,
    rr: 22,
    rhythm: 'SVT',
    pulsePresent: true,
  },
  baseline_progressions: [],
  expected_sequence: ['adenosine_6mg', 'synchronized_cardioversion'],
  interventions: {
    adenosine_6mg: {
      duration_sec: 120,
      success_chance: 0.85,
      success_state: { hr: 85, bp: '125/80', rhythm: 'Sinus', pulsePresent: true },
    },
    synchronized_cardioversion: {
      duration_sec: 10,
      requires_rhythm: ['SVT', 'VTach'],
      success_chance: 1,
      success_state: { hr: 80, bp: '130/80', rhythm: 'Sinus', pulsePresent: true },
    },
  },
  success_conditions: [{ vital: 'rhythm', equals: 'Sinus', durationSec: 15 }],
  failure_conditions: [{ elapsedSecGte: 600 }],
};

const rejectionPrecedenceScenario: Scenario = {
  scenario_id: 'rejection_precedence',
  title: 'Rejection precedence overlap coverage',
  initial_state: {
    hr: 88,
    bp: '118/76',
    spo2: 97,
    rr: 18,
    rhythm: 'Sinus',
    pulsePresent: true,
  },
  baseline_progressions: [],
  expected_sequence: ['protocol_step'],
  interventions: {
    protocol_step: {},
    wrong_rhythm_step: {
      requires_rhythm: ['VFib'],
    },
  },
  success_conditions: [{ elapsedSecGte: 30 }],
  failure_conditions: [],
};

function getSeedScenario(scenarioId: string): Scenario {
  const scenario = seedScenarios.find((item) => item.scenario_id === scenarioId);
  expect(scenario, `Missing seeded scenario: ${scenarioId}`).toBeDefined();
  return scenario!;
}

describe('useScenarioEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('initializes with the correct state', () => {
    const { result } = renderHook(() => useScenarioEngine(mockScenario));

    expect(result.current.state).not.toBeNull();
    expect(result.current.state?.hr).toBe(80);
    expect(result.current.state?.bp).toBe('120/80');
    expect(result.current.status).toBe('running');
    expect(result.current.sequenceIndex).toBe(0);
    expect(result.current.requiredStepCount).toBe(0);
    expect(result.current.successHoldStarts).toEqual({});
  });

  it('normalizes legacy expected_sequence scenarios into a primary route without changing behavior', () => {
    const scenario: Scenario = {
      ...mockScenario,
      expected_sequence: ['cpr', 'instant_success'],
      interventions: {
        ...mockScenario.interventions,
        distractor: {},
      },
    };
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    expect(result.current.requiredStepCount).toBe(2);
    expect(result.current.completedRequiredSteps).toBe(0);
    expect(result.current.sequenceIndex).toBe(0);
    expect(result.current.activeRouteId).toBe('primary');
    expect(result.current.activatedRouteIds).toEqual(['primary']);
    expect(result.current.availableInterventionIds).toEqual(['cpr']);

    act(() => {
      result.current.applyIntervention('distractor');
    });

    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'distractor',
        rejected: true,
        rejection_category: 'sequence_deviation',
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol. The next expected step is: Cpr.',
      }),
    );

    act(() => {
      result.current.applyIntervention('cpr');
    });

    expect(result.current.sequenceIndex).toBe(1);
    expect(result.current.completedRequiredSteps).toBe(1);
    expect(result.current.availableInterventionIds).toEqual(['instant_success']);
  });

  it('applies baseline progressions using real elapsed time', () => {
    const { result } = renderHook(() => useScenarioEngine(mockScenario));

    act(() => {
      vi.advanceTimersByTime(12_000);
    });

    expect(result.current.state?.hr).toBe(85);
    expect(result.current.state?.bp).toBe('118/79');
  });

  it('applies overrides and removes them once the intervention expires', () => {
    const { result } = renderHook(() => useScenarioEngine(mockScenario));

    act(() => {
      result.current.applyIntervention('cpr');
    });

    act(() => {
      vi.advanceTimersByTime(3_000);
    });

    expect(result.current.state?.bp).toBe('80/30');

    act(() => {
      vi.advanceTimersByTime(9_000);
    });

    expect(result.current.state?.bp).toBe('118/79');
  });

  it('triggers success after the configured hold duration', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(mockScenario, onEvent));

    act(() => {
      result.current.applyIntervention('instant_success');
    });

    act(() => {
      vi.advanceTimersByTime(6_000);
    });

    expect(result.current.state?.hr).toBe(60);
    expect(result.current.status).toBe('success');
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'completion', outcome: 'success' }),
    );
  });

  it('keeps legacy completion timing when completionPolicy is absent', () => {
    const { result } = renderHook(() => useScenarioEngine(sequencedSuccessScenarioBase));

    act(() => {
      result.current.applyIntervention('step_one');
    });

    act(() => {
      vi.advanceTimersByTime(6_000);
    });

    expect(result.current.sequenceIndex).toBe(1);
    expect(result.current.status).toBe('success');
  });

  it('prevents pre-sequence success-hold accumulation under the strict completion policy', () => {
    const { result } = renderHook(() => useScenarioEngine(strictSequencedSuccessScenario));

    act(() => {
      result.current.applyIntervention('step_one');
    });

    act(() => {
      vi.advanceTimersByTime(6_000);
    });

    expect(result.current.sequenceIndex).toBe(1);
    expect(result.current.status).toBe('running');
    expect(result.current.successHoldStarts).toEqual({});
  });

  it('still requires the full hold duration after the final required step under the strict completion policy', () => {
    const { result } = renderHook(() => useScenarioEngine(strictSequencedSuccessScenario));

    act(() => {
      result.current.applyIntervention('step_one');
    });

    act(() => {
      vi.advanceTimersByTime(6_000);
    });

    act(() => {
      result.current.applyIntervention('step_two');
    });

    act(() => {
      vi.advanceTimersByTime(3_000);
    });

    expect(result.current.status).toBe('running');

    act(() => {
      vi.advanceTimersByTime(3_000);
    });

    expect(result.current.sequenceIndex).toBe(2);
    expect(result.current.status).toBe('success');
  });

  it('activates optional rescue routes without changing required-step totals', () => {
    const { result } = renderHook(() => useScenarioEngine(routeAwareScenario));

    expect(result.current.requiredStepCount).toBe(2);
    expect(result.current.availableInterventionIds).toEqual(['assess']);

    act(() => {
      result.current.applyIntervention('assess');
    });

    expect(result.current.sequenceIndex).toBe(1);
    expect(result.current.requiredStepCount).toBe(3);
    expect(result.current.activatedRouteIds).toEqual(['primary', 'required_branch', 'rescue_airway']);
    expect(result.current.availableInterventionIds).toEqual(['primary_treat', 'branch_treat', 'rescue_breathing']);

    act(() => {
      result.current.applyIntervention('rescue_breathing');
    });

    expect(result.current.sequenceIndex).toBe(1);
    expect(result.current.completedRequiredSteps).toBe(1);
    expect(result.current.completedRouteIds).toContain('rescue_airway');
    expect(result.current.availableInterventionIds).toEqual(['primary_treat', 'branch_treat']);
  });

  it('does not implicitly activate a non-primary route when activation is omitted', () => {
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(implicitSecondaryRouteScenario, onEvent));

    expect(result.current.activatedRouteIds).toEqual(['primary']);
    expect(result.current.availableInterventionIds).toEqual(['assess']);

    act(() => {
      result.current.applyIntervention('assess');
    });

    expect(result.current.activatedRouteIds).toEqual(['primary']);
    expect(result.current.availableInterventionIds).toEqual(['primary_treat']);

    act(() => {
      result.current.applyIntervention('branch_treat');
    });

    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'branch_treat',
        rejected: true,
        rejection_category: 'sequence_deviation',
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol. The next expected step is: Primary Treat.',
        attempt_context: expect.objectContaining({
          available_intervention_ids: ['primary_treat'],
          activated_route_ids: ['primary'],
        }),
      }),
    );
  });

  it('activates a non-primary route when either supported trigger list matches', () => {
    const { result } = renderHook(() => useScenarioEngine(dualTriggerActivationScenario));

    expect(result.current.activatedRouteIds).toEqual(['primary']);
    expect(result.current.availableInterventionIds).toEqual(['assess']);

    act(() => {
      result.current.applyIntervention('assess');
    });

    expect(result.current.activatedRouteIds).toEqual(['primary', 'dual_trigger_branch']);
    expect(result.current.availableInterventionIds).toEqual(['primary_treat', 'branch_treat']);
  });

  it('prevents strict completion until an activated required branch is completed', () => {
    const { result } = renderHook(() => useScenarioEngine(routeAwareScenario));

    act(() => {
      result.current.applyIntervention('assess');
    });

    expect(result.current.requiredStepCount).toBe(3);

    act(() => {
      result.current.applyIntervention('primary_treat');
    });

    expect(result.current.sequenceIndex).toBe(2);

    act(() => {
      vi.advanceTimersByTime(6_000);
    });

    expect(result.current.status).toBe('running');

    act(() => {
      result.current.applyIntervention('branch_treat');
    });

    expect(result.current.sequenceIndex).toBe(3);

    act(() => {
      vi.advanceTimersByTime(3_000);
    });

    expect(result.current.status).toBe('success');
  });

  it('reports all valid next steps when multiple routes are available', () => {
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(routeAwareScenario, onEvent));

    act(() => {
      result.current.applyIntervention('assess');
    });

    act(() => {
      result.current.applyIntervention('distractor');
    });

    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'distractor',
        rejected: true,
        rejection_category: 'sequence_deviation',
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol. Valid next steps are: Primary Treat, Branch Treat, or Rescue Breathing.',
      }),
    );
  });

  it('prefers rescue-lock rejection over sequence guidance when a locked rescue action is also out of sequence', () => {
    const scenario = getSeedScenario('pregnant_vfib_arrest');
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    expect(result.current.availableInterventionIds).toEqual(['left_uterine_displacement']);

    act(() => {
      result.current.applyIntervention('perimortem_csection');
    });

    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'perimortem_csection',
        rejected: true,
        rejection_category: 'rescue_locked',
        message: 'Protocol Deviation: Rescue action locked. This action cannot be used until its rescue activation condition is met.',
      }),
    );
  });

  it('keeps PMCD locked before unlock even after the primary route is complete', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    const scenario = getSeedScenario('pregnant_vfib_arrest');
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    act(() => {
      result.current.applyIntervention('left_uterine_displacement');
      result.current.applyIntervention('cpr');
      result.current.applyIntervention('defibrillate');
      result.current.applyIntervention('establish_iv');
      result.current.applyIntervention('epinephrine_1mg');
    });

    expect(result.current.sequenceIndex).toBe(5);
    expect(result.current.availableInterventionIds).toEqual([]);

    act(() => {
      result.current.applyIntervention('perimortem_csection');
    });

    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'perimortem_csection',
        rejected: true,
        rejection_category: 'rescue_locked',
        message: 'Protocol Deviation: Rescue action locked. This action cannot be used until its rescue activation condition is met.',
      }),
    );
  });

  it('activates the PMCD rescue route when pmcd_window_open is applied at 300 seconds', () => {
    const scenario = getSeedScenario('pregnant_vfib_arrest');
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    expect(result.current.activatedRouteIds).toEqual(['primary']);

    act(() => {
      vi.advanceTimersByTime(300_000);
    });

    expect(result.current.activatedRouteIds).toEqual(['primary', 'pmcd_rescue']);
    expect(result.current.availableInterventionIds).toEqual(['left_uterine_displacement', 'perimortem_csection']);
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'state_change',
        message: expect.stringContaining('Five minutes have elapsed without ROSC.'),
      }),
    );
  });

  it('exposes both the current primary step and PMCD as valid next actions after unlock', () => {
    const scenario = getSeedScenario('pregnant_vfib_arrest');
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    act(() => {
      result.current.applyIntervention('left_uterine_displacement');
    });

    act(() => {
      vi.advanceTimersByTime(300_000);
    });

    expect(result.current.availableInterventionIds).toEqual(['cpr', 'perimortem_csection']);

    act(() => {
      result.current.applyIntervention('establish_iv');
    });

    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'establish_iv',
        rejected: true,
        rejection_category: 'sequence_deviation',
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol. Valid next steps are: Cpr or Perimortem Csection.',
      }),
    );
  });

  it('allows PMCD to complete the legacy pilot scenario after unlock without requiring the full primary sequence', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const scenario = getSeedScenario('pregnant_vfib_arrest');
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    act(() => {
      vi.advanceTimersByTime(300_000);
    });

    act(() => {
      result.current.applyIntervention('perimortem_csection');
    });

    expect(result.current.sequenceIndex).toBe(0);
    expect(result.current.state?.pulsePresent).toBe(true);
    expect(result.current.status).toBe('running');

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(result.current.status).toBe('success');
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'completion', outcome: 'success' }),
    );
  });

  it('offers atropine and pacing as peer valid next actions after IV in adult_unstable_bradycardia', () => {
    const scenario = getSeedScenario('adult_unstable_bradycardia');
    const { result } = renderHook(() => useScenarioEngine(scenario));

    act(() => {
      result.current.applyIntervention('oxygen_nrb');
      result.current.applyIntervention('establish_iv');
    });

    expect(result.current.sequenceIndex).toBe(2);
    expect(result.current.availableInterventionIds).toEqual([
      'atropine_0_5mg',
      'transcutaneous_pacing',
    ]);
  });

  it('keeps adult_vfib_arrest_witnessed on a single required primary route after defibrillation', () => {
    const scenario = getSeedScenario('adult_vfib_arrest_witnessed');
    const { result } = renderHook(() => useScenarioEngine(scenario));

    expect(result.current.requiredStepCount).toBe(5);

    act(() => {
      result.current.applyIntervention('defibrillate');
    });

    expect(result.current.sequenceIndex).toBe(1);
    expect(result.current.requiredStepCount).toBe(5);
    expect(result.current.activatedRouteIds).toEqual(['primary']);
    expect(result.current.availableInterventionIds).toEqual(['cpr']);
    expect(result.current.stateAwareAvailableInterventionIds).toEqual(['cpr']);
    expect(result.current.acceptedInterventionIds).toEqual(['defibrillate']);
    expect(result.current.routeStates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        routeId: 'primary',
        kind: 'primary',
        isActivated: true,
        isRequired: true,
        nextInterventionId: 'cpr',
      }),
    ]));
  });

  it('emits structured primary-route metadata when adult_asystole_unwitnessed rejects an out-of-sequence intervention', () => {
    const scenario = getSeedScenario('adult_asystole_unwitnessed');
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    expect(result.current.requiredStepCount).toBe(3);

    act(() => {
      result.current.applyIntervention('epinephrine_1mg');
    });

    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'epinephrine_1mg',
        rejected: true,
        rejection_category: 'sequence_deviation',
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol. The next expected step is: Cpr.',
        attempt_context: expect.objectContaining({
          available_intervention_ids: ['cpr'],
          state_aware_available_intervention_ids: ['cpr'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
        }),
      }),
    );
  });

  it('emits structured primary-route metadata for accepted cpr in adult_pulseless_vtach after defibrillation', () => {
    const scenario = getSeedScenario('adult_pulseless_vtach');
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    expect(result.current.requiredStepCount).toBe(5);

    act(() => {
      result.current.applyIntervention('defibrillate');
      result.current.applyIntervention('cpr');
    });

    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'cpr',
        rejected: false,
        attempt_context: expect.objectContaining({
          available_intervention_ids: ['cpr'],
          state_aware_available_intervention_ids: ['cpr'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
        }),
        result_context: expect.objectContaining({
          available_intervention_ids: ['establish_iv'],
          state_aware_available_intervention_ids: ['establish_iv'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
          advanced_route_id: 'primary',
          required_step_delta: 1,
        }),
      }),
    );
    expect(result.current.availableInterventionIds).toEqual(['establish_iv']);
  });

  it('keeps pediatric_pulseless_vfib on a single required primary route after cpr', () => {
    const scenario = getSeedScenario('pediatric_pulseless_vfib');
    const { result } = renderHook(() => useScenarioEngine(scenario));

    expect(result.current.requiredStepCount).toBe(5);
    expect(result.current.availableInterventionIds).toEqual(['cpr']);

    act(() => {
      result.current.applyIntervention('cpr');
    });

    expect(result.current.sequenceIndex).toBe(1);
    expect(result.current.requiredStepCount).toBe(5);
    expect(result.current.activatedRouteIds).toEqual(['primary']);
    expect(result.current.availableInterventionIds).toEqual(['defibrillate_pediatric']);
    expect(result.current.stateAwareAvailableInterventionIds).toEqual(['defibrillate_pediatric']);
    expect(result.current.acceptedInterventionIds).toEqual(['cpr']);
    expect(result.current.routeStates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        routeId: 'primary',
        kind: 'primary',
        isActivated: true,
        isRequired: true,
        nextInterventionId: 'defibrillate_pediatric',
      }),
    ]));
  });

  it('keeps adult_respiratory_arrest_opioid on a single required primary route after EMS activation', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    const scenario = getSeedScenario('adult_respiratory_arrest_opioid');
    const { result } = renderHook(() => useScenarioEngine(scenario));

    expect(result.current.requiredStepCount).toBe(6);
    expect(result.current.availableInterventionIds).toEqual(['check_responsiveness']);

    act(() => {
      result.current.applyIntervention('check_responsiveness');
      result.current.applyIntervention('sternal_rub_stimulation');
      result.current.applyIntervention('call_911');
    });

    expect(result.current.sequenceIndex).toBe(3);
    expect(result.current.requiredStepCount).toBe(6);
    expect(result.current.activatedRouteIds).toEqual(['primary']);
    expect(result.current.availableInterventionIds).toEqual(['rescue_breathing']);
    expect(result.current.stateAwareAvailableInterventionIds).toEqual(['rescue_breathing']);
    expect(result.current.acceptedInterventionIds).toEqual([
      'check_responsiveness',
      'sternal_rub_stimulation',
      'call_911',
    ]);
    expect(result.current.routeStates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        routeId: 'primary',
        kind: 'primary',
        isActivated: true,
        isRequired: true,
        nextInterventionId: 'rescue_breathing',
      }),
    ]));
  });

  it('keeps pediatric_respiratory_arrest_asthma on a single required primary route after initial oxygen', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    const scenario = getSeedScenario('pediatric_respiratory_arrest_asthma');
    const { result } = renderHook(() => useScenarioEngine(scenario));

    expect(result.current.requiredStepCount).toBe(8);
    expect(result.current.availableInterventionIds).toEqual(['high_flow_oxygen']);

    act(() => {
      result.current.applyIntervention('high_flow_oxygen');
    });

    expect(result.current.sequenceIndex).toBe(1);
    expect(result.current.requiredStepCount).toBe(8);
    expect(result.current.activatedRouteIds).toEqual(['primary']);
    expect(result.current.availableInterventionIds).toEqual(['albuterol_nebulizer']);
    expect(result.current.stateAwareAvailableInterventionIds).toEqual(['albuterol_nebulizer']);
    expect(result.current.acceptedInterventionIds).toEqual(['high_flow_oxygen']);
    expect(result.current.routeStates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        routeId: 'primary',
        kind: 'primary',
        isActivated: true,
        isRequired: true,
        nextInterventionId: 'albuterol_nebulizer',
      }),
    ]));
  });

  it('emits structured primary-route metadata for accepted albuterol in pediatric_respiratory_arrest_asthma', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const scenario = getSeedScenario('pediatric_respiratory_arrest_asthma');
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    act(() => {
      result.current.applyIntervention('high_flow_oxygen');
      result.current.applyIntervention('albuterol_nebulizer');
    });

    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'albuterol_nebulizer',
        rejected: false,
        attempt_context: expect.objectContaining({
          available_intervention_ids: ['albuterol_nebulizer'],
          state_aware_available_intervention_ids: ['albuterol_nebulizer'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
        }),
        result_context: expect.objectContaining({
          available_intervention_ids: ['ipratropium_nebulizer'],
          state_aware_available_intervention_ids: ['ipratropium_nebulizer'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
          advanced_route_id: 'primary',
          required_step_delta: 1,
        }),
      }),
    );
    expect(result.current.availableInterventionIds).toEqual(['ipratropium_nebulizer']);
  });

  it('emits structured primary-route metadata for both naloxone doses in adult_respiratory_arrest_opioid', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const scenario = getSeedScenario('adult_respiratory_arrest_opioid');
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    act(() => {
      result.current.applyIntervention('check_responsiveness');
      result.current.applyIntervention('sternal_rub_stimulation');
      result.current.applyIntervention('call_911');
      result.current.applyIntervention('rescue_breathing');
      result.current.applyIntervention('naloxone_intranasal_4mg');
    });

    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'naloxone_intranasal_4mg',
        rejected: false,
        attempt_context: expect.objectContaining({
          available_intervention_ids: ['naloxone_intranasal_4mg'],
          state_aware_available_intervention_ids: ['naloxone_intranasal_4mg'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
        }),
        result_context: expect.objectContaining({
          available_intervention_ids: ['naloxone_intranasal_repeat'],
          state_aware_available_intervention_ids: ['naloxone_intranasal_repeat'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
          advanced_route_id: 'primary',
          required_step_delta: 1,
        }),
      }),
    );
    expect(result.current.status).toBe('running');
    expect(result.current.availableInterventionIds).toEqual(['naloxone_intranasal_repeat']);

    act(() => {
      result.current.applyIntervention('naloxone_intranasal_repeat');
    });

    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'naloxone_intranasal_repeat',
        rejected: false,
        attempt_context: expect.objectContaining({
          available_intervention_ids: ['naloxone_intranasal_repeat'],
          state_aware_available_intervention_ids: ['naloxone_intranasal_repeat'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
        }),
        result_context: expect.objectContaining({
          available_intervention_ids: [],
          state_aware_available_intervention_ids: [],
          active_route_id: null,
          activated_route_ids: ['primary'],
          advanced_route_id: 'primary',
          required_step_delta: 1,
        }),
      }),
    );
    expect(result.current.sequenceIndex).toBe(6);
    expect(result.current.completedRequiredSteps).toBe(6);
    expect(result.current.availableInterventionIds).toEqual([]);
  });

  it('keeps adult_stroke_cva on a single required primary route after CT imaging', () => {
    const scenario = getSeedScenario('adult_stroke_cva');
    const { result } = renderHook(() => useScenarioEngine(scenario));

    expect(result.current.requiredStepCount).toBe(5);
    expect(result.current.availableInterventionIds).toEqual(['check_glucose']);

    act(() => {
      result.current.applyIntervention('check_glucose');
      result.current.applyIntervention('establish_iv');
      result.current.applyIntervention('ct_brain_noncontrast');
    });

    expect(result.current.sequenceIndex).toBe(3);
    expect(result.current.requiredStepCount).toBe(5);
    expect(result.current.activatedRouteIds).toEqual(['primary']);
    expect(result.current.availableInterventionIds).toEqual(['labetalol_10mg']);
    expect(result.current.stateAwareAvailableInterventionIds).toEqual(['labetalol_10mg']);
    expect(result.current.acceptedInterventionIds).toEqual([
      'check_glucose',
      'establish_iv',
      'ct_brain_noncontrast',
    ]);
    expect(result.current.routeStates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        routeId: 'primary',
        kind: 'primary',
        isActivated: true,
        isRequired: true,
        nextInterventionId: 'labetalol_10mg',
      }),
    ]));
  });

  it('emits structured primary-route metadata for accepted labetalol in adult_stroke_cva', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const scenario = getSeedScenario('adult_stroke_cva');
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    act(() => {
      result.current.applyIntervention('check_glucose');
      result.current.applyIntervention('establish_iv');
      result.current.applyIntervention('ct_brain_noncontrast');
      result.current.applyIntervention('labetalol_10mg');
    });

    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'labetalol_10mg',
        rejected: false,
        attempt_context: expect.objectContaining({
          available_intervention_ids: ['labetalol_10mg'],
          state_aware_available_intervention_ids: ['labetalol_10mg'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
        }),
        result_context: expect.objectContaining({
          available_intervention_ids: ['alteplase'],
          state_aware_available_intervention_ids: ['alteplase'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
          advanced_route_id: 'primary',
          required_step_delta: 1,
        }),
      }),
    );
    expect(result.current.status).toBe('running');
    expect(result.current.availableInterventionIds).toEqual(['alteplase']);

    expect(result.current.sequenceIndex).toBe(4);
    expect(result.current.completedRequiredSteps).toBe(4);
  });

  it('keeps acs_stemi on a single required primary route after nitroglycerin', () => {
    const scenario = getSeedScenario('acs_stemi');
    const { result } = renderHook(() => useScenarioEngine(scenario));

    expect(result.current.requiredStepCount).toBe(6);
    expect(result.current.availableInterventionIds).toEqual(['aspirin_324mg']);

    act(() => {
      result.current.applyIntervention('aspirin_324mg');
      result.current.applyIntervention('ticagrelor_180mg');
      result.current.applyIntervention('nitroglycerin_04mg');
    });

    expect(result.current.sequenceIndex).toBe(3);
    expect(result.current.requiredStepCount).toBe(6);
    expect(result.current.activatedRouteIds).toEqual(['primary']);
    expect(result.current.availableInterventionIds).toEqual(['establish_iv']);
    expect(result.current.stateAwareAvailableInterventionIds).toEqual(['establish_iv']);
    expect(result.current.acceptedInterventionIds).toEqual([
      'aspirin_324mg',
      'ticagrelor_180mg',
      'nitroglycerin_04mg',
    ]);
    expect(result.current.routeStates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        routeId: 'primary',
        kind: 'primary',
        isActivated: true,
        isRequired: true,
        nextInterventionId: 'establish_iv',
      }),
    ]));
  });

  it('emits structured primary-route metadata for accepted heparin_bolus in acs_stemi', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const scenario = getSeedScenario('acs_stemi');
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    act(() => {
      result.current.applyIntervention('aspirin_324mg');
      result.current.applyIntervention('ticagrelor_180mg');
      result.current.applyIntervention('nitroglycerin_04mg');
      result.current.applyIntervention('establish_iv');
      result.current.applyIntervention('heparin_bolus');
    });

    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'heparin_bolus',
        rejected: false,
        attempt_context: expect.objectContaining({
          available_intervention_ids: ['heparin_bolus'],
          state_aware_available_intervention_ids: ['heparin_bolus'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
        }),
        result_context: expect.objectContaining({
          available_intervention_ids: ['activate_cath_lab'],
          state_aware_available_intervention_ids: ['activate_cath_lab'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
          advanced_route_id: 'primary',
          required_step_delta: 1,
        }),
      }),
    );
    expect(result.current.status).toBe('running');
    expect(result.current.availableInterventionIds).toEqual(['activate_cath_lab']);
    expect(result.current.sequenceIndex).toBe(5);
    expect(result.current.completedRequiredSteps).toBe(5);
  });

  it('keeps bls_adult_choking_unresponsive on a single required primary route after CPR begins', () => {
    const scenario = getSeedScenario('bls_adult_choking_unresponsive');
    const { result } = renderHook(() => useScenarioEngine(scenario));

    expect(result.current.requiredStepCount).toBe(5);
    expect(result.current.availableInterventionIds).toEqual(['call_911']);

    act(() => {
      result.current.applyIntervention('call_911');
      result.current.applyIntervention('lower_to_ground');
      result.current.applyIntervention('cpr_30_2');
    });

    expect(result.current.sequenceIndex).toBe(3);
    expect(result.current.requiredStepCount).toBe(5);
    expect(result.current.activatedRouteIds).toEqual(['primary']);
    expect(result.current.availableInterventionIds).toEqual(['look_in_mouth_before_breath']);
    expect(result.current.stateAwareAvailableInterventionIds).toEqual(['look_in_mouth_before_breath']);
    expect(result.current.acceptedInterventionIds).toEqual([
      'call_911',
      'lower_to_ground',
      'cpr_30_2',
    ]);
    expect(result.current.routeStates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        routeId: 'primary',
        kind: 'primary',
        isActivated: true,
        isRequired: true,
        nextInterventionId: 'look_in_mouth_before_breath',
      }),
    ]));
  });

  it('emits structured primary-route metadata for accepted look_in_mouth_before_breath in bls_adult_choking_unresponsive', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    const scenario = getSeedScenario('bls_adult_choking_unresponsive');
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    act(() => {
      result.current.applyIntervention('call_911');
      result.current.applyIntervention('lower_to_ground');
      result.current.applyIntervention('cpr_30_2');
      result.current.applyIntervention('look_in_mouth_before_breath');
    });

    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'look_in_mouth_before_breath',
        rejected: false,
        attempt_context: expect.objectContaining({
          available_intervention_ids: ['look_in_mouth_before_breath'],
          state_aware_available_intervention_ids: ['look_in_mouth_before_breath'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
        }),
        result_context: expect.objectContaining({
          available_intervention_ids: ['rescue_breathing'],
          state_aware_available_intervention_ids: ['rescue_breathing'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
          advanced_route_id: 'primary',
          required_step_delta: 1,
        }),
      }),
    );
    expect(result.current.status).toBe('running');
    expect(result.current.availableInterventionIds).toEqual(['rescue_breathing']);
    expect(result.current.sequenceIndex).toBe(4);
    expect(result.current.completedRequiredSteps).toBe(4);
  });

  it('keeps bls_drowning_submersion on a single required primary route after the initial rescue breaths', () => {
    const scenario = getSeedScenario('bls_drowning_submersion');
    const { result } = renderHook(() => useScenarioEngine(scenario));

    expect(result.current.requiredStepCount).toBe(9);
    expect(result.current.availableInterventionIds).toEqual(['remove_from_water']);

    act(() => {
      result.current.applyIntervention('remove_from_water');
      result.current.applyIntervention('check_responsiveness');
      result.current.applyIntervention('call_911');
      result.current.applyIntervention('open_airway_head_tilt_chin_lift');
      result.current.applyIntervention('initial_rescue_breaths_5');
    });

    expect(result.current.sequenceIndex).toBe(5);
    expect(result.current.requiredStepCount).toBe(9);
    expect(result.current.activatedRouteIds).toEqual(['primary']);
    expect(result.current.availableInterventionIds).toEqual(['cpr_30_2']);
    expect(result.current.stateAwareAvailableInterventionIds).toEqual(['cpr_30_2']);
    expect(result.current.acceptedInterventionIds).toEqual([
      'remove_from_water',
      'check_responsiveness',
      'call_911',
      'open_airway_head_tilt_chin_lift',
      'initial_rescue_breaths_5',
    ]);
    expect(result.current.routeStates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        routeId: 'primary',
        kind: 'primary',
        isActivated: true,
        isRequired: true,
        nextInterventionId: 'cpr_30_2',
      }),
    ]));
  });

  it('emits structured primary-route metadata for accepted initial_rescue_breaths_5 in bls_drowning_submersion', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    const scenario = getSeedScenario('bls_drowning_submersion');
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    act(() => {
      result.current.applyIntervention('remove_from_water');
      result.current.applyIntervention('check_responsiveness');
      result.current.applyIntervention('call_911');
      result.current.applyIntervention('open_airway_head_tilt_chin_lift');
      result.current.applyIntervention('initial_rescue_breaths_5');
    });

    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'initial_rescue_breaths_5',
        rejected: false,
        attempt_context: expect.objectContaining({
          available_intervention_ids: ['initial_rescue_breaths_5'],
          state_aware_available_intervention_ids: ['initial_rescue_breaths_5'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
        }),
        result_context: expect.objectContaining({
          available_intervention_ids: ['cpr_30_2'],
          state_aware_available_intervention_ids: ['cpr_30_2'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
          advanced_route_id: 'primary',
          required_step_delta: 1,
        }),
      }),
    );
    expect(result.current.status).toBe('running');
    expect(result.current.availableInterventionIds).toEqual(['cpr_30_2']);
    expect(result.current.sequenceIndex).toBe(5);
    expect(result.current.completedRequiredSteps).toBe(5);
  });

  it('keeps bls_adult_cardiac_arrest_bystander on a single required primary route after EMS activation', () => {
    const scenario = getSeedScenario('bls_adult_cardiac_arrest_bystander');
    const { result } = renderHook(() => useScenarioEngine(scenario));

    expect(result.current.requiredStepCount).toBe(7);

    act(() => {
      result.current.applyIntervention('check_responsiveness');
      result.current.applyIntervention('call_911');
    });

    expect(result.current.sequenceIndex).toBe(2);
    expect(result.current.requiredStepCount).toBe(7);
    expect(result.current.activatedRouteIds).toEqual(['primary']);
    expect(result.current.availableInterventionIds).toEqual(['cpr_30_2']);
    expect(result.current.stateAwareAvailableInterventionIds).toEqual(['cpr_30_2']);
    expect(result.current.acceptedInterventionIds).toEqual(['check_responsiveness', 'call_911']);
    expect(result.current.routeStates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        routeId: 'primary',
        kind: 'primary',
        isActivated: true,
        isRequired: true,
        nextInterventionId: 'cpr_30_2',
      }),
    ]));
  });

  it('emits structured primary-route metadata when bls_adult_two_rescuer_cpr rejects aed_attach before assessment', () => {
    const scenario = getSeedScenario('bls_adult_two_rescuer_cpr');
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    expect(result.current.requiredStepCount).toBe(9);

    act(() => {
      result.current.applyIntervention('aed_attach');
    });

    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'aed_attach',
        rejected: true,
        rejection_category: 'sequence_deviation',
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol. The next expected step is: Check Responsiveness.',
        attempt_context: expect.objectContaining({
          available_intervention_ids: ['check_responsiveness'],
          state_aware_available_intervention_ids: ['check_responsiveness'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
        }),
      }),
    );
  });

  it('emits structured primary-route metadata for accepted aed_power_on in bls_adult_aed_public_access after CPR', () => {
    const scenario = getSeedScenario('bls_adult_aed_public_access');
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    expect(result.current.requiredStepCount).toBe(8);

    act(() => {
      result.current.applyIntervention('check_responsiveness');
      result.current.applyIntervention('call_911');
      result.current.applyIntervention('cpr_30_2');
      result.current.applyIntervention('aed_power_on');
    });

    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'aed_power_on',
        rejected: false,
        attempt_context: expect.objectContaining({
          available_intervention_ids: ['aed_power_on'],
          state_aware_available_intervention_ids: ['aed_power_on'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
        }),
        result_context: expect.objectContaining({
          available_intervention_ids: ['aed_attach_pads'],
          state_aware_available_intervention_ids: ['aed_attach_pads'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
          advanced_route_id: 'primary',
          required_step_delta: 1,
        }),
      }),
    );
    expect(result.current.availableInterventionIds).toEqual(['aed_attach_pads']);
  });

  it('offers establish_iv and intubation as peer valid next actions after rescue_breathing in adult_pea_hypoxia', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.99)
      .mockReturnValueOnce(0.99);

    const scenario = getSeedScenario('adult_pea_hypoxia');
    const { result } = renderHook(() => useScenarioEngine(scenario));

    expect(result.current.requiredStepCount).toBe(4);

    act(() => {
      result.current.applyIntervention('cpr');
      result.current.applyIntervention('rescue_breathing');
    });

    expect(result.current.sequenceIndex).toBe(2);
    expect(result.current.requiredStepCount).toBe(4);
    expect(result.current.activatedRouteIds).toEqual(['primary', 'advanced_airway_optional_branch']);
    expect(result.current.availableInterventionIds).toEqual(['establish_iv', 'intubation']);
    expect(result.current.stateAwareAvailableInterventionIds).toEqual(['establish_iv', 'intubation']);
    expect(result.current.acceptedInterventionIds).toEqual(['cpr', 'rescue_breathing']);
    expect(result.current.routeStates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        routeId: 'primary',
        isActivated: true,
        isRequired: true,
        nextInterventionId: 'establish_iv',
      }),
      expect.objectContaining({
        routeId: 'advanced_airway_optional_branch',
        kind: 'branch',
        isActivated: true,
        isRequired: false,
        nextInterventionId: 'intubation',
      }),
    ]));
  });

  it('offers normal_saline_bolus and epinephrine_1mg as peer valid next actions after IV in adult_pea_hypovolemia', () => {
    const scenario = getSeedScenario('adult_pea_hypovolemia');
    const { result } = renderHook(() => useScenarioEngine(scenario));

    expect(result.current.requiredStepCount).toBe(3);

    act(() => {
      result.current.applyIntervention('cpr');
      result.current.applyIntervention('establish_iv');
    });

    expect(result.current.sequenceIndex).toBe(2);
    expect(result.current.requiredStepCount).toBe(3);
    expect(result.current.activatedRouteIds).toEqual(['primary', 'epinephrine_optional_branch']);
    expect(result.current.availableInterventionIds).toEqual(['normal_saline_bolus', 'epinephrine_1mg']);
    expect(result.current.stateAwareAvailableInterventionIds).toEqual(['normal_saline_bolus', 'epinephrine_1mg']);
    expect(result.current.acceptedInterventionIds).toEqual(['cpr', 'establish_iv']);
    expect(result.current.routeStates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        routeId: 'primary',
        isActivated: true,
        isRequired: true,
        nextInterventionId: 'normal_saline_bolus',
      }),
      expect.objectContaining({
        routeId: 'epinephrine_optional_branch',
        kind: 'branch',
        isActivated: true,
        isRequired: false,
        nextInterventionId: 'epinephrine_1mg',
      }),
    ]));
  });

  it('emits structured optional-branch metadata for accepted epinephrine_1mg in adult_pea_hypovolemia', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    const scenario = getSeedScenario('adult_pea_hypovolemia');
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    act(() => {
      result.current.applyIntervention('cpr');
      result.current.applyIntervention('establish_iv');
      result.current.applyIntervention('epinephrine_1mg');
    });

    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'epinephrine_1mg',
        rejected: false,
        attempt_context: expect.objectContaining({
          available_intervention_ids: ['normal_saline_bolus', 'epinephrine_1mg'],
          active_route_id: 'primary',
          activated_route_ids: ['primary', 'epinephrine_optional_branch'],
        }),
        result_context: expect.objectContaining({
          advanced_route_id: 'epinephrine_optional_branch',
          required_step_delta: 0,
        }),
      }),
    );
    expect(result.current.requiredStepCount).toBe(3);
    expect(result.current.availableInterventionIds).toEqual(['normal_saline_bolus']);
  });

  it('still succeeds after normal_saline_bolus ROSC alone under legacy completion behavior in adult_pea_hypovolemia', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const scenario = getSeedScenario('adult_pea_hypovolemia');
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    act(() => {
      result.current.applyIntervention('cpr');
      result.current.applyIntervention('establish_iv');
      result.current.applyIntervention('normal_saline_bolus');
    });

    expect(result.current.status).toBe('running');
    expect(result.current.availableInterventionIds).toEqual(['epinephrine_1mg']);

    act(() => {
      vi.advanceTimersByTime(12_000);
    });

    expect(result.current.status).toBe('success');
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'completion', outcome: 'success' }),
    );
  });

  it('names both normal_saline_bolus and epinephrine_1mg when rejecting a distractor after IV in adult_pea_hypovolemia', () => {
    const scenario = getSeedScenario('adult_pea_hypovolemia');
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    act(() => {
      result.current.applyIntervention('cpr');
      result.current.applyIntervention('establish_iv');
    });

    act(() => {
      result.current.applyIntervention('cpr');
    });

    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'cpr',
        rejected: true,
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol. Valid next steps are: Normal Saline Bolus or Epinephrine 1mg.',
      }),
    );
  });

  it('keeps bls_child_cardiac_arrest on a single required primary route after assessment and EMS activation', () => {
    const scenario = getSeedScenario('bls_child_cardiac_arrest');
    const { result } = renderHook(() => useScenarioEngine(scenario));

    expect(result.current.requiredStepCount).toBe(7);

    act(() => {
      result.current.applyIntervention('check_responsiveness');
      result.current.applyIntervention('call_911');
      result.current.applyIntervention('check_carotid_pulse');
    });

    expect(result.current.sequenceIndex).toBe(3);
    expect(result.current.requiredStepCount).toBe(7);
    expect(result.current.activatedRouteIds).toEqual(['primary']);
    expect(result.current.availableInterventionIds).toEqual(['cpr_30_2_child']);
    expect(result.current.stateAwareAvailableInterventionIds).toEqual(['cpr_30_2_child']);
    expect(result.current.acceptedInterventionIds).toEqual(['check_responsiveness', 'call_911', 'check_carotid_pulse']);
    expect(result.current.routeStates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        routeId: 'primary',
        kind: 'primary',
        isActivated: true,
        isRequired: true,
        nextInterventionId: 'cpr_30_2_child',
      }),
    ]));
  });

  it('emits structured primary-route metadata when bls_child_two_rescuer_cpr rejects aed_attach before assessment', () => {
    const scenario = getSeedScenario('bls_child_two_rescuer_cpr');
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    expect(result.current.requiredStepCount).toBe(8);

    act(() => {
      result.current.applyIntervention('aed_attach');
    });

    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'aed_attach',
        rejected: true,
        rejection_category: 'sequence_deviation',
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol. The next expected step is: Check Responsiveness.',
        attempt_context: expect.objectContaining({
          available_intervention_ids: ['check_responsiveness'],
          state_aware_available_intervention_ids: ['check_responsiveness'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
        }),
      }),
    );
  });

  it('keeps bls_infant_cardiac_arrest on a single required primary route after responsiveness, pulse, and airway assessment', () => {
    const scenario = getSeedScenario('bls_infant_cardiac_arrest');
    const { result } = renderHook(() => useScenarioEngine(scenario));

    expect(result.current.requiredStepCount).toBe(6);

    act(() => {
      result.current.applyIntervention('check_responsiveness');
      result.current.applyIntervention('check_brachial_pulse');
      result.current.applyIntervention('open_airway_head_tilt_chin_lift');
    });

    expect(result.current.sequenceIndex).toBe(3);
    expect(result.current.requiredStepCount).toBe(6);
    expect(result.current.activatedRouteIds).toEqual(['primary']);
    expect(result.current.availableInterventionIds).toEqual(['cpr_30_2_infant_2finger']);
    expect(result.current.stateAwareAvailableInterventionIds).toEqual(['cpr_30_2_infant_2finger']);
    expect(result.current.acceptedInterventionIds).toEqual([
      'check_responsiveness',
      'check_brachial_pulse',
      'open_airway_head_tilt_chin_lift',
    ]);
    expect(result.current.routeStates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        routeId: 'primary',
        kind: 'primary',
        isActivated: true,
        isRequired: true,
        nextInterventionId: 'cpr_30_2_infant_2finger',
      }),
    ]));
  });

  it('emits structured primary-route metadata when bls_infant_two_rescuer_cpr rejects switch_compressor_roles before assessment', () => {
    const scenario = getSeedScenario('bls_infant_two_rescuer_cpr');
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    expect(result.current.requiredStepCount).toBe(6);

    act(() => {
      result.current.applyIntervention('switch_compressor_roles');
    });

    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'switch_compressor_roles',
        rejected: true,
        rejection_category: 'sequence_deviation',
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol. The next expected step is: Check Responsiveness.',
        attempt_context: expect.objectContaining({
          available_intervention_ids: ['check_responsiveness'],
          state_aware_available_intervention_ids: ['check_responsiveness'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
        }),
      }),
    );
  });

  it('still succeeds after rescue_breathing_infant ROSC alone under legacy completion behavior in bls_infant_cardiac_arrest', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const scenario = getSeedScenario('bls_infant_cardiac_arrest');
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    act(() => {
      result.current.applyIntervention('check_responsiveness');
      result.current.applyIntervention('check_brachial_pulse');
      result.current.applyIntervention('open_airway_head_tilt_chin_lift');
      result.current.applyIntervention('cpr_30_2_infant_2finger');
      result.current.applyIntervention('rescue_breathing_infant');
    });

    expect(result.current.status).toBe('running');
    expect(result.current.availableInterventionIds).toEqual(['call_911']);

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(result.current.status).toBe('success');
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'completion', outcome: 'success' }),
    );
  });

  it('still succeeds after bag_valve_mask_infant ROSC alone under legacy completion behavior in bls_infant_two_rescuer_cpr', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const scenario = getSeedScenario('bls_infant_two_rescuer_cpr');
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    act(() => {
      result.current.applyIntervention('check_responsiveness');
      result.current.applyIntervention('call_911');
      result.current.applyIntervention('check_brachial_pulse');
      result.current.applyIntervention('cpr_15_2_infant_2thumb');
      result.current.applyIntervention('bag_valve_mask_infant');
    });

    expect(result.current.status).toBe('running');
    expect(result.current.availableInterventionIds).toEqual(['switch_compressor_roles']);

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(result.current.status).toBe('success');
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'completion', outcome: 'success' }),
    );
  });

  it('emits structured optional-branch metadata for accepted intubation in adult_pea_hypoxia', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.99)
      .mockReturnValueOnce(0.99)
      .mockReturnValueOnce(0);

    const scenario = getSeedScenario('adult_pea_hypoxia');
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    act(() => {
      result.current.applyIntervention('cpr');
      result.current.applyIntervention('rescue_breathing');
      result.current.applyIntervention('intubation');
    });

    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'intubation',
        rejected: false,
        attempt_context: expect.objectContaining({
          available_intervention_ids: ['establish_iv', 'intubation'],
          active_route_id: 'primary',
          activated_route_ids: ['primary', 'advanced_airway_optional_branch'],
        }),
        result_context: expect.objectContaining({
          advanced_route_id: 'advanced_airway_optional_branch',
          required_step_delta: 0,
        }),
      }),
    );
    expect(result.current.requiredStepCount).toBe(4);
  });

  it('still succeeds after rescue_breathing ROSC alone under legacy completion behavior in adult_pea_hypoxia', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.99)
      .mockReturnValueOnce(0);

    const scenario = getSeedScenario('adult_pea_hypoxia');
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    act(() => {
      result.current.applyIntervention('cpr');
      result.current.applyIntervention('rescue_breathing');
    });

    expect(result.current.status).toBe('running');
    expect(result.current.availableInterventionIds).toEqual(['establish_iv', 'intubation']);

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(result.current.status).toBe('success');
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'completion', outcome: 'success' }),
    );
  });

  it('names both establish_iv and intubation when rejecting a distractor after rescue_breathing in adult_pea_hypoxia', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.99)
      .mockReturnValueOnce(0.99)
      .mockReturnValueOnce(0.99);

    const scenario = getSeedScenario('adult_pea_hypoxia');
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    act(() => {
      result.current.applyIntervention('cpr');
      result.current.applyIntervention('rescue_breathing');
    });

    act(() => {
      result.current.applyIntervention('cpr');
    });

    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'cpr',
        rejected: true,
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol. Valid next steps are: Establish Iv or Intubation.',
      }),
    );
  });

  it('offers establish_iv and intubation as peer valid next actions after oxygen in anaphylactic_shock', () => {
    const scenario = getSeedScenario('anaphylactic_shock');
    const { result } = renderHook(() => useScenarioEngine(scenario));

    expect(result.current.requiredStepCount).toBe(4);

    act(() => {
      result.current.applyIntervention('epinephrine_im_0_5mg');
      result.current.applyIntervention('oxygen_nrb');
    });

    expect(result.current.sequenceIndex).toBe(2);
    expect(result.current.requiredStepCount).toBe(4);
    expect(result.current.activatedRouteIds).toEqual(['primary', 'airway_escalation_optional_branch']);
    expect(result.current.availableInterventionIds).toEqual(['establish_iv', 'intubation']);
    expect(result.current.stateAwareAvailableInterventionIds).toEqual(['establish_iv', 'intubation']);
    expect(result.current.acceptedInterventionIds).toEqual(['epinephrine_im_0_5mg', 'oxygen_nrb']);
    expect(result.current.routeStates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        routeId: 'primary',
        isActivated: true,
        isRequired: true,
        nextInterventionId: 'establish_iv',
      }),
      expect.objectContaining({
        routeId: 'airway_escalation_optional_branch',
        kind: 'branch',
        isActivated: true,
        isRequired: false,
        nextInterventionId: 'intubation',
      }),
    ]));
  });

  it('emits structured optional-branch metadata for accepted intubation in anaphylactic_shock', () => {
    const scenario = getSeedScenario('anaphylactic_shock');
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    act(() => {
      result.current.applyIntervention('epinephrine_im_0_5mg');
      result.current.applyIntervention('oxygen_nrb');
      result.current.applyIntervention('intubation');
    });

    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'intubation',
        rejected: false,
        attempt_context: expect.objectContaining({
          available_intervention_ids: ['establish_iv', 'intubation'],
          active_route_id: 'primary',
          activated_route_ids: ['primary', 'airway_escalation_optional_branch'],
        }),
        result_context: expect.objectContaining({
          advanced_route_id: 'airway_escalation_optional_branch',
          required_step_delta: 0,
        }),
      }),
    );
    expect(result.current.requiredStepCount).toBe(4);
  });

  it('emits structured protocol metadata for accepted optional-branch interventions', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const scenario = getSeedScenario('adult_unstable_bradycardia');
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    act(() => {
      result.current.applyIntervention('oxygen_nrb');
      result.current.applyIntervention('establish_iv');
      result.current.applyIntervention('transcutaneous_pacing');
    });

    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'transcutaneous_pacing',
        rejected: false,
        attempt_context: expect.objectContaining({
          available_intervention_ids: ['atropine_0_5mg', 'transcutaneous_pacing'],
          active_route_id: 'primary',
          activated_route_ids: ['primary', 'pacing_optional_branch'],
        }),
        result_context: expect.objectContaining({
          advanced_route_id: 'pacing_optional_branch',
          required_step_delta: 0,
        }),
      }),
    );
  });

  it('rejects pacing before IV in adult_unstable_bradycardia as a sequence issue', () => {
    const scenario = getSeedScenario('adult_unstable_bradycardia');
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    act(() => {
      result.current.applyIntervention('oxygen_nrb');
    });

    act(() => {
      result.current.applyIntervention('transcutaneous_pacing');
    });

    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'transcutaneous_pacing',
        rejected: true,
        rejection_category: 'sequence_deviation',
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol. The next expected step is: Establish Iv.',
      }),
    );
  });

  it('prefers sequence-deviation rejection over duplicate messaging for already-completed actions that are also out of sequence', () => {
    const scenario = getSeedScenario('adult_unstable_bradycardia');
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    act(() => {
      result.current.applyIntervention('oxygen_nrb');
      result.current.applyIntervention('establish_iv');
    });

    act(() => {
      result.current.applyIntervention('oxygen_nrb');
    });

    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'oxygen_nrb',
        rejected: true,
        rejection_category: 'sequence_deviation',
        attempt_context: expect.objectContaining({
          available_intervention_ids: ['atropine_0_5mg', 'transcutaneous_pacing'],
          active_route_id: 'primary',
          activated_route_ids: ['primary', 'pacing_optional_branch'],
        }),
      }),
    );

    const rejectedEvent = onEvent.mock.calls.at(-1)?.[0] as Extract<EngineEvent, { type: 'intervention' }>;
    expect(rejectedEvent.result_context).toBeUndefined();
  });

  it('prefers sequence-deviation rejection over physiologic mismatch when both would apply', () => {
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(rejectionPrecedenceScenario, onEvent));

    act(() => {
      result.current.applyIntervention('wrong_rhythm_step');
    });

    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'wrong_rhythm_step',
        rejected: true,
        rejection_category: 'sequence_deviation',
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol. The next expected step is: Protocol Step.',
        attempt_context: expect.objectContaining({
          available_intervention_ids: ['protocol_step'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
        }),
      }),
    );
  });

  it('accepts pacing immediately after IV and allows success without first completing atropine in adult_unstable_bradycardia', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const scenario = getSeedScenario('adult_unstable_bradycardia');
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    act(() => {
      result.current.applyIntervention('oxygen_nrb');
      result.current.applyIntervention('establish_iv');
      result.current.applyIntervention('transcutaneous_pacing');
    });

    expect(result.current.sequenceIndex).toBe(2);
    expect(result.current.availableInterventionIds).toEqual(['atropine_0_5mg']);
    expect(result.current.state?.hr).toBe(72);
    expect(result.current.state?.rhythm).toBe('Sinus');
    expect(result.current.status).toBe('running');

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(result.current.status).toBe('success');
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'completion', outcome: 'success' }),
    );
  });

  it('keeps pacing available after atropine-first progression in adult_unstable_bradycardia', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const scenario = getSeedScenario('adult_unstable_bradycardia');
    const { result } = renderHook(() => useScenarioEngine(scenario));

    act(() => {
      result.current.applyIntervention('oxygen_nrb');
      result.current.applyIntervention('establish_iv');
      result.current.applyIntervention('atropine_0_5mg');
    });

    expect(result.current.sequenceIndex).toBe(3);
    expect(result.current.availableInterventionIds).toEqual(['transcutaneous_pacing']);
    expect(result.current.state?.hr).toBe(75);
    expect(result.current.state?.rhythm).toBe('Sinus');
    expect(result.current.status).toBe('running');
  });

  it('names both atropine and pacing when rejecting a distractor after IV in adult_unstable_bradycardia', () => {
    const scenario = getSeedScenario('adult_unstable_bradycardia');
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    act(() => {
      result.current.applyIntervention('oxygen_nrb');
      result.current.applyIntervention('establish_iv');
    });

    act(() => {
      result.current.applyIntervention('oxygen_nrb');
    });

    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'oxygen_nrb',
        rejected: true,
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol. Valid next steps are: Atropine 0 5mg or Transcutaneous Pacing.',
      }),
    );
  });

  it('allows only synchronized cardioversion at start in adult_vtach_pulse', () => {
    const scenario = getSeedScenario('adult_vtach_pulse');
    const { result } = renderHook(() => useScenarioEngine(scenario));

    expect(result.current.availableInterventionIds).toEqual(['synchronized_cardioversion']);
    expect(result.current.activatedRouteIds).toEqual(['primary']);
    expect(result.current.requiredStepCount).toBe(1);
  });

  it('persists state-aware next-action metadata for SVT conversion outcomes and preserves physiologic rejection messaging', () => {
    const randomSpy = vi.spyOn(Math, 'random');

    randomSpy.mockReturnValue(0);
    const successOnEvent = vi.fn<(event: EngineEvent) => void>();
    const { result: successResult, unmount } = renderHook(() => useScenarioEngine(stateAwareGuidanceScenario, successOnEvent));

    act(() => {
      successResult.current.applyIntervention('adenosine_6mg');
    });

    expect(successOnEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'adenosine_6mg',
        rejected: false,
        attempt_context: expect.objectContaining({
          available_intervention_ids: ['adenosine_6mg'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
        }),
        result_context: expect.objectContaining({
          state_aware_available_intervention_ids: [],
          required_step_delta: 1,
        }),
      }),
    );

    act(() => {
      successResult.current.applyIntervention('synchronized_cardioversion');
    });

    expect(successOnEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'synchronized_cardioversion',
        rejected: true,
        rejection_category: 'rhythm_mismatch',
        message: 'Not appropriate for the current rhythm. Requires SVT or VTach. Current rhythm: Sinus.',
        attempt_context: expect.objectContaining({
          available_intervention_ids: ['synchronized_cardioversion'],
          state_aware_available_intervention_ids: [],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
        }),
      }),
    );

    unmount();

    randomSpy.mockReturnValue(0.99);
    const failedOnEvent = vi.fn<(event: EngineEvent) => void>();
    const { result: failedResult } = renderHook(() => useScenarioEngine(stateAwareGuidanceScenario, failedOnEvent));

    act(() => {
      failedResult.current.applyIntervention('adenosine_6mg');
    });

    expect(failedOnEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'adenosine_6mg',
        rejected: false,
        attempt_context: expect.objectContaining({
          available_intervention_ids: ['adenosine_6mg'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
        }),
        result_context: expect.objectContaining({
          state_aware_available_intervention_ids: ['synchronized_cardioversion'],
          required_step_delta: 1,
        }),
      }),
    );
  });

  it('allows only vagal_maneuver at start in adult_svt', () => {
    const scenario = getSeedScenario('adult_svt');
    const { result } = renderHook(() => useScenarioEngine(scenario));

    expect(result.current.availableInterventionIds).toEqual(['vagal_maneuver']);
    expect(result.current.activatedRouteIds).toEqual(['primary']);
  });

  it('rejects establish_iv before vagal_maneuver in adult_svt', () => {
    const scenario = getSeedScenario('adult_svt');
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    act(() => {
      result.current.applyIntervention('establish_iv');
    });

    expect(result.current.sequenceIndex).toBe(0);
    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'establish_iv',
        rejected: true,
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol. The next expected step is: Vagal Maneuver.',
        attempt_context: expect.objectContaining({
          available_intervention_ids: ['vagal_maneuver'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
        }),
      }),
    );
  });

  it('makes adenosine_6mg the next step after accepted vagal_maneuver then establish_iv in adult_svt', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    const scenario = getSeedScenario('adult_svt');
    const { result } = renderHook(() => useScenarioEngine(scenario));

    act(() => {
      result.current.applyIntervention('vagal_maneuver');
      result.current.applyIntervention('establish_iv');
    });

    expect(result.current.sequenceIndex).toBe(2);
    expect(result.current.state?.rhythm).toBe('SVT');
    expect(result.current.availableInterventionIds).toEqual(['adenosine_6mg']);
  });

  it('activates the optional post-adenosine branch and state-aware synchronized_cardioversion guidance after non-converting adenosine in adult_svt', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    const scenario = getSeedScenario('adult_svt');
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    act(() => {
      result.current.applyIntervention('vagal_maneuver');
      result.current.applyIntervention('establish_iv');
      result.current.applyIntervention('adenosine_6mg');
    });

    expect(result.current.sequenceIndex).toBe(3);
    expect(result.current.state?.rhythm).toBe('SVT');
    expect(result.current.availableInterventionIds).toEqual(['synchronized_cardioversion']);
    expect(result.current.activatedRouteIds).toEqual(['primary', 'post_adenosine_optional_branch']);
    expect(result.current.requiredStepCount).toBe(3);
    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'adenosine_6mg',
        rejected: false,
        attempt_context: expect.objectContaining({
          available_intervention_ids: ['adenosine_6mg'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
        }),
        result_context: expect.objectContaining({
          state_aware_available_intervention_ids: ['synchronized_cardioversion'],
          required_step_delta: 1,
        }),
      }),
    );
  });

  it('suppresses state-aware synchronized_cardioversion guidance after adenosine conversion and rejects cardioversion as physiologically inappropriate in adult_svt', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.99)
      .mockReturnValueOnce(0.99)
      .mockReturnValueOnce(0);

    const scenario = getSeedScenario('adult_svt');
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    act(() => {
      result.current.applyIntervention('vagal_maneuver');
      result.current.applyIntervention('establish_iv');
      result.current.applyIntervention('adenosine_6mg');
    });

    expect(result.current.state?.rhythm).toBe('Sinus');
    expect(result.current.availableInterventionIds).toEqual(['synchronized_cardioversion']);
    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'adenosine_6mg',
        rejected: false,
        attempt_context: expect.objectContaining({
          available_intervention_ids: ['adenosine_6mg'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
        }),
        result_context: expect.objectContaining({
          state_aware_available_intervention_ids: [],
          required_step_delta: 1,
        }),
      }),
    );

    act(() => {
      result.current.applyIntervention('synchronized_cardioversion');
    });

    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'synchronized_cardioversion',
        rejected: true,
        rejection_category: 'rhythm_mismatch',
        message: 'Not appropriate for the current rhythm. Requires SVT or VTach. Current rhythm: Sinus.',
        attempt_context: expect.objectContaining({
          available_intervention_ids: ['synchronized_cardioversion'],
          state_aware_available_intervention_ids: [],
          active_route_id: 'post_adenosine_optional_branch',
          activated_route_ids: ['primary', 'post_adenosine_optional_branch'],
        }),
      }),
    );
  });

  it('still succeeds after adenosine conversion alone under legacy completion behavior in adult_svt', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.99)
      .mockReturnValueOnce(0.99)
      .mockReturnValueOnce(0);

    const scenario = getSeedScenario('adult_svt');
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    act(() => {
      result.current.applyIntervention('vagal_maneuver');
      result.current.applyIntervention('establish_iv');
      result.current.applyIntervention('adenosine_6mg');
    });

    expect(result.current.status).toBe('running');
    expect(result.current.availableInterventionIds).toEqual(['synchronized_cardioversion']);

    act(() => {
      vi.advanceTimersByTime(15_000);
    });

    expect(result.current.status).toBe('success');
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'completion', outcome: 'success' }),
    );
  });

  it('rejects establish_iv before cardioversion in adult_vtach_pulse', () => {
    const scenario = getSeedScenario('adult_vtach_pulse');
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    act(() => {
      result.current.applyIntervention('establish_iv');
    });

    expect(result.current.sequenceIndex).toBe(0);
    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'establish_iv',
        rejected: true,
        attempt_context: expect.objectContaining({
          available_intervention_ids: ['synchronized_cardioversion'],
          active_route_id: 'primary',
          activated_route_ids: ['primary'],
        }),
      }),
    );
  });

  it('activates the optional post-cardioversion branch after accepted cardioversion in adult_vtach_pulse', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const scenario = getSeedScenario('adult_vtach_pulse');
    const { result } = renderHook(() => useScenarioEngine(scenario));

    act(() => {
      result.current.applyIntervention('synchronized_cardioversion');
    });

    expect(result.current.sequenceIndex).toBe(1);
    expect(result.current.state?.rhythm).toBe('Sinus');
    expect(result.current.availableInterventionIds).toEqual(['establish_iv']);
    expect(result.current.activatedRouteIds).toEqual(['primary', 'post_cardioversion_optional_branch']);
    expect(result.current.requiredStepCount).toBe(1);
  });

  it('emits non-required branch metadata for accepted optional branch steps in adult_vtach_pulse', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const scenario = getSeedScenario('adult_vtach_pulse');
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    act(() => {
      result.current.applyIntervention('synchronized_cardioversion');
      result.current.applyIntervention('establish_iv');
      result.current.applyIntervention('amiodarone_150mg_stable');
    });

    const interventionEvents = onEvent.mock.calls
      .map(([event]) => event)
      .filter((event): event is Extract<EngineEvent, { type: 'intervention' }> => event.type === 'intervention');
    const branchEvents = interventionEvents.filter(
      (event) => event.intervention_id === 'establish_iv' || event.intervention_id === 'amiodarone_150mg_stable',
    );

    expect(branchEvents).toHaveLength(2);
    expect(branchEvents[0]).toEqual(
      expect.objectContaining({
        intervention_id: 'establish_iv',
        rejected: false,
        attempt_context: expect.objectContaining({
          active_route_id: 'post_cardioversion_optional_branch',
          activated_route_ids: ['primary', 'post_cardioversion_optional_branch'],
        }),
        result_context: expect.objectContaining({
          advanced_route_id: 'post_cardioversion_optional_branch',
          required_step_delta: 0,
        }),
      }),
    );
    expect(branchEvents[1]).toEqual(
      expect.objectContaining({
        intervention_id: 'amiodarone_150mg_stable',
        rejected: false,
        attempt_context: expect.objectContaining({
          active_route_id: 'post_cardioversion_optional_branch',
          activated_route_ids: ['primary', 'post_cardioversion_optional_branch'],
        }),
        result_context: expect.objectContaining({
          advanced_route_id: 'post_cardioversion_optional_branch',
          required_step_delta: 0,
        }),
      }),
    );
    expect(result.current.requiredStepCount).toBe(1);
  });

  it('still succeeds after cardioversion alone under legacy completion behavior in adult_vtach_pulse', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const scenario = getSeedScenario('adult_vtach_pulse');
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    act(() => {
      result.current.applyIntervention('synchronized_cardioversion');
    });

    expect(result.current.status).toBe('running');
    expect(result.current.availableInterventionIds).toEqual(['establish_iv']);

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(result.current.status).toBe('success');
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'completion', outcome: 'success' }),
    );
  });

  it('applies scheduled state changes and fails when a pulseless event occurs', () => {
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scheduledFailureScenario, onEvent));

    act(() => {
      vi.advanceTimersByTime(6_000);
    });

    expect(result.current.status).toBe('failed');
    expect(result.current.state?.pulsePresent).toBe(false);
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'state_change', changes: expect.objectContaining({ rhythm: 'VFib' }) }),
    );
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'completion', outcome: 'failed' }),
    );
  });

  it('advances sequenceIndex only when the expected intervention is accepted', () => {
    const sequencedScenario: Scenario = {
      ...mockScenario,
      expected_sequence: ['cpr'],
    };
    const { result } = renderHook(() => useScenarioEngine(sequencedScenario));

    act(() => {
      result.current.applyIntervention('unknown_action');
    });

    expect(result.current.sequenceIndex).toBe(0);

    act(() => {
      result.current.applyIntervention('cpr');
    });

    expect(result.current.sequenceIndex).toBe(1);
  });

  it('reports timed repeats as active without implying global blocking', () => {
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(mockScenario, onEvent));

    act(() => {
      result.current.applyIntervention('cpr');
    });

    act(() => {
      result.current.applyIntervention('cpr');
    });

    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'cpr',
        rejected: true,
        rejection_category: 'already_active',
        message: 'Already active. Only this action is temporarily unavailable. Repeat available in approximately 10–13s.',
      }),
    );
  });

  it('reports permanent actions as already applied for the scenario', () => {
    const permanentScenario: Scenario = {
      ...mockScenario,
      interventions: {
        ...mockScenario.interventions,
        establish_iv: {},
      },
    };
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(permanentScenario, onEvent));

    act(() => {
      result.current.applyIntervention('establish_iv');
    });

    act(() => {
      result.current.applyIntervention('establish_iv');
    });

    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'establish_iv',
        rejected: true,
        rejection_category: 'already_applied',
        message: 'Already applied. This action stays in effect for this scenario.',
      }),
    );
  });

  it('does not complete a shockable arrest before the terminal teaching step', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const scenario = getSeedScenario('adult_vfib_arrest_witnessed');

    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    act(() => {
      result.current.applyIntervention('defibrillate');
    });

    act(() => {
      vi.advanceTimersByTime(33_000);
    });

    expect(result.current.status).toBe('running');
    expect(onEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'completion', outcome: 'success' }),
    );

    act(() => {
      result.current.applyIntervention('cpr');
      result.current.applyIntervention('establish_iv');
      result.current.applyIntervention('epinephrine_1mg');
      result.current.applyIntervention('amiodarone_300mg');
    });

    act(() => {
      vi.advanceTimersByTime(33_000);
    });

    expect(result.current.status).toBe('success');
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'completion', outcome: 'success' }),
    );
  });
});
