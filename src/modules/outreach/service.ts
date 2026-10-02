import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, activity, opportunity, user } from "../../server/db";
import { workspaceContext, assertReference } from "../records/service";
import { calendarDate } from "../records/validation";
import { DomainError } from "../../server/errors";
export const activityInput = z
  .object({
    id: z.uuid().optional(),
    opportunityId: z.uuid(),
    kind: z.enum(["introduction", "outreach", "meeting", "follow_up"]),
    status: z.enum(["planned", "completed"]),
    targetPersonId: z.uuid().nullable().default(null),
    targetRole: z.string().max(500).default(""),
    channel: z.enum(["email", "phone", "meeting", "message", "other"]),
    description: z.string().trim().min(1).max(4000),
    followUpDate: calendarDate.nullable().default(null),
  })
  .refine(
    (a) => a.targetPersonId || a.targetRole.trim(),
    "Specify a target person or contact role.",
  );
export async function saveActivity(headers: Headers, raw: unknown) {
  const context = await workspaceContext(headers);
  const { id, ...input } = activityInput.parse(raw);
  return db.transaction(async (tx) => {
    await assertReference(
      tx,
      context.organization.id,
      "opportunities",
      input.opportunityId,
    );
    const op = await tx.query.opportunity.findFirst({
      where: eq(opportunity.id, input.opportunityId),
    });
    if (
      !op?.ownerId ||
      !(await tx.query.user.findFirst({
        where: and(eq(user.id, op.ownerId), eq(user.active, true)),
      }))
    )
      throw new DomainError(
        "OWNER_REQUIRED",
        "Assign an active owner before planning an action.",
        409,
      );
    if (input.targetPersonId)
      await assertReference(
        tx,
        context.organization.id,
        "people",
        input.targetPersonId,
      );
    const existing = id
      ? await tx.query.activity.findFirst({
          where: and(
            eq(activity.id, id),
            eq(activity.organizationId, context.organization.id),
          ),
        })
      : null;
    if (id && !existing)
      throw new DomainError("NOT_FOUND", "Activity not found.", 404);
    if (existing && existing.opportunityId !== input.opportunityId)
      throw new DomainError(
        "INVALID_REFERENCE",
        "An activity cannot move to another opportunity.",
      );
    if (existing?.status === "completed" && input.status !== "completed")
      throw new DomainError(
        "COMPLETED_ACTIVITY",
        "A completed event cannot become a draft.",
        409,
      );
    const completedAt =
      input.status === "completed"
        ? (existing?.completedAt ?? new Date())
        : null;
    const [record] = id
      ? await tx
          .update(activity)
          .set({
            ...input,
            completedAt,
            updatedAt: new Date(),
            revision: sql`${activity.revision}+1`,
          })
          .where(eq(activity.id, id))
          .returning()
      : await tx
          .insert(activity)
          .values({
            ...input,
            completedAt,
            organizationId: context.organization.id,
            recordedBy: context.actor.id,
          })
          .returning();
    return record;
  });
}
export function localCalendarDay(timezone: string, now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export async function getDueActions(headers: Headers) {
  const context = await workspaceContext(headers);
  const today = localCalendarDay(context.organization.timezone);
  const records = await db
    .select()
    .from(activity)
    .where(eq(activity.organizationId, context.organization.id));
  return {
    today,
    actions: records
      .filter((a) => a.followUpDate && a.followUpDate <= today)
      .map((a) => ({ ...a, overdue: a.followUpDate! < today })),
  };
}
