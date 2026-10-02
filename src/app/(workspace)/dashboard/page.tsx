import Link from "next/link";
import { headers } from "next/headers";
import { getOrganization } from "@/server/organization";
import { requirePageActor } from "@/server/auth/page";
import { getWorkspaceData } from "@/modules/records/service";
import { getOpportunityList } from "@/modules/opportunities/list";
import { listGenerationRuns } from "@/modules/opportunities/runs";
import { GenerationRuns } from "@/components/candidate-batch";
import { getDueActions } from "@/modules/outreach/service";
export default async function Dashboard() {
  const requestHeaders = await headers();
  await requirePageActor(requestHeaders);
  const organization = await getOrganization(requestHeaders);
  if (!organization)
    return (
      <>
        <span className="eyebrow">Your partnership workspace</span>
        <h1>Welcome to your workspace</h1>
        <div className="card wide">
          <h2>Set up your organization</h2>
          <p>
            Add your name, mission, and location before building your
            partnership network.
          </p>
          <Link className="button" href="/onboarding">
            Begin onboarding
          </Link>
        </div>
      </>
    );
  const data = await getWorkspaceData(requestHeaders);
  const due = await getDueActions(requestHeaders);
  const { items } = await getOpportunityList(requestHeaders);
  const runs = await listGenerationRuns(requestHeaders);
  return (
    <>
      <span className="eyebrow">Your partnership workspace</span>
      <h1>{organization.name}</h1>
      <p className="muted">
        Turn recorded needs and relationships into a clear first action.
      </p>
      <p>
        <Link href="/onboarding">Continue organization onboarding</Link> ·{" "}
        <Link href="/imports">Import private records</Link>
      </p>
      <div className="stat-grid">
        <Link className="card brand" href="/needs">
          <strong>{data.needs.filter((n) => n.active).length}</strong>Active
          needs
        </Link>
        <Link className="card brand" href="/network">
          <strong>{data.people.length}</strong>Network people
        </Link>
        <Link className="card brand" href="/opportunities">
          <strong>{data.opportunities.length}</strong>Opportunities
        </Link>
      </div>
      <section className="card" style={{ marginBottom: 24 }}>
        <h2>Opportunities to focus on</h2>
        <p className="muted">
          Ordered by unrounded rubric points, scoring coverage, nearer known
          need deadline and stable record ID. Review readiness separately from
          priority.
        </p>
        {items
          .filter(
            (i) => !["declined", "archived", "agreed"].includes(i.record.state),
          )
          .slice(0, 5)
          .map((i) => (
            <article className="account" key={i.record.id}>
              <Link href={`/opportunities/${i.record.id}`}>
                {i.company.name} · {i.need.title}
              </Link>
              <p>
                {i.score?.priority.toFixed(2) ?? "Unknown"} priority points /
                100 · {i.score?.coverage ?? 0}% scoring coverage ·{" "}
                {i.record.reviewState.replaceAll("_", " ")}
              </p>
            </article>
          ))}
        {!items.length && (
          <p>
            No opportunities yet. Define an active need and preview known
            candidates.
          </p>
        )}
      </section>
      <div className="grid">
        <section className="card">
          <h2>The first useful workflow</h2>
          <ol>
            <li>Define a concrete organizational need.</li>
            <li>Add a known company, its capability, and supplied evidence.</li>
            <li>Record your people and explicit company relationships.</li>
            <li>
              Create a brief, review its evidence, assign an owner, and plan an
              action.
            </li>
          </ol>
          <Link className="button" href="/opportunities">
            Open opportunities
          </Link>
        </section>
        <section className="card">
          <h2>Due and overdue follow-ups</h2>
          <p className="muted small">
            Calendar date {due.today} in {organization.timezone}.
          </p>
          {due.actions.length ? (
            due.actions.map((a) => (
              <article className="account" key={a.id}>
                <span className="badge">
                  {a.overdue ? "Overdue" : "Due today"} · {a.followUpDate}
                </span>
                <p>{a.description}</p>
                <Link href={`/opportunities/${a.opportunityId}`}>
                  Review opportunity and follow up
                </Link>
              </article>
            ))
          ) : (
            <p className="muted">
              No follow-up is due. Follow-up dates on recorded actions appear
              here when due.
            </p>
          )}
        </section>
      </div>
      <GenerationRuns runs={runs} />
    </>
  );
}
