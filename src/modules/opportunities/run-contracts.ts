export type CandidateReason = {
  kind: "capability" | "incentive" | "explicit";
  text: string;
  evidenceIds: string[];
};
export type CandidatePreview = {
  companyId: string;
  companyName: string;
  eligible: boolean;
  reasons: CandidateReason[];
  gaps: string[];
  history: { id: string; state: string; description: string }[];
  activeOpportunityIds: string[];
};
export type GenerationResult = {
  companyId: string;
  opportunityId: string | null;
  status: "generated" | "skipped";
  reason: string;
};
export type GenerationSelection = {
  needId: string;
  companyIds: string[];
  partnershipType: string;
  allowNewAfterClosed: boolean;
  allowOngoingDiscussion?: boolean;
  refreshOpportunityId?: string;
};
export type GenerationRunInput = {
  needId: string;
  companyIds?: string[];
  partnershipType?: string;
  allowNewAfterClosed?: boolean;
  idempotencyKey: string;
};
export type ReviewApproach = "cold" | "introduction";
