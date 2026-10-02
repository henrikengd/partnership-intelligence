"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ImportKind, ImportRow } from "@/server/db/schema";
import styles from "./setup-workflow.module.css";
type Batch = {
  id: string;
  kind: ImportKind;
  status: string;
  rows: ImportRow[];
  expiresAt: Date | string;
  summary: {
    created: number;
    updated: number;
    excluded: number;
    total: number;
  } | null;
};
export function ImportWorkflow({ initial }: { initial: Batch | null }) {
  const router = useRouter();
  const [kind, setKind] = useState<ImportKind>(initial?.kind ?? "people");
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [fields, setFields] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [batch, setBatch] = useState<Batch | null>(initial);
  const [decisions, setDecisions] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(0);
  async function request(url: string, init: RequestInit) {
    const response = await fetch(url, init);
    const result = await response.json();
    if (!response.ok)
      throw new Error(
        result.error?.message ?? "The import could not be completed.",
      );
    return result;
  }
  async function upload(phase: "headers" | "preview") {
    if (!file) {
      setError("Choose a CSV file first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("kind", kind);
      form.set("file", file);
      form.set("phase", phase);
      form.set("mapping", JSON.stringify(mapping));
      const result = await request("/api/imports", {
        method: "POST",
        body: form,
      });
      if (phase === "headers") {
        setColumns(result.headers);
        setFields(result.fields);
        setCount(result.count);
        setMapping(
          Object.fromEntries(
            result.fields.map((f: string) => [
              f,
              result.headers.includes(f) ? f : "",
            ]),
          ),
        );
      } else {
        setBatch(result);
        setDecisions({});
        setFile(null);
        setColumns([]);
        router.replace(`/imports?batch=${result.id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }
  async function finish(cancel = false) {
    if (!batch) return;
    setBusy(true);
    setError("");
    try {
      if (cancel) {
        const result = await request(`/api/imports/${batch.id}`, {
          method: "DELETE",
        });
        setBatch(result);
      } else {
        if (batch.rows.some((r) => !decisions[r.row]))
          throw new Error(
            "Choose a resolution for every row, including invalid rows.",
          );
        const rows = batch.rows.map((r) => {
          const value = decisions[r.row];
          return {
            row: r.row,
            action: value.startsWith("update:") ? "update" : value,
            ...(value.startsWith("update:")
              ? { recordId: value.slice(7) }
              : {}),
          };
        });
        const result = await request(`/api/imports/${batch.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rows),
        });
        setBatch({
          ...batch,
          status: "committed",
          rows: [],
          summary: result.summary,
        });
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.workflow}>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!batch && (
        <section className="card">
          <h2>Choose and map a CSV</h2>
          <p>
            Files are limited to 5 MiB and 5,000 data rows. People roles use
            semicolons. Import people and companies before relationships or
            partnerships; use their stable source IDs or saved record IDs.
          </p>
          <label htmlFor="import-kind">Import kind</label>
          <select
            id="import-kind"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as ImportKind);
              setColumns([]);
            }}
          >
            {["people", "companies", "relationships", "partnerships"].map(
              (k) => (
                <option key={k}>{k}</option>
              ),
            )}
          </select>
          <p>
            <a href={`/import-templates/${kind}.csv`} download>
              Download empty {kind} template
            </a>
          </p>
          <label htmlFor="import-file">CSV file</label>
          <input
            id="import-file"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setColumns([]);
            }}
          />
          <button
            className="secondary"
            disabled={busy}
            onClick={() => upload("headers")}
          >
            Read columns
          </button>
          {columns.length > 0 && (
            <>
              <p>
                {count} data rows. Map only fields you want to supply. An
                unmapped optional field uses its default.
              </p>
              <div className={styles.mapping}>
                {fields.map((field) => (
                  <div key={field}>
                    <label htmlFor={`map-${field}`}>Map {field}</label>
                    <select
                      id={`map-${field}`}
                      value={mapping[field] ?? ""}
                      onChange={(e) =>
                        setMapping({ ...mapping, [field]: e.target.value })
                      }
                    >
                      <option value="">Not supplied</option>
                      {columns.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <button disabled={busy} onClick={() => upload("preview")}>
                Validate and preview
              </button>
            </>
          )}
        </section>
      )}
      {batch && batch.status === "pending" && (
        <>
          <section className="card">
            <h2>Review {batch.kind} import</h2>
            <p>
              Nothing has been imported. This preview expires at{" "}
              {new Date(batch.expiresAt).toLocaleString()}. Explicitly exclude
              invalid rows or correct the file. Same names never establish
              identity. Updates replace supplied record fields using the shown
              defaults; review each proposed record.
            </p>
            <div className="row">
              <button disabled={busy} onClick={() => finish()}>
                Commit selected rows
              </button>
              <button
                className="secondary"
                disabled={busy}
                onClick={() => finish(true)}
              >
                Cancel preview
              </button>
            </div>
          </section>
          <div className={styles.preview}>
            {batch.rows.map((row) => (
              <article key={row.row}>
                <h3>CSV row {row.row}</h3>
                <dl className={styles.fields}>
                  {Object.entries(row.input).map(([key, value]) => (
                    <div key={key}>
                      <dt>
                        {key.replace(/([A-Z])/g, " $1").replace(/Id$/, "ID")}
                      </dt>
                      <dd>
                        {Array.isArray(value)
                          ? value.join(", ")
                          : value === null
                            ? "Not supplied"
                            : String(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
                {row.errors.map((e) => (
                  <p key={e} className="error">
                    {e}
                  </p>
                ))}
                {row.warnings.map((w) => (
                  <p key={w} className="notice">
                    {w}
                  </p>
                ))}
                {row.candidates.length > 0 && (
                  <p className="notice">
                    {row.candidates.length} proposed identity match
                    {row.candidates.length === 1 ? "" : "es"}; choose
                    explicitly.
                  </p>
                )}
                <label htmlFor={`resolution-${row.row}`}>
                  Resolution for row {row.row}
                </label>
                <select
                  id={`resolution-${row.row}`}
                  value={decisions[row.row] ?? ""}
                  onChange={(e) =>
                    setDecisions({ ...decisions, [row.row]: e.target.value })
                  }
                >
                  <option value="">Choose a resolution</option>
                  {!row.errors.length &&
                    !row.candidates.some((c) => c.reason === "source ID") && (
                      <option value="create">Create a separate record</option>
                    )}
                  {!row.errors.length &&
                    row.candidates.map((c) => (
                      <option key={c.id} value={`update:${c.id}`}>
                        Update {c.label} · {c.reason} · {c.id.slice(0, 8)}
                      </option>
                    ))}
                  <option value="exclude">Exclude this row</option>
                </select>
              </article>
            ))}
          </div>
        </>
      )}
      {batch && batch.status !== "pending" && (
        <section className="card">
          <h2>Import {batch.status}</h2>
          {batch.summary ? (
            <p role="status">
              {batch.summary.created} created · {batch.summary.updated} updated
              · {batch.summary.excluded} excluded. Original file and preview
              rows are not retained.
            </p>
          ) : (
            <p>No business records were changed by this preview.</p>
          )}
          <button
            onClick={() => {
              setBatch(null);
              setFile(null);
              setColumns([]);
              setDecisions({});
              router.replace("/imports");
            }}
          >
            Start another import
          </button>
        </section>
      )}
    </div>
  );
}
