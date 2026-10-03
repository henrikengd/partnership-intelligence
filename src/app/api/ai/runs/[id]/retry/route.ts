import { retryAiRun } from "@/server/ai/service";
import { checkOrigin, jsonRoute, readJson } from "@/server/http";
export async function POST(
  r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return jsonRoute(async () => {
    checkOrigin(r);
    return retryAiRun(r.headers, (await params).id, await readJson(r, 65_536));
  });
}
