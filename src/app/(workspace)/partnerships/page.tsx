import { headers } from "next/headers";
import Link from "next/link";
import { requirePageActor } from "@/server/auth/page";
import { getOrganization } from "@/server/organization";
import { getWorkspaceData } from "@/modules/records/service";
import { RecordEditor } from "@/components/record-editor";
export default async function Page() {
  const h = await headers();
  await requirePageActor(h);
  if (!(await getOrganization(h)))
    return (
      <section className="card">
        <h1>Save an organization profile first</h1>
        <Link href="/settings">Settings</Link>
      </section>
    );
  const data = await getWorkspaceData(h);
  return (
    <>
      <span className="eyebrow">Recorded history</span>
      <h1>Partnerships and previous outreach</h1>
      <p>
        Record what happened with dates and attribution. History provides
        context without proving personal access or decision authority.
      </p>
      <section className="card">
        <h2>Current and past contributions</h2>
        {data.partnerships.length ? (
          data.partnerships.map((p) => (
            <article className="account" key={p.id}>
              <strong>
                {p.title} · {p.state}
              </strong>
              <p>{p.description || "Contribution details not recorded"}</p>
              <p>
                {p.startDate ?? "Start unknown"} →{" "}
                {p.endDate ?? "End not recorded"}
              </p>
              <Link href={`/companies/${p.companyId}/history`}>
                Company outcome history
              </Link>
              {data.opportunities
                .filter((o) => o.partnershipId === p.id)
                .map((o) => (
                  <p key={o.id}>
                    <Link href={`/pipeline/${o.id}`}>
                      Original opportunity and actions
                    </Link>
                  </p>
                ))}
            </article>
          ))
        ) : (
          <p>No partnerships recorded.</p>
        )}
      </section>
      <div className="grid">
        <RecordEditor kind="partnerships" title="Partnership" data={data} />
        <RecordEditor
          kind="previousOutreach"
          title="Previous outreach"
          data={data}
        />
      </div>
    </>
  );
}
