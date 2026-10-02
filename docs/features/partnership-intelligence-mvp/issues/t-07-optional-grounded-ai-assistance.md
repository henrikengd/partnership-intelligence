# T-07: Add optional AI briefs with evidence validation and context review

## Parent and requirements

Parent feature: `partnership-intelligence-mvp`.
Parent issue: https://github.com/henrikengd/partnership-intelligence/issues/1.
Canonical contract: [specification r1](https://github.com/henrikengd/partnership-intelligence/blob/main/docs/features/partnership-intelligence-mvp/spec.md).
Requirements: F-13, F-14.

## What to build

Implement one optional configurable provider behind a small adapter, schema-validated partnership/outreach drafts, admin enablement, and per-request editable outbound context review. Reuse deterministic candidates, paths and scoring. Send only the selected evidence/need/company and minimum pseudonymous route metadata. Keep generated suggestions separate from facts and score inputs. No autonomous tools or email delivery.

## Acceptance criteria

- [ ] AI is disabled by default and the product remains usable without credentials. Only admins change its configuration and secrets stay server-side.
- [ ] Every live request previews an editable packet without personal names/contact details or a full graph by default. Local resolution supplies names only in the resulting private UI.
- [ ] Requests obey the spec limits on candidate count, input/output size, per-call timeout, concurrency and explicit retries. Interrupted work is visible.
- [ ] Schema/ID checks reject invalid citations and invented named contacts; valid source references do not automatically verify semantic support.
- [ ] Refusal, malformed/partial output and timeout preserve deterministic assessments, user edits, and activities and allow a safe retry.
- [ ] Source text is untrusted data and cannot issue tools, write records, change scores, or access secrets. Drafting never sends outreach.

## Blocked by

[T-05 / #6](https://github.com/henrikengd/partnership-intelligence/issues/6).

## Shared contracts and change areas

src/server/ai adapter/context/schema validation, admin settings, generation run statuses, brief/outreach drafting and opportunity detail. Coordinate UI/assessment history edits with T-06.

Proposed paths do not yet exist; verify the actual code and migrations before editing. Respect the complete spec's bounds and exclusions.

## Verification

Use a controlled fake provider for success, refusal, timeout, malformed/incomplete output, invalid IDs, invented contacts, and hostile source text. Inspect the actual constructed packet for data minimization and context edits. A live-provider smoke test is optional and only uses fictional data; fake-provider coverage must pass without keys.

## Status

blocked. This ticket is a published plan, not authorization to start implementation or create branches. Close it only with integrated verification evidence.
