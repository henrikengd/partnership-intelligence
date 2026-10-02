# T-04 worker verification

This worker implements F-07 and the deterministic path input portion of F-08 from specification r1. The coordinator must integrate and verify the complete feature before closing the issue. No GitHub CI result is claimed here.

## Behavior and bounds

`findRelationshipPaths` extends the compatible `findDirectPaths` entry point. Explicit internal affiliations establish a root; contact-only people cannot establish one. Traversal follows the recorded source/target of personal relationships and terminates after two people total between organization and company. No inferred reverse edge, shared-employer acquaintance, or job-title authority is added. Cycles cannot repeat a person.

Current and historical/uncertain results each contain at most three stable-ranked routes. Current means a recorded current connection chain with eligible supplied/reviewed source records, not verified present introduction consent. Ended, unknown, future and disputed/superseded records remain leads to verify. Refused routes remain visible but rank behind permitted current alternatives and do not receive an introduction recommendation. Dated yes always requests reconfirmation for the particular introduction.

Ranking compares currentness, route availability, the proportion of supported and reviewed explicit connections, the weakest applicable personal edge, dated recorded willingness, route length, then stable record IDs. Source quality is a proportion so adding intermediaries cannot improve it by adding source counts. Personal strength is a minimum rather than a sum; employment strength never becomes personal familiarity. Missing personal strength remains unknown. All route terminals are explicit connections to the selected company; the data has no structured verified relevance field. Titles cannot establish need relevance or authority.

The deterministic relationship factor uses 1 for an explicitly weak personal connection or an actual supported ended lead. Future, unknown, disputed, missing and refused leads cannot receive that historical point. Current connections use at most 2 because need relevance and present introduction suitability are not structurally verified. Decision-maker access remains unknown without explicit human review. Manual assessments remain separate.

`projectRecordedGraph` uses saved affiliations and relationship rows, plus separately labelled history edges from completed source activities. The graph is read-only and retains a keyboard-readable record/source equivalent. A company focus retains its explicitly connected people and immediate personal predecessors. The graph page initially focuses the first company; an explicit All companies selection shows the complete recorded projection. Company and opportunity filters do not create connections.

## Worker checks

- `npm ci`: locked installation, audit reported zero vulnerabilities.
- `npm run lint`, `npm run typecheck`, `npm test`: passed, 10 existing unit tests.
- `npm run test:integration`: passed, 25 tests against the separate graph-worker PostgreSQL container on port 5544. Eight new scenarios cover route alternatives/provenance/stability, bounded depth/cycles, the three-route cap and weakest edge, ended/future/unknown/disputed records, same-employer strangers and directionality, refusal/missing strength, old willingness versus authority, and authorized derived completed history.
- `npm run test:e2e`: passed, all 3 Chromium scenarios. The new graph scenario verifies private-page redirects, company/opportunity filters, keyboard opening of record/evidence disclosures, current and historical sections, explicit cold state, malformed-reference 404, company detail, and no horizontal overflow at 390px.
- `npm run build`: passed after the final graph and scoring changes, including the new dynamic company and graph pages.
- Desktop/mobile screenshots were inspected. Edge handles and a vertical layout at narrow widths were corrected after the first inspection; the final screenshots show every route node. The browser runner shut down its port 3104 server on completion.

Only fictional records and the separate worker database were used. No schema, migration, shared record editor, opportunity detail page, navigation, issue state, or delivery record was changed by this worker.

## Coordinator wiring

Mount `RelationshipPaths` in the opportunity detail's route section using `companyPaths(data, record.companyId)` and the existing permitted data, or link to `/graph?opportunity=<id>`. The stored assessment path remains a historical snapshot and should not be presented as newly verified live data. Add `/graph` navigation and company detail links from the existing company list. The new `/companies/[id]` page already renders all current alternatives and historical leads.

After T-03 integrates, merge its source records into the network service's `PathHistory[]` before projecting the graph. The DTO is `{ id, companyId, kind, label, occurredDate, state, description, source?, recordedBy?, evidenceIds? }`. Map partnership title/start date/state/description/recorder and optional evidence. Map previous outreach channel/occurrence date/outcome/description/source attribution/recorder. Never turn history into current personal paths or duplicate writable edges. The coordinator owns that cross-ticket integration and combined history tests.

Browser screenshots are private temporary fictional artifacts at `/private/tmp/pi-t04-graph-desktop.png` and `/private/tmp/pi-t04-graph-mobile.png`, not committed source. The worker browser server must be stopped on handoff; the isolated PostgreSQL container remains available for integration.
