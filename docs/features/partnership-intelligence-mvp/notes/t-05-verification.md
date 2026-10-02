# T-05 verification

Worker: `codex/pi-t05-generation`. Scope: F-04, F-09, F-10 and the shared readiness gate used by T-06. Prerequisite T-04 was closed before implementation. T-03 schema commit `07c66cc` was adopted solely to serialize migration metadata; it is not a T-05 implementation commit. Migration `0005_nervous_vanisher` follows `0004_dear_hannibal_king`.

All fixtures, credentials and screenshots use fictional records. Database checks run against the isolated worker PostgreSQL 18.6 installation on port 5544; browser checks use port 3104. No real Helix records, source discovery, provider calls or email sending are involved.

## Acceptance evidence

1. Candidate preview explains supplied capability matches, evidenced company/need incentive mappings and explicit unsupported selections with gaps. Cash has no automatic all-company match. Runtime validation rejects 21 selections, duplicate IDs and nonexistent references; automatic runs take at most 20 supported candidates for one active need. The browser selects a supported manufacturer and leaves an unsupported logistics company unchecked.
2. Real database fixtures submit concurrent equal keys and different keys. Equal-key replay returns the saved run; different-key requests retain one active tuple and sequential immutable assessments. Payload changes under an existing key are rejected. Closed outcomes require explicit acknowledgment and link the new proposal to its prior outcome. Multiple pursuing discussions for one company cannot refresh the wrong tuple: the exact tuple takes precedence even when unrelated discussion acknowledgment is present.
3. Changed needs and evidence advance input revisions and block readiness. Regeneration appends assessments while preserving explicit human factor values/provenance, manual ask/value exchange/role/action, owner and completed outreach. Factor review retains the old source snapshot revision instead of erasing staleness. Future source observations cannot supply current candidate or fit support; the claim and missing-current-support question remain visible.
4. Detail shows supplied claims/source provenance, inferences, missing questions, all eight scored/unknown factors and anchors, separate stored/current routes, manual brief and immutable assessment history. Dashboard/list use unrounded points, coverage, nearer known deadline and stable ID. A saved reviewed action plan displays the selected target, ask, next action and sourced introduction route or explicit cold mode. A changed plan is labelled historical. Browser reload selects an alternative to the generated default and confirms that exact named terminal contact remains visible, with keyboard source expansion; cold review remains explicitly cold on reload.
5. Direct pursuit fails before review. Review requires fit rationale/evidence or an explicit organization assessment, concrete ask, relevant target/role and next action. The unchanged generic draft ask is rejected. Readiness binds assessment/input/manual revision. A recorded introduction refusal is rejected, while an explicit cold approach can pass. An employee route cannot imply acquaintance with a separately recorded manager; a stored regression rejects that named warm target without a knows edge. Titles never establish decision authority.
6. Persisted running rows become visibly interrupted through startup recovery and explicit retry retains the active proposal/history. Completed replay adds no versions. Failed retry retains prior assessments, caps attempts at two and returns `RETRY_EXHAUSTED`; the UI directs users to resolve the failure before a new request. Fulfilled/inactive needs are rejected. Ongoing discussions are excluded from unattended selection; explicit different need/type support requires acknowledgment. The single-company compatibility endpoint never returns an unrelated skipped discussion as successful generation.

## Checks

Final command results and actual startup verification are appended below after completion. PostgreSQL and Chromium checks are sequential because they share this isolated worker database. An earlier overlapping run was discarded and is not acceptance evidence.

Screenshots are private temporary artifacts, not repository assets: `/private/tmp/pi-t05-opportunity-desktop.png`, `/private/tmp/pi-t05-opportunity-mobile.png`, `/private/tmp/pi-t05-candidates-desktop.png`, `/private/tmp/pi-t05-reviewed-route.png`.

## Integration notes and limits

See `docs/development-contracts.md` for T-06 readiness and T-07/T-08 persistence seams. This adds only the initial reviewed pursuit transition; T-06 owns the broader lifecycle, agreement/outcome history and pipeline. Startup recovery assumes one app process per installation; no queue or durable worker is advertised. Run `inputRevision` is the selected need revision; immutable assessments separately bind opportunity input revisions, factors, source IDs and path snapshots. Invalidation remains conservatively installation-wide.

Coordinator-only T-03 additions must survive integration: dashboard onboarding/import links, Docker public-directory copy, history mapping in network service and shared navigation. The worker modifies independent Docker startup recovery and dashboard priority/run sections. The onboarding browser assertion uses the existing first-action form label to avoid matching the new duplicate review textarea; it retains the original expected cold approach.

## Final worker results — 2026-10-03

- `npm ci`: succeeded with zero reported audit vulnerabilities after the T-03 prerequisite dependency sync.
- `npm run lint`, `npm run typecheck`: passed.
- `npm test`: 13 unit checks passed.
- `npm run test:integration`: 48 PostgreSQL checks passed, including 12 T-05 stored scenarios. The final pass contains exact-tuple precedence, skipped-result rejection and retry exhaustion.
- `npm run test:e2e`: 7 Chromium checks passed sequentially after the database suite. Three T-05 scenarios cover candidate/review/pursuit, interrupted explicit retry and non-default named-route reload with historical-plan labeling. Existing access, graph, onboarding and first-workflow checks remain passing. Desktop and 390px screenshots and no-horizontal-overflow assertions passed; the selected-route screenshot was visually inspected.
- `npm run build`: passed after the final browser run and restored generated Next environment type references.
- Actual `npm run start -- --port 3104`: its `prestart` recovery marked one seeded abandoned run `interrupted/PROCESS_RESTART`; `/login` returned HTTP 200. A fresh process authenticated the fictional editor and explicitly retried that same run: attempt 2 completed with one active opportunity and two immutable assessment versions. Startup itself changed no assessment history. The server was stopped afterward. Next printed its existing standalone-output warning for `next start`; the Docker command uses the standalone server directly. Full Compose execution belongs to T-10 and is not claimed here.

A browser assertion initially matched both the graph node and its text equivalent; it now targets the keyboard text path. The final seven-test pass includes that correction. Next dev emitted existing aborted-stream and temporarily hidden React Flow container diagnostics during navigation; these did not fail the rendered/source/keyboard checks. No production provider call or outbound message was made.
