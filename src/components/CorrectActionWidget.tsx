import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle } from 'lucide-react';

interface CorrectActionWidgetProps {
    message: string;
    onDismiss: () => void;
    variant?: 'success' | 'ineffective';
}

const CorrectActionWidget: React.FC<CorrectActionWidgetProps> = ({ message, onDismiss, variant }) => {
    const isIneffective = variant === 'ineffective';
    useEffect(() => {
        const timer = setTimeout(() => {
            document.getElementById('correct-action-continue-btn')?.focus();
        }, 0);
        return () => clearTimeout(timer);
    }, []);

    return createPortal(
        <>
            <style>{`
                @keyframes correctPulse {
                    0%   { transform: scale(0.92); opacity: 0; }
                    60%  { transform: scale(1.03); opacity: 1; }
                    100% { transform: scale(1);    opacity: 1; }
                }
                .correct-pulse {
                    animation: correctPulse 0.3s ease-out both;
                }
            `}</style>
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-6 pointer-events-none">
                {/* Backdrop — constrained to 440px app column so it doesn't bleed into desktop gutters */}
                <div
                    className="absolute left-1/2 -translate-x-1/2 w-full max-w-[440px] inset-y-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto"
                    onClick={onDismiss}
                />

                {/* Modal */}
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="correct-action-title"
                    className="correct-pulse relative bg-white rounded-[2rem] w-full max-w-sm shadow-2xl overflow-hidden pointer-events-auto border border-green-100"
                >
                    <div className={`${isIneffective ? 'bg-gradient-to-br from-amber-500 to-amber-600' : 'bg-gradient-to-br from-green-500 to-green-600'} p-8 flex flex-col items-center justify-center text-white text-center relative overflow-hidden`}>
                        <div className="absolute -top-10 -right-10 opacity-10 pointer-events-none">
                            <CheckCircle size={160} strokeWidth={1} />
                        </div>
                        <div className="bg-white/20 p-4 rounded-full mb-4 shadow-inner">
                            <CheckCircle size={40} strokeWidth={2} />
                        </div>
                        <h2 id="correct-action-title" className="text-xl font-black tracking-tight mb-1">
                            {isIneffective ? 'Correct Protocol' : 'Correct Action'}
                        </h2>
                        <p className={`${isIneffective ? 'text-amber-100' : 'text-green-100'} text-xs font-bold uppercase tracking-wider`}>
                            {isIneffective ? 'No Immediate Response' : 'Protocol Step Confirmed'}
                        </p>
                    </div>

                    <div className="p-8 text-center bg-white relative">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[12px] border-b-white"></div>
                        <p className="text-slate-700 font-semibold mb-8 text-base leading-relaxed">
                            {message}
                        </p>
                        <button
                            id="correct-action-continue-btn"
                            type="button"
                            onClick={onDismiss}
                            className={`w-full ${isIneffective ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'} text-white font-bold py-4 rounded-2xl transition-all active:scale-95 uppercase tracking-widest text-xs flex items-center justify-center gap-2`}
                        >
                            Continue
                        </button>
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
};

export default CorrectActionWidget;
