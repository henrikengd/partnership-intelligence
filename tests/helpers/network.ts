import { savedWorkflow } from "./workflow";
import {
  saveRecord,
  getWorkspaceData,
} from "../../src/modules/records/service";
import { z } from "zod";
export async function savedNetwork() {
  const f = await savedWorkflow();
  const today = new Date().toISOString().slice(0, 10);
  const extra = await saveRecord(f.headers, "people", {
    name: "Bea Example",
    roles: ["contact"],
  });
  const source = await saveRecord(f.headers, "evidence", {
    claim: "Anna reports knowing Bea, who works at Cedar.",
    sourceType: "observation",
    attribution: "Anna Example, fictional source",
    excerpt:
      "I know Bea at Cedar. Verify relevance and introduction permission.",
    observedDate: today,
    reviewState: "reviewed",
    reviewDate: today,
  });
  const personal = await saveRecord(f.headers, "relationships", {
    kind: "knows",
    personId: f.personId,
    targetPersonId: extra.id,
    evidenceId: source.id,
    strength: 3,
    willingness: "yes",
    willingnessDate: today,
    willingnessSource: "Fictional conversation with Anna",
  });
  const employment = await saveRecord(f.headers, "relationships", {
    kind: "works_at",
    personId: extra.id,
    companyId: f.companyId,
    title: "Manufacturing Manager",
    startDate: "2024-01-01",
    evidenceId: source.id,
    willingness: "unknown",
    strength: 4,
  });
  const data = await getWorkspaceData(f.headers);
  return {
    ...f,
    today,
    data,
    contactId: z.uuid().parse(extra.id),
    personalId: z.uuid().parse(personal.id),
    employmentId: z.uuid().parse(employment.id),
    personalSourceId: z.uuid().parse(source.id),
  };
}
