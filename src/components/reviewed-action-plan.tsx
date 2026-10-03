import type { opportunityReview } from "@/server/db/schema";
import type { WorkspaceData } from "@/modules/records/service";
import { companyPaths } from "@/modules/network/service";
import { RelationshipPaths } from "./relationship-paths";
export function ReviewedActionPlan({
  review,
  current,
  data,
  companyId,
}: {
  review: typeof opportunityReview.$inferSelect;
  current: boolean;
  data: WorkspaceData;
  companyId: string;
}) {
  const paths = companyPaths(data, companyId);
  const selected = [...paths.current, ...paths.historical].find(
    (p) => p.id === review.pathId,
  );
  const target = review.targetPersonId
    ? (data.people.find((p) => p.id === review.targetPersonId)?.name ??
      "Named contact unavailable; verify again")
    : null;
  return (
    <section className="card" aria-label="Saved reviewed action plan">
      <h2>
        {current ? "Reviewed action plan" : "Previous reviewed action plan"}
      </h2>
      <p className="notice">
        {current
          ? "This saved plan matches the current assessment, recorded inputs and manual brief."
          : "This plan is historical. Inputs, assessment or manual brief changed; review readiness again before acting."}
      </p>
      <p className="muted small">
        Reviewed {review.reviewedAt.toISOString()}. Named contacts and roles do
        not establish decision authority.
      </p>
      <h3>Who to approach</h3>
      <p>
        {target ?? "Role to verify"}
        {review.contactRole ? ` · ${review.contactRole}` : ""}
      </p>
      <h3>What to ask</h3>
      <p>{review.ask}</p>
      <h3>First action</h3>
      <p>{review.nextAction}</p>
      <h3>Reviewed approach</h3>
      {review.approachMode === "cold" ? (
        <p>
          Explicit cold approach. No warm introduction is part of this reviewed
          plan.
        </p>
      ) : (
        <>
          <p>
            Introduction through the selected recorded route. Reconfirm
            willingness for this particular request.
          </p>
          {selected && (
            <p aria-label="Reviewed introduction route">
              {selected.nodes.map((n) => n.label).join(" → ")}
            </p>
          )}
          <details>
            <summary>Inspect reviewed route, evidence and willingness</summary>
            {selected ? (
              <RelationshipPaths
                paths={{
                  current: selected.current ? [selected] : [],
                  historical: selected.current ? [] : [selected],
                }}
                data={data}
              />
            ) : (
              <p className="notice">
                Selected route is no longer available in current records. Its
                recorded ID was {review.pathId}; verify again before
                approaching.
              </p>
            )}
          </details>
        </>
      )}
    </section>
  );
}
