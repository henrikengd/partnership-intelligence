import { parse } from "csv-parse/sync";
import { DomainError } from "../../server/errors";
import {
  companyInput,
  personInput,
  relationshipInput,
  partnershipInput,
} from "../records/validation";
import type { ImportKind } from "../../server/db/schema";
export const templates = {
  people: [
    "source_id",
    "name",
    "email",
    "roles",
    "affiliation_state",
    "affiliation_start_date",
    "affiliation_end_date",
    "notes",
  ],
  companies: ["source_id", "name", "website", "domain", "description"],
  relationships: [
    "source_id",
    "person_id",
    "person_source_id",
    "company_id",
    "company_source_id",
    "target_person_id",
    "target_person_source_id",
    "kind",
    "title",
    "state",
    "start_date",
    "end_date",
    "strength",
    "willingness",
    "willingness_date",
    "willingness_source",
    "evidence_id",
  ],
  partnerships: [
    "source_id",
    "company_id",
    "company_source_id",
    "title",
    "type",
    "state",
    "start_date",
    "end_date",
    "description",
    "evidence_id",
  ],
} satisfies Record<ImportKind, string[]>;
export const validators = {
  people: personInput,
  companies: companyInput,
  relationships: relationshipInput,
  partnerships: partnershipInput,
};
export function parseCsv(bytes: Uint8Array) {
  if (bytes.length > 5 * 1024 * 1024)
    throw new DomainError(
      "FILE_TOO_LARGE",
      "CSV files must be at most 5 MiB.",
      413,
    );
  let records: string[][];
  try {
    records = parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes), {
      bom: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      max_record_size: 65536,
      to: 5002,
    });
  } catch {
    throw new DomainError(
      "INVALID_CSV",
      "Use a UTF-8 CSV with quoted fields and records no larger than 64 KiB.",
    );
  }
  const headers = records.shift() ?? [];
  if (
    !headers.length ||
    headers.length > 40 ||
    headers.some((h) => !h || h.length > 120) ||
    new Set(headers).size !== headers.length
  )
    throw new DomainError(
      "INVALID_HEADERS",
      "Use 1–40 unique, nonempty column headers.",
    );
  if (records.length > 5000)
    throw new DomainError(
      "TOO_MANY_ROWS",
      "CSV files must contain at most 5,000 data rows.",
      413,
    );
  if (!records.length)
    throw new DomainError("EMPTY_CSV", "The CSV contains no data rows.");
  return { headers, records };
}
export function mapRow(
  kind: ImportKind,
  headers: string[],
  values: string[],
  mapping: Record<string, string>,
) {
  const mapped: Record<string, unknown> = {};
  for (const field of templates[kind]) {
    const column = mapping[field];
    if (!column) continue;
    if (!headers.includes(column))
      throw new DomainError(
        "INVALID_MAPPING",
        `Column ${column} is not in this CSV.`,
      );
    const key = field.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    const value = values[headers.indexOf(column)] ?? "";
    if (value) mapped[key] = value;
  }
  if (kind === "people")
    mapped.roles =
      typeof mapped.roles === "string"
        ? mapped.roles
            .split(";")
            .map((v) => v.trim())
            .filter(Boolean)
        : [];
  if (mapped.strength !== undefined) mapped.strength = Number(mapped.strength);
  return mapped;
}
