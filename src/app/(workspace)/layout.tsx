import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireActor } from "@/server/auth/access";
import { DomainError } from "@/server/errors";
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
  return (
    <div className="shell">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="header">
        <Link className="brand" href="/dashboard">
          Partnership Intelligence
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/dashboard">Overview</Link>
          <Link href="/needs">Needs</Link>
          <Link href="/network">Network</Link>
          <Link href="/companies">Companies</Link>
          <Link href="/graph">Graph</Link>
          <Link href="/opportunities">Opportunities</Link>
          <Link href="/partnerships">Partnerships</Link>
          <Link href="/onboarding">Onboarding</Link>
          <Link href="/settings">Settings</Link>
        </nav>
        <span className="muted small">{actor.name}</span>
        <Logout />
      </header>
      <main id="main" className="content">
        {children}
      </main>
    </div>
  );
}
