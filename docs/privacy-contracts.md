# Privacy integration contracts

Migration `0008_late_pestilence` adds `organization.privacyRevision` and minimal `auditEvent` operational metadata. Adopt schema/snapshot/journal before T-09 generates 0009. Audit action is person_deleted/exported/retention_purged, with organization/actor UUIDs, optional target UUID, request UUID, numeric counts and recording timestamp. No name, narrative, evidence, token or credential belongs in audit.

Privacy services will live in `src/modules/privacy/`. Person deletion preview/confirmation binds active admin, current impact digest and privacy revision. Confirmation uses the organization write lock and invalidates older in-flight import/AI contexts. Personal dependents are removed or explicitly redacted while structured outcome states, dates and partnership links remain. Privacy revision is independent of demo installation isolation; T-09 owns a separate demo sentinel strategy.

Root owns Settings composition. T-08 supplies a standalone `PrivacySettings` component and admin endpoints. No shared navigation/global CSS/README/delivery edits are planned. T-08 may add the minimal no-assessment opportunity/pipeline fallback and exact-regeneration seam so deleting historical snapshots leaves usable private history. T-09 should avoid those files until T-08 handoff.

## Settings mount and endpoints

Root Settings composition mounts `PrivacySettings` from `src/components/privacy-settings.tsx` only for administrators, with `initial={await getPrivacySettings(requestHeaders)}`. Each direct service/endpoint independently requires a live admin account. POST endpoints check the configured origin and bounded JSON bodies. GET `/api/admin/privacy/export?kind=people` returns an attachment with `no-store`; the allowlisted datasets are exported from one locked snapshot and never include authentication accounts, sessions, credentials, original uploads, or pending import rows.

POST `/api/admin/privacy/preview` accepts `{personId}` and returns impact counts plus a signed, administrator-bound token valid for ten minutes. No private data or audit event changes during preview. Cancel discards this token in the UI. POST `/api/admin/privacy/confirm` accepts `{token,confirmed:true}`. The transaction rechecks active admin access, current privacy revision and the complete current workspace digest before mutation. A dependent edit requires a fresh preview. Replaying a completed request returns the prior numeric audit counts without another deletion.

## Dependency and preservation policy

Stable person IDs in historical path nodes and pending import candidates supply prior names/email aliases. Name matching uses Unicode boundaries; opaque source IDs require exact string identity. Direct employment/known-contact sources, factor evidence, reviews, AI reference maps, manual briefs, activity targets, outcome narratives and company history identify affected opportunities. Explicit capability/incentive narrative references also count even if their source itself is nonpersonal. Same-company generated and communication history is conservatively invalidated because it may include an unstructured personal narrative.

All affected assessment versions, review snapshots, AI packets/drafts/reference maps and generation summaries are removed. Related import mappings disappear, and every pending import is cancelled and cleared. Personal evidence is explicitly superseded and redacted, rather than leaving references to a silently missing source. Related free-text narratives are replaced with a deletion notice. Other people retain their own identities; a note mentioning the deleted person can be redacted.

Opportunity state, active owner, company/need IDs, partnership link, contribution type/state/dates, outcome type/state/date and activity kind/status/actual occurrence/recording timestamp/follow-up resolution remain. Privacy redaction is an explicit exception to ordinary completed-action immutability. An assessment-less opportunity/pipeline view shows these records and supports exact-opportunity regeneration; closed proposals must be explicitly reopened first. No scoring or readiness/AI panel pretends a removed snapshot exists. Regeneration uses surviving records and requires a new review.

Unknown aliases, initials and unlinked prose cannot be discovered reliably from arbitrary text. Review the impact and surviving records for such material. The system does not infer a new identity merely because unrelated text contains a short substring.

## Concurrency

Workspace mutations that can restore personal content use the organization row lock, then opportunity/activity locks where needed. `lockWorkspace(tx,context)` rejects an action whose pre-lock `privacyRevision` changed while it waited and replaces its organization context with the locked current profile. Manual domain edits, brief edits, imports, scoring/reviews, lifecycle/actions and generation/incentive writes share this check. Profile edits lock the same row, reject an old privacy epoch, and invalidate frozen input revisions.

AI provider calls remain outside transactions. Submission compares the current locked input revision and assessment ID to its reviewed packet. Completion locks organization → opportunity → AI run and updates only a still-present running attempt with current inputs/configuration. Deletion removes the run; late completion returns `DATA_DELETED` and never inserts a replacement. The privacy admin role is rechecked under the auth advisory lock to serialize account revocation during confirmation/export.

Browser verification can use `PRIVACY_TEST_PATH` for a temporary authenticated harness while the coordinator mounts Settings. The committed test defaults to `/settings`; no harness route is shipped.
