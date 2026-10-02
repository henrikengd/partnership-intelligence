# T-06: Track owned outreach, follow-ups, and partnership outcomes

## Parent and requirements

Parent feature: `partnership-intelligence-mvp`.
Parent issue: https://github.com/henrikengd/partnership-intelligence/issues/1.
Canonical contract: [specification r1](https://github.com/henrikengd/partnership-intelligence/blob/main/docs/features/partnership-intelligence-mvp/spec.md).
Requirements: F-11, F-12.

## What to build

Extend the first activity into a simple owned outreach pipeline and outcome workflow. Support introduction requests, messages/meetings recorded manually, next actions and calendar follow-ups. Implement suggested/shortlisted/pursuing/agreed/declined/archived lifecycle with guarded review transitions, reasons and explicit reopening. Agreement creates or links a partnership and preserves original opportunity history.

## Acceptance criteria

- [ ] Users assign active owners and distinguish planned, completed and due activities with target person/role, channel and date.
- [ ] Dashboard/pipeline show due and overdue follow-ups using organization time zone; archiving does not fabricate completed outreach.
- [ ] State transitions enforce review conditions; declines/archives record reasons and explicit reopening preserves earlier actions.
- [ ] Recording agreement creates or links one resulting partnership without duplicating it on retries. Draft agreements do not count as achieved outcomes.
- [ ] Partnership/current/past contribution views and company history show the recorded outcome. No email or message is sent by the application.

## Blocked by

[T-05 / #6](https://github.com/henrikengd/partnership-intelligence/issues/6).

## Shared contracts and change areas

Outreach/activity/outcome/partnership services and migrations, dashboard/pipeline/company history, opportunity state/detail. T-07 overlaps detail UI and assessment history; coordinate component ownership.

Proposed paths do not yet exist; verify the actual code and migrations before editing. Respect the complete spec's bounds and exclusions.

## Verification

Database and browser workflows cover plan/complete/follow-up, date boundary cases, invalid transitions, declined/reopened opportunities, and idempotent agreement creation. Inspect owner assignment, empty pipeline, overdue state, and outcome views.

## Status

blocked. This ticket is a published plan, not authorization to start implementation or create branches. Close it only with integrated verification evidence.
