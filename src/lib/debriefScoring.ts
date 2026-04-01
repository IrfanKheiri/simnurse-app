import type { ScenarioCompletionPolicy } from '../types/scenario';

export interface DebriefActionLike {
  isCorrect: boolean;
  isDuplicate?: boolean;
}

export type DebriefOutcome = 'success' | 'failed' | 'manual';

export interface DebriefScenarioLike {
  expected_sequence?: string[];
  meta?: {
    completionPolicy?: ScenarioCompletionPolicy;
  };
}

export interface DeriveDebriefSummaryInput {
  actions: DebriefActionLike[];
  outcome: DebriefOutcome;
  scenario: DebriefScenarioLike | null;
  completedRequiredSteps: number;
  requiredStepCount: number;
}

export interface DebriefSummary {
  score: number;
  clinicalConclusion: string;
  correctActions: number;
  rejectedActions: number;
  sequenceErrors: number;
  remainingRequiredSteps: number;
  omissionCount: number;
  strictSequenceIncomplete: boolean;
}

function usesStrictSequenceDebriefPolicy(
  scenario: DebriefScenarioLike | null,
  requiredStepCount: number,
): boolean {
  return scenario?.meta?.completionPolicy === 'strict_sequence_required'
    && requiredStepCount > 0;
}

function buildClinicalConclusion({
  actionCount,
  correctActions,
  rejectedActions,
  outcome,
  strictSequenceIncomplete,
}: {
  actionCount: number;
  correctActions: number;
  rejectedActions: number;
  outcome: DebriefOutcome;
  strictSequenceIncomplete: boolean;
}): string {
  if (actionCount === 0) {
    if (strictSequenceIncomplete && outcome === 'failed') {
      return 'The patient deteriorated before the full required sequence was completed. No interventions were recorded during this scenario.';
    }

    if (strictSequenceIncomplete && outcome === 'manual') {
      return 'The scenario was ended before the full required sequence was completed. No interventions were recorded during this scenario.';
    }

    return outcome === 'manual'
      ? 'The scenario was ended manually before any interventions were recorded.'
      : 'No interventions were recorded during this scenario.';
  }

  if (outcome === 'success') {
    return `The patient was stabilized after ${actionCount} interventions. ${correctActions} intervention(s) were clinically appropriate.${rejectedActions > 0 ? ` ${rejectedActions} intervention(s) were rejected and should be reviewed.` : ''}`;
  }

  if (outcome === 'failed') {
    if (strictSequenceIncomplete) {
      return `The patient deteriorated before the full required sequence was completed despite ${actionCount} recorded interventions. ${correctActions} intervention(s) were appropriate.${rejectedActions > 0 ? ` ${rejectedActions} intervention(s) were rejected and likely delayed recovery.` : ''}`;
    }

    return `The patient deteriorated despite ${actionCount} recorded interventions. ${correctActions} intervention(s) were appropriate.${rejectedActions > 0 ? ` ${rejectedActions} intervention(s) were rejected and likely delayed recovery.` : ''}`;
  }

  if (strictSequenceIncomplete) {
    return `The scenario was ended before the full required sequence was completed after ${actionCount} recorded interventions. ${correctActions} intervention(s) were appropriate. Review the sequence before attempting the case again.`;
  }

  return `The scenario ended manually after ${actionCount} recorded interventions. ${correctActions} intervention(s) were appropriate. Review the sequence before attempting the case again.`;
}

export function deriveDebriefSummary({
  actions,
  outcome,
  scenario,
  completedRequiredSteps,
  requiredStepCount,
}: DeriveDebriefSummaryInput): DebriefSummary {
  const correctActions = actions.filter((action) => action.isCorrect).length;
  const rejectedActions = actions.length - correctActions;
  const sequenceErrors = actions.filter((action) => !action.isCorrect && !action.isDuplicate).length;

  const remainingRequiredSteps = usesStrictSequenceDebriefPolicy(scenario, requiredStepCount)
    ? Math.max(0, requiredStepCount - completedRequiredSteps)
    : 0;
  const strictSequenceIncomplete = outcome !== 'success' && remainingRequiredSteps > 0;
  const omissionCount = strictSequenceIncomplete ? remainingRequiredSteps : 0;

  const totalScoredActions = correctActions + sequenceErrors + omissionCount;
  const score = totalScoredActions === 0
    ? 0
    : Math.round((correctActions / totalScoredActions) * 100);

  return {
    score,
    clinicalConclusion: buildClinicalConclusion({
      actionCount: actions.length,
      correctActions,
      rejectedActions,
      outcome,
      strictSequenceIncomplete,
    }),
    correctActions,
    rejectedActions,
    sequenceErrors,
    remainingRequiredSteps,
    omissionCount,
    strictSequenceIncomplete,
  };
}
