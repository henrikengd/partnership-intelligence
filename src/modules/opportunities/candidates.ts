import type { WorkspaceData } from "../records/service";
import type { CandidatePreview } from "./run-contracts";
import type { companyNeedIncentive } from "../../server/db/schema";
import { DomainError } from "../../server/errors";
export function isCurrentSource(
  source:
    | { reviewState: string; observedDate: string; reviewDate?: string | null }
    | undefined,
  today = new Date().toISOString().slice(0, 10),
) {
  return Boolean(
    source &&
    ["supplied", "reviewed"].includes(source.reviewState) &&
    source.observedDate <= today &&
    (!source.reviewDate || source.reviewDate <= today),
  );
}
export function candidatePreviews(
  data: WorkspaceData,
  needId: string,
  incentives: (typeof companyNeedIncentive.$inferSelect)[] = [],
  explicitIds: string[] = [],
): CandidatePreview[] {
  const need = data.needs.find((n) => n.id === needId && n.active);
  if (!need)
    throw new DomainError(
      "INACTIVE_NEED",
      "Select an active, unmet need.",
      409,
    );
  const explicit = new Set(explicitIds);
  const legacy =
    (
      data as WorkspaceData & {
        previousOutreach?: {
          id: string;
          companyId: string;
          outcome: string;
          description: string;
        }[];
      }
    ).previousOutreach ?? [];
  return [...data.companies]
    .map((company) => {
      const reasons: CandidatePreview["reasons"] = [];
      const capabilities = data.capabilities.filter(
        (c) =>
          c.companyId === company.id &&
          c.category.trim().toLowerCase() ===
            need.category.trim().toLowerCase(),
      );
      for (const capability of capabilities)
        if (
          isCurrentSource(
            data.evidence.find((e) => e.id === capability.evidenceId),
          )
        )
          reasons.push({
            kind: "capability",
            text: `Recorded ${need.category} capability: ${capability.description}`,
            evidenceIds: [capability.evidenceId],
          });
      for (const incentive of incentives.filter(
        (i) => i.companyId === company.id && i.needId === needId,
      ))
        if (
          isCurrentSource(
            data.evidence.find((e) => e.id === incentive.evidenceId),
          )
        )
          reasons.push({
            kind: "incentive",
            text: `Team-recorded incentive to review: ${incentive.description}`,
            evidenceIds: [incentive.evidenceId],
          });
      if (explicit.has(company.id))
        reasons.push({
          kind: "explicit",
          text: "Explicitly selected by the partnership team; this selection is not evidence of fit.",
          evidenceIds: [],
        });
      const history = [
        ...data.opportunities
          .filter(
            (o) =>
              o.companyId === company.id &&
              ["declined", "archived"].includes(o.state),
          )
          .map((o) => ({
            id: o.id,
            state: o.state,
            description: `Previous ${o.partnershipType} proposal for ${data.needs.find((n) => n.id === o.needId)?.title ?? "a recorded need"}`,
          })),
        ...legacy
          .filter((h) => h.companyId === company.id)
          .map((h) => ({
            id: h.id,
            state: h.outcome,
            description: h.description,
          })),
      ];
      const active = data.opportunities.filter(
        (o) =>
          o.companyId === company.id &&
          !["declined", "archived"].includes(o.state),
      );
      const gaps: string[] = [];
      if (!reasons.some((r) => r.kind !== "explicit"))
        gaps.push(
          "No supported current capability or incentive matching this need. Add a supplied source and review fit.",
        );
      if (
        capabilities.some(
          (c) =>
            !isCurrentSource(data.evidence.find((e) => e.id === c.evidenceId)),
        )
      )
        gaps.push(
          "Matching source records are missing, future-dated, disputed or superseded; they do not establish current fit.",
        );
      if (!data.relationships.some((r) => r.companyId === company.id))
        gaps.push(
          "No company relationship is recorded. Verify a contact role and a permitted cold approach.",
        );
      if (history.some((h) => h.state === "declined"))
        gaps.push(
          "A previous decline is recorded. Review it before explicitly starting another proposal.",
        );
      if (active.length || history.some((h) => h.state === "in_discussion"))
        gaps.push(
          "An active proposal or discussion already exists. Review ongoing work before making another request.",
        );
      return {
        companyId: company.id,
        companyName: company.name,
        eligible: reasons.length > 0,
        reasons,
        gaps,
        history,
        activeOpportunityIds: active.map((o) => o.id),
      };
    })
    .sort(
      (a, b) =>
        Number(b.eligible) - Number(a.eligible) ||
        a.companyName.localeCompare(b.companyName) ||
        a.companyId.localeCompare(b.companyId),
    );
}
