import { randomUUID } from "node:crypto";
import { z } from "zod";
import * as t from "../../server/db";
import { requireAdmin } from "../../server/auth/access";
import { workspaceContext } from "../records/service";
import { assertPrivacyAdmin } from "./service";
import { lockWorkspace } from "./lock";
import { privacySnapshot } from "./snapshot";
import { exportKinds } from "./contracts";
export { exportKinds } from "./contracts";
export function csvCell(value: unknown) {
  let text =
    value === null || value === undefined
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  if (/^[\s\u0000-\u001f\u007f]*[=+@-]/u.test(text) || /^[\t\r\n]/u.test(text))
    text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return (
    [
      columns.map(csvCell).join(","),
      ...rows.map((row) => columns.map((key) => csvCell(row[key])).join(",")),
    ].join("\r\n") + "\r\n"
  );
}
export async function exportPrivateData(headers: Headers, kind: unknown) {
  await requireAdmin(headers);
  const chosen = z.enum(exportKinds).parse(kind);
  const c = await workspaceContext(headers);
  return t.db.transaction(async (tx) => {
    await assertPrivacyAdmin(tx, c.actor.id);
    await lockWorkspace(tx, c);
    const s = await privacySnapshot(tx, c);
    const datasets = {
      people: s.data.people,
      affiliations: s.data.affiliations,
      relationships: s.data.relationships,
      companies: s.data.companies,
      needs: s.data.needs,
      evidence: s.data.evidence,
      capabilities: s.data.capabilities,
      partnerships: s.data.partnerships,
      previousOutreach: s.data.previousOutreach,
      opportunities: s.data.opportunities,
      assessments: s.assessments,
      reviews: s.reviews,
      activities: s.activities,
      outcomes: s.events,
      aiRuns: s.aiRuns,
      generationRuns: s.runs,
      importSummaries: s.imports.map(({ rows, ...summary }) => {
        void rows;
        return summary;
      }),
      incentives: s.incentives,
    };
    const rows = datasets[chosen];
    const csv = toCsv(rows);
    await tx.insert(t.auditEvent).values({
      organizationId: c.organization.id,
      actorId: c.actor.id,
      action: "exported",
      requestId: randomUUID(),
      counts: { records: rows.length },
    });
    return { csv, filename: `partnership-intelligence-${chosen}.csv` };
  });
}
