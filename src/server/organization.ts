import { DomainError } from "./errors";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db, organization, opportunity } from "./db";
import { requireActor, requireAdmin } from "./auth/access";
export const organizationInput = z.object({
  name: z.string().trim().min(1).max(160),
  mission: z.string().max(4000).default(""),
  website: z
    .url()
    .refine((s) => ["http:", "https:"].includes(new URL(s).protocol))
    .nullable()
    .default(null),
  type: z.string().trim().min(1).max(100).default("other"),
  location: z.string().max(200).default(""),
  teamSize: z.number().int().min(0).max(1000000).nullable().default(null),
  timezone: z
    .string()
    .refine((s) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: s });
        return true;
      } catch {
        return false;
      }
    })
    .default("UTC"),
});
export async function getOrganization(headers: Headers) {
  await requireActor(headers);
  return (await db.query.organization.findFirst()) ?? null;
}
export async function saveOrganization(
  headers: Headers,
  raw: z.input<typeof organizationInput>,
) {
  await requireAdmin(headers);
  const input = organizationInput.parse(raw);
  const expected = await db.query.organization.findFirst();
  const record = await db.transaction(async (tx) => {
    const current = expected
      ? (
          await tx
            .select()
            .from(organization)
            .where(eq(organization.id, expected.id))
            .for("update")
        )[0]
      : null;
    if (expected && current?.privacyRevision !== expected.privacyRevision)
      throw new DomainError(
        "PRIVACY_CHANGED",
        "Private data changed. Refresh before saving this profile.",
        409,
      );
    const [record] = await tx
      .insert(organization)
      .values(input)
      .onConflictDoUpdate({
        target: organization.singletonKey,
        set: { ...input, updatedAt: new Date() },
      })
      .returning();
    if (current)
      await tx
        .update(opportunity)
        .set({
          reviewState: "needs_review",
          inputRevision: sql`${opportunity.inputRevision}+1`,
          updatedAt: new Date(),
        })
        .where(eq(opportunity.organizationId, current.id));
    return record;
  });
  return record;
}
export async function installationConfigured() {
  return Boolean(await db.query.user.findFirst({ columns: { id: true } }));
}
export async function organizationExists() {
  const rows = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.singletonKey, 1))
    .limit(1);
  return rows.length > 0;
}
