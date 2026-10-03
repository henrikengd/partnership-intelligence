import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import * as t from "../../server/db";
import { readConfig } from "../../server/config";
import { requireAdmin } from "../../server/auth/access";
import { DomainError } from "../../server/errors";
import { workspaceContext, type Transaction } from "../records/service";
import { lockWorkspace } from "./lock";
import { privacySnapshot } from "./snapshot";
import { deletionPlan } from "./plan";
const removed = "Personal narrative removed by an administrator.";
const tokenSchema = z.object({
  actorId: z.uuid(),
  orgId: z.uuid(),
  personId: z.uuid(),
  digest: z.string().length(64),
  revision: z.number().int(),
  expires: z.number(),
  requestId: z.uuid(),
});
function signature(data: string) {
  return createHmac("sha256", readConfig().BETTER_AUTH_SECRET)
    .update(`privacy-preview:v1:${data}`)
    .digest("base64url");
}
function seal(payload: z.infer<typeof tokenSchema>) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${signature(data)}`;
}
function unseal(token: string) {
  const [data, provided] = token.split(".");
  const expected = signature(data ?? "");
  if (
    !provided ||
    Buffer.byteLength(provided) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
  )
    throw new DomainError(
      "INVALID_PREVIEW",
      "Load a valid deletion preview first.",
      409,
    );
  try {
    return tokenSchema.parse(
      JSON.parse(Buffer.from(data, "base64url").toString()),
    );
  } catch {
    throw new DomainError(
      "INVALID_PREVIEW",
      "Load a valid deletion preview first.",
      409,
    );
  }
}
async function adminContext(headers: Headers) {
  await requireAdmin(headers);
  return workspaceContext(headers);
}
export async function assertPrivacyAdmin(tx: Transaction, actorId: string) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(70411001)`);
  const actor = await tx.query.user.findFirst({
    where: eq(t.user.id, actorId),
  });
  if (!actor?.active || actor.role !== "admin")
    throw new DomainError(
      "FORBIDDEN",
      "Administrator access is required.",
      403,
    );
}
export async function getPrivacySettings(headers: Headers) {
  const c = await adminContext(headers);
  return {
    people: await t.db
      .select({ id: t.person.id, name: t.person.name })
      .from(t.person)
      .where(eq(t.person.organizationId, c.organization.id)),
    privacyRevision: c.organization.privacyRevision,
  };
}
export async function previewPersonDeletion(
  headers: Headers,
  personId: string,
) {
  z.uuid().parse(personId);
  const c = await adminContext(headers);
  return t.db.transaction(async (tx) => {
    await assertPrivacyAdmin(tx, c.actor.id);
    await lockWorkspace(tx, c);
    const p = deletionPlan(await privacySnapshot(tx, c), personId);
    const expires = Date.now() + 10 * 60 * 1000;
    return {
      person: { id: p.person.id, name: p.person.name },
      counts: p.counts,
      expiresAt: new Date(expires).toISOString(),
      token: seal({
        actorId: c.actor.id,
        orgId: c.organization.id,
        personId,
        digest: p.digest,
        revision: c.organization.privacyRevision,
        expires,
        requestId: randomUUID(),
      }),
      notice:
        "Related generated history and narrative will be removed. All pending imports will be cancelled. Structured partnership/outcome history stays. Separately retained backups and downloaded exports are unaffected.",
    };
  });
}
export async function confirmPersonDeletion(headers: Headers, raw: unknown) {
  const input = z
    .object({ token: z.string().max(4096), confirmed: z.literal(true) })
    .parse(raw);
  const c = await adminContext(headers);
  const p = unseal(input.token);
  if (
    p.actorId !== c.actor.id ||
    p.orgId !== c.organization.id ||
    p.expires < Date.now()
  )
    throw new DomainError(
      "INVALID_PREVIEW",
      "The deletion preview expired or belongs to another administrator.",
      409,
    );
  return t.db.transaction(async (tx) => {
    await assertPrivacyAdmin(tx, c.actor.id);
    await lockWorkspace(tx, c);
    const replay = await tx.query.auditEvent.findFirst({
      where: and(
        eq(t.auditEvent.organizationId, c.organization.id),
        eq(t.auditEvent.requestId, p.requestId),
      ),
    });
    if (replay) return { counts: replay.counts, deleted: true };
    if (c.organization.privacyRevision !== p.revision)
      throw new DomainError(
        "STALE_PREVIEW",
        "Private data changed. Review a fresh deletion preview.",
        409,
      );
    const s = await privacySnapshot(tx, c);
    const plan = deletionPlan(s, p.personId);
    if (plan.digest !== p.digest)
      throw new DomainError(
        "STALE_PREVIEW",
        "Deletion impact changed. Review a fresh preview.",
        409,
      );
    const ops = [...plan.opportunityIds],
      sources = [...plan.evidenceIds];
    if (ops.length) {
      await tx.delete(t.aiRun).where(inArray(t.aiRun.opportunityId, ops));
      await tx
        .update(t.opportunityEvent)
        .set({ reviewId: null, reason: removed, source: removed })
        .where(inArray(t.opportunityEvent.opportunityId, ops));
      await tx
        .delete(t.opportunityReview)
        .where(inArray(t.opportunityReview.opportunityId, ops));
      await tx
        .delete(t.assessment)
        .where(inArray(t.assessment.opportunityId, ops));
      await tx
        .update(t.opportunity)
        .set({
          manualBrief: {},
          reviewState: "needs_review",
          revision: sql`${t.opportunity.revision}+1`,
          inputRevision: sql`${t.opportunity.inputRevision}+1`,
          updatedAt: new Date(),
        })
        .where(inArray(t.opportunity.id, ops));
      await tx
        .update(t.activity)
        .set({
          description: removed,
          targetRole: "Target details removed during privacy deletion",
          revision: sql`${t.activity.revision}+1`,
          updatedAt: new Date(),
        })
        .where(inArray(t.activity.opportunityId, ops));
    }
    await tx
      .update(t.activity)
      .set({ targetPersonId: null })
      .where(eq(t.activity.targetPersonId, p.personId));
    for (const row of s.data.previousOutreach)
      if (plan.companyIds.has(row.companyId) || plan.contains(row))
        await tx
          .update(t.previousOutreach)
          .set({
            personId: row.personId === p.personId ? null : row.personId,
            description: removed,
            source: removed,
            contactRole: "Target details removed during privacy deletion",
            revision: sql`${t.previousOutreach.revision}+1`,
          })
          .where(eq(t.previousOutreach.id, row.id));
    for (const row of s.data.partnerships)
      if (plan.companyIds.has(row.companyId) || plan.contains(row))
        await tx
          .update(t.partnership)
          .set({
            title: "Recorded partnership contribution",
            description: removed,
            sourceId: null,
            evidenceId:
              row.evidenceId && plan.evidenceIds.has(row.evidenceId)
                ? null
                : row.evidenceId,
            revision: sql`${t.partnership.revision}+1`,
          })
          .where(eq(t.partnership.id, row.id));
    for (const b of s.imports)
      await tx
        .update(t.importBatch)
        .set({
          ...(b.status === "pending"
            ? { status: "cancelled", rows: [] }
            : { rows: [] }),
          mappings: b.mappings.filter(
            (m) => !plan.scrubbedRecordIds.has(m.recordId),
          ),
          updatedAt: new Date(),
        })
        .where(eq(t.importBatch.id, b.id));
    for (const run of s.runs)
      if (
        run.selection.companyIds.some((id) => plan.companyIds.has(id)) ||
        plan.contains(run)
      )
        await tx.delete(t.generationRun).where(eq(t.generationRun.id, run.id));
    if (sources.length) {
      await tx
        .update(t.evidence)
        .set({
          claim: removed,
          excerpt: "",
          url: null,
          sourceType: "observation",
          attribution: removed,
          reviewState: "superseded",
          reviewDate: null,
          revision: sql`${t.evidence.revision}+1`,
        })
        .where(inArray(t.evidence.id, sources));
      await tx
        .update(t.capability)
        .set({
          description: removed,
          revision: sql`${t.capability.revision}+1`,
        })
        .where(inArray(t.capability.evidenceId, sources));
      await tx
        .update(t.companyNeedIncentive)
        .set({
          description: removed,
          revision: sql`${t.companyNeedIncentive.revision}+1`,
        })
        .where(inArray(t.companyNeedIncentive.evidenceId, sources));
    }
    for (const r of s.data.relationships)
      if (
        !plan.relationshipIds.has(r.id) &&
        (plan.evidenceIds.has(r.evidenceId) || plan.contains(r))
      )
        await tx
          .update(t.relationship)
          .set({
            title: "",
            strength: null,
            willingness: "unknown",
            willingnessDate: null,
            willingnessSource: null,
            sourceId: null,
            revision: sql`${t.relationship.revision}+1`,
          })
          .where(eq(t.relationship.id, r.id));
    for (const row of s.data.people)
      if (row.id !== p.personId && plan.contains(row.notes))
        await tx
          .update(t.person)
          .set({ notes: removed, revision: sql`${t.person.revision}+1` })
          .where(eq(t.person.id, row.id));
    for (const row of s.data.needs)
      if (plan.contains(row))
        await tx
          .update(t.need)
          .set({
            title: plan.contains(row.title) ? "Organizational need" : row.title,
            description: removed,
            revision: sql`${t.need.revision}+1`,
          })
          .where(eq(t.need.id, row.id));
    for (const row of s.data.companies)
      if (plan.contains(row))
        await tx
          .update(t.company)
          .set({
            name: plan.contains(row.name) ? "Partner organization" : row.name,
            description: removed,
            sourceId: null,
            website: plan.contains(row.website) ? null : row.website,
            domain: plan.contains(row.domain) ? null : row.domain,
            revision: sql`${t.company.revision}+1`,
          })
          .where(eq(t.company.id, row.id));
    await tx.delete(t.person).where(eq(t.person.id, p.personId));
    await tx
      .update(t.organization)
      .set({
        privacyRevision: sql`${t.organization.privacyRevision}+1`,
        updatedAt: new Date(),
        ...(plan.contains(c.organization.name)
          ? { name: "Organization profile" }
          : {}),
        ...(plan.contains(c.organization.location) ? { location: "" } : {}),
        ...(plan.contains(c.organization.type) ? { type: "other" } : {}),
        ...(plan.contains(c.organization.website) ? { website: null } : {}),
        ...(plan.contains(c.organization.mission) ? { mission: removed } : {}),
      })
      .where(eq(t.organization.id, c.organization.id));
    const [audit] = await tx
      .insert(t.auditEvent)
      .values({
        organizationId: c.organization.id,
        actorId: c.actor.id,
        action: "person_deleted",
        targetId: p.personId,
        requestId: p.requestId,
        counts: plan.counts,
      })
      .returning();
    return { deleted: true, counts: audit.counts };
  });
}
export async function purgePrivateRetention(headers: Headers) {
  const c = await adminContext(headers);
  return t.db.transaction(async (tx) => {
    await assertPrivacyAdmin(tx, c.actor.id);
    await lockWorkspace(tx, c);
    const now = new Date();
    const expired = await tx
      .update(t.importBatch)
      .set({ rows: [], status: "expired", updatedAt: now })
      .where(
        and(
          eq(t.importBatch.organizationId, c.organization.id),
          eq(t.importBatch.status, "pending"),
          sql`${t.importBatch.expiresAt} <= ${now}`,
        ),
      )
      .returning({ id: t.importBatch.id });
    const counts = { expiredImports: expired.length };
    await tx.insert(t.auditEvent).values({
      organizationId: c.organization.id,
      actorId: c.actor.id,
      action: "retention_purged",
      requestId: randomUUID(),
      counts,
    });
    return { counts };
  });
}
