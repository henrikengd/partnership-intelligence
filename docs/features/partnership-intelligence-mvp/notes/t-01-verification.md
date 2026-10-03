# T-01 worker verification

Worker branch `codex/pi-t01-foundation`, based on `bf4953531a6e927a75b348fb075a0a4fd10fc22f`. This records worker-local evidence, not integrated acceptance, GitHub CI, issue closure, or a release. All fixture records are fictional.

## Acceptance evidence

- Fresh setup and persistence: the actual `pi-t01-smoke` Compose project built successfully, started PostgreSQL 18.6 and the production Next.js app, applied migrations, served `/login` with HTTP 200, accepted secret-gated bootstrap, signed in, and saved a generic organization. Restarting both services retained that organization and returned 409 from a repeated bootstrap. No AI configuration was present.
- Atomic setup and private endpoints: nine real PostgreSQL tests cover wrong setup secret, concurrent bootstrap, library and HTTP signup rejection, unauthenticated private reads/writes, invitation token hashing/email binding/72-hour expiry/single consumption under concurrency/reuse, expired invitations, editor permissions, role changes and revocation, current-password changes, concurrent last-admin protection, and database singleton constraints.
- Browser access: Chromium smoke covers first-admin setup, login, profile save, invitation creation/acceptance, editor access, forbidden administrator reads/writes, administrator revocation, revoked organization/get-session/change-password requests, return to login, direct public signup rejection, and a 390px viewport with no page overflow. Login desktop/mobile screenshots were rendered and visually inspected outside the repository.
- Server boundaries: auth configuration is lazy and server-side, cookies use the configured HTTPS origin, local HTTP requires an explicit flag and localhost origin, public gate inputs have bounded JSON reads and database-backed attempt counters, custom mutations require the configured Origin, and the auth HTTP route only permits the selected library endpoints. Library debug logging is disabled. Compose publishes only its app on localhost; PostgreSQL has no published port. There is no default account/password seed.
- Recovery: the documented command ran inside the built app container, replaced an existing fictional administrator's credential using Better Auth hashing, and revoked prior sessions. The old password failed and a new login succeeded.

## Commands and results

Passed `npm run lint`, `npm run typecheck`, `npm test` with four tests, `npm run test:integration` with nine tests, `npm run test:e2e` with one complete workflow, `npm run build`, `npm run db:generate` with no pending schema changes, and `npm audit` with zero reported vulnerabilities. A scoped transitive esbuild override removes the Drizzle Kit development-server advisory; schema generation was rerun successfully.

The isolated test DB is `pi_t01` on localhost 5541. Both DB environment variables must match. The test runner used local auth configuration and E2E port 3101. The exact suite command contract is documented in `docs/self-hosting.md`; passwords/secrets are private operator environment values, not deployment defaults.

Container commands used the isolated runtime:

```sh
DOCKER_CONFIG=/private/tmp/pi-docker-config DOCKER_CONTEXT=colima-partnership-intelligence docker compose --env-file /private/tmp/pi-t01-compose.env --project-name pi-t01-smoke up --build -d
DOCKER_CONFIG=/private/tmp/pi-docker-config DOCKER_CONTEXT=colima-partnership-intelligence docker compose --env-file /private/tmp/pi-t01-compose.env --project-name pi-t01-smoke restart
```

The private smoke env sets app port 3102 and contains only fictional local credentials. Runtime used the classic Docker builder because the optional buildx plugin was absent; build and production startup succeeded. The smoke project is stopped after verification, with its volume retained. External test database containers remain available to the coordinator.

## Remaining gates

The coordinator must integrate this commit, independently verify the integrated behavior, and run the final feature review and current-commit GitHub CI. The CI workflow is implemented but has not run remotely at this worker stage. Later tickets deliver the business workflow, complete demo seed, broader privacy controls, and final operating guides.
