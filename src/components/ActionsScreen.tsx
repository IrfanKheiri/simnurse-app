import React, { useState, useMemo, useEffect } from 'react';
import {
    Search, Zap, Pill, Construction, ChevronRight, Wind, Heart, Zap as Flash, Activity, Syringe, Droplet, Stethoscope, HeartHandshake, ShieldAlert,
    Baby, Scissors, ScanLine, FlaskConical
} from 'lucide-react';
import ProcedureGuide from './ProcedureGuide';

export interface Action {
    id: string; // Must map exactly to InterventionDefinition keys in scenario JSON
    label: string;
    icon: React.ElementType;
    categoryId: 'interventions' | 'meds' | 'equipment';
    steps: string[];
    color: string;
}

const CATEGORIES = [
    { id: 'interventions', label: 'Interventions', icon: Zap, color: '#43919e' },
    { id: 'meds', label: 'Meds', icon: Pill, color: '#a855f7' },
    { id: 'equipment', label: 'Equipment', icon: Construction, color: '#fb923c' },
];

const ACTIONS: Action[] = [
    // BLS Interventions
    {
        id: 'cpr',
        label: 'Initiate CPR (High-Quality)',
        icon: HeartHandshake,
        categoryId: 'interventions',
        steps: ['Ensure scene is safe.', 'Check responsiveness and pulse for 10s.', 'Begin compressions at 100-120/min.', 'Allow full chest recoil.'],
        color: '#ef4444' // red
    },
    {
        id: 'defibrillate',
        label: 'Defibrillate (AED / Manual)',
        icon: Flash,
        categoryId: 'equipment',
        steps: ['Turn on AED/Defibrillator.', 'Attach pads to bare chest.', 'Clear patient and analyze rhythm.', 'Press SHOCK if advised.'],
        color: '#f59e0b' // yellow
    },
    {
        id: 'synchronized_cardioversion',
        label: 'Synchronized Cardioversion',
        icon: Flash,
        categoryId: 'equipment',
        steps: ['Sedate patient if conscious.', 'Press SYNC and verify markers on R waves.', 'Select appropriate energy.', 'Clear and shock.'],
        color: '#f59e0b'
    },
    {
        id: 'vagal_maneuver',
        label: 'Vagal Maneuver',
        icon: Heart,
        categoryId: 'interventions',
        steps: ['Have patient bear down (Valsalva).', 'Try carotid sinus massage if appropriate.', 'Observe monitor for SVT break.'],
        color: '#10b981' // green
    },
    {
        id: 'pulse_check',
        label: 'Check Pulse / Rhythm Check',
        icon: Activity,
        categoryId: 'interventions',
        steps: ['Pause CPR (max 10 seconds).', 'Palpate carotid or femoral artery.', 'Verify rhythm on monitor.'],
        color: '#3b82f6' // text-medical blue
    },
    {
        id: 'check_glucose',
        label: 'Check Blood Glucose',
        icon: Droplet,
        categoryId: 'interventions',
        steps: ['Prepare lancet and glucometer.', 'Obtain capillary blood sample.', 'Read level and treat if < 60 mg/dL.'],
        color: '#ec4899' // pink
    },
    
    // Airway / Breathing
    {
        id: 'oxygen_nrb',
        label: 'Oxygen via NRB Mask',
        icon: Wind,
        categoryId: 'equipment',
        steps: ['Connect NRB mask to wall source.', 'Set flow to 15 L/min.', 'Inflate reservoir bag.', 'Secure over nose/mouth.'],
        color: '#06b6d4' // cyan
    },
    {
        id: 'rescue_breathing',
        label: 'Rescue Breathing (BVM)',
        icon: Wind,
        categoryId: 'equipment',
        steps: ['Position airway (head-tilt/chin-lift).', 'Ensure mask seal (C-E technique).', 'Deliver 1 breath every 6 seconds.', 'Observe chest rise.'],
        color: '#06b6d4'
    },
    {
        id: 'intubation',
        label: 'Advanced Airway (Intubation)',
        icon: Stethoscope,
        categoryId: 'equipment',
        steps: ['Pre-oxygenate.', 'Administer induction/paralytic agents.', 'Visualize cords and insert ETT.', 'Confirm placement (EtCO2, lung sounds).'],
        color: '#6366f1' // indigo
    },

    // Medications
    {
        id: 'epinephrine_1mg',
        label: 'Epinephrine 1mg IV/IO',
        icon: Syringe,
        categoryId: 'meds',
        steps: ['Draw 1mg (1:10,000) Epinephrine.', 'Push rapidly during CPR.', 'Follow with 20mL NS flush.', 'Repeat every 3-5 minutes.'],
        color: '#a855f7' // purple
    },
    {
        id: 'epinephrine_im_0_5mg',
        label: 'Epinephrine 0.5mg IM (1:1,000)',
        icon: Syringe,
        categoryId: 'meds',
        steps: ['Draw 0.5mg epinephrine from 1:1,000 (1mg/mL) vial.', 'Identify anterolateral thigh.', 'Clean site with alcohol swab.', 'Inject firmly into outer thigh (through clothing if needed).', 'Hold for 3 seconds, withdraw, massage site.', 'Repeat every 5–15 min if no improvement.'],
        color: '#a855f7'
    },
    {
        id: 'amiodarone_300mg',
        label: 'Amiodarone 300mg IV/IO',
        icon: Pill,
        categoryId: 'meds',
        steps: ['Only for pulseless VFib/VTach after meds/shocks.', 'Push 300mg rapid IV.', 'Consider 150mg second dose later.'],
        color: '#a855f7'
    },
    {
        id: 'adenosine_6mg',
        label: 'Adenosine 6mg rapid IVP',
        icon: Syringe,
        categoryId: 'meds',
        steps: ['Warn patient of flush/pressure.', 'Push 6mg rapidly.', 'Follow with 20mL flush.', 'Print ECG strip to catch pause.'],
        color: '#a855f7'
    },
    {
        id: 'atropine_0_5mg',
        label: 'Atropine 0.5mg IV',
        icon: Syringe,
        categoryId: 'meds',
        steps: ['Confirm symptomatic bradycardia (HR < 60 with signs).', 'Draw 0.5mg atropine sulfate.', 'Push rapid IV bolus.', 'Repeat every 3–5 min up to 3mg total if needed.', 'Prepare for transcutaneous pacing if atropine fails.'],
        color: '#a855f7'
    },
    {
        id: 'naloxone_2mg',
        label: 'Naloxone (Narcan) 2mg IN/IV',
        icon: ShieldAlert,
        categoryId: 'meds',
        steps: ['Administer 1mg per nostril if IN.', 'Wait 2-3 minutes for response.', 'Support ventilation concurrently.'],
        color: '#a855f7'
    },
    {
        id: 'aspirin_324mg',
        label: 'Aspirin 324mg PO',
        icon: Pill,
        categoryId: 'meds',
        steps: ['Give 4 baby aspirin (81mg each).', 'Instruct patient to CHEW fully.', 'Do not give if allergic or active GI bleed.'],
        color: '#a855f7'
    },
    {
        id: 'nitroglycerin_04mg',
        label: 'Nitroglycerin 0.4mg SL',
        icon: Pill,
        categoryId: 'meds',
        steps: ['Verify BP > 90 systolic.', 'Check no recent PDE5 inhibitors.', 'Place 1 tablet under tongue.', 'Repeat every 5 mins (up to 3 doses).'],
        color: '#a855f7'
    },
    {
        id: 'alteplase',
        label: 'Alteplase (rtPA)',
        icon: Syringe,
        categoryId: 'meds',
        steps: ['Verify negative CT head for bleed.', 'Confirm symptom onset < 3-4.5 hours.', 'Administer IV bolus + infusion per unit protocol.'],
        color: '#a855f7'
    },
    
    // Access
    {
        id: 'establish_iv',
        label: 'Establish IV/IO Access',
        icon: Syringe,
        categoryId: 'equipment',
        steps: ['Locate suitable vein or IO site.', 'Cleanse area.', 'Insert catheter and secure.', 'Flush to confirm patency.'],
        color: '#8b5cf6' // violet
    },

    // IV Fluids
    {
        id: 'normal_saline_bolus',
        label: 'Normal Saline Bolus (500mL IV)',
        icon: FlaskConical,
        categoryId: 'meds',
        steps: ['Confirm IV/IO access is patent.', 'Hang 500mL 0.9% NaCl (Normal Saline).', 'Open roller clamp fully for rapid infusion.', 'Reassess BP, HR, and pulse after bolus.', 'Repeat bolus if hypovolemia persists and BP remains low.'],
        color: '#06b6d4',
    },

    // Cardiac drugs
    {
        id: 'amiodarone_150mg_stable',
        label: 'Amiodarone 150mg IV (Stable VTach)',
        icon: Pill,
        categoryId: 'meds',
        steps: ['For stable VTach with pulse — do NOT use in pulseless arrest (use 300mg bolus instead).', 'Mix 150mg amiodarone in 100mL D5W.', 'Infuse over 10 minutes.', 'Monitor for hypotension and QT prolongation.', 'Follow with maintenance infusion if conversion achieved.'],
        color: '#a855f7',
    },
    {
        id: 'ticagrelor_180mg',
        label: 'Ticagrelor 180mg PO (Loading Dose)',
        icon: Pill,
        categoryId: 'meds',
        steps: ['Confirm no contraindications (active bleed, prior intracranial hemorrhage).', 'Give 180mg ticagrelor (two 90mg tablets) orally.', 'Instruct patient to swallow whole — do not crush.', 'Given as DAPT with aspirin for ACS per ACC/AHA.', 'Avoid in patients on strong CYP3A4 inhibitors.'],
        color: '#a855f7',
    },
    {
        id: 'heparin_bolus',
        label: 'Heparin Bolus IV (UFH)',
        icon: Syringe,
        categoryId: 'meds',
        steps: ['Confirm STEMI with no contraindications to anticoagulation.', 'Draw weight-based UFH bolus (60 units/kg, max 4000 units).', 'Administer rapid IV push.', 'Follow with weight-based infusion per protocol (12 units/kg/hr, max 1000 units/hr).', 'Monitor aPTT every 6 hours to maintain 50–70 seconds.'],
        color: '#a855f7',
    },
    {
        id: 'labetalol_10mg',
        label: 'Labetalol 10mg IV',
        icon: Syringe,
        categoryId: 'meds',
        steps: ['Indicated for hypertensive emergency (e.g., pre-tPA BP > 185/110).', 'Draw labetalol 10mg IV.', 'Infuse over 1–2 minutes.', 'Recheck BP in 10 minutes.', 'Repeat or double dose every 10 min if target not achieved (max 300mg total).', 'Target BP ≤ 185/110 before alteplase administration.'],
        color: '#a855f7',
    },

    // Pediatric medications
    {
        id: 'epinephrine_im_pediatric',
        label: 'Epinephrine 0.01mg/kg IM (Peds)',
        icon: Baby,
        categoryId: 'meds',
        steps: ['Calculate dose: 0.01 mg/kg using 1:1,000 (1mg/mL) — maximum 0.5mg.', 'Draw appropriate volume into syringe.', 'Inject into anterolateral thigh (preferred site in children).', 'Hold for 3 seconds, withdraw, and massage site.', 'May repeat every 5–15 min if no improvement.', 'Monitor HR — epinephrine causes tachycardia.'],
        color: '#a855f7',
    },
    {
        id: 'epinephrine_peds_01mgkg',
        label: 'Epinephrine 0.01mg/kg IV/IO (Peds)',
        icon: Baby,
        categoryId: 'meds',
        steps: ['PALS dose: 0.01 mg/kg (1:10,000 concentration) IV/IO — max 1mg.', 'Confirm IV/IO access is patent.', 'Draw weight-based dose and push rapidly.', 'Flush with 5–10mL NS.', 'Repeat every 3–5 minutes during CPR.'],
        color: '#a855f7',
    },
    {
        id: 'amiodarone_peds_5mgkg',
        label: 'Amiodarone 5mg/kg IV/IO (Peds)',
        icon: Baby,
        categoryId: 'meds',
        steps: ['PALS dose for refractory VFib/pVT: 5mg/kg IV/IO (max 300mg).', 'Push rapidly during CPR — do not delay shock.', 'Administer after 3rd shock if VFib/pVT persists.', 'May repeat up to 15mg/kg total.', 'Monitor for hypotension and QT prolongation after ROSC.'],
        color: '#a855f7',
    },

    // Respiratory / Airway
    {
        id: 'high_flow_oxygen',
        label: 'High-Flow Oxygen (15 L/min NRB)',
        icon: Wind,
        categoryId: 'equipment',
        steps: ['This is first-line oxygen delivery for acute hypoxia.', 'Connect NRB mask to oxygen flowmeter.', 'Set flow to 15 L/min.', 'Allow reservoir bag to fully inflate before placing on patient.', 'Secure snugly over nose and mouth.', 'Target SpO2 ≥ 94% (≥ 92% in asthma).'],
        color: '#06b6d4',
    },
    {
        id: 'albuterol_nebulizer',
        label: 'Albuterol Nebulizer (2.5mg)',
        icon: Wind,
        categoryId: 'meds',
        steps: ['Add 2.5mg albuterol sulfate to nebulizer cup.', 'Add 3mL NS if needed per device instructions.', 'Connect to air/oxygen source at 6–8 L/min.', 'Instruct patient to breathe normally through mouthpiece.', 'Treatment takes approximately 10 minutes.', 'Reassess breath sounds and SpO2 after each treatment.', 'May repeat every 20 min for severe exacerbation.'],
        color: '#06b6d4',
    },
    {
        id: 'ipratropium_nebulizer',
        label: 'Ipratropium Nebulizer (0.5mg)',
        icon: Wind,
        categoryId: 'meds',
        steps: ['Add 0.5mg ipratropium bromide to nebulizer (may combine with albuterol).', 'Connect to air/oxygen source at 6–8 L/min.', 'Administer over 10–15 minutes.', 'Ipratropium reduces cholinergic bronchoconstriction — complements albuterol.', 'Give for first 3 doses in severe exacerbation, then discontinue.'],
        color: '#06b6d4',
    },

    // Systemic medications
    {
        id: 'methylprednisolone_iv',
        label: 'Methylprednisolone 1mg/kg IV',
        icon: Syringe,
        categoryId: 'meds',
        steps: ['Calculate dose: 1mg/kg IV (typical 40–80mg; max 125mg for adults).', 'Dilute in 50–100mL NS.', 'Infuse over 15–30 minutes.', 'Effect onset: 4–6 hours — not for immediate bronchodilation.', 'Reduces airway inflammation and prevents relapse.', 'Continue with oral prednisolone course after discharge.'],
        color: '#a855f7',
    },

    // Equipment / Procedures
    {
        id: 'transcutaneous_pacing',
        label: 'Transcutaneous Pacing (TCP)',
        icon: Activity,
        categoryId: 'equipment',
        steps: ['Indicated for unstable bradycardia unresponsive to atropine.', 'Attach defibrillator/pacer pads in AP or standard position.', 'Select PACE mode on defibrillator.', 'Set rate to 70–80 bpm.', 'Increase output (mA) from 0 until capture — look for wide QRS after each pacing spike and palpate pulse.', 'Verify mechanical capture by checking pulse.', 'Sedate and analgese patient — TCP is painful.', 'Prepare for transvenous pacing if prolonged pacing needed.'],
        color: '#f59e0b',
    },
    {
        id: 'ct_brain_noncontrast',
        label: 'CT Brain (Non-Contrast)',
        icon: ScanLine,
        categoryId: 'equipment',
        steps: ['MANDATORY before alteplase — must exclude hemorrhagic stroke.', 'Confirm no metal implants that would preclude CT.', 'Transport patient to CT suite with monitoring.', 'Non-contrast CT takes approximately 5 minutes to acquire.', 'Radiologist to interpret immediately.', 'If hemorrhage present → tPA is CONTRAINDICATED.', 'If no hemorrhage → proceed with alteplase if within time window.'],
        color: '#6366f1',
    },
    {
        id: 'activate_cath_lab',
        label: 'Activate Cath Lab / PCI Consult',
        icon: Heart,
        categoryId: 'interventions',
        steps: ['Immediately call the cardiac catheterization lab for STEMI activation.', 'Target door-to-balloon time ≤ 90 minutes (≤ 60 min if direct presentation).', 'Notify interventional cardiology team.', 'Ensure patient has IV access, aspirin, P2Y12 inhibitor, and anticoagulation given.', 'Prepare patient for transfer to cath lab.', 'Primary PCI is the preferred reperfusion strategy for STEMI.'],
        color: '#ef4444',
    },

    // Obstetric procedures
    {
        id: 'left_uterine_displacement',
        label: 'Left Uterine Displacement (LUD)',
        icon: HeartHandshake,
        categoryId: 'interventions',
        steps: ['Perform IMMEDIATELY on any pregnant patient in cardiac arrest or hemodynamic compromise.', 'Prevents aortocaval compression by the gravid uterus.', 'Manual LUD: place hand on right side of uterus and push firmly to patient\'s left.', 'Alternatively, tilt the entire backboard 15–30° to the left.', 'Maintain displacement throughout CPR.', 'Displacement improves cardiac output during compressions.'],
        color: '#ec4899',
    },
    {
        id: 'perimortem_csection',
        label: 'Perimortem Cesarean Delivery (PMCD)',
        icon: Scissors,
        categoryId: 'interventions',
        steps: ['Indicated if ROSC not achieved within 4–5 minutes of maternal cardiac arrest.', 'Goal: delivery within 5 minutes of arrest onset to optimize maternal resuscitation.', 'Performed at bedside — do NOT delay for transport to OR.', 'Continue CPR throughout and after procedure.', 'PMCD improves venous return and maternal cardiac output by relieving aortocaval compression.', 'Notify obstetrics and neonatology teams immediately.'],
        color: '#ec4899',
    },

    // Pediatric defibrillation
    {
        id: 'defibrillate_pediatric',
        label: 'Defibrillate — Pediatric (2 J/kg)',
        icon: Flash,
        categoryId: 'equipment',
        steps: ['Use pediatric pads/attenuator if available.', 'Set energy to 2 J/kg for first shock.', 'Increase to 4 J/kg for subsequent shocks (max 10 J/kg or adult dose).', 'Clear patient and deliver shock.', 'Resume CPR immediately after shock.'],
        color: '#f59e0b',
    },
];

function readSuppressedProcedures(): Record<string, boolean> {
    try {
        return JSON.parse(localStorage.getItem('suppressedProcedures') || '{}') as Record<string, boolean>;
    } catch {
        return {};
    }
}

function writeSuppressedProcedures(value: Record<string, boolean>) {
    localStorage.setItem('suppressedProcedures', JSON.stringify(value));
}

interface ActionsScreenProps {
    applyIntervention: (interventionId: string) => void;
    initialActionIdToReview?: string | null;
    onReviewActionHandled?: () => void;
}

const ActionsScreen: React.FC<ActionsScreenProps> = ({ 
    applyIntervention, 
    initialActionIdToReview, 
    onReviewActionHandled 
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAction, setSelectedAction] = useState<Action | null>(null);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [suppressed, setSuppressed] = useState<Record<string, boolean>>(readSuppressedProcedures);

    // FIX: Auto-open guide for Review Protocol clicks
    useEffect(() => {
        if (initialActionIdToReview) {
            const action = ACTIONS.find(a => a.id === initialActionIdToReview);
            if (action) {
                const currentSuppressed = readSuppressedProcedures();
                const nextSuppressed = { ...currentSuppressed };
                if (currentSuppressed[action.id]) {
                    delete nextSuppressed[action.id];
                    writeSuppressedProcedures(nextSuppressed);
                }

                const timer = window.setTimeout(() => {
                    setSuppressed(nextSuppressed);
                    setSelectedAction(action);
                    setIsGuideOpen(true);
                    onReviewActionHandled?.();
                }, 0);

                return () => {
                    window.clearTimeout(timer);
                };
            }

            onReviewActionHandled?.();
        }
    }, [initialActionIdToReview, onReviewActionHandled]);

    const filteredActions = useMemo(() => {
        return ACTIONS.filter(action =>
            action.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            action.categoryId.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery]);

    const handleActionClick = (action: Action) => {
        const hiddenProcedures = readSuppressedProcedures();
        if (hiddenProcedures[action.id]) {
            applyIntervention(action.id);
        } else {
            setSelectedAction(action);
            setIsGuideOpen(true);
        }
    };

    const handleConfirmAction = () => {
        if (selectedAction) {
            applyIntervention(selectedAction.id);
            setSuppressed(readSuppressedProcedures());
        }
    };

    return (
        <section id="actions-screen-container" className="flex flex-col h-full bg-slate-50">
            {/* Header & Search */}
            <header id="actions-screen-header" className="sticky top-0 z-20 border-b border-slate-100 bg-white p-6 pb-4 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Actions</h1>

                    {/* FIX (ISSUE-05): Reset Hidden Guides button is always visible so
                        learners can access it at any time — not just when guides are suppressed. */}
                    <button
                        id="reset-hidden-guides-btn"
                        type="button"
                        onClick={() => {
                            localStorage.removeItem('suppressedProcedures');
                            setSuppressed({});
                        }}
                        className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                            Object.keys(suppressed).length > 0
                                ? 'bg-medical-50 text-medical-600 hover:bg-medical-100'
                                : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                        }`}
                    >
                        Reset Hidden Guides
                    </button>
                </div>
                <form role="search" className="relative block" onSubmit={(event) => event.preventDefault()}>
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search size={18} className="text-slate-400" />
                    </div>
                    <input
                        id="action-search-input"
                        type="text"
                        className="block w-full rounded-2xl border-none bg-slate-50 py-4 pl-11 pr-4 text-sm font-medium placeholder:text-slate-400 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-medical-500/20"
                        placeholder="Search procedures, meds..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </form>
            </header>

            <article id="actions-list-container" className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
                {CATEGORIES.map(category => {
                    const catActions = filteredActions.filter((a: Action) => a.categoryId === category.id);
                    if (catActions.length === 0) return null;

                    return (
                        <section key={category.id} id={`category-group-${category.id}`} className="mb-8 last:mb-0">
                            <header className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-white rounded-lg shadow-sm text-slate-800">
                                    <category.icon size={16} style={{ color: category.color }} />
                                </div>
                                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
                                    {category.label}
                                </h2>
                                <div className="flex-1 h-[1px] bg-slate-100 ml-2" aria-hidden="true" />
                            </header>

                            <menu className="space-y-3 p-0 m-0">
                                {catActions.map((action: Action) => (
                                    <li key={action.id} className="list-none">
                                        <button
                                            id={`action-btn-${action.id}`}
                                            type="button"
                                            onClick={() => handleActionClick(action)}
                                            className="group flex w-full items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-medical-100 hover:shadow-premium active:scale-[0.98]"
                                        >
                                            <div className="flex flex-1 items-center gap-4 overflow-hidden">
                                                <div
                                                    className="shrink-0 rounded-xl p-3 transition-colors"
                                                    style={{ backgroundColor: `${action.color}15`, color: action.color }}
                                                >
                                                    <action.icon size={20} />
                                                </div>
                                                <div className="flex flex-col items-start truncate">
                                                    <span className="truncate text-sm font-bold tracking-tight text-slate-700">{action.label}</span>
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 transition-colors group-hover:text-medical-500">
                                                        {suppressed[action.id] ? 'Execute Directly' : 'View Card'}
                                                    </span>
                                                </div>
                                            </div>
                                            <ChevronRight size={18} className="text-slate-300 transition-colors group-hover:text-medical-400" />
                                        </button>
                                    </li>
                                ))}
                            </menu>
                        </section>
                    );
                })}

                {filteredActions.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                        <div className="p-4 bg-slate-100 rounded-full mb-4">
                            <Flash size={32} className="text-slate-400" />
                        </div>
                        <p className="text-sm font-bold text-slate-600">No actions found matching "{searchQuery}"</p>
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="mt-2 text-xs font-bold uppercase tracking-widest text-medical-600"
                        >
                            Clear Search
                        </button>
                    </div>
                )}
            </article>

            {selectedAction && (
                <ProcedureGuide
                    isOpen={isGuideOpen}
                    onClose={() => setIsGuideOpen(false)}
                    onConfirm={handleConfirmAction}
                    title={selectedAction.label}
                    steps={selectedAction.steps}
                    actionId={selectedAction.id}
                />
            )}
        </section>
    );
};

export default ActionsScreen;
