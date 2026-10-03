# Explore the fictional demo

Riverbend Community Workshop is invented. Its 12 people, six companies, four needs, three partnerships and eight opportunities contain no real network records. The demo includes a reviewed introduction, a second recorded route, a cold grant request, an introduction refusal, former employment, conflicting equipment evidence, a prior decline, an agreed partnership and an overdue follow-up. Every source is an attributed fictional observation. Scores prioritize review work, not the probability of success. AI starts disabled and needs no API key. No email is sent.

Keep the demo separate from a private deployment. Do not enter private information. Use its own Compose project, database, credentials and volume. Never combine `compose.demo.yaml` with the live `compose.yaml`.

## Start locally with Docker

Copy `demo.env.example` to `.env.demo`. Fill each password/secret with a distinct value from `openssl rand -hex 32`. The file stays outside Git. The app is bound to localhost on port 3100 by default.

```sh
cp demo.env.example .env.demo
docker compose --env-file .env.demo -p partnership-demo -f compose.demo.yaml up -d db
docker compose --env-file .env.demo -p partnership-demo -f compose.demo.yaml run --build --rm app sh -c 'node --import tsx scripts/migrate.ts && node --import tsx scripts/demo.ts seed'
docker compose --env-file .env.demo -p partnership-demo -f compose.demo.yaml up -d app
```

Open `http://localhost:3100`. Sign in as `demo-admin@riverbend.example.test` with your configured `DEMO_ADMIN_PASSWORD`. The header identifies the fictional demo. Open the opportunities or pipeline to compare routes, gaps and actions. Onboarding remains available to explore each step and add fictional records.

## Reset only the demo

Stop the demo app first. Reset is a command-line operation. There is no reset endpoint.

```sh
docker compose --env-file .env.demo -p partnership-demo -f compose.demo.yaml stop app
docker compose --env-file .env.demo -p partnership-demo -f compose.demo.yaml run --rm app node --import tsx scripts/demo.ts reset --confirm-demo-reset
docker compose --env-file .env.demo -p partnership-demo -f compose.demo.yaml up -d app
```

Reset rebuilds the fictional records with dates relative to today and invalidates the previous login session. Sign in again. The database stays private to this separate project. Ordinary seeding accepts only an empty installation. An interrupted seed retains a `seeding` sentinel; the same guarded reset can recover it. A failed rebuild reports failure and remains recoverable, rather than claiming the whole seed was atomic.

The command requires `APPLICATION_MODE=demo`, identical explicit `DATABASE_URL` and `DEMO_DATABASE_URL`, the actual `pi_demo` database/login, a matching persisted sentinel and fictional organization, no unrecognized accounts, a local application URL, no AI credential and no active app database connections. It verifies the same application pool used for mutations. A changed organization identity, absent/unrecognized marker or private/live connection is refused without reset. If you add accounts or change the fictional organization identity, preserve that database separately instead of forcing reset.

## Use an existing local PostgreSQL service

An operator can provision a separate `pi_demo` database owned by a restricted `pi_demo` login. Give that login no write privileges on private databases. Supply the same variables as the demo Compose file, use matching explicit database URLs and run migrations before `npm run demo:seed`. Stop the server before `npm run demo:reset -- --confirm-demo-reset`. Do not repoint your private installation's credentials.

## Test companion

`npm run test:provision-demo` prepares a companion on the same PostgreSQL server as the isolated test database. It requires matching `DATABASE_URL`/`TEST_DATABASE_URL` and an allowed `pi_t01`, `pi_ci` or `pi_integration` database. The test administrator needs permission to create the restricted test login/database. It refuses unexpected existing ownership, elevated privileges, role memberships or unrecognized populated data. It never changes existing passwords or drops a database.

The real CLI integration test also calls this helper, so a fresh CI service needs no pre-seeded state and no hidden test skip. Its fixed password is an explicitly fictional test fixture. Live/demo operator credentials come from the private environment file. The test companion is not a way to seed a private installation.
