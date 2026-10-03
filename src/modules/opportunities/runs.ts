import { lockWorkspace } from "../privacy/lock";
import { createHash } from "node:crypto";
import { z } from "zod";
import { and, eq, desc, sql } from "drizzle-orm";
import {
  db,
  organization,
  generationRun,
  companyNeedIncentive,
} from "../../server/db";
import {
  workspaceContext,
  readWorkspaceData,
  assertReference,
  invalidateAssessments,
} from "../records/service";
import { DomainError } from "../../server/errors";
import { candidatePreviews } from "./candidates";
import { generateInTransaction } from "./service";
import type { GenerationResult, GenerationSelection } from "./run-contracts";
export const runInput = z.object({
  needId: z.uuid(),
  companyIds: z
    .array(z.uuid())
    .min(1)
    .max(20)
    .refine(
      (ids) => new Set(ids).size === ids.length,
      "Select each company once.",
    )
    .optional(),
  partnershipType: z.string().trim().min(1).max(120).optional(),
  idempotencyKey: z.uuid(),
  refreshOpportunityId: z.uuid().optional(),
  allowNewAfterClosed: z.boolean().default(false),
  allowOngoingDiscussion: z.boolean().default(false),
});
function fingerprint(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
export async function getCandidatePreviews(headers: Headers, needId: string) {
  const context = await workspaceContext(headers);
  z.uuid().parse(needId);
  const data = await readWorkspaceData(db, context);
  const incentives = await db
    .select()
    .from(companyNeedIncentive)
    .where(
      and(
        eq(companyNeedIncentive.organizationId, context.organization.id),
        eq(companyNeedIncentive.needId, needId),
      ),
    );
  return candidatePreviews(data, needId, incentives);
}
export async function saveIncentive(headers: Headers, raw: unknown) {
  const input = z
    .object({
      needId: z.uuid(),
      companyId: z.uuid(),
      description: z.string().trim().min(1).max(2000),
      evidenceId: z.uuid(),
    })
    .parse(raw);
  const context = await workspaceContext(headers);
  return db.transaction(async (tx) => {
    await tx
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.id, context.organization.id))
      .for("update");
    await lockWorkspace(tx, context);
    for (const [kind, id] of [
      ["needs", input.needId],
      ["companies", input.companyId],
      ["evidence", input.evidenceId],
    ] as const)
      await assertReference(tx, context.organization.id, kind, id);
    const [record] = await tx
      .insert(companyNeedIncentive)
      .values({
        ...input,
        organizationId: context.organization.id,
        recordedBy: context.actor.id,
      })
      .returning();
    await invalidateAssessments(tx, context.organization.id);
    return record;
  });
}
export async function listGenerationRuns(headers: Headers) {
  const context = await workspaceContext(headers);
  return db
    .select()
    .from(generationRun)
    .where(eq(generationRun.organizationId, context.organization.id))
    .orderBy(desc(generationRun.createdAt))
    .limit(30);
}
async function executeRun(
  context: Awaited<ReturnType<typeof workspaceContext>>,
  id: string,
) {
  try {
    return await db.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL statement_timeout = '20000'`);
      await tx
        .select({ id: organization.id })
        .from(organization)
        .where(eq(organization.id, context.organization.id))
        .for("update");
      await lockWorkspace(tx, context);
      const [run] = await tx
        .select()
        .from(generationRun)
        .where(
          and(
            eq(generationRun.id, id),
            eq(generationRun.organizationId, context.organization.id),
          ),
        )
        .for("update");
      if (!run)
        throw new DomainError("NOT_FOUND", "Generation run not found.", 404);
      if (run.status !== "running") return run;
      const data = await readWorkspaceData(tx, context);
      const need = data.needs.find((n) => n.id === run.needId && n.active);
      if (!need)
        throw new DomainError(
          "INACTIVE_NEED",
          "The need is no longer active.",
          409,
        );
      const results: GenerationResult[] = [];
      const legacy =
        (
          data as typeof data & {
            previousOutreach?: { companyId: string; outcome: string }[];
          }
        ).previousOutreach ?? [];
      for (const companyId of run.selection.companyIds) {
        const discussions = data.opportunities.filter(
          (o) =>
            o.companyId === companyId &&
            ["pursuing", "agreed"].includes(o.state),
        );
        const exactDiscussion = discussions.find(
          (o) =>
            o.needId === run.needId &&
            o.partnershipType === run.selection.partnershipType,
        );
        const discussion = exactDiscussion ?? discussions[0];
        const sameTuple = Boolean(exactDiscussion);
        if (
          (discussion &&
            discussion.id !== run.selection.refreshOpportunityId &&
            (sameTuple || !run.selection.allowOngoingDiscussion)) ||
          legacy.some(
            (h) =>
              h.companyId === companyId &&
              h.outcome === "in_discussion" &&
              !run.selection.refreshOpportunityId &&
              !run.selection.allowOngoingDiscussion,
          )
        ) {
          results.push({
            companyId,
            opportunityId: discussion?.id ?? null,
            status: "skipped",
            reason:
              "An active discussion or agreement is recorded. Review it rather than creating duplicate work.",
          });
          continue;
        }
        const generated = await generateInTransaction(
          tx,
          context,
          data,
          {
            needId: run.needId,
            companyId,
            partnershipType: run.selection.partnershipType,
          },
          run.selection.allowNewAfterClosed,
        );
        results.push({
          companyId,
          opportunityId: generated.id,
          status: "generated",
          reason:
            "Generated from recorded inputs; human edits, factors and activity are preserved.",
        });
      }
      const [complete] = await tx
        .update(generationRun)
        .set({
          status: "completed",
          results,
          finishedAt: new Date(),
          errorCategory: null,
          inputRevision: need.revision,
        })
        .where(eq(generationRun.id, id))
        .returning();
      return complete;
    });
  } catch (error) {
    const category =
      error instanceof DomainError ? error.code : "GENERATION_FAILED";
    const [failed] = await db
      .update(generationRun)
      .set({
        status: "failed",
        errorCategory: category,
        finishedAt: new Date(),
      })
      .where(
        and(
          eq(generationRun.id, id),
          eq(generationRun.organizationId, context.organization.id),
          eq(generationRun.status, "running"),
        ),
      )
      .returning();
    if (failed) return failed;
    throw error;
  }
}
export async function startGenerationRun(headers: Headers, raw: unknown) {
  const context = await workspaceContext(headers);
  const input = runInput.parse(raw);
  const started = await db.transaction(async (tx) => {
    await tx
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.id, context.organization.id))
      .for("update");
    await lockWorkspace(tx, context);
    const requestFingerprint = fingerprint({
      ...input,
      companyIds: input.companyIds ? [...input.companyIds].sort() : null,
    });
    const [previous] = await tx
      .select()
      .from(generationRun)
      .where(
        and(
          eq(generationRun.organizationId, context.organization.id),
          eq(generationRun.idempotencyKey, input.idempotencyKey),
        ),
      );
    if (previous) {
      if (previous.requestFingerprint !== requestFingerprint)
        throw new DomainError(
          "IDEMPOTENCY_CONFLICT",
          "This request key was already used for a different selection.",
          409,
        );
      return { run: previous, created: false };
    }
    const data = await readWorkspaceData(tx, context);
    const need = data.needs.find((n) => n.id === input.needId && n.active);
    if (!need)
      throw new DomainError(
        "INACTIVE_NEED",
        "Select an active, unmet need.",
        409,
      );
    const incentives = await tx
      .select()
      .from(companyNeedIncentive)
      .where(
        and(
          eq(companyNeedIncentive.organizationId, context.organization.id),
          eq(companyNeedIncentive.needId, input.needId),
        ),
      );
    const previews = candidatePreviews(
      data,
      input.needId,
      incentives,
      input.companyIds,
    );
    const ids =
      input.companyIds ??
      previews
        .filter(
          (c) =>
            c.eligible &&
            !c.activeOpportunityIds.length &&
            !c.history.some((h) =>
              ["declined", "archived", "in_discussion", "agreed"].includes(
                h.state,
              ),
            ),
        )
        .slice(0, 20)
        .map((c) => c.companyId);
    if (!ids.length)
      throw new DomainError(
        "NO_CANDIDATES",
        "No eligible unattended candidates remain. Add evidence or explicitly select a known company after reviewing its gaps and history.",
        409,
      );
    for (const id of ids)
      await assertReference(tx, context.organization.id, "companies", id);
    if (
      !input.allowNewAfterClosed &&
      previews.some(
        (c) =>
          ids.includes(c.companyId) &&
          c.history.some((h) => ["declined", "archived"].includes(h.state)),
      )
    )
      throw new DomainError(
        "CLOSED_HISTORY",
        "Review recorded outcomes and explicitly allow a new linked proposal.",
        409,
      );
    if (input.refreshOpportunityId) {
      const record = data.opportunities.find(
        (o) => o.id === input.refreshOpportunityId,
      );
      if (
        !record ||
        ids.length !== 1 ||
        record.companyId !== ids[0] ||
        record.needId !== input.needId ||
        record.partnershipType !==
          (input.partnershipType ?? need.partnershipType) ||
        ["declined", "archived"].includes(record.state)
      )
        throw new DomainError(
          "INVALID_REFRESH",
          "Regeneration must target the same active proposal.",
          409,
        );
    }
    if (input.allowOngoingDiscussion && !input.companyIds)
      throw new DomainError(
        "EXPLICIT_SELECTION_REQUIRED",
        "Acknowledge ongoing discussions only for an explicit company selection.",
        409,
      );
    const selection: GenerationSelection = {
      needId: input.needId,
      companyIds: ids,
      partnershipType: input.partnershipType ?? need.partnershipType,
      allowNewAfterClosed: input.allowNewAfterClosed,
      allowOngoingDiscussion: input.allowOngoingDiscussion,
      ...(input.refreshOpportunityId
        ? { refreshOpportunityId: input.refreshOpportunityId }
        : {}),
    };
    const [run] = await tx
      .insert(generationRun)
      .values({
        organizationId: context.organization.id,
        requestedBy: context.actor.id,
        needId: input.needId,
        idempotencyKey: input.idempotencyKey,
        requestFingerprint,
        selection,
        inputRevision: need.revision,
      })
      .returning();
    return { run, created: true };
  });
  return started.created ? executeRun(context, started.run.id) : started.run;
}
export async function retryGenerationRun(headers: Headers, id: string) {
  z.uuid().parse(id);
  const context = await workspaceContext(headers);
  const retry = await db.transaction(async (tx) => {
    await tx
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.id, context.organization.id))
      .for("update");
    await lockWorkspace(tx, context);
    const [run] = await tx
      .select()
      .from(generationRun)
      .where(
        and(
          eq(generationRun.id, id),
          eq(generationRun.organizationId, context.organization.id),
        ),
      )
      .for("update");
    if (!run)
      throw new DomainError("NOT_FOUND", "Generation run not found.", 404);
    if (run.status === "completed") return { run, retry: false };
    if (run.status === "running")
      throw new DomainError(
        "RUN_IN_PROGRESS",
        "This run is already in progress. On a server restart its abandoned state becomes explicitly retryable.",
        409,
      );
    if (run.attempt >= 2)
      throw new DomainError(
        "RETRY_EXHAUSTED",
        "This run already used its one explicit retry. Resolve the failure, then start a new request from candidate selection.",
        409,
      );
    const [active] = await tx
      .update(generationRun)
      .set({
        status: "running",
        attempt: sql`${generationRun.attempt}+1`,
        startedAt: new Date(),
        finishedAt: null,
        errorCategory: null,
      })
      .where(eq(generationRun.id, id))
      .returning();
    return { run: active, retry: true };
  });
  return retry.retry ? executeRun(context, id) : retry.run;
}
