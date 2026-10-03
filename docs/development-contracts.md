# Architecture and development

The application is one TypeScript Next.js App Router process with PostgreSQL 18, Drizzle migrations, Better Auth database sessions and React Flow diagrams. Domain services use relational IDs and bounded graph traversal. There is no graph database, vector store, background agent platform or multi-organization tenancy.

## Repository layout

```text
src/app/             authenticated pages and HTTP routes
src/components/      forms, reviewed plans, accessible graphs and disclosures
src/modules/records/ domain validation and workspace reads/mutations
src/modules/imports/ bounded CSV parsing, preview and atomic commitment
src/modules/network/ graph projection, bounded paths and sourced history
src/modules/onboarding/ resumable setup and readiness tasks
src/modules/opportunities/ deterministic generation, factors, runs and review
src/modules/outreach/ owned activity, follow-ups, lifecycle and outcomes
src/modules/privacy/ impact plans, signed deletion, export and retention
src/modules/demo/    fictional dataset and guarded seed/reset
src/server/          database, auth, configuration, HTTP errors and optional AI
scripts/             migration, startup recovery and private operator commands
db/migrations/       committed SQL and generated Drizzle metadata
public/templates/    empty CSV import templates
tests/               fictional domain, PostgreSQL and Chromium regressions
docs/                contracts, runbooks and feature verification evidence
```

## Access and error boundary

Login users remain separate from network people. Better Auth stores credentials and sessions privately. Public registration is disabled; custom bootstrap/invitation services control account creation. `requireActor` checks a live session and current active user; `requireAdmin` additionally checks its role. Private domain entry points authorize their operations independently of page layouts. A page redirect is not API authorization.

Custom mutation routes require the configured origin and runtime validation. JSON bodies normally have a 16 KiB limit; AI/import confirmation have explicit bounded envelopes. `DomainError` exposes stable safe codes/messages. `jsonRoute` preserves approved non-JSON responses such as exports, maps validation/domain failures and logs only minimal internal-error metadata. Next development request/function/browser logging is disabled. Better Auth logging is disabled.

Bootstrap/access changes serialize with an auth advisory lock; destructive privacy/export transactions recheck an active administrator under that same lock before locking the organization. Invitation acceptance locks its single-use row. Do not expose additional Better Auth endpoints without an access-policy review.

## Records and evidence

`src/server/db/index.ts` exports `db`, `pool`, schema tables and `Database`. Schema ownership is centralized in `schema.ts`; migration SQL, snapshot and journal belong to the same change. Domain rows use organization FKs, UUIDs and UTC timestamps. The organization is a singleton. People can have several internal/contact affiliations. Employment is person-to-company; acquaintance is person-to-person. Shared employment never creates an acquaintance edge.

`saveRecord` validates generic records and references. `saveRecordInTransaction` is an internal seam for atomic imports, not permission to bypass actor/context checks. Evidence retains a claim, supplied excerpt or attributed observation, dates, recorder and review state. URLs are references only and are never fetched. Supplied claims remain unreviewed. Conflicting, future or superseded material does not become current supporting evidence.

Mutations serialize on the organization row. Input changes conservatively advance affected opportunity input revisions and invalidate readiness. `lockWorkspace` also rejects a stale privacy revision and replaces the context's organization with its current locked row. Use organization-before-opportunity-before-activity ordering. An operation queued before deletion must not save its old private material afterward.

## Relationship paths and priority

Traversal admits bounded current routes with no more than two people, ranks up to three and keeps historical leads separate. Cycles terminate. Dates, evidence review, reported strength and dated willingness remain on edges. Employment does not prove a manager connection or authority. A refusal blocks that route; an old affirmative willingness record still needs reconfirmation.

Graphs have relational text equivalents and native keyboard-accessible disclosures. A graph canvas mounts after its container is visible and measured. Current record comparisons remain distinct from immutable assessment route snapshots.

`scoring.ts` defines rubric v1 with values 0–4 or unknown and weights relationship25, fit25, access10, incentive10, feasibility10, previous5, evidence10 and urgency5. Priority is the sum of `weight * value / 4` for known values. Coverage is the sum of their weights; unknowns earn no points and are not renormalized. A human value requires rationale and evidence or an explicit organization assessment. It is never a success probability.

## Proposals, review and generation runs

An active company/need/type tuple has one opportunity, enforced by PostgreSQL. Regeneration appends an immutable assessment and preserves human factors, manual brief fields, owner and activity. Declined/archived proposals can link to deliberately created later opportunities. Historical assessment versions are never relabelled as current inputs by a factor review.

Deterministic runs evaluate one active need and at most 20 saved companies. Supported capabilities or evidenced incentives determine automatic candidates; explicit selection can expose unsupported gaps. Cash has no match-all shortcut. Prior declines and ongoing discussions require visible acknowledgment. Exact active-opportunity refresh updates that proposal; it does not create another discussion.

`reviewOpportunity` binds readiness to the assessment, input and manual revisions. Pursuing requires reviewed fit, a concrete ask, a relevant target/role, an allowed approach and a next action. A named warm target must be the selected route's terminal person. Cold approaches can be explicitly reviewed. The current reviewed plan shows contact, route, ask and action separately from a historical plan.

Runs persist request/selection/fingerprint, revision, status, attempt and safe error metadata. Work is synchronous in one server process. Startup `runs:recover` marks abandoned deterministic and AI runs interrupted before serving requests. Recovery never runs inside a route or build import. One explicit retry is permitted. There is no durable queue or cross-process execution lease; operate one server per installation.

## Outreach and outcomes

An active login account owns the opportunity. Planning and actual completion differ. Completed activities retain an explicit user-supplied occurrence date separately from their recording timestamp; old unknown dates stay unknown. Follow-up dates use the organization's time zone. Rescheduling reopens a resolved follow-up marker. Dashboard/Pipeline exclude closed work from due-action reminders.

Lifecycle transitions preserve event history and closure/reopening reasons. A confirmed sourced agreement links or creates one same-company partnership idempotently. Retrospective actual agreements remain recordable without fabricating a prior readiness review or completed outreach. Partner contribution periods are independent of the actual agreement date. No activity or outcome sends email.

## Imports, privacy and AI

CSV supports people/affiliations, companies, relationships and partnerships. Limits are 5 MiB and 5,000 rows. Preview/mapping/error/exclusion comes before writes. Exact source IDs/emails/domains establish candidate identity; names never do. Commitment preflights selected rows under the organization/batch locks, applies them atomically and records an idempotent result. Uploaded files are not stored. Pending normalized rows expire after one hour and clear on the next relevant operation or admin retention action.

Privacy previews bind actor, organization, person, current impact digest, privacy revision, expiry and request ID. Confirmation checks current impact under the lock. Removal includes anchored historical aliases, generated snapshots, AI/review references, related mappings and personal narratives. Structured outcomes/dates remain coherent. Assessment-less detail/pipeline pages remain readable and can regenerate the same active proposal. Audit contains identifiers/counts, not names or full narrative. Exports use an explicit domain allowlist and neutralize formula-like cells. See [privacy contracts](privacy-contracts.md) and [retention](private-data-retention.md).

AI is optional, server-key-only and administrator-configured. Context is bounded to 12,000 characters with minimal pseudonymous references; every live request has an editable exact preview and explicit approval. The local legend is not sent. One Responses API call has a 60-second bound including response consumption, 2,000 output tokens and a bounded raw response. No tools, background work, URL fetching or automatic retry. Structured output/allowed references and contact-route checks reject invalid drafts; those checks do not establish factual support. All explanations remain inferences awaiting review. Fake-provider injection is test-only. AI never replaces facts, scores, readiness, manual edits or outreach. See [AI disclosure](ai-assistance.md).

## Demo and verification

Default mode is live. Demo CLI requires matching explicit URLs, its actual restricted `pi_demo` write-pool identity, local origin, no AI key and empty seed or a matching persisted fictional marker. Reset additionally requires explicit confirmation and no active non-operator connections. Interrupted rebuilds retain a recoverable marker. No HTTP reset endpoint exists. See [demo commands](demo.md).

Use Node from `.nvmrc` and `npm ci`. Run lint/types/unit/build. PostgreSQL/browser checks require identical `DATABASE_URL`/`TEST_DATABASE_URL` on isolated `pi_t01`, `pi_ci` or `pi_integration`. The companion provision helper refuses unexpected roles/ownership/privileges/data and creates only fictional restricted infrastructure. Database and browser suites share resettable records, so run them sequentially. Never share an agent's database/server or run dev/build against one `.next` directory concurrently.

For migrations, generate from the latest integrated metadata and coordinate ownership before parallel edits. Do not modify applied migrations. Tests must exercise meaningful failure/concurrency/state paths and contain only fictional data. Production Docker/backup acceptance is recorded separately from local source checks. See [contributing](../CONTRIBUTING.md), [self-hosting](self-hosting.md) and [backup/restore](backup-restore.md).
