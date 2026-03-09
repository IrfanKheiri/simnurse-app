import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useScenarioEngine } from './useScenarioEngine';
import type { EngineEvent, Scenario } from '../types/scenario';

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
    expect(result.current.successHoldStarts).toEqual({});
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
});
