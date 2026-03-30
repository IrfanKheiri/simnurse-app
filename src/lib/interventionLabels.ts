interface InterventionCopy {
  display: string;
  short?: string;
  badge?: string;
}

function humanizeInterventionWords(interventionId: string): string {
  return interventionId.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export const INTERVENTION_COPY: Record<string, InterventionCopy> = {
  cpr: { display: 'CPR (High-Quality)', short: 'CPR', badge: 'CPR' },
  cpr_30_2: { display: 'CPR 30:2', short: 'CPR', badge: 'CPR' },
  cpr_30_2_child: { display: 'CPR 30:2 (Child)', short: 'CPR', badge: 'CPR' },
  cpr_30_2_infant_2finger: { display: 'CPR 30:2 Infant (2-finger)', short: 'CPR', badge: 'CPR' },
  cpr_15_2_child: { display: 'CPR 15:2 (Child)', short: 'CPR', badge: 'CPR' },
  cpr_15_2_infant_2thumb: { display: 'CPR 15:2 Infant (2-thumb)', short: 'CPR', badge: 'CPR' },
  resume_cpr_post_shock: { display: 'Resume CPR Post-Shock', short: 'Rsm CPR', badge: 'CPR POST-SHOCK' },
  defibrillate: { display: 'Defibrillate (AED/Manual)', short: 'Defib', badge: 'DEFIB' },
  defibrillate_pediatric: { display: 'Defibrillate — Pediatric (2 J/kg)', short: 'Defib', badge: 'PED DEFIB' },
  synchronized_cardioversion: { display: 'Synchronized Cardioversion', short: 'Cardio' },
  vagal_maneuver: { display: 'Vagal Maneuver', short: 'Vagal' },
  rescue_breathing: { display: 'Rescue Breathing (BVM)', short: 'RB' },
  rescue_breathing_child: { display: 'Rescue Breathing — Child', short: 'RB' },
  rescue_breathing_infant: { display: 'Rescue Breathing — Infant', short: 'RB' },
  intubation: { display: 'Advanced Airway (Intubation)', short: 'Intub' },
  oxygen_nrb: { display: 'Oxygen via NRB Mask', short: 'O₂', badge: 'O₂' },
  high_flow_oxygen: { display: 'High-Flow Oxygen (15 L/min)', short: 'O₂', badge: 'HIGH-FLOW O₂' },
  bag_valve_mask: { display: 'Bag-Valve Mask', short: 'BVM', badge: 'BVM' },
  bag_valve_mask_child: { display: 'Bag-Valve Mask (Child)', short: 'BVM', badge: 'BVM' },
  bag_valve_mask_infant: { display: 'Bag-Valve Mask (Infant)', short: 'BVM', badge: 'BVM' },
  albuterol_nebulizer: { display: 'Albuterol Nebulizer (2.5mg)', short: 'Albuterol' },
  ipratropium_nebulizer: { display: 'Ipratropium Nebulizer (0.5mg)', short: 'Ipratrop' },
  epinephrine_1mg: { display: 'Epinephrine 1mg IV/IO', short: 'Epi' },
  epinephrine_im_0_5mg: { display: 'Epinephrine 0.5mg IM (1:1,000)', short: 'Epi' },
  epinephrine_im_pediatric: { display: 'Epinephrine 0.01mg/kg IM (Peds)', short: 'Epi' },
  epinephrine_peds_01mgkg: { display: 'Epinephrine 0.01mg/kg IV/IO (Peds)', short: 'Epi' },
  amiodarone_300mg: { display: 'Amiodarone 300mg IV/IO', short: 'Amio' },
  amiodarone_150mg_stable: { display: 'Amiodarone 150mg IV (Stable VTach)', short: 'Amio' },
  amiodarone_peds_5mgkg: { display: 'Amiodarone 5mg/kg IV/IO (Peds)', short: 'Amio' },
  adenosine_6mg: { display: 'Adenosine 6mg Rapid IVP', short: 'Adeno' },
  atropine_0_5mg: { display: 'Atropine 0.5mg IV', short: 'Atrop' },
  naloxone_2mg: { display: 'Naloxone 2mg IN/IV' },
  naloxone_intranasal_4mg: { display: 'Naloxone 4mg Intranasal', short: 'Narcan' },
  naloxone_intranasal_repeat: { display: 'Naloxone Repeat Intranasal', short: 'Narcan' },
  naloxone_im_repeat: { display: 'Naloxone Repeat IM', short: 'Narcan' },
  aspirin_324mg: { display: 'Aspirin 324mg PO', short: 'ASA' },
  ticagrelor_180mg: { display: 'Ticagrelor 180mg PO (Loading)', short: 'Tica' },
  nitroglycerin_04mg: { display: 'Nitroglycerin 0.4mg SL', short: 'NTG' },
  heparin_bolus: { display: 'Heparin Bolus IV (UFH)', short: 'Hep' },
  methylprednisolone_iv: { display: 'Methylprednisolone 1mg/kg IV', short: 'MP' },
  alteplase: { display: 'Alteplase (rtPA) IV Infusion', short: 'tPA' },
  labetalol_10mg: { display: 'Labetalol 10mg IV', short: 'Label' },
  normal_saline_bolus: { display: 'Normal Saline Bolus (500mL IV)', short: 'NS' },
  establish_iv: { display: 'Establish IV/IO Access', short: 'IV' },
  check_glucose: { display: 'Check Blood Glucose', short: 'Glucose' },
  pulse_check: { display: 'Pulse / Rhythm Check', short: 'Pulse / Rhythm Check', badge: 'PULSE CHECK' },
  transcutaneous_pacing: { display: 'Transcutaneous Pacing (TCP)', short: 'TCP', badge: 'TCP' },
  ct_brain_noncontrast: { display: 'CT Brain (Non-Contrast)', short: 'CT Brain', badge: 'CT BRAIN' },
  activate_cath_lab: { display: 'Activate Cath Lab / PCI Consult', short: 'Cath Lab', badge: 'CATH LAB' },
  left_uterine_displacement: { display: 'Left Uterine Displacement (LUD)', short: 'LUD', badge: 'LUD' },
  perimortem_csection: { display: 'Perimortem Cesarean Delivery (PMCD)', short: 'PMCD', badge: 'PMCD' },
  recovery_position: { display: 'Recovery Position', short: 'Recov' },
  call_911: { display: 'Call 911 / Activate EMS', short: '911', badge: '911' },
  check_responsiveness: { display: 'Check Responsiveness', short: 'Respond' },
  sternal_rub_stimulation: { display: 'Sternal Rub / Stimulation', short: 'Sternal' },
  open_airway_head_tilt_chin_lift: { display: 'Open Airway (Head-Tilt Chin-Lift)', short: 'Open Air' },
  check_carotid_pulse: { display: 'Check Carotid Pulse', short: 'Carotid' },
  check_brachial_pulse: { display: 'Check Brachial Pulse', short: 'Brachial' },
  aed_attach: { display: 'Attach AED Pads', short: 'AED', badge: 'AED' },
  aed_power_on: { display: 'Power On AED', short: 'AED On', badge: 'AED ON' },
  aed_attach_pads: { display: 'Attach AED Pads', short: 'AED Pads', badge: 'AED PADS' },
  aed_analyze: { display: 'AED — Analyze Rhythm', short: 'AED Anlyz', badge: 'AED ANALYZE' },
  aed_shock: { display: 'AED — Deliver Shock', short: 'Shock', badge: 'AED SHOCK' },
  aed_clear: { display: 'AED — Clear! (Stand back)' },
  dry_chest_before_aed: { display: 'Dry Chest Before AED', short: 'Dry Chest' },
  switch_compressor_roles: { display: 'Switch Compressor Roles', short: 'Switch' },
  initial_rescue_breaths_5: { display: 'Initial 5 Rescue Breaths', short: 'Rescue Br' },
  look_in_mouth_before_breath: { display: 'Look In Mouth Before Breath', short: 'Chk Mouth' },
  lower_to_ground: { display: 'Lower to Ground Safely', short: 'Lower' },
  remove_from_water: { display: 'Remove from Water', short: 'Remove' },
  ask_if_choking: { display: 'Ask if Choking', short: 'Ask Choke' },
  back_blows_5: { display: '5 Back Blows', short: 'Bk Blows' },
  abdominal_thrusts_heimlich_5: { display: '5 Abdominal Thrusts (Heimlich)', short: 'Heimlich' },
  back_slaps_infant_5: { display: '5 Back Slaps (Infant)', short: 'Bk Slaps' },
  chest_thrusts_infant_5: { display: '5 Chest Thrusts (Infant)', short: 'Chest Thr' },
  position_infant_face_down: { display: 'Position Infant Face-Down', short: 'Face Down' },
  iv_fluid_bolus_anaphylaxis: { display: 'IV Fluid Bolus (Anaphylaxis)', short: 'IV Fluid' },
  magnesium_sulfate_iv: { display: 'Magnesium Sulfate IV', short: 'Mag Sulf' },
};

export function humanizeInterventionId(interventionId: string): string {
  return humanizeInterventionWords(interventionId);
}

export function getInterventionDisplayLabel(interventionId: string): string {
  return INTERVENTION_COPY[interventionId]?.display ?? humanizeInterventionId(interventionId);
}

export function getInterventionShortLabel(interventionId: string): string {
  return INTERVENTION_COPY[interventionId]?.short ?? interventionId.slice(0, 6).toUpperCase();
}

export function getInterventionBadgeLabel(interventionId: string): string {
  return INTERVENTION_COPY[interventionId]?.badge ?? humanizeInterventionId(interventionId).toUpperCase();
}
