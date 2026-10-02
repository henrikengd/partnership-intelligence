import type { WorkspaceData } from "../records/service";
import { findDirectPaths } from "../network/paths";
import { unknownFactors, type Factors } from "./scoring";
import type { AssessmentInput } from "./contracts";
import { isCurrentSource } from "./candidates";
import { DomainError } from "../../server/errors";
export function buildDeterministicAssessment(
  data: WorkspaceData,
  needId: string,
  companyId: string,
  inputRevision = 1,
): AssessmentInput {
  const need = data.needs.find((n) => n.id === needId && n.active);
  const company = data.companies.find((c) => c.id === companyId);
  if (!need || !company)
    throw new DomainError(
      "INVALID_CANDIDATE",
      "Select an active need and a saved company.",
    );
  const supported = data.capabilities
    .filter(
      (c) =>
        c.companyId === companyId &&
        c.category.toLowerCase() === need.category.toLowerCase(),
    )
    .map((c) => ({
      capability: c,
      evidence: data.evidence.find((e) => e.id === c.evidenceId)!,
    }))
    .filter((c) => c.evidence);
  const paths = findDirectPaths({
    organization: data.organization,
    company,
    people: data.people,
    affiliations: data.affiliations,
    relationships: data.relationships,
    evidence: data.evidence,
  });
  const path = paths.current[0] ?? null;
  const today = new Date().toISOString().slice(0, 10);
  const historicalLead = paths.historical.find(
    (p) =>
      p.willingness !== "no" &&
      p.supportedConnectionCount === 1 &&
      p.edges.some((e) => e.state === "ended") &&
      p.edges.every(
        (e) =>
          ["current", "ended"].includes(e.state) &&
          (!e.startDate || e.startDate <= today),
      ),
  );
  const factors: Factors = unknownFactors();
  const valid = supported.filter((c) => isCurrentSource(c.evidence));
  const evidenceIds = [
    ...new Set([
      ...supported.map((c) => c.evidence.id),
      ...(path?.edges.flatMap((e) => e.evidenceIds) ?? []),
      ...(historicalLead?.edges.flatMap((e) => e.evidenceIds) ?? []),
    ]),
  ];
  if (valid.length)
    factors.fit = {
      value: 2,
      rationale:
        "A recorded capability matches the need category. Detailed deliverables and constraints still require review.",
      origin: "deterministic",
      evidenceIds: valid.map((c) => c.evidence.id),
      source:
        "Recorded capability/category match, not a confirmed complete fit.",
    };
  if (path && path.willingness !== "no")
    factors.relationship = {
      value:
        path.weakestPersonalStrength !== null &&
        path.weakestPersonalStrength <= 1
          ? 1
          : 2,
      rationale:
        path.weakestPersonalStrength !== null &&
        path.weakestPersonalStrength <= 1
          ? "A recorded personal connection in this route is weak. Verify its suitability before seeking an introduction."
          : "A current recorded route reaches this company. Introduction suitability and decision authority still require review.",
      origin: "deterministic",
      evidenceIds: path.edges.flatMap((e) => e.evidenceIds),
      source:
        "Recorded internal affiliation, explicit personal edges where present, and current employment. Titles do not establish need relevance; the deterministic relationship value is capped at 2.",
    };
  else if (historicalLead)
    factors.relationship = {
      value: 1,
      rationale:
        "Only a supported ended connection is recorded. This is a historical lead to verify, not current introduction access.",
      origin: "deterministic",
      evidenceIds: historicalLead.edges.flatMap((e) => e.evidenceIds),
      source:
        "Explicit ended affiliation/employment or personal connection with supplied/reviewed evidence. Unknown, future and disputed records do not qualify.",
    };
  if (supported.some((c) => c.evidence.reviewState === "disputed"))
    factors.evidence = {
      value: 0,
      rationale:
        "A central capability claim is disputed. Resolve the conflict before acting.",
      origin: "deterministic",
      evidenceIds: supported
        .filter((c) => c.evidence.reviewState === "disputed")
        .map((c) => c.evidence.id),
      source: "Explicit disputed evidence review state.",
    };
  else if (valid.length)
    factors.evidence = {
      value: 2,
      rationale:
        "Specific source material exists, but critical fit and route claims have not been cross-checked together.",
      origin: "deterministic",
      evidenceIds: valid.map((c) => c.evidence.id),
      source:
        "Supplied or individually reviewed evidence; no automatic semantic verification.",
    };
  if (need.urgency !== null)
    factors.urgency = {
      value: need.urgency,
      rationale: "Uses the organization's recorded need priority.",
      origin: "organization",
      evidenceIds: [],
      source: `Need ${need.id}${need.deadline ? `, deadline ${need.deadline}` : ""}`,
    };
  const role = "Partnership or operations lead";
  return {
    factors,
    evidenceIds,
    inputRevision,
    brief: {
      ask: `Discuss support for ${need.title.toLowerCase()}. Confirm the deliverable, quantity, inputs, and timing before making a proposal.`,
      valueExchange:
        "Propose organizational visibility or collaboration only if your organization can offer it and the company values it.",
      contactRole: role,
      nextAction:
        path && path.willingness !== "no"
          ? `Ask ${path.nodes[1].label} whether they are willing and able to introduce your team.`
          : "Verify the relevant contact role and choose a permitted cold approach.",
      approach:
        path && path.willingness !== "no"
          ? "Confirm introduction willingness, request an introduction, then arrange a short needs discussion."
          : "Research the appropriate contact role from supplied sources, then make a focused first request.",
      claims: supported.map((c) => ({
        text: c.evidence.claim,
        evidenceIds: [c.evidence.id],
        status: c.evidence.reviewState as
          "supplied" | "reviewed" | "disputed" | "superseded",
      })),
      inferences: [
        `${role} is a suggested role to verify. No named manager or decision authority is established.`,
        "A category match suggests potential relevance; it does not establish delivery feasibility.",
      ],
      questions: [
        ...(supported.some((c) => !isCurrentSource(c.evidence))
          ? [
              "Some matching source records are missing, future-dated, disputed or superseded. Resolve them before asserting current fit.",
            ]
          : []),
        "Can the company meet the exact specification, quantity, and deadline?",
        "What value can your organization realistically offer in exchange?",
        path
          ? path.willingness === "no"
            ? "Which alternative contact route is permitted, given the recorded refusal?"
            : "Is the recorded internal person willing and able to make this introduction?"
          : "Who is the right person at the company, and which contact channel is permitted?",
      ],
      path,
    },
  };
}
