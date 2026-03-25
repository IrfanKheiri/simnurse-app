/**
 * Single source of truth for performance tier thresholds.
 * Used by EvaluationSummary (ScoreGauge logic) and helpContent (tip text).
 * Ordered highest to lowest — find() returns the first match.
 */
export const PERFORMANCE_TIERS = [
  { min: 95, label: 'Expert' },
  { min: 88, label: 'Proficient' },
  { min: 80, label: 'Competent' },
  { min: 60, label: 'Developing' },
  { min: 0,  label: 'Novice' },
] as const;

export type PerformanceTierLabel = typeof PERFORMANCE_TIERS[number]['label'];

/** Pre-built string for use in help text. */
export const PERFORMANCE_TIERS_HELP_STRING =
  'Expert ≥95%, Proficient ≥88%, Competent ≥80%, Developing ≥60%, Novice <60%';
