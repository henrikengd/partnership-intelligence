"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { getLifecycleDetail } from "@/modules/outreach/lifecycle";
export type LifecycleData = Awaited<ReturnType<typeof getLifecycleDetail>>;
export function LifecycleControls({ detail }: { detail: LifecycleData }) {
  const { record, events, partnerships, today } = detail;
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  async function send(action: string, body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/opportunities/${record.id}/lifecycle`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId,
            action,
            fromState: record.state,
            ...body,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error?.fields
            ?.map((f: { message: string }) => f.message)
            .join(" ") ??
            result.error?.message ??
            "The outcome could not be recorded.",
        );
      setRequestId(crypto.randomUUID());
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }
  const closed = ["declined", "archived"].includes(record.state);
  const choices: Record<string, string[]> = {
    suggested: ["shortlisted", "pursuing", "declined", "archived"],
    shortlisted: ["suggested", "pursuing", "declined", "archived"],
    pursuing: ["shortlisted", "declined", "archived"],
    agreed: ["archived"],
    declined: [],
    archived: [],
  };
  return (
    <section className="card">
      <h2>Lifecycle and outcomes</h2>
      <p>
        Current state: <strong>{record.state}</strong>. Entering pursuing
        requires a current readiness review. Recording an outcome never sends a
        message or completes outreach.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <form
        key={record.state}
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          void send(closed ? "reopen" : "transition", {
            ...(closed ? {} : { toState: data.get("toState") }),
            reason: data.get("reason"),
          });
        }}
      >
        {!closed && (
          <>
            <label htmlFor="lifecycle-state">Next lifecycle state</label>
            <select id="lifecycle-state" name="toState">
              {choices[record.state].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </>
        )}
        <label htmlFor="lifecycle-reason">Transition or reopening reason</label>
        <textarea
          id="lifecycle-reason"
          name="reason"
          maxLength={4000}
          required={closed}
        />
        <button disabled={busy || pending}>
          {closed ? "Explicitly reopen opportunity" : "Record state change"}
        </button>
      </form>
      {record.partnershipId && (
        <p className="notice">
          A resulting partnership is already linked. Reopening archived agreed
          work restores its recorded agreement without creating another
          partnership.
        </p>
      )}
      {!closed && record.state !== "agreed" && (
        <details>
          <summary>Record a confirmed partnership agreement</summary>
          <p>
            Keep an unconfirmed proposal as a draft. Record agreement only after
            it actually happened and attribute its source.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const existing = String(data.get("partnershipId") ?? "");
              void send("agreement", {
                confirmed: data.get("confirmed") === "on",
                source: data.get("source"),
                occurredDate: data.get("occurredDate"),
                ...(existing
                  ? { partnershipId: existing }
                  : {
                      newPartnership: {
                        title: data.get("title"),
                        type: record.partnershipType,
                        state: data.get("partnershipState"),
                        startDate: data.get("startDate") || null,
                        endDate: data.get("endDate") || null,
                        description: data.get("description") ?? "",
                      },
                    }),
              });
            }}
          >
            <label htmlFor="agreement-existing">Resulting partnership</label>
            <select id="agreement-existing" name="partnershipId">
              <option value="">Create a new partnership</option>
              {partnerships.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} · {p.state}
                </option>
              ))}
            </select>
            <label htmlFor="agreement-title">New partnership title</label>
            <input
              id="agreement-title"
              name="title"
              defaultValue={`Support for ${record.partnershipType.replaceAll("_", " ")}`}
              maxLength={2000}
            />
            <label htmlFor="agreement-state">New partnership state</label>
            <select id="agreement-state" name="partnershipState">
              <option>current</option>
              <option>ended</option>
              <option>unknown</option>
            </select>
            <label htmlFor="agreement-start">New partnership start</label>
            <input id="agreement-start" type="date" name="startDate" />
            <label htmlFor="agreement-end">New partnership end</label>
            <input id="agreement-end" type="date" name="endDate" />
            <label htmlFor="agreement-description">
              New partnership contribution
            </label>
            <textarea
              id="agreement-description"
              name="description"
              maxLength={4000}
            />
            <label htmlFor="agreement-date">Actual agreement date</label>
            <input
              id="agreement-date"
              name="occurredDate"
              type="date"
              defaultValue={today}
              max={today}
              required
            />
            <label htmlFor="agreement-source">
              Agreement source or attribution
            </label>
            <input
              id="agreement-source"
              name="source"
              maxLength={1000}
              required
            />
            <label>
              <input name="confirmed" type="checkbox" required /> The agreement
              actually happened; this is not a draft
            </label>
            <button disabled={busy || pending}>
              Record confirmed agreement
            </button>
          </form>
        </details>
      )}
      <h3>Recorded lifecycle history</h3>
      {events.length ? (
        events.map((e) => (
          <article key={e.id} className="account">
            <strong>
              {e.fromState} → {e.toState}
            </strong>
            <p>
              {e.reason || "Recorded lifecycle change"}
              {e.source ? ` · ${e.source}` : ""}
            </p>
            <p className="muted small">
              Occurred {e.occurredDate} · recorded{" "}
              {new Date(e.createdAt).toISOString()}
              {e.reviewId ? " · readiness review recorded" : ""}
            </p>
          </article>
        ))
      ) : (
        <p className="muted">No lifecycle changes recorded.</p>
      )}
    </section>
  );
}
