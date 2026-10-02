import Link from "next/link";
import { headers } from "next/headers";
import { requirePageActor } from "@/server/auth/page";
import { getOrganization } from "@/server/organization";
export default async function Dashboard() {
  const requestHeaders = await headers();
  await requirePageActor(requestHeaders);
  const organization = await getOrganization(requestHeaders);
  return (
    <>
      <span className="eyebrow">Your partnership workspace</span>
      <h1>{organization ? organization.name : "Welcome to your workspace"}</h1>
      <p className="muted">Start with a clear picture of your organization.</p>
      <div className="card wide">
        <h2>
          {organization
            ? "Organization profile saved"
            : "Set up your organization"}
        </h2>
        <p>
          {organization
            ? "Your profile is stored privately in this installation."
            : "Add your name, mission, and location before building your partnership network."}
        </p>
        <Link className="button" href="/settings">
          {organization ? "View settings" : "Organization settings"}
        </Link>
      </div>
    </>
  );
}
