import React from 'react';
import { AlertOctagon } from 'lucide-react';

interface IncorrectActionWidgetProps {
    message: string | null;
    onClose: () => void;
}

const IncorrectActionWidget: React.FC<IncorrectActionWidgetProps> = ({ message, onClose }) => {
    if (!message) return null;

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-6 pointer-events-none">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto" onClick={onClose} />
            
            {/* Modal */}
            <div className="relative bg-white rounded-[2rem] w-full max-w-sm shadow-2xl overflow-hidden pointer-events-auto animate-in zoom-in-95 fade-in duration-200 border border-red-100">
                <div className="bg-gradient-to-br from-red-500 to-red-600 p-8 flex flex-col items-center justify-center text-white text-center relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 opacity-10 pointer-events-none">
                        <AlertOctagon size={160} strokeWidth={1} />
                    </div>
                    <div className="bg-white/20 p-4 rounded-full mb-4 shadow-inner">
                        <AlertOctagon size={40} strokeWidth={2} />
                    </div>
                    <h2 className="text-xl font-black tracking-tight mb-1">Incorrect Action</h2>
                    <p className="text-red-100 text-xs font-bold uppercase tracking-wider">Protocol Deviation</p>
                </div>
                
                <div className="p-8 text-center bg-white relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[12px] border-b-white"></div>
                    <p className="text-slate-700 font-semibold mb-8 text-base leading-relaxed">
                        {message}
                    </p>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 font-bold py-4 rounded-2xl transition-all active:scale-95 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                    >
                        Acknowledge
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IncorrectActionWidget;
