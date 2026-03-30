export interface DebriefFeedbackMeta {
  isDuplicate: boolean;
  categoryLabel?: string;
  comment: string;
  supportsExpectedAction: boolean;
}

const SEQUENCE_HINT_SUFFIX = /\s+The next expected step is: .*$/;

export function getDebriefFeedbackMeta(rejected: boolean, message: string): DebriefFeedbackMeta {
  if (!rejected) {
    return {
      isDuplicate: false,
      comment: message,
      supportsExpectedAction: false,
    };
  }

  if (message.startsWith('Already active.') || message.startsWith('Already in progress.')) {
    return {
      isDuplicate: true,
      categoryLabel: 'Repeated too early',
      comment: message.replace(
        /^Already (?:active|in progress)\. Only this action is temporarily unavailable\./,
        'This timed action was repeated before its active window ended. Only this same action was temporarily unavailable; other appropriate interventions could still overlap.',
      ),
      supportsExpectedAction: false,
    };
  }

  if (message.startsWith('Already applied.')) {
    return {
      isDuplicate: true,
      categoryLabel: 'Already completed',
      comment: 'This action was already completed and remains in effect for this scenario.',
      supportsExpectedAction: false,
    };
  }

  if (message.startsWith('Protocol Deviation: Incorrect sequence')) {
    return {
      isDuplicate: false,
      categoryLabel: 'Sequencing issue',
      comment: message
        .replace(SEQUENCE_HINT_SUFFIX, '')
        .replace(
          'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol.',
          'This action was attempted before the next supported protocol step.',
        ),
      supportsExpectedAction: true,
    };
  }

  if (message.startsWith('Not appropriate for the current rhythm.') || message.startsWith('Cannot perform: requires')) {
    return {
      isDuplicate: false,
      categoryLabel: 'Rhythm mismatch',
      comment: message,
      supportsExpectedAction: false,
    };
  }

  if (message.startsWith('Protocol Deviation: This action is not applicable')) {
    return {
      isDuplicate: false,
      categoryLabel: 'Not appropriate now',
      comment: 'This action was not appropriate for the current patient state and had no useful effect in this scenario.',
      supportsExpectedAction: false,
    };
  }

  return {
    isDuplicate: false,
    categoryLabel: 'Protocol issue',
    comment: message,
    supportsExpectedAction: false,
  };
}
