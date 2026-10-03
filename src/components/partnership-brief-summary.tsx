import type { GeneratedBrief } from "@/modules/opportunities/contracts";
export function PartnershipBriefSummary({ brief }: { brief: GeneratedBrief }) {
  return (
    <section className="card action-summary">
      <h2>Proposed partnership brief</h2>
      <p className="muted small">
        A proposal awaiting review. Verify fit, access and value exchange before
        approaching.
      </p>
      <dl>
        <dt>Who to approach</dt>
        <dd>{brief.contactRole}</dd>
        <dt>Via whom</dt>
        <dd>
          {brief.path && brief.path.willingness !== "no"
            ? `${brief.path.nodes.map((n) => n.label).join(" → ")}. Reconfirm willingness for this request.`
            : "No permitted introduction is established. Review an explicitly identified cold approach."}
        </dd>
        <dt>What to ask</dt>
        <dd>{brief.ask}</dd>
        <dt>Proposed value exchange</dt>
        <dd>{brief.valueExchange}</dd>
        <dt>First action</dt>
        <dd>{brief.nextAction}</dd>
        <dt>How to approach</dt>
        <dd>{brief.approach}</dd>
      </dl>
    </section>
  );
}
