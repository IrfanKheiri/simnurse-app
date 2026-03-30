import { describe, expect, it } from 'vitest';
import { getDebriefFeedbackMeta } from './debriefFeedback';

describe('getDebriefFeedbackMeta', () => {
  it('classifies timed repeats without implying global blocking', () => {
    const meta = getDebriefFeedbackMeta(
      true,
      'Already active. Only this action is temporarily unavailable. Repeat available in approximately 10–13s.',
    );

    expect(meta).toEqual({
      isDuplicate: true,
      categoryLabel: 'Repeated too early',
      comment:
        'This timed action was repeated before its active window ended. Only this same action was temporarily unavailable; other appropriate interventions could still overlap. Repeat available in approximately 10–13s.',
      supportsExpectedAction: false,
    });
  });

  it('classifies permanent repeats as already completed', () => {
    expect(
      getDebriefFeedbackMeta(
        true,
        'Already applied. This action stays in effect for this scenario.',
      ),
    ).toEqual({
      isDuplicate: true,
      categoryLabel: 'Already completed',
      comment: 'This action was already completed and remains in effect for this scenario.',
      supportsExpectedAction: false,
    });
  });

  it('keeps expected-step support limited to sequence issues', () => {
    expect(
      getDebriefFeedbackMeta(
        true,
        'Protocol Deviation: Incorrect sequence. This is not the appropriate next step in the protocol. The next expected step is: Defibrillate.',
      ),
    ).toEqual({
      isDuplicate: false,
      categoryLabel: 'Sequencing issue',
      comment: 'This action was attempted before the next supported protocol step.',
      supportsExpectedAction: true,
    });

    expect(
      getDebriefFeedbackMeta(
        true,
        'Not appropriate for the current rhythm. Requires VFib or VTach. Current rhythm: Sinus.',
      ).supportsExpectedAction,
    ).toBe(false);
  });

  it('distinguishes patient-state mismatches from sequence issues', () => {
    expect(
      getDebriefFeedbackMeta(
        true,
        'Protocol Deviation: This action is not applicable or effective in the current scenario.',
      ),
    ).toEqual({
      isDuplicate: false,
      categoryLabel: 'Not appropriate now',
      comment: 'This action was not appropriate for the current patient state and had no useful effect in this scenario.',
      supportsExpectedAction: false,
    });
  });
});
