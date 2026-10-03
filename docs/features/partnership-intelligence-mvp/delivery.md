# MVP delivery record

- Feature: partnership-intelligence-mvp.
- Repository: henrikengd/partnership-intelligence.
- Parent: https://github.com/henrikengd/partnership-intelligence/issues/1.
- Approved contract: spec.md revision r1, explicitly selected for implementation by the user's Deliver invocation on 2026-10-02.
- Captured base: main at bf4953531a6e927a75b348fb075a0a4fd10fc22f.
- Integration branch: codex/partnership-intelligence-mvp.
- Integration worktree: /Users/henrik.noteless/.codex/worktrees/pi-integration/partnership-intelligence.
- Initial integration commit: bf4953531a6e927a75b348fb075a0a4fd10fc22f.
- PR: none. No merge or deployment authorized.

The original planning workspace remains untouched and its local main is unborn. Managed worktrees use the fetched remote base. Deliver explicitly authorizes its prescribed implementation branches, ordinary feature push, ticket updates and PR; the preparation-stage notes about future authorization are historical.

## Current assignment and blockers

Current checked application: `8c1bc0dc6e4f0574cf5057b4936e391f5f961ed4`. T-02 through T-09 are integrated, verified and closed, including the repaired AI Settings race. T-10 is now eligible for operating/restore acceptance. T-01 remains open only for actual remote CI. No PR exists yet.

## Historical implementation checkpoints

The following assignments and measurements describe their recorded commits; later checkpoints supersede them.

T-01 / #2 has been integrated as `2f9e821` from worker commit `f1a6e21a1b5d124b2e4fbd79e3c5137cb1260766`. The coordinator independently passed `npm ci`, lint, typecheck, production build, four unit tests, nine PostgreSQL integration tests, migrations and the complete Chromium access workflow on this commit. Worker evidence additionally establishes actual Compose build/bootstrap/restart persistence and operator recovery, documented in notes/t-01-verification.md. GitHub CI remains pending the final feature PR, so #2 remains open for that acceptance criterion. Its integrated functional prerequisites are verified and T-02 is eligible; tracker comments must distinguish this from full closure.

T-02 / #3 worker /root/foundation committed 770a97274e5e75dcc4973d6671d858336d11da31, integrated as 39138340dc618a5144dc8a017237933b0778d498. Coordinator passed locked install, lint, types, production build, 10 unit tests, 17 PostgreSQL tests and both Chromium workflows. Desktop and 390px fictional detail screenshots were inspected. #3 was closed with criterion evidence, then reopened after independent review found two P2 defects. Focused coordinator repairs preserve factual snapshot revision during factor review and lock an activity before its completion guard. Repair commit 85c5c24f7270fae1caf43f1d2fda039b3dfd545d passed lint, types, build, unit10, PG19 and Chromium2. Both new regression cases were proven to fail against the old implementation. /root/test_runtime independently reviewed the focused patch and confirmed both findings resolved with no new material issue. #3 is reclosed with repair evidence.

T-03 / #4 is integrated and closed. Worker /root/foundation commit07c66ccc48a88f593e372c6ee9071747ec118746 was integrated as a6de371; root wiring a571bf13223928886637eddc8995ecf943f7b5e7 adds onboarding/navigation/dashboard entry, graph preview and separately sourced partnership/previous-outreach history, shared browser fixtures and Docker public-template copy. Coordinator npmci/lint/types/build/unit13/PG37/Chromium4 pass, including actual rollback, competing identity previews, idempotent confirms and history-without-personal-access. Fictional mobile import/readiness screenshots inspected. Worker notes are notes/t-03-verification.md. Former isolated assignment /root/foundation, /Users/henrik.noteless/.codex/worktrees/pi-t03-onboarding/partnership-intelligence, codex/pi-t03-onboarding, base3913834, DB5541/app3103; server stopped. Migration0004 ownership is now released and verified for T-05.

T-04 / #5 is integrated and closed at 93770f9. Worker /root/graph completed 444e941540b2c261164d5b0c17ca6bef3b17ab05, integrated as 351bc3b. Coordinator wiring 93770f9 passed lint/types/build/unit10/PG27/Chromium3. Current record comparisons are labelled separately from immutable assessment routes. Completed activity history is derived; additional T-03 partnership/manual history mapping is now integrated and checked at a571bf1. Its former worker assignment was /root/graph in /Users/henrik.noteless/.codex/worktrees/pi-t04-graph/partnership-intelligence, branch codex/pi-t04-graph, assigned base 3913834. It owns network traversal/service, focused graph/path panel, graph/company-detail pages and the generator path adapter. Runtime separate pi_t01 localhost 5544, app/E2E 3104. No schema changes planned. Both workers were assigned after integrated T-02 verification and continue independent work during its focused repair without changing the repaired service interfaces.

Early read-only reviews by /root/test_runtime: F-01/F-02 at 2f9e821 plus docs7379d5e found no material issue, and an unused organizationExists helper was corrected in T-02. T-02 at 3913834 found P2 stale snapshot relabelling and concurrent completed-action reversion. This is not the final full-feature review. No reviewer mutated files or databases.

Runtime prerequisite resolved. Node v24.19.0 and npm 11.17.0 are available. Isolated Colima profile partnership-intelligence runs Docker, with DOCKER_CONFIG=/private/tmp/pi-docker-config and DOCKER_CONTEXT=colima-partnership-intelligence. PostgreSQL 18.6 test containers use localhost 5541 for pi_t01 and 5540 for pi_integration. A separate pi-t04-postgres container exposes localhost 5544, also with an isolated database named pi_t01 to satisfy the existing destructive-test guard. T-05 exclusively uses that container until its verification and server shutdown. The profile does not change the user's default Docker context. Operational commands are in the original workspace's ignored .local/runtime.md. Foundation Compose project pi-t01-smoke is stopped with its volume retained. T-02 reserves port 3102; the earlier foundation Compose server is stopped.

T-05 / #6 is integrated, independently checked and closed at ca411ec3bce2d765c3fda102f93c81f1d144c411. Its worker b9cf10051d2bb6f0a06d6772c90f656aa00b9891 adds migration0005 after verified0004. The worker server is stopped and its database5544 is released to T-07.

T-06 / #7 is assigned to /root/foundation in /Users/henrik.noteless/.codex/worktrees/pi-t06-outreach/partnership-intelligence, branch codex/pi-t06-outreach, from c2bf7d2. It owns lifecycle/activity/outcomes and pipeline, with migration0006 committed early for metadata handoff. Isolated database pi_t01 on5541 and app/E2E3103.

T-07 / #8 is assigned to /root/architecture_research in /Users/henrik.noteless/.codex/worktrees/pi-t07-ai/partnership-intelligence, branch codex/pi-t07-ai, from c2bf7d2. Its independent AI modules are in progress. The T-06 schema metadata has now been adopted as e3216aeada8b62cbd546df281fa860d48f47bdfa, and T-07 owns migration0007. Isolated database pi_t01 on5544 and app/E2E3104. AI drafts remain separate from assessments, scores, manual briefs and activities. Root owns shared detail/settings mounts and startup composition.

## Next action

Complete T-10 fresh Compose, recovery, backup/restore, operating docs and release evidence, then assign fresh complete-feature and Standards/Spec reviews before one PR. Only root updates the integration branch and tracker. Preserve #2 pending actual final CI and parent #1 as open until PR merge.

## Infrastructure and tracker reconciliation

GitHub Actions is enabled, token permissions include workflow, and live main has no branch protection or repository rulesets. No pre-existing PR was found. These are prerequisites, not successful CI/review evidence. Runtime setup and connectivity are verified; T-01 integration checks passed as recorded above; no remote CI or independent full-feature review has yet run.

## Domain contract checkpoint

T-02 worker reports stable record/network/assessment/activity seams under src/modules and schema exports need, person, affiliation, company, evidence, capability, relationship, opportunity, assessment, assessmentEvidence and activity. Record mutations and generation lock the organization row. These are worker-stage contracts pending integrated verification, not completed ticket evidence. Planned parallel ownership after T-02 verification: T-03 schema/import/onboarding/manual record forms and T-04 network traversal/focused graph, with no shared schema changes expected for T-04.

## Worktree cleanup

The clean T-01 worker checkout was archived through the managed worktree tool after its commit was integrated. The attachment now reports archived_worktree at the original identity. Its Git snapshot is recoverable; worker verification notes are on the integration branch and fictional screenshots/logs remain under /private/tmp. No needed ignored files were present in that checkout. The clean T-02 checkout was also archived after its code/evidence was integrated; it is no longer needed.

## Verified integration checkpoint

Current verified application commit 85c5c24f7270fae1caf43f1d2fda039b3dfd545d. Check commands used isolated pi_integration localhost5540 and E2E3100. Lint/types/build/unit10/PG19/Chromium2 pass, with regression detection demonstrated against 3913834. Early repair reviewer /root/test_runtime was read-only and did not implement the feature. Full-feature review and remote current-commit CI remain pending.

Graph verified checkpoint: 93770f9 contains the independently checked graph and UI wiring; no current-SHA remote CI or final full-feature review yet. All three Chromium workflows passed after worker-scoped pool cleanup. Generated next-env.d.ts development references are uncommitted and excluded from feature changes.

Early graph reviewer /root/test_runtime found no actionable P1/P2 at application93770f9/capturedHEAD494cc76 in a read-only review. Full feature review remains pending. New bounded T-03/import/history review assigned to the same non-implementing reviewer at a571bf1. Read-only /root/architecture_research is verifying current official Responses API contracts for later T-07; no implementation or model selection delegated.

Current verified application checkpoint a571bf13223928886637eddc8995ecf943f7b5e7: all applicable local checks pass. Docker public-template packaging is changed but final full container/runtime/restore verification remains T-10. The clean T-04 worker checkout was archived after integration; its notes/screenshots remain available.

T-03 early review at a571bf1 found P2 saved-preview client state and conflicting source-ID/email-domain resolution. #4 was reopened. Root repair8ff533afe502c738a91b6527c4f8ba5e34e28f74 remounts saved batches, waits before exposing first-preview decisions, reports identity conflicts and guards legacy previews. Both regression cases failed against old committed sources; restored fixed code passes lint/types/build/unit13/PG38 and focused Chromium2. Unchanged access/network/firstworkflow3 passed in the preceding full run. /root/test_runtime independently confirms both resolved and no new material issue at8ff533a. #4 reclosed. Final fullfeature review/remoteCI still pending. The clean T-03 worker checkout was archived; worker evidence remains in notes/t-03-verification.md. Current checked application is8ff533a and the worktree is clean after production build restored generatedmetadata.

## T-05 early review and next contract

Read-only reviewer /root/test_runtime inspected changing T-05 sources before the worker commit. Three P2 scenarios were identified: an arbitrary ongoing company proposal could mask the exact selected tuple; the compatibility endpoint could return a skipped unrelated proposal as successful generation; and a readiness review of alternative route B could reload with only generated route A visible. Worker repairs and stored/browser regressions are in progress. This is an early review, not final feature approval or a verified final commit. Deterministic retries are being bounded to one explicit retry to match the run contract.

Read-only preparation for T-06 and T-07 established separate lifecycle/activity and AI draft components. T-06 will own the next migration after T-05, releasing its committed schema metadata before T-07 generates a subsequent migration. AI drafts must remain separate from immutable assessments, manual briefs, readiness and activities. Provider calls use short DB start/finish transactions with conditional completion; no transaction stays open during the external request. Root owns final detail-page composition. Both tickets remain blocked until T-05 integration verification.

## T-05 integrated checkpoint

Worker b9cf10051d2bb6f0a06d6772c90f656aa00b9891 integrated cleanly as ca411ec3bce2d765c3fda102f93c81f1d144c411. Coordinator lint/types/build/unit13/PG50/Chromium8 pass. Existing root onboarding/dashboard/Docker public copy, T-03 history mapping and import repairs survive. Fictional selected-route screenshot inspected. Worker also verified actual prestart interruption recovery and explicit retry, documented in notes/t-05-verification.md. Bounded independent reviewer /root/test_runtime confirms all three P2 repairs and one-retry gate at exact ca411ec, with no new material finding. #6 can close; T-06 and T-07 are now eligible. Final full-feature review, Compose/restore verification and remote current-SHA CI remain pending.

## T-06 schema handoff

Schema-only worker7a7a25693ecb2b1db836c448005e7b429cc4787f integrated as8d73b10. Root inspected SQL/schema, applied migration0006 to isolated pi_integration and passed typecheck. This releases metadata to T-07, which adopted it as e3216aeada8b62cbd546df281fa860d48f47bdfa. T-06 continues services/UI/tests without further schema edits; both tickets remain open pending complete integrated verification. Root mounts LifecycleControls, AiDraftPanel(opportunityId) and AiSettings, and extends startup recovery with recoverInterruptedAiRuns. T-07 private referenceMap will support later person/source snapshot purge.

## Early T-06 and T-07 checks

Bounded read-only T-06 review of changing sources atop7a7a256 identified legacy completion dates invented on follow-up edits, resolved follow-ups remaining resolved after rescheduling, and linked partnerships movable to another company. Root also identified agreement-date coupling to contribution dates and the older graph-history projection using recording dates as occurrence dates. Worker reports repairs and PostgreSQL regressions in progress; root has not integrated or verified this application work yet.

Bounded read-only T-07 review of changing sources atop adopted e3216ae identified short recorded names omitted by minimization and saved-run history depending on a valid new outbound packet. Root also requested exact source preview, generic role choice, named-contact/route compatibility, rejection of invented names mixed with legitimate roles, Unicode/email cases, empty/partial draft checks, free-text invented score/probability checks, bounded UTF-8 envelopes and stable action keys after uncertain client responses. Worker is repairing/testing these in isolation. No completed T-06/T-07 or final feature review is claimed.


## T-06 integrated application checkpoint

Worker dcb4daf0321a8c480b2bcdaafbdefcb5042c440e integrated as bbaf70fce94e1397b681b471c0042e60ce9071a6. Coordinator36470bc29870246e5ab271e1dcd879fe400902b6 connects actual LifecycleControls and OutreachActivities to opportunity detail, with pipeline navigation, dashboard follow-ups and company-history links. Lint/types/build/unit14/PG59/Chromium10 pass on the integrated application. Existing first-workflow coverage uses the new recorded-action controls and preserves completion, brief edits and overdue checks. Fictional390px rendered detail was inspected. Read-only reviewer /root/test_runtime confirms the three P2 repairs at bbaf70f and the independent occurrence/contribution dates and history projection; composition at36470bc is independently confirmed with no material finding. #7 is closed with integrated criterion evidence. Full-feature review and remote CI remain pending.

T-07 worker b9841d51668e472194694e8c20ba9eabd324c81c is committed but not integrated. Its adopted T-06 schema commit must not be replayed. Bounded review confirms short-name redaction and saved-history fixes, but the role-string invented-name exemption and a recorded contact without a selected nonrefused route remain open. The same isolated worker is repairing these before coordinator integration.


T-07 base implementation integrated as46ee7b7 without replaying its adopted schema. Root has mounted actual AI detail/settings controls and dynamic configuration status, optional Compose credential, and startup recovery, pending final validation repair and full integrated checks. Migration0007 and startup recovery apply successfully to isolated pi_integration. Read-only T-08 preparation is assigned to /root/foundation; implementation remains blocked pending T-07 verification.


## T-07 integrated checkpoint

Worker b9841d51668e472194694e8c20ba9eabd324c81c integrated as46ee7b7. Focused repair717c24c2ad264992dd476b9a020c6b6a82696e4f integrated asbbcfcfd74b5f25bdaaa6cdd732180c13ab884d48. Root01c969f1de9e3ee6821d471820754956fe990fc5 mounts actual AI context/draft and settings controls, dynamic configuration status, optional Compose credential and startup recovery for both run types. Final lint/types/build/unit31/PG76 pass. Full Chromium14 passed on actual pages before the nonvisual validator repair; new validator cases pass in unit/PG tests. Fictional390px AI context/settings rendered screenshots inspected. No live provider calls or real credentials were used. Bounded read-only reviewer /root/test_runtime confirms all earlier material repairs atbbcfcfd and actual composition at01c969f, with no remaining material finding in that bounded review. #8 is closed and #9/#10 are eligible. Final complete-feature review and remote CI remain pending.

Read-only T-08 preparation identifies all historical snapshot/import/AI dependencies and organization-lock/privacy-revision concurrency seams. Planned audit metadata contains identifiers/counts only. Privacy confirmation binds active administrator and current impact; delayed imports/AI must not resurrect removed material. Purged opportunities require a useful regeneration/history view. This plan remains withinF-02/F-15, pending implementation and verification.


## T-08 and T-09 assignments

Both workers start from verified application01c969f1de9e3ee6821d471820754956fe990fc5. T-08/#9 is assigned to /root/foundation in /Users/henrik.noteless/.codex/worktrees/pi-t08-privacy/partnership-intelligence, branchcodex/pi-t08-privacy, isolatedpi_t01 database5541/app3103. It owns privacy/export/delete/retention/audit and minimum shared serialization/no-assessment-history fixes, plus migration0008 released early. Root owns final settings composition.

T-09/#10 is assigned to /root/graph in /Users/henrik.noteless/.codex/worktrees/pi-t09-demo/partnership-intelligence, branchcodex/pi-t09-demo, isolatedpi_t01 database5544/app3104. It owns fictionalRiverbend seed/resetguards/docs, accessibility/sharedCSS/navigation/usefulloading-error-empty states and bounded detail density polish. It waits for committed0008 schema metadata before any subsequent demo sentinel migration0009. Workers coordinate detail changes directly; root integrates serially and verifies. Neither worker updates delivery/tracker/PR.

T-06 and T-07 clean worker checkouts have been queued for managed archival after integration; screenshots and source evidence remain in the feature or /private/tmp. No needed ignored files were present. T-01 remains open solely for final remoteCIcriterion, T-10 is blocked pendingT08/T09, and parent#1 remainsopen until PRmerge.


## T-08 schema handoff and early review

Worker schema ad19d6dda6fac46f97d2a5022bedfe2b39d38c15 was inspected and integrated as b44bb211ebf2a522c253bdd1c84253db2cfde4d5. Coordinator applied migration0008 to isolated pi_integration and passed typecheck. T-09 is released to adopt this exact metadata before generating its owned0009 demo sentinel. Schema handoff does not close T-08.

Bounded early read-only privacy review is assigned to /root/test_runtime against emerging services in the T-08 worker checkout. It targets historical dependencies, signed impact, private-data races and coherent outcomes; unfinished UI is not a completed acceptance claim. Root is preparing final operating/restore verification from current code and primary Caddy/PostgreSQL documentation; T-10 implementation remains blocked pending integrated T-08/T-09 behavior.


## Early privacy and demo review progress

Read-only reviewer /root/test_runtime found three P2 issues in emerging T-08 sources atopad19d6d: event-only personal narratives were absent from impact selection; direct capability/incentive descriptions could retain aliases independently of supporting source text; and short names used unbounded substring matches that selected unrelated words. The worker reports repaired selection/boundaries and added regressions, still pending committed integration and verification. Root additionally requested removal of related scrubbed-record import mappings and current locked-organization fields in snapshot/purge decisions. Known no-assessment UI and concurrency seams were unfinished acceptance work, not a completed ticket claim.

T-09 adopted privacy schema as e43a642 and owns0009_dark_zarek. Initial worker-only no-key seed/fixture checks report exact12/6/4/3/8 and valid warm/cold/history/refusal/decline/follow-up distinctions. Root identified a difference between the connection verified by the guard and the immutable application write pool; the worker now verifies pool.options.connectionString before connecting or mutating. Bounded source reviewer /root/test_runtime confirms the repair and no new material guard/dataset issue in changing sources. Real CLI/provision, browser and finalcommit evidence remain pending. Harbor Workshop Logistics replaces a recognizable real-company name in the fictional fixture.

The original T-06 and T-07 worker attachments now confirm archived_worktree, with recoverable snapshots. Integration/T-08/T-09 are the active checkouts. The final operating/restore outline is prepared locally at /private/tmp/pi-t10-operating-outline.md and makes no completed-runtime claim.


## Privacy and demo final worker verification in progress

Read-only reviewer `/root/test_runtime` inspected the changing T-08 sources atop `ad19d6dda6fac46f97d2a5022bedfe2b39d38c15` and confirms the earlier event, capability/incentive and short-name selection repairs. The reviewer also checked scrubbed-record mappings, current locked organization fields, administrator rechecks, privacy revisions, late AI completion and readable assessment-less detail/pipeline pages. No additional material code finding was reported. The event regression needs an isolated company/opportunity because the combined fixture could mask removal of the event scan; the implementation worker is adding that case. This is bounded source review, not final feature review.

T-08 worker checks report lint/types, 33 unit and 85 PostgreSQL tests passing, including queued-edit/import/AI rejection and a delayed provider response after deletion. A stronger completed-history fixture and the requested development logging suppression are receiving final checks. T-09 worker checks report lint/types, 31 unit, 80 PostgreSQL and 15 Chromium tests passing, with final graph/disclosure edits receiving affected browser checks and a production build. These are worker results, not integrated closure evidence. Both tickets remain open, and T-10 remains blocked until their integration is verified.


## T-08 integrated checkpoint

Worker `6056f4c5bbd8ff3d40c6bd5f3fcb5d75ee17916a` integrated as `cd180a3`; root `7f6dbb460ca52b35f3ff2de7755a58cba045af0e` mounts administrator privacy controls on actual Settings. Coordinator lint, types, production build, 33 unit and all 85 PostgreSQL tests pass. The actual Settings/detail/pipeline privacy browser test passes, covering preview/cancel/confirm, preserved agreement history and same-opportunity regeneration. Fictional desktop/390px Settings and outcome screenshots were inspected. The isolated event-only regression passes and an intentionally removed event scan makes it fail; the source was restored before commit.

Read-only reviewer `/root/test_runtime` confirms exact integrated composition and earlier selection/concurrency repairs at `7f6dbb4`, with no material finding in this bounded inspection. #9 closes with integrated criterion evidence. Final complete-feature review, fresh Compose/restore verification and remote CI remain pending. T-09's final browser run identified an initial AI Settings response race; its worker is making a bounded UI repair and regression without changing the AI service contract.


T-07/#8 is reopened after T-09 browser verification confirmed that a late initial Settings response can overwrite edited model input. The worker repair includes abort cleanup and an edited/saved guard. Its deterministic delayed-response regression passes fixed code and fails the original component. Root will reclose #8 only after integrated verification; no service or permission contract change is proposed. T-09 continues the assigned repair and final checks.


## T-09 and AI Settings repair integrated checkpoint

Worker `84750eb9236fa8cdd9e2f0d06aba0ed27023bd05` integrated cleanly as `8c1bc0dc6e4f0574cf5057b4936e391f5f961ed4`; its adopted privacy schema was not replayed. The no-assessment fallback and actual administrator Settings privacy mount remain. Coordinator lint/types/build, 33 unit, all 89 PostgreSQL and all 17 Chromium tests pass. Browser coverage includes the delayed initial AI Settings response, actual privacy flow, all ten main screens at 390px, keyboard route/text/source disclosures, labelled validation focus, onboarding/import, selected alternative route, outreach and outcomes. Fictional rendered screenshots were inspected.

Coordinator independently reset the dedicated restricted `pi_demo` companion through the no-key CLI and read exact counts `12/6/4/3/8`, with zero AI runs. The PostgreSQL suite exercised actual pool mismatch, live/private identity preservation, concurrent CLI seeds, partial recovery and active connection refusal. Read-only reviewer `/root/test_runtime` confirms the integrated safety/repair/disclosure boundaries at this exact commit with no material finding in the bounded inspection. #8 is reclosed for the verified UI repair, #10 closes, and #11 becomes eligible. Fresh separate Compose startup is explicitly T-10 work and is not claimed by these checks.


## T-10 runtime assignment

T-10/#11 is assigned to `/root/foundation` in `/Users/henrik.noteless/.codex/worktrees/pi-t10-runtime/partnership-intelligence`, branch `codex/pi-t10-runtime`, from verified checkpoint `7ec3fe74ef51b4fc1ec294ba97e677608229cedd`. It owns guarded test-only release fixtures/checks and actual fresh local-clone Compose/restart/operator-recovery/full-record backup/restore/demo evidence. Dedicated projects are `pi-release` on 3110, `pi-release-restore` on 3111 and `pi-release-demo` on 3115 under the existing isolated Docker context. It must not touch root PostgreSQL 5540 or shared operating docs/config/CI. Root owns those files and will provide their committed runbook/config before the final runtime workflow. No public DNS/TLS deployment or live provider call is authorized or claimed.

The clean T-08 and T-09 worker checkouts were queued for managed archival after integration; committed evidence and fictional screenshots remain preserved. Root and runtime worktrees are retained. All final runtime, full-feature review and remote CI evidence is still pending.
