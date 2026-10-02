"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { rubric, type Factors } from "@/modules/opportunities/scoring";
import type { GeneratedBrief } from "@/modules/opportunities/contracts";
import type { activity as activityTable } from "@/server/db/schema";
export type Activity = typeof activityTable.$inferSelect;
async function request(url: string, body: unknown, method = "POST") {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      result.error?.fields
        ?.map((f: { message: string }) => f.message)
        .join(" ") ??
        result.error?.message ??
        "The request failed.",
    );
  return result;
}
export function BriefEditor({
  id,
  brief,
  ownerId,
  owners,
}: {
  id: string;
  brief: GeneratedBrief;
  ownerId: string | null;
  owners: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const fields = [
    { name: "ask", label: "What to ask for" },
    { name: "valueExchange", label: "Proposed value exchange" },
    { name: "contactRole", label: "Recommended contact role" },
    { name: "nextAction", label: "Recommended first action" },
    { name: "approach", label: "Suggested outreach path" },
  ] as const;
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        setSaved(false);
        const data = Object.fromEntries(new FormData(event.currentTarget));
        try {
          await request(
            `/api/opportunities/${id}`,
            { ...data, ownerId: data.ownerId || null },
            "PUT",
          );
          setSaved(true);
          router.refresh();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Try again.");
        }
      }}
    >
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {saved && (
        <p className="notice" role="status">
          Brief and owner saved. Your edits are preserved during regeneration.
        </p>
      )}
      <div>
        <label htmlFor="op-owner">Team owner</label>
        <select id="op-owner" name="ownerId" defaultValue={ownerId ?? ""}>
          <option value="">Unassigned</option>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <span className="muted small">
          An owner is a login account, separate from network people.
        </span>
      </div>
      {fields.map((f) => (
        <div key={f.name}>
          <label htmlFor={`brief-${f.name}`}>{f.label}</label>
          <textarea
            id={`brief-${f.name}`}
            name={f.name}
            defaultValue={brief[f.name]}
            required
            maxLength={f.name === "contactRole" ? 500 : 4000}
          />
        </div>
      ))}
      <button>Save brief and owner</button>
    </form>
  );
}
export function FactorsEditor({
  id,
  factors,
  evidence,
}: {
  id: string;
  factors: Factors;
  evidence: { id: string; claim: string; reviewState: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  return (
    <details className="assessment-editor">
      <summary>Review factor values and save a new assessment</summary>
      <p className="muted">
        Use the rubric anchors. Unknown is different from zero. A known value
        requires evidence or an explicit organization assessment. This saves a
        new immutable version.
      </p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          setSaved(false);
          const data = new FormData(event.currentTarget);
          const reviewed = Object.fromEntries(
            rubric.map((f) => [
              f.key,
              {
                value:
                  data.get(`${f.key}.value`) === ""
                    ? null
                    : Number(data.get(`${f.key}.value`)),
                rationale: String(data.get(`${f.key}.rationale`) ?? ""),
                origin: data.get(`${f.key}.origin`),
                source: data.get(`${f.key}.source`) || null,
                evidenceIds: data
                  .getAll(`${f.key}.evidenceIds`)
                  .filter(Boolean),
              },
            ]),
          );
          try {
            await request(`/api/opportunities/${id}`, reviewed);
            setSaved(true);
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Try again.");
          }
        }}
      >
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {saved && (
          <p role="status" className="notice">
            Assessment version saved.
          </p>
        )}
        {rubric.map((f) => (
          <fieldset key={f.key}>
            <legend>
              {f.label} · weight {f.weight}
            </legend>
            <div>
              <label htmlFor={`${f.key}-value`}>{f.label} value</label>
              <select
                id={`${f.key}-value`}
                name={`${f.key}.value`}
                defaultValue={factors[f.key].value ?? ""}
              >
                <option value="">Unknown</option>
                {f.anchors.map((anchor, index) => (
                  <option key={anchor} value={index}>
                    {index} · {anchor}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${f.key}-rationale`}>{f.label} rationale</label>
              <textarea
                id={`${f.key}-rationale`}
                name={`${f.key}.rationale`}
                defaultValue={factors[f.key].rationale}
                required
                maxLength={2000}
              />
            </div>
            <div>
              <label htmlFor={`${f.key}-origin`}>
                {f.label} assessment origin
              </label>
              <select
                id={`${f.key}-origin`}
                name={`${f.key}.origin`}
                defaultValue={
                  factors[f.key].origin === "organization"
                    ? "organization"
                    : "human"
                }
              >
                <option value="human">Human review of evidence</option>
                <option value="organization">
                  Explicit organization assessment
                </option>
              </select>
            </div>
            <div>
              <label htmlFor={`${f.key}-source`}>
                {f.label} organization assessment or source
              </label>
              <input
                id={`${f.key}-source`}
                name={`${f.key}.source`}
                defaultValue={factors[f.key].source ?? ""}
                maxLength={1000}
              />
            </div>
            <div>
              <label htmlFor={`${f.key}-evidence`}>{f.label} evidence</label>
              <select
                id={`${f.key}-evidence`}
                name={`${f.key}.evidenceIds`}
                multiple
                defaultValue={factors[f.key].evidenceIds}
              >
                {evidence.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.claim.slice(0, 90)} ({e.reviewState})
                  </option>
                ))}
              </select>
              <span className="muted small">
                Selecting a source is not proof of semantic support. Review the
                claim against your rationale.
              </span>
            </div>
          </fieldset>
        ))}
        <button>Save reviewed assessment</button>
      </form>
    </details>
  );
}
export function ActivityForm({
  opportunityId,
  people,
  activities,
}: {
  opportunityId: string;
  people: { id: string; name: string }[];
  activities: Activity[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  return (
    <div>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          setError("");
          setSaved(false);
          const data = Object.fromEntries(new FormData(form));
          try {
            await request("/api/activities", {
              ...data,
              opportunityId,
              status: "planned",
              targetPersonId: data.targetPersonId || null,
              followUpDate: data.followUpDate || null,
            });
            setSaved(true);
            form.reset();
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Try again.");
          }
        }}
      >
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {saved && (
          <p role="status" className="notice">
            Action planned. It is not completed outreach.
          </p>
        )}
        <div>
          <label htmlFor="action-kind">Action type</label>
          <select id="action-kind" name="kind">
            <option value="introduction">Introduction request</option>
            <option value="outreach">Company outreach</option>
            <option value="meeting">Meeting</option>
            <option value="follow_up">Follow-up</option>
          </select>
        </div>
        <div>
          <label htmlFor="action-person">Target person</label>
          <select id="action-person" name="targetPersonId">
            <option value="">Use a contact role instead</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="action-role">Target role</label>
          <input id="action-role" name="targetRole" maxLength={500} />
        </div>
        <div>
          <label htmlFor="action-channel">Channel</label>
          <select id="action-channel" name="channel">
            {["email", "phone", "meeting", "message", "other"].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="action-description">Action description</label>
          <textarea
            id="action-description"
            name="description"
            required
            maxLength={4000}
          />
        </div>
        <div>
          <label htmlFor="action-followup">Follow-up date</label>
          <input id="action-followup" name="followUpDate" type="date" />
        </div>
        <button>Plan action</button>
        <span className="muted small">
          This only records the plan. The application sends no messages.
        </span>
      </form>
      <div className="saved-records">
        <h3>Activity history</h3>
        {activities.length === 0 ? (
          <p className="muted">No action recorded yet.</p>
        ) : (
          activities.map((a) => (
            <article className="account" key={a.id}>
              <span className={`badge ${a.status}`}>
                {a.status === "planned"
                  ? "Planned, not completed"
                  : "Completed action"}
              </span>
              <p>{a.description}</p>
              <p className="muted small">
                {a.kind} · {a.channel} ·{" "}
                {a.targetPersonId
                  ? people.find((p) => p.id === a.targetPersonId)?.name
                  : a.targetRole}
                {a.followUpDate ? ` · follow up ${a.followUpDate}` : ""}
                {a.completedAt
                  ? ` · completed ${new Date(a.completedAt).toISOString()}`
                  : ""}
              </p>
              {a.status === "planned" && (
                <button
                  className="secondary"
                  onClick={async () => {
                    setError("");
                    try {
                      await request("/api/activities", {
                        id: a.id,
                        opportunityId: a.opportunityId,
                        kind: a.kind,
                        status: "completed",
                        targetPersonId: a.targetPersonId,
                        targetRole: a.targetRole,
                        channel: a.channel,
                        description: a.description,
                        followUpDate: a.followUpDate,
                      });
                      router.refresh();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Try again.");
                    }
                  }}
                >
                  Mark completed
                </button>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
export function Regenerate({
  opportunityId,
  needId,
  companyId,
  partnershipType,
}: {
  opportunityId: string;
  needId: string;
  companyId: string;
  partnershipType: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  return (
    <div>
      <button
        className="secondary"
        onClick={async () => {
          setError("");
          try {
            await request("/api/opportunities", {
              needId,
              companyId,
              partnershipType,
              refreshOpportunityId: opportunityId,
            });
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Try again.");
          }
        }}
      >
        Regenerate from recorded inputs
      </button>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </div>
  );
}
