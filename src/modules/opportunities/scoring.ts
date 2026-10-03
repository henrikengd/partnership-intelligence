import { z } from "zod";
export const rubricVersion = "v1";
export const rubric = [
  {
    key: "relationship",
    label: "Relationship",
    weight: 25,
    anchors: [
      "Reviewed network has no usable route",
      "Only a historical or weak lead",
      "Current company connection, introduction unconfirmed",
      "Current relevant personal route, willingness unconfirmed",
      "Current direct relevant route with explicit willingness",
    ],
  },
  {
    key: "fit",
    label: "Fit",
    weight: 25,
    anchors: [
      "Confirmed mismatch",
      "Broad sector relevance only",
      "Some relevant capability with unresolved requirement gaps",
      "Specific supported capability with minor gaps",
      "Supported capability meets the defined need",
    ],
  },
  {
    key: "access",
    label: "Decision-maker access",
    weight: 10,
    anchors: [
      "Known route is irrelevant or unavailable",
      "Generic channel only",
      "Relevant role identified, person/access unconfirmed",
      "Known relevant person, authority/access partly unconfirmed",
      "Relevant person, authority, and permitted route verified",
    ],
  },
  {
    key: "incentive",
    label: "Incentive",
    weight: 10,
    anchors: [
      "Documented conflict",
      "Plausible general benefit",
      "Supported alignment with organizational/company goals",
      "Specific benefit linked to evidenced company priorities",
      "Concrete mutual exchange confirmed in relevant history or discussion",
    ],
  },
  {
    key: "feasibility",
    label: "Feasibility",
    weight: 10,
    anchors: [
      "Confirmed impossible timing/scope",
      "Major evidenced constraint",
      "Ask defined, major feasibility questions remain",
      "Deliverable/timing defined with minor constraints",
      "Deliverable, timing, and required inputs supported",
    ],
  },
  {
    key: "previous",
    label: "Previous relationship",
    weight: 5,
    anchors: [
      "Relevant adverse experience",
      "Ended/weak collaboration with issues",
      "Reviewed history has no prior partnership",
      "Positive older collaboration",
      "Recent positive collaboration",
    ],
  },
  {
    key: "evidence",
    label: "Evidence",
    weight: 10,
    anchors: [
      "Material contradiction or reviewed unsupported basis",
      "Attributed but weak/outdated claim",
      "Specific supplied evidence with review gaps",
      "Reviewed current fit and relevant route claims",
      "Reviewed current central claims and cross-checked critical details",
    ],
  },
  {
    key: "urgency",
    label: "Urgency",
    weight: 5,
    anchors: [
      "Recorded low urgency, no deadline",
      "Low urgency with a later deadline",
      "Recorded normal priority",
      "Recorded high priority",
      "Explicit near-term critical deadline/priority",
    ],
  },
] as const;
export type FactorKey = (typeof rubric)[number]["key"];
export const factorSchema = z.object({
  value: z.number().int().min(0).max(4).nullable(),
  rationale: z.string().trim().min(1).max(2000),
  origin: z.enum(["deterministic", "human", "organization"]),
  evidenceIds: z.array(z.uuid()).max(30),
  source: z.string().max(1000).nullable(),
});
export type Factor = z.infer<typeof factorSchema>;
export type Factors = Record<FactorKey, Factor>;
export const factorsSchema = z.object(
  Object.fromEntries(rubric.map((f) => [f.key, factorSchema])) as Record<
    FactorKey,
    typeof factorSchema
  >,
);
export function calculatePriority(factors: Factors) {
  const parsed = factorsSchema.parse(factors);
  let priority = 0,
    coverage = 0;
  const unknowns: FactorKey[] = [];
  for (const factor of rubric) {
    const value = parsed[factor.key].value;
    if (value === null) {
      unknowns.push(factor.key);
      continue;
    }
    priority += (factor.weight * value) / 4;
    coverage += factor.weight;
  }
  return { priority, coverage, unknowns };
}
export function unknownFactors(): Factors {
  return factorsSchema.parse(
    Object.fromEntries(
      rubric.map((f) => [
        f.key,
        {
          value: null,
          rationale:
            "Missing information. Review this factor before assigning a value.",
          origin: "deterministic",
          evidenceIds: [],
          source: null,
        },
      ]),
    ),
  );
}
