import { headers } from "next/headers";
import Link from "next/link";
import { requirePageActor } from "@/server/auth/page";
import { getLifecycleDetail } from "@/modules/outreach/lifecycle";
import { getOpportunityDetail } from "@/modules/opportunities/service";
import { LifecycleControls } from "@/components/lifecycle-controls";
import { OutreachActivities } from "@/components/outreach-activities";
import styles from "@/components/outreach.module.css";
import { BriefEditor } from "@/components/opportunity-controls";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const h = await headers();
  await requirePageActor(h);
  const { id } = await params;
  const detail = await getLifecycleDetail(h, id);
  const op = await getOpportunityDetail(h, id);
  return (
    <>
      <Link href="/pipeline">← Pipeline</Link>
      <h1>
        {op.data.companies.find((c) => c.id === op.record.companyId)?.name}:
        actions and outcome
      </h1>
      <p>
        <Link href={`/opportunities/${id}`}>Review the partnership brief</Link>{" "}
        ·{" "}
        <Link href={`/companies/${op.record.companyId}/history`}>
          Company history
        </Link>
      </p>
      <div className={`grid ${styles.detail}`}>
        <div className="stack">
          <section className="card">
            <h2>Owner and action plan</h2>
            <BriefEditor
              id={id}
              brief={op.brief}
              ownerId={op.record.ownerId}
              owners={op.data.owners}
            />
          </section>
          <OutreachActivities
            opportunityId={id}
            people={op.data.people}
            activities={op.activities}
            today={detail.today}
          />
        </div>
        <LifecycleControls detail={detail} />
      </div>
    </>
  );
}
