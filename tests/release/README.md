# Fictional local release checks

These helpers verify a separately provisioned fictional Compose installation. They are operator-invoked checks, not normal tests, a setup endpoint, or a provider integration. Do not point them at real organizational data. Ordinary CI uses the isolated integration/E2E fixtures instead.

The browser helper permits only `http://localhost:3110`, `:3111` and `:3115`, with explicit `RELEASE_CHECK_CONFIRM=fictional-release-only`. Supply the fictional administrator password as `RELEASE_ADMIN_PASSWORD` in the private operator environment. The fresh check also requires the private `BOOTSTRAP_SECRET` and an empty installation. Never place those values in arguments or committed files.

From a checkout with `npm ci` and Playwright Chromium installed:

```sh
node --import tsx tests/release/browser-check.ts fresh
node --import tsx tests/release/browser-check.ts restored
node --import tsx tests/release/browser-check.ts demo
```

Set `RELEASE_BASE_URL` to the relevant permitted local URL first. `fresh` creates the administrator through `/setup`, signs in, completes onboarding, adds the documented fictional need/company/source/capability, creates the first opportunity, assigns its owner and records a planned action. It never resets a database. `restored` verifies the richer fixture's actual auth, graph, score, historical assessments, edited brief, completed action, outcome and private supplied source in the UI. `demo` signs in as `demo-admin@riverbend.example.test` using the configured demo password and verifies the banner. `demo-old-session` checks the saved demo session is invalid after an operator reset. `recovery` requires `RECOVERY_PASSWORD` and checks old session/password rejection and actual new-password login after the documented recovery command.

`finish-fresh` resumes the last phase after a test-only interruption once its single documented opportunity exists. `capture` records a settled dashboard. Neither creates an account. Screenshots, storage state and failure diagnostics go to `/private/tmp` and remain outside Git; treat these as private artifacts and remove them according to your retention policy.

The service helper `scripts/test-only/release-check.ts` additionally requires the actual Compose database/login `partnership`, hostname `db`, a localhost application URL on 3110/3111, live mode, exactly the documented fictional organization/administrator/company/need, and no unrecognized people. It refuses other targets. Run it in a one-off app container with `RELEASE_CHECK_CONFIRM` and `RELEASE_ADMIN_PASSWORD` passed from the private operator environment. To check a cold clone whose image predates these test files, bind-mount this helper read-only at `/app/scripts/test-only/release-check.ts`; its relative application imports then use the image's real source and dependencies.

Commands:

- `augment`: only once after `fresh`; uses existing authorized domain services to add one fictional alumni/advisor, employment evidence/path, committed people/partnership import mappings, past outreach, reviewed factors/readiness, an edited brief, completed action, confirmed agreement and linked contribution, a completed draft through an injected fake provider, and a minimal export audit. No network provider request runs.
- `snapshot`: no login or mutation; emits only each public/drizzle table's count and canonical ordered record SHA256 digest. Stop the app and other writers first. Use it before backup and after restoration, before app startup changes run states or sessions.
- `abandon`: labels an existing generation and fake-AI run as artificially running to test actual startup recovery. It is fixture manipulation, not a crash simulation.
- `retry`: requires actual startup to have marked both artificial runs interrupted; deliberately retries generation and the injected fake provider, verifies no duplicate opportunity and preserved outcome/edited value exchange/activity date.
- `logging-probe`: submits a parameterized fictional NOT NULL failure and verifies rejection. The operator separately inspects PostgreSQL logs to confirm `RELEASE_LOG_PRIVATE_MARKER` is absent.

These helpers do not implement backup, restore, TLS, Docker setup, live provider access, or destructive reset. Follow the committed self-hosting, backup/restore and demo runbooks. Keep databases, passwords, backups, exports, browser states and logs outside the repository.
