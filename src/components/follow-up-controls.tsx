"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
export function FollowUpControls({
  activity,
}: {
  activity: {
    id: string;
    followUpDate: string | null;
    followUpResolvedAt: Date | string | null;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      key={`${activity.followUpDate}:${activity.followUpResolvedAt}`}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const data = new FormData(e.currentTarget);
        try {
          const response = await fetch(
            `/api/activities/${activity.id}/follow-up`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                followUpDate: data.get("followUpDate") || null,
                resolved: data.get("resolved") === "on",
              }),
            },
          );
          const result = await response.json();
          if (!response.ok)
            throw new Error(
              result.error?.message ?? "Follow-up could not be saved.",
            );
          startTransition(() => router.refresh());
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
      <label htmlFor={`followup-${activity.id}`}>
        Follow-up date for this activity
      </label>
      <input
        id={`followup-${activity.id}`}
        name="followUpDate"
        type="date"
        defaultValue={activity.followUpDate ?? ""}
        onChange={(e) => {
          const box = e.currentTarget.form?.elements.namedItem(
            "resolved",
          ) as HTMLInputElement | null;
          if (box) box.checked = false;
        }}
      />
      <label>
        <input
          type="checkbox"
          name="resolved"
          defaultChecked={Boolean(activity.followUpResolvedAt)}
        />{" "}
        Follow-up resolved separately from activity completion
      </label>
      <button className="secondary small" disabled={busy || pending}>
        Save follow-up
      </button>
    </form>
  );
}
