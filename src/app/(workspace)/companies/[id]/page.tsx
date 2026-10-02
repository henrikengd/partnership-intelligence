import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageActor } from "@/server/auth/page";
import { getNetworkGraph } from "@/modules/network/service";
import { RelationshipPaths } from "@/components/relationship-paths";
import { DomainError } from "@/server/errors";
export default async function CompanyDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const h = await headers();
  await requirePageActor(h);
  const { id } = await params;
  let graph;
  try {
    graph = await getNetworkGraph(h, { companyId: id });
  } catch (e) {
    if (e instanceof DomainError && e.status === 404) notFound();
    throw e;
  }
  const c = graph.companies[0];
  return (
    <>
      <Link href="/companies">Back to companies</Link>
      <h1>{c.company.name}</h1>
      <p>{c.company.description}</p>
      {c.company.website && (
        <p>
          <a href={c.company.website} target="_blank" rel="noreferrer">
            Supplied company website
          </a>
        </p>
      )}
      <section className="card">
        <RelationshipPaths
          paths={c}
          data={graph.data}
          history={graph.history}
        />
      </section>
      <p>
        <Link href={`/graph?company=${id}`}>Open focused graph</Link>
      </p>
    </>
  );
}
