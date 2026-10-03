import Link from "next/link";
export function AuthLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="auth-wrap">
      <section className="auth-story">
        <Link className="brand" href="/">
          Partnership Intelligence
        </Link>
        <h1>The next partnership starts with what you know.</h1>
        <p className="muted">
          Bring your organization&apos;s needs and relationships together.
          Decide who to approach, what to ask, and how to get there.
        </p>
        <span className="eyebrow">A private workspace for your team</span>
      </section>
      <section className="card">
        <h2>{title}</h2>
        <p className="muted">{description}</p>
        {children}
      </section>
    </main>
  );
}
