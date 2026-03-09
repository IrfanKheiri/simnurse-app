import React, { useState } from 'react';
import { X, Check, Activity, BookOpen } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ProcedureGuideProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    steps: string[];
    actionId: string;
}

const ProcedureGuide: React.FC<ProcedureGuideProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    steps,
    actionId
}) => {
    const [dontShowAgain, setDontShowAgain] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (dontShowAgain) {
            const suppressed = JSON.parse(localStorage.getItem('suppressedProcedures') || '{}');
            suppressed[actionId] = true;
            localStorage.setItem('suppressedProcedures', JSON.stringify(suppressed));
        }
        onConfirm();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
            {/* Full-screen backdrop */}
            <div
                className={cn(
                    "absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0"
                )}
                onClick={onClose}
            />

            {/* Constrain card to app shell width, mb-20 clears the fixed BottomNav */}
            <div className="relative w-full sm:max-w-md mb-16">
                <div
                    className={cn(
                        "w-full bg-white rounded-t-[2.5rem] shadow-2xl transition-transform duration-300 ease-out border-t border-slate-100",
                        isOpen ? "translate-y-0" : "translate-y-full"
                    )}
                    style={{ maxHeight: '88vh', overflowY: 'auto' }}
                >
                    {/* Visual Handle */}
                    <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-2" />

                    <div className="p-5 pb-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-medical-500 rounded-xl text-white shadow-lg shadow-medical-100">
                                    <Activity size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 tracking-tight leading-tight">{title}</h2>
                                    <span className="text-[10px] font-bold text-medical-600 uppercase tracking-widest mt-1 inline-block">Quick Reference Card</span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                title="Close"
                                className="p-2 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 transition-colors shrink-0"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Diagram Placeholder */}
                        <div className="aspect-[16/7] w-full bg-slate-50 rounded-2xl mb-4 relative overflow-hidden border border-slate-100 group">
                            <div className="absolute inset-0 bg-gradient-to-br from-medical-500/5 to-indigo-500/5" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="relative w-24 h-24 opacity-20">
                                    <div className="absolute inset-0 border-4 border-medical-500 rounded-full animate-ping duration-[3000ms]" />
                                    <div className="absolute inset-6 border-4 border-indigo-500 rounded-full animate-pulse" />
                                </div>
                            </div>
                            <div className="flex flex-col items-center gap-2 text-slate-400 relative z-10 h-full justify-center">
                                <BookOpen size={28} strokeWidth={1.5} className="text-medical-400" />
                                <span className="text-[10px] uppercase font-black tracking-[0.2em]">Procedural Diagram</span>
                            </div>
                        </div>

                        {/* Step-by-Step Protocol */}
                        <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 mb-4">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-1.5 h-4 bg-medical-500 rounded-full" />
                                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Step-by-Step Protocol</h3>
                            </div>
                            <div className="space-y-3">
                                {steps.map((step, idx) => (
                                    <div key={idx} className="flex gap-3 group">
                                        <div className="flex flex-col items-center shrink-0">
                                            <div className="w-6 h-6 rounded-full bg-white border-2 border-slate-200 text-[10px] font-black text-slate-400 flex items-center justify-center group-hover:border-medical-500 group-hover:text-medical-500 transition-colors">
                                                {idx + 1}
                                            </div>
                                            {idx !== steps.length - 1 && (
                                                <div className="w-[2px] flex-1 bg-slate-100 my-0.5" />
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-600 font-medium leading-snug pt-0.5">
                                            {step}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer actions */}
                        <div className="flex flex-col gap-3">
                            <label className="group flex cursor-pointer items-center gap-2">
                                <span className="relative flex items-center justify-center">
                                    <input
                                        type="checkbox"
                                        checked={dontShowAgain}
                                        onChange={(event) => setDontShowAgain(event.target.checked)}
                                        className="sr-only"
                                    />
                                    <span
                                        aria-hidden="true"
                                        className="flex h-4 w-4 items-center justify-center rounded border transition-colors"
                                        style={{
                                            borderColor: dontShowAgain ? '#0d9488' : '#cbd5e1',
                                            backgroundColor: dontShowAgain ? '#0d9488' : 'white',
                                        }}
                                    >
                                        {dontShowAgain && <Check size={9} strokeWidth={3.5} className="text-white" />}
                                    </span>
                                </span>
                                <span className="select-none text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-colors group-hover:text-slate-600">
                                    Don't show this card again
                                </span>
                            </label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-3 px-5 rounded-2xl text-sm font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirm}
                                    className="flex-[2] py-3 px-5 rounded-2xl text-sm font-bold text-white bg-medical-600 shadow-xl shadow-medical-100 hover:bg-medical-700 transition-all active:scale-95"
                                >
                                    Confirm Action
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProcedureGuide;
