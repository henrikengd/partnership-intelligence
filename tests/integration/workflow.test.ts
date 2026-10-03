import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  db,
  pool,
  person,
  affiliation,
  capability,
  opportunity,
  assessment,
  activity,
} from "../../src/server/db";
import {
  getWorkspaceData,
  saveRecord,
} from "../../src/modules/records/service";
import { findDirectPaths } from "../../src/modules/network/paths";
import {
  generateOpportunity,
  getOpportunityDetail,
  editOpportunity,
  reviewFactors,
} from "../../src/modules/opportunities/service";
import {
  saveActivity,
  getDueActions,
} from "../../src/modules/outreach/service";
import { unknownFactors } from "../../src/modules/opportunities/scoring";
import { organizationExists } from "../../src/server/organization";
import { resetTestDatabase } from "../helpers/database";
import { savedWorkflow } from "../helpers/workflow";
beforeEach(resetTestDatabase);
afterAll(() => pool.end());
describe("saved deterministic workflow against PostgreSQL", () => {
  it("keeps login users separate, saves multiple roles, and creates a grounded no-AI brief", async () => {
    expect(await organizationExists()).toBe(false);
    const f = await savedWorkflow();
    expect(await organizationExists()).toBe(true);
    expect(await db.select().from(person)).toHaveLength(1);
    expect(
      await db
        .select()
        .from(affiliation)
        .where(eq(affiliation.personId, f.personId)),
    ).toHaveLength(2);
    const generated = await generateOpportunity(f.headers, {
      needId: f.needId,
      companyId: f.companyId,
      partnershipType: "in_kind",
    });
    const detail = await getOpportunityDetail(f.headers, generated.id);
    expect(detail.brief.path?.nodes.map((n) => n.label)).toEqual([
      "Riverbend Community Workshop",
      "Anna Example",
      "Cedar Manufacturing",
    ]);
    expect(detail.brief.path?.willingness).toBe("unknown");
    expect(detail.latest.factors.feasibility.value).toBeNull();
    expect(detail.latest.factors.access.value).toBeNull();
    expect(detail.brief.contactRole).toBe("Partnership or operations lead");
    expect(detail.brief.claims[0].status).toBe("supplied");
    expect(detail.brief.inferences.join(" ")).toContain("No named manager");
    expect(detail.brief.questions.join(" ")).toContain("willing");
  });
  it("rejects invalid dates, self-links and foreign references without partial writes", async () => {
    const f = await savedWorkflow();
    const before = (await db.select().from(person)).length;
    await expect(
      saveRecord(f.headers, "people", {
        name: "Impossible",
        roles: ["member", "alumni"],
        affiliationStartDate: "2026-03-01",
        affiliationEndDate: "2025-01-01",
        affiliationState: "ended",
      }),
    ).rejects.toBeDefined();
    expect(await db.select().from(person)).toHaveLength(before);
    const count = (await db.select().from(capability)).length;
    await expect(
      saveRecord(f.headers, "capabilities", {
        companyId: f.companyId,
        category: "manufacturing",
        description: "Invalid",
        evidenceId: randomUUID(),
      }),
    ).rejects.toMatchObject({ code: "INVALID_REFERENCE" });
    expect(await db.select().from(capability)).toHaveLength(count);
    await expect(
      db.execute(
        sql`INSERT INTO relationship (organization_id,recorded_by,kind,person_id,target_person_id,evidence_id) SELECT organization_id,recorded_by,'knows',${f.personId}::uuid,${f.personId}::uuid,evidence_id FROM relationship LIMIT 1`,
      ),
    ).rejects.toBeDefined();
    await expect(
      db.execute(
        sql`UPDATE relationship SET kind='previously_worked_at',state='current' WHERE id=${f.relationshipId}::uuid`,
      ),
    ).rejects.toBeDefined();
  });
  it("enforces private service reads and writes", async () => {
    await expect(getWorkspaceData(new Headers())).rejects.toMatchObject({
      status: 401,
    });
    await expect(
      saveRecord(new Headers(), "needs", { title: "Invalid" }),
    ).rejects.toMatchObject({ status: 401 });
    await expect(generateOpportunity(new Headers(), {})).rejects.toMatchObject({
      status: 401,
    });
    await expect(saveActivity(new Headers(), {})).rejects.toMatchObject({
      status: 401,
    });
  });
  it("never creates internal routes for external-only contacts or future/former employment", async () => {
    const f = await savedWorkflow();
    await saveRecord(f.headers, "people", {
      id: f.personId,
      name: "Anna Example",
      roles: ["contact"],
    });
    let data = await getWorkspaceData(f.headers);
    let paths = findDirectPaths({
      organization: data.organization,
      company: data.companies[0],
      people: data.people,
      affiliations: data.affiliations,
      relationships: data.relationships,
      evidence: data.evidence,
    });
    expect(paths.current).toHaveLength(0);
    await saveRecord(f.headers, "people", {
      id: f.personId,
      name: "Anna Example",
      roles: ["alumni"],
    });
    await saveRecord(f.headers, "relationships", {
      id: f.relationshipId,
      personId: f.personId,
      companyId: f.companyId,
      kind: "works_at",
      state: "current",
      startDate: "2099-01-01",
      evidenceId: f.employmentSourceId,
    });
    data = await getWorkspaceData(f.headers);
    paths = findDirectPaths({
      organization: data.organization,
      company: data.companies[0],
      people: data.people,
      affiliations: data.affiliations,
      relationships: data.relationships,
      evidence: data.evidence,
    });
    expect(paths.current).toHaveLength(0);
    expect(paths.historical).toHaveLength(1);
  });
  it("respects refusal and disputed employment instead of inventing a warm introduction", async () => {
    const f = await savedWorkflow();
    await saveRecord(f.headers, "relationships", {
      id: f.relationshipId,
      personId: f.personId,
      companyId: f.companyId,
      kind: "works_at",
      state: "current",
      willingness: "no",
      willingnessDate: new Date().toISOString().slice(0, 10),
      willingnessSource: "Anna explicitly declined this introduction.",
      evidenceId: f.employmentSourceId,
    });
    let generated = await generateOpportunity(f.headers, {
      needId: f.needId,
      companyId: f.companyId,
      partnershipType: "in_kind",
    });
    let detail = await getOpportunityDetail(f.headers, generated.id);
    expect(detail.brief.path?.willingness).toBe("no");
    expect(detail.brief.path?.warning).toContain("Respect");
    expect(detail.brief.nextAction).not.toContain("Ask Anna");
    expect(detail.latest.factors.relationship.value).toBeNull();
    await saveRecord(f.headers, "evidence", {
      id: f.employmentSourceId,
      claim: "Anna's employment is disputed",
      sourceType: "observation",
      attribution: "Fictional conflicting report",
      excerpt: "Employment needs verification.",
      observedDate: new Date().toISOString().slice(0, 10),
      reviewState: "disputed",
    });
    generated = await generateOpportunity(f.headers, {
      needId: f.needId,
      companyId: f.companyId,
      partnershipType: "in_kind",
    });
    detail = await getOpportunityDetail(f.headers, generated.id);
    expect(detail.brief.path).toBeNull();
    expect(detail.latest.factors.relationship.value).toBeNull();
  });
  it("scores explicit reviewed inputs exactly and stores immutable history", async () => {
    const f = await savedWorkflow();
    const generated = await generateOpportunity(f.headers, {
      needId: f.needId,
      companyId: f.companyId,
      partnershipType: "in_kind",
    });
    const factors = unknownFactors();
    for (const factor of Object.values(factors)) factor.origin = "human";
    factors.fit = {
      value: 4,
      rationale:
        "Reviewed drawings against the source capability specification.",
      origin: "human",
      evidenceIds: [f.sourceId],
      source: null,
    };
    factors.relationship = {
      value: 3,
      rationale:
        "The recorded source supports a relevant personal route, introduction unconfirmed.",
      origin: "human",
      evidenceIds: [f.employmentSourceId],
      source: null,
    };
    factors.urgency = {
      value: 2,
      rationale: "Workshop normal priority.",
      origin: "organization",
      evidenceIds: [],
      source: "Explicit workshop planning assessment.",
    };
    await reviewFactors(f.headers, generated.id, factors);
    const detail = await getOpportunityDetail(f.headers, generated.id);
    expect(detail.score).toMatchObject({ priority: 46.25, coverage: 55 });
    expect(detail.versions).toHaveLength(2);
    expect(detail.versions[1].factors.fit.value).toBe(2);
    factors.fit.evidenceIds = [];
    await expect(
      reviewFactors(f.headers, generated.id, factors),
    ).rejects.toMatchObject({ code: "SOURCE_REQUIRED" });
    expect(await db.select().from(assessment)).toHaveLength(2);
  });
  it("preserves manual edits, owner and completed action across regeneration, and flags changed input", async () => {
    const f = await savedWorkflow();
    const generated = await generateOpportunity(f.headers, {
      needId: f.needId,
      companyId: f.companyId,
      partnershipType: "in_kind",
    });
    const detail = await getOpportunityDetail(f.headers, generated.id);
    await editOpportunity(f.headers, generated.id, {
      ...detail.brief,
      ask: "Machine ten fixtures from our drawings.",
      ownerId: f.editor.id,
    });
    let event = await saveActivity(f.headers, {
      opportunityId: generated.id,
      kind: "introduction",
      status: "planned",
      targetPersonId: f.personId,
      targetRole: "",
      channel: "message",
      description: "Ask Anna if an introduction is possible.",
      followUpDate: "2026-01-01",
    });
    expect(event.completedAt).toBeNull();
    event = await saveActivity(f.headers, {
      ...event,
      status: "completed",
      occurredDate: "2020-01-01",
    });
    expect(event.completedAt).not.toBeNull();
    await expect(
      saveActivity(f.headers, { ...event, status: "planned" }),
    ).rejects.toMatchObject({ code: "COMPLETED_ACTIVITY" });
    await generateOpportunity(f.headers, {
      needId: f.needId,
      companyId: f.companyId,
      partnershipType: "in_kind",
    });
    let current = await getOpportunityDetail(f.headers, generated.id);
    expect(current.brief.ask).toBe("Machine ten fixtures from our drawings.");
    expect(current.record.ownerId).toBe(f.editor.id);
    expect(current.activities[0].status).toBe("completed");
    expect((await getDueActions(f.headers)).actions).toHaveLength(1);
    await saveRecord(f.headers, "needs", {
      id: f.needId,
      title: "CNC machining",
      description: "Changed fixture quantity",
      category: "manufacturing",
      urgency: 3,
    });
    current = await getOpportunityDetail(f.headers, generated.id);
    expect(current.record.inputRevision).toBeGreaterThan(
      current.latest.inputRevision,
    );
    expect(current.record.reviewState).toBe("needs_review");
  });
  it("keeps a changed factual snapshot stale after factor review until regeneration", async () => {
    const f = await savedWorkflow();
    const generated = await generateOpportunity(f.headers, {
      needId: f.needId,
      companyId: f.companyId,
      partnershipType: "in_kind",
    });
    const original = await getOpportunityDetail(f.headers, generated.id);
    await saveRecord(f.headers, "relationships", {
      id: f.relationshipId,
      personId: f.personId,
      companyId: f.companyId,
      kind: "previously_worked_at",
      state: "ended",
      startDate: "2024-01-01",
      endDate: "2026-01-01",
      evidenceId: f.employmentSourceId,
    });
    const reviewed = structuredClone(original.latest.factors);
    for (const factor of Object.values(reviewed)) {
      if (factor.origin === "deterministic") factor.origin = "human";
    }
    await reviewFactors(f.headers, generated.id, reviewed);
    let current = await getOpportunityDetail(f.headers, generated.id);
    expect(current.latest.brief).toEqual(original.latest.brief);
    expect(current.latest.inputRevision).toBe(original.latest.inputRevision);
    expect(current.record.inputRevision).toBeGreaterThan(
      current.latest.inputRevision,
    );
    expect(current.record.reviewState).toBe("needs_review");
    await generateOpportunity(f.headers, {
      needId: f.needId,
      companyId: f.companyId,
      partnershipType: "in_kind",
    });
    current = await getOpportunityDetail(f.headers, generated.id);
    expect(current.latest.inputRevision).toBe(current.record.inputRevision);
    expect(current.brief.path).toBeNull();
  });
  it("cannot overwrite a completed action with a concurrent planned edit", async () => {
    const f = await savedWorkflow();
    const generated = await generateOpportunity(f.headers, {
      needId: f.needId,
      companyId: f.companyId,
      partnershipType: "in_kind",
    });
    const detail = await getOpportunityDetail(f.headers, generated.id);
    await editOpportunity(f.headers, generated.id, {
      ...detail.brief,
      ownerId: f.editor.id,
    });
    const event = await saveActivity(f.headers, {
      opportunityId: generated.id,
      kind: "introduction",
      status: "planned",
      targetPersonId: f.personId,
      channel: "message",
      description: "Request a permitted introduction.",
    });
    const barrier = await pool.connect();
    let results:
      | Promise<
          PromiseSettledResult<Awaited<ReturnType<typeof saveActivity>>>[]
        >
      | undefined;
    const waitForLock = async (query: string) => {
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if ((await pool.query(query)).rows[0].ready) return;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      throw new Error(
        "The concurrent activity operation did not reach its database barrier.",
      );
    };
    try {
      await barrier.query("SELECT pg_advisory_lock(70411002)");
      await pool.query(`CREATE FUNCTION pi_test_completion_barrier() RETURNS trigger
        LANGUAGE plpgsql AS $$ BEGIN
        IF OLD.status='planned' AND NEW.status='completed' THEN
          PERFORM pg_advisory_xact_lock(70411002);
        END IF;
        RETURN NEW;
        END $$`);
      await pool.query(`CREATE TRIGGER pi_test_completion_barrier
        BEFORE UPDATE ON activity FOR EACH ROW EXECUTE FUNCTION pi_test_completion_barrier()`);
      const completion = saveActivity(f.headers, {
        ...event,
        status: "completed",
        occurredDate: "2020-01-01",
      });
      // Pause completion while it holds organization/opportunity/activity locks.
      // The competing edit must wait at the first lock in that order.
      await waitForLock(`SELECT EXISTS(SELECT 1 FROM pg_locks
        WHERE NOT granted AND locktype='advisory' AND objid=70411002) AS ready`);
      const plannedEdit = saveActivity(f.headers, {
        ...event,
        status: "planned",
        description: "Edit an earlier plan.",
      });
      results = Promise.allSettled([completion, plannedEdit]);
      await waitForLock(`SELECT EXISTS(SELECT 1 FROM pg_stat_activity
        WHERE datname=current_database() AND wait_event_type='Lock'
        AND wait_event<>'advisory'
        AND (query LIKE '%"activity"%' OR query LIKE '%"organization"%')) AS ready`);
      await barrier.query("SELECT pg_advisory_unlock(70411002)");
      const [completed, edited] = await results;
      expect(completed.status).toBe("fulfilled");
      expect(edited).toMatchObject({
        status: "rejected",
        reason: { code: "COMPLETED_ACTIVITY" },
      });
      const [stored] = await db
        .select()
        .from(activity)
        .where(eq(activity.id, event.id));
      expect(stored.status).toBe("completed");
      expect(stored.completedAt).not.toBeNull();
    } finally {
      await barrier.query("SELECT pg_advisory_unlock(70411002)");
      if (results) await results;
      await pool.query(
        "DROP TRIGGER IF EXISTS pi_test_completion_barrier ON activity",
      );
      await pool.query("DROP FUNCTION IF EXISTS pi_test_completion_barrier()");
      barrier.release();
    }
  });
  it("requires an active owner and preserves opportunity uniqueness on concurrent retries", async () => {
    const f = await savedWorkflow();
    const results = await Promise.all([
      generateOpportunity(f.headers, {
        needId: f.needId,
        companyId: f.companyId,
        partnershipType: "in_kind",
      }),
      generateOpportunity(f.headers, {
        needId: f.needId,
        companyId: f.companyId,
        partnershipType: "in_kind",
      }),
    ]);
    expect(results[0].id).toBe(results[1].id);
    expect(await db.select().from(opportunity)).toHaveLength(1);
    await expect(
      saveActivity(f.headers, {
        opportunityId: results[0].id,
        kind: "introduction",
        status: "planned",
        targetPersonId: f.personId,
        channel: "message",
        description: "Not owned",
      }),
    ).rejects.toMatchObject({ code: "OWNER_REQUIRED" });
    expect(await db.select().from(activity)).toHaveLength(0);
  });
});
