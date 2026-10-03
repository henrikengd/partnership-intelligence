import { beforeEach, afterAll, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { resetTestDatabase } from "../helpers/database";
import { editorContext } from "../helpers/workflow";
import {
  saveRecord,
  getWorkspaceData,
} from "../../src/modules/records/service";
import {
  saveIncentive,
  getCandidatePreviews,
  startGenerationRun,
} from "../../src/modules/opportunities/runs";
import { readiness, getReadiness } from "../../src/modules/onboarding/service";
import { db, pool, evidence } from "../../src/server/db";
beforeEach(resetTestDatabase);
afterAll(() => pool.end());
it("onboarding supports evidenced cash incentives without a synthetic capability and shares candidate source rules", async () => {
  const f = await editorContext();
  const need = await saveRecord(f.headers, "needs", {
    title: "Fictional community grant",
    description: "Fund defined materials",
    category: "cash",
    partnershipType: "cash",
  });
  const company = await saveRecord(f.headers, "companies", {
    name: "Fictional grant foundation",
  });
  const today = new Date().toISOString().slice(0, 10);
  const source = await saveRecord(f.headers, "evidence", {
    claim: "Fictional current grant accepts workshop requests",
    sourceType: "observation",
    attribution: "Fictional grant notice",
    excerpt: "Fictional supplied grant criteria",
    observedDate: today,
    reviewState: "supplied",
  });
  await saveIncentive(f.headers, {
    needId: need.id,
    companyId: company.id,
    evidenceId: source.id,
    description: "Fictional community grant matches defined material funding",
  });
  const data = await getWorkspaceData(f.headers);
  expect(data.capabilities).toHaveLength(0);
  expect(data.companyNeedIncentives).toHaveLength(1);
  expect(readiness(data).supported.map((p) => p.companyId)).toEqual([
    company.id,
  ]);
  expect((await getReadiness(f.headers)).tasks).toEqual([]);
  const run = await startGenerationRun(f.headers, {
    needId: need.id,
    idempotencyKey: randomUUID(),
  });
  expect(run.status).toBe("completed");
  for (const patch of [
    { reviewState: "disputed" },
    { reviewState: "superseded" },
    { reviewState: "supplied", observedDate: "2099-01-01", reviewDate: null },
    { reviewState: "reviewed", observedDate: today, reviewDate: "2099-01-01" },
  ]) {
    await db.update(evidence).set(patch).where(eq(evidence.id, source.id));
    expect((await getCandidatePreviews(f.headers, need.id))[0].eligible).toBe(
      false,
    );
    expect((await getReadiness(f.headers)).supported).toEqual([]);
  }
  await db
    .update(evidence)
    .set({ reviewState: "reviewed", observedDate: today, reviewDate: today })
    .where(eq(evidence.id, source.id));
  expect((await getReadiness(f.headers)).supported).toHaveLength(1);
});
