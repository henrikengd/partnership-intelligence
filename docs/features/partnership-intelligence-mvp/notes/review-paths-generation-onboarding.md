# Review repairs: paths, regeneration and onboarding

Worker `codex/pi-review-paths` starts from verified integration `74175fae949a4fd173830b0ca63bdfba54a78572`. The coordinator assigned three confirmed P2 findings. No schema, migration, dependency, privacy authorization or AI-service change is included.

## Repairs and regression evidence

1. **Dense paths.** Enumeration retains at most three compact current candidates and three historical candidates. Only those final candidates materialize labels, nodes, edges and warnings. The existing comparison order, directed records, affiliation root selection, source/date classification, weakest personal strength, dated willingness/refusals, two-person maximum and stable IDs are preserved. Employer/personal indexes append without repeatedly copying their arrays. Dense unit cases cover 160,000 paths, reversed enumeration, exact expected ranking and separate current/historical pools. The original function fails the materialization bound with 320,000 person-label reads rather than six.
2. **Exact regeneration after closure.** Validate the same active company/need/type refresh before closed-history acknowledgment; apply acknowledgment only when no exact refresh is requested. An earlier decline, explicitly created linked proposal, edited need and ordinary actual Regenerate button now refresh the existing ID and append a version. Stored regression checks stale-to-current input revision, preserved prior link, two proposals only, completed idempotent replay, invalid closed-ID rejection and continued creation acknowledgment. Both stored and browser scenarios fail the original code's `CLOSED_HISTORY` guard.
3. **Cash onboarding.** The approved read-only `WorkspaceData.companyNeedIncentives` array is scoped to the current organization. Readiness reuses `candidatePreviews` with those saved incentives, so capability/incentive category and source rules have one implementation. No synthetic cash capability is needed. Supplied/reviewed current incentive evidence exposes the actual Generate brief action; disputed, superseded, future-observed and future-reviewed evidence does not. PostgreSQL checks compare readiness with candidate eligibility, then generate the supported cash proposal. The keyboard/390px browser flow uses the actual onboarding page/action. Both new regressions fail original readiness behavior.

Temporary original-code experiments used trap-protected restoration. Fixed files were restored before final verification. Negative proof is saved outside Git at `/private/tmp/pi-review-old-code-regressions.txt`.

## Dense-path measurement

Separate Node processes used the same fictional fixture and identical returned stable IDs. The fixture has internal members explicitly knowing one contact, with distinct dated ended employment periods. Figures are local measurements, not a production timing guarantee. Input/index storage still scales with recorded data and CPU still enumerates possible routes; retained ranked candidates and final snapshots stay bounded.

| Implementation | Relationships | Possible paths | Returned | Person-label reads | Heap growth |  Peak RSS |     Time |
| -------------- | ------------: | -------------: | -------: | -----------------: | ----------: | --------: | -------: |
| Original       |           800 |        160,000 |        3 |            320,000 |   279.4 MiB | 480.5 MiB |   283 ms |
| Repair         |           800 |        160,000 |        3 |                  6 |     1.5 MiB |  76.6 MiB |    66 ms |
| Repair         |         5,000 |      6,250,000 |        3 |                  6 |     5.7 MiB |  88.0 MiB | 1,272 ms |

The mixed dense unit case returns three current and three historical routes with only 12 person-label reads and unchanged results when record order reverses. No heuristic cut-off, probability, graph database or new service is introduced.

## Final worker verification

- `npm ci`: installed the unchanged lockfile. Current npm audit reports five high advisories; JSON is preserved at `/private/tmp/pi-review-npm-audit.json` and sent to the coordinator for release assessment. No automatic dependency upgrade is included.
- `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`: passed. Unit total 35.
- `npm run test:integration`: all 91 PostgreSQL tests passed on assigned isolated port 5544/database `pi_t01`.
- `npm run test:e2e`: all 19 Chromium tests passed after the final source repairs, including actual history regeneration, cash onboarding and existing assessment-less privacy recovery.
- Database and browser suites ran sequentially. Build ran only after the browser server stopped.
- Fictional screenshots inspected: `/private/tmp/pi-review-linked-refresh.png`, `/private/tmp/pi-review-cash-onboarding-390.png`. Screenshots, environments and temporary harnesses are not committed.
- `git diff --check`: passed. No schema/migration or unrelated changes. Assigned server port 3104 is stopped at handoff; parent owns integration and issue/PR updates.

These are source-level review repairs. They do not replace the coordinator/runtime worker's full release, Compose, backup or advisory assessment.
