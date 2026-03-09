import type { PatientState } from '../types/scenario';

interface MiniMonitorProps {
  state: PatientState | null;
  unlocked: Record<string, boolean>;
  pulseClass?: string; // e.g. "animate-pulse" for recent updates
}

export default function MiniMonitor({ state, unlocked, pulseClass = '' }: MiniMonitorProps) {
  if (!state) return null;

  return (
    <header id="mini-monitor" className={`sticky top-0 flex justify-around items-center bg-slate-900 text-white p-2 text-sm shadow-md z-40 ${pulseClass}`}>
      <div className="flex flex-col items-center flex-1">
        <span className="text-slate-400 text-xs font-semibold">HR</span>
        <span className={`font-mono text-lg ${unlocked.hr ? 'text-green-400' : 'text-slate-600'}`}>
          {unlocked.hr ? state.hr : '--'}
        </span>
      </div>
      <div className="flex flex-col items-center flex-1 border-l border-slate-700">
        <span className="text-slate-400 text-xs font-semibold">BP</span>
        <span className={`font-mono text-lg ${unlocked.bp ? 'text-blue-400' : 'text-slate-600'}`}>
          {unlocked.bp ? state.bp : '--/--'}
        </span>
      </div>
      <div className="flex flex-col items-center flex-1 border-l border-slate-700">
        <span className="text-slate-400 text-xs font-semibold">SpO2</span>
        <span className={`font-mono text-lg ${unlocked.spo2 ? 'text-cyan-400' : 'text-slate-600'}`}>
          {unlocked.spo2 ? `${state.spo2}%` : '--'}
        </span>
      </div>
    </header>
  );
}
