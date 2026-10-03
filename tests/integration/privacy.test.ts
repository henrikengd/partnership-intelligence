import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { resetTestDatabase } from "../helpers/database";
import { savedWorkflow } from "../helpers/workflow";
import * as t from "../../src/server/db";
import {
  generateOpportunity,
  getOpportunityDetail,
  editOpportunity,
} from "../../src/modules/opportunities/service";
import { saveRecord } from "../../src/modules/records/service";
import { transitionOpportunity } from "../../src/modules/outreach/lifecycle";
import {
  previewPersonDeletion,
  confirmPersonDeletion,
  purgePrivateRetention,
} from "../../src/modules/privacy/service";
import { exportPrivateData } from "../../src/modules/privacy/export";
import { exportKinds } from "../../src/modules/privacy/contracts";
import {
  previewAiContext,
  saveAiSettings,
  startAiRun,
} from "../../src/server/ai/service";
import { previewImport, commitImport } from "../../src/modules/imports/service";
import { GET as exportGet } from "../../src/app/api/admin/privacy/export/route";
import { POST as previewPost } from "../../src/app/api/admin/privacy/preview/route";
import { POST as confirmPost } from "../../src/app/api/admin/privacy/confirm/route";
import { POST as retentionPost } from "../../src/app/api/admin/privacy/retention/route";

async function fixture() {
  const f = await savedWorkflow();
  const o = await generateOpportunity(f.headers, {
    companyId: f.companyId,
    needId: f.needId,
    partnershipType: "in_kind",
  });
  return { ...f, opportunityId: o.id };
}
beforeEach(async () => {
  await resetTestDatabase();
  process.env.OPENAI_API_KEY = "fictional-test-only-key";
});
afterAll(async () => {
  delete process.env.OPENAI_API_KEY;
  await t.pool.end();
});
describe("administrator private data controls", () => {
  it("purges renamed, historical identities and dependent narratives while preserving coherent actual outcomes", async () => {
    const f = await fixture();
    await editOpportunity(f.headers, f.opportunityId, {
      ownerId: f.editor.id,
      ask: "Anna Example private-proposal-marker",
      valueExchange: "Technical collaboration",
      contactRole: "Operations lead",
      nextAction: "Verify capacity",
      approach: "Request a meeting",
    });
    const result = await transitionOpportunity(f.headers, f.opportunityId, {
      requestId: crypto.randomUUID(),
      action: "agreement",
      fromState: "suggested",
      confirmed: true,
      occurredDate: "2020-03-04",
      source: "Anna Example private-agreement-marker",
      newPartnership: {
        title: "Anna Example contribution",
        type: "in_kind",
        state: "current",
        startDate: "2020-04-01",
        description: "Anna Example private-partner-marker",
      },
    });
    await t.db.insert(t.activity).values({
      organizationId: result.record.organizationId,
      opportunityId: f.opportunityId,
      kind: "meeting",
      channel: "meeting",
      status: "completed",
      description: "Anna Example private-meeting-marker",
      targetPersonId: f.personId,
      occurredDate: "2020-03-01",
      completedAt: new Date(),
      recordedBy: f.editor.id,
    });
    await t.db.insert(t.importBatch).values({
      organizationId: result.record.organizationId,
      kind: "partnerships",
      status: "committed",
      rows: [],
      mappings: [
        { row: 2, action: "created", recordId: result.record.partnershipId! },
      ],
      recordedBy: f.editor.id,
      expiresAt: new Date(Date.now() + 60000),
      summary: { created: 1, updated: 0, excluded: 0, total: 1 },
    });
    const latest = (await t.db.select().from(t.assessment))[0];
    await t.db.insert(t.opportunityReview).values({
      organizationId: result.record.organizationId,
      opportunityId: f.opportunityId,
      assessmentId: latest.id,
      inputRevision: result.record.inputRevision,
      briefRevision: result.record.revision,
      reviewedBy: f.editor.id,
      fitRationale: "Anna Example private-review-marker",
      ask: "Anna Example can advise",
      contactRole: "Operations lead",
      targetPersonId: f.personId,
      nextAction: "Anna Example introduction",
      approachMode: "introduction",
      pathId: latest.brief.path?.id,
    });
    await t.db.insert(t.aiRun).values({
      organizationId: result.record.organizationId,
      opportunityId: f.opportunityId,
      assessmentId: latest.id,
      requestedBy: f.editor.id,
      inputRevision: result.record.inputRevision,
      idempotencyKey: crypto.randomUUID(),
      requestFingerprint: "fictional",
      lastActionKey: crypto.randomUUID(),
      lastActionFingerprint: "fictional",
      status: "completed",
      packet: {
        need: {
          title: "Fixtures",
          description: "Fictional capacity",
          partnershipType: "in_kind",
          deadline: null,
        },
        company: { name: "Cedar Manufacturing" },
        evidence: [],
        routes: [],
        allowedContactRoles: ["Operations lead"],
        userInstructions: "private-ai-marker",
      },
      referenceMap: {
        people: { P1: f.personId },
        personIds: [f.personId],
        relationshipIds: [f.relationshipId],
        evidence: {},
        routes: {},
      },
      model: "fictional-model",
      configRevision: new Date(),
      finishedAt: new Date(),
      draft: {
        whyFit: [],
        ask: "private-ai-marker",
        valueExchange: "Technical collaboration",
        contact: { personRef: "P1", role: "Operations lead" },
        routeRef: null,
        nextAction: "Confirm capacity",
        approach: "Request meeting",
        outreachText: "private-ai-marker",
        missingInformation: [],
        cautions: [],
      },
    });
    await saveRecord(f.headers, "previousOutreach", {
      companyId: f.companyId,
      personId: f.personId,
      occurredDate: "2020-02-01",
      channel: "email",
      description: "Anna Example private-prior-marker",
      source: "Anna Example observation",
      outcome: "in_discussion",
    });
    await saveRecord(f.headers, "people", {
      id: f.personId,
      name: "Renamed Example",
      email: "renamed@example.test",
      roles: ["alumni"],
    });
    const p = await previewPersonDeletion(f.adminHeaders, f.personId);
    expect(p.counts.assessments).toBeGreaterThan(0);
    expect(p.counts.reviews).toBe(1);
    expect(p.counts.aiRuns).toBe(1);
    expect(p.counts.previousOutreach).toBe(1);
    expect(p.counts.importMappings).toBe(1);
    const before = await t.db.select().from(t.person);
    expect(before).toHaveLength(1); // Preview and cancellation have no mutation.
    await confirmPersonDeletion(f.adminHeaders, {
      token: p.token,
      confirmed: true,
    });
    await confirmPersonDeletion(f.adminHeaders, {
      token: p.token,
      confirmed: true,
    });
    expect(await t.db.select().from(t.person)).toHaveLength(0);
    expect(await t.db.select().from(t.relationship)).toHaveLength(0);
    expect(await t.db.select().from(t.assessment)).toHaveLength(0);
    expect(await t.db.select().from(t.opportunityReview)).toHaveLength(0);
    expect(await t.db.select().from(t.aiRun)).toHaveLength(0);
    expect((await t.db.select().from(t.previousOutreach))[0]).toMatchObject({
      personId: null,
      outcome: "in_discussion",
      occurredDate: "2020-02-01",
    });
    const [op] = await t.db.select().from(t.opportunity);
    expect(op).toMatchObject({
      state: "agreed",
      partnershipId: result.record.partnershipId,
      ownerId: f.editor.id,
      manualBrief: {},
      reviewState: "needs_review",
    });
    const [event] = await t.db.select().from(t.opportunityEvent);
    expect(event).toMatchObject({
      toState: "agreed",
      occurredDate: "2020-03-04",
      partnershipId: op.partnershipId,
    });
    const [partner] = await t.db.select().from(t.partnership);
    expect(partner).toMatchObject({
      state: "current",
      startDate: "2020-04-01",
      companyId: f.companyId,
    });
    const [act] = await t.db.select().from(t.activity);
    expect(act).toMatchObject({
      status: "completed",
      occurredDate: "2020-03-01",
      targetPersonId: null,
    });
    expect((await t.db.select().from(t.importBatch))[0].mappings).toEqual([]);
    for (const kind of exportKinds) {
      const output = await exportPrivateData(f.adminHeaders, kind);
      expect(output.csv).not.toMatch(
        /Anna Example|Renamed Example|renamed@example|private-(proposal|agreement|partner|meeting|pledge|review|prior|ai)/,
      );
      expect(output.csv).not.toMatch(
        /password|sessionToken|BETTER_AUTH_SECRET/,
      );
    }
    expect(
      (await t.db.select().from(t.auditEvent)).filter(
        (a) => a.action === "person_deleted",
      ),
    ).toHaveLength(1);
    await expect(
      getOpportunityDetail(f.headers, f.opportunityId),
    ).rejects.toMatchObject({ code: "ASSESSMENT_MISSING" });
    const refreshed = await generateOpportunity(f.headers, {
      needId: f.needId,
      companyId: f.companyId,
      partnershipType: "in_kind",
      refreshOpportunityId: f.opportunityId,
    });
    expect(refreshed.id).toBe(f.opportunityId);
    expect(
      JSON.stringify(await getOpportunityDetail(f.headers, f.opportunityId)),
    ).not.toContain("Anna Example");
  });
  it("rejects stale, changed and tampered previews without altering private records", async () => {
    const f = await fixture();
    const p = await previewPersonDeletion(f.adminHeaders, f.personId);
    await saveRecord(f.headers, "people", {
      id: f.personId,
      name: "Changed Example",
      roles: ["alumni"],
    });
    await expect(
      confirmPersonDeletion(f.adminHeaders, {
        token: p.token,
        confirmed: true,
      }),
    ).rejects.toMatchObject({ code: "STALE_PREVIEW" });
    await expect(
      confirmPersonDeletion(f.adminHeaders, {
        token: p.token + "tampered",
        confirmed: true,
      }),
    ).rejects.toMatchObject({ code: "INVALID_PREVIEW" });
    expect(await t.db.select().from(t.person)).toHaveLength(1);
    expect(await t.db.select().from(t.auditEvent)).toHaveLength(0);
  });
  it("includes isolated event-only, capability-only and incentive-only personal narratives", async () => {
    const f = await fixture();
    const org = (await t.db.select().from(t.organization))[0];
    const isolatedIds: string[] = [];
    for (const kind of ["event", "capability", "incentive"]) {
      const company = await saveRecord(f.headers, "companies", {
        name: `Separate fictional ${kind} supplier`,
      });
      // Generate before adding the private narrative, so snapshots cannot mask dependency-root regressions.
      const cold = await generateOpportunity(f.headers, {
        needId: f.needId,
        companyId: company.id,
        partnershipType: "in_kind",
      });
      isolatedIds.push(cold.id);
      await editOpportunity(f.headers, cold.id, {
        ownerId: f.editor.id,
        ask: "Manual capacity request",
        valueExchange: "Technical collaboration",
        contactRole: "Operations lead",
        nextAction: "Verify capacity",
        approach: "Request meeting",
      });
      if (kind === "event") {
        await transitionOpportunity(f.headers, cold.id, {
          requestId: crypto.randomUUID(),
          action: "transition",
          fromState: "suggested",
          toState: "archived",
          reason: "Anna Example private-event-marker",
        });
      } else {
        const source = await saveRecord(f.headers, "evidence", {
          claim: "Supplied company capacity",
          sourceType: "supplied_source",
          url: `https://${kind}.example.test`,
          excerpt: "Company capacity",
          observedDate: "2020-01-01",
        });
        if (kind === "capability")
          await saveRecord(f.headers, "capabilities", {
            companyId: company.id,
            category: "manufacturing",
            description: "Anna Example private-capability-marker",
            evidenceId: source.id,
          });
        else
          await t.db
            .insert(t.companyNeedIncentive)
            .values({
              organizationId: org.id,
              companyId: company.id,
              needId: f.needId,
              description: "Anna Example private-incentive-marker",
              evidenceId: source.id,
              recordedBy: f.editor.id,
            });
      }
    }
    const p = await previewPersonDeletion(f.adminHeaders, f.personId);
    expect(p.counts.capabilities).toBe(1);
    expect(p.counts.incentives).toBe(1);
    expect(p.counts.opportunities).toBe(4);
    await confirmPersonDeletion(f.adminHeaders, {
      token: p.token,
      confirmed: true,
    });
    for (const id of isolatedIds) {
      expect(
        await t.db
          .select()
          .from(t.assessment)
          .where(eq(t.assessment.opportunityId, id)),
      ).toHaveLength(0);
      expect(
        (
          await t.db
            .select()
            .from(t.opportunity)
            .where(eq(t.opportunity.id, id))
        )[0].manualBrief,
      ).toEqual({});
    }
    expect((await t.db.select().from(t.opportunityEvent))[0].reason).toContain(
      "removed",
    );
    for (const kind of exportKinds)
      expect((await exportPrivateData(f.adminHeaders, kind)).csv).not.toMatch(
        /Anna Example|private-(capability|incentive|event)/,
      );
  });
  it("matches short names as names, preserving unrelated facilities and capability prose", async () => {
    const f = await fixture();
    const li = await saveRecord(f.headers, "people", {
      name: "Li",
      sourceId: "1",
      roles: ["member"],
    });
    await saveRecord(f.headers, "companies", {
      id: f.companyId,
      name: "Cedar Manufacturing",
      description: "Our facilities have reliable capability.",
    });
    const p = await previewPersonDeletion(f.adminHeaders, li.id);
    expect(p.counts.opportunities).toBe(0);
    expect(p.counts.evidence).toBe(0);
    await confirmPersonDeletion(f.adminHeaders, {
      token: p.token,
      confirmed: true,
    });
    expect((await t.db.select().from(t.company))[0].description).toContain(
      "facilities",
    );
    expect(await t.db.select().from(t.assessment)).toHaveLength(1);
    expect((await t.db.select().from(t.person))[0].name).toBe("Anna Example");
  });
  it("cancels pending imports and purges expired normalized rows without retaining raw files", async () => {
    const f = await fixture();
    const preview = await previewImport(
      f.headers,
      "people",
      new TextEncoder().encode("name,roles\nAnna Example,alumni"),
      { name: "name", roles: "roles" },
    );
    const p = await previewPersonDeletion(f.adminHeaders, f.personId);
    await confirmPersonDeletion(f.adminHeaders, {
      token: p.token,
      confirmed: true,
    });
    expect((await t.db.select().from(t.importBatch))[0]).toMatchObject({
      status: "cancelled",
      rows: [],
    });
    await expect(
      commitImport(f.headers, preview.id, [{ row: 2, action: "create" }]),
    ).rejects.toThrow();
    const expired = await previewImport(
      f.headers,
      "people",
      new TextEncoder().encode("name,roles\nPrivate fictional person,member"),
      { name: "name", roles: "roles" },
    );
    await t.db
      .update(t.importBatch)
      .set({ expiresAt: new Date(0) })
      .where(eq(t.importBatch.id, expired.id));
    expect(
      (await purgePrivateRetention(f.adminHeaders)).counts.expiredImports,
    ).toBe(1);
    expect(
      (await t.db.select().from(t.importBatch)).every(
        (b) => b.rows.length === 0,
      ),
    ).toBe(true);
  });
  it("denies anonymous/editor direct endpoint requests and foreign origins", async () => {
    const f = await fixture();
    for (const headers of [new Headers(), f.headers]) {
      const expected = headers.has("cookie") ? 403 : 401;
      const req = (url: string) =>
        new Request(`${process.env.BETTER_AUTH_URL}${url}`, {
          method: "POST",
          headers: new Headers({
            ...Object.fromEntries(headers),
            "content-type": "application/json",
          }),
          body: JSON.stringify({
            personId: f.personId,
            token: "fake",
            confirmed: true,
          }),
        });
      expect(
        (await previewPost(req("/api/admin/privacy/preview"))).status,
      ).toBe(expected);
      expect(
        (await confirmPost(req("/api/admin/privacy/confirm"))).status,
      ).toBe(expected);
      expect(
        (await retentionPost(req("/api/admin/privacy/retention"))).status,
      ).toBe(expected);
      expect(
        (
          await exportGet(
            new Request(
              `${process.env.BETTER_AUTH_URL}/api/admin/privacy/export?kind=people`,
              { headers },
            ),
          )
        ).status,
      ).toBe(expected);
    }
    expect(
      (
        await previewPost(
          new Request(
            `${process.env.BETTER_AUTH_URL}/api/admin/privacy/preview`,
            {
              method: "POST",
              headers: {
                ...Object.fromEntries(f.adminHeaders),
                origin: "https://foreign.example.test",
                "content-type": "application/json",
              },
              body: JSON.stringify({ personId: f.personId }),
            },
          ),
        )
      ).status,
    ).toBe(403);
    expect(await t.db.select().from(t.auditEvent)).toHaveLength(0);
  });
  it("never recreates an AI draft when its provider returns after personal deletion", async () => {
    const f = await fixture();
    await saveAiSettings(f.adminHeaders, {
      enabled: true,
      model: "fictional-model",
    });
    const p = await previewAiContext(f.headers, f.opportunityId);
    let release!: () => void;
    let entered!: () => void;
    const started = new Promise<void>((r) => (entered = r)),
      wait = new Promise<void>((r) => (release = r));
    const pending = startAiRun(
      f.headers,
      {
        opportunityId: f.opportunityId,
        packet: p.packet,
        previewRevision: p.previewRevision,
        idempotencyKey: crypto.randomUUID(),
      },
      {
        provider: async () => {
          entered();
          await wait;
          return {};
        },
      },
    );
    await started;
    const deletion = await previewPersonDeletion(f.adminHeaders, f.personId);
    await confirmPersonDeletion(f.adminHeaders, {
      token: deletion.token,
      confirmed: true,
    });
    release();
    expect(await pending).toMatchObject({
      status: "failed",
      errorCategory: "DATA_DELETED",
    });
    expect(await t.db.select().from(t.aiRun)).toHaveLength(0);
  });
  it("rejects an expired signed preview and binds confirmation to its administrator", async () => {
    const f = await fixture();
    const p = await previewPersonDeletion(f.adminHeaders, f.personId);
    const realNow = Date.now;
    try {
      Date.now = () => realNow() + 11 * 60 * 1000;
      await expect(
        confirmPersonDeletion(f.adminHeaders, {
          token: p.token,
          confirmed: true,
        }),
      ).rejects.toMatchObject({ code: "INVALID_PREVIEW" });
    } finally {
      Date.now = realNow;
    }
    expect(await t.db.select().from(t.person)).toHaveLength(1);
  });
  it("serializes deletion against queued manual edits, normalized imports and AI submission", async () => {
    const f = await fixture();
    await saveAiSettings(f.adminHeaders, {
      enabled: true,
      model: "fictional-model",
    });
    const ai = await previewAiContext(f.headers, f.opportunityId);
    const p = await previewPersonDeletion(f.adminHeaders, f.personId);
    const barrier = await t.pool.connect();
    const waitUntil = async (predicate: () => Promise<boolean>) => {
      const until = Date.now() + 5000;
      while (!(await predicate())) {
        if (Date.now() > until) throw new Error("Database barrier timed out");
        await new Promise((r) => setTimeout(r, 10));
      }
    };
    try {
      await barrier.query("SELECT pg_advisory_lock(70808008)");
      await barrier.query(
        `CREATE FUNCTION privacy_test_barrier() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.privacy_revision <> OLD.privacy_revision THEN PERFORM pg_advisory_xact_lock(70808008); END IF; RETURN NEW; END $$`,
      );
      await barrier.query(
        "CREATE TRIGGER privacy_test_barrier BEFORE UPDATE ON organization FOR EACH ROW EXECUTE FUNCTION privacy_test_barrier()",
      );
      const deletion = confirmPersonDeletion(f.adminHeaders, {
        token: p.token,
        confirmed: true,
      });
      await waitUntil(
        async () =>
          Number(
            (
              await t.pool.query(
                "SELECT count(*) n FROM pg_stat_activity WHERE datname=current_database() AND wait_event='advisory' AND pid<>pg_backend_pid()",
              )
            ).rows[0].n,
          ) > 0,
      );
      const manual = editOpportunity(f.headers, f.opportunityId, {
        ownerId: f.editor.id,
        ask: "Anna Example late-manual-marker",
        valueExchange: "Technical collaboration",
        contactRole: "Operations lead",
        nextAction: "Verify capacity",
        approach: "Request meeting",
      }).then(
        () => "saved",
        (e: { code: string }) => e.code,
      );
      const imported = previewImport(
        f.headers,
        "people",
        new TextEncoder().encode("name,roles\nAnna Example,alumni"),
        { name: "name", roles: "roles" },
      ).then(
        () => "saved",
        (e: { code: string }) => e.code,
      );
      const submitted = startAiRun(
        f.headers,
        {
          opportunityId: f.opportunityId,
          packet: ai.packet,
          previewRevision: ai.previewRevision,
          idempotencyKey: crypto.randomUUID(),
        },
        {
          provider: async () => {
            throw new Error("Provider must not run");
          },
        },
      ).then(
        () => "saved",
        (e: { code: string }) => e.code,
      );
      await waitUntil(
        async () =>
          Number(
            (
              await t.pool.query(
                "SELECT count(*) n FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND wait_event<>'advisory' AND pid<>pg_backend_pid()",
              )
            ).rows[0].n,
          ) >= 3,
      );
      await barrier.query("SELECT pg_advisory_unlock(70808008)");
      await deletion;
      expect(await Promise.all([manual, imported, submitted])).toEqual([
        "PRIVACY_CHANGED",
        "PRIVACY_CHANGED",
        "PRIVACY_CHANGED",
      ]);
      expect((await t.db.select().from(t.opportunity))[0].manualBrief).toEqual(
        {},
      );
      expect(await t.db.select().from(t.importBatch)).toHaveLength(0);
      expect(await t.db.select().from(t.aiRun)).toHaveLength(0);
    } finally {
      await barrier.query("SELECT pg_advisory_unlock(70808008)");
      await barrier.query(
        "DROP TRIGGER IF EXISTS privacy_test_barrier ON organization",
      );
      await barrier.query("DROP FUNCTION IF EXISTS privacy_test_barrier()");
      barrier.release();
    }
  });
});
