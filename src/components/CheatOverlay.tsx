import { useEffect } from 'react';
import { X, Zap } from 'lucide-react';
import type { Scenario } from '../types/scenario';

// Full-label map for the overlay — matches INTERVENTION_LABELS in App.tsx
const CHEAT_LABELS: Record<string, string> = {
  cpr: 'CPR (High-Quality)',
  cpr_30_2: 'CPR 30:2',
  cpr_30_2_child: 'CPR 30:2 (Child)',
  cpr_30_2_infant_2finger: 'CPR 30:2 Infant (2-finger)',
  cpr_15_2_child: 'CPR 15:2 (Child)',
  cpr_15_2_infant_2thumb: 'CPR 15:2 Infant (2-thumb)',
  resume_cpr_post_shock: 'Resume CPR Post-Shock',
  defibrillate: 'Defibrillate (AED/Manual)',
  defibrillate_pediatric: 'Defibrillate — Pediatric (2 J/kg)',
  synchronized_cardioversion: 'Synchronized Cardioversion',
  vagal_maneuver: 'Vagal Maneuver',
  rescue_breathing: 'Rescue Breathing (BVM)',
  rescue_breathing_child: 'Rescue Breathing — Child',
  rescue_breathing_infant: 'Rescue Breathing — Infant',
  intubation: 'Advanced Airway (Intubation)',
  oxygen_nrb: 'Oxygen via NRB Mask',
  high_flow_oxygen: 'High-Flow Oxygen (15 L/min)',
  bag_valve_mask: 'Bag-Valve Mask',
  bag_valve_mask_child: 'Bag-Valve Mask (Child)',
  bag_valve_mask_infant: 'Bag-Valve Mask (Infant)',
  albuterol_nebulizer: 'Albuterol Nebulizer (2.5mg)',
  ipratropium_nebulizer: 'Ipratropium Nebulizer (0.5mg)',
  epinephrine_1mg: 'Epinephrine 1mg IV/IO',
  epinephrine_im_0_5mg: 'Epinephrine 0.5mg IM (1:1,000)',
  epinephrine_im_pediatric: 'Epinephrine 0.01mg/kg IM (Peds)',
  epinephrine_peds_01mgkg: 'Epinephrine 0.01mg/kg IV/IO (Peds)',
  amiodarone_300mg: 'Amiodarone 300mg IV/IO',
  amiodarone_150mg_stable: 'Amiodarone 150mg IV (Stable VTach)',
  amiodarone_peds_5mgkg: 'Amiodarone 5mg/kg IV/IO (Peds)',
  adenosine_6mg: 'Adenosine 6mg Rapid IVP',
  atropine_0_5mg: 'Atropine 0.5mg IV',
  naloxone_2mg: 'Naloxone 2mg IN/IV',
  naloxone_intranasal_4mg: 'Naloxone 4mg Intranasal',
  naloxone_intranasal_repeat: 'Naloxone Repeat Intranasal',
  naloxone_im_repeat: 'Naloxone Repeat IM',
  aspirin_324mg: 'Aspirin 324mg PO',
  ticagrelor_180mg: 'Ticagrelor 180mg PO (Loading)',
  nitroglycerin_04mg: 'Nitroglycerin 0.4mg SL',
  heparin_bolus: 'Heparin Bolus IV (UFH)',
  methylprednisolone_iv: 'Methylprednisolone 1mg/kg IV',
  alteplase: 'Alteplase (rtPA) IV Infusion',
  labetalol_10mg: 'Labetalol 10mg IV',
  normal_saline_bolus: 'Normal Saline Bolus (500mL IV)',
  establish_iv: 'Establish IV/IO Access',
  check_glucose: 'Check Blood Glucose',
  pulse_check: 'Pulse / Rhythm Check',
  transcutaneous_pacing: 'Transcutaneous Pacing (TCP)',
  ct_brain_noncontrast: 'CT Brain (Non-Contrast)',
  activate_cath_lab: 'Activate Cath Lab / PCI Consult',
  left_uterine_displacement: 'Left Uterine Displacement (LUD)',
  perimortem_csection: 'Perimortem Cesarean Delivery (PMCD)',
  check_responsiveness: 'Check Responsiveness',
  sternal_rub_stimulation: 'Sternal Rub / Stimulation',
  call_911: 'Call 911 / Activate EMS',
  open_airway_head_tilt_chin_lift: 'Open Airway (Head-Tilt Chin-Lift)',
  check_carotid_pulse: 'Check Carotid Pulse',
  check_brachial_pulse: 'Check Brachial Pulse',
  aed_attach: 'Attach AED Pads',
  aed_power_on: 'Power On AED',
  aed_attach_pads: 'Attach AED Pads',
  aed_analyze: 'AED — Analyze Rhythm',
  aed_shock: 'AED — Deliver Shock',
  aed_clear: 'AED — Clear! (Stand back)',
  dry_chest_before_aed: 'Dry Chest Before AED',
  switch_compressor_roles: 'Switch Compressor Roles',
  initial_rescue_breaths_5: 'Initial 5 Rescue Breaths',
  look_in_mouth_before_breath: 'Look In Mouth Before Breath',
  lower_to_ground: 'Lower to Ground Safely',
  remove_from_water: 'Remove from Water',
  recovery_position: 'Recovery Position',
  ask_if_choking: 'Ask if Choking',
  back_blows_5: '5 Back Blows',
  abdominal_thrusts_heimlich_5: '5 Abdominal Thrusts (Heimlich)',
  back_slaps_infant_5: '5 Back Slaps (Infant)',
  chest_thrusts_infant_5: '5 Chest Thrusts (Infant)',
  position_infant_face_down: 'Position Infant Face-Down',
};

function labelFor(id: string): string {
  return CHEAT_LABELS[id] ?? id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

interface CheatOverlayProps {
  scenario: Scenario;
  sequenceIndex: number;
  onClose: () => void;
}

export default function CheatOverlay({ scenario, sequenceIndex, onClose }: CheatOverlayProps) {
  const seq = scenario.expected_sequence ?? [];
  const hasSequence = seq.length > 0;
  const isComplete = hasSequence && sequenceIndex >= seq.length;
  const currentAction = hasSequence && !isComplete ? seq[sequenceIndex] : null;

  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Cheat mode — next action hint"
    >
      <div
        className="relative mx-4 w-full max-w-sm rounded-2xl border border-yellow-400 bg-slate-900 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1 text-slate-400 hover:text-white"
          aria-label="Close cheat overlay"
        >
          <X size={16} />
        </button>

        {/* Header badge */}
        <div className="mb-4 flex items-center gap-2">
          <Zap size={16} className="text-yellow-400" />
          <span className="text-xs font-black uppercase tracking-widest text-yellow-400">
            Cheat Mode
          </span>
        </div>

        {/* Scenario title */}
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {scenario.title}
        </p>

        {/* Next action */}
        {!hasSequence && (
          <p className="text-sm text-slate-400 italic">No expected sequence defined for this scenario.</p>
        )}

        {hasSequence && isComplete && (
          <p className="text-sm font-semibold text-green-400">
            ✓ Sequence complete — awaiting success conditions
          </p>
        )}

        {hasSequence && !isComplete && currentAction && (
          <>
            <div className="mb-3 rounded-xl bg-yellow-400/10 border border-yellow-400/30 px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-yellow-400 font-semibold mb-1">
                Step {sequenceIndex + 1} of {seq.length} — Do this now
              </p>
              <p className="text-base font-bold text-white leading-snug">
                {labelFor(currentAction)}
              </p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{currentAction}</p>
            </div>

            {/* Remaining steps */}
            {seq.length > 1 && (
              <div className="mt-3 space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                  Full sequence
                </p>
                {seq.map((id, i) => {
                  const done = i < sequenceIndex;
                  const current = i === sequenceIndex;
                  return (
                    <div
                      key={id}
                      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                        current
                          ? 'bg-yellow-400/15 text-yellow-300'
                          : done
                          ? 'text-slate-600 line-through'
                          : 'text-slate-500'
                      }`}
                    >
                      <span className="w-4 shrink-0 text-center font-mono text-[10px] opacity-60">
                        {done ? '✓' : `${i + 1}`}
                      </span>
                      {labelFor(id)}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        <p className="mt-4 text-center text-[10px] text-slate-600">
          Press <kbd className="rounded bg-slate-700 px-1 py-0.5 font-mono text-slate-300">C</kbd> or{' '}
          <kbd className="rounded bg-slate-700 px-1 py-0.5 font-mono text-slate-300">Esc</kbd> to close
        </p>
      </div>
    </div>
  );
}
