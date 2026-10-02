import { headers } from "next/headers";
import Link from "next/link";
import { requirePageActor } from "@/server/auth/page";
import { getOpportunityList } from "@/modules/opportunities/list";
import { listGenerationRuns } from "@/modules/opportunities/runs";
import { CandidateBatch, GenerationRuns } from "@/components/candidate-batch";
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
  const { data, items } = await getOpportunityList(requestHeaders);
  const runs = await listGenerationRuns(requestHeaders);
  return (
    <>
      <span className="eyebrow">From evidence to action</span>
      <h1>Partnership opportunities</h1>
      <p className="muted">
        Why this company, who to approach, via whom, what to ask, and how to
        take the first step.
      </p>
      <div className="stack">
        <CandidateBatch
          needs={data.needs}
          companies={data.companies}
          evidence={data.evidence}
        />
        <div className="grid">
          <OpportunityCreate needs={data.needs} companies={data.companies} />
          <section className="card">
            <h2>Saved opportunities</h2>
            {data.opportunities.length ? (
              items.map(({ record: o, score, latest }) => (
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
                    {score
                      ? ` · ${score.priority.toFixed(2)} priority points / 100 · ${score.coverage}% scoring coverage`
                      : ""}
                    {latest && latest.inputRevision !== o.inputRevision
                      ? " · inputs changed"
                      : ""}
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
        <GenerationRuns runs={runs} />
      </div>
    </>
  );
}
