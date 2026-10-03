/** Fictional release verification only. Never provision an organization or bypass first-admin setup. */
import "dotenv/config";
import { createHash, randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { eq, desc } from "drizzle-orm";
import * as t from "../../src/server/db";
import { getAuth } from "../../src/server/auth/auth";
import {
  getWorkspaceData,
  saveRecord,
} from "../../src/modules/records/service";
import {
  generateOpportunity,
  getOpportunityDetail,
  editOpportunity,
  reviewFactors,
} from "../../src/modules/opportunities/service";
import { rubric } from "../../src/modules/opportunities/scoring";
import { reviewOpportunity } from "../../src/modules/opportunities/review";
import { companyPaths } from "../../src/modules/network/service";
import { saveActivity } from "../../src/modules/outreach/service";
import { transitionOpportunity } from "../../src/modules/outreach/lifecycle";
import { previewImport, commitImport } from "../../src/modules/imports/service";
import { exportPrivateData } from "../../src/modules/privacy/export";
import {
  previewAiContext,
  saveAiSettings,
  startAiRun,
  retryAiRun,
} from "../../src/server/ai/service";
import { retryGenerationRun } from "../../src/modules/opportunities/runs";
import type { AiPacket, Provider } from "../../src/server/ai/contracts";

const ORG = "Riverbend setup check",
  COMPANY = "Cedar Example Manufacturing",
  NEED = "Workshop fixtures";
const ADMIN = "release-admin@example.test",
  PERSON = "Anna Release Example";
const ask =
  "Machine ten fictional fixtures from supplied CAD drawings by an agreed delivery date.";
const draft = (p: AiPacket) => ({
  whyFit: p.evidence.length
    ? [
        {
          text: "Supplied fictional CNC evidence suggests a fit requiring human review.",
          evidenceRefs: [p.evidence[0].ref],
        },
      ]
    : [],
  ask,
  valueExchange: "Fictional technical collaboration",
  contact: {
    personRef: p.routes[0]?.people[0] ?? null,
    role: p.allowedContactRoles[0],
  },
  routeRef: p.routes[0]?.ref ?? null,
  nextAction: "Verify willingness with [person].",
  approach: "Request a short technical discussion.",
  outreachText: "Could we discuss machining ten fictional fixtures?",
  missingInformation: ["Capacity remains unconfirmed."],
  cautions: ["Fictional draft; citation validity is not semantic proof."],
});
const provider: Provider = async (p) => draft(p);
async function guard() {
  if (process.env.RELEASE_CHECK_CONFIRM !== "fictional-release-only")
    throw new Error(
      "Explicit fictional release-check confirmation is required.",
    );
  const url = new URL(process.env.DATABASE_URL ?? "");
  const app = new URL(process.env.BETTER_AUTH_URL ?? "");
  if (
    url.hostname !== "db" ||
    url.pathname !== "/partnership" ||
    decodeURIComponent(url.username) !== "partnership" ||
    app.protocol !== "http:" ||
    app.hostname !== "localhost" ||
    !["3110", "3111"].includes(app.port) ||
    process.env.APPLICATION_MODE === "demo"
  )
    throw new Error(
      "Release checks require the separately provisioned localhost Compose release installation.",
    );
  const identity = await t.pool.query(
    "SELECT current_database() AS db,current_user AS login",
  );
  assert.deepEqual(identity.rows[0], {
    db: "partnership",
    login: "partnership",
  });
  const orgs = await t.db.select().from(t.organization);
  assert.equal(orgs.length, 1);
  assert.equal(orgs[0].name, ORG);
  const users = await t.db.select().from(t.user);
  assert.equal(users.length, 1);
  assert.equal(users[0].email, ADMIN);
  assert.equal(users[0].role, "admin");
  assert.equal(users[0].active, true);
  const companies = await t.db.select().from(t.company);
  assert.equal(companies.length, 1);
  assert.equal(companies[0].name, COMPANY);
  const needs = await t.db.select().from(t.need);
  assert.equal(needs.length, 1);
  assert.equal(needs[0].title, NEED);
  const people = await t.db.select().from(t.person);
  assert(
    people.every((p) => p.name === PERSON),
    "Unrecognized person; release fixture refused.",
  );
  return {
    org: orgs[0],
    admin: users[0],
    company: companies[0],
    need: needs[0],
  };
}
async function login() {
  const password = process.env.RELEASE_ADMIN_PASSWORD;
  if (!password)
    throw new Error(
      "Supply the private fictional administrator password through the operator environment.",
    );
  const origin = process.env.BETTER_AUTH_URL!;
  const response = await getAuth().handler(
    new Request(`${origin}/api/auth/sign-in/email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin,
        "x-forwarded-for": "127.0.0.1",
      },
      body: JSON.stringify({ email: ADMIN, password }),
    }),
  );
  assert.equal(response.status, 200, "Release administrator login failed.");
  return new Headers({
    cookie: response.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; "),
    origin,
  });
}
async function augment() {
  const f = await guard();
  assert.equal(
    (await t.db.select().from(t.person)).length,
    0,
    "Augment only the fresh fictional browser workflow once.",
  );
  const h = await login();
  const today = new Date().toISOString().slice(0, 10);
  const original = (await getWorkspaceData(h)).opportunities;
  assert.equal(
    original.length,
    1,
    "First opportunity must exist from the browser workflow.",
  );
  const capabilitySource = (await t.db.select().from(t.evidence))[0];
  assert(capabilitySource);
  await saveRecord(h, "evidence", {
    ...capabilitySource,
    reviewState: "reviewed",
    reviewDate: today,
  });
  const person = await saveRecord(h, "people", {
    name: PERSON,
    email: "anna-release@example.test",
    sourceId: "fictional-release-anna",
    roles: ["alumni", "advisor"],
    notes: "Fictional release-only personal note.",
  });
  const employment = await saveRecord(h, "evidence", {
    claim: "Anna Release Example reports current Cedar employment",
    sourceType: "observation",
    attribution: "Anna Release Example, fictional release observation",
    excerpt:
      "Fictional engineer currently employed at Cedar; private-release-evidence-marker.",
    observedDate: today,
    reviewState: "reviewed",
    reviewDate: today,
  });
  await saveRecord(h, "relationships", {
    kind: "works_at",
    personId: person.id,
    companyId: f.company.id,
    title: "Engineer",
    state: "current",
    startDate: "2020-01-01",
    strength: 3,
    evidenceId: employment.id,
    willingness: "unknown",
  });
  const peopleImport = await previewImport(
    h,
    "people",
    new TextEncoder().encode(
      `source_id,name,email,roles\nfictional-release-anna,${PERSON},anna-release@example.test,alumni;advisor`,
    ),
    { source_id: "source_id", name: "name", email: "email", roles: "roles" },
  );
  await commitImport(h, peopleImport.id, [
    { row: 2, action: "update", recordId: person.id },
  ]);
  const partnerImport = await previewImport(
    h,
    "partnerships",
    new TextEncoder().encode(
      `source_id,company_id,title,type,state,start_date,end_date,description\nfictional-release-old-partner,${f.company.id},Fictional past tool support,in_kind,ended,2020-01-01,2021-01-01,Fictional contribution history`,
    ),
    {
      source_id: "source_id",
      company_id: "company_id",
      title: "title",
      type: "type",
      state: "state",
      start_date: "start_date",
      end_date: "end_date",
      description: "description",
    },
  );
  await commitImport(h, partnerImport.id, [{ row: 2, action: "create" }]);
  await saveRecord(h, "previousOutreach", {
    companyId: f.company.id,
    personId: person.id,
    occurredDate: "2020-01-01",
    channel: "email",
    description: "Fictional earlier request through Anna Release Example.",
    source: "Attributed fictional release observation",
    outcome: "no_reply",
  });
  const generated = await generateOpportunity(h, {
    companyId: f.company.id,
    needId: f.need.id,
    partnershipType: "in_kind",
    refreshOpportunityId: original[0].id,
  });
  const factors = Object.fromEntries(
    rubric.map((r) => [
      r.key,
      {
        value:
          r.key === "fit"
            ? 4
            : r.key === "relationship"
              ? 3
              : r.key === "urgency"
                ? 2
                : null,
        rationale:
          r.key === "fit"
            ? "Fictional reviewed machining capability meets the defined fixture need."
            : r.key === "relationship"
              ? "Fictional current employment route recorded; introduction willingness remains unknown."
              : r.key === "urgency"
                ? "Recorded normal organization priority."
                : "Unknown in this fictional release fixture.",
        origin: "organization",
        evidenceIds:
          r.key === "fit"
            ? [capabilitySource.id]
            : r.key === "relationship"
              ? [employment.id]
              : [],
        source: "Explicit fictional release organization assessment.",
      },
    ]),
  );
  await reviewFactors(h, generated.id, factors);
  await editOpportunity(h, generated.id, {
    ownerId: f.admin.id,
    ask,
    valueExchange: "Release-edited collaboration value exchange",
    contactRole: "Manufacturing manager",
    nextAction: "Ask Anna Release Example to verify the relevant contact role.",
    approach: "Release-edited technical meeting plan",
  });
  const paths = companyPaths(await getWorkspaceData(h), f.company.id);
  assert(paths.current.length > 0);
  await reviewOpportunity(h, generated.id, {
    fitReviewed: true,
    askReviewed: true,
    targetReviewed: true,
    nextActionReviewed: true,
    fitValue: 4,
    fitRationale:
      "Reviewed fictional CNC specification matches the supplied machining capability.",
    fitEvidenceIds: [capabilitySource.id],
    ask,
    contactRole: "Manufacturing manager",
    targetPersonId: null,
    nextAction: "Ask Anna Release Example to verify the relevant contact role.",
    approachMode: "introduction",
    pathId: paths.current[0].id,
  });
  await transitionOpportunity(h, generated.id, {
    requestId: randomUUID(),
    action: "transition",
    fromState: "suggested",
    toState: "pursuing",
  });
  const planned = await saveActivity(h, {
    opportunityId: generated.id,
    kind: "introduction",
    status: "planned",
    targetPersonId: person.id,
    targetRole: "Manufacturing manager",
    channel: "meeting",
    description: "Fictional introduction request through Anna Release Example.",
    followUpDate: "2020-02-01",
  });
  await saveActivity(h, {
    ...planned,
    status: "completed",
    occurredDate: "2020-01-15",
  });
  await transitionOpportunity(h, generated.id, {
    requestId: randomUUID(),
    action: "agreement",
    fromState: "pursuing",
    confirmed: true,
    occurredDate: "2020-03-01",
    source: "Fictional confirmed agreement with Anna Release Example.",
    newPartnership: {
      title: "Fictional agreed machining contribution",
      type: "in_kind",
      state: "current",
      startDate: "2020-04-01",
      description: "Fictional release contribution; no real agreement.",
    },
  });
  process.env.OPENAI_API_KEY = "fictional-release-check-only-key";
  await saveAiSettings(h, { enabled: true, model: "fictional-release-model" });
  const preview = await previewAiContext(h, generated.id);
  const result = await startAiRun(
    h,
    {
      opportunityId: generated.id,
      packet: preview.packet,
      previewRevision: preview.previewRevision,
      idempotencyKey: randomUUID(),
    },
    { provider },
  );
  assert.equal(result.status, "completed");
  await exportPrivateData(h, "people");
  console.log(
    JSON.stringify({
      event: "release_fixture_augmented",
      opportunities: 1,
      people: 1,
      imports: 2,
      ai: "fake_provider_completed",
    }),
  );
}
function canonical(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object")
    return Object.fromEntries(
      Object.entries(v)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, x]) => [k, canonical(x)]),
    );
  return v;
}
async function snapshot() {
  await guard();
  const tables = await t.pool.query(
    "SELECT schemaname,tablename FROM pg_tables WHERE schemaname IN ('public','drizzle') ORDER BY schemaname,tablename",
  );
  const result: Record<string, { count: number; sha256: string }> = {};
  for (const table of tables.rows) {
    const schema = String(table.schemaname),
      name = String(table.tablename);
    assert(/^[a-z_]+$/.test(schema) && /^[a-z_]+$/.test(name));
    const rows = await t.pool.query(
      `SELECT row_to_json(t) AS record FROM "${schema}"."${name}" AS t`,
    );
    const records = rows.rows
      .map((r) => JSON.stringify(canonical(r.record)))
      .sort();
    result[`${schema}.${name}`] = {
      count: records.length,
      sha256: createHash("sha256")
        .update(JSON.stringify(records))
        .digest("hex"),
    };
  }
  console.log(JSON.stringify({ tables: result }));
}
async function abandon() {
  await guard();
  const h = await login();
  const [op] = await t.db.select().from(t.opportunity);
  assert(op);
  const [run] = await t.db
    .select()
    .from(t.generationRun)
    .orderBy(desc(t.generationRun.createdAt));
  const [ai] = await t.db.select().from(t.aiRun).where(eq(t.aiRun.attempt, 1));
  assert(run && ai);
  await t.db
    .update(t.generationRun)
    .set({
      status: "running",
      finishedAt: null,
      results: [],
      selection: { ...run.selection, refreshOpportunityId: op.id },
    })
    .where(eq(t.generationRun.id, run.id));
  await t.db
    .update(t.aiRun)
    .set({
      status: "running",
      finishedAt: null,
      draft: null,
      errorCategory: null,
    })
    .where(eq(t.aiRun.id, ai.id));
  assert((await getOpportunityDetail(h, op.id)).versions.length > 1);
  console.log(
    JSON.stringify({
      event: "artificial_abandoned_runs_prepared",
      generation: 1,
      ai: 1,
    }),
  );
}
async function retry() {
  await guard();
  const h = await login();
  const [run] = await t.db
    .select()
    .from(t.generationRun)
    .where(eq(t.generationRun.status, "interrupted"));
  const [ai] = await t.db
    .select()
    .from(t.aiRun)
    .where(eq(t.aiRun.status, "interrupted"));
  assert(
    run && ai,
    "Actual startup must mark both artificial runs interrupted.",
  );
  const regenerated = await retryGenerationRun(h, run.id);
  assert.equal(regenerated.status, "completed");
  assert.equal(regenerated.attempt, 2);
  process.env.OPENAI_API_KEY = "fictional-release-check-only-key";
  await saveAiSettings(h, { enabled: true, model: "fictional-release-model" });
  const preview = await previewAiContext(h, ai.opportunityId);
  const retried = await retryAiRun(
    h,
    ai.id,
    {
      opportunityId: ai.opportunityId,
      packet: preview.packet,
      previewRevision: preview.previewRevision,
      idempotencyKey: randomUUID(),
    },
    { provider },
  );
  assert.equal(retried.status, "completed");
  assert.equal((await t.db.select().from(t.opportunity)).length, 1);
  const detail = await getOpportunityDetail(h, ai.opportunityId);
  assert.equal(detail.record.state, "agreed");
  assert.equal(
    detail.brief.valueExchange,
    "Release-edited collaboration value exchange",
  );
  assert.equal(
    detail.brief.approach,
    "Request an introduction through the reviewed recorded path. Reconfirm willingness for this request before any company outreach.",
  );
  assert.equal(detail.activities[0].occurredDate, "2020-01-15");
  console.log(
    JSON.stringify({
      event: "explicit_retry_verified",
      generationAttempt: 2,
      aiAttempt: 2,
      opportunities: 1,
    }),
  );
}
async function loggingProbe() {
  await guard();
  let category: string | undefined;
  try {
    await t.pool.query(
      "INSERT INTO company (id,organization_id,name,description) VALUES ($1,$2,$3,$4)",
      [
        randomUUID(),
        (await t.db.select().from(t.organization))[0].id,
        null,
        "RELEASE_LOG_PRIVATE_MARKER",
      ],
    );
  } catch (error) {
    category = (error as { code?: string }).code;
  }
  assert.equal(category, "23502");
  console.log(
    JSON.stringify({
      event: "parameterized_logging_probe",
      constraintRejected: true,
    }),
  );
}
try {
  const action = process.argv[2];
  if (action === "augment") await augment();
  else if (action === "snapshot") await snapshot();
  else if (action === "abandon") await abandon();
  else if (action === "retry") await retry();
  else if (action === "logging-probe") await loggingProbe();
  else
    throw new Error(
      "Use augment, snapshot, abandon, retry or logging-probe for an explicitly confirmed fictional release installation.",
    );
} finally {
  await t.pool.end();
}
