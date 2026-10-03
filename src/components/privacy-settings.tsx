"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import styles from "./privacy.module.css";
import type {
  getPrivacySettings,
  previewPersonDeletion,
} from "@/modules/privacy/service";
import { exportKinds } from "@/modules/privacy/contracts";
type Settings = Awaited<ReturnType<typeof getPrivacySettings>>;
type Preview = Awaited<ReturnType<typeof previewPersonDeletion>>;
export function PrivacySettings({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [kind, setKind] = useState("people");
  async function request(path: string, body?: unknown) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/privacy/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error?.message ?? "The privacy action failed.");
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Try again.");
      return null;
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card">
      <h2>Private data controls</h2>
      <p>
        Administrator access is required. Downloads contain private organization
        data: store them outside public repositories. Deleting live data does
        not erase separately retained backups, downloaded exports or provider
        copies.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <h3>Export permitted organization data</h3>
      <label htmlFor="privacy-export">Export dataset</label>
      <select
        id="privacy-export"
        value={kind}
        onChange={(e) => setKind(e.target.value)}
      >
        {exportKinds.map((k) => (
          <option key={k} value={k}>
            {k.replaceAll(/([A-Z])/g, " $1").toLowerCase()}
          </option>
        ))}
      </select>
      <a
        className="button secondary"
        href={`/api/admin/privacy/export?kind=${kind}`}
        download
      >
        Download safe CSV
      </a>
      <p className="small muted">
        Formula-like cells are neutralized. Passwords, authentication tokens and
        original uploads are excluded.
      </p>
      <h3>Delete a network person and private dependents</h3>
      <label htmlFor="privacy-person">Person to delete</label>
      <select
        id="privacy-person"
        value={selected}
        onChange={(e) => {
          setSelected(e.target.value);
          setPreview(null);
        }}
      >
        <option value="">Choose a saved person</option>
        {initial.people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <button
        className="secondary"
        disabled={!selected || busy || pending}
        onClick={async () => {
          const p = await request("preview", { personId: selected });
          if (p) setPreview(p);
        }}
      >
        Preview deletion impact
      </button>
      {preview && (
        <div className={styles.preview}>
          <h3>Deletion preview: {preview.person.name}</h3>
          <p>{preview.notice}</p>
          <p className="muted small">
            Preview expires {preview.expiresAt}. Changes to dependents require a
            fresh preview.
          </p>
          <table>
            <thead>
              <tr>
                <th>Material</th>
                <th>Affected records</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(preview.counts).map(([key, n]) => (
                <tr key={key}>
                  <td>{key.replaceAll(/([A-Z])/g, " $1").toLowerCase()}</td>
                  <td>{n}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <form
            key={preview.token}
            onSubmit={async (e) => {
              e.preventDefault();
              const result = await request("confirm", {
                token: preview.token,
                confirmed: true,
              });
              if (result) {
                setPreview(null);
                setSelected("");
                setNotice(
                  "Person and related private material removed. Structured outcomes remain. Separately retained copies are unchanged.",
                );
                startTransition(() => router.refresh());
              }
            }}
          >
            <label>
              <input name="confirmed" type="checkbox" required /> I reviewed
              this impact and want to delete the person and related private
              material
            </label>
            <button disabled={busy || pending}>Confirm person deletion</button>
            <button
              type="button"
              className="secondary"
              disabled={busy || pending}
              onClick={() => {
                setPreview(null);
                setNotice("Deletion cancelled. No records changed.");
              }}
            >
              Cancel deletion
            </button>
          </form>
        </div>
      )}
      <h3>Pending import retention</h3>
      <p>
        Original CSV files are never saved. Normalized pending rows expire after
        one hour and are cleared on the next import operation or page visit. Run
        this control to clear expired previews now. Committed summaries remain
        until related-data deletion removes their mappings.
      </p>
      <button
        className="secondary"
        disabled={busy || pending}
        onClick={async () => {
          const result = await request("retention");
          if (result)
            setNotice(
              `Cleared ${result.counts.expiredImports} expired import previews.`,
            );
        }}
      >
        Purge expired import previews
      </button>
    </section>
  );
}
