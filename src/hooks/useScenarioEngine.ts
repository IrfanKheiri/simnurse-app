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
  ScenarioCompletionPolicy,
  ScenarioProtocol,
  ScenarioProtocolRouteKind,
  ScenarioProtocolSecondaryRoute,
  ScenarioProtocolStep,
  ScheduledStateChange,
} from '../types/scenario';

const SIMULATION_INTERVAL_MS = 3000;
const SIMULATION_INTERVAL_SEC = SIMULATION_INTERVAL_MS / 1000;
const PRIMARY_PROTOCOL_ROUTE_ID = 'primary';

interface NormalizedProtocolStep {
  interventionId: string;
  required: boolean;
}

interface NormalizedProtocolRoute {
  id: string;
  kind: ScenarioProtocolRouteKind;
  label?: string;
  steps: NormalizedProtocolStep[];
  activationInterventionIds: string[];
  activationStateChangeIds: string[];
  requiredOnActivation: boolean;
}

interface NormalizedProtocol {
  primaryRouteId: string;
  routes: NormalizedProtocolRoute[];
}

interface ProtocolRuntimeState {
  routeStepIndexes: Record<string, number>;
  activeRouteId: string | null;
  activatedRouteIds: Record<string, true>;
  completedRouteIds: Record<string, true>;
  completedInterventionIds: Record<string, true>;
}

interface ProtocolRouteState {
  routeId: string;
  kind: ScenarioProtocolRouteKind;
  label?: string;
  isActivated: boolean;
  isCompleted: boolean;
  isRequired: boolean;
  nextStepIndex: number;
  nextInterventionId: string | null;
  completedRequiredSteps: number;
  requiredStepCount: number;
}

interface ProtocolProgressState {
  completedRequiredSteps: number;
  requiredStepCount: number;
  availableInterventionIds: string[];
  activeRouteId: string | null;
  activatedRouteIds: string[];
  completedRouteIds: string[];
  routeStates: Record<string, ProtocolRouteState>;
}

function createEmptyProtocolRuntimeState(): ProtocolRuntimeState {
  return {
    routeStepIndexes: {},
    activeRouteId: null,
    activatedRouteIds: {},
    completedRouteIds: {},
    completedInterventionIds: {},
  };
}

function createEmptyProtocolProgressState(): ProtocolProgressState {
  return {
    completedRequiredSteps: 0,
    requiredStepCount: 0,
    availableInterventionIds: [],
    activeRouteId: null,
    activatedRouteIds: [],
    completedRouteIds: [],
    routeStates: {},
  };
}

function formatInterventionLabel(interventionId: string): string {
  return interventionId.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function normalizeProtocolStep(step: string | ScenarioProtocolStep): NormalizedProtocolStep {
  if (typeof step === 'string') {
    return {
      interventionId: step,
      required: true,
    };
  }

  return {
    interventionId: step.intervention_id,
    required: step.required ?? true,
  };
}

function normalizeSecondaryRoutes(
  routes: ScenarioProtocolSecondaryRoute[] | undefined,
  kind: Exclude<ScenarioProtocolRouteKind, 'primary'>,
): NormalizedProtocolRoute[] {
  return (routes ?? []).map((route) => ({
    id: route.route_id,
    kind,
    label: route.label,
    steps: route.steps.map(normalizeProtocolStep),
    activationInterventionIds: toArray(route.activation?.after_intervention),
    activationStateChangeIds: toArray(route.activation?.after_state_change),
    requiredOnActivation: route.required ?? (kind === 'branch'),
  }));
}

function normalizeScenarioProtocol(scenario: Scenario): NormalizedProtocol | null {
  const legacySequence = scenario.expected_sequence ?? [];
  const routeProtocol: ScenarioProtocol | undefined = scenario.protocol;
  const hasRouteProtocol = routeProtocol !== undefined;

  if (!hasRouteProtocol && legacySequence.length === 0) {
    return null;
  }

  const primaryRoute: NormalizedProtocolRoute = routeProtocol
    ? {
        id: routeProtocol.primary.route_id ?? PRIMARY_PROTOCOL_ROUTE_ID,
        kind: 'primary',
        label: routeProtocol.primary.label,
        steps: routeProtocol.primary.steps.map(normalizeProtocolStep),
        activationInterventionIds: [],
        activationStateChangeIds: [],
        requiredOnActivation: true,
      }
    : {
        id: PRIMARY_PROTOCOL_ROUTE_ID,
        kind: 'primary',
        steps: legacySequence.map(normalizeProtocolStep),
        activationInterventionIds: [],
        activationStateChangeIds: [],
        requiredOnActivation: true,
      };

  return {
    primaryRouteId: primaryRoute.id,
    routes: [
      primaryRoute,
      ...normalizeSecondaryRoutes(routeProtocol?.branches, 'branch'),
      ...normalizeSecondaryRoutes(routeProtocol?.rescues, 'rescue'),
    ],
  };
}

function resolveActiveRouteId(protocol: NormalizedProtocol, runtimeState: ProtocolRuntimeState): string | null {
  const candidateRouteIds = protocol.routes
    .filter((route) => runtimeState.activatedRouteIds[route.id] && (runtimeState.routeStepIndexes[route.id] ?? 0) < route.steps.length)
    .map((route) => route.id);

  if (candidateRouteIds.length === 0) {
    return null;
  }

  if (runtimeState.activeRouteId && candidateRouteIds.includes(runtimeState.activeRouteId)) {
    return runtimeState.activeRouteId;
  }

  return candidateRouteIds.find((routeId) => routeId === protocol.primaryRouteId) ?? candidateRouteIds[0];
}

function synchronizeProtocolRuntimeState(
  protocol: NormalizedProtocol | null,
  runtimeState: ProtocolRuntimeState,
  appliedStateChangeIds: Record<string, true> = {},
): ProtocolRuntimeState {
  if (!protocol) {
    return createEmptyProtocolRuntimeState();
  }

  const nextRuntimeState: ProtocolRuntimeState = {
    routeStepIndexes: { ...runtimeState.routeStepIndexes },
    activeRouteId: runtimeState.activeRouteId,
    activatedRouteIds: { ...runtimeState.activatedRouteIds },
    completedRouteIds: { ...runtimeState.completedRouteIds },
    completedInterventionIds: { ...runtimeState.completedInterventionIds },
  };

  for (const route of protocol.routes) {
    if (nextRuntimeState.routeStepIndexes[route.id] === undefined) {
      nextRuntimeState.routeStepIndexes[route.id] = 0;
    }

    const hasExplicitActivation = route.activationInterventionIds.length > 0
      || route.activationStateChangeIds.length > 0;
    const shouldActivate = route.id === protocol.primaryRouteId
      || !hasExplicitActivation
      || route.activationInterventionIds.some((interventionId) => nextRuntimeState.completedInterventionIds[interventionId])
      || route.activationStateChangeIds.some((stateChangeId) => appliedStateChangeIds[stateChangeId]);

    if (shouldActivate) {
      nextRuntimeState.activatedRouteIds[route.id] = true;
    }

    const isCompleted = nextRuntimeState.activatedRouteIds[route.id]
      && nextRuntimeState.routeStepIndexes[route.id] >= route.steps.length;

    if (isCompleted) {
      nextRuntimeState.completedRouteIds[route.id] = true;
    } else {
      delete nextRuntimeState.completedRouteIds[route.id];
    }
  }

  nextRuntimeState.activeRouteId = resolveActiveRouteId(protocol, nextRuntimeState);
  return nextRuntimeState;
}

function makeInitialProtocolRuntimeState(protocol: NormalizedProtocol | null): ProtocolRuntimeState {
  if (!protocol) {
    return createEmptyProtocolRuntimeState();
  }

  const initialRuntimeState: ProtocolRuntimeState = {
    routeStepIndexes: Object.fromEntries(protocol.routes.map((route) => [route.id, 0])),
    activeRouteId: protocol.primaryRouteId,
    activatedRouteIds: { [protocol.primaryRouteId]: true },
    completedRouteIds: {},
    completedInterventionIds: {},
  };

  return synchronizeProtocolRuntimeState(protocol, initialRuntimeState);
}

function buildInactiveRescueRouteMessage(): string {
  return 'Protocol Deviation: Rescue action locked. This action cannot be used until its rescue activation condition is met.';
}

function isInactiveRescueInterventionLocked(
  protocol: NormalizedProtocol | null,
  runtimeState: ProtocolRuntimeState,
  interventionId: string,
): boolean {
  if (!protocol) {
    return false;
  }

  const appearsInNonRescueRoute = protocol.routes.some(
    (route) => route.kind !== 'rescue' && route.steps.some((step) => step.interventionId === interventionId),
  );

  if (appearsInNonRescueRoute) {
    return false;
  }

  const rescueRoutesContainingStep = protocol.routes.filter(
    (route) => route.kind === 'rescue' && route.steps.some((step) => step.interventionId === interventionId),
  );

  if (rescueRoutesContainingStep.length === 0) {
    return false;
  }

  const isCurrentlyAvailable = protocol.routes.some((route) => {
    if (!runtimeState.activatedRouteIds[route.id]) {
      return false;
    }

    const nextStepIndex = runtimeState.routeStepIndexes[route.id] ?? 0;
    return route.steps[nextStepIndex]?.interventionId === interventionId;
  });

  if (isCurrentlyAvailable) {
    return false;
  }

  return rescueRoutesContainingStep.some((route) => !runtimeState.activatedRouteIds[route.id]);
}

function deriveProtocolProgressState(
  protocol: NormalizedProtocol | null,
  runtimeState: ProtocolRuntimeState,
): ProtocolProgressState {
  if (!protocol) {
    return createEmptyProtocolProgressState();
  }

  const routeStates: Record<string, ProtocolRouteState> = {};
  const availableInterventionIds: string[] = [];
  let completedRequiredSteps = 0;
  let requiredStepCount = 0;

  for (const route of protocol.routes) {
    const nextStepIndex = runtimeState.routeStepIndexes[route.id] ?? 0;
    const isActivated = Boolean(runtimeState.activatedRouteIds[route.id]);
    const isCompleted = isActivated && nextStepIndex >= route.steps.length;
    const isRequired = isActivated && route.requiredOnActivation;
    const requiredSteps = route.steps.filter((step) => step.required).length;
    const completedRequiredForRoute = isRequired
      ? route.steps.slice(0, Math.min(nextStepIndex, route.steps.length)).filter((step) => step.required).length
      : 0;
    const nextInterventionId = isActivated && !isCompleted
      ? route.steps[nextStepIndex]?.interventionId ?? null
      : null;

    if (isRequired) {
      requiredStepCount += requiredSteps;
      completedRequiredSteps += completedRequiredForRoute;
    }

    if (nextInterventionId && !availableInterventionIds.includes(nextInterventionId)) {
      availableInterventionIds.push(nextInterventionId);
    }

    routeStates[route.id] = {
      routeId: route.id,
      kind: route.kind,
      label: route.label,
      isActivated,
      isCompleted,
      isRequired,
      nextStepIndex,
      nextInterventionId,
      completedRequiredSteps: completedRequiredForRoute,
      requiredStepCount: isRequired ? requiredSteps : 0,
    };
  }

  return {
    completedRequiredSteps,
    requiredStepCount,
    availableInterventionIds,
    activeRouteId: resolveActiveRouteId(protocol, runtimeState),
    activatedRouteIds: protocol.routes
      .filter((route) => runtimeState.activatedRouteIds[route.id])
      .map((route) => route.id),
    completedRouteIds: protocol.routes
      .filter((route) => runtimeState.completedRouteIds[route.id])
      .map((route) => route.id),
    routeStates,
  };
}

function isInterventionPhysiologicallyAppropriate(
  definition: InterventionDefinition | undefined,
  displayState: PatientState,
): boolean {
  if (!definition) {
    return false;
  }

  if (definition.requires_rhythm && !definition.requires_rhythm.includes(displayState.rhythm)) {
    return false;
  }

  return true;
}

function deriveStateAwareAvailableInterventionIds(
  scenario: Scenario,
  availableInterventionIds: string[],
  displayState: PatientState,
): string[] {
  return availableInterventionIds.filter((interventionId) => isInterventionPhysiologicallyAppropriate(
    scenario.interventions[interventionId],
    displayState,
  ));
}

function buildSequenceDeviationMessage(validInterventionIds: string[]): string {
  if (validInterventionIds.length === 0) {
    return 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol.';
  }

  if (validInterventionIds.length === 1) {
    const expectedLabel = formatInterventionLabel(validInterventionIds[0]);
    return `Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol. The next expected step is: ${expectedLabel}.`;
  }

  const validLabels = validInterventionIds.map(formatInterventionLabel);
  const readableList = validLabels.length === 2
    ? `${validLabels[0]} or ${validLabels[1]}`
    : `${validLabels.slice(0, -1).join(', ')}, or ${validLabels[validLabels.length - 1]}`;

  return `Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol. Valid next steps are: ${readableList}.`;
}

function findMatchingRoute(
  protocol: NormalizedProtocol | null,
  runtimeState: ProtocolRuntimeState,
  interventionId: string,
): NormalizedProtocolRoute | null {
  if (!protocol) {
    return null;
  }

  return protocol.routes.find((route) => {
    if (!runtimeState.activatedRouteIds[route.id]) {
      return false;
    }

    const nextStepIndex = runtimeState.routeStepIndexes[route.id] ?? 0;
    return route.steps[nextStepIndex]?.interventionId === interventionId;
  }) ?? null;
}

function buildInterventionEvent(
  protocol: NormalizedProtocol | null,
  progressState: ProtocolProgressState,
  event: Omit<Extract<EngineEvent, { type: 'intervention' }>, 'type'>,
  stateAwareAvailableInterventionIds?: string[],
): Extract<EngineEvent, { type: 'intervention' }> {
  return {
    type: 'intervention',
    ...event,
    ...(protocol
      ? {
          available_intervention_ids: [...progressState.availableInterventionIds],
          ...(stateAwareAvailableInterventionIds !== undefined
            ? {
                state_aware_available_intervention_ids: [...stateAwareAvailableInterventionIds],
              }
            : {}),
          active_route_id: progressState.activeRouteId,
          activated_route_ids: [...progressState.activatedRouteIds],
        }
      : {}),
  };
}

function advanceProtocolRuntimeState(
  protocol: NormalizedProtocol | null,
  runtimeState: ProtocolRuntimeState,
  interventionId: string,
  appliedStateChangeIds: Record<string, true> = {},
): { runtimeState: ProtocolRuntimeState; progressState: ProtocolProgressState; advancedRouteId: string | null } {
  if (!protocol) {
    return {
      runtimeState: createEmptyProtocolRuntimeState(),
      progressState: createEmptyProtocolProgressState(),
      advancedRouteId: null,
    };
  }

  const nextRuntimeState: ProtocolRuntimeState = {
    routeStepIndexes: { ...runtimeState.routeStepIndexes },
    activeRouteId: runtimeState.activeRouteId,
    activatedRouteIds: { ...runtimeState.activatedRouteIds },
    completedRouteIds: { ...runtimeState.completedRouteIds },
    completedInterventionIds: {
      ...runtimeState.completedInterventionIds,
      [interventionId]: true,
    },
  };

  const matchingRoute = findMatchingRoute(protocol, nextRuntimeState, interventionId);

  if (matchingRoute) {
    nextRuntimeState.routeStepIndexes[matchingRoute.id] = Math.min(
      (nextRuntimeState.routeStepIndexes[matchingRoute.id] ?? 0) + 1,
      matchingRoute.steps.length,
    );
    nextRuntimeState.activeRouteId = matchingRoute.id;
  }

  const synchronizedRuntimeState = synchronizeProtocolRuntimeState(protocol, nextRuntimeState, appliedStateChangeIds);

  return {
    runtimeState: synchronizedRuntimeState,
    progressState: deriveProtocolProgressState(protocol, synchronizedRuntimeState),
    advancedRouteId: matchingRoute?.id ?? null,
  };
}

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

function getScenarioCompletionPolicy(scenario: Scenario): ScenarioCompletionPolicy {
  return scenario.meta?.completionPolicy ?? 'legacy_outcome_driven';
}

function requiresCompleteSequenceForSuccess(scenario: Scenario, requiredStepCount: number): boolean {
  return getScenarioCompletionPolicy(scenario) === 'strict_sequence_required'
    && requiredStepCount > 0;
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
  const protocol = scenario ? normalizeScenarioProtocol(scenario) : null;
  const protocolRuntime = makeInitialProtocolRuntimeState(protocol);
  const protocolProgress = deriveProtocolProgressState(protocol, protocolRuntime);

  if (!scenario) {
    return {
      baseState: null,
      displayState: null,
      elapsedSec: 0,
      activeInterventions: [],
      status: 'running',
      sequenceIndex: protocolProgress.completedRequiredSteps,
      protocolRuntime,
      protocolProgress,
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
    sequenceIndex: protocolProgress.completedRequiredSteps,
    protocolRuntime,
    protocolProgress,
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
  protocolRuntime: ProtocolRuntimeState;
  protocolProgress: ProtocolProgressState;
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
    const protocol = normalizeScenarioProtocol(scenario);
    const preAttemptProtocolProgress = state.protocolProgress;

    if (!state.baseState || !state.displayState) {
      return state;
    }

    const preAttemptStateAwareAvailableInterventionIds = deriveStateAwareAvailableInterventionIds(
      scenario,
      preAttemptProtocolProgress.availableInterventionIds,
      state.displayState,
    );

    if (state.status !== 'running') {
      return {
        ...state,
        eventQueue: [
          ...state.eventQueue,
          buildInterventionEvent(protocol, preAttemptProtocolProgress, {
            intervention_id: interventionId,
            rejected: true,
            message: 'Scenario is no longer active. No interventions can be applied.',
          }, preAttemptStateAwareAvailableInterventionIds),
        ],
      };
    }

    const definition = scenario.interventions[interventionId];
    if (!definition) {
      return {
        ...state,
        eventQueue: [
          ...state.eventQueue,
          buildInterventionEvent(protocol, preAttemptProtocolProgress, {
            intervention_id: interventionId,
            rejected: true,
            message: 'Protocol Deviation: This action is not applicable or effective in the current scenario.',
          }, preAttemptStateAwareAvailableInterventionIds),
        ],
      };
    }

    if (isInactiveRescueInterventionLocked(protocol, state.protocolRuntime, interventionId)) {
      return {
        ...state,
        eventQueue: [
          ...state.eventQueue,
          buildInterventionEvent(protocol, preAttemptProtocolProgress, {
            intervention_id: interventionId,
            rejected: true,
            message: buildInactiveRescueRouteMessage(),
          }, preAttemptStateAwareAvailableInterventionIds),
        ],
      };
    }

    if (
      state.protocolProgress.availableInterventionIds.length > 0
      && !state.protocolProgress.availableInterventionIds.includes(interventionId)
    ) {
      return {
        ...state,
        eventQueue: [
          ...state.eventQueue,
          buildInterventionEvent(protocol, preAttemptProtocolProgress, {
            intervention_id: interventionId,
            rejected: true,
            message: buildSequenceDeviationMessage(preAttemptProtocolProgress.availableInterventionIds),
          }, preAttemptStateAwareAvailableInterventionIds),
        ],
      };
    }

    if (!isInterventionPhysiologicallyAppropriate(definition, state.displayState)) {
      return {
        ...state,
        eventQueue: [
          ...state.eventQueue,
          buildInterventionEvent(protocol, preAttemptProtocolProgress, {
            intervention_id: interventionId,
            rejected: true,
            message: `Not appropriate for the current rhythm. Requires ${definition.requires_rhythm.join(' or ')}. Current rhythm: ${state.displayState.rhythm}.`,
          }, preAttemptStateAwareAvailableInterventionIds),
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
          buildInterventionEvent(protocol, preAttemptProtocolProgress, {
            intervention_id: interventionId,
            rejected: true,
            message: 'Already applied. This action stays in effect for this scenario.',
          }, preAttemptStateAwareAvailableInterventionIds),
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
          buildInterventionEvent(protocol, preAttemptProtocolProgress, {
            intervention_id: interventionId,
            rejected: true,
            message: `Already active. Only this action is temporarily unavailable. Repeat available in approximately ${remainingSec}–${nextTickSec}s.`,
          }, preAttemptStateAwareAvailableInterventionIds),
        ],
      };
    }

    const nextProtocolState = advanceProtocolRuntimeState(
      protocol,
      state.protocolRuntime,
      interventionId,
      state.appliedScheduledChanges,
    );
    const nextSequenceIndex = nextProtocolState.progressState.completedRequiredSteps;
    const requiredStepDelta = nextProtocolState.progressState.completedRequiredSteps - preAttemptProtocolProgress.completedRequiredSteps;

    const nextActiveInterventions = [
      ...state.activeInterventions.filter((intervention) => intervention.id !== interventionId),
      {
        id: interventionId,
        start_time: state.elapsedSec,
        duration_sec: definition.duration_sec,
      },
    ];

    if (definition.success_chance !== undefined && definition.success_state) {
      // ISSUE-23: short-circuit guaranteed success before invoking random roll comparison
      if (definition.success_chance >= 1 || roll <= definition.success_chance) {
        const nextBaseState = clampState({ ...state.baseState, ...definition.success_state });
        const nextDisplayState = buildDisplayState(nextBaseState, scenario, nextActiveInterventions);
        const nextStateAwareAvailableInterventionIds = deriveStateAwareAvailableInterventionIds(
          scenario,
          nextProtocolState.progressState.availableInterventionIds,
          nextDisplayState,
        );

        return {
          ...state,
          baseState: nextBaseState,
          displayState: nextDisplayState,
          sequenceIndex: nextSequenceIndex,
          protocolRuntime: nextProtocolState.runtimeState,
          protocolProgress: nextProtocolState.progressState,
          activeInterventions: nextActiveInterventions,
          eventQueue: [
            ...state.eventQueue,
            buildInterventionEvent(protocol, preAttemptProtocolProgress, {
              intervention_id: interventionId,
              rejected: false,
              message: 'Successful administration.',
              advanced_route_id: nextProtocolState.advancedRouteId,
              required_step_delta: requiredStepDelta,
            }, nextStateAwareAvailableInterventionIds),
          ],
        };
      }

      const nextDisplayState = buildDisplayState(state.baseState, scenario, nextActiveInterventions);
      const nextStateAwareAvailableInterventionIds = deriveStateAwareAvailableInterventionIds(
        scenario,
        nextProtocolState.progressState.availableInterventionIds,
        nextDisplayState,
      );

      return {
        ...state,
        sequenceIndex: nextSequenceIndex,
        protocolRuntime: nextProtocolState.runtimeState,
        protocolProgress: nextProtocolState.progressState,
        activeInterventions: nextActiveInterventions,
        displayState: nextDisplayState,
        eventQueue: [
          ...state.eventQueue,
          buildInterventionEvent(protocol, preAttemptProtocolProgress, {
            intervention_id: interventionId,
            rejected: false,
            message: 'Administered correctly — no immediate physiological response. Continue protocol.',
            advanced_route_id: nextProtocolState.advancedRouteId,
            required_step_delta: requiredStepDelta,
          }, nextStateAwareAvailableInterventionIds),
        ],
      };
    }

    const nextDisplayState = buildDisplayState(state.baseState, scenario, nextActiveInterventions);
    const nextStateAwareAvailableInterventionIds = deriveStateAwareAvailableInterventionIds(
      scenario,
      nextProtocolState.progressState.availableInterventionIds,
      nextDisplayState,
    );

    return {
      ...state,
      activeInterventions: nextActiveInterventions,
      displayState: nextDisplayState,
      sequenceIndex: nextSequenceIndex,
      protocolRuntime: nextProtocolState.runtimeState,
      protocolProgress: nextProtocolState.progressState,
      eventQueue: [
        ...state.eventQueue,
        buildInterventionEvent(protocol, preAttemptProtocolProgress, {
          intervention_id: interventionId,
          rejected: false,
          message: 'Treatment started.',
          advanced_route_id: nextProtocolState.advancedRouteId,
          required_step_delta: requiredStepDelta,
        }, nextStateAwareAvailableInterventionIds),
      ],
    };
  }

  // ISSUE-21: The setInterval callback does not close over `state`, so the
  // status guard below is the authoritative early-exit for any stale ticks
  // that fire after a status transition but before React cleans up the interval.
  if (!state.baseState || !state.displayState || state.status !== 'running') {
    return state;
  }

  const protocol = normalizeScenarioProtocol(action.scenario);

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

  const synchronizedProtocolRuntime = synchronizeProtocolRuntimeState(
    protocol,
    state.protocolRuntime,
    scheduledChanges.nextAppliedChanges,
  );
  const synchronizedProtocolProgress = deriveProtocolProgressState(protocol, synchronizedProtocolRuntime);

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

  // ISSUE-22: evaluate win/loss against baseState, not displayState, so that
  // state_overrides from active interventions cannot prematurely satisfy conditions.
  const failureResult = updateFailureHolds(
    state.failureHoldStarts,
    action.scenario.failure_conditions,
    nextBaseState,
    nextElapsedSec,
  );

  if (failureResult.triggered) {
    return {
      ...state,
      baseState: nextBaseState,
      displayState: nextDisplayState,
      elapsedSec: nextElapsedSec,
      activeInterventions: nextActiveInterventions,
      protocolRuntime: synchronizedProtocolRuntime,
      protocolProgress: synchronizedProtocolProgress,
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

  const strictSequenceRequired = requiresCompleteSequenceForSuccess(
    action.scenario,
    synchronizedProtocolProgress.requiredStepCount,
  );
  const sequenceComplete = synchronizedProtocolProgress.completedRequiredSteps >= synchronizedProtocolProgress.requiredStepCount;

  if (strictSequenceRequired && !sequenceComplete) {
    return {
      ...state,
      baseState: nextBaseState,
      displayState: nextDisplayState,
      elapsedSec: nextElapsedSec,
      activeInterventions: nextActiveInterventions,
      protocolRuntime: synchronizedProtocolRuntime,
      protocolProgress: synchronizedProtocolProgress,
      lastApplied: nextLastApplied,
      successHoldStarts: {},
      failureHoldStarts: failureResult.nextHolds,
      appliedScheduledChanges: scheduledChanges.nextAppliedChanges,
      eventQueue: events,
    };
  }

  const successResult = updateSuccessHolds(
    state.successHoldStarts,
    action.scenario.success_conditions,
    nextBaseState,
    nextElapsedSec,
  );

  if (successResult.satisfied) {
    return {
      ...state,
      baseState: nextBaseState,
      displayState: nextDisplayState,
      elapsedSec: nextElapsedSec,
      activeInterventions: nextActiveInterventions,
      protocolRuntime: synchronizedProtocolRuntime,
      protocolProgress: synchronizedProtocolProgress,
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
    protocolRuntime: synchronizedProtocolRuntime,
    protocolProgress: synchronizedProtocolProgress,
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
    completedRequiredSteps: state.protocolProgress.completedRequiredSteps,
    requiredStepCount: state.protocolProgress.requiredStepCount,
    availableInterventionIds: state.protocolProgress.availableInterventionIds,
    activeRouteId: state.protocolProgress.activeRouteId,
    activatedRouteIds: state.protocolProgress.activatedRouteIds,
    completedRouteIds: state.protocolProgress.completedRouteIds,
    successHoldStarts: state.successHoldStarts,
    failureHoldStarts: state.failureHoldStarts,
  };
}
