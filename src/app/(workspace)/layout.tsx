import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireActor } from "@/server/auth/access";
import { DomainError } from "@/server/errors";
import { WorkspaceNavigation } from "@/components/workspace-navigation";
import { getDemoStatus } from "@/modules/demo/service";
import { Logout } from "@/components/logout";
export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let actor;
  try {
    actor = await requireActor(await headers());
  } catch (e) {
    if (e instanceof DomainError && e.status === 401) redirect("/login");
    throw e;
  }
  const demo = await getDemoStatus();
  return (
    <div className="shell">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="header">
        <Link className="brand" href="/dashboard">
          Partnership Intelligence
        </Link>
        <WorkspaceNavigation />
        <span className="muted small">{actor.name}</span>
        <Logout />
      </header>
      {demo && (
        <p className="demo-banner" role="note">
          Fictional demo · Riverbend Community Workshop. All people, companies,
          sources and outcomes are invented. Do not enter private information.
        </p>
      )}
      <main id="main" className="content">
        {children}
      </main>
    </div>
  );
}
