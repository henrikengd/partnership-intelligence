import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { resetTestDatabase } from "../helpers/database";
import { editorContext } from "../helpers/workflow";
import { savedNetwork } from "../helpers/network";
import {
  saveRecord,
  getWorkspaceData,
} from "../../src/modules/records/service";
import {
  companyPaths,
  getNetworkGraph,
} from "../../src/modules/network/service";
import { findRelationshipPaths } from "../../src/modules/network/paths";
import { buildDeterministicAssessment } from "../../src/modules/opportunities/generate";
import {
  generateOpportunity,
  editOpportunity,
} from "../../src/modules/opportunities/service";
import { saveActivity } from "../../src/modules/outreach/service";
import { db, pool, relationship, evidence } from "../../src/server/db";
import { eq } from "drizzle-orm";
beforeEach(resetTestDatabase);
afterAll(() => pool.end());
async function paths(f: Awaited<ReturnType<typeof savedNetwork>>) {
  return companyPaths(await getWorkspaceData(f.headers), f.companyId);
}
describe("recorded network paths", () => {
  it("finds direct and explicitly recorded two-person routes, with stable ranking and source provenance", async () => {
    const f = await savedNetwork();
    const p = await paths(f);
    expect(p.current).toHaveLength(2);
    expect(p.current[0].nodes.map((n) => n.label)).toEqual([
      "Riverbend Community Workshop",
      "Anna Example",
      "Bea Example",
      "Cedar Manufacturing",
    ]);
    expect(p.current[0].weakestPersonalStrength).toBe(3);
    expect(p.current[0].edges.at(-1)?.strength).toBe(4);
    expect(p.current[0].willingness).toBe("unknown");
    expect(p.current[0].edges[1].willingnessSource).toBe(
      "Fictional conversation with Anna",
    );
    expect(p.current[0].edges[1].evidenceIds).toEqual([f.personalSourceId]);
    expect(p.current[0].edges[1].evidenceReviewState).toBe("reviewed");
    const reversed = findRelationshipPaths({
      organization: f.data.organization,
      company: f.data.companies[0],
      people: [...f.data.people].reverse(),
      affiliations: [...f.data.affiliations].reverse(),
      relationships: [...f.data.relationships].reverse(),
      evidence: f.data.evidence,
    });
    expect(reversed.current.map((p) => p.id)).toEqual(
      p.current.map((p) => p.id),
    );
  });
  it("bounds routes at two people and terminates explicit cycles", async () => {
    const f = await savedNetwork();
    const third = await saveRecord(f.headers, "people", {
      name: "Cy Example",
      roles: ["contact"],
    });
    await saveRecord(f.headers, "relationships", {
      kind: "knows",
      personId: f.contactId,
      targetPersonId: f.personId,
      evidenceId: f.personalSourceId,
      strength: 4,
    });
    await saveRecord(f.headers, "relationships", {
      kind: "knows",
      personId: f.contactId,
      targetPersonId: third.id,
      evidenceId: f.personalSourceId,
      strength: 4,
    });
    await saveRecord(f.headers, "relationships", {
      kind: "works_at",
      personId: third.id,
      companyId: f.companyId,
      evidenceId: f.personalSourceId,
    });
    const p = await paths(f);
    expect(p.current).toHaveLength(2);
    expect(
      p.current.every(
        (p) => p.nodes.filter((n) => n.kind === "person").length <= 2,
      ),
    ).toBe(true);
    expect(
      p.current.flatMap((p) => p.nodes).some((n) => n.label === "Cy Example"),
    ).toBe(false);
  });
  it("caps stable alternatives at three and does not add professional or personal strengths", async () => {
    const f = await savedNetwork();
    for (let i = 0; i < 5; i++) {
      const p = await saveRecord(f.headers, "people", {
        name: `Contact ${i} Example`,
        roles: ["contact"],
      });
      await saveRecord(f.headers, "relationships", {
        kind: "knows",
        personId: f.personId,
        targetPersonId: p.id,
        evidenceId: f.personalSourceId,
        strength: 2,
      });
      await saveRecord(f.headers, "relationships", {
        kind: "works_at",
        personId: p.id,
        companyId: f.companyId,
        evidenceId: f.personalSourceId,
        strength: 4,
      });
    }
    const p = await paths(f);
    expect(p.current).toHaveLength(3);
    expect(p.current[0].weakestPersonalStrength).toBe(3);
    expect(
      p.current.slice(1).every((p) => p.weakestPersonalStrength === 2),
    ).toBe(true);
    expect((await paths(f)).current.map((p) => p.id)).toEqual(
      p.current.map((p) => p.id),
    );
  });
  it("separates ended, future, unknown and disputed routes from current connections", async () => {
    const f = await savedNetwork();
    await saveRecord(f.headers, "relationships", {
      id: f.relationshipId,
      kind: "previously_worked_at",
      personId: f.personId,
      companyId: f.companyId,
      state: "ended",
      endDate: "2025-01-01",
      evidenceId: f.employmentSourceId,
    });
    await saveRecord(f.headers, "relationships", {
      id: f.personalId,
      kind: "knows",
      personId: f.personId,
      targetPersonId: f.contactId,
      state: "unknown",
      evidenceId: f.personalSourceId,
    });
    let p = await paths(f);
    expect(p.current).toHaveLength(0);
    expect(p.historical).toHaveLength(2);
    expect(
      buildDeterministicAssessment(
        await getWorkspaceData(f.headers),
        f.needId,
        f.companyId,
      ).factors.relationship.value,
    ).toBe(1);
    await saveRecord(f.headers, "relationships", {
      id: f.personalId,
      kind: "knows",
      personId: f.personId,
      targetPersonId: f.contactId,
      startDate: "2099-01-01",
      evidenceId: f.personalSourceId,
    });
    p = await paths(f);
    expect(p.current).toHaveLength(0);
    expect(
      p.historical.some((p) =>
        p.edges.some((e) => e.startDate === "2099-01-01"),
      ),
    ).toBe(true);
    await db
      .update(relationship)
      .set({ startDate: null })
      .where(eq(relationship.id, f.personalId));
    await db
      .update(evidence)
      .set({ reviewState: "disputed" })
      .where(eq(evidence.id, f.personalSourceId));
    expect((await paths(f)).current).toHaveLength(0);
  });
  it("does not manufacture familiarity between shared-employer strangers or reverse a personal record", async () => {
    const f = await savedNetwork();
    await db.delete(relationship).where(eq(relationship.id, f.personalId));
    let p = await paths(f);
    expect(p.current).toHaveLength(1);
    expect(p.current[0].nodes.some((n) => n.id === f.contactId)).toBe(false);
    await saveRecord(f.headers, "relationships", {
      kind: "knows",
      personId: f.contactId,
      targetPersonId: f.personId,
      evidenceId: f.personalSourceId,
    });
    p = await paths(f);
    expect(p.current).toHaveLength(1);
    await saveRecord(f.headers, "people", {
      id: f.personId,
      name: "Anna Example",
      roles: ["contact"],
    });
    expect((await paths(f)).current).toHaveLength(0);
  });
  it("keeps missing strength unknown and respects refusal rather than suggesting a forbidden introduction", async () => {
    const f = await savedNetwork();
    await saveRecord(f.headers, "relationships", {
      id: f.personalId,
      kind: "knows",
      personId: f.personId,
      targetPersonId: f.contactId,
      evidenceId: f.personalSourceId,
      willingness: "no",
      willingnessDate: f.today,
      willingnessSource: "Fictional refusal",
    });
    const p = await paths(f);
    expect(p.current[0].willingness).toBe("unknown");
    expect(p.current[1].willingness).toBe("no");
    expect(p.current[1].weakestPersonalStrength).toBeNull();
    expect(p.current[1].warning).toContain("Respect");
    await saveRecord(f.headers, "relationships", {
      id: f.relationshipId,
      kind: "works_at",
      personId: f.personId,
      companyId: f.companyId,
      evidenceId: f.employmentSourceId,
      willingness: "no",
      willingnessDate: f.today,
      willingnessSource: "Fictional refusal",
    });
    const a = buildDeterministicAssessment(
      await getWorkspaceData(f.headers),
      f.needId,
      f.companyId,
    );
    expect(a.brief.nextAction).toContain("cold approach");
    expect(a.factors.relationship.value).toBeNull();
    expect(a.factors.access.value).toBeNull();
  });
  it("does not convert title, old willingness, or ordinal strength into verified decision authority", async () => {
    const f = await savedNetwork();
    await saveRecord(f.headers, "relationships", {
      id: f.personalId,
      kind: "knows",
      personId: f.personId,
      targetPersonId: f.contactId,
      evidenceId: f.personalSourceId,
      strength: 4,
      willingness: "yes",
      willingnessDate: "2024-01-01",
      willingnessSource: "Fictional older conversation",
    });
    await saveRecord(f.headers, "relationships", {
      id: f.employmentId,
      kind: "works_at",
      personId: f.contactId,
      companyId: f.companyId,
      title: "Manufacturing Manager",
      evidenceId: f.personalSourceId,
      willingness: "yes",
      willingnessDate: "2024-01-01",
      willingnessSource: "Fictional older conversation",
    });
    const a = buildDeterministicAssessment(
      await getWorkspaceData(f.headers),
      f.needId,
      f.companyId,
    );
    expect(a.factors.access.value).toBeNull();
    expect(a.factors.relationship.value).toBe(2);
    expect(a.brief.path?.warning).toContain("Reconfirm");
    expect(
      a.brief.path?.edges.some((e) => e.willingnessDate === "2024-01-01"),
    ).toBe(true);
  });
  it("authorizes graph reads and derives completed history without converting drafts into known contact access", async () => {
    const f = await savedNetwork();
    await expect(getNetworkGraph(new Headers())).rejects.toMatchObject({
      status: 401,
    });
    const op = await generateOpportunity(f.headers, {
      companyId: f.companyId,
      needId: f.needId,
      partnershipType: "in_kind",
    });
    await editOpportunity(f.headers, op.id, {
      ownerId: f.editor.id,
      ask: "Defined fictional ask",
      valueExchange: "Offer a reviewed workshop collaboration",
      contactRole: "Operations lead",
      nextAction: "Verify the relevant role",
      approach: "Choose a permitted cold approach",
    });
    const a = await saveActivity(f.headers, {
      opportunityId: op.id,
      kind: "outreach",
      status: "planned",
      targetRole: "Operations lead",
      channel: "email",
      description: "Fictional draft outreach.",
    });
    expect(
      (await getNetworkGraph(f.headers, { opportunityId: op.id })).history,
    ).toHaveLength(0);
    await saveActivity(f.headers, {
      id: a.id,
      opportunityId: op.id,
      kind: "outreach",
      status: "completed",
      occurredDate: "2020-01-01",
      targetRole: "Operations lead",
      channel: "email",
      description: "Fictional completed outreach.",
    });
    const g = await getNetworkGraph(f.headers, { opportunityId: op.id });
    expect(g.history).toHaveLength(1);
    expect(g.history[0].kind).toBe("outreach");
    expect(g.companies).toHaveLength(1);
    expect(g.projection.edges.some((e) => e.id === `history:${a.id}`)).toBe(
      true,
    );
    expect(g.companies[0].current).toHaveLength(2);
  });
  it("derives partnership and attributed previous-outreach history without inventing personal routes", async () => {
    const f = await editorContext();
    const company = await saveRecord(f.headers, "companies", {
      name: "Language Example",
    });
    const partner = await saveRecord(f.headers, "partnerships", {
      companyId: company.id,
      title: "Past translation support",
      type: "expertise",
      state: "ended",
      startDate: "2024-01-01",
      endDate: "2025-01-01",
      description: "A recorded fictional contribution.",
    });
    const outreach = await saveRecord(f.headers, "previousOutreach", {
      companyId: company.id,
      contactRole: "Community partnership lead",
      channel: "email",
      occurredDate: "2025-02-01",
      description: "A sourced historical inquiry.",
      outcome: "declined",
      source: "Fictional archived email",
    });
    const graph = await getNetworkGraph(f.headers, { companyId: company.id });
    expect(graph.history.map((h) => h.id)).toEqual([outreach.id, partner.id]);
    expect(graph.history[0]).toMatchObject({
      kind: "outreach",
      state: "declined",
      source: "Fictional archived email",
    });
    expect(graph.history[1]).toMatchObject({
      kind: "partnership",
      state: "ended",
    });
    expect(graph.projection.edges.map((e) => e.id)).toEqual([
      `history:${outreach.id}`,
      `history:${partner.id}`,
    ]);
    expect(graph.companies[0].current).toEqual([]);
    expect(graph.companies[0].historical).toEqual([]);
  });
});
