import { lockWorkspace } from "../privacy/lock";
import { z } from "zod";
import { and, eq, desc } from "drizzle-orm";
import {
  db,
  organization,
  opportunity,
  assessment,
  opportunityReview,
} from "../../server/db";
import {
  workspaceContext,
  readWorkspaceData,
  assertReference,
  type Transaction,
} from "../records/service";
import { DomainError } from "../../server/errors";
import { companyPaths } from "../network/service";
import { isCurrentSource } from "./candidates";
import { writeAssessment } from "./service";
export const reviewInput = z
  .object({
    fitReviewed: z.literal(true),
    askReviewed: z.literal(true),
    targetReviewed: z.literal(true),
    nextActionReviewed: z.literal(true),
    fitValue: z.number().int().min(1).max(4),
    fitRationale: z.string().trim().min(12).max(2000),
    fitEvidenceIds: z.array(z.uuid()).max(30),
    fitSource: z.string().trim().max(1000).default(""),
    ask: z.string().trim().min(12).max(4000),
    contactRole: z.string().trim().max(500),
    targetPersonId: z.uuid().nullable().default(null),
    nextAction: z.string().trim().min(8).max(2000),
    approachMode: z.enum(["cold", "introduction"]),
    pathId: z.string().max(500).nullable().default(null),
  })
  .refine(
    (i) => i.targetPersonId || i.contactRole.length >= 3,
    "Review a relevant named contact or role.",
  )
  .refine(
    (i) => i.fitEvidenceIds.length || i.fitSource.length >= 12,
    "Supply reviewed fit evidence or an explicit organization assessment.",
  );
export async function reviewOpportunity(
  headers: Headers,
  id: string,
  raw: unknown,
) {
  z.uuid().parse(id);
  const input = reviewInput.parse(raw);
  const context = await workspaceContext(headers);
  return db.transaction(async (tx) => {
    await tx
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.id, context.organization.id))
      .for("update");
    await lockWorkspace(tx, context);
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
    const [latest] = await tx
      .select()
      .from(assessment)
      .where(eq(assessment.opportunityId, id))
      .orderBy(desc(assessment.version))
      .limit(1);
    if (!latest || latest.inputRevision !== record.inputRevision)
      throw new DomainError(
        "STALE_ASSESSMENT",
        "Recorded inputs changed. Regenerate before reviewing readiness.",
        409,
      );
    if (
      input.ask === latest.brief.ask &&
      latest.brief.ask.startsWith("Discuss support for ")
    )
      throw new DomainError(
        "CONCRETE_ASK_REQUIRED",
        "Replace the generic draft ask with the specific deliverable, scope or amount before marking ready.",
        409,
      );
    const data = await readWorkspaceData(tx, context);
    if (!data.needs.find((n) => n.id === record.needId && n.active))
      throw new DomainError(
        "INACTIVE_NEED",
        "This need is fulfilled or inactive.",
        409,
      );
    for (const sourceId of input.fitEvidenceIds) {
      await assertReference(tx, context.organization.id, "evidence", sourceId);
      if (!isCurrentSource(data.evidence.find((e) => e.id === sourceId)))
        throw new DomainError(
          "UNSUPPORTED_REVIEW",
          "Resolve future, disputed or superseded fit sources before marking ready.",
          409,
        );
    }
    for (const key of latest.humanFactorKeys.filter((k) => k !== "fit"))
      for (const sourceId of latest.factors[key].evidenceIds)
        if (!isCurrentSource(data.evidence.find((e) => e.id === sourceId)))
          throw new DomainError(
            "STALE_FACTOR_SOURCE",
            "A preserved human factor cites an unavailable source. Review that factor before readiness.",
            409,
          );
    if (input.targetPersonId) {
      await assertReference(
        tx,
        context.organization.id,
        "people",
        input.targetPersonId,
      );
      const today = new Date().toISOString().slice(0, 10);
      if (
        !data.relationships.some(
          (r) =>
            r.personId === input.targetPersonId &&
            r.companyId === record.companyId &&
            r.state === "current" &&
            r.kind !== "previously_worked_at" &&
            (!r.startDate || r.startDate <= today) &&
            (!r.endDate || r.endDate >= today) &&
            isCurrentSource(data.evidence.find((e) => e.id === r.evidenceId)),
        )
      )
        throw new DomainError(
          "TARGET_UNCONFIRMED",
          "A named company contact needs a supported current company connection. Use an explicitly reviewed role if the person is unconfirmed.",
          409,
        );
    }
    const paths = companyPaths(data, record.companyId);
    if (
      input.approachMode === "introduction" &&
      !paths.current.some(
        (p) => p.id === input.pathId && p.willingness !== "no",
      )
    )
      throw new DomainError(
        "ROUTE_UNAVAILABLE",
        "Select a permitted current recorded route, or review an explicit cold approach. Respect recorded refusals.",
        409,
      );
    if (input.approachMode === "introduction" && input.targetPersonId) {
      const selected = paths.current.find((p) => p.id === input.pathId);
      if (selected?.nodes.at(-2)?.id !== input.targetPersonId)
        throw new DomainError(
          "TARGET_ROUTE_MISMATCH",
          "The route reaches a different employee. A shared employer does not establish that employee knows your named target. Choose the explicit terminal contact, a role to verify, or a cold alternative.",
          409,
        );
    }
    const fit = {
      value: input.fitValue,
      rationale: input.fitRationale,
      origin: input.fitEvidenceIds.length
        ? ("human" as const)
        : ("organization" as const),
      evidenceIds: input.fitEvidenceIds,
      source:
        input.fitSource ||
        "Fit explicitly reviewed against the selected source records.",
    };
    const current = await writeAssessment(
      tx,
      context.organization.id,
      context.actor.id,
      id,
      {
        factors: { ...latest.factors, fit },
        humanFactorKeys: [
          ...new Set([...latest.humanFactorKeys, "fit" as const]),
        ],
        brief: latest.brief,
        inputRevision: latest.inputRevision,
        evidenceIds: [
          ...new Set([
            ...latest.brief.claims.flatMap((c) => c.evidenceIds),
            ...(latest.brief.path?.edges.flatMap((e) => e.evidenceIds) ?? []),
            ...Object.values(latest.factors).flatMap((f) => f.evidenceIds),
            ...input.fitEvidenceIds,
          ]),
        ],
      },
    );
    const briefRevision = record.revision + 1;
    await tx
      .update(opportunity)
      .set({
        manualBrief: {
          ...record.manualBrief,
          ask: input.ask,
          contactRole:
            input.contactRole ||
            record.manualBrief.contactRole ||
            latest.brief.contactRole,
          nextAction: input.nextAction,
          approach:
            input.approachMode === "cold"
              ? "Explicit cold approach. Verify the reviewed contact role and make the defined first request."
              : "Request an introduction through the reviewed recorded path. Reconfirm willingness for this request before any company outreach.",
        },
        reviewState: "ready_for_action",
        revision: briefRevision,
        updatedAt: new Date(),
      })
      .where(eq(opportunity.id, id));
    const [review] = await tx
      .insert(opportunityReview)
      .values({
        organizationId: context.organization.id,
        opportunityId: id,
        assessmentId: current.id,
        inputRevision: record.inputRevision,
        briefRevision,
        reviewedBy: context.actor.id,
        fitRationale: input.fitRationale,
        ask: input.ask,
        contactRole: input.contactRole,
        targetPersonId: input.targetPersonId,
        nextAction: input.nextAction,
        approachMode: input.approachMode,
        pathId: input.approachMode === "introduction" ? input.pathId : null,
      })
      .returning();
    return review;
  });
}
/** T-06 must call inside its transaction with the opportunity row locked. */
export async function assertOpportunityReady(
  tx: Transaction,
  record: typeof opportunity.$inferSelect,
) {
  const [latest] = await tx
    .select()
    .from(assessment)
    .where(eq(assessment.opportunityId, record.id))
    .orderBy(desc(assessment.version))
    .limit(1);
  const [review] = await tx
    .select()
    .from(opportunityReview)
    .where(eq(opportunityReview.opportunityId, record.id))
    .orderBy(desc(opportunityReview.reviewedAt))
    .limit(1);
  if (
    record.reviewState !== "ready_for_action" ||
    !latest ||
    !review ||
    review.assessmentId !== latest.id ||
    review.inputRevision !== record.inputRevision ||
    latest.inputRevision !== record.inputRevision ||
    review.briefRevision !== record.revision
  )
    throw new DomainError(
      "REVIEW_REQUIRED",
      "Review current fit, concrete ask, target and next action before pursuing.",
      409,
    );
  return review;
}
/** T-05 verifies the gate; T-06 owns the remaining lifecycle and history transitions. */
export async function startPursuing(headers: Headers, id: string) {
  z.uuid().parse(id);
  const context = await workspaceContext(headers);
  return db.transaction(async (tx) => {
    await tx
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.id, context.organization.id))
      .for("update");
    await lockWorkspace(tx, context);
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
    if (!["suggested", "shortlisted", "pursuing"].includes(record.state))
      throw new DomainError(
        "INVALID_TRANSITION",
        "Review the recorded outcome before reopening this proposal.",
        409,
      );
    await assertOpportunityReady(tx, record);
    const [updated] = await tx
      .update(opportunity)
      .set({ state: "pursuing", updatedAt: new Date() })
      .where(eq(opportunity.id, id))
      .returning();
    return updated;
  });
}
