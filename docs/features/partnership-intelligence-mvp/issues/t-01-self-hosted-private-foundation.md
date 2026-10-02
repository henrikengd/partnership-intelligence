# T-01: Establish the self-hosted app and invited private access

## Parent and requirements

Parent feature: `partnership-intelligence-mvp`.
Parent issue: https://github.com/henrikengd/partnership-intelligence/issues/1.
Canonical contract: [specification r1](https://github.com/henrikengd/partnership-intelligence/blob/main/docs/features/partnership-intelligence-mvp/spec.md).
Requirements: F-01, F-02.

## What to build

Create the Next.js/TypeScript/PostgreSQL foundation, Drizzle migrations, auth/session integration, and Docker configuration. Establish the shared validation and domain-service seams, npm command contract, fictional test setup, and initial CI. Implement secret-gated first-admin bootstrap, admin/editor roles, expiring single-use invitations shared manually, login/logout, revocation, and operator recovery. Do not implement onboarding, opportunity generation, or integrations here.

## Acceptance criteria

- [ ] A fresh documented setup starts the app/database, applies migrations, and preserves a saved organization record after restart without an AI key.
- [ ] Bootstrap cannot create a second first-admin account, including concurrent requests. Public signup and direct unauthorized server reads/mutations are rejected.
- [ ] Only an administrator creates invites or changes access; expired/reused/mismatched invite tokens fail. Revocation invalidates access and the last active admin cannot be removed.
- [ ] Secrets remain server-side, the database is not exposed publicly by Compose, and no default production password is seeded.
- [ ] The documented npm checks and minimal setup/auth workflow pass in CI against fictional data.

## Blocked by

None.

## Shared contracts and change areas

Shared schema and migrations, src/server/auth and db, app shell, runtime/lockfile, Compose/Dockerfile, initial CI, test configuration. These are groundwork for all later tickets; lock their public interfaces before T-02.

Proposed paths do not yet exist; verify the actual code and migrations before editing. Respect the complete spec's bounds and exclusions.

## Verification

Run install, lint, typecheck, build, auth/setup integration tests and a browser bootstrap/invite/login/revoke smoke test. Exercise direct endpoints, invite races, persistent restart, and the real Compose build. Current workspace lacks Docker on PATH; provision an authorized supported environment or record the blocker, never mark container acceptance passed without running it.

## Status

ready for an authorized delivery stage. This ticket is a published plan, not authorization to start implementation or create branches. Close it only with integrated verification evidence.
