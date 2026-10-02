import type { BriefFields } from "../../server/db/schema";
import type { Factors } from "./scoring";
export type PathNode = {
  id: string;
  kind: "organization" | "person" | "company";
  label: string;
};
export type PathEdge = {
  id: string;
  label: string;
  startDate: string | null;
  endDate: string | null;
  evidenceIds: string[];
  strength: number | null;
  willingness: "yes" | "no" | "unknown";
  willingnessDate?: string | null;
  willingnessSource?: string | null;
  evidenceReviewState?: string;
};
export type RelationshipPath = {
  id: string;
  current: boolean;
  nodes: PathNode[];
  edges: PathEdge[];
  willingness: "yes" | "no" | "unknown";
  warning: string;
};
export type Claim = {
  text: string;
  evidenceIds: string[];
  status: "supplied" | "reviewed" | "disputed" | "superseded";
};
export type GeneratedBrief = BriefFields & {
  claims: Claim[];
  inferences: string[];
  questions: string[];
  path: RelationshipPath | null;
};
export type AssessmentInput = {
  factors: Factors;
  brief: GeneratedBrief;
  evidenceIds: string[];
  inputRevision: number;
};
export type OpportunityCandidate = {
  needId: string;
  companyId: string;
  partnershipType: string;
};
export type OpportunityReview = {
  fitReviewed: boolean;
  ask: string;
  contactRole: string;
  nextAction: string;
};
export type ActivityInput = {
  id?: string;
  opportunityId: string;
  kind: "introduction" | "outreach" | "meeting" | "follow_up";
  status: "planned" | "completed";
  targetPersonId: string | null;
  targetRole: string;
  channel: string;
  description: string;
  followUpDate: string | null;
};
export type AiContextInput = {
  needId: string;
  companyId: string;
  evidenceIds: string[];
  pathIds: string[];
};
