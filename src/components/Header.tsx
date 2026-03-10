import React from 'react';
import { HelpCircle } from 'lucide-react';
import type { PatientState } from '../types/scenario';

interface HeaderProps {
    onHelpClick: () => void;
    monitorState?: PatientState | null;
    unlocked?: Record<'hr' | 'spo2' | 'bp' | 'rr', boolean>;
}

// FIX (L23): Removed the non-functional notification bell button entirely.
// It was a decorative element with a hardcoded red dot implying unread notifications
// that did not exist, creating a false affordance. Re-add when notification data exists.
// FIX (ISSUE-20): MiniMonitor merged as a second row inside this header to eliminate
// the dual-sticky-header problem (~104px consumed before content). Combined header
// stays sticky top-0 z-50; the monitor row no longer has its own sticky positioning.
const Header: React.FC<HeaderProps> = ({ onHelpClick, monitorState = null, unlocked }) => {
    return (
        <header id="app-header" className="sticky top-0 z-50 flex flex-col border-b border-slate-100 bg-white">
            <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-medical-500 rounded-lg flex items-center justify-center text-white font-black text-sm shadow-lg shadow-medical-100">
                        SN
                    </div>
                    <span className="text-sm font-black text-slate-800 tracking-tight uppercase">SimNurse</span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        id="help-btn"
                        onClick={onHelpClick}
                        type="button"
                        className="min-h-11 min-w-11 rounded-xl bg-slate-50 p-2.5 text-slate-500 transition-colors hover:bg-slate-100 active:scale-95"
                        title="Restart onboarding tour"
                        aria-label="Help — restart onboarding tour"
                    >
                        <HelpCircle size={20} />
                    </button>
                </div>
            </div>

            {monitorState && unlocked && (
                <div id="mini-monitor" className="flex justify-around items-center bg-slate-900 text-white p-2 text-sm shadow-md">
                    <div className="flex flex-col items-center flex-1">
                        <span className="text-slate-400 text-xs font-semibold">HR</span>
                        <span className={`font-mono text-lg ${unlocked.hr ? 'text-green-400' : 'text-slate-600'}`}>
                            {unlocked.hr ? monitorState.hr : '--'}
                        </span>
                    </div>
                    <div className="flex flex-col items-center flex-1 border-l border-slate-700">
                        <span className="text-slate-400 text-xs font-semibold">BP</span>
                        <span className={`font-mono text-lg ${unlocked.bp ? 'text-blue-400' : 'text-slate-600'}`}>
                            {unlocked.bp ? monitorState.bp : '--/--'}
                        </span>
                    </div>
                    <div className="flex flex-col items-center flex-1 border-l border-slate-700">
                        <span className="text-slate-400 text-xs font-semibold">SpO2</span>
                        <span className={`font-mono text-lg ${unlocked.spo2 ? 'text-cyan-400' : 'text-slate-600'}`}>
                            {unlocked.spo2 ? `${monitorState.spo2}%` : '--'}
                        </span>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;
