export const INLINE_HELP_BLOCKER_KEYS = [
  'helpPanel',
  'walkthrough',
  'procedureGuide',
  'correctActionWidget',
  'incorrectActionWidget',
  'cheatOverlay',
] as const;

export type InlineHelpBlockerKey = typeof INLINE_HELP_BLOCKER_KEYS[number];

export type InlineHelpBlockers = Partial<Record<InlineHelpBlockerKey, boolean>>;

export function getActiveInlineHelpBlockers(blockers: InlineHelpBlockers = {}): InlineHelpBlockerKey[] {
  return INLINE_HELP_BLOCKER_KEYS.filter((key) => blockers[key] === true);
}

export function isInlineHelpSuppressed(blockers: InlineHelpBlockers = {}): boolean {
  return getActiveInlineHelpBlockers(blockers).length > 0;
}

export function mergeInlineHelpBlockers(...blockerSets: InlineHelpBlockers[]): InlineHelpBlockers {
  return blockerSets.reduce<InlineHelpBlockers>((merged, blockerSet) => {
    for (const key of getActiveInlineHelpBlockers(blockerSet)) {
      merged[key] = true;
    }

    return merged;
  }, {});
}
