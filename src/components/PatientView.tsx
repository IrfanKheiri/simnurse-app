import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, Activity, Wind, AlertCircle, Zap, AlertTriangle, HelpCircle } from 'lucide-react';
import type { PatientState, ActiveIntervention } from '../types/scenario';
import { getInterventionBadgeLabel, getInterventionDisplayLabel } from '../lib/interventionLabels';
import { isInlineHelpSuppressed, type InlineHelpBlockers } from '../lib/inlineHelp';
import { useInlineHelpPopover } from '../hooks/useInlineHelpPopover';

interface PatientViewProps {
    onFinish: () => void;
    vitals: PatientState | null;
    activeInterventions: ActiveIntervention[];
    /** R-2: Whether vitals have been unlocked via StatusDashboard inspection */
    unlocked?: boolean;
    /** Higher-priority overlays that should suppress local inline help. */
    inlineHelpBlockers?: InlineHelpBlockers;
}

/** FIX (H11): Generate contextual clinical narrative from live vitals */
function buildClinicalNote(vitals: PatientState | null, unlocked: boolean): string {
    if (!vitals) return '"Patient status loading..."';

    // When vitals haven't been assessed yet, show only what's visually apparent
    if (!unlocked) {
        if (!vitals.pulsePresent) {
            return '"Patient is UNRESPONSIVE. Begin your primary survey — assess airway, breathing, and circulation immediately."';
        }
        return '"Patient is in bed. Conduct a systematic assessment to reveal clinical findings."';
    }

    const parts: string[] = [];
    const isCyanotic = vitals.spo2 < 90;
    const isTachycardic = vitals.hr > 150;
    const isBradycardic = vitals.hr > 0 && vitals.hr < 50;
    const sysBP = parseInt(vitals.bp.split('/')[0] || '0', 10);
    const isHypotensive = sysBP < 90 && sysBP > 0;
    const isHypertensive = sysBP >= 160;
    const isArrest = !vitals.pulsePresent;

    if (isArrest) {
        parts.push(`Patient is UNRESPONSIVE with no palpable pulse. Monitor shows ${vitals.rhythm}.`);
        return `"${parts.join(' ')}"`;
    }

    // Severe hypoxia / respiratory failure
    if (vitals.spo2 > 0 && vitals.spo2 < 75) {
        parts.push('Patient is severely hypoxic. Marked cyanosis of lips and fingertips. Breathing is labored or absent.');
        if (vitals.rr > 35) {
            parts.push(`Respiratory rate is ${vitals.rr}/min — patient is in extremis.`);
        } else if (vitals.rr === 0) {
            parts.push('No spontaneous respiratory effort observed. Patient requires immediate ventilation.');
        }
        return `"${parts.join(' ')}"`;
    }

    // Tachyarrhythmia with preserved BP — likely stable SVT or monitored tachycardia
    if (isTachycardic && vitals.rhythm !== 'Sinus' && sysBP >= 100) {
        parts.push(`Patient is alert and anxious. Heart rate is ${vitals.hr} bpm — patient reports rapid palpitations, chest tightness, and dizziness.`);
        parts.push(`Monitor shows ${vitals.rhythm}. Blood pressure is ${vitals.bp} mmHg — hemodynamics currently preserved.`);
        return `"${parts.join(' ')}"`;
    }

    // Unstable tachyarrhythmia with hypotension
    if (isTachycardic && vitals.rhythm !== 'Sinus' && isHypotensive) {
        parts.push(`Patient is pale and diaphoretic. Heart rate is critically elevated at ${vitals.hr} bpm with blood pressure ${vitals.bp} mmHg — hemodynamically unstable.`);
        parts.push(`Monitor shows ${vitals.rhythm} — urgent rhythm control required.`);
        return `"${parts.join(' ')}"`;
    }

    // Hypertensive with sinus rhythm and normal HR — STEMI or stroke presentation
    if (isHypertensive && vitals.rhythm === 'Sinus' && !isTachycardic && !isBradycardic) {
        if (vitals.spo2 < 95) {
            // STEMI-like: elevated BP, slight hypoxia, chest pain context
            parts.push(`Patient is diaphoretic and pale, clutching their chest. Reports crushing substernal chest pain radiating to the left arm, rated 9/10.`);
            parts.push(`Blood pressure is elevated at ${vitals.bp} mmHg. SpO2 ${vitals.spo2}%. Skin is cool and clammy.`);
        } else {
            // Stroke-like: severely elevated BP, normal SpO2, normal rhythm
            parts.push(`Patient presents with sudden-onset neurological deficit. Reports severe headache and difficulty speaking. One side of the face appears drooped.`);
            parts.push(`Blood pressure is critically elevated at ${vitals.bp} mmHg. SpO2 ${vitals.spo2}% on room air. GCS appears reduced.`);
        }
        return `"${parts.join(' ')}"`;
    }

    // Symptomatic bradycardia
    if (isBradycardic) {
        parts.push(`Heart rate is critically low at ${vitals.hr} bpm.`);
        if (isHypotensive) {
            parts.push(`Blood pressure is ${vitals.bp} mmHg — patient is pale, diaphoretic, and near-syncopal.`);
        }
        return `"${parts.join(' ')}"`;
    }

    // General presentation
    parts.push(isCyanotic
        ? 'Patient appears lethargic with noticeable perioral cyanosis.'
        : 'Patient is conscious and responsive.');

    if (isTachycardic) {
        parts.push(`Heart rate is markedly elevated at ${vitals.hr} bpm — patient reports palpitations and dizziness.`);
    }

    if (isHypotensive) {
        parts.push(`Blood pressure is dangerously low (${vitals.bp} mmHg) — patient is diaphoretic and pale.`);
    }

    if (vitals.spo2 < 85) {
        parts.push('Respiratory effort is severely compromised. Lips appear blue.');
    } else if (vitals.spo2 < 90) {
        parts.push('Respiratory effort is increased. SpO2 declining.');
    }

    if (vitals.rhythm !== 'Sinus') {
        parts.push(`Telemetry shows ${vitals.rhythm} — immediate assessment required.`);
    }

    return `"${parts.join(' ')}"`;
}

const patientIllustrationSrc = `${import.meta.env.BASE_URL}patient-illustration.png`;
const MAX_VISIBLE_INTERVENTION_BADGES = 3;
const INTERVENTION_HELP_PANEL_POSITION = {
    estimatedHeight: 220,
    maxWidth: 320,
    offset: 12,
    viewportMargin: 16,
} as const;

const InterventionHelpToggle: React.FC<{
    interventionLabels: string[];
    suppressed?: boolean;
}> = ({ interventionLabels, suppressed = false }) => {
    const hasInterventions = interventionLabels.length > 0;
    const { isOpen, panelId, panelRef, panelStyle, toggle, triggerRef } = useInlineHelpPopover({
        suppressed,
        ...INTERVENTION_HELP_PANEL_POSITION,
    });

    if (suppressed) {
        return null;
    }

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                aria-describedby={isOpen ? panelId : undefined}
                aria-label="Intervention help"
                title="Explain intervention section"
                onClick={toggle}
                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-medical-500 focus-visible:ring-offset-2"
            >
                <HelpCircle size={14} />
                <span>Help</span>
            </button>

            {isOpen && panelStyle && createPortal(
                <div
                    ref={panelRef}
                    id={panelId}
                    role="note"
                    className="fixed z-[60] rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-xl"
                    style={panelStyle}
                >
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        Active Intervention Help
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">
                        This section tracks the interventions currently affecting the patient. When more than three are active, the section keeps the remainder in the +N more summary pill.
                    </p>
                    {hasInterventions ? (
                        <>
                            <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                                Current interventions
                            </p>
                            <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-600" aria-label="Current intervention help details">
                                {interventionLabels.map((label) => (
                                    <li key={label}>• {label}</li>
                                ))}
                            </ul>
                        </>
                    ) : (
                        <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                            No active interventions are being tracked right now.
                        </p>
                    )}
                </div>,
                document.body,
            )}
        </>
    );
};

/** FIX (L19): Confirmation dialog before ending the scenario */
/** FIX (P1-F): Focus the End & Debrief button when the dialog mounts (matches user intent) */
const EndConfirmDialog: React.FC<{ onConfirm: () => void; onCancel: () => void }> = ({ onConfirm, onCancel }) => {
    const confirmButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        confirmButtonRef.current?.focus();
    }, []);

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-6">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onCancel} />
            <div className="relative bg-white rounded-3xl p-6 shadow-2xl w-full max-w-[340px] animate-in zoom-in-95 fade-in duration-200">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-red-50 rounded-xl">
                        <AlertTriangle size={20} className="text-red-500" />
                    </div>
                    <h2 className="text-base font-black text-slate-800">End Scenario?</h2>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed mb-6">
                    This will stop the simulation and take you to the debrief. You cannot undo this action.
                </p>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 py-3 rounded-2xl text-sm font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all"
                    >
                        Continue
                    </button>
                    <button
                        ref={confirmButtonRef}
                        id="end-scenario-confirm-btn"
                        type="button"
                        onClick={onConfirm}
                        className="flex-[2] py-3 rounded-2xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 active:scale-95 transition-all shadow-lg shadow-red-100"
                    >
                        End &amp; Debrief
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

const PatientView: React.FC<PatientViewProps> = ({
    onFinish,
    vitals,
    activeInterventions,
    unlocked = false,
    inlineHelpBlockers = {},
}) => {
    const [showEndConfirm, setShowEndConfirm] = useState(false);

    const o2Saturation = vitals?.spo2 ?? 100;
    const rhythm = vitals?.rhythm ?? 'Unknown';
    const isCyanotic = o2Saturation < 90;
    const isArrest = vitals ? !vitals.pulsePresent : false;
    const interventionCount = activeInterventions.length;
    const hasActiveInterventions = interventionCount > 0;
    const interventionHelpLabels = activeInterventions.map(({ id }) => getInterventionDisplayLabel(id));
    const suppressInterventionHelp = isInlineHelpSuppressed(inlineHelpBlockers) || showEndConfirm;

    const clinicalNote = buildClinicalNote(vitals, unlocked);

    // FIX (P1-C): Cap displayed badges at 3, show +N more pill for overflow
    const visibleInterventions = activeInterventions.slice(0, MAX_VISIBLE_INTERVENTION_BADGES);
    const overflowCount = Math.max(0, interventionCount - MAX_VISIBLE_INTERVENTION_BADGES);

    return (
        // FIX (P1-G): Add aria-label to the section
        <section id="patient-view-container" aria-label="Patient View" className="flex flex-col bg-slate-50">
            {/* Header Bar */}
            {/* FIX (P1-C): Active interventions moved here as a third in-flow row */}
            <header id="patient-view-header" className="p-6 pb-2 z-10">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Patient View</h1>
                        <p className="text-sm text-slate-500 font-medium flex items-center gap-2">
                            Status:{' '}
                            {isArrest ? (
                                <span className="text-red-600 flex items-center gap-1 animate-pulse font-bold">
                                    <AlertCircle size={14} /> CARDIAC ARREST
                                </span>
                            ) : isCyanotic ? (
                                <span className="text-red-500 flex items-center gap-1 animate-pulse">
                                    <AlertCircle size={14} /> Severe Hypoxia
                                </span>
                            ) : (
                                'Stable'
                            )}
                        </p>
                    </div>
                    {/* R-6: End button upgraded to solid red for clear destructive CTA */}
                    {/* FIX (P1-G): Add aria-label to End button */}
                    <button
                        id="finish-case-btn"
                        type="button"
                        onClick={() => setShowEndConfirm(true)}
                        className="p-3 bg-red-500 text-white hover:bg-red-600 rounded-2xl active:scale-95 transition-all flex items-center gap-2"
                        title="Finish Scenario"
                        aria-label="End scenario and view debrief"
                    >
                        <LogOut size={18} />
                        <span className="text-xs font-bold uppercase tracking-wider">End</span>
                    </button>
                </div>

                {/* Stable intervention section keeps a future affordance anchor without adding help UI yet. */}
                <section
                    id="patient-view-interventions"
                    aria-label="Active interventions"
                    className="mt-4 rounded-3xl border border-slate-200/80 bg-white/80 px-4 py-3 shadow-sm"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                                Interventions
                            </p>
                            <p className="mt-1 text-xs font-medium text-slate-500">
                                {hasActiveInterventions
                                    ? `${interventionCount} active intervention${interventionCount === 1 ? '' : 's'}`
                                    : 'No active interventions'}
                            </p>
                        </div>

                        <div
                            id="patient-view-intervention-anchor"
                            className="min-h-9 min-w-9 shrink-0 flex items-start justify-end"
                        >
                            <InterventionHelpToggle
                                interventionLabels={interventionHelpLabels}
                                suppressed={suppressInterventionHelp}
                            />
                        </div>
                    </div>

                    {hasActiveInterventions ? (
                        <>
                            <ul
                                id="active-interventions-list"
                                className="mt-3 flex flex-wrap gap-2"
                                aria-label="Visible active interventions"
                            >
                                {visibleInterventions.map((action) => (
                                    <li
                                        key={action.id}
                                        className="flex items-center gap-2 rounded-full bg-indigo-600/90 px-3 py-1.5 text-white shadow-md backdrop-blur-md animate-in fade-in slide-in-from-left-2"
                                    >
                                        <Zap size={14} className="animate-pulse" />
                                        <span className="text-xs font-bold tracking-wide">
                                            {getInterventionBadgeLabel(action.id)}
                                        </span>
                                    </li>
                                ))}
                                {overflowCount > 0 && (
                                    <li
                                        id="active-interventions-overflow"
                                        className="flex items-center gap-1 rounded-full bg-slate-400/80 px-3 py-1.5 text-white shadow-md"
                                        aria-label={`${overflowCount} additional active interventions not shown`}
                                    >
                                        <span className="text-xs font-bold tracking-wide">+{overflowCount} more</span>
                                    </li>
                                )}
                            </ul>

                            {overflowCount > 0 && (
                                <p className="mt-3 text-[11px] font-medium leading-relaxed text-slate-500">
                                    Showing {visibleInterventions.length} of {interventionCount} active interventions.
                                </p>
                            )}
                        </>
                    ) : (
                        <p
                            id="active-interventions-empty-state"
                            className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/90 px-3 py-2 text-xs font-medium text-slate-500"
                        >
                            No active interventions right now.
                        </p>
                    )}
                </section>
            </header>

            {/* Main Illustration Area */}
            <article id="patient-illustration-area" className="flex-1 relative flex items-center justify-center p-4">
                <div id="patient-illustration-wrapper" className="relative w-full max-w-[320px] aspect-[3/4] rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white">
                    {/* Base Layer: Patient Illustration */}
                    <img
                        id="patient-illustration"
                        src={patientIllustrationSrc}
                        alt="Patient Illustration"
                        className="w-full h-full object-cover"
                    />

                    {/* Dynamic Cyanosis Overlay */}
                    <div
                        className={`absolute inset-0 bg-indigo-600/30 transition-opacity duration-1000 mix-blend-multiply pointer-events-none ${isCyanotic ? 'opacity-100' : 'opacity-0'}`}
                    />

                    {/* Cardiac arrest overlay */}
                    {isArrest && (
                        <div className="absolute inset-0 bg-red-900/20 animate-pulse pointer-events-none" />
                    )}

                    {/* Vignette for depth */}
                    <div className="absolute inset-0 shadow-[inset_0_0_80px_rgba(0,0,0,0.1)] pointer-events-none" />
                </div>

                {/* Floating Vitals Indicators */}
                {/* R-2: opacity-70 when vitals are not yet unlocked to hint at the unlock mechanic */}
                <aside id="floating-vitals-badges" className={`absolute top-12 right-4 space-y-3 z-20 transition-opacity duration-500 ${unlocked ? 'opacity-100' : 'opacity-70'}`}>
                    <div className={`p-4 rounded-2xl border backdrop-blur-md shadow-xl transition-all duration-500 ${isCyanotic ? 'bg-red-500 text-white border-red-400 animate-pulse' : 'bg-white/90 text-slate-800 border-slate-100'}`}>
                        <div className="flex items-center gap-2 mb-1">
                            <Wind size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-70">SpO2</span>
                        </div>
                        <div className="text-2xl font-black leading-none">{unlocked ? `${o2Saturation}%` : '--'}</div>
                    </div>

                    <div className={`p-4 rounded-2xl border backdrop-blur-md shadow-xl flex flex-col items-center transition-all duration-500 ${isArrest ? 'bg-red-500 text-white border-red-400 animate-pulse' : 'bg-white/90 text-slate-800 border-slate-100'}`}>
                        <div className="flex items-center gap-2 mb-1">
                            <Activity size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Rhythm</span>
                        </div>
                        <div className="text-sm font-black whitespace-nowrap text-center">{unlocked ? rhythm.toUpperCase() : '--'}</div>
                    </div>
                </aside>
            </article>

            {/* FIX (H11): Dynamic clinical notes based on live vitals */}
            {/* FIX (P1-B): Converted from absolute to in-flow, sits naturally below illustration */}
            <div id="patient-narrative" className="w-full px-4 pb-4">
                <div className={`backdrop-blur-md rounded-2xl p-4 border shadow-premium text-center transition-all duration-500 ${isArrest ? 'bg-red-50/90 border-red-200' : 'bg-white/80 border-white'}`}>
                    {/* R-7: Standardized to font-medium italic (font-bold italic is harder to read at 14px) */}
                    <p className={`text-xs font-medium italic leading-relaxed ${isArrest ? 'text-red-700' : 'text-slate-600'}`}>
                        {clinicalNote}
                    </p>
                </div>
            </div>

            {/* FIX (L19): End confirmation dialog */}
            {showEndConfirm && (
                <EndConfirmDialog
                    onConfirm={() => { setShowEndConfirm(false); onFinish(); }}
                    onCancel={() => setShowEndConfirm(false)}
                />
            )}
        </section>
    );
};

export default PatientView;
