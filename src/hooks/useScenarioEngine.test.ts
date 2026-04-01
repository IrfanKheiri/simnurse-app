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
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol. Valid next steps are: Primary Treat, Branch Treat, or Rescue Breathing.',
      }),
    );
  });

  it('rejects PMCD before the rescue route unlocks', () => {
    const scenario = getSeedScenario('pregnant_vfib_arrest');
    const onEvent = vi.fn<(event: EngineEvent) => void>();
    const { result } = renderHook(() => useScenarioEngine(scenario, onEvent));

    act(() => {
      result.current.applyIntervention('perimortem_csection');
    });

    expect(onEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'intervention',
        intervention_id: 'perimortem_csection',
        rejected: true,
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
        available_intervention_ids: ['atropine_0_5mg', 'transcutaneous_pacing'],
        active_route_id: 'primary',
        activated_route_ids: ['primary', 'pacing_optional_branch'],
        advanced_route_id: 'pacing_optional_branch',
        required_step_delta: 0,
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
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol. The next expected step is: Establish Iv.',
      }),
    );
  });

  it('emits current protocol metadata for rejected branch-aware sequence issues', () => {
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
        available_intervention_ids: ['atropine_0_5mg', 'transcutaneous_pacing'],
        active_route_id: 'primary',
        activated_route_ids: ['primary', 'pacing_optional_branch'],
      }),
    );

    const rejectedEvent = onEvent.mock.calls.at(-1)?.[0] as Extract<EngineEvent, { type: 'intervention' }>;
    expect(rejectedEvent.advanced_route_id).toBeUndefined();
    expect(rejectedEvent.required_step_delta).toBeUndefined();
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
        state_aware_available_intervention_ids: [],
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
        message: 'Not appropriate for the current rhythm. Requires SVT or VTach. Current rhythm: Sinus.',
        state_aware_available_intervention_ids: [],
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
        state_aware_available_intervention_ids: ['synchronized_cardioversion'],
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
        available_intervention_ids: ['vagal_maneuver'],
        active_route_id: 'primary',
        activated_route_ids: ['primary'],
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
        state_aware_available_intervention_ids: ['synchronized_cardioversion'],
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
        state_aware_available_intervention_ids: [],
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
        message: 'Not appropriate for the current rhythm. Requires SVT or VTach. Current rhythm: Sinus.',
        available_intervention_ids: ['synchronized_cardioversion'],
        state_aware_available_intervention_ids: [],
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
        available_intervention_ids: ['synchronized_cardioversion'],
        active_route_id: 'primary',
        activated_route_ids: ['primary'],
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
        active_route_id: 'post_cardioversion_optional_branch',
        activated_route_ids: ['primary', 'post_cardioversion_optional_branch'],
        advanced_route_id: 'post_cardioversion_optional_branch',
        required_step_delta: 0,
      }),
    );
    expect(branchEvents[1]).toEqual(
      expect.objectContaining({
        intervention_id: 'amiodarone_150mg_stable',
        rejected: false,
        active_route_id: 'post_cardioversion_optional_branch',
        activated_route_ids: ['primary', 'post_cardioversion_optional_branch'],
        advanced_route_id: 'post_cardioversion_optional_branch',
        required_step_delta: 0,
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
