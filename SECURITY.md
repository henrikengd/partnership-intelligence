# Security

Partnership Intelligence stores private relationship and outreach records. Each installation has one organization and an invited partnership team. Administrators manage access, settings, exports and deletion; editors read/edit the same permitted partnership records. The MVP has no per-record visibility rules.

## Reporting a vulnerability

Do not put secrets, personal records, exploit dumps or private screenshots in a public issue. Use the repository's private vulnerability reporting if GitHub offers it. If that channel is unavailable, contact the maintainer through a private channel you already use before sharing sensitive details. No separate security email or response-time guarantee is established.

For ordinary defects, file a public issue with a fictional reproduction. Include the source version and expected/actual behavior.

## Operator responsibilities

Use HTTPS for remote access, unique private secrets, restricted host/database access and tested backups. Keep one app process per installation. Keep logs, exports and backups private with explicit retention. Check source changes and dependencies before updating an installation with real records.

Never use the isolated demo as storage for real people. Seed/reset requires its separate database identity and marker. Keep production/test/demo databases and credentials separate. Test reset/provision commands require their explicit isolated database gates.

An invitation proves possession of its private link and requires the bound email; there is no independent email verification. Share invitations privately and revoke accounts promptly. Password changes and operator recovery revoke old sessions as described in [self-hosting](docs/self-hosting.md).

AI is off by default. Every live request requires an editable preview; the user can add private material to that packet deliberately. Pseudonyms reduce disclosure but do not guarantee anonymity. Strict output schemas and reference checks do not establish semantic truth. Humans review source support, contact relevance and outreach before acting. Read [AI disclosure](docs/ai-assistance.md).

Deletion removes matching dependent current material conservatively. Unknown aliases or unlinked narrative may need manual review. Deletion cannot erase separately retained copies. Follow [retention](docs/private-data-retention.md) and [restore](docs/backup-restore.md) procedures before reopening an older backup to users.

## Dependency advisory snapshot

On 2026-10-03, `npm audit --omit=dev` reported zero production advisories. The complete audit reported five high-severity dependency entries for one [braces stack-exhaustion advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), through the development-only Next.js ESLint glob tooling. The advisory lists no patched version and npm's latest braces is 3.0.3. The application does not pass imported records, user text or URLs to this development glob parser. Keep lint inputs to the trusted checkout. Do not apply npm's proposed forced downgrade of Next.js ESLint configuration without checking compatibility. Recheck the advisory and upgrade when a supported fix exists.
