import { eq } from "drizzle-orm";
import * as t from "../../server/db";
import {
  readWorkspaceData,
  type Transaction,
  type workspaceContext,
} from "../records/service";
export async function privacySnapshot(
  tx: Transaction,
  context: Awaited<ReturnType<typeof workspaceContext>>,
) {
  const data = await readWorkspaceData(tx, context);
  const org = context.organization.id;
  const assessments = await tx
    .select()
    .from(t.assessment)
    .where(eq(t.assessment.organizationId, org));
  const reviews = await tx
    .select()
    .from(t.opportunityReview)
    .where(eq(t.opportunityReview.organizationId, org));
  const aiRuns = await tx
    .select()
    .from(t.aiRun)
    .where(eq(t.aiRun.organizationId, org));
  const activities = await tx
    .select()
    .from(t.activity)
    .where(eq(t.activity.organizationId, org));
  const events = await tx
    .select()
    .from(t.opportunityEvent)
    .where(eq(t.opportunityEvent.organizationId, org));
  const imports = await tx
    .select()
    .from(t.importBatch)
    .where(eq(t.importBatch.organizationId, org));
  const runs = await tx
    .select()
    .from(t.generationRun)
    .where(eq(t.generationRun.organizationId, org));
  const incentives = await tx
    .select()
    .from(t.companyNeedIncentive)
    .where(eq(t.companyNeedIncentive.organizationId, org));
  return {
    data,
    assessments,
    reviews,
    aiRuns,
    activities,
    events,
    imports,
    runs,
    incentives,
  };
}
export type PrivacySnapshot = Awaited<ReturnType<typeof privacySnapshot>>;
