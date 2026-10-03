import { beforeEach, afterAll, describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { resetTestDatabase } from "../helpers/database";
import { savedWorkflow } from "../helpers/workflow";
import {
  saveRecord,
  getWorkspaceData,
} from "../../src/modules/records/service";
import {
  getCandidatePreviews,
  saveIncentive,
  startGenerationRun,
  retryGenerationRun,
  listGenerationRuns,
} from "../../src/modules/opportunities/runs";
import {
  generateOpportunity,
  getOpportunityDetail,
  editOpportunity,
  reviewFactors,
} from "../../src/modules/opportunities/service";
import {
  reviewOpportunity,
  startPursuing,
} from "../../src/modules/opportunities/review";
import { getOpportunityList } from "../../src/modules/opportunities/list";
import { recoverInterruptedGenerationRuns } from "../../src/modules/opportunities/recovery";
import { companyPaths } from "../../src/modules/network/service";
import { saveActivity } from "../../src/modules/outreach/service";
import {
  db,
  pool,
  opportunity,
  generationRun,
  evidence,
  assessment,
} from "../../src/server/db";
import { unknownFactors } from "../../src/modules/opportunities/scoring";
beforeEach(resetTestDatabase);
afterAll(() => pool.end());
function selection(
  f: Awaited<ReturnType<typeof savedWorkflow>>,
  key = randomUUID(),
) {
  return { needId: f.needId, companyIds: [f.companyId], idempotencyKey: key };
}
function ready(f: Awaited<ReturnType<typeof savedWorkflow>>) {
  return {
    fitReviewed: true,
    askReviewed: true,
    targetReviewed: true,
    nextActionReviewed: true,
    fitValue: 2,
    fitRationale:
      "Source lists CNC equipment; quantities and materials require confirmation.",
    fitEvidenceIds: [f.sourceId],
    fitSource: "",
    ask: "Machine ten defined workshop fixtures from supplied drawings before our workshop date.",
    contactRole: "Operations lead",
    targetPersonId: null,
    nextAction:
      "Verify the operations lead role, then request a short machining discussion.",
    approachMode: "cold",
    pathId: null,
  };
}
describe("bounded generation and readiness", () => {
  it("does not match cash to all companies, and requires an evidenced incentive or explicit selection", async () => {
    const f = await savedWorkflow();
    const cash = await saveRecord(f.headers, "needs", {
      title: "Workshop grant",
      description: "Support materials for four community sessions",
      category: "cash",
      partnershipType: "cash",
    });
    expect(
      (await getCandidatePreviews(f.headers, cash.id)).every(
        (c) => !c.eligible,
      ),
    ).toBe(true);
    await expect(
      startGenerationRun(f.headers, {
        needId: cash.id,
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toMatchObject({ code: "NO_CANDIDATES" });
    const source = await saveRecord(f.headers, "evidence", {
      claim: "Cedar offers local community grants.",
      sourceType: "supplied_source",
      url: "https://cedar.example.test/grants",
      excerpt: "Fictional grants support community workshop materials.",
      observedDate: new Date().toISOString().slice(0, 10),
    });
    await saveIncentive(f.headers, {
      needId: cash.id,
      companyId: f.companyId,
      description:
        "Local workshop materials align with the supplied community grant program.",
      evidenceId: source.id,
    });
    const c = await getCandidatePreviews(f.headers, cash.id);
    expect(c[0].reasons[0].kind).toBe("incentive");
    expect(c[0].reasons[0].evidenceIds).toEqual([source.id]);
    const run = await startGenerationRun(f.headers, {
      needId: cash.id,
      idempotencyKey: randomUUID(),
    });
    expect(run.status).toBe("completed");
    expect(run.selection.companyIds).toEqual([f.companyId]);
    const detail = await getOpportunityDetail(
      f.headers,
      run.results[0].opportunityId!,
    );
    expect(detail.record.reviewState).toBe("research_needed");
    expect(detail.latest.factors.fit.value).toBeNull();
  });
  it("bounds automatic and explicitly selected batches at twenty known candidates", async () => {
    const f = await savedWorkflow();
    const ids = [f.companyId];
    for (let i = 0; i < 20; i++) {
      const c = await saveRecord(f.headers, "companies", {
        name: `Fictional workshop ${i.toString().padStart(2, "0")}`,
      });
      ids.push(c.id);
      await saveRecord(f.headers, "capabilities", {
        companyId: c.id,
        category: "manufacturing",
        description: "Fictional CNC equipment",
        evidenceId: f.sourceId,
      });
    }
    const run = await startGenerationRun(f.headers, {
      needId: f.needId,
      idempotencyKey: randomUUID(),
    });
    expect(run.selection.companyIds).toHaveLength(20);
    expect(run.results).toHaveLength(20);
    await expect(
      startGenerationRun(f.headers, {
        needId: f.needId,
        companyIds: ids,
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toBeDefined();
    await expect(
      startGenerationRun(f.headers, {
        needId: f.needId,
        companyIds: [randomUUID()],
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toMatchObject({ code: "INVALID_REFERENCE" });
    expect(await listGenerationRuns(f.headers)).toHaveLength(1);
  });
  it("makes concurrent identical retries idempotent and different runs retain one active opportunity with successive assessments", async () => {
    const f = await savedWorkflow();
    const input = selection(f);
    const results = await Promise.all([
      startGenerationRun(f.headers, input),
      startGenerationRun(f.headers, input),
    ]);
    expect(results[0].id).toBe(results[1].id);
    expect(await db.select().from(opportunity)).toHaveLength(1);
    expect(await db.select().from(assessment)).toHaveLength(1);
    await startGenerationRun(f.headers, input);
    expect(await db.select().from(assessment)).toHaveLength(1);
    await expect(
      startGenerationRun(f.headers, { ...input, partnershipType: "cash" }),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    await Promise.all([
      startGenerationRun(f.headers, selection(f)),
      startGenerationRun(f.headers, selection(f)),
    ]);
    expect(await db.select().from(opportunity)).toHaveLength(1);
    expect(
      (await db.select().from(assessment)).map((a) => a.version).sort(),
    ).toEqual([1, 2, 3]);
  });
  it("surfaces closed history, links an explicitly authorized new proposal and skips active discussions", async () => {
    const f = await savedWorkflow();
    const first = await generateOpportunity(f.headers, {
      needId: f.needId,
      companyId: f.companyId,
      partnershipType: "in_kind",
    });
    await db
      .update(opportunity)
      .set({ state: "declined" })
      .where(eq(opportunity.id, first.id));
    expect(
      (await getCandidatePreviews(f.headers, f.needId))[0].history[0].state,
    ).toBe("declined");
    await expect(
      startGenerationRun(f.headers, selection(f)),
    ).rejects.toMatchObject({ code: "CLOSED_HISTORY" });
    const second = await startGenerationRun(f.headers, {
      ...selection(f),
      allowNewAfterClosed: true,
    });
    const detail = await getOpportunityDetail(
      f.headers,
      second.results[0].opportunityId!,
    );
    expect(detail.record.previousOpportunityId).toBe(first.id);
    await reviewOpportunity(f.headers, detail.record.id, ready(f));
    await startPursuing(f.headers, detail.record.id);
    const skip = await startGenerationRun(f.headers, {
      ...selection(f),
      allowNewAfterClosed: true,
    });
    expect(skip.results[0].status).toBe("skipped");
    expect(
      (await getOpportunityDetail(f.headers, detail.record.id)).versions,
    ).toHaveLength(2);
  });
  it("permits explicitly acknowledged support for a different need while keeping unattended discussions out", async () => {
    const f = await savedWorkflow();
    const initial = await generateOpportunity(f.headers, {
      needId: f.needId,
      companyId: f.companyId,
      partnershipType: "in_kind",
    });
    await reviewOpportunity(f.headers, initial.id, ready(f));
    await startPursuing(f.headers, initial.id);
    const secondNeed = await saveRecord(f.headers, "needs", {
      title: "Another manufacturing deliverable",
      description: "Make a different component batch",
      category: "manufacturing",
    });
    await expect(
      startGenerationRun(f.headers, {
        needId: secondNeed.id,
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toMatchObject({ code: "NO_CANDIDATES" });
    const deliberate = await startGenerationRun(f.headers, {
      needId: secondNeed.id,
      companyIds: [f.companyId],
      idempotencyKey: randomUUID(),
      allowOngoingDiscussion: true,
    });
    expect(deliberate.results[0].status).toBe("generated");
    expect(deliberate.results[0].opportunityId).not.toBe(initial.id);
    await db
      .update(opportunity)
      .set({ state: "pursuing" })
      .where(eq(opportunity.id, deliberate.results[0].opportunityId!));
    const beforeSame = await getOpportunityDetail(f.headers, initial.id);
    // Move the target tuple behind the other proposal in the stored read order.
    await db
      .update(opportunity)
      .set({ updatedAt: new Date() })
      .where(eq(opportunity.id, initial.id));
    expect(
      (await getWorkspaceData(f.headers)).opportunities.filter(
        (o) => o.state === "pursuing",
      )[0].id,
    ).toBe(deliberate.results[0].opportunityId);
    const same = await startGenerationRun(f.headers, {
      ...selection(f),
      allowOngoingDiscussion: true,
    });
    expect(same.results[0].status).toBe("skipped");
    expect(same.results[0].opportunityId).toBe(initial.id);
    expect(
      (await getOpportunityDetail(f.headers, initial.id)).versions,
    ).toHaveLength(beforeSame.versions.length);
    await expect(
      generateOpportunity(f.headers, {
        needId: secondNeed.id,
        companyId: f.companyId,
        partnershipType: "in_kind",
      }),
    ).rejects.toMatchObject({ code: "ONGOING_DISCUSSION" });
  });
  it("preserves explicit human factors, manual brief, owner and completed outreach after changed inputs", async () => {
    const f = await savedWorkflow();
    const op = await generateOpportunity(f.headers, {
      needId: f.needId,
      companyId: f.companyId,
      partnershipType: "in_kind",
    });
    await editOpportunity(f.headers, op.id, {
      ownerId: f.editor.id,
      ask: "Machine ten specifically defined fixtures.",
      valueExchange: "Workshop collaboration",
      contactRole: "Operations lead",
      nextAction: "Verify the role then request a meeting",
      approach: "Explicit cold first request",
    });
    await saveActivity(f.headers, {
      opportunityId: op.id,
      kind: "outreach",
      status: "completed",
      targetRole: "Operations lead",
      channel: "email",
      description: "Fictional completed first contact.",
    });
    const factors = unknownFactors();
    for (const factor of Object.values(factors)) {
      factor.origin = "organization";
      factor.source = "Explicit fictional organization assessment";
    }
    factors.fit = {
      value: 4,
      rationale: "Team reviewed drawings against the supplied equipment claim.",
      origin: "human",
      evidenceIds: [f.sourceId],
      source: null,
    };
    await reviewFactors(f.headers, op.id, factors);
    await saveRecord(f.headers, "needs", {
      id: f.needId,
      title: "Updated CNC machining need",
      description: "Revised component drawings and timeline",
      category: "manufacturing",
      urgency: 3,
    });
    let d = await getOpportunityDetail(f.headers, op.id);
    expect(d.latest.inputRevision).not.toBe(d.record.inputRevision);
    await expect(
      reviewOpportunity(f.headers, op.id, ready(f)),
    ).rejects.toMatchObject({ code: "STALE_ASSESSMENT" });
    await generateOpportunity(f.headers, {
      needId: f.needId,
      companyId: f.companyId,
      partnershipType: "in_kind",
      refreshOpportunityId: op.id,
    });
    d = await getOpportunityDetail(f.headers, op.id);
    expect(d.latest.factors.fit.value).toBe(4);
    expect(d.latest.humanFactorKeys).toContain("fit");
    expect(d.brief.ask).toBe("Machine ten specifically defined fixtures.");
    expect(d.record.ownerId).toBe(f.editor.id);
    expect(d.activities[0].status).toBe("completed");
    expect(d.versions).toHaveLength(3);
    expect(d.record.reviewState).toBe("needs_review");
  });
  it("requires fit/ask/target/action review, allows cold pursuit, and invalidates readiness after manual or source edits", async () => {
    const f = await savedWorkflow();
    const op = await generateOpportunity(f.headers, {
      needId: f.needId,
      companyId: f.companyId,
      partnershipType: "in_kind",
    });
    await expect(startPursuing(f.headers, op.id)).rejects.toMatchObject({
      code: "REVIEW_REQUIRED",
    });
    await expect(
      reviewOpportunity(f.headers, op.id, { ...ready(f), fitReviewed: false }),
    ).rejects.toBeDefined();
    const original = await getOpportunityDetail(f.headers, op.id);
    await expect(
      reviewOpportunity(f.headers, op.id, {
        ...ready(f),
        ask: original.brief.ask,
      }),
    ).rejects.toMatchObject({ code: "CONCRETE_ASK_REQUIRED" });
    await reviewOpportunity(f.headers, op.id, ready(f));
    expect(
      (await getOpportunityDetail(f.headers, op.id)).record.reviewState,
    ).toBe("ready_for_action");
    expect((await startPursuing(f.headers, op.id)).state).toBe("pursuing");
    await editOpportunity(f.headers, op.id, {
      ownerId: null,
      ask: "Machine twenty fixtures with revised scope",
      valueExchange: "Workshop collaboration",
      contactRole: "Operations lead",
      nextAction: "Review the revised quotation",
      approach: "Explicit cold discussion",
    });
    await expect(startPursuing(f.headers, op.id)).rejects.toMatchObject({
      code: "REVIEW_REQUIRED",
    });
    await reviewOpportunity(f.headers, op.id, ready(f));
    await saveRecord(f.headers, "evidence", {
      id: f.sourceId,
      claim: "The equipment listing is disputed.",
      sourceType: "observation",
      attribution: "Fictional reviewer",
      excerpt: "Capacity is not confirmed.",
      observedDate: new Date().toISOString().slice(0, 10),
      reviewState: "disputed",
    });
    await expect(startPursuing(f.headers, op.id)).rejects.toMatchObject({
      code: "REVIEW_REQUIRED",
    });
  });
  it("rejects a refused warm path but permits a reviewed cold alternative without inventing authority", async () => {
    const f = await savedWorkflow();
    await saveRecord(f.headers, "relationships", {
      id: f.relationshipId,
      kind: "works_at",
      personId: f.personId,
      companyId: f.companyId,
      evidenceId: f.employmentSourceId,
      willingness: "no",
      willingnessDate: new Date().toISOString().slice(0, 10),
      willingnessSource: "Fictional refusal",
    });
    const op = await generateOpportunity(f.headers, {
      needId: f.needId,
      companyId: f.companyId,
      partnershipType: "in_kind",
    });
    const p = companyPaths(await getWorkspaceData(f.headers), f.companyId)
      .current[0];
    await expect(
      reviewOpportunity(f.headers, op.id, {
        ...ready(f),
        approachMode: "introduction",
        pathId: p.id,
      }),
    ).rejects.toMatchObject({ code: "ROUTE_UNAVAILABLE" });
    await reviewOpportunity(f.headers, op.id, ready(f));
    expect((await startPursuing(f.headers, op.id)).state).toBe("pursuing");
    expect(
      (await getOpportunityDetail(f.headers, op.id)).latest.factors.access
        .value,
    ).toBeNull();
  });
  it("does not use an employee route as access to a separately recorded manager", async () => {
    const f = await savedWorkflow();
    const manager = await saveRecord(f.headers, "people", {
      name: "Morgan Manager Example",
      roles: ["contact"],
    });
    await saveRecord(f.headers, "relationships", {
      kind: "works_at",
      personId: manager.id,
      companyId: f.companyId,
      title: "Manufacturing Manager",
      evidenceId: f.employmentSourceId,
    });
    const op = await generateOpportunity(f.headers, {
      needId: f.needId,
      companyId: f.companyId,
      partnershipType: "in_kind",
    });
    const path = companyPaths(await getWorkspaceData(f.headers), f.companyId)
      .current[0];
    await expect(
      reviewOpportunity(f.headers, op.id, {
        ...ready(f),
        approachMode: "introduction",
        pathId: path.id,
        targetPersonId: manager.id,
      }),
    ).rejects.toMatchObject({ code: "TARGET_ROUTE_MISMATCH" });
    await reviewOpportunity(f.headers, op.id, {
      ...ready(f),
      targetPersonId: manager.id,
    });
    expect((await startPursuing(f.headers, op.id)).state).toBe("pursuing");
  });
  it("excludes future source dates from candidates and fit/evidence scores while retaining the claim and gap", async () => {
    const f = await savedWorkflow();
    await db
      .update(evidence)
      .set({ observedDate: "2099-01-01" })
      .where(eq(evidence.id, f.sourceId));
    expect((await getCandidatePreviews(f.headers, f.needId))[0].eligible).toBe(
      false,
    );
    const op = await generateOpportunity(f.headers, {
      needId: f.needId,
      companyId: f.companyId,
      partnershipType: "in_kind",
    });
    const d = await getOpportunityDetail(f.headers, op.id);
    expect(d.latest.factors.fit.value).toBeNull();
    expect(d.latest.factors.evidence.value).toBeNull();
    expect(d.brief.claims).toHaveLength(1);
    expect(d.brief.questions.some((q) => q.includes("future-dated"))).toBe(
      true,
    );
    await expect(
      reviewOpportunity(f.headers, op.id, ready(f)),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_REVIEW" });
  });
  it("retains prior data on abandoned/failed runs and retries interrupted work explicitly without duplicating active records", async () => {
    const f = await savedWorkflow();
    const run = await startGenerationRun(f.headers, selection(f));
    await db
      .update(generationRun)
      .set({ status: "running", finishedAt: null, results: [] })
      .where(eq(generationRun.id, run.id));
    expect(await recoverInterruptedGenerationRuns()).toHaveLength(1);
    expect(await recoverInterruptedGenerationRuns()).toHaveLength(0);
    expect((await listGenerationRuns(f.headers))[0].status).toBe("interrupted");
    const retried = await retryGenerationRun(f.headers, run.id);
    expect(retried.status).toBe("completed");
    expect(retried.attempt).toBe(2);
    expect(await db.select().from(opportunity)).toHaveLength(1);
    expect(await db.select().from(assessment)).toHaveLength(2);
    await retryGenerationRun(f.headers, run.id);
    expect(await db.select().from(assessment)).toHaveLength(2);
    const secondRun = await startGenerationRun(f.headers, selection(f));
    await db
      .update(generationRun)
      .set({
        status: "failed",
        errorCategory: "GENERATION_FAILED",
        selection: { ...secondRun.selection, companyIds: [randomUUID()] },
      })
      .where(eq(generationRun.id, secondRun.id));
    const failed = await retryGenerationRun(f.headers, secondRun.id);
    expect(failed.status).toBe("failed");
    expect(failed.attempt).toBe(2);
    await expect(
      retryGenerationRun(f.headers, secondRun.id),
    ).rejects.toMatchObject({ code: "RETRY_EXHAUSTED" });
    expect(await db.select().from(assessment)).toHaveLength(3);
    await saveRecord(f.headers, "needs", {
      id: f.needId,
      title: "Fulfilled CNC need",
      description: "No longer needed",
      category: "manufacturing",
      active: false,
    });
    await expect(
      startGenerationRun(f.headers, selection(f)),
    ).rejects.toMatchObject({ code: "INACTIVE_NEED" });
  });
  it("sorts equal priorities by coverage, nearer deadline and stable ID and authorizes direct private endpoints", async () => {
    const f = await savedWorkflow();
    await saveRecord(f.headers, "needs", {
      id: f.needId,
      title: "Later CNC machining",
      description: "Defined fixtures",
      category: "manufacturing",
      urgency: 2,
      deadline: "2027-12-01",
    });
    const n = await saveRecord(f.headers, "needs", {
      title: "Nearer CNC machining",
      description: "Defined fixtures",
      category: "manufacturing",
      urgency: 2,
      deadline: "2027-01-01",
    });
    await generateOpportunity(f.headers, {
      needId: f.needId,
      companyId: f.companyId,
      partnershipType: "in_kind",
    });
    await generateOpportunity(f.headers, {
      needId: n.id,
      companyId: f.companyId,
      partnershipType: "in_kind",
    });
    const list = await getOpportunityList(f.headers);
    expect(list.items[0].need.id).toBe(n.id);
    expect(list.items[0].score?.priority).toBe(list.items[1].score?.priority);
    await expect(listGenerationRuns(new Headers())).rejects.toMatchObject({
      status: 401,
    });
    await expect(
      startGenerationRun(new Headers(), selection(f)),
    ).rejects.toMatchObject({ status: 401 });
  });
});

it("refreshes the exact linked active proposal after an earlier decline without acknowledging a new creation", async () => {
  const f = await savedWorkflow();
  const first = await startGenerationRun(f.headers, selection(f));
  const oldId = first.results[0].opportunityId!;
  const { transitionOpportunity } =
    await import("../../src/modules/outreach/lifecycle");
  await transitionOpportunity(f.headers, oldId, {
    requestId: randomUUID(),
    action: "transition",
    fromState: "suggested",
    toState: "declined",
    reason: "Fictional earlier timing unavailable",
    source: "Fictional reply",
    occurredDate: new Date().toISOString().slice(0, 10),
  });
  const second = await startGenerationRun(f.headers, {
    ...selection(f),
    allowNewAfterClosed: true,
  });
  const id = second.results[0].opportunityId!;
  await saveRecord(f.headers, "needs", {
    id: f.needId,
    title: "Revised defined fixtures",
    description: "Updated drawings",
    category: "manufacturing",
    partnershipType: "in_kind",
  });
  const stale = await getOpportunityDetail(f.headers, id);
  expect(stale.latest.inputRevision).not.toBe(stale.record.inputRevision);
  const request = { ...selection(f), refreshOpportunityId: id };
  const refreshed = await startGenerationRun(f.headers, request);
  expect(refreshed.results[0].opportunityId).toBe(id);
  expect((await startGenerationRun(f.headers, request)).id).toBe(refreshed.id);
  const detail = await getOpportunityDetail(f.headers, id);
  expect(detail.record.previousOpportunityId).toBe(oldId);
  expect(detail.latest.inputRevision).toBe(detail.record.inputRevision);
  expect(detail.versions).toHaveLength(2);
  expect(await db.select().from(opportunity)).toHaveLength(2);
  await expect(
    startGenerationRun(f.headers, {
      ...selection(f),
      refreshOpportunityId: oldId,
    }),
  ).rejects.toMatchObject({ code: "INVALID_REFRESH" });
  await expect(
    startGenerationRun(f.headers, selection(f)),
  ).rejects.toMatchObject({ code: "CLOSED_HISTORY" });
});
