import { Lock } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export type VitalColorKey = 'hr' | 'spo2' | 'bp' | 'rr';

/** Maps each vital key to its hex token value (kept in sync with tailwind.config.js `vital.*`). */
const VITAL_HEX: Record<VitalColorKey, string> = {
    hr:   '#ff4b4b',
    spo2: '#00e5ff',
    bp:   '#d97706',
    rr:   '#4ade80',
};

/** Pre-defined Tailwind classes per vital — enables tree-shaking by avoiding dynamic class construction. */
const VITAL_CLASSES: Record<VitalColorKey, { iconBg: string; iconText: string; dotBg: string }> = {
    hr:   { iconBg: 'bg-vital-hr/10',   iconText: 'text-vital-hr',   dotBg: 'bg-vital-hr' },
    spo2: { iconBg: 'bg-vital-spo2/10', iconText: 'text-vital-spo2', dotBg: 'bg-vital-spo2' },
    bp:   { iconBg: 'bg-vital-bp/10',   iconText: 'text-vital-bp',   dotBg: 'bg-vital-bp' },
    rr:   { iconBg: 'bg-vital-rr/10',   iconText: 'text-vital-rr',   dotBg: 'bg-vital-rr' },
};

interface VitalCardProps {
    label: string;
    value: string | number;
    unit: string;
    icon: React.ElementType;
    colorKey: VitalColorKey;
    isLocked?: boolean;
    onUnlock?: () => void;
}

const VitalCard: React.FC<VitalCardProps> = ({
    label,
    value,
    unit,
    icon: Icon,
    colorKey,
    isLocked = false,
    onUnlock
}) => {
    const hex = VITAL_HEX[colorKey];
    const cls = VITAL_CLASSES[colorKey];

    return (
        <div
            className={cn(
                "relative flex flex-col p-4 rounded-2xl glass-morphism shadow-premium transition-all duration-300",
                isLocked ? "bg-slate-100/50 opacity-80" : "bg-white/80",
                !isLocked && "border-t-4"
            )}
            style={!isLocked ? { borderTopColor: hex } : {}}
        >
            <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
                {isLocked ? (
                    <button
                        type="button"
                        onClick={onUnlock}
                        aria-label={`Unlock ${label} reading`}
                        className="p-2 rounded-lg bg-slate-200 hover:bg-slate-300 transition-colors active:scale-95"
                    >
                        <Lock size={16} className="text-slate-500" />
                    </button>
                ) : (
                    <div className={cn("p-2 rounded-lg", cls.iconBg, cls.iconText)}>
                        <Icon size={18} />
                    </div>
                )}
            </div>

            <div className="mt-auto">
                {isLocked ? (
                    <div className="flex flex-col gap-1">
                        <span className="text-xl font-black text-slate-400 tracking-widest">• • •</span>
                        <button
                            type="button"
                            onClick={onUnlock}
                            className="text-xs text-medical-600 font-bold hover:underline focus:outline-none text-left min-h-[44px] flex items-center"
                            aria-label={`Inspect to unlock ${label}`}
                        >
                            Tap to inspect
                        </button>
                    </div>
                ) : (
                    <div key="unlocked" className="flex items-baseline gap-1 vital-reveal">
                        <span className="text-3xl font-black text-slate-800 tracking-tight">{value}</span>
                        <span className="text-xs font-medium text-slate-400">{unit}</span>
                    </div>
                )}
            </div>

            {!isLocked && (
                <div className="absolute top-2 right-2">
                    <span className="flex h-2 w-2">
                        <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", cls.dotBg)}></span>
                        <span className={cn("relative inline-flex rounded-full h-2 w-2", cls.dotBg)}></span>
                    </span>
                </div>
            )}
        </div>
    );
};

export default VitalCard;
