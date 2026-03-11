import { useCallback, useEffect, useReducer, useRef } from 'react';
import type {
  ActiveIntervention,
  AdjustableVital,
  Condition,
  EngineEvent,
  InterventionDefinition,
  PatientField,
  PatientState,
  Scenario,
  ScheduledStateChange,
} from '../types/scenario';

const SIMULATION_INTERVAL_MS = 3000;
const SIMULATION_INTERVAL_SEC = SIMULATION_INTERVAL_MS / 1000;

function isEngineFrozenForE2E(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.localStorage.getItem('simnurse_e2e_freeze_engine') === 'true';
  } catch {
    return false;
  }
}

function parseBP(bpStr: string | undefined): { sys: number; dia: number } {
  if (!bpStr) {
    return { sys: 0, dia: 0 };
  }

  const [sys, dia] = bpStr.split('/').map(Number);
  return { sys: sys || 0, dia: dia || 0 };
}

function stringifyBP(sys: number, dia: number): string {
  return `${Math.round(sys)}/${Math.round(dia)}`;
}

function clampState(state: PatientState): PatientState {
  const clamped = { ...state };
  clamped.hr = Math.max(0, Math.min(300, Math.round(clamped.hr)));
  clamped.spo2 = Math.max(0, Math.min(100, Math.round(clamped.spo2)));
  clamped.rr = Math.max(0, Math.min(60, Math.round(clamped.rr)));

  if (typeof clamped.temp === 'number') {
    clamped.temp = Math.max(25, Math.min(45, Math.round(clamped.temp * 10) / 10));
  }

  if (typeof clamped.etco2 === 'number') {
    clamped.etco2 = Math.max(0, Math.min(80, Math.round(clamped.etco2)));
  }

  if (typeof clamped.glucose === 'number') {
    clamped.glucose = Math.max(0, Math.min(500, Math.round(clamped.glucose)));
  }

  const bp = parseBP(clamped.bp);
  clamped.bp = stringifyBP(Math.max(0, bp.sys), Math.max(0, bp.dia));

  return clamped;
}

function applyVitalModifier(state: PatientState, vital: AdjustableVital, modifier: number): PatientState {
  const next = { ...state };

  if (vital === 'bp') {
    const bp = parseBP(next.bp);
    bp.sys += modifier;
    bp.dia += modifier / 2;
    next.bp = stringifyBP(bp.sys, bp.dia);
    return next;
  }

  const current = next[vital];
  if (typeof current === 'number') {
    return { ...next, [vital]: current + modifier } as PatientState;
  }

  return next;
}

function resolveDecayModifier(state: PatientState, modifier: number, vital: AdjustableVital, decayType?: 'linear' | 'exponential'): number {
  if (decayType === 'exponential' && vital === 'spo2' && state.spo2 < 90) {
    return modifier * 2;
  }

  return modifier;
}

function getPriority(definition: InterventionDefinition | undefined): number {
  return definition?.priority ?? 0;
}

function getConditionValue(state: PatientState, vital: PatientField): string | number | boolean | undefined {
  if (vital === 'bp') {
    return parseBP(state.bp).sys;
  }

  return state[vital];
}

function matchesCondition(state: PatientState, elapsedSec: number, condition: Condition): boolean {
  if (condition.elapsedSecGte !== undefined && elapsedSec < condition.elapsedSecGte) {
    return false;
  }

  if (!condition.vital) {
    return condition.elapsedSecGte !== undefined;
  }

  const current = getConditionValue(state, condition.vital);

  if (condition.equals !== undefined && current !== condition.equals) {
    return false;
  }

  if (condition.min !== undefined) {
    if (typeof current !== 'number' || current < condition.min) {
      return false;
    }
  }

  if (condition.max !== undefined) {
    if (typeof current !== 'number' || current > condition.max) {
      return false;
    }
  }

  return condition.equals !== undefined || condition.min !== undefined || condition.max !== undefined || condition.elapsedSecGte !== undefined;
}

function updateFailureHolds(
  holds: Record<string, number>,
  conditions: Condition[],
  state: PatientState,
  elapsedSec: number,
): { triggered: boolean; nextHolds: Record<string, number> } {
  const nextHolds = { ...holds };

  for (const [index, condition] of conditions.entries()) {
    const key = `failure-${index}`;
    const met = matchesCondition(state, elapsedSec, condition);

    if (!met) {
      delete nextHolds[key];
      continue;
    }

    if (condition.durationSec === undefined) {
      return { triggered: true, nextHolds };
    }

    const holdStart = nextHolds[key] ?? Math.max(0, elapsedSec - SIMULATION_INTERVAL_SEC);
    nextHolds[key] = holdStart;

    if (elapsedSec - holdStart >= condition.durationSec) {
      return { triggered: true, nextHolds };
    }
  }

  return { triggered: false, nextHolds };
}

function updateSuccessHolds(
  holds: Record<string, number>,
  conditions: Condition[],
  state: PatientState,
  elapsedSec: number,
): { satisfied: boolean; nextHolds: Record<string, number> } {
  const nextHolds = { ...holds };
  let allSatisfied = conditions.length > 0;

  for (const [index, condition] of conditions.entries()) {
    const key = `success-${index}`;
    const met = matchesCondition(state, elapsedSec, condition);

    if (!met) {
      delete nextHolds[key];
      allSatisfied = false;
      continue;
    }

    if (condition.durationSec === undefined) {
      delete nextHolds[key];
      continue;
    }

    const holdStart = nextHolds[key] ?? Math.max(0, elapsedSec - SIMULATION_INTERVAL_SEC);
    nextHolds[key] = holdStart;

    if (elapsedSec - holdStart < condition.durationSec) {
      allSatisfied = false;
    }
  }

  return { satisfied: allSatisfied, nextHolds };
}

function applyScheduledStateChanges(
  baseState: PatientState,
  scheduledStateChanges: ScheduledStateChange[] | undefined,
  elapsedSec: number,
  appliedChanges: Record<string, true>,
): {
  nextBaseState: PatientState;
  nextAppliedChanges: Record<string, true>;
  events: EngineEvent[];
} {
  if (!scheduledStateChanges || scheduledStateChanges.length === 0) {
    return { nextBaseState: baseState, nextAppliedChanges: appliedChanges, events: [] };
  }

  let nextBaseState = baseState;
  const nextAppliedChanges = { ...appliedChanges };
  const events: EngineEvent[] = [];

  for (const change of scheduledStateChanges) {
    if (nextAppliedChanges[change.id] || elapsedSec < change.atSec) {
      continue;
    }

    nextBaseState = clampState({ ...nextBaseState, ...change.changes });
    nextAppliedChanges[change.id] = true;
    events.push({
      type: 'state_change',
      message: change.message,
      changes: change.changes,
    });
  }

  return { nextBaseState, nextAppliedChanges, events };
}

function applyTimedModifiers(
  state: PatientState,
  lastApplied: Record<string, number>,
  elapsedSec: number,
  items: Array<{
    key: string;
    modifier: number;
    intervalSec: number;
    vital: AdjustableVital;
    decayType?: 'linear' | 'exponential';
    initialAppliedAt: number;
  }>,
): { nextState: PatientState; nextLastApplied: Record<string, number> } {
  let nextState = state;
  const nextLastApplied = { ...lastApplied };

  for (const item of items) {
    const lastAppliedAt = nextLastApplied[item.key] ?? item.initialAppliedAt;
    const elapsedSinceLastApply = elapsedSec - lastAppliedAt;
    const applications = Math.floor(elapsedSinceLastApply / item.intervalSec);

    if (applications <= 0) {
      continue;
    }

    for (let index = 0; index < applications; index += 1) {
      const adjustedModifier = resolveDecayModifier(nextState, item.modifier, item.vital, item.decayType);
      nextState = applyVitalModifier(nextState, item.vital, adjustedModifier);
    }

    nextLastApplied[item.key] = lastAppliedAt + applications * item.intervalSec;
  }

  return { nextState, nextLastApplied };
}

function buildDisplayState(
  baseState: PatientState,
  scenario: Scenario,
  activeInterventions: ActiveIntervention[],
): PatientState {
  let renderState = { ...baseState };
  const overriddenFields = new Set<PatientField>();
  const sortedInterventions = [...activeInterventions].sort(
    (left, right) => getPriority(scenario.interventions[right.id]) - getPriority(scenario.interventions[left.id]),
  );

  for (const intervention of sortedInterventions) {
    const overrides = scenario.interventions[intervention.id]?.state_overrides;
    if (!overrides) {
      continue;
    }

    for (const [field, value] of Object.entries(overrides) as Array<[PatientField, PatientState[PatientField]]>) {
      if (value === undefined || overriddenFields.has(field)) {
        continue;
      }

      renderState = { ...renderState, [field]: value };
      overriddenFields.add(field);
    }
  }

  if (!renderState.pulsePresent) {
    if (!overriddenFields.has('hr')) {
      renderState.hr = 0;
    }

    if (!overriddenFields.has('bp')) {
      renderState.bp = '0/0';
    }
  }

  return clampState(renderState);
}

function makeInitialState(scenario: Scenario | null): EngineState {
  if (!scenario) {
    return {
      baseState: null,
      displayState: null,
      elapsedSec: 0,
      activeInterventions: [],
      status: 'running',
      sequenceIndex: 0,
      lastApplied: {},
      successHoldStarts: {},
      failureHoldStarts: {},
      appliedScheduledChanges: {},
      eventQueue: [],
    };
  }

  return {
    baseState: scenario.initial_state,
    displayState: scenario.initial_state,
    elapsedSec: 0,
    activeInterventions: [],
    status: 'running',
    sequenceIndex: 0,
    lastApplied: {},
    successHoldStarts: {},
    failureHoldStarts: {},
    appliedScheduledChanges: {},
    eventQueue: [
      {
        type: 'start',
        message: `Scenario "${scenario.title}" started.`,
        snapshot: scenario.initial_state,
      },
    ],
  };
}

export type EngineStatus = 'running' | 'success' | 'failed';

interface EngineState {
  baseState: PatientState | null;
  displayState: PatientState | null;
  elapsedSec: number;
  activeInterventions: ActiveIntervention[];
  status: EngineStatus;
  sequenceIndex: number;
  lastApplied: Record<string, number>;
  successHoldStarts: Record<string, number>;
  failureHoldStarts: Record<string, number>;
  appliedScheduledChanges: Record<string, true>;
  eventQueue: EngineEvent[];
}

type EngineAction =
  | { type: 'reset'; scenario: Scenario | null }
  | { type: 'tick'; scenario: Scenario }
  | { type: 'apply_intervention'; scenario: Scenario; interventionId: string; roll: number };

function engineReducer(state: EngineState, action: EngineAction): EngineState {
  if (action.type === 'reset') {
    return makeInitialState(action.scenario);
  }

  if (action.type === 'apply_intervention') {
    const { scenario, interventionId, roll } = action;

    if (!state.baseState || !state.displayState) {
      return state;
    }

    if (state.status !== 'running') {
      return {
        ...state,
        eventQueue: [
          ...state.eventQueue,
          {
            type: 'intervention',
            intervention_id: interventionId,
            rejected: true,
            message: 'Scenario is no longer active. No interventions can be applied.',
          },
        ],
      };
    }

    const definition = scenario.interventions[interventionId];
    if (!definition) {
      return {
        ...state,
        eventQueue: [
          ...state.eventQueue,
          {
            type: 'intervention',
            intervention_id: interventionId,
            rejected: true,
            message: 'Protocol Deviation: This action is not applicable or effective in the current scenario.',
          },
        ],
      };
    }

    if (scenario.expected_sequence && state.sequenceIndex < scenario.expected_sequence.length) {
      const expectedId = scenario.expected_sequence[state.sequenceIndex];
      if (interventionId !== expectedId) {
        const expectedLabel = expectedId
          ? expectedId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
          : null;
        const hintSuffix = expectedLabel
          ? ` The next expected step is: ${expectedLabel}.`
          : '';
        return {
          ...state,
          eventQueue: [
            ...state.eventQueue,
            {
              type: 'intervention',
              intervention_id: interventionId,
              rejected: true,
              message: `Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol.${hintSuffix}`,
            },
          ],
        };
      }
    }

    if (definition.requires_rhythm && !definition.requires_rhythm.includes(state.displayState.rhythm)) {
      return {
        ...state,
        eventQueue: [
          ...state.eventQueue,
          {
            type: 'intervention',
            intervention_id: interventionId,
            rejected: true,
            message: `Cannot perform: requires ${definition.requires_rhythm.join(' or ')} rhythm. Current rhythm is ${state.displayState.rhythm}.`,
          },
        ],
      };
    }

    const existingActiveIntervention = state.activeInterventions.find(
      (intervention) => intervention.id === interventionId,
    );

    // Guard A: permanent action (no duration) — already applied, cannot repeat
    if (existingActiveIntervention && existingActiveIntervention.duration_sec === undefined) {
      return {
        ...state,
        eventQueue: [
          ...state.eventQueue,
          {
            type: 'intervention',
            intervention_id: interventionId,
            rejected: true,
            message: `Already applied and active for this scenario.`,
          },
        ],
      };
    }

    // Guard B: timed action still on cooldown
    if (
      existingActiveIntervention &&
      existingActiveIntervention.duration_sec !== undefined &&
      state.elapsedSec - existingActiveIntervention.start_time < existingActiveIntervention.duration_sec
    ) {
      const remainingSec = Math.ceil(
        existingActiveIntervention.duration_sec - (state.elapsedSec - existingActiveIntervention.start_time),
      );
      const nextTickSec = remainingSec + 3;
      return {
        ...state,
        eventQueue: [
          ...state.eventQueue,
          {
            type: 'intervention',
            intervention_id: interventionId,
            rejected: true,
            message: `Already in progress. Available again in approximately ${remainingSec}–${nextTickSec}s.`,
          },
        ],
      };
    }

    const nextSequenceIndex =
      scenario.expected_sequence && state.sequenceIndex < scenario.expected_sequence.length
        ? state.sequenceIndex + 1
        : state.sequenceIndex;

    const nextActiveInterventions = [
      ...state.activeInterventions.filter((intervention) => intervention.id !== interventionId),
      {
        id: interventionId,
        start_time: state.elapsedSec,
        duration_sec: definition.duration_sec,
      },
    ];

    if (definition.success_chance !== undefined && definition.success_state) {
      if (roll <= definition.success_chance) {
        const nextBaseState = clampState({ ...state.baseState, ...definition.success_state });
        return {
          ...state,
          baseState: nextBaseState,
          displayState: buildDisplayState(nextBaseState, scenario, nextActiveInterventions),
          sequenceIndex: nextSequenceIndex,
          activeInterventions: nextActiveInterventions,
          eventQueue: [
            ...state.eventQueue,
            {
              type: 'intervention',
              intervention_id: interventionId,
              rejected: false,
              message: 'Successful administration.',
            },
          ],
        };
      }

      return {
        ...state,
        sequenceIndex: nextSequenceIndex,
        activeInterventions: nextActiveInterventions,
        displayState: buildDisplayState(state.baseState, scenario, nextActiveInterventions),
        eventQueue: [
          ...state.eventQueue,
          {
            type: 'intervention',
            intervention_id: interventionId,
            rejected: false,
            message: 'Administered but ineffective.',
          },
        ],
      };
    }

    return {
      ...state,
      activeInterventions: nextActiveInterventions,
      displayState: buildDisplayState(state.baseState, scenario, nextActiveInterventions),
      sequenceIndex: nextSequenceIndex,
      eventQueue: [
        ...state.eventQueue,
        {
          type: 'intervention',
          intervention_id: interventionId,
          rejected: false,
          message: 'Treatment started.',
        },
      ],
    };
  }

  if (!state.baseState || !state.displayState || state.status !== 'running') {
    return state;
  }

  const nextElapsedSec = state.elapsedSec + SIMULATION_INTERVAL_SEC;
  const nextActiveInterventions = state.activeInterventions.filter(
    (intervention) => intervention.duration_sec === undefined || nextElapsedSec - intervention.start_time < intervention.duration_sec,
  );

  let nextBaseState = state.baseState;
  let nextLastApplied = state.lastApplied;
  const events: EngineEvent[] = [...state.eventQueue];

  const scheduledChanges = applyScheduledStateChanges(
    nextBaseState,
    action.scenario.scheduledStateChanges,
    nextElapsedSec,
    state.appliedScheduledChanges,
  );
  nextBaseState = scheduledChanges.nextBaseState;
  events.push(...scheduledChanges.events);

  const interventionModifiers = nextActiveInterventions.flatMap((intervention) => {
    const definition = action.scenario.interventions[intervention.id];
    return (definition?.rate_modifiers ?? []).map((modifier, index) => ({
      key: `intervention-${intervention.id}-${index}`,
      modifier: modifier.modifier,
      intervalSec: modifier.interval_sec,
      vital: modifier.vital,
      decayType: modifier.decay_type,
      initialAppliedAt: intervention.start_time,
    }));
  });

  const baselineModifiers = action.scenario.baseline_progressions.map((progression, index) => ({
    key: `baseline-${index}`,
    modifier: progression.modifier,
    intervalSec: progression.interval_sec,
    vital: progression.vital,
    decayType: progression.decay_type,
    initialAppliedAt: 0,
  }));

  const timedModifiers = applyTimedModifiers(
    nextBaseState,
    nextLastApplied,
    nextElapsedSec,
    [...interventionModifiers, ...baselineModifiers],
  );
  nextBaseState = timedModifiers.nextState;
  nextLastApplied = timedModifiers.nextLastApplied;

  if (!nextBaseState.pulsePresent) {
    nextBaseState = {
      ...nextBaseState,
      hr: 0,
      bp: '0/0',
      spo2: Math.max(0, nextBaseState.spo2 - 3),
    };
  }

  nextBaseState = clampState(nextBaseState);
  const nextDisplayState = buildDisplayState(nextBaseState, action.scenario, nextActiveInterventions);

  const failureResult = updateFailureHolds(
    state.failureHoldStarts,
    action.scenario.failure_conditions,
    nextDisplayState,
    nextElapsedSec,
  );

  if (failureResult.triggered) {
    return {
      ...state,
      baseState: nextBaseState,
      displayState: nextDisplayState,
      elapsedSec: nextElapsedSec,
      activeInterventions: nextActiveInterventions,
      lastApplied: nextLastApplied,
      appliedScheduledChanges: scheduledChanges.nextAppliedChanges,
      failureHoldStarts: failureResult.nextHolds,
      status: 'failed',
      eventQueue: [
        ...events,
        {
          type: 'completion',
          outcome: 'failed',
          message: 'Scenario failed based on failure conditions.',
        },
      ],
    };
  }

  const successResult = updateSuccessHolds(
    state.successHoldStarts,
    action.scenario.success_conditions,
    nextDisplayState,
    nextElapsedSec,
  );

  if (successResult.satisfied) {
    return {
      ...state,
      baseState: nextBaseState,
      displayState: nextDisplayState,
      elapsedSec: nextElapsedSec,
      activeInterventions: nextActiveInterventions,
      lastApplied: nextLastApplied,
      appliedScheduledChanges: scheduledChanges.nextAppliedChanges,
      successHoldStarts: successResult.nextHolds,
      failureHoldStarts: failureResult.nextHolds,
      status: 'success',
      eventQueue: [
        ...events,
        {
          type: 'completion',
          outcome: 'success',
          message: 'Scenario success. Patient stabilized.',
        },
      ],
    };
  }

  return {
    ...state,
    baseState: nextBaseState,
    displayState: nextDisplayState,
    elapsedSec: nextElapsedSec,
    activeInterventions: nextActiveInterventions,
    lastApplied: nextLastApplied,
    successHoldStarts: successResult.nextHolds,
    failureHoldStarts: failureResult.nextHolds,
    appliedScheduledChanges: scheduledChanges.nextAppliedChanges,
    eventQueue: events,
  };
}

export function useScenarioEngine(scenario: Scenario | null, onEvent?: (event: EngineEvent) => void) {
  const [state, dispatch] = useReducer(engineReducer, scenario, makeInitialState);
  const previousScenarioRef = useRef<Scenario | null>(scenario);
  const flushedEventCountRef = useRef(0);
  const freezeEngineRef = useRef(isEngineFrozenForE2E());

  useEffect(() => {
    if (previousScenarioRef.current === scenario) {
      return;
    }

    previousScenarioRef.current = scenario;
    dispatch({ type: 'reset', scenario });
  }, [scenario]);

  useEffect(() => {
    if (!scenario || state.status !== 'running' || freezeEngineRef.current) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      dispatch({ type: 'tick', scenario });
    }, SIMULATION_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [scenario, state.status]);

  useEffect(() => {
    if (state.eventQueue.length < flushedEventCountRef.current) {
      flushedEventCountRef.current = 0;
    }

    if (state.eventQueue.length === 0 || flushedEventCountRef.current === state.eventQueue.length) {
      return undefined;
    }

    state.eventQueue.slice(flushedEventCountRef.current).forEach((event) => {
      onEvent?.(event);
    });
    flushedEventCountRef.current = state.eventQueue.length;

    return undefined;
  }, [onEvent, state.eventQueue]);

  const applyIntervention = useCallback(
    (interventionId: string) => {
      if (!scenario) {
        return;
      }

      dispatch({ type: 'apply_intervention', scenario, interventionId, roll: Math.random() });
    },
    [scenario],
  );

  return {
    state: state.displayState,
    status: state.status,
    elapsedSec: state.elapsedSec,
    applyIntervention,
    activeInterventions: state.activeInterventions,
    sequenceIndex: state.sequenceIndex,
    successHoldStarts: state.successHoldStarts,
    failureHoldStarts: state.failureHoldStarts,
  };
}
