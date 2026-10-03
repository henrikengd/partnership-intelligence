import { lockWorkspace } from "../../modules/privacy/lock";
import { createHash } from "node:crypto";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  aiConfiguration,
  aiRun,
  organization,
  opportunity,
  assessment,
} from "../db";
import { requireAdmin } from "../auth/access";
import { workspaceContext } from "../../modules/records/service";
import { getOpportunityDetail } from "../../modules/opportunities/service";
import { companyPaths } from "../../modules/network/service";
import { DomainError } from "../errors";
import { AiError, packetSchema, type Provider } from "./contracts";
import { buildPacket, validatePacket, validateDraft } from "./context";
import { boundedCall, openAiProvider } from "./provider";
const hash = (v: unknown) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");
const inputSchema = z.strictObject({
  opportunityId: z.uuid(),
  packet: packetSchema,
  previewRevision: z.string().length(64),
  suggestedRole: z.string().trim().max(120).default(""),
  idempotencyKey: z.uuid(),
});
const settingsSchema = z.strictObject({
  enabled: z.boolean(),
  model: z
    .string()
    .trim()
    .max(120)
    .regex(/^[A-Za-z0-9._:/-]*$/),
});
export async function getAiSettings(headers: Headers) {
  const context = await workspaceContext(headers);
  const config = await db.query.aiConfiguration.findFirst({
    where: eq(aiConfiguration.organizationId, context.organization.id),
  });
  return {
    enabled: config?.enabled ?? false,
    model: config?.model ?? "",
    provider: "openai",
    credentialConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
    canConfigure: context.actor.role === "admin",
  };
}
export async function saveAiSettings(headers: Headers, raw: unknown) {
  const actor = await requireAdmin(headers);
  const context = await workspaceContext(headers);
  const input = settingsSchema.parse(raw);
  if (input.enabled && (!input.model || !process.env.OPENAI_API_KEY?.trim()))
    throw new DomainError(
      "AI_CONFIGURATION",
      "Set a server-side OPENAI_API_KEY and a supported model before enabling AI.",
    );
  await db.transaction(async (tx) => {
    await tx
      .select()
      .from(organization)
      .where(eq(organization.id, context.organization.id))
      .for("update");
    await tx
      .insert(aiConfiguration)
      .values({
        ...input,
        organizationId: context.organization.id,
        updatedBy: actor.id,
      })
      .onConflictDoUpdate({
        target: aiConfiguration.organizationId,
        set: { ...input, updatedBy: actor.id, updatedAt: new Date() },
      });
  });
  return getAiSettings(headers);
}
async function snapshot(
  headers: Headers,
  opportunityId: string,
  suggestedRole = "",
) {
  z.uuid().parse(opportunityId);
  const detail = await getOpportunityDetail(headers, opportunityId);
  const paths = companyPaths(detail.data, detail.record.companyId);
  const evidenceIds = [
    ...new Set([
      ...detail.latest.brief.claims.flatMap((c) => c.evidenceIds),
      ...paths.current.flatMap((p) => p.edges.flatMap((e) => e.evidenceIds)),
    ]),
  ];
  const built = buildPacket(
    detail.data,
    opportunityId,
    paths.current,
    evidenceIds,
    suggestedRole,
  );
  const previewRevision = hash({
    packet: built.packet,
    assessmentId: detail.latest.id,
    revision: detail.record.inputRevision,
  });
  return { ...built, previewRevision, detail };
}
export async function previewAiContext(
  headers: Headers,
  id: string,
  suggestedRole = "",
) {
  const result = await snapshot(headers, id, suggestedRole);
  return {
    packet: result.packet,
    previewRevision: result.previewRevision,
    settings: await getAiSettings(headers),
    localReferences: {
      people: Object.entries(result.referenceMap.people).map(([ref, id]) => ({
        ref,
        name:
          result.detail.data.people.find((p) => p.id === id)?.name ??
          "Person no longer available",
      })),
      routes: result.packet.routes.map((route) => {
        const id = result.referenceMap.routes[route.ref];
        const path = companyPaths(
          result.detail.data,
          result.detail.record.companyId,
        ).current.find((p) => p.id === id)!;
        return {
          ref: route.ref,
          label: path.nodes.map((node) => node.label).join(" → "),
          willingness: path.willingness,
        };
      }),
    },
  };
}
export async function listAiRuns(headers: Headers, opportunityId: string) {
  const current = await getOpportunityDetail(headers, opportunityId);
  const rows = await db
    .select()
    .from(aiRun)
    .where(
      and(
        eq(aiRun.organizationId, current.record.organizationId),
        eq(aiRun.opportunityId, opportunityId),
      ),
    )
    .orderBy(desc(aiRun.createdAt))
    .limit(12);
  const paths = companyPaths(current.data, current.record.companyId);
  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    attempt: r.attempt,
    errorCategory: r.errorCategory,
    draft: r.draft,
    createdAt: r.createdAt,
    stale:
      r.inputRevision !== current.record.inputRevision ||
      r.assessmentId !== current.latest.id,
    routeLabel: r.draft?.routeRef
      ? ([...paths.current, ...paths.historical]
          .find((p) => p.id === r.referenceMap.routes[r.draft!.routeRef!])
          ?.nodes.map((n) => n.label)
          .join(" → ") ??
        "Recorded route is no longer available; review the changed network.")
      : null,
    contactName: r.draft?.contact.personRef
      ? (current.data.people.find(
          (p) => p.id === r.referenceMap.people[r.draft!.contact.personRef!],
        )?.name ?? "Person no longer available")
      : null,
  }));
}
export async function startAiRun(
  headers: Headers,
  raw: unknown,
  dependencies: { provider?: Provider; timeoutMs?: number } = {},
) {
  return submit(headers, raw, null, dependencies);
}
export async function retryAiRun(
  headers: Headers,
  id: string,
  raw: unknown,
  dependencies: { provider?: Provider; timeoutMs?: number } = {},
) {
  z.uuid().parse(id);
  return submit(headers, raw, id, dependencies);
}
async function submit(
  headers: Headers,
  raw: unknown,
  retryId: string | null,
  dependencies: { provider?: Provider; timeoutMs?: number },
) {
  const input = inputSchema.parse(raw);
  const context = await workspaceContext(headers);
  const fresh = await snapshot(
    headers,
    input.opportunityId,
    input.suggestedRole,
  );
  if (["declined", "archived"].includes(fresh.detail.record.state))
    throw new DomainError(
      "AI_CLOSED_OPPORTUNITY",
      "Reopen the opportunity before drafting.",
      409,
    );
  if (input.previewRevision !== fresh.previewRevision)
    throw new DomainError(
      "STALE_CONTEXT",
      "Recorded inputs changed. Load and review a fresh packet.",
      409,
    );
  let packet;
  try {
    packet = validatePacket(
      input.packet,
      fresh.packet,
      fresh.detail.data.people,
    );
  } catch (e) {
    throw new DomainError(
      e instanceof AiError ? e.category : "INVALID_CONTEXT",
      "Check the packet: remove personal data, keep supplied references and metadata, and stay within 12,000 characters.",
    );
  }
  const fingerprint = hash(input);
  const started = await db.transaction(async (tx) => {
    await tx
      .select()
      .from(organization)
      .where(eq(organization.id, context.organization.id))
      .for("update");
    await lockWorkspace(tx, context);
    const [lockedOpportunity] = await tx
      .select()
      .from(opportunity)
      .where(eq(opportunity.id, input.opportunityId))
      .for("update");
    const latestAssessment = await tx.query.assessment.findFirst({
      where: eq(assessment.opportunityId, input.opportunityId),
      orderBy: (a, { desc }) => desc(a.version),
    });
    if (
      !lockedOpportunity ||
      lockedOpportunity.inputRevision !== fresh.detail.record.inputRevision ||
      latestAssessment?.id !== fresh.detail.latest.id
    )
      throw new DomainError(
        "STALE_CONTEXT",
        "Recorded inputs changed. Review a fresh packet.",
        409,
      );
    const config = await tx.query.aiConfiguration.findFirst({
      where: eq(aiConfiguration.organizationId, context.organization.id),
    });
    if (
      !config?.enabled ||
      !config.model ||
      !process.env.OPENAI_API_KEY?.trim()
    )
      throw new DomainError(
        "AI_DISABLED",
        "AI is disabled or lacks server configuration.",
        409,
      );
    const previous = await tx.query.aiRun.findFirst({
      where: retryId
        ? and(
            eq(aiRun.id, retryId),
            eq(aiRun.organizationId, context.organization.id),
          )
        : and(
            eq(aiRun.organizationId, context.organization.id),
            eq(aiRun.idempotencyKey, input.idempotencyKey),
          ),
    });
    if (retryId && !previous)
      throw new DomainError("NOT_FOUND", "AI run not found.", 404);
    if (previous) {
      const sameAction = previous.lastActionKey === input.idempotencyKey;
      if (sameAction) {
        if (previous.lastActionFingerprint !== fingerprint)
          throw new DomainError(
            "IDEMPOTENCY_CONFLICT",
            "This request key belongs to a different packet.",
            409,
          );
        return { run: previous, execute: false };
      }
      if (!retryId)
        throw new DomainError(
          "IDEMPOTENCY_CONFLICT",
          "This request key belongs to an existing run.",
          409,
        );
      if (
        previous.opportunityId !== input.opportunityId ||
        previous.status === "completed" ||
        previous.status === "running" ||
        previous.attempt >= 2
      )
        throw new DomainError(
          "AI_RETRY_UNAVAILABLE",
          "Only one explicit retry is available after a failed or interrupted request.",
          409,
        );
    }
    const active = await tx.query.aiRun.findFirst({
      where: and(
        eq(aiRun.organizationId, context.organization.id),
        eq(aiRun.status, "running"),
      ),
    });
    if (active)
      throw new DomainError(
        "AI_BUSY",
        "Another AI request is running. Wait for it to finish.",
        409,
      );
    const map = {
      ...fresh.referenceMap,
      evidence: Object.fromEntries(
        Object.entries(fresh.referenceMap.evidence).filter(([k]) =>
          packet.evidence.some((e) => e.ref === k),
        ),
      ),
      routes: Object.fromEntries(
        Object.entries(fresh.referenceMap.routes).filter(([k]) =>
          packet.routes.some((r) => r.ref === k),
        ),
      ),
    };
    const values = {
      organizationId: context.organization.id,
      opportunityId: input.opportunityId,
      assessmentId: fresh.detail.latest.id,
      requestedBy: context.actor.id,
      inputRevision: fresh.detail.record.inputRevision,
      lastActionKey: input.idempotencyKey,
      lastActionFingerprint: fingerprint,
      status: "running",
      packet,
      referenceMap: map,
      model: config.model,
      configRevision: config.updatedAt,
      startedAt: new Date(),
      finishedAt: null,
      errorCategory: null,
    };
    const [run] = previous
      ? await tx
          .update(aiRun)
          .set({ ...values, attempt: previous.attempt + 1 })
          .where(eq(aiRun.id, previous.id))
          .returning()
      : await tx
          .insert(aiRun)
          .values({
            ...values,
            idempotencyKey: input.idempotencyKey,
            requestFingerprint: fingerprint,
          })
          .returning();
    return { run, execute: true };
  });
  if (!started.execute)
    return { id: started.run.id, status: started.run.status };
  const run = started.run;
  const condition = and(
    eq(aiRun.id, run.id),
    eq(aiRun.status, "running"),
    eq(aiRun.attempt, run.attempt),
  );
  async function finish(values: {
    status: string;
    draft?: typeof aiRun.$inferSelect.draft;
    errorCategory?: string;
    finishedAt: Date;
  }) {
    await db.transaction(async (tx) => {
      await tx
        .select()
        .from(organization)
        .where(eq(organization.id, run.organizationId))
        .for("update");
      const [op] = await tx
        .select()
        .from(opportunity)
        .where(eq(opportunity.id, run.opportunityId))
        .for("update");
      const [present] = await tx
        .select()
        .from(aiRun)
        .where(eq(aiRun.id, run.id))
        .for("update");
      if (
        !present ||
        present.status !== "running" ||
        present.attempt !== run.attempt
      )
        return;
      if (values.status === "completed") {
        const latest = await tx.query.assessment.findFirst({
          where: eq(assessment.opportunityId, run.opportunityId),
          orderBy: (a, { desc }) => desc(a.version),
        });
        const config = await tx.query.aiConfiguration.findFirst({
          where: eq(aiConfiguration.organizationId, run.organizationId),
        });
        if (
          !op ||
          op.inputRevision !== run.inputRevision ||
          latest?.id !== run.assessmentId ||
          !config?.enabled ||
          config.updatedAt.getTime() !== run.configRevision.getTime()
        )
          values = {
            status: "failed",
            errorCategory: "INPUT_CHANGED",
            finishedAt: new Date(),
          };
      }
      await tx.update(aiRun).set(values).where(condition);
    });
  }
  try {
    const assertLive = async () => {
      await workspaceContext(headers);
      const config = await db.query.aiConfiguration.findFirst({
        where: eq(aiConfiguration.organizationId, run.organizationId),
      });
      if (
        !config?.enabled ||
        config.model !== run.model ||
        config.updatedAt.getTime() !== run.configRevision.getTime() ||
        !process.env.OPENAI_API_KEY?.trim()
      )
        throw new AiError("CONFIGURATION_CHANGED");
      const latest = await snapshot(
        headers,
        run.opportunityId,
        input.suggestedRole,
      );
      if (latest.previewRevision !== input.previewRevision)
        throw new AiError("INPUT_CHANGED");
      return latest;
    };
    await assertLive();
    const output = await boundedCall(
      (signal) =>
        (dependencies.provider ?? openAiProvider())(
          packet,
          { model: run.model, key: process.env.OPENAI_API_KEY! },
          signal,
        ),
      dependencies.timeoutMs,
    );
    const latest = await assertLive();
    const draft = validateDraft(output, packet, latest.detail.data.people);
    await finish({ status: "completed", draft, finishedAt: new Date() });
  } catch (error) {
    await finish({
      status: "failed",
      errorCategory:
        error instanceof AiError
          ? error.category
          : error instanceof DomainError
            ? error.code
            : "PROVIDER_FAILED",
      finishedAt: new Date(),
    });
  }
  const [result] = await db
    .select({ id: aiRun.id, status: aiRun.status })
    .from(aiRun)
    .where(eq(aiRun.id, run.id));
  return (
    result ?? { id: run.id, status: "failed", errorCategory: "DATA_DELETED" }
  );
}
