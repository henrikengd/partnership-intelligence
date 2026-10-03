import Link from "next/link";
import { getWorkspaceData } from "@/modules/records/service";
import { getLifecycleDetail } from "@/modules/outreach/lifecycle";
import { db, activity } from "@/server/db";
import { eq } from "drizzle-orm";
import { LifecycleControls } from "./lifecycle-controls";
import { OutreachActivities } from "./outreach-activities";
import { Regenerate } from "./opportunity-controls";
export async function OpportunityWithoutAssessment({
  requestHeaders,
  id,
}: {
  requestHeaders: Headers;
  id: string;
}) {
  const data = await getWorkspaceData(requestHeaders);
  const lifecycle = await getLifecycleDetail(requestHeaders, id);
  const record = lifecycle.record;
  const activities = await db
    .select()
    .from(activity)
    .where(eq(activity.opportunityId, id));
  return (
    <>
      <Link href="/opportunities">← Opportunities</Link>
      <h1>{data.companies.find((c) => c.id === record.companyId)?.name}</h1>
      <p>
        Need: {data.needs.find((n) => n.id === record.needId)?.title} ·{" "}
        {record.state}
      </p>
      <section className="card">
        <h2>Assessment material removed</h2>
        <p>
          Private assessment history was removed. Original outcome, partnership
          and activity dates remain. Review surviving sources and regenerate
          before evaluating scores, readiness or AI suggestions.
        </p>
        {!["declined", "archived"].includes(record.state) ? (
          <Regenerate
            opportunityId={id}
            needId={record.needId}
            companyId={record.companyId}
            partnershipType={record.partnershipType}
          />
        ) : (
          <p>
            Closed history stays readable. Explicitly reopen this opportunity
            before generating a new assessment.
          </p>
        )}
      </section>
      <div className="grid">
        <OutreachActivities
          opportunityId={id}
          people={data.people}
          activities={activities}
          today={lifecycle.today}
        />
        <LifecycleControls detail={lifecycle} />
      </div>
      <Link href={`/companies/${record.companyId}/history`}>
        Company history
      </Link>
    </>
  );
}
