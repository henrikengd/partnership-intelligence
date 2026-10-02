"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { activity } from "@/server/db/schema";
import { FollowUpControls } from "./follow-up-controls";
export function OutreachActivities({
  opportunityId,
  people,
  activities,
  today,
}: {
  opportunityId: string;
  people: { id: string; name: string }[];
  activities: (typeof activity.$inferSelect)[];
  today: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("planned");
  async function save(body: unknown) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error?.message ?? "Activity could not be recorded.",
        );
      startTransition(() => router.refresh());
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card">
      <h2>Owned outreach and follow-ups</h2>
      <p>
        Record actions manually. A planned message has not been sent. Actual
        occurrence dates are separate from the timestamp when completion is
        recorded.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const d = new FormData(form);
          if (
            await save({
              opportunityId,
              kind: d.get("kind"),
              status: d.get("status"),
              targetPersonId: d.get("targetPersonId") || null,
              targetRole: d.get("targetRole"),
              channel: d.get("channel"),
              description: d.get("description"),
              followUpDate: d.get("followUpDate") || null,
              occurredDate:
                d.get("status") === "completed" ? d.get("occurredDate") : null,
            })
          ) {
            form.reset();
            setStatus("planned");
          }
        }}
      >
        <label htmlFor="outreach-kind">Action kind</label>
        <select id="outreach-kind" name="kind">
          {["introduction", "outreach", "meeting", "follow_up"].map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
        <label htmlFor="outreach-status">Action status</label>
        <select
          id="outreach-status"
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="planned">Planned, not completed</option>
          <option value="completed">Completed communication</option>
        </select>
        <label htmlFor="outreach-person">Recorded target person</label>
        <select id="outreach-person" name="targetPersonId">
          <option value="">Use a recorded role</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <label htmlFor="outreach-role">Recorded target role</label>
        <input id="outreach-role" name="targetRole" maxLength={500} />
        <label htmlFor="outreach-channel">Recorded channel</label>
        <select id="outreach-channel" name="channel">
          {["email", "phone", "meeting", "message", "other"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <label htmlFor="outreach-description">
          Recorded action description
        </label>
        <textarea
          id="outreach-description"
          name="description"
          maxLength={4000}
          required
        />
        {status === "completed" && (
          <>
            <label htmlFor="outreach-occurred">Actual communication date</label>
            <input
              id="outreach-occurred"
              type="date"
              name="occurredDate"
              defaultValue={today}
              max={today}
              required
            />
          </>
        )}
        <label htmlFor="outreach-followup">Next follow-up date</label>
        <input id="outreach-followup" type="date" name="followUpDate" />
        <button disabled={busy || pending}>
          Record{" "}
          {status === "planned" ? "planned action" : "completed communication"}
        </button>
      </form>
      <h3>Activity history</h3>
      {activities.length ? (
        activities.map((a) => (
          <article key={a.id} className="account">
            <strong>
              {a.status === "completed"
                ? "Completed action"
                : "Planned, not completed"}{" "}
              · {a.kind.replaceAll("_", " ")}
            </strong>
            <p>{a.description}</p>
            <p>
              {people.find((p) => p.id === a.targetPersonId)?.name ??
                a.targetRole}{" "}
              · {a.channel}
            </p>
            <p className="muted small">
              {a.occurredDate
                ? `Occurred ${a.occurredDate}`
                : "Occurrence date not recorded"}
              {a.completedAt
                ? ` · completion recorded ${new Date(a.completedAt).toISOString()}`
                : ""}
            </p>
            {a.followUpDate && (
              <p className="notice">
                {a.followUpResolvedAt
                  ? "Follow-up resolved"
                  : a.followUpDate < today
                    ? "Overdue follow-up"
                    : a.followUpDate === today
                      ? "Due today"
                      : "Upcoming follow-up"}{" "}
                · {a.followUpDate}
              </p>
            )}
            {a.status === "planned" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const d = new FormData(e.currentTarget);
                  void save({
                    ...a,
                    status: "completed",
                    occurredDate: d.get("actualDate"),
                  });
                }}
              >
                <label htmlFor={`complete-date-${a.id}`}>
                  Actual completion date
                </label>
                <input
                  id={`complete-date-${a.id}`}
                  name="actualDate"
                  type="date"
                  max={today}
                  defaultValue={today}
                  required
                />
                <button className="secondary small" disabled={busy || pending}>
                  Mark action completed
                </button>
              </form>
            )}
            <FollowUpControls activity={a} />
          </article>
        ))
      ) : (
        <p className="muted">
          No actions recorded. Assign an active opportunity owner before
          recording the first action.
        </p>
      )}
    </section>
  );
}
