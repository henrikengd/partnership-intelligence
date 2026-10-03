"use client";
import { useEffect, useState, useRef } from "react";
type Settings = {
  enabled: boolean;
  model: string;
  credentialConfigured: boolean;
  canConfigure: boolean;
};
export function AiSettings() {
  const [config, setConfig] = useState<Settings | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const edited = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/ai/settings", { signal: controller.signal })
      .then(async (r) => {
        const value = await r.json();
        if (!r.ok)
          throw new Error(
            value.error?.message ?? "Could not load AI settings.",
          );
        if (!controller.signal.aborted && !edited.current) setConfig(value);
      })
      .catch((e) => {
        if (!controller.signal.aborted && !edited.current)
          setMessage(e.message);
      });
    return () => controller.abort();
  }, []);
  return (
    <section className="card">
      <h2>AI assistance</h2>
      <p>
        AI drafts remain suggestions pending human review. They never send
        outreach or change scores.
      </p>
      <p>
        Only a server-side OPENAI_API_KEY supplies credentials. Response storage
        is disabled, but provider abuse logs and caching have separate retention
        controls.
      </p>
      {message && <p role="status">{message}</p>}
      {!config && !message && <p role="status">Loading AI settings…</p>}
      {config && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            edited.current = true;
            setBusy(true);
            setMessage("");
            try {
              const r = await fetch("/api/ai/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  enabled: config.enabled,
                  model: config.model,
                }),
              });
              const value = await r.json();
              if (!r.ok)
                throw new Error(
                  value.error?.message ?? "Could not save settings.",
                );
              setConfig(value);
              setMessage("AI settings saved.");
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "Try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <p>
            {config.credentialConfigured
              ? "Server credential configured."
              : "Server credential missing. The rest of the app works without AI."}
          </p>
          <label htmlFor="ai-model">Provider model</label>
          <input
            id="ai-model"
            value={config.model}
            maxLength={120}
            disabled={!config.canConfigure || busy}
            onChange={(e) => {
              edited.current = true;
              setConfig({ ...config, model: e.target.value });
            }}
          />
          <label>
            <input
              type="checkbox"
              checked={config.enabled}
              disabled={!config.canConfigure || busy}
              onChange={(e) => {
                edited.current = true;
                setConfig({ ...config, enabled: e.target.checked });
              }}
            />{" "}
            Enable OpenAI assistance
          </label>
          {config.canConfigure ? (
            <button disabled={busy}>
              {busy ? "Saving…" : "Save AI settings"}
            </button>
          ) : (
            <p>Only administrators can change AI settings.</p>
          )}
        </form>
      )}
    </section>
  );
}
