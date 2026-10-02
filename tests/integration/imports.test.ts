import { beforeEach, afterAll, describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import {
  db,
  pool,
  person,
  company,
  importBatch,
  partnership,
  previousOutreach,
  relationship,
  evidence,
} from "../../src/server/db";
import { resetTestDatabase } from "../helpers/database";
import { editorContext, savedWorkflow } from "../helpers/workflow";
import {
  getWorkspaceData,
  saveRecord,
} from "../../src/modules/records/service";
import {
  previewImport as createPreview,
  cancelImport,
  commitImport,
  getImport,
  purgeExpiredImports,
} from "../../src/modules/imports/service";
import { parseCsv, templates } from "../../src/modules/imports/csv";
import {
  getOnboarding,
  saveOnboarding,
  readiness,
} from "../../src/modules/onboarding/service";
const bytes = (s: string) => new TextEncoder().encode(s);
const mapping = (kind: keyof typeof templates) =>
  Object.fromEntries(templates[kind].map((k) => [k, k]));
async function previewImport(
  headers: Headers,
  kind: keyof typeof templates,
  bytes: Uint8Array,
  mapping: Record<string, string>,
) {
  const columns = parseCsv(bytes).headers;
  return createPreview(
    headers,
    kind,
    bytes,
    Object.fromEntries(
      Object.entries(mapping).filter(([, column]) => columns.includes(column)),
    ),
  );
}
beforeEach(resetTestDatabase);
afterAll(() => pool.end());
describe("atomic private imports and saved onboarding", () => {
  it("cancels previews and rejects invalid rows without business writes; exclusions commit only selected rows", async () => {
    const f = await editorContext();
    let batch = await previewImport(
      f.headers,
      "people",
      bytes("source_id,name,roles\np-1,Alex Example,member\np-2,,advisor"),
      mapping("people"),
    );
    expect(batch.rows[1].errors.length).toBeGreaterThan(0);
    await expect(
      commitImport(f.headers, batch.id, [
        { row: 2, action: "create" },
        { row: 3, action: "create" },
      ]),
    ).rejects.toMatchObject({ code: "INVALID_ROWS" });
    expect(await db.select().from(person)).toHaveLength(0);
    await cancelImport(f.headers, batch.id);
    expect((await getImport(f.headers, batch.id)).rows).toEqual([]);
    expect(await db.select().from(person)).toHaveLength(0);
    batch = await previewImport(
      f.headers,
      "people",
      bytes(
        "source_id,name,roles\np-1,Alex Example,member;advisor\np-2,,advisor",
      ),
      mapping("people"),
    );
    const result = await commitImport(f.headers, batch.id, [
      { row: 2, action: "create" },
      { row: 3, action: "exclude" },
    ]);
    expect(result.summary).toEqual({
      total: 2,
      created: 1,
      updated: 0,
      excluded: 1,
    });
    expect((await getImport(f.headers, batch.id)).rows).toEqual([]);
    expect(await db.select().from(person)).toHaveLength(1);
  });
  it("requires explicit ambiguous email resolution and never merges same-name people", async () => {
    const f = await editorContext();
    const first = await saveRecord(f.headers, "people", {
      name: "Alex Example",
      email: "shared@example.test",
      roles: ["member"],
    });
    await saveRecord(f.headers, "people", {
      name: "Different Example",
      email: "shared@example.test",
      roles: ["advisor"],
    });
    const batch = await previewImport(
      f.headers,
      "people",
      bytes(
        "source_id,name,email,roles\np-3,Alex Example,shared@example.test,alumni\np-4,Alex Example,,contact",
      ),
      mapping("people"),
    );
    expect(batch.rows[0].candidates).toHaveLength(2);
    const emailOnly = await previewImport(
      f.headers,
      "people",
      bytes("name,email,roles\nAlex Example,shared@example.test,member"),
      mapping("people"),
    );
    expect(emailOnly.rows[0].candidates.map((c) => c.reason)).toEqual([
      "exact email",
      "exact email",
    ]);
    expect(batch.rows[1].candidates).toHaveLength(0);
    expect(batch.rows[1].warnings.join()).toContain("Names never");
    await expect(
      commitImport(f.headers, batch.id, [
        { row: 2, action: "update" },
        { row: 3, action: "create" },
      ]),
    ).rejects.toMatchObject({ code: "RESOLUTION_REQUIRED" });
    await commitImport(f.headers, batch.id, [
      { row: 2, action: "update", recordId: first.id },
      { row: 3, action: "create" },
    ]);
    expect(await db.select().from(person)).toHaveLength(3);
  });
  it("serializes concurrent confirms and source-ID reimports; rejects a changed identity snapshot", async () => {
    const f = await editorContext();
    const csv = bytes(
      "source_id,name,domain\nc-1,Cedar Example,cedar.example.test",
    );
    const batch = await previewImport(
      f.headers,
      "companies",
      csv,
      mapping("companies"),
    );
    const decisions = [{ row: 2, action: "create" }];
    const results = await Promise.all([
      commitImport(f.headers, batch.id, decisions),
      commitImport(f.headers, batch.id, decisions),
    ]);
    expect(results[0]).toEqual(results[1]);
    expect(await db.select().from(company)).toHaveLength(1);
    const again = await previewImport(
      f.headers,
      "companies",
      csv,
      mapping("companies"),
    );
    const recordId = again.rows[0].candidates[0].id;
    await expect(
      commitImport(f.headers, again.id, decisions),
    ).rejects.toMatchObject({ code: "SOURCE_ID_EXISTS" });
    await commitImport(f.headers, again.id, [
      { row: 2, action: "update", recordId },
    ]);
    expect(await db.select().from(company)).toHaveLength(1);
    const pending = await previewImport(
      f.headers,
      "companies",
      csv,
      mapping("companies"),
    );
    await saveRecord(f.headers, "companies", {
      id: recordId,
      sourceId: "c-1",
      name: "Changed Cedar",
      domain: "cedar.example.test",
    });
    await expect(
      commitImport(f.headers, pending.id, [
        { row: 2, action: "update", recordId },
      ]),
    ).rejects.toMatchObject({ code: "IDENTITY_CHANGED" });
  });
  it("rejects competing previews after another commit creates the same source identity", async () => {
    const f = await editorContext();
    const csv = bytes(
      "source_id,name,email,roles\np-race,Alex Example,ALEX@EXAMPLE.TEST,member",
    );
    const first = await previewImport(
      f.headers,
      "people",
      csv,
      mapping("people"),
    );
    const second = await previewImport(
      f.headers,
      "people",
      csv,
      mapping("people"),
    );
    const results = await Promise.allSettled([
      commitImport(f.headers, first.id, [{ row: 2, action: "create" }]),
      commitImport(f.headers, second.id, [{ row: 2, action: "create" }]),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find((r) => r.status === "rejected")).toMatchObject({
      reason: { code: "IDENTITY_CHANGED" },
    });
    expect(await db.select().from(person)).toHaveLength(1);
    expect((await db.select().from(person))[0].email).toBe("alex@example.test");
    const repeated = await previewImport(
      f.headers,
      "people",
      bytes(
        "source_id,name,email,roles\np-other,Other,shared@example.test,member\np-another,Another,shared@example.test,contact",
      ),
      mapping("people"),
    );
    expect(repeated.rows[1].errors.join()).toContain(
      "Repeated source ID or exact identity",
    );
  });
  it("edits several needs, separate employment periods and an explicitly sourced known contact", async () => {
    const f = await savedWorkflow();
    await saveRecord(f.headers, "needs", {
      title: "Translation",
      description: "Translate workshop material.",
      category: "translation",
      partnershipType: "expertise",
    });
    const contact = await saveRecord(f.headers, "people", {
      name: "Contact Example",
      roles: ["contact"],
    });
    const source = await saveRecord(f.headers, "evidence", {
      claim: "Anna reports former employment and knows Contact Example",
      sourceType: "observation",
      attribution: "Fictional Anna interview",
      excerpt: "I worked there previously and know Contact Example.",
      observedDate: "2025-01-01",
    });
    await saveRecord(f.headers, "relationships", {
      personId: f.personId,
      companyId: f.companyId,
      kind: "previously_worked_at",
      state: "ended",
      startDate: "2020-01-01",
      endDate: "2021-01-01",
      evidenceId: source.id,
    });
    await saveRecord(f.headers, "relationships", {
      personId: f.personId,
      targetPersonId: contact.id,
      kind: "knows",
      state: "current",
      evidenceId: source.id,
    });
    const data = await getWorkspaceData(f.headers);
    expect(data.needs).toHaveLength(2);
    expect(data.relationships).toHaveLength(3);
    expect(
      data.affiliations
        .filter((a) => a.personId === f.personId)
        .map((a) => a.role)
        .sort(),
    ).toEqual(["advisor", "alumni"]);
  });
  it("rolls back an earlier row if a later write fails at the database boundary", async () => {
    const f = await editorContext();
    const batch = await previewImport(
      f.headers,
      "companies",
      bytes("source_id,name\nc-1,First\nc-2,Second"),
      mapping("companies"),
    );
    // A DB constraint failure exercises rollback after the first insert, rather than just preflight rejection.
    await db.execute(
      sql`ALTER TABLE company ADD CONSTRAINT test_import_rollback CHECK (name <> 'Second')`,
    );
    try {
      await expect(
        commitImport(f.headers, batch.id, [
          { row: 2, action: "create" },
          { row: 3, action: "create" },
        ]),
      ).rejects.toBeDefined();
      expect(await db.select().from(company)).toHaveLength(0);
      expect((await getImport(f.headers, batch.id)).status).toBe("pending");
    } finally {
      await db.execute(
        sql`ALTER TABLE company DROP CONSTRAINT test_import_rollback`,
      );
    }
  });
  it("validates all four templates and resolves employment/history references only to saved records", async () => {
    const f = await savedWorkflow();
    const people = await previewImport(
      f.headers,
      "people",
      bytes("source_id,name,roles\np-contact,Contact Example,contact"),
      mapping("people"),
    );
    await commitImport(f.headers, people.id, [{ row: 2, action: "create" }]);
    const companies = await previewImport(
      f.headers,
      "companies",
      bytes("source_id,name,domain\nc-2,Cedar Other,other.example.test"),
      mapping("companies"),
    );
    await commitImport(f.headers, companies.id, [{ row: 2, action: "create" }]);
    const relationships = await previewImport(
      f.headers,
      "relationships",
      bytes(
        `source_id,person_source_id,company_source_id,kind,state,start_date,evidence_id\nr-1,p-contact,c-2,previously_worked_at,ended,2020-01-01,${f.sourceId}\nr-2,missing,c-2,works_at,current,,${f.sourceId}`,
      ),
      mapping("relationships"),
    );
    expect(relationships.rows[0].errors).toEqual([]);
    expect(relationships.rows[1].errors.join()).toContain("match exactly one");
    await commitImport(f.headers, relationships.id, [
      { row: 2, action: "create" },
      { row: 3, action: "exclude" },
    ]);
    expect(
      (await db.select().from(relationship)).find((r) => r.sourceId === "r-1")
        ?.state,
    ).toBe("ended");
    const partners = await previewImport(
      f.headers,
      "partnerships",
      bytes(
        "source_id,company_source_id,title,type,state,start_date,end_date\ns-1,c-2,Past material support,in_kind,ended,2022-01-01,2023-01-01\ns-2,c-2,Bad dates,cash,current,2023-01-01,2022-01-01",
      ),
      mapping("partnerships"),
    );
    expect(partners.rows[1].errors.length).toBeGreaterThan(0);
    await commitImport(f.headers, partners.id, [
      { row: 2, action: "create" },
      { row: 3, action: "exclude" },
    ]);
    expect(await db.select().from(partnership)).toHaveLength(1);
    await saveRecord(f.headers, "previousOutreach", {
      companyId: f.companyId,
      contactRole: "Operations lead",
      channel: "email",
      occurredDate: "2025-01-01",
      description: "Fictional email about workshop fixtures.",
      outcome: "no_reply",
      source: "Fictional archived email",
    });
    expect(await db.select().from(previousOutreach)).toHaveLength(1);
  });
  it("expires previews on the next import operation and enforces private access", async () => {
    const f = await editorContext();
    const batch = await previewImport(
      f.headers,
      "companies",
      bytes("name\nCedar"),
      mapping("companies"),
    );
    await db
      .update(importBatch)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(importBatch.id, batch.id));
    await purgeExpiredImports();
    expect((await getImport(f.headers, batch.id)).rows).toEqual([]);
    await expect(
      commitImport(f.headers, batch.id, [{ row: 2, action: "create" }]),
    ).rejects.toMatchObject({ code: "PREVIEW_EXPIRED" });
    await expect(
      previewImport(
        new Headers(),
        "companies",
        bytes("name\nCedar"),
        mapping("companies"),
      ),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(getImport(new Headers(), batch.id)).rejects.toBeDefined();
    await expect(cancelImport(new Headers(), batch.id)).rejects.toBeDefined();
    await expect(
      commitImport(new Headers(), batch.id, []),
    ).rejects.toBeDefined();
    await expect(
      saveOnboarding(new Headers(), { step: 2 }),
    ).rejects.toBeDefined();
    await expect(
      saveRecord(f.headers, "partnerships", {
        companyId: randomUUID(),
        title: "Foreign",
        type: "cash",
      }),
    ).rejects.toBeDefined();
  });
  it("resumes saved onboarding/skips and offers evidence tasks or a supported pair without personal paths", async () => {
    const f = await editorContext();
    expect((await getOnboarding(f.headers)).step).toBe(0);
    await saveOnboarding(f.headers, { step: 3, skip: 2 });
    expect(await getOnboarding(f.headers)).toMatchObject({
      step: 3,
      skippedSteps: [2],
    });
    await saveOnboarding(f.headers, { step: 2 });
    await saveOnboarding(f.headers, { step: 3 });
    expect((await getOnboarding(f.headers)).skippedSteps).toEqual([]);
    const n = await saveRecord(f.headers, "needs", {
      title: "Community translation",
      description: "Translate a workshop handout.",
      category: "translation",
      partnershipType: "expertise",
    });
    const c = await saveRecord(f.headers, "companies", {
      name: "Language Example",
    });
    expect(readiness(await getWorkspaceData(f.headers)).tasks.join()).toContain(
      "linked to a supplied",
    );
    const e = await saveRecord(f.headers, "evidence", {
      claim: "Offers translation",
      sourceType: "observation",
      attribution: "Fictional supplied brochure",
      excerpt: "Translation support",
      observedDate: "2025-01-01",
    });
    await saveRecord(f.headers, "capabilities", {
      companyId: c.id,
      category: "translation",
      description: "Translation support",
      evidenceId: e.id,
    });
    const ready = readiness(await getWorkspaceData(f.headers));
    expect(ready.supported).toMatchObject([{ needId: n.id, companyId: c.id }]);
    expect(ready.tasks).toEqual([]);
    expect(await db.select().from(person)).toHaveLength(0);
    await db
      .update(evidence)
      .set({ observedDate: "2099-01-01" })
      .where(eq(evidence.id, e.id));
    expect(readiness(await getWorkspaceData(f.headers)).supported).toEqual([]);
    await db
      .update(evidence)
      .set({ observedDate: "2025-01-01", reviewState: "disputed" })
      .where(eq(evidence.id, e.id));
    expect(readiness(await getWorkspaceData(f.headers)).supported).toEqual([]);
  });
  it("reports conflicting source IDs versus email/domain before writing, including older saved previews", async () => {
    const f = await editorContext();
    for (const kind of ["people", "companies"] as const) {
      const field = kind === "people" ? "email" : "domain";
      const identityA =
        kind === "people" ? "alpha@example.test" : "alpha.example.test";
      const identityB =
        kind === "people" ? "beta@example.test" : "beta.example.test";
      const extra = kind === "people" ? { roles: ["member"] } : {};
      const first = await saveRecord(f.headers, kind, {
        sourceId: "alpha",
        name: "Alpha Example",
        [field]: identityA,
        ...extra,
      });
      const second = await saveRecord(f.headers, kind, {
        sourceId: "beta",
        name: "Beta Example",
        [field]: identityB,
        ...extra,
      });
      const batch = await previewImport(
        f.headers,
        kind,
        bytes(
          `source_id,name,${field}${kind === "people" ? ",roles" : ""}\nalpha,Conflicting Example,${identityB}${kind === "people" ? ",member" : ""}`,
        ),
        mapping(kind),
      );
      expect(batch.rows[0].errors.join()).toContain(
        "identify different saved records",
      );
      await expect(
        commitImport(f.headers, batch.id, [
          { row: 2, action: "update", recordId: second.id },
        ]),
      ).rejects.toMatchObject({ code: "INVALID_ROWS" });
      // A pre-upgrade preview may not carry the new validation error. Confirmation must still reject the incompatible target.
      await db
        .update(importBatch)
        .set({ rows: batch.rows.map((row) => ({ ...row, errors: [] })) })
        .where(eq(importBatch.id, batch.id));
      await expect(
        commitImport(f.headers, batch.id, [
          { row: 2, action: "update", recordId: second.id },
        ]),
      ).rejects.toMatchObject({ code: "IDENTITY_CONFLICT", status: 409 });
      const records = (await getWorkspaceData(f.headers))[kind];
      expect(records.find((r) => r.id === first.id)?.sourceId).toBe("alpha");
      expect(records.find((r) => r.id === second.id)?.sourceId).toBe("beta");
      await cancelImport(f.headers, batch.id);
    }
  });
});
