import { z } from "zod";
import { getWorkspaceData, saveRecord } from "@/modules/records/service";
import { checkOrigin, jsonRoute, readJson } from "@/server/http";
const kindSchema = z.enum([
  "needs",
  "people",
  "companies",
  "evidence",
  "capabilities",
  "relationships",
]);
export async function GET(
  request: Request,
  { params }: { params: Promise<{ kind: string }> },
) {
  return jsonRoute(async () => {
    const kind = kindSchema.parse((await params).kind);
    const data = await getWorkspaceData(request.headers);
    return data[kind];
  });
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ kind: string }> },
) {
  return jsonRoute(async () => {
    checkOrigin(request);
    return saveRecord(
      request.headers,
      kindSchema.parse((await params).kind),
      await readJson(request),
    );
  });
}
