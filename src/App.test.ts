import { describe, expect, it } from 'vitest';
import type { Scenario, SessionLogEvent } from './types/scenario';
import * as AppModule from './App';

type BuildActionFeedbackFn = (logs: SessionLogEvent[], scenario: Scenario | null) => Array<{
  expectedActionLabel?: string;
  expectedActionRationale?: string;
}>;

const buildActionFeedback = (AppModule as { buildActionFeedback?: BuildActionFeedbackFn }).buildActionFeedback;

const testScenario: Scenario = {
  scenario_id: 'debrief_feedback_protocol_metadata',
  title: 'Debrief feedback protocol metadata',
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
    cpr: {
      rationale: 'High-quality compressions maintain perfusion while the next protocol step is pending.',
    },
    atropine_0_5mg: {
      rationale: 'Atropine is an appropriate pharmacologic next step for symptomatic bradycardia after IV access.',
    },
    transcutaneous_pacing: {
      rationale: 'Transcutaneous pacing is a valid parallel next step when atropine may be ineffective.',
    },
    distractor: {},
  },
  expected_sequence: ['cpr', 'atropine_0_5mg', 'transcutaneous_pacing'],
  success_conditions: [],
  failure_conditions: [],
};

function makeInterventionLog(
  id: number,
  details: Extract<SessionLogEvent, { event_type: 'intervention' }>['details'],
): SessionLogEvent {
  return {
    id,
    session_id: 'session-1',
    scenario_id: testScenario.scenario_id,
    timestamp: 1_000 + id,
    sim_time_sec: id * 3,
    event_type: 'intervention',
    details,
  };
}

describe('buildActionFeedback', () => {
  it('prefers authoritative state-aware metadata over the raw protocol-next list', () => {
    expect(buildActionFeedback).toBeTypeOf('function');

    const feedback = buildActionFeedback!([
      makeInterventionLog(1, {
        intervention_id: 'distractor',
        rejected: true,
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol.',
        available_intervention_ids: ['atropine_0_5mg'],
        state_aware_available_intervention_ids: ['cpr'],
        active_route_id: 'primary',
        activated_route_ids: ['primary'],
      }),
    ], testScenario);

    expect(feedback[0]).toMatchObject({
      expectedActionLabel: 'CPR (High-Quality)',
      expectedActionRationale: 'High-quality compressions maintain perfusion while the next protocol step is pending.',
    });
  });

  it('suppresses expected-step guidance when the authoritative state-aware list is empty', () => {
    expect(buildActionFeedback).toBeTypeOf('function');

    const feedback = buildActionFeedback!([
      makeInterventionLog(1, {
        intervention_id: 'distractor',
        rejected: true,
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol.',
        available_intervention_ids: ['cpr'],
        state_aware_available_intervention_ids: [],
        active_route_id: 'primary',
        activated_route_ids: ['primary'],
      }),
    ], testScenario);

    expect(feedback[0]?.expectedActionLabel).toBeUndefined();
    expect(feedback[0]?.expectedActionRationale).toBeUndefined();
  });

  it('does not invent a single expected action when persisted metadata shows multiple valid next steps', () => {
    expect(buildActionFeedback).toBeTypeOf('function');

    const feedback = buildActionFeedback!([
      makeInterventionLog(1, {
        intervention_id: 'distractor',
        rejected: true,
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol.',
        available_intervention_ids: ['atropine_0_5mg', 'transcutaneous_pacing'],
        active_route_id: 'primary',
        activated_route_ids: ['primary', 'pacing_optional_branch'],
      }),
    ], testScenario);

    expect(feedback[0]?.expectedActionLabel).toBeUndefined();
    expect(feedback[0]?.expectedActionRationale).toBeUndefined();
  });

  it('falls back to legacy expected-sequence replay when structured protocol metadata is absent', () => {
    expect(buildActionFeedback).toBeTypeOf('function');

    const feedback = buildActionFeedback!([
      makeInterventionLog(1, {
        intervention_id: 'distractor',
        rejected: true,
        message: 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol. The next expected step is: Cpr.',
      }),
    ], testScenario);

    expect(feedback[0]).toMatchObject({
      expectedActionLabel: 'CPR (High-Quality)',
      expectedActionRationale: 'High-quality compressions maintain perfusion while the next protocol step is pending.',
    });
  });
});
