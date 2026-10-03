import { headers } from "next/headers";
import Link from "next/link";
import { requirePageActor } from "@/server/auth/page";
import { getOrganization } from "@/server/organization";
import { getPipeline } from "@/modules/outreach/service";
import { states } from "@/modules/outreach/lifecycle";
import styles from "@/components/outreach.module.css";
export default async function Page() {
  const h = await headers();
  await requirePageActor(h);
  if (!(await getOrganization(h)))
    return (
      <section className="card">
        <h1>Save the organization profile first</h1>
        <Link href="/onboarding">Onboarding</Link>
      </section>
    );
  const { data, activities, today } = await getPipeline(h);
  return (
    <>
      <span className="eyebrow">Recorded partnership work</span>
      <h1>Outreach pipeline</h1>
      <p>
        Follow-up dates use {data.organization.timezone}. Today is {today}.
        Closed work stays in history; no lifecycle change completes or sends an
        action.
      </p>
      <div className={styles.pipeline}>
        {states.map((state) => (
          <section className="card" key={state}>
            <h2>{state}</h2>
            {data.opportunities
              .filter((o) => o.state === state)
              .map((o) => {
                const pending = activities.filter(
                  (a) =>
                    a.opportunityId === o.id &&
                    a.followUpDate &&
                    !a.followUpResolvedAt,
                );
                const closed = ["declined", "archived"].includes(state);
                return (
                  <article className="account" key={o.id}>
                    <h3>
                      {data.companies.find((c) => c.id === o.companyId)?.name}
                    </h3>
                    <p>{data.needs.find((n) => n.id === o.needId)?.title}</p>
                    <p>
                      Owner:{" "}
                      {data.owners.find((u) => u.id === o.ownerId)?.name ??
                        "Assign an active owner"}
                    </p>
                    {pending.map((a) => (
                      <p className={closed ? "muted" : "notice"} key={a.id}>
                        {closed
                          ? "Paused follow-up"
                          : a.followUpDate! < today
                            ? "Overdue"
                            : a.followUpDate === today
                              ? "Due today"
                              : "Upcoming"}{" "}
                        · {a.followUpDate}
                      </p>
                    ))}
                    <Link href={`/pipeline/${o.id}`}>
                      Manage actions and outcome
                    </Link>{" "}
                    · <Link href={`/opportunities/${o.id}`}>Review brief</Link>{" "}
                    ·{" "}
                    <Link href={`/companies/${o.companyId}/history`}>
                      Company history
                    </Link>
                  </article>
                );
              })}
            {!data.opportunities.some((o) => o.state === state) && (
              <p className="muted">No {state} opportunities.</p>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
