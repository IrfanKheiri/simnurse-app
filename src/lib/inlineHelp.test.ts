import { describe, expect, it } from 'vitest';
import { getActiveInlineHelpBlockers, isInlineHelpSuppressed, mergeInlineHelpBlockers } from './inlineHelp';

describe('inline help suppression contract', () => {
  it('treats an empty blocker set as available', () => {
    expect(isInlineHelpSuppressed()).toBe(false);
    expect(getActiveInlineHelpBlockers({})).toEqual([]);
  });

  it('merges overlapping higher-priority overlays into a single suppression set', () => {
    const blockers = mergeInlineHelpBlockers(
      { helpPanel: true, walkthrough: true },
      { procedureGuide: true, correctActionWidget: true },
      { incorrectActionWidget: true, cheatOverlay: true, helpPanel: true },
    );

    expect(isInlineHelpSuppressed(blockers)).toBe(true);
    expect(getActiveInlineHelpBlockers(blockers)).toEqual([
      'helpPanel',
      'walkthrough',
      'procedureGuide',
      'correctActionWidget',
      'incorrectActionWidget',
      'cheatOverlay',
    ]);
  });
});
