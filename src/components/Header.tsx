import React from 'react';
import { HelpCircle } from 'lucide-react';

interface HeaderProps {
    onHelpClick: () => void;
}

// FIX (L23): Removed the non-functional notification bell button entirely.
// It was a decorative element with a hardcoded red dot implying unread notifications
// that did not exist, creating a false affordance. Re-add when notification data exists.
const Header: React.FC<HeaderProps> = ({ onHelpClick }) => {
    return (
        <header id="app-header" className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
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
        </header>
    );
};

export default Header;
