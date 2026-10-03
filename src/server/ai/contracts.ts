import { z } from "zod";
const text = z.string().trim().min(1).max(4000);
const ref = z.string().regex(/^[ERP][1-9][0-9]*$/);
export const packetSchema = z.strictObject({
  need: z.strictObject({
    title: text,
    description: z.string().max(4000),
    partnershipType: z.string().max(120),
    deadline: z.string().nullable(),
  }),
  company: z.strictObject({ name: text }),
  evidence: z
    .array(
      z.strictObject({
        ref,
        claim: text,
        excerpt: z.string().max(4000),
        observedDate: z.string(),
        reviewState: z.string(),
      }),
    )
    .max(100),
  routes: z
    .array(
      z.strictObject({
        ref,
        current: z.boolean(),
        people: z.array(ref).max(2),
        connections: z
          .array(
            z.strictObject({
              kind: z.string().max(120),
              role: z.string().max(120).nullable(),
            }),
          )
          .max(3),
        willingness: z.enum(["yes", "no", "unknown"]),
      }),
    )
    .max(3),
  allowedContactRoles: z.array(z.string().max(120)).max(12),
  userInstructions: z.string().max(2000),
});
export type AiPacket = z.infer<typeof packetSchema>;
export const draftSchema = z.strictObject({
  whyFit: z
    .array(z.strictObject({ text, evidenceRefs: z.array(ref).max(12) }))
    .max(8),
  ask: text,
  valueExchange: text,
  contact: z.strictObject({
    personRef: ref.nullable(),
    role: z.string().max(120).nullable(),
  }),
  routeRef: ref.nullable(),
  nextAction: text,
  approach: text,
  outreachText: text,
  missingInformation: z.array(text).max(8),
  cautions: z.array(text).max(8),
});
export type AiDraft = z.infer<typeof draftSchema>;
export type ReferenceMap = {
  people: Record<string, string>;
  evidence: Record<string, string>;
  routes: Record<string, string>;
  relationshipIds: string[];
  personIds: string[];
};
export const draftJsonSchema = z.toJSONSchema(draftSchema, {
  target: "draft-7",
});
export class AiError extends Error {
  constructor(public category: string) {
    super(category);
  }
}
export type Provider = (
  packet: AiPacket,
  config: { model: string; key: string },
  signal: AbortSignal,
) => Promise<unknown>;
