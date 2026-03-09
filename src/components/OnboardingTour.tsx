import React, { useState, useEffect } from 'react';
import { X, ChevronRight, Check } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

interface Step {
    id: string;
    targetId: string;
    title: string;
    content: string;
    position: 'top' | 'bottom' | 'left' | 'right';
    tab?: string;
}

const TOUR_STEPS: Step[] = [
    {
        id: 'help',
        targetId: 'help-btn',
        title: 'Need Assistance?',
        content: 'Tap the help icon any time to access clinical guidelines and procedure protocols.',
        position: 'bottom'
    },
    {
        id: 'progress',
        targetId: 'progress-bar',
        title: 'Track Your Progress',
        content: 'This bar shows your advancement through the current clinical scenario.',
        position: 'bottom',
        tab: 'status'
    },
    {
        id: 'vitals',
        targetId: 'vitals-container',
        title: 'Unlock Vitals',
        content: 'Perform a physical "Inspection" action to unlock and monitor additional patient vitals.',
        position: 'top',
        tab: 'status'
    }
];

interface OnboardingTourProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    /** FIX (L18): Tour should only auto-start when a scenario is active (not on library screen) */
    scenarioActive: boolean;
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({ activeTab, setActiveTab, scenarioActive }) => {
    const [currentStepIndex, setCurrentStepIndex] = useState(-1);
    const [isVisible, setIsVisible] = useState(false);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    // FIX (ISSUE-04): Tour is opt-in only. It starts immediately when the component
    // remounts due to a key change (i.e., the user clicked the help button).
    // The auto-start on first visit has been removed — no more 1-second timer hijacking
    // the learner's initial assessment. The `scenarioActive` guard ensures tour targets
    // (progress-bar, vitals-container) exist before we try to highlight them.
    useEffect(() => {
        if (!scenarioActive) return;
        setCurrentStepIndex(0);
        setIsVisible(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty deps — runs once on mount (i.e., when key changes from help-button click)

    useEffect(() => {
        if (currentStepIndex < 0 || currentStepIndex >= TOUR_STEPS.length) {
            const timer = window.setTimeout(() => {
                setTargetRect(null);
            }, 0);

            return () => window.clearTimeout(timer);
        }

        const step = TOUR_STEPS[currentStepIndex];

        if (step.tab && activeTab !== step.tab) {
            setActiveTab(step.tab);
            return;
        }

        const syncTargetRect = () => {
            const element = document.getElementById(step.targetId);
            if (!element) {
                setTargetRect(null);
                return;
            }

            setTargetRect(element.getBoundingClientRect());
        };

        const timer = window.setTimeout(() => {
            const element = document.getElementById(step.targetId);
            if (!element) {
                setTargetRect(null);
                return;
            }

            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            window.setTimeout(syncTargetRect, 150);
        }, 100);

        window.addEventListener('resize', syncTargetRect);
        window.addEventListener('scroll', syncTargetRect, true);

        return () => {
            window.clearTimeout(timer);
            window.removeEventListener('resize', syncTargetRect);
            window.removeEventListener('scroll', syncTargetRect, true);
        };
    }, [currentStepIndex, activeTab, setActiveTab]);

    const handleNext = () => {
        if (currentStepIndex < TOUR_STEPS.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            handleComplete();
        }
    };

    const handleComplete = () => {
        localStorage.setItem('simnurse_onboarding_complete', 'true');
        setIsVisible(false);
        setCurrentStepIndex(-1);
    };

    if (!isVisible || currentStepIndex === -1 || !targetRect) return null;

    const step = TOUR_STEPS[currentStepIndex];

    const viewportPadding = 16;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipWidth = Math.max(200, Math.min(260, viewportWidth - viewportPadding * 2));
    const tooltipHeightEstimate = 220;

    const desiredLeft =
        step.position === 'left'
            ? targetRect.left - tooltipWidth - 20
            : step.position === 'right'
                ? targetRect.right + 20
                : targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);

    const desiredTop =
        step.position === 'top'
            ? targetRect.top - tooltipHeightEstimate - 16
            : step.position === 'bottom'
                ? targetRect.bottom + 20
                : targetRect.top + (targetRect.height / 2) - (tooltipHeightEstimate / 2);

    const tooltipLeft = clamp(
        desiredLeft,
        viewportPadding,
        Math.max(viewportPadding, viewportWidth - tooltipWidth - viewportPadding),
    );
    const tooltipTop = clamp(
        desiredTop,
        viewportPadding,
        Math.max(viewportPadding, viewportHeight - tooltipHeightEstimate - viewportPadding),
    );
    const horizontalArrowOffset = clamp(
        targetRect.left + (targetRect.width / 2) - tooltipLeft,
        24,
        tooltipWidth - 24,
    );
    const verticalArrowOffset = clamp(
        targetRect.top + (targetRect.height / 2) - tooltipTop,
        24,
        tooltipHeightEstimate - 24,
    );

    const tooltipStyle: React.CSSProperties = {
        position: 'fixed',
        zIndex: 1000,
        left: tooltipLeft,
        top: tooltipTop,
        width: tooltipWidth,
        maxWidth: `calc(100vw - ${viewportPadding * 2}px)`,
    };

    const arrowStyle: React.CSSProperties =
        step.position === 'top' || step.position === 'bottom'
            ? { left: horizontalArrowOffset }
            : { top: verticalArrowOffset };

    return (
        <div className="fixed inset-0 z-[999] pointer-events-none">
            {/* Overlay with a hole */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] pointer-events-auto" onClick={handleComplete} style={{
                clipPath: `polygon(0% 0%, 0% 100%, ${targetRect.left}px 100%, ${targetRect.left}px ${targetRect.top}px, ${targetRect.right}px ${targetRect.top}px, ${targetRect.right}px ${targetRect.bottom}px, ${targetRect.left}px ${targetRect.bottom}px, ${targetRect.left}px 100%, 100% 100%, 100% 0%)`
            }} />

            {/* Tooltip */}
            <div
                style={tooltipStyle}
                className="w-[260px] bg-white rounded-3xl shadow-2xl p-6 pointer-events-auto animate-in fade-in zoom-in duration-300"
            >
                <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black text-medical-500 uppercase tracking-widest">
                        Step {currentStepIndex + 1} of {TOUR_STEPS.length}
                    </span>
                    <button
                        type="button"
                        onClick={handleComplete}
                        title="Close Tour"
                        className="text-slate-300 hover:text-slate-500 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                <h3 className="text-base font-black text-slate-800 tracking-tight mb-2">{step.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-6">{step.content}</p>

                <div className="flex items-center justify-between gap-4">
                    <button
                        type="button"
                        onClick={handleComplete}
                        className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                    >
                        Skip Tour
                    </button>
                    <button
                        type="button"
                        onClick={handleNext}
                        className="flex items-center gap-2 bg-medical-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-medical-100 active:scale-95 transition-all"
                    >
                        {currentStepIndex === TOUR_STEPS.length - 1 ? (
                            <>Got it <Check size={14} /></>
                        ) : (
                            <>Next <ChevronRight size={14} /></>
                        )}
                    </button>
                </div>

                {/* Arrow */}
                <div className={cn(
                    "absolute w-4 h-4 bg-white rotate-45",
                    step.position === 'top' && "bottom-[-8px] -translate-x-1/2",
                    step.position === 'bottom' && "top-[-8px] -translate-x-1/2",
                    step.position === 'left' && "right-[-8px] -translate-y-1/2",
                    step.position === 'right' && "left-[-8px] -translate-y-1/2",
                )} style={arrowStyle} />
            </div>
        </div>
    );
};

export default OnboardingTour;
