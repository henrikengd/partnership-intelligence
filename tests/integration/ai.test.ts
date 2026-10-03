import { beforeEach, afterAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { resetTestDatabase } from "../helpers/database";
import { savedWorkflow } from "../helpers/workflow";
import {
  db,
  pool,
  aiRun,
  aiConfiguration,
  opportunity,
  assessment,
  activity,
  user,
} from "../../src/server/db";
import {
  generateOpportunity,
  getOpportunityDetail,
} from "../../src/modules/opportunities/service";
import {
  previewAiContext,
  startAiRun,
  retryAiRun,
  listAiRuns,
  saveAiSettings,
  getAiSettings,
} from "../../src/server/ai/service";
import { recoverInterruptedAiRuns } from "../../src/server/ai/recovery";
import { saveRecord } from "../../src/modules/records/service";
import {
  AiError,
  type Provider,
  type AiPacket,
} from "../../src/server/ai/contracts";
import { readJson } from "../../src/server/http";
import {
  GET as settingsGet,
  PUT as settingsPut,
} from "../../src/app/api/ai/settings/route";
const fakeDraft = (packet: AiPacket) => ({
  whyFit: packet.evidence.length
    ? [
        {
          text: "The supplied capability suggests a possible fit, pending review.",
          evidenceRefs: [packet.evidence[0].ref],
        },
      ]
    : [],
  ask: "Machine ten fictional fixtures.",
  valueExchange: "Technical collaboration.",
  contact: {
    personRef: packet.routes[0]?.people[0] ?? null,
    role: packet.allowedContactRoles[0],
  },
  routeRef: packet.routes[0]?.ref ?? null,
  nextAction: "Verify willingness with [person].",
  approach: "Request a short technical discussion.",
  outreachText: "Could we discuss machining ten fixtures?",
  missingInformation: ["Capacity is unconfirmed."],
  cautions: ["Citations do not establish semantic support."],
});
const provider: Provider = async (packet) => fakeDraft(packet);
async function fixture() {
  const f = await savedWorkflow();
  const o = await generateOpportunity(f.headers, {
    needId: f.needId,
    companyId: f.companyId,
    partnershipType: "in_kind",
  });
  return { ...f, opportunityId: o.id };
}
async function request(
  f: Awaited<ReturnType<typeof fixture>>,
  instruction = "Draft a specific proposal",
) {
  const preview = await previewAiContext(f.headers, f.opportunityId);
  return {
    opportunityId: f.opportunityId,
    packet: { ...preview.packet, userInstructions: instruction },
    previewRevision: preview.previewRevision,
    idempotencyKey: crypto.randomUUID(),
  };
}
async function enable(f: Awaited<ReturnType<typeof fixture>>) {
  await saveAiSettings(f.adminHeaders, {
    enabled: true,
    model: "fictional-model-config",
  });
}
beforeEach(async () => {
  await resetTestDatabase();
  process.env.OPENAI_API_KEY = "fictional-test-key";
});
afterAll(async () => {
  delete process.env.OPENAI_API_KEY;
  await pool.end();
});
describe("optional private AI requests", () => {
  it("defaults off, protects configuration and private endpoints, requires server key", async () => {
    const f = await fixture();
    const fake = vi.fn(provider);
    expect(await getAiSettings(f.headers)).toMatchObject({
      enabled: false,
      canConfigure: false,
    });
    await expect(
      startAiRun(f.headers, await request(f), { provider: fake }),
    ).rejects.toMatchObject({ code: "AI_DISABLED" });
    expect(fake).not.toHaveBeenCalled();
    await expect(
      saveAiSettings(f.headers, { enabled: true, model: "test" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    delete process.env.OPENAI_API_KEY;
    await expect(
      saveAiSettings(f.adminHeaders, { enabled: true, model: "test" }),
    ).rejects.toMatchObject({ code: "AI_CONFIGURATION" });
    expect(
      (await settingsGet(new Request("http://localhost:3104/api/ai/settings")))
        .status,
    ).toBe(401);
    expect(
      (
        await settingsPut(
          new Request("http://localhost:3104/api/ai/settings", {
            method: "PUT",
            headers: {
              ...Object.fromEntries(f.adminHeaders),
              origin: "https://attacker.example.test",
              "content-type": "application/json",
            },
            body: JSON.stringify({ enabled: false, model: "test" }),
          }),
        )
      ).status,
    ).toBe(403);
  });
  it("bounds HTTP bytes separately from approved Unicode context characters", async () => {
    const f = await fixture();
    await enable(f);
    const raw = await request(f);
    raw.packet.need.description = "語".repeat(3900);
    raw.packet.evidence[0].excerpt = "語".repeat(3900);
    raw.packet.userInstructions = "語".repeat(1800);
    const makeRequest = (body: string) =>
      new Request("http://localhost:3104/api/ai/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      });
    const serialized = JSON.stringify(raw);
    expect(serialized.length).toBeLessThan(12000);
    expect(Buffer.byteLength(serialized)).toBeGreaterThan(16384);
    const fake = vi.fn(provider);
    const parsed = await readJson(makeRequest(serialized), 65536);
    expect(
      (await startAiRun(f.headers, parsed, { provider: fake })).status,
    ).toBe("completed");
    expect(fake).toHaveBeenCalledTimes(1);
    await expect(readJson(makeRequest(serialized))).rejects.toMatchObject({
      code: "BODY_TOO_LARGE",
    });
    await expect(
      readJson(
        makeRequest(JSON.stringify({ text: "語".repeat(23000) })),
        65536,
      ),
    ).rejects.toMatchObject({ code: "BODY_TOO_LARGE" });
  });
  it("previews exactly minimized source/need data and saves a separate pending draft", async () => {
    const f = await fixture();
    await saveRecord(f.headers, "needs", {
      id: f.needId,
      title: "Manufacturing",
      description:
        "Anna Example can help; email anna@example.test or call +47 123 45 678",
      category: "manufacturing",
      partnershipType: "in_kind",
    });
    await enable(f);
    const detail = await getOpportunityDetail(f.headers, f.opportunityId);
    const raw = await request(f, "Use a short message.");
    const display = await previewAiContext(f.headers, f.opportunityId);
    expect(display.localReferences.people).toContainEqual({
      ref: "P1",
      name: "Anna Example",
    });
    expect(display.localReferences.routes[0].label).toContain("Anna Example");
    expect(JSON.stringify(raw.packet)).not.toMatch(
      /Anna|Example|@|123 45|https:|personId|organizationId/,
    );
    expect(raw.packet.routes[0]).toMatchObject({
      connections: [
        { kind: "organization_affiliation" },
        { kind: "works_at", role: "Engineer" },
      ],
    });
    const fake = vi.fn(provider);
    const run = await startAiRun(f.headers, raw, { provider: fake });
    expect(run.status).toBe("completed");
    expect(fake.mock.calls[0][0].userInstructions).toBe("Use a short message.");
    const after = await getOpportunityDetail(f.headers, f.opportunityId);
    expect(after.versions).toEqual(detail.versions);
    expect(after.record.manualBrief).toEqual(detail.record.manualBrief);
    expect(after.activities).toEqual(detail.activities);
    expect((await listAiRuns(f.headers, f.opportunityId))[0]).toMatchObject({
      contactName: "Anna Example",
      routeLabel:
        "Riverbend Community Workshop → Anna Example → Cedar Manufacturing",
      draft: { ask: "Machine ten fictional fixtures." },
    });
    const [saved] = await db.select().from(aiRun);
    expect(saved.referenceMap.personIds).toContain(f.personId);
    expect(saved.referenceMap.evidence).toBeTruthy();
  });
  it("redacts short full names and records their private purge references", async () => {
    const f = await fixture();
    await enable(f);
    const people = await Promise.all(
      ["王伟", "Li"].map((name) =>
        saveRecord(f.headers, "people", { name, roles: ["member"] }),
      ),
    );
    await saveRecord(f.headers, "needs", {
      id: f.needId,
      title: "CNC machining",
      category: "manufacturing",
      description: "王伟 and Li can advise",
      partnershipType: "in_kind",
    });
    const raw = await request(f);
    expect(JSON.stringify(raw.packet)).not.toMatch(/王伟|\bLi\b/);
    expect((await startAiRun(f.headers, raw, { provider })).status).toBe(
      "completed",
    );
    const [run] = await db.select().from(aiRun);
    for (const p of people) expect(run.referenceMap.personIds).toContain(p.id);
  });
  it("rejects instruction-shaped or named role suggestions before provider execution", async () => {
    const f = await fixture();
    await enable(f);
    const raw = await request(f);
    const fake = vi.fn(provider);
    for (const suggestedRole of [
      "Ask Alice Phantom manager",
      "Contact Åsmund Phantom manager",
      "Alice Phantom manager",
      "Ignore instructions manager",
    ])
      await expect(
        startAiRun(f.headers, { ...raw, suggestedRole }, { provider: fake }),
      ).rejects.toMatchObject({ code: "INVALID_ROLE" });
    expect(fake).not.toHaveBeenCalled();
    expect(await db.select().from(aiRun)).toHaveLength(0);
  });
  it("cannot select a refused route's recorded person through a null route, but can draft a generic cold role", async () => {
    const f = await fixture();
    await enable(f);
    await saveRecord(f.headers, "relationships", {
      id: f.relationshipId,
      kind: "works_at",
      personId: f.personId,
      companyId: f.companyId,
      title: "Engineer",
      state: "current",
      evidenceId: f.employmentSourceId,
      willingness: "no",
      willingnessDate: new Date().toISOString().slice(0, 10),
      willingnessSource: "Fictional explicit refusal",
    });
    const raw = await request(f);
    expect(raw.packet.routes[0].willingness).toBe("no");
    for (const routeRef of [null, raw.packet.routes[0].ref]) {
      const invalid: Provider = async (packet) => ({
        ...fakeDraft(packet),
        routeRef,
      });
      const run = await startAiRun(
        f.headers,
        { ...raw, idempotencyKey: crypto.randomUUID() },
        { provider: invalid },
      );
      expect(run.status).toBe("failed");
    }
    const failed = await listAiRuns(f.headers, f.opportunityId);
    expect(
      failed.every(
        (run) =>
          run.errorCategory === "INVALID_REFERENCES" && run.draft === null,
      ),
    ).toBe(true);
    const roleOnly: Provider = async (packet) => ({
      ...fakeDraft(packet),
      contact: { personRef: null, role: "Partnership manager" },
      routeRef: null,
      nextAction:
        "Verify the relevant company role and capacity before cold outreach.",
    });
    expect(
      (
        await startAiRun(
          f.headers,
          { ...raw, idempotencyKey: crypto.randomUUID() },
          { provider: roleOnly },
        )
      ).status,
    ).toBe("completed");
  });
  it("rejects names mixed with an allowed role without replacing the whole role phrase", async () => {
    const f = await fixture();
    await enable(f);
    for (const nextAction of [
      "Ask Alice Phantom manager",
      "Contact Partnership manager. Ask Alice Phantom manager.",
      "Contact Åsmund Phantom, the Partnership manager.",
    ]) {
      const bad: Provider = async (packet) => ({
        ...fakeDraft(packet),
        nextAction,
      });
      expect(
        (await startAiRun(f.headers, await request(f), { provider: bad }))
          .status,
      ).toBe("failed");
    }
    expect(
      (await listAiRuns(f.headers, f.opportunityId)).every(
        (run) => run.errorCategory === "PRIVATE_DRAFT" && run.draft === null,
      ),
    ).toBe(true);
  });
  it("keeps saved draft history available when a valid domain edit cannot fit a new AI packet", async () => {
    const f = await fixture();
    await enable(f);
    const run = await startAiRun(f.headers, await request(f), { provider });
    await saveRecord(f.headers, "relationships", {
      id: f.relationshipId,
      kind: "works_at",
      personId: f.personId,
      companyId: f.companyId,
      title: "A".repeat(180),
      state: "current",
      evidenceId: f.employmentSourceId,
    });
    await expect(
      previewAiContext(f.headers, f.opportunityId),
    ).rejects.toThrow();
    expect((await listAiRuns(f.headers, f.opportunityId))[0]).toMatchObject({
      id: run.id,
      status: "completed",
      draft: { ask: "Machine ten fictional fixtures." },
    });
  });
  it("freezes an explicitly previewed generic role and rejects stale or invented metadata before networking", async () => {
    const f = await fixture();
    await enable(f);
    const preview = await previewAiContext(
      f.headers,
      f.opportunityId,
      "grant officer",
    );
    expect(preview.packet.allowedContactRoles).toContain("grant officer");
    const raw = {
      opportunityId: f.opportunityId,
      packet: preview.packet,
      previewRevision: preview.previewRevision,
      suggestedRole: "grant officer",
      idempotencyKey: crypto.randomUUID(),
    };
    expect((await startAiRun(f.headers, raw, { provider })).status).toBe(
      "completed",
    );
    const bad = await request(f);
    bad.packet.evidence[0].reviewState = "reviewed";
    const fake = vi.fn(provider);
    await expect(
      startAiRun(f.headers, bad, { provider: fake }),
    ).rejects.toMatchObject({ code: "INVALID_CONTEXT" });
    const stale = await request(f);
    await saveRecord(f.headers, "evidence", {
      id: f.sourceId,
      claim: "Changed fictional capability",
      sourceType: "supplied_source",
      url: "https://fictional.example.test",
      excerpt: "Capacity needs checking",
      observedDate: new Date().toISOString().slice(0, 10),
    });
    await expect(
      startAiRun(f.headers, stale, { provider: fake }),
    ).rejects.toMatchObject({ code: "STALE_CONTEXT" });
    expect(fake).not.toHaveBeenCalled();
  });
  it.each(["REFUSED", "INCOMPLETE", "INVALID_DRAFT", "TIMEOUT"])(
    "records %s and permits one newly reviewed explicit retry",
    async (category) => {
      const f = await fixture();
      await enable(f);
      const before = await getOpportunityDetail(f.headers, f.opportunityId);
      const failing: Provider =
        category === "TIMEOUT"
          ? async () => new Promise(() => {})
          : async () => {
              throw new AiError(category);
            };
      const run = await startAiRun(f.headers, await request(f), {
        provider: failing,
        timeoutMs: 5,
      });
      expect(run.status).toBe("failed");
      expect(
        (await listAiRuns(f.headers, f.opportunityId))[0].errorCategory,
      ).toBe(category);
      const retry = await request(f, "Newly reviewed retry context.");
      const succeeded = await retryAiRun(f.headers, run.id, retry, {
        provider,
      });
      expect(succeeded.status).toBe("completed");
      expect((await listAiRuns(f.headers, f.opportunityId))[0].attempt).toBe(2);
      await expect(
        retryAiRun(f.headers, run.id, await request(f), { provider }),
      ).rejects.toMatchObject({ code: "AI_RETRY_UNAVAILABLE" });
      expect(
        (await getOpportunityDetail(f.headers, f.opportunityId)).versions,
      ).toEqual(before.versions);
    },
  );
  it("bounds concurrency and duplicate submissions, retries, interrupted recovery and late callbacks", async () => {
    const f = await fixture();
    await enable(f);
    let release!: (v: unknown) => void;
    let notify!: () => void;
    const entered = new Promise<void>((r) => (notify = r));
    const pending = new Promise<unknown>((r) => (release = r));
    const fake = vi.fn<Provider>(async () => {
      notify();
      return pending;
    });
    const raw = await request(f);
    const first = startAiRun(f.headers, raw, { provider: fake });
    await entered;
    const duplicate = await startAiRun(f.headers, raw, { provider: fake });
    expect(duplicate.status).toBe("running");
    await expect(
      startAiRun(f.headers, await request(f), { provider: fake }),
    ).rejects.toMatchObject({ code: "AI_BUSY" });
    expect(fake).toHaveBeenCalledTimes(1);
    expect(await recoverInterruptedAiRuns()).toHaveLength(1);
    expect(await recoverInterruptedAiRuns()).toHaveLength(0);
    const retry = await request(f, "Retry after restart with reviewed context");
    expect(
      (await retryAiRun(f.headers, duplicate.id, retry, { provider })).status,
    ).toBe("completed");
    expect(
      (await retryAiRun(f.headers, duplicate.id, retry, { provider: fake }))
        .status,
    ).toBe("completed");
    release(fakeDraft(raw.packet));
    await first;
    const [saved] = await db.select().from(aiRun);
    expect(saved.attempt).toBe(2);
    expect(saved.packet.userInstructions).toBe(retry.packet.userInstructions);
    expect(saved.status).toBe("completed");
    expect(fake).toHaveBeenCalledTimes(1);
  });
  it("rejects malformed or invented output and preserves manual edits made during a request", async () => {
    const f = await fixture();
    await enable(f);
    await db
      .update(opportunity)
      .set({ manualBrief: { ask: "Manual ask belongs to the editor." } })
      .where(eq(opportunity.id, f.opportunityId));
    const before = await db.select().from(assessment);
    for (const changed of [
      { contact: { personRef: "P99", role: null } },
      {
        nextAction:
          "Ask Alice Phantom, the Partnership manager, for an introduction",
      },
      { outreachText: "email phantom@example.test" },
      { score: 100 },
      { ask: "   " },
    ]) {
      const bad: Provider = async (p) => ({ ...fakeDraft(p), ...changed });
      expect(
        (await startAiRun(f.headers, await request(f), { provider: bad }))
          .status,
      ).toBe("failed");
    }
    expect(await db.select().from(assessment)).toEqual(before);
    expect((await db.select().from(opportunity))[0].manualBrief).toEqual({
      ask: "Manual ask belongs to the editor.",
    });
    expect(await db.select().from(activity)).toHaveLength(0);
  });
  it("checks config revocation and input changes before saving results", async () => {
    const f = await fixture();
    await enable(f);
    const changeConfig: Provider = async (p) => {
      await db
        .update(aiConfiguration)
        .set({ enabled: false })
        .where(
          eq(
            aiConfiguration.organizationId,
            (await getOpportunityDetail(f.headers, f.opportunityId)).record
              .organizationId,
          ),
        );
      return fakeDraft(p);
    };
    const a = await startAiRun(f.headers, await request(f), {
      provider: changeConfig,
    });
    expect(a.status).toBe("failed");
    expect(
      (await listAiRuns(f.headers, f.opportunityId))[0].errorCategory,
    ).toBe("CONFIGURATION_CHANGED");
    await enable(f);
    const changeInput: Provider = async (p) => {
      await db
        .update(opportunity)
        .set({
          inputRevision: 99,
          manualBrief: { ask: "Concurrent manual edit" },
        })
        .where(eq(opportunity.id, f.opportunityId));
      return fakeDraft(p);
    };
    const b = await startAiRun(f.headers, await request(f), {
      provider: changeInput,
    });
    expect(b.status).toBe("failed");
    expect(
      (await listAiRuns(f.headers, f.opportunityId))[0].errorCategory,
    ).toBe("INPUT_CHANGED");
    expect((await db.select().from(opportunity))[0].manualBrief).toEqual({
      ask: "Concurrent manual edit",
    });
  });
  it("revoked account cannot retain a draft after the provider returns", async () => {
    const f = await fixture();
    await enable(f);
    const revoke: Provider = async (p) => {
      await db
        .update(user)
        .set({ active: false })
        .where(eq(user.id, f.editor.id));
      return fakeDraft(p);
    };
    expect(
      (await startAiRun(f.headers, await request(f), { provider: revoke }))
        .status,
    ).toBe("failed");
    const [run] = await db.select().from(aiRun);
    expect(run.errorCategory).toBe("UNAUTHORIZED");
    expect(run.draft).toBeNull();
  });
});
