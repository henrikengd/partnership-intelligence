import { headers } from "next/headers";
import Link from "next/link";
import { requirePageActor } from "@/server/auth/page";
import { getCompanyHistory } from "@/modules/outreach/lifecycle";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const h = await headers();
  await requirePageActor(h);
  const history = await getCompanyHistory(h, (await params).id);
  return (
    <>
      <Link href="/pipeline">← Pipeline</Link>
      <h1>{history.company.name}: recorded history</h1>
      <section className="card">
        <h2>Current and past contributions</h2>
        {history.partnerships.length ? (
          history.partnerships.map((p) => (
            <article className="account" key={p.id}>
              <h3>
                {p.title} · {p.state}
              </h3>
              <p>
                {p.type} ·{" "}
                {p.description || "Contribution details not recorded"}
              </p>
              <p className="muted">
                {p.startDate ?? "Start unknown"} →{" "}
                {p.endDate ?? "End not recorded"}
              </p>
            </article>
          ))
        ) : (
          <p>No partnership recorded.</p>
        )}
        <Link href="/partnerships">Edit partnership records</Link>
      </section>
      <section className="card">
        <h2>Opportunity outcomes</h2>
        {history.events.length ? (
          history.events.map((e) => (
            <article className="account" key={e.id}>
              <strong>
                {e.fromState} → {e.toState} · {e.occurredDate}
              </strong>
              <p>
                {e.reason || "Recorded lifecycle change"}
                {e.source ? ` · ${e.source}` : ""}
              </p>
              <Link href={`/pipeline/${e.opportunityId}`}>
                Open original opportunity history
              </Link>
            </article>
          ))
        ) : (
          <p>No outcomes recorded.</p>
        )}
      </section>
      <section className="card">
        <h2>Recorded actions</h2>
        {history.activities.length ? (
          history.activities.map((a) => (
            <article key={a.id} className="account">
              <strong>
                {a.status === "completed"
                  ? "Completed action"
                  : "Planned, not completed"}{" "}
                · {a.kind.replaceAll("_", " ")}
              </strong>
              <p>
                {a.description} · {a.channel} ·{" "}
                {a.targetRole || "Recorded target person"}
              </p>
              <p>
                {a.occurredDate
                  ? `Occurred ${a.occurredDate}`
                  : "Actual occurrence date unknown"}
                {a.completedAt
                  ? ` · completion recorded ${a.completedAt.toISOString()}`
                  : ""}
              </p>
              <Link href={`/pipeline/${a.opportunityId}`}>
                Open action and follow-up history
              </Link>
            </article>
          ))
        ) : (
          <p>No actions recorded.</p>
        )}
      </section>
      <section className="card">
        <h2>Previous outreach</h2>
        {history.previousOutreach.length ? (
          history.previousOutreach.map((o) => (
            <p key={o.id}>
              {o.occurredDate} · {o.channel} · {o.outcome} · {o.description} ·{" "}
              {o.source}
            </p>
          ))
        ) : (
          <p>No previous outreach imported or recorded.</p>
        )}
      </section>
    </>
  );
}
