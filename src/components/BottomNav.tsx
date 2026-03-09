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
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
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
                                "flex w-20 min-h-11 flex-col items-center justify-center gap-0.5 transition-all duration-300",
                                isActive ? "text-medical-600" : "text-slate-400"
                            )}
                        >
                            <div className={cn(
                                "p-1.5 rounded-xl transition-all duration-300",
                                isActive ? "bg-medical-50" : "bg-transparent"
                            )}>
                                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className={cn(
                                "text-[10px] font-bold uppercase tracking-widest",
                                isActive ? "opacity-100" : "opacity-60"
                            )}>
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
