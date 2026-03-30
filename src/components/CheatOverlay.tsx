import { useEffect } from 'react';
import { X, Zap } from 'lucide-react';
import type { Scenario } from '../types/scenario';
import { getInterventionDisplayLabel } from '../lib/interventionLabels';

function labelFor(id: string): string {
  return getInterventionDisplayLabel(id);
}

interface CheatOverlayProps {
  scenario: Scenario;
  sequenceIndex: number;
  onClose: () => void;
}

export default function CheatOverlay({ scenario, sequenceIndex, onClose }: CheatOverlayProps) {
  const seq = scenario.expected_sequence ?? [];
  const hasSequence = seq.length > 0;
  const isComplete = hasSequence && sequenceIndex >= seq.length;
  const currentAction = hasSequence && !isComplete ? seq[sequenceIndex] : null;

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
      aria-label="Cheat mode — next action hint"
    >
      <div
        className="relative mx-4 w-full max-w-sm rounded-3xl border border-yellow-400 bg-slate-900 p-5 shadow-2xl"
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
        {!hasSequence && (
          <p className="text-sm text-slate-400 italic">No expected sequence defined for this scenario.</p>
        )}

        {hasSequence && isComplete && (
          <p className="text-sm font-semibold text-green-400">
            ✓ Sequence complete — awaiting success conditions
          </p>
        )}

        {hasSequence && !isComplete && currentAction && (
          <>
            <div className="mb-3 rounded-xl bg-yellow-400/10 border border-yellow-400/30 px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-yellow-400 font-semibold mb-1">
                Step {sequenceIndex + 1} of {seq.length} — Do this now
              </p>
              <p className="text-base font-bold text-white leading-snug">
                {labelFor(currentAction)}
              </p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{currentAction}</p>
            </div>

            {/* Remaining steps */}
            {seq.length > 1 && (
              <div className="mt-3 space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                  Full sequence
                </p>
                {seq.map((id, i) => {
                  const done = i < sequenceIndex;
                  const current = i === sequenceIndex;
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

        <p className="mt-4 text-center text-[10px] text-slate-600">
          Press <kbd className="rounded bg-slate-700 px-1 py-0.5 font-mono text-slate-300">C</kbd> or{' '}
          <kbd className="rounded bg-slate-700 px-1 py-0.5 font-mono text-slate-300">Esc</kbd> to close
        </p>
      </div>
    </div>
  );
}
