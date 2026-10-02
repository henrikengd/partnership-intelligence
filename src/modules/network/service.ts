import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, activity } from "../../server/db";
import { getWorkspaceData, type WorkspaceData } from "../records/service";
import { DomainError } from "../../server/errors";
import { findRelationshipPaths, type PathHistory } from "./paths";
import { projectRecordedGraph } from "./projection";
export function companyPaths(data: WorkspaceData, companyId: string) {
  const company = data.companies.find((c) => c.id === companyId);
  if (!company) throw new DomainError("NOT_FOUND", "Company not found.", 404);
  return {
    company,
    ...findRelationshipPaths({
      organization: data.organization,
      company,
      people: data.people,
      affiliations: data.affiliations,
      relationships: data.relationships,
      evidence: data.evidence,
    }),
  };
}
/** Authenticated projection. History derives from saved partnerships and outreach, never personal-access edges. */
export async function getNetworkGraph(
  headers: Headers,
  filter: {
    companyId?: string;
    opportunityId?: string;
    defaultToFirstCompany?: boolean;
  } = {},
) {
  const data = await getWorkspaceData(headers);
  function recordId(value: string) {
    const parsed = z.uuid().safeParse(value);
    if (!parsed.success)
      throw new DomainError("NOT_FOUND", "Graph record not found.", 404);
    return parsed.data;
  }
  let companyId = filter.companyId ? recordId(filter.companyId) : undefined;
  if (filter.opportunityId) {
    const id = recordId(filter.opportunityId);
    const opportunity = data.opportunities.find((o) => o.id === id);
    if (!opportunity)
      throw new DomainError("NOT_FOUND", "Opportunity not found.", 404);
    if (companyId && companyId !== opportunity.companyId)
      throw new DomainError(
        "INVALID_FILTER",
        "The company and opportunity filters must agree.",
      );
    companyId = opportunity.companyId;
  }
  if (!companyId && !filter.opportunityId && filter.defaultToFirstCompany)
    companyId = [...data.companies].sort(
      (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
    )[0]?.id;
  const companies = companyId
    ? [companyPaths(data, companyId)]
    : [...data.companies]
        .sort(
          (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
        )
        .map((c) => companyPaths(data, c.id));
  const activities = await db
    .select()
    .from(activity)
    .where(
      and(
        eq(activity.organizationId, data.organization.id),
        eq(activity.status, "completed"),
      ),
    );
  const history: PathHistory[] = [
    ...data.partnerships
      .filter((p) => !companyId || p.companyId === companyId)
      .map((p) => {
        const source = data.evidence.find((e) => e.id === p.evidenceId);
        return {
          id: p.id,
          companyId: p.companyId,
          kind: "partnership" as const,
          label: p.title,
          occurredDate: p.startDate,
          state: p.state,
          description: p.description,
          source:
            source?.attribution ?? source?.url ?? "Team partnership record",
          recordedBy: p.recordedBy,
          evidenceIds: p.evidenceId ? [p.evidenceId] : [],
        };
      }),
    ...data.previousOutreach
      .filter((o) => !companyId || o.companyId === companyId)
      .map((o) => ({
        id: o.id,
        companyId: o.companyId,
        kind: "outreach" as const,
        label: `${o.channel} outreach`,
        occurredDate: o.occurredDate,
        state: o.outcome,
        description: o.description,
        source: o.source,
        recordedBy: o.recordedBy,
        evidenceIds: [],
      })),
    ...activities.flatMap((a) => {
      const opportunity = data.opportunities.find(
        (o) => o.id === a.opportunityId,
      );
      return opportunity && (!companyId || opportunity.companyId === companyId)
        ? [
            {
              id: a.id,
              companyId: opportunity.companyId,
              kind: "outreach" as const,
              label: a.kind.replaceAll("_", " "),
              occurredDate: a.completedAt?.toISOString().slice(0, 10) ?? null,
              state: "completed",
              description: a.description,
              recordedBy: a.recordedBy,
              evidenceIds: [],
            },
          ]
        : [];
    }),
  ].sort(
    (a, b) =>
      (b.occurredDate ?? "").localeCompare(a.occurredDate ?? "") ||
      a.id.localeCompare(b.id),
  );
  return {
    data,
    companies,
    history,
    projection: projectRecordedGraph(data, companyId, history),
  };
}
