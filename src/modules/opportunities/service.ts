import { lockWorkspace } from "../privacy/lock";
import { and, eq, desc, sql } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  organization,
  opportunity,
  assessment,
  assessmentEvidence,
  user,
  companyNeedIncentive,
} from "../../server/db";
import {
  workspaceContext,
  readWorkspaceData,
  assertReference,
  type Transaction,
} from "../records/service";
import { isCurrentSource } from "./candidates";
import { DomainError } from "../../server/errors";
import { buildDeterministicAssessment } from "./generate";
import {
  calculatePriority,
  factorsSchema,
  rubric,
  type FactorKey,
} from "./scoring";
import type { AssessmentInput } from "./contracts";
const candidateSchema = z.object({
  needId: z.uuid(),
  companyId: z.uuid(),
  partnershipType: z.string().trim().min(1).max(120),
});
export async function writeAssessment(
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
      humanFactorKeys: input.humanFactorKeys ?? [],
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
export async function generateInTransaction(
  tx: Transaction,
  context: Awaited<ReturnType<typeof workspaceContext>>,
  data: Awaited<ReturnType<typeof readWorkspaceData>>,
  input: z.infer<typeof candidateSchema>,
  allowNewAfterClosed = true,
) {
  const existing = data.opportunities.find(
    (o) =>
      o.needId === input.needId &&
      o.companyId === input.companyId &&
      o.partnershipType === input.partnershipType &&
      !["declined", "archived"].includes(o.state),
  );
  const previous = data.opportunities
    .filter(
      (o) =>
        o.needId === input.needId &&
        o.companyId === input.companyId &&
        o.partnershipType === input.partnershipType &&
        ["declined", "archived"].includes(o.state),
    )
    .sort(
      (a, b) =>
        b.updatedAt.getTime() - a.updatedAt.getTime() ||
        a.id.localeCompare(b.id),
    )[0];
  if (!existing && previous && !allowNewAfterClosed)
    throw new DomainError(
      "CLOSED_HISTORY",
      "Review the previous outcome and explicitly allow a new linked proposal.",
      409,
    );
  const generated = buildDeterministicAssessment(
    data,
    input.needId,
    input.companyId,
    existing?.inputRevision ?? 1,
  );
  const incentives = await tx
    .select()
    .from(companyNeedIncentive)
    .where(
      and(
        eq(companyNeedIncentive.organizationId, context.organization.id),
        eq(companyNeedIncentive.companyId, input.companyId),
        eq(companyNeedIncentive.needId, input.needId),
      ),
    );
  for (const incentive of incentives) {
    const source = data.evidence.find((e) => e.id === incentive.evidenceId);
    if (!source) continue;
    generated.brief.claims.push({
      text: source.claim,
      evidenceIds: [source.id],
      status: source.reviewState as
        "supplied" | "reviewed" | "disputed" | "superseded",
    });
    generated.brief.inferences.push(
      `Team-recorded incentive alignment to review: ${incentive.description}`,
    );
    generated.evidenceIds.push(source.id);
    if (!isCurrentSource(source))
      generated.brief.questions.push(
        "The incentive source is future-dated, disputed or superseded. Resolve it before relying on current alignment.",
      );
  }
  generated.evidenceIds = [...new Set(generated.evidenceIds)];
  const record =
    existing ??
    (
      await tx
        .insert(opportunity)
        .values({
          ...input,
          organizationId: context.organization.id,
          recordedBy: context.actor.id,
          previousOpportunityId: previous?.id ?? null,
        })
        .returning()
    )[0];
  if (existing) {
    const [latest] = await tx
      .select()
      .from(assessment)
      .where(eq(assessment.opportunityId, record.id))
      .orderBy(desc(assessment.version))
      .limit(1);
    if (latest) {
      for (const key of latest.humanFactorKeys)
        generated.factors[key] = latest.factors[key];
      generated.humanFactorKeys = latest.humanFactorKeys;
      generated.evidenceIds = [
        ...new Set([
          ...generated.evidenceIds,
          ...latest.humanFactorKeys.flatMap(
            (key) => latest.factors[key].evidenceIds,
          ),
        ]),
      ];
    }
  }
  await writeAssessment(
    tx,
    context.organization.id,
    context.actor.id,
    record.id,
    generated,
  );
  const reviewState =
    generated.factors.fit.value === null || generated.factors.fit.value === 0
      ? "research_needed"
      : "needs_review";
  await tx
    .update(opportunity)
    .set({ reviewState, updatedAt: new Date() })
    .where(eq(opportunity.id, record.id));
  return { id: record.id };
}
export async function generateOpportunity(headers: Headers, raw: unknown) {
  await workspaceContext(headers);
  const input = candidateSchema
    .extend({
      idempotencyKey: z.uuid().optional(),
      refreshOpportunityId: z.uuid().optional(),
      allowNewAfterClosed: z.boolean().default(false),
    })
    .parse(raw);
  const { startGenerationRun } = await import("./runs");
  const run = await startGenerationRun(headers, {
    needId: input.needId,
    companyIds: [input.companyId],
    partnershipType: input.partnershipType,
    idempotencyKey: input.idempotencyKey ?? crypto.randomUUID(),
    allowNewAfterClosed: input.allowNewAfterClosed,
    ...(input.refreshOpportunityId
      ? { refreshOpportunityId: input.refreshOpportunityId }
      : {}),
  });
  if (run.status !== "completed")
    throw new DomainError(
      run.errorCategory ?? "RUN_IN_PROGRESS",
      "Generation did not complete. Review the saved run and retry explicitly.",
      409,
    );
  const id = run.results[0]?.opportunityId;
  if (!id || run.results[0]?.status === "skipped")
    throw new DomainError(
      "ONGOING_DISCUSSION",
      "A prior discussion already exists. Review the saved run; use an exact refresh or explicitly acknowledge a separate proposal in candidate selection.",
      409,
    );
  return { id, runId: run.id };
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
    reviews: await db.query.opportunityReview.findMany({
      where: (r, { eq }) => eq(r.opportunityId, id),
      orderBy: (r, { desc }) => desc(r.reviewedAt),
    }),
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
    await lockWorkspace(tx, context);
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
        reviewState: "needs_review",
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
        humanFactorKeys: rubric.map((f) => f.key) as FactorKey[],
        brief: latest.brief,
        evidenceIds: [
          ...sources,
          ...latest.brief.claims.flatMap((c) => c.evidenceIds),
          ...(latest.brief.path?.edges.flatMap((e) => e.evidenceIds) ?? []),
        ],
        // Reviewing factor values does not refresh the factual brief snapshot.
        inputRevision: latest.inputRevision,
      },
    );
    await tx
      .update(opportunity)
      .set({ reviewState: "needs_review", updatedAt: new Date() })
      .where(eq(opportunity.id, id));
    return current;
  });
}
