# T-02 worker verification

Worker branch `codex/pi-t02-first-workflow`, based on `2f9e82126fd11e53571c5a05bdbdf76764af1846`. This is worker-local evidence, not coordinator integration, remote CI, issue closure or a release. Only fictional records were used.

## Acceptance criteria

1. An invited editor completed the Riverbend machining case in Chromium through actual forms. The user saved an active need, a known company, source-linked capability, attributed employment observation, and a person with alumni/advisor roles; generated a deterministic opportunity, assigned a login-account owner, and recorded an introduction action. No AI configuration was present.
2. PostgreSQL tests confirm multiple affiliations, separate person/user records, explicit relationship endpoints, saved evidence/provenance/date fields, and database/runtime rejection of impossible dates, self-links, current previous employment and invalid foreign references without partial writes. Future/unknown/ended employment and contact-only roots never become current internal introduction paths.
3. All eight v1 factors expose value/null, rationale, origin and sources. The independent fixture fit4/relationship3/urgency2 yields exactly 46.25 points and 55% scoring coverage. Zero and unknown remain distinct; no total is renormalized or labelled a success probability. Reviewed scores append immutable versions and invalid known-factor input makes no assessment write.
4. The brief visibly separates supplied unreviewed claims, reviewed/disputed source state, inferences, suggested contact roles and missing information. It invents no named manager or decision authority. Willingness/feasibility remain unknown unless recorded; refusal is preserved and never produces a recommendation to ask the refusing person for an introduction. Disputed employment cannot support a current route.
5. The browser planned an action and confirmed it was not completed outreach, completed it, regenerated the brief, and refreshed. The custom ask, owner and completed event persisted. Due/overdue follow-ups appeared in the configured organization calendar timezone. PostgreSQL tests also verify changed inputs invalidate the current assessment, completed events cannot revert to drafts, and concurrent retries do not create duplicate active opportunities.

## Verification

Passed `npm run lint`, `npm run typecheck`, `npm run build`, `npm test` with 10 tests, and `npm run test:integration` with 17 tests. Two Chromium E2E cases passed: the foundation setup/auth case and the new invited record-entry-to-action workflow. The latter additionally checks anonymous opportunity/record/activity endpoints return 401. `npm audit` reported zero vulnerabilities. Migrations applied against the real isolated PostgreSQL 18 database, including the new domain constraints.

Tests used matching `DATABASE_URL` and `TEST_DATABASE_URL` for `pi_t01` on localhost port 5541, private fictional auth environment values, `BETTER_AUTH_URL=http://localhost:3102`, explicit local HTTP, and `E2E_PORT=3102`. The E2E helper resets the isolated database before the workflow case; tests run serially. The test helper's organization/user cascades clear all new business tables.

Desktop and 390px opportunity screenshots were visually inspected. The mobile workflow had no horizontal page overflow. Files outside the repository:

- `/private/tmp/pi-t02-opportunity-desktop.png` and `pi-t02-opportunity-mobile.png`, complete detail pages.
- `/private/tmp/pi-t02-opportunity-hero-desktop.png` and `pi-t02-opportunity-hero-mobile.png`, readable first viewport.
- `/private/tmp/pi-t02-network-mobile.png`, saved fictional people and relationship forms.

The development server on 3102 is stopped after inspection. The external fictional PostgreSQL container remains available. The coordinator must independently verify integration and current-commit GitHub CI. Full graph traversal/imports/lifecycle/AI/demo/release work remains with later tickets.
