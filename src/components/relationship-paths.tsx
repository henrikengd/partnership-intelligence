import { PathGraph } from "./path-graph";
import type {
  NetworkPath,
  PathHistory,
  PathResults,
} from "@/modules/network/paths";
import type { WorkspaceData } from "@/modules/records/service";
export function RelationshipPaths({
  paths,
  data,
  history = [],
}: {
  paths: PathResults;
  data: Pick<WorkspaceData, "evidence" | "owners">;
  history?: PathHistory[];
}) {
  function route(path: NetworkPath, index: number) {
    return (
      <article key={path.id} className="claim">
        <h3>
          {path.current
            ? `Current route ${index + 1}`
            : `Lead to verify ${index + 1}`}
        </h3>
        <PathGraph path={path} />
        <p>
          Recorded introduction willingness: {path.willingness}. Weakest
          personal connection:{" "}
          {path.weakestPersonalStrength === null
            ? path.personalEdgeCount === 0
              ? "No personal edge; employment is affiliation"
              : "Unknown"
            : `${path.weakestPersonalStrength}/4`}
          .
        </p>
        <p className="notice">{path.warning}</p>
        <ol className="text-path">
          {path.nodes.map((node, i) => (
            <li key={node.id}>
              <strong>{node.label}</strong>
              {path.edges[i] && (
                <div>
                  <p>
                    {path.edges[i].label} · state {path.edges[i].state} ·{" "}
                    {path.edges[i].startDate ?? "start unknown"} /{" "}
                    {path.edges[i].endDate ?? "end not recorded"}
                  </p>
                  <p className="muted small">
                    Record {path.edges[i].id} · recorded by{" "}
                    {data.owners.find((o) => o.id === path.edges[i].recordedBy)
                      ?.name ?? "team account"}
                    . Reported strength:{" "}
                    {path.edges[i].strength === null
                      ? "Unknown"
                      : `${path.edges[i].strength}/4`}
                    . Employment strength does not establish familiarity.
                  </p>
                  <p className="muted small">
                    Willingness: {path.edges[i].willingness} · date{" "}
                    {path.edges[i].willingnessDate ?? "unknown"} · source{" "}
                    {path.edges[i].willingnessSource ?? "unknown"}. Confirm
                    dated willingness for the intended request.
                  </p>
                  {path.edges[i].evidenceIds.length ? (
                    path.edges[i].evidenceIds.map((id) => {
                      const e = data.evidence.find((e) => e.id === id);
                      return (
                        <details key={id}>
                          <summary>
                            View connection evidence (
                            {e?.reviewState ?? "missing"})
                          </summary>
                          <p>Evidence record {id}</p>
                          {e ? (
                            <>
                              <p>{e.claim}</p>
                              <blockquote>{e.excerpt}</blockquote>
                              <p className="muted small">
                                Observed {e.observedDate} · review date{" "}
                                {e.reviewDate ?? "unknown"} ·{" "}
                                {e.attribution ?? "supplied source"}
                              </p>
                              {e.url && (
                                <a
                                  href={e.url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Open supplied source
                                </a>
                              )}
                            </>
                          ) : (
                            <p>Source unavailable. Verify this connection.</p>
                          )}
                        </details>
                      );
                    })
                  ) : (
                    <p className="muted small">
                      Internal affiliation is a team record. No external
                      supporting evidence attached.
                    </p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
      </article>
    );
  }
  return (
    <>
      <h2>Recorded introduction paths</h2>
      <p className="muted">
        Up to three current alternatives and three leads to verify. Routes use
        at most two people. Personal connections are directed as recorded. Job
        titles do not verify authority or relevance to this need.
      </p>
      {!paths.current.some((p) => p.willingness !== "no") && (
        <p className="notice">
          No permitted current internal route is recorded. Verify a relevant
          role and choose a clearly identified cold approach. Respect any
          recorded refusals.
        </p>
      )}
      {paths.current.length ? (
        <section aria-label="Current relationship routes">
          {paths.current.map(route)}
        </section>
      ) : (
        <p className="muted">No supported current route.</p>
      )}
      <section aria-label="Historical and uncertain relationship leads">
        <h3>Historical and uncertain leads</h3>
        {paths.historical.length ? (
          paths.historical.map(route)
        ) : (
          <p className="muted">No historical or uncertain lead is recorded.</p>
        )}
      </section>
      <section aria-label="Partnership and outreach history">
        <h3>Recorded company history</h3>
        <p className="muted">
          History records do not establish current personal access or permission
          to approach.
        </p>
        {history.length ? (
          history.map((h) => (
            <article key={h.id}>
              <p>
                <strong>{h.label}</strong> · {h.state} ·{" "}
                {h.occurredDate ?? "date unknown"}
              </p>
              <p>{h.description}</p>
              {h.source && <p className="muted small">Source: {h.source}</p>}
              <p className="muted small">
                {h.kind} record {h.id}
              </p>
            </article>
          ))
        ) : (
          <p className="muted">No completed company history is recorded.</p>
        )}
      </section>
    </>
  );
}
