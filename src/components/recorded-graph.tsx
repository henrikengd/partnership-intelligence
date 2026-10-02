import { PathGraph } from "./path-graph";
import type { RecordedGraph } from "@/modules/network/projection";
import type { WorkspaceData } from "@/modules/records/service";
export function RecordedGraphPanel({
  projection,
  data,
}: {
  projection: RecordedGraph;
  data: Pick<WorkspaceData, "evidence" | "owners">;
}) {
  return (
    <section className="card" style={{ marginBottom: 24 }}>
      <h2>Recorded network overview</h2>
      <p className="muted">
        Every line represents a saved record. Dashed lines have ended or unknown
        state. Dates and sources can still make a current-state record
        unsuitable for a current route. Contact-only people have no internal
        organization edge.
      </p>
      <PathGraph projection={projection} />
      <details>
        <summary>Read all graph records as text</summary>
        <h3>People and companies</h3>
        <ul>
          {projection.nodes.map((n) => (
            <li key={n.id}>
              {n.label} · {n.kind}
            </li>
          ))}
        </ul>
        <h3>Recorded connections</h3>
        {projection.edges.length ? (
          <ol>
            {projection.edges.map((e) => (
              <li key={e.id}>
                <p>
                  <strong>
                    {projection.nodes.find((n) => n.id === e.source)?.label}
                  </strong>{" "}
                  · {e.label} ·{" "}
                  <strong>
                    {projection.nodes.find((n) => n.id === e.target)?.label}
                  </strong>
                </p>
                <p className="muted small">
                  {e.state} · {e.startDate ?? "start unknown"} /{" "}
                  {e.endDate ?? "end not recorded"} · strength{" "}
                  {e.strength === null ? "unknown" : `${e.strength}/4`} ·
                  willingness {e.willingness} ·{" "}
                  {e.willingnessDate ?? "date unknown"} ·{" "}
                  {e.willingnessSource ?? "source unknown"}
                </p>
                <p className="muted small">
                  Record {e.id} · recorded by{" "}
                  {data.owners.find((o) => o.id === e.recordedBy)?.name ??
                    "team account"}
                </p>
                {e.evidenceIds.map((id) => {
                  const source = data.evidence.find((s) => s.id === id);
                  return (
                    <details key={id}>
                      <summary>
                        Source {id} ({source?.reviewState ?? "missing"})
                      </summary>
                      {source ? (
                        <>
                          <p>{source.claim}</p>
                          <blockquote>{source.excerpt}</blockquote>
                          <p>
                            {source.observedDate} · review{" "}
                            {source.reviewDate ?? "unknown"} ·{" "}
                            {source.attribution ?? "supplied source"}
                          </p>
                          {source.url && (
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open supplied source
                            </a>
                          )}
                        </>
                      ) : (
                        <p>Missing source.</p>
                      )}
                    </details>
                  );
                })}
              </li>
            ))}
          </ol>
        ) : (
          <p>No connection records.</p>
        )}
      </details>
    </section>
  );
}
