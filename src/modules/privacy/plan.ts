import { createHash } from "node:crypto";
import type { PrivacySnapshot } from "./snapshot";
import { DomainError } from "../../server/errors";
export function deletionPlan(s: PrivacySnapshot, personId: string) {
  const p = s.data.people.find((p) => p.id === personId);
  if (!p) throw new DomainError("NOT_FOUND", "Person not found.", 404);
  const aliases = new Set(
    [p.name, p.email].filter((v): v is string => Boolean(v)),
  );
  const opaque = new Set(
    [p.id, p.sourceId].filter((v): v is string => Boolean(v)),
  );
  // Collect past identities only when a stable person ID anchors them.
  for (const a of s.assessments)
    for (const n of a.brief.path?.nodes ?? [])
      if (n.kind === "person" && n.id === p.id) aliases.add(n.label);
  for (const b of s.imports)
    for (const r of b.rows)
      if (r.input.id === p.id || r.candidates.some((c) => c.id === p.id)) {
        for (const key of ["name", "email"])
          if (typeof r.input[key] === "string")
            aliases.add(String(r.input[key]));
        if (typeof r.input.sourceId === "string") opaque.add(r.input.sourceId);
        for (const c of r.candidates) if (c.id === p.id) aliases.add(c.label);
      }
  const escape = (a: string) => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const terms = [...aliases, p.id]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map(escape);
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}_])(?:${terms.join("|")})(?![\\p{L}\\p{N}_])`,
    "iu",
  );
  // Human identities use Unicode boundaries. Opaque source IDs require exact string identity,
  // never a match against numeric revisions or substrings such as Li in facilities.
  const contains = (value: unknown): boolean =>
    typeof value === "string"
      ? opaque.has(value) || pattern.test(value)
      : Array.isArray(value)
        ? value.some(contains)
        : value && typeof value === "object"
          ? Object.values(value).some(contains)
          : false;
  const relationships = s.data.relationships.filter(
    (r) => r.personId === p.id || r.targetPersonId === p.id,
  );
  const relationshipIds = new Set(relationships.map((r) => r.id));
  const evidenceIds = new Set([
    ...relationships.map((r) => r.evidenceId),
    ...s.data.evidence.filter((e) => contains(e)).map((e) => e.id),
  ]);
  const companyIds = new Set(
    relationships
      .map((r) => r.companyId)
      .filter((v): v is string => Boolean(v)),
  );
  for (const r of [...s.data.capabilities, ...s.incentives])
    if (evidenceIds.has(r.evidenceId) || contains(r)) {
      companyIds.add(r.companyId);
      evidenceIds.add(r.evidenceId);
    }
  for (const company of s.data.companies)
    if (contains(company)) companyIds.add(company.id);
  const privateNeedIds = new Set(
    s.data.needs.filter(contains).map((n) => n.id),
  );
  const opportunityIds = new Set<string>();
  for (const op of s.data.opportunities)
    if (privateNeedIds.has(op.needId) || contains(s.data.organization))
      opportunityIds.add(op.id);
  for (const event of s.events)
    if (contains(event)) opportunityIds.add(event.opportunityId);
  for (const a of s.assessments)
    if (
      a.brief.path?.nodes.some((n) => n.kind === "person" && n.id === p.id) ||
      a.brief.path?.edges.some(
        (e) =>
          relationshipIds.has(e.id) ||
          e.evidenceIds.some((id) => evidenceIds.has(id)),
      ) ||
      a.brief.claims.some((claim) =>
        claim.evidenceIds.some((id) => evidenceIds.has(id)),
      ) ||
      Object.values(a.factors).some((f) =>
        f.evidenceIds.some((id) => evidenceIds.has(id)),
      ) ||
      contains(a)
    )
      opportunityIds.add(a.opportunityId);
  for (const r of s.reviews)
    if (r.targetPersonId === p.id || contains(r))
      opportunityIds.add(r.opportunityId);
  for (const r of s.aiRuns)
    if (
      r.referenceMap.personIds.includes(p.id) ||
      Object.values(r.referenceMap.people).includes(p.id) ||
      r.referenceMap.relationshipIds.some((id) => relationshipIds.has(id)) ||
      contains(r)
    )
      opportunityIds.add(r.opportunityId);
  for (const a of s.activities)
    if (a.targetPersonId === p.id || contains(a))
      opportunityIds.add(a.opportunityId);
  for (const o of s.data.previousOutreach)
    if (o.personId === p.id || contains(o)) companyIds.add(o.companyId);
  for (const p of s.data.partnerships)
    if (contains(p)) companyIds.add(p.companyId);
  for (const o of s.data.opportunities)
    if (opportunityIds.has(o.id) || contains(o.manualBrief))
      companyIds.add(o.companyId);
  // Company-level history can contain personal narrative without its own person FK.
  for (const o of s.data.opportunities)
    if (companyIds.has(o.companyId)) opportunityIds.add(o.id);
  const affected = (id: string) => opportunityIds.has(id);
  const scrubbedRecordIds = new Set([
    p.id,
    ...relationshipIds,
    ...evidenceIds,
    ...s.data.capabilities
      .filter((r) => evidenceIds.has(r.evidenceId))
      .map((r) => r.id),
    ...s.incentives
      .filter((r) => evidenceIds.has(r.evidenceId))
      .map((r) => r.id),
    ...s.data.partnerships
      .filter((r) => companyIds.has(r.companyId) || contains(r))
      .map((r) => r.id),
    ...s.data.companies.filter(contains).map((r) => r.id),
    ...s.data.needs.filter(contains).map((r) => r.id),
    ...s.data.relationships
      .filter((r) => evidenceIds.has(r.evidenceId) || contains(r))
      .map((r) => r.id),
  ]);
  const counts = {
    people: 1,
    affiliations: s.data.affiliations.filter((a) => a.personId === p.id).length,
    relationships: relationships.length,
    relationshipNarratives: s.data.relationships.filter(
      (r) =>
        !relationshipIds.has(r.id) &&
        (evidenceIds.has(r.evidenceId) || contains(r)),
    ).length,
    companies: s.data.companies.filter(contains).length,
    needs: s.data.needs.filter(contains).length,
    otherPersonNotes: s.data.people.filter(
      (r) => r.id !== p.id && contains(r.notes),
    ).length,
    organizationProfile: contains(s.data.organization) ? 1 : 0,
    evidence: evidenceIds.size,
    capabilities: s.data.capabilities.filter((r) =>
      evidenceIds.has(r.evidenceId),
    ).length,
    incentives: s.incentives.filter((r) => evidenceIds.has(r.evidenceId))
      .length,
    opportunities: opportunityIds.size,
    assessments: s.assessments.filter((a) => affected(a.opportunityId)).length,
    reviews: s.reviews.filter((r) => affected(r.opportunityId)).length,
    aiRuns: s.aiRuns.filter((r) => affected(r.opportunityId)).length,
    activities: s.activities.filter((a) => affected(a.opportunityId)).length,
    outcomes: s.events.filter((e) => affected(e.opportunityId)).length,
    partnerships: s.data.partnerships.filter((p) => companyIds.has(p.companyId))
      .length,
    previousOutreach: s.data.previousOutreach.filter((o) =>
      companyIds.has(o.companyId),
    ).length,
    pendingImports: s.imports.filter((b) => b.status === "pending").length,
    importMappings: s.imports
      .flatMap((b) => b.mappings)
      .filter((m) => scrubbedRecordIds.has(m.recordId)).length,
    generationRuns: s.runs.filter((r) =>
      r.selection.companyIds.some((id) => companyIds.has(id)),
    ).length,
  };
  const canonical = JSON.stringify(s, (_, v) =>
    Array.isArray(v) && v.every((x) => x && typeof x === "object" && "id" in x)
      ? [...v].sort((a, b) => String(a.id).localeCompare(String(b.id)))
      : v,
  );
  const digest = createHash("sha256").update(canonical).digest("hex");
  return {
    person: p,
    aliases: [...aliases],
    contains,
    relationshipIds,
    scrubbedRecordIds,
    evidenceIds,
    companyIds,
    opportunityIds,
    counts,
    digest,
  };
}
