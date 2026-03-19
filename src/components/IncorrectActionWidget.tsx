import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertOctagon } from 'lucide-react';

interface IncorrectActionWidgetProps {
    message: string | null;
    onClose: () => void;
}

const IncorrectActionWidget: React.FC<IncorrectActionWidgetProps> = ({ message, onClose }) => {
    const modalRef = useRef<HTMLDivElement>(null);

    // FIX (P1-F): Focus the Acknowledge button when the modal opens
    useEffect(() => {
        if (message) {
            const btn = modalRef.current?.querySelector<HTMLButtonElement>('button');
            btn?.focus();
        }
    }, [message]);

    const handleModalKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Escape') { onClose(); return; }
        if (e.key !== 'Tab') return;
        const focusable = e.currentTarget.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
            if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
            if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    };

    if (!message) return null;

    return createPortal(
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-6 pointer-events-none">
            {/* Backdrop — constrained to 440px app column so it doesn't bleed into desktop gutters */}
            <div className="absolute left-1/2 -translate-x-1/2 w-full max-w-[440px] inset-y-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto" onClick={onClose} />

            {/* FIX (P1-G): role="dialog", aria-modal, aria-labelledby */}
            {/* Modal */}
            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="incorrect-action-title"
                onKeyDown={handleModalKeyDown}
                className="shake relative bg-white rounded-[2rem] w-full max-w-sm shadow-2xl overflow-hidden pointer-events-auto animate-in zoom-in-95 fade-in duration-200 border border-red-100"
            >
                <div className="bg-gradient-to-br from-red-500 to-red-600 p-8 flex flex-col items-center justify-center text-white text-center relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 opacity-10 pointer-events-none">
                        <AlertOctagon size={160} strokeWidth={1} />
                    </div>
                    <div className="bg-white/20 p-4 rounded-full mb-4 shadow-inner">
                        <AlertOctagon size={40} strokeWidth={2} />
                    </div>
                    {/* FIX (P1-G): id="incorrect-action-title" on h2 */}
                    <h2 id="incorrect-action-title" className="text-xl font-black tracking-tight mb-1">Incorrect Action</h2>
                    <p className="text-red-100 text-xs font-bold uppercase tracking-wider">Protocol Deviation</p>
                </div>

                <div className="p-8 text-center bg-white relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[12px] border-b-white"></div>
                    <p className="text-slate-700 font-semibold mb-8 text-base leading-relaxed">
                        {message}
                    </p>
                    {/* FIX (P1-F): id="incorrect-action-acknowledge-btn" for focus target */}
                    <button
                        id="incorrect-action-acknowledge-btn"
                        type="button"
                        onClick={onClose}
                        className="w-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 font-bold py-4 rounded-2xl transition-all active:scale-95 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                    >
                        Acknowledge
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default IncorrectActionWidget;
