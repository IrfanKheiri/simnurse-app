/**
 * Single source of truth for debrief performance tiers and their help copy.
 * Ordered highest to lowest — find() returns the first match.
 */
export const PERFORMANCE_TIERS = [
  {
    min: 95,
    label: 'Expert',
    rangeLabel: '≥95%',
    summary: 'Nearly all interventions were correct and in sequence.',
  },
  {
    min: 88,
    label: 'Proficient',
    rangeLabel: '≥88%',
    summary: 'Most interventions were correct, with only minor accuracy or sequencing gaps.',
  },
  {
    min: 80,
    label: 'Competent',
    rangeLabel: '≥80%',
    summary: 'Core actions were often correct, but noticeable accuracy or sequencing gaps affected the run.',
  },
  {
    min: 60,
    label: 'Developing',
    rangeLabel: '≥60%',
    summary: 'Some actions were correct, but repeated mistakes or missed steps are still limiting consistency.',
  },
  {
    min: 0,
    label: 'Novice',
    rangeLabel: '<60%',
    summary: 'Frequent missed, incorrect, or out-of-sequence interventions reduced overall accuracy.',
  },
] as const;

export type PerformanceTier = typeof PERFORMANCE_TIERS[number];
export type PerformanceTierLabel = PerformanceTier['label'];

export const PERFORMANCE_TIER_HELP_INTRO =
  'Your tier reflects how many scored interventions were correct and in sequence across the case.';

export const PERFORMANCE_TIER_HELP_INTERPRETATION =
  'Lower tiers usually reflect missed, incorrect, or out-of-sequence interventions. In strict protocol scenarios, missed required steps can also lower the score if the run ends before protocol completion.';

export const PERFORMANCE_TIER_HELP_MASTERY_HINT =
  'Aim for ≥88% (Proficient) before moving to the next difficulty tier.';

/** Pre-built string for use in help text. */
export const PERFORMANCE_TIERS_HELP_STRING = PERFORMANCE_TIERS
  .map(({ label, rangeLabel }) => `${label} ${rangeLabel}`)
  .join(', ');

export function getPerformanceTier(score: number): PerformanceTier {
  return PERFORMANCE_TIERS.find((tier) => score >= tier.min) ?? PERFORMANCE_TIERS[PERFORMANCE_TIERS.length - 1];
}
