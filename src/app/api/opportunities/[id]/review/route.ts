import { reviewOpportunity } from "@/modules/opportunities/review";
import { checkOrigin, jsonRoute, readJson } from "@/server/http";
export async function POST(
  r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return jsonRoute(async () => {
    checkOrigin(r);
    return reviewOpportunity(r.headers, (await params).id, await readJson(r));
  });
}
