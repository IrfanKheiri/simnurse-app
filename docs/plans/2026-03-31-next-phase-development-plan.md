# Next Phase Development Plan

**Date:** 2026-03-31

**Status updated:** 2026-04-01

## 1. Executive summary

This document remains the handoff point for the route-aware protocol work, but it now reflects the additional hardening and follow-on migrations that landed after the initial 2026-03-31 revision.

The codebase no longer sits at the “foundation only” stage. Since the earlier revision, it now also has:

- explicit non-primary route activation intent in the scenario contract and runtime enforcement
- structured intervention-event attempt/result metadata instead of the earlier mixed timing shape
- formal machine-readable rejection categories emitted by the engine and consumed by app/debrief logic
- route-aware cheat/instructor guidance instead of a purely flat-sequence overlay
- two additional controlled route-aware scenario migrations: `adult_pea_hypoxia` and `anaphylactic_shock`

The migration program should now be described as **paused after exhausting the current safe-fit set**. The supported model has already been applied to the lower-risk pilots, the later safe/higher-risk batch that still fit current semantics, and the current baseline hardening. The remaining unmigrated scenarios sit beyond the clean-fit boundary and are being deferred until there is time for deeper model analysis rather than more opportunistic migration.

The next phase should still **not** be described as unrestricted migration scale-up. The baseline is materially stronger, but a few boundaries remain important:

- `expected_sequence` is still a strong authoring and validation contract, not just a fading compatibility field.
- route activation is still limited to `after_intervention` and `after_state_change`, with current supported activation behaving as OR logic.
- “state-aware” filtering is still rhythm-aware narrowing, not a general patient-state rules engine.
- route-aware guidance is now present in the instructor/cheat surface, but richer route visualization is still deferred.

The most sensible next phase is therefore:

1. **treat the hardened contracts as the new baseline**
2. **continue controlled route-aware migration only where current activation/applicability limits fit cleanly**
3. **expand the model further only when a concrete scenario need justifies it**

That sequence preserves the value of the new infrastructure without pretending the current model is already a fully general branching engine.

## 2. Concise summary of what is now implemented in the current baseline

The current baseline now includes the following major outcomes:

- strict completion-policy support was added
- strict debrief scoring and wording alignment was added
- stale scenario-seed validation was corrected
- route-based protocol infrastructure was added
- a rescue pilot for `pregnant_vfib_arrest` was added
- a true optional-branch pilot for `adult_unstable_bradycardia` was added
- branch-aware debrief and intervention-event metadata was added
- `adult_vtach_pulse` was migrated as an optional-branch pilot
- runtime metadata for narrowing expected-action guidance was added
- `adult_svt` was migrated as an optional post-adenosine branch pilot
- explicit non-primary route activation hardening was added
- structured intervention-event attempt/result metadata was added
- formal machine-readable rejection categorization was added and consumed by runtime/debrief surfaces
- route-aware cheat/instructor guidance was added
- `adult_pea_hypoxia` was migrated as a controlled route-aware scenario
- `anaphylactic_shock` was migrated as a controlled route-aware scenario
- broader targeted regressions are green across engine, app, seed, debrief, scoring, and cheat-overlay coverage

In practical terms, the migrated baseline now spans:

- contract/runtime hardening in [`src/types/scenario.ts`](src/types/scenario.ts), [`src/hooks/useScenarioEngine.ts`](src/hooks/useScenarioEngine.ts), [`src/lib/debriefFeedback.ts`](src/lib/debriefFeedback.ts), [`src/App.tsx`](src/App.tsx), and [`src/components/CheatOverlay.tsx`](src/components/CheatOverlay.tsx)
- route-aware migrations already landed in [`src/data/seedScenarios.ts`](src/data/seedScenarios.ts), including the prior pilots (`pregnant_vfib_arrest`, `adult_unstable_bradycardia`, `adult_vtach_pulse`, `adult_svt`) and the later controlled migrations (`adult_pea_hypovolemia`, `adult_pea_hypoxia`, `anaphylactic_shock`)

The safe migration set that cleanly fits the current activation/applicability model should now be treated as exhausted.

### Current paused migration boundary

The remaining unmigrated scenarios begin after [`pediatric_respiratory_arrest_asthma`](src/data/seedScenarios.ts) in [`src/data/seedScenarios.ts`](src/data/seedScenarios.ts). The currently pending set is:

- `pediatric_pulseless_vfib`
- `bls_adult_cardiac_arrest_bystander`
- `bls_adult_two_rescuer_cpr`
- `bls_adult_aed_public_access`
- `bls_child_cardiac_arrest`
- `bls_child_two_rescuer_cpr`
- `bls_infant_cardiac_arrest`
- `bls_infant_two_rescuer_cpr`
- `bls_adult_choking_responsive`
- `bls_adult_choking_unresponsive`
- `bls_infant_choking`
- `bls_opioid_overdose_naloxone`
- `bls_drowning_submersion`

These scenarios are intentionally paused, not merely unstarted. The working assumption is that they are more likely to expose gaps around richer branch modeling, BLS-specific protocol structure, applicability semantics, or teaching-spine expectations than the already-migrated safe set. They should therefore wait for deeper model analysis rather than being migrated under the current “one more safe scenario” mindset.

## 3. Current architecture and authoritative contracts

### Runtime model

The core scenario engine now normalizes protocol flow into runtime route state instead of assuming one flat required sequence.

- legacy scenarios still normalize from `expected_sequence`
- route-aware scenarios can define a primary route plus secondary branch and rescue routes
- non-primary routes now require explicit activation intent rather than silently auto-activating on omission
- runtime progress now tracks:
  - active route
  - activated routes
  - completed routes
  - completed required steps
  - current required-step total
  - currently available next interventions across activated routes

This is enough to support multiple valid next steps, locked rescue actions, runtime required-step totals, and branch-aware debrief support.

### Activation and event contracts

Two of the earlier plan's highest-risk ambiguities are now resolved at the contract level.

- non-primary route activation is now explicit in authored content and enforced by the runtime/type contract
- intervention events now distinguish attempt-context metadata from result metadata instead of relying on one mixed timing bucket
- rejected actions emit attempt-context data plus a machine-readable rejection category
- accepted actions can additionally emit structured result fields such as route advancement and required-step deltas

That does not make the model fully general, but it does remove the earlier ambiguity around silent route activation and mixed event timing.

### Completion behavior

Completion policy is now modeled through scenario metadata, with legacy outcome-driven behavior still acting as the implicit default when metadata omits `completionPolicy`.

- `strict_sequence_required` means success conditions cannot finish the scenario until all currently required protocol work is complete.
- `legacy_outcome_driven` preserves older stabilization-first behavior, even when optional follow-up steps remain available.

Several current pilots still rely on that implicit legacy default, so the next phase should avoid describing completion-policy intent as fully explicit in authored content until those scenarios are annotated deliberately.

That distinction is already important for the current route pilots and should remain explicit.

### Debrief behavior

Debrief logic is no longer purely a replay of `expected_sequence`.

- structured attempt/result intervention-event metadata can inform expected-action feedback
- multi-valid next states intentionally avoid inventing a fake single expected action
- strict debrief scoring uses runtime required-step totals when strict policy applies
- optional unchosen branches remain neutral unless they were required on activation
- machine-readable rejection categories are now consumed directly instead of forcing app/debrief logic to infer meaning from text alone

### Guidance surfaces

Instructor-facing cheat guidance is no longer purely a legacy flat-sequence consumer.

- route-aware guidance is wired through the app into `CheatOverlay`
- current route-aware pilots can surface narrower next-step guidance based on runtime route context
- this reduces one of the earlier migration blockers, although richer route-history/instructor visualization is still deferred

### Authoring contract reality

The most important correction to the earlier plan is that `expected_sequence` is **still an active authoring contract**.

Today it remains all of the following:

- the runtime source for non-route scenarios
- the canonical authored teaching spine in seeded content
- the fallback debrief replay source when structured metadata is absent
- a directly validated contract in seed tests

The current codebase and tests therefore do **not** support treating `expected_sequence` as disposable legacy residue. Any future attempt to demote or replace it must be a deliberate migration with new types, new validation, and new UI/debrief consumers.

## 4. Current limitations that the next phase must address explicitly

### 4.1 `expected_sequence` is still a first-class contract

Current reality:

- seeded scenario authoring still treats `expected_sequence` ordering as canonical source-of-truth guidance
- seed validation still asserts its direct presence and ordering semantics
- app/debrief fallback logic still replays it when richer metadata is unavailable

Implication:

The next phase must preserve and document `expected_sequence` as a required authored teaching spine for now. The plan should not imply that route-aware protocol metadata has already replaced it.

### 4.2 Route activation is intentionally narrow today

Current reality:

- non-primary routes now require explicit activation intent
- supported activation triggers are still limited to `after_intervention` and `after_state_change`
- activation currently behaves as OR logic across those trigger sets
- there is no combined AND condition, predicate composition, or richer patient-state activation model

Implication:

The route system is usable for current pilots, but it is not yet expressive enough to be described as a general conditional-protocol engine.

### 4.3 “State-aware” filtering is currently rhythm-only

Current reality:

- physiological filtering currently checks `requires_rhythm`
- the implementation is not a broader patient-state rule engine
- other vitals, elapsed time, and composite patient-state constraints are not part of the authoring model for intervention applicability

Implication:

The plan must stop short of describing the current system as general state-aware intervention reasoning. It is better described as **protocol-valid next steps optionally narrowed by rhythm compatibility**.

### 4.4 Rejection categorization is formalized, but precedence still matters

Current reality:

- the runtime now emits machine-readable rejection categories instead of relying on free-text interpretation alone
- app and debrief consumers read those categories directly
- rescue-lock rejection is still checked before ordinary sequence validation
- sequence validation still runs before physiological appropriateness checks
- duplicate and already-active checks still happen later

Implication:

A case that matches multiple failure conditions can still resolve to the category chosen by reducer precedence. That remaining subtlety is narrower than before, because downstream consumers no longer have to reverse-engineer the result from text, but overlap cases should still be treated as explicit tested behavior.

### 4.5 Guidance surfaces are improved but not yet full route visualizers

Current reality:

- `CheatOverlay` is now route-aware and can surface route-informed next-step guidance
- app wiring now passes structured route/debrief context into the instructor-facing guidance surface
- the overlay is still a focused teaching aid rather than a comprehensive route debugger or branch-history visualizer

Implication:

Broader migration is less risky than before because the cheat surface is no longer flat-sequence only, but complex instructor visualization and richer route-history surfacing remain deferred work.

### 4.6 User-facing sequence hint text still uses a rough local formatter

Current reality:

- reducer-generated sequence-deviation text uses a local `formatInterventionLabel` helper
- that helper is rougher than the shared intervention label system already used elsewhere

Implication:

Even when the logic is correct, sequence-hint wording can be less polished and less consistent than the rest of the product.

## 5. Recommended next phase: preserve baseline and move to analysis-first planning

The next phase should no longer be framed as immediate additional migration. The safe migration set has been consumed, so the next phase should be split into three tiers that start with analysis and documentation rather than more implementation.

### Stage A — stabilize and document the completed migration boundary

This stage should treat the recently completed hardening and safe-fit migrations as complete baseline work, not as unfinished infrastructure.

1. **Preserve `expected_sequence` accurately.**
   - Continue describing it as the authored teaching spine and fallback debrief source.
   - Keep seeded scenarios explicitly defining it unless and until a replacement contract exists.

2. **Record that the safe migration set is exhausted.**
   - Do not keep promising another “safe next target” until analysis proves one actually exists.
   - Treat the scenarios after [`pediatric_respiratory_arrest_asthma`](src/data/seedScenarios.ts) as the current paused boundary.

3. **Protect the hardened baseline with targeted regression coverage.**
   - Keep explicit non-primary activation enforcement covered.
   - Keep attempt/result metadata assertions covered for both accepted and rejected actions.
   - Keep machine-readable rejection-category consumption covered in app/debrief paths.
   - Keep route-aware cheat guidance covered on current route pilots.

4. **Keep terminology accurate.**
   - Use “rhythm-aware narrowing” or “rhythm-based applicability filtering” when describing current behavior.
   - Avoid wording that implies a general patient-state rules engine already exists.

5. **Polish remaining UX consistency gaps opportunistically.**
   - Continue tracking the local sequence-hint formatter as lower-risk cleanup.
   - Keep richer instructor visualization as explicitly deferred rather than implying it already exists.

### Stage B — perform deeper model analysis against the paused scenarios

This is where the model should grow, but only after examining the paused scenarios directly and identifying which requirements genuinely exceed the current contract.

1. **Expand the activation model deliberately.**
   - Introduce explicit composition semantics such as `any` versus `all`, or equivalent predicate grouping.
   - Add room for richer activation predicates only if real scenario demand justifies the complexity.
   - Do not add generalized expressiveness speculatively.

2. **Formalize applicability beyond rhythm only, if needed.**
   - Add an explicit intervention-applicability contract rather than stretching `requires_rhythm` conceptually.
   - Reuse existing condition concepts where possible so authoring stays coherent.
   - Keep this scoped to real scenario needs; it should not become an unbounded rules engine unless the product truly needs one.

3. **Refine rejection precedence only if overlap cases become clinically important.**
   - The category model now exists; any further work should focus on precedence policy, not text parsing.
   - Evaluate whether overlap cases need a more clinically specific selection rule.
   - Expand only if current deterministic precedence proves insufficient in real scenarios.

4. **Use the shared label system for runtime hints.**
   - Replace the local intervention-name formatter with the shared display-label helper so sequence guidance matches the rest of the UI.

5. **Audit the paused scenario set before any new migration resumes.**
   - Review `pediatric_pulseless_vfib` plus the BLS/choking/opioid/drowning scenarios that follow it in [`src/data/seedScenarios.ts`](src/data/seedScenarios.ts).
   - Classify whether each one fits the current route model, needs richer applicability/activation semantics, or should remain legacy-authored.
   - Resume implementation only after that analysis produces an explicit decision and a narrower target list.

### Stage C — optional deferred work after hardening

These are useful but should stay explicitly deferred until controlled expansion shows they are worth the added complexity.

- expose richer route/debrief visualization for instructors
- migrate additional scenarios beyond the current pilots at scale
- consider whether `expected_sequence` should ever be replaced with a more precise authored teaching-spine field

That last item is intentionally deferred. Replacing `expected_sequence` is a broader contract migration, not a cleanup chore.

## 6. Exact recommended next step

The first task of the next session should now be **analysis of the paused higher-complexity scenarios rather than implementation of another migration**.

The safest order is:

1. audit the pending scenarios after [`pediatric_respiratory_arrest_asthma`](src/data/seedScenarios.ts) and document what blocks or complicates migration for each one
2. group those scenarios into “fits current model,” “needs richer semantics,” and “should remain legacy for now”
3. decide whether any single scenario is still a genuinely safe next migration target
4. only if that analysis identifies a clean target, reopen implementation with explicit scope and regression expectations

The new recommended target is therefore:

- **preferred next target:** a short analysis/design note covering the pending scenarios and the model gaps they imply
- **fallback implementation target:** no further scenario migration until analysis identifies a clean-fit candidate

## 7. Key constraints and backward-compatibility implications

1. **Do not break legacy scenarios.**
   - scenarios without `protocol` must continue to normalize from `expected_sequence`

2. **Do not demote `expected_sequence` prematurely.**
   - it is still a seeded authoring contract, fallback debrief input, and validated teaching spine

3. **Do not claim unsupported activation semantics.**
   - the current engine does not support AND-combined triggers, arbitrary predicates, or general state-driven route activation

4. **Do not describe rhythm filtering as a general state engine.**
   - current narrowing is primarily rhythm compatibility, not full patient-state reasoning

5. **Optional branches must remain scoring-neutral unless required on activation.**
   - unchosen optional work must not become omission debt

6. **Legacy completion behavior for current pilots remains intentional.**
   - `pregnant_vfib_arrest`, `adult_unstable_bradycardia`, `adult_vtach_pulse`, and `adult_svt` should stay legacy outcome-driven unless there is an explicit product decision to change them

7. **Metadata consumers must continue using the structured attempt/result contract correctly.**
   - attempt-context and result-context fields should be read intentionally, especially for rejected actions that do not have acceptance-result data

8. **Instructor guidance surfaces are compatibility surfaces even after becoming route-aware.**
   - route-aware runtime behavior still needs explicit UI validation on cheat/help surfaces

## 8. Relevant files and responsibilities

### Core types and authoring contracts

- `src/types/scenario.ts`
  - scenario schema
  - completion policy enum
  - route protocol types
   - explicit non-primary activation contract
   - intervention-event attempt/result metadata contract
   - rejection-category contract

### Scenario authoring source of truth

- `src/data/seedScenarios.ts`
  - seeded scenario definitions
  - canonical `expected_sequence` teaching spines
   - current route pilots and completion-policy intent
   - controlled migrations including `adult_pea_hypoxia` and `anaphylactic_shock`

- `src/data/seedScenarios.test.ts`
  - authoring validation
  - sequence-order assertions
   - explicit activation expectations for non-primary routes
   - pilot-specific route-structure expectations

### Runtime engine

- `src/hooks/useScenarioEngine.ts`
  - protocol normalization
   - explicit non-primary activation enforcement
  - route activation and progression
  - rescue locking
   - rejection-category emission
  - rhythm-based applicability filtering
   - intervention-event attempt/result assembly
  - completion policy enforcement

- `src/hooks/useScenarioEngine.test.ts`
  - activation behavior
  - runtime required-step totals
   - explicit activation hardening coverage
   - route metadata emission
   - attempt/result metadata coverage
   - rejection-category and precedence coverage

### App integration and debrief assembly

- `src/App.tsx`
  - session-log interpretation
  - structured-metadata precedence for expected-action feedback
   - route-aware cheat/instructor guidance wiring
   - rejection-category consumption
  - fallback replay from `expected_sequence`

- `src/App.test.ts`
  - expected-action guidance precedence
   - route-aware guidance behavior
   - rejection-category consumption behavior
  - structured-versus-legacy fallback behavior

### Debrief and scoring logic

- `src/lib/debriefScoring.ts`
  - strict-versus-legacy omission logic
  - clinical conclusion wording

- `src/lib/debriefFeedback.ts`
   - rejected-action categorization behavior
   - machine-readable rejection-category consumption
  - expected-action support gating

### Shared intervention labels and guidance surfaces

- `src/lib/interventionLabels.ts`
  - shared display labels that should become the source for runtime hint text

- `src/components/CheatOverlay.tsx`
  - route-aware cheat/instructor guidance UI
  - current next-step guidance surface for route-aware scenarios

- `src/components/CheatOverlay.test.tsx`
  - route-aware cheat guidance regression coverage

## 9. Validation requirements for the next phase

Validation should now preserve the hardened baseline and then verify any controlled expansion against it.

### A. Authoring and source-of-truth validation

In `src/data/seedScenarios.test.ts`, validate at minimum:

- every seeded scenario that is expected to participate in legacy fallback still defines `expected_sequence`
- route-aware pilots preserve the intended teaching spine ordering
- non-primary route activation intent remains explicit for authored non-primary routes
- route-required versus optional semantics remain correct
- completion-policy expectations remain explicit for the existing pilots
- recently migrated route-aware scenarios such as `adult_pea_hypoxia` and `anaphylactic_shock` preserve their intended protocol structure

### B. Engine behavior validation

In `src/hooks/useScenarioEngine.test.ts`, validate at minimum:

- current OR-style activation behavior for supported trigger types
- route activation timing and required-step-total changes
- rescue locking before activation
- explicit enforcement when non-primary activation intent is missing or invalid
- overlap cases where sequencing and physiologic appropriateness could both apply
- intervention-event attempt-context versus result-context semantics
- machine-readable rejection-category emission for rejected actions and overlap cases

### C. App and debrief validation

In `src/App.test.ts`, `src/lib/debriefFeedback.test.ts`, and `src/lib/debriefScoring.test.ts`, validate at minimum:

- structured metadata remains the first debrief source when it is present and unambiguous
- multi-valid next states still do not collapse into a fake single expected action
- legacy fallback from `expected_sequence` still works when structured metadata is absent
- strict omission scoring still uses runtime required-step totals
- rejected actions do not rely on acceptance-result metadata that is absent by design
- app/debrief consumers use machine-readable rejection categories rather than free-text reverse engineering

### D. UI and wording regression validation

Before broad migration continues, explicitly review:

- `CheatOverlay` behavior on route-aware pilots
- `CheatOverlay` behavior on `adult_pea_hypoxia` and `anaphylactic_shock`
- sequence-deviation wording quality and label consistency
- any other helper or teaching surface that still assumes one flat next-step answer

## 10. Revised acceptance criteria for the next phase

The next phase should be considered complete only if the hardened baseline is preserved and the next controlled expansion stays within it.

### Mandatory baseline-preservation criteria

1. the plan, docs, and tests no longer imply that `expected_sequence` is merely legacy residue
2. current activation limits are documented accurately and covered by tests
3. explicit non-primary activation intent remains part of the documented and tested authoring contract
4. intervention events use the structured attempt/result contract and consumers read it correctly
5. machine-readable rejection categories are emitted and consumed across engine/app/debrief flows
6. current “state-aware” wording is corrected so it does not overclaim beyond rhythm-based filtering
7. route-aware cheat/instructor guidance remains covered for current route-aware scenarios, while richer visualization stays explicitly deferred unless implemented
8. no legacy non-route scenario regresses
9. broader targeted regressions remain green across seed, engine, app, debrief, scoring, and cheat-overlay coverage

### Optional expansion criteria

If one additional scenario is migrated in the same phase, it should count as complete only if all of the following are also true:

1. the scenario genuinely needs branching or rescue logic that flat sequencing models poorly
2. the scenario does not require unsupported activation semantics
3. the migration preserves intended completion-policy behavior
4. seed, engine, app, and debrief tests cover the new authoring pattern end to end
5. cheat-overlay guidance remains accurate for the new scenario under route-aware flow

Broad migration beyond that should wait until the hardening criteria are already satisfied.

## 11. How to start the next session

1. Read these files first in this order:
   - `src/types/scenario.ts`
   - `src/hooks/useScenarioEngine.ts`
   - `src/App.tsx`
   - `src/lib/debriefScoring.ts`
   - `src/lib/debriefFeedback.ts`
   - `src/lib/interventionLabels.ts`
   - `src/data/seedScenarios.ts`

2. Then inspect these tests:
   - `src/hooks/useScenarioEngine.test.ts`
   - `src/data/seedScenarios.test.ts`
   - `src/App.test.ts`
   - `src/lib/debriefScoring.test.ts`
   - `src/lib/debriefFeedback.test.ts`
   - `src/components/CheatOverlay.test.tsx`

3. Implement one controlled next-step slice first:
   - one additional route-aware scenario migration that fits current supported activation semantics, or
   - if that proves impossible, a narrowly scoped activation-model expansion justified by the scenario need

4. Re-run the test surfaces that protect authoring, engine behavior, and debrief metadata.

5. Re-check instructor teaching surfaces, especially `src/components/CheatOverlay.tsx`, before treating any new route migration as fully surfaced in the product.
