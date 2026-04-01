# Next Phase Development Plan

**Date:** 2026-03-31

## 1. Executive summary

This document is the handoff point after a session that finished the major protocol and debrief branching groundwork. The codebase now supports two distinct but interoperable authoring models:

- legacy `expected_sequence` scenarios that still work without route metadata
- route-based scenarios with explicit primary, branch, and rescue paths

The runtime, debrief pipeline, and tests were extended so branch-aware sequencing can coexist with legacy completion behavior where appropriate. The most sensible next phase is no longer more core route plumbing. The next focus should be controlled expansion and hardening: migrate the next set of medically appropriate scenarios onto route-based authoring, validate that the authoring patterns hold up across more edge cases, and tighten the last legacy UI and authoring assumptions that still read only `expected_sequence`.

## 2. Concise summary of what was implemented in this session

This session completed the following major outcomes:

- Phase 1: strict completion-policy support added.
- Phase 1.5: strict debrief scoring and wording alignment added.
- stale validation issue in `src/data/seedScenarios.test.ts` fixed.
- Phase 2A: route-based protocol infrastructure added.
- Phase 2B: rescue pilot for `pregnant_vfib_arrest` added.
- Phase 2C: true-branch pilot for `adult_unstable_bradycardia` added.
- branch-aware debrief and event metadata added.
- `adult_vtach_pulse` migrated as an optional-branch pilot.
- state-aware expected-action guidance metadata added.
- `adult_svt` migrated as an optional post-adenosine branch.

## 3. Current architecture and status after this session

### Runtime model

The core scenario engine in `src/hooks/useScenarioEngine.ts` now treats scenario protocol flow as a normalized runtime structure rather than assuming a single flat sequence.

- Legacy scenarios still normalize into a primary route derived from `expected_sequence`.
- New route-aware scenarios can define:
  - a primary route
  - optional or required branches
  - rescue routes activated by intervention or scheduled state change triggers
- Runtime progress now tracks:
  - active route
  - activated routes
  - completed routes
  - completed required steps
  - total currently required steps
  - available next interventions across activated routes

This means the engine can distinguish between:

- a truly wrong next action
- a locked rescue action
- a physiologically invalid action
- multiple valid next actions that are simultaneously acceptable

### Completion behavior

Completion policy is now explicit in scenario metadata via `completionPolicy`.

- `strict_sequence_required` means success conditions cannot complete the case until all currently required steps are done.
- `legacy_outcome_driven` preserves historical behavior where physiological stabilization can succeed even if optional follow-up steps were not taken.

This is important because the route pilots were intentionally authored to preserve legacy success semantics where optional branches are educationally valuable but not required for scenario completion.

### Debrief behavior

Debrief logic no longer relies purely on replaying the authored `expected_sequence`.

- Structured protocol metadata can now be persisted on intervention events.
- Debrief expected-action guidance prefers authoritative runtime metadata over naive sequence replay.
- When multiple next steps are valid, the debrief intentionally avoids inventing a single expected action.
- Strict-policy debrief scoring now counts remaining required steps as omissions only when appropriate.
- Optional unchosen branches remain neutral in scoring when they were not required.

### Current status summary

The foundational branching work appears complete enough for expansion work.

- strict completion policy exists and is tested
- route protocol normalization exists and is tested
- branch and rescue activation exists and is tested
- debrief metadata is branch-aware and state-aware
- progress scoring accepts runtime required-step totals
- several seeded ACLS scenarios now act as pilots for the authoring model

What remains is not missing infrastructure so much as migration scale-up, edge-case validation, and cleanup of lingering single-sequence assumptions outside the engine and debrief core.

## 4. Completed phases and their outcomes

### Phase 1: strict completion-policy support

Outcome:

- scenario metadata can opt into `strict_sequence_required`
- engine success evaluation now blocks stabilization-based completion until required protocol work is actually complete
- legacy scenarios remain backward compatible by defaulting to `legacy_outcome_driven`

Primary implementation anchors:

- `src/types/scenario.ts`
- `src/hooks/useScenarioEngine.ts`
- `src/lib/debriefScoring.ts`

### Phase 1.5: strict debrief scoring and wording alignment

Outcome:

- strict incomplete runs now score omissions based on runtime required-step totals, not just raw authored sequence length
- debrief wording differentiates strict incomplete failures and manual endings from ordinary legacy outcomes
- duplicate actions remain excluded from scoring denominator where intended

Primary implementation anchors:

- `src/lib/debriefScoring.ts`
- `src/lib/debriefScoring.test.ts`

### stale validation fix in scenario seed tests

Outcome:

- validation in `src/data/seedScenarios.test.ts` now reflects the current pilot authoring patterns instead of asserting obsolete assumptions
- route-aware pilots are explicitly tested for expected legacy policy retention and route structure

Primary implementation anchors:

- `src/data/seedScenarios.test.ts`

### Phase 2A: route-based protocol infrastructure

Outcome:

- scenario typing now supports `protocol.primary`, `protocol.branches`, and `protocol.rescues`
- legacy `expected_sequence` remains supported through normalization into a primary route
- runtime protocol state can compute active routes, required steps, and available interventions across activated routes

Primary implementation anchors:

- `src/types/scenario.ts`
- `src/hooks/useScenarioEngine.ts`
- `src/hooks/useScenarioEngine.test.ts`

### Phase 2B: rescue pilot for `pregnant_vfib_arrest`

Outcome:

- PMCD moved out of the flat teaching spine and into a rescue route activated by scheduled state change `pmcd_window_open`
- rescue actions remain locked until activation condition is met
- once unlocked, PMCD can appear as a valid peer action alongside the current primary step

Primary implementation anchors:

- `src/data/seedScenarios.ts`
- `src/hooks/useScenarioEngine.test.ts`
- `src/data/seedScenarios.test.ts`

### Phase 2C: true-branch pilot for `adult_unstable_bradycardia`

Outcome:

- after IV access, atropine and pacing can both become valid next actions
- optional branch work does not inflate required-step totals when not required
- accepted branch steps emit route metadata for downstream debrief use

Primary implementation anchors:

- `src/data/seedScenarios.ts`
- `src/hooks/useScenarioEngine.test.ts`

### branch-aware debrief and event metadata

Outcome:

- intervention events can now include:
  - `available_intervention_ids`
  - `state_aware_available_intervention_ids`
  - `active_route_id`
  - `activated_route_ids`
  - `advanced_route_id`
  - `required_step_delta`
- debrief expected-action guidance can distinguish single valid next steps from multi-valid states

Primary implementation anchors:

- `src/types/scenario.ts`
- `src/hooks/useScenarioEngine.ts`
- `src/App.tsx`
- `src/App.test.ts`
- `src/lib/debriefFeedback.ts`

### optional-branch pilots for `adult_vtach_pulse` and `adult_svt`

Outcome:

- `adult_vtach_pulse` now uses a primary cardioversion spine with an optional post-cardioversion branch
- `adult_svt` now uses a primary vagal to IV to adenosine spine with an optional post-adenosine cardioversion branch
- both scenarios intentionally remain on legacy completion policy
- `adult_svt` also uses state-aware metadata so synchronized cardioversion is suggested only if rhythm still supports it

Primary implementation anchors:

- `src/data/seedScenarios.ts`
- `src/hooks/useScenarioEngine.test.ts`
- `src/data/seedScenarios.test.ts`

## 5. Remaining work and recommended next phase

## Recommended next phase: broaden route-based migration with validation hardening

The sensible next phase is to expand the route-based authoring model to additional candidate scenarios while simultaneously validating that the current metadata model is robust enough for broader use.

This should focus on scenarios where any of the following are true:

- there are clinically acceptable parallel next steps
- there are conditional rescue interventions that should not live in the main spine
- current `expected_sequence` authoring overstates what is truly required for success
- debrief feedback would benefit from distinguishing sequence error from state mismatch or conditional applicability

Why this is the right next step now:

- the engine and debrief plumbing are already in place
- multiple pilot scenarios now demonstrate the intended patterns
- the remaining risk is mainly authoring consistency and hidden assumptions in surrounding UI/tests
- delaying broader migration would leave the new infrastructure underused and unvalidated at scale

Secondary goals within this next phase:

- audit remaining legacy-only consumers of `expected_sequence`
- decide whether route-aware UI affordances are needed beyond debrief metadata
- confirm which scenarios should remain legacy outcome-driven even after route migration

## 6. Exact recommended next implementation step

Pick the next 2 to 4 high-value ACLS scenarios that currently encode conditional or parallel logic poorly in flat `expected_sequence` form, then migrate one scenario end-to-end as the first task of the next session.

The first concrete step should be:

1. inspect seeded ACLS scenarios in `src/data/seedScenarios.ts`
2. identify the best next migration candidate after the current pilots
3. define whether that scenario needs:
   - optional branch
   - required branch
   - rescue route
   - no migration yet because flat sequencing is still appropriate
4. add or update route authoring for exactly one scenario
5. add matching engine and seed validation tests before migrating additional scenarios

If no clearly better candidate emerges, a pragmatic next-first candidate is another ACLS scenario with conditional escalation or parallel acceptable interventions rather than a simple linear case.

## 7. Key constraints and backward-compatibility rules

1. **Do not break legacy scenarios.**
   - scenarios without `protocol` must continue to work through normalization from `expected_sequence`

2. **Do not assume authored `expected_sequence` equals required runtime steps.**
   - for route-aware scenarios, `requiredStepCount` is runtime-derived and is the authoritative completion and scoring input

3. **Optional branches must stay neutral unless explicitly marked required.**
   - unchosen optional branches should not count as omissions
   - accepted optional branches may still be logged and shown in debrief

4. **State-aware guidance is authoritative for debrief expected-action hints.**
   - when `state_aware_available_intervention_ids` is present, prefer it over raw protocol-next lists
   - when the state-aware list is empty, do not invent guidance

5. **Multi-valid next states must not be flattened into a fake single answer.**
   - debrief should stay neutral when more than one valid next step exists

6. **Rescue routes must remain locked until activation.**
   - rescue-only steps should not appear usable before the trigger condition is satisfied

7. **Legacy completion behavior is still intentional for some pilots.**
   - `pregnant_vfib_arrest`, `adult_unstable_bradycardia`, `adult_vtach_pulse`, and `adult_svt` are currently expected to stay legacy outcome-driven
   - do not casually convert them to strict completion without an explicit product and pedagogy decision

8. **Success and failure evaluation must continue using base physiology, not just display overrides.**
   - active intervention overlays must not accidentally satisfy conditions

## 8. Relevant files and responsibilities

### Core types and authoring contracts

- `src/types/scenario.ts`
  - scenario schema
  - completion policy enum
  - route protocol types
  - intervention event metadata contract

### Runtime engine

- `src/hooks/useScenarioEngine.ts`
  - protocol normalization
  - route activation and progression
  - rescue locking
  - sequence deviation messaging
  - state-aware next-action filtering
  - completion policy enforcement

### App integration and debrief assembly

- `src/App.tsx`
  - session log construction
  - debrief action feedback generation
  - fallback behavior between structured metadata and legacy expected-sequence replay
  - scenario progress integration

### Debrief logic

- `src/lib/debriefScoring.ts`
  - omission calculation
  - strict vs legacy scoring behavior
  - clinical conclusion wording

- `src/lib/debriefFeedback.ts`
  - rejected action classification
  - expected-action support gating
  - multi-valid-step handling

### Progress calculation

- `src/lib/scenarioProgress.ts`
  - protocol vs outcome weighting
  - runtime required-step total support

### Scenario authoring source of truth

- `src/data/seedScenarios.ts`
  - seeded scenario definitions
  - pilot route migrations
  - completion policy flags
  - rescue and optional branch examples

### Key tests to inspect first

- `src/hooks/useScenarioEngine.test.ts`
  - core runtime behavior
  - branching and rescue pilots
  - strict completion behavior
  - state-aware metadata expectations

- `src/lib/debriefScoring.test.ts`
  - strict omission and scoring rules

- `src/lib/debriefFeedback.test.ts`
  - rejected-message classification behavior

- `src/lib/scenarioProgress.test.ts`
  - runtime required-step progress handling

- `src/data/seedScenarios.test.ts`
  - source-of-truth authoring validation
  - pilot scenario structure assertions

- `src/App.test.ts`
  - debrief expected-action metadata precedence

## 9. Known gotchas and pitfalls

1. **`sequenceIndex` is no longer just flat-sequence position.**
   It now effectively mirrors completed required steps. That remains compatible with much of the app, but any code assuming it indexes directly into `expected_sequence` can become misleading for route-aware scenarios.

2. **`CheatOverlay` is still legacy-oriented.**
   `src/components/CheatOverlay.tsx` reads only `expected_sequence` and `sequenceIndex`. For route-aware scenarios, this can be pedagogically stale or incomplete because it cannot express multiple valid next steps, active rescue options, or optional branch activation.

3. **`expected_sequence` still carries mixed responsibilities.**
   It is still used as:
   - a legacy runtime source for non-route scenarios
   - a teaching spine for route-aware scenarios
   - fallback debrief replay input when structured metadata is absent
   Treat it as authored teaching guidance, not always the authoritative runtime requirement set.

4. **Route activation can change required-step totals at runtime.**
   Required branches and rescues can increase `requiredStepCount` after a trigger. Any scoring or progress feature that caches totals too early will drift.

5. **State-aware next steps and protocol-valid next steps are not the same thing.**
   A step can be protocol-valid yet physiologically inappropriate after a success-state transition. The debrief and UI should not conflate those lists.

6. **Legacy completion on migrated pilots is intentional, not a bug.**
   It may look odd that `adult_svt` and `adult_vtach_pulse` can succeed even while an optional branch remains available. That is currently the intended backward-compatible behavior.

7. **Seed validation should evolve with authoring patterns.**
   Tests in `src/data/seedScenarios.test.ts` are opinionated. Broader migration will likely require further validation updates, but those updates must preserve actual safety checks rather than simply weakening assertions.

## 10. What is intentionally still legacy or deferred

The following appear intentionally deferred or still legacy-oriented:

- broader scenario migration beyond the current pilots
- route-aware cheat or teacher-style UI that can show multiple valid next actions
- **CheatOverlay route-awareness** — `src/components/CheatOverlay.tsx` reads only `expected_sequence` and `sequenceIndex`. For route-aware scenarios, it cannot express multiple valid next steps, active rescue options, or optional branch activation. This creates a pedagogically confusing experience for instructors using cheat mode on migrated scenarios.
- any large-scale replacement of `expected_sequence` as a teaching spine
- broader conversion of migrated scenarios to strict completion policy
- any debrief UX that explicitly visualizes route transitions or branch selection history

These are not necessarily defects. They are reasonable deferrals while the protocol model is still being validated on a wider scenario set.

## 11. What should be validated before broader scenario migration continues

Before migrating many more scenarios, explicitly validate:

1. whether the current route model is expressive enough for all intended branching cases
2. whether `required: false` is sufficient for optional educational follow-up steps
3. whether any scenario needs branches that activate from combined state and intervention conditions
4. whether UI consumers of `sequenceIndex` and `expected_sequence` need route-aware alternatives first
5. whether debrief wording remains clear when branch activation changes required totals mid-run
6. whether source-of-truth tests can distinguish teaching spine assertions from runtime requirement assertions cleanly

## 12. Suggested test strategy for the next phase

For each newly migrated scenario, add tests at three levels.

### A. seed authoring validation

Add assertions in `src/data/seedScenarios.test.ts` for:

- route shape
- activation triggers
- expected teaching spine retention where intended
- explicit completion policy expectations
- optional vs required branch semantics

### B. engine behavior validation

Add scenario-specific tests in `src/hooks/useScenarioEngine.test.ts` for:

- initial available interventions
- branch or rescue activation moment
- valid-next-action sets after activation
- rejection messaging before activation
- route metadata emitted on accepted and rejected actions
- success behavior under the intended completion policy

### C. debrief and app integration validation

Add or update tests in:

- `src/App.test.ts`
- `src/lib/debriefFeedback.test.ts`
- `src/lib/debriefScoring.test.ts`

Verify:

- expected-action guidance precedence remains correct
- multi-valid next steps do not collapse into a fake single expected action
- omissions count only the required runtime steps
- legacy fallback still works when structured metadata is absent

## 13. Suggested acceptance criteria for the next phase

The next phase should be considered complete only if all of the following are true:

1. at least one additional non-pilot scenario is migrated to route-based authoring with clear medical and pedagogical justification
2. the migrated scenario preserves intended backward compatibility for completion semantics
3. source-of-truth seed tests explicitly validate the new route authoring
4. engine tests cover activation, availability, rejection, metadata emission, and completion outcome
5. debrief tests prove that expected-action guidance and omission scoring still behave correctly
6. no legacy non-route scenario regresses
7. any newly exposed mismatch between route-aware runtime logic and legacy UI assumptions is either fixed or documented as deferred
8. CheatOverlay route-awareness gap is explicitly addressed (either fixed or documented as deferred in Section 10)

## 14. How to start the next session

1. Read these files first in this order:
   - `src/types/scenario.ts`
   - `src/hooks/useScenarioEngine.ts`
   - `src/App.tsx`
   - `src/lib/debriefScoring.ts`
   - `src/lib/debriefFeedback.ts`
   - `src/lib/scenarioProgress.ts`
   - `src/data/seedScenarios.ts`

2. Then inspect these tests:
   - `src/hooks/useScenarioEngine.test.ts`
   - `src/data/seedScenarios.test.ts`
   - `src/App.test.ts`
   - `src/lib/debriefScoring.test.ts`
   - `src/lib/debriefFeedback.test.ts`
   - `src/lib/scenarioProgress.test.ts`

3. Choose one additional candidate scenario for route migration.

4. Confirm whether it should stay legacy outcome-driven or move to strict completion.

5. Implement only that one migration plus its tests before expanding further.

6. Re-check any UI or helper still tied directly to `expected_sequence`, especially `src/components/CheatOverlay.tsx`, before assuming the migration is fully surfaced in the product.
