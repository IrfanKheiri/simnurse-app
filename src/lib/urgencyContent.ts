import { getInterventionShortLabel } from './interventionLabels';
import type { ActiveIntervention, Condition, Scenario } from '../types/scenario';

export type UrgencyLevel = 'low' | 'medium' | 'critical';

export interface UrgencyItem {
  key: string;
  type: 'failure' | 'intervention';
  label: string;
  remainingSec: number;
  urgency: UrgencyLevel;
}

export const URGENCY_STRIP_HELP_TITLE = 'Urgency strip help';
export const URGENCY_STRIP_HELP_INTRO = 'The urgency strip shows shared countdowns for failure risks and active intervention timers so you can see which time-sensitive task needs attention next.';
export const URGENCY_STRIP_HELP_PRIORITY = 'Failure-risk pills appear before intervention timers. Red means act immediately, amber means plan your next action now, and slate means a lower-urgency reminder is active.';
export const URGENCY_STRIP_HELP_EMPTY_STATE = 'If the strip is empty, there are no active time-based alerts yet.';

export function getInterventionUrgency(remainingSec: number): UrgencyLevel {
  if (remainingSec < 10) return 'critical';
  if (remainingSec < 30) return 'medium';
  return 'low';
}

export function getFailureConditionLabel(condition: Condition, remainingSec: number): string {
  const secs = Math.ceil(remainingSec);

  if (condition.elapsedSecGte !== undefined && !condition.vital) {
    return `⏱ ~${secs}s left`;
  }

  if (condition.vital) {
    const vitalName = condition.vital === 'pulsePresent' ? 'Pulse' : condition.vital.toUpperCase();
    return `⚠ ${vitalName} ~${secs}s`;
  }

  return `⚠ ~${secs}s`;
}

export function formatUrgencyItemAriaLabel(item: UrgencyItem): string {
  const severityLabel = item.urgency === 'critical' ? 'Critical' : 'Alert';
  return `${severityLabel}: ${item.label} — ${Math.ceil(item.remainingSec)} seconds remaining`;
}

export function formatUrgencyItemTitle(item: UrgencyItem): string {
  const kindLabel = item.type === 'failure' ? 'Failure risk' : 'Intervention';
  return `${kindLabel}: ${item.label} — ${Math.ceil(item.remainingSec)}s remaining`;
}

export function computeUrgencyItems(
  activeScenario: Scenario | null,
  failureHoldStarts: Record<string, number>,
  elapsedSec: number,
  activeInterventions: ActiveIntervention[],
): UrgencyItem[] {
  const items: UrgencyItem[] = [];

  if (!activeScenario) return items;

  for (const [index, condition] of activeScenario.failure_conditions.entries()) {
    if (condition.durationSec !== undefined && condition.durationSec > 3) {
      const holdKey = `failure-${index}`;
      const holdStart = failureHoldStarts[holdKey];
      if (holdStart !== undefined) {
        const holdElapsed = elapsedSec - holdStart;
        const warnThreshold = Math.max(condition.durationSec / 2, condition.durationSec - 12);
        if (holdElapsed >= warnThreshold) {
          const remainingSec = condition.durationSec - holdElapsed;
          if (remainingSec > 0) {
            items.push({
              key: `fail-hold-${index}`,
              type: 'failure',
              label: getFailureConditionLabel(condition, remainingSec),
              remainingSec,
              urgency: remainingSec < 10 ? 'critical' : 'medium',
            });
          }
        }
      }
    }

    if (condition.elapsedSecGte !== undefined && !condition.vital) {
      const warnWindow = Math.max(120, Math.round(condition.elapsedSecGte * 0.25));
      const warnFrom = condition.elapsedSecGte - warnWindow;
      if (elapsedSec >= warnFrom) {
        const remainingSec = condition.elapsedSecGte - elapsedSec;
        if (remainingSec > 0) {
          items.push({
            key: `fail-elapsed-${index}`,
            type: 'failure',
            label: getFailureConditionLabel(condition, remainingSec),
            remainingSec,
            urgency: remainingSec < 15 ? 'critical' : 'medium',
          });
        }
      }
    }
  }

  for (const intervention of activeInterventions) {
    if (intervention.duration_sec === undefined) continue;
    const remainingSec = intervention.duration_sec - (elapsedSec - intervention.start_time);
    if (remainingSec <= 0) continue;
    items.push({
      key: `iv-${intervention.id}`,
      type: 'intervention',
      label: getInterventionShortLabel(intervention.id),
      remainingSec,
      urgency: getInterventionUrgency(remainingSec),
    });
  }

  items.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'failure' ? -1 : 1;
    return a.remainingSec - b.remainingSec;
  });

  return items;
}
