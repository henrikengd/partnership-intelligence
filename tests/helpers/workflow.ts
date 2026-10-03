import {
  bootstrapAdmin,
  createInvitation,
  acceptInvitation,
} from "../../src/server/auth/service";
import { getAuth } from "../../src/server/auth/auth";
import { saveOrganization } from "../../src/server/organization";
import { saveRecord } from "../../src/modules/records/service";
import { z } from "zod";
export async function editorContext() {
  const admin = await bootstrapAdmin({
    name: "Fictional administrator",
    email: "admin@example.test",
    password: "Fictional-password-123",
    secret: process.env.BOOTSTRAP_SECRET!,
  });
  const invite = await createInvitation(admin, {
    email: "editor@example.test",
    role: "editor",
  });
  const editor = await acceptInvitation({
    name: "Fictional coordinator",
    email: invite.email,
    password: "Fictional-password-123",
    token: invite.token,
  });
  async function login(email: string) {
    const response = await getAuth().handler(
      new Request(`${process.env.BETTER_AUTH_URL}/api/auth/sign-in/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: process.env.BETTER_AUTH_URL!,
          "x-forwarded-for": "127.0.0.1",
        },
        body: JSON.stringify({ email, password: "Fictional-password-123" }),
      }),
    );
    if (response.status !== 200) throw new Error("Fixture login failed.");
    return new Headers({
      cookie: response.headers
        .getSetCookie()
        .map((c) => c.split(";")[0])
        .join("; "),
      Origin: process.env.BETTER_AUTH_URL!,
    });
  }
  const adminHeaders = await login(admin.email);
  await saveOrganization(adminHeaders, {
    name: "Riverbend Community Workshop",
    timezone: "Europe/Oslo",
  });
  return { admin, editor, headers: await login(editor.email), adminHeaders };
}
export async function savedWorkflow() {
  const context = await editorContext();
  const headers = context.headers;
  const today = new Date().toISOString().slice(0, 10);
  const need = await saveRecord(headers, "needs", {
    title: "CNC machining",
    description:
      "Machine a batch of ten workshop fixtures from supplied drawings.",
    category: "manufacturing",
    urgency: 2,
    partnershipType: "in_kind",
  });
  const company = await saveRecord(headers, "companies", {
    name: "Cedar Manufacturing",
    website: "https://cedar.example.test",
    description: "Fictional local machine shop.",
  });
  const source = await saveRecord(headers, "evidence", {
    claim: "Cedar lists CNC machining equipment.",
    sourceType: "supplied_source",
    url: "https://cedar.example.test/capabilities",
    excerpt: "Our fictional workshop operates CNC mills.",
    observedDate: today,
  });
  const capability = await saveRecord(headers, "capabilities", {
    companyId: company.id,
    category: "manufacturing",
    description: "CNC machining",
    evidenceId: source.id,
  });
  const person = await saveRecord(headers, "people", {
    name: "Anna Example",
    roles: ["alumni", "advisor"],
  });
  const employmentSource = await saveRecord(headers, "evidence", {
    claim: "Anna reports current employment at Cedar.",
    sourceType: "observation",
    attribution: "Anna Example, fictional observation",
    excerpt: "I currently work as an engineer at Cedar.",
    observedDate: today,
  });
  const relationship = await saveRecord(headers, "relationships", {
    kind: "works_at",
    personId: person.id,
    companyId: company.id,
    title: "Engineer",
    state: "current",
    startDate: "2024-01-01",
    evidenceId: employmentSource.id,
  });
  return {
    ...context,
    needId: z.uuid().parse(need.id),
    companyId: z.uuid().parse(company.id),
    personId: z.uuid().parse(person.id),
    sourceId: z.uuid().parse(source.id),
    relationshipId: z.uuid().parse(relationship.id),
    employmentSourceId: z.uuid().parse(employmentSource.id),
    capabilityId: z.uuid().parse(capability.id),
  };
}
