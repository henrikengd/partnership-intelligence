import { startPursuing } from "@/modules/opportunities/review";
import { checkOrigin, jsonRoute } from "@/server/http";
export async function POST(
  r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return jsonRoute(async () => {
    checkOrigin(r);
    return startPursuing(r.headers, (await params).id);
  });
}
