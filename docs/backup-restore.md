# Backup and restore

A database backup contains private network data, historical assessments, imports, AI packets, outcomes and authentication records. Store it outside the checkout with operator-only permissions and your own encryption/access/retention controls. Preserve the private environment file and required secrets separately. Never attach a backup to a public issue or CI artifact.

These commands use the private installation from [self-hosting](self-hosting.md). Keep the same source version, project name and environment file. PostgreSQL's [custom dump format](https://www.postgresql.org/docs/18/app-pgdump.html) supports restoration with `pg_restore`.

## Back up a consistent installation

Stop the app to prevent new partnership/auth writes during the backup. The database stays running.

```sh
umask 077
docker compose --env-file /absolute/private/partnership.env -p partnership stop app
docker compose --env-file /absolute/private/partnership.env -p partnership exec -T db pg_dump -U partnership -d partnership --format=custom > /absolute/private/partnership.dump
docker compose --env-file /absolute/private/partnership.env -p partnership up -d app
```

Check the dump command's exit status before treating the file as a backup. If it fails, preserve the installation and investigate; an empty/partial file is not a usable backup. Restart the app even when a backup attempt fails once it is safe to do so. Record the source commit/version and the backup time privately.

A backup is not proven until it restores. Test regularly against a separate database/volume and verify actual records and behavior. Do not use an authentication-only fixture as evidence that partnership data restores.

## Restore into a separate empty project

Use the source version associated with the backup. Copy the private environment file to `/absolute/private/partnership-restored.env` with permissions 600. Retain `BETTER_AUTH_SECRET` for the restored auth data, keep its database password configured consistently and set a separate local `APP_PORT=3001` with `BETTER_AUTH_URL=http://localhost:3001` and `ALLOW_INSECURE_HTTP=true` for validation. Keep the restored service private.

Use a new project name whose database volume has never held records. Start only its database, then restore before starting the app:

```sh
docker compose --env-file /absolute/private/partnership-restored.env -p partnership-restored up -d db
docker compose --env-file /absolute/private/partnership-restored.env -p partnership-restored ps
docker compose --env-file /absolute/private/partnership-restored.env -p partnership-restored exec -T db pg_restore -U partnership -d partnership --no-owner --no-privileges --single-transaction --exit-on-error < /absolute/private/partnership.dump
docker compose --env-file /absolute/private/partnership-restored.env -p partnership-restored up --build -d app
```

Wait for the database health check before restoring. An existing populated target is an error, not a reason to add `--clean` or drop a live database. The [restore options](https://www.postgresql.org/docs/18/app-pgrestore.html) omit original ownership/grants and fail the transaction on an error. The target login owns restored objects. These app/database dumps do not include cluster roles; the new Compose project supplies its own database login.

Startup applies missing migrations and marks abandoned generation/AI runs interrupted. Existing sessions and rate counters are sensitive restored data. Sign in using a known permitted account, or use the documented operator recovery to revoke its old sessions. Interrupted runs require deliberate retry with a fresh valid context; startup never sends outreach or performs a provider request.

Before adopting a restored installation, verify:

- Organization profile, time zone, needs, people, affiliations, companies, sources and relationships.
- Current/historical graph paths, factor values and provenance, assessment versions and manual brief edits.
- Owners, planned/completed actions, occurrence/follow-up dates, lifecycle events and linked partnerships.
- Import mappings, review decisions, retained AI history and privacy/audit metadata where present.
- Live authorization, editor/admin boundaries and continued demo-reset refusal for a private installation.

Restore validation may itself create sessions/audit records, so compare backup table counts/digests before starting the app when exact snapshot comparison is needed. A successful import alone is insufficient proof of continued application behavior.

## Retention and deleted people

Deleting current personal material does not erase old backups, downloaded exports or provider copies. Keep a private deletion/retention policy. Prefer a backup made after the deletion; if you restore an older backup, keep the app inaccessible until the administrator reapplies relevant deletions and checks generated history. Retire retained copies according to your policy. See [private-data retention](private-data-retention.md).

Leave the original installation and volume intact throughout validation. After a successful restore, explicitly plan any production cutover and HTTPS origin changes. This runbook does not deploy or delete an existing installation.
