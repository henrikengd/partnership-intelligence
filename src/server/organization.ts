import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, organization } from "./db";
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
  const [record] = await db
    .insert(organization)
    .values(input)
    .onConflictDoUpdate({
      target: organization.singletonKey,
      set: { ...input, updatedAt: new Date() },
    })
    .returning();
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
