import { describe, expect, it } from "vitest";
import {
  calculatePriority,
  rubric,
  unknownFactors,
} from "../../src/modules/opportunities/scoring";
import {
  calendarDate,
  relationshipInput,
  evidenceInput,
} from "../../src/modules/records/validation";
import { localCalendarDay } from "../../src/modules/outreach/service";
describe("transparent v1 priority", () => {
  it("matches the specified independent example", () => {
    const factors = unknownFactors();
    factors.fit.value = 4;
    factors.relationship.value = 3;
    factors.urgency.value = 2;
    expect(calculatePriority(factors)).toMatchObject({
      priority: 46.25,
      coverage: 55,
      unknowns: ["access", "incentive", "feasibility", "previous", "evidence"],
    });
  });
  it("keeps unknown and positively supported zero distinct without renormalizing", () => {
    const factors = unknownFactors();
    expect(calculatePriority(factors)).toMatchObject({
      priority: 0,
      coverage: 0,
    });
    factors.fit.value = 0;
    expect(calculatePriority(factors)).toMatchObject({
      priority: 0,
      coverage: 25,
    });
    factors.fit.value = 1;
    expect(calculatePriority(factors).priority).toBe(6.25);
  });
  it("has exactly eight documented factors and bounds every value", () => {
    expect(rubric).toHaveLength(8);
    expect(rubric.reduce((sum, f) => sum + f.weight, 0)).toBe(100);
    const factors = unknownFactors();
    for (const f of rubric) factors[f.key].value = 4;
    expect(calculatePriority(factors)).toMatchObject({
      priority: 100,
      coverage: 100,
    });
    factors.fit.value = 4.5;
    expect(() => calculatePriority(factors)).toThrow();
  });
});
describe("dates and source boundaries", () => {
  it("rejects impossible dates and unsafe or incomplete sources", () => {
    expect(calendarDate.safeParse("2026-02-30").success).toBe(false);
    expect(
      evidenceInput.safeParse({
        claim: "Claim",
        sourceType: "supplied_source",
        url: "javascript:alert(1)",
        excerpt: "Excerpt",
        observedDate: "2026-01-01",
      }).success,
    ).toBe(false);
    expect(
      evidenceInput.safeParse({
        claim: "Claim",
        sourceType: "observation",
        excerpt: "Excerpt",
        observedDate: "2026-01-01",
      }).success,
    ).toBe(false);
  });
  it("rejects self-links and previous employment marked current", () => {
    const base = {
      personId: "11111111-1111-4111-8111-111111111111",
      targetPersonId: "11111111-1111-4111-8111-111111111111",
      kind: "knows",
      evidenceId: "22222222-2222-4222-8222-222222222222",
    };
    expect(relationshipInput.safeParse(base).success).toBe(false);
    expect(
      relationshipInput.safeParse({
        ...base,
        targetPersonId: null,
        kind: "previously_worked_at",
        companyId: "33333333-3333-4333-8333-333333333333",
        state: "current",
      }).success,
    ).toBe(false);
  });
  it("uses the organization's calendar timezone at midnight", () => {
    expect(
      localCalendarDay("Europe/Oslo", new Date("2026-10-02T22:30:00Z")),
    ).toBe("2026-10-03");
    expect(
      localCalendarDay("America/New_York", new Date("2026-10-02T22:30:00Z")),
    ).toBe("2026-10-02");
  });
});
