import { describe, expect, it } from 'vitest';
import { getDebriefFeedbackMeta } from './debriefFeedback';

describe('getDebriefFeedbackMeta', () => {
  it('classifies timed repeats without implying global blocking', () => {
    const meta = getDebriefFeedbackMeta(
      true,
      'Already active. Only this action is temporarily unavailable. Repeat available in approximately 10–13s.',
      'already_active',
    );

    expect(meta).toEqual({
      isDuplicate: true,
      categoryLabel: 'Repeated too early',
      comment:
        'This timed action was repeated before its active window ended. Only this same action was temporarily unavailable; other appropriate interventions could still overlap. Repeat available in approximately 10–13s.',
      supportsExpectedAction: false,
      rejectionCategory: 'already_active',
    });
  });

  it('classifies permanent repeats as already completed', () => {
    expect(
      getDebriefFeedbackMeta(
        true,
        'Already applied. This action stays in effect for this scenario.',
        'already_applied',
      ),
    ).toEqual({
      isDuplicate: true,
      categoryLabel: 'Already completed',
      comment: 'This action was already completed and remains in effect for this scenario.',
      supportsExpectedAction: false,
      rejectionCategory: 'already_applied',
    });
  });

  it('keeps expected-step support limited to sequence issues', () => {
    expect(
      getDebriefFeedbackMeta(
        true,
        'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol. The next expected step is: Defibrillate.',
        'sequence_deviation',
      ),
    ).toEqual({
      isDuplicate: false,
      categoryLabel: 'Sequencing issue',
      comment: 'This action was attempted before the next supported protocol step.',
      supportsExpectedAction: true,
      rejectionCategory: 'sequence_deviation',
    });

    expect(
      getDebriefFeedbackMeta(
        true,
        'Not appropriate for the current rhythm. Requires VFib or VTach. Current rhythm: Sinus.',
        'rhythm_mismatch',
      ).supportsExpectedAction,
    ).toBe(false);
  });

  it('does not infer a single expected action from a bare sequencing issue without a single-step hint', () => {
    expect(
      getDebriefFeedbackMeta(
        true,
        'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol.',
        'sequence_deviation',
      ),
    ).toEqual({
      isDuplicate: false,
      categoryLabel: 'Sequencing issue',
      comment: 'This action was attempted before the next supported protocol step.',
      supportsExpectedAction: false,
      rejectionCategory: 'sequence_deviation',
    });
  });

  it('does not imply a single expected action when multiple next steps are valid', () => {
    expect(
      getDebriefFeedbackMeta(
        true,
        'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol. Valid next steps are: Cpr or Perimortem Csection.',
        'sequence_deviation',
      ),
    ).toEqual({
      isDuplicate: false,
      categoryLabel: 'Sequencing issue',
      comment: 'This action was attempted before the next supported protocol step. Valid next steps are: Cpr or Perimortem Csection.',
      supportsExpectedAction: false,
      rejectionCategory: 'sequence_deviation',
    });
  });

  it('classifies locked rescue actions without expected-step guidance', () => {
    expect(
      getDebriefFeedbackMeta(
        true,
        'Protocol Deviation: Rescue action locked. This action cannot be used until its rescue activation condition is met.',
        'rescue_locked',
      ),
    ).toEqual({
      isDuplicate: false,
      categoryLabel: 'Not appropriate now',
      comment: 'This rescue-only action was attempted before its activation condition was met.',
      supportsExpectedAction: false,
      rejectionCategory: 'rescue_locked',
    });
  });

  it('distinguishes patient-state mismatches from sequence issues', () => {
    expect(
      getDebriefFeedbackMeta(
        true,
        'Protocol Deviation: This action is not applicable or effective in the current scenario.',
        'not_applicable',
      ),
    ).toEqual({
      isDuplicate: false,
      categoryLabel: 'Not appropriate now',
      comment: 'This action was not appropriate for the current patient state and had no useful effect in this scenario.',
      supportsExpectedAction: false,
      rejectionCategory: 'not_applicable',
    });
  });

  it('prefers the explicit rejection category over message-prefix parsing', () => {
    expect(
      getDebriefFeedbackMeta(
        true,
        'Custom engine wording retained for debrief display.',
        'rhythm_mismatch',
      ),
    ).toEqual({
      isDuplicate: false,
      categoryLabel: 'Rhythm mismatch',
      comment: 'Custom engine wording retained for debrief display.',
      supportsExpectedAction: false,
      rejectionCategory: 'rhythm_mismatch',
    });
  });
});
