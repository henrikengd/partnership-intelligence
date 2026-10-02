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
