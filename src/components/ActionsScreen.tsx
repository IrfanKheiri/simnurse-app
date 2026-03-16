import React, { useState, useMemo, useEffect } from 'react';
import {
    Search, Zap, Pill, Construction, ChevronRight, Wind, Heart, Activity, Syringe, Droplet, Stethoscope, HeartHandshake, ShieldAlert,
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

export const ACTIONS: Action[] = [
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
        icon: Zap,
        categoryId: 'equipment',
        steps: ['Turn on AED/Defibrillator.', 'Attach pads to bare chest.', 'Clear patient and analyze rhythm.', 'Press SHOCK if advised.'],
        color: '#f59e0b' // yellow
    },
    {
        id: 'synchronized_cardioversion',
        label: 'Synchronized Cardioversion',
        icon: Zap,
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
        icon: Zap,
        categoryId: 'equipment',
        steps: ['Use pediatric pads/attenuator if available.', 'Set energy to 2 J/kg for first shock.', 'Increase to 4 J/kg for subsequent shocks (max 10 J/kg or adult dose).', 'Clear patient and deliver shock.', 'Resume CPR immediately after shock.'],
        color: '#f59e0b',
    },

    // ── BLS Assessment ────────────────────────────────────────────────────────
    {
        id: 'check_responsiveness',
        label: 'Check Responsiveness',
        icon: HeartHandshake,
        categoryId: 'interventions',
        steps: ['Tap both shoulders firmly.', 'Shout "Are you okay?" loudly.', 'Look for any purposeful movement or verbal response.', 'If no response, call for help and begin BLS sequence.'],
        color: '#43919e',
    },
    {
        id: 'check_carotid_pulse',
        label: 'Check Carotid Pulse (≤10 sec)',
        icon: Activity,
        categoryId: 'interventions',
        steps: ['Place two fingers on the larynx (Adam\'s apple).', 'Slide fingers laterally into the groove between trachea and neck muscle.', 'Apply light pressure and feel for pulsation.', 'Limit assessment to no more than 10 seconds.', 'If pulse absent or uncertain → begin CPR.'],
        color: '#3b82f6',
    },
    {
        id: 'check_brachial_pulse',
        label: 'Check Brachial Pulse (≤10 sec)',
        icon: Activity,
        categoryId: 'interventions',
        steps: ['Locate medial upper arm between biceps and triceps.', 'Place two fingers on the brachial artery groove.', 'Apply light pressure and feel for pulsation.', 'AHA preferred pulse check site for infants.', 'Limit to ≤10 seconds; if absent or uncertain → begin CPR.'],
        color: '#3b82f6',
    },
    {
        id: 'sternal_rub_stimulation',
        label: 'Sternal Rub Stimulation',
        icon: ShieldAlert,
        categoryId: 'interventions',
        steps: ['Knuckle-rub the sternum with firm pressure.', 'Observe for any purposeful withdrawal or response.', 'Used to test depth of CNS depression — especially in opioid overdose.', 'No response indicates severe CNS depression; escalate care immediately.'],
        color: '#f59e0b',
    },
    {
        id: 'ask_if_choking',
        label: 'Ask "Are You Choking?"',
        icon: HeartHandshake,
        categoryId: 'interventions',
        steps: ['Ask clearly: "Are you choking?"', 'Confirm the patient cannot speak, cough, or breathe effectively.', 'A silent nod or inability to speak/cough confirms complete obstruction.', 'If partial obstruction (able to cough forcefully) → encourage coughing; do NOT intervene.', 'If complete obstruction confirmed → immediately initiate abdominal thrusts.'],
        color: '#43919e',
    },

    // ── BLS CPR ───────────────────────────────────────────────────────────────
    {
        id: 'cpr_30_2',
        label: 'CPR 30:2 — Adult',
        icon: HeartHandshake,
        categoryId: 'interventions',
        steps: ['Position heel of hand on lower half of sternum (nipple line).', 'Compress 2–2.4 inches (5–6 cm) at 100–120/min.', 'Allow full chest recoil — do not lean between compressions.', 'Minimise interruptions; pause only for rhythm check or shock.', 'After 30 compressions deliver 2 rescue breaths (~1 sec each, visible rise).', 'Continue 30:2 cycle until AED attached, advanced airway placed, or ROSC.'],
        color: '#ef4444',
    },
    {
        id: 'cpr_30_2_child',
        label: 'CPR 30:2 — Child (Single Rescuer)',
        icon: HeartHandshake,
        categoryId: 'interventions',
        steps: ['Use one or two hands on lower half of sternum.', 'Compress approximately 2 inches (5 cm) at 100–120/min.', 'Allow full chest recoil after each compression.', 'Single rescuer ratio: 30 compressions to 2 rescue breaths.', 'Minimise pauses; deliver breaths over ~1 second each.', 'Switch to 15:2 if a second rescuer is available.'],
        color: '#ef4444',
    },
    {
        id: 'cpr_15_2_child',
        label: 'CPR 15:2 — Child (Two-Rescuer)',
        icon: HeartHandshake,
        categoryId: 'interventions',
        steps: ['Assign one rescuer to compressions and one to ventilations.', 'Compressor: 15 compressions at ~2 inch depth, 100–120/min.', 'Ventilator: deliver 2 breaths after every 15 compressions.', 'Switch compressor roles every 2 minutes to prevent fatigue.', 'Two-rescuer 15:2 provides more frequent ventilations — preferred for paediatric patients.'],
        color: '#ef4444',
    },
    {
        id: 'cpr_30_2_infant_2finger',
        label: 'CPR 30:2 — Infant (2-Finger)',
        icon: Baby,
        categoryId: 'interventions',
        steps: ['Place infant on firm flat surface.', 'Use 2 fingers just below the inter-nipple line on the sternum.', 'Compress approximately 1.5 inches (4 cm) at 100–120/min.', 'Allow full chest recoil after each compression.', 'Single-rescuer ratio: 30 compressions to 2 rescue breaths.', 'Cover infant mouth AND nose for each rescue breath.'],
        color: '#ef4444',
    },
    {
        id: 'cpr_15_2_infant_2thumb',
        label: 'CPR 15:2 — Infant (2-Thumb Encircling)',
        icon: Baby,
        categoryId: 'interventions',
        steps: ['Two rescuers required for this technique.', 'Encircle infant\'s chest with both hands; thumbs side-by-side on lower sternum.', 'Compress approximately 1.5 inches (4 cm) at 100–120/min.', 'Allow full chest recoil between compressions.', 'Two-rescuer ratio: 15 compressions to 2 rescue breaths.', 'Preferred two-rescuer technique — generates higher coronary perfusion pressures.'],
        color: '#ef4444',
    },
    {
        id: 'resume_cpr_post_shock',
        label: 'Resume CPR Immediately Post-Shock',
        icon: HeartHandshake,
        categoryId: 'interventions',
        steps: ['Immediately after shock delivery, restart chest compressions.', 'Do NOT pause to check pulse — resume compressions within 10 seconds.', 'Continue 2-minute CPR cycle before next rhythm analysis.', 'Pulse check is performed only at the end of the 2-minute cycle.', 'Immediate post-shock CPR prevents peri-shock asystole.'],
        color: '#ef4444',
    },
    {
        id: 'switch_compressor_roles',
        label: 'Switch Compressor Roles',
        icon: HeartHandshake,
        categoryId: 'interventions',
        steps: ['Announce role switch at the 2-minute mark (or at next rhythm check).', 'New compressor positions hands without delay.', 'Switch should be completed in under 5 seconds.', 'Compressor fatigue degrades depth and rate — rotate every 2 minutes.', 'Document each rescuer\'s time as compressor for quality review.'],
        color: '#10b981',
    },

    // ── BLS Airway / Breathing ────────────────────────────────────────────────
    {
        id: 'open_airway_head_tilt_chin_lift',
        label: 'Open Airway — Head-Tilt Chin-Lift',
        icon: Wind,
        categoryId: 'interventions',
        steps: ['Place one hand on forehead, two fingers under bony chin.', 'Tilt head back and lift chin to extend the neck.', 'This displaces the tongue from the posterior pharynx.', 'Do NOT use in suspected cervical spine injury — use jaw thrust instead.', 'Maintain position throughout ventilation attempts.'],
        color: '#06b6d4',
    },
    {
        id: 'rescue_breathing_child',
        label: 'Rescue Breathing — Child',
        icon: Wind,
        categoryId: 'interventions',
        steps: ['Open airway with head-tilt chin-lift.', 'Pinch nose and create complete seal over mouth.', 'Deliver breath over 1 second — only enough to produce visible chest rise.', 'Rate: 1 breath every 3–5 seconds (12–20/min) for child with pulse.', 'Reassess pulse and breathing every 2 minutes.'],
        color: '#06b6d4',
    },
    {
        id: 'rescue_breathing_infant',
        label: 'Rescue Breathing — Infant (Mouth-to-Mouth-and-Nose)',
        icon: Wind,
        categoryId: 'interventions',
        steps: ['Open airway with slight head tilt — neutral/sniffing position for infants.', 'Cover BOTH infant mouth AND nose with your mouth.', 'Deliver small puffs (~6–8 mL/kg) — just enough for visible chest rise.', 'Avoid over-ventilation; excessive tidal volume causes gastric inflation.', 'Rate: 1 breath every 3–5 seconds (12–20/min) for infant with pulse.'],
        color: '#06b6d4',
    },
    {
        id: 'bag_valve_mask',
        label: 'Bag-Valve-Mask (Adult)',
        icon: Wind,
        categoryId: 'equipment',
        steps: ['Select adult-sized BVM with reservoir bag.', 'Connect to oxygen at 15 L/min.', 'Two-rescuer: one holds mask with C-E grip, one squeezes bag.', 'Deliver one breath every 6 seconds during CPR with advanced airway.', 'Without advanced airway: 2 breaths per 30 compressions.', 'Observe for bilateral chest rise; avoid excessive ventilation.'],
        color: '#06b6d4',
    },
    {
        id: 'bag_valve_mask_child',
        label: 'Bag-Valve-Mask — Child',
        icon: Wind,
        categoryId: 'equipment',
        steps: ['Select paediatric-sized BVM (250–450 mL bag).', 'Connect to oxygen source.', 'Maintain airway with appropriate head position for age.', 'C-E mask grip — ensure snug seal without pressing on soft tissue.', 'Deliver ~6–8 mL/kg tidal volume; watch for chest rise.', '1 breath every 3–5 seconds (12–20/min) for child with pulse.'],
        color: '#06b6d4',
    },
    {
        id: 'bag_valve_mask_infant',
        label: 'Bag-Valve-Mask — Infant',
        icon: Wind,
        categoryId: 'equipment',
        steps: ['Use neonatal/infant BVM (150–250 mL bag).', 'Neutral/sniffing position — avoid over-extending neck.', 'Use one finger under mandible only; avoid compressing soft tissues of neck.', 'Deliver small breaths: 6–8 mL/kg, enough for visible chest rise.', 'Rate: 1 breath every 3–5 seconds (12–20/min) with pulse.', 'Monitor gastric distension — consider OGT/NGT if prolonged ventilation needed.'],
        color: '#06b6d4',
    },
    {
        id: 'initial_rescue_breaths_5',
        label: '5 Initial Rescue Breaths (Drowning)',
        icon: Wind,
        categoryId: 'interventions',
        steps: ['AHA drowning protocol: hypoxic arrest — oxygenation is the priority.', 'Deliver 5 initial rescue breaths before beginning chest compressions.', 'Use head-tilt chin-lift and ensure patent airway.', 'Each breath over 1 second with visible chest rise.', 'After 5 breaths, assess pulse; if absent begin 30:2 CPR.', 'Continue prioritising ventilation alongside compressions throughout resuscitation.'],
        color: '#06b6d4',
    },
    {
        id: 'look_in_mouth_before_breath',
        label: 'Look in Mouth Before Each Ventilation',
        icon: Stethoscope,
        categoryId: 'interventions',
        steps: ['Before each ventilation attempt, tilt head and look into mouth.', 'Check for any visible foreign body or object.', 'Only remove object if clearly visible — do NOT perform blind finger sweeps.', 'Blind sweeps risk pushing object deeper or injuring oral structures.', 'If object seen, remove carefully with finger sweep then attempt ventilation.'],
        color: '#43919e',
    },

    // ── BLS AED ───────────────────────────────────────────────────────────────
    {
        id: 'aed_attach',
        label: 'Attach AED Pads',
        icon: Zap,
        categoryId: 'equipment',
        steps: ['Ensure chest is bare and dry.', 'Peel backing from AED electrode pads.', 'Apply pads per diagram on device: right sub-clavicular and left lateral chest (V4-V5 position).', 'Ensure good skin contact — shave excess hair if needed.', 'Plug pad connector into AED.', 'Minimise CPR interruption during pad application.'],
        color: '#f59e0b',
    },
    {
        id: 'aed_power_on',
        label: 'Power On AED',
        icon: Zap,
        categoryId: 'equipment',
        steps: ['Open AED lid or press power button.', 'AED will provide audio and visual prompts — follow them precisely.', 'Confirm device is functioning (indicator light, voice prompts).', 'Ensure pads are connected before analysis prompt.'],
        color: '#f59e0b',
    },
    {
        id: 'aed_attach_pads',
        label: 'Attach AED Electrode Pads',
        icon: Zap,
        categoryId: 'equipment',
        steps: ['Remove all clothing from chest.', 'Dry chest thoroughly — moisture impairs pad adhesion and shock delivery.', 'Apply right pad just below right clavicle (right of sternum).', 'Apply left pad at left lateral chest (left mid-axillary line, V4-V5 level).', 'Press firmly to ensure full contact.', 'Plug connector cable into AED port.'],
        color: '#f59e0b',
    },
    {
        id: 'aed_analyze',
        label: 'AED Rhythm Analysis',
        icon: Activity,
        categoryId: 'equipment',
        steps: ['Stop CPR — call "Clear!" and ensure no one is touching the patient.', 'Press ANALYZE button if required (some AEDs analyze automatically).', 'Remain hands-off during analysis — movement artifact can cause incorrect rhythm assessment.', 'AED will announce "Shock Advised" or "No Shock Advised".', 'If shock advised: proceed to shock delivery.', 'If no shock advised: resume CPR immediately.'],
        color: '#f59e0b',
    },
    {
        id: 'aed_shock',
        label: 'AED Shock Delivery',
        icon: Zap,
        categoryId: 'equipment',
        steps: ['Charge AED (press CHARGE if required; many auto-charge after analysis).', 'Loudly call "Clear!" — visually confirm no one is touching the patient.', 'Check yourself — ensure no contact with patient or bed.', 'Press SHOCK button firmly.', 'Immediately resume CPR starting with compressions — do not pause for pulse check.', 'AED will guide next analysis cycle after 2 minutes of CPR.'],
        color: '#f59e0b',
    },
    {
        id: 'dry_chest_before_aed',
        label: 'Dry Chest Before AED Pads',
        icon: Droplet,
        categoryId: 'equipment',
        steps: ['Mandatory step for drowning victims before AED pad placement.', 'Use towel or cloth to dry chest thoroughly.', 'Water between skin and pad reduces adhesion and may cause pad arcing.', 'Also remove any medication patches from chest area.', 'Once dry, apply AED pads and proceed with standard protocol.'],
        color: '#06b6d4',
    },

    // ── BLS Positioning / Scene Safety ────────────────────────────────────────
    {
        id: 'remove_from_water',
        label: 'Remove Patient from Water',
        icon: HeartHandshake,
        categoryId: 'interventions',
        steps: ['Ensure rescuer safety — do not enter water without training/equipment.', 'Use reach-throw-row-go order of rescue: reach, throw flotation, row a boat, then swim as last resort.', 'Once patient is accessible, support head and neck if spinal injury possible.', 'Extricate onto firm flat surface as quickly as safely possible.', 'AHA: do NOT attempt CPR in water — compressions are ineffective without solid backing.', 'Begin BLS assessment immediately on land.'],
        color: '#43919e',
    },
    {
        id: 'lower_to_ground',
        label: 'Lower Patient to Ground',
        icon: HeartHandshake,
        categoryId: 'interventions',
        steps: ['If patient becomes unresponsive while standing (e.g., choking victim loses consciousness), lower them carefully.', 'Support head and trunk to prevent injury during descent.', 'Place supine on a firm flat surface.', 'Once supine, reassess for pulse and breathing.', 'If pulseless, begin CPR; look in mouth for visible foreign body before ventilations.'],
        color: '#43919e',
    },
    {
        id: 'recovery_position',
        label: 'Place in Recovery Position',
        icon: HeartHandshake,
        categoryId: 'interventions',
        steps: ['Indicated for unresponsive patient with adequate pulse and breathing (e.g., post-naloxone).', 'Kneel beside patient lying supine.', 'Straighten patient\'s legs; place near arm at right angle to body.', 'Place far arm across chest; bend far knee up.', 'Roll patient towards you onto their side — support head throughout.', 'Adjust upper leg so hip and knee are at right angles.', 'Tilt head back slightly to maintain airway — monitor continuously until EMS arrives.'],
        color: '#10b981',
    },
    {
        id: 'position_infant_face_down',
        label: 'Position Infant Face-Down on Forearm',
        icon: Baby,
        categoryId: 'interventions',
        steps: ['Hold infant face-down along your forearm, straddling your arm.', 'Support head and jaw with your hand — do NOT cover airway.', 'Head must be lower than trunk — gravity assists foreign body displacement.', 'Use thigh for additional support if needed.', 'Deliver 5 firm back slaps between shoulder blades with heel of other hand.', 'Alternate with 5 chest thrusts; reassess after each cycle.'],
        color: '#43919e',
    },

    // ── BLS System Activation ─────────────────────────────────────────────────
    {
        id: 'call_911',
        label: 'Call 911 / Activate Emergency Response',
        icon: ShieldAlert,
        categoryId: 'interventions',
        steps: ['Shout for nearby help first — designate a specific person to call 911.', 'If alone with adult victim: call 911 BEFORE starting CPR (unless drowning/paediatric).', 'If alone with child/infant: give 2 minutes of CPR first, then call 911.', 'Provide dispatcher: location, patient age, chief complaint, whether patient is breathing.', 'Send someone to retrieve nearest AED.', 'Keep dispatcher on line until EMS arrives.'],
        color: '#ef4444',
    },

    // ── BLS FBAO Relief ───────────────────────────────────────────────────────
    {
        id: 'back_blows_5',
        label: '5 Back Blows (Interscapular)',
        icon: HeartHandshake,
        categoryId: 'interventions',
        steps: ['Stand to the side and slightly behind the patient.', 'Support chest with one arm; lean patient slightly forward.', 'Deliver 5 firm, distinct blows with the heel of hand between shoulder blades.', 'Each blow is a separate strike — not a continuous push.', 'Alternate with 5 abdominal thrusts; check mouth after each cycle.', 'Continue alternating until object is expelled or patient becomes unconscious.'],
        color: '#f59e0b',
    },
    {
        id: 'abdominal_thrusts_heimlich_5',
        label: '5 Abdominal Thrusts (Heimlich)',
        icon: HeartHandshake,
        categoryId: 'interventions',
        steps: ['Stand behind patient; wrap arms around waist.', 'Make a fist with thumb-side against abdomen — midline, just above navel, well below xiphoid.', 'Grasp fist with other hand.', 'Deliver 5 firm, rapid inward-and-upward thrusts.', 'Each thrust is a separate, forceful movement.', 'Alternate with 5 back blows; inspect mouth after each cycle for expelled object.', 'If patient is obese or pregnant, use chest thrusts instead of abdominal thrusts.'],
        color: '#f59e0b',
    },
    {
        id: 'back_slaps_infant_5',
        label: '5 Back Slaps — Infant',
        icon: Baby,
        categoryId: 'interventions',
        steps: ['Position infant face-down on forearm, head lower than trunk.', 'Deliver 5 firm back slaps with heel of hand between infant\'s shoulder blades.', 'Each slap is a distinct, firm stroke — not a continuous push.', 'Support head throughout — do not cover airway.', 'After 5 slaps, turn infant face-up on opposite forearm for chest thrusts.', 'Inspect mouth; only remove visible foreign body.'],
        color: '#f59e0b',
    },
    {
        id: 'chest_thrusts_infant_5',
        label: '5 Chest Thrusts — Infant',
        icon: Baby,
        categoryId: 'interventions',
        steps: ['Turn infant face-up on forearm, head lower than trunk.', 'Place two fingers on lower sternum — one finger width below inter-nipple line.', 'Deliver 5 downward chest thrusts at approximately 1.5 inches (4 cm) depth.', 'Each thrust is distinct; allow full recoil.', 'Chest thrusts replace abdominal thrusts for infants — Heimlich risks organ injury.', 'After 5 thrusts, turn face-down and repeat 5 back slaps; check mouth each cycle.'],
        color: '#f59e0b',
    },

    // ── BLS Pharmacology ──────────────────────────────────────────────────────
    {
        id: 'naloxone_intranasal_4mg',
        label: 'Naloxone 4 mg Intranasal',
        icon: ShieldAlert,
        categoryId: 'meds',
        steps: ['AHA 2023 first-line opioid overdose dose for layperson and EMS.', 'Administer 4 mg intranasally: 1 spray per nostril if using 2 mg/spray device.', 'Position patient supine; tilt head back slightly.', 'If no response in 2–4 minutes, administer repeat dose in opposite nostril.', 'Provide rescue breathing / BVM ventilation concurrently.', 'Monitor for recurrence of CNS/respiratory depression — naloxone wears off in 30–90 min.'],
        color: '#a855f7',
    },
    {
        id: 'naloxone_intranasal_repeat',
        label: 'Repeat Naloxone 4 mg IN (q2–4 min)',
        icon: ShieldAlert,
        categoryId: 'meds',
        steps: ['Indicated for high-potency synthetic opioids (fentanyl, carfentanil) or inadequate initial response.', 'Administer 4 mg IN (alternate nostril if possible) every 2–4 minutes.', 'Continue rescue breathing between doses.', 'Document time and dose of each administration.', 'Multiple doses may be required — fentanyl overdose often requires >1 dose of naloxone.', 'Place in recovery position once responsive; monitor closely for renarcotization.'],
        color: '#a855f7',
    },
    {
        id: 'naloxone_im_repeat',
        label: 'Repeat Naloxone 0.4 mg IM (q2–4 min)',
        icon: Syringe,
        categoryId: 'meds',
        steps: ['Repeat IM naloxone for inadequate IN response or when IV access unavailable.', 'Draw 0.4 mg naloxone into syringe.', 'Inject into anterolateral thigh or deltoid.', 'IM onset 5–10 min; faster and more reliable absorption than repeat IN for synthetic opioids.', 'May repeat every 2–4 minutes — maximum guided by clinical response.', 'Simultaneously provide rescue breathing; place in recovery position once responsive.'],
        color: '#a855f7',
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
    activeInterventions: { id: string; start_time: number; duration_sec?: number }[];
    elapsedSec: number;
    /** P3-B (ISSUE-15): When true, all actions are disabled and a completion banner is shown */
    disabled?: boolean;
}

function getCooldownRemaining(
    actionId: string,
    activeInterventions: { id: string; start_time: number; duration_sec?: number }[],
    elapsedSec: number
): number | null {
    const active = activeInterventions.find(i => i.id === actionId);
    if (!active || active.duration_sec === undefined) return null;
    const remaining = active.duration_sec - (elapsedSec - active.start_time);
    return remaining > 0 ? Math.ceil(remaining) : null;
}

const ActionsScreen: React.FC<ActionsScreenProps> = ({
    applyIntervention,
    initialActionIdToReview,
    onReviewActionHandled,
    activeInterventions,
    elapsedSec,
    disabled = false,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [selectedAction, setSelectedAction] = useState<Action | null>(null);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [suppressed, setSuppressed] = useState<Record<string, boolean>>(readSuppressedProcedures);

    // Derive the set of category options dynamically from the ACTIONS array so
    // the pill list auto-updates if actions are added or removed per scenario.
    const availableCategories = useMemo(() => {
        const usedCatIds = new Set(ACTIONS.map(a => a.categoryId));
        return CATEGORIES.filter(c => usedCatIds.has(c.id as 'interventions' | 'meds' | 'equipment'));
    }, []);

    // R-4: Cleanup on unmount — closes ProcedureGuide when tab switches away
    useEffect(() => {
        return () => {
            setSelectedAction(null);
        };
    }, []);

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
        return ACTIONS.filter(action => {
            const matchesSearch =
                action.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                action.categoryId.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory =
                selectedCategory === 'All' || action.categoryId === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [searchQuery, selectedCategory]);

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
                        id="actions-search"
                        type="text"
                        className="block w-full rounded-2xl border-none bg-slate-50 py-4 pl-11 pr-4 text-sm font-medium placeholder:text-slate-400 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-medical-500/20"
                        placeholder="Search procedures, meds..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </form>

                {/* Category filter pills — matches LibraryScreen protocol pill pattern */}
                <div id="actions-categories" className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
                    <button
                        type="button"
                        onClick={() => setSelectedCategory('All')}
                        className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all ${
                            selectedCategory === 'All'
                                ? 'bg-medical-500 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                    >
                        All
                    </button>
                    {availableCategories.map(cat => (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all ${
                                selectedCategory === cat.id
                                    ? 'bg-medical-500 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </header>

            {/* P3-B (ISSUE-15): Completion banner — shown when scenario is no longer running */}
            {disabled && (
                <div className="bg-slate-100 text-slate-500 text-sm p-3 rounded-lg mb-4 mx-6 mt-4">
                    Scenario complete — no further actions available.
                </div>
            )}

            <article id="actions-list-container" className={`flex-1 overflow-y-auto px-6 pt-6 pb-4${disabled ? ' pointer-events-none opacity-50' : ''}`}>
                {CATEGORIES.map(category => {
                    const catActions = filteredActions.filter((a: Action) => a.categoryId === category.id);
                    if (catActions.length === 0) return null;

                    return (
                        <section key={category.id} id={category.id === 'meds' ? 'actions-category-meds' : `category-group-${category.id}`} className="mb-8 last:mb-0">
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
                                {catActions.map((action: Action, actionIdx: number) => {
                                    const cooldownSec = getCooldownRemaining(action.id, activeInterventions, elapsedSec);
                                    const activeEntry = activeInterventions.find(i => i.id === action.id);
                                    const progressPct = cooldownSec !== null && activeEntry?.duration_sec !== undefined
                                        ? ((activeEntry.duration_sec - cooldownSec) / activeEntry.duration_sec) * 100
                                        : null;
                                    return (
                                        <li key={action.id} id={actionIdx === 0 && category.id === filteredActions[0]?.categoryId ? 'action-card-first' : undefined} className="list-none">
                                            <button
                                                id={`action-btn-${action.id}`}
                                                type="button"
                                                onClick={() => handleActionClick(action)}
                                                disabled={cooldownSec !== null}
                                                className={`relative group flex w-full items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all overflow-hidden${cooldownSec !== null ? ' opacity-50 cursor-not-allowed' : ' hover:border-medical-100 hover:shadow-premium active:scale-[0.98]'}`}
                                            >
                                                <div className="flex flex-1 items-center gap-4 overflow-hidden">
                                                    <div
                                                        className="shrink-0 rounded-xl p-3 transition-colors"
                                                        style={{ backgroundColor: `${action.color}15`, color: action.color }}
                                                    >
                                                        <action.icon size={20} />
                                                    </div>
                                                    {/* R-16: line-clamp-2 instead of truncate; min-h-[56px] prevents layout shift */}
                                                    <div className="flex flex-col items-start min-h-[56px] justify-center">
                                                        <span className="line-clamp-2 text-sm font-bold tracking-tight text-slate-700 leading-tight">{action.label}</span>
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 transition-colors group-hover:text-medical-500">
                                                            {suppressed[action.id] ? 'Execute Directly' : 'View Card'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <ChevronRight size={18} className="text-slate-300 transition-colors group-hover:text-medical-400" />
                                                {cooldownSec !== null && (
                                                    <span className="absolute top-2 right-2 rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-bold text-white leading-none">
                                                        ⏱ {cooldownSec}s
                                                    </span>
                                                )}
                                                {progressPct !== null && (
                                                    <div className="absolute bottom-0 left-0 h-1 rounded-b-2xl bg-medical-400 transition-all" style={{ width: `${progressPct}%` }} />
                                                )}
                                            </button>
                                        </li>
                                    );
                                })}
                            </menu>
                        </section>
                    );
                })}

                {filteredActions.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                        <div className="p-4 bg-slate-100 rounded-full mb-4">
                            <Zap size={32} className="text-slate-400" />
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
