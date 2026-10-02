"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="shell content">
      <div className="card">
        <h1>We couldn&apos;t load this page</h1>
        <p>
          Your saved records have not changed. Retry, or ask your operator to
          check the installation.
        </p>
        <button onClick={reset}>Try again</button>
      </div>
    </main>
  );
}
