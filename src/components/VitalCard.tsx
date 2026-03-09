import { Lock } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface VitalCardProps {
    label: string;
    value: string | number;
    unit: string;
    icon: React.ElementType;
    color: string;
    isLocked?: boolean;
    onUnlock?: () => void;
}

const VitalCard: React.FC<VitalCardProps> = ({
    label,
    value,
    unit,
    icon: Icon,
    color,
    isLocked = false,
    onUnlock
}) => {
    return (
        <div
            className={cn(
                "relative flex flex-col p-4 rounded-2xl glass-morphism shadow-premium transition-all duration-300",
                isLocked ? "bg-slate-100/50 opacity-80" : "bg-white/80"
            )}
            style={!isLocked ? { borderTop: `4px solid ${color}` } : {}}
        >
            <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
                <div className={cn("p-2 rounded-lg", isLocked ? "bg-slate-200" : "bg-opacity-10")} style={!isLocked ? { backgroundColor: `${color}20`, color: color } : {}}>
                    {isLocked ? <Lock size={16} className="text-slate-400" /> : <Icon size={18} />}
                </div>
            </div>

            <div className="mt-auto">
                {isLocked ? (
                    <div className="flex flex-col gap-1">
                        <span className="text-2xl font-bold text-slate-300 italic">--</span>
                        <button
                            type="button"
                            onClick={onUnlock}
                            className="text-[10px] text-medical-600 font-medium hover:underline focus:outline-none text-left"
                        >
                            Perform Inspection to unlock
                        </button>
                    </div>
                ) : (
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-slate-800 tracking-tight">{value}</span>
                        <span className="text-xs font-medium text-slate-400">{unit}</span>
                    </div>
                )}
            </div>

            {!isLocked && (
                <div className="absolute top-2 right-2">
                    <span className="flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: color }}></span>
                        <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: color }}></span>
                    </span>
                </div>
            )}
        </div>
    );
};

export default VitalCard;
