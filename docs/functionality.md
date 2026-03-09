# SimNurse Functionality Report

SimNurse is a scenario-based nursing simulator. The learner picks a case, observes a deteriorating or unstable patient, performs interventions, and receives a debrief based on what actually happened during that run.

## Learner Experience

### 1. Scenario Selection

The library screen loads seeded scenarios from the local Dexie database. Each selection starts a fresh simulation run with a new session id so historical logs are not mixed together.

### 2. Live Patient Assessment

The patient tab presents the bedside view:

- current rhythm and visible cues
- narrative clinical notes derived from the live patient state
- active intervention badges
- a manual end button for stopping the scenario

The simulation is time-based. Vitals and rhythm can worsen or improve over time, and some scenarios include scheduled transitions such as deterioration into a pulseless arrest.

### 3. Actions and Protocol Review

The actions tab exposes a searchable catalog of interventions. Selecting an action opens a procedure guide before the action is applied. The engine then decides whether the intervention:

- is accepted and modifies the patient state
- is rejected because it is out of sequence or clinically inappropriate

Rejected actions are logged and surfaced again in the debrief for review.

### 4. Monitor and Vital Discovery

The status tab acts like a simplified bedside monitor. The learner can unlock the major vitals currently exposed by the UI:

- heart rate
- SpO2
- blood pressure
- respiratory rate

The ECG and vital cards reflect the live engine state, including pulseless states and intervention-driven changes.

### 5. Debrief

When the engine reaches a success or failure condition, or when the learner ends the case manually, SimNurse shows a debrief. The debrief is built from the typed session log stored for that run and includes:

- scored intervention timeline
- accepted versus rejected actions
- manual-end versus completed-case distinction
- clinical conclusion summary

## Clinical Simulation Rules

The runtime model supports:

- explicit pulse presence via `pulsePresent`
- numeric thresholds and ranges
- equality checks for string and boolean state
- elapsed-time triggers
- hold-duration conditions
- timed non-numeric state changes through scheduled scenario events

That model allows cases such as STEMI deterioration, VFib-to-asystole progression, and pulseless electrical activity to behave explicitly instead of relying on fragile rhythm-only assumptions.

## Persistence and Reset Behavior

- Scenario definitions are seeded locally from app code.
- Session logs are stored locally in IndexedDB through Dexie.
- Restarting a scenario creates a new run instead of clearing all history.
- Schema upgrades may reseed scenarios and clear incompatible local logs.

## Current Boundaries

- The app is local-first and browser-only.
- There is no account system, network sync, or backend API.
- The SQL file under `db/` is legacy documentation and is not used by the running app.
