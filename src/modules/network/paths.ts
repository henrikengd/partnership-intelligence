import type { RelationshipPath, PathEdge } from "../opportunities/contracts";
import type {
  organization,
  person,
  affiliation,
  company,
  relationship,
  evidence,
} from "../../server/db/schema";
type Row<T extends { $inferSelect: unknown }> = T["$inferSelect"];
export type PathHistory = {
  id: string;
  companyId: string;
  kind: "partnership" | "outreach";
  label: string;
  occurredDate: string | null;
  state: string;
  description: string;
  source?: string;
  recordedBy?: string;
  evidenceIds?: string[];
};
export type PathInput = {
  organization: Row<typeof organization>;
  company: Row<typeof company>;
  people: Row<typeof person>[];
  affiliations: Row<typeof affiliation>[];
  relationships: Row<typeof relationship>[];
  evidence: Row<typeof evidence>[];
  today?: string;
};
export type NetworkPath = Omit<RelationshipPath, "edges"> & {
  edges: (PathEdge & { state: string; recordedBy: string })[];
  weakestPersonalStrength: number | null;
  personalEdgeCount: number;
  reviewedConnectionCount: number;
  supportedConnectionCount: number;
};
export type PathResults = { current: NetworkPath[]; historical: NetworkPath[] };
export function isCurrent(
  record: { state: string; startDate: string | null; endDate: string | null },
  today: string,
) {
  return (
    record.state === "current" &&
    (!record.startDate || record.startDate <= today) &&
    (!record.endDate || record.endDate >= today)
  );
}
const internalRoles = new Set(["member", "alumni", "advisor", "board"]);
const professionalKinds = new Set([
  "works_at",
  "previously_worked_at",
  "interned_at",
]);
function comparePaths(a: NetworkPath, b: NetworkPath) {
  // No title establishes relevance/authority. Every terminal is explicitly connected to this company.
  // Refused routes remain visible but never displace a permitted current alternative.
  return (
    Number(b.current) - Number(a.current) ||
    Number(a.willingness === "no") - Number(b.willingness === "no") ||
    b.supportedConnectionCount - a.supportedConnectionCount ||
    b.reviewedConnectionCount - a.reviewedConnectionCount ||
    (b.weakestPersonalStrength ?? -1) - (a.weakestPersonalStrength ?? -1) ||
    Number(b.willingness === "yes") - Number(a.willingness === "yes") ||
    a.nodes.length - b.nodes.length ||
    a.id.localeCompare(b.id)
  );
}
/** Directed, explicit personal records only. At most two people between organization and company. */
export function findRelationshipPaths(input: PathInput): PathResults {
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const people = new Map(input.people.map((p) => [p.id, p]));
  const sources = new Map(input.evidence.map((e) => [e.id, e]));
  const personal = new Map<string, Row<typeof relationship>[]>();
  const employers = new Map<string, Row<typeof relationship>[]>();
  for (const r of input.relationships) {
    if (r.organizationId !== input.organization.id) continue;
    if (
      professionalKinds.has(r.kind) &&
      r.companyId === input.company.id &&
      !r.targetPersonId
    ) {
      employers.set(r.personId, [...(employers.get(r.personId) ?? []), r]);
    } else if (
      ["knows", "introduced_by", "studied_with"].includes(r.kind) &&
      r.targetPersonId &&
      !r.companyId &&
      r.personId !== r.targetPersonId
    ) {
      personal.set(r.personId, [...(personal.get(r.personId) ?? []), r]);
    }
  }
  const all: NetworkPath[] = [];
  // Multiple internal roles describe one root; prefer a current affiliation, then stable ID.
  const roots = new Map<string, Row<typeof affiliation>[]>();
  for (const a of input.affiliations) {
    if (a.organizationId === input.organization.id && internalRoles.has(a.role))
      roots.set(a.personId, [...(roots.get(a.personId) ?? []), a]);
  }
  for (const [rootId, roles] of roots) {
    const root = people.get(rootId);
    if (!root || root.organizationId !== input.organization.id) continue;
    roles.sort(
      (a, b) =>
        Number(isCurrent(b, today)) - Number(isCurrent(a, today)) ||
        a.id.localeCompare(b.id),
    );
    const membership = roles[0];
    function visit(
      personId: string,
      personIds: string[],
      connections: Row<typeof relationship>[],
    ) {
      for (const employment of employers.get(personId) ?? []) {
        const chain = [...connections, employment];
        const edgeSources = chain.map((e) => sources.get(e.evidenceId));
        const support = edgeSources.map((s) =>
          Boolean(
            s &&
            s.organizationId === input.organization.id &&
            s.observedDate <= today &&
            ["supplied", "reviewed"].includes(s.reviewState),
          ),
        );
        const current =
          isCurrent(membership, today) &&
          chain.every(
            (e, i) =>
              isCurrent(e, today) &&
              e.kind !== "previously_worked_at" &&
              support[i],
          );
        const willingness = chain.some((e) => e.willingness === "no")
          ? "no"
          : chain.every(
                (e) =>
                  e.willingness === "yes" &&
                  e.willingnessDate &&
                  e.willingnessDate <= today &&
                  e.willingnessSource,
              )
            ? "yes"
            : "unknown";
        // Professional affiliation strength is not personal familiarity. Never add ordinal strengths.
        const weakestPersonalStrength =
          connections.length && connections.every((e) => e.strength !== null)
            ? Math.min(...connections.map((e) => e.strength!))
            : null;
        const edges: NetworkPath["edges"] = [
          {
            id: membership.id,
            label: membership.role,
            state: membership.state,
            recordedBy: membership.recordedBy,
            startDate: membership.startDate,
            endDate: membership.endDate,
            evidenceIds: [],
            strength: null,
            willingness: "unknown",
          },
          ...chain.map((e, i) => ({
            id: e.id,
            label:
              e.kind.replaceAll("_", " ") + (e.title ? ` · ${e.title}` : ""),
            state: e.state,
            recordedBy: e.recordedBy,
            startDate: e.startDate,
            endDate: e.endDate,
            evidenceIds: [e.evidenceId],
            strength: e.strength,
            willingness: e.willingness as "yes" | "no" | "unknown",
            willingnessDate: e.willingnessDate,
            willingnessSource: e.willingnessSource,
            evidenceReviewState: edgeSources[i]?.reviewState ?? "missing",
          })),
        ];
        all.push({
          id: [membership.id, ...chain.map((e) => e.id)].join(":"),
          current,
          nodes: [
            {
              id: input.organization.id,
              kind: "organization",
              label: input.organization.name,
            },
            ...personIds.map((id) => ({
              id,
              kind: "person" as const,
              label: people.get(id)!.name,
            })),
            {
              id: input.company.id,
              kind: "company",
              label: input.company.name,
            },
          ],
          edges,
          willingness,
          weakestPersonalStrength,
          personalEdgeCount: connections.length,
          supportedConnectionCount:
            support.filter(Boolean).length / chain.length,
          reviewedConnectionCount:
            edgeSources.filter((s) => s?.reviewState === "reviewed").length /
            chain.length,
          warning:
            willingness === "no"
              ? "Respect the recorded refusal. This connection is unavailable for an introduction; choose another permitted route."
              : !current
                ? "Historical, unknown, future, or unsupported connection. Verify current access and resolve source concerns before using this lead."
                : willingness === "yes"
                  ? "Willingness has a recorded date and source. Reconfirm it for this specific introduction; it does not establish present consent or decision authority."
                  : "This is a recorded company connection. Introduction willingness, suitability, and decision authority need confirmation.",
        });
      }
      if (personIds.length >= 2) return;
      for (const connection of personal.get(personId) ?? []) {
        const next = connection.targetPersonId!;
        if (
          personIds.includes(next) ||
          !people.has(next) ||
          people.get(next)!.organizationId !== input.organization.id
        )
          continue;
        visit(next, [...personIds, next], [...connections, connection]);
      }
    }
    visit(rootId, [rootId], []);
  }
  all.sort(comparePaths);
  return {
    current: all.filter((p) => p.current).slice(0, 3),
    historical: all.filter((p) => !p.current).slice(0, 3),
  };
}
/** Backward-compatible entry point. Now includes bounded explicit personal intermediaries. */
export const findDirectPaths = findRelationshipPaths;
