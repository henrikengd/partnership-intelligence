# Self-hosting

Run one application process and one PostgreSQL database per organization. Docker Compose starts both without an AI service. The native development alternative uses Node 24 and PostgreSQL 18.

## Start a private installation

Clone the repository and enter its directory. Before the MVP PR merges, use its feature branch; the default branch may still contain the planning documents.

```sh
git clone https://github.com/henrikengd/partnership-intelligence.git
cd partnership-intelligence
```

Copy `.env.example` to an absolute private path outside the checkout. Set its permissions to 600. Generate three separate values with `openssl rand -hex 32` for `POSTGRES_PASSWORD`, `BETTER_AUTH_SECRET` and `BOOTSTRAP_SECRET`. Use hexadecimal database passwords so the Compose connection URL needs no extra URL encoding. Keep the environment file private.

For local use, set `BETTER_AUTH_URL=http://localhost:3000`, `APP_PORT=3000`, `ALLOW_INSECURE_HTTP=true` and `APPLICATION_MODE=live`. `DATABASE_URL` in the template is only needed for native development; Compose constructs its internal database URL from `POSTGRES_PASSWORD`. Leave `OPENAI_API_KEY` empty.

Use the same project name and environment file for every command against this installation:

```sh
docker compose --env-file /absolute/private/partnership.env -p partnership up --build -d
docker compose --env-file /absolute/private/partnership.env -p partnership ps
```

Open `http://localhost:3000/setup`. Enter the configured setup secret and create the first administrator using a password of at least 12 characters. Bootstrap succeeds once. Public signup is disabled. Sign in and open Onboarding from the dashboard or navigation.

Startup validates configuration, applies committed migrations and marks abandoned generation/AI runs interrupted. PostgreSQL has no published host port. The app binds to localhost, runs as the container's `node` user and stores records in the project's named database volume.

```sh
docker compose --env-file /absolute/private/partnership.env -p partnership restart
```

Restart preserves records. Keep the same project name to reuse its volume. Do not remove a needed volume. For updates, back up first, pull the intended release and rerun `up --build -d` with the same configuration. Applied migrations are forward changes; rolling back a container image does not reverse them.

## First useful workflow

This fictional example checks a fresh installation without importing personal data. Substitute your organization's configuration only after you have reviewed the private-data boundary.

1. In onboarding, save an organization profile named `Riverbend setup check` with mission `Community skills workshops` and a valid time zone, such as `Europe/Oslo`. Continue to Needs.
2. Save `Workshop fixtures` with description `Machine ten fixtures from supplied drawings`, category `manufacturing`, urgency `2` and partnership type `in_kind`.
3. In Import network, add company `Cedar Example Manufacturing` with a fictional website such as `https://cedar.example.test`. People are optional. Continue to Professional relationships.
4. Save evidence with claim `Cedar reports CNC machining capacity`, supplied-source URL `https://cedar.example.test/capabilities`, excerpt `Our fictional workshop operates CNC mills` and an observation date no later than today. Leave it supplied until a human reviews the claim.
5. Save a capability for Cedar with category `manufacturing`, description `Machining workshop fixtures` and that evidence. A shared category proposes fit; it does not prove the company can meet the complete request.
6. Skip existing partnerships and previous outreach when you have none. Review the graph, then continue to first-opportunity readiness. Generate the supported Cedar/fixtures brief. Without people, it clearly shows a cold approach and contact/access gaps.
7. On the detail page, inspect the sources and eight factors. Open the brief editor, assign yourself as owner and replace the ask with a concrete deliverable. Record a planned action with a relevant role, channel and follow-up date. Planning does not complete an action or send a message.
8. Open Pipeline or Overview to find the action. Continue onboarding through Finish onboarding when ready. All records remain editable afterward.

A reviewed fit, concrete ask, relevant target/role, permitted approach and next action are required before entering `pursuing`. Recording an actual sourced agreement can preserve a retrospective outcome without pretending that its outreach happened in the app. Employment and willingness records remain distinct. Read [the glossary](../CONTEXT.md) and [CSV import guide](imports.md) before importing your network.

## Invite and revoke access

Administrators create invitations in Settings and share the displayed link privately. Each random token is stored as a digest, bound to the invited email and role, expires after 72 hours and succeeds once. The recipient uses the exact invited email. No email service is required. Possession of the private link is the invitation mechanism; the app does not claim independent email verification.

All invited users can read the same permitted partnership records. Editors edit them; administrators also manage settings, access, exports and destructive deletion. Revocation and role changes delete prior sessions. Every private operation checks a live session and current account. Concurrent changes cannot remove the final active administrator. Network people are separate from login accounts.

Users change their password in Settings by supplying the current password. Other sessions are revoked. There is no public password-reset endpoint.

## Operator administrator recovery

Recovery requires private shell/database access and an existing administrator. Set `RECOVERY_EMAIL` and `RECOVERY_PASSWORD` through temporary private environment variables. The new password must have at least 12 characters. Keep it out of shell arguments, issues and shared logs.

```sh
docker compose --env-file /absolute/private/partnership.env -p partnership exec -e RECOVERY_EMAIL -e RECOVERY_PASSWORD app node --import tsx scripts/recover-admin.ts
unset RECOVERY_EMAIL RECOVERY_PASSWORD
```

The command replaces that administrator's credential, restores access and deletes its old sessions. It does not create an account or promote an editor. Native operators can use `npm run auth:recover` with their private application environment.

## HTTPS and reverse proxy

For an internet-facing installation, set `BETTER_AUTH_URL` to the exact public HTTPS origin and `ALLOW_INSECURE_HTTP=false`. Keep the app's localhost bind. A host reverse proxy such as Caddy can terminate TLS:

```caddyfile
partnership.example.org {
    reverse_proxy 127.0.0.1:3000
}
```

Replace the example hostname with a domain you control, point DNS to the host and permit ports 80/443 for the proxy. Caddy's [HTTPS quick start](https://caddyserver.com/docs/quick-starts/reverse-proxy) explains certificate setup. Its [reverse-proxy defaults](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy) ignore incoming untrusted forwarding values. Keep that direct-edge setup unless you separately configure and verify a trusted proxy chain. Do not publish PostgreSQL or bypass the app's origin checks.

Verify redirects, the configured HTTPS origin and `Secure` session cookies in the browser before loading real records. The localhost HTTP exception is for explicitly configured local development. Public DNS and certificate acquisition depend on the deployment operator; local Compose tests do not establish production TLS.

## Private operations and AI

Administrators review deletion impact in Settings before confirming. Generated history and personal narratives may be removed conservatively while structured outcomes/dates remain. Downloads contain private data even when spreadsheet formulas are neutralized. Read [retention and deletion](private-data-retention.md), [backup/restore](backup-restore.md) and [AI disclosure](ai-assistance.md).

AI stays disabled until an administrator enables a configured model and the operator supplies its server-only key. Each live request has an editable preview. The provider receives that exact approved packet; pseudonyms do not guarantee anonymity. Paid/live provider compatibility is not established by fake-provider tests. Supply no AI credential to the isolated demo.

Application logging suppresses development request URLs, action arguments and browser forwarding. Compose also limits PostgreSQL error detail and parameter/statement logging following the [PostgreSQL logging controls](https://www.postgresql.org/docs/18/runtime-config-logging.html). Keep operator/proxy/container logs private and give them an explicit retention policy. Administrator changes to logging or external services can create additional copies.

## Native development

Use `.nvmrc`, `npm ci` and a private PostgreSQL 18 connection. Set `DATABASE_URL`, auth/setup secrets, the exact local origin and its explicit HTTP exception. Then:

```sh
npm run db:migrate
npm run dev
```

See [development contracts](development-contracts.md) for the complete checks, test-only database gates and module boundaries. For a no-key fictional installation, follow [the separate demo runbook](demo.md).
