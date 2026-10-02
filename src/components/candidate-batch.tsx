"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CandidatePreview } from "@/modules/opportunities/run-contracts";
import type { generationRun } from "@/server/db/schema";
async function request(url: string, body?: unknown) {
  const r = await fetch(
    url,
    body === undefined
      ? undefined
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  const value = await r.json();
  if (!r.ok)
    throw new Error(
      value.error?.fields
        ?.map((f: { message: string }) => f.message)
        .join(" ") ??
        value.error?.message ??
        "Request failed. Try again.",
    );
  return value;
}
export function CandidateBatch({
  needs,
  companies,
  evidence,
}: {
  needs: { id: string; title: string; active: boolean }[];
  companies: { id: string; name: string }[];
  evidence: { id: string; claim: string; reviewState: string }[];
}) {
  const router = useRouter();
  const [needId, setNeed] = useState("");
  const [candidates, setCandidates] = useState<CandidatePreview[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [key, setKey] = useState("");
  const [allowNew, setAllow] = useState(false);
  const [allowOngoing, setOngoing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [run, setRun] = useState<typeof generationRun.$inferSelect | null>(
    null,
  );
  return (
    <section className="card">
      <h2>Generate a candidate batch</h2>
      <p className="muted">
        Evaluate one active need against up to 20 known companies. Category
        evidence or a recorded incentive supplies suggestions. Explicit
        selections can include gaps. Cash needs never select every company
        automatically.
      </p>
      <label htmlFor="batch-need">Batch need</label>
      <select
        id="batch-need"
        value={needId}
        onChange={(e) => {
          setNeed(e.target.value);
          setAllow(false);
          setOngoing(false);
          setCandidates([]);
          setSelected([]);
          setRun(null);
          setError("");
        }}
        disabled={busy}
      >
        <option value="">Choose a current need</option>
        {needs
          .filter((n) => n.active)
          .map((n) => (
            <option value={n.id} key={n.id}>
              {n.title}
            </option>
          ))}
      </select>
      <button
        className="secondary"
        disabled={!needId || busy}
        style={{ marginTop: 12 }}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const c: CandidatePreview[] = await request(
              `/api/opportunity-candidates?need=${needId}`,
            );
            setCandidates(c);
            setSelected(
              c
                .filter(
                  (c) =>
                    c.eligible &&
                    !c.activeOpportunityIds.length &&
                    !c.history.some((h) =>
                      [
                        "declined",
                        "archived",
                        "in_discussion",
                        "agreed",
                      ].includes(h.state),
                    ),
                )
                .slice(0, 20)
                .map((c) => c.companyId),
            );
            setKey(crypto.randomUUID());
            setRun(null);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        Preview known candidates
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {busy && <p role="status">Working with recorded inputs…</p>}
      {candidates.length > 0 && (
        <>
          <p>
            {selected.length} / 20 selected. Review evidence gaps and recorded
            discussions before starting.
          </p>
          <div>
            {candidates.map((c) => (
              <article className="account" key={c.companyId}>
                <label style={{ display: "flex", gap: 10 }}>
                  <input
                    type="checkbox"
                    style={{ width: "auto" }}
                    checked={selected.includes(c.companyId)}
                    disabled={
                      busy ||
                      (!selected.includes(c.companyId) && selected.length >= 20)
                    }
                    onChange={(e) => {
                      setSelected(
                        e.target.checked
                          ? [...selected, c.companyId]
                          : selected.filter((id) => id !== c.companyId),
                      );
                      setKey(crypto.randomUUID());
                      setRun(null);
                    }}
                  />
                  Select {c.companyName}
                </label>
                {c.reasons.length ? (
                  c.reasons.map((r, i) => (
                    <p className="muted small" key={i}>
                      {r.text}{" "}
                      {r.evidenceIds.length
                        ? `Source ${r.evidenceIds.join(", ")}`
                        : ""}
                    </p>
                  ))
                ) : (
                  <p className="muted small">
                    Explicit selection only. No supported automatic match.
                  </p>
                )}
                {c.gaps.map((g) => (
                  <p className="notice small" key={g}>
                    {g}
                  </p>
                ))}
                {c.history.map((h) => (
                  <p className="muted small" key={h.id}>
                    {h.state.replaceAll("_", " ")} · {h.description}
                  </p>
                ))}
                {c.activeOpportunityIds.map((id) => (
                  <p key={id}>
                    <Link href={`/opportunities/${id}`}>
                      Review existing proposal
                    </Link>
                  </p>
                ))}
              </article>
            ))}
          </div>
          <label style={{ display: "flex", gap: 10 }}>
            <input
              type="checkbox"
              style={{ width: "auto" }}
              checked={allowNew}
              disabled={busy}
              onChange={(e) => {
                setAllow(e.target.checked);
                setKey(crypto.randomUUID());
                setRun(null);
              }}
            />
            I reviewed closed outcomes and explicitly allow a new linked
            proposal.
          </label>
          <label style={{ display: "flex", gap: 10 }}>
            <input
              type="checkbox"
              style={{ width: "auto" }}
              checked={allowOngoing}
              disabled={busy}
              onChange={(e) => {
                setOngoing(e.target.checked);
                setKey(crypto.randomUUID());
                setRun(null);
              }}
            />
            I reviewed ongoing discussions and deliberately selected support for
            a different need or partnership type.
          </label>
          <button
            disabled={busy || !selected.length}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                setRun(
                  await request("/api/generation-runs", {
                    needId,
                    companyIds: selected,
                    idempotencyKey: key,
                    allowNewAfterClosed: allowNew,
                    allowOngoingDiscussion: allowOngoing,
                  }),
                );
                router.refresh();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Try again.");
              } finally {
                setBusy(false);
              }
            }}
          >
            Generate selected opportunities
          </button>
        </>
      )}
      {run && (
        <div className="notice" role="status">
          <p>
            Run {run.status} · attempt {run.attempt}
            {run.errorCategory ? ` · ${run.errorCategory}` : ""}. Existing edits
            and outreach are preserved.
          </p>
          {run.results.map((result) => (
            <p key={result.companyId}>
              {result.status} · {result.reason}{" "}
              {result.opportunityId && (
                <Link href={`/opportunities/${result.opportunityId}`}>
                  Open opportunity
                </Link>
              )}
            </p>
          ))}
        </div>
      )}
      <details style={{ marginTop: 24 }}>
        <summary>Record an evidenced incentive for this need</summary>
        <p>
          Record a company incentive supported by a supplied source. The match
          remains a proposal to review.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            const form = e.currentTarget;
            const values = Object.fromEntries(new FormData(form));
            try {
              await request("/api/opportunity-incentives", {
                ...values,
                needId,
              });
              form.reset();
              setCandidates([]);
              setSelected([]);
              router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Try again.");
            }
          }}
        >
          <label htmlFor="incentive-company">Incentive company</label>
          <select id="incentive-company" name="companyId" required>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <label htmlFor="incentive-description">
            Company incentive and relevance
          </label>
          <textarea
            name="description"
            id="incentive-description"
            required
            maxLength={2000}
          />
          <label htmlFor="incentive-evidence">Incentive evidence</label>
          <select name="evidenceId" id="incentive-evidence" required>
            {evidence.map((s) => (
              <option key={s.id} value={s.id}>
                {s.claim.slice(0, 90)} ({s.reviewState})
              </option>
            ))}
          </select>
          <button disabled={!needId}>Save incentive source</button>
        </form>
      </details>
    </section>
  );
}
export function GenerationRuns({
  runs,
}: {
  runs: (typeof generationRun.$inferSelect)[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  return (
    <section className="card">
      <h2>Generation runs</h2>
      <p className="muted">
        Runs process synchronously. A server restart marks abandoned work
        interrupted; retry is explicit. No background queue or automatic sending
        is active.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {runs.length ? (
        runs.map((r) => (
          <article className="account" key={r.id}>
            <p>
              <strong>{r.status.replaceAll("_", " ")}</strong> ·{" "}
              {r.selection.companyIds.length} candidates · attempt {r.attempt} ·
              need revision {r.inputRevision}
            </p>
            <p className="muted small">
              Started {new Date(r.startedAt).toISOString()} ·{" "}
              {r.finishedAt
                ? `finished ${new Date(r.finishedAt).toISOString()}`
                : "in progress"}
              {r.errorCategory ? ` · ${r.errorCategory}` : ""}
            </p>
            {r.results.map((result) => (
              <p key={result.companyId}>
                {result.status} · {result.reason}{" "}
                {result.opportunityId && (
                  <Link href={`/opportunities/${result.opportunityId}`}>
                    Open opportunity
                  </Link>
                )}
              </p>
            ))}
            {["interrupted", "failed"].includes(r.status) && r.attempt >= 2 && (
              <p className="notice">
                The one explicit retry is exhausted. Resolve the failure and
                start a new request from candidate selection.
              </p>
            )}
            {["interrupted", "failed"].includes(r.status) && r.attempt < 2 && (
              <button
                className="secondary"
                disabled={busy === r.id}
                onClick={async () => {
                  setBusy(r.id);
                  setError("");
                  try {
                    await request(`/api/generation-runs/${r.id}/retry`, {});
                    router.refresh();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Try again.");
                  } finally {
                    setBusy("");
                  }
                }}
              >
                Retry the same run
              </button>
            )}
          </article>
        ))
      ) : (
        <p className="muted">No generation run recorded yet.</p>
      )}
      <button className="secondary" onClick={() => router.refresh()}>
        Refresh run status
      </button>
    </section>
  );
}
