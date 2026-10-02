import { and, eq, sql } from "drizzle-orm";
import {
  db,
  organization,
  need,
  person,
  affiliation,
  company,
  evidence,
  capability,
  relationship,
  opportunity,
  user,
} from "../../server/db";
import { requireActor } from "../../server/auth/access";
import { DomainError } from "../../server/errors";
import {
  needInput,
  personInput,
  companyInput,
  evidenceInput,
  capabilityInput,
  relationshipInput,
  type RecordKind,
} from "./validation";
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function workspaceContext(headers: Headers) {
  const actor = await requireActor(headers);
  const org = await db.query.organization.findFirst();
  if (!org)
    throw new DomainError(
      "PROFILE_REQUIRED",
      "An administrator must save the organization profile first.",
      409,
    );
  return { actor, organization: org };
}
export async function getWorkspaceData(headers: Headers) {
  const context = await workspaceContext(headers);
  return readWorkspaceData(db, context);
}
export async function readWorkspaceData(
  connection: typeof db | Transaction,
  { actor, organization: org }: Awaited<ReturnType<typeof workspaceContext>>,
) {
  // A transaction uses one pg client; execute sequentially rather than queueing concurrent queries.
  const needs = await connection
    .select()
    .from(need)
    .where(eq(need.organizationId, org.id));
  const people = await connection
    .select()
    .from(person)
    .where(eq(person.organizationId, org.id));
  const affiliations = await connection
    .select()
    .from(affiliation)
    .where(eq(affiliation.organizationId, org.id));
  const companies = await connection
    .select()
    .from(company)
    .where(eq(company.organizationId, org.id));
  const evidences = await connection
    .select()
    .from(evidence)
    .where(eq(evidence.organizationId, org.id));
  const capabilities = await connection
    .select()
    .from(capability)
    .where(eq(capability.organizationId, org.id));
  const relationships = await connection
    .select()
    .from(relationship)
    .where(eq(relationship.organizationId, org.id));
  const opportunities = await connection
    .select()
    .from(opportunity)
    .where(eq(opportunity.organizationId, org.id));
  const owners = await connection
    .select({ id: user.id, name: user.name, role: user.role })
    .from(user)
    .where(eq(user.active, true));
  return {
    actor,
    organization: org,
    needs,
    people,
    affiliations,
    companies,
    evidence: evidences,
    capabilities,
    relationships,
    opportunities,
    owners,
  };
}
export type WorkspaceData = Awaited<ReturnType<typeof getWorkspaceData>>;
export async function assertReference(
  tx: Transaction,
  orgId: string,
  kind: "people" | "companies" | "evidence" | "needs" | "opportunities",
  id: string,
) {
  const record =
    kind === "people"
      ? await tx.query.person.findFirst({
          where: and(eq(person.id, id), eq(person.organizationId, orgId)),
        })
      : kind === "companies"
        ? await tx.query.company.findFirst({
            where: and(eq(company.id, id), eq(company.organizationId, orgId)),
          })
        : kind === "evidence"
          ? await tx.query.evidence.findFirst({
              where: and(
                eq(evidence.id, id),
                eq(evidence.organizationId, orgId),
              ),
            })
          : kind === "needs"
            ? await tx.query.need.findFirst({
                where: and(eq(need.id, id), eq(need.organizationId, orgId)),
              })
            : await tx.query.opportunity.findFirst({
                where: and(
                  eq(opportunity.id, id),
                  eq(opportunity.organizationId, orgId),
                ),
              });
  if (!record)
    throw new DomainError(
      "INVALID_REFERENCE",
      `The referenced ${kind} record does not exist in this workspace.`,
      400,
    );
}
export async function invalidateAssessments(tx: Transaction, orgId: string) {
  await tx
    .update(opportunity)
    .set({
      reviewState: "needs_review",
      inputRevision: sql`${opportunity.inputRevision}+1`,
      updatedAt: new Date(),
    })
    .where(eq(opportunity.organizationId, orgId));
}
export async function saveRecord(
  headers: Headers,
  kind: RecordKind,
  raw: unknown,
) {
  const { actor, organization: org } = await workspaceContext(headers);
  return db.transaction(async (tx) => {
    await tx
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.id, org.id))
      .for("update");
    const base = {
      organizationId: org.id,
      recordedBy: actor.id,
      updatedAt: new Date(),
    };
    switch (kind) {
      case "needs": {
        const { id, ...input } = needInput.parse(raw);
        if (id) await assertReference(tx, org.id, "needs", id);
        const [record] = id
          ? await tx
              .update(need)
              .set({
                ...input,
                updatedAt: base.updatedAt,
                revision: sql`${need.revision}+1`,
              })
              .where(eq(need.id, id))
              .returning()
          : await tx
              .insert(need)
              .values({ ...input, ...base })
              .returning();
        await invalidateAssessments(tx, org.id);
        return record;
      }
      case "companies": {
        const { id, ...input } = companyInput.parse(raw);
        if (id) await assertReference(tx, org.id, "companies", id);
        const [record] = id
          ? await tx
              .update(company)
              .set({
                ...input,
                updatedAt: base.updatedAt,
                revision: sql`${company.revision}+1`,
              })
              .where(eq(company.id, id))
              .returning()
          : await tx
              .insert(company)
              .values({ ...input, ...base })
              .returning();
        await invalidateAssessments(tx, org.id);
        return record;
      }
      case "people": {
        const {
          id,
          roles,
          affiliationState,
          affiliationStartDate,
          affiliationEndDate,
          ...input
        } = personInput.parse(raw);
        if (id) await assertReference(tx, org.id, "people", id);
        const [record] = id
          ? await tx
              .update(person)
              .set({
                ...input,
                updatedAt: base.updatedAt,
                revision: sql`${person.revision}+1`,
              })
              .where(eq(person.id, id))
              .returning()
          : await tx
              .insert(person)
              .values({ ...input, ...base })
              .returning();
        await tx.delete(affiliation).where(eq(affiliation.personId, record.id));
        await tx.insert(affiliation).values(
          [...new Set(roles)].map((role) => ({
            ...base,
            personId: record.id,
            role,
            state: affiliationState,
            startDate: affiliationStartDate,
            endDate: affiliationEndDate,
          })),
        );
        await invalidateAssessments(tx, org.id);
        return record;
      }
      case "evidence": {
        const { id, ...input } = evidenceInput.parse(raw);
        if (id) await assertReference(tx, org.id, "evidence", id);
        const [record] = id
          ? await tx
              .update(evidence)
              .set({
                ...input,
                updatedAt: base.updatedAt,
                revision: sql`${evidence.revision}+1`,
              })
              .where(eq(evidence.id, id))
              .returning()
          : await tx
              .insert(evidence)
              .values({ ...input, ...base })
              .returning();
        await invalidateAssessments(tx, org.id);
        return record;
      }
      case "capabilities": {
        const { id, ...input } = capabilityInput.parse(raw);
        await assertReference(tx, org.id, "companies", input.companyId);
        await assertReference(tx, org.id, "evidence", input.evidenceId);
        if (
          id &&
          !(await tx.query.capability.findFirst({
            where: and(
              eq(capability.id, id),
              eq(capability.organizationId, org.id),
            ),
          }))
        )
          throw new DomainError("NOT_FOUND", "Capability not found.", 404);
        const [record] = id
          ? await tx
              .update(capability)
              .set({
                ...input,
                updatedAt: base.updatedAt,
                revision: sql`${capability.revision}+1`,
              })
              .where(eq(capability.id, id))
              .returning()
          : await tx
              .insert(capability)
              .values({ ...input, ...base })
              .returning();
        await invalidateAssessments(tx, org.id);
        return record;
      }
      case "relationships": {
        const { id, ...input } = relationshipInput.parse(raw);
        await assertReference(tx, org.id, "people", input.personId);
        if (input.targetPersonId)
          await assertReference(tx, org.id, "people", input.targetPersonId);
        if (input.companyId)
          await assertReference(tx, org.id, "companies", input.companyId);
        await assertReference(tx, org.id, "evidence", input.evidenceId);
        if (
          id &&
          !(await tx.query.relationship.findFirst({
            where: and(
              eq(relationship.id, id),
              eq(relationship.organizationId, org.id),
            ),
          }))
        )
          throw new DomainError("NOT_FOUND", "Relationship not found.", 404);
        const [record] = id
          ? await tx
              .update(relationship)
              .set({
                ...input,
                updatedAt: base.updatedAt,
                revision: sql`${relationship.revision}+1`,
              })
              .where(eq(relationship.id, id))
              .returning()
          : await tx
              .insert(relationship)
              .values({ ...input, ...base })
              .returning();
        await invalidateAssessments(tx, org.id);
        return record;
      }
    }
  });
}
