import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { HelpSystemState, HelpSystemActions } from '../hooks/useHelpSystem';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

interface WalkthroughEngineProps {
    helpSystem: HelpSystemState & HelpSystemActions;
    setActiveTab: (tab: string) => void;
}

const WalkthroughEngine: React.FC<WalkthroughEngineProps> = ({ helpSystem, setActiveTab }) => {
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    const {
        walkthroughActive,
        walkthroughStepIndex,
        content,
        nextStep,
        prevStep,
        completeWalkthrough,
        skipWalkthrough,
    } = helpSystem;

    const steps = content.steps;
    const currentStep = steps[walkthroughStepIndex] ?? null;
    const isLastStep = walkthroughStepIndex === steps.length - 1;

    // Tab switching + target rect resolution
    useEffect(() => {
        if (!walkthroughActive || !currentStep) {
            setTargetRect(null);
            return;
        }

        // If step requires a tab switch, do it and wait for DOM to settle
        if (currentStep.tab) {
            setActiveTab(currentStep.tab);
        }

        const syncTargetRect = () => {
            const element = document.getElementById(currentStep.targetId);
            if (!element) {
                setTargetRect(null);
                return;
            }
            setTargetRect(element.getBoundingClientRect());
        };

        // Delay to let tab switch + DOM settle (matching OnboardingTour pattern)
        const timer = window.setTimeout(() => {
            const element = document.getElementById(currentStep.targetId);
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
    }, [walkthroughActive, walkthroughStepIndex, currentStep, setActiveTab]);

    // Missing target auto-skip (Issue 4 fix)
    useEffect(() => {
        if (!walkthroughActive || !currentStep) return;
        if (targetRect !== null) return; // target found, no skip needed

        // Wait a tick to let the tab/DOM settle before deciding to skip
        const timer = window.setTimeout(() => {
            if (!walkthroughActive || !currentStep) return;
            const el = document.getElementById(currentStep.targetId);
                if (el === null) {
                    const isLastStep = helpSystem.walkthroughStepIndex === helpSystem.content.steps.length - 1;
                    if (isLastStep) {
                        // Use skipWalkthrough instead of completeWalkthrough so that a fully-invisible
                        // tour (all targets missing) is never falsely marked as completed in localStorage.
                        // completeWalkthrough() is only called when the user explicitly clicks "Got it".
                        helpSystem.skipWalkthrough();
                    } else {
                        helpSystem.nextStep();
                    }
                }
        }, 300);

        return () => window.clearTimeout(timer);
    }, [walkthroughActive, currentStep, targetRect, helpSystem]);

    // Keyboard navigation
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (!walkthroughActive) return;
            if (e.key === 'ArrowRight') {
                if (isLastStep) {
                    completeWalkthrough();
                } else {
                    nextStep();
                }
            } else if (e.key === 'ArrowLeft') {
                prevStep();
            } else if (e.key === 'Escape') {
                skipWalkthrough();
            }
        },
        [walkthroughActive, isLastStep, nextStep, prevStep, completeWalkthrough, skipWalkthrough]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Render nothing when inactive or no target rect
    if (!walkthroughActive || !currentStep || !targetRect) return null;

    const viewportPadding = 16;
    const BOTTOM_NAV_HEIGHT = 64; // min-h-14 (56px Tailwind) + safe-area buffer
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipWidth = Math.max(200, Math.min(280, viewportWidth - viewportPadding * 2));
    const tooltipHeightEstimate = 240;

    const desiredLeft =
        currentStep.position === 'left'
            ? targetRect.left - tooltipWidth - 20
            : currentStep.position === 'right'
                ? targetRect.right + 20
                : targetRect.left + targetRect.width / 2 - tooltipWidth / 2;

    const desiredTop =
        currentStep.position === 'top'
            ? targetRect.top - tooltipHeightEstimate - 16
            : currentStep.position === 'bottom'
                ? targetRect.bottom + 20
                : targetRect.top + targetRect.height / 2 - tooltipHeightEstimate / 2;

    const tooltipLeft = clamp(
        desiredLeft,
        viewportPadding,
        Math.max(viewportPadding, viewportWidth - tooltipWidth - viewportPadding),
    );
    const tooltipTop = clamp(
        desiredTop,
        viewportPadding,
        Math.max(viewportPadding, viewportHeight - BOTTOM_NAV_HEIGHT - tooltipHeightEstimate - viewportPadding),
    );
    const horizontalArrowOffset = clamp(
        targetRect.left + targetRect.width / 2 - tooltipLeft,
        24,
        tooltipWidth - 24,
    );
    const verticalArrowOffset = clamp(
        targetRect.top + targetRect.height / 2 - tooltipTop,
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
        maxHeight: `calc(100vh - ${tooltipTop + BOTTOM_NAV_HEIGHT + viewportPadding}px)`,
        overflowY: 'auto',
    };

    const arrowStyle: React.CSSProperties =
        currentStep.position === 'top' || currentStep.position === 'bottom'
            ? { left: horizontalArrowOffset }
            : { top: verticalArrowOffset };

    return (
        <div className="fixed inset-0 z-[999] pointer-events-none">
            {/* Four-panel overlay (Safari-safe — no clip-path) */}
            {/* Top panel */}
            <div
                className="pointer-events-auto bg-slate-900/60 backdrop-blur-sm"
                onClick={skipWalkthrough}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: targetRect.top,
                    zIndex: 999,
                }}
            />
            {/* Bottom panel */}
            <div
                className="pointer-events-auto bg-slate-900/60 backdrop-blur-sm"
                onClick={skipWalkthrough}
                style={{
                    position: 'fixed',
                    top: targetRect.bottom,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 999,
                }}
            />
            {/* Left panel */}
            <div
                className="pointer-events-auto bg-slate-900/60 backdrop-blur-sm"
                onClick={skipWalkthrough}
                style={{
                    position: 'fixed',
                    top: targetRect.top,
                    left: 0,
                    width: targetRect.left,
                    height: targetRect.height,
                    zIndex: 999,
                }}
            />
            {/* Right panel */}
            <div
                className="pointer-events-auto bg-slate-900/60 backdrop-blur-sm"
                onClick={skipWalkthrough}
                style={{
                    position: 'fixed',
                    top: targetRect.top,
                    left: targetRect.right,
                    right: 0,
                    height: targetRect.height,
                    zIndex: 999,
                }}
            />

            {/* Spotlight guard — intercepts taps on the spotlit element to advance tour */}
            <div
                className="pointer-events-auto"
                onClick={isLastStep ? helpSystem.completeWalkthrough : helpSystem.nextStep}
                title="Tap to advance tour"
                style={{
                    position: 'fixed',
                    top: targetRect.top,
                    left: targetRect.left,
                    width: targetRect.width,
                    height: targetRect.height,
                    zIndex: 999,
                    cursor: 'pointer',
                    background: 'transparent',
                }}
            />

            {/* Tooltip */}
            <div
                style={tooltipStyle}
                className="bg-white rounded-3xl shadow-2xl p-5 pointer-events-auto animate-in fade-in zoom-in duration-300"
            >
                {/* Header row: progress dots + close button */}
                <div className="flex justify-between items-center mb-3">
                    {/* Progress dots */}
                    <div className="flex items-center gap-1.5">
                        {steps.map((_, idx) => (
                            <span
                                key={idx}
                                className={cn(
                                    'block w-2 h-2 rounded-full transition-colors duration-200',
                                    idx === walkthroughStepIndex
                                        ? 'bg-medical-500'
                                        : 'bg-slate-200',
                                )}
                            />
                        ))}
                    </div>
                    {/* Close button */}
                    <button
                        type="button"
                        onClick={skipWalkthrough}
                        title="Close Tour"
                        className="text-slate-300 hover:text-slate-500 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Step title */}
                <h3 className="text-base font-black text-slate-800 tracking-tight mb-1.5">
                    {currentStep.title}
                </h3>

                {/* Step content */}
                <p className="text-xs text-slate-500 leading-relaxed mb-3">
                    {currentStep.content}
                </p>

                {/* Auto-start behavioral callout — shown on step 0 only */}
                {walkthroughStepIndex === 0 && (
                    <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
                        <p className="text-[10px] text-amber-700 leading-snug">
                            ⚠️ Auto-started: this tour fires once per screen. Dismiss anytime.
                        </p>
                    </div>
                )}

                {/* Navigation row */}
                <div className="flex items-center justify-between gap-2">
                    {/* Skip Tour */}
                    <button
                        type="button"
                        onClick={skipWalkthrough}
                        className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                    >
                        Skip Tour
                    </button>

                    {/* Prev + Next/Got it */}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={prevStep}
                            disabled={walkthroughStepIndex === 0}
                            title="Previous step"
                            className={cn(
                                'flex items-center justify-center w-8 h-8 rounded-xl border transition-all',
                                walkthroughStepIndex === 0
                                    ? 'border-slate-100 text-slate-200 cursor-not-allowed'
                                    : 'border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700 active:scale-95',
                            )}
                        >
                            <ChevronLeft size={14} />
                        </button>

                        <button
                            type="button"
                            onClick={isLastStep ? completeWalkthrough : nextStep}
                            className="flex items-center gap-1.5 bg-medical-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-medical-100 active:scale-95 transition-all"
                        >
                            {isLastStep ? (
                                <>Got it <Check size={13} /></>
                            ) : (
                                <>Next <ChevronRight size={13} /></>
                            )}
                        </button>
                    </div>
                </div>

                {/* Arrow indicator */}
                <div
                    className={cn(
                        'absolute w-4 h-4 bg-white rotate-45',
                        currentStep.position === 'top' && 'bottom-[-8px] -translate-x-1/2',
                        currentStep.position === 'bottom' && 'top-[-8px] -translate-x-1/2',
                        currentStep.position === 'left' && 'right-[-8px] -translate-y-1/2',
                        currentStep.position === 'right' && 'left-[-8px] -translate-y-1/2',
                    )}
                    style={arrowStyle}
                />
            </div>
        </div>
    );
};

export default WalkthroughEngine;
