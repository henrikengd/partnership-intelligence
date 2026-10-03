"use client";
import Link from "next/link";
export default function WorkspaceError({ retry }: { retry: () => void }) {
  return (
    <section className="card" role="alert">
      <h1>This page could not load</h1>
      <p>
        Your saved records remain available. Retry the page, or return to the
        overview. If the problem continues, contact your installation
        administrator.
      </p>
      <div className="row">
        <button onClick={() => retry()}>Retry page</button>
        <Link href="/dashboard">Return to overview</Link>
      </div>
    </section>
  );
}
