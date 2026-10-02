import type { WorkspaceData } from "../records/service";
import type { PathHistory } from "./paths";
import type { PathNode, PathEdge } from "../opportunities/contracts";
export type RecordedGraph = {
  nodes: PathNode[];
  edges: (PathEdge & {
    source: string;
    target: string;
    state: string;
    recordedBy: string;
  })[];
};
/** Only explicit rows become edges. Company filtering retains immediate recorded personal predecessors. */
export function projectRecordedGraph(
  data: WorkspaceData,
  companyId?: string,
  history: PathHistory[] = [],
): RecordedGraph {
  const selectedPeople = new Set<string>();
  if (companyId) {
    for (const r of data.relationships)
      if (r.companyId === companyId) selectedPeople.add(r.personId);
    const companyPeople = new Set(selectedPeople);
    for (const r of data.relationships)
      if (r.targetPersonId && companyPeople.has(r.targetPersonId))
        selectedPeople.add(r.personId);
  } else for (const p of data.people) selectedPeople.add(p.id);
  const people = data.people.filter((p) => selectedPeople.has(p.id));
  const companies = data.companies.filter(
    (c) => !companyId || c.id === companyId,
  );
  const nodes: PathNode[] = [
    {
      id: data.organization.id,
      kind: "organization",
      label: data.organization.name,
    },
    ...people.map((p) => ({
      id: p.id,
      kind: "person" as const,
      label: p.name,
    })),
    ...companies.map((c) => ({
      id: c.id,
      kind: "company" as const,
      label: c.name,
    })),
  ];
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges: RecordedGraph["edges"] = [
    ...data.affiliations
      .filter((a) => selectedPeople.has(a.personId) && a.role !== "contact")
      .map((a) => ({
        id: a.id,
        source: data.organization.id,
        target: a.personId,
        label: a.role,
        state: a.state,
        recordedBy: a.recordedBy,
        startDate: a.startDate,
        endDate: a.endDate,
        evidenceIds: [],
        strength: null,
        willingness: "unknown" as const,
      })),
    ...data.relationships
      .filter(
        (r) =>
          nodeIds.has(r.personId) &&
          nodeIds.has(r.companyId ?? r.targetPersonId ?? ""),
      )
      .map((r) => ({
        id: r.id,
        source: r.personId,
        target: (r.companyId ?? r.targetPersonId)!,
        label: r.kind.replaceAll("_", " ") + (r.title ? ` · ${r.title}` : ""),
        state: r.state,
        recordedBy: r.recordedBy,
        startDate: r.startDate,
        endDate: r.endDate,
        evidenceIds: [r.evidenceId],
        strength: r.strength,
        willingness: r.willingness as "yes" | "no" | "unknown",
        willingnessDate: r.willingnessDate,
        willingnessSource: r.willingnessSource,
        evidenceReviewState:
          data.evidence.find((e) => e.id === r.evidenceId)?.reviewState ??
          "missing",
      })),
  ];
  for (const h of history) {
    if (!nodeIds.has(h.companyId)) continue;
    edges.push({
      id: `history:${h.id}`,
      source: data.organization.id,
      target: h.companyId,
      label: `${h.kind} history: ${h.label}`,
      state: `history, ${h.state}`,
      recordedBy: h.recordedBy ?? "",
      startDate: h.occurredDate,
      endDate: null,
      evidenceIds: h.evidenceIds ?? [],
      strength: null,
      willingness: "unknown",
    });
  }
  return { nodes, edges };
}
