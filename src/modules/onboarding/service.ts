import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, onboarding } from "../../server/db";
import { requireActor } from "../../server/auth/access";
import { getOrganization } from "../../server/organization";
import {
  workspaceContext,
  getWorkspaceData,
  type WorkspaceData,
} from "../records/service";
export const steps = [
  "Organization",
  "Needs",
  "People & companies",
  "Relationships & evidence",
  "Partnerships",
  "Previous outreach",
  "Graph review",
  "Readiness",
  "Dashboard",
];
export async function getOnboarding(headers: Headers) {
  await requireActor(headers);
  const org = await getOrganization(headers);
  if (!org) return { step: 0, skippedSteps: [] as number[], completedAt: null };
  return (
    (await db.query.onboarding.findFirst({
      where: eq(onboarding.organizationId, org.id),
    })) ?? { step: 0, skippedSteps: [] as number[], completedAt: null }
  );
}
export async function saveOnboarding(headers: Headers, raw: unknown) {
  const context = await workspaceContext(headers);
  const input = z
    .object({
      step: z.number().int().min(0).max(8),
      skip: z.number().int().min(2).max(5).optional(),
      complete: z.boolean().optional(),
    })
    .parse(raw);
  return db.transaction(async (tx) => {
    await tx
      .insert(onboarding)
      .values({ organizationId: context.organization.id })
      .onConflictDoNothing();
    const [current] = await tx
      .select()
      .from(onboarding)
      .where(eq(onboarding.organizationId, context.organization.id))
      .for("update");
    const skippedSteps = [
      ...new Set([
        ...current.skippedSteps.filter(
          (step) =>
            !(
              input.skip === undefined &&
              input.step === current.step + 1 &&
              step === current.step
            ),
        ),
        ...(input.skip === undefined ? [] : [input.skip]),
      ]),
    ];
    const [saved] = await tx
      .update(onboarding)
      .set({
        step: input.step,
        skippedSteps,
        completedAt: input.complete ? new Date() : current.completedAt,
        updatedAt: new Date(),
      })
      .where(eq(onboarding.id, current.id))
      .returning();
    return saved;
  });
}
export function readiness(data: WorkspaceData) {
  const needs = data.needs.filter((n) => n.active);
  const supported = needs.flatMap((n) =>
    data.companies.flatMap((c) => {
      const caps = data.capabilities.filter(
        (cap) =>
          cap.companyId === c.id &&
          cap.category === n.category &&
          data.evidence.some(
            (e) =>
              e.id === cap.evidenceId &&
              ["supplied", "reviewed"].includes(e.reviewState) &&
              e.observedDate <= new Date().toISOString().slice(0, 10),
          ),
      );
      return caps.length
        ? [
            {
              needId: n.id,
              companyId: c.id,
              label: `${n.title} → ${c.name}`,
              partnershipType: n.partnershipType,
            },
          ]
        : [];
    }),
  );
  const tasks: string[] = [];
  if (!needs.length) tasks.push("Add an active organizational need.");
  if (!data.companies.length)
    tasks.push("Add a candidate company from your existing records.");
  if (needs.length && data.companies.length && !supported.length)
    tasks.push(
      "Add a company capability in a matching need category, linked to a supplied source or reviewed observation. Resolve disputed sources first.",
    );
  return { supported, tasks };
}
export async function getReadiness(headers: Headers) {
  return readiness(await getWorkspaceData(headers));
}
