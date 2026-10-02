"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GeneratedBrief } from "@/modules/opportunities/contracts";
import type { NetworkPath } from "@/modules/network/paths";
export function OpportunityReviewForm({
  id,
  brief,
  evidence,
  people,
  paths,
  reviewState,
  stale,
}: {
  id: string;
  brief: GeneratedBrief;
  evidence: { id: string; claim: string; reviewState: string }[];
  people: { id: string; name: string }[];
  paths: NetworkPath[];
  reviewState: string;
  stale: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  async function post(url: string, body: unknown) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await r.json();
    if (!r.ok)
      throw new Error(
        result.error?.fields
          ?.map((f: { message: string }) => f.message)
          .join(" ") ??
          result.error?.message ??
          "Try again.",
      );
    return result;
  }
  return (
    <section className="card">
      <h2>Review before action</h2>
      <p className="badge">{reviewState.replaceAll("_", " ")}</p>
      <p className="muted">
        Review factual support for fit, a concrete ask, the intended contact and
        first action. Cold approaches can pass when explicitly reviewed.
        Recorded paths never establish present consent or authority.
      </p>
      {stale && (
        <p className="notice">
          Inputs changed. Regenerate before marking ready.
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="notice">
          Readiness review saved. You can now start pursuing.
        </p>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setBusy(true);
          const f = new FormData(e.currentTarget);
          try {
            await post(`/api/opportunities/${id}/review`, {
              fitReviewed: f.has("fitReviewed"),
              askReviewed: f.has("askReviewed"),
              targetReviewed: f.has("targetReviewed"),
              nextActionReviewed: f.has("nextActionReviewed"),
              fitValue: Number(f.get("fitValue")),
              fitRationale: f.get("fitRationale"),
              fitEvidenceIds: f.getAll("fitEvidenceIds"),
              fitSource: f.get("fitSource"),
              ask: f.get("ask"),
              contactRole: f.get("contactRole"),
              targetPersonId: f.get("targetPersonId") || null,
              nextAction: f.get("nextAction"),
              approachMode: f.get("approachMode"),
              pathId: f.get("pathId") || null,
            });
            setSaved(true);
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label htmlFor="ready-fit-value">Reviewed fit value</label>
        <select name="fitValue" id="ready-fit-value" defaultValue="2">
          <option value="1">1 · Broad sector relevance</option>
          <option value="2">2 · Capability with unresolved gaps</option>
          <option value="3">3 · Specific capability with minor gaps</option>
          <option value="4">
            4 · Supported capability meets the defined need
          </option>
        </select>
        <label htmlFor="ready-fit-rationale">Reviewed fit rationale</label>
        <textarea
          name="fitRationale"
          id="ready-fit-rationale"
          required
          minLength={12}
          maxLength={2000}
        />
        <label htmlFor="ready-fit-evidence">Reviewed fit evidence</label>
        <select multiple name="fitEvidenceIds" id="ready-fit-evidence">
          {evidence.map((s) => (
            <option key={s.id} value={s.id}>
              {s.claim.slice(0, 90)} ({s.reviewState})
            </option>
          ))}
        </select>
        <label htmlFor="ready-fit-source">
          Explicit organization fit assessment when no source is selected
        </label>
        <input name="fitSource" id="ready-fit-source" maxLength={1000} />
        <label htmlFor="ready-ask">Concrete reviewed ask</label>
        <textarea
          name="ask"
          id="ready-ask"
          defaultValue={brief.ask}
          required
          minLength={12}
          maxLength={4000}
        />
        <label htmlFor="ready-role">Reviewed relevant contact role</label>
        <input
          name="contactRole"
          id="ready-role"
          defaultValue={brief.contactRole}
          maxLength={500}
        />
        <label htmlFor="ready-person">Reviewed named company contact</label>
        <select id="ready-person" name="targetPersonId">
          <option value="">Use the reviewed role</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <label htmlFor="ready-action">Concrete reviewed first action</label>
        <textarea
          name="nextAction"
          id="ready-action"
          defaultValue={brief.nextAction}
          required
          minLength={8}
          maxLength={2000}
        />
        <label htmlFor="ready-mode">Reviewed approach</label>
        <select name="approachMode" id="ready-mode" defaultValue="cold">
          <option value="cold">Explicit cold approach</option>
          <option value="introduction">
            Recorded introduction path, reconfirm willingness
          </option>
        </select>
        <label htmlFor="ready-path">Recorded path for an introduction</label>
        <select id="ready-path" name="pathId">
          <option value="">No path needed for a cold approach</option>
          {paths
            .filter((p) => p.willingness !== "no")
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.nodes.map((n) => n.label).join(" → ")} · recorded willingness{" "}
                {p.willingness}
              </option>
            ))}
        </select>
        {[
          [
            "fitReviewed",
            "I reviewed fit against its sources and the current need.",
          ],
          ["askReviewed", "I reviewed a concrete ask and its scope."],
          [
            "targetReviewed",
            "I reviewed the target role/person and this permitted approach.",
          ],
          [
            "nextActionReviewed",
            "I reviewed a concrete first action and existing discussions.",
          ],
        ].map(([name, label]) => (
          <label key={name} style={{ display: "flex", gap: 10 }}>
            <input
              type="checkbox"
              style={{ width: "auto" }}
              name={name}
              required
            />
            {label}
          </label>
        ))}
        <button disabled={busy || stale}>Save readiness review</button>
      </form>
      <button
        className="secondary"
        style={{ marginTop: 18 }}
        disabled={busy || stale || reviewState !== "ready_for_action"}
        onClick={async () => {
          setError("");
          try {
            await post(`/api/opportunities/${id}/pursue`, {});
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Try again.");
          }
        }}
      >
        Start pursuing
      </button>
    </section>
  );
}
