"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function OpportunityCreate({
  needs,
  companies,
}: {
  needs: {
    id: string;
    title: string;
    partnershipType: string;
    active: boolean;
  }[];
  companies: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <section className="card">
      <h2>Create an explained opportunity</h2>
      <p className="muted">
        Evaluate one saved company against an active need. This brief uses
        recorded data and requires your review. AI is disabled.
      </p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          const values = Object.fromEntries(new FormData(event.currentTarget));
          try {
            const response = await fetch("/api/opportunities", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...values,
                partnershipType:
                  needs.find((n) => n.id === values.needId)?.partnershipType ??
                  "in_kind",
              }),
            });
            const result = await response.json();
            if (!response.ok)
              throw new Error(result.error?.message ?? "Generation failed.");
            router.push(`/opportunities/${result.id}`);
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div>
          <label htmlFor="candidate-need">Relevant need</label>
          <select id="candidate-need" name="needId" required>
            <option value="">Select a need</option>
            {needs
              .filter((n) => n.active)
              .map((n) => (
                <option key={n.id} value={n.id}>
                  {n.title}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label htmlFor="candidate-company">Candidate company</label>
          <select id="candidate-company" name="companyId" required>
            <option value="">Select a company</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button
          disabled={busy || !needs.some((n) => n.active) || !companies.length}
        >
          {busy ? "Generating…" : "Generate deterministic brief"}
        </button>
      </form>
    </section>
  );
}
