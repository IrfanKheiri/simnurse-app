import React, { useState } from 'react';
import ECGWaveform from './ECGWaveform';
import VitalCard from './VitalCard';
import { Activity, Wind, Droplets, Heart, Zap, Search, AlertTriangle, Info, X } from 'lucide-react';

import type { PatientDemographics, PatientState } from '../types/scenario';

interface StatusDashboardProps {
    vitals: PatientState | null;
    unlocked: Record<'hr' | 'spo2' | 'bp' | 'rr', boolean>;
    setUnlocked: React.Dispatch<React.SetStateAction<Record<'hr' | 'spo2' | 'bp' | 'rr', boolean>>>;
    scenarioProgressPct?: number;
    /** FIX (L20): Flag to distinguish a true loading state from an error/null state */
    isLoading?: boolean;
    /** FIX (ISSUE-18): Patient demographics from the active scenario */
    patient?: PatientDemographics;
}

const StatusDashboard: React.FC<StatusDashboardProps> = ({
    vitals,
    unlocked,
    setUnlocked,
    scenarioProgressPct = 0,
    isLoading = true,
    patient,
}) => {

    const [hintDismissed, setHintDismissed] = useState(() => localStorage.getItem('simnurse_inspection_hint_dismissed') === 'true');

    const allUnlocked = Object.values(unlocked).every(v => v);

    const handleUnlock = (key: string) => {
        setUnlocked(prev => ({ ...prev, [key]: true }));
    };

    const handleInspectAll = () => {
        setUnlocked({
            hr: true,
            spo2: true,
            bp: true,
            rr: true,
        });
    };

    const progressColor =
        scenarioProgressPct >= 80 ? 'bg-emerald-500' :
        scenarioProgressPct >= 50 ? 'bg-medical-500' :
        'bg-amber-500';

    return (
        <section id="status-dashboard-container" className="flex min-h-full flex-col bg-slate-50">
            {/* Header Area */}
            <header id="status-screen-header" className="p-6 pb-2">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-1">Status</h1>
                {/* FIX (ISSUE-18): Render demographics from scenario data, not hardcoded string */}
                <p className="text-sm text-slate-500 font-medium">
                    {patient
                        ? `Patient: ${patient.name} • ${patient.age} ${patient.gender}`
                        : 'Patient: Unknown Patient'}
                </p>
            </header>

            <article className="flex-1 px-6 pt-2 pb-4">
                {/* FIX (ISSUE-16): Pass live rhythm & pulsePresent so the waveform reflects patient state */}
                <ECGWaveform
                    rhythm={vitals?.rhythm ?? 'Sinus'}
                    pulsePresent={vitals?.pulsePresent ?? true}
                />

                {/* FIX (L20): Distinguish loading from error */}
                {!vitals ? (
                    isLoading ? (
                        <div className="flex items-center justify-center gap-3 py-10 text-slate-400">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-medical-500" />
                            <span className="text-sm font-medium">Initializing sensors…</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                            <div className="p-3 bg-red-50 rounded-full">
                                <AlertTriangle size={24} className="text-red-500" />
                            </div>
                            <p className="text-sm font-bold text-slate-700">Sensor data unavailable</p>
                            <p className="text-xs text-slate-400 max-w-[220px]">The simulation engine could not provide vital signs. Try restarting the scenario.</p>
                        </div>
                    )
                ) : (
                <>
                <header className="flex justify-between items-center mb-4">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Activity size={14} className="text-medical-500" />
                        Vital Signs
                    </h2>
                    {!allUnlocked && (
                        <button
                            id="quick-inspection-btn"
                            type="button"
                            onClick={handleInspectAll}
                            className="flex items-center gap-2 px-3 py-1.5 bg-medical-500 text-white rounded-full text-[10px] font-bold shadow-md hover:bg-medical-600 transition-colors uppercase tracking-wider"
                        >
                            <Search size={12} />
                            Quick Inspection
                        </button>
                    )}
                </header>

                {!allUnlocked && !hintDismissed && (
                    <div className="mb-3 flex items-start gap-3 rounded-xl bg-medical-50 border border-medical-100 px-4 py-3">
                        <Info size={14} className="text-medical-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-medical-700 leading-relaxed flex-1">
                            Tap each vital card or use <strong>Quick Inspection</strong> above to reveal live readings.
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                localStorage.setItem('simnurse_inspection_hint_dismissed', 'true');
                                setHintDismissed(true);
                            }}
                            className="text-medical-500 hover:text-medical-700 shrink-0"
                            aria-label="Dismiss hint"
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}

                {/* Vitals Grid */}
                <section id="vitals-container" className="grid grid-cols-2 gap-4">
                    <VitalCard
                        label="Heart Rate"
                        value={vitals.hr}
                        unit="bpm"
                        icon={Heart}
                        colorKey="hr"
                        isLocked={!unlocked.hr}
                        onUnlock={() => handleUnlock('hr')}
                    />
                    <VitalCard
                        label="O2 Sat"
                        value={vitals.spo2}
                        unit="%"
                        icon={Droplets}
                        colorKey="spo2"
                        isLocked={!unlocked.spo2}
                        onUnlock={() => handleUnlock('spo2')}
                    />
                    <VitalCard
                        label="Blood Pressure"
                        value={vitals.bp}
                        unit="mmHg"
                        icon={Activity}
                        colorKey="bp"
                        isLocked={!unlocked.bp}
                        onUnlock={() => handleUnlock('bp')}
                    />
                    <VitalCard
                        label="Resp Rate"
                        value={vitals.rr}
                        unit="/min"
                        icon={Wind}
                        colorKey="rr"
                        isLocked={!unlocked.rr}
                        onUnlock={() => handleUnlock('rr')}
                    />
                </section>

                {/* TODO: add medical-N token for gradient end-stop — indigo-50 kept as decorative gradient accent (no equivalent medical-* shade at this depth) */}
                <aside id="progress-bar" className="mt-8 p-4 rounded-xl bg-gradient-to-r from-medical-50 to-indigo-50 border border-medical-100 flex items-start gap-4 shadow-sm">
                    <div className="p-2 bg-medical-500 rounded-lg text-white shrink-0">
                        <Zap size={20} />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm font-bold text-slate-800">Scenario Progress</span>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                            <div
                                className={`${progressColor} h-full transition-all duration-1000 rounded-full`}
                                style={{ width: `${scenarioProgressPct}%` }}
                            />
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 font-semibold uppercase">
                            {scenarioProgressPct}% Scenario Objective Complete
                        </span>
                        {/* Color legend */}
                        <div className="flex items-center gap-3 mt-1.5">
                            <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                                On track
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                <span className="w-2 h-2 rounded-full bg-medical-500 shrink-0" aria-hidden="true" />
                                In progress
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" aria-hidden="true" />
                                Early stage
                            </span>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1">
                            Based on protocol completion and scenario outcome targets.
                        </span>
                    </div>
                </aside>
                </>
                )}
            </article>
        </section>
    );
};

export default StatusDashboard;
