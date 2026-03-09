import type { Condition, PatientField, PatientState, Scenario } from '../types/scenario';

function parseSystolicBP(bpStr: string | undefined): number {
  if (!bpStr) {
    return 0;
  }

  return Number(bpStr.split('/')[0] || '0');
}

function getConditionValue(state: PatientState, vital: PatientField): string | number | boolean | undefined {
  if (vital === 'bp') {
    return parseSystolicBP(state.bp);
  }

  return state[vital];
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, value));
}

function getNumericProgress(current: number, initial: number, target: number): number {
  if (initial === target) {
    return current === target ? 100 : 0;
  }

  const rawProgress = ((current - initial) / (target - initial)) * 100;
  return clampPercent(rawProgress);
}

function getRangeProgress(current: number, initial: number, min: number, max: number): number {
  if (current >= min && current <= max) {
    return 100;
  }

  if (initial >= min && initial <= max) {
    return 0;
  }

  const targetBoundary = current < min ? min : max;
  return getNumericProgress(current, initial, targetBoundary);
}

function matchesImmediateCondition(state: PatientState, condition: Condition): boolean {
  if (!condition.vital) {
    return true;
  }

  const current = getConditionValue(state, condition.vital);

  if (condition.equals !== undefined && current !== condition.equals) {
    return false;
  }

  if (condition.min !== undefined && (typeof current !== 'number' || current < condition.min)) {
    return false;
  }

  if (condition.max !== undefined && (typeof current !== 'number' || current > condition.max)) {
    return false;
  }

  return true;
}

function getConditionProgress(
  scenario: Scenario,
  state: PatientState,
  elapsedSec: number,
  condition: Condition,
  conditionIndex: number,
  successHoldStarts: Record<string, number>,
): number {
  const immediateMatch = matchesImmediateCondition(state, condition);
  const holdKey = `success-${conditionIndex}`;

  if (condition.durationSec !== undefined) {
    if (!immediateMatch) {
      return 0;
    }

    const holdStart = successHoldStarts[holdKey];
    if (holdStart === undefined) {
      return 0;
    }

    return clampPercent(((elapsedSec - holdStart) / condition.durationSec) * 100);
  }

  if (condition.elapsedSecGte !== undefined && !condition.vital) {
    return clampPercent((elapsedSec / condition.elapsedSecGte) * 100);
  }

  if (!condition.vital) {
    return 0;
  }

  if (condition.equals !== undefined) {
    return immediateMatch ? 100 : 0;
  }

  const current = getConditionValue(state, condition.vital);
  const initial = getConditionValue(scenario.initial_state, condition.vital);

  if (typeof current !== 'number' || typeof initial !== 'number') {
    return 0;
  }

  if (condition.min !== undefined && condition.max !== undefined) {
    return getRangeProgress(current, initial, condition.min, condition.max);
  }

  if (condition.min !== undefined) {
    if (initial >= condition.min) {
      return 100;
    }

    return getNumericProgress(current, initial, condition.min);
  }

  if (condition.max !== undefined) {
    if (initial <= condition.max) {
      return 100;
    }

    return getNumericProgress(current, initial, condition.max);
  }

  if (condition.elapsedSecGte !== undefined) {
    return immediateMatch ? clampPercent((elapsedSec / condition.elapsedSecGte) * 100) : 0;
  }

  return 0;
}

export interface ScenarioProgressDetails {
  protocolScore: number;
  outcomeScore: number;
  totalScore: number;
}

export function calculateScenarioProgress(
  scenario: Scenario | null,
  state: PatientState | null,
  elapsedSec: number,
  sequenceIndex: number,
  successHoldStarts: Record<string, number>,
): ScenarioProgressDetails {
  if (!scenario || !state) {
    return {
      protocolScore: 0,
      outcomeScore: 0,
      totalScore: 0,
    };
  }

  const hasProtocol = Array.isArray(scenario.expected_sequence) && scenario.expected_sequence.length > 0;
  const hasOutcome = scenario.success_conditions.length > 0;

  const protocolWeight = hasProtocol && hasOutcome ? 0.5 : hasProtocol ? 1 : 0;
  const outcomeWeight = hasOutcome && hasProtocol ? 0.5 : hasOutcome ? 1 : 0;

  const protocolScore = hasProtocol
    ? clampPercent((sequenceIndex / scenario.expected_sequence!.length) * 100)
    : 0;

  const outcomeScore = hasOutcome
    ? scenario.success_conditions.reduce((sum, condition, index) => (
        sum + getConditionProgress(scenario, state, elapsedSec, condition, index, successHoldStarts)
      ), 0) / scenario.success_conditions.length
    : 0;

  return {
    protocolScore: Math.round(protocolScore),
    outcomeScore: Math.round(outcomeScore),
    totalScore: Math.round((protocolScore * protocolWeight) + (outcomeScore * outcomeWeight)),
  };
}
