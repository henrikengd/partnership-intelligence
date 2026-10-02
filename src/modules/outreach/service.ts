import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, activity, opportunity, user, organization } from "../../server/db";
import {
  workspaceContext,
  assertReference,
  getWorkspaceData,
} from "../records/service";
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
    followUpDate: calendarDate.nullable().optional(),
    occurredDate: calendarDate.nullable().optional(),
  })
  .refine(
    (a) => a.targetPersonId || a.targetRole.trim(),
    "Specify a target person or contact role.",
  );
export async function saveActivity(headers: Headers, raw: unknown) {
  const context = await workspaceContext(headers);
  const { id, ...input } = activityInput.parse(raw);
  return db.transaction(async (tx) => {
    await tx
      .select()
      .from(organization)
      .where(eq(organization.id, context.organization.id))
      .for("update");
    const [op] = await tx
      .select()
      .from(opportunity)
      .where(
        and(
          eq(opportunity.id, input.opportunityId),
          eq(opportunity.organizationId, context.organization.id),
        ),
      )
      .for("update");
    if (!op) throw new DomainError("NOT_FOUND", "Opportunity not found.", 404);
    if (
      input.status === "planned" &&
      ["declined", "archived"].includes(op.state)
    )
      throw new DomainError(
        "OPPORTUNITY_CLOSED",
        "Reopen the opportunity before planning new work. Completed historical communications can still be recorded.",
        409,
      );
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
      ? (
          await tx
            .select()
            .from(activity)
            .where(
              and(
                eq(activity.id, id),
                eq(activity.organizationId, context.organization.id),
              ),
            )
            .for("update")
        )[0]
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
    const today = localCalendarDay(context.organization.timezone);
    const occurredDate =
      input.status === "completed"
        ? (input.occurredDate ??
          (existing?.status === "completed" ? existing.occurredDate : today))
        : null;
    if (input.status === "planned" && input.occurredDate)
      throw new DomainError(
        "PLANNED_OCCURRENCE",
        "Planned work has not occurred yet.",
      );
    if (occurredDate && occurredDate > today)
      throw new DomainError(
        "FUTURE_ACTIVITY",
        "A completed activity cannot occur in the future.",
      );
    if (existing?.status === "completed") {
      const keys = [
        "kind",
        "targetPersonId",
        "targetRole",
        "channel",
        "description",
      ] as const;
      if (
        keys.some((key) => input[key] !== existing[key]) ||
        (existing.occurredDate && occurredDate !== existing.occurredDate)
      )
        throw new DomainError(
          "COMPLETED_ACTIVITY",
          "Completed event facts are preserved. Record a separate correction or follow-up instead.",
          409,
        );
    }
    const followUpDate =
      input.followUpDate === undefined
        ? (existing?.followUpDate ?? null)
        : input.followUpDate;
    const changedDate = existing && existing.followUpDate !== followUpDate;
    const completedAt =
      input.status === "completed"
        ? (existing?.completedAt ?? new Date())
        : null;
    const fields = {
      ...input,
      occurredDate,
      followUpDate,
      completedAt,
      ...(changedDate
        ? { followUpResolvedAt: null, followUpResolvedBy: null }
        : {}),
    };
    const [record] = id
      ? await tx
          .update(activity)
          .set({
            ...fields,
            updatedAt: new Date(),
            revision: sql`${activity.revision}+1`,
          })
          .where(eq(activity.id, id))
          .returning()
      : await tx
          .insert(activity)
          .values({
            ...fields,
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
    .innerJoin(opportunity, eq(opportunity.id, activity.opportunityId))
    .where(eq(activity.organizationId, context.organization.id));
  return {
    today,
    actions: records
      .filter(
        ({ activity: a, opportunity: o }) =>
          a.followUpDate &&
          a.followUpDate <= today &&
          !a.followUpResolvedAt &&
          !["declined", "archived"].includes(o.state),
      )
      .map(({ activity: a }) => ({ ...a, overdue: a.followUpDate! < today })),
  };
}

export async function updateFollowUp(
  headers: Headers,
  id: string,
  raw: unknown,
) {
  z.uuid().parse(id);
  const input = z
    .object({ followUpDate: calendarDate.nullable(), resolved: z.boolean() })
    .parse(raw);
  const context = await workspaceContext(headers);
  return db.transaction(async (tx) => {
    await tx
      .select()
      .from(organization)
      .where(eq(organization.id, context.organization.id))
      .for("update");
    const initial = await tx.query.activity.findFirst({
      where: and(
        eq(activity.id, id),
        eq(activity.organizationId, context.organization.id),
      ),
    });
    if (!initial)
      throw new DomainError("NOT_FOUND", "Activity not found.", 404);
    await tx
      .select()
      .from(opportunity)
      .where(eq(opportunity.id, initial.opportunityId))
      .for("update");
    const [existing] = await tx
      .select()
      .from(activity)
      .where(eq(activity.id, id))
      .for("update");
    if (input.resolved && !input.followUpDate)
      throw new DomainError(
        "FOLLOW_UP_REQUIRED",
        "There is no dated follow-up to resolve.",
      );
    const [saved] = await tx
      .update(activity)
      .set({
        followUpDate: input.followUpDate,
        followUpResolvedAt:
          input.resolved && existing.followUpDate === input.followUpDate
            ? (existing.followUpResolvedAt ?? new Date())
            : null,
        followUpResolvedBy:
          input.resolved && existing.followUpDate === input.followUpDate
            ? (existing.followUpResolvedBy ?? context.actor.id)
            : null,
        revision: sql`${activity.revision}+1`,
        updatedAt: new Date(),
      })
      .where(eq(activity.id, id))
      .returning();
    return saved;
  });
}
export async function getPipeline(headers: Headers) {
  const data = await getWorkspaceData(headers);
  const activities = await db
    .select()
    .from(activity)
    .where(eq(activity.organizationId, data.organization.id));
  const today = localCalendarDay(data.organization.timezone);
  return { data, today, activities };
}
