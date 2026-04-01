import { useEffect } from 'react';
import { X, Zap } from 'lucide-react';
import type { Scenario } from '../types/scenario';
import { getInterventionDisplayLabel } from '../lib/interventionLabels';

function labelFor(id: string): string {
  return getInterventionDisplayLabel(id);
}

function humanizeLabel(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function routeLabel(routeId: string, label?: string): string {
  return label ?? humanizeLabel(routeId);
}

function getTeachingSpineIndex(expectedSequence: string[], acceptedInterventionIds: string[]): number {
  let nextIndex = 0;

  for (const interventionId of acceptedInterventionIds) {
    if (nextIndex < expectedSequence.length && expectedSequence[nextIndex] === interventionId) {
      nextIndex += 1;
    }
  }

  return nextIndex;
}

interface CheatOverlayRouteState {
  routeId: string;
  kind: 'primary' | 'branch' | 'rescue';
  label?: string;
  isActivated: boolean;
  isCompleted: boolean;
  isRequired: boolean;
  nextInterventionId: string | null;
}

interface CheatOverlayProps {
  scenario: Scenario;
  sequenceIndex: number;
  requiredStepCount: number;
  availableInterventionIds: string[];
  stateAwareAvailableInterventionIds: string[];
  activeRouteId: string | null;
  routeStates: CheatOverlayRouteState[];
  acceptedInterventionIds: string[];
  onClose: () => void;
}

export default function CheatOverlay({
  scenario,
  sequenceIndex,
  requiredStepCount,
  availableInterventionIds,
  stateAwareAvailableInterventionIds,
  activeRouteId,
  routeStates,
  acceptedInterventionIds,
  onClose,
}: CheatOverlayProps) {
  const seq = scenario.expected_sequence ?? [];
  const hasSequence = seq.length > 0;
  const hasRouteAwareProtocol = Boolean(scenario.protocol);
  const teachingSpineIndex = getTeachingSpineIndex(seq, acceptedInterventionIds);
  const teachingSpineComplete = hasSequence && teachingSpineIndex >= seq.length;
  const teachingSpineCurrentAction = hasSequence && !teachingSpineComplete ? seq[teachingSpineIndex] : null;
  const requiredProtocolComplete = hasRouteAwareProtocol && requiredStepCount > 0 && sequenceIndex >= requiredStepCount;
  const activePendingRoutes = routeStates
    .filter((route) => route.isActivated && !route.isCompleted && route.nextInterventionId)
    .sort((left, right) => {
      if (left.routeId === activeRouteId) return -1;
      if (right.routeId === activeRouteId) return 1;
      if (left.isRequired !== right.isRequired) return left.isRequired ? -1 : 1;
      return left.routeId.localeCompare(right.routeId);
    });
  const validRouteActionCards = activePendingRoutes.filter(
    (route) => route.nextInterventionId !== null && stateAwareAvailableInterventionIds.includes(route.nextInterventionId),
  );
  const protocolPendingActionCards = activePendingRoutes.filter(
    (route) => route.nextInterventionId !== null && availableInterventionIds.includes(route.nextInterventionId),
  );
  const activeOptionalBranches = routeStates.filter(
    (route) => route.kind === 'branch' && route.isActivated && !route.isCompleted && !route.isRequired,
  );

  function renderRouteBadge(route: CheatOverlayRouteState): string {
    if (route.kind === 'rescue') {
      return route.routeId === activeRouteId ? 'Current rescue route' : 'Rescue route';
    }

    if (route.kind === 'branch' && !route.isRequired) {
      return route.routeId === activeRouteId ? 'Current optional branch' : 'Optional branch';
    }

    return route.routeId === activeRouteId ? 'Current required route' : 'Required route';
  }

  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Cheat mode — protocol guidance"
    >
      <div
        className="relative mx-4 w-full max-w-md rounded-3xl border border-yellow-400 bg-slate-900 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1 text-slate-400 hover:text-white"
          aria-label="Close cheat overlay"
        >
          <X size={16} />
        </button>

        {/* Header badge */}
        <div className="mb-4 flex items-center gap-2">
          <Zap size={16} className="text-yellow-400" />
          <span className="text-xs font-black uppercase tracking-widest text-yellow-400">
            Cheat Mode
          </span>
        </div>

        {/* Scenario title */}
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {scenario.title}
        </p>

        {/* Next action */}
        {!hasSequence && !hasRouteAwareProtocol && (
          <p className="text-sm text-slate-400 italic">No expected sequence defined for this scenario.</p>
        )}

        {hasRouteAwareProtocol && activeOptionalBranches.length > 0 && (
          <div className="mb-3 rounded-xl border border-sky-400/30 bg-sky-400/10 px-4 py-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-sky-300">
              Optional branch active
            </p>
            <ul className="space-y-1 text-sm text-slate-100">
              {activeOptionalBranches.map((route) => (
                <li key={route.routeId}>{routeLabel(route.routeId, route.label)}</li>
              ))}
            </ul>
          </div>
        )}

        {hasRouteAwareProtocol && validRouteActionCards.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
              {validRouteActionCards.length === 1 ? 'Currently valid next action' : 'Currently valid next actions'}
            </p>
            <ul className="space-y-2" aria-label="Currently valid next actions">
              {validRouteActionCards.map((route) => (
                <li
                  key={`${route.routeId}-${route.nextInterventionId}`}
                  className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3"
                >
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                    {renderRouteBadge(route)}
                  </p>
                  <p className="text-base font-bold leading-snug text-white">
                    {labelFor(route.nextInterventionId!)}
                  </p>
                  <p className="mt-1 text-xs text-slate-300">{routeLabel(route.routeId, route.label)}</p>
                  <p className="mt-1 text-[10px] font-mono text-slate-400">{route.nextInterventionId}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {hasRouteAwareProtocol && validRouteActionCards.length === 0 && protocolPendingActionCards.length > 0 && (
          <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            No route-aware next action is currently physiologically appropriate. Teaching-spine context is shown below.
          </p>
        )}

        {hasRouteAwareProtocol && requiredProtocolComplete && (
          <p className="rounded-xl border border-green-400/30 bg-green-400/10 px-4 py-3 text-sm font-semibold text-green-300">
            ✓ Required protocol complete — awaiting success conditions
          </p>
        )}

        {hasSequence && teachingSpineComplete && !hasRouteAwareProtocol && (
          <p className="text-sm font-semibold text-green-400">
            ✓ Sequence complete — awaiting success conditions
          </p>
        )}

        {hasSequence && teachingSpineCurrentAction && (
          <>
            <div className="mb-3 mt-3 rounded-xl bg-yellow-400/10 border border-yellow-400/30 px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-yellow-400 font-semibold mb-1">
                Step {teachingSpineIndex + 1} of {seq.length} — {hasRouteAwareProtocol ? 'Teaching spine' : 'Do this now'}
              </p>
              <p className="text-base font-bold text-white leading-snug">
                {labelFor(teachingSpineCurrentAction)}
              </p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{teachingSpineCurrentAction}</p>
              {hasRouteAwareProtocol && (
                <p className="mt-2 text-xs text-slate-300">
                  Authored teaching order for instructor context. Route-aware guidance above is the authoritative next-step view.
                </p>
              )}
            </div>

            {/* Remaining steps */}
            {seq.length > 1 && (
              <div className="mt-3 space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                  {hasRouteAwareProtocol ? 'Teaching spine' : 'Full sequence'}
                </p>
                {seq.map((id, i) => {
                  const done = i < teachingSpineIndex;
                  const current = i === teachingSpineIndex;
                  return (
                    <div
                      key={id}
                      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                        current
                          ? 'bg-yellow-400/15 text-yellow-300'
                          : done
                          ? 'text-slate-600 line-through'
                          : 'text-slate-500'
                      }`}
                    >
                      <span className="w-4 shrink-0 text-center font-mono text-[10px] opacity-60">
                        {done ? '✓' : `${i + 1}`}
                      </span>
                      {labelFor(id)}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {hasSequence && teachingSpineComplete && hasRouteAwareProtocol && (
          <div className="mt-3 rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Teaching spine
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-100">✓ Teaching spine complete</p>
          </div>
        )}

        <p className="mt-4 text-center text-[10px] text-slate-600">
          Press <kbd className="rounded bg-slate-700 px-1 py-0.5 font-mono text-slate-300">C</kbd> or{' '}
          <kbd className="rounded bg-slate-700 px-1 py-0.5 font-mono text-slate-300">Esc</kbd> to close
        </p>
      </div>
    </div>
  );
}
