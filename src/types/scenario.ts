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

export interface ScenarioMeta {
  difficulty: ScenarioDifficulty;
  domain: ScenarioDomain;
  estimatedDurationSec: number;
}

export interface Scenario {
  scenario_id: string;
  title: string;
  patient?: PatientDemographics;
  meta?: ScenarioMeta;
  initial_state: PatientState;
  baseline_progressions: BaselineProgression[];
  scheduledStateChanges?: ScheduledStateChange[];
  interventions: Record<string, InterventionDefinition>;
  expected_sequence?: string[];
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
