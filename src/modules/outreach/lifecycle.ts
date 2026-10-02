import { createHash } from "node:crypto";
import { and, eq, desc } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  organization,
  opportunity,
  opportunityEvent,
  partnership,
  activity,
} from "../../server/db";
import {
  workspaceContext,
  getWorkspaceData,
  saveRecordInTransaction,
} from "../records/service";
import { calendarDate, partnershipInput } from "../records/validation";
import { assertOpportunityReady } from "../opportunities/review";
import { localCalendarDay } from "./service";
import { DomainError } from "../../server/errors";
export const states = [
  "suggested",
  "shortlisted",
  "pursuing",
  "agreed",
  "declined",
  "archived",
] as const;
export const lifecycleInput = z.object({
  requestId: z.uuid(),
  action: z.enum(["transition", "reopen", "agreement"]),
  fromState: z.enum(states),
  toState: z.enum(states).optional(),
  reason: z.string().trim().max(4000).default(""),
  source: z.string().trim().max(1000).default(""),
  occurredDate: calendarDate.optional(),
  confirmed: z.boolean().default(false),
  partnershipId: z.uuid().optional(),
  newPartnership: z
    .object({
      title: partnershipInput.shape.title,
      type: partnershipInput.shape.type,
      state: partnershipInput.shape.state,
      startDate: partnershipInput.shape.startDate,
      endDate: partnershipInput.shape.endDate,
      description: partnershipInput.shape.description,
      evidenceId: partnershipInput.shape.evidenceId,
    })
    .optional(),
});
export async function transitionOpportunity(
  headers: Headers,
  id: string,
  raw: unknown,
) {
  z.uuid().parse(id);
  const input = lifecycleInput.parse(raw);
  const context = await workspaceContext(headers);
  const hash = createHash("sha256")
    .update(JSON.stringify({ id, ...input }))
    .digest("hex");
  return db.transaction(async (tx) => {
    await tx
      .select()
      .from(organization)
      .where(eq(organization.id, context.organization.id))
      .for("update");
    const [record] = await tx
      .select()
      .from(opportunity)
      .where(
        and(
          eq(opportunity.id, id),
          eq(opportunity.organizationId, context.organization.id),
        ),
      )
      .for("update");
    if (!record)
      throw new DomainError("NOT_FOUND", "Opportunity not found.", 404);
    const replay = await tx.query.opportunityEvent.findFirst({
      where: and(
        eq(opportunityEvent.organizationId, context.organization.id),
        eq(opportunityEvent.requestId, input.requestId),
      ),
    });
    if (replay) {
      if (replay.requestHash !== hash)
        throw new DomainError(
          "IDEMPOTENCY_CONFLICT",
          "This request ID belongs to a different action.",
          409,
        );
      return { record, event: replay };
    }
    if (input.fromState !== record.state)
      throw new DomainError(
        "STATE_CHANGED",
        "The opportunity state changed. Refresh before recording this action.",
        409,
      );
    const today = localCalendarDay(context.organization.timezone);
    const occurredDate = input.occurredDate ?? today;
    if (occurredDate > today)
      throw new DomainError(
        "FUTURE_OUTCOME",
        "A recorded outcome cannot occur in the future.",
      );
    let toState: string;
    let partnershipId = record.partnershipId;
    let reviewId: string | null = null;
    if (input.action === "reopen") {
      if (!["declined", "archived"].includes(record.state) || !input.reason)
        throw new DomainError(
          "REOPEN_REASON",
          "Only closed work can be explicitly reopened with a reason.",
        );
      toState = partnershipId ? "agreed" : "suggested";
      const all = await tx
        .select()
        .from(opportunity)
        .where(
          and(
            eq(opportunity.organizationId, record.organizationId),
            eq(opportunity.companyId, record.companyId),
            eq(opportunity.needId, record.needId),
            eq(opportunity.partnershipType, record.partnershipType),
          ),
        );
      if (
        all.some(
          (o) =>
            o.id !== record.id && !["declined", "archived"].includes(o.state),
        )
      )
        throw new DomainError(
          "ACTIVE_OPPORTUNITY_EXISTS",
          "Another active proposal already covers this company, need and partnership type. Open that proposal instead.",
          409,
        );
    } else if (input.action === "agreement") {
      if (!input.confirmed || !input.occurredDate || !input.source)
        throw new DomainError(
          "CONFIRMED_AGREEMENT_REQUIRED",
          "Confirm an actual agreement with its date and source. A draft is not an outcome.",
        );
      if (["declined", "archived"].includes(record.state))
        throw new DomainError(
          "INVALID_TRANSITION",
          "Explicitly reopen closed work before recording agreement.",
          409,
        );
      if (record.state === "agreed" && partnershipId) {
        const event = await tx.query.opportunityEvent.findFirst({
          where: and(
            eq(opportunityEvent.opportunityId, id),
            eq(opportunityEvent.action, "agreement"),
          ),
        });
        return { record, event: event ?? null };
      }
      if (Boolean(input.partnershipId) === Boolean(input.newPartnership))
        throw new DomainError(
          "PARTNERSHIP_REQUIRED",
          "Choose one existing partnership or supply one new partnership.",
        );
      if (input.partnershipId) {
        const [linked] = await tx
          .select()
          .from(partnership)
          .where(
            and(
              eq(partnership.id, input.partnershipId),
              eq(partnership.organizationId, record.organizationId),
              eq(partnership.companyId, record.companyId),
            ),
          )
          .for("update");
        if (!linked)
          throw new DomainError(
            "INVALID_PARTNERSHIP",
            "Choose a partnership for this company in this installation.",
          );
        partnershipId = linked.id;
      } else {
        const saved = await saveRecordInTransaction(
          tx,
          context,
          "partnerships",
          { ...input.newPartnership, companyId: record.companyId },
        );
        partnershipId = saved.id;
      }
      toState = "agreed";
    } else {
      toState = input.toState ?? "";
      if (
        record.state === toState &&
        ["shortlisted", "pursuing"].includes(toState)
      ) {
        if (toState === "pursuing") await assertOpportunityReady(tx, record);
        return { record, event: null };
      }
      const allowed: Record<string, string[]> = {
        suggested: ["shortlisted", "pursuing", "declined", "archived"],
        shortlisted: ["suggested", "pursuing", "declined", "archived"],
        pursuing: ["shortlisted", "declined", "archived"],
        agreed: ["archived"],
        declined: [],
        archived: [],
      };
      if (!allowed[record.state]?.includes(toState))
        throw new DomainError(
          "INVALID_TRANSITION",
          "Use an allowed next state, agreement recording, or explicit reopening.",
          409,
        );
      if (["declined", "archived"].includes(toState) && !input.reason)
        throw new DomainError(
          "REASON_REQUIRED",
          "Record why this opportunity was declined or archived.",
        );
      if (toState === "pursuing")
        reviewId = (await assertOpportunityReady(tx, record)).id;
    }
    const [updated] = await tx
      .update(opportunity)
      .set({
        state: toState,
        partnershipId,
        updatedAt: new Date(),
        ...(input.action === "reopen" && !partnershipId
          ? { reviewState: "needs_review" }
          : {}),
      })
      .where(eq(opportunity.id, id))
      .returning();
    const [event] = await tx
      .insert(opportunityEvent)
      .values({
        organizationId: record.organizationId,
        opportunityId: id,
        action: input.action,
        fromState: record.state,
        toState,
        reason: input.reason,
        source: input.source,
        occurredDate,
        partnershipId,
        reviewId,
        recordedBy: context.actor.id,
        requestId: input.requestId,
        requestHash: hash,
      })
      .returning();
    return { record: updated, event };
  });
}
export async function getLifecycleDetail(headers: Headers, id: string) {
  z.uuid().parse(id);
  const data = await getWorkspaceData(headers);
  const record = data.opportunities.find((o) => o.id === id);
  if (!record)
    throw new DomainError("NOT_FOUND", "Opportunity not found.", 404);
  const events = await db
    .select()
    .from(opportunityEvent)
    .where(
      and(
        eq(opportunityEvent.organizationId, data.organization.id),
        eq(opportunityEvent.opportunityId, id),
      ),
    )
    .orderBy(desc(opportunityEvent.createdAt), desc(opportunityEvent.id));
  return {
    record,
    events,
    partnerships: data.partnerships.filter(
      (p) => p.companyId === record.companyId,
    ),
    today: localCalendarDay(data.organization.timezone),
  };
}
export async function getCompanyHistory(headers: Headers, companyId: string) {
  z.uuid().parse(companyId);
  const data = await getWorkspaceData(headers);
  const company = data.companies.find((c) => c.id === companyId);
  if (!company) throw new DomainError("NOT_FOUND", "Company not found.", 404);
  const events = await db
    .select()
    .from(opportunityEvent)
    .innerJoin(opportunity, eq(opportunity.id, opportunityEvent.opportunityId))
    .where(
      and(
        eq(opportunityEvent.organizationId, data.organization.id),
        eq(opportunity.companyId, companyId),
      ),
    )
    .orderBy(desc(opportunityEvent.createdAt));
  const communications = await db
    .select({ activity })
    .from(activity)
    .innerJoin(opportunity, eq(opportunity.id, activity.opportunityId))
    .where(
      and(
        eq(activity.organizationId, data.organization.id),
        eq(opportunity.companyId, companyId),
      ),
    )
    .orderBy(desc(activity.createdAt));
  return {
    company,
    activities: communications.map((row) => row.activity),
    partnerships: data.partnerships.filter((p) => p.companyId === companyId),
    previousOutreach: data.previousOutreach.filter(
      (o) => o.companyId === companyId,
    ),
    events: events.map((e) => e.opportunity_event),
  };
}
