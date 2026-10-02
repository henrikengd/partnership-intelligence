# T-08: Add admin-only exports, dependent-data deletion, and retention controls

## Parent and requirements

Parent feature: `partnership-intelligence-mvp`.
Parent issue: https://github.com/henrikengd/partnership-intelligence/issues/1.
Canonical contract: [specification r1](https://github.com/henrikengd/partnership-intelligence/blob/main/docs/features/partnership-intelligence-mvp/spec.md).
Requirements: F-02, F-15.

## What to build

Implement admin-only export and destructive data deletion across import mappings, relationships, opportunity snapshots, AI material and outreach history. Remove or redact private dependent material when a person is deleted, preserve nonpersonal outcome history where possible, and invalidate affected assessments. Add minimal operational audit events, safe CSV export and clear retention/backup boundaries. This does not add enterprise record-level permissions.

## Acceptance criteria

- [ ] Editors/unauthenticated callers cannot export or perform destructive deletion through direct server endpoints.
- [ ] Admin preview identifies deletion impact; confirmed deletion removes related private path snapshots, generated material and import mappings, including historical assessment content that contains the person.
- [ ] Affected opportunities lose unsafe path references and require review; nonpersonal partnership/outcome history remains coherent.
- [ ] Exports neutralize formula-like cells and logs contain operational identifiers rather than raw private evidence, contexts, tokens or credentials.
- [ ] Original upload handling matches retention policy, and live deletion documents separately retained backups instead of claiming immediate backup erasure.

## Blocked by

[T-03 / #4](https://github.com/henrikengd/partnership-intelligence/issues/4), [T-06 / #7](https://github.com/henrikengd/partnership-intelligence/issues/7), [T-07 / #8](https://github.com/henrikengd/partnership-intelligence/issues/8).

## Shared contracts and change areas

Admin settings/export/delete service, database relationships and constraints, generation/history storage from T-07, activity/outcome data from T-06, import mappings from T-03, audit metadata and privacy docs. T-09 overlaps settings/demo/export fixtures.

Proposed paths do not yet exist; verify the actual code and migrations before editing. Respect the complete spec's bounds and exclusions.

## Verification

Test direct endpoint permission denial and a real DB deletion fixture with relationships, imported mappings, completed outreach and generated/history snapshots. Search exported/logged output for planted private markers and formula payloads. Demonstrate preview/cancel/confirm behavior in the browser.

## Status

blocked. This ticket is a published plan, not authorization to start implementation or create branches. Close it only with integrated verification evidence.
