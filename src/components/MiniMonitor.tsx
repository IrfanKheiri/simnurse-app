import type { PatientState } from '../types/scenario';

interface MiniMonitorProps {
  state: PatientState | null;
  unlocked: Record<string, boolean>;
  pulseClass?: string; // e.g. "animate-pulse" for recent updates
}

/** R-14: Returns true when a vital value is in a life-threatening range */
function isCritical(vitalType: 'hr' | 'spo2' | 'bp', value: number): boolean {
  if (vitalType === 'hr') return value <= 30 || value === 0;
  if (vitalType === 'spo2') return value < 85;
  if (vitalType === 'bp') return value < 70;
  return false;
}

export default function MiniMonitor({ state, unlocked, pulseClass = '' }: MiniMonitorProps) {
  if (!state) return null;

  const sbp = parseInt(state.bp.split('/')[0] ?? '0', 10);

  const hrCritical = unlocked.hr && isCritical('hr', state.hr);
  const spo2Critical = unlocked.spo2 && isCritical('spo2', state.spo2);
  const bpCritical = unlocked.bp && isCritical('bp', sbp);

  return (
    <header id="mini-monitor" className={`sticky top-0 flex justify-around items-center bg-slate-900 text-white p-2 text-sm shadow-md z-40 ${pulseClass}`}>
      <div className="flex flex-col items-center flex-1">
        <span className="text-slate-400 text-xs font-semibold">HR</span>
        <span className={`font-mono text-lg transition-colors ${unlocked.hr ? (hrCritical ? 'animate-pulse text-red-400' : 'text-green-400') : 'text-slate-600'}`}>
          {unlocked.hr ? state.hr : '--'}
        </span>
      </div>
      <div className="flex flex-col items-center flex-1 border-l border-slate-700">
        <span className="text-slate-400 text-xs font-semibold">BP</span>
        <span className={`font-mono text-lg transition-colors ${unlocked.bp ? (bpCritical ? 'animate-pulse text-red-400' : 'text-blue-400') : 'text-slate-600'}`}>
          {unlocked.bp ? state.bp : '--/--'}
        </span>
      </div>
      <div className="flex flex-col items-center flex-1 border-l border-slate-700">
        <span className="text-slate-400 text-xs font-semibold">SpO2</span>
        <span className={`font-mono text-lg transition-colors ${unlocked.spo2 ? (spo2Critical ? 'animate-pulse text-red-400' : 'text-cyan-400') : 'text-slate-600'}`}>
          {unlocked.spo2 ? `${state.spo2}%` : '--'}
        </span>
      </div>
      {/* R-14: RR added as 4th vital */}
      <div className="flex flex-col items-center flex-1 border-l border-slate-700">
        <span className="text-slate-400 text-xs font-semibold">RR</span>
        <span className={`font-mono text-lg ${unlocked.rr ? 'text-green-400' : 'text-slate-600'}`}>
          {unlocked.rr ? state.rr : '--'}
        </span>
      </div>
    </header>
  );
}
