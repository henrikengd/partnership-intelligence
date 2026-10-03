import { headers } from "next/headers";
import Link from "next/link";
import { requirePageActor } from "@/server/auth/page";
import { getWorkspaceData } from "@/modules/records/service";
import { RecordEditor } from "@/components/record-editor";
import { getOrganization } from "@/server/organization";
export default async function Page() {
  const requestHeaders = await headers();
  await requirePageActor(requestHeaders);
  if (!(await getOrganization(requestHeaders)))
    return (
      <div className="card">
        <h1>Organization profile required</h1>
        <p>
          An administrator needs to save the organization before adding
          partnership records.
        </p>
        <Link href="/settings">Open settings</Link>
      </div>
    );
  const data = await getWorkspaceData(requestHeaders);
  return (
    <>
      <span className="eyebrow">Recorded inputs</span>
      <h1>Organizational needs</h1>
      <p className="muted">
        Define a concrete ask, its urgency, and the partnership type that could
        meet it.
      </p>
      <div className="grid record-grid">
        <RecordEditor kind="needs" title="Need" data={data} />
      </div>
    </>
  );
}
