# T-10: Verify self-hosting, restore, and document the MVP release

## Parent and requirements

Parent feature: `partnership-intelligence-mvp`.
Parent issue: https://github.com/henrikengd/partnership-intelligence/issues/1.
Canonical contract: [specification r1](https://github.com/henrikengd/partnership-intelligence/blob/main/docs/features/partnership-intelligence-mvp/spec.md).
Requirements: F-01, F-18.

## What to build

Finish operating/contribution/security/import/privacy documentation, CI coverage and end-to-end release verification. Demonstrate a fresh clone/configuration/migration/bootstrap/onboarding/first opportunity using the actual runbook, plus backup and restore to another database. Verify all spec requirements and collect completion evidence. Keep application deployment and PR merge outside this ticket authorization.

## Acceptance criteria

- [ ] Another operator can complete fresh private setup and the first useful workflow using only committed docs and fictional input.
- [ ] TLS/reverse-proxy setup, secure config, operator recovery, AI data disclosure, import templates, deletion/backup retention and restore are documented accurately.
- [ ] A real backup restores the intended records and behavior into a separate database; demo/reset safety remains intact.
- [ ] CI runs relevant lint/type/domain/database/E2E/build checks with fictional data and no private credentials/data in public artifacts.
- [ ] The release checklist maps all F-01 through F-18 to integrated evidence, verifies MIT/source scope, and records any real limitation rather than claiming unrun checks passed.

## Blocked by

[T-08 / #9](https://github.com/henrikengd/partnership-intelligence/issues/9), [T-09 / #10](https://github.com/henrikengd/partnership-intelligence/issues/10).

## Shared contracts and change areas

README and self-hosting/privacy/import/contribution/security docs, release E2E, backup/restore runbook or scripts, CI configuration and feature verification record. This is final operating acceptance, not a catch-all for unimplemented earlier ticket behavior.

Proposed paths do not yet exist; verify the actual code and migrations before editing. Respect the complete spec's bounds and exclusions.

## Verification

Run the documented fresh-install workflow and actual Docker build/start/restart plus database backup/restore. Run full relevant checks once after integration, inspect CI, and record evidence for each feature requirement. No automated merge or real-data deployment.

## Status

blocked. This ticket is a published plan, not authorization to start implementation or create branches. Close it only with integrated verification evidence.
