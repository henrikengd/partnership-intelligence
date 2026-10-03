import type { PathInput } from "../../src/modules/network/paths";
/** Distinct dated periods and directed records, all fictional; no duplicate identifiers. */
export function denseNetwork(size = 400, onPersonLabel = () => {}) {
  const key = (i: number) => String(i).padStart(5, "0");
  const day = (i: number) =>
    new Date(Date.UTC(2020, 0, 1 + i)).toISOString().slice(0, 10);
  const people = Array.from({ length: size + 1 }, (_, i) => ({
    id: `person-${key(i)}`,
    organizationId: "org",
    get name() {
      onPersonLabel();
      return `Fictional person ${key(i)}`;
    },
  }));
  const affiliations = Array.from({ length: size }, (_, i) => ({
    id: `affiliation-${key(i)}`,
    personId: people[i].id,
    organizationId: "org",
    role: "member",
    state: "current",
    startDate: null,
    endDate: null,
    recordedBy: "admin",
  }));
  const relationships = [
    ...Array.from({ length: size }, (_, i) => ({
      id: `personal-${key(i)}`,
      personId: people[i].id,
      targetPersonId: people[size].id,
      companyId: null,
      organizationId: "org",
      kind: "knows",
      state: "current",
      strength: i % 5,
      willingness: i === 4 ? "no" : i === 9 ? "yes" : "unknown",
      willingnessDate: "2026-01-01",
      willingnessSource: "Fictional dated observation",
      startDate: null,
      endDate: null,
      evidenceId: "source",
      recordedBy: "admin",
      title: "",
    })),
    ...Array.from({ length: size }, (_, i) => ({
      id: `employment-${key(i)}`,
      personId: people[size].id,
      targetPersonId: null,
      companyId: "company",
      organizationId: "org",
      kind: "previously_worked_at",
      state: "ended",
      strength: 4,
      willingness: i === 0 ? "no" : i === 1 ? "yes" : "unknown",
      willingnessDate: "2026-01-01",
      willingnessSource: "Fictional dated observation",
      startDate: day(i),
      endDate: day(i),
      evidenceId: "source",
      recordedBy: "admin",
      title: "Employee",
    })),
  ];
  return {
    organization: { id: "org", name: "Fictional organization" },
    company: { id: "company", name: "Fictional company" },
    people,
    affiliations,
    relationships,
    evidence: [
      {
        id: "source",
        organizationId: "org",
        observedDate: "2026-01-01",
        reviewState: "reviewed",
      },
    ],
    today: "2030-01-01",
  } as unknown as PathInput;
}
