import { beforeEach, afterAll, describe, it, expect } from "vitest";
import { getNetworkGraph } from "../../src/modules/network/service";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { resetTestDatabase } from "../helpers/database";
import { savedWorkflow } from "../helpers/workflow";
import {
  db,
  pool,
  activity,
  opportunity,
  opportunityEvent,
  partnership,
  organization,
  user,
} from "../../src/server/db";
import {
  generateOpportunity,
  editOpportunity,
  getOpportunityDetail,
} from "../../src/modules/opportunities/service";
import { reviewOpportunity } from "../../src/modules/opportunities/review";
import {
  saveRecord,
  saveRecordInTransaction,
  workspaceContext,
} from "../../src/modules/records/service";
import {
  saveActivity,
  getDueActions,
  updateFollowUp,
} from "../../src/modules/outreach/service";
import {
  transitionOpportunity,
  getLifecycleDetail,
  getCompanyHistory,
} from "../../src/modules/outreach/lifecycle";
beforeEach(resetTestDatabase);
afterAll(() => pool.end());
async function fixture() {
  const f = await savedWorkflow();
  const op = await generateOpportunity(f.headers, {
    needId: f.needId,
    companyId: f.companyId,
    partnershipType: "in_kind",
  });
  await editOpportunity(f.headers, op.id, {
    ...(await getOpportunityDetail(f.headers, op.id)).brief,
    ownerId: f.editor.id,
  });
  return { ...f, opId: op.id };
}
function action(f: Awaited<ReturnType<typeof fixture>>) {
  return {
    opportunityId: f.opId,
    kind: "introduction",
    status: "planned",
    targetRole: "Operations lead",
    channel: "email",
    description: "Ask for a short technical introduction.",
    followUpDate: "2020-01-02",
  };
}
function transition(fromState: string, toState: string, reason = "") {
  return {
    requestId: randomUUID(),
    action: "transition",
    fromState,
    toState,
    reason,
  };
}
function agreement(fromState = "suggested") {
  return {
    requestId: randomUUID(),
    action: "agreement",
    fromState,
    confirmed: true,
    source: "Fictional signed agreement confirmed by coordinator",
    occurredDate: "2020-01-01",
    newPartnership: {
      title: "Fictional machining contribution",
      type: "in_kind",
      state: "current",
      startDate: "2090-01-01",
      description: "Ten machined fixtures",
    },
  };
}
describe("owned outreach lifecycle and outcomes", () => {
  it("records retrospective completion without pursuing, preserves future follow-up and immutable facts", async () => {
    const f = await fixture();
    const planned = await saveActivity(f.headers, {
      ...action(f),
      followUpDate: "2090-01-01",
    });
    const completed = await saveActivity(f.headers, {
      ...action(f),
      id: planned.id,
      followUpDate: undefined,
      status: "completed",
      occurredDate: "2020-01-01",
    });
    expect(completed.occurredDate).toBe("2020-01-01");
    expect(completed.completedAt!.getUTCFullYear()).toBeGreaterThan(2020);
    expect(completed.followUpDate).toBe("2090-01-01");
    expect(completed.followUpResolvedAt).toBeNull();
    expect(
      (await getCompanyHistory(f.headers, f.companyId)).activities[0]
        .occurredDate,
    ).toBe("2020-01-01");
    expect(
      (
        await getNetworkGraph(f.headers, { companyId: f.companyId })
      ).history.find((h) => h.id === completed.id)?.occurredDate,
    ).toBe("2020-01-01");
    await expect(
      saveActivity(f.headers, { ...action(f), id: planned.id }),
    ).rejects.toMatchObject({ code: "COMPLETED_ACTIVITY" });
    await expect(
      saveActivity(f.headers, {
        ...action(f),
        id: planned.id,
        status: "completed",
        description: "Changed factual communication",
      }),
    ).rejects.toMatchObject({ code: "COMPLETED_ACTIVITY" });
    await expect(
      saveActivity(f.headers, {
        ...action(f),
        status: "completed",
        occurredDate: "2090-01-01",
      }),
    ).rejects.toMatchObject({ code: "FUTURE_ACTIVITY" });
  });
  it("keeps legacy completed occurrence unknown while editing only its follow-up", async () => {
    const f = await fixture();
    const a = await saveActivity(f.headers, {
      ...action(f),
      status: "completed",
    });
    await db
      .update(activity)
      .set({ occurredDate: null })
      .where(eq(activity.id, a.id));
    const updated = await saveActivity(f.headers, {
      ...action(f),
      id: a.id,
      status: "completed",
      followUpDate: "2020-01-03",
    });
    expect(updated.occurredDate).toBeNull();
    expect(
      (
        await getNetworkGraph(f.headers, { companyId: f.companyId })
      ).history.find((h) => h.id === a.id)?.occurredDate,
    ).toBeNull();
    expect(updated.completedAt).toEqual(a.completedAt);
  });
  it("resolves a dated follow-up idempotently and reopens changed dates even with a stale checked marker", async () => {
    const f = await fixture();
    const a = await saveActivity(f.headers, action(f));
    expect((await getDueActions(f.headers)).actions).toHaveLength(1);
    const resolved = await updateFollowUp(f.headers, a.id, {
      followUpDate: a.followUpDate,
      resolved: true,
    });
    const retry = await updateFollowUp(f.headers, a.id, {
      followUpDate: a.followUpDate,
      resolved: true,
    });
    expect(retry.followUpResolvedAt).toEqual(resolved.followUpResolvedAt);
    expect((await getDueActions(f.headers)).actions).toHaveLength(0);
    const rescheduled = await updateFollowUp(f.headers, a.id, {
      followUpDate: "2020-01-03",
      resolved: true,
    });
    expect(rescheduled.followUpResolvedAt).toBeNull();
    expect(rescheduled.followUpResolvedBy).toBeNull();
    expect((await getDueActions(f.headers)).actions).toHaveLength(1);
  });
  it("requires active ownership, preserves readiness revisions on pursuit and rejects unreviewed pursuit", async () => {
    const f = await fixture();
    await expect(
      transitionOpportunity(
        f.headers,
        f.opId,
        transition("suggested", "pursuing"),
      ),
    ).rejects.toBeDefined();
    await reviewOpportunity(f.headers, f.opId, {
      fitReviewed: true,
      askReviewed: true,
      targetReviewed: true,
      nextActionReviewed: true,
      fitValue: 2,
      fitRationale:
        "CNC equipment supports machining; verify drawings and quantities.",
      fitEvidenceIds: [f.sourceId],
      fitSource: "",
      ask: "Machine ten defined fixtures from supplied drawings for our community workshop.",
      contactRole: "Operations lead",
      targetPersonId: null,
      nextAction:
        "Confirm the relevant role and arrange a short technical call.",
      approachMode: "cold",
      pathId: null,
    });
    const before = await db.query.opportunity.findFirst({
      where: eq(opportunity.id, f.opId),
    });
    const result = await transitionOpportunity(
      f.headers,
      f.opId,
      transition("suggested", "pursuing"),
    );
    expect(result.record.revision).toBe(before!.revision);
    expect(result.record.inputRevision).toBe(before!.inputRevision);
    expect(result.event!.reviewId).not.toBeNull();
    await editOpportunity(f.headers, f.opId, {
      ...(await getOpportunityDetail(f.headers, f.opId)).brief,
      ownerId: null,
    });
    await expect(saveActivity(f.headers, action(f))).rejects.toMatchObject({
      code: "OWNER_REQUIRED",
    });
    await editOpportunity(f.headers, f.opId, {
      ...(await getOpportunityDetail(f.headers, f.opId)).brief,
      ownerId: f.admin.id,
    });
    await db.update(user).set({ active: false }).where(eq(user.id, f.admin.id));
    await expect(saveActivity(f.headers, action(f))).rejects.toMatchObject({
      code: "OWNER_REQUIRED",
    });
  });
  it("requires closure reasons, pauses due work without completing it, explicitly reopens and retains history", async () => {
    const f = await fixture();
    const a = await saveActivity(f.headers, action(f));
    await expect(
      transitionOpportunity(
        f.headers,
        f.opId,
        transition("suggested", "archived"),
      ),
    ).rejects.toMatchObject({ code: "REASON_REQUIRED" });
    await transitionOpportunity(
      f.headers,
      f.opId,
      transition("suggested", "shortlisted"),
    );
    await transitionOpportunity(
      f.headers,
      f.opId,
      transition("shortlisted", "archived", "Capacity unavailable"),
    );
    expect((await getDueActions(f.headers)).actions).toHaveLength(0);
    expect(
      (await db.query.activity.findFirst({ where: eq(activity.id, a.id) }))!
        .status,
    ).toBe("planned");
    await expect(saveActivity(f.headers, action(f))).rejects.toMatchObject({
      code: "OPPORTUNITY_CLOSED",
    });
    await saveActivity(f.headers, {
      ...action(f),
      status: "completed",
      occurredDate: "2020-01-01",
    });
    await transitionOpportunity(f.headers, f.opId, {
      requestId: randomUUID(),
      action: "reopen",
      fromState: "archived",
      reason: "Capacity now available",
    });
    expect((await getLifecycleDetail(f.headers, f.opId)).events).toHaveLength(
      3,
    );
    expect((await getDueActions(f.headers)).actions).toHaveLength(2);
  });
  it("prevents reopening alongside a newer active proposal", async () => {
    const f = await fixture();
    await transitionOpportunity(
      f.headers,
      f.opId,
      transition("suggested", "declined", "Not a fit this season"),
    );
    const newer = await generateOpportunity(f.headers, {
      needId: f.needId,
      companyId: f.companyId,
      partnershipType: "in_kind",
      allowNewAfterClosed: true,
    });
    expect(newer.id).not.toBe(f.opId);
    await expect(
      transitionOpportunity(f.headers, f.opId, {
        requestId: randomUUID(),
        action: "reopen",
        fromState: "declined",
        reason: "Try again",
      }),
    ).rejects.toMatchObject({ code: "ACTIVE_OPPORTUNITY_EXISTS" });
  });
  it("creates one sourced confirmed partnership under concurrent retries, independent of contribution start dates", async () => {
    const f = await fixture();
    const input = agreement();
    await expect(
      transitionOpportunity(f.headers, f.opId, { ...input, confirmed: false }),
    ).rejects.toMatchObject({ code: "CONFIRMED_AGREEMENT_REQUIRED" });
    expect(await db.select().from(partnership)).toHaveLength(0);
    const [a, b] = await Promise.all([
      transitionOpportunity(f.headers, f.opId, input),
      transitionOpportunity(f.headers, f.opId, input),
    ]);
    expect(a.record.partnershipId).toBe(b.record.partnershipId);
    expect(await db.select().from(partnership)).toHaveLength(1);
    expect(await db.select().from(opportunityEvent)).toHaveLength(1);
    const stored = await db.query.partnership.findFirst();
    expect(stored!.startDate).toBe("2090-01-01");
    expect(a.event!.occurredDate).toBe("2020-01-01");
    await transitionOpportunity(f.headers, f.opId, {
      ...agreement("agreed"),
      requestId: randomUUID(),
    });
    expect(await db.select().from(partnership)).toHaveLength(1);
    await expect(
      transitionOpportunity(f.headers, f.opId, {
        ...input,
        source: "Different request body",
      }),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    const history = await getCompanyHistory(f.headers, f.companyId);
    expect(history.events).toHaveLength(1);
    expect(history.partnerships).toHaveLength(1);
  });
  it("links only an existing same-company partnership and blocks manual and transactional import reassignment", async () => {
    const f = await fixture();
    const p = await saveRecord(f.headers, "partnerships", {
      companyId: f.companyId,
      title: "Future supply",
      type: "in_kind",
      state: "current",
      startDate: "2090-01-01",
    });
    const other = await saveRecord(f.headers, "companies", {
      name: "Other fictional company",
    });
    const foreign = await saveRecord(f.headers, "partnerships", {
      companyId: other.id,
      title: "Other support",
      type: "in_kind",
      state: "current",
    });
    await expect(
      transitionOpportunity(f.headers, f.opId, {
        ...agreement(),
        newPartnership: undefined,
        partnershipId: foreign.id,
      }),
    ).rejects.toMatchObject({ code: "INVALID_PARTNERSHIP" });
    await transitionOpportunity(f.headers, f.opId, {
      ...agreement(),
      newPartnership: undefined,
      partnershipId: p.id,
    });
    await expect(
      saveRecord(f.headers, "partnerships", { ...p, companyId: other.id }),
    ).rejects.toMatchObject({ code: "LINKED_PARTNERSHIP_COMPANY" });
    const context = await workspaceContext(f.headers);
    await expect(
      db.transaction(async (tx) => {
        await tx
          .select()
          .from(organization)
          .where(eq(organization.id, context.organization.id))
          .for("update");
        return saveRecordInTransaction(tx, context, "partnerships", {
          ...p,
          companyId: other.id,
        });
      }),
    ).rejects.toMatchObject({ code: "LINKED_PARTNERSHIP_COMPANY" });
    expect(
      (await db.query.partnership.findFirst({
        where: eq(partnership.id, p.id),
      }))!.companyId,
    ).toBe(f.companyId);
    await transitionOpportunity(
      f.headers,
      f.opId,
      transition("agreed", "archived", "Contribution period will be reviewed"),
    );
    await transitionOpportunity(f.headers, f.opId, {
      requestId: randomUUID(),
      action: "reopen",
      fromState: "archived",
      reason: "Resume agreed collaboration",
    });
    expect(
      await db
        .select()
        .from(partnership)
        .where(eq(partnership.companyId, f.companyId)),
    ).toHaveLength(1);
  });
  it("keeps all new private entry points gated", async () => {
    await expect(
      getLifecycleDetail(new Headers(), randomUUID()),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      updateFollowUp(new Headers(), randomUUID(), {
        followUpDate: null,
        resolved: false,
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      getCompanyHistory(new Headers(), randomUUID()),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
