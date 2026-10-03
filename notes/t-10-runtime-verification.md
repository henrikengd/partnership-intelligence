# T-10 isolated operating verification

This records local fictional runtime proof. Remote CI, final feature review, TLS/public DNS, live AI and PR publication are separate coordinator checks. No real organizational data was used.

## Source and installation

The cold checkout `/private/tmp/pi-release-source` was created with a new local `git clone --no-local` from the assigned delivery worktree. It adopted the committed operating/configuration handoff `b2cab695f8aac6bbffb736ae8821c382df60a9d3` through the worker's equivalent prerequisite commit `f9c5a93`; application source was the previously verified `8c1bc0dc6e4f0574cf5057b4936e391f5f961ed4`. This was a fresh local clone of the unmerged feature, not a claim that remote main already contains a released app.

The exact committed self-hosting, backup/restore and demo runbooks were followed using private mode-600 environment files and unique generated passwords/secrets outside Git. A single Compose app/PostgreSQL project `pi-release` ran on localhost3110. The database had no published host port. Separate projects/volumes `pi-release-restore` (3111) and `pi-release-demo` (3115) never shared the private database. The dedicated Colima Docker context/config was supplied per command; the user's global Docker context/config was not changed. Root's integration database on5540 was untouched.

Actual Docker build, migrations, startup and restart succeeded with Node24.19.0, PostgreSQL18.6, the lockfile dependencies and production standalone Next.js output. The available classic Docker builder warned that buildx was absent; the build succeeded. No claim of an all-dependency clean audit is made: the coordinator records the latest tooling advisory and production-only audit separately.

## First useful workflow

Actual Playwright UI interaction created the first administrator at `/setup`, then signed in. No fixture provisioned or bypassed administrator authentication. The UI saved `Riverbend setup check`, mission `Community skills workshops`, Europe/Oslo, `Workshop fixtures` manufacturing need, `Cedar Example Manufacturing`, the supplied CNC claim/excerpt/URL/observation date and its capability. Optional partnership/outreach steps were skipped explicitly. Graph/readiness led to the first deterministic opportunity, which clearly showed supplied/unreviewed evidence and no established introduction. The UI assigned its administrator owner, edited the ask, recorded a planned action without marking it sent and completed onboarding.

The first automation run expected an obsolete cold-route label, and a subsequent continuation expected an incomplete link label. These were test-selector errors; the actual records were retained and the last phase resumed through the UI without resetting the installation. The committed fresh helper uses the shipped labels. Early screenshots caught transient loading UI and were replaced with settled heading/network-idle screenshots. These intentional correction runs are distinct from the passing final browser logs.

## Full-record persistence and restore

The guarded helper then augmented the existing UI-created organization through authorized application services. It added one fictional alumni/advisor, reviewed employment evidence/path, two committed import batches/mappings, ended partnership and previous outreach, immutable assessments and human factor provenance, readiness review, edited value exchange, completed action with actual occurrence2020-01-15 and unresolved follow-up2020-02-01, actual confirmed agreement2020-03-01 and linked contribution beginning2020-04-01. A fake injected provider produced stored AI history; no provider network call or live key was used. A private export operation created the minimal audit row. Human readiness review intentionally replaced the earlier proposed approach; the edited value exchange and ask were preserved.

The fake draft initially included the word `release-check`, which correctly matched fictional person's surname `Release` and was rejected as PRIVATE_DRAFT. Removing the fixture-only wording and making an explicit retry completed it. A separate completed attempt-one fake run was retained for the later interruption proof. No product validation was relaxed.

Restart preserved actual authentication, graph,46.25 priority points/100 with55% scoring coverage, manual value exchange, private supplied source marker, historical assessments, completed/planned actions and linked agreement. Operator recovery used the documented container script: old password rejected, saved old browser session returned401, new password signed in through the UI.

The helper labelled one generation and one fake-AI run artificially running. The app was stopped before snapshot/dump. This is controlled fixture manipulation, not a crash simulation. `pg_dump --format=custom` succeeded into a mode-600 file outside Git (106295 bytes; SHA256 `923e0245180152736018fe735c3a91204e3dbfeebe031ad2164fd7bc3dd52070`). Only the new restore database was started; its public/drizzle table count was verified zero before `pg_restore --no-owner --no-privileges --single-transaction --exit-on-error` succeeded.

Before restored app startup, all31 public/drizzle tables matched exactly in count and canonical ordered record SHA256 digest:55 rows across27 nonempty tables. Combined canonical summary SHA256: `5ce5af2502f345c9343fa9a52ba1532a9fbddb0b241a85a9168a65ef685e7cf2`. This includes auth credentials/sessions/rate counters,10 migration rows, domain records, import mappings, historical assessments, review/event/activity/partnership data, AI configuration/runs and audit. Snapshots emit only counts/digests, not private row contents.

Actual restored startup marked both artificial runs interrupted. Deliberate generation and fake-provider retries completed at attempt2, retained a single opportunity and coherent agreed outcome, manual value exchange and actual activity date. The retry's final assertion initially expected the pre-review proposed approach; that test expectation was corrected to the actual human-reviewed plan, without changing product data. Restored browser checks passed for login, current graph/person/company, score/coverage, versions, fake-AI completed history, editable private supplied excerpt, completed/planned actions and outcome dates.

## Demo and logging boundaries

The separate documented demo Compose database/login initialization, migrations and seed succeeded without an AI key. Actual login displayed the fictional banner and expected8 opportunities. While actual authenticated API requests kept app DB connections active, reset was refused. After stopping only the demo app, guarded reset succeeded, rebuilt12 people/6 companies/4 needs/8 opportunities, and the old browser session returned401; new login worked. A preliminary reset attempt while the running app was idle had no surviving DB connections and was permitted by the active-connection guard. The documented operating procedure remains to stop the app first. The actual refusal proof used active authenticated connections.

The same demo-reset command was refused against the private installation. All31 private table digests remained unchanged. A parameterized fictional NOT NULL failure was rejected; PostgreSQL container logs contained the error category/message but did not contain `RELEASE_LOG_PRIVATE_MARKER`, proving the committed terse/zero-parameter/no-ordinary-statement logging defaults in this local runtime.

## Evidence and remaining coordinator checks

Private evidence is outside Git: `/private/tmp/pi-t10-*` logs/screenshots, `/private/tmp/pi-release*.env`, browser states and the custom dump. Settled fictional screenshots inspected: `pi-t10-fresh-desktop.png`, `pi-t10-fresh-mobile.png` (390px, no horizontal overflow), `pi-t10-restored-desktop.png`, `pi-t10-demo-desktop.png`. The dashboard screenshots were recaptured after restore/augmentation, so they show the richer fixture, not an empty first-run dashboard. Backups and raw browser state are not public artifacts.

Helper lint, TypeScript and all33 existing unit checks passed. An unconfirmed fixture invocation was refused before mutation; all31 table digests stayed unchanged. Source repair adoption, final rebuilt-source runtime smoke and container stop status will be recorded below before handoff. The coordinator owns complete feature checks/review, current remote CI, release evidence mapping and final issue/PR state. No public deployment or merge was performed.
