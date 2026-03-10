# BLS Action Sequences — Clinical Reference (2020 AHA BLS Guidelines + 2023 Updates)

> **Audience:** Nursing educators and simulation faculty using the SimNurse application.
> This document is a standalone clinical reference derived from the simulation scenario data in [`seedScenarios.ts`](../src/data/seedScenarios.ts). All action sequences reflect the 2020 AHA BLS Guidelines with 2023 naloxone updates.

---

## Table of Contents

1. [Adult Scenarios](#adult-scenarios)
   - [Cardiac Arrest](#cardiac-arrest)
   - [Choking (FBAO)](#choking-fbao)
2. [Pediatric — Child Scenarios](#pediatric--child-scenarios)
   - [Cardiac Arrest](#cardiac-arrest-1)
3. [Pediatric — Infant Scenarios](#pediatric--infant-scenarios)
   - [Cardiac Arrest](#cardiac-arrest-2)
   - [Choking (FBAO)](#choking-fbao-1)
4. [Special Populations & Toxicological](#special-populations--toxicological)
   - [Opioid Overdose](#opioid-overdose)
   - [Drowning / Submersion](#drowning--submersion)
5. [Cross-cutting AHA BLS Standards](#cross-cutting-aha-bls-standards)
6. [Key Protocol Differences](#key-protocol-differences)
7. [Naloxone Dosing Reference](#naloxone-dosing-reference)

---

## Adult Scenarios

### Cardiac Arrest

---

#### Adult Cardiac Arrest — Bystander CPR (`bls_adult_cardiac_arrest_bystander`)


| Field             | Value       |
| ------------------- | ------------- |
| **Difficulty**    | 🟢 Beginner |
| **Domain**        | Cardiac     |
| **Est. Duration** | 10 min      |
| **Protocol**      | BLS         |

> **Clinical Context:** 54-year-old male found unresponsive. Single-rescuer scenario emphasising high-quality 30:2 CPR and AED use. ⚠️ Brain injury risk increases after 3 minutes without compressions.


| Step | Action ID                           | Label                                  | Category           | AHA Rationale                                                                                                                                                                 |
| ------ | ------------------------------------- | ---------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | ✅`check_responsiveness`            | Check Responsiveness                   | Assessment         | Confirming unresponsiveness is the first mandatory step before initiating any emergency response to avoid unnecessary interventions on conscious patients.                    |
| 2    | ✅`call_911`                        | Call 911 / Activate Emergency Response | System Activation  | Early activation of EMS ensures advanced life support resources and a defibrillator are en route, reducing time-to-definitive-care.                                           |
| 3    | ✅`check_carotid_pulse`             | Check Carotid Pulse (≤10 sec)         | Assessment         | A pulse check of no more than 10 seconds determines pulselessness and triggers the full cardiac arrest algorithm.                                                             |
| 4    | ✅`cpr_30_2`                        | CPR 30:2 — Adult                      | CPR                | Chest compressions at 100–120/min with 2–2.4 inch depth maintain minimal coronary and cerebral perfusion pressure until defibrillation is available.                        |
| 5    | ✅`open_airway_head_tilt_chin_lift` | Open Airway — Head-Tilt Chin-Lift     | Airway             | The head-tilt chin-lift manoeuvre displaces the tongue from the posterior pharynx, establishing a patent airway for rescue ventilation.                                       |
| 6    | ✅`rescue_breathing`                | Rescue Breathing (Mouth-to-Mouth)      | Airway / Breathing | Rescue breaths deliver oxygen to the lungs, sustaining arterial oxygen saturation and reducing secondary hypoxic injury during pulselessness.                                 |
| 7    | ✅`aed_attach`                      | Attach AED Pads                        | Defibrillation     | Early defibrillation is the only definitive treatment for shockable rhythms (VFib/pulseless VTach); each minute of delay reduces survival by 7–10%.                          |
| 8    | ✅`resume_cpr_post_shock`           | Resume CPR Immediately Post-Shock      | CPR                | Immediately resuming compressions after a shock maintains perfusion pressure, as the heart requires several cycles to achieve effective mechanical output post-cardioversion. |

---

#### Adult Cardiac Arrest — Two-Rescuer CPR (`bls_adult_two_rescuer_cpr`)


| Field             | Value           |
| ------------------- | ----------------- |
| **Difficulty**    | 🟡 Intermediate |
| **Domain**        | Cardiac         |
| **Est. Duration** | 12 min          |
| **Protocol**      | BLS             |

> **Clinical Context:** 62-year-old female in VFib. Two-rescuer scenario with role delineation, bag-valve-mask ventilation, and compressor rotation. ⚠️ VFib deteriorates to asystole after 7 minutes without defibrillation.


| Step | Action ID                           | Label                                        | Category           | AHA Rationale                                                                                                                                                             |
| ------ | ------------------------------------- | ---------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | ✅`check_responsiveness`            | Check Responsiveness                         | Assessment         | Scene safety and confirmation of unresponsiveness must precede all interventions to ensure appropriate resource mobilisation.                                             |
| 2    | ✅`call_911`                        | Call 911 / Activate Emergency Response       | System Activation  | Simultaneous EMS activation while a second rescuer prepares CPR is the advantage of two-rescuer response, minimising delay to advanced care.                              |
| 3    | ✅`check_carotid_pulse`             | Check Carotid Pulse (≤10 sec)               | Assessment         | A pulse check limited to 10 seconds prevents unnecessary interruption to compressions and confirms the need for CPR.                                                      |
| 4    | ✅`cpr_30_2`                        | CPR 30:2 — Adult                            | CPR                | High-quality compressions are the cornerstone of BLS; depth of 2–2.4 inches and rate of 100–120/min maximise perfusion during cardiac arrest.                           |
| 5    | ✅`open_airway_head_tilt_chin_lift` | Open Airway — Head-Tilt Chin-Lift           | Airway             | Airway positioning is a prerequisite for effective bag-valve-mask ventilation in two-rescuer CPR.                                                                         |
| 6    | ✅`bag_valve_mask`                  | Bag-Valve-Mask Ventilation                   | Airway / Breathing | BVM delivers higher tidal volumes than mouth-to-mouth and allows supplemental oxygen delivery, improving oxygenation during resuscitation.                                |
| 7    | ✅`switch_compressor_roles`         | Switch Compressor Roles                      | CPR                | Role switching every 2 minutes prevents compressor fatigue and maintains compression quality, as depth degrades significantly after 2 minutes of continuous compressions. |
| 8    | ✅`aed_attach`                      | Attach AED / Defibrillate (Shockable Rhythm) | Defibrillation     | For VFib/VTach, defibrillation is the definitive intervention; pads must be placed and rhythm analysed at the earliest opportunity.                                       |
| 9    | ✅`resume_cpr_post_shock`           | Resume CPR Immediately Post-Shock            | CPR                | Post-shock CPR bridges the peri-shock period during which the myocardium requires mechanical support to achieve sustained ROSC.                                           |

---

#### Adult Cardiac Arrest — Public AED (`bls_adult_aed_public_access`)


| Field             | Value       |
| ------------------- | ------------- |
| **Difficulty**    | 🟢 Beginner |
| **Domain**        | Cardiac     |
| **Est. Duration** | 8 min       |
| **Protocol**      | BLS         |

> **Clinical Context:** 49-year-old male in VFib at a public venue. Focuses on the complete public-access defibrillation (PAD) sequence. ⚠️ Each minute without defibrillation reduces VFib-to-ROSC survival by 7–10%.


| Step | Action ID                 | Label                                  | Category          | AHA Rationale                                                                                                                                            |
| ------ | --------------------------- | ---------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | ✅`check_responsiveness`  | Check Responsiveness                   | Assessment        | Establishing unresponsiveness confirms the need to activate the emergency response system and prevents unnecessary defibrillation in conscious patients. |
| 2    | ✅`call_911`              | Call 911 / Activate Emergency Response | System Activation | Activating EMS before AED setup ensures advanced support is en route while the PAD sequence is completed.                                                |
| 3    | ✅`check_carotid_pulse`   | Check Carotid Pulse (≤10 sec)         | Assessment        | Pulse confirmation within 10 seconds determines pulselessness and justifies AED use.                                                                     |
| 4    | ✅`cpr_30_2`              | CPR 30:2 — Adult                      | CPR               | Compressions maintain coronary perfusion pressure and increase likelihood of successful defibrillation by sustaining myocardial viability.               |
| 5    | ✅`aed_power_on`          | Power On AED                           | Defibrillation    | Powering on the AED initiates audio/visual guidance that directs lay rescuers through the PAD sequence without prior training.                           |
| 6    | ✅`aed_attach_pads`       | Attach AED Electrode Pads              | Defibrillation    | Pad placement per AED diagram (right clavicle / left lateral chest) enables rhythm acquisition and shock vector delivery.                                |
| 7    | ✅`aed_analyze`           | AED Rhythm Analysis                    | Defibrillation    | Rhythm analysis during a "hands-off" period accurately detects shockable rhythms, preventing inadvertent shock delivery to non-shockable rhythms.        |
| 8    | ✅`aed_shock`             | AED Shock Delivery                     | Defibrillation    | Defibrillation terminates VFib/pVT by simultaneously depolarising the myocardium, allowing the sinus node to recapture rhythm.                           |
| 9    | ✅`resume_cpr_post_shock` | Resume CPR Immediately Post-Shock      | CPR               | Compressions should restart within 10 seconds of shock delivery to support a post-shock heart that may not yet generate adequate cardiac output.         |

---

### Choking (FBAO)

---

#### Adult Foreign Body Airway Obstruction — Responsive (`bls_adult_choking_responsive`)


| Field             | Value       |
| ------------------- | ------------- |
| **Difficulty**    | 🟢 Beginner |
| **Domain**        | Emergency   |
| **Est. Duration** | 5 min       |
| **Protocol**      | BLS         |

> **Clinical Context:** 45-year-old female with complete airway obstruction (unable to speak, cough, or breathe). SpO₂ declining at −3%/10 sec. ⚠️ Patient becomes unresponsive from hypoxia at 3 minutes if obstruction is not relieved.


| Step | Action ID                        | Label                                  | Category          | AHA Rationale                                                                                                                                                        |
| ------ | ---------------------------------- | ---------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | ✅`ask_if_choking`               | Ask "Are You Choking?"                 | Assessment        | Verbal confirmation of complete obstruction distinguishes FBAO from other causes of distress and justifies Heimlich manoeuvre application.                           |
| 2    | ✅`back_blows_5`                 | 5 Back Blows (Interscapular)           | FBAO Relief       | Firm interscapular blows create a pressure wave in the airway that can dislodge the foreign body superiorly toward the mouth.                                        |
| 3    | ✅`abdominal_thrusts_heimlich_5` | 5 Abdominal Thrusts (Heimlich)         | FBAO Relief       | Subdiaphragmatic compressions increase intrathoracic pressure, generating airflow that may expel the obstruction; alternating with back blows improves success rate. |
| 4    | ✅`call_911`                     | Call 911 / Activate Emergency Response | System Activation | If obstruction is not relieved within several cycles, EMS must be activated for advanced airway management including laryngoscopy and surgical airway.               |

---

#### Adult Foreign Body Airway Obstruction — Unresponsive (`bls_adult_choking_unresponsive`)


| Field             | Value           |
| ------------------- | ----------------- |
| **Difficulty**    | 🟡 Intermediate |
| **Domain**        | Emergency       |
| **Est. Duration** | 7 min           |
| **Protocol**      | BLS             |

> **Clinical Context:** 38-year-old male already unresponsive from FBAO-induced hypoxic arrest. ⚠️ Blind finger sweeps are contraindicated — only remove a visible object. Each compression may expel the obstruction.


| Step | Action ID                       | Label                                  | Category           | AHA Rationale                                                                                                                                                                |
| ------ | --------------------------------- | ---------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | ✅`call_911`                    | Call 911 / Activate Emergency Response | System Activation  | An unresponsive choking victim requires immediate EMS activation for advanced airway management, as BLS techniques may be insufficient.                                      |
| 2    | ✅`lower_to_ground`             | Lower Patient to Ground Safely         | Positioning        | A controlled lowering prevents traumatic fall injury and positions the patient for supine CPR initiation.                                                                    |
| 3    | ✅`cpr_30_2`                    | CPR 30:2 — Adult                      | CPR                | Chest compressions in an unresponsive choking patient generate airway expulsion pressure with each compression cycle while simultaneously treating cardiac arrest.           |
| 4    | ✅`look_in_mouth_before_breath` | Look in Mouth Before Each Ventilation  | Airway             | Visual inspection before each rescue breath identifies and allows safe removal of visible obstructions; blind finger sweeps may push objects deeper and are contraindicated. |
| 5    | ✅`rescue_breathing`            | Rescue Breathing                       | Airway / Breathing | Once the obstruction is confirmed absent or removed, rescue breaths restore oxygenation and may restore spontaneous circulation.                                             |

---

## Pediatric — Child Scenarios

### Cardiac Arrest

---

#### Pediatric Cardiac Arrest — Child CPR (`bls_child_cardiac_arrest`)


| Field             | Value           |
| ------------------- | ----------------- |
| **Difficulty**    | 🟡 Intermediate |
| **Domain**        | Pediatric       |
| **Est. Duration** | 10 min          |
| **Protocol**      | BLS             |

> **Clinical Context:** 6-year-old male in asystole. Single-rescuer scenario. Paediatric arrests are predominantly hypoxic in aetiology — ventilation is co-equal with compressions. Compress ~2 inches at 100–120/min; use paediatric dose-attenuator AED pads if patient is under 8 years or under 25 kg.


| Step | Action ID                  | Label                                        | Category           | AHA Rationale                                                                                                                                                    |
| ------ | ---------------------------- | ---------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | ✅`check_responsiveness`   | Check Responsiveness                         | Assessment         | Confirming unresponsiveness and absence of breathing triggers the paediatric BLS algorithm and EMS activation.                                                   |
| 2    | ✅`call_911`               | Call 911 / Activate Emergency Response       | System Activation  | In a witnessed child arrest, call 911 immediately (unlike lone-rescuer infant protocol); EMS should be en route while CPR begins.                                |
| 3    | ✅`check_carotid_pulse`    | Check Carotid Pulse (≤10 sec)               | Assessment         | Healthcare providers perform a carotid pulse check in children; no pulse confirmed within 10 seconds mandates CPR initiation.                                    |
| 4    | ✅`cpr_30_2_child`         | CPR 30:2 — Child (Single Rescuer)           | CPR                | Single-rescuer child CPR uses 30:2 ratio; compressions of ~2 inches generate perfusion in the smaller thorax while balancing ventilation time.                   |
| 5    | ✅`rescue_breathing_child` | Rescue Breathing — Child                    | Airway / Breathing | Oxygenation is critical in hypoxic paediatric arrest; rescue breaths are sized for the child's smaller tidal volume (~500 mL or visible chest rise).             |
| 6    | ✅`aed_attach`             | Attach AED Pads (Paediatric Dose-Attenuator) | Defibrillation     | Defibrillation addresses any shockable rhythm; paediatric pads or an attenuator are used for patients under 8 years to deliver a weight-appropriate energy dose. |
| 7    | ✅`resume_cpr_post_shock`  | Resume CPR Immediately Post-Shock            | CPR                | Resuming compressions within 10 seconds of shock maintains perfusion in the post-shock period before ROSC can be confirmed.                                      |

---

#### Pediatric Cardiac Arrest — Two-Rescuer Child (`bls_child_two_rescuer_cpr`)


| Field             | Value           |
| ------------------- | ----------------- |
| **Difficulty**    | 🟡 Intermediate |
| **Domain**        | Pediatric       |
| **Est. Duration** | 10 min          |
| **Protocol**      | BLS             |

> **Clinical Context:** 4-year-old female in asystole. Two-rescuer scenario using the 15:2 ratio specific to paediatric two-rescuer CPR. Switch compressor every 2 minutes to maintain compression quality.


| Step | Action ID                   | Label                                        | Category           | AHA Rationale                                                                                                                                                               |
| ------ | ----------------------------- | ---------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | ✅`cpr_15_2_child`          | CPR 15:2 — Child (Two-Rescuer)              | CPR                | The 15:2 ratio in two-rescuer child CPR provides more frequent ventilations per minute, addressing the predominantly hypoxic aetiology of paediatric arrest.                |
| 2    | ✅`check_carotid_pulse`     | Check Carotid Pulse (≤10 sec)               | Assessment         | Pulse reassessment after the first CPR cycle quantifies response and directs continuation or transition of the algorithm.                                                   |
| 3    | ✅`bag_valve_mask_child`    | Bag-Valve-Mask — Child                      | Airway / Breathing | BVM with supplemental oxygen provides superior oxygenation compared to mouth-to-mouth, and the two-rescuer configuration allows simultaneous mask seal and bag compression. |
| 4    | ✅`switch_compressor_roles` | Switch Compressor Roles                      | CPR                | Rotating the compressor every 2 minutes prevents fatigue-related degradation of compression depth and rate, maintaining CPR quality.                                        |
| 5    | ✅`aed_attach`              | Attach AED Pads (Paediatric Dose-Attenuator) | Defibrillation     | Defibrillation treats shockable rhythms if present; paediatric attenuator pads reduce delivered energy to 2–4 J/kg for appropriate dosing in small children.               |
| 6    | ✅`resume_cpr_post_shock`   | Resume CPR Immediately Post-Shock            | CPR                | Post-shock CPR is mandatory per AHA guidelines; compressions support a stunned myocardium that requires time to generate effective mechanical output.                       |

---

## Pediatric — Infant Scenarios

### Cardiac Arrest

---

#### Infant Cardiac Arrest — Single Rescuer (`bls_infant_cardiac_arrest`)


| Field             | Value           |
| ------------------- | ----------------- |
| **Difficulty**    | 🟡 Intermediate |
| **Domain**        | Pediatric       |
| **Est. Duration** | 8 min           |
| **Protocol**      | BLS             |

> **Clinical Context:** 4-month-old female in asystole. ⚠️ **Critical AHA lone-rescuer infant protocol:** Perform 2 minutes of CPR **BEFORE** calling 911 — the hypoxic aetiology means immediate oxygenation takes precedence over EMS activation. Use 2-finger technique just below the nipple line; compress 1.5 inches at 100–120/min.


| Step | Action ID                           | Label                                                | Category           | AHA Rationale                                                                                                                                                                |
| ------ | ------------------------------------- | ------------------------------------------------------ | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | ✅`check_responsiveness`            | Check Responsiveness                                 | Assessment         | Confirming unresponsiveness in an infant (tap foot, call name) is the entry criterion for the infant BLS algorithm.                                                          |
| 2    | ✅`check_brachial_pulse`            | Check Brachial Pulse (≤10 sec)                      | Assessment         | The brachial artery (medial upper arm) is the AHA-preferred pulse check site for infants, as the carotid is difficult to palpate in short infant necks.                      |
| 3    | ✅`open_airway_head_tilt_chin_lift` | Open Airway — Head-Tilt Chin-Lift (Neutral)         | Airway             | For infants, the head-tilt is performed to a neutral "sniffing" position — hyperextension can collapse the compliant infant trachea and worsen obstruction.                 |
| 4    | ✅`cpr_30_2_infant_2finger`         | CPR 30:2 — Infant 2-Finger Technique                | CPR                | The 2-finger technique (two fingers on the lower half of the sternum, just below the nipple line) delivers appropriate 1.5-inch compression depth without chest wall trauma. |
| 5    | ✅`rescue_breathing_infant`         | Rescue Breathing — Infant (Mouth-to-Mouth-and-Nose) | Airway / Breathing | Covering both the infant's mouth and nose creates a seal; small puffs (1 breath every 3–5 seconds, visible chest rise) avoid gastric insufflation and lung injury.          |
| 6    | ✅`call_911`                        | Call 911 (After 2 min CPR — Lone Rescuer)           | System Activation  | AHA 2020: a lone rescuer performs 5 cycles (~2 min) of CPR before leaving an infant to call 911, prioritising oxygenation over EMS activation in hypoxic arrest.             |

---

#### Infant Cardiac Arrest — Two-Rescuer (`bls_infant_two_rescuer_cpr`)


| Field             | Value       |
| ------------------- | ------------- |
| **Difficulty**    | 🔴 Advanced |
| **Domain**        | Pediatric   |
| **Est. Duration** | 8 min       |
| **Protocol**      | BLS         |

> **Clinical Context:** 2-month-old male in asystole. Two-rescuer scenario using the 15:2 ratio and 2-thumb encircling technique, which generates superior compression force compared to the 2-finger technique.


| Step | Action ID                   | Label                                           | Category           | AHA Rationale                                                                                                                                                                    |
| ------ | ----------------------------- | ------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | ✅`check_responsiveness`    | Check Responsiveness                            | Assessment         | Initial responsiveness check triggers the infant cardiac arrest algorithm and role assignment between the two rescuers.                                                          |
| 2    | ✅`call_911`                | Call 911 (Second Rescuer Activates)             | System Activation  | With two rescuers, the second rescuer calls 911 immediately while the first begins CPR, eliminating the lone-rescuer 2-minute CPR-before-call delay.                             |
| 3    | ✅`check_brachial_pulse`    | Check Brachial Pulse (≤10 sec)                 | Assessment         | Brachial pulse check confirms pulseless cardiac arrest and initiates the 15:2 two-rescuer infant CPR sequence.                                                                   |
| 4    | ✅`cpr_15_2_infant_2thumb`  | CPR 15:2 — Infant 2-Thumb Encircling Technique | CPR                | The 2-thumb encircling technique allows the second rescuer to manage ventilation at a 15:2 ratio; it generates greater compression depth and force than the 2-finger method.     |
| 5    | ✅`bag_valve_mask_infant`   | Bag-Valve-Mask — Infant                        | Airway / Breathing | A properly sized neonatal/infant BVM with supplemental oxygen provides controlled tidal volumes (6–8 mL/kg), avoiding the barotrauma risk of unsupported rescue breaths.        |
| 6    | ✅`switch_compressor_roles` | Switch Compressor Roles                         | CPR                | Rotating the compressing rescuer every 2 minutes maintains compression depth above the 1.5-inch threshold as compressor fatigue accumulates rapidly in the encircling technique. |

---

### Choking (FBAO)

---

#### Infant Foreign Body Airway Obstruction (`bls_infant_choking`)


| Field             | Value       |
| ------------------- | ------------- |
| **Difficulty**    | 🟢 Beginner |
| **Domain**        | Pediatric   |
| **Est. Duration** | 5 min       |
| **Protocol**      | BLS         |

> **Clinical Context:** 8-month-old female with complete airway obstruction, SpO₂ 78% and falling at −4%/10 sec. ⚠️ **Abdominal thrusts (Heimlich) are absolutely contraindicated in infants** — use back slaps + chest thrusts only. Patient becomes unresponsive at 2.5 minutes without relief.


| Step | Action ID                     | Label                                          | Category          | AHA Rationale                                                                                                                                                                                                                       |
| ------ | ------------------------------- | ------------------------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | ✅`position_infant_face_down` | Position Infant Face-Down on Rescuer's Forearm | Positioning       | The face-down, head-lower-than-trunk position uses gravity to assist the expulsion of the foreign body during back slaps.                                                                                                           |
| 2    | ✅`back_slaps_infant_5`       | 5 Back Slaps — Infant (Interscapular)         | FBAO Relief       | Five firm interscapular blows with the heel of the hand generate an antegrade pressure wave that may dislodge the foreign body toward the mouth.                                                                                    |
| 3    | ✅`chest_thrusts_infant_5`    | 5 Chest Thrusts — Infant (Sternal)            | FBAO Relief       | After turning the infant supine, five chest thrusts (two fingers on the lower sternum) increase intrathoracic pressure; this replaces Heimlich thrusts, which are contraindicated in infants due to risk of abdominal organ injury. |
| 4    | ✅`call_911`                  | Call 911 / Activate Emergency Response         | System Activation | If back slap–chest thrust cycles fail to relieve the obstruction, EMS must be activated for advanced laryngoscopy and surgical airway intervention.                                                                                |

---

## Special Populations & Toxicological

### Opioid Overdose

---

#### Adult Resp. Arrest (Opioid Overdose) (`adult_respiratory_arrest_opioid`)


| Field             | Value           |
| ------------------- | ----------------- |
| **Difficulty**    | 🟡 Intermediate |
| **Domain**        | Respiratory     |
| **Est. Duration** | 10 min          |
| **Protocol**      | BLS             |

> **Clinical Context:** 34-year-old female with opioid-induced respiratory arrest (RR 0, SpO₂ 75%, HR 55, pulse present). The AHA 2020/2023 opioid algorithm prioritises naloxone and rescue breathing before CPR is needed. SpO₂ falls 2% every 10 seconds.


| Step | Action ID                      | Label                                  | Category           | AHA Rationale                                                                                                                                                                                                                    |
| ------ | -------------------------------- | ---------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | ✅`check_responsiveness`       | Check Responsiveness                   | Assessment         | Unresponsiveness with abnormal/absent breathing in a suspected opioid overdose initiates the 2020 AHA opioid emergency algorithm.                                                                                                |
| 2    | ✅`sternal_rub_stimulation`    | Sternal Rub / Pain Stimulation         | Assessment         | Noxious stimulation tests depth of CNS depression; a response may indicate partial opioid effect where less aggressive reversal is needed.                                                                                       |
| 3    | ✅`call_911`                   | Call 911 / Activate Emergency Response | System Activation  | Early EMS activation ensures IV naloxone, advanced airway, and monitoring are en route in case of full cardiac arrest.                                                                                                           |
| 4    | ✅`rescue_breathing`           | Rescue Breathing                       | Airway / Breathing | Rescue breathing corrects hypoxia before naloxone is available, as opioid-induced respiratory depression causes SpO₂ to fall rapidly; oxygenation is the immediate priority.                                                    |
| 5    | ✅`naloxone_intranasal_4mg`    | Naloxone Intranasal 4 mg               | Pharmacology       | 4 mg IN naloxone is the AHA 2023 updated dose for suspected opioid overdose; it competitively antagonises µ-opioid receptors, reversing respiratory depression within 2–5 minutes.                                             |
| 6    | ✅`naloxone_intranasal_repeat` | Repeat Naloxone Intranasal (2–4 min)  | Pharmacology       | Repeat dosing every 2–4 minutes is required for high-potency synthetic opioids (e.g., fentanyl) whose receptor affinity exceeds that of standard naloxone doses; repeated rescue breathing between doses maintains oxygenation. |

---

#### Opioid Overdose — Naloxone & Rescue Breathing (`bls_opioid_overdose_naloxone`)


| Field             | Value           |
| ------------------- | ----------------- |
| **Difficulty**    | 🟡 Intermediate |
| **Domain**        | Emergency       |
| **Est. Duration** | 10 min          |
| **Protocol**      | BLS             |

> **Clinical Context:** 31-year-old male, HR 48, RR 2, SpO₂ 72%, bradycardic — severe opioid CNS/respiratory depression. ⚠️ Cardiac arrest occurs at 5 minutes if untreated. Naloxone is still indicated even after cardiac arrest from opioids.


| Step | Action ID                   | Label                                  | Category           | AHA Rationale                                                                                                                                                                         |
| ------ | ----------------------------- | ---------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | ✅`check_responsiveness`    | Check Responsiveness                   | Assessment         | Establishing unresponsiveness and absent/inadequate breathing activates the opioid BLS algorithm and determines the urgency of naloxone administration.                               |
| 2    | ✅`sternal_rub_stimulation` | Sternal Rub / Pain Stimulation         | Assessment         | Testing CNS response depth guides the aggressiveness of reversal; partial responsiveness indicates ongoing opioid CNS effect amenable to naloxone.                                    |
| 3    | ✅`call_911`                | Call 911 / Activate Emergency Response | System Activation  | EMS activation enables IV/IO naloxone access and advanced airway management in case of imminent cardiac arrest.                                                                       |
| 4    | ✅`rescue_breathing`        | Rescue Breathing                       | Airway / Breathing | Rescue breathing is the bridge intervention correcting hypoxia while waiting for naloxone; sustained hypoxia below SpO₂ 55% is a failure condition leading to cardiac arrest.        |
| 5    | ✅`naloxone_intranasal_4mg` | Naloxone Intranasal 4 mg               | Pharmacology       | First-line naloxone dose per AHA 2023 update; 4 mg IN has been adopted over the previous 2 mg dose to address high-potency fentanyl analogues prevalent in the current opioid crisis. |
| 6    | ✅`naloxone_im_repeat`      | Repeat Naloxone IM 0.4 mg (q2–4 min)  | Pharmacology       | IM naloxone offers faster pharmacokinetics than repeat intranasal dosing when access to a syringe is available; repeat every 2–4 minutes until respiratory rate ≥12 breaths/min.    |
| 7    | ✅`recovery_position`       | Place in Recovery Position             | Positioning        | Once the patient resumes adequate spontaneous respirations (RR ≥12), the recovery position prevents aspiration of gastric contents during the post-naloxone arousal phase.           |

---

### Drowning / Submersion

---

#### Drowning — Submersion Rescue BLS (`bls_drowning_submersion`)


| Field             | Value           |
| ------------------- | ----------------- |
| **Difficulty**    | 🟡 Intermediate |
| **Domain**        | Emergency       |
| **Est. Duration** | 10 min          |
| **Protocol**      | BLS             |

> **Clinical Context:** 22-year-old female, submersion arrest, asystole on extrication. ⚠️ Drowning causes **hypoxic** cardiac arrest — the AHA recommends **5 initial rescue breaths before compressions** (deviation from standard adult BLS). Dry the chest before AED pad placement to ensure pad adhesion and shock delivery.


| Step | Action ID                           | Label                                        | Category           | AHA Rationale                                                                                                                                                                                              |
| ------ | ------------------------------------- | ---------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | ✅`remove_from_water`               | Remove Patient from Water                    | Scene Safety       | BLS cannot be performed effectively in water; extrication to a firm, flat surface is the prerequisite for all subsequent interventions.                                                                    |
| 2    | ✅`check_responsiveness`            | Check Responsiveness                         | Assessment         | Confirming unresponsiveness upon extrication initiates the drowning BLS algorithm and determines urgency of rescue breathing.                                                                              |
| 3    | ✅`call_911`                        | Call 911 / Activate Emergency Response       | System Activation  | EMS activation provides access to advanced airway management, ACLS drugs, and hypothermia management for prolonged submersion.                                                                             |
| 4    | ✅`open_airway_head_tilt_chin_lift` | Open Airway — Head-Tilt Chin-Lift           | Airway             | Airway positioning before rescue breaths is essential; do not attempt to drain water from the lungs — this wastes time and has no evidence of benefit.                                                    |
| 5    | ✅`initial_rescue_breaths_5`        | 5 Initial Rescue Breaths (Drowning Priority) | Airway / Breathing | AHA 2020 drowning modification: deliver 5 rescue breaths**before** starting compressions, as the hypoxic aetiology means oxygenation takes precedence over circulation.                                    |
| 6    | ✅`cpr_30_2`                        | CPR 30:2 — Adult                            | CPR                | Standard 30:2 adult compressions (2–2.4 in, 100–120/min) commence after initial rescue breaths to maintain perfusion pressure during the resuscitation.                                                  |
| 7    | ✅`rescue_breathing`                | Rescue Breathing (Ongoing)                   | Airway / Breathing | Continued rescue breathing at 1 breath every 5–6 seconds (10–12 breaths/min) sustains oxygenation between compression cycles in this primarily hypoxic arrest.                                           |
| 8    | ✅`dry_chest_before_aed`            | Dry Chest Before AED Pad Placement           | Defibrillation     | Water on the chest prevents adequate pad adhesion and creates a conductive path that may cause ineffective shock delivery or rescuer injury; drying the chest takes less than 10 seconds and is mandatory. |
| 9    | ✅`aed_attach`                      | Attach AED Pads and Defibrillate             | Defibrillation     | AED application follows airway and CPR prioritisation in drowning; defibrillation addresses any secondary shockable rhythm that may have developed from hypoxia-induced dysrhythmia.                       |

---

## Cross-cutting AHA BLS Standards

Quick-reference compression and ventilation standards per the 2020 AHA BLS Guidelines.


| Parameter                              | Adult (≥8 yr)          | Child (1–8 yr)                           | Infant (<1 yr)                  |
| ---------------------------------------- | ------------------------- | ------------------------------------------- | --------------------------------- |
| **Compression depth**                  | 2–2.4 inches (5–6 cm) | ~2 inches (~5 cm)                         | ~1.5 inches (~4 cm)             |
| **Compression rate**                   | 100–120 /min           | 100–120 /min                             | 100–120 /min                   |
| **Compression technique**              | 2 hands, heel           | 1–2 hands                                | 2 fingers or 2-thumb encircling |
| **Compression site**                   | Lower half of sternum   | Lower half of sternum                     | Just below the nipple line      |
| **Single-rescuer ratio**               | 30:2                    | 30:2                                      | 30:2                            |
| **Two-rescuer ratio**                  | 30:2                    | 15:2                                      | 15:2                            |
| **Rescue breath volume**               | ~600 mL (visible rise)  | Enough for visible rise                   | Small puff (~50 mL)             |
| **Ventilation rate (advanced airway)** | 1 breath/6 sec (10/min) | 1 breath/3–5 sec (12–20/min)            | 1 breath/3–5 sec (12–20/min)  |
| **Pulse check site**                   | Carotid                 | Carotid                                   | Brachial                        |
| **AED pads**                           | Standard adult          | Paediatric dose-attenuator (<8 yr/<25 kg) | Paediatric dose-attenuator      |
| **Allow full chest recoil**            | ✅ Yes                  | ✅ Yes                                    | ✅ Yes                          |
| **Minimise interruptions**             | ✅ <10 sec              | ✅ <10 sec                                | ✅ <10 sec                      |

---

## Key Protocol Differences

Specific points where adult, child, and infant protocols diverge from each other or from the ACLS algorithm.


| Protocol Point               | Adult                                                 | Child (1–8 yr)                                       | Infant (<1 yr)                                                                 |
| ------------------------------ | ------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Lone-rescuer 911 timing**  | Call 911 first, then CPR                              | Call 911 first, then CPR                              | 2 min CPR first, then call 911                                                 |
| **Two-rescuer C:V ratio**    | 30:2                                                  | **15:2**                                              | **15:2**                                                                       |
| **Pulse check site**         | Carotid artery                                        | Carotid artery                                        | **Brachial artery**                                                            |
| **Compression technique**    | Two-hand heel of hand                                 | One or two hands                                      | **2-finger** (single) or **2-thumb encircling** (two-rescuer)                  |
| **Airway position**          | Head-tilt chin-lift (full extension)                  | Head-tilt chin-lift (slight)                          | **Neutral / sniffing** (avoid hyperextension)                                  |
| **FBAO — conscious**        | 5 back blows + 5**abdominal thrusts**                 | 5 back blows + 5**abdominal thrusts**                 | 5 back slaps + 5**chest thrusts** (abdominal thrusts ⚠️ **contraindicated**) |
| **FBAO — unconscious**      | Lower to ground → CPR → look in mouth before breath | Lower to ground → CPR → look in mouth before breath | Begin infant CPR; look in mouth before each breath                             |
| **AED energy**               | Standard adult pads (150–360 J biphasic)             | Paediatric dose-attenuator (2–4 J/kg)                | Paediatric dose-attenuator (2–4 J/kg)                                         |
| **Drowning initial breaths** | 5 rescue breaths**before** compressions               | 5 rescue breaths before compressions                  | 5 rescue breaths before compressions                                           |
| **Rescue breath delivery**   | Mouth-to-mouth                                        | Mouth-to-mouth                                        | **Mouth-to-mouth-and-nose**                                                    |

---

## Naloxone Dosing Reference

Per the **2020 AHA BLS Guidelines** and **2023 AHA Opioid Emergency Update**.


| Route                                  | Dose                                                | Onset    | Repeat Interval                | Notes                                                                                                  |
| ---------------------------------------- | ----------------------------------------------------- | ---------- | -------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Intranasal (IN)**                    | **4 mg** (1 spray per nostril if 2 mg/spray device) | 3–5 min | Every 2–4 min                 | AHA 2023 updated dose (was 2 mg); preferred first-line route for lay rescuers and healthcare providers |
| **Intramuscular (IM)**                 | **0.4 mg** per injection                            | 3–5 min | Every 2–4 min                 | Preferred when syringe available; faster pharmacokinetics than repeat IN for high-potency opioids      |
| **Intravenous / Intraosseous (IV/IO)** | **0.4–2 mg** IV push                               | 1–2 min | Every 2–3 min (titrate)       | ACLS/ALS route; titrate to respiratory response to avoid precipitating acute withdrawal                |
| **Auto-injector (IM)**                 | **2 mg** (per device)                               | 3–5 min | One repeat dose if no response | E.g., Evzio; lay-rescuer friendly; follow audio/visual device instructions                             |

> ⚠️ **Key clinical points:**
>
> - Continue rescue breathing **between** all naloxone doses — naloxone onset is 3–5 minutes regardless of route.
> - Naloxone half-life (30–90 min) is shorter than most opioids; re-sedation may occur — place the patient in the **recovery position** once conscious and **do not leave them unattended**.
> - For ultra-high-potency opioids (carfentanil, nitazenes), **multiple repeat doses** may be required — follow EMS/medical direction on maximum dose.
> - Naloxone is **not contraindicated** in cardiac arrest from suspected opioid overdose — administer alongside CPR.

---

*Document generated from simulation data: [`src/data/seedScenarios.ts`](../src/data/seedScenarios.ts)*
*AHA References: 2020 American Heart Association Guidelines for CPR and Emergency Cardiovascular Care; 2023 AHA Science Advisory on Opioid-Associated Emergency Response.*
*Last updated: 2026-03-10*
