import { eq, desc } from "drizzle-orm";
import { db, assessment } from "../../server/db";
import { getWorkspaceData } from "../records/service";
import { calculatePriority } from "./scoring";
export async function getOpportunityList(headers: Headers) {
  const data = await getWorkspaceData(headers);
  const latest = await db
    .selectDistinctOn([assessment.opportunityId])
    .from(assessment)
    .where(eq(assessment.organizationId, data.organization.id))
    .orderBy(assessment.opportunityId, desc(assessment.version));
  const items = data.opportunities.map((record) => {
    const version = latest.find((a) => a.opportunityId === record.id);
    return {
      record,
      latest: version ?? null,
      score: version ? calculatePriority(version.factors) : null,
      company: data.companies.find((c) => c.id === record.companyId)!,
      need: data.needs.find((n) => n.id === record.needId)!,
    };
  });
  items.sort(
    (a, b) =>
      (b.score?.priority ?? -1) - (a.score?.priority ?? -1) ||
      (b.score?.coverage ?? 0) - (a.score?.coverage ?? 0) ||
      (a.need.deadline ?? "9999-12-31").localeCompare(
        b.need.deadline ?? "9999-12-31",
      ) ||
      a.record.id.localeCompare(b.record.id),
  );
  return { data, items };
}
