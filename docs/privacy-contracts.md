# Privacy integration contracts

Migration `0008_late_pestilence` adds `organization.privacyRevision` and minimal `auditEvent` operational metadata. Adopt schema/snapshot/journal before T-09 generates 0009. Audit action is person_deleted/exported/retention_purged, with organization/actor UUIDs, optional target UUID, request UUID, numeric counts and recording timestamp. No name, narrative, evidence, token or credential belongs in audit.

Privacy services will live in `src/modules/privacy/`. Person deletion preview/confirmation binds active admin, current impact digest and privacy revision. Confirmation uses the organization write lock and invalidates older in-flight import/AI contexts. Personal dependents are removed or explicitly redacted while structured outcome states, dates and partnership links remain. Privacy revision is independent of demo installation isolation; T-09 owns a separate demo sentinel strategy.

Root owns Settings composition. T-08 supplies a standalone `PrivacySettings` component and admin endpoints. No shared navigation/global CSS/README/delivery edits are planned. T-08 may add the minimal no-assessment opportunity/pipeline fallback and exact-regeneration seam so deleting historical snapshots leaves usable private history. T-09 should avoid those files until T-08 handoff.
