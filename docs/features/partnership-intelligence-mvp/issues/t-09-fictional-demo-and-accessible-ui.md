# T-09: Complete the fictional demo and polish the accessible product workflow

## Parent and requirements

Parent feature: `partnership-intelligence-mvp`.
Parent issue: https://github.com/henrikengd/partnership-intelligence/issues/1.
Canonical contract: [specification r1](https://github.com/henrikengd/partnership-intelligence/blob/main/docs/features/partnership-intelligence-mvp/spec.md).
Requirements: F-16, F-17.

## What to build

Deliver the complete isolated Riverbend demo, onboarding-to-dashboard experience and coherent main navigation. Include generic cash/logistics/expertise or volunteer needs alongside manufacturing. Polish opportunity detail, filtered graph/text paths, pipeline, loading/empty/error/retry states and responsive keyboard operation. Keep simulated model output clearly labelled and demo reset separate from live data.

## Acceptance criteria

- [ ] The demo has the specified 12 people, 6 companies, 4 needs, 3 current/past partnerships and at least 8 usable opportunities, all explicitly fictional.
- [ ] Fixtures cover warm/cold routes, alternatives, former employment, recent decline, missing/conflicting evidence and overdue follow-up; no AI key is required.
- [ ] Seeding/reset refuses a live/private installation and demo mode is visibly identified.
- [ ] The full onboarding-to-opportunity-to-outreach flow works by keyboard and at 390px, with labelled controls, visible focus and readable validation errors.
- [ ] The graph has a text equivalent and no interaction or evidence state depends on color alone. Main pages have useful empty/loading/error/retry states.

## Blocked by

[T-03 / #4](https://github.com/henrikengd/partnership-intelligence/issues/4), [T-06 / #7](https://github.com/henrikengd/partnership-intelligence/issues/7), [T-07 / #8](https://github.com/henrikengd/partnership-intelligence/issues/8).

## Shared contracts and change areas

Fictional seed and provider fixtures, shared UI/navigation and accessibility, onboarding/detail/graph/pipeline, demo safety and setup docs. Coordinate settings/fixture changes with T-08 and avoid turning polish into unrelated scope.

Proposed paths do not yet exist; verify the actual code and migrations before editing. Respect the complete spec's bounds and exclusions.

## Verification

Run browser E2E with no AI credentials, demo reset/live-refusal tests, accessibility checks on the main workflow, and manual keyboard/narrow-screen inspection. Capture only fictional screenshots. Avoid a screenshot-only definition of completion.

## Status

blocked. This ticket is a published plan, not authorization to start implementation or create branches. Close it only with integrated verification evidence.
