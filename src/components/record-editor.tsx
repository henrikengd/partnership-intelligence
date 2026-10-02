"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WorkspaceData } from "@/modules/records/service";
import type { RecordKind } from "@/modules/records/validation";
type Field = {
  name: string;
  label: string;
  type?:
    | "text"
    | "textarea"
    | "date"
    | "number"
    | "url"
    | "email"
    | "select"
    | "multiselect";
  required?: boolean;
  options?: { value: string; label: string }[];
  defaultValue?: string;
  help?: string;
};
const option = (value: string, label = value) => ({ value, label });
export function RecordEditor({
  kind,
  data,
  title,
}: {
  kind: RecordKind;
  data: WorkspaceData;
  title: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const categories = [
    "cash",
    "manufacturing",
    "materials",
    "software",
    "logistics",
    "facilities",
    "expertise",
    "volunteers",
    "other",
  ].map((c) => option(c));
  const companies = data.companies.map((c) => option(c.id, c.name));
  const people = data.people.map((p) => option(p.id, p.name));
  const sources = data.evidence.map((e) =>
    option(e.id, `${e.claim.slice(0, 70)} (${e.reviewState})`),
  );
  const fields: Record<RecordKind, Field[]> = {
    needs: [
      { name: "title", label: "Need title", required: true },
      {
        name: "description",
        label: "Need description",
        type: "textarea",
        required: true,
      },
      {
        name: "category",
        label: "Need category",
        type: "select",
        required: true,
        options: categories,
      },
      {
        name: "urgency",
        label: "Urgency",
        type: "select",
        options: [
          option("", "Unknown"),
          option("0", "0 · Low, no deadline"),
          option("1", "1 · Low, later deadline"),
          option("2", "2 · Normal"),
          option("3", "3 · High"),
          option("4", "4 · Critical near-term priority"),
        ],
      },
      { name: "deadline", label: "Deadline", type: "date" },
      { name: "estimatedValue", label: "Estimated value", type: "number" },
      { name: "currency", label: "Currency", defaultValue: "NOK" },
      {
        name: "partnershipType",
        label: "Preferred partnership type",
        defaultValue: "in_kind",
        required: true,
      },
      {
        name: "active",
        label: "Need status",
        type: "select",
        options: [option("true", "Active"), option("false", "Inactive")],
        defaultValue: "true",
      },
    ],
    companies: [
      { name: "name", label: "Company name", required: true },
      { name: "description", label: "Company description", type: "textarea" },
      { name: "website", label: "Company website", type: "url" },
      {
        name: "domain",
        label: "Company domain",
        help: "Optional exact domain for future import matching.",
      },
    ],
    people: [
      { name: "name", label: "Person name", required: true },
      { name: "email", label: "Person email", type: "email" },
      {
        name: "roles",
        label: "Organization roles",
        type: "multiselect",
        options: [
          option("member", "Member"),
          option("alumni", "Alumni"),
          option("advisor", "Advisor"),
          option("board", "Board"),
          option("contact", "External contact"),
        ],
        help: "Select all applicable roles. An external contact alone creates no internal introduction path.",
      },
      {
        name: "affiliationState",
        label: "Affiliation state",
        type: "select",
        options: [
          option("current", "Current"),
          option("ended", "Ended"),
          option("unknown", "Unknown"),
        ],
      },
      {
        name: "affiliationStartDate",
        label: "Affiliation start",
        type: "date",
      },
      { name: "affiliationEndDate", label: "Affiliation end", type: "date" },
      { name: "notes", label: "Person notes", type: "textarea" },
    ],
    evidence: [
      { name: "claim", label: "Evidence claim", required: true },
      {
        name: "sourceType",
        label: "Source type",
        type: "select",
        options: [
          option("supplied_source", "Supplied source URL"),
          option("observation", "Attributed observation"),
        ],
      },
      { name: "url", label: "Source URL", type: "url" },
      {
        name: "attribution",
        label: "Observation source",
        help: "Required for an observation. Name its source, rather than claiming it is verified.",
      },
      {
        name: "excerpt",
        label: "Supplied excerpt or observation",
        type: "textarea",
        required: true,
      },
      {
        name: "observedDate",
        label: "Observation date",
        type: "date",
        required: true,
      },
      {
        name: "reviewState",
        label: "Evidence review state",
        type: "select",
        options: [
          option("supplied", "Supplied, unreviewed"),
          option("reviewed", "Reviewed claim"),
          option("disputed", "Disputed"),
          option("superseded", "Superseded"),
        ],
      },
      {
        name: "reviewDate",
        label: "Review date",
        type: "date",
        help: "Required for reviewed claims. A URL alone never verifies a claim.",
      },
    ],
    capabilities: [
      {
        name: "companyId",
        label: "Capability company",
        type: "select",
        required: true,
        options: [option("", "Select a company"), ...companies],
      },
      {
        name: "category",
        label: "Capability category",
        type: "select",
        required: true,
        options: categories,
      },
      {
        name: "description",
        label: "Capability description",
        type: "textarea",
        required: true,
      },
      {
        name: "evidenceId",
        label: "Capability evidence",
        type: "select",
        required: true,
        options: [option("", "Select supplied evidence"), ...sources],
      },
    ],
    relationships: [
      {
        name: "personId",
        label: "Relationship person",
        type: "select",
        required: true,
        options: [option("", "Select a person"), ...people],
      },
      {
        name: "kind",
        label: "Relationship type",
        type: "select",
        options: [
          option("works_at", "Works at"),
          option("previously_worked_at", "Previously worked at"),
          option("interned_at", "Interned at"),
          option("knows", "Knows"),
          option("introduced_by", "Introduced by"),
          option("studied_with", "Studied with"),
        ],
      },
      {
        name: "companyId",
        label: "Relationship company",
        type: "select",
        options: [option("", "None, for a personal connection"), ...companies],
      },
      {
        name: "targetPersonId",
        label: "Other person",
        type: "select",
        options: [option("", "None, for employment"), ...people],
      },
      {
        name: "title",
        label: "Recorded job or contact title",
        help: "A title alone does not establish decision authority.",
      },
      {
        name: "state",
        label: "Relationship state",
        type: "select",
        options: [
          option("current", "Current"),
          option("ended", "Ended"),
          option("unknown", "Unknown"),
        ],
      },
      { name: "startDate", label: "Relationship start", type: "date" },
      { name: "endDate", label: "Relationship end", type: "date" },
      {
        name: "strength",
        label: "Reported personal strength",
        type: "select",
        options: [
          option("", "Unknown"),
          ...Array.from({ length: 5 }, (_, i) => option(String(i))),
        ],
      },
      {
        name: "willingness",
        label: "Introduction willingness",
        type: "select",
        options: [
          option("unknown", "Unknown"),
          option("yes", "Recorded yes, reconfirm for this ask"),
          option("no", "No, respect the refusal"),
        ],
      },
      {
        name: "willingnessDate",
        label: "Willingness observation date",
        type: "date",
      },
      { name: "willingnessSource", label: "Willingness source" },
      {
        name: "evidenceId",
        label: "Relationship evidence",
        type: "select",
        required: true,
        options: [option("", "Select supplied evidence"), ...sources],
      },
    ],
  };
  const records = data[kind] as unknown as Record<string, unknown>[];
  function begin(record: Record<string, unknown>) {
    setSaved(false);
    setError("");
    if (kind === "people") {
      const affiliation = data.affiliations.filter(
        (a) => a.personId === record.id,
      );
      setEditing({
        ...record,
        roles: affiliation.map((a) => a.role),
        affiliationState: affiliation[0]?.state ?? "current",
        affiliationStartDate: affiliation[0]?.startDate,
        affiliationEndDate: affiliation[0]?.endDate,
      });
    } else setEditing(record);
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setError("");
    setSaved(false);
    setBusy(true);
    const values: Record<string, unknown> = Object.fromEntries(
      new FormData(form),
    );
    if (editing) values.id = editing.id;
    for (const field of fields[kind]) {
      if (field.type === "multiselect")
        values[field.name] = new FormData(form).getAll(field.name);
      if (
        [
          "deadline",
          "estimatedValue",
          "website",
          "domain",
          "email",
          "affiliationStartDate",
          "affiliationEndDate",
          "url",
          "attribution",
          "reviewDate",
          "startDate",
          "endDate",
          "companyId",
          "targetPersonId",
          "willingnessDate",
          "willingnessSource",
        ].includes(field.name) &&
        values[field.name] === ""
      )
        values[field.name] = null;
      if (["urgency", "strength"].includes(field.name))
        values[field.name] =
          values[field.name] === "" ? null : Number(values[field.name]);
      if (field.name === "active") values.active = values.active === "true";
    }
    try {
      const response = await fetch(`/api/records/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error?.fields
            ?.map((f: { message: string }) => f.message)
            .join(" ") ??
            result.error?.message ??
            "The record could not be saved.",
        );
      setEditing(null);
      form.reset();
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card">
      <div className="row">
        <h2>{title}</h2>
        {editing && (
          <button className="secondary small" onClick={() => setEditing(null)}>
            Cancel editing
          </button>
        )}
      </div>
      <form key={String(editing?.id ?? "new")} onSubmit={submit}>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {saved && (
          <p role="status" className="notice">
            {title} saved.
          </p>
        )}
        {fields[kind].map((field) => (
          <div key={field.name}>
            <label htmlFor={`${kind}-${field.name}`}>{field.label}</label>
            {field.type === "textarea" ? (
              <textarea
                id={`${kind}-${field.name}`}
                name={field.name}
                required={field.required}
                defaultValue={String(
                  editing?.[field.name] ?? field.defaultValue ?? "",
                )}
                maxLength={4000}
              />
            ) : field.type === "multiselect" ? (
              <div className="checkboxes">
                {field.options?.map((o) => (
                  <label key={o.value}>
                    <input
                      type="checkbox"
                      name={field.name}
                      value={o.value}
                      defaultChecked={
                        Array.isArray(editing?.[field.name]) &&
                        (editing![field.name] as string[]).includes(o.value)
                      }
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            ) : field.type === "select" ? (
              <select
                id={`${kind}-${field.name}`}
                name={field.name}
                required={field.required}
                defaultValue={String(
                  editing?.[field.name] ??
                    field.defaultValue ??
                    field.options?.[0]?.value ??
                    "",
                )}
              >
                {field.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={`${kind}-${field.name}`}
                name={field.name}
                type={field.type ?? "text"}
                step={field.type === "number" ? "0.01" : undefined}
                min={field.type === "number" ? 0 : undefined}
                required={field.required}
                defaultValue={String(
                  editing?.[field.name] ?? field.defaultValue ?? "",
                )}
                maxLength={2000}
              />
            )}
            {field.help && <span className="muted small">{field.help}</span>}
          </div>
        ))}
        <button disabled={busy}>
          {busy
            ? "Saving…"
            : editing
              ? `Update ${title.toLowerCase()}`
              : `Save ${title.toLowerCase()}`}
        </button>
      </form>
      <div className="saved-records">
        <h3>Saved {kind}</h3>
        {records.length === 0 ? (
          <p className="muted">No {kind} saved yet.</p>
        ) : (
          records.map((record) => (
            <article className="account" key={String(record.id)}>
              <strong>
                {String(
                  record.title ??
                    record.name ??
                    record.claim ??
                    record.description ??
                    String(record.kind).replaceAll("_", " "),
                )}
              </strong>
              {kind === "people" && (
                <p className="muted small">
                  {data.affiliations
                    .filter((a) => a.personId === record.id)
                    .map((a) => a.role)
                    .join(", ")}
                </p>
              )}
              {kind === "evidence" && (
                <p className="muted small">
                  {String(record.reviewState)} · observed{" "}
                  {String(record.observedDate)} ·{" "}
                  {record.url ? String(record.url) : String(record.attribution)}
                </p>
              )}
              {kind === "relationships" && (
                <p className="muted small">
                  {data.people.find((p) => p.id === record.personId)?.name} →{" "}
                  {data.companies.find((c) => c.id === record.companyId)
                    ?.name ??
                    data.people.find((p) => p.id === record.targetPersonId)
                      ?.name}{" "}
                  · {String(record.state)} · willingness{" "}
                  {String(record.willingness)}
                </p>
              )}
              <button
                className="secondary small"
                onClick={() => begin(record)}
                aria-label={`Edit ${String(record.title ?? record.name ?? record.claim ?? record.description ?? record.kind)}`}
              >
                Edit
              </button>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
