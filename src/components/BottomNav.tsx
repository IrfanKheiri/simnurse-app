import React from 'react';
import { User, Zap, Activity } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface BottomNavProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    /** R-15: Number of rejected actions since last visit to Actions tab */
    rejectionCount?: number;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, rejectionCount = 0 }) => {
    const tabs = [
        { id: 'patient', label: 'Patient', icon: User },
        { id: 'actions', label: 'Actions', icon: Zap },
        { id: 'status', label: 'Status', icon: Activity },
    ];

    return (
        <nav
            id="bottom-navigation-bar"
            className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/80 backdrop-blur-md"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
            <div
                id="bottom-nav-buttons-container"
                className="mx-auto flex min-h-14 w-full max-w-[440px] items-center justify-center gap-8 px-4 box-border"
            >
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                        <button
                            key={tab.id}
                            id={`nav-tab-${tab.id}`}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex w-20 min-h-11 flex-col items-center justify-center gap-0.5 transition-colors duration-200",
                                isActive ? "text-medical-600" : "text-slate-500"
                            )}
                        >
                            {/* R-10: transition-colors for smooth bg pill switch; R-15: relative for badge */}
                            <div className={cn(
                                "relative p-1.5 rounded-xl transition-colors duration-200",
                                isActive ? "bg-medical-50" : "bg-transparent"
                            )}>
                                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                                {/* R-15: Rejection badge on Actions tab */}
                                {tab.id === 'actions' && rejectionCount > 0 && (
                                    <span
                                        className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"
                                        aria-label={`${rejectionCount} protocol deviation${rejectionCount > 1 ? 's' : ''}`}
                                    />
                                )}
                            </div>
                            <span className="text-[11px] font-bold uppercase tracking-widest transition-colors duration-200">
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;
