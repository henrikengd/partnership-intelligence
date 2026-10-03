import { OpportunityWithoutAssessment } from "@/components/opportunity-without-assessment";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageActor } from "@/server/auth/page";
import { DomainError } from "@/server/errors";
import { getOpportunityDetail } from "@/modules/opportunities/service";
import { AiDraftPanel } from "@/components/ai-draft-panel";
import { getAiSettings } from "@/server/ai/service";
import { LifecycleControls } from "@/components/lifecycle-controls";
import { OutreachActivities } from "@/components/outreach-activities";
import { getLifecycleDetail } from "@/modules/outreach/lifecycle";
import { PartnershipBriefSummary } from "@/components/partnership-brief-summary";
import { ReviewedActionPlan } from "@/components/reviewed-action-plan";
import { OpportunityReviewForm } from "@/components/opportunity-review";
import { rubric } from "@/modules/opportunities/scoring";
import { RelationshipPaths } from "@/components/relationship-paths";
import { companyPaths } from "@/modules/network/service";
import { PathGraph } from "@/components/path-graph";
import {
  BriefEditor,
  FactorsEditor,
  Regenerate,
} from "@/components/opportunity-controls";
export default async function OpportunityDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const requestHeaders = await headers();
  await requirePageActor(requestHeaders);
  const { id } = await params;
  let detail;
  try {
    detail = await getOpportunityDetail(requestHeaders, id);
  } catch (e) {
    if (e instanceof DomainError && e.code === "ASSESSMENT_MISSING")
      return (
        <OpportunityWithoutAssessment requestHeaders={requestHeaders} id={id} />
      );
    if (e instanceof DomainError && e.status === 404) notFound();
    throw e;
  }
  const { record, latest, brief, data, score, versions, activities } = detail;
  const lifecycle = await getLifecycleDetail(requestHeaders, id);
  const aiSettings = await getAiSettings(requestHeaders);
  const company = data.companies.find((c) => c.id === record.companyId)!;
  const need = data.needs.find((n) => n.id === record.needId)!;
  const stale = record.inputRevision !== latest.inputRevision;
  const currentReview =
    record.reviewState === "ready_for_action" &&
    detail.reviews[0]?.assessmentId === latest.id &&
    detail.reviews[0]?.inputRevision === record.inputRevision &&
    detail.reviews[0]?.briefRevision === record.revision;
  return (
    <>
      <p>
        <Link href="/opportunities">← Opportunities</Link> ·{" "}
        <Link href={`/pipeline/${id}`}>Open outreach pipeline</Link>
      </p>
      <div className="detail-heading">
        <div>
          <span className="eyebrow">
            {record.partnershipType.replaceAll("_", " ")} partnership
          </span>
          <h1>{company.name}</h1>
          <p className="muted">
            Need: {need.title} · {record.state}
          </p>
        </div>
        <div className="priority">
          <strong>{score.priority.toFixed(2)}</strong>
          <span>priority points / 100</span>
          <span>{score.coverage}% scoring coverage</span>
        </div>
      </div>
      <p className="notice">
        {stale
          ? "Recorded inputs have changed. Review this assessment or regenerate."
          : "Draft assessment. Review factual support, fit, ask, and the intended approach before acting."}{" "}
        Scores prioritize work and are not success probabilities.{" "}
        {aiSettings.enabled && aiSettings.credentialConfigured
          ? "AI assistance is enabled. Review each outbound packet before generating a separate draft."
          : "AI is disabled. Deterministic briefs and manual review remain available."}
      </p>
      {record.previousOpportunityId && (
        <p className="notice">
          New proposal linked to{" "}
          <Link href={`/opportunities/${record.previousOpportunityId}`}>
            a previous closed outcome
          </Link>
          . Review that history before approaching again.
        </p>
      )}
      {latest.humanFactorKeys.length > 0 && (
        <p className="notice">
          Human factor values are preserved across regeneration. Check their
          source support again after input changes; readiness is a separate
          review.
        </p>
      )}
      <div className="detail-grid">
        <div className="stack">
          {!currentReview && <PartnershipBriefSummary brief={brief} />}
          {detail.reviews[0] && (
            <ReviewedActionPlan
              review={detail.reviews[0]}
              data={data}
              companyId={record.companyId}
              current={currentReview}
            />
          )}
          {detail.reviews[0] && (
            <section className="card">
              <h2>Proposed value exchange</h2>
              <p>{brief.valueExchange}</p>
            </section>
          )}
          <section className="card">
            <h2>Why this company may fit</h2>
            {brief.claims.length ? (
              brief.claims.map((claim, index) => (
                <article className="claim" key={index}>
                  <span className={`badge ${claim.status}`}>
                    {claim.status === "supplied"
                      ? "Supplied claim, unreviewed"
                      : claim.status === "reviewed"
                        ? "Reviewed claim"
                        : claim.status}
                  </span>
                  <p>{claim.text}</p>
                  {claim.evidenceIds.map((evidenceId) => {
                    const source = data.evidence.find(
                      (e) => e.id === evidenceId,
                    );
                    return source ? (
                      <details key={evidenceId}>
                        <summary>View supplied evidence and provenance</summary>
                        <p>{source.excerpt}</p>
                        <p className="muted small">
                          Observed {source.observedDate} · review state{" "}
                          {source.reviewState}
                          {source.reviewDate
                            ? ` · reviewed ${source.reviewDate}`
                            : ""}{" "}
                          · recorded by{" "}
                          {data.owners.find((o) => o.id === source.recordedBy)
                            ?.name ?? "team account"}
                        </p>
                        {source.url ? (
                          <a href={source.url} target="_blank" rel="noreferrer">
                            Open source supplied by the team
                          </a>
                        ) : (
                          <p className="muted">
                            Attributed to {source.attribution}
                          </p>
                        )}
                      </details>
                    ) : (
                      <p key={evidenceId}>
                        Source unavailable. Verify the claim again.
                      </p>
                    );
                  })}
                </article>
              ))
            ) : (
              <p className="muted">
                No supported category capability is recorded. This proposal
                needs company evidence.
              </p>
            )}
            <h3>Inferences to review</h3>
            {brief.inferences.map((inference) => (
              <p key={inference}>{inference}</p>
            ))}
            <h3>Missing information</h3>
            <ul>
              {brief.questions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          </section>
          <section className="card">
            <h2>Assessment route snapshot</h2>
            <p className="muted small">
              The route below belongs to this assessment snapshot. Changed
              records require a new assessment.
            </p>
            <details>
              <summary>Inspect assessment route snapshot</summary>
              {brief.path ? (
                <>
                  <PathGraph path={brief.path} />
                  <ol className="text-path">
                    {brief.path.nodes.map((node, index) => (
                      <li key={node.id}>
                        <strong>{node.label}</strong>
                        {brief.path!.edges[index] && (
                          <p className="muted small">
                            {brief.path!.edges[index].label} ·{" "}
                            {brief.path!.edges[index].startDate ??
                              "start unknown"}{" "}
                            /{" "}
                            {brief.path!.edges[index].endDate ??
                              "end not recorded"}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                  <p className="notice">{brief.path.warning}</p>
                  <p className="muted small">
                    Introduction willingness: {brief.path.willingness}
                    {brief.path.edges[1]?.willingnessDate
                      ? ` · recorded ${brief.path.edges[1].willingnessDate}`
                      : ""}
                    {brief.path.edges[1]?.willingnessSource
                      ? ` · source ${brief.path.edges[1].willingnessSource}`
                      : ""}
                    . Decision authority is unverified.
                  </p>
                </>
              ) : (
                <p className="muted">
                  No supported current internal route is recorded. Use a clearly
                  identified cold approach after verifying a relevant role.
                </p>
              )}
            </details>
          </section>
          <section className="card">
            <details>
              <summary>
                Compare current recorded routes and historical leads
              </summary>
              <p className="muted">
                These routes reflect current records. They do not refresh or
                approve the stored assessment.
              </p>
              <RelationshipPaths
                paths={companyPaths(data, record.companyId)}
                data={data}
              />
              <Link href={`/graph?opportunity=${id}`}>
                Open focused opportunity graph
              </Link>
            </details>
          </section>
          <section className="card">
            <h2>Transparent priority assessment</h2>
            <p className="muted">
              Rubric v1 · assessment {latest.version} · {score.unknowns.length}{" "}
              unknown factors. Unknown values earn no priority points; coverage
              is not renormalized.
            </p>
            <details className="disclosure-card">
              <summary>
                Inspect all score factors, evidence and editing controls
              </summary>
              <div className="factor-list">
                {rubric.map((f) => (
                  <article className="factor" key={f.key}>
                    <div className="row">
                      <h3>{f.label}</h3>
                      <span className="badge">
                        {latest.factors[f.key].value === null
                          ? "Unknown"
                          : `${latest.factors[f.key].value}/4`}{" "}
                        · weight {f.weight}
                      </span>
                    </div>
                    <p>{latest.factors[f.key].rationale}</p>
                    <p className="muted small">
                      Origin: {latest.factors[f.key].origin}
                      {latest.factors[f.key].source
                        ? ` · ${latest.factors[f.key].source}`
                        : ""}
                    </p>
                    <p className="muted small">
                      Evidence:{" "}
                      {latest.factors[f.key].evidenceIds.length
                        ? latest.factors[f.key].evidenceIds
                            .map(
                              (e) =>
                                data.evidence.find((s) => s.id === e)?.claim ??
                                "Source unavailable",
                            )
                            .join("; ")
                        : "None. This factor is unknown or an explicit organization assessment."}
                    </p>
                    <details>
                      <summary>Scoring anchors</summary>
                      <ol start={0}>
                        {f.anchors.map((anchor) => (
                          <li key={anchor}>{anchor}</li>
                        ))}
                      </ol>
                    </details>
                  </article>
                ))}
              </div>
              <FactorsEditor
                id={id}
                factors={latest.factors}
                evidence={data.evidence}
              />
            </details>
          </section>
          <AiDraftPanel opportunityId={id} />
          <section className="card">
            <h2>Assessment history</h2>
            <details className="disclosure-card">
              <summary>Read immutable assessment versions</summary>
              {versions.map((v) => (
                <details key={v.id}>
                  <summary>
                    Version {v.version} · {v.priority} points · {v.coverage}%
                    coverage · {v.createdAt.toISOString()}
                  </summary>
                  <p>
                    Input revision {v.inputRevision}. This immutable snapshot
                    excludes later manual brief edits.
                  </p>
                  <p>{v.brief.ask}</p>
                  {rubric.map((f) => (
                    <p key={f.key}>
                      {f.label}: {v.factors[f.key].value ?? "Unknown"} ·{" "}
                      {v.factors[f.key].origin} · {v.factors[f.key].rationale}
                    </p>
                  ))}
                  <p>
                    {v.brief.path?.nodes.map((n) => n.label).join(" → ") ??
                      "No current path in this assessment snapshot."}
                  </p>
                </details>
              ))}
            </details>
            <Regenerate
              opportunityId={id}
              needId={record.needId}
              companyId={record.companyId}
              partnershipType={record.partnershipType}
            />
          </section>
        </div>
        <aside className="stack">
          <LifecycleControls detail={lifecycle} />
          <details className="card disclosure-card">
            <summary>Review readiness and target</summary>
            <OpportunityReviewForm
              id={id}
              brief={brief}
              evidence={data.evidence}
              people={data.people}
              paths={companyPaths(data, record.companyId).current}
              reviewState={record.reviewState}
              stale={stale}
            />
          </details>
          <section className="card">
            <h2>Readiness history</h2>
            <details className="disclosure-card">
              <summary>Read earlier readiness decisions</summary>
              {detail.reviews.length ? (
                detail.reviews.map((r) => (
                  <p key={r.id}>
                    {r.reviewedAt.toISOString()} · {r.approachMode} approach ·
                    assessment{" "}
                    {versions.find((v) => v.id === r.assessmentId)?.version ??
                      "historical"}{" "}
                    · {r.fitRationale}
                  </p>
                ))
              ) : (
                <p>No readiness review recorded.</p>
              )}
            </details>
          </section>
          <section className="card">
            <h2>Who, what to ask, and how to approach</h2>
            <p className="muted">
              Contact roles and the value exchange remain proposals until
              verified. Personal names are used only for recorded network
              people.
            </p>
            <details className="disclosure-card">
              <summary>Edit partnership brief and owner</summary>
              <BriefEditor
                id={id}
                brief={brief}
                ownerId={record.ownerId}
                owners={data.owners}
              />
            </details>
          </section>
          <OutreachActivities
            opportunityId={id}
            people={data.people}
            activities={activities}
            today={lifecycle.today}
          />
        </aside>
      </div>
    </>
  );
}
