import { z } from "zod";
import { workspaceContext } from "@/modules/records/service";
import { parseCsv, templates } from "@/modules/imports/csv";
import { previewImport, purgeExpiredImports } from "@/modules/imports/service";
import { readImportForm } from "@/modules/imports/http";
import { checkOrigin, jsonRoute } from "@/server/http";
import { DomainError } from "@/server/errors";
export async function POST(request: Request) {
  return jsonRoute(async () => {
    checkOrigin(request);
    await workspaceContext(request.headers);
    await purgeExpiredImports();
    const form = await readImportForm(request);
    const kind = z
      .enum(["people", "companies", "relationships", "partnerships"])
      .parse(form.get("kind"));
    const file = form.get("file");
    if (!(file instanceof File))
      throw new DomainError("FILE_REQUIRED", "Choose a CSV file.");
    if (file.size > 5 * 1024 * 1024)
      throw new DomainError(
        "FILE_TOO_LARGE",
        "CSV files must be at most 5 MiB.",
        413,
      );
    const bytes = new Uint8Array(await file.arrayBuffer());
    const parsed = parseCsv(bytes);
    if (form.get("phase") === "headers")
      return {
        headers: parsed.headers,
        count: parsed.records.length,
        fields: templates[kind],
      };
    let mapping: unknown;
    try {
      mapping = JSON.parse(String(form.get("mapping")));
    } catch {
      throw new DomainError("INVALID_MAPPING", "Select a column mapping.");
    }
    return previewImport(
      request.headers,
      kind,
      bytes,
      z.record(z.string(), z.string().max(120)).parse(mapping),
    );
  });
}
