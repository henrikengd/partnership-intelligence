"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AiDraft } from "@/server/ai/contracts";
import styles from "./ai-panel.module.css";
type Run = {
  id: string;
  status: string;
  attempt: number;
  errorCategory: string | null;
  draft: AiDraft | null;
  stale: boolean;
  contactName: string | null;
  routeLabel: string | null;
};
export function AiDraftPanel({ opportunityId }: { opportunityId: string }) {
  const [packet, setPacket] = useState("");
  const [localReferences, setLocalReferences] = useState<{
    people: { ref: string; name: string }[];
    routes: { ref: string; label: string; willingness: string }[];
  } | null>(null);
  const actionKey = useRef<string | null>(null);
  const [revision, setRevision] = useState("");
  const [role, setRole] = useState("");
  const [previewRole, setPreviewRole] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [runs, setRuns] = useState<Run[]>([]);
  const [retryId, setRetryId] = useState<string | null>(null);
  const loadRuns = useCallback(async () => {
    const r = await fetch(`/api/ai/runs?opportunityId=${opportunityId}`);
    const value = await r.json();
    if (!r.ok)
      throw new Error(value.error?.message ?? "Could not load AI runs.");
    setRuns(value);
  }, [opportunityId]);
  useEffect(() => {
    fetch(`/api/ai/runs?opportunityId=${opportunityId}`)
      .then(async (r) => {
        const value = await r.json();
        if (!r.ok)
          throw new Error(value.error?.message ?? "Could not load AI runs.");
        setRuns(value);
      })
      .catch((e) => setError(e.message));
  }, [opportunityId]);
  async function preview(id: string | null = null) {
    setBusy(true);
    setError("");
    setReviewed(false);
    setRevision("");
    setRetryId(id);
    actionKey.current = null;
    try {
      const r = await fetch(
        `/api/ai/preview?opportunityId=${opportunityId}&role=${encodeURIComponent(role)}`,
      );
      const value = await r.json();
      if (!r.ok)
        throw new Error(value.error?.message ?? "Could not build a preview.");
      setPacket(JSON.stringify(value.packet, null, 2));
      setLocalReferences(value.localReferences);
      setRevision(value.previewRevision);
      setPreviewRole(role);
      setEnabled(value.settings.enabled && value.settings.credentialConfigured);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }
  async function send() {
    setBusy(true);
    setError("");
    setReviewed(false);
    try {
      const parsed = JSON.parse(packet);
      actionKey.current ??= crypto.randomUUID();
      const r = await fetch(
        retryId ? `/api/ai/runs/${retryId}/retry` : "/api/ai/runs",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            opportunityId,
            packet: parsed,
            previewRevision: revision,
            suggestedRole: previewRole,
            idempotencyKey: actionKey.current,
          }),
        },
      );
      const value = await r.json();
      if (!r.ok)
        throw new Error(value.error?.message ?? "Could not request a draft.");
      setRevision("");
      setRetryId(null);
      await loadRuns();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={`card ${styles.panel}`}>
      <h2>AI draft assistance</h2>
      <p>
        Review the exact outbound context before each request. Personal names
        and contact details are removed by default. Pseudonyms can still
        identify people through context.
      </p>
      <p>
        Drafts remain inferences pending review. Evidence IDs do not prove
        semantic support. Copy useful text into your manual brief only after
        checking it.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <label htmlFor="ai-role">Optional contact role to consider</label>
      <input
        id="ai-role"
        value={role}
        maxLength={120}
        placeholder="For example: grant officer"
        onChange={(e) => {
          setRole(e.target.value);
          actionKey.current = null;
          setReviewed(false);
          setRevision("");
        }}
        disabled={busy}
      />
      <div className={styles.controls}>
        <button type="button" disabled={busy} onClick={() => preview()}>
          Review AI context
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => loadRuns().catch((e) => setError(e.message))}
        >
          Refresh AI runs
        </button>
      </div>
      {revision && (
        <>
          <p>
            {enabled
              ? "OpenAI assistance is enabled."
              : "AI is disabled or has no server credential. You can review the packet; generation requires admin configuration."}
          </p>
          {localReferences && (
            <aside aria-label="Local AI reference legend">
              <h3>Local reference legend</h3>
              <p>
                These names and route labels stay in this installation. They are
                separate from the outbound packet below.
              </p>
              <ul>
                {localReferences.people.map((person) => (
                  <li key={person.ref}>
                    {person.ref}: {person.name}
                  </li>
                ))}
                {localReferences.routes.map((route) => (
                  <li key={route.ref}>
                    {route.ref}: {route.label}. Introduction willingness:{" "}
                    {route.willingness}.
                  </li>
                ))}
              </ul>
            </aside>
          )}
          <label htmlFor="ai-packet">Outbound JSON packet</label>
          <textarea
            id="ai-packet"
            className={styles.packet}
            value={packet}
            onChange={(e) => {
              setPacket(e.target.value);
              actionKey.current = null;
              setReviewed(false);
            }}
            disabled={busy}
          />
          <p>
            Remove unnecessary sources or edit text. Keep reference IDs, dates,
            review states, company and allowed roles unchanged. Maximum
            serialized context: 12,000 characters. No source links are fetched.
          </p>
          <label>
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
              disabled={busy}
            />{" "}
            I reviewed this edited packet and approve sending it to OpenAI.
          </label>
          <div className={styles.controls}>
            <button
              type="button"
              disabled={busy || !reviewed || !enabled}
              onClick={send}
            >
              {retryId
                ? "Send one explicit retry"
                : "Generate separate AI draft"}
            </button>
          </div>
        </>
      )}
      {busy && (
        <p role="status">Working… Requests stop waiting after 60 seconds.</p>
      )}
      {runs.length === 0 && (
        <p>No AI drafts yet. Your deterministic brief remains available.</p>
      )}
      {runs.map((run) => (
        <article key={run.id}>
          <h3>AI request: {run.status}</h3>
          <p>
            Attempt {run.attempt} of 2
            {run.errorCategory
              ? `. ${run.errorCategory}. No manual brief or assessment changed.`
              : ""}
          </p>
          {run.stale && (
            <p className="notice">
              Recorded inputs changed. Review this draft again.
            </p>
          )}
          {["failed", "interrupted"].includes(run.status) &&
            run.attempt < 2 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => preview(run.id)}
              >
                Review context for one retry
              </button>
            )}
          {run.draft && (
            <>
              <p>
                Proposed contact:{" "}
                {run.contactName ??
                  run.draft.contact.role ??
                  "Role still needed"}
                . This suggestion does not verify access.
              </p>
              {run.routeLabel && (
                <p>
                  Proposed recorded route: {run.routeLabel}. Recheck willingness
                  and role relevance before acting.
                </p>
              )}
              <pre className={styles.result}>
                {JSON.stringify(run.draft, null, 2)}
              </pre>
            </>
          )}
        </article>
      ))}
    </section>
  );
}
