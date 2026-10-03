# T-03 worker verification

Verified on 3 October 2026 in `codex/pi-t03-onboarding`, based on `39138340dc618a5144dc8a017237933b0778d498`. Tests use only fictional examples in isolated PostgreSQL `pi_t01` at localhost:5541 and Chromium/app port 3103. No root/integration/graph database was modified. Later coordinator integration and remote CI remain separate checks.

## Acceptance evidence

| Criterion                                                 | Worker evidence                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resume, optional skip, later configuration edits          | PostgreSQL persists current step/skips; revisiting and continuing clears a skipped marker. Chromium reload resumes the people step, skips optional network/history, and reaches readiness. Profile and generic record editors remain in settings/record screens.                                                                                                           |
| Generic records and periods                               | Real DB checks save two custom/generic needs, multiple roles, separate current/former employment and an explicitly sourced known contact. All four templates resolve saved references. Chromium creates a partnership, edits it to ended state and records previous outreach with an actual date/source.                                                                   |
| Row errors and ambiguous duplicates                       | DB tests exercise ambiguous shared emails, same names, duplicate within-file identities, invalid references/dates and all four template validators. Source ID and email/domain matches require an explicit decision. No name merge occurs. Chromium maps differently named headers and shows a required-name error beside row 3.                                           |
| No-write cancel/invalid, atomic selection, retry/reimport | DB cancel and invalid decisions leave business tables unchanged; explicit exclusions save only valid selected rows. A temporary database constraint fails the second insert and proves the first rolls back. Concurrent confirms return one stored result; competing previews reject changed identity snapshots. Stable source-ID reimport updates without another record. |
| Upload limits and retained summaries                      | Unit tests reject >5 MiB and >5,000 rows, duplicate headers and invalid encoding, and prove multipart streaming is cancelled before unbounded decoding. Committed/cancelled/expired preview rows are empty; committed batches retain counts and record mappings. Expiry cleanup happens on the next import operation/page visit, with no background timer.                 |
| Supported brief or evidence task without a path           | DB readiness returns specific capability/evidence tasks, then a supported custom-category pair with zero people. Future/disputed sources do not establish readiness. Chromium generates a brief with a clearly identified cold approach after skipping people.                                                                                                             |

## Checks

Passed `npm ci`, `npm run lint`, `npm run typecheck`, `npm test` (13 unit tests), `npm run test:integration` (26 tests against real PostgreSQL), `npm run test:e2e` (3 Chromium workflows) and `npm run build`. `npm install --save-exact csv-parse@7.0.3` reported zero audit vulnerabilities. The parent has additional T-02 repair/T-04 tests and worker-scoped Playwright fixtures to reconcile during integration; this worker did not modify those unrelated files.

Database/browser checks use matching DATABASE_URL/TEST_DATABASE_URL, the isolated DB above, fictional test auth/bootstrap secrets, BETTER_AUTH_URL=http://localhost:3103, ALLOW_INSECURE_HTTP=true and E2E_PORT=3103. The production build uses the same isolated runtime settings. Local TCP/browser tests require the permitted elevated executor in this environment.

Next dev emitted its destination-stream-closed warning during interrupted navigation; all recorded endpoint/flow assertions and screenshots completed successfully. Production compilation succeeded. No claim is made about remote CI or deployment.

## Fictional screenshots and cleanup

Desktop and 390 px screenshots are outside the repository:

- `/private/tmp/pi-t03-import-desktop.png`
- `/private/tmp/pi-t03-import-mobile.png`
- `/private/tmp/pi-t03-onboarding-desktop.png`
- `/private/tmp/pi-t03-onboarding-mobile.png`

Screenshots were visually inspected. Controls, required-name errors and readiness are readable; the browser asserts no horizontal page overflow at 390 px. Playwright stopped its server; no listener remains on 3103. The external test database stays available. No private files, raw CSVs, backups or credentials are committed.
