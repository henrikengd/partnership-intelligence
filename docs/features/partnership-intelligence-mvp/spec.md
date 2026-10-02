# Partnership Intelligence MVP specification

- Feature: `partnership-intelligence-mvp`.
- Revision: `r1`, 2026-10-02.
- Status: approved for issue publication.
- Tracker: GitHub Issues in `henrikengd/partnership-intelligence`.
- Parent specification: [#1](https://github.com/henrikengd/partnership-intelligence/issues/1). Published children: see [publication record](publication.md).
- Scope: [scope.md](scope.md).

## Approval and source contract

The user approved progression from the saved scope with "Nice. Lets make a github repo called partnership-intelligence under my user and prepare issues" on 2026-10-02. This explicitly authorizes repository creation and publication of the implementation plan. Under Prepare's explicit-publication exception, no second approval is required. It does not authorize application implementation, implementation branches, deployment, or merging.

The earlier scope, its three explicit user answers, [CONTEXT.md](../../../CONTEXT.md), and [architecture research](notes/architecture-research.md) are source material. This revision makes the earlier implementation proposals concrete. Official documentation establishes feasibility, not implemented behavior. No prototype was used. The repository contains planning documents and an initial remote README, with no application or existing test seams.

Preparation adopts the proposed single TypeScript application, PostgreSQL, Drizzle, React Flow, and optional AI adapter. MIT is the previously proposed license default and is included in repository setup. Authentication is specified below. Exact supported dependency versions are to be selected and locked in T-01, rather than assumed from research snapshots.

## Intended behavior and exclusions

An invited partnership team can enter its needs and private network, inspect evidence-backed company matches and introduction paths, review a transparent partnership brief, and track the resulting action and outcome. Every installation serves one organization. People in the network do not need accounts.

Preserve the scope's exclusions: multi-organization hosting, record-specific sharing, member self-service, LinkedIn scraping, open web discovery, arbitrary URL fetching, autonomous email sending, CRM/inbox integrations, agent swarms, learned success probabilities, and a dedicated graph/vector database.

## Observable requirements

| ID | Pass condition |
| --- | --- |
| F-01 | A fresh installation starts one app and PostgreSQL from documented configuration, applies migrations, and retains records across restart. No AI service is required. CI runs real project checks. |
| F-02 | A secret-gated first-admin bootstrap works once. Public registration is disabled. Admin-created, expiring, single-use invitations establish admin/editor accounts. Every private read and mutation checks a live session and appropriate role. Revoked users lose access. |
| F-03 | Users can create/edit organization profiles, needs, people, multiple organization roles, companies, company capabilities, relationships, evidence, and existing partnerships using generic forms. Network people and login users remain separate. Invalid references and dates are rejected. |
| F-04 | Claims retain source/excerpt or attributed observation, dates, recorder, and review state. Facts, inferences, and unknowns are visually distinct. A URL or valid evidence ID alone never verifies a claim. Conflicting or superseded material marks dependent assessments for review. |
| F-05 | Onboarding resumes after interruption, permits optional-step skips, previews the graph, explains readiness, and reaches a first opportunity or specific evidence-gap tasks. Organization configuration is editable afterward. |
| F-06 | CSV templates support people/affiliations, relationships, companies, and partnerships. Mapping/preview occurs before writes. Errors and ambiguous duplicates are actionable. Cancel leaves the database unchanged. Confirmed valid imports commit atomically and retry without duplicating records. |
| F-07 | Company/opportunity views show up to three bounded current introduction paths, with dates, evidence, strength, and missing willingness. Historical paths are separate. Cycles terminate. Employment at the same company never creates an invented acquaintance or decision-maker connection. A textual path equivalent accompanies the graph. |
| F-08 | Eight factors use values from 0 to 4 or unknown under the versioned rubric below. Priority and coverage use the documented formulas. Every factor exposes its rationale, origin, and evidence. Unknowns remain unknown; no displayed number represents a success probability. |
| F-09 | A deterministic run evaluates up to 20 known companies for one active need. Capability/incentive evidence or explicit user selection determines candidates. Previous declines and active discussions are visible. At most one active opportunity exists per company/need/type, including concurrent retries. |
| F-10 | Opportunity detail explains why, who, via whom, ask, value exchange, and approach. It separates facts/inferences/questions, supports review and edits, and records assessment versions. Regeneration preserves manual edits and activity. Changed inputs flag stale assessments. |
| F-11 | Users assign an active owner, plan/complete an introduction or outreach activity, record target person/role and channel, and set a follow-up date. Planned and completed actions differ. The dashboard shows due/overdue follow-ups. No action sends email. |
| F-12 | Opportunity states are suggested, shortlisted, pursuing, agreed, declined, archived. Reviewed fit, concrete ask, relevant target/role, and next action gate pursuing. Agreement links or creates a partnership. Decline/archive reasons and reopening preserve history. |
| F-13 | Optional AI drafts briefs and outreach text from a bounded evidence packet. Output validates against the allowed schema and IDs. Unknown contacts, unsupported claims, malformed output, timeout, refusal, and incomplete responses are handled without losing data. Deterministic mode still works. |
| F-14 | AI is disabled until an admin enables it. Each live request has an editable context preview with no personal names/contact details or full graph by default. Pseudonymous metadata stays minimal. Untrusted source text cannot change instructions, call tools, set scores, or write records. |
| F-15 | Only admins export or execute destructive deletion. Person deletion removes related private snapshots/material and invalidates affected assessments. Exports neutralize spreadsheet formulas. Logs contain minimal operational metadata. Credentials, uploads, exports, backups, and real data stay outside public source. |
| F-16 | An isolated fictional Riverbend Community Workshop demo contains 12 people, 6 companies, 4 needs, 3 current/past partnerships, and at least 8 opportunities covering warm/cold paths, missing/conflicting evidence, former employment, decline, and follow-up states. No AI key is needed; seed/reset cannot modify a live instance. |
| F-17 | Main screens work by keyboard and at a 390px viewport, with labelled fields, visible focus, readable errors, and no horizontal page overflow. Graph information is available without color or pointer interaction. Empty/loading/error/retry states support the central workflow. |
| F-18 | README/self-hosting/import/privacy/contribution/security guidance explains fresh setup, configuration, private-data boundaries, admin recovery, AI disclosure, TLS, backup/restore, and demo use. Another operator can complete setup and the first useful workflow using the docs. |

## Implementation contracts

### Application and access

Use Next.js App Router with server domain services, PostgreSQL and Drizzle, React Flow, runtime validation, and one optional AI-provider boundary. Use npm with a committed lockfile; T-01 selects a supported Node LTS and pins the supported runtime. React graph state is a projection, not persistence.

Choose Better Auth with email/password authentication and database sessions. Its official documentation covers [email/password](https://better-auth.com/docs/authentication/email-password), [sessions](https://better-auth.com/docs/concepts/session-management), and a [Drizzle adapter](https://better-auth.com/docs/adapters/drizzle). The invitation and role policy is application behavior; do not assume that enabling a library makes public signup safe. Registration endpoints must enforce the application invite/bootstrap gate, including direct requests.

Bootstrap requires a server-side one-time setup secret and an atomic first-admin condition. Invite tokens are random, stored hashed, bound to the intended login identifier and role, expire after 72 hours, and are single-use. Admins share links manually; there is no email delivery dependency. Provide current-password account changes and a documented operator recovery command using library mechanisms. Do not offer an insecure password-reset endpoint. Protect the last active administrator from removal. Server authorization observes role/account revocation without relying only on UI or stale cached claims.

Admins manage profile/AI configuration, users/invitations, bulk exports, and destructive deletion. Editors read permitted records and create/edit operational records, briefs, and activity. Both see the same permitted network. General archive behavior is available to editors; destructive deletion is admin-only. Internet-facing deployments require HTTPS and secure cookies. Use the auth library's established hashing/session protections rather than custom cryptography.

### Records, relationships, evidence, and dates

Use UUID record IDs, foreign keys, audit timestamps, and UTC instants. Due dates are calendar dates interpreted in an editable organization time zone. Estimated monetary values use decimal storage with a currency code; absent value is null.

Use a Person record plus organization affiliations/roles. Contact roles/title and employment dates attach to person/company connections. Professional relationships use explicit person/company foreign keys; acquaintance relationships use explicit source/target person foreign keys. Database checks enforce permitted combinations and prevent self-links. Organization affiliations provide organization/person edges. Partnership and outreach records generate history edges. Do not introduce unconstrained polymorphic IDs or duplicate writable history edges.

Store current/ended/unknown professional state and effective dates separately from personal familiarity. Organization membership and employment establish affiliation; they do not prove an introduction is possible. Personal connection strength is a reported ordinal value with recorder/evidence and may be unknown. Introduction willingness is yes/no/unknown with a date and source; old willingness is not automatically current.

Evidence contains the supported claim, source type, URL/attribution, supplied excerpt, observation date, review state, and optional review date. Review states distinguish supplied, reviewed, disputed, and superseded. Runtime validation handles missing sources and unsafe URL schemes. No server-side source fetching. Revisions to relevant evidence/needs/relationships invalidate current assessments for review without rewriting prior reviewed history.

### Opportunity and run contracts

Opportunity uniqueness is organization/company/primary-need/partnership-type for active states. Archived and declined history remains readable; explicitly starting a new proposal links prior history. Enforce the rule transactionally, not only in UI checks. Assessment revisions are immutable; manual brief edits are separate user-owned fields and are never overwritten by automatic generation.

Domain interfaces must expose typed inputs/results for path finding, assessment, candidate generation, review, activity, and AI context. T-02 introduces these seams before later work. The UI must not perform its own hidden scoring calculations.

A generation run records requester, need, selected candidates, input revision, status, start/end time, and error category. Deterministic runs complete from recorded data. AI generation is requested for individual candidate briefs. Process at most 20 candidates per run, one provider request at a time, with a 60-second per-call timeout, at most one explicit retry, and a proposed maximum outbound context of 12,000 characters and 2,000 output tokens. Provider models are configurable, never hardcoded to a volatile model name. If the selected provider needs another unit for its output limit, keep the equivalent bound explicit.

Do not claim an in-process task is durable. A restart marks abandoned runs interrupted/failed and permits explicit idempotent retry. Do not add Redis or a background service in the MVP unless actual deployment verification demonstrates a requirement and the user accepts that scope change.

### Scoring policy v1

Factors are 0, 1, 2, 3, 4, or null for unknown. Human-entered assessments require a rationale and evidence/source or an explicit organization assessment where relevant. AI suggestions are commentary awaiting review, not score inputs. Missing evidence is null unless contradictory evidence positively supports a zero. Urgency can use a recorded organizational priority; source IDs are not required for an internal deadline.

| Factor / weight | 0 | 1 | 2 | 3 | 4 |
| --- | --- | --- | --- | --- | --- |
| Relationship / 25 | Reviewed network has no usable route | Only a historical or weak lead | Current company connection, introduction unconfirmed | Current relevant personal route, willingness unconfirmed | Current direct relevant route with explicit willingness |
| Fit / 25 | Confirmed mismatch | Broad sector relevance only | Some relevant capability with unresolved requirement gaps | Specific supported capability with minor gaps | Supported capability meets the defined need |
| Decision-maker access / 10 | Known route is irrelevant or unavailable | Generic channel only | Relevant role identified, person/access unconfirmed | Known relevant person, authority/access partly unconfirmed | Relevant person, authority, and permitted route verified |
| Incentive / 10 | Documented conflict | Plausible general benefit | Supported alignment with organizational/company goals | Specific benefit linked to evidenced company priorities | Concrete mutual exchange confirmed in relevant history or discussion |
| Feasibility / 10 | Confirmed impossible timing/scope | Major evidenced constraint | Ask defined, major feasibility questions remain | Deliverable/timing defined with minor constraints | Deliverable, timing, and required inputs supported |
| Previous relationship / 5 | Relevant adverse experience | Ended/weak collaboration with issues | Reviewed history has no prior partnership | Positive older collaboration | Recent positive collaboration |
| Evidence / 10 | Material contradiction or reviewed unsupported basis | Attributed but weak/outdated claim | Specific supplied evidence with review gaps | Reviewed current fit and relevant route claims | Reviewed current central claims and cross-checked critical details |
| Urgency / 5 | Recorded low urgency, no deadline | Low urgency with a later deadline | Recorded normal priority | Recorded high priority | Explicit near-term critical deadline/priority |

Priority = sum of `weight × known factor / 4`, with no unknown contribution. Coverage = sum of weights of known factors. Do not renormalize. Show points out of 100, coverage, unknowns, and review state separately. Preserve full precision for sorting; display at most two decimals. Tie-break by coverage, nearer known deadline, then stable ID. The fixture with fit=4, relationship=3, urgency=2 yields 46.25 points and 55% coverage.

Route ranking uses currentness, supported relevant connections, the weakest applicable personal edge, explicit willingness, shorter route, and stable ID. Missing strength stays unknown. Include at most two person intermediaries and no cycles; return at most three routes. A shared employer never implies that two people know each other. Historical records remain leads to verify and never produce a verified current route.

Research needed, needs review, and ready for action are review states distinct from workflow lifecycle. User review of fit, a concrete ask, relevant target/role, and next action is required before pursuing. Unknown personal access permits a clearly identified cold approach. No automatic High/Medium/Low thresholds or custom weight editor.

### Imports and AI privacy

CSV uploads are capped at 5 MiB and 5,000 rows per batch. Use four documented templates for people/affiliations, relationships, companies, and partnerships. Optional source IDs support reimport. IDs or exact email/domain can propose a duplicate; a matching display name alone cannot merge records. Commit a confirmed batch transactionally, retaining only the summary and record mappings, not the original file. Invalid rows require correction or explicit exclusion before commitment. Cancel and expired previews make no record changes.

AI remains disabled by default and requires server-side credentials plus admin enablement. Start with one provider, isolated behind an adapter; the provider/model is configurable and credentials never enter client bundles. Each request uses one need, one company, approved evidence references, and minimum pseudonymous route metadata. Names/contact details resolve locally. Show the outbound packet for editing before each live request; pseudonyms are not a promise of anonymity.

Validate schema and ID membership. A valid citation does not prove semantic support: model-created explanations remain inferences pending human review. Refuse invented names/emails, score changes, hidden tool requests, or malformed/partial output. A model has no autonomous tools. Maintain facts, assessments, and user edits after refusal/timeout. Use a fake provider in tests and explicitly labelled templates/fictional results in demo mode.

## Ticket plan and blocking graph

| Local ID | Behavior delivered | Requirements | Blocking prerequisites |
| --- | --- | --- | --- |
| T-01 | Self-hosted foundation and invited private access | F-01, F-02 | None |
| T-02 | First complete deterministic partnership workflow | F-03, F-04, F-08, F-10, F-11 | T-01 |
| T-03 | Resumable onboarding and validated CSV imports | F-03, F-05, F-06 | T-02 |
| T-04 | Evidence-aware relationship paths and focused graph | F-07, F-08 | T-02 |
| T-05 | Candidate batches, opportunity review, and revision safety | F-04, F-09, F-10 | T-04 |
| T-06 | Owned outreach pipeline and partnership outcomes | F-11, F-12 | T-05 |
| T-07 | Optional grounded AI briefs with context review | F-13, F-14 | T-05 |
| T-08 | Private-data export, deletion, and retention controls | F-02, F-15 | T-03, T-06, T-07 |
| T-09 | Complete fictional demo and polished accessible workflow | F-16, F-17 | T-03, T-06, T-07 |
| T-10 | Self-hosting release verification and operating docs | F-01, F-18 | T-08, T-09 |

T-03 and T-04 can proceed after T-02 but overlap network/evidence UI and migrations. T-06 and T-07 can proceed after T-05 but overlap opportunity detail and assessment history. T-08 and T-09 overlap settings, demo fixtures, and exports. Coordinate ownership of schema, shared types, lockfile, navigation, and fixture changes even when no dependency blocks the behavior. Do not create an artificial dependency merely to serialize every shared file.

Parent/child and native dependency links are recorded in [publication.md](publication.md). Each ticket retains its explicit blocker links as a fallback. Only T-01 is initially eligible. The first application milestone is T-01 + T-02, not the entire MVP.

## Verification and missing prerequisites

There are no existing application install/build/test commands. Node and npm are available in the current workspace; Docker is not currently on PATH. Do not claim a container check passed. T-01 establishes and documents the following command contract:

```text
npm ci
npm run dev
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run test:e2e
npm run build
npm run db:migrate
npm run demo:seed
docker compose up --build
```

Use Vitest for domain tests and real PostgreSQL integration tests, Playwright for workflow/auth tests, and browser inspection for rendered UI. Domain tests cover observable scoring/traversal/state behavior, not copies of implementation. E2E fixtures use only fictional records. T-01 establishes minimal auth/setup smoke coverage; later tickets add behavior as it exists. CI checks only implemented commands and expands with each ticket.

Required feature scenarios include a fresh empty install; invite/revoke/direct-endpoint access; first no-AI workflow; resumable onboarding; cancelled/invalid/duplicate/retried imports; current/former employment; several routes and cycles; shared-employer non-acquaintance; cold approach; conflicting evidence; unknown scores; concurrent regeneration; user-edited briefs; planned versus completed outreach; agreement/decline/reopen; timeout/refusal/invalid citations; context minimization; admin-only export/deletion; isolated demo reset; and restoration from a backup. Screenshot only fictional data.

## Execution and completion

The remote default branch was verified as `main`, initially at `878aefd3508e7569765839c4180886262c630906`. Repository planning publication may advance that commit. Refresh the remote SHA before delivery. The local workspace is still an unborn `main` with saved planning files; no local commit or implementation branch has been created.

After explicit delivery/branch authorization, initialize a managed checkout from the verified remote base. Do not reset or overwrite the existing planning workspace. The proposed integration branch is `codex/partnership-intelligence-mvp`; proposed worker branches are `codex/pi-tNN-<slug>`. Branch names are proposals, not existing branches. Follow repository Git instructions, including separate authorization before creating/switching branches or pushing. Worktree prerequisites are a committed remote base and a supported runtime; installation belongs to T-01.

Completion requires all F-01 through F-18 behavior integrated and verified, each child closed with evidence, successful relevant local checks and PR CI, independent review when delivery is authorized, and one focused unmerged PR against the refreshed default branch. UI changes require browser verification and fictional screenshots where practical. No automatic merge or deployment is authorized. Mark the parent complete only after the implementation is integrated and verified; issue publication alone completes Prepare.
