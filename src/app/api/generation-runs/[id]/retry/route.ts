import { retryGenerationRun } from "@/modules/opportunities/runs";
import { checkOrigin, jsonRoute } from "@/server/http";
export async function POST(
  r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return jsonRoute(async () => {
    checkOrigin(r);
    return retryGenerationRun(r.headers, (await params).id);
  });
}
