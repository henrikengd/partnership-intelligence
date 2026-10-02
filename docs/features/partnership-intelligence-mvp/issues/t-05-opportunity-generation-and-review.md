# T-05: Generate candidate batches and preserve reviewed opportunity revisions

## Parent and requirements

Parent feature: `partnership-intelligence-mvp`.
Parent issue: https://github.com/henrikengd/partnership-intelligence/issues/1.
Canonical contract: [specification r1](https://github.com/henrikengd/partnership-intelligence/blob/main/docs/features/partnership-intelligence-mvp/spec.md).
Requirements: F-04, F-09, F-10.

## What to build

Add known-company candidate selection, bounded deterministic generation runs, opportunity list/dashboard, full detail editing and review gates. Match supported need/capability tags or evidenced incentives and permit explicit candidate selection. Surface previous declines/current discussions. Enforce active opportunity uniqueness and keep immutable assessments plus separate user edits, including stale-input review flags and restart-safe explicit retry.

## Acceptance criteria

- [ ] One active need evaluates no more than 20 known candidate companies, with visible candidate-selection reasons and evidence gaps. Cash needs do not match every company automatically.
- [ ] Concurrent/retried generation creates at most one active opportunity per company/need/type and retains assessment history.
- [ ] Changing a relevant need/evidence/relationship flags existing assessments for review; regeneration does not overwrite user edits or outreach.
- [ ] The detail page presents why, who, via whom, ask, value exchange, first action and approach, with known/inferred/missing distinctions and all score factors.
- [ ] Reviewed fit, concrete ask, target role/person, and next action gate pursuing. A clearly marked cold approach can pass review.
- [ ] Interrupted/failed runs show a recoverable state and retain prior data. Fulfilled needs and active discussions do not trigger duplicate unattended work.

## Blocked by

[T-04 / #5](https://github.com/henrikengd/partnership-intelligence/issues/5).

## Shared contracts and change areas

Opportunity/candidate/run/review domain services, transactional uniqueness and revision migrations, dashboard/list/detail, shared evidence/path contracts from T-04. T-06/T-07 depend on these version and editing contracts.

Proposed paths do not yet exist; verify the actual code and migrations before editing. Respect the complete spec's bounds and exclusions.

## Verification

Real DB tests demonstrate concurrent uniqueness, retries, edit preservation, stale inputs, historical declines, and stable scoring order. Browser-test known candidates, unsupported candidates, review-to-action readiness, dashboard empty/errors and interrupted run recovery.

## Status

blocked. This ticket is a published plan, not authorization to start implementation or create branches. Close it only with integrated verification evidence.
