import { lockWorkspace } from "../privacy/lock";
import { and, eq, lt } from "drizzle-orm";
import { z } from "zod";
import { db, importBatch, organization } from "../../server/db";
import type { ImportKind, ImportRow } from "../../server/db/schema";
import { DomainError } from "../../server/errors";
import {
  readWorkspaceData,
  workspaceContext,
  saveRecordInTransaction,
  type WorkspaceData,
} from "../records/service";
import { parseCsv, mapRow, templates, validators } from "./csv";
export async function purgeExpiredImports() {
  await db
    .update(importBatch)
    .set({ status: "expired", rows: [], updatedAt: new Date() })
    .where(
      and(
        eq(importBatch.status, "pending"),
        lt(importBatch.expiresAt, new Date()),
      ),
    );
}
function candidates(
  kind: ImportKind,
  input: Record<string, unknown>,
  data: WorkspaceData,
) {
  return data[kind]
    .filter(
      (r) =>
        (input.sourceId && r.sourceId === input.sourceId) ||
        (kind === "people" &&
          input.email &&
          "email" in r &&
          r.email === input.email) ||
        (kind === "companies" &&
          input.domain &&
          "domain" in r &&
          r.domain === input.domain),
    )
    .map((r) => ({
      id: r.id,
      label: "name" in r ? r.name : r.title || "Relationship",
      revision: r.revision,
      reason:
        input.sourceId && input.sourceId === r.sourceId
          ? "source ID"
          : kind === "people"
            ? "exact email"
            : "exact domain",
    }));
}
function normalize(
  kind: ImportKind,
  input: Record<string, unknown>,
  data: WorkspaceData,
) {
  const errors: string[] = [];
  for (const [field, records] of [
    ["person", data.people],
    ["targetPerson", data.people],
    ["company", data.companies],
  ] as const) {
    const source = input[`${field}SourceId`];
    if (source) {
      const matches = records.filter((r) => r.sourceId === source);
      if (matches.length !== 1)
        errors.push(
          `${field} source ID must match exactly one saved record. Import people/companies first.`,
        );
      else if (input[`${field}Id`] && input[`${field}Id`] !== matches[0].id)
        errors.push(`${field} ID conflicts with its source ID.`);
      else input[`${field}Id`] = matches[0].id;
    }
    delete input[`${field}SourceId`];
  }
  const result = validators[kind].safeParse(input);
  if (!result.success)
    errors.push(
      ...result.error.issues.map(
        (i) =>
          `${i.path.join(".") || "Row"}: ${i.code === "invalid_type" ? "is required or has the wrong format." : i.message}`,
      ),
    );
  const parsed: Record<string, unknown> = result.success ? result.data : input;
  for (const [key, records] of [
    ["personId", data.people],
    ["targetPersonId", data.people],
    ["companyId", data.companies],
    ["evidenceId", data.evidence],
  ] as const)
    if (parsed[key] && !records.some((r) => r.id === parsed[key]))
      errors.push(`${key}: select a saved record in this installation.`);
  return { input: parsed, errors };
}
export async function previewImport(
  headers: Headers,
  kind: ImportKind,
  bytes: Uint8Array,
  mapping: Record<string, string>,
) {
  const context = await workspaceContext(headers);
  await purgeExpiredImports();
  return db.transaction(async (tx) => {
    await lockWorkspace(tx, context);
    const { headers: columns, records } = parseCsv(bytes);
    if (Object.keys(mapping).some((k) => !templates[kind].includes(k)))
      throw new DomainError(
        "INVALID_MAPPING",
        "Map only supported template fields.",
      );
    const data = await readWorkspaceData(tx, context);
    const seen = new Set<string>();
    const seenNames = new Set<string>();
    const rows: ImportRow[] = records.map((values, index) => {
      const normalized = normalize(
        kind,
        mapRow(kind, columns, values, mapping),
        data,
      );
      if (values.length !== columns.length)
        normalized.errors.push(
          "Row has a different number of columns than the header.",
        );
      const keys = [
        normalized.input.sourceId
          ? `source:${normalized.input.sourceId}`
          : null,
        kind === "people" && normalized.input.email
          ? `email:${normalized.input.email}`
          : null,
        kind === "companies" && normalized.input.domain
          ? `domain:${normalized.input.domain}`
          : null,
      ].filter((key): key is string => key !== null);
      if (keys.some((key) => seen.has(key)))
        normalized.errors.push(
          "Repeated source ID or exact identity in this file. Exclude the repeated row or correct the file.",
        );
      keys.forEach((key) => seen.add(key));
      const matches = candidates(kind, normalized.input, data);
      const sourceMatch = matches.find((m) => m.reason === "source ID");
      if (sourceMatch && matches.some((m) => m.id !== sourceMatch.id))
        normalized.errors.push(
          "The source ID and exact email/domain identify different saved records. Correct the row or explicitly exclude it.",
        );
      const name = normalized.input.name;
      const sameName =
        name &&
        (seenNames.has(String(name)) ||
          data[kind].some(
            (r) =>
              "name" in r &&
              r.name === name &&
              !matches.some((m) => m.id === r.id),
          ));
      if (name) seenNames.add(String(name));
      return {
        row: index + 2,
        ...normalized,
        candidates: matches,
        warnings: [
          ...(sameName
            ? [
                "Another record has the same name. Names never establish identity; create a separate record or correct the source ID.",
              ]
            : []),
          ...(keys.length
            ? []
            : [
                "No stable source ID or exact email/domain was supplied. Later reimports cannot identify this record automatically; keep the returned record mapping.",
              ]),
        ],
      };
    });
    const [batch] = await tx
      .insert(importBatch)
      .values({
        organizationId: context.organization.id,
        recordedBy: context.actor.id,
        kind,
        rows,
        expiresAt: new Date(Date.now() + 3600000),
      })
      .returning();
    return batch;
  });
}
export async function getImport(headers: Headers, id: string) {
  const context = await workspaceContext(headers);
  await purgeExpiredImports();
  const batch = await db.query.importBatch.findFirst({
    where: and(
      eq(importBatch.id, z.uuid().parse(id)),
      eq(importBatch.organizationId, context.organization.id),
    ),
  });
  if (
    !batch ||
    (batch.recordedBy !== context.actor.id && context.actor.role !== "admin")
  )
    throw new DomainError("NOT_FOUND", "Import preview was not found.", 404);
  return batch;
}
export async function cancelImport(headers: Headers, id: string) {
  const batch = await getImport(headers, id);
  await db
    .update(importBatch)
    .set({ status: "cancelled", rows: [], updatedAt: new Date() })
    .where(
      and(eq(importBatch.id, batch.id), eq(importBatch.status, "pending")),
    );
  return getImport(headers, id);
}
const decisionsSchema = z
  .array(
    z.object({
      row: z.number().int(),
      action: z.enum(["create", "update", "exclude"]),
      recordId: z.uuid().optional(),
    }),
  )
  .max(5000);
export async function commitImport(headers: Headers, id: string, raw: unknown) {
  const context = await workspaceContext(headers);
  await purgeExpiredImports();
  const decisions = decisionsSchema.parse(raw);
  return db.transaction(async (tx) => {
    // Same lock order as manual writes: organization, then batch. Identity checks and writes share the lock.
    await tx
      .select()
      .from(organization)
      .where(eq(organization.id, context.organization.id))
      .for("update");
    await lockWorkspace(tx, context);
    const [batch] = await tx
      .select()
      .from(importBatch)
      .where(
        and(
          eq(importBatch.id, z.uuid().parse(id)),
          eq(importBatch.organizationId, context.organization.id),
        ),
      )
      .for("update");
    if (
      !batch ||
      (batch.recordedBy !== context.actor.id && context.actor.role !== "admin")
    )
      throw new DomainError("NOT_FOUND", "Import preview was not found.", 404);
    if (batch.status === "committed")
      return { summary: batch.summary, mappings: batch.mappings };
    if (batch.status !== "pending" || batch.expiresAt <= new Date())
      throw new DomainError(
        "PREVIEW_EXPIRED",
        "This preview is no longer active. Upload the file again.",
        409,
      );
    if (
      decisions.length !== batch.rows.length ||
      new Set(decisions.map((d) => d.row)).size !== batch.rows.length
    )
      throw new DomainError(
        "DECISIONS_REQUIRED",
        "Choose a resolution for every row, including invalid rows.",
      );
    const data = await readWorkspaceData(tx, context);
    const usedTargets = new Set<string>();
    const selected = batch.rows.map((row) => {
      const decision = decisions.find((d) => d.row === row.row);
      if (!decision)
        throw new DomainError(
          "DECISIONS_REQUIRED",
          "Choose a resolution for every row.",
        );
      if (decision.action === "exclude") return { row, decision, input: null };
      if (row.errors.length)
        throw new DomainError(
          "INVALID_ROWS",
          `Row ${row.row} needs correction or explicit exclusion.`,
        );
      const normalized = normalize(batch.kind, { ...row.input }, data);
      if (normalized.errors.length)
        throw new DomainError(
          "REFERENCE_CHANGED",
          `Row ${row.row} references changed. Upload again to review.`,
          409,
        );
      const current = candidates(batch.kind, normalized.input, data);
      if (
        current.length !== row.candidates.length ||
        current.some(
          (c) =>
            !row.candidates.some(
              (p) => p.id === c.id && p.revision === c.revision,
            ),
        )
      )
        throw new DomainError(
          "IDENTITY_CHANGED",
          `Identity matches for row ${row.row} changed. Upload again to review.`,
          409,
        );
      if (
        decision.action === "update" &&
        (!decision.recordId || !current.some((c) => c.id === decision.recordId))
      )
        throw new DomainError(
          "RESOLUTION_REQUIRED",
          `Row ${row.row} must explicitly select a proposed identity.`,
        );
      const sourceMatch = current.find((c) => c.reason === "source ID");
      if (
        decision.action === "update" &&
        sourceMatch &&
        decision.recordId !== sourceMatch.id
      )
        throw new DomainError(
          "IDENTITY_CONFLICT",
          `Row ${row.row} has a source ID owned by another saved record. Correct the file and preview again.`,
          409,
        );
      if (
        decision.action === "create" &&
        current.some((c) => c.reason === "source ID")
      )
        throw new DomainError(
          "SOURCE_ID_EXISTS",
          `Row ${row.row} already has this source ID. Select update or exclude.`,
        );
      if (decision.recordId && usedTargets.has(decision.recordId))
        throw new DomainError(
          "REPEATED_UPDATE",
          "Two rows cannot update the same record in one import.",
        );
      if (decision.recordId) usedTargets.add(decision.recordId);
      return {
        row,
        decision,
        input: {
          ...normalized.input,
          ...(decision.action === "update" ? { id: decision.recordId } : {}),
        },
      };
    });
    const mappings: {
      row: number;
      recordId: string;
      action: "created" | "updated";
    }[] = [];
    for (const entry of selected) {
      if (!entry.input) continue;
      const saved = await saveRecordInTransaction(
        tx,
        context,
        batch.kind,
        entry.input,
      );
      mappings.push({
        row: entry.row.row,
        recordId: saved.id,
        action: entry.decision.action === "update" ? "updated" : "created",
      });
    }
    const summary = {
      total: batch.rows.length,
      created: mappings.filter((m) => m.action === "created").length,
      updated: mappings.filter((m) => m.action === "updated").length,
      excluded: batch.rows.length - mappings.length,
    };
    await tx
      .update(importBatch)
      .set({
        status: "committed",
        rows: [],
        summary,
        mappings,
        updatedAt: new Date(),
      })
      .where(eq(importBatch.id, batch.id));
    return { summary, mappings };
  });
}
