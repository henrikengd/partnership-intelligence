# Partnership Intelligence MVP scope

- Feature identifier: `partnership-intelligence-mvp`
- Status: `ready-for-prepare`
- Updated: 2026-10-02
- Stage: Scope. No application implementation, remote repository creation, publication, or deployment is authorized by this document.
- Repository context: The workspace contained only Git metadata, with no commits, application code, or established documentation conventions when inspected.

## Agreement and proposal boundaries

The user requested an organization-agnostic, open-source partnership intelligence product. The first real deployment is intended for Helix NMBU. The user explicitly confirmed these MVP boundaries on 2026-10-02:

1. Each installation serves one organization, with admin and editor roles.
2. Candidate companies come from imports or manual entry and supplied sources. Open web discovery comes later.
3. Only invited partnership-team users access personal network information. Those users see the same permitted records. Member self-service and record-specific sharing are outside the MVP.

The user's original brief also establishes the required focus on onboarding, needs, relationship paths, evidence, transparent scoring, useful opportunity details, manual/CSV imports, basic outreach tracking, and fictional demo data. Real personal information must stay outside the public repository. AI must distinguish facts, inferences, and missing information. Autonomous sending, LinkedIn scraping, large agent systems, enterprise permissions, and historical-outcome machine learning are excluded.

The domain consolidation, detailed screen behavior, scoring weights, architecture, and phases below are recommendations for preparation. They have not separately been approved as implementation decisions. No blocking product question remains; Prepare can turn these proposals into a reviewable implementation specification. The user has not authorized tickets, commits, implementation, or deployment.

## 1. Product definition

Partnership Intelligence helps a small partnership team turn organizational needs, recorded relationships, and evidence about candidate companies into prioritized partnership opportunities and concrete next actions.

The central question is: Why does this company fit, who is relevant, who can introduce us, what should we ask for, and how should we approach them?

The first useful workflow begins with a company the organization knows or adds. It ends with a reviewed partnership brief and a recorded introduction request or outreach action. The MVP does not promise to find every potential company or predict partnership success.

Its distinctive behavior is the combination of a specific need, an evidenced company capability or incentive, a visible relationship path, and an actionable ask. A decorative graph or a generic sponsorship letter alone would not meet the goal.

## 2. Primary users

| Persona | Main job | What the MVP must help them do |
| --- | --- | --- |
| Partnership lead | Decide where the team should spend its time | Review priorities, understand the evidence, assign owners, and track progress |
| Partnership coordinator | Research and pursue individual opportunities | Import records, check fit, find an introduction path, prepare an ask, and record follow-ups |
| Organization administrator | Operate the installation and manage access | Invite users, configure the organization, manage imports and deletion, and maintain backups |

Members, alumni, advisors, board members, and company contacts are people represented in the network. They do not need application accounts in the MVP. A login user and a person in the relationship graph are distinct concepts; an optional link can connect them.

## 3. MVP user stories and observable acceptance

| Story | Acceptance boundary |
| --- | --- |
| As an administrator, I can create my organization's profile | Organization name, mission, type, location, size, and website are editable; no deployment-specific name is built into the application |
| As a coordinator, I can define and prioritize needs | A need includes a description, category or custom label, urgency, optional deadline, and optional estimated value with currency; unknown value stays unknown |
| As a coordinator, I can import my network safely | CSV mapping and a preview show accepted rows, errors, and duplicates before anything is committed |
| As a coordinator, I can record employment and personal connections | Records identify their source, dates where known, and reported strength; a person can have several organization roles and employers over time |
| As a coordinator, I can add companies and evidence | Capabilities and other claims link to an attributed observation or supplied source; a URL alone does not establish a claim |
| As a lead, I can inspect how we are connected to a target | A company or opportunity shows a readable path with edge labels and evidence, or explicitly says no introduction path is known |
| As a coordinator, I can generate draft opportunities for a need | A bounded run evaluates known candidates, creates reviewable drafts, and marks missing evidence; rerunning does not create uncontrolled duplicates |
| As a lead, I can compare opportunities | Every numerical factor shows its value, rationale, evidence, unknown status, and scoring-policy version |
| As a coordinator, I can review and edit a partnership brief | Facts, inferences, and questions remain separate; suggested contact roles are not presented as named, verified contacts |
| As a coordinator, I can request an introduction and track outreach | The system records an owner, planned action, due date, completed action, and response; drafting never counts as sending |
| As a lead, I can record an outcome | Agreement, decline, and archived opportunity are distinguishable; an agreement can become a partnership without losing its history |
| As a visitor evaluating the project, I can explore a complete demo | A fictional organization demonstrates onboarding, evidence gaps, paths, scoring, and the pipeline without credentials for an AI service |

Release acceptance should include a fresh self-hosted installation, successful invitation and login, onboarding to the first opportunity, import recovery after an invalid file, and denial of unauthenticated data access. Tests must also exercise scoring with missing evidence and invalid model output. UI acceptance includes keyboard operation, narrow screens, empty states, and errors in the main workflow.

## 4. MVP and later boundary

| Include in the MVP | Defer |
| --- | --- |
| One organization per installation; invited admins and editors | Hosted multi-organization SaaS, billing, enterprise permissions |
| Resumable onboarding and organization configuration | Member portals, individual record-sharing controls |
| Needs, companies, people, relationships, and partnership history | Large CRM suite and customizable sales workflows |
| Manual entry and validated CSV import | Automatic LinkedIn scraping, automatic contact harvesting |
| Supplied URLs with excerpts or attributed manual evidence | Open web company discovery, browser crawlers, automatic source retrieval |
| Need-based matches and short introduction paths | Dedicated graph database, graph embeddings, unbounded traversal |
| Optional AI briefs and outreach drafts | Large multi-agent systems and autonomous negotiation |
| Explicit scoring factors and evidence coverage | Learned success probabilities and historical-outcome ML |
| Owners, follow-up dates, action history, and outcomes | Inbox sync, complex CRM integrations, automatic email sending |
| Fictional demo data, Docker setup, backup guidance | Dozens of integrations and public personal-data datasets |

MVP CSV templates cover people and affiliations, personal/company relationships, companies, and existing partnerships. Previous outreach can be entered manually. A generic importer that handles arbitrary spreadsheets and historical CRM exports is deferred. Needs and company evidence can be entered through forms.

## 5. Proposed domain and data model

The agreed vocabulary lives in [CONTEXT.md](../../../CONTEXT.md). The proposed persistence model consolidates overlapping roles rather than creating a separate table for every noun in the brief.

| Record | Main information and relationships |
| --- | --- |
| Organization | Profile and organization configuration; one active organization in an installation |
| User and invitation | Login identity, admin/editor role, invitation expiry, account state; separate from network people |
| Person | Name and optional contact details; may be an internal member, an alumnus, an advisor, and a company contact |
| Organization affiliation | Links a person to the organization, with one or more roles and dates; roles include member, alumni, advisor, and board |
| Company | Display name, website/domain, sector, location, aliases, and research state; may represent another type of partner institution |
| Relationship | Typed connection among organization, person, and company; source, dates, reported strength where relevant, recorder, and review state |
| Need | Category, custom description, urgency/deadline, estimated value and currency, desired partnership types, active/fulfilled/archived state |
| Company capability | Shared capability tag and precise description, with linked evidence; company size or sector alone does not prove a capability |
| Evidence | Supported claim, source type, URL or attribution, excerpt, observation date, recorder, verification state, and optional review date |
| Partnership | Company, type, agreed contributions/value exchange, dates, state, relevant people and needs, and supporting history |
| Opportunity | One company, one primary need, proposed partnership type, ask, value exchange, owner, lifecycle state, and selected path |
| Opportunity assessment | Versioned factor values, evidence references, coverage, priority, reasoning, model/prompt metadata if used, and input timestamps |
| Outreach activity | Opportunity, actor, target person or role, channel, planned/completed state, date, due date, and note; no sending mechanism |
| Outcome | Opportunity result, date, recorded reason, optional actual contribution, and link to a resulting partnership |
| Import batch | Template, uploader, validation summary, commit state, and created/updated record references; original files are not retained by default |

Relational foreign keys should preserve referential integrity. Avoid a free-form `entity_type` plus arbitrary ID that can silently reference a deleted or nonexistent record. Prepare should choose a constrained representation for the few permitted relationship endpoint types.

Employment and acquaintance are source relationship records. A completed partnership produces a graph edge such as sponsored or supplied. Outreach produces previously-contacted history. These derived edges must not become a second independently editable source of truth.

An introduction is an event recorded in outreach history. It does not establish a permanent strong relationship unless someone records evidence for that relationship.

Proposed opportunity identity is company + primary need + partnership type, with one active opportunity per combination. Regeneration creates a new assessment or updates a draft for review. It must preserve user edits, completed outreach, and previous assessments. Different asks within that combination can be edited in the brief; multiple parallel proposals and multi-need bundles can come later.

Scenario checks:

- Someone can be both an alumnus and a current advisor, and can be a contact at a company. Do not duplicate their person record.
- Former employment is not current employment. Dates and current/ended/unknown states affect the path recommendation.
- An alumnus works at a company but does not know the relevant manager. Show company access, with decision-maker access unknown.
- A company can fit a need without a known personal path. Recommend a researched direct approach, and show the missing connection.
- Several paths can reach the same company. Select paths by explicit edge evidence and strength, not by an LLM's claim that a named person is influential.
- A stale URL, conflicting claims, or a changed employer marks the affected assessment for review. A generated brief cannot silently convert the older claim into a current fact.
- Deleting a person must remove private path snapshots and generated material that reproduces their information, while preserving nonpersonal outcome history where possible.

## 6. Main application screens

Use one small navigation structure rather than giving every entity its own dashboard.

| Screen | Main behavior |
| --- | --- |
| Dashboard | Actionable queue: recommended opportunities, follow-ups due, and important evidence gaps |
| Needs | Current requirements, urgency, evidence, and matching opportunities |
| Network | People, organization roles, employers, known contacts, and relationship editing/import |
| Companies | Candidate and existing partners, capabilities, evidence, contact people, and previous engagement |
| Graph | A filtered relationship view, centered on one company, need, or opportunity; a readable path list accompanies the visual graph |
| Opportunities | Filterable list with workflow state, owner, priority, evidence coverage, and need |
| Opportunity detail | Why, who, via whom, ask, value exchange, approach, score breakdown, evidence, unanswered questions, and activity |
| Outreach | A simple pipeline/list showing owners, next actions, overdue follow-ups, and completed actions |
| Partnerships | Current/past agreements and agreed contributions; may initially be a company-list tab |
| Settings and imports | Profile, invitations, AI configuration status, templates/import history, export/deletion, and deployment guidance |

The opportunity detail is the central working screen. Keep its rationale, relationship path, ask, and first action above supporting metadata. Named contact details stay private and appear only to authenticated users. A graph must remain usable without dragging nodes, distinguishing colors, or displaying hundreds of records.

Use a small opportunity lifecycle: suggested, shortlisted, pursuing, agreed, declined, and archived. Intro requested, message sent, meeting held, and follow-up due are activities within pursuing, rather than separate permanent pipeline stages. A user records why an opportunity was declined or archived. Reopening requires an explicit action and preserves earlier history. Recording agreed creates or links a partnership; drafting an agreement does not complete that transition.

## 7. End-to-end onboarding

1. **Establish the installation administrator.** A one-time bootstrap process creates the first account. Disable bootstrap after completion. Subsequent users join through expiring invitation links that an admin shares manually; the MVP needs no email delivery integration.
2. **Create the organization profile.** Capture the proposed profile fields. Save after each step and show progress without requiring every optional field.
3. **Define needs.** Create at least one active need. Offer generic categories plus custom needs. Ask for a concrete description before asking for estimated value.
4. **Add people.** Enter people manually or map a CSV. Preview duplicate candidates and invalid rows. Roles do not create separate person records.
5. **Add professional relationships.** Capture current/previous employers, internships, and known contacts. Explain reported strength and record provenance. Unknown strength is allowed.
6. **Add companies and existing partnerships.** Reuse company records from the employment import. Import or enter current/past sponsors, suppliers, and collaborators. Optional steps can be skipped.
7. **Add previous outreach.** Offer a small manual form. Preserve date, result, and source. Do not invent missing historical details.
8. **Review the graph and source records.** Show short paths, missing endpoints, possible duplicates, and relationships lacking evidence. Let the user return to edit.
9. **Review readiness for the first opportunity.** A saved recommendation needs at least one need and one candidate company. A supported recommendation also needs evidence of relevant fit or incentive. No personal relationship is required.
10. **Generate drafts.** Explain the source set and whether AI is enabled. Show progress and permit retry after a failure. If evidence is insufficient, show specific research tasks instead of confident partnership briefs.
11. **Land on the opportunity dashboard.** Open the first reviewed opportunity or the highest-priority review task. Resume onboarding later from settings.

The fictional demo follows the same onboarding and data rules. A demo badge identifies all fictional material, including evidence. The self-hosted demo uses a separate database or instance and cannot be mixed into a private live installation. Reset only demo records, with an explicit confirmation.

## 8. Opportunity generation workflow

1. Select one or several active needs and a bounded set of candidate companies already in the installation. The MVP default should process one need and at most 20 companies per run. This is a proposed operational limit, not a promise about market coverage.
2. Normalize controlled need/capability tags. Preserve the detailed need text. Suggestions for new tags or aliases require user review.
3. Build deterministic candidates from supported capabilities, relevant incentive evidence, or an explicit user selection. A cash need requires an evidenced plausible incentive and a concrete ask; it should not match every company automatically.
4. Read existing partnership and outreach history. Flag recent declines, ongoing discussions, fulfilled needs, and duplicate active opportunities. Do not automatically contact someone who recently declined.
5. Find short, permitted introduction paths. Start with at most two person intermediaries, exclude cycles and ended relationships from current-path claims, and show up to three useful paths. Historical paths can be shown separately as possible leads to verify.
6. Assemble a compact evidence packet: need details, company claims and source IDs, relevant history, and pseudonymous relationship/path metadata. Do not send the full private graph or named people's contact details to a model.
7. If AI is configured, ask for a schema-validated draft containing the ask, value exchange, explanation, possible contact role, first action, outreach stages, and evidence gaps. Require evidence IDs for factual claims. Reject unknown source references.
8. Validate returned fields and source references. Unsupported statements remain explicit inferences or questions. An LLM cannot verify its own assertions; a user must review attributed facts. AI-proposed factor values do not overwrite human or deterministic scoring inputs.
9. Calculate the score from supported or reviewed factor values. Save the score policy, input evidence references, timestamps, and assessment version.
10. Save a suggested opportunity, preserving earlier user edits and outreach. The user reviews it before promotion to shortlisted or pursuing. The first action may be to confirm an introduction path rather than contact the company.

Without AI, the app creates a structured brief from saved inputs and explicit templates. It can still match capabilities, find paths, score known factors, list evidence gaps, and track outreach. Demo-generated drafts can use clearly labelled fictional fixtures.

Failures are recoverable. On model timeout, refusal, malformed output, or missing API credentials, keep the saved data and deterministic candidate assessment. A retry must not duplicate opportunities. Treat partial output as incomplete, not successful. A changed need or relationship marks the brief and score as needing review; the app must not erase user work during regeneration.

## 9. Proposed scoring model

Use an ordinal factor rubric, a transparent weighted sum, and a separate evidence-coverage indicator. These values rank opportunities within the organization; they are not calibrated probabilities or estimates of expected revenue.

Each factor has a value from 0 to 4, or `unknown`. Every assigned value includes a rationale, source references, and an origin such as deterministic rule or human review. Zero requires evidence for the weakest state; unknown is a separate state.

| Factor | Weight | Examples of low and high values |
| --- | ---: | --- |
| Relationship strength | 25 | 0: confirmed absence of a usable introduction path; 4: recent direct connection with explicit willingness to introduce |
| Need/capability fit | 25 | 0: confirmed mismatch; 4: evidenced capability meets the specific requirement |
| Access to decision-maker | 10 | 0: confirmed irrelevant route; 4: known relevant person with verified authority and a permitted approach |
| Company incentive | 10 | 0: explicit conflict; 4: documented alignment with a concrete proposed value exchange |
| Ask feasibility | 10 | 0: confirmed infeasible scope or timing; 4: defined deliverable, timing, and requirements supported by evidence |
| Previous relationship | 5 | 0: recorded relevant adverse experience; 2: confirmed no prior partnership; 4: recent positive collaboration |
| Evidence strength | 10 | 0: unsupported or materially contradicted basis; 4: current, specific evidence covers the central fit and path claims |
| Urgency | 5 | 0: no deadline and low recorded urgency; 4: organization-recorded near-term requirement |

Prepare should define all five anchors for every factor. Values 1 and 3 describe intermediate states, not arbitrary model estimates. Relationship path strength uses the weakest relevant edge and separately considers currentness and introduction willingness; it must not add edge strengths as if more intermediaries made a warmer connection.

Let each weight be a percentage and each known value range from 0 to 4:

- Priority points = sum of `weight × value / 4` for known factors, out of 100 possible points.
- Evidence coverage = sum of weights for factors with supported or reviewed values, out of 100.
- Unknown factors earn no points in the conservative ordering, but remain visibly unknown. Do not renormalize the remaining weights or display an unknown as a confirmed zero.
- For equal points, prefer higher coverage, then nearer recorded deadline, then a stable ID.

Example: fit 4, relationship 3, and urgency 2 produce 46.25 points with 55% coverage. The other factors remain unknown. That record is a research lead, regardless of its place in the list.

Suggested workflow gates:

- **Research needed:** fit or incentive lacks evidence, a critical claim conflicts, or the ask is too vague to assess.
- **Needs review:** the evidence supports a plausible opportunity, but a coordinator has not reviewed the recommendation.
- **Ready for action:** a user has reviewed the fit, concrete ask, relevant contact role or person, and next action. A cold approach is allowed if the missing personal path is explicit.

Show priority points, coverage, and workflow state separately. Avoid arbitrary High/Medium/Low thresholds until pilot experience makes them useful. Keep initial weights fixed and versioned; per-organization weight editors are deferred. A user may mark a strategic focus with a reason, while the calculated score stays visible.

## 10. AI and deterministic responsibilities

| AI assistance | Deterministic system and human control |
| --- | --- |
| Summarize supplied company evidence | Store the original evidence and provenance |
| Explain plausible fit and critique weak claims | Form the candidate set from recorded inputs and enforce evidence references |
| Propose a partnership type, specific ask, and value exchange | Validate required fields and permitted values; user approves the resulting brief |
| Suggest likely relevant job roles | Look up only recorded people; never invent named contacts, emails, or authority |
| Explain an existing path | Compute the path and apply access checks before constructing model context |
| Draft a first message and follow-up sequence | User chooses recipients and sends through their own communication tools |
| Identify missing information | Keep missing values distinct from facts and score inputs |
| Suggest factor rationale for review | Compute versioned scores from validated deterministic inputs or recorded human assessments |

Use one bounded model call per requested brief where possible. No agent swarm, vector database, model training, or autonomous tool loop is required. A provider adapter permits an optional AI service; deterministic behavior must remain independent of it.

## 11. Suggested technical architecture

Propose a TypeScript modular monolith:

- Next.js App Router for the UI and server application. Server Actions or Route Handlers call domain services rather than owning scoring logic inside UI components.
- PostgreSQL for records, evidence, relationships, assessments, and activity history. Small bounded SQL/application traversals produce graph paths.
- Drizzle for schema definitions and migrations, subject to the final Prepare specification.
- React Flow for a focused visual graph, accompanied by a textual path view. The graph is a projection of database records.
- A maintained authentication library with database sessions and established password/account protections. Keep the final library choice open for Prepare; do not create custom cryptography. One-time first-admin setup plus admin-created invitations are sufficient.
- A small optional AI adapter, initially supporting one provider. Requests and responses use runtime validation. Preserve provider/model metadata without logging private request bodies.
- Docker Compose with app and database containers, private database networking, and a persistent database volume. TLS and secure session cookies are required for an internet-accessible deployment.
- An internal generation-run record with queued/running/completed/failed states and bounded processing. Execute small batches without a separate queue service in the first slice. Restarted runs can be retried explicitly with idempotent updates; durable workers can follow if deployment limits require them.

Avoid a separate backend service, graph database, microservices, Redis, external search index, and multi-package monorepo until a concrete requirement justifies one. A single web app and database keep setup and debugging understandable for a small volunteer team.

Official feasibility findings and limitations are saved in [architecture research](notes/architecture-research.md). Technology versions, authentication library, AI provider terms, and host-specific execution limits must be checked during Prepare. This recommendation does not select a hosting vendor or require a hosted identity service.

## 12. Proposed repository structure

Only documentation exists now. These application paths are proposals, not created application files.

```text
partnership-intelligence/
  README.md
  LICENSE
  CONTRIBUTING.md
  SECURITY.md
  CONTEXT.md
  .env.example
  compose.yaml
  Dockerfile
  docs/
    features/partnership-intelligence-mvp/
      scope.md
      notes/architecture-research.md
    self-hosting.md
    privacy.md
    imports.md
  src/
    app/
    components/
    modules/
      organization/
      network/
      needs/
      companies/
      opportunities/
      outreach/
      imports/
    server/
      auth/
      db/
      ai/
  db/
    migrations/
  demo/
    seed/
    import-templates/
  tests/
```

Keep matching, traversal, scoring, and opportunity state rules testable outside the UI. Share validation between import and manual-entry workflows. Do not split every folder into its own published package.

The public repository contains schemas, code, migrations, empty templates, configuration examples, and fictional fixtures. Production databases, backups, uploaded files, model request logs, exports, and environment secrets live in private deployment storage. Git ignore rules are a second line of defense, not the storage design.

Choose an actual open-source license before public release. MIT is a proposed straightforward choice; the user has not selected it. A final license choice need not block scope preparation.

## 13. Privacy and security

The privacy boundary is the installation and its invited partnership team. This simple model means all invited editors can see permitted network records. Organizations needing finer restrictions should not place that data into this MVP instance until the access model changes.

Proposed minimum controls:

- Authenticate every private route and check authorization inside each server mutation and data entry point. Admins manage invitations, configuration, bulk export, and destructive operations. Editors manage records and opportunities. Restrict routine logs to operational metadata.
- Store only relationship information necessary for partnership work. Record provenance and who supplied it. Make it possible to correct, archive, and delete a person and dependent material. A contact record is not consent to an introduction or outreach.
- Treat unknown permissions as unknown. The recommended first action for an unconfirmed warm route is to ask the internal person whether they are willing to introduce the team.
- The application works without third-party AI. An administrator explicitly enables it and can inspect what fields leave the installation. By default send public company evidence, the need, and pseudonymous path metadata. Resolve personal names and contact details locally after generation.
- Pseudonyms do not guarantee anonymity. Omit unnecessary identifying organization/project details, private anecdotes, and full graph topology. Supplied free text can contain personal data; show and allow editing of the outbound context for each live generation request. Provider retention and processing terms must be assessed before private use.
- Keep supplied evidence as untrusted content, not instructions. It cannot request access to secrets, modify scoring rules, trigger tools, or cause outreach. Models have no sending or database-write tools.
- The MVP stores source URLs and supplied excerpts; it does not fetch arbitrary URLs on the server. Sanitize displayed text, reject unsafe link schemes, validate structured output, and keep API keys server-side. Automatic fetching would require separate SSRF controls and source-processing limits.
- Preview CSV imports before committing. Use file-size/row-count limits and explicit field validation. Do not merge people solely because their names match. Exact email or source IDs can suggest matches; users resolve ambiguous cases. An import can be cancelled without changing records.
- Escape spreadsheet formula-like cells when exporting CSV. Export is a privileged action. Do not include contact details in public graph screenshots, examples, or bug reports.
- Keep the database off public ports, use TLS for exposed web traffic, secure cookies, and protected backups. Document restore and deletion procedures, including that removal from the live database does not immediately remove data from retained backups.
- Record access administration, imports, significant generation actions, bulk exports, and deletion events with minimal metadata. Do not build an enterprise audit system.
- Run public CI only against fictional fixtures. Ensure seeded demo mode cannot overwrite production data. Check staged files for private exports and secrets before publishing.

These are product and engineering requirements, not a legal conclusion about a deployment. The operator must decide what personal data it may collect, who should have access, and how long it retains records.

## 14. Phased implementation plan

These are proposed delivery phases, not published tickets or a time estimate.

| Phase | Deliverable | Exit criterion |
| --- | --- | --- |
| 1. Foundation and first slice | Self-hostable app/database, authentication, fictional seed, one need and company flow, one recorded path, evidence, deterministic assessment, brief, outreach note | A fresh install completes the smallest useful workflow without an AI key; private routes reject unauthenticated requests |
| 2. Onboarding and imports | Resumable profile/needs/network steps, CSV templates, mappings, previews, duplicate resolution, partnership history | A coordinator completes onboarding with a realistic fictional file and recovers from import errors |
| 3. Relationship intelligence | Focused graph, bounded path ranking, several candidate companies, score explanations, coverage, evidence review, regeneration rules | Fixture cases demonstrate current/former employment, missing contacts, cycles, conflicting evidence, and duplicate prevention |
| 4. AI assistance | Optional provider, validated brief generation, outreach drafts, explicit facts/inferences/questions, privacy context review | Invalid/refused output is recoverable; unsupported claims cannot become verified facts; deterministic mode still works |
| 5. Team workflow and public release | Owner assignment, reminders within the UI, outcomes, partnerships, export/deletion, documented backup/restore, accessible UI, final demo and license | Another organization can install, configure, import private data, and complete a reviewed opportunity using documentation alone |

Pilot with Helix NMBU only after the basic privacy, authentication, and deployment checks pass. Keep its live configuration, data, and screenshots private. Pilot feedback should measure brief usefulness, evidence gaps, correction effort, import friction, and actions taken. Do not interpret a tiny pilot as a calibrated success model.

## 15. Smallest vertical slice

Build one complete case for a fictional organization called Riverbend Community Workshop:

1. An administrator logs in and creates an organization profile.
2. A coordinator records a need for machining a small batch of mounting brackets, including a deadline and drawings not yet supplied.
3. They add a fictional former member who currently works at a fictional company and record the source of that employment claim.
4. They add the company's machining capability with an explicitly fictional source excerpt. The internal person's willingness to introduce remains unknown.
5. The application displays the organization-to-person-to-company path as text and a small graph.
6. The application creates a deterministic draft opportunity. It proposes a defined in-kind machining ask, marks production feasibility as unresolved, and recommends asking the former member whether they can introduce a relevant manufacturing contact.
7. The detail page shows every factor, its evidence, unknown values, and a specific first action. It suggests a contact role without inventing a person.
8. The coordinator assigns an owner, records an introduction request as completed only after taking the action, and sets a follow-up date.

This slice includes authentication, persistence, evidence, one relationship path, a score explanation, and one outreach event. It excludes broad CSV handling, global graph exploration, web research, automatic sending, and AI. Adding the optional AI draft comes after this path works end to end.

The complete release demo should grow beyond the first case. A proposed fixture set has 12 people, 6 companies, 4 needs, 3 existing/past partnerships, and approximately 8 opportunities. Include cash, expertise or volunteering, and logistics needs as well as manufacturing so the generic product is not defined around a Formula Student team. Include a cold approach, two alternative introduction paths, former employment, a recent decline, an overdue follow-up, missing evidence, and conflicting evidence. Fictional URLs should use reserved example domains and never impersonate real evidence.

## Source references, helpers, and handoff

- Primary product source: the user's full project brief in this conversation on 2026-10-02.
- Explicit user decisions: the three responses recorded under Agreement and proposal boundaries.
- Observed repository behavior: no application files, no established docs layout, and no existing Git commits. There is no current implemented behavior to reconcile.
- Scope helper: applied to the interview, boundaries, and this saved agreement.
- Define helper: used to capture the agreed domain vocabulary in `CONTEXT.md`; proposed persistence consolidation remains here. No accepted architecture ADR was written because the architecture is still a proposal.
- Research helper: delegated narrow official-documentation feasibility checks and saved them in `notes/architecture-research.md`. Research establishes technical facts, not user approval or implementation verification.
- Unslop helper: applied to questions and saved prose.
- No prototype or advisor questionnaire was necessary. No production code or live service was changed.

No blocking product questions remain. Prepare must still resolve implementation details including authentication library, complete factor anchors, endpoint constraints, runtime/batch limits, initial provider configuration, and license before public release. These do not require the user to repeat the original brief.

The next stage is `$prepare`, using this stable feature slug and file. Ready-for-prepare means there is enough scope to produce a concrete implementation specification; it does not authorize publishing tickets or starting delivery.
