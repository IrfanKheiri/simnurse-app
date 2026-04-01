import type { InterventionRejectionCategory } from '../types/scenario';

export interface DebriefFeedbackMeta {
  isDuplicate: boolean;
  categoryLabel?: string;
  comment: string;
  supportsExpectedAction: boolean;
  rejectionCategory?: InterventionRejectionCategory;
}

const SEQUENCE_DEVIATION_PREFIX = 'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol.';
const SEQUENCE_HINT_SUFFIX = /\s+The next expected step is: .*$/;
const MULTI_VALID_STEPS_HINT = /\s+Valid next steps are: .*$/;

function inferRejectionCategory(message: string): InterventionRejectionCategory | undefined {
  if (message.startsWith('Scenario is no longer active.')) {
    return 'scenario_inactive';
  }

  if (message.startsWith('Already active.') || message.startsWith('Already in progress.')) {
    return 'already_active';
  }

  if (message.startsWith('Already applied.')) {
    return 'already_applied';
  }

  if (message.startsWith('Protocol Deviation: Rescue action locked.')) {
    return 'rescue_locked';
  }

  if (message.startsWith('Protocol Deviation: Incorrect sequence')) {
    return 'sequence_deviation';
  }

  if (message.startsWith('Not appropriate for the current rhythm.') || message.startsWith('Cannot perform: requires')) {
    return 'rhythm_mismatch';
  }

  if (message.startsWith('Protocol Deviation: This action is not applicable')) {
    return 'not_applicable';
  }

  return undefined;
}

function buildSequenceComment(message: string): string {
  const multiValidStepsHint = message.match(MULTI_VALID_STEPS_HINT)?.[0];

  if (multiValidStepsHint) {
    return `This action was attempted before the next supported protocol step.${multiValidStepsHint}`;
  }

  if (message.startsWith(SEQUENCE_DEVIATION_PREFIX)) {
    return 'This action was attempted before the next supported protocol step.';
  }

  return message.replace(SEQUENCE_HINT_SUFFIX, '') || 'This action was attempted before the next supported protocol step.';
}

export function getDebriefFeedbackMeta(
  rejected: boolean,
  message: string,
  rejectionCategory?: InterventionRejectionCategory,
): DebriefFeedbackMeta {
  if (!rejected) {
    return {
      isDuplicate: false,
      comment: message,
      supportsExpectedAction: false,
    };
  }

  const resolvedCategory = rejectionCategory ?? inferRejectionCategory(message);

  if (resolvedCategory === 'already_active') {
    return {
      isDuplicate: true,
      categoryLabel: 'Repeated too early',
      comment: message.replace(
        /^Already (?:active|in progress)\. Only this action is temporarily unavailable\./,
        'This timed action was repeated before its active window ended. Only this same action was temporarily unavailable; other appropriate interventions could still overlap.',
      ),
      supportsExpectedAction: false,
      rejectionCategory: resolvedCategory,
    };
  }

  if (resolvedCategory === 'already_applied') {
    return {
      isDuplicate: true,
      categoryLabel: 'Already completed',
      comment: 'This action was already completed and remains in effect for this scenario.',
      supportsExpectedAction: false,
      rejectionCategory: resolvedCategory,
    };
  }

  if (resolvedCategory === 'rescue_locked') {
    return {
      isDuplicate: false,
      categoryLabel: 'Not appropriate now',
      comment: 'This rescue-only action was attempted before its activation condition was met.',
      supportsExpectedAction: false,
      rejectionCategory: resolvedCategory,
    };
  }

  if (resolvedCategory === 'sequence_deviation') {
    const supportsExpectedAction = !MULTI_VALID_STEPS_HINT.test(message) && SEQUENCE_HINT_SUFFIX.test(message);

    return {
      isDuplicate: false,
      categoryLabel: 'Sequencing issue',
      comment: buildSequenceComment(message),
      supportsExpectedAction,
      rejectionCategory: resolvedCategory,
    };
  }

  if (resolvedCategory === 'rhythm_mismatch') {
    return {
      isDuplicate: false,
      categoryLabel: 'Rhythm mismatch',
      comment: message,
      supportsExpectedAction: false,
      rejectionCategory: resolvedCategory,
    };
  }

  if (resolvedCategory === 'not_applicable') {
    return {
      isDuplicate: false,
      categoryLabel: 'Not appropriate now',
      comment: 'This action was not appropriate for the current patient state and had no useful effect in this scenario.',
      supportsExpectedAction: false,
      rejectionCategory: resolvedCategory,
    };
  }

  if (resolvedCategory === 'scenario_inactive') {
    return {
      isDuplicate: false,
      categoryLabel: 'Scenario inactive',
      comment: message,
      supportsExpectedAction: false,
      rejectionCategory: resolvedCategory,
    };
  }

  return {
    isDuplicate: false,
    categoryLabel: 'Protocol issue',
    comment: message,
    supportsExpectedAction: false,
    rejectionCategory: resolvedCategory,
  };
}
