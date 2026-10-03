import { headers } from "next/headers";
import Link from "next/link";
import { requirePageActor } from "@/server/auth/page";
import { getNetworkGraph } from "@/modules/network/service";
import { RecordedGraphPanel } from "@/components/recorded-graph";
import { RelationshipPaths } from "@/components/relationship-paths";
import { DomainError } from "@/server/errors";
import { notFound } from "next/navigation";
export default async function GraphPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; opportunity?: string }>;
}) {
  const h = await headers();
  await requirePageActor(h);
  const filters = await searchParams;
  let graph;
  try {
    graph = await getNetworkGraph(h, {
      companyId: filters.company,
      opportunityId: filters.opportunity,
      defaultToFirstCompany:
        filters.company === undefined && filters.opportunity === undefined,
    });
  } catch (e) {
    if (e instanceof DomainError && e.status === 404) notFound();
    throw e;
  }
  return (
    <>
      <span className="eyebrow">Recorded connections</span>
      <h1>Relationship graph</h1>
      <p className="muted">
        Inspect company paths and supplied evidence before requesting an
        introduction. A shared employer never creates a personal acquaintance.
      </p>
      <form method="get" className="card" style={{ marginBottom: 24 }}>
        <label htmlFor="graph-company">Focus on company</label>
        <select
          name="company"
          id="graph-company"
          defaultValue={
            graph.companies.length === 1 ? graph.companies[0].company.id : ""
          }
        >
          <option value="">All companies</option>
          {graph.data.companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button type="submit">Apply company filter</button>
        {filters.opportunity && (
          <p>
            Focused on a recorded opportunity.{" "}
            <Link href={`/opportunities/${filters.opportunity}`}>
              Return to opportunity
            </Link>
          </p>
        )}
      </form>
      <RecordedGraphPanel projection={graph.projection} data={graph.data} />
      {!graph.companies.length ? (
        <section className="card">
          <h2>Build your recorded network</h2>
          <p>
            Add a company and your internal people, then attach employment or
            personal connections with evidence.
          </p>
          <Link href="/network">Open people and relationships</Link>
        </section>
      ) : (
        <div className="stack">
          {graph.companies.map((c) => (
            <section key={c.company.id} className="card">
              <h2>
                <Link href={`/companies/${c.company.id}`}>
                  {c.company.name}
                </Link>
              </h2>
              <RelationshipPaths
                paths={c}
                data={graph.data}
                history={graph.history.filter(
                  (h) => h.companyId === c.company.id,
                )}
              />
            </section>
          ))}
        </div>
      )}
    </>
  );
}
