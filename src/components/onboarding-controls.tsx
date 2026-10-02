"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
export function OnboardingControls({
  step,
  canContinue = true,
}: {
  step: number;
  canContinue?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  async function move(next: number, skip?: number, complete = false) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: next, skip, complete }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error?.message ?? "Progress could not be saved.",
        );
      startTransition(() => {
        router.refresh();
        if (complete) router.push("/dashboard");
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card">
      <p className="muted">
        Progress is saved for this installation. Records remain editable in
        their screens and settings.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="row">
        {step > 0 && (
          <button
            className="secondary"
            disabled={busy || pending}
            onClick={() => move(step - 1)}
          >
            Back
          </button>
        )}
        {step >= 2 && step <= 5 && (
          <button
            className="secondary"
            disabled={busy || pending}
            onClick={() => move(step + 1, step)}
          >
            Skip this optional step
          </button>
        )}
        <button
          disabled={busy || pending || !canContinue}
          onClick={() => move(Math.min(8, step + 1), undefined, step === 8)}
        >
          {step === 8
            ? "Finish onboarding"
            : busy
              ? "Saving…"
              : "Save progress and continue"}
        </button>
        <button className="secondary" onClick={() => router.refresh()}>
          Refresh saved records
        </button>
      </div>
    </section>
  );
}
export function GenerateFirst({
  candidate,
}: {
  candidate: {
    needId: string;
    companyId: string;
    partnershipType: string;
    label: string;
  };
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const response = await fetch("/api/opportunities", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(candidate),
            });
            const result = await response.json();
            if (!response.ok)
              throw new Error(
                result.error?.message ?? "Check the saved inputs.",
              );
            router.push(`/opportunities/${result.id}`);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        Generate brief: {candidate.label}
      </button>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </div>
  );
}
