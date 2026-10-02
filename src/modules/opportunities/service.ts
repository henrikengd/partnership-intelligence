import { and, eq, desc, sql } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  organization,
  opportunity,
  assessment,
  assessmentEvidence,
  user,
} from "../../server/db";
import {
  workspaceContext,
  readWorkspaceData,
  assertReference,
  type Transaction,
} from "../records/service";
import { DomainError } from "../../server/errors";
import { buildDeterministicAssessment } from "./generate";
import { calculatePriority, factorsSchema, rubric } from "./scoring";
import type { AssessmentInput } from "./contracts";
const candidateSchema = z.object({
  needId: z.uuid(),
  companyId: z.uuid(),
  partnershipType: z.string().trim().min(1).max(120),
});
async function writeAssessment(
  tx: Transaction,
  orgId: string,
  actorId: string,
  opportunityId: string,
  input: AssessmentInput,
) {
  const [previous] = await tx
    .select({ version: assessment.version })
    .from(assessment)
    .where(eq(assessment.opportunityId, opportunityId))
    .orderBy(desc(assessment.version))
    .limit(1);
  const score = calculatePriority(input.factors);
  const [record] = await tx
    .insert(assessment)
    .values({
      organizationId: orgId,
      recordedBy: actorId,
      opportunityId,
      version: (previous?.version ?? 0) + 1,
      inputRevision: input.inputRevision,
      factors: input.factors,
      brief: input.brief,
      priority: String(score.priority),
      coverage: score.coverage,
    })
    .returning();
  if (input.evidenceIds.length)
    await tx.insert(assessmentEvidence).values(
      [...new Set(input.evidenceIds)].map((evidenceId) => ({
        assessmentId: record.id,
        evidenceId,
      })),
    );
  return record;
}
export async function generateOpportunity(headers: Headers, raw: unknown) {
  const context = await workspaceContext(headers);
  const input = candidateSchema.parse(raw);
  return db.transaction(async (tx) => {
    await tx
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.id, context.organization.id))
      .for("update");
    const data = await readWorkspaceData(tx, context);
    const existing = data.opportunities.find(
      (o) =>
        o.needId === input.needId &&
        o.companyId === input.companyId &&
        o.partnershipType === input.partnershipType &&
        !["declined", "archived"].includes(o.state),
    );
    const generated = buildDeterministicAssessment(
      data,
      input.needId,
      input.companyId,
      existing?.inputRevision ?? 1,
    );
    const record =
      existing ??
      (
        await tx
          .insert(opportunity)
          .values({
            ...input,
            organizationId: context.organization.id,
            recordedBy: context.actor.id,
          })
          .returning()
      )[0];
    await writeAssessment(
      tx,
      context.organization.id,
      context.actor.id,
      record.id,
      generated,
    );
    await tx
      .update(opportunity)
      .set({ reviewState: "needs_review", updatedAt: new Date() })
      .where(eq(opportunity.id, record.id));
    return { id: record.id };
  });
}
export async function getOpportunityDetail(headers: Headers, id: string) {
  z.uuid().parse(id);
  const context = await workspaceContext(headers);
  const data = await readWorkspaceData(db, context);
  const record = data.opportunities.find((o) => o.id === id);
  if (!record)
    throw new DomainError("NOT_FOUND", "Opportunity not found.", 404);
  const versions = await db
    .select()
    .from(assessment)
    .where(eq(assessment.opportunityId, id))
    .orderBy(desc(assessment.version));
  if (!versions[0])
    throw new DomainError(
      "ASSESSMENT_MISSING",
      "No assessment is available. Generate a brief first.",
      409,
    );
  const activities = await db.query.activity.findMany({
    where: (a, { eq }) => eq(a.opportunityId, id),
    orderBy: (a, { desc }) => desc(a.createdAt),
  });
  const latest = versions[0];
  return {
    record,
    latest,
    versions,
    activities,
    data,
    brief: { ...latest.brief, ...record.manualBrief },
    score: calculatePriority(latest.factors),
  };
}
const manualInput = z.object({
  ownerId: z.uuid().nullable(),
  ask: z.string().trim().min(1).max(4000),
  valueExchange: z.string().trim().min(1).max(4000),
  contactRole: z.string().trim().min(1).max(500),
  nextAction: z.string().trim().min(1).max(2000),
  approach: z.string().trim().min(1).max(4000),
});
export async function editOpportunity(
  headers: Headers,
  id: string,
  raw: unknown,
) {
  z.uuid().parse(id);
  const context = await workspaceContext(headers);
  const { ownerId, ...manualBrief } = manualInput.parse(raw);
  return db.transaction(async (tx) => {
    await assertReference(tx, context.organization.id, "opportunities", id);
    if (
      ownerId &&
      !(await tx.query.user.findFirst({
        where: and(eq(user.id, ownerId), eq(user.active, true)),
      }))
    )
      throw new DomainError("INVALID_OWNER", "Assign an active team account.");
    const [record] = await tx
      .update(opportunity)
      .set({
        ownerId,
        manualBrief,
        revision: sql`${opportunity.revision}+1`,
        updatedAt: new Date(),
      })
      .where(eq(opportunity.id, id))
      .returning();
    return record;
  });
}
export async function reviewFactors(
  headers: Headers,
  id: string,
  raw: unknown,
) {
  z.uuid().parse(id);
  const context = await workspaceContext(headers);
  const input = factorsSchema.parse(raw);
  return db.transaction(async (tx) => {
    await tx
      .select({ id: organization.id })
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
    const [latest] = await tx
      .select()
      .from(assessment)
      .where(eq(assessment.opportunityId, id))
      .orderBy(desc(assessment.version))
      .limit(1);
    if (!latest)
      throw new DomainError(
        "ASSESSMENT_MISSING",
        "Generate the first assessment.",
        409,
      );
    const sources = new Set<string>();
    for (const factor of rubric) {
      const entry = input[factor.key];
      if (entry.origin === "deterministic")
        throw new DomainError(
          "INVALID_ORIGIN",
          "User-reviewed factors must record a human or organization origin.",
        );
      if (
        entry.value !== null &&
        !entry.evidenceIds.length &&
        !(entry.origin === "organization" && entry.source?.trim())
      )
        throw new DomainError(
          "SOURCE_REQUIRED",
          "Each known value needs evidence or an explicit organization assessment.",
        );
      for (const evidenceId of entry.evidenceIds) {
        await assertReference(
          tx,
          context.organization.id,
          "evidence",
          evidenceId,
        );
        sources.add(evidenceId);
      }
    }
    const current = await writeAssessment(
      tx,
      context.organization.id,
      context.actor.id,
      id,
      {
        factors: input,
        brief: latest.brief,
        evidenceIds: [
          ...sources,
          ...latest.brief.claims.flatMap((c) => c.evidenceIds),
          ...(latest.brief.path?.edges.flatMap((e) => e.evidenceIds) ?? []),
        ],
        inputRevision: record.inputRevision,
      },
    );
    await tx
      .update(opportunity)
      .set({ reviewState: "needs_review", updatedAt: new Date() })
      .where(eq(opportunity.id, id));
    return current;
  });
}
