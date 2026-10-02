# T-04: Find evidence-aware introduction paths and show a focused graph

## Parent and requirements

Parent feature: `partnership-intelligence-mvp`.
Parent issue: https://github.com/henrikengd/partnership-intelligence/issues/1.
Canonical contract: [specification r1](https://github.com/henrikengd/partnership-intelligence/blob/main/docs/features/partnership-intelligence-mvp/spec.md).
Requirements: F-07, F-08.

## What to build

Extend the first route into bounded path finding and ranking over recorded affiliations, employment, acquaintances, and derived partnership/outreach history. Provide company/opportunity-centered graph filtering, dates/evidence/strength details, alternatives, and a textual equivalent. Separate historical leads from current routes and update deterministic relationship/access assessment inputs without inventing personal familiarity.

## Acceptance criteria

- [ ] Current routes use at most two person intermediaries, exclude cycles, and return at most three stable-ranked alternatives.
- [ ] Former employment and ended relationships appear as historical leads rather than verified current access. Unknown dates, strength, or willingness remain explicit.
- [ ] Shared employers never create a knows relationship or imply access to a manufacturing manager. Company access and verified decision-maker access remain distinct.
- [ ] Routes show supporting source records and weakest applicable personal edge; adding intermediaries never adds relationship strengths.
- [ ] No known route yields a clear cold-approach state, and all graph information is available through keyboard-readable text.

## Blocked by

[T-02 / #3](https://github.com/henrikengd/partnership-intelligence/issues/3).

## Shared contracts and change areas

Network traversal/service contracts from T-02, graph projection and UI, route evidence and scoring inputs, company/opportunity views. Coordinate shared schema/UI changes with T-03; the graph itself does not become a separate writable source.

Proposed paths do not yet exist; verify the actual code and migrations before editing. Respect the complete spec's bounds and exclusions.

## Verification

Use externally meaningful fixtures for cycles, current/former employment, two routes, unknown strength, unavailable introductions, same-employer strangers, and named-contact authority. Verify ranking stability and limits with real stored data and inspect graph plus textual navigation in the browser.

## Status

blocked. This ticket is a published plan, not authorization to start implementation or create branches. Close it only with integrated verification evidence.
