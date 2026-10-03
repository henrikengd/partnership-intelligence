# Contributing

Read [the glossary](CONTEXT.md), [development contracts](docs/development-contracts.md) and the relevant [MVP specification](docs/features/partnership-intelligence-mvp/spec.md) before changing behavior. Keep the app configurable for any organization. Use fictional fixtures and supplied sources.

## Local checks

Use the pinned Node 24 version and `npm ci`. Configure private local auth variables and a PostgreSQL 18 database. Normal application data never belongs in Git.

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Database/browser checks require matching `DATABASE_URL` and `TEST_DATABASE_URL` pointing to a dedicated `pi_t01`, `pi_ci` or `pi_integration` database. The test login must be allowed to provision the restricted fictional `pi_demo` companion on that test server. Do not grant test infrastructure access to production storage.

```sh
npm run db:migrate
npm run test:integration
npx playwright install chromium
npm run test:e2e
```

Run database and browser suites sequentially; both reset fictional records. `E2E_PORT` chooses the local browser-test server, default 3101. Do not run a build and a dev server against the same `.next` directory. Provider tests inject a fake provider and never need a live credential.

## Changes and pull requests

Keep changes focused. Add regressions for meaningful correctness, authorization, privacy or state-transition changes. Verify rendered UI with the browser at desktop and 390px, including keyboard access and readable errors. Use fictional screenshots only. Do not commit ordinary test screenshots unless they intentionally belong to documentation.

Schema changes belong in `src/server/db/schema.ts`. Run `npm run db:generate` and commit SQL plus snapshot/journal metadata together. Never edit an applied migration. Coordinate migration ownership when working in parallel.

Use Conventional Commits. A PR should explain the problem, resulting behavior, relevant checks and material limitations. Keep independent review findings distinct from preferences. See [security reporting](SECURITY.md) for sensitive issues.
