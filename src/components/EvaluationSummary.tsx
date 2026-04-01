import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, AlertTriangle, ArrowLeft, RefreshCcw, ExternalLink, Clock, Info, Trophy, Target, Star, Activity, BookOpen, Lightbulb, HelpCircle, type LucideIcon } from 'lucide-react';
import {
    getPerformanceTier,
    PERFORMANCE_TIER_HELP_INTRO,
    PERFORMANCE_TIER_HELP_INTERPRETATION,
    PERFORMANCE_TIER_HELP_MASTERY_HINT,
    PERFORMANCE_TIERS_HELP_STRING,
    type PerformanceTierLabel,
} from '../lib/scoreThresholds';
import { isInlineHelpSuppressed, mergeInlineHelpBlockers, type InlineHelpBlockers } from '../lib/inlineHelp';
import { useInlineHelpPopover } from '../hooks/useInlineHelpPopover';
import ProcedureGuide from './ProcedureGuide';
import { ACTIONS } from './ActionsScreen';
import type { Action } from './ActionsScreen';

export interface ActionFeedback {
    id: string;
    name: string;
    isCorrect: boolean;
    comment: string;
    categoryLabel?: string;
    timestamp: string;
    reviewId?: string;
    isDuplicate?: boolean;
    /** Human-readable label of the intervention expected at this sequence position. */
    expectedActionLabel?: string;
    /** Clinical rationale from InterventionDefinition.rationale for the expected action. */
    expectedActionRationale?: string;
}

interface EvaluationSummaryProps {
    score: number;
    actions: ActionFeedback[];
    clinicalConclusion: string;
    /** FIX (C2, H8): Outcome determines header colour & narrative framing */
    outcome: 'success' | 'failed' | 'manual';
    /** P3-A (ISSUE-08): Scenario-specific post-stabilization narrative */
    conclusion?: string;
    onRestart: () => void;
    /** FIX (H9): Now receives an onReturnToLibrary callback */
    onReturnToLibrary: () => void;
    onReviewProcedure: (id: string) => void;
    onHelpClick?: () => void;
    /** When true, session logs are still being fetched — show spinner in gauge */
    actionsLoading?: boolean;
    /** Higher-priority overlays that should suppress local inline help. */
    inlineHelpBlockers?: InlineHelpBlockers;
}

const TIER_UI = {
    Expert: { color: '#6366f1', icon: Trophy },
    Proficient: { color: '#10b981', icon: Star },
    Competent: { color: '#f59e0b', icon: Target },
    Developing: { color: '#f97316', icon: Info },
    Novice: { color: '#ef4444', icon: AlertCircle },
} satisfies Record<PerformanceTierLabel, { color: string; icon: LucideIcon }>;

const TIER_HELP_PANEL_POSITION = {
    estimatedHeight: 236,
    maxWidth: 288,
    offset: 12,
    viewportMargin: 16,
} as const;

const PerformanceTierHelpToggle: React.FC<{
    currentTierLabel: PerformanceTierLabel;
    currentTierSummary: string;
    accentColor: string;
    suppressed?: boolean;
}> = ({ currentTierLabel, currentTierSummary, accentColor, suppressed = false }) => {
    const { isOpen, panelId, panelRef, panelStyle, toggle, triggerRef } = useInlineHelpPopover({
        suppressed,
        ...TIER_HELP_PANEL_POSITION,
    });

    if (suppressed) {
        return null;
    }

    return (
        <div className="relative">
            <button
                ref={triggerRef}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                aria-describedby={isOpen ? panelId : undefined}
                onClick={toggle}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-medical-500 focus-visible:ring-offset-2"
            >
                <HelpCircle size={14} />
                <span>Tier Help</span>
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
                        Performance Tier Help
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">
                        {PERFORMANCE_TIER_HELP_INTRO}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">
                        {PERFORMANCE_TIER_HELP_INTERPRETATION}
                    </p>
                    <p className="mt-3 text-xs font-bold leading-relaxed" style={{ color: accentColor }}>
                        {currentTierLabel}: {currentTierSummary}
                    </p>
                    <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                        Thresholds: {PERFORMANCE_TIERS_HELP_STRING}.
                    </p>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                        {PERFORMANCE_TIER_HELP_MASTERY_HINT}
                    </p>
                </div>,
                document.body,
            )}
        </div>
    );
};

const ScoreGauge: React.FC<{ score: number; loading?: boolean; suppressTierHelp?: boolean }> = ({ score, loading, suppressTierHelp = false }) => {
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    const tier = useMemo(() => {
        const match = getPerformanceTier(score);
        return { ...match, ...TIER_UI[match.label] };
    }, [score]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-4 text-center">
                <div className="w-40 h-40 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-medical-500" />
                </div>
                <p className="text-xs text-slate-400 mt-4 font-semibold uppercase tracking-wider">
                    Loading results…
                </p>
            </div>
        );
    }

    return (
        <div className="relative flex flex-col items-center justify-center py-4 text-center">
            {/* overflow-hidden prevents the stroke from bleeding outside the bounds */}
            <div className="relative w-40 h-40 overflow-hidden">
                {/* viewBox centres the coordinate space; rotate(-90) on <g> keeps the SVG
                    layout box untouched so the absolute text overlay stacks correctly */}
                <svg className="w-full h-full" viewBox="0 0 120 120">
                    <g transform="rotate(-90 60 60)">
                        <circle cx="60" cy="60" r={radius} stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
                        <circle
                            cx="60" cy="60" r={radius}
                            stroke={tier.color} strokeWidth="12" fill="transparent"
                            strokeDasharray={circumference} strokeDashoffset={offset}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                        />
                    </g>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-black text-slate-800 tracking-tighter">{score}%</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Protocol Score</span>
                </div>
            </div>

            <div className="mt-4 flex flex-col items-center">
                <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
                    <div
                        className="flex items-center gap-2 rounded-2xl border border-slate-100 px-4 py-2 shadow-sm"
                        style={{ backgroundColor: `${tier.color}10`, borderColor: `${tier.color}20` }}
                    >
                        <tier.icon size={16} style={{ color: tier.color }} />
                        <span className="text-sm font-black uppercase tracking-widest" style={{ color: tier.color }}>
                            {tier.label}
                        </span>
                    </div>
                    <PerformanceTierHelpToggle
                        currentTierLabel={tier.label}
                        currentTierSummary={tier.summary}
                        accentColor={tier.color}
                        suppressed={suppressTierHelp}
                    />
                </div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Clinical Performance Tier</p>
            </div>
        </div>
    );
};

/** FIX (L22): Shows an empty state when no interventions were recorded */
const Timeline: React.FC<{ actions: ActionFeedback[]; onReviewProcedure: (id: string) => void }> = ({ actions, onReviewProcedure }) => {
    if (actions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center opacity-70">
                <div className="p-4 bg-slate-100 rounded-full">
                    <BookOpen size={28} className="text-slate-400" />
                </div>
                <p className="text-sm font-bold text-slate-600">No interventions recorded</p>
                <p className="text-xs text-slate-400 max-w-[220px] leading-relaxed">
                    No actions were applied during this session. Restart the scenario and use the Actions tab to treat the patient.
                </p>
            </div>
        );
    }

    return (
        <div>
            {/* Color legend */}
            <div className="flex items-center gap-4 mb-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    Correct
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                    Repeat / already active
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                    Protocol / state issue
                </span>
            </div>
        <div className="relative pb-8">
            <div className="absolute left-[27px] top-6 bottom-0 w-[2px] bg-slate-100 rounded-full" />
            <div className="space-y-8">
                {actions.map((action) => (
                    <div key={action.id} className="relative flex gap-6 items-start group">
                        {/* Time Handle */}
                        <div className="flex flex-col items-center shrink-0 w-14">
                            <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-lg mb-2">
                                {action.timestamp}
                            </span>
                            <div className={`w-3 h-3 rounded-full border-2 bg-white relative z-10 ${
                                action.isCorrect
                                    ? 'border-emerald-500'
                                    : action.isDuplicate
                                    ? 'border-amber-400'
                                    : 'border-red-500'
                            }`}>
                                <div className={`absolute inset-1 rounded-full ${
                                    action.isCorrect
                                        ? 'bg-emerald-500 animate-pulse'
                                        : action.isDuplicate
                                        ? 'bg-amber-400'
                                        : 'bg-red-500'
                                }`} />
                            </div>
                        </div>

                        {/* Event Content */}
                        <div className={`flex-1 p-5 rounded-[2rem] border transition-all ${
                            action.isCorrect
                                ? 'bg-white border-slate-200'
                                : action.isDuplicate
                                ? 'bg-amber-50/50 border-amber-100'
                                : 'bg-red-50/50 border-red-100'
                        }`}>
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="text-sm font-black text-slate-800 tracking-tight leading-tight">{action.name}</h4>
                                {action.isCorrect ? (
                                    <div className="p-1 text-emerald-600"><CheckCircle2 size={16} /></div>
                                ) : action.isDuplicate ? (
                                    <div className="p-1 text-amber-500"><AlertTriangle size={16} /></div>
                                ) : (
                                    <div className="p-1 text-red-600"><AlertCircle size={16} /></div>
                                )}
                            </div>
                            {action.categoryLabel && (
                                <div className="mb-2">
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                                        action.isDuplicate
                                            ? 'bg-amber-100 text-amber-700'
                                            : 'bg-red-100 text-red-700'
                                    }`}>
                                        {action.categoryLabel}
                                    </span>
                                </div>
                            )}
                            <p className={`text-xs leading-relaxed mb-3 ${
                                action.isCorrect
                                    ? 'text-slate-500'
                                    : action.isDuplicate
                                    ? 'text-amber-700 font-medium'
                                    : 'text-red-700 font-medium'
                            }`}>
                                {action.comment}
                            </p>

                            {!action.isCorrect && !action.isDuplicate && action.reviewId && (
                                <button
                                    type="button"
                                    onClick={() => onReviewProcedure(action.reviewId!)}
                                    className="flex items-center gap-1.5 text-[10px] font-black text-red-600 uppercase tracking-widest hover:underline"
                                >
                                    <ExternalLink size={12} />
                                    Review Protocol
                                </button>
                            )}

                            {/* Correct-step guidance — only for sequence errors with known expected action */}
                            {!action.isCorrect && !action.isDuplicate && action.expectedActionLabel && (
                                <div className="mt-3 pt-3 border-t border-red-100">
                                    <div className="flex items-start gap-2">
                                        <div className="shrink-0 mt-0.5 text-amber-500">
                                            <Lightbulb size={14} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-0.5">
                                                Expected step at this point:
                                            </p>
                                            <p className="text-xs font-bold text-slate-800 leading-snug mb-1">
                                                {action.expectedActionLabel}
                                            </p>
                                            {action.expectedActionRationale && (
                                                <p className="text-xs text-slate-500 leading-relaxed">
                                                    {action.expectedActionRationale}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
        </div>
    );
};

const EvaluationSummary: React.FC<EvaluationSummaryProps> = ({
    score,
    actions,
    clinicalConclusion,
    outcome,
    conclusion,
    onRestart,
    onReturnToLibrary,
    onReviewProcedure: _onReviewProcedure,
    onHelpClick,
    actionsLoading,
    inlineHelpBlockers = {},
}) => {
    const [reviewAction, setReviewAction] = useState<Action | null>(null);
    const suppressTierHelp = useMemo(() => isInlineHelpSuppressed(mergeInlineHelpBlockers(
        inlineHelpBlockers,
        { procedureGuide: reviewAction !== null },
    )), [inlineHelpBlockers, reviewAction]);

    // R-4: Cleanup reviewAction on unmount so ProcedureGuide portal closes
    React.useEffect(() => {
        return () => {
            setReviewAction(null);
        };
    }, []);
    /** FIX (H8): Outcome-dependent header colour */
    // TODO: add medical-N token for 'manual' outcome accent if indigo-600 is replaced
    const outcomeColor =
        outcome === 'success' ? 'text-emerald-600' :
        outcome === 'failed'  ? 'text-red-600' :
        'text-indigo-600';

    const outcomeLabel =
        outcome === 'success' ? '✓ Patient Stabilized' :
        outcome === 'failed'  ? '✗ Scenario Failed' :
        'Session Ended';

    return (
        <main id="evaluation-summary-container" className="flex flex-col h-full bg-slate-50 overflow-y-auto pb-10">
            {/* Header */}
            <header className="p-6 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <h1 className="text-xl font-black text-slate-800 tracking-tight">Post-Scenario Debrief</h1>
                <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full shadow-sm bg-slate-50 ${outcomeColor}`}>
                        <Clock size={12} />
                        <span className="text-[10px] font-black uppercase tracking-wider">{outcomeLabel}</span>
                    </div>
                    {onHelpClick && (
                        <button
                            type="button"
                            onClick={onHelpClick}
                            title="Open Help"
                            aria-label="Open debrief help"
                            className="p-2 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors"
                        >
                            <HelpCircle size={18} />
                        </button>
                    )}
                </div>
            </header>

            <article className="p-6">
                {/* Score Card */}
                <section id="score-gauge" className="bg-white rounded-3xl p-4 shadow-premium border border-slate-100 mb-8 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-slate-900 pointer-events-none">
                        <Trophy size={160} strokeWidth={1} />
                    </div>
                    <ScoreGauge score={score} loading={actionsLoading} suppressTierHelp={suppressTierHelp} />
                </section>

                {/* P3-A (ISSUE-08): Scenario-specific outcome narrative */}
                {outcome === 'success' && (
                    <section className="mb-6">
                        <p className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm font-medium leading-relaxed italic p-5 rounded-[2rem]">
                            "{conclusion ?? 'Patient stabilized.'}"
                        </p>
                    </section>
                )}

                {/* FIX (H8): Clinical Conclusion — now outcome-specific */}
                <section id="clinical-conclusion" className="mb-10 group">
                    <header className="flex items-center gap-3 mb-4">
                        {/* TODO: add medical-N token for success/manual accent — indigo-500 kept as decorative gradient fallback */}
                        <div className={`p-2 rounded-xl text-white shadow-lg ${outcome === 'failed' ? 'bg-red-500 shadow-red-100' : 'bg-indigo-500 shadow-indigo-100'}`}>
                            <Info size={18} />
                        </div>
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Clinical Conclusion</h3>
                    </header>
                    {/* TODO: add medical-N token for success/manual gradient — indigo-600/800 kept as decorative gradient (no equivalent medical-* shade for gradient stop) */}
                    <div className={`rounded-3xl p-8 text-white shadow-xl relative overflow-hidden ${outcome === 'failed' ? 'bg-gradient-to-br from-red-600 to-red-800 shadow-red-100' : 'bg-gradient-to-br from-indigo-600 to-indigo-800 shadow-indigo-100'}`}>
                        <div className="absolute -bottom-8 -right-8 opacity-10 pointer-events-none">
                            <Activity size={120} strokeWidth={1} />
                        </div>
                        {/* R-7: font-medium italic standardized (matches PatientView clinical note) */}
                        <p className="text-sm font-medium leading-relaxed italic relative z-10">
                            "{clinicalConclusion}"
                        </p>
                    </div>
                </section>

                {/* Timeline of Actions */}
                <section id="action-timeline" className="mb-10">
                    <header className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-medical-500 rounded-xl text-white shadow-lg shadow-medical-100">
                            <Clock size={18} />
                        </div>
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Timeline of Interventions</h3>
                    </header>
                    <Timeline actions={actions} onReviewProcedure={(id) => setReviewAction(ACTIONS.find(a => a.id === id) ?? null)} />
                </section>

                {reviewAction && (
                    <ProcedureGuide
                        isOpen={!!reviewAction}
                        onClose={() => setReviewAction(null)}
                        onConfirm={() => setReviewAction(null)}
                        title={reviewAction.label}
                        steps={reviewAction.steps}
                        actionId={reviewAction.id}
                    />
                )}

                {/* Action Buttons */}
                <nav id="debrief-cta-row" className="flex flex-col gap-3 mt-4">
                    <button
                        id="restart-scenario-btn"
                        type="button"
                        onClick={onRestart}
                        className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-sm flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all group"
                    >
                        <RefreshCcw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                        TRY SCENARIO AGAIN
                    </button>
                    {/* FIX (H9): "Return to Library" now has a real onClick handler */}
                    <button
                        id="return-to-library-btn"
                        type="button"
                        onClick={onReturnToLibrary}
                        className="w-full py-5 bg-white border border-slate-100 text-slate-600 rounded-[2rem] font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-slate-50"
                    >
                        <ArrowLeft size={16} />
                        Return to Library
                    </button>
                </nav>
            </article>
        </main>
    );
};

export default EvaluationSummary;
