export type AdjustableVital = 'hr' | 'bp' | 'spo2' | 'rr' | 'temp' | 'etco2' | 'glucose';
export type PatientField = AdjustableVital | 'rhythm' | 'pulsePresent';

export interface ActiveIntervention {
  id: string;
  start_time: number;
  duration_sec?: number;
}

export type HeartRhythm =
  | 'Sinus'
  | 'VFib'
  | 'VTach'
  | 'Asystole'
  | 'PEA'
  | 'SVT'
  | 'Bradycardia';

export interface PatientState {
  hr: number;
  bp: string;
  spo2: number;
  rhythm: HeartRhythm;
  rr: number;
  pulsePresent: boolean;
  temp?: number;
  etco2?: number;
  glucose?: number;
}

export interface BaselineProgression {
  vital: AdjustableVital;
  modifier: number;
  interval_sec: number;
  decay_type?: 'linear' | 'exponential';
}

export interface RateModifier {
  vital: AdjustableVital;
  modifier: number;
  interval_sec: number;
  decay_type?: 'linear' | 'exponential';
}

export interface InterventionDefinition {
  duration_sec?: number;
  priority?: number;
  rate_modifiers?: RateModifier[];
  state_overrides?: Partial<PatientState>;
  requires_rhythm?: HeartRhythm[];
  success_chance?: number;
  success_state?: Partial<PatientState>;
  /** Clinical justification for why this intervention is performed at this step.
   *  1–2 sentences citing AHA guidelines. Shown in Post-Scenario Debrief. */
  rationale?: string;
}

export interface ScheduledStateChange {
  id: string;
  atSec: number;
  changes: Partial<PatientState>;
  message: string;
}

export interface Condition {
  vital?: PatientField;
  equals?: string | number | boolean;
  min?: number;
  max?: number;
  elapsedSecGte?: number;
  durationSec?: number;
}

export interface PatientDemographics {
  name: string;
  age: string;  // e.g. "45yo" or "8yo"
  gender: string; // e.g. "M", "F"
}

export type ScenarioDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';
export type ScenarioDomain = 'Cardiac' | 'Respiratory' | 'Neurological' | 'Obstetric' | 'Pediatric' | 'Emergency';
export type ScenarioCompletionPolicy = 'legacy_outcome_driven' | 'strict_sequence_required';

export type ScenarioProtocolRouteKind = 'primary' | 'branch' | 'rescue';

export interface ScenarioProtocolStep {
  intervention_id: string;
  required?: boolean;
}

export interface ScenarioProtocolRouteActivation {
  after_intervention?: string | string[];
  after_state_change?: string | string[];
}

export interface ScenarioProtocolPrimaryRoute {
  route_id?: string;
  label?: string;
  steps: Array<string | ScenarioProtocolStep>;
}

export interface ScenarioProtocolSecondaryRoute {
  route_id: string;
  label?: string;
  steps: Array<string | ScenarioProtocolStep>;
  activation?: ScenarioProtocolRouteActivation;
  required?: boolean;
}

export interface ScenarioProtocol {
  primary: ScenarioProtocolPrimaryRoute;
  branches?: ScenarioProtocolSecondaryRoute[];
  rescues?: ScenarioProtocolSecondaryRoute[];
}

export interface ScenarioMeta {
  difficulty: ScenarioDifficulty;
  domain: ScenarioDomain;
  estimatedDurationSec: number;
  protocol: 'BLS' | 'ACLS' | 'PALS';
  completionPolicy?: ScenarioCompletionPolicy;
}

export interface Scenario {
  scenario_id: string;
  title: string;
  patient?: PatientDemographics;
  meta?: ScenarioMeta;
  /** P3-A (ISSUE-08): Scenario-specific post-stabilization narrative shown in EvaluationSummary */
  conclusion?: string;
  initial_state: PatientState;
  baseline_progressions: BaselineProgression[];
  scheduledStateChanges?: ScheduledStateChange[];
  interventions: Record<string, InterventionDefinition>;
  expected_sequence?: string[];
  protocol?: ScenarioProtocol;
  success_conditions: Condition[];
  failure_conditions: Condition[];
}

export interface StartEvent {
  type: 'start';
  message: string;
  snapshot: PatientState;
}

export interface InterventionEvent {
  type: 'intervention';
  intervention_id: string;
  message: string;
  rejected: boolean;
  available_intervention_ids?: string[];
  state_aware_available_intervention_ids?: string[];
  active_route_id?: string | null;
  activated_route_ids?: string[];
  advanced_route_id?: string | null;
  required_step_delta?: number;
}

export interface StateChangeEvent {
  type: 'state_change';
  message: string;
  changes: Partial<PatientState>;
}

export interface CompletionEvent {
  type: 'completion';
  message: string;
  outcome: 'success' | 'failed';
}

export interface ManualEndEvent {
  type: 'manual_end';
  message: string;
}

export type EngineEvent = StartEvent | InterventionEvent | StateChangeEvent | CompletionEvent;
export type SessionEvent = EngineEvent | ManualEndEvent;

interface SessionLogBase {
  id?: number;
  session_id: string;
  scenario_id: string;
  timestamp: number;
  sim_time_sec: number;
}

export type SessionLogEvent =
  | (SessionLogBase & { event_type: 'start'; details: Omit<StartEvent, 'type'> })
  | (SessionLogBase & { event_type: 'intervention'; details: Omit<InterventionEvent, 'type'> })
  | (SessionLogBase & { event_type: 'state_change'; details: Omit<StateChangeEvent, 'type'> })
  | (SessionLogBase & { event_type: 'completion'; details: Omit<CompletionEvent, 'type'> })
  | (SessionLogBase & { event_type: 'manual_end'; details: Omit<ManualEndEvent, 'type'> });
