import { randomUUID } from "node:crypto";
import { saveOrganization } from "../../server/organization";
import { saveRecord, getWorkspaceData } from "../records/service";
import { saveIncentive, startGenerationRun } from "../opportunities/runs";
import {
  getOpportunityDetail,
  editOpportunity,
} from "../opportunities/service";
import { reviewOpportunity } from "../opportunities/review";
import { companyPaths } from "../network/service";
import { transitionOpportunity } from "../outreach/lifecycle";
import { saveActivity, localCalendarDay } from "../outreach/service";
export const DEMO_NAME = "Riverbend Community Workshop";
export const DEMO_VERSION = "riverbend-v1";
export function offsetDay(day: string, days: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
/** Internal fictional fixture builder. Production seed/reset must use the guarded CLI. */
export async function buildRiverbend(headers: Headers) {
  await saveOrganization(headers, {
    name: DEMO_NAME,
    mission:
      "Fictional community workshops teach practical making and repair skills.",
    type: "nonprofit",
    location: "Fictional Riverbend",
    teamSize: 12,
    timezone: "Europe/Oslo",
    website: "https://riverbend.example.test",
  });
  const day = localCalendarDay("Europe/Oslo");
  const observed = offsetDay(new Date().toISOString().slice(0, 10), -7);
  const source = async (claim: string, reviewState = "reviewed") =>
    (
      await saveRecord(headers, "evidence", {
        claim: `Fictional demo: ${claim}`,
        sourceType: "observation",
        attribution: "Fictional Riverbend coordinator",
        excerpt: `Fictional example only. ${claim}`,
        observedDate: observed,
        reviewState,
        ...(reviewState === "reviewed" ? { reviewDate: observed } : {}),
      })
    ).id;
  const companyNames = [
    "Cedar Manufacturing",
    "Forge Fabrication",
    "Juniper Supplies",
    "Clearbrook Foundation",
    "Harbor Workshop Logistics",
    "Pine Learning",
  ];
  const companies: string[] = [];
  for (const [i, name] of companyNames.entries())
    companies.push(
      (
        await saveRecord(headers, "companies", {
          name,
          sourceId: `demo-company-${i}`,
          website: `https://${name.split(" ")[0].toLowerCase()}.example.test`,
          description:
            "Fictional demo company. No real organization or capability is represented.",
        })
      ).id,
    );
  const people: string[] = [];
  const names = [
    "Mina",
    "Theo",
    "Sara",
    "Omar",
    "Anna",
    "Leo",
    "Freya",
    "Ivo",
    "Nia",
    "Ben",
    "June",
    "Eli",
  ];
  for (const [i, n] of names.entries())
    people.push(
      (
        await saveRecord(headers, "people", {
          name: `${n} Example`,
          email: `${n.toLowerCase()}@riverbend.example.test`,
          sourceId: `demo-person-${i}`,
          roles: [
            i < 4 ? "member" : i < 7 ? "alumni" : i < 9 ? "advisor" : "contact",
          ],
          notes: "Entirely fictional demo person.",
        })
      ).id,
    );
  const needs: string[] = [];
  for (const n of [
    {
      title: "Workshop fixtures and material kits",
      category: "manufacturing",
      description:
        "Machine ten fixtures and supply the matching raw material kits from reviewed drawings.",
      urgency: 3,
      estimatedValue: "18000",
      partnershipType: "in_kind",
    },
    {
      title: "Community session funding",
      category: "cash",
      description:
        "Provide NOK 25000 for materials across four open community sessions.",
      urgency: 4,
      estimatedValue: "25000",
      partnershipType: "cash",
    },
    {
      title: "Equipment transport",
      category: "logistics",
      description:
        "Transport six workshop benches to our community venue on a defined date.",
      urgency: 2,
      estimatedValue: "5000",
      partnershipType: "in_kind",
    },
    {
      title: "Instructor expertise",
      category: "expertise",
      description:
        "Two instructors teach practical repair skills during two sessions.",
      urgency: 2,
      estimatedValue: "8000",
      partnershipType: "expertise",
    },
  ])
    needs.push(
      (
        await saveRecord(headers, "needs", {
          ...n,
          deadline: offsetDay(day, n.urgency === 4 ? 21 : 45),
          currency: "NOK",
        })
      ).id,
    );
  const capabilities: string[] = [];
  for (const [i, category, description] of [
    [
      0,
      "manufacturing",
      "Cedar operates CNC mills for defined drawing packages.",
    ],
    [
      1,
      "manufacturing",
      "Forge lists CNC work, but a newer observation disputes equipment availability.",
    ],
    [
      2,
      "manufacturing",
      "Juniper supplies raw metal kits; machining remains unconfirmed.",
    ],
    [4, "logistics", "Harbor transports small equipment batches."],
    [5, "expertise", "Pine supplies repair instructors."],
  ] as const) {
    const e = await source(description, i === 1 ? "disputed" : "reviewed");
    capabilities[i] = e;
    await saveRecord(headers, "capabilities", {
      companyId: companies[i],
      category,
      description,
      evidenceId: e,
    });
  }
  const cashSource = await source(
    "Clearbrook's current community grant round accepts workshop material requests.",
  );
  await saveIncentive(headers, {
    companyId: companies[3],
    needId: needs[1],
    evidenceId: cashSource,
    description:
      "Fictional current community grant aligns with four practical sessions.",
  });
  const relationship = async (
    person: number,
    company: number,
    state = "current",
    willingness = "unknown",
  ) =>
    saveRecord(headers, "relationships", {
      personId: people[person],
      companyId: companies[company],
      kind: state === "ended" ? "previously_worked_at" : "works_at",
      state,
      title: person >= 9 ? "Technical contact" : "Employee",
      startDate: offsetDay(day, -500),
      ...(state === "ended" ? { endDate: offsetDay(day, -120) } : {}),
      evidenceId: await source(
        `${names[person]} reports ${state === "ended" ? "former" : "current"} employment at ${companyNames[company]}.`,
      ),
      willingness,
      ...(willingness !== "unknown"
        ? {
            willingnessDate: observed,
            willingnessSource:
              "Fictional dated observation. Reconfirm for each intended request.",
          }
        : {}),
    });
  await relationship(4, 0, "current", "yes");
  await relationship(9, 0);
  await relationship(5, 1, "ended");
  await relationship(10, 1);
  await relationship(6, 4, "current", "no");
  await relationship(11, 5);
  for (const [a, b] of [
    [0, 9],
    [8, 11],
  ] as const)
    await saveRecord(headers, "relationships", {
      personId: people[a],
      targetPersonId: people[b],
      kind: "knows",
      state: "current",
      strength: 3,
      evidenceId: await source(
        `${names[a]} explicitly reports knowing ${names[b]} through workshop collaboration.`,
      ),
      willingness: "unknown",
    });
  const cedarPart = (
    await saveRecord(headers, "partnerships", {
      companyId: companies[0],
      title: "Fictional workshop equipment loan",
      type: "equipment",
      state: "current",
      startDate: offsetDay(day, -80),
      description:
        "Earlier positive tooling collaboration, separate from the new fixture batch.",
      evidenceId: await source(
        "Cedar's fictional equipment loan is recorded as current.",
      ),
    })
  ).id;
  await saveRecord(headers, "partnerships", {
    companyId: companies[4],
    title: "Fictional earlier transport collaboration",
    type: "logistics",
    state: "ended",
    startDate: offsetDay(day, -350),
    endDate: offsetDay(day, -200),
    description: "A previous workshop delivery ended as planned.",
    evidenceId: await source("Harbor's previous delivery collaboration ended."),
  });
  const pinePart = (
    await saveRecord(headers, "partnerships", {
      companyId: companies[5],
      title: "Fictional instructor agreement",
      type: "expertise",
      state: "current",
      startDate: offsetDay(day, -10),
      description: "Two instructors confirmed two practical repair sessions.",
      evidenceId: await source(
        "Pine's two-instructor training agreement is recorded.",
      ),
    })
  ).id;
  const data = await getWorkspaceData(headers);
  const owner = data.actor.id;
  const make = async (
    ci: number,
    ni: number,
    ask: string,
    options: {
      allowNewAfterClosed?: boolean;
      allowOngoingDiscussion?: boolean;
    } = {},
  ) => {
    const r = await startGenerationRun(headers, {
      companyIds: [companies[ci]],
      needId: needs[ni],
      idempotencyKey: randomUUID(),
      ...options,
    });
    const id = r.results[0]?.opportunityId;
    if (r.status !== "completed" || !id || r.results[0].status !== "generated")
      throw new Error("Fictional opportunity generation failed.");
    await editOpportunity(headers, id, {
      ownerId: owner,
      ask,
      valueExchange:
        "Fictional proposal: workshop collaboration and community visibility; confirm mutual value.",
      contactRole:
        ci === 3
          ? "Community grants coordinator"
          : "Operations or training lead",
      nextAction:
        "Verify the defined scope and relevant role, then request a short discussion.",
      approach: "Proposed approach awaiting explicit review.",
    });
    return id;
  };
  const prior = await make(
    3,
    1,
    "Provide NOK 25000 through the earlier community grant round.",
  );
  await transitionOpportunity(headers, prior, {
    requestId: randomUUID(),
    action: "transition",
    fromState: "suggested",
    toState: "declined",
    reason:
      "Fictional earlier funding round closed before the request was submitted.",
    source: "Fictional coordinator's recorded reply",
    occurredDate: offsetDay(day, -60),
  });
  const ops = [
    await make(
      0,
      0,
      "Machine ten fixtures from the supplied reviewed drawings.",
    ),
    await make(
      1,
      0,
      "Verify whether Forge can machine ten fixtures after conflicting equipment reports.",
    ),
    await make(
      2,
      0,
      "Supply ten matching raw material kits with agreed alloy and dimensions.",
    ),
    await make(
      3,
      1,
      "Provide NOK 25000 for four community workshop sessions.",
      { allowNewAfterClosed: true },
    ),
    await make(0, 1, "Discuss NOK 5000 for community session materials.", {
      allowOngoingDiscussion: true,
    }),
    await make(
      4,
      2,
      "Transport six workshop benches on the agreed venue date.",
    ),
    await make(
      5,
      3,
      "Provide two repair instructors for two defined workshop sessions.",
    ),
    prior,
  ];
  const review = async (
    id: string,
    sourceId: string,
    mode: "cold" | "introduction",
    terminal?: number,
  ) => {
    const d = await getOpportunityDetail(headers, id);
    const path = companyPaths(d.data, d.record.companyId).current.find(
      (p) =>
        p.nodes.at(-2)?.id === people[terminal ?? -1] && p.willingness !== "no",
    );
    await reviewOpportunity(headers, id, {
      fitReviewed: true,
      askReviewed: true,
      targetReviewed: true,
      nextActionReviewed: true,
      fitValue: 2,
      fitRationale:
        "Fictional source supports a scoped conversation; capacity, timing and exact deliverable remain to confirm.",
      fitEvidenceIds: [sourceId],
      fitSource: "",
      ask: d.brief.ask,
      contactRole: d.brief.contactRole,
      targetPersonId: mode === "introduction" ? people[terminal!] : null,
      nextAction:
        mode === "introduction"
          ? "Ask the recorded contact to reconfirm willingness for this defined introduction."
          : "Verify the relevant role and submit the defined request through a permitted cold channel.",
      approachMode: mode,
      pathId: mode === "introduction" ? path?.id : null,
    });
  };
  await review(ops[0], capabilities[0], "introduction", 4);
  await transitionOpportunity(headers, ops[0], {
    requestId: randomUUID(),
    action: "transition",
    fromState: "suggested",
    toState: "shortlisted",
  });
  for (const [id, s] of [
    [ops[3], cashSource],
    [ops[5], capabilities[4]],
  ] as const) {
    await review(id, s, "cold");
    await transitionOpportunity(headers, id, {
      requestId: randomUUID(),
      action: "transition",
      fromState: "suggested",
      toState: "pursuing",
    });
  }
  await review(ops[6], capabilities[5], "introduction", 11);
  await transitionOpportunity(headers, ops[6], {
    requestId: randomUUID(),
    action: "agreement",
    fromState: "suggested",
    confirmed: true,
    partnershipId: pinePart,
    occurredDate: offsetDay(day, -10),
    source: "Fictional agreement confirmed by the workshop coordinator.",
  });
  await saveActivity(headers, {
    opportunityId: ops[3],
    kind: "outreach",
    status: "completed",
    targetRole: "Community grants coordinator",
    channel: "email",
    description:
      "Fictional submitted request, no email was sent by this application.",
    occurredDate: offsetDay(day, -8),
    followUpDate: offsetDay(day, -3),
  });
  await saveActivity(headers, {
    opportunityId: ops[0],
    kind: "introduction",
    status: "planned",
    targetPersonId: people[4],
    channel: "message",
    description:
      "Reconfirm Anna's willingness for the specific fixture request.",
    followUpDate: offsetDay(day, 2),
  });
  return {
    organizationId: data.organization.id,
    people,
    companies,
    needs,
    opportunities: ops,
    cedarPart,
  };
}
