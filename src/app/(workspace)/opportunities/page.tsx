import { headers } from "next/headers";
import Link from "next/link";
import { requirePageActor } from "@/server/auth/page";
import { getWorkspaceData } from "@/modules/records/service";
import { getOrganization } from "@/server/organization";
import { OpportunityCreate } from "@/components/opportunity-create";
export default async function Opportunities() {
  const requestHeaders = await headers();
  await requirePageActor(requestHeaders);
  if (!(await getOrganization(requestHeaders)))
    return (
      <div className="card">
        <h1>Organization profile required</h1>
        <Link href="/settings">Open settings</Link>
      </div>
    );
  const data = await getWorkspaceData(requestHeaders);
  return (
    <>
      <span className="eyebrow">From evidence to action</span>
      <h1>Partnership opportunities</h1>
      <p className="muted">
        Why this company, who to approach, via whom, what to ask, and how to
        take the first step.
      </p>
      <div className="grid">
        <OpportunityCreate needs={data.needs} companies={data.companies} />
        <section className="card">
          <h2>Saved opportunities</h2>
          {data.opportunities.length ? (
            data.opportunities.map((o) => (
              <article className="account" key={o.id}>
                <Link
                  className="opportunity-link"
                  href={`/opportunities/${o.id}`}
                >
                  {data.companies.find((c) => c.id === o.companyId)?.name} ·{" "}
                  {data.needs.find((n) => n.id === o.needId)?.title}
                </Link>
                <p className="muted small">
                  {o.partnershipType} · {o.state} ·{" "}
                  {o.reviewState.replaceAll("_", " ")}
                </p>
              </article>
            ))
          ) : (
            <p className="muted">
              Add a need and a known company to create your first brief.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
