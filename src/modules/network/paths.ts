import type { RelationshipPath } from "../opportunities/contracts";
import type {
  organization,
  person,
  affiliation,
  company,
  relationship,
  evidence,
} from "../../server/db/schema";
type Row<T extends { $inferSelect: unknown }> = T["$inferSelect"];
export type PathInput = {
  organization: Row<typeof organization>;
  company: Row<typeof company>;
  people: Row<typeof person>[];
  affiliations: Row<typeof affiliation>[];
  relationships: Row<typeof relationship>[];
  evidence: Row<typeof evidence>[];
  today?: string;
};
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
// T02 deliberately returns one directly recorded organization/person/company path.
// T04 extends traversal and ranking through the same typed result.
export function findDirectPaths(input: PathInput): {
  current: RelationshipPath[];
  historical: RelationshipPath[];
} {
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const results: RelationshipPath[] = [];
  for (const edge of input.relationships) {
    if (edge.companyId !== input.company.id) continue;
    const p = input.people.find((p) => p.id === edge.personId);
    const affiliations = input.affiliations.filter(
      (a) =>
        a.personId === edge.personId &&
        ["member", "alumni", "advisor", "board"].includes(a.role),
    );
    if (!p || !affiliations.length) continue;
    const affiliation =
      affiliations.find((a) => isCurrent(a, today)) ?? affiliations[0];
    const source = input.evidence.find((e) => e.id === edge.evidenceId);
    const supported = Boolean(
      source && ["supplied", "reviewed"].includes(source.reviewState),
    );
    const current =
      supported &&
      isCurrent(edge, today) &&
      isCurrent(affiliation, today) &&
      edge.kind !== "previously_worked_at";
    results.push({
      id: `${affiliation.id}:${edge.id}`,
      current,
      nodes: [
        {
          id: input.organization.id,
          kind: "organization",
          label: input.organization.name,
        },
        { id: p.id, kind: "person", label: p.name },
        { id: input.company.id, kind: "company", label: input.company.name },
      ],
      edges: [
        {
          id: affiliation.id,
          label: affiliations.map((a) => a.role).join(", "),
          startDate: affiliation.startDate,
          endDate: affiliation.endDate,
          evidenceIds: [],
          strength: null,
          willingness: "unknown",
        },
        {
          id: edge.id,
          label:
            edge.kind.replaceAll("_", " ") +
            (edge.title ? ` · ${edge.title}` : ""),
          startDate: edge.startDate,
          endDate: edge.endDate,
          evidenceIds: [edge.evidenceId],
          strength: edge.strength,
          willingness: edge.willingness as "yes" | "no" | "unknown",
          willingnessDate: edge.willingnessDate,
          willingnessSource: edge.willingnessSource,
          evidenceReviewState: source?.reviewState ?? "missing",
        },
      ],
      willingness: edge.willingness as "yes" | "no" | "unknown",
      warning: current
        ? edge.willingness === "no"
          ? "This person has recorded that they do not want to provide an introduction. Respect that refusal and find another permitted route."
          : edge.willingness === "yes"
            ? "Willingness was recorded on the displayed date. Reconfirm its applicability to this specific introduction; employment does not establish decision authority."
            : "Employment establishes a recorded connection. Confirm whether this person is willing and able to introduce you."
        : "Historical, unknown, future, or unsupported connection. Verify current access and resolve source concerns before approaching through this person.",
    });
  }
  results.sort((a, b) => a.id.localeCompare(b.id));
  return {
    current: results.filter((p) => p.current).slice(0, 1),
    historical: results.filter((p) => !p.current).slice(0, 1),
  };
}
