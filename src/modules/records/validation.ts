import { z } from "zod";
export const calendarDate = z.iso
  .date()
  .refine(
    (s) => new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s,
    "Use a real calendar date.",
  );
export const nullableDate = calendarDate.nullable().default(null);
export const id = z.uuid().optional();
export const website = z
  .url()
  .refine(
    (s) => ["http:", "https:"].includes(new URL(s).protocol),
    "Use an HTTP or HTTPS URL.",
  )
  .nullable()
  .default(null);
const text = z.string().trim().min(1).max(2000);
const state = z.enum(["current", "ended", "unknown"]);
export function validRange(input: {
  startDate: string | null;
  endDate: string | null;
  state?: string;
}) {
  return (
    (!input.startDate || !input.endDate || input.startDate <= input.endDate) &&
    (input.state !== "current" || input.endDate === null)
  );
}
export const needInput = z.object({
  id,
  title: text,
  description: text,
  category: z.string().trim().min(1).max(120),
  urgency: z.number().int().min(0).max(4).nullable().default(null),
  deadline: nullableDate,
  estimatedValue: z
    .string()
    .regex(/^\d{1,12}(\.\d{1,2})?$/)
    .nullable()
    .default(null),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .default("NOK"),
  partnershipType: z.string().trim().min(1).max(120).default("in_kind"),
  active: z.boolean().default(true),
});
export const companyInput = z.object({
  id,
  name: text,
  description: z.string().max(4000).default(""),
  website,
  domain: z.string().max(254).nullable().default(null),
  sourceId: z.string().max(254).nullable().default(null),
});
export const personInput = z
  .object({
    id,
    name: text,
    email: z.email().nullable().default(null),
    notes: z.string().max(4000).default(""),
    sourceId: z.string().max(254).nullable().default(null),
    roles: z
      .array(z.enum(["member", "alumni", "advisor", "board", "contact"]))
      .min(1)
      .max(5),
    affiliationState: state.default("current"),
    affiliationStartDate: nullableDate,
    affiliationEndDate: nullableDate,
  })
  .refine(
    (p) =>
      validRange({
        state: p.affiliationState,
        startDate: p.affiliationStartDate,
        endDate: p.affiliationEndDate,
      }),
    "Affiliation dates and state must agree.",
  );
export const evidenceInput = z
  .object({
    id,
    claim: text,
    sourceType: z.enum(["supplied_source", "observation"]),
    url: website,
    attribution: z.string().trim().max(500).nullable().default(null),
    excerpt: text,
    observedDate: calendarDate,
    reviewState: z
      .enum(["supplied", "reviewed", "disputed", "superseded"])
      .default("supplied"),
    reviewDate: nullableDate,
  })
  .superRefine((e, ctx) => {
    if (e.sourceType === "supplied_source" && !e.url)
      ctx.addIssue({
        code: "custom",
        path: ["url"],
        message: "A supplied source requires an HTTP or HTTPS URL.",
      });
    if (e.sourceType === "observation" && !e.attribution)
      ctx.addIssue({
        code: "custom",
        path: ["attribution"],
        message: "Attribute the observation to its source.",
      });
    const today = new Date().toISOString().slice(0, 10);
    if (e.observedDate > today)
      ctx.addIssue({
        code: "custom",
        path: ["observedDate"],
        message: "An observation cannot be in the future.",
      });
    if (e.reviewState === "reviewed" && !e.reviewDate)
      ctx.addIssue({
        code: "custom",
        path: ["reviewDate"],
        message: "Record the review date.",
      });
    if (e.reviewDate && (e.reviewDate < e.observedDate || e.reviewDate > today))
      ctx.addIssue({
        code: "custom",
        path: ["reviewDate"],
        message: "Review after observation and not in the future.",
      });
  });
export const capabilityInput = z.object({
  id,
  companyId: z.uuid(),
  category: z.string().trim().min(1).max(120),
  description: text,
  evidenceId: z.uuid(),
});
export const relationshipInput = z
  .object({
    id,
    kind: z.enum([
      "works_at",
      "previously_worked_at",
      "interned_at",
      "knows",
      "introduced_by",
      "studied_with",
    ]),
    personId: z.uuid(),
    targetPersonId: z.uuid().nullable().default(null),
    companyId: z.uuid().nullable().default(null),
    title: z.string().max(200).default(""),
    state: state.default("current"),
    startDate: nullableDate,
    endDate: nullableDate,
    strength: z.number().int().min(0).max(4).nullable().default(null),
    willingness: z.enum(["yes", "no", "unknown"]).default("unknown"),
    willingnessDate: nullableDate,
    willingnessSource: z.string().trim().max(1000).nullable().default(null),
    evidenceId: z.uuid(),
  })
  .superRefine((r, ctx) => {
    const professional = [
      "works_at",
      "previously_worked_at",
      "interned_at",
    ].includes(r.kind);
    if (
      professional
        ? !r.companyId || r.targetPersonId !== null
        : !r.targetPersonId ||
          r.companyId !== null ||
          r.personId === r.targetPersonId
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Use a company for employment, or a different person for a personal connection.",
      });
    if (!validRange(r))
      ctx.addIssue({
        code: "custom",
        message: "The relationship dates and state must agree.",
      });
    if (r.kind === "previously_worked_at" && r.state !== "ended")
      ctx.addIssue({
        code: "custom",
        message: "Previous employment must be ended.",
      });
    if (
      r.willingness !== "unknown" &&
      (!r.willingnessDate || !r.willingnessSource)
    )
      ctx.addIssue({
        code: "custom",
        message: "Record the date and source of introduction willingness.",
      });
    if (
      r.willingnessDate &&
      r.willingnessDate > new Date().toISOString().slice(0, 10)
    )
      ctx.addIssue({
        code: "custom",
        message: "Willingness cannot be observed in the future.",
      });
  });
export type RecordKind =
  | "needs"
  | "people"
  | "companies"
  | "evidence"
  | "capabilities"
  | "relationships";
