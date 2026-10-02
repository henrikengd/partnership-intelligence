# T-03: Add resumable onboarding and validated CSV imports

## Parent and requirements

Parent feature: `partnership-intelligence-mvp`.
Parent issue: https://github.com/henrikengd/partnership-intelligence/issues/1.
Canonical contract: [specification r1](https://github.com/henrikengd/partnership-intelligence/blob/main/docs/features/partnership-intelligence-mvp/spec.md).
Requirements: F-03, F-05, F-06.

## What to build

Complete generic record editing and the saved onboarding sequence around profile, needs, people, professional relationships, companies/partnerships, optional manual previous outreach, graph review, and first-opportunity readiness. Add four CSV templates, field mapping, duplicate resolution, preview, cancellation, atomic commitment and source-ID-based reimport. Needs and evidence remain form-driven; arbitrary CRM import and previous-outreach CSV are out of scope.

## Acceptance criteria

- [ ] Onboarding resumes after interruption, optional steps can be skipped, and settings can edit saved configuration afterward.
- [ ] A user adds several needs, multiple person roles/employment periods, known contacts, companies and current/past partnerships without organization-specific fields.
- [ ] Each template reports row-level errors and ambiguous duplicates before commitment. Same-name people are never automatically merged.
- [ ] Cancel and invalid previews change no records; selected valid rows commit atomically and reimport/retry does not duplicate them.
- [ ] Uploads over 5 MiB or 5,000 rows fail clearly; committed batches retain summaries/mappings but not original files.
- [ ] The final readiness screen reaches a supported opportunity or a concrete missing-evidence task even when no personal path is known.

## Blocked by

[T-02 / #3](https://github.com/henrikengd/partnership-intelligence/issues/3).

## Shared contracts and change areas

Onboarding routes, manual record forms, imports module, shared validation, evidence/network/company/partnership schema, settings navigation, templates and fixture files. T-04 overlaps relationship forms, schema, and graph entry points; coordinate changes without inventing a behavior blocker.

Proposed paths do not yet exist; verify the actual code and migrations before editing. Respect the complete spec's bounds and exclusions.

## Verification

Browser-test resume/skip/edit and realistic fictional imports. Use real DB checks for rollback/cancel, explicit exclusions, duplicate ambiguity, concurrent commit/retry, and reimport. Inspect labelled mapping controls and actionable validation errors on narrow screens.

## Status

blocked. This ticket is a published plan, not authorization to start implementation or create branches. Close it only with integrated verification evidence.
