# T-02: Deliver the first complete deterministic partnership workflow

## Parent and requirements

Parent feature: `partnership-intelligence-mvp`.
Parent issue: https://github.com/henrikengd/partnership-intelligence/issues/1.
Canonical contract: [specification r1](https://github.com/henrikengd/partnership-intelligence/blob/main/docs/features/partnership-intelligence-mvp/spec.md).
Requirements: F-03, F-04, F-08, F-10, F-11.

## What to build

Implement the smallest vertical slice in the scope. Through generic forms, save one organization profile, active need, person with affiliation/current employer, company capability and evidence. Show one recorded route as text and a small graph. Create a deterministic brief with the complete v1 scoring contract and unknowns, assign an owner, and record a planned/completed introduction action and follow-up. Introduce the shared path/assessment/opportunity/activity seams used by later slices. This is a user-editable workflow, not a static demo page.

## Acceptance criteria

- [ ] An invited user completes the Riverbend machining case from saved inputs through an explained opportunity and recorded next action with AI disabled.
- [ ] One person can have multiple organization roles; employment and evidence records preserve provenance and dates. Invalid foreign keys and impossible dates fail without partial writes.
- [ ] All eight factors use the spec rubric and expose values or unknowns, rationale, origin, and evidence. The documented example produces 46.25 points and 55% coverage.
- [ ] The brief distinguishes supported claims, inferences, contact-role suggestions, and missing introduction willingness or feasibility. It does not invent a named manager.
- [ ] Manual edits and a completed outreach event persist across refresh; a draft action is not completed outreach.

## Blocked by

[T-01 / #2](https://github.com/henrikengd/partnership-intelligence/issues/2).

## Shared contracts and change areas

Initial domain schema/migrations and typed services in organization/network/needs/companies/opportunities/outreach; opportunity detail; minimal focused graph; fictional case and test fixtures. T-03/T-04 extend these shared records and interfaces, so document their contracts.

Proposed paths do not yet exist; verify the actual code and migrations before editing. Respect the complete spec's bounds and exclusions.

## Verification

Run real database integration tests for integrity and persistence, independent scoring examples/unknown cases, and a browser E2E from record entry to completed action. Inspect desktop and 390px rendering with fictional data. No CSV, bulk generation, full pipeline, or AI is required for this ticket.

## Status

blocked. This ticket is a published plan, not authorization to start implementation or create branches. Close it only with integrated verification evidence.
