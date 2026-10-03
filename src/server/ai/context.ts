import {
  AiError,
  packetSchema,
  draftSchema,
  type AiPacket,
  type ReferenceMap,
} from "./contracts";
import type { WorkspaceData } from "../../modules/records/service";
import { DomainError } from "../errors";
import { isGenericRole } from "./roles";
import type { RelationshipPath } from "../../modules/opportunities/contracts";
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function redact(
  value: string,
  people: { name: string; email?: string | null }[],
) {
  let result = value
    .replace(/[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+/gu, "[private email]")
    .replace(/https?:\/\/[^\s]+/gi, "[source link omitted]");
  const names = people
    .flatMap((p) => [
      p.name.trim(),
      ...p.name.split(/\s+/).filter((n) => n.length >= 3),
      p.email ?? "",
    ])
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  for (const name of names)
    result = result.replace(
      new RegExp(
        `(?<![\\p{L}\\p{N}_])${escape(name)}(?![\\p{L}\\p{N}_])`,
        "giu",
      ),
      "[private person]",
    );
  return result.replace(/(?:\+?\d[\d ()-]{6,}\d)/g, (match) =>
    /^\d{4}-\d{2}-\d{2}$/.test(match) ? match : "[private phone]",
  );
}
export function buildPacket(
  data: WorkspaceData,
  opportunityId: string,
  paths: RelationshipPath[],
  evidenceIds: string[],
  suggestedRole = "",
) {
  const record = data.opportunities.find((o) => o.id === opportunityId)!;
  const need = data.needs.find((n) => n.id === record.needId)!;
  const company = data.companies.find((c) => c.id === record.companyId)!;
  const map: ReferenceMap = {
    people: {},
    evidence: {},
    routes: {},
    relationshipIds: [],
    personIds: [],
  };
  const clean = (s: string) => redact(s, data.people);
  const selected = data.evidence.filter((e) => evidenceIds.includes(e.id));
  if (selected.length > 100)
    throw new DomainError(
      "AI_EVIDENCE_LIMIT",
      "This opportunity references more than 100 sources. Reduce its evidence selection before previewing AI context.",
    );
  if (
    suggestedRole &&
    (!isGenericRole(suggestedRole) || clean(suggestedRole) !== suggestedRole)
  )
    throw new DomainError(
      "INVALID_ROLE",
      "Supply a generic professional role, such as grant officer or manufacturing manager, without names or contact details.",
    );
  const packet: AiPacket = {
    need: {
      title: clean(need.title),
      description: clean(need.description),
      partnershipType: clean(record.partnershipType),
      deadline: need.deadline,
    },
    company: { name: clean(company.name) },
    evidence: selected.map((e, i) => {
      const ref = `E${i + 1}`;
      map.evidence[ref] = e.id;
      return {
        ref,
        claim: clean(e.claim),
        excerpt: clean(e.excerpt),
        observedDate: e.observedDate,
        reviewState: e.reviewState,
      };
    }),
    routes: paths.slice(0, 3).map((p, i) => {
      const ref = `R${i + 1}`;
      map.routes[ref] = p.id;
      map.relationshipIds.push(...p.edges.map((e) => e.id));
      return {
        ref,
        current: p.current,
        willingness: p.willingness,
        connections: p.edges.map((edge) => {
          const record = data.relationships.find((r) => r.id === edge.id);
          return {
            kind: record?.kind ?? "organization_affiliation",
            role: record?.title ? clean(record.title) : null,
          };
        }),
        people: p.nodes
          .filter((n) => n.kind === "person")
          .map((n) => {
            const existing = Object.keys(map.people).find(
              (k) => map.people[k] === n.id,
            );
            if (existing) return existing;
            const key = `P${Object.keys(map.people).length + 1}`;
            map.people[key] = n.id;
            return key;
          }),
      };
    }),
    allowedContactRoles: [
      ...new Set(
        [
          "Partnership manager",
          suggestedRole,
          ...data.relationships
            .filter((r) => r.companyId === company.id)
            .map((r) => r.title ?? ""),
        ].filter((role) => isGenericRole(role) && clean(role) === role),
      ),
    ].slice(0, 12),
    userInstructions:
      "Draft a specific partnership brief and an outreach message. Keep every explanation an inference pending human review.",
  };
  const selectedText = [
    need.title,
    need.description,
    company.name,
    ...selected.flatMap((e) => [e.claim, e.excerpt]),
    ...paths.flatMap((p) =>
      p.edges.map(
        (edge) => data.relationships.find((r) => r.id === edge.id)?.title ?? "",
      ),
    ),
  ]
    .join(" ")
    .toLowerCase();
  map.personIds = [
    ...new Set([
      ...Object.values(map.people),
      ...data.people
        .filter((p) =>
          [
            p.name.trim(),
            ...p.name.split(/\s+/).filter((n) => n.length >= 3),
            p.email ?? "",
          ].some((n) => Boolean(n) && selectedText.includes(n.toLowerCase())),
        )
        .map((p) => p.id),
    ]),
  ];
  return { packet: packetSchema.parse(packet), referenceMap: map };
}
export function validatePacket(
  raw: unknown,
  baseline: AiPacket,
  people: WorkspaceData["people"],
) {
  const parsed = packetSchema.safeParse(raw);
  if (!parsed.success) throw new AiError("INVALID_CONTEXT");
  const packet = parsed.data;
  const protectedValues = (p: AiPacket) => ({
    need: {
      partnershipType: p.need.partnershipType,
      deadline: p.need.deadline,
    },
    company: p.company,
    roles: p.allowedContactRoles,
  });
  if (
    JSON.stringify(protectedValues(packet)) !==
    JSON.stringify(protectedValues(baseline))
  )
    throw new AiError("INVALID_CONTEXT");
  for (const e of packet.evidence) {
    const source = baseline.evidence.find((b) => b.ref === e.ref);
    if (
      !source ||
      e.observedDate !== source.observedDate ||
      e.reviewState !== source.reviewState
    )
      throw new AiError("INVALID_CONTEXT");
  }
  if (
    new Set(packet.evidence.map((e) => e.ref)).size !== packet.evidence.length
  )
    throw new AiError("INVALID_CONTEXT");
  for (const r of packet.routes)
    if (!baseline.routes.some((b) => JSON.stringify(b) === JSON.stringify(r)))
      throw new AiError("INVALID_CONTEXT");
  if (new Set(packet.routes.map((r) => r.ref)).size !== packet.routes.length)
    throw new AiError("INVALID_CONTEXT");
  const serialized = JSON.stringify(packet);
  if (serialized.length > 12000) throw new AiError("CONTEXT_TOO_LARGE");
  const safe = JSON.stringify(JSON.parse(serialized), (_k, v) =>
    typeof v === "string" ? redact(v, people) : v,
  );
  if (safe !== serialized) throw new AiError("PRIVATE_CONTEXT");
  return packet;
}
export function validateDraft(
  raw: unknown,
  packet: AiPacket,
  people: WorkspaceData["people"],
) {
  const parsed = draftSchema.safeParse(raw);
  if (!parsed.success) throw new AiError("INVALID_DRAFT");
  const d = parsed.data;
  if (
    d.whyFit.some(
      (c) =>
        !c.evidenceRefs.length ||
        c.evidenceRefs.some((r) => !packet.evidence.some((e) => e.ref === r)),
    ) ||
    (d.routeRef && !packet.routes.some((r) => r.ref === d.routeRef)) ||
    (d.contact.personRef && !d.routeRef) ||
    packet.allowedContactRoles.some((role) => !isGenericRole(role)) ||
    (d.contact.role && !packet.allowedContactRoles.includes(d.contact.role))
  )
    throw new AiError("INVALID_REFERENCES");
  if (d.routeRef) {
    const selectedRoute = packet.routes.find((r) => r.ref === d.routeRef)!;
    if (
      !selectedRoute.current ||
      selectedRoute.willingness === "no" ||
      (d.contact.personRef &&
        selectedRoute.people.at(-1) !== d.contact.personRef)
    )
      throw new AiError("INVALID_REFERENCES");
  }
  const strings: string[] = [];
  const collect = (value: unknown): void => {
    if (typeof value === "string") strings.push(value);
    else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === "object")
      Object.values(value).forEach(collect);
  };
  collect(d);
  // Named targets belong only in validated pseudonym slots. Plain text uses placeholders or generic roles.
  if (
    strings.some(
      (s) =>
        redact(s, people) !== s ||
        /(?:\b\d+(?:\.\d+)?%\s+(?:chance|probability|likelihood)\s+of\s+(?:success|partnership)|\b(?:success\s+(?:chance|probability|likelihood)|(?:relationship|fit|priority|evidence|urgency|feasibility|overall)\s+score)\s*(?:is|:|=)?\s*\d+)/i.test(
          s,
        ) ||
        hasNamedContact(s, [
          ...packet.allowedContactRoles,
          packet.company.name,
        ]) ||
        hasUnlistedProperName(s, packet),
    )
  )
    throw new AiError("PRIVATE_DRAFT");
  return d;
}

function hasNamedContact(value: string, allowedTargets: string[]) {
  const targets =
    /\b(?:[Cc]ontact|[Aa]sk|[Ee]mail|[Ii]ntroduce|[Dd]ear|[Hh]i|[Hh]ello|[Mm]anager|[Nn]amed)\s+(\p{Lu}[\p{L}'’-]*(?:\s+\p{Lu}[\p{L}'’-]*)?)(?!\p{L})/gu;
  for (const match of value.matchAll(targets)) {
    const targetStart = match.index! + match[0].length - match[1].length;
    const tail = value.slice(targetStart);
    // Only an exact supplied target label is permitted. A role elsewhere cannot waive a name.
    const genericTarget = allowedTargets.some(
      (role) =>
        tail.startsWith(role) &&
        match[1].length <= role.length &&
        !/^[\p{L}\p{N}]/u.test(tail.slice(role.length)) &&
        !/^\s*(?:[-,:;(]\s*)?\p{Lu}/u.test(tail.slice(role.length)),
    );
    if (!genericTarget) return true;
  }
  return false;
}

// This conservative prose guard is not entity recognition or factual verification.
// Names belong in pseudonym slots. Preserve only exact supplied company/role/title labels.
function hasUnlistedProperName(value: string, packet: AiPacket) {
  let prose = value;
  const labels = [
    packet.company.name,
    packet.need.title,
    ...packet.allowedContactRoles,
  ]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  for (const label of labels)
    prose = prose.replace(
      new RegExp(
        `(?<![\\p{L}\\p{N}_])${escape(label)}(?![\\p{L}\\p{N}_])`,
        "giu",
      ),
      "[supplied label]",
    );
  // Unknown capitalized full names are prohibited even without an action verb.
  if (
    /(?<![\p{L}\p{N}_])\p{Lu}[\p{L}'’-]*\s+\p{Lu}[\p{L}'’-]*(?!\p{L})/u.test(
      prose,
    )
  )
    return true;
  // Also reject a single named person in common contact/introduction constructions.
  const contactPhrases =
    /\b(?:reach\s+out\s+to|speak\s+(?:with|to)|talk\s+to|meet\s+with|approach|connect\s+with|introduction\s+(?:from|through|via)|through|via)\s+([\p{L}'’-]+)/giu;
  return [...prose.matchAll(contactPhrases)].some((match) =>
    /^\p{Lu}/u.test(match[1]),
  );
}
