import { getInterventionShortLabel } from './interventionLabels';
import type { ActiveIntervention, Condition, PatientField, Scenario } from '../types/scenario';

export type UrgencyLevel = 'low' | 'medium' | 'critical';

export interface UrgencyItem {
  key: string;
  type: 'failure' | 'intervention';
  label: string;
  remainingSec: number;
  urgency: UrgencyLevel;
}

export const URGENCY_STRIP_HELP_TITLE = 'Urgency strip help';
export const URGENCY_STRIP_HELP_INTRO = 'The urgency strip separates patient-risk timers from intervention timers. Patient-risk pills show how long until the patient state worsens or the case fails. Intervention pills show a timed action that is still active; they do not mean every other action is blocked.';
export const URGENCY_STRIP_HELP_PRIORITY = 'Patient-risk pills appear before intervention timers. Red signals immediate risk, amber signals a shorter remaining window, and slate marks a lower-urgency timer.';
export const URGENCY_STRIP_HELP_EMPTY_STATE = 'If the strip is empty, there are no patient-risk or active intervention timers right now.';

const FAILURE_VITAL_LABELS: Partial<Record<PatientField, string>> = {
  hr: 'HR',
  bp: 'BP',
  spo2: 'SpO₂',
  rr: 'RR',
  pulsePresent: 'Pulse',
  rhythm: 'Rhythm',
  temp: 'Temperature',
  etco2: 'ETCO₂',
  glucose: 'Glucose',
};

export function getInterventionUrgency(remainingSec: number): UrgencyLevel {
  if (remainingSec < 10) return 'critical';
  if (remainingSec < 30) return 'medium';
  return 'low';
}

export function getFailureConditionLabel(condition: Condition): string {
  if (condition.vital) {
    return `⚠ ${FAILURE_VITAL_LABELS[condition.vital] ?? condition.vital} risk`;
  }

  return '⚠ Patient risk';
}

export function formatUrgencyItemAriaLabel(item: UrgencyItem): string {
  const severityLabel = item.urgency === 'critical' ? 'Critical' : 'Alert';
  const kindLabel = item.type === 'failure' ? 'Patient timer' : 'Intervention timer';
  const remainingCopy = item.type === 'failure'
    ? `${Math.ceil(item.remainingSec)} seconds remaining`
    : `${Math.ceil(item.remainingSec)} seconds until repeat`;
  return `${severityLabel}: ${kindLabel} — ${item.label} — ${remainingCopy}`;
}

export function formatUrgencyItemTitle(item: UrgencyItem): string {
  const kindLabel = item.type === 'failure' ? 'Patient-risk timer' : 'Intervention active';
  const remainingCopy = item.type === 'failure'
    ? `${Math.ceil(item.remainingSec)}s remaining`
    : `${Math.ceil(item.remainingSec)}s until repeat`;
  return `${kindLabel}: ${item.label} — ${remainingCopy}`;
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
              label: getFailureConditionLabel(condition),
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
            label: getFailureConditionLabel(condition),
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
      label: `↻ ${getInterventionShortLabel(intervention.id)} active`,
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
