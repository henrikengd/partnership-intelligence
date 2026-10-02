# Self-hosting

Each installation serves one organization. The foundation needs Docker Compose, a private environment file, and no AI account. Use Node 24.19 or a later Node 24 LTS patch for local development.

## Start a private installation

Copy `.env.example` to a private environment file outside the checkout. Set `POSTGRES_PASSWORD` to a generated hex password, and generate separate `BETTER_AUTH_SECRET` and `BOOTSTRAP_SECRET` values with `openssl rand -hex 32`. Do not reuse the example database password. Keep the file readable only by the operator.

For local use, set `BETTER_AUTH_URL=http://localhost:3000` and `ALLOW_INSECURE_HTTP=true`. Run:

```sh
docker compose --env-file /absolute/private/partnership.env up --build -d
```

Open `http://localhost:3000/setup`. Enter the configured setup secret and create the first administrator. Public signup is disabled, and the bootstrap is atomically limited to the first account. Sign in and save the organization profile under Settings.

The app runs migrations at startup. PostgreSQL has no published host port. Compose binds the app to localhost and stores PostgreSQL data in a named volume. `docker compose restart` preserves that volume. Do not use `down --volumes` on an installation whose records you need to keep.

For an internet-facing installation, use an HTTPS reverse proxy, set `BETTER_AUTH_URL` to its exact public HTTPS origin, and set `ALLOW_INSECURE_HTTP=false`. The proxy must replace, rather than append untrusted client-supplied forwarding headers. Keep PostgreSQL reachable only by the app and operator. Secure cookies use the configured HTTPS origin. HTTP exceptions only permit explicitly configured localhost development.

## Invite and revoke access

Administrators create invitations in Settings and share the displayed link privately. Each random token is stored as a SHA-256 digest, bound to the invited email and role, expires in 72 hours, and succeeds once. The recipient uses the exact invited email and then signs in. No email delivery service is required. An invitation holder proves possession of the private link; the app does not claim independent email verification.

Editors read and edit permitted partnership records. Administrators also manage organization settings and access. Revoking access deletes the user's sessions. Role changes also revoke prior sessions. All private operations check the current database account, rather than a cached browser role. Concurrent changes cannot remove the final active administrator.

Users change their password in Settings by supplying the current password. Other sessions are revoked. There is no public password reset endpoint.

## Operator administrator recovery

Recovery requires private shell access to the installation and database. Set `RECOVERY_EMAIL` to an existing administrator's login and `RECOVERY_PASSWORD` to a new password of at least 12 characters, through private environment variables. Do not put the password in an issue, commit, shell argument, or shared log. Then run:

```sh
npm run auth:recover
```

For Compose, pass these variables from the operator's environment and invoke the script inside the app:

```sh
docker compose --env-file /absolute/private/partnership.env exec -e RECOVERY_EMAIL -e RECOVERY_PASSWORD app node --import tsx scripts/recover-admin.ts
```

The command replaces the credential with Better Auth's password hashing mechanism, restores that existing administrator, and deletes its old sessions. It does not create an account or change an editor into an administrator. Clear the temporary variables after use.

## Local development and checks

Install the Node version in `.nvmrc`, then run `npm ci`. For native development, set `DATABASE_URL` to an operator-managed PostgreSQL 18 database and configure the same private auth variables. Use a private ignored `.env` file or export them into your development shell.

```sh
npm run db:migrate
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

Integration and browser tests reset only an explicitly isolated database. Set both `DATABASE_URL` and `TEST_DATABASE_URL` to the same dedicated database named `pi_t01`, `pi_ci`, or `pi_integration`. Never use a live organization database. Configure local auth variables and run:

```sh
npm run test:integration
npx playwright install chromium
npm run test:e2e
```

The browser smoke starts its own server on port 3101 by default; `E2E_PORT` overrides it. CI uses port 3100. `npm run db:generate` writes Drizzle migrations after schema edits. Commit SQL and metadata together. Do not edit an applied migration.

The full demo seed, import guide, backup/restore procedure, AI disclosure, and release instructions will be added by their implementation tickets. They are not operational features of the foundation.
